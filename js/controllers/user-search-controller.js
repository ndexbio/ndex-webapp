
ndexApp.controller('searchUsersController', [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal', 
    function (ndexService, sharedProperties, $scope, $location, $modal) {
    
        $scope.userSearch = {};
        $scope.userSearch.query = {};
        $scope.userSearch.userSearchResults = [];
        
        $scope.userSearch.submitUserSearch = function () {
            
            ndexService.searchUsers($scope.userSearch.query, 0, 50,
                function (users) {
                    // Save the results
                    $scope.userSearch.userSearchResults = users;
                    console.log("Set userSearchResults");
                    
                },
                function (error) {
                        
                });
        };

        //quick implementation for navbar search support
       if(sharedProperties.doSearch()) {
            $scope.userSearch.query.searchString = sharedProperties.getSearchString();
            $scope.userSearch.submitUserSearch();
        }


}]);
