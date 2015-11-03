
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
                    //console.log("Set userSearchResults");
                    
                },
                function (error) {
                    searchController.errors.push(error.data);
                });
        };

        // extract value of 'users' from URL; URL looks something like
        // http://localhost:63342/ndex-webapp/index.html#/searchUsers?users=vrynkov
        var searchString = decodeURIComponent($location.search().users);

        // if no 'users' was found in URL, then the search string is "" (i.e., "search for all users")
        searchController.query.searchString = (searchString === 'undefined' ) ? "" : searchString;

        // set $scope.main.searchString to searchString - this ensures that $scope.main.searchString
        // stays the same (doesn't get reset) in case of page reload (F5)

        $scope.main.searchString = searchString;

        searchController.submitUserSearch();
}]);
