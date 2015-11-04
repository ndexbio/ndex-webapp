
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

        // extract value of 'users' from URI; URI looks something like
        // http://localhost:63342/ndex-webapp/index.html#/searchUsers?users=vrynkov
        // NOTE: searchString can be 'undefined' in  case 'users' name in the search portion of URI was
        // manually replaced with a non-existant value (i.e., 'abccba'); URI in this case may look like
        // http://localhost:63342/ndex-webapp/index.html#/searchUsers?abccba=vrynkov
        var searchString = decodeURIComponent($location.search().users);

        // if no 'users' name was found in the search portion of URI (it is 'undefined'),
        // then the search string is "" (i.e., "search for all users")
        searchController.query.searchString = (searchString.toLowerCase() === 'undefined') ? "" : searchString;

        // set $scope.main.searchString to searchController.query.searchString; - this ensures that $scope.main.searchString
        // stays the same (doesn't get reset) in the search window in case of page reload (F5);
        // $scope.main.searchString is "" (empty string) in case searchString is 'undefined'
        $scope.main.searchString = searchController.query.searchString;

        searchController.submitUserSearch();
}]);
