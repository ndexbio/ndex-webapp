'use strict';

var d3Nodes,
    d3Links,
    d3ScaleFactor,
    d3Translation,
    d3Nodes,
    d3Links,
    xScale,
    yScale,
    force,
    zoomer,
    svg,
    graph,
    rect,
    vis,
    d3Graph;

function d3Setup(height, width, selector){
/*** Create scales to handle zoom coordinates ***/
    xScale = d3.scale.linear()
        .domain([0,width]);
    yScale = d3.scale.linear()
        .domain([0,height]);
//ranges will be set later based on the size
//of the SVG

/*** Configure Force Layout ***/
    force = d3.layout.force()
    .on("tick", redraw)
    .charge(function (d) {
        return d._children ? -d.size / 100 : -50;
    })
    .linkDistance(function (d) {
        return d.target._children ? 80 : 30;
    })
    .friction(0.90) //slow down by 10% each tick
    .size([width, height]);


/*** Configure zoom behaviour ***/
    zoomer = d3.behavior.zoom()
    .scaleExtent([0.1,10])
    //allow 10 times zoom in or out
    .on("zoom", zoom);

    svg = d3.select(".intgraph")
        .append("svg:svg")
        .style("max-width", 2*width)
        .style("max-height", 2*height);

    graph = svg.append("g")
        .attr("class", "graph")
        .call(zoomer); //Attach zoom behaviour.

    // Add a transparent background rectangle to catch
// mouse events for the zoom behaviour.
// Note that the rectangle must be inside the element (graph)
// which has the zoom behaviour attached, but must be *outside*
// the group that is going to be transformed.
    rect = graph.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        //make transparent (vs black if commented-out)
        .style("pointer-events", "all");
//respond to mouse, even when transparent

    vis = graph.append("svg:g")
        .attr("class", "plotting-area");
//create a group that will hold all the content to be zoomed
    //adapt size to window changes:
    window.addEventListener("resize", setSize, false);
}

//define the event handler function
function zoom() {
    //console.log("zoom", d3.event.translate, d3.event.scale);
    d3ScaleFactor = d3.event.scale;
    d3Translation = d3.event.translate;
    redraw(); //update positions with changed scale
}

/*** Configure drag behaviour ***/
var drag = d3.behavior.drag()
    .origin(function(d) { return d; }) //center of circle
    .on("dragstart", dragstarted)
    .on("drag", dragged)
    .on("dragend", dragended);

function dragstarted(d){
    d3.event.sourceEvent.stopPropagation();
    d3.select(this).classed("dragging", true);
    force.stop(); //stop ticks while dragging
}

function dragged(d){
    if (d.fixed) return; //root is fixed

    //get mouse coordinates relative to the visualization
    //coordinate system:
    var mouse = d3.mouse(vis.node());
    d.x = xScale.invert(mouse[0]);
    d.y = yScale.invert(mouse[1]);
    redraw();//re-position this node and any links
}
function dragended(d){
    d3.select(this).classed("dragging", false);
    force.resume();
}

/*** Initialize and position node and link elements ***/
function d3Render(graph) {
    d3Graph = graph;
    force.nodes(graph.nodes).links(graph.links).start();
 /*
    d3Links = vis.selectAll('.link')
        .data(graph.links)
        .enter().append('line')
        .attr('class', 'link')
        .style("stroke", '#6666FF')
        .attr('stroke-width', "1px");

    d3Nodes = vis.selectAll('.node')
        .data(graph.nodes)
        .enter().append('g')
        .attr('class', 'node')
        .style("fill", '#0000FF')
        .call(drag);

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
 */
    force.on('tick', function () {
        redraw();
    });

    // Update the links…
    d3Links = vis.selectAll("line.link")
        .data(graph.links);
        //.data(graph.links, function (d) {return d.source.id;});


    // Enter any new links.
    d3Links.enter().insert("svg:line", ".node")
        .attr("class", "link");

    // Exit any old links.
    d3Links.exit().remove();

    // Update the nodes
    d3Nodes = vis.selectAll("node")
        .data(graph.nodes)
        //.data(graph.nodes, function (d) {return d.id;})
        //.style("fill", "#00f")
    ;

    d3Nodes.append('text')
        .attr('dx', 8)
        .attr('dy', '.25em')
        .text(function (d) {
            return d.name;
        });

    // Enter any new nodes.
    d3Nodes.enter().append("svg:circle")
        .attr("class", "node")
        .attr("r", 2)
        .style("fill", "#00f")
        .call(drag); //attach drag behaviour

    // Exit any old nodes.
    d3Nodes.exit().remove();

    console.log("Links: " + d3Links.length);
    console.log("Nodes: " + d3Nodes.length);

    // Set initial size and trigger a tick() function
    setSize();
}

/*
function color(d) {
    return  d===root? "#ffffff"
        //distinguish root since it can't be dragged
        : d.children ? "#c6dbef" : d.group;
}
*/
/*** Set the position of the elements based on data ***/
function redraw() {
    d3Links.attr("x1", function (d) {
        return xScale(d.source.x);
    })
        .attr("y1", function (d) {
            return yScale(d.source.y);
        })
        .attr("x2", function (d) {
            return xScale(d.target.x);
        })
        .attr("y2", function (d) {
            return yScale(d.target.y);
        });

    d3Nodes.attr("cx", function (d) {
        return xScale(d.x);
    })
        .attr("cy", function (d) {
            return yScale(d.y);
        });
}

/* Set the display size based on the SVG size and re-draw */
function setSize() {
    //var svgStyles = window.getComputedStyle(svg.node());
    //var svgW = parseInt(svgStyles["width"]);
    //var svgH = parseInt(svgStyles["height"]);

    var svgH = $("#canvas").innerHeight();
    var svgW = $("#canvas").innerWidth();
    //Set the output range of the scales
    xScale.range([0, svgW]);
    yScale.range([0, svgH]);

    //re-attach the scales to the zoom behaviour
    zoomer.x(xScale).y(yScale);

    //resize the background
    rect.attr("width", svgW)
        .attr("height", svgH);

    //console.log(xScale.range(), yScale.range());
    redraw();
}

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
var d3Vis;


var d3Force;
var d3XRange;
var d3YRange;
var d3Translation;
var d3ScaleFactor;

function d3Setup(width, height, selector){
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

};

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

};


 */

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