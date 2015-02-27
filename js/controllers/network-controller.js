ndexApp.controller('networkController',
    ['ndexService', 'cytoscapeService', 'provenanceVisualizerService', 'ndexUtility', 'ndexNavigation', 'sharedProperties', '$scope', '$routeParams', '$modal', '$route',
        function (ndexService, cytoscapeService, provenanceVisualizerService, ndexUtility, ndexNavigation, sharedProperties, $scope, $routeParams, $modal, $route) {

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
            networkController.displayAnyway = false;

            $scope.provenance = [];


            $scope.tree = [{name: "Node", nodes: []}];

            $scope.delete = function(data) {
                data.nodes = [];
            };
            $scope.add = function(data) {
                var post = data.nodes.length + 1;
                var newName = data.name + '-' + post;
                data.nodes.push({name: newName,nodes: []});
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


            networkController.shouldDisplayAnyway = function()
            {
                networkController.displayAnyway = true;
                cytoscapeService.setNetwork(csn);

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
            networkController.submitNetworkQuery = function () {

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
                (request = ndexService.queryNetwork(networkController.currentNetworkId, networkController.searchString, networkController.searchDepth.value, 1500) )
                    .success(
                    function (network) {
                        //console.log("got query results for : " + networkController.searchString);
                        csn = network;
                        networkController.queryErrors = [];
                        networkController.currentSubnetwork = network;
                        cytoscapeService.setNetwork(network);
                        // close the modal
                        networkController.displayAnyway = false;
                        networkController.successfullyQueried = true;
                        modalInstance.close();
                    }
                )
                    .error(
                    function (error) {
                        if (error.status != 0) {
                            networkController.queryErrors.push(error.data);
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
                var blockSize = 250;
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


