ndexApp.controller('networkQueryController', function (ndexService, $scope, $http, sharedProperties) {
    controller = this;

    controller.activeTab = 'edges';

    controller.isTabSet = function(div) {
        console.log("click2");
        return controller.activeTab === div;
    };

    controller.setTab = function(div) {
        console.log("click");
        controller.activeTab = div;
    };


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
        d3Init();
        $http(networkQueryConfig)
            .success(function (network) {
                NdexClient.updateNodeLabels($scope.nodeLabels, network);
                NdexClient.setNetwork(network);
                console.log("got query results for : " + $scope.searchString);
                csn = network;
                $scope.currentSubnetwork = network;
                $scope.graphData = createD3Json(network);

                addNetworkToD3(NdexClient.networks[0], {x: (width * .5), y: height/2});
                d3Go();
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
    d3Init();

    var blockSize = 250;
    var skipBlocks = 0;
    var config = NdexClient.getNetworkQueryByEdgesConfig($scope.currentNetworkId, skipBlocks, blockSize);
    $http(config)
        .success(function (network) {
            NdexClient.updateNodeLabels($scope.nodeLabels, network);
            $scope.currentSubnetwork = network;
            NdexClient.setNetwork(network);
            console.log("set network");
            $scope.selectedEdges = network.edges;
            csn = network;
            $scope.message = "showing network '" + network.name + "'";


            console.log('D3 Network rendering start...');

            //$scope.graphData = createD3Json(network);
            addNetworkToD3(NdexClient.networks[0], {x: (width * .5), y: height/2});
            d3Go();
            //d3Render($scope.graphData);

        });

});


