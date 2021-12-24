/*
 Input is an object containing parentId, cols, width, height
 */

function LineChart(options) {

    var type = this.type = "linechart";

    var margin = {
        top: 10,
        right: 30,
        bottom: 40,
        left: 50
    };

    var curve;

    var cols, parentId, aggregates, groupbyDim, width, height, x, y, xAxis, yAxis, byAxis, backgroundData = null;

    var filters = [];

    var filters2D = [];

    var roundValue = 10, ticksX, ticksY, log = false;

    var label, log = false;

    var roundScale = function (n, index) {
        index = index ? index : 10;
        return Math.round(n * 1.0 / index) * index;
    };

    var xValue = function (d) {
            return d["key"];
        },
        yValue = function (d) {
            return d["value"];
        };

    x = d3.scaleLinear(), y = d3.scaleLinear();

    var formatSuffix = d3.format(".2s");

    // var line = d3.svg.line().x(xValue).y(yValue);

    var measure = null;

    var focus = null;

    var area = d3.area()
        .x(function (d) {
            return x(xValue(d));
        })
        .curve(curve ? curve : d3.curveStep)
        .y1(function (d) {
            // return 0 if date is within a filter
            // Check for switching query on and off
            for (var index = 0; index < filters.length; index++) {
                var filter = filters[index];
                if (d["key"] >= filter[0] && d["key"] <= filter[1]) {
                    return isFinite(y(yValue(d))) ? y(yValue(d)) : height;
                }
            }
            return filters.length == 0 ? (isFinite(y(yValue(d))) ? y(yValue(d)) : height) : height;
        });

    function addAnnotationIcons(data) {

        $("#labelObject"+parentId).remove();

        // {key, value, array[{index, score}], annotations[{annotation, [min, max score], pointsIndices};
        console.log(data);

        // Foreground view showing the current data
        var annElements = d3.select("#" + parentId).select("#container").selectAll(".annotation-dot")
            .data(data, function (d) {
                return d["key"];
            });

        annElements.enter().append("circle")
            .attr("class", "annotation-dot")
            .attr("r", 5)
            .attr("cx", function (d) {
                return x(xValue(d));
            })
            .attr("cy", function (d) {
                return y(d["indices"].length);
            })
            .style("fill", THEME.selection)
            .style("fill-opacity", 0.7)
            .style("stroke", "white")
            .style("stroke-width", "1px")
            .on("click", showAnnotation)
            .style("display", document.getElementById('show-annotations-switch').checked ? "block" : "none");

        annElements
            .attr("cx", function (d) {
                return x(xValue(d));
            })
            .attr("cy", function (d) {
                return y(d["indices"].length);
            })
            .on("click", showAnnotation);

        annElements.exit().remove();
    }


    function brushend() {
        $("#labelObject"+parentId).remove();
        if (!d3.event.sourceEvent) return; // Only transition after input.
        if (!d3.event.selection) {
            //delete filters and then return
            if (filters.length == 0) return;
            aggregates.filterAll();
            filters = [];
            queryManager.setGlobalQuery({}, true);
            return;
        }  // Ignore empty selections.

        var d0 = d3.event.selection.map(x.invert),
            d1 = d0.map(roundScale);

        // If empty when rounded, use floor & ceil instead.
        if (d1[0] >= d1[1]) {
            d1[0] = roundScale(d0[0]);
            d1[1] = roundScale(d0[0]) + roundValue;
        }

        d3.select(this).transition().call(d3.event.target.move, d1.map(x));

        var extent = d1;
        var dimensionName = cols[0];

        var query = queryManager.createQuery({
            index: dimensionName,
            value: extent,
            operator: "equal"
        });

        // reset filter
        // TODO: remove this to support "OR" queries
        aggregates.filterAll();
        filters = [];

        // Check for switching query on and off
        var index = 0;
        for (index = 0; index < filters.length; index++) {
            var filter = filters[index];
            if (extent[0] == filter[0] && extent[1] == filter[1]) {
                filters.splice(index, 1);
                index = -1;
                break;
            }
        }
        if (index >= 0) {
            filters.push(extent);
        }

        // Applying filter
        if (filters.length == 0) {
            aggregates.filterAll();
        } else {
            var filterDim = aggregates.filter(function (e) {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    return e >= filter[0] && e <= filter[1];
                }
            });
        }
        queryManager.setGlobalQuery(query, true);

    }

    function redrawAnnotations(newFocus, newMeasure) {

        // change metrics
        focus = newFocus ? newFocus : focus;
        measure = newMeasure ? newMeasure : measure;

        // query server
        if (!DONT_ANNOTATION_GROUPS)
            annotationBinner.group_order(addAnnotationIcons, cols, focus, measure);
    }

    function showAnnotation(d, i) {

        // Based on traditional binning algorithms
        $("#labelObject"+parentId).remove();
        d3.event.stopPropagation();

        var annotations = d["annotations"];

        annotations = annotations.sort(function (a, b) {
             if (b["scores"].length == a["scores"].length) {
                var metric1 = a["range"][1] - a["range"][0];
                var metric2 = b["range"][1] - b["range"][0];
                if (metric1 > metric2) {
                    return 1;
                } else if (metric1 == metric2) {
                    return a["range"][1] - b["range"][1];
                } else {
                    return -1;
                }
            }

            return b["scores"].length - a["scores"].length;
        });

        var widget_width = 600;
        var widget_height = 600;
        var left = d3.event.pageX + widget_width > $("body").width() ? $("body").width() - widget_width : d3.event.pageX;
        var top = d3.event.pageY + widget_height > $("body").height() ? $("body").height() - widget_height : d3.event.pageY;

        var inputWrapper = d3.select("body")
            .append("div").attr("id", "labelObject" + parentId)
            .attr("class", "labelObject")
            .style("left", (left - 20) + "px")
            .style("top", (top - 40) + "px")
            .style("width", widget_width)
            .style("height", widget_height)
            .style("position", "absolute")
            .style("z-index", 100)
            .style("overflow", "scroll");

        // Bind the functions...
        document.getElementById("labelObject" + parentId).onmousedown = function () {
            _drag_init(this);
            return false;
        };

        inputWrapper = inputWrapper.append("fieldset").attr("id", "annotation-form")
            .style("max-height", widget_height - 100)
            .style("background-color", "rgba(255, 255, 255, 0.7)");

        inputWrapper.append("legend")
            .html("Annotations");

        inputWrapper = inputWrapper.append("div")
            .style("max-height", widget_height - 110)
            .attr("class", "annotationBox")
            .style("overflow", "scroll");

        var ann_width = widget_width - 30;

        var header = annotationBinner.buildHeader(inputWrapper, ann_width, 20,
            focus,
            measure,
            redrawAnnotations);

        annotations.forEach(function (a) {
            var aWrapper = inputWrapper.append("div")
                .style("width", ann_width)
                .style("height", widget_height / 4)
                .style("margin-bottom", "5px")
                .style("border", "1px solid black")
                .style("display", "block");


            var starWidth = 0.3 * ann_width > widget_height / 4 ? widget_height / 4 : 0.3 * ann_width;

            // // code for showing bar variance
            var aWrapperLeft = aWrapper.append("div")
                .style("width", starWidth)
                .style("height", widget_height / 4)
                .style("float", "left");


            var star = new StarAnnotation(aWrapperLeft, starWidth, starWidth, a["variance"], focus ? focus : annotationBinner.COLS);

            aWrapper.append("div")
                .style("width", widget_width - starWidth - 50)
                .style("height", 20)
                .style("text-align", "right")
                .style("float", "right")
                .style("padding-left", "3px")
                .style("display", "inline-block")
                .html(function () {
                    return "Of total delays, <b>" + a["total_points"] + "</b> flights have the reason:"
                    //return a["current_points"]+ " of " + a["total_points"] + " points associated to: ";
                });

            aWrapper.append("div")
                .style("width", widget_width - starWidth - 50)
                .style("height", widget_height / 4 - 40)
                .style("display", "inline-block")
                .style("padding-left", "3px")
                .style("float", "right")
                .style("font-size", "14px")
                .html(function () {
                    return a["annotation"];
                });

            aWrapper.append("div")
                .style("width", widget_width - starWidth - 50)
                .style("height", 20)
                .style("text-align", "right")
                .style("float", "right")
                .style("padding-left", "3px")
                .style("display", "inline-block")
                .html(function () {
                    return  "<b>" + a["current_points"]+  "</b> flights from selection are associated with this reason";
                    //return a["current_points"]+ " of " + a["total_points"] + " points associated to: ";
                });
        })
    }

    var brush = d3.brushX()
        .on("end", brushend);

    function chart(selection) {
        selection.each(function () {
            var processedTemp;

            // crossfilter group
            processedTemp = groupbyDim.reduce(
                function (p, v) {
                    var value = roundScale(v[cols[0]]);
                    p.map.set(value, p.map.has(value) ? p.map.get(value) + 1 : 1);
                    p.count++;
                    return p;
                },
                function (p, v) {
                    var value = roundScale(v[cols[0]]);
                    p.map.set(value, p.map.has(value) ? p.map.get(value) - 1 : 0);
                    p.count--;
                    return p;

                },
                function () {
                    return {map: d3.map(), count: 0};
                }
            ).all();

            var data = [];
            processedTemp.forEach(function (d) {
                data.push({
                    "key": d.key,
                    "value": d.value.count
                });
            });


            if (!backgroundData) {
                backgroundData = data;
                y = log ? d3.scaleLog() : d3.scaleLinear();

                // Update the x-scale.
                x.domain(d3.extent(backgroundData, function (d) {
                    return xValue(d);
                }));

                // Update the y-scale.
                var domainY = log ? d3.extent(data, function (d) {
                    return yValue(d);
                }) : [0, d3.max(data, function (d) {
                    return yValue(d);
                })];

                if (log && domainY[0] == 0) {
                    domainY[0] = 1
                }

                y.domain(domainY);
            }

            width = $("#" + parentId).width() - margin.left - margin.right;
            height = $("#" + parentId).height() - margin.top - margin.bottom;

            x.range([0, width]);
            y.range([height, 0]);

            xAxis = d3.axisBottom(x)
                .tickFormat(function (d) {
                    return formatSuffix(d);
                })
                .tickSizeInner(-height)
                .tickSizeOuter(0)
                .tickPadding(10)
                .tickValues(function () {
                    var d = x.domain();
                    var ticks = [];
                    for (var i = d[0]; i < d[1]; i += 10) {
                        if (i % ticksX == 0) {
                            ticks.push(i);
                        }
                    }
                    return ticks;
                }());

            yAxis = d3.axisLeft()
                .scale(y)
                .tickSizeInner(-width)
                .tickSizeOuter(0)
                .tickFormat(d3.format(".2s"))
                .tickPadding(10)
                .tickValues(function () {
                    var d = y.domain();
                    var t = [];
                    var i = d[0];
                    while (i < d[1]) {
                        i = log ? i + 10 * (i / 10) : i + 10;
                        if (log) {
                            t.push(i);
                        }
                        else if (i % ticksY == 0) {
                            t.push(i);
                        }
                    }
                    return t;
                }());

            brush.extent([[0, 0], [width, height]]);

            data = data.sort(function (a, b) {
                if (xValue(b) <
                    xValue(a)) return 1;
                return -1;
            });

            // Select the svg element, if it exists.
            var svg = d3.select(this).selectAll("svg");

            // Otherwise, create the skeletal chart.
            var gEnter = svg.data([data]).enter().append("svg").attr("id", parentId + "line").append("g").attr("id", "container");

            // Update the outer dimensions.
            d3.select(this).selectAll("svg").attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom);

            gEnter.append("g").attr("class", "x axis");
            gEnter.append("g").attr("class", "y axis");
            gEnter.append("g").attr("class", "y baxis");

            // Update the inner dimensions.
            var g = d3.select(this).select("#container").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var background = g.selectAll(".background")
                .data([backgroundData]);

            background.enter()
                .append("path")
                .attr("class", "background")
                .attr("d", area.y0(y.range()[0]))
                .attr("fill", THEME.backgroundColor)
                .attr("fill-opacity", 0.05)
                .attr("stroke", THEME.backgroundColor)
                .attr("stroke-width", "1.5px");

            // // Update the area path.
            // background
            //     .attr("d", area.y0(y.range()[0]));

            background.exit().remove();

            // Update the y-axis.
            g.select(".y.axis")
                .call(yAxis);

            var foreground = g.selectAll(".foreground")
                .data([data]);

            foreground.enter()
                .append("path")
                .attr("id", "line")
                .attr("class", "foreground")
                .attr("d", area.y0(y.range()[0]))
                .attr("fill", THEME.fillColor)
                .attr("fill-opacity", 0.3)
                .attr("stroke", THEME.strokeColor)
                .attr("stroke-width", "1.5px");

            // Update the area path.
            foreground
                .attr("d", area.y0(y.range()[0]));

            foreground.exit().remove();

            // Update foreground
            // var foregroundDots = g.selectAll(".foregrounddot")
            //     .data(data, function (d) {
            //         return JSON.stringify(d["key"]);
            //     });
            //
            // foregroundDots.enter()
            //     .append("circle")
            //     .attr("class", "foregrounddot")
            //     .attr("r", 2)
            //     .attr("cx", function (d) {
            //         return x(xValue(d));
            //     })
            //     .attr("cy", function (d) {
            //         for (var index = 0; index < filters.length; index++) {
            //             var filter = filters[index];
            //             if (d["key"] >= filter[0] && d["key"] <= filter[1]) {
            //                 return isFinite(y(yValue(d))) ? y(yValue(d)) : height;
            //             }
            //         }
            //         return filters.length == 0 ? (isFinite(y(yValue(d))) ? y(yValue(d)) : height) : height;
            //     })
            //     .style("fill", "transparent")
            //     .style("stroke", THEME.fillColor)
            //     .style("stroke-width", "1px");
            //
            // foregroundDots
            //     .attr("cx", function (d) {
            //         return x(xValue(d));
            //     })
            //     .attr("cy", function (d) {
            //         for (var index = 0; index < filters.length; index++) {
            //             var filter = filters[index];
            //             if (d["key"] >= filter[0] && d["key"] <= filter[1]) {
            //                 return isFinite(y(yValue(d))) ? y(yValue(d)) : height;
            //             }
            //         }
            //         return filters.length == 0 ? (isFinite(y(yValue(d))) ? y(yValue(d)) : height) : height;
            //     });
            //
            // foregroundDots.exit().remove();

            // Update the x-axis.
            g.select(".x.axis")
                .attr("transform", "translate(0," + y.range()[0] + ")")
                .call(xAxis);

            // Update the y-axis.
            g.select(".y.axis")
                .call(yAxis);

            if (!byAxis) {
                byAxis = d3.axisRight(y)
                    .tickFormat(d3.format(".1s"))
                    .ticks(3);

                // Update the y-axis.
                g.select(".y.baxis")
                    .attr("transform", "translate(" + x.range()[1] + ",0)")
                    .call(byAxis);

            }

            gEnter.append("g").attr("class", "brushend").call(brush);

            // axis labels
            // text label for the y axis
            gEnter.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0 - (height / 2))
                .attr("dy", "1em")
                .attr("fill", "#222")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .text(log ? label + " (Log)" : label);

            gEnter.append("text")
                .attr("transform",
                    "translate(" + (width / 2) + " ," +
                    (height + margin.top + margin.bottom - 15) + ")")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .style("pointer-events", "none")
                .text(cols[0]);

            if (!DONT_ANNOTATION_GROUPS)
                annotationBinner.group_order(addAnnotationIcons, cols, focus, measure);
        });
    }

    chart.log = function (_) {
        if (!arguments.length) return log;
        log = _;
        return chart;
    };

    chart.render = function () {
        d3.select("#" + parentId).call(this);
        return chart;
    };

    chart.label = function (_) {
        if (!arguments.length) return label;
        label = _;
        return chart;
    };

    chart.log = function (_) {
        if (!arguments.length) return log;
        log = _;
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

    chart.roundScale = function (_) {
        if (!arguments.length) return roundScale;
        roundValue = _;
        roundScale = function (n, _) {
            var index = _ ? _ : 10;
            return Math.round(n * 1.0 / index) * index;
        };
        return chart;
    };

    chart.ticksY = function (_) {
        if (!arguments.length) return ticks;
        ticksY = _;
        return chart;
    };

    chart.ticksX = function (_) {
        if (!arguments.length) return ticks;
        ticksX = _;
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
