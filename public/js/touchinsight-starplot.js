/**
 * Created by karthik on 3/22/17.
 */

function StarAnnotation(element, width, height, data, cols) {
    var margin = {
        top: 10,
        right: 20,
        bottom: 20,
        left: 10
    };

    var _self = this;
    var width = _self.width = width - margin.left - margin.right;
    var height = _self.height = height - margin.top - margin.bottom;
    var labelMargin = 8;

    var scale = d3.scaleLinear()
        .domain([0, 1])
        .range([1, 100]);

    var labels = cols.map(function (c) {
        var splits = c.split("_");
        var build = splits[0][0] + (splits.length > 1 ? "_" + splits[1][0] : splits[0][1]);
        return build;
    });

    var star = d3.starPlot()
        .width(width)
        .properties(cols)
        .scales(scale)
        .margin(margin)
        .labels(labels)
        .labelMargin(labelMargin);

    var wrapper = element.append('div')
        .attr('class', 'wrapper')
        .style("margin", "1px");

    var svg = wrapper.append('svg')
        .attr('class', 'chart')
        .attr('width', width + margin.left + margin.right)
        .attr('height', width + margin.top + margin.bottom);

    var starG = svg.append('g')
        .datum(data)
        .call(star)
        .call(star.interaction);


    var interactionLabel = wrapper.append('div')
        .attr('class', 'interaction label');

    var circle = svg.append('circle')
        .attr('class', 'interaction circle')
        .attr('r', 5);

    var interaction = wrapper.selectAll('.interaction')
        .style('display', 'none');

    svg.selectAll('.star-interaction')
        .on('mouseover', function (d) {
            svg.selectAll('.star-label')
                .style('display', 'none');

            interaction
                .style('display', 'block');

            circle
                .attr('cx', d.x)
                .attr('cy', d.y);

            var ninteractionLabel = $(interactionLabel.node());
            interactionLabel
                .text(d.key + ': ' + d.datum[d.key].range)
                .style('left', d.xExtent)
                .style('top', d.yExtent - (ninteractionLabel.height() / 2))
        })
        .on('click', function (d) {
            svg.selectAll('.star-label')
                .style('display', 'none');

            interaction
                .style('display', 'block');

            circle
                .attr('cx', d.x)
                .attr('cy', d.y);

            var ninteractionLabel = $(interactionLabel.node());
            // interactionLabel
            //     .text(d.datum[d.key].values)
            //     .style('left', d.xExtent - (ninteractionLabel.width() / 2))
            //     .style('top', d.yExtent - (ninteractionLabel.height() / 2));


            d3.select(".popup").remove();

            var span = d3.select("body").append("div")
                .attr("class", "popup")
                .style("left", d3.event.pageX)
                .style("top", d3.event.pageY)
                .on("click", function () {
                    d3.select(".popup").remove();
                })
                .style("z-index", 100)
                .style('position', "absolute")
                .append("span")
                .attr("id", "myPopup")
                .attr("class", "popuptext");

            d.datum[d.key].values.forEach(function (el) {
                span.append("li").html(el);
            });

            var popup = document.getElementById("myPopup");

            popup.classList.toggle("show");

        })
        .on('mouseout', function (d) {
            interaction
                .style('display', 'none');

            // d3.select(".popup").remove();

            svg.selectAll('.star-label')
                .style('display', 'block');
        });
}

