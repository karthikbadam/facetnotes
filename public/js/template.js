/**
 * Created by karthik on 2/20/17.
 */

function Template(options) {

    var cols = options.cols;

    var margin = {
        top: 10,
        right: 10,
        bottom: 20,
        left: 45
    };

    var parentId = options.parentId;

    var width = options.width - margin.left - margin.right,
        height = options.height - margin.top - margin.bottom;


    function chart(selection) {
        selection.each(function (data) {


        });
    };

    chart.margin = function (_) {
        if (!arguments.length) return margin;
        margin = _;
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

