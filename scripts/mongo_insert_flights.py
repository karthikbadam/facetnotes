import json, pymongo
from datetime import datetime
from titlecase import titlecase
import pandas as pd

EMPTY_DATUM = "None"

# read data from file
print('Opening Data...')
flights = pd.read_csv('input/flights.csv', low_memory=False)
print('Loading Flights into Mongo...')
sliced = flights.loc[(flights["DAY"] == 3) & (flights["AIRLINE"] == "DL") & (flights["DISTANCE"] > 1000)]
print(sliced.head())
data_json = json.loads(sliced.to_json(orient='records'))

# read data from file
airports = pd.read_csv('input/airports.csv', index_col="IATA_CODE")
print('Loading Airports into Mongo...')

def validate(date, pattern):
    try:
        return datetime.strptime(date, pattern)
    except ValueError:
        return

def title_case(line):
    return titlecase(line)


# put in mongoDB
mongo_client = pymongo.MongoClient()
mongo_collection = mongo_client.flights.delay
mongo_collection.drop()  # throw out what's there


allData = []

def myround(x, base=10):
    return int(base * round(float(x)/base))

index = 0
for data in data_json:
    wData = {}

    if data["CANCELLATION_REASON"] is not None:
        continue

    if data["ORIGIN_AIRPORT"] not in airports.index.values or data["DESTINATION_AIRPORT"] not in airports.index.values:
        continue

    wData["origin"] = airports["CITY"][data["ORIGIN_AIRPORT"]] + ", " + airports["STATE"][data["ORIGIN_AIRPORT"]]
    wData["destination"] = airports["CITY"][data["DESTINATION_AIRPORT"]] + ", " + airports["STATE"][data["DESTINATION_AIRPORT"]]
    wData["origin_state"] = airports["STATE"][data["ORIGIN_AIRPORT"]]
    wData["destination_state"] = airports["STATE"][data["DESTINATION_AIRPORT"]]
    wData["flight"] = data["AIRLINE"] + str(data["FLIGHT_NUMBER"])

    wData["dep_delay"] = myround(data["DEPARTURE_DELAY"]) if data["DEPARTURE_DELAY"] is not None else 0
    wData["arr_delay"] = myround(data["ARRIVAL_DELAY"]) if data["ARRIVAL_DELAY"] is not None else 0

    wData["distance"] = myround(data["DISTANCE"], 100)

    wData["reason"] = ""

    reasons = []
    if data["AIR_SYSTEM_DELAY"] is not None and int(data["AIR_SYSTEM_DELAY"]) != 0:
        reasons.append("system issues due to a power outage at the operations center")

    if data["SECURITY_DELAY"] is not None and int(data["SECURITY_DELAY"]) != 0:
        reasons.append("security issues caused by understaffed TSA at the checkpoints")

    if data["AIRLINE_DELAY"] is not None and int(data["AIRLINE_DELAY"]) != 0:
        reasons.append("airline glitches due to lack of coordination and maintenance problems")

    if data["LATE_AIRCRAFT_DELAY"] is not None and int(data["LATE_AIRCRAFT_DELAY"]) != 0:
        reasons.append("late aircraft due to fueling and late arrival from a previous trip")

    if data["WEATHER_DELAY"] is not None and int(data["WEATHER_DELAY"]) != 0:
        reasons.append("extreme weather such as tornado, hurricane, or blizzard")

    final_reason = ""

    for i in range(0, len(reasons)):
        r = reasons[i]
        if i == 0 and len(reasons) == 1:
            final_reason += "Delay caused by " + r
        elif i == 0 and len(reasons) != 1:
            final_reason += "Delay caused by (1) " + r
        elif i != 0 and i == len(reasons) - 1:
            final_reason += ", and (" + str(i+1) + ") " + r
        else:
            final_reason += ", (" + str(i+1) + ") " + r

    wData["reason"] = [final_reason] if final_reason != "" else []
    wData["index"] = index

    allData.append(wData)
    index+=1

mongo_collection.insert(allData)
print("Data Loaded!")

# create index by specific columns
mongo_collection.create_index('dep_delay')
mongo_collection.create_index('arr_delay')
mongo_collection.create_index('destination')


# close connection
mongo_client.close()