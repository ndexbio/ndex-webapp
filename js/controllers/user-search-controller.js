
ndexApp.controller('searchUsersController', [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal', 
    function (ndexService, sharedProperties, $scope, $location, $modal) {
    
        //              Controller Declarations/Initializations
        //---------------------------------------------------------------------
        $scope.userSearch = {};

        var searchController = $scope.userSearch = {};
        searchController.query = {};
        searchController.userSearchResults = [];
        searchController.errors = [];
        searchController.skip = 0;
        searchController.skipSize = 15;
        
        searchController.submitUserSearch = function () {
            
            ndexService.searchUsers(searchController.query, searchController.skip, searchController.skipSize,
                function (users) {
                    if(users.length == 0)
                        searchController.errors.push('No results found that match your criteria')
                    searchController.userSearchResults = users;
                    console.log("Set userSearchResults");
                    
                },
                function (error) {
                    searchController.errors.push(error.data);
                });
        };


        //              Initializations
        //---------------------------------------------------------------------
        //quick implementation for navbar search support
       if(sharedProperties.doSearch()) {
            searchController.query.searchString = sharedProperties.getSearchString();
            searchController.submitUserSearch();
        }


}]);
