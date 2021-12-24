/**
 * Created by karthik on 2/13/17.
 */

queue()
    .defer(d3.json, "/data")
    .await(makeGraphs);

function makeGraphs(error, records) {

    var dateFormat = d3.time.format("%Y/%m/%d %H:%M:%S");

    records.forEach(function(d) {
		d["timestamp"] = dateFormat.parse(d["Date"] + " " + d["Time"]);
		d["timestamp"].setSeconds(0);
		d["longitude"] = +d["longitude"];
		d["latitude"] = +d["latitude"];
	});

}
