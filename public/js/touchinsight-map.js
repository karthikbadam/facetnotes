function Map(options) {

    var _self = this;

    //center lat: 39.2854197594374, lng: -76.61109924316406, zoom = 12
    _self.parentId = options.parentId;

    _self.cols = options.cols;

    _self.margin = {
        top: 20,
        right: 0,
        bottom: 30,
        left: 30
    };

    _self.width = options.width - _self.margin.left - _self.margin.right;

    _self.height = options.height - _self.margin.top - _self.margin.bottom;

    var map = _self.map =
        new L.Map(_self.parentId, {
            center: [39.2854197594374, -76.61109924316406],
            zoom: 11
        })
            .addLayer(new L.TileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"));

    var handler = function (e) {

        _self.redraw(_self.data, true);
    }

    _self.zoom = 11;

    _self.map.on('zoomstart', handler);
    _self.map.on('zoomend', handler);
    _self.map.on('viewreset', handler);
    _self.map.on('autopanstart', handler);

    _self.map.dragging.disable();


}

function computeZoom(ne, sw, pixelWidth) {
    var GLOBE_WIDTH = 256; // a constant in Google's map projection
    var west = sw.lng;
    var east = ne.lng;
    var angle = east - west;
    if (angle < 0) {
        angle += 360;
    }
    var zoom = Math.round(Math.log(pixelWidth * 360 / angle / GLOBE_WIDTH) / Math.LN2);

    return zoom;
}


Map.prototype.redraw = function (data, flag) {

    var _self = this;

    _self.data = data;

    var opacity = (_self.map.getZoom() + 2 - 11) / 10;

    _self.right = d3.max(data, function (d) {
        if (!isNaN(d["key"][_self.cols[0]])) {
            return d["key"][_self.cols[0]];
        }
    });
    _self.left = d3.min(data, function (d) {
        if (!isNaN(d["key"][_self.cols[0]])) {
            return d["key"][_self.cols[0]];
        }
    });
    _self.top = d3.max(data, function (d) {
        if (!isNaN(d["key"][_self.cols[1]])) {
            return d["key"][_self.cols[1]];
        }
    });
    _self.bottom = d3.min(data, function (d) {
        if (!isNaN(d["key"][_self.cols[1]])) {
            return d["key"][_self.cols[1]];
        }
    });

    _self.bottomRight = _self.map.latLngToLayerPoint(new L.LatLng(_self.left, _self.top));
    _self.topLeft = _self.map.latLngToLayerPoint(new L.LatLng(_self.right, _self.bottom));

    _self.marginLeft = _self.topLeft.x - 50;
    _self.marginTop = _self.topLeft.y - 50;

    if (flag == true) {

    } else {
        _self.map.fitBounds(new L.LatLngBounds(new L.LatLng(_self.left, _self.top), new L.LatLng(_self.right, _self.bottom)));

    }

    if (!_self.svg || _self.svg.select("circle").empty()) {

        d3.select(".leaflet-tile-pane").style("opacity", 0.7);

        var svg = _self.svg = d3.select(_self.map.getPanes().overlayPane).append("svg")
            .attr("width", _self.bottomRight.x - _self.topLeft.x + 100)
            .attr("height", _self.bottomRight.y - _self.topLeft.y + 100)
            .style("margin-left", _self.marginLeft + "px")
            .style("margin-top", _self.marginTop + "px")
            .style("background", "rgba(255, 255, 255, 0.5)");

        // // Create the area where the lasso event can be triggered
        // var lasso_area = _self.svg.append("rect")
        //     .attr("width", _self.bottomRight.x - _self.topLeft.x + 100)
        //     .attr("height", _self.bottomRight.y - _self.topLeft.y + 100)
        //     .style("opacity", 0);
        //
        //
        // var lasso_draw = function () {
        //     // Style the possible dots
        //     _self.lasso.items().filter(function (d) {
        //         return d.possible === true
        //     })
        //         .classed({
        //             "not_possible": false,
        //             "possible": true
        //         })
        //         .attr("r", "8px");
        //
        //     // Style the not possible dot
        //     _self.lasso.items().filter(function (d) {
        //         return d.possible === false
        //     })
        //         .classed({
        //             "not_possible": true,
        //             "possible": false
        //         });
        // };
        //
        // var lasso_end = function () {
        //     // Style the selected dots
        //
        //     var selectedSources = [];
        //
        //     _self.lasso.items().filter(function (d) {
        //         if (d.selected === true) {
        //             d["ids"].forEach(function (cid) {
        //                 selectedSources.push(cid);
        //             })
        //         }
        //
        //         return d.selected === true;
        //     })
        //         .classed({
        //             "not_possible": false,
        //             "possible": false
        //         });
        //
        //     if (selectedSources.length > 0) {
        //
        //         var query1 = new Query({
        //             index: "id",
        //             value: selectedSources,
        //             operator: "in",
        //             logic: "AND"
        //         });
        //
        //         setGlobalQuery(query1, flag = 1);
        //
        //         d3.select("#" + _self.parentId).select("header").style("z-index", 100)
        //             .style("background-color", "white").style("color", "black")
        //             .select(".userQuery").remove();
        //
        //         var q = d3.select("#" + _self.parentId).select("header")
        //             .append("div")
        //             .attr("id", query1.index)
        //             .attr("class", "userQuery")
        //             .style("display", "inline-block")
        //             .style("padding-left", "5px");
        //
        //         q.append("div")
        //             .style("width", "auto")
        //             .style("padding-left", "100px")
        //             .style("padding-right", "2px")
        //             .text("X")
        //             .style("font-size", "12px")
        //             .style("display", "inline-block")
        //             .style("background-color", "#222")
        //             .style("color", "#FFF")
        //             .on("click", function () {
        //
        //                 d3.select("#" + _self.parentId).select("header")
        //                     .select(".userQuery").remove();
        //
        //                 clearQuery(query1);
        //             });
        //
        //         q.append("div")
        //             .style("width", "auto")
        //             .style("padding-right", "5px")
        //             .text("IDs")
        //             .style("font-size", "12px")
        //             .style("display", "inline-block")
        //             .style("background-color", "#AAA");
        //     }
        //
        //     // Reset the style of the not selected dots
        //     _self.lasso.items().filter(function (d) {
        //         return d.selected === false
        //     })
        //         .classed({
        //             "not_possible": false,
        //             "possible": false
        //         })
        //         .attr("r", function (d) {
        //             return (2 + Math.pow(d["value"], 0.5)) + "px";
        //         });
        //
        // };
        //
        // _self.lasso = d3.lasso()
        //     .closePathDistance(75) // max distance for the lasso loop to be closed
        //     .closePathSelect(true) // can items be selected by closing the path?
        //     .hoverSelect(true)
        //     .area(lasso_area) // area where the lasso can be started
        //     .on("draw", lasso_draw) // lasso draw function
        //     .on("end", lasso_end); // lasso end function

        //append circle
        _self.svg
            .selectAll(".spot")
            .data(data)
            .enter().append("circle")
            .attr("class", "spot")
            .style("pointer-events", "none")
            .attr("cx", function (d, i) {
                var loc = d;

                if (loc && !isNaN(loc["key"][_self.cols[0]])) {
                    var point = _self.map.latLngToLayerPoint(new L.LatLng(loc["key"][_self.cols[0]], loc["key"][_self.cols[1]]));
                    return point.x - _self.marginLeft;
                }

                return -10;
            }).attr("cy", function (d, i) {

            var loc = d;


            if (loc && !isNaN(loc["key"][_self.cols[1]])) {
                var point = _self.map.latLngToLayerPoint(new L.LatLng(loc["key"][_self.cols[0]], loc["key"][_self.cols[1]]));
                return point.y - _self.marginTop;
            }

            return -10;
        })
            .attr("fill", function (d) {
                return "#4292c6";
            })
            .attr("fill-opacity", 0.5)
            .attr("stroke", function (d) {
                return "transparent";
            })
            .attr("stroke-opacity", 0.1)
            .attr("stroke-width", "1px")
            .attr("r", function (d) {
                return (2 + Math.pow(d["value"], 0.5)) + "px";
            });

        // _self.lasso.items(d3.selectAll("circle"));
        //
        // _self.svg.call(_self.lasso);


    } else {

        _self.svg.attr("width", _self.bottomRight.x - _self.topLeft.x + 100)
            .attr("height", _self.bottomRight.y - _self.topLeft.y + 100)
            .style("margin-left", _self.marginLeft + "px")
            .style("margin-top", _self.marginTop + "px")

        var crimeSpots = _self.svg
            .selectAll(".spot")
            .data(data);

        crimeSpots.exit().attr("r", "0.1px").transition().delay(1000);

        crimeSpots.enter().append("circle")
            .transition().delay(1000)
            .attr("class", "spot")
            .style("pointer-events", "none")
            .attr("cx", function (d, i) {
                var loc = d;

                if (loc && !isNaN(loc["key"][_self.cols[0]])) {
                    var point = _self.map.latLngToLayerPoint(new L.LatLng(loc["key"][_self.cols[0]], loc["key"][_self.cols[1]]));
                    return point.x - _self.marginLeft;
                }

                return -10;
            }).attr("cy", function (d, i) {

            var loc = d;


            if (loc && !isNaN(loc["key"][_self.cols[1]])) {
                var point = _self.map.latLngToLayerPoint(new L.LatLng(loc["key"][_self.cols[0]], loc["key"][_self.cols[1]]));
                return point.y - _self.marginTop;
            }

            return -10;
        })
            .attr("fill", function (d) {
                return "#4292c6";
            })
            .attr("fill-opacity", 0.5)
            .attr("stroke", function (d) {
                return "transparent";
            })
            .attr("stroke-opacity", 0.1)
            .attr("stroke-width", "1px")
            .attr("r", function (d) {
                return (2 + Math.pow(d["value"], 0.5)) + "px";
            });

        crimeSpots.attr("cx", function (d, i) {
            var loc = d;

            if (loc && !isNaN(loc["key"][_self.cols[0]])) {
                var point = _self.map.latLngToLayerPoint(new L.LatLng(loc["key"][_self.cols[0]], loc["key"][_self.cols[1]]));
                return point.x - _self.marginLeft;
            }

            return -10;
        }).attr("cy", function (d, i) {

            var loc = d;


            if (loc && !isNaN(loc["key"][_self.cols[1]])) {
                var point = _self.map.latLngToLayerPoint(new L.LatLng(loc["key"][_self.cols[0]], loc["key"][_self.cols[1]]));
                return point.y - _self.marginTop;
            }

            return -10;
        })
            .attr("fill", function (d) {
                return "#4292c6";
            })
            .attr("fill-opacity", 0.5)
            .attr("stroke", function (d) {
                return "transparent";
            })
            .attr("stroke-opacity", 0.1)
            .attr("stroke-width", "1px")
            .attr("r", function (d) {
                return (2 + Math.pow(d["value"], 0.5)) + "px";
            });


        // _self.lasso.items(d3.selectAll("circle"));
        //
        // _self.svg.call(_self.lasso);
    }


}