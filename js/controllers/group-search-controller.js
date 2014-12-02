ndexApp.controller('searchGroupsController', [ 'ndexService', 'sharedProperties', '$scope',  
    function (ndexService, sharedProperties, $scope) {
    
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

        //quick implementation for navbar search support
       if(sharedProperties.doSearch()) {
            searchController.query.searchString = sharedProperties.getSearchString();
            searchController.submitGroupSearch();
        }


}]);
