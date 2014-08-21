
ndexApp.controller('searchUsersController', [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal', 
    function (ndexService, sharedProperties, $scope, $location, $modal) {
    
        $scope.userSearch = {};
        $scope.userSearch.query = {};
        $scope.userSearch.userSearchResults = [];

        $scope.userSearch.displayUser = function (userId) {
           // sharedProperties.setCurrentNetworkId(userId);
            $location.path("/user/" + userId);
        };

        $scope.userSearch.submitUserSearch = function () {
            
            // AngularUi modal service use. queryContent.html is reused across this controller. It is located in our
            // network.html page. We pass this controllers scope and do not allow close by clicking outside of the modal.
            var modalInstance = $modal.open({
                templateUrl: 'searchContent.html',
                scope: $scope,
                backdrop: 'static'
            });

            ndexService.searchUsers($scope.userSearch.query, 0, 50,
                function (users) {
                    // Save the results
                    $scope.userSearch.userSearchResults = users;
                    console.log("Set userSearchResults");
                    modalInstance.close();
                },
                function (error) {
                        modalInstance.close();
                });
        };

        $scope.userSearch.getImage = function(user) {
            if(user.image == null){
                return 'img/no-pic.jpg'
            }
            else
                return user.image;
        }

        //quick implementation for navbar search support
       if(sharedProperties.doSearch()) {
            $scope.userSearch.query.searchString = sharedProperties.getSearchString();
            $scope.userSearch.submitUserSearch();
        }


}]);
