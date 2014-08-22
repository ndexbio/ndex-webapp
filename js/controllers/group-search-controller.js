ndexApp.controller('searchGroupsController', [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal', 
    function (ndexService, sharedProperties, $scope, $location, $modal) {
    
        $scope.groupSearch = {};
        $scope.groupSearch.query = {};
        $scope.groupSearch.groupSearchResults = [];

        $scope.groupSearch.submitgroupSearch = function () {

            ndexService.searchGroups($scope.groupSearch.query, 0, 50,
                function (groups) {
                    // Save the results
                    $scope.groupSearch.groupSearchResults = groups;
                    console.log("Set groupSearchResults");
                    
                },
                function (error) {
                       
                });
        };

        //quick implementation for navbar search support
       if(sharedProperties.doSearch()) {
            $scope.groupSearch.query.searchString = sharedProperties.getSearchString();
            $scope.groupSearch.submitgroupSearch();
        }


}]);
