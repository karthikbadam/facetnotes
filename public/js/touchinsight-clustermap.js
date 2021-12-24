/**
 * Created by karthik on 2/20/17.
 */

function ClusterMap(options) {

    var type = "map";

    var cols, parentId, aggregates, groupbyDim, objectSingular, objectPlural, backgroundData = null;

    var width, height, left, right, top, bottom;

    var markerGroup = [], bMarkerGroup = [];

    var filters = [];

    var filters2D = [];

    var margin = {
        top: 10,
        right: 10,
        bottom: 20,
        left: 45
    };

    var mapLink = 'Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>';

    var map, tiles, markers;

    function chart(selection) {
        selection.each(function () {

            var data = [];

            groupbyDim.top(Infinity).forEach(function (d) {
                if (d.value > 0) {
                    var datum = {};
                    datum.key = JSON.parse(d.key);
                    datum.value = d.value;
                    data.push(datum);
                }
            });


            width = $("#" + parentId).width() - margin.left - margin.right;
            height = $("#" + parentId).height() - margin.top - margin.bottom;

            // Getting started with initializing the map
            if (!backgroundData) {
                backgroundData = data;

                right = d3.max(data, function (d) {
                    if (!isNaN(d["key"][cols[0]])) {
                        return d["key"][cols[0]];
                    }
                });

                left = d3.min(data, function (d) {
                    if (!isNaN(d["key"][cols[0]])) {
                        return d["key"][cols[0]];
                    }
                });

                top = d3.max(data, function (d) {
                    if (!isNaN(d["key"][cols[1]])) {
                        return d["key"][cols[1]];
                    }
                });

                bottom = d3.min(data, function (d) {
                    if (!isNaN(d["key"][cols[1]])) {
                        return d["key"][cols[1]];
                    }
                });

                map = L.map(parentId, {zoom: 13});

                map.fitBounds(new L.LatLngBounds(new L.LatLng(left, top), new L.LatLng(right, bottom)));

                markers = L.markerClusterGroup({disableClusteringAtZoom: 17});

                tiles = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
                    attribution: mapLink,
                    maxZoom: 18
                }).addTo(map);

                data.forEach(function (d) {
                    if (!isNaN(d["key"][cols[0]]) && !isNaN(d["key"][cols[1]])) {
                        var marker = L.marker(L.latLng(d["key"][cols[0]], d["key"][cols[1]]),
                            {title: (d["value"] > 1 ? d["value"] + " crimes" : d["value"]) + " crime" + " happened here"});
                        marker.bindPopup((d["value"] > 1 ? d["value"] + " crimes" : d["value"]) + " crime" + " happened here");
                        bMarkerGroup.push(marker);
                    }
                });

            } else {

                map.removeLayer(markers);

            }

            markerGroup = [];
            markers.clearLayers();

            //HeatMap
            data.forEach(function (d) {
                if (!isNaN(d["key"][cols[0]]) && !isNaN(d["key"][cols[1]])) {
                    var marker = L.marker(L.latLng(d["key"][cols[0]], d["key"][cols[1]]),
                        {title: (d["value"] > 1 ? d["value"] + " " + objectPlural : d["value"]) + " " + objectSingular + " found here"});
                    marker.bindPopup((d["value"] > 1 ? d["value"] + " " + objectPlural : d["value"]) + " " + objectSingular + " found here");
                    markerGroup.push(marker);
                }
            });

            markers.addLayers(markerGroup);
            map.addLayer(markers);
        });
    }

    chart.render = function () {
        d3.select("#" + parentId).call(this);
        return chart;
    };

    chart.filters = function (_) {
        if (!arguments.length) return filters;
        filters = _;
        return chart;
    };

    chart.filters2D = function (_) {
        if (!arguments.length) return filters2D;
        filters2D = _;
        return chart;
    };

    chart.cols = function (_) {
        if (!arguments.length) return cols;
        cols = _;
        return chart;
    };

    chart.parent = function (_) {
        if (!arguments.length) return parentId;
        parentId = _;
        return chart;
    };

    chart.aggregates = function (_) {
        if (!arguments.length) return aggregates;
        aggregates = _;
        return chart;
    };

    chart.objectSingular = function (_) {
        if (!arguments.length) return objectSingular;
        objectSingular = _;
        return chart;
    };

    chart.objectPlural = function (_) {
        if (!arguments.length) return objectPlural;
        objectPlural = _;
        return chart;
    };

    chart.groupbyDim = function (_) {
        if (!arguments.length) return groupbyDim;
        groupbyDim = _;
        return chart;
    };

    chart.backgroundData = function (_) {
        if (!arguments.length) return backgroundData;
        backgroundData = _;
        return chart;
    };

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin = _;
        return chart;
    };

    chart.marginLeft = function (_) {
        if (!arguments.length) return margin.left;
        margin.left = _;
        return chart;
    };

    chart.marginTop = function (_) {
        if (!arguments.length) return margin.top;
        margin.top = _ + 20;
        return chart;
    };

    chart.width = function (_) {
        if (!arguments.length) return width;
        width = _;
        return chart;
    };

    chart.height = function (_) {
        if (!arguments.length) return height;
        height = _;
        return chart;
    };

    chart.x = function (_) {
        if (!arguments.length) return x;
        x = _;
        return chart;
    };

    chart.y = function (_) {
        if (!arguments.length) return y;
        y = _;
        return chart;
    };

    return chart;
}


