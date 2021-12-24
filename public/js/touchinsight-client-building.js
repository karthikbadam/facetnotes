
// Custom margin size in the chart based on the attribute in the dataset
var fieldMargins = {};
fieldMargins["date"] = 70;
fieldMargins["description"] = 220;
fieldMargins["subtype"] = 220;
fieldMargins["state"] = 50;
fieldMargins["city"] = 80;
fieldMargins["address"] = 100;
fieldMargins["const_cost"] = 100;
fieldMargins["purpose"] = 120;
fieldMargins["zip"] = 50;
fieldMargins["contact"] = 150;
fieldMargins["latitude"] = 50;
fieldMargins["longitude"] = 50;

var isNumeric = null;

var EMPTY_DATUM = "None";

// Number of visualizations
var visuals = [
    ['date'],
    ["latitude", "longitude"],
    ["description"],
    ["subtype"],
    ["city"],
    ["contact"],
    ["description", "address"]
];

var rows = 4, cols = 4;
var layout = [[2, 1], [2, 3], [1, 2], [1, 2], [1, 1], [1, 1], [2, 1]];
var numViews = layout.length;

var visualizations = new Array(layout.length);

// OTHER GLOBAL VARIABLES
var width = 0;
var height = 0;
var crossfilterData = null;

var THEME = new APPTHEME();
var queryManager = new QueryManager({
    visualizations: visualizations
});

// ----
// When document is loaded, create the layout and ask for data
// ----
$(document).ready(function () {

    //creating the layout
    width = $("body").width();
    height = $("body").height();

    visuals.forEach(function (d, i) {
        visualizations[i] = null;
    });

    var gridster = $(".gridster").gridster({
        widget_margins: [3, 3],
        min_cols: 3,
        autogrow_cols: true,
        resize: {
            enabled: true
        },
        widget_base_dimensions: [width / rows - 7, height / cols - 5],
        autogenerate_stylesheet: true
    }).data('gridster').disable();

    for (var i = 0; i < numViews; i++) {
        gridster.add_widget('<div id = "viz' + i + '" ' +
            'class="panel"></div>', layout[i][0], layout[i][1]);
    }

    //asking for data
    getDatafromQuery("empty");

    // TODO: FIREBASE connection to create cross-device synchronization
    var options = {};
    options.callback = function (query, time, hostDevice) {
        console.log("Synced");
    }

});

// ---
// Getting data
// TODO: connect to a database
// ---
function getDatafromQuery(queryList) {

    $.ajax({
        type: "POST",
        contentType: 'application/json',
        url: "http://localhost:3000/data",
        data: JSON.stringify({}),
        success: function (data) {
            handleDatafromQuery(data["content"]);
        },
        dataType : 'json'
    });
}

function titleCase(str) {
    var newstr = str.split(" ");
    for (i = 0; i < newstr.length; i++) {
        if (newstr[i] == "") continue;
        var copy = newstr[i].substring(1).toLowerCase();
        newstr[i] = newstr[i][0].toUpperCase() + copy;
    }
    newstr = newstr.join(" ");
    return newstr;
}

// ---
// Once data is loaded, create each chart by initializing the reusable D3 visualizations!
// ---
function handleDatafromQuery(data) {

    console.log(data);

    // Figuring out the type of each attribute, is it Numeric or not
    if (isNumeric == null) {

        var allKeys = Object.keys(fieldMargins);

        isNumeric = {};

        for (var i = 0; i < data.length; i++) {

            var d = data[i];

            for (var j = 0; j < allKeys.length; j++) {

                var key = allKeys[j];

                var value = data[i][key];

                if (value == "" || value == null || value == NaN || value == undefined) {

                    if (value == "" || value == null) {
                        data[i][key] = EMPTY_DATUM;
                    }

                    continue;

                } else {

                    isNumeric[key] = $.isNumeric(value);

                }
            }
        }
    }

    crossfilterData = crossfilter(data);

    visuals.forEach(function (d, i) {

        if (d.length == 1) {

            if (visualizations[i] == null) {

                if (d[0].toLowerCase().indexOf("date") > -1 || d[0].toLowerCase().indexOf("time") > -1) {

                    // using CrossFilter library to create aggregates
                    // TODO: might replace with a database query
                    var aggregates, groupbyDim;

                    aggregates = crossfilterData.dimension(function (datum) {
                        return d3.timeHour.floor(new Date(datum[d[0]]));
                    });
                    groupbyDim = aggregates.group();

                    visualizations[i] = TimeChart()
                        .parent("viz" + i)
                        .cols([d[0]])
                        .aggregates(aggregates)
                        .groupbyDim(groupbyDim)
                        .timeScale(d3.timeDay)
                        .timeFormat(d3.timeFormat("%d/%m"))
                        .ticks(9)
                        .label("Permits")
                        .render();

                } else {

                    // TODO: might replace with a database query
                    var aggregates = crossfilterData.dimension(function (datum) {
                        return datum[d[0]];
                    });
                    var groupbyDim = aggregates.group();

                    visualizations[i] = BarChart()
                        .parent("viz" + i)
                        .cols([d[0]])
                        .aggregates(aggregates)
                        .groupbyDim(groupbyDim)
                        .marginLeft(fieldMargins[d[0]])
                        .log(d[0] == "zip"? false: true)
                        .label("")
                        .ticks(2)
                        .render();
                }

            } else {

                visualizations[i].render();

            }
        } else {

            // using CrossFilter
            // TODO: might replace with a database
            var aggregates = crossfilterData.dimension(function (datum) {
                var key = {};
                key[d[0]] = datum[d[0]];
                key[d[1]] = datum[d[1]];
                return JSON.stringify(key);
            });

            var groupbyDim = aggregates.group();

            if (visualizations[i] == null) {
                if (d[0].toLowerCase().indexOf("latitude") > -1) {

                    visualizations[i] = ClusterMap()
                        .parent("viz" + i)
                        .cols([d[0], d[1]])
                        .aggregates(aggregates)
                        .groupbyDim(groupbyDim)
                        .objectSingular("permit")
                        .objectPlural("permits")
                        .render();

                } else {

                    visualizations[i] = ScatterPlot()
                        .parent("viz" + i)
                        .cols([d[0], d[1]])
                        .aggregates(aggregates)
                        .groupbyDim(groupbyDim)
                        .marginLeft(fieldMargins[d[0]])
                        .marginTop(fieldMargins[d[1]])
                        .render();
                }

            } else {

                visualizations[i].render();

            }

        }
    });

}
