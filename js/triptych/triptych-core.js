if (typeof(Triptych) === 'undefined') Triptych = {};


/*
 ------------------------------------
 Visualizer
 ------------------------------------
 */

Triptych.Visualizer = function () {

    this.scene = new THREE.Scene();
    this.displayObjectToElementMap = {};
    this.intersectedElement = null;
    this.intersectionRole = null;
    this.lastIntersectedElement = null;
    this.lastIntersectionRole = null;
    this.edgeReferenceLength = 100;
    this.resources = {};

};

Triptych.Visualizer.prototype = {

    constructor: Triptych.Visualizer,

    init: function () {

    },

    render: function () {
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
    },

    update: function (graph) {

        this.needsRender = false;

        this.updateTimeLoops();

        this.updateLights();

        for (var i = 0; i < graph.nodes.length; i++) {
            var node = graph.nodes[i];
            this.updateNode(node);
        }

        for (var i = 0; i < graph.edges.length; i++) {
            var edge = graph.edges[i];
            this.updateEdge(edge);
        }

    },

    // These methods could be regarded as redundant,
    // but they are used to make the code especially clear
    // in an area where confusion is easy
    //
    mapDisplayObjectToElement: function (displayObject, element, role) {
        this.displayObjectToElementMap[displayObject.id] = [element, role];
    },

    unmapDisplayObject: function (displayObject) {
        delete this.displayObjectToElementMap[displayObject.id];
    },

    getElementAndRoleByDisplayObject: function (displayObject) {
        if (!displayObject) return null;
        if (!displayObject.id) return null;
        return this.displayObjectToElementMap[displayObject.id];
    },

    addElement: function (object, element, role) {
        this.scene.add(object);
        this.mapDisplayObjectToElement(object, element, role);
    },

    updateLights: function () {

    },

    updateTimeLoops: function () {

    },

    addTexture: function (resourceName, url) {
        this.resources[resourceName] = THREE.ImageUtils.loadTexture(url);
    }

};

/*
 ------------------------------------
 NodeDisplayer
 ------------------------------------
 */

Triptych.NodeDisplayer = function (node) {
    this.node = node;

};

Triptych.NodeDisplayer.prototype.constructor = Triptych.NodeDisplayer;


/*
 ------------------------------------
 EdgeDisplayer
 ------------------------------------
 */

Triptych.EdgeDisplayer = function (edge) {
    this.edge = edge;

};

Triptych.EdgeDisplayer.prototype.constructor = Triptych.EdgeDisplayer;

/*
 ------------------------------------
 Layout
 ------------------------------------
 */

Triptych.Layout = function () {

};

Triptych.Layout.prototype = {

    constructor: Triptych.Layout,

    setGraph: function (graph) {
        this.graph = graph;
        this.graph.changed = true;
    },

    update: function () {

    }

};


Triptych.DynamicLayout = function (graph) {

    this.needsUpdate = true;
    this.updateCount = 200;

};

Triptych.DynamicLayout.prototype = new Triptych.Layout();

Triptych.DynamicLayout.prototype.constructor = Triptych.DynamicLayout;

Triptych.DynamicLayout.prototype.update = function () {

    if (this.needsUpdate && this.updateCount <= 0) {
        this.needsUpdate = false;
    }
    if (this.needsUpdate && this.graph.nodes && this.graph.nodes.length > 0) {
        //console.log("layoutStep");
        // doing 2 layout steps is a workaround for
        // a "jitter" problem in the dynamic layout engines
        this.layoutStep();
        this.layoutStep();
        this.graph.changed = true;
        this.updateCount--;
    }
    return this.needsUpdate;

};

Triptych.DynamicLayout.prototype.startUpdating = function (max) {

    this.needsUpdate = true;
    this.updateCount = max || 200;

};

Triptych.DynamicLayout.prototype.stopUpdating = function () {

    this.needsUpdate = false;
    this.updateCount = 0;

};

/*
 ------------------------------------
 Space
 ------------------------------------
 */

Triptych.Space = function (graph, visualizer, layout, container) {

    this.graph = graph;
    this.visualizer = visualizer;
    this.visualizer.space = this;
    this.layout = layout;
    this.layout.space = this;
    this.container = container;
    this.controls = null;
    this.cameraInitialZ = 300;
    this.alwaysUpdate = false;


};

Triptych.Space.prototype = {

    constructor: Triptych.Space,

    init: function (renderFunction) {

        this.layout.setGraph(this.graph);

        this.initCamera();

        this.visualizer.init(window.innerWidth, window.innerHeight, this.camera);

        this.initControls(renderFunction);

        // The container used by the space should *only* have the renderer domElement as a child.
        // So we clear it before adding the renderer element, that way this works
        // when we swap visualizers
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        this.container.appendChild(this.visualizer.renderer.domElement);

    },

    initCamera: function () {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
        this.camera.position.z = this.cameraInitialZ;
    },

    initControls: function (renderFunction) {
        this.controls = new THREE.TrackballControls(this.visualizer.camera);

        this.controls.rotateSpeed = 1.0;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.8;

        this.controls.noZoom = false;
        this.controls.noPan = false;

        this.controls.staticMoving = true;
        this.controls.dynamicDampingFactor = 0.3;

        this.controls.keys = [ 65, 83, 68 ];

        this.controls.addEventListener('change', renderFunction);
    },

    update: function (){
        this.layout.update();
        var controlsChanged = this.controls.update();

        //
        // Update the visualization and render if the graph has changed
        // or if the controls change
        //
        if (controlsChanged || this.graph.changed || this.alwaysUpdate) {
            this.visualizer.update(this.graph);

            this.visualizer.render();
        }

        //
        // Clear the state of the graph
        //
        this.graph.changed = false;
    }

};

