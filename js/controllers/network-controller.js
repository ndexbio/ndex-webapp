ndexApp.controller('networkController',
    ['ndexService', 'cytoscapeService', 'provenanceVisualizerService', 'ndexUtility', 'ndexNavigation', 'sharedProperties', '$scope', '$routeParams', '$modal',
    function(ndexService, cytoscapeService, provenanceVisualizerService, ndexUtility, ndexNavigation, sharedProperties, $scope, $routeParams, $modal) {

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

    networkController.searchDepths = [
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

    //                  scope functions

    // queries within a network
    networkController.submitNetworkQuery = function() {

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
        networkController.cancel = function() {
            modalInstance.close();
            request.abort();
        };

        // Note we save the 'promise' from the ndexService wrapped http request. We do not want to lose the original
        // reference and lose access to the .abort method.
        (request = ndexService.queryNetwork( networkController.currentNetworkId, networkController.searchString, networkController.searchDepth.value) )
            .success(
                function(network) {
                    console.log("got query results for : " + networkController.searchString);
                    csn = network;
                    networkController.currentSubnetwork = network;
                    cytoscapeService.setNetwork(network);
                    // close the modal
                    modalInstance.close();
                }
            )
            .error(
                function(error) {
                    if(error.status != 0) {
                        networkController.errors.push({label: "Http request error", error: error});
                        // close the modal.
                        modalInstance.close();
                    }
                }
            );
    };


    networkController.getCitation = function(citation) {
        //return;
        var identifier = networkController.currentSubnetwork.citations[citation].identifier;
        var parsedString = identifier.split(':');

        if(parsedString[0] == 'pmid') {
            return 'http://www.ncbi.nlm.nih.gov/pubmed/'+parsedString[1];
        } else {
            //TODO
        }
    };

    networkController.saveSubnetwork = function() {
        ndexNavigation.openConfirmationModal(
            'Save the current subnetwork for '+networkController.currentNetwork.name+' to your account?',
            function() {
                var d = new Date();
                var timestamp = d.toLocaleDateString() + ' ' + d.toLocaleTimeString()
                networkController.currentSubnetwork.name = networkController.currentNetwork.name + ' Subnetwork - ' + timestamp;
                ndexService.saveSubnetwork(networkController.currentSubnetwork, 
                    function(data){
                        //TODO
                    },
                    function(error){
                        //TODO
                    })
            });
    }

    //                  local functions

    var initialize = function() {
        // vars to keep references to http calls to allow aborts
        var request1 = null;
        var request2 = null;
        
        // get network summary
        // keep a reference to the promise
        (request1 = ndexService.getNetwork(networkController.currentNetworkId) )
            .success(
                function(network) {
                    cn = network;
                    networkController.currentNetwork = network;
                    getMembership(function() {
                        if(networkController.isAdmin || network.visibility == 'PUBLIC')
                            getEdges(function(subnetwork){
                                cytoscapeService.setNetwork(subnetwork);
                            })
                    })
                }
            )
            .error(
                function(error) {
                    if(error.status != 0) {
                        networkController.errors.push({label: "Get Network Info Request: ", error: error});
                        //modalInstance.close();
                        //modalInstance.closed = true;
                    } else {
                        networkController.errors.push({label: "Get Network Info Request: ", error: "Process Killed"});
                    }
                }
            );

        getProvenance();
    };

    var getMembership = function(callback) {
        ndexService.getMyMembership(networkController.currentNetworkId, 
            function(membership) {
                if((membership && membership.permissions == 'ADMIN') || (membership && membership.permissions == 'WRITE'))
                    networkController.isAdmin = true;

                callback();
            },
            function(error){
                console.log(error);
            });

    }

    var getEdges = function(callback) {
        // hard-coded parameters for ndexService call, later on we may want to implement pagination
        var blockSize = 50;
        var skipBlocks = 0;

        // get first convenienceuple of edges
        (request2 = ndexService.getNetworkByEdges(networkController.currentNetworkId, skipBlocks, blockSize) )
            .success(
                function(network){
                    csn = network; // csn is a debugging convenience variable
                    networkController.currentSubnetwork = network;
                    networkController.selectedEdges = network.edges;  
                    callback(network);
                }
            )
            .error(
                function(error) {
                    if(error.status != 0) {
                        networkController.errors.push({label: "Get Network Edges Request: ", error: error});
                    } else {
                        networkController.errors.push({label: "Get Network Edges Request: ", error: "Process killed"});
                    }
                }
            );
    }

    var getProvenance = function() {
        ndexService.getProvenance(networkController.currentNetworkId,
            function(data) {
                // fake data
                provenanceVisualizerService.setProvenance(provenanceVisualizerService.createFakeProvenance());
               // provenanceVisualizerService.setProvenance(data);
            }, function(error) {
                //TODO
            });
    }

    //                  PAGE INITIALIZATIONS/INITIAL API CALLS
    //----------------------------------------------------------------------------

    // prepare the cytoscape viewer
    cytoscapeService.initCyGraph();
    provenanceVisualizerService.initCyGraph();

    // set the initial depth for queries
    networkController.searchDepth = {
            "name" : "1-step",
            "description": "1-step",
            "value": 1,
            "id": "1"
        };

    networkController.isAdmin = false;
    networkController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);
    // Initialize the current network and current subnetwork
    initialize();

}]);


