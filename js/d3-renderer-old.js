'use strict';

var d3Vis;
var d3Graph;
var d3Nodes;
var d3Links;
var d3Force;
var d3XRange;
var d3YRange;
var d3Translation = [0, 0];
var d3ScaleFactor = 1;


function d3Setup(height, width, selector){
    d3Force = d3.layout.force()
        .charge(-20)
        .gravity(0.05)
        .linkDistance(30)
        .size([width, height]);

    d3XRange = d3.scale.linear()
        .domain([0, width])
        .range([0, width]);

    d3YRange = d3.scale.linear()
        .domain([0, height])
        .range([height, 0]);

    d3Vis = d3.select(selector)
        .append('svg:svg')
        .attr("width", width)
        .attr("height", height)
        .attr("pointer-events", "all")
        .append('svg:g')
        .call(d3.behavior.zoom().x(d3XRange).y(d3YRange)
            .scaleExtent([1, 8])
            .on("zoom", zoom))


    d3Vis.append("rect")
        .attr("class", "overlay")
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none");
    /*
    this.zoom = function() {
        //var mySvg = d3.select(selector);
        //var myVis = this.vis;
        var myTransform =  "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")";
        console.log(this.vis);
        this.vis.attr("transform", myTransform );
    };
    */
}

function zoom(){
    console.log("zoom", d3.event.translate, d3.event.scale);
    d3ScaleFactor = d3.event.scale;
    d3Translation = d3.event.translate;
    d3Tick(); //update positions

}

function d3Tick(){
    d3Links.attr('x1', function (d) {
        return d3Translation[0] + d3ScaleFactor*d.source.x;
    })
        .attr('y1', function (d) {
            return d3Translation[1] + d3ScaleFactor*d.source.y;
        })
        .attr('x2', function (d) {
            return d3Translation[0] + d3ScaleFactor*d.target.x;
        })
        .attr('y2', function (d) {
            return d3Translation[0] + d3ScaleFactor*d.target.y;
        });

    d3Nodes.attr("cx", function (d) {
        return d3Translation[0] + d3ScaleFactor*d.x;
    })
        .attr("cy", function (d) {
            return d3Translation[1] + d3ScaleFactor*d.y;
        });

}

function d3Render(graph) {
    d3Force.nodes(graph.nodes).links(graph.links).start();

    d3Graph = graph;

    d3Links = d3Vis.selectAll('.link')
        .data(graph.links)
        .enter().append('line')
        .attr('class', 'link')
        .style("stroke", '#6666FF')
        .attr('stroke-width', "1px");

    d3Nodes = d3Vis.selectAll('.node')
        .data(graph.nodes)
        .enter().append('g')
        .attr('class', 'node')
        .style("fill", '#0000FF')
        .call(d3Force.drag);

    // Render label (use name attr)
    d3Nodes.append('text')
        .attr('dx', 8)
        .attr('dy', '.25em')
        .text(function (d) {
            return d.name;
        });

    // Use circle for node shape
    d3Nodes.append('circle')
        .attr('class', 'node')
        .attr('r', 2);

    d3Force.on('tick', function () {
        d3Tick();
    });

    console.log("Links: " + d3Links.length);

};

function createD3Json (network){
    var node2index = {};
    var graph = {nodes: [], links: []};
    var index = 0;
    $.each(network.nodes, function (id, node){
        graph.nodes.push({name: node.name})
        node2index[id] = index;
        index = index + 1;

    });

    $.each(network.edges, function (id, edge){
        var sourceIndex = node2index[edge.s];
        var targetIndex = node2index[edge.o];
        graph.links.push({source: sourceIndex, target: targetIndex, value:1})
    });

    return graph;
};


/*
 function transform (d) {
 return "translate(" + d3XRange(d.x) + "," + d3YRange(d.y) + ")";
 };

 function translateLink(d) {
 var sourceX = d3YRange(d.target.parent.y);
 var sourceY = d3XRange(d.target.parent.x);
 var targetX = d3YRange(d.target.y);
 var targetY = (sourceX + targetX)/2;
 var linkTargetY = d3YRange(d.target.x0);
 var result =
 "M" + sourceX
 + "," + sourceY
 + " C"+ targetX
 + "," + sourceY
 + " " + targetY
 + "," + d3YRange(d.target.x0)
 + " " + targetX
 + "," + linkTargetY + "";
 console.log(result);

 return result;
 };

 d3Force.on('tick', function () {
 d3Links.attr('x1', function (d) {
 return d.source.x;
 })
 .attr('y1', function (d) {
 return d.source.y;
 })
 .attr('x2', function (d) {
 return d.target.x;
 })
 .attr('y2', function (d) {
 return d.target.y;
 });

 d3Nodes.attr('transform', function (d) {
 return 'translate(' + d.x + ',' + d.y + ')';
 });
 });

 */