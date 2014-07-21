if (typeof(Triptych) === 'undefined') Triptych = {};
/*
 ------------------------------------
 Graph
 ------------------------------------
 */

Triptych.Graph = function(){
    this.nodes = [];
    this.edges = [];
    this.nodeIdMap = {};
    this.nodeIdentifierMap = {};
    this.relationships = {};
    this.maxId = 0;
    this.startingPosition = new THREE.Vector3(0,0,0);
    this.changed = false;
    this.planes = [];
};

Triptych.Graph.prototype = {

    constructor : Triptych.Graph,

    getNextId : function () {
        return this.maxId++;
    },

    addPlane : function (position){
        var id = this.getNextId();
        var newPlane = {};
        newPlane.id = id;
        newPlane.position = position || new THREE.Vector3(0,0,0);
        var normal = new THREE.Vector3(0,0,1);
        var constant = position.z || 1.0;
        newPlane.plane = new THREE.Plane(normal, constant);
        this.planes.push(newPlane);
        return newPlane;
    },

    updateMaxId : function(addedId){
        this.maxId = Math.max(this.maxId, addedId);
    },

    addNode : function (node){
        this.nodes.push(node);
        this.nodeIdMap[node.id] = node;
        if (node.identifier) this.nodeIdentifierMap[node.identifier] = node;
        node.graph = this;
        this.updateMaxId(node.id);
        this.changed = true;
    },

    copyExternalNode : function (externalNode){
        var internalNode = this.nodeByIdentifier(externalNode.identifier);
        if (internalNode) return internalNode;
        internalNode = new Triptych.Node(this.getNextId());
        internalNode.identifier = externalNode.identifier;
        internalNode.type = externalNode.type;
        internalNode.label = externalNode.label;
        $.each(externalNode.literals, function(predicate, value){
            internalNode.setLiteral(predicate, value);
        });
        this.addNode(internalNode);
        return internalNode;

    },

    addEdge : function (edge){
        this.edges.push(edge);
        edge.graph = this;
        this.changed = true;
        return edge;
    },

    relationshipByType : function (type){
        return this.relationships[type];
    },

    findOrCreateRelationship : function (type){
        var rel = this.relationshipByType(type);
        if (rel) return rel;
        //console.log("creating relationship from " + type);
        rel = new Triptych.Relationship(type);
        this.relationships[type] = rel;
        return rel;
    },

    // id within the graph
    nodeById : function (id){
        return this.nodeIdMap[id];
    },

    // id across graphs
    // (a given application is responsible for assigning unique identifiers
    // for nodes in the graphs that it loads)
    nodeByIdentifier : function(identifier){
        if (identifier) return this.nodeIdentifierMap[identifier];
        return false;
    },

    nodesByLiteral : function(predicate, value){
        var foundNodes = [];
        $.each(graph.nodes, function(index, node){
            if (node.getLiteral(predicate) == value){
                foundNodes.push(node);
            }
        });
        return foundNodes;
    },

    findOrCreateNodeByIdentifier : function(identifier){
        var node = this.nodeByIdentifier(identifier);
        if (node) return node;
        node = new Triptych.Node(this.maxId++);
        node.identifier = identifier;
        this.addNode(node)
        return node;
    },


    findEdge : function (fromNode, relationship, toNode){
        for (var i = 0; i < this.edges.length; i++){
            var edge = this.edges[i];
            if (fromNode == edge.from && toNode == edge.to && relationship == edge.relationship){

                return edge;
            }
        }
        return false;
    },

    findOrCreateEdge : function(fromNode, rel, toNode){
        var edge = this.findEdge(fromNode, rel, toNode);
        if (edge) return edge;
        edge = new Triptych.Edge(fromNode, rel, toNode);
        this.addEdge(edge);
        return edge;
    },

    copyExternalEdge : function(edge){
        var rel = this.findOrCreateRelationship(edge.relationship.type);
        var from = this.copyExternalNode(edge.from);
        var to = this.copyExternalNode(edge.to);
        var internalEdge = this.findEdge(from, rel, to);
        if (internalEdge) return internalEdge;
        internalEdge = new Triptych.Edge(from, rel, to);
        this.addEdge(internalEdge);
        return internalEdge;
    },

    addGraph : function (graph){
        var internalGraph = this;
        $.each(graph.nodes, function(index, node){
            internalGraph.copyExternalNode(node);
        });

        $.each(graph.edges, function(index, edge){
            var internalEdge = internalGraph.copyExternalEdge(edge);
            internalEdge.initNodePositions(graph.startingPosition);
        });

        return internalGraph;

    },

    markSubgraphs : function(){
        var subgraph_num = 0;
        var subgraphMap = {};
        $.each(graph.edges, function(index, edge){

            if (!edge.from.subgraph){
                if (!edge.to.subgraph){
                    // neither node has been marked yet, assign both the next subgraph number
                    subgraph_num++;
                    edge.to.subgraph = subgraph_num;
                    edge.from.subgraph = subgraph_num;
                } else {
                    // to_node is marked, but from is not, so assign from_node the to_node subgraph number
                    edge.from.subgraph = edge.to.subgraph;
                }
            } else {
                // from_node is marked
                if (!edge.to.subgraph){
                    // but to_node is not, so assign to_node the from_node subgraph number
                    edge.to.subgraph = edge.from.subgraph;
                } else {
                    // both nodes already marked
                    // note that their subgraph numbers are equivalent
                }
            }
        });

        $.each(graph.nodes, function(index, node){
            lowestSubgraph = subgraphMap[node.subgraph];
            if (lowestSubgraph) node.subgraph = lowestSubgraph;
        });

    },

    mappedClone : function(){
        var originalGraph = this;
        var mappedGraph = new Triptych.Graph();
        $.each(originalGraph.nodes, function(index, node){
            var mappedNode = mappedGraph.copyExternalNode(node);
            mappedNode.mapsTo = node;
        });

        $.each(originalGraph.edges, function(index, edge){
            var mappedEdge = mappedGraph.copyExternalEdge(edge);
            mappedEdge.mapsTo = edge;
        });

        return mappedGraph;

    },

    getOutgoing : function(node){
        var outgoing = [];
        $.each(this.edges, function(index, edge){
            if(edge.from == node && outgoing.indexOf(edge) == -1){
                outgoing.push(edge);
            }
        });
        return outgoing;
    },

    getIncoming : function(node){
        var incoming = [];
        $.each(this.edges, function(index, edge){
            if(edge.to == node && incoming.indexOf(edge) == -1){
                incoming.push(edge);
            }
        });
        return incoming;
    },

    getEdges : function(node){
        var allEdges = [];
        $.each(this.edges, function(index, edge){
            if((edge.from == node || edge.to == node) && allEdges.indexOf(edge) == -1){
                allEdges.push(edge);
            }
        });
        return allEdges;
    },

    getSinks : function(){
        var sinks = [];
        $.each(this.nodes, function(index, node){
            if (node.isSink()){
                sinks.push(node);
            }
        });
        return sinks;
    },

    getSources : function(){
        var sources = [];
        $.each(this.nodes, function(index, node){
            if (node.isSource(node)){
                sources.push(node);
            }
        });
        return sources;
    },

    isSink : function(node){
        var isSink = true;
        $.each(this.edges, function(index, edge){
            if (node == edge.from){
                isSink = false;
                return;
            }
        });
        return isSink;
    },

    isSource : function(node){
        var isSource = true;
        $.each(this.edges, function(index, edge){
            if (node == edge.to){
                isSource = false;
                return;
            }
        });
        return isSource;
    }

};


/*
 ------------------------------------
 Node
 ------------------------------------
 */

Triptych.Node = function(id){

    this.literals = {};
    this.position = new THREE.Vector3(0, 0, 0);
    this.force = new THREE.Vector3(0, 0, 0);
    this.modified = true;
    this.id = id; 					// id within the graph
    this.identifier = null; 		// external identifier
    this.ns = null;					// namespace for external identifier
    this.label = "node";  			// label to display
    this.type = "node";				// primary type of node
    this.displayList = {};
    this.selected = false;
    this.graph = null;
    this.plane = null;
    this.subGraphs = {};				// marked subsets - typically disjoint graphs

};

Triptych.Node.prototype = {

    constructor : Triptych.Node,

    getVector : function (node){
        var v = node.position.clone();
        v.sub(this.position);
        return v;
    },

    onClick : function (event, role){
        if (this.selected){
            this.setSelected(false);
        } else {
            this.setSelected(true);
        }
    },

    onIntersectedStart : function (event, role){
        this.setHighlighted(true);
    },

    onIntersectedEnd : function (event, role){
        this.setHighlighted(false);
    },

    setHighlighted : function(boolean){
        this.highlighted = boolean;
        this.graph.changed = true;
    },

    setSelected : function(boolean){
        this.selected = boolean;
        this.graph.changed = true;
    },

    atOrigin : function(){
        return this.position.x == 0 && this.position.y == 0 && this.position.z == 0;
    },

    getOutgoing : function(){
        return this.graph.getOutgoing(this);
    },

    getIncoming : function(){
        return this.graph.getIncoming(this);
    },

    getEdges : function(){
        return this.graph.getEdges(this);
    },

    getChildren : function(){
        var children = [];
        $.each(this.getOutgoing(), function(index, edge){
            if (children.indexOf(edge.to) == -1){
                children.push(edge.to);
            }
        });
        return children;
    },

    getParents : function(){
        var parents = [];
        $.each(this.getIncoming(), function(index, edge){
            var parent = edge.from;
            if (parents.indexOf(parent) == -1){
                parents.push(parent);
            }
        });
        return parents;

    },

    isSource : function(){
        return this.graph.isSource(this);
    },

    isSink : function(){
        return this.graph.isSink(this);
    },

    setLiteral : function(predicate, string){
        this.literals[predicate] = string;
    },

    getLiteral : function(predicate){
        return this.literals[predicate];
    },

    addSubGraph : function(id, text){
        if (!text) text = "subgraph " + id;
        if (!this.subGraphs.id){
            this.subGraphs.id = text;
        }
    },

    setPlane : function(plane){
        this.plane = plane;
        this.graph.changed = true;
    }


};

/*
 ------------------------------------
 Edge
 ------------------------------------
 */

Triptych.Edge = function(fromNode, relationship, toNode){

    this.from = fromNode;
    this.to = toNode;
    this.relationship = relationship;
    this.displayList = {};
    this.subGraphs = {};

};

Triptych.Edge.prototype = {

    constructor : Triptych.Edge,

    getVector : function(){
        var v = this.to.position.clone();
        v.sub(this.from.position);
        return v;
    },

    onClick : function (event, role){
        if (this.selected){
            this.setSelected(false);
        } else {
            this.setSelected(true);
        }
    },

    onIntersectedStart : function (event, role){
        this.setHighlighted(true);
    },

    onIntersectedEnd : function (event, role){
        this.setHighlighted(false);
    },

    setHighlighted : function(boolean){
        this.highlighted = boolean;
        this.graph.changed = true;
    },

    setSelected : function(boolean){
        this.selected = boolean;
        this.graph.changed = true;
    },

    initNodePositions : function(startingPosition){
        // if one of the two nodes position isn't initialized,
        // copy its position from the other.
        // this will start nodes in the layout next to a neighbor
        if (this.to.atOrigin() && !this.from.atOrigin()){
            this.to.position.set(Math.random() + this.from.position.x,
                Math.random() + this.from.position.y,
                Math.random() + this.from.position.z);
            //this.to.position.copy(this.from.position);
        } else if (this.from.atOrigin() && !this.to.atOrigin()){
            this.from.position.set(Math.random() + this.to.position.x,
                Math.random() + this.to.position.y,
                Math.random() + this.to.position.z);
            //this.from.position.copy(this.to.position);
        } else if (startingPosition) {
            this.from.position.set(startingPosition.x, startingPosition.y, startingPosition.z);
            this.to.position.set(startingPosition.x, startingPosition.y, startingPosition.z)
        }
        this.graph.changed = true;
    },

    reverse : function(){
        var temp = this.from;
        this.from = this.to;
        this.to = temp;
    },

    addSubGraph : function(id, text){
        if (!text) text = "subgraph " + id;
        if (!this.subGraphs.id){
            this.subGraphs.id = text;
        }
    }
};

/*
 ------------------------------------
 Relationship
 ------------------------------------
 */

Triptych.Relationship = function(type, causal, inverting){

    this.type = type;
    if (causal){
        this.causal = causal;
    } else {
        this.causal = false;
    }
    if (inverting){
        this.inverting = inverting;
    } else {
        this.inverting = false;
    }
};

Triptych.Relationship.prototype = {

    constructor : Triptych.Relationship

};