ndexApp.controller('searchNetworksController',[ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal', function (ndexService, sharedProperties, $scope, $location, $modal) {

    $scope.networkSearch = {};
    /* debugging...
     $scope.networkSearchResults = [
     {name: "fake network"}
     ];
     */

    $scope.networkSearch.networkSearchResults = null;

    $scope.networkSearch.setAndDisplayCurrentNetwork = function (networkId) {
        sharedProperties.setCurrentNetworkId(networkId);
        $location.path("/networkQuery/" + networkId);
    }

    $scope.networkSearch.submitNetworkSearch = function () {
        var modalInstance = $modal.open({
            template: '<div class="modal-body text-center"><img src="img/horizontal-loader.gif"></div>',
            size: ''
        });
        ndexService.findNetworks($scope.networkSearch.searchString).success(function(networks) {
            $scope.networkSearch.networkSearchResults = networks;
            console.log("Set networkSearchResults");
            //console.log("first network name = " + networks[0].name);
            //$scope.networkSearch.message = "first network name = " + networks[0].name;
            modalInstance.close();
        }).error(function(error){
            modalInstance.close();
        });
    }
}]);

