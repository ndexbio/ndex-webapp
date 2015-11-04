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

        // extract value of 'groups' from URI; URI looks something like
        // http://localhost:63342/ndex-webapp/index.html#/searchGroups?groups=Group%25203
        // NOTE: searchString can be 'undefined' in  case 'groups' name in the search portion of URI was
        // manually replaced with a non-existant value (i.e., 'abccba'); URI in this case may look like
        // http://localhost:63342/ndex-webapp/index.html#/searchGroups?abccba=Group%25203
        var searchString = decodeURIComponent($location.search().groups);

        // if no 'groups' name was found in the search portion of URI (it is 'undefined'),
        // then the search string is "" (i.e., "search for all groups")
        searchController.query.searchString = (searchString.toLowerCase() === 'undefined') ? "" : searchString;

        // set $scope.main.searchString to searchController.query.searchString; - this ensures that $scope.main.searchString
        // stays the same (doesn't get reset) in the search window in case of page reload (F5);
        // $scope.main.searchString is "" (empty string) in case searchString is 'undefined'
        $scope.main.searchString = searchController.query.searchString;

        searchController.submitGroupSearch();
}]);
