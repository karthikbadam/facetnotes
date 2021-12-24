import sys
import os
import shutil
import time
import traceback
import json
from datetime import datetime
from math import sqrt
import random

import pickle

## database and server
import pymongo
from flask import Flask
from flask import request, render_template, send_from_directory, jsonify

from sklearn.cluster import ward_tree
import itertools
import numpy as np
from scipy.cluster import hierarchy
from scipy.spatial import distance

## global variables
CUSTOM_STATIC_DIRECTORY = "/public/"
STATIC_FOLDER = "public"
EMPTY_DATUM = "None"
DEFAULT_CLUSTERS = 10

## setup mongodb access
client = pymongo.MongoClient()
collection_db = client.flights.delay

## serve index.html
app = Flask(__name__, static_folder=STATIC_FOLDER, static_path=CUSTOM_STATIC_DIRECTORY)

## TODO: important columns in the dataset -- provide a new set for each dataset
COLS = [ "dep_delay", "origin", "destination", "arr_delay", "distance"]
meta = {}
clusters = []
allData = []
allFeatures = []
clusterTree = []
distanceMatrix = None
cacheDistances = None
annotationDistributions = {}

annotationCol = "reason"


def stat(lst):
    """Calculate mean and std deviation from the input list."""
    n = float(len(lst))
    mean = sum(lst) / n
    stdev = sqrt((sum(x * x for x in lst) / n) - (mean * mean))
    return mean, stdev


def parse(lst, n):
    lst.sort(key=lambda x: x["count"], reverse=True)
    allClusters = []
    cluster = []
    for value in lst:
        if len(cluster) <= 1:    # the first two values are going directly in
            cluster.append(value["count"])
            continue

        mean,stdev = stat(cluster)
        if abs(mean - value["count"]) > n * stdev:    # check the "distance"
            #yield cluster
            allClusters.append(cluster[:])
            cluster = []    # reset cluster to the empty list

        cluster.append(value["count"])

    #yield cluster # yield the last cluster
    allClusters.append(cluster[:])

    return allClusters


@app.route("/")
def index():
    return app.send_static_file('flights.html')


@app.route("/baseline")
def index_baseline():
    return app.send_static_file('flights_baseline.html')

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('public/js/', path)


@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('public/css/', path)


@app.route('/images/<path:path>')
def send_images(path):
    return send_from_directory('public/images/', path)


## wrap return data in a json structure
def wrap_data(query, data):
    msgObject = {}
    msgObject["query"] = query
    msgObject["content"] = data
    return json.dumps(msgObject)


## adjust the datetime variables from ISO strings to python compatible variable
def fix(query):
    if "$and" not in query.keys():
        return query

    for obj in query["$and"]:
        if "date" in obj.keys():
            for date_range in obj["date"]["$in"]:
                date_range = datetime.strptime(date_range, '%Y-%m-%dT%H:%M:%S.%fZ')

        if "$or" in obj.keys():
            for obj2 in obj["$or"]:
                if "date" in obj2.keys():
                    obj2["date"]["$gte"] = datetime.strptime(obj2["date"]["$gte"], '%Y-%m-%dT%H:%M:%S.%fZ')
                    obj2["date"]["$lte"] = datetime.strptime(obj2["date"]["$lte"], '%Y-%m-%dT%H:%M:%S.%fZ')

    return query


def retrieve_data_from_query(query):
    query = fix(query)
    cursor = collection_db.find(query, {"_id": False})

    documents = []

    for document in cursor:
        if "date" in document.keys():
            document["date"] = document["date"].strftime("%c")
        documents.append(document)

    return documents


def create_feature_vectors(query):
    query = fix(query)
    cursor = collection_db.find(query)

    documents = []
    for document in cursor:
        documents.append(document)

    if len(documents) == 0:
        return [], []

    ## figure out the ranges the first time this clustering is applied
    if len(meta.keys()) == 0:
        for key in COLS:
            if key == "date":
                meta[key] = {}
                meta[key]["type"] = "date"

                temp_q = {key: {"$exists": True}}
                meta[key]["min"] = collection_db.find_one(temp_q, sort=[(key, 1)])[key]
                meta[key]["max"] = collection_db.find_one(temp_q, sort=[(key, -1)])[key]

            elif type(documents[0][key]) is int or type(documents[0][key]) is float:
                meta[key] = {}
                meta[key]["type"] = "number"

                # get range of this dimension for normalization
                temp_q = {}
                temp_q[key] = {"$exists": True}
                meta[key]["min"] = collection_db.find_one(temp_q, sort=[(key, 1)])[key]
                meta[key]["max"] = collection_db.find_one(temp_q, sort=[(key, -1)])[key]

            elif type(documents[0][key]) is str or type(documents[0][key]) is unicode:
                meta[key] = {}
                meta[key]["type"] = "string"
                meta[key]["values"] = collection_db.distinct(key)

    features = []
    for document in documents:
        feature = []
        for key in COLS:
            if meta[key]["type"] == "number":
                if key in document:
                    feature.append((document[key] - meta[key]["min"]) * 1.0 / (meta[key]["max"] - meta[key]["min"]) * 1.0)
                else:
                    feature.append(0.)
            elif meta[key]["type"] == "string":
                for category in meta[key]["values"]:
                    if key in document:
                        if category == document[key]:
                            feature.append(1./(1.0 * len(meta[key]["values"])))
                        else:
                            feature.append(0.)
                    else:
                        feature.append(0.)
            elif meta[key]["type"] == "date":
                if key in document:
                    feature.append(
                        (document[key] - meta[key]["min"]).total_seconds()* 1.0 / (meta[key]["max"] - meta[key]["min"]).total_seconds()* 1.0)
                else:
                    feature.append(0.)

        features.append(feature)

    return documents, features

def find_annotation_distributions(query):
    global annotationDistributions

    annotationDistributions = {}

    query = fix(query)

    group = {}

    group["_id"] = "$" + annotationCol
    #group["_id"][annotationCol] = "$" + annotationCol

    group["value"] = {"$sum": 1}

    pipeline = [
        {"$match": query},
        {"$unwind": "$" + annotationCol},
        {"$group": group},
    ]

    cursor = collection_db.aggregate(pipeline)

    documents = []
    for document in cursor:
        annotationDistributions[document["_id"]] = document["value"]
        documents.append(document)


def extract_feature_vectors(indices, focus = COLS):
    documents = []
    newIndices = []

    for index in indices:
        if len(allData[index][annotationCol]) > 0:
            documents.append(allData[index])
            newIndices.append(index)

    if len(documents) == 0:
        return [], []

    features = []
    for document in documents:
        feature = []
        for key in focus:
            if meta[key]["type"] == "number":
                if key in document:
                    feature.append((document[key] - meta[key]["min"]) * 1.0 / (meta[key]["max"] - meta[key]["min"]) * 1.0)
                else:
                    feature.append(0.)
            elif meta[key]["type"] == "string":
                for category in meta[key]["values"]:
                    if key in document.keys():
                        if category == document[key]:
                            feature.append(1./(1.0 * len(meta[key]["values"])))
                        else:
                            feature.append(0.)
                    else:
                        feature.append(0.)
            elif meta[key]["type"] == "date":
                if key in document.keys():
                    feature.append(
                        (document[key] - meta[key]["min"]).total_seconds()* 1.0 / (meta[key]["max"] - meta[key]["min"]).total_seconds()* 1.0)
                else:
                    feature.append(0.)

        features.append(feature)

    return newIndices, features


def extract_variation(indices, focus = COLS):
    global allData
    minmax = {}
    for key in focus:
        for index in indices:
            document = allData[index]
            if meta[key]["type"] == "number":
                if key in document.keys():
                    if key not in minmax.keys():
                        minmax[key] = [document[key], document[key]]
                    if minmax[key][0] > document[key]:
                        minmax[key][0] = document[key]
                    if minmax[key][1] < document[key]:
                        minmax[key][1] = document[key]

            elif meta[key]["type"] == "string":
                if key in document.keys():
                    if key not in minmax.keys():
                        minmax[key] = set()
                    minmax[key].add(document[key])
            elif meta[key]["type"] == "date":
                if key in document.keys():
                    if key not in minmax.keys():
                        minmax[key] = [document[key], document[key]]
                    if minmax[key][0] > document[key]:
                        minmax[key][0] = document[key]
                    if minmax[key][1] < document[key]:
                        minmax[key][1] = document[key]

    variance = {}
    for key in focus:
        v = {}
        if meta[key]["type"] == "number":
            v["key"] = key
            v["variance"] = (minmax[key][1] - minmax[key][0]) * 1.0/(meta[key]["max"] - meta[key]["min"]) * 1.0
            v["range"] = minmax[key]
            v["values"] = minmax[key]

        elif meta[key]["type"] == "string":
            v["key"] = key
            v["variance"] = (len(minmax[key]) - 1) * 1.0/len(meta[key]["values"])
            v["range"] = len(minmax[key])
            v["values"] = list(minmax[key])

        elif meta[key]["type"] == "date":
            v["key"] = key
            v["variance"] = (minmax[key][1] - minmax[key][0]).total_seconds() * 1.0 / (meta[key]["max"] - meta[key]["min"]).total_seconds()* 1.0
            v["range"] = [minmax[key][0].strftime("%c"), minmax[key][1].strftime("%c")]
            v["values"] = [minmax[key][0].strftime("%c"), minmax[key][1].strftime("%c")]

        variance[key] = v

    return variance

def extract_unique(indices, filters):
    global allData, allFeatures, distanceMatrix

    average_distances = []
    total_sum = 0.
    total_num = 0.

    # Find average distance for each from distance matrix
    for index1 in range(0, len(indices)):
        for index2 in range(0, len(indices)):
            total_sum += distanceMatrix[indices[index1], indices[index2]]
            total_num += 1.
        average_distances.append({
            "index": index1,
            "rank": total_sum/total_num
        })

    average_distances.sort(key = lambda x: -1*x["rank"])

    return average_distances


@app.route("/clusters", methods=['POST'])
def get_annotation():
    try:
        annotations = request.get_json()

        ## for each cluster
        ## Find the most distant item for each object -- rank based on score is average distance within cluster
        ## Regroup
        ##

        ## Why represent every object, just pick top elements in each cluster and show them
        # go through the annotations construct the annotation object for each
        # construct a distance function
        # construct the hierarchical clustering structure using the scikit-learn

        # first extract the text attributes from the dataset to construct an annotation object
        cols = annotations["cols"]
        numClusters = DEFAULT_CLUSTERS
        #numClusters = annotations["clusters"]
        filters = annotations["filters"]

        ## get number of clusters to retrieve and number of objects in the data projection
        clusterLabels = hierarchy.cut_tree(clusters, n_clusters=[numClusters])
        print (clusterLabels)

        restructuredData = np.empty((numClusters,),dtype=object)

        print (restructuredData)

        for i, label in enumerate(clusterLabels):
            if restructuredData[label[0]] is None:
                restructuredData[label[0]] = []
            else:
                restructuredData[label[0]].append(i)

        clusterMeta = []
        print(restructuredData)
        for i in range(0, numClusters):
            clusterMeta.append(extract_unique(restructuredData[i], filters))

        returnData = {
            "annotations": clusterMeta
        }
        return json.dumps(returnData)

    except Exception, e:
        print str(traceback.format_exc())
        return jsonify({'error': str(e), 'trace': traceback.format_exc()})


@app.route("/distance", methods=['POST'])
def calculate_distance():
    global allData, cacheDistances
    req = request.get_json()

    # input
    # {indices: _self.indices, focus: focus, cols: cols}

    allIndices = req["indices"]
    focus = COLS if req["focus"] is None else req["focus"]
    indices, features = extract_feature_vectors(allIndices, focus=focus)
    measure = req["measure"]
    columns = req["cols"]

    print("Data Collected!" + str(len(features)))

    # Find average distance for each from distance matrix
    distances = distance.squareform(distance.pdist(features, measure))
    cacheDistances = distances

    return json.dumps(distances)


@app.route("/order", methods=['POST'])
def group_order():
    global allData, annotationDistributions
    req = request.get_json()

    # input
    # {indices: _self.indices, focus: focus, cols: cols}

    allIndices = req["indices"]
    focus = COLS if req["focus"] is None else req["focus"]
    indices, features = extract_feature_vectors(allIndices, focus=focus)
    measure = req["measure"]
    columns = req["cols"]

    print("Data Collected!" + str(len(features)))

    # Find average distance for each from distance matrix
    if len(features) == 0:
        return json.dumps([])

    distances = distance.squareform(distance.pdist(features, measure))

    for i in range(0, len(indices)):
        total_sum = 0.
        total_num = 0.
        for j in range(0, len(indices)):
            total_sum += distances[i][j]
            total_num += 1.

        score = total_sum / total_num
        allData[indices[i]]["score"] = score

    print("Distances Found!")

    # group

    data_groups = {}
    cluster_groups = []

    for i in range(0, len(indices)):
        index = indices[i]
        datum = allData[index]
        keys = {}
        if len(columns) == 1:
            keys = datum[columns[0]]
        else:
            for col in columns:
                keys[col] = datum[col]

        stringKey = json.dumps(keys)
        if stringKey in data_groups.keys():
            data_groups[stringKey]["key"] = keys
            data_groups[stringKey]["indices"].append(index)
            data_groups[stringKey]["count"] += 1
            # data_groups[stringKey]["scores"].append({"index": index,
            #                                          "score": datum["score"]})
        else:
            data_groups[stringKey] = {}
            data_groups[stringKey]["indices"] = []
            data_groups[stringKey]["annotations"] = []
            data_groups[stringKey]["key"] = keys
            data_groups[stringKey]["count"] = 1
            data_groups[stringKey]["indices"].append(index)
            #data_groups[stringKey]["scores"] = []


    for values in data_groups.values():
        cluster_groups.append({
            "key": values["key"],
            "count": values["count"]
        })

    # print(cluster_groups)
    # for cluster in parse(cluster_groups, 4):
    #     print(cluster)
    #
    # print("Groups formed!")

    ## combine groups
    data_groups_new = {}
    aux = list(data_groups.keys())
    sample = random.sample(aux, 15)
    for elem in sorted(data_groups.keys()):
        data_groups_new[elem] = data_groups[elem]
        
    data_groups = data_groups_new

    # reorder to get annotation data
    for key in data_groups.keys():
        data_group = data_groups[key]
        annotation_group = {}
        for index in data_group["indices"]:
            datum = allData[index]
            #annotation = datum[annotationCol]
            for annotation in datum[annotationCol]:
                if annotation in annotation_group.keys():
                    annotation_group[annotation]["scores"].append(datum["score"])
                    annotation_group[annotation]["indices"].append(index)
                    if datum["score"] < annotation_group[annotation]["range"][0]:
                        annotation_group[annotation]["range"][0] = datum["score"]

                    if datum["score"] > annotation_group[annotation]["range"][1]:
                        annotation_group[annotation]["range"][1] = datum["score"]
                else:
                    annotation_group[annotation] = {}
                    annotation_group[annotation]["annotation"] = annotation
                    annotation_group[annotation]["scores"] = []
                    annotation_group[annotation]["indices"] = []
                    annotation_group[annotation]["range"] = [10000000, -10000000]

                    annotation_group[annotation]["scores"].append(datum["score"])
                    if datum["score"] < annotation_group[annotation]["range"][0]:
                        annotation_group[annotation]["range"][0] = datum["score"]

                    if datum["score"] > annotation_group[annotation]["range"][1]:
                        annotation_group[annotation]["range"][1] = datum["score"]

                    annotation_group[annotation]["indices"].append(index)

        for annotation in annotation_group.keys():
            annotation_group[annotation]["variance"] = extract_variation(annotation_group[annotation]["indices"], focus=focus)
            annotation_group[annotation]["current_points"] = len(annotation_group[annotation]["indices"])
            annotation_group[annotation]["total_points"] = annotationDistributions[annotation]

        data_group["annotations"] = [v for v in annotation_group.values()]

    print("Annotations grouped!")

    # return format:
    # {key, value, array[{index, score}], annotations[{annotation, [min, max score], pointsIndices};
    returnData = [v for v in data_groups.values()]
    #print(returnData)
    return json.dumps(returnData)

## read query from client and return data
@app.route("/data", methods=['POST'])
def get_data():
    raw_query = request.get_json()
    try:
        documents = retrieve_data_from_query(raw_query)
        return wrap_data({}, documents)

    except Exception, e:
        print "Error: Retrieving Data from MongoDB"
        return jsonify({'error': str(e), 'trace': traceback.format_exc()})


## run the server app
if __name__ == "__main__":
    ## run feature generation
    documents, features = create_feature_vectors({})
    allData = documents
    allFeatures = features

    find_annotation_distributions({})

     ## now start server
    app.run(host='0.0.0.0', port=3000, debug=True, use_reloader=False)

    