ndexApp.controller('networkQueryController', ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$routeParams', '$modal', function(ndexService, ndexUtility, sharedProperties, $scope, $routeParams, $modal) {

    // To avoid issues with child scopes, we use an object bind controller data to the DOM
    $scope.networkQuery = {};

    // Retrieve the network id from route params
    $scope.networkQuery.currentNetworkId = $routeParams.networkId;

    // We do this to avoid undefined errors
    if (!$scope.networkQuery.currentNetwork) $scope.networkQuery.currentNetwork = {};

    // Here we create and initialize an object whose properties we
    // will modify in the DOM and use as parameters for API requests
    $scope.networkQuery.searchDepth =
        {
            "name" : "1-step",
            "description": "1-step",
            "value": 1,
            "id": "1"
        };

    // All the possible parameters of our API request for subnetwork queries.
    $scope.networkQuery.searchDepths = [
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

    // submitNetworkQuery
    // We make the call to retrieve a subnetwork based on the selected parameters.
    // On load, we display a modal.
    // On errors, we hide all the content and display the message received from the server.
    // On success, we save the subnetwork retrieved and display all of its properties.
    $scope.networkQuery.submitNetworkQuery = function() {

        // An array to hold our errors. ng-show and ng-hide relay on the length to toggle content.
        $scope.networkQuery.errors = [];

        // We want to hold on to the request for the subnetwork query. The request contains the .abort method.
        // This way, we can call the method midstream and cancel the AJAX call.
        var request = null;

        // AngularUi modal service use. queryContent.html is reused across this controller. It is located in our
        // networkQuery.html page. We pass this controllers scope and do not allow close by clicking outside of the modal.
        var modalInstance = $modal.open({
            templateUrl: 'queryContent.html',
            scope: $scope,
            backdrop: 'static'
        });

        // cancel
        // Close the modal and abort the AJAX request.
        $scope.networkQuery.cancel = function() {
            modalInstance.close();
            request.abort();
        };

        // Note we save the 'promise' from the ndexService wrapped http request. We do not want to lose the original
        // reference and lose access to the .abort method.
        (request = ndexService.queryNetwork( $scope.networkQuery.currentNetworkId, $scope.networkQuery.searchString, $scope.networkQuery.searchDepth.value) )
            .success(
                function(network) {
                    console.log("got query results for : " + $scope.networkQuery.searchString);

                    // Save the results in proper locations.
                    csn = network;
                    $scope.networkQuery.currentSubnetwork = network;
                    //$scope.networkQuery.graphData = createD3Json(network);

                    // Network rendering preparation.
                    var height = angular.element('#canvas')[0].clientHeight;
                    var width = angular.element('#canvas')[0].clientWidth;
                    //3Setup(height, width, '#canvas');
                    //d3Init();
                    //addNetworkToD3(ndexUtility.networks[0], {x: (width * .5), y: height/2});
                    //d3Go();

                    // close the modal
                    modalInstance.close();
                }
            )
            .error(
                function(error) {
                    // Save the error.
                    if(error.status != 0) {
                        $scope.networkQuery.errors.push({label: "Http request error", error: error});

                        // close the modal.
                        modalInstance.close();
                    }
                }
            );
    };

    // initialize
    // first subnetwork to load and get network meta data.
    $scope.networkQuery.initialize = function() {

        // An array to hold our errors. ng-show and ng-hide relay on the length to toggle content.
        $scope.networkQuery.errors = [];

        // We want to hold on to the request for the subnetwork query. The request contains the .abort method.
        // This way, we can call the method midstream and cancel the AJAX call.
        var request1 = null;
        var request2 = null;

        // AngularUi modal service use. queryContent.html is reused across this controller. It is located in our
        // networkQuery.html page. We pass this controllers scope and do not allow close by clicking outside of the modal.
        var modalInstance = $modal.open({
            templateUrl: 'queryContent.html',
            scope: $scope,
            backdrop: 'static'
        });

        // cancel
        // Close the modal and abort the AJAX request.
        $scope.networkQuery.cancel = function() {
            modalInstance.close();
            request1.abort();
            request2.abort();
        };

        // Note we save the 'promise' from the ndexService wrapped http request.
        // We do not want to lose the original
        // reference and lose access to the .abort method.
        (request1 = ndexService.getNetwork($scope.networkQuery.currentNetworkId) )
            .success(
                function(network) {
                    // We save the network
                    cn = network;
                    $scope.networkQuery.currentNetwork = network;
                }
            )
            .error(
                function(error) {
                    if(error.status != 0) {
                        // Save the error
                        $scope.networkQuery.errors.push({label: "Get Network Info Request: ", error: error});
                        modalInstance.close();

                        // Let's remember this modal is closed to avoid
                        // closing it on an undefined object
                        // on the next async call.
                        modalInstance.closed = true;
                    } else {
                        $scope.networkQuery.errors.push({label: "Get Network Info Request: ", error: "Process Killed"});
                    }
                }
            );

        // hard-coded paramters for ndexService call, later on we may want to implement pagination
        var blockSize = 250;
        var skipBlocks = 0;

        // Note we save the 'promise' from the ndexService wrapped http request. We do not want to lose the original
        // reference and lose access to the .abort method.
        (request2 = ndexService.getNetworkByEdges($scope.networkQuery.currentNetworkId, skipBlocks, blockSize) )
            .success(
                function(network){

                    // Save the subnetwork
                    $scope.networkQuery.currentSubnetwork = network;
                    $scope.networkQuery.selectedEdges = network.edges;
                    csn = network;
                    $scope.networkQuery.message = "showing network '" + network.name + "'";

                    // Prepartion for network rendering
                    //console.log('D3 Network rendering start...');
                    //$scope.networkQuery.graphData = createD3Json(network);
                    var height = angular.element('#canvas')[0].clientHeight;
                    var width = angular.element('#canvas')[0].clientWidth;
                    //d3Setup(height, width, '#canvas');
                    //d3Init();
                    //addNetworkToD3(ndexUtility.networks[0], {x: (width * .5), y: height/2});
                    //d3Go();
                    if(!modalInstance.closed) modalInstance.close();
                    //modalInstance.close();
                }
            )
            .error(
                function(error) {
                    if(error.status != 0) {
                        $scope.networkQuery.errors.push({label: "Get Network Edges Request: ", error: error});
                        if(!modalInstance.closed) modalInstance.close();
                    } else {
                        $scope.networkQuery.errors.push({label: "Get Network Edges Request: ", error: "Process killed"});
                    }
                }
            );
    };

    // Initialize the current network and current subnetwork
    $scope.networkQuery.initialize();

    //--------------------------------------------------------------------------------------------------//

    /*
    NOT IMPLEMENTED
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

    NOT IMPLEMENTED
    scope.showEditControls = function () {
        if (!$scope.currentNetwork) return false;
        if (NdexClient.canEdit($scope.currentNetwork) && $scope.editMode) return true;
        return false;
    };*/



}]);


