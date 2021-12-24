/**
 * Created by karthik on 2/20/17.
 */

function Heatmap(options) {

    var cols = options.cols;

    var margin = {
        top: 10,
        right: 10,
        bottom: 20,
        left: 45
    };

    var parentId = options.parentId;

    var map = L.map(parentId);

    var width = options.width - margin.left - margin.right,
        height = options.height - margin.top - margin.bottom;


    function chart(selection) {
        selection.each(function (data) {

            var right = d3.max(data, function (d) {
                if (!isNaN(d["key"][cols[0]])) {
                    return d["key"][cols[0]];
                }
            });

            var left = d3.min(data, function (d) {
                if (!isNaN(d["key"][cols[0]])) {
                    return d["key"][cols[0]];
                }
            });

            var top = d3.max(data, function (d) {
                if (!isNaN(d["key"][cols[1]])) {
                    return d["key"][cols[1]];
                }
            });

            var bottom = d3.min(data, function (d) {
                if (!isNaN(d["key"][cols[1]])) {
                    return d["key"][cols[1]];
                }
            });

            map.fitBounds(new L.LatLngBounds(new L.LatLng(left, top), new L.LatLng(right, bottom)));

            mapLink = '<a href="http://openstreetmap.org">OpenStreetMap</a>';

            L.tileLayer(
			'http://{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png', {
				attribution: '&copy; ' + mapLink + ' Contributors',
				maxZoom: 15,
			}).addTo(map);

            //HeatMap
            var geoData = [];
            data.forEach(function (d) {
                if (!isNaN(d["key"][cols[0]]) && !isNaN(d["key"][cols[1]]))
                    geoData.push([d["key"][cols[0]], d["key"][cols[1]], 1]);
            });

            var heat = L.heatLayer(geoData,{
                radius: 10,
                blur: 20,
                maxZoom: 1
            }).addTo(map);
        });
    };

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin = _;
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

