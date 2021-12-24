/**
 * Created by karthik on 3/20/17.
 */

function AnnotationBinner(options) {
    // this gets called at the end of the chart initialization
    var _self = this;
    _self.visualizations = visualizations;
    _self.visuals = visuals;
    _self.COLS = [ "dep_delay", "origin", "destination", "arr_delay", "distance"];
    _self.measures = ["cosine", "euclidean", "correlation", "chebyshev", "canberra"]
}

//call this function right after every interaction to update the data source for the annotations
AnnotationBinner.prototype.extract = function () {

    var _self = this;

    // get aggregates and extract individual points; maintain in a current list
    _self.dataArray = _self.visualizations[0].aggregates().top(Infinity);

    _self.indices = [];
    _self.dataArray.forEach(function (d) {
        _self.indices.push(d["index"]);
    });
};

AnnotationBinner.prototype.group_order = function (returnFunction, cols, focus, measure) {

    var _self = this;

    measure = measure ? measure : _self.measures[0];
    focus = focus ? focus : _self.COLS;

    // request server for the ordering
    $.ajax({
        type: "POST",
        contentType: 'application/json',
        url: "/order",
        data: JSON.stringify({indices: _self.indices, focus: focus, cols: cols, measure: measure}),
        success: function (data) {
            // data is an array of groups of
            // {key, value, array[{index, score}], annotations[{annotation, [min, max score], pointsIndices};
            // score higher is outliers, lower is for centered
            returnFunction(data);
        },
        dataType: 'json'
    });

    // return annotations in a structured format
};

AnnotationBinner.prototype.buildHeader = function (element, width, height, focus_array, measure_value, returnFuction) {

    var _self = this;

    measure_value = measure_value? measure_value: _self.measures[0];
    focus_array = focus_array? focus_array: _self.COLS;

    var settings = element.append("div")
        .attr("width", width)
        .attr("height", height);

    // Change attributes settings

    settings.append("button")
        .attr("id", "focus-annotation-button")
        .attr("class", "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect")
        .html("Attributes");

    componentHandler.upgradeElement(document.getElementById("focus-annotation-button"));

    var cols_dialog = element.append("dialog")
        .attr("class", "mdl-dialog")
        .attr("id", "cols_dialog");

    cols_dialog.append("h4")
        .attr("class", "mdl-dialog__title")
        .html("Attributes");

    var dialogcontent = cols_dialog.append("div")
        .attr("class", "mdl-dialog__content");

    var dialogOptions = cols_dialog.append("div")
        .attr("class", "mdl-dialog__actions")
        .style("display", "block");

    //adding options
    _self.COLS.forEach(function (m, i) {

        var label = dialogcontent.append("label")
            .attr("class", "mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect")
            .attr("for", "cols-option-"+i)
            .attr("id", "cols-option-div-"+i)
            .style("display", "block");

        label.append("input").attr("type", "checkbox")
            .attr("class", "mdl-checkbox__input cols-options-check")
            .attr("id", "cols-option-"+ i)
            .attr("name", "cols-options")
            .property("checked", function () {
                return focus_array.indexOf(m) >= 0;
            })
            .attr("value", m);

        label.append("span")
            .attr("class", "mdl-checkbox__label")
            .html(m);

        componentHandler.upgradeElement(document.getElementById("cols-option-div-"+i));
    });

    var cols_dialog = document.querySelector('#cols_dialog');

    dialogOptions.append("button")
        .attr("class", "mdl-button close")
        .html("Close")
        .on('click', function () {
            //delete all
            var f_array = [];
            $(".cols-options-check:checked").each(function(){
                f_array.push($(this).val());
            });

            if (!focus_array.compare(f_array)) {
                returnFuction(f_array, null);
            }
            cols_dialog.close();
        });

    componentHandler.upgradeElement(document.getElementById("cols_dialog"));

    if (!cols_dialog.showModal) {
        dialogPolyfill.registerDialog(cols_dialog);
    }

    settings.select("#focus-annotation-button")
        .on('click', function () {
            cols_dialog.showModal();
        });


    // Change distance settings
    settings.append("button")
        .attr("id", "distance-annotation-button")
        .attr("class", "mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect")
        .html("Measures");

    componentHandler.upgradeElement(document.getElementById("distance-annotation-button"));

    var measure_dialog = element.append("dialog")
        .attr("class", "mdl-dialog")
        .attr("id", "measure-dialog");

    measure_dialog.append("h4")
        .attr("class", "mdl-dialog__title")
        .html("Measures");

    var dialogcontent = measure_dialog.append("div")
        .attr("class", "mdl-dialog__content");

    var dialogOptions = measure_dialog.append("div")
        .attr("class", "mdl-dialog__actions")
        .style("display", "block");

    //adding options
    _self.measures.forEach(function (m, i) {

        var label = dialogcontent.append("label")
            .attr("class", "mdl-radio mdl-js-radio mdl-js-ripple-effect")
            .attr("for", "measure-option-"+i)
            .attr("id", "measure-option-div-"+i)
            .style("display", "block");

        label.append("input").attr("type", "radio")
            .attr("class", "mdl-radio__button measure-options-check")
            .attr("id", "measure-option-"+ i)
            .attr("name", "measure-options")
            .property("checked", function () {
                return m==measure_value;
            })
            .attr("value", m);

        label.append("span")
            .attr("class", "mdl-radio__label")
            .html(m);

        componentHandler.upgradeElement(document.getElementById("measure-option-div-"+i));
    });

    var measure_dialog = document.querySelector('#measure-dialog');

    dialogOptions.append("button")
        .attr("class", "mdl-button close")
        .html("Close")
        .on('click', function () {
            //delete all
            var checkedValue = document.querySelector('.measure-options-check:checked').value;
            if (measure_value != checkedValue) {
                returnFuction(null, checkedValue);
            }
            measure_dialog.close();
        });

    componentHandler.upgradeElement(document.getElementById("measure-dialog"));

    if (!measure_dialog.showModal) {
        dialogPolyfill.registerDialog(measure_dialog);
    }

    settings.select("#distance-annotation-button")
        .on('click', function () {
            measure_dialog.showModal();
        });
};



