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

