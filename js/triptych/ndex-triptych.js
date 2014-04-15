if (typeof(NdexTriptych) === 'undefined') NdexTriptych = {};

NdexTriptych.addNetwork = function (jdexNetwork, position) {

    var plane = this.graph.addPlane(position);
    var nodes = [];
    for (jdexId in jdexNetwork.nodes){
        var jNode = jdexNetwork.nodes[jdexId];
        var node = new Triptych.Node(NdexTriptych.graph.getNextId());
        node.jdexNode = jNode;
        node.label = NdexClient.getNodeLabel(jNode, jdexNetwork);
        node.identifier = NdexTriptych.getIdentifier(plane.id, jdexId);
        //console.log(" adding " + node);
        NdexTriptych.graph.addNode(node);
        node.setPlane(plane);
        nodes.push(node);
    }

    for (jdexId in jdexNetwork.edges){
        var jEdge = jdexNetwork.edges[jdexId];

        var fromNode = NdexTriptych.graph.nodeByIdentifier(NdexTriptych.getIdentifier(plane.id, jEdge.s)),
            toNode = NdexTriptych.graph.nodeByIdentifier(NdexTriptych.getIdentifier(plane.id, jEdge.o)),
            relTerm = jdexNetwork.terms[jEdge.p],
            relType = relTerm.name;

        if (fromNode && toNode) {

            var rel = NdexTriptych.graph.findOrCreateRelationship(relType);

            var edge = NdexTriptych.graph.findEdge(fromNode, rel, toNode);

            if (!edge) {
                edge = NdexTriptych.graph.addEdge(new Triptych.Edge(fromNode, rel, toNode));
                edge.jdexEdge = jEdge;
            }
        }
    }

    this.layout.randomNodePositions(nodes);
    this.layout.startUpdating(400);

};

NdexTriptych.addEdgeBetweenPlanes = function(plane1, node1Id, plane2, node2Id, relationshipType){
    var rel = NdexTriptych.graph.findOrCreateRelationship(relationshipType);
    var fromNode = NdexTriptych.graph.nodeByIdentifier(NdexTriptych.getIdentifier(plane1.id, node1Id)),
        toNode = NdexTriptych.graph.nodeByIdentifier(NdexTriptych.getIdentifier(plane2.id, node2Id));
    NdexTriptych.graph.addEdge(new Triptych.Edge(fromNode, rel, toNode));
};

// TODO: remove network

NdexTriptych.getIdentifier = function (networkId, jdexId) {
    return networkId + ":" + jdexId;
},

    NdexTriptych.webglVisualizer = new Triptych.BEL3DVisualizer();

NdexTriptych.canvasVisualizer = new Triptych.BEL3DCanvasVisualizer();

NdexTriptych.visualizer = NdexTriptych.canvasVisualizer;

NdexTriptych.visualizerMode = 'canvas';

NdexTriptych.visualizerSetup = function (visualizerMode) {
    if (Triptych.WebGLEnabled && visualizerMode == 'webGl') {
        this.visualizerMode == 'webGL'
        NdexTriptych.visualizer = this.webglVisualizer;
    } else {
        this.visualizerMode == 'canvas'
        this.visualizer = this.canvasVisualizer;
    }
    this.visualizer.showLabels = true;
    this.visualizer.showEdgeLabels = false;
}

NdexTriptych.graph = new Triptych.Graph();

NdexTriptych.layout = new Triptych.ForceDirectedLayout();

NdexTriptych.controls = null;

NdexTriptych.selectNode = function (identifier) {
    var pNode = graph.nodeByIdentifier(identifier);
    if (pNode != null) pNode.selected = true;
};

NdexTriptych.setFlyParameters = function () {
    // this.controls.flyToAndLookAt(new THREE.Vector3(0, 600, 100), this.controls.target, 5.0, 0.5);
}

NdexTriptych.setCameraPosition = function () {
    this.space.camera.position.set(0, 700, 105);
    this.space.camera.up.set(0, 0, 1);
};

NdexTriptych.space = null;

NdexTriptych.setup = function (visualizerMode, layoutMode, container) {
    Triptych.checkRenderingStatus();
    this.visualizerSetup(visualizerMode);

    // start the layout with 400 steps each time we do setup
    this.layout.updateCount = 400;
    this.startTime = Date.now();

    this.space = new Triptych.Space(
        this.graph,
        this.visualizer,
        this.layout,
        container);

    this.space.init(function(){
        NdexTriptych.visualizer.render();
    });

    this.setCameraPosition();
    this.setFlyParameters();

    this.animate();

}

NdexTriptych.updateConfiguration = function (visualizerMode, layoutMode) {
    this.visualizerSetup(visualizerMode);
    this.layoutSetup(layoutMode);
    this.layout.updateCount = 400;
    this.startTime = Date.now();
    this.space.init();
    this.setCameraPosition();
    this.setFlyParameters();
    console.log("space initialized");
}

/*
 Animation
 */

NdexTriptych.startTime = Date.now();
NdexTriptych.frameRate = 30; // Hz
NdexTriptych.lastFrameNumber;


NdexTriptych.animate = function () {
    requestAnimationFrame(NdexTriptych.animate);
    var elapsed = Date.now() - NdexTriptych.startTime;
    var frameNumber = Math.round(elapsed / (1000 / NdexTriptych.frameRate));
    //
    // Check to see if it is time for the next update
    //
    if (frameNumber == NdexTriptych.lastFrameNumber) return;
    NdexTriptych.lastFrameNumber = frameNumber;
    NdexTriptych.space.update();
}

// Does this go here???
Triptych.Node.prototype.onClick = function (event, role) {
    if (this.selected) {
        this.setSelected(false);
    } else {
        this.setSelected(true);
    }
    //displayDetails(this);
};


