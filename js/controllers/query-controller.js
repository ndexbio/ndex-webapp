ndexApp.controller('networkQueryController', ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$routeParams', '$modal', function(ndexService, ndexUtility, sharedProperties, $scope, $routeParams, $modal) {
    //refactoring
    //------------------------------------------------------------------------------------------------//
    $scope.networkQuery = {};

    //setup current network
    $scope.networkQuery.currentNetworkId = $routeParams.networkId;
    $scope.networkQuery.editMode = false;


    if (!$scope.networkQuery.currentNetwork) $scope.networkQuery.currentNetwork = {};

    //query search
    $scope.networkQuery.searchDepth = {
        "name" : "1-step",
        "description": "1-step",
        "value": 1,
        "id": "1"};

    $scope.networkQuery.networkOptions = [
        "Save Selected Subnetwork",
        "And another choice for you.",
        "but wait! A third!"
    ];

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

    $scope.networkQuery.submitNetworkQuery = function() {
        var modalInstance = $modal.open({
            template: '<div class="modal-body text-center"><img src="img/horizontal-loader.gif"></div>',
            size: ''
        });
        var terms = $scope.networkQuery.searchString.split(/[ ,]+/);
        ndexService.queryNetwork( $scope.networkQuery.currentNetworkId, terms, $scope.networkQuery.searchDepth.value).success(
            function(network) {
                console.log("got query results for : " + $scope.networkQuery.searchString);

                csn = network;
                $scope.networkQuery.currentSubnetwork = network;
                $scope.networkQuery.graphData = createD3Json(network);

                var height = angular.element('#canvas')[0].clientHeight;
                var width = angular.element('#canvas')[0].clientWidth;
                d3Setup(height, width, '#canvas');
                d3Init();
                addNetworkToD3(ndexUtility.networks[0], {x: (width * .5), y: height/2});
                d3Go();
                modalInstance.close();
            }
        );
    };

    $scope.networkQuery.initialize = function() {
        var modalInstance = $modal.open({
            template: '<div class="modal-body text-center"><img src="img/horizontal-loader.gif"></div>',
            size: ''
        });
        // get metadata
        ndexService.getNetwork($scope.networkQuery.currentNetworkId).success(function(network) {
            console.log("got current network");
            cn = network;
            $scope.networkQuery.currentNetwork = network;
        });

        var height = angular.element('#canvas')[0].clientHeight;
        var width = angular.element('#canvas')[0].clientWidth;
        d3Setup(height, width, '#canvas');
        d3Init();

        var blockSize = 250;
        var skipBlocks = 0;

        // get a chunk of the the network
        ndexService.getNetworkByEdges($scope.networkQuery.currentNetworkId, skipBlocks, blockSize).success(function(network){
            $scope.networkQuery.currentSubnetwork = network;
            console.log("set network");
            $scope.networkQuery.selectedEdges = network.edges;
            csn = network;
            $scope.networkQuery.message = "showing network '" + network.name + "'";

            console.log('D3 Network rendering start...');

            $scope.networkQuery.graphData = createD3Json(network);

            //console.log(ndexUtility.networks[0].nodeCount);
            addNetworkToD3(ndexUtility.networks[0], {x: (width * .5), y: height/2});
            d3Go();
            //d3Render($scope.networkQuery.graphData);
            modalInstance.close();
        });
    };

    //

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


