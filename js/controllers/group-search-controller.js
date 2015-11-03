ndexApp.controller('searchGroupsController', [ 'ndexService', 'sharedProperties', '$scope',  '$location',
    function (ndexService, sharedProperties, $scope, $location) {
    
        //              Controller Declarations/Initializations
        //---------------------------------------------------------------------
        $scope.groupSearch = {};
        var searchController = $scope.groupSearch;

        searchController.query = {};
        searchController.groupSearchResults = [];
        searchController.errors = [];
        searchController.skip = 0;
        searchController.skipSize = 15;

        searchController.submitGroupSearch = function () {

            ndexService.searchGroups(searchController.query, searchController.skip, searchController.skipSize,
                function (groups) {

                    if(groups.length == 0)
                        searchController.errors.push('No results found that match your criteria')

                    searchController.groupSearchResults = groups;
                    //console.log("Set groupSearchResults");
                    
                },
                function (error) {
                    searchController.errors.push(error.data);
                });
        };

        // extract value of 'groups' from URL; URL looks something like
        // http://localhost:63342/ndex-webapp/index.html#/searchGroups?groups=Group%25203
        var searchString = decodeURIComponent($location.search().groups);

        // if no 'groups' was found in URL, then the search string is "" (i.e., "search for all groups")
        searchController.query.searchString = (searchString === 'undefined' ) ? "" : searchString;

        // set $scope.main.searchString to searchString - this ensures that $scope.main.searchString
        // stays the same (doesn't get reset) in case of page reload (F5)
        $scope.main.searchString = searchString;

        searchController.submitGroupSearch();

}]);
