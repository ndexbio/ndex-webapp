ndexApp.controller('searchNetworksController', 
    [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal', 
        function (ndexService, sharedProperties, $scope, $location, $modal) {


    //              Controller Declarations/Initializations
    //---------------------------------------------------------------------
    $scope.networkSearch = {};
    var searchController = $scope.networkSearch;

    searchController.errors = [];
    searchController.networkSearchResults = [];
    searchController.skip = 0;
    searchController.skipSize = 30;

    searchController.setAndDisplayCurrentNetwork = function (networkId) {
        $location.path("/network/" + networkId);
    };


    searchController.submitNetworkSearch = function () {

        // We want to hold on to the request for the subnetwork query. The request contains the .abort method.
        // This way, we can call the method midstream and cancel the AJAX call.
        var request = null;

        // AngularUi modal service use. queryContent.html is reused across this controller. It is located in our
        // network.html page. We pass this controllers scope and do not allow close by clicking outside of the modal.
        var modalInstance = $modal.open({
            templateUrl: 'searchContent.html',
            scope: $scope,
            backdrop: 'static'
        });

        // Close the modal and abort the AJAX request.
        searchController.cancel = function () {
            modalInstance.close();
            request.abort();
        };

        (request = ndexService.findNetworks(searchController.searchString, 
                                            searchController.accountName, 
                                            searchController.permission,
                                            searchController.includeGroups,
                                            searchController.skip,
                                            searchController.skipSize) )
            .success(
            function (networks) {
                if(networks.length == 0)
                    searchController.errors.push('No results found that match your criteria')

                console.log('got results')
                // Save the results
                searchController.networkSearchResults = networks;
                modalInstance.close();
            })
            .error(
            function (error, data) {
                // Save the error.
                if (error) {
                    searchController.networkSearchResults = [];
                    searchController.errors.push(error);

                    // close the modal.
                    modalInstance.close();

                }
            })

    };


    //                  Initializations
    //-----------------------------------------------------------------

    //quick implementation for navbar search support
    if(sharedProperties.doSearch()) {
        searchController.searchString = sharedProperties.getSearchString();
        searchController.submitNetworkSearch();
    }


}]);

