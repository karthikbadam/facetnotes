function QueryManager(options) {

    var _self = this;

    _self.queryStack = [];

    _self.historyQueryStack = [];

    _self.visualizations = options.visualizations;

    _self.queryKeeper = {};
}


QueryManager.prototype.retrieveCurrentQuery = function (filters1, filters2, cols) {

    var _self = this;

    var query = {};

    query["$and"] = [];

    var filters = filters1 ? filters1 : [];

    if (filters.length > 0) {

        var q = {};

        if (filters[0].constructor != Array) {

            q[cols[0]] = {"$in": filters};

        } else if (filters[0].length == 2) {

            q["$or"] = [];

            for (var i = 0; i < filters.length; i++) {

                var q1 = {};
                var filter = filters[i];

                q1[cols[0]] = {"$gte": filter[0], "$lte": filter[1]};

                q["$or"].push(q1);
            }
        }

        if (Object.keys(q).length > 0)
            query["$and"].push(q);
    }

    var filters = filters2 ? filters2 : [];

    if (filters.length > 0) {

        var q = {};
        q["$or"] = [];

        if (!filters[0].length) {
            for (var i = 0; i < filters.length; i++) {
                var filter = filters[i];
                var q1 = {};
                q1[cols[0]] = filter[cols[0]];
                q1[cols[1]] = filter[cols[1]];
                q["$or"].push(q1);
            }
        } else {
            for (var i = 0; i < filters.length; i++) {
                var filter = filters[i];
                var q1 = {};
                q1[cols[0]] = {"$gte": filter[cols[0]][0], "$lte": filter[cols[0]][1]};
                q1[cols[1]] = {"$gte": filter[cols[1]][0], "$lte": filter[cols[1]][1]};
                q["$or"].push(q1);
            }
        }

        if (Object.keys(q).length > 0)
            query["$and"].push(q);
    }

    console.log(JSON.stringify(query));

    return query["$and"].length > 0? query: {};
};


QueryManager.prototype.retrieveData = function () {

    var _self = this;

    var query = {};

    query["$and"] = [];

    visualizations.forEach(function (visualization) {

        var filters = visualization.filters();

        if (filters.length > 0) {

            var cols = visualization.cols();

            var q = {};

            if (filters[0].constructor != Array) {

                q[cols[0]] = {"$in": filters};

            } else if (filters[0].length == 2) {

                q["$or"] = [];

                for (var i = 0; i < filters.length; i++) {

                    var q1 = {};
                    var filter = filters[i];

                    q1[cols[0]] = {"$gte": filter[0], "$lte": filter[1]};

                    q["$or"].push(q1);
                }
            }

            if (Object.keys(q).length > 0)
                query["$and"].push(q);
        }

        filters = visualization.filters2D();

        if (filters.length > 0) {
            var cols = visualization.cols();
            var q = {};
            q["$or"] = [];

            if (!filters[0].length) {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    var q1 = {};
                    q1[cols[0]] = filter[cols[0]];
                    q1[cols[1]] = filter[cols[1]];
                    q["$or"].push(q1);
                }
            } else {
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    var q1 = {};
                    q1[cols[0]] = {"$gte": filter[cols[0]][0], "$lte": filter[cols[0]][1]};
                    q1[cols[1]] = {"$gte": filter[cols[1]][0], "$lte": filter[cols[1]][1]};
                    q["$or"].push(q1);
                }
            }

            if (Object.keys(q).length > 0)
                query["$and"].push(q);
        }
    });

    return query;
};


QueryManager.prototype.retrieveData = function () {

    var _self = this;

    var query = _self.retrieveCurrentQuery();

    console.log(JSON.stringify(query));

    $.ajax({
        type: "POST",
        contentType: 'application/json',
        url: "http://localhost:3000/data",
        data: JSON.stringify(query),
        success: function (data) {
            console.log(data["content"]);
        },
        dataType: 'json'
    });
};


QueryManager.prototype.setGlobalQuery = function (query, propagate) {

    var _self = this;

    // var currQuery = query;
    //
    // var prevQuery = _self.queryStack[_self.queryStack.length - 1];
    //
    // _self.queryStack.push(query);
    //
    // // Some clean up of unwanted queries (identified by using when "clean" is triggered)
    // for (var i = _self.queryStack.length - 1; i >= 0; i--) {
    //
    //     var q = _self.queryStack[i];
    //
    //     if (q.logic == "CLEAN") {
    //
    //         _self.queryStack = _self.queryStack.slice(i);
    //         break;
    //     }
    // }
    //
    // _self.historyQueryStack.push(query);

    // update all other visualizations
    if (!DONT_ANNOTATION_GROUPS)
        annotationBinner.extract();

    if (propagate) {
        // call render on all visualizations
        for (var i = 0; i < _self.visualizations.length; i++) {
            _self.visualizations[i].render();
        }
    }

    //d3.selectAll(".extent").attr("width", 0).attr("x", 0);

};


QueryManager.prototype.clearRecentQuery = function () {
    var _self = this;

    if (_self.queryStack.length == 0)
        return;

    d3.select("#" + _self.queryStack[_self.queryStack.length - 1].index).remove();

    if (_self.queryStack.length == 1) {
        _self.queryStack.pop();
        // call renderAll
        return;
    }

    _self.queryStack.pop();
    _self.historyQueryStack.pop();

    // resolve queryStack and update all visualizations
    // update all other visualizations
    if (propagate) {
        // call render on all visualizations
        for (i in _self.visualizations) {
            _self.visualizations[i].render();
        }
    }
};


QueryManager.prototype.clearQuery = function () {
    var _self = this;

    if (_self.queryStack.length == 0)
        return;

    // resolve queryStack and update all visualizations

};

QueryManager.prototype.createQuery = function (options) {

    var _self = this;

    var query = new Query(options);

    return query;
};

function Query(options) {

    var _self = this;

    // dimension
    _self.index = options.index;

    // operator
    _self.operator = options.operator; // "range", "equal", "in"

    // OR or AND w.r.t previous
    _self.logic = options.logic ? options.logic : "AND";

    // value
    _self.value = options.value;
}

Query.prototype.getQueryString = function () {

    var _self = this;

    var data = {};

    data.index = _self.index;

    data.operator = _self.operator;

    data.logic = _self.logic;

    data.value = _self.value;

    return JSON.stringify(data);
}