// Custom margin size in the chart based on the attribute in the dataset
var fieldMargins = {};
fieldMargins["origin_state"] = 30;
fieldMargins["origin"] = 100;
fieldMargins["destination"] = 100;
fieldMargins["destination_state"] = 30;

fieldMargins["distance"] = 50;
fieldMargins["dep_delay"] = 50;
fieldMargins["arr_delay"] = 50;

fieldMargins["flight"] = 50;

var isNumeric = null;

var EMPTY_DATUM = "None";


var DONT_ANNOTATION_GROUPS = false;

// Number of visualizations
var visuals = [
    ['dep_delay'],
    ["origin"],
    ["destination"],
    ['arr_delay'],
    ["distance"],
    ["origin_state"],
    ["destination_state"],
    ["origin", "dep_delay"],
    ["destination", "arr_delay"],

];

var rows = 4, cols = 4;
// layout format: [cols, rows]
var layout = [[2, 1], [1, 2], [1, 2], [2, 1], [2, 1], [1, 1], [1, 1], [2, 1], [2, 1]];
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

var annotationBinner;

Array.prototype.compare = function (testArr) {
    if (this.length != testArr.length) return false;
    for (var i = 0; i < testArr.length; i++) {
        if (this[i].compare) { //To test values in nested arrays
            if (!this[i].compare(testArr[i])) return false;
        }
        else if (this[i] !== testArr[i]) return false;
    }
    return true;
};

// ----
// When document is loaded, create the layout and ask for data
// ----
$(document).ready(function () {

    //creating the layout
    width = $("#content").width();
    height = $("#content").height();

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

    // header
    createHeader();

    //asking for data
    getDatafromQuery();

    // TODO: FIREBASE connection to create cross-device synchronization
    var options = {};
    options.callback = function (query, time, hostDevice) {
        console.log("Synced");
    }

});

// ---
// Getting data
// ---
function createHeader() {

    // button for clear all interactions
    d3.select("#header").append("div").style("display", "inline-block").style("margin-right", "10px")
        .append("button")
        .attr("id", "clear-all")
        .attr("class", "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect")
        .html("Clear Interactions")
        .on("click", function () {

            visualizations.forEach(function (v) {
                v.aggregates().filterAll();
                v.filters([]);
                v.filters2D([]);
            });
            queryManager.setGlobalQuery({}, true);
        });

    componentHandler.upgradeElement(document.getElementById("clear-all"));

    // button for show/hiding annotations
    var label = d3.select("#header").append("div").style("display", "inline-block")
        .style("margin-left", "50px")
        .append("label")
        .attr("id", "show-annotations-toggle")
        .attr("class", "mdl-switch mdl-js-switch mdl-js-ripple-effect")
        .attr("for", "show-annotations-switch")
        .style("display", "inline-block");

    label.append("span")
        .attr("class", "mdl-switch__label")
        .html("Show Annotations");

    label.append("input")
        .attr("type", "checkbox")
        .attr("id", "show-annotations-switch")
        .attr("class", "mdl-switch__input")
        .property("checked", false)
        .on("change", function () {
            if (document.getElementById('show-annotations-switch').checked) {
                d3.selectAll(".annotation-dot").style("display", "block");
            } else {
                d3.selectAll(".annotation-dot").style("display", "none");
            }
        });

    componentHandler.upgradeElement(document.getElementById("show-annotations-toggle"));

    d3.select("#header").on("click", function () {
        $(".labelObject").remove();
    });

    // button for show/hiding annotations
    var label = d3.select("#header").append("div").style("display", "inline-block")
        .style("margin-left", "70px")
        .append("label")
        .attr("id", "show-clusters-toggle")
        .attr("class", "mdl-switch mdl-js-switch mdl-js-ripple-effect")
        .attr("for", "show-clusters-switch")
        .style("display", "inline-block");

    label.append("span")
        .attr("class", "mdl-switch__label")
        .html("Perform Clustering");

    label.append("input")
        .attr("type", "checkbox")
        .attr("id", "show-clusters-switch")
        .attr("class", "mdl-switch__input")
        .property("checked", false)
        .on("change", function () {
            if (document.getElementById('show-clusters-switch').checked) {
                //d3.selectAll(".annotation-dot").style("display", "block");
            } else {
                //d3.selectAll(".annotation-dot").style("display", "none");
            }
        });

    componentHandler.upgradeElement(document.getElementById("show-clusters-toggle"));

    d3.select("#header").on("click", function () {
        $(".labelObject").remove();
    });

}

// ---
// Getting data
// TODO: connect to a database
// ---
function getDatafromQuery() {

    $.ajax({
        type: "POST",
        contentType: 'application/json',
        url: "/data",
        data: JSON.stringify({}),
        success: function (data) {
            handleDatafromQuery(data["content"]);
        },
        dataType: 'json'
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

        for (var i = 0; i < 30; i++) {

            var d = data[i];

            for (var j = 0; j < allKeys.length; j++) {

                var key = allKeys[j];

                var value = data[i][key];

                if (value == "" || value == null || value == NaN || value == undefined) {

                    // if (value == "" || value == null) {
                    //     data[i][key] = EMPTY_DATUM;
                    // }

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

                if (isNumeric[d[0]]) {

                    // using CrossFilter library to create aggregates
                    // TODO: might replace with a database query
                    var aggregates, groupbyDim;

                    aggregates = crossfilterData.dimension(function (datum) {
                        return datum[d[0]];
                    });
                    groupbyDim = aggregates.group();

                    visualizations[i] = LineChart()
                        .parent("viz" + i)
                        .cols([d[0]])
                        .aggregates(aggregates)
                        .groupbyDim(groupbyDim)
                        .log(d[0] == "distance" ? false : true)
                        .ticksX(d[0] == "distance" ? 200 : 30)
                        .ticksY(d[0] == "distance" ? 100 : 50)
                        .label("#Flights");

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
                        .log(false)
                        .label("#Flights")
                        .ticks(5);
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
                        .objectSingular("flight")
                        .objectPlural("flights");

                } else {

                    visualizations[i] = ScatterPlot()
                        .parent("viz" + i)
                        .cols([d[0], d[1]])
                        .aggregates(aggregates)
                        .groupbyDim(groupbyDim)
                        .marginLeft(fieldMargins[d[0]])
                        .marginTop(fieldMargins[d[1]]);

                }

            } else {

                visualizations[i].render();

            }

        }
    });

    annotationBinner = new AnnotationBinner({});
    annotationBinner.extract();

    visualizations.forEach(function (v) {
        v.render();
    });

}
