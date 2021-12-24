/*
 Input is an object containing parentId, cols, width, height
 */

function TimeChart(options) {

    var type = "timechart";

    var margin = {
        top: 10,
        right: 30,
        bottom: 20,
        left: 50
    };

    var cols, parentId, aggregates, groupbyDim, width, height, x, y, xAxis, yAxis, byAxis, backgroundData = null;

    var filters = [];

    var filters2D = [];

    var timeScale, timeFormat, ticks;

    var label, log = false;

    var xValue = function (d) {
            return new Date(d["key"]);
        },
        yValue = function (d) {
            return d["value"];
        };

    x = d3.scaleTime(), y = d3.scaleLinear();

    // var line = d3.svg.line().x(xValue).y(yValue);

    var area = d3.area()
        .x(function (d) {
            return x(xValue(d));
        })
        .curve(d3.curveMonotoneX)
        .y1(function (d) {
            // return 0 if date is within a filter
            // Check for switching query on and off
            for (var index = 0; index < filters.length; index++) {
                var filter = filters[index];
                if (d["key"] >= filter[0] && d["key"] <= filter[1]) {
                    return y(yValue(d));
                }
            }
            return filters.length == 0 ? y(yValue(d)) : height;
        });

    function brushend() {
        if (!d3.event.sourceEvent) return; // Only transition after input.
        if (!d3.event.selection) return; // Ignore empty selections.

        var d0 = d3.event.selection.map(x.invert),
            d1 = d0.map(timeScale.round);

        // If empty when rounded, use floor & ceil instead.
        if (d1[0] >= d1[1]) {
            d1[0] = timeScale.floor(d0[0]);
            d1[1] = timeScale.offset(d1[0]);
        }

        d3.select(this).transition().call(d3.event.target.move, d1.map(x));

        var extent = d1;
        var dimensionName = cols[0];

        var query = queryManager.createQuery({
            index: dimensionName,
            value: extent,
            operator: "equal"
        });

        // reset filter every time
        // TODO: remove this to support "OR" queries on time dimensions
        aggregates.filterAll();
        filters = [];

        // Check for switching query on and off
        var index = 0;
        for (index = 0; index < filters.length; index++) {
            var filter = filters[index];
            if (extent[0].getTime() == filter[0].getTime() && extent[1].getTime() == filter[1].getTime()) {
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
        queryManager.retrieveData();
    }

    var brush = d3.brushX()
        .on("end", brushend);

    function chart(selection) {
        selection.each(function () {
            var processedTemp;

            // crossfilter group
            processedTemp = groupbyDim.reduce(
                function (p, v) {
                    var time = timeScale.floor(v[cols[0]]);
                    p.map.set(time, p.map.has(time) ? p.map.get(time) + 1 : 1);
                    p.count++;
                    return p;
                },
                function (p, v) {
                    var time = timeScale.floor(v[cols[0]]);
                    p.map.set(time, p.map.has(time) ? p.map.get(time) - 1 : 0);
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

                // Update the x-scale.
                x.domain(d3.extent(backgroundData, function (d) {
                    return xValue(d);
                }));


            }

            // Update the y-scale.
            y.domain([0, d3.max(data, function (d) {
                return yValue(d);
            })]);

            width = $("#" + parentId).width() - margin.left - margin.right;
            height = $("#" + parentId).height() - margin.top - margin.bottom;

            x.range([0, width]);
            y.range([height, 0]);

            xAxis = d3.axisBottom(x)
                .tickFormat(function (d) {
                    return timeFormat(new Date(d));
                })
                .tickSizeInner(-height)
                .tickSizeOuter(0)
                .tickPadding(10)
                .ticks(ticks);

            yAxis = d3.axisLeft()
                .scale(y)
                .tickFormat(d3.format(".0f"))
                .tickSizeInner(-width)
                .tickSizeOuter(0)
                .tickFormat(d3.format(".2s"))
                .tickPadding(10)
                .ticks(Math.round(height / 20));

            brush.extent([[0, 0], [width, height]]);

            data = data.sort(function (a, b) {
                if (xValue(b).getTime() <
                    xValue(a).getTime()) return 1;
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
                .attr("id", "time")
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
            var foregroundDots = g.selectAll(".foregrounddot")
                .data(data, function (d) {
                    return JSON.stringify(d["key"]);
                });

            foregroundDots.enter()
                .append("circle")
                .attr("class", "foregrounddot")
                .attr("r", 2)
                .attr("cx", function (d) {
                    return x(xValue(d));
                })
                .attr("cy", function (d) {
                    for (var index = 0; index < filters.length; index++) {
                        var filter = filters[index];
                        if (d["key"] >= filter[0] && d["key"] <= filter[1]) {
                            return y(yValue(d));
                        }
                    }
                    return filters.length == 0? y(yValue(d)): height;
                })
                .style("fill", "transparent")
                .style("stroke", THEME.fillColor)
                .style("stroke-width", "1px");

            foregroundDots
                .attr("cx", function (d) {
                    return x(xValue(d));
                })
                .attr("cy", function (d) {
                    for (var index = 0; index < filters.length; index++) {
                        var filter = filters[index];
                        if (d["key"] >= filter[0] && d["key"] <= filter[1]) {
                            return y(yValue(d));
                        }
                    }
                    return filters.length == 0? y(yValue(d)): height;
                });

            foregroundDots.exit().remove();

            // Update the x-axis.
            g.select(".x.axis")
                .attr("transform", "translate(0," + y.range()[0] + ")")
                .call(xAxis);

            // Update the y-axis.
            g.select(".y.axis")
                .call(yAxis);

            if (!byAxis) {
                byAxis = d3.axisRight(y)
                    .tickFormat(d3.format(".2s"))
                    .ticks(6);

                // Update the y-axis.
                g.select(".y.baxis")
                    .attr("transform", "translate(" + x.range()[1] + "0)")
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
                .text(label);

            gEnter.append("text")
                .attr("transform",
                    "translate(" + (width / 2) + " ," +
                    (height) + ")")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .style("pointer-events", "none")
                .text(cols[0]);

        });
    }

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

    chart.timeScale = function (_) {
        if (!arguments.length) return timeScale;
        timeScale = _;
        return chart;
    };

    chart.timeFormat = function (_) {
        if (!arguments.length) return timeFormat;
        timeFormat = _;
        return chart;
    };

    chart.ticks = function (_) {
        if (!arguments.length) return ticks;
        ticks = _;
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
