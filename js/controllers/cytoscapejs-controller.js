function createCyElements(network) {

    var elements = {nodes: [], edges: []};

    $.each(network.nodes, function (index, node) {
        var label = NdexClient.getTermLabel(network.terms[node.represents], network);
        /*
         if (node.represents && network.terms && network.terms[node.represents]) {
         var term = network.terms[node.represents];
         label = term.name;
         }
         */
        var cyNode = {data: {id: "n" + index, name: label}};
        elements.nodes.push(cyNode);

    });

    $.each(network.edges, function (index, edge) {
        var cyEdge = {data: {source: "n" + edge.s, target: "n" + edge.o}};
        elements.edges.push(cyEdge);
    });

    return elements;
};

var cyjsObject = null;

ndexApp.controller('cjsController', function ($scope, $http, sharedProperties) {
    var NETWORK_SECTION_ID = '#cyNetwork';

    //var VISUAL_STYLE_FILE = 'ps1.json';

    var DEFAULT_VISUAL_STYLE = 'hallmarksOfCancer';

    // Basic settings for the Cytoscape window
    var options = {

        showOverlay: false,
        minZoom: 0.01,
        maxZoom: 200,

        layout: {
            name: 'preset'
        },

        style: cytoscape.stylesheet()
            .selector('node')
            .css({
                'content': 'data(name)',
                'font-family': 'helvetica',
                'font-size': 11,
                'text-outline-width': 0,
                'text-outline-color': '#000',
                'text-valign': 'center',
                'color': '#000',
                'width': 'mapData(weight, 30, 80, 20, 50)',
                'height': 'mapData(height, 0, 200, 10, 45)',
                'border-color': '#ccc'
            })
            .selector(':selected')
            .css({
                'background-color': '#FFF',
                'line-color': '#000',
                'target-arrow-color': '#000',
                'text-outline-color': '#000'
            })
            .selector('edge')
            .css({
                'width': 2,
                'target-arrow-shape': 'triangle'
            }),

        layout: {
            name: 'arbor',
            liveUpdate: true, // whether to show the layout as it's running
            ready: undefined, // callback on layoutready
            stop: undefined, // callback on layoutstop
            maxSimulationTime: 4000, // max length in ms to run the layout
            fit: true, // reset viewport to fit default simulationBounds
            padding: [ 50, 50, 50, 50 ], // top, right, bottom, left
            simulationBounds: undefined, // [x1, y1, x2, y2]; [0, 0, width, height] by default
            ungrabifyWhileSimulating: true, // so you can't drag nodes during layout

            // forces used by arbor (use arbor default on undefined)
            repulsion: undefined,
            stiffness: undefined,
            friction: undefined,
            gravity: true,
            fps: undefined,
            precision: undefined,

            // static numbers or functions that dynamically return what these
            // values should be for each element
            nodeMass: undefined,
            edgeLength: undefined,

            stepSize: 1, // size of timestep in simulation

            // function that returns true if the system is stable to indicate
            // that the layout can be stopped
            stableEnergy: function (energy) {
                var e = energy;
                return (e.max <= 0.5) || (e.mean <= 0.3);
            }
        },
        ready: function (cy) {
            console.log("running cy ready function");
            $scope.cy = this;
            //$scope.cy.load($scope.cyNetworkElements);
            setEventListeners();
        }
    };

    /*
     Event listener setup for Cytoscape.js
     */
    function setEventListeners() {

        $scope.selectedNodes = {};
        $scope.selectedEdges = {};

        // Node selection
        $scope.cy.on('select', 'node', function (event) {
            var id = event.cyTarget.id();
            $scope.$apply(function () {
                $scope.selectedNodes[id] = event.cyTarget;
            });
        });
        $scope.cy.on('select', 'edge', function (event) {
            var id = event.cyTarget.id();
            $scope.$apply(function () {
                $scope.selectedEdges[id] = event.cyTarget;
            });
        });

        // Reset selection
        $scope.cy.on('unselect', 'node', function (event) {
            var id = event.cyTarget.id();
            $scope.$apply(function () {
                delete $scope.selectedNodes[id];
            });
        });
        $scope.cy.on('unselect', 'edge', function (event) {
            var id = event.cyTarget.id();
            $scope.$apply(function () {
                delete $scope.selectedEdges[id];
            });
        });
    }

    $scope.currentNetworkId = sharedProperties.getCurrentNetworkId();
    if ('none' === $scope.currentNetworkId) $scope.currentNetworkId = "C25R1334";   // hardwired for testing

    $scope.message = "retrieving example network for display...";
    var blockSize = 500;
    var skipBlocks = 0;
    var config = NdexClient.getNetworkQueryByEdgesConfig($scope.currentNetworkId , blockSize, skipBlocks);
    $http(config)
        .success(function (network) {
            $scope.currentSubnetwork = network;
            $scope.cyNetworkElements = createCyElements(network);
            options.elements = $scope.cyNetworkElements;
            $scope.message = "showing network '" + network.name + "'";
            //$scope.cy.load($scope.cyNetworkElements);
            //setEventListeners();
            cyjsObject = angular.element(NETWORK_SECTION_ID).cytoscape(options);
            //options.ready();
        });

});
