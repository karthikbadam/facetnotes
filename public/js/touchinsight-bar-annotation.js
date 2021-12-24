/*
 Input is an object containing parentId, cols, width, height
 */

function BarAnnotation(options) {

    var cols, parentId, aggregates, groupbyDim, width, height, backgroundData = null;

    var type = "annchart";

    var filters = [];

    var filters2D = [];

    var label, ticks = 2, log = false;

    var myFormat = d3.format(',');

    var scale = d3.scaleLinear();

    function click(d, i) {

        d3.event.stopPropagation();

        // var filterKey = d["key"];
        // var dimensionName = cols[0];
        //
        // // if (d3.event.altKey) {
        // //     var selection = d3.select(this).attr("fill", THEME.selection);
        // //     console.log(d);
        // //     addAnnotation(d, i, selection);
        // //     return;
        // // }
        //
        // var query = queryManager.createQuery({
        //     index: dimensionName,
        //     value: filterKey,
        //     operator: "equal"
        // });
        //
        // if (filters.indexOf(filterKey) >= 0) {
        //     var index = filters.indexOf(filterKey);
        //     filters.splice(index, 1);
        //     $(".labelObject").remove();
        //
        // } else {
        //     filters.push(filterKey);
        // }
        //
        // if (filters.length == 0) {
        //     aggregates.filterAll();
        // } else {
        //     var filterDim = aggregates.filter(function (d) {
        //         return filters.indexOf(d) >= 0;
        //     });
        // }
        //
        // queryManager.setGlobalQuery(query, true);

    }

    function chart(selection) {
        selection.each(function () {

            var data = [];
            groupbyDim.top(Infinity).forEach(function (d) {

                for (var i = 0; i < d.key.length; i++) {
                    var datum = {};
                    datum.key = d.key[i];
                    datum.value = d.value;
                    data.push(datum);
                }


            });

            var annotations = data.filter(function (d) {
                return d["key"] != "" && d["key"].length > 0 && d["value"] > 0;
            });

            scale.range([0, width]);

            if (!backgroundData) {
                scale.domain(d3.extent(annotations, function (d) {
                    return d["value"];
                }));
                backgroundData = annotations;
                d3.select("#" + parentId).append("div")
                .style("font-size", "15px")
                .html(cols[0][0].toUpperCase() + cols[0].substr(1));

            }

            var container = d3.select("#" + parentId)
                .style("overflow", "scroll");

            container.selectAll(".explicit-annotation").remove();

            var g = container.selectAll(".explicit-annotation")
                .data(annotations, function (d) {
                    return d["key"];
                });

            var div = g.enter().append("div")
                .attr("class", "explicit-annotation")
                .style("background-color", "#EEE")
                .style("border", "1px solid #222")
                .style("margin", "5px")
                .style("padding", "5px")
                .style("display", "block");

            div.append("div")
                .attr("class", "header-div")
                .style("width", "100%")
                .style("display", "block")
                .style("text-align", "right")
                .html(function (d) {
                    return d["value"] + " flights associated with: ";
                });

            div.append("div")
                .attr("class", "content-div")
                .style("width", "100%")

                .style("display", "block")
                .html(function (d) {
                    return d["key"];
                });

            g.select(".header-div")
                .html(function (d) {
                    return d["value"] + " flights associated with: ";
                });

            g.select(".content-div")
                .html(function (d) {
                    return d["key"];
                });

            g.exit().remove();

        });
    }


    chart.render = function () {
        d3.select("#" + parentId).call(this);
        return chart;
    };

    chart.log = function (_) {
        if (!arguments.length) return log;
        log = _;
        return chart;
    };

    chart.ticks = function (_) {
        if (!arguments.length) return ticks;
        ticks = _;
        return chart;
    };

    chart.label = function (_) {
        if (!arguments.length) return label;
        label = _;
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
        margin.top = _;
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
