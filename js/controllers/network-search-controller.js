ndexApp.controller('searchNetworksController', [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal', function (ndexService, sharedProperties, $scope, $location, $modal) {

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
    };

    $scope.networkSearch.submitNetworkSearch = function () {

        // An array to hold our errors. ng-show and ng-hide relay on the length to toggle content.
        $scope.networkSearch.errors = [];

        // We want to hold on to the request for the subnetwork query. The request contains the .abort method.
        // This way, we can call the method midstream and cancel the AJAX call.
        var request = null;

        // AngularUi modal service use. queryContent.html is reused across this controller. It is located in our
        // networkQuery.html page. We pass this controllers scope and do not allow close by clicking outside of the modal.
        var modalInstance = $modal.open({
            templateUrl: 'searchContent.html',
            scope: $scope,
            backdrop: 'static'
        });

        // cancel
        // Close the modal and abort the AJAX request.
        $scope.networkSearch.cancel = function () {
            modalInstance.close();
            request.abort();
        };

        (request = ndexService.findNetworks($scope.networkSearch.searchString, null, null, 0, 50) )
            .success(
            function (networks) {
                // Save the results
                $scope.networkSearch.networkSearchResults = networks;
                console.log("Set networkSearchResults");
                //console.log("first network name = " + networks[0].name);
                //$scope.networkSearch.message = "first network name = " + networks[0].name;
                modalInstance.close();
            }
        )
            .error(
            function (error) {
                // Save the error.
                if (error) {
                    $scope.networkSearch.networkSearchResults == null;
                    $scope.networkSearch.errors.push({label: "Http request error", error: error});

                    // close the modal.
                    modalInstance.close();

                }
            }
        )

    };
}
])
;

