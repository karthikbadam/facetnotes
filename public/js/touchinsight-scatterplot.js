function ScatterPlot(options) {

    var type = "scatterplot";

    var margin = {
        top: 20,
        right: 10,
        bottom: 20,
        left: 10
    };

    var filters = [];

    var filters2D = [];

    var cols, parentId, aggregates, groupbyDim, backgroundData = null;

    var width, height, x, y, domainX, domainY, xItems, yItems, xAxis, yAxis, radius;

    var parseTime = d3.timeParse("%H:%M:%S");

    var pointH = 25;

    var FONTWIDTH = 10;

    var minRadius = 1.5;

    // When showing numbers, round them to save space -- e.g., 1632 -> 2K
    var formatSuffix = d3.format(".2s");

    var measure = null;

    var focus = null;

    function addAnnotation(d, i, selection) {

        $("#labelObject" + parentId).remove();

        if (!d3.event.altKey) {
            return;
        }

        // add annotation textbox
        $(".annotationObject").remove();

        var inputWrapper = d3.select("body").append("div")
            .attr("class", "annotationObject")
            .style("left", (d3.event.pageX - 20) + "px")
            .style("top", (d3.event.pageY - 40) + "px")
            .style("width", 200)
            .style("height", 200)
            .style("position", "absolute")
            .style("z-index", 100);

        inputWrapper = inputWrapper.append("fieldset").attr("id", "annotation-form")
            .style("background-color", "rgba(255, 255, 255, 0.7)");

        inputWrapper.append("legend")
            .html("Annotation");

        var inputDiv = inputWrapper.append("div")
            .attr("class", "mdl-textfield mdl-js-textfield");

        inputDiv.append("textarea")
            .attr("class", "mdl-textfield__input")
            .attr("id", parentId + "annotation")
            .attr("type", "text")
            .attr("width", 180)
            .attr("rows", "3")
            .on("change", function () {
                //Handle entered data here
                console.log(this.value);
                if (this.value && this.value.length > 0) {
                    d3.select("#" + parentId + "annotation-button").html("Add");
                } else {
                    d3.select("#" + parentId + "annotation-button").html("Close");
                }
            });

        inputDiv.append("label")
            .attr("class", "mdl-textfield__label")
            .attr("for", parentId + "annotation");

        componentHandler.upgradeElement(document.getElementById(parentId + "annotation"));

        inputWrapper.append("button")
            .attr("id", parentId + "annotation-button")
            .attr("class", "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect")
            .html("Close")
            .on('click', function () {

                console.log("Final annotation: " + document.getElementById(parentId + "annotation").value);

                if (document.getElementById(parentId + "annotation").value.length > 0) {
                    //do something
                }

                $(".annotationObject").remove();

                if (!selection.empty()) {
                    selection.attr("fill", function () {
                        return this.tagName.toLowerCase() == "text" ? "#AAA" : THEME.fillColor;
                    });
                }
            });

        componentHandler.upgradeElement(document.getElementById(parentId + "annotation-button"));
    };

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
            .attr("r", function (d) {
                return radius(d["indices"].length);
            })
            .attr("cx", function (d) {
                if (isNumeric[cols[1]] && d["key"][cols[1]] == EMPTY_DATUM)
                    return 0;

                return x(d["key"][cols[1]]);
            })
            .attr("cy", function (d) {
                if (isNumeric[cols[0]] && d["key"][cols[0]] == EMPTY_DATUM)
                    return 0;

                return y(d["key"][cols[0]]);
                //return y(d["indices"].length);
            })
            .style("fill", THEME.selection)
            .style("fill-opacity", 0.7)
            .style("stroke", "white")
            .style("stroke-width", "1px")
            .on("click", showAnnotation)
            .style("display", document.getElementById('show-annotations-switch').checked ? "block" : "none");

        annElements
            .attr("r", function (d) {
                return radius(d["indices"].length);
            })
            .attr("cx", function (d) {
                if (isNumeric[cols[1]] && d["key"][cols[1]] == EMPTY_DATUM)
                    return 0;

                return x(d["key"][cols[1]]);
            })
            .attr("cy", function (d) {
                if (isNumeric[cols[0]] && d["key"][cols[0]] == EMPTY_DATUM)
                    return 0;

                return y(d["key"][cols[0]]);
                //return y(d["indices"].length);
            })
            .on("click", showAnnotation);

        annElements.exit().remove();
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
            var metric1 = a["range"][1] - a["range"][0];
            var metric2 = b["range"][1] - b["range"][0];

            return a["scores"].length < b["scores"].length;

            if (metric1 < metric2) {
                return 1;
            } else if (metric1 == metric2) {
                return a["range"][1] < b["range"][1];
            } else {
                return -1;
            }
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
            .style("overflow", "scroll")
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


            var starWidth = 0.3 * ann_width > widget_height / 4? widget_height / 4: 0.3 * ann_width;

             // // code for showing bar variance
            var aWrapperLeft = aWrapper.append("div")
                .style("width", starWidth)
                .style("height", widget_height / 4)
                .style("float", "left");


            var star = new StarAnnotation(aWrapperLeft, starWidth, starWidth, a["variance"], focus ? focus:annotationBinner.COLS);

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


    function click(d, i) {
        $("#labelObject"+parentId).remove();

        var filterKey = d["key"];
        var dimensionName = cols[0];

        var query = queryManager.createQuery({
            index: [cols[0], cols[1]],
            value: filterKey,
            operator: "equal"
        });


        // Check for switching query on and off
        var index = 0;
        for (index = 0; index < filters2D.length; index++) {
            var filter = filters2D[index];
            var e = filterKey;
            if (filter[cols[0]] == e[cols[0]] && filter[cols[1]] == e[cols[1]]) {
                filters2D.splice(index, 1);
                index = -1;
                break;
            }
        }

        if (index >= 0) {
            filters2D.push(filterKey);
        }

        //apply filter
        if (filters2D.length == 0) {

            aggregates.filterAll();

        } else {

            var filterDim = aggregates.filter(function (e) {
                for (var i = 0; i < filters2D.length; i++) {
                    var filter = filters2D[i];

                    // making a copy of e
                    var jsonE = "" + e;
                    jsonE = JSON.parse(jsonE);

                    if (filter[cols[0]] == jsonE[cols[0]] && filter[cols[1]] == jsonE[cols[1]])
                        return true;
                }
                return false;
            });
        }
        queryManager.setGlobalQuery(query, true);
    }


    function chart(selection) {
        selection.each(function () {

            var processedTemp = groupbyDim.top(Infinity);

            var data = [];
            processedTemp.forEach(function (datum) {

                var key = JSON.parse(datum.key);

                key[cols[0]] = "" + key[cols[0]];
                key[cols[1]] = "" + key[cols[1]]

                if (key[cols[0]] != null && key[cols[1]] != null) {
                    data.push({
                        key: key,
                        value: datum.value
                    });
                }

            });

            data = data.sort(function (a, b) {
                if (isNumeric[cols[1]]) {
                    if (parseFloat(b["key"][cols[1]]) <
                        parseFloat(a["key"][cols[1]])) return 1;
                    return -1;
                }
                if (b["key"][cols[0]] <
                    a["key"][cols[0]]) return 1;
                return -1;
            });

            radius = d3.scaleLinear()
                .domain([0, d3.max(data, function (p) {
                    return p["value"];
                })])
                .range([minRadius, pointH / 2]);

            // Running first time
            // Figuring out the dimension type and labels!
            if (d3.select("#" + parentId + "scatter").empty()) {

                for (var i = 0; i < 2; i++) {
                    var d = cols[i];

                    if (i == 0) {
                        if (isNumeric[d]) {

                            // domainY = d3.extent(data, function (p) {
                            //     if (isNaN(p["key"][d])) {
                            //         return data[1]["key"][d];
                            //     }
                            //     return p["key"][d];
                            // });
                            //
                            // y = d3.scaleLinear();
                            //
                            // yItems = 0;
                            //
                            //  y = d3.scalePoint();

                            var nest = d3.nest()
                                .key(function (p) {
                                    return p["key"][d];
                                })
                                .entries(data);

                            domainY = nest.map(function (p) {
                                return p["key"];
                            }).reverse();

                            yItems = domainY.length > 50 ? 50 : domainY.length;

                        } else if (d.toLowerCase().indexOf("date") > 0) {

                            // for drawing by each column
                            data = data.sort(function (a, b) {
                                if (b["key"][cols[1]] <
                                    a["key"][cols[1]]) {
                                    return 1;
                                }
                                return -1;
                            });

                            domainY = d3.extent(data, function (p) {
                                return new Date(p["key"][d]);
                            });

                            y = d3.scaleTime();

                            yItems = 0;

                        } else if (d.toLowerCase().indexOf("time") > 0) {

                            domainY = d3.extent(data, function (p) {
                                return parseTime(p["key"][d]);
                            });

                            y = d3.scaleTime();

                            yItems = 0;

                        } else {

                            y = d3.scalePoint();

                            var nest = d3.nest()
                                .key(function (p) {
                                    return p["key"][d];
                                })
                                .entries(data);

                            domainY = nest.map(function (p) {
                                return p["key"];
                            }).reverse();

                            yItems = domainY.length > 50 ? 50 : domainY.length;
                        }


                    } else {

                        if (isNumeric[d]) {
                            // domainX = d3.extent(data, function (p) {
                            //     if (isNaN(p["key"][d])) {
                            //         return data[1]["key"][d];
                            //     }
                            //     return p["key"][d];
                            // });
                            //
                            // x = d3.scaleLinear();
                            //
                            // xItems = 0;

                            x = d3.scalePoint();

                            var nest = d3.nest()
                                .key(function (p) {
                                    return p["key"][d];
                                })
                                .entries(data);

                            domainX = nest.map(function (p) {
                                return p["key"];
                            });
                            //.sort();

                            xItems = domainX.length > 50 ? 50 : domainX.length;


                        } else if (d.toLowerCase().indexOf("date") > 0) {
                            domainX = d3.extent(data, function (p) {
                                return new Date(p["key"][d]);
                            });

                            x = d3.scaleTime();

                            xItems = 0;

                        } else if (d.toLowerCase().indexOf("time") > 0) {
                            domainX = d3.extent(data, function (p) {
                                return parseTime(p["key"][d]);
                            });

                            x = d3.scaleTime();

                            xItems = 0;

                        } else {


                            x = d3.scalePoint();

                            var nest = d3.nest()
                                .key(function (p) {
                                    return p["key"][d];
                                })
                                .entries(data);

                            domainX = nest.map(function (p) {
                                return p["key"];
                            }).sort();

                            xItems = domainX.length > 50 ? 50 : domainX.length;
                        }
                    }
                }
                // adapt to the size
                width = (($("#" + parentId).width() - margin.left - margin.right) > xItems * pointH ? ($("#" + parentId).width() - margin.left - margin.right) : xItems * pointH) ,
                    height = (($("#" + parentId).height() - margin.top - margin.bottom) > yItems * pointH ? ($("#" + parentId).height() - margin.top - margin.bottom) : yItems * pointH);

                x.domain(domainX).range([0, width]);
                y.domain(domainY).range([height, 0]);

                xAxis = d3.axisTop(x)
                    .tickSizeInner(-height)
                    .tickSizeOuter(0)
                    .tickPadding(10)
                    .ticks(6);

                yAxis = d3.axisLeft(y)
                    .tickSizeInner(-width)
                    .tickSizeOuter(0);

                if (x.domain().length > width / FONTWIDTH) {

                    var skip = Math.round(1 / (width / (FONTWIDTH * x.domain().length)));

                    xAxis.tickValues(x.domain()
                        .filter(function (d, i) {
                            return !(i % skip);
                        }));

                }

                if (y.domain().length > height / FONTWIDTH) {

                    var skip = Math.round(1 / (height / (FONTWIDTH * y.domain().length)));

                    yAxis.tickValues(y.domain()
                        .filter(function (d, i) {
                            return !(i % skip);
                        }));

                }
            }


            // Select the svg element, if it exists.
            var svg = d3.select(this).selectAll("svg");

            // Otherwise, create the skeletal chart.
            var gEnter = svg.data([data]).enter().append("svg").attr("id", parentId + "scatter")
                .on("click", addAnnotation)
                .append("g").attr("id", "container");

            gEnter.append("g").attr("class", "x axis");
            gEnter.append("g").attr("class", "y axis");

            if (!backgroundData) {
                backgroundData = data;

                // Add a background legend for the circles.
                var blegend = d3.select(this).select("svg").selectAll(".blegend")
                    .data(radius.ticks(4), function (d, i) {
                        return i;
                    });

                var newbLegend = blegend.enter().append("g")
                    .attr("class", "blegend")
                    .attr("transform", function (d, i) {
                        return "translate(" + (i * 1.5 * pointH + 20) + "," + 0.5 * pointH + ")";
                    });

                newbLegend.append("circle")
                    .attr("cx", 0)
                    .attr("cy", 0)
                    .attr("r", function (d) {
                        return radius(d);
                    })
                    .style("fill", THEME.backgroundColor)
                    .style("fill-opacity", 0.1);

                newbLegend.append("text")
                    .attr("x", 0)
                    .attr("y", 0)
                    .attr("dx", "-.35em")
                    .attr("dy", ".35em")
                    .attr("fill", "#999")
                    .text(function (d) {
                        return formatSuffix(d);
                    })
                    .style("font-size", "12px");
            }

            // Update the outer dimensions.
            d3.select(this).selectAll("svg").attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom);

            // Update the inner dimensions.
            var g = d3.select(this).select("#container")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


            // Add a legend for the color values.
            var legend = d3.select(this).select("svg").selectAll(".legend")
                .data(radius.ticks(4), function (d, i) {
                    return i;
                });

            var newLegend = legend.enter().append("g")
                .attr("class", "legend")
                .attr("transform", function (d, i) {
                    return "translate(" + (i * 1.5 * pointH + 20) + "," + 1.5 * pointH + ")";
                });

            newLegend.append("circle")
                .attr("cx", 0)
                .attr("cy", 0)
                .attr("r", function (d) {
                    return radius(d);
                })
                .style("fill", THEME.fillColor)
                .style("fill-opacity", 0.5);

            newLegend.append("text")
                .attr("x", 0)
                .attr("y", 0)
                .attr("dx", "-.35em")
                .attr("dy", ".35em")
                .attr("fill", "#999")
                .text(function (d) {
                    return formatSuffix(d);
                })
                .style("font-size", "12px");

            legend.select("rect").style("fill", function (d) {
                return radius(d);
            });

            legend.select("text").text(function (d) {
                return formatSuffix(d);
            });

            legend.exit().remove();


            // Update the background
            var backgroundDots = d3.select(this).select("#container").selectAll(".background")
                .data(backgroundData, function (d) {
                    return JSON.stringify(d["key"]);
                });

            backgroundDots.enter()
                .append("circle")
                .attr("class", "background")
                .attr("r", function (d) {
                    return radius(d["value"]);
                })
                .attr("cx", function (d) {
                    if (cols[1].toLowerCase().indexOf("date") > 0) {
                        return x(new Date(d["key"][cols[1]]));
                    }

                    if (cols[1].toLowerCase().indexOf("time") > 0) {
                        return x(parseTime(d["key"][cols[1]]));
                    }

                    if (isNumeric[cols[1]] && d["key"][cols[1]] == EMPTY_DATUM)
                        return 0;

                    return x(d["key"][cols[1]]);
                })
                .attr("cy", function (d) {
                    if (cols[0].toLowerCase().indexOf("date") > 0) {
                        return y(new Date(d["key"][cols[0]]));
                    }

                    if (cols[0].toLowerCase().indexOf("time") > 0) {
                        return y(parseTime(d["key"][cols[0]]));
                    }

                    if (isNumeric[cols[0]] && d["key"][cols[0]] == EMPTY_DATUM)
                        return 0;

                    return y(d["key"][cols[0]]);
                })
                .style("fill", THEME.backgroundColor)
                .style("fill-opacity", 0.1)
                .on("click", click);

            backgroundDots.exit().remove();


            // Update foreground
            var foregroundDots = d3.select(this).select("#container").selectAll(".foreground")
                .data(data, function (d) {
                    return JSON.stringify(d["key"]);
                });

            foregroundDots.enter()
                .append("circle")
                .attr("class", "foreground")
                .attr("r", function (d) {
                    return radius(d["value"]);
                })
                .attr("cx", function (d) {
                    if (cols[1].toLowerCase().indexOf("date") > 0) {
                        return x(new Date(d["key"][cols[1]]));
                    }

                    if (cols[1].toLowerCase().indexOf("time") > 0) {
                        return x(parseTime(d["key"][cols[1]]));
                    }

                    if (isNumeric[cols[1]] && d["key"][cols[1]] == EMPTY_DATUM)
                        return 0;

                    return x(d["key"][cols[1]]);
                })
                .attr("cy", function (d) {
                    if (cols[0].toLowerCase().indexOf("date") > 0) {
                        return y(new Date(d["key"][cols[0]]));
                    }

                    if (cols[0].toLowerCase().indexOf("time") > 0) {
                        return y(parseTime(d["key"][cols[0]]));
                    }

                    if (isNumeric[cols[0]] && d["key"][cols[0]] == EMPTY_DATUM)
                        return 0;

                    return y(d["key"][cols[0]]);
                })
                .style("display", function (d) {
                    var key = d["key"];
                    for (var i = 0; i < filters2D.length; i++) {
                        var filter = filters2D[i];
                        if (filter[cols[0]] == key[cols[0]] && filter[cols[1]] == key[cols[1]])
                            return "block";
                    }
                    return filters2D.length == 0 ? "block" : "none";
                })
                .style("fill", THEME.fillColor)
                .style("fill-opacity", 0.5)
                .style("cursor", "pointer")
                .on("click", click);

            foregroundDots
                .attr("r", function (d) {
                    return radius(d["value"]);
                })
                .attr("cx", function (d) {
                    if (cols[1].toLowerCase().indexOf("date") > 0) {
                        return x(new Date(d["key"][cols[1]]));
                    }

                    if (cols[1].toLowerCase().indexOf("time") > 0) {
                        return x(parseTime(d["key"][cols[1]]));
                    }
                    if (isNumeric[cols[1]] && d["key"][cols[1]] == EMPTY_DATUM)
                        return 0;
                    return x(d["key"][cols[1]]);
                })
                .attr("cy", function (d) {
                    if (cols[0].toLowerCase().indexOf("date") > 0) {
                        return y(new Date(d["key"][cols[0]]));
                    }

                    if (cols[0].toLowerCase().indexOf("time") > 0) {
                        return y(parseTime(d["key"][cols[0]]));
                    }

                    if (isNumeric[cols[0]] && d["key"][cols[0]] == EMPTY_DATUM)
                        return 0;

                    return y(d["key"][cols[0]]);
                })
                .style("display", function (d) {
                    var key = d["key"];
                    for (var i = 0; i < filters2D.length; i++) {
                        var filter = filters2D[i];
                        if (filter[cols[0]] == key[cols[0]] && filter[cols[1]] == key[cols[1]])
                            return "block";
                    }

                    return filters2D.length == 0 ? "block" : "none";
                });

            foregroundDots.exit().remove();

            // Update the x-axis.
            g.select(".x.axis")
                .attr("transform", "translate(0,0)")
                .call(xAxis);

            // Update the y-axis.
            g.select(".y.axis")
                .call(yAxis);

            g.select(".x.axis")
                .selectAll("text")
                .attr("y", 0)
                .attr("x", 9)
                .attr("dy", ".35em")
                .attr("transform", "rotate(-90)")
                .style("text-anchor", "start");

            g.select(".x.axis")
                .append("text")
                .attr("class", "label")
                .attr("x", width)
                .attr("y", 15)
                .style("text-anchor", "end")
                .style("font-size", "14px")
                .text(cols[1]);

            // axis labels
            // text label for the y axis
            gEnter.append("text")
                .attr("transform", "rotate(-90)")
                .attr("y", 0 - margin.left)
                .attr("x", 0)
                .attr("dy", "1em")
                .attr("fill", "#222")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .text(cols[0]);

            gEnter.append("text")
                .attr("transform",
                    "translate(" + (width / 2) + " ," +
                    (14) + ")")
                .attr("font-size", "14px")
                .style("text-anchor", "middle")
                .style("pointer-events", "none")
                .text(cols[1]);

            if (!DONT_ANNOTATION_GROUPS)
                annotationBinner.group_order(addAnnotationIcons, cols, focus, measure);
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