ndexApp.controller('groupController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams', '$modal',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams, $modal) {

            $scope.group = {};
            $scope.group.isAdmin = false;
            
            $scope.group.identifier = $routeParams.identifier;


            // called on Networks belonging to group displayed on page
            $scope.group.setAndDisplayCurrentNetwork = function (identifier) {
                $location.path("/networkQuery/" + identifier);
            };


            //          GROUPS

            // initializations
            $scope.group.userSearchAdmin = false; // this state needs to be saved to avoid browser refresh
            $scope.group.userSearchMember = false;
            // declarations
            $scope.group.submitUserSearch = function() {
                  $scope.group.userSearchResults = null;

                  var query = {};

                  query.accountName = $scope.group.displayedGroup.accountName;
                  query.searchString = $scope.group.memberSearchString
                  if($scope.group.userSearchAdmin) query.permission = 'GROUPADMIN';
                  if($scope.group.userSearchMember) query.permission = 'MEMBER'
                          
                  //pagination missing
                  ndexService.searchUsers(query, 0, 50,
                        function (users) {
                              // Save the results
                              $scope.group.userSearchResults = users;
                                  
                        },
                        function (error) {
                                         
                        });
            };

            // initializations

            ndexService.getGroup($scope.group.identifier,
                function (group) {
                    //console.log("Set displayedUser");
                    $scope.group.displayedGroup = group;
                    cGroup = group;

                    ndexService.getMyMembership(group.externalId, 
                        function(membership) {
                              if(membership.permissions != null)
                                    $scope.group.isAdmin = true;
                        },
                        function(error){
                              console.log(error);
                        });

                    $scope.group.submitUserSearch();

                    $scope.group.networkSearchResults = null;
                    $scope.group.searchString = "";

                    /*ndexService.findNetworks($scope.group.searchString, $scope.group.displayedGroup.accountName, 'ADMIN', 0, 50)
                        .success(
                        function (networks) {
                            $scope.user.networkSearchResults = networks;
                            console.log("Setting networkSearchResults");
                            //console.log("first network name = " + networks[0].name);
                            //$scope.user.message = "first network name = " + networks[0].name;
                            modalInstance.close();
                        });*/

                });

            //------------------------------------------------------------------------------------//

        }]);
