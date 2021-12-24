/**
 * Created by karthik on 3/6/17.
 */

function AnnotationManager (options) {

    var _self = this;

    _self.annotationBuffer = {};

}

AnnotationManager.prototype.createAnnotation = function (annotation, cols, query) {

    var data = {};

    data.annotation = annotation;
    data.cols = cols;
    data.query = query;

    return data;
};

AnnotationManager.prototype.addAnnotation = function (annotation) {

    var _self = this;

    var key = JSON.stringify(annotation.cols);

    if (key in _self.annotationBuffer) {

        _self.annotationBuffer[key].push(annotation);

    } else {

        _self.annotationBuffer[key] = [];

    }
};


AnnotationManager.prototype.getAnnotations = function (annotation) {

    var _self = this;

    var allAnnotations = [];

    for (var key in _self.annotationBuffer) {
        for (var i in _self.annotationBuffer[key]) {
            var annotation = _self.annotationBuffer[key][i];
            allAnnotations.push(annotation);
        }
    }

    return allAnnotations;
};


AnnotationManager.prototype.sendtoServer = function () {

    var _self = this;

    var allAnnotations = _self.getAnnotations();

    console.log(JSON.stringify(query));

    $.ajax({
        type: "POST",
        contentType: 'application/json',
        url: "http://localhost:3000/data",
        data: JSON.stringify(allAnnotations),
        success: function (data) {
            console.log("Annotations processed successfully by the server");
        },
        dataType: 'json'
    });
};

