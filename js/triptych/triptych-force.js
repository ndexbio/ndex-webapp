Triptych.ForceDirectedLayout = function (graph) {
    this.averageForceUpdateThreshold = 0.001;
    this.repulsion = 1;
    this.repulsionDistanceLimit = 1.5;
    this.springConstant = 0.4;
    this.maxForce = 40.0;
    this.edgeLength = 100;
    this.damping = 0.1;
    this.planarMode = true;

};

Triptych.ForceDirectedLayout.prototype = new Triptych.DynamicLayout();

Triptych.ForceDirectedLayout.prototype.constructor = Triptych.ForceDirectedLayout;

Triptych.ForceDirectedLayout.prototype.clearForces = function () {
    var nodes = this.graph.nodes;
    var len = nodes.length;
    for (var i = 0; i < len; i++) {
        var node = nodes[i];
        node.force.set(0, 0, 0);
    }
};

Triptych.ForceDirectedLayout.prototype.randomNodePositions = function (newNodes) {
    var nodes = newNodes || this.graph.nodes;
    var len = nodes.length;
    for (var i = 0; i < len; i++) {
        var node = nodes[i];
        node.position.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
        node.position.normalize();
        node.position.multiplyScalar(Math.random() * 10 + 200);
        if (node.plane) node.position.add(node.plane.position);
        this.projectNode(node);
    }
};

Triptych.ForceDirectedLayout.prototype.projectNode = function (node) {
    if (node.plane && this.planarMode) {
        var projectedPosition = node.plane.plane.projectPoint(node.position);
        node.position.copy(projectedPosition);
        //node.plane.plane.projectPoint(node.position, node.position);
    }
};

Triptych.ForceDirectedLayout.prototype.setGraph = function (graph, keepPositions) {
    this.graph = graph;
    if (!keepPositions) this.randomNodePositions();
};

Triptych.ForceDirectedLayout.prototype.getAverageForce = function () {
    var sum = 0;
    var nodes = this.graph.nodes;
    var len = nodes.length;
    for (var i = 0; i < len; i++) {
        var node = nodes[i];
        sum += node.force.length();
    }
    return sum / len;
};

Triptych.ForceDirectedLayout.prototype.layoutStep = function () {

    this.clearForces();

    var nodes = this.graph.nodes;
    var len = nodes.length;

    // Compute sum of repulsive forces on each node due to all other nodes
    // Repulsion is proportional to the square of the distance
    for (var i = 0; i < len; i++) {

        var node1 = nodes[i];

        for (var n = i + 1; n < len; n++) {
            var node2 = nodes[n];
            this.addRepulsiveForces(node1, node2);
        }

        this.addPlaneForces(node1);
    }

    // Add net attractive force on each node due to links
    var edges = this.graph.edges;
    for (var i = 0; i < edges.length; i++) {
        var edge = edges[i];
        this.addEdgeForces(edge);
    }

    this.updateNodePositions();


};

Triptych.ForceDirectedLayout.prototype.addForce = function (node, vector, scalar) {
    node.force.x = node.force.x + vector.x * scalar;
    node.force.y = node.force.y + vector.y * scalar;
    node.force.z = node.force.z + vector.z * scalar;
};

Triptych.ForceDirectedLayout.prototype.addRepulsiveForces = function (node1, node2) {
    var v = node1.getVector(node2);

    var scaledDistance = v.length() / this.edgeLength;

    // don't add force beyond a set range
    if (scaledDistance > this.repulsionDistanceLimit) return;

    if (scaledDistance < 0.01) scaledDistance = 0.01

    var force = this.repulsion / (scaledDistance * scaledDistance);
    this.addForce(node1, v, -1 * force);
    this.addForce(node2, v, force);

};

Triptych.ForceDirectedLayout.prototype.addEdgeForces = function (edge) {
    var fromNode = edge.from;
    var toNode = edge.to;
    var v = fromNode.getVector(toNode);
    var len = edge.defaultLength || this.edgeLength;
    var displacement = v.length() - len;
    if (displacement > 0.1) {
        var scalar = this.springConstant * displacement;
        this.addForce(fromNode, v, scalar);
        this.addForce(toNode, v, -1 * scalar);
    }
};

Triptych.ForceDirectedLayout.prototype.addPlaneForces = function (node) {
    if (node.plane) {
        if (node.plane.position) {
            var vectorToPlaneCenter = node.plane.position.clone();
            vectorToPlaneCenter.sub(node.position);
            var len = vectorToPlaneCenter.length() - this.edgeLength;
            if (len > 20) {
                var scalar = this.springConstant * len * 0.005;
                this.addForce(node, vectorToPlaneCenter, scalar);
            }
        } else {
            console.log("No plane position for " + JSON.stringify(node.plane));
        }
    }
};

Triptych.ForceDirectedLayout.prototype.updateNodePositions = function () {
    for (var i in this.graph.nodes) {
        var node = this.graph.nodes[i];
        var len = node.force.length();
        var f = node.force.clone();
        if (len > this.maxForce) len = this.maxForce;

        f.normalize();
        f.multiplyScalar(len * this.damping);

        node.position.add(f);

        this.projectNode(node);


    }
};


