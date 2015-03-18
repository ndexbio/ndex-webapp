ndexApp.controller('networkController',
    ['ndexService', 'cytoscapeService', 'provenanceVisualizerService', 'ndexUtility', 'ndexNavigation', 'sharedProperties', '$scope', '$routeParams', '$modal', '$route', '$filter',
        function (ndexService, cytoscapeService, provenanceVisualizerService, ndexUtility, ndexNavigation, sharedProperties, $scope, $routeParams, $modal, $route, $filter) {

            //              Process the URL to get application state
            //-----------------------------------------------------------------------------------
            var networkExternalId = $routeParams.identifier;
            sharedProperties.setCurrentNetworkId(networkExternalId);

            //              CONTROLLER INTIALIZATIONS
            //------------------------------------------------------------------------------------


            $scope.networkController = {};
            var networkController = $scope.networkController;

            networkController.currentNetworkId = networkExternalId; // externalId
            networkController.currentNetwork = {}; // network summary
            networkController.currentSubnetwork = {}; // subnetwork
            networkController.errors = []; // general page errors
            networkController.queryErrors = [];

            networkController.isAdmin = false;
            networkController.canEdit = false;
            networkController.canRead = false;
            networkController.directIsAdmin = false;
            networkController.directCanEdit = false;
            networkController.directCanRead = false;

            networkController.successfullyQueried = false;

            $scope.provenance = [];
            $scope.displayProvenance = [];


            $scope.tree = [{name: "Node", nodes: []}];

            $scope.delete = function(data) {
                data.nodes = [];
            };
            $scope.add = function(data) {
                var post = data.nodes.length + 1;
                var newName = data.name + '-' + post;
                data.nodes.push({name: newName,nodes: []});
            };

            $scope.getProvenanceTitle = function(provenance)
            {
                if( typeof provenance == 'undefined' )
                    return "";
                if( provenance.properties == null )
                    return provenance.uri;
                for( var i = 0; i < provenance.properties.length; i++ )
                {
                    var p = provenance.properties[i];
                    if(p.name == "dc:title")
                        return p.value;
                }
                return provenance.uri;
            };

            $scope.buildGraph = function(prov, level, parent_node, edge_label, merge, nodes, edges, provMap)
            {
                var node_id = nodes.length;

                var node = {
                    id: node_id,
                    label: $scope.getProvenanceTitle(prov),
                    level: level
                };

                nodes.push(node);
                provMap[node_id] = prov;

                if( parent_node != -1 )
                {
                    if( !merge )
                    {
                        var edge = {
                            to: parent_node,
                            from: node_id,
                            label: edge_label
                        };
                        edges.push(edge);
                    }
                    else
                    {
                        var edge = {
                            to: parent_node,
                            from: node_id
                        };
                        edges.push(edge);
                    }
                }

                var inputs = prov.creationEvent.inputs;
                if( inputs != null )
                {
                    if( inputs.length > 1 )
                    {
                        var join_id = node_id + 1;
                        level++;
                        var join_node = {
                            id: join_id,
                            label: "",
                            level: level
                        };
                        nodes.push(join_node);
                        var join_edge = {
                            to: node_id,
                            from: join_id,
                            label: prov.creationEvent.eventType + "\non\n" + $filter('date')(prov.creationEvent.endedAtTime, 'mediumDate')
                        };
                        edges.push(join_edge);
                        node_id = join_id;
                        merge = true;
                    }
                    else
                    {
                        merge = false;
                    }

                    for(var i = 0; i < inputs.length; i++ )
                    {
                        var edgeLabel = prov.creationEvent.eventType + "\non\n" + $filter('date')(prov.creationEvent.endedAtTime, 'mediumDate')
                        $scope.buildGraph(inputs[i], level+1, node_id, edgeLabel, merge, nodes, edges, provMap);
                    }
                }
                else
                {

                    var start_node = {
                        id: node_id+1,
                        label: 'Start',
                        level: level+1
                    };
                    nodes.push(start_node);

                    var edge = {
                        to: node_id,
                        from: node_id+1,
                        label: prov.creationEvent.eventType + "\non\n" + $filter('date')(prov.creationEvent.endedAtTime, 'mediumDate')
                    }

                    edges.push(edge)
                }

            };

            $scope.build_provenance_view = function()
            {
                var nodes = [];
                var edges = [];
                var provMap = [];




                $scope.buildGraph($scope.provenance, 1, -1, '', false, nodes, edges, provMap);

                // create a network
                var container = document.getElementById('provenanceNetwork');
                var data = {
                    nodes: nodes,
                    edges: edges
                };
                var options = {
                    width: '100%',
                    height: '600px',
                    stabilize: false,
                    smoothCurves: false,
                    hierarchicalLayout: {
                        direction: 'UD'
                    },
                    edges: {
                        fontFace: 'helvetica',
                        width: 2,
                        style: 'arrow',
                        color: 'silver',
                        fontColor: 'black'
                    },
                    nodes: {
                        // default for all nodes
                        fontFace: 'helvetica',
                        shape: 'box',
                        color: {
                            border: 'lightgreen',
                            background: 'lightgreen'
                        }
                    }
                };

                $scope.displayProvenance = $scope.provenance;

                var network = new vis.Network(container, data, options);

                network.moveTo(
                    {
                        position: {
                            x: '0',
                            y: '400'
                        },
                        scale: '1'
                    }
                );

                network.on('select', function (properties) {
                    var node_id = properties.nodes[0];
                    if (typeof provMap[node_id] == 'undefined')
                        return;
                    $scope.$apply(function(){
                        $scope.displayProvenance = provMap[node_id];
                    });

                });
            };

            networkController.getEdgeKeys = function()
            {
                var keys = [];
                for( var key in networkController.currentSubnetwork.edges )
                {
                    if( networkController.currentSubnetwork.edges.hasOwnProperty(key) )
                        keys.push(key);
                }
                return keys;
            };

            networkController.getNodeKeys = function()
            {
                var keys = [];
                for( var key in networkController.currentSubnetwork.nodes )
                {
                    if( networkController.currentSubnetwork.nodes.hasOwnProperty(key) )
                        keys.push(key);
                }
                return keys;
            };

            //Used for pagination
            $scope.currentEdgePage = 0;
            $scope.currentNodePage = 0;
            $scope.itemsPerPage = 30;
            $scope.paginationMaxSize = 5;

            $scope.numberOfPages=function(){
                length = networkController.currentSubnetwork.edges.length;
                return Math.ceil(length/$scope.pageSize);
            };

            networkController.searchDepths = [
                {
                    "name": "1-step",
                    "description": "1-step",
                    "value": 1,
                    "id": "1"
                },
                {
                    "name": "2-step",
                    "description": "2-step",
                    "value": 2,
                    "id": "2"
                },
                {
                    "name": "3-step",
                    "description": "3-step",
                    "value": 3,
                    "id": "3"
                }
            ];

            //                  scope functions

            // queries within a network
            networkController.submitNetworkQuery = function (networkQueryLimit) {

                // var to keep the reference to http call to call abort method;
                var request = null;


                // replace with in page loader
                var modalInstance = $modal.open({
                    templateUrl: 'queryContent.html',
                    scope: $scope,
                    backdrop: 'static'
                });

                // cancel
                // Close the modal and abort the AJAX request.
                networkController.cancel = function () {
                    modalInstance.close();
                    request.abort();
                };

                // Note we save the 'promise' from the ndexService wrapped http request. We do not want to lose the original
                // reference and lose access to the .abort method.
                // David says: The last parameter is the edgeLimit. We are using this in the Web App temporarily.
                (request = ndexService.queryNetwork(networkController.currentNetworkId, networkController.searchString, networkController.searchDepth.value, networkQueryLimit) )
                    .success(
                    function (network) {
                        //console.log("got query results for : " + networkController.searchString);
                        csn = network;
                        networkController.queryErrors = [];
                        networkController.currentSubnetwork = network;
                        cytoscapeService.setNetwork(network);
                        // close the modal
                        networkController.successfullyQueried = true;
                        modalInstance.close();
                    }
                )
                    .error(
                    function (error) {
                        if (error.status != 0) {
                            if( error.data == "Error in queryForSubnetwork: Result set is too large for this query.")
                            {
                                networkController.queryErrors.push("Error Querying: The maximum query size is " + networkQueryLimit);
                            }
                            else
                            {
                                networkController.queryErrors.push(error.data);
                            }

                            // close the modal.
                            modalInstance.close();
                        }
                    }
                );
            };

            networkController.backToOriginalNetwork = function () {
                $route.reload();
            };


            networkController.getCitation = function (citation) {
                //return;
                var identifier = networkController.currentSubnetwork.citations[citation].identifier;
                var parsedString = identifier.split(':');

                if (parsedString[0] == 'pmid') {
                    return 'http://www.ncbi.nlm.nih.gov/pubmed/' + parsedString[1];
                } else {
                    //TODO
                }
            };

            //                  local functions

            var initialize = function () {
                // vars to keep references to http calls to allow aborts
                var request1 = null;
                var request2 = null;

                // get network summary
                // keep a reference to the promise
                (request1 = ndexService.getNetwork(networkController.currentNetworkId) )
                    .success(
                    function (network) {
                        cn = network;
                        networkController.currentNetwork = network;
                        getMembership(function () {

                            if (network.visibility == 'PUBLIC'
                                || networkController.isAdmin
                                || networkController.canEdit
                                || networkController.canRead)
                                getEdges(function (subnetwork) {
                                    cytoscapeService.setNetwork(subnetwork);
                                })
                        })
                    }
                )
                    .error(
                    function (error) {
                        if (error.status != 0) {
                            networkController.errors.push({label: "Get Network Info Request: ", error: error});
                            //modalInstance.close();
                            //modalInstance.closed = true;
                        } else {
                            networkController.errors.push({
                                label: "Get Network Info Request: ",
                                error: "Process Killed"
                            });
                        }
                    }
                );

            };

            var getMembership = function (callback) {
                ndexService.getMyMembership(networkController.currentNetworkId,
                    function (membership) {
                        if (membership && membership.permissions == 'ADMIN')
                            networkController.isAdmin = true;
                        if (membership && membership.permissions == 'WRITE')
                            networkController.canEdit = true;
                        if (membership && membership.permissions == 'READ')
                            networkController.canRead = true;
                        callback();
                    },
                    function (error) {
                        //console.log(error);
                    });

            };

            var getDirectMembership = function (callback) {
                ndexService.getMyDirectMembership(networkController.currentNetworkId,
                    function (membership) {
                        if (membership && membership.permissions == 'ADMIN')
                            networkController.directIsAdmin = true;
                        if (membership && membership.permissions == 'WRITE')
                            networkController.directCanEdit = true;
                        if (membership && membership.permissions == 'READ')
                            networkController.directCanRead = true;
                        callback();
                    },
                    function (error) {
                        //console.log(error);
                    });

            };

            var getEdges = function (callback) {
                // hard-coded parameters for ndexService call, later on we may want to implement pagination
                var blockSize = 300;
                var skipBlocks = 0;

                // get first convenienceuple of edges
                (request2 = ndexService.getNetworkByEdges(networkController.currentNetworkId, skipBlocks, blockSize) )
                    .success(
                    function (network) {
                        csn = network; // csn is a debugging convenience variable
                        networkController.currentSubnetwork = network;
                        networkController.selectedEdges = network.edges;
                        callback(network);
                    }
                )
                    .error(
                    function (error) {
                        if (error.status != 0) {
                            networkController.errors.push({label: "Get Network Edges Request: ", error: error});
                        } else {
                            networkController.errors.push({
                                label: "Get Network Edges Request: ",
                                error: "Process killed"
                            });
                        }
                    }
                );
            };

            var getProvenance = function () {
                ndexService.getProvenance(networkController.currentNetworkId,
                    function (data) {
                        // fake data
                        // provenanceVisualizerService.setProvenance(provenanceVisualizerService.createFakeProvenance());
                        // real data
                        provenanceVisualizerService.setProvenance(data);
                        $scope.provenance = data;
                        var x = 10;

                    }, function (error) {
                        //TODO
                    });
            };

            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

            // prepare the cytoscape viewer
            cytoscapeService.initCyGraph();
            provenanceVisualizerService.initCyGraph();

            // set the initial depth for queries
            networkController.searchDepth = {
                "name": "1-step",
                "description": "1-step",
                "value": 1,
                "id": "1"
            };

            networkController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);
            // Initialize the current network and current subnetwork
            initialize();
            getProvenance();

        }]);


