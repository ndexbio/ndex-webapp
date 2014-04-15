// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp', ['ngRoute']);

ndexApp.service('sharedProperties', function () {
    var currentNetworkId = 'none';

    return {
        getCurrentNetworkId: function () {
            return currentNetworkId;
        },
        setCurrentNetworkId: function (value) {
            currentNetworkId = value;
        }
    }
});


var cyjsObject = null;

// configure our routes
ndexApp.config(function ($routeProvider) {
    $routeProvider

        // route for the home page
        .when('/', {
            templateUrl: 'pages/home.html',
            controller: 'mainController'
        })

        // route for the about page
        .when('/about', {
            templateUrl: 'pages/about.html',
            controller: 'aboutController'
        })

        // route for the contact page
        .when('/contact', {
            templateUrl: 'pages/contact.html',
            controller: 'contactController'
        })

        // route for the searchNetworks page
        .when('/searchNetworks', {
            templateUrl: 'pages/searchNetworks.html',
            controller: 'searchNetworksController'
        })

        // route for the cjs page
        .when('/cjs', {
            templateUrl: 'pages/cjs.html',
            controller: 'cjsController'
        })

        // route for the triptych page
        .when('/triptych', {
            templateUrl: 'pages/triptych.html',
            controller: 'triptychController'
        })

        // route for the networkQuery page
        .when('/networkQuery', {
            templateUrl: 'pages/networkQuery.html',
            controller: 'networkQueryController'
        })

        // route for the signIn page
        .when('/signIn', {
            templateUrl: 'pages/signIn.html',
            controller: 'signInController'
        });
});

// create the controller and inject Angular's $scope
ndexApp.controller('mainController', function ($scope, $location, $http) {
    // create a message to display in our view
    if (NdexClient.checkLocalStorage()) {

        if (localStorage.username) {
            $scope.username = localStorage.username;
            $scope.password = localStorage.password;
        }
        $scope.networkSearchResults = null;
        $scope.signout = function () {
            NdexClient.clearUserCredentials();
            $scope.username = null;
            $scope.password = null;
            $location.path("/signIn");
        }
    } else {
        $.gritter.add({ title: "Error", text: "This web application requires a recent browser that supports localStorage" });
    }
});

ndexApp.controller('aboutController', function ($scope) {

});

ndexApp.controller('contactController', function ($scope) {

});

ndexApp.controller('signInController', function ($scope, $location, $http) {
    $scope.username = null;
    $scope.password = null;
    $scope.goHome = function (name) {
        console.log("going to home");
        $location.path("/");
    };
    $scope.submitSignIn = function () {
        NdexClient.clearUserCredentials();
        var config = NdexClient.getSubmitUserCredentialsConfig($scope.username, $scope.password);
        $http(config)
            .success(function (userdata) {
                $scope.goHome();
                NdexClient.setUserCredentials(userdata, $scope.password);
            })
            .error(function (error) {
                $.gritter.add({ title: "Error", text: "Error in sign-in: check username and password." });
            });

    }
    $scope.getNdexServer = function () {
        return NdexClient.NdexServerURI;
    }
});

ndexApp.controller('searchNetworksController', function ($scope, $http, $location, sharedProperties) {
    $scope.message = "initial message";
    /* debugging...
     $scope.networkSearchResults = [
     {name: "fake network"}
     ];
     */
    $scope.setAndDisplayCurrentNetwork = function (networkId) {
        sharedProperties.setCurrentNetworkId(networkId);
        $location.path("/networkQuery");
    }
    $scope.submitNetworkSearch = function () {
        var config = NdexClient.getNetworkSearchConfig($scope.searchType, $scope.searchString);
        $http(config)
            .success(function (networks) {
                $scope.networkSearchResults = networks;
                console.log("Set networkSearchResults");
                console.log("first network name = " + networks[0].name);
                $scope.message = "first network name = " + networks[0].name;
            });
    }
});


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


var cn, csn;
ndexApp.controller('networkQueryController', function ($scope, $http, sharedProperties) {
    if (!$scope.nodeLabels) $scope.nodeLabels = {};
    if (!$scope.predicateLabels) $scope.predicateLabels = {};
    if (!$scope.currentNetwork) $scope.currentNetwork = {};

    $scope.currentNetworkId = sharedProperties.getCurrentNetworkId();
    if ('none' === $scope.currentNetworkId) $scope.currentNetworkId = "C25R1174";   // hardwired for testing
    $scope.editMode = false;

    $scope.networkOptions = [
        "Save Selected Subnetwork",
        "And another choice for you.",
        "but wait! A third!"
    ];

    $scope.saveSelectedSubnetwork = function(){
        $scope.currentSubnetwork.description = "test subnetwork";
        $scope.currentSubnetwork.name = "testSubnetwork" + Math.floor(Math.random() * 10000);
        $scope.currentSubnetwork.isPublic = true;
        var config = NdexClient.getSaveNetworkConfig($scope.currentSubnetwork);
        alert("about to save selected subnetwork " + $scope.currentSubnetwork.name);
        $http(config)
            .success(function (network) {
                alert("saved selected subnetwork " + $scope.currentSubnetwork.name);
            });

    };

    $scope.searchTypes = [
        {
            "id": "NEIGHBORHOOD",
            "description": "Neighborhood",
            "name": "Neighborhood"
        },
        {
            "id": "INTERCONNECT",
            "description": "Find paths between nodes with these terms",
            "name": "Interconnect"
        }
    ];

    $scope.searchDepths = [
        {
            "name" : "1-step",
            "description": "1-step",
            "value": 1,
            "id": "1"
        },
        {
            "name" : "2-step",
            "description": "2-step",
            "value": 2,
            "id": "2"
        },
        {
            "name" : "3-step",
            "description": "3-step",
            "value": 3,
            "id": "3"
        }
    ];


    $scope.submitNetworkQuery = function () {
        var terms = $scope.searchString.split(/[ ,]+/);
        var networkQueryConfig = NdexClient.getNetworkQueryConfig(
            $scope.currentNetworkId,
            terms,
            $scope.searchType.id,
            $scope.searchDepth.value,
            0,    // skip blocks
            500  // block size for edges
        );

        d3Setup(height, width, '#canvas');
        $http(networkQueryConfig)
            .success(function (network) {
                NdexClient.updateNodeLabels($scope.nodeLabels, network);
                console.log("got query results for : " + $scope.searchString);
                csn = network;
                $scope.currentSubnetwork = network;
                $scope.graphData = createD3Json(network);

                d3Render($scope.graphData);
            });
    }

    $scope.showEditControls = function () {
        if (!$scope.currentNetwork) return false;
        if (NdexClient.canEdit($scope.currentNetwork) && $scope.editMode) return true;
        return false;
    };

    // if there is a current network id, get the network meta information
    var getNetworkConfig = NdexClient.getNetworkConfig($scope.currentNetworkId);
    $http(getNetworkConfig)
        .success(function (network) {
            console.log("got current network");
            cn = network;
            $scope.currentNetwork = network;
        });

    var height = angular.element('#canvas')[0].clientHeight;
    var width = angular.element('#canvas')[0].clientWidth;
    d3Setup(height, width, '#canvas');

    var blockSize = 100;
    var skipBlocks = 0;
    var config = NdexClient.getNetworkQueryByEdgesConfig($scope.currentNetworkId, skipBlocks, blockSize);
    $http(config)
        .success(function (network) {
            NdexClient.updateNodeLabels($scope.nodeLabels, network);
            $scope.currentSubnetwork = network;
            csn = network;
            $scope.message = "showing network '" + network.name + "'";


            console.log('D3 Network rendering start...');

            $scope.graphData = createD3Json(network);
            d3Render($scope.graphData);

        });

});

//-------------------------------------------------------------------------
var net1, net2;
// for now, assuming webgl...
ndexApp.controller('triptychController', function ($scope, $http, sharedProperties) {
    $scope.currentNetworkId = sharedProperties.getCurrentNetworkId();
    if ('none' === $scope.currentNetworkId) $scope.currentNetworkId = "C25R1174";   // hardwired for testing

    var blockSize = 1000;
    var skipBlocks = 0;
    var config = NdexClient.getNetworkQueryByEdgesConfig($scope.currentNetworkId, skipBlocks, blockSize);
    $scope.showDetails = true;

    $scope.addNetwork = function (id, position, callback) {
        var config = NdexClient.getNetworkQueryByEdgesConfig(id, skipBlocks, blockSize);
        $http(config)
            .success(function (network) {
                NdexClient.addNetwork(network);
                NdexTriptych.addNetwork(network, position);
                console.log("added network");
                $scope.selectedEdges = network.edges;
                csn = network;
                callback();
                console.log("callback done");
            });
    };

    $scope.linkMatchingNodes = function () {
        // For the first and second networks loaded in NdexClient,
        // Find all shared terms in namespace HGNC
        console.log("calling linkMatchingNodes");

        var network1 = NdexClient.networks[0];
        net1 = network1;
        NdexClient.indexNodesByTerms(network1);
        var network2 = NdexClient.networks[1];
        net2 = network2;
        NdexClient.indexNodesByTerms(network2);
        //var namespacePrefix = "UniProt";
        var namespacePrefix = "HGNC";
        console.log("network1: " + network1.name + " nodes: " + network1.nodeCount + " edges: " + network1.edgeCount);
        console.log("network2: " + network2.name + " nodes: " + network2.nodeCount + " edges: " + network2.edgeCount);
        var sharedTerms = NdexClient.findSharedTerms(network1, network2, namespacePrefix);
        console.log("shared terms: " + sharedTerms.length + " in namespace " + namespacePrefix);
        var plane1 = NdexTriptych.graph.planes[0];
        var plane2 = NdexTriptych.graph.planes[1];
        // Then for each shared term find the nodes in each network that
        // are linked to the term.
        // For each pair of nodes that share a term, add an edge to the graph in NdexTriptych
        for (index in sharedTerms) {
            var termPair = sharedTerms[index];
            var term1NodeIds = NdexClient.getTermNodes(network1, termPair[0]);
            var term2NodeIds = NdexClient.getTermNodes(network2, termPair[1]);

            for (i in term1NodeIds){
                var node1Id = term1NodeIds[i];
                for( j in term2NodeIds){
                    node2Id = term2NodeIds[j];
                    NdexTriptych.addEdgeBetweenPlanes(plane1, node1Id, plane2, node2Id, "corresponds");
                }
            }
        }
    }

    NdexTriptych.setup('webGl', "3d", angular.element("#triptychContainer")[0]);

    $scope.addNetwork(
        "C25R1334",
        new THREE.Vector3(-200, 0, -100),
        function(){
            $scope.addNetwork(
                "C25R1333",
                new THREE.Vector3(200, 0, 100),
                $scope.linkMatchingNodes);
        });

});
//-------------------------------------------------------------------------

ndexApp.controller('cjsController', function ($scope, $http) {
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

    $scope.message = "retrieving example network for display...";
    //$scope.currentSubnetwork = {name: "fake network"};
    var networkId = "C25R1174";
    var blockSize = 500;
    var skipBlocks = 0;
    var config = NdexClient.getNetworkQueryByEdgesConfig(networkId, blockSize, skipBlocks);
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

