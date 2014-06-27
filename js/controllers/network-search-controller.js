ndexApp.controller('searchNetworksController',function (ndexService, $scope, $http, $location, sharedProperties) {
    controller = this;
    
    /* debugging...
     $scope.networkSearchResults = [
     {name: "fake network"}
     ];
     */
    
    //controller.searchType = 'starts-with';
    controller.networkSearchResults = null;

    controller.setAndDisplayCurrentNetwork = function (networkId) {
        //sharedProperties.setCurrentNetworkId(networkId);
        $location.path("/networkQuery/" + networkId);
    }
    
    controller.submitNetworkSearch = function () {
        ndexService.findNetworks(controller.searchString).success(function (networks) {
            controller.networkSearchResults = networks;
            console.log("Set networkSearchResults");
            console.log("first network name = " + networks[0].name);
            controller.message = "first network name = " + networks[0].name;
        });
    }
});

