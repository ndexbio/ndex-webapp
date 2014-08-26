ndexApp.controller('groupController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams', '$modal',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams, $modal) {

            $scope.groupController = {};
            var groupController = $scope.groupController;
            groupController.isAdmin = false;
            
            groupController.identifier = $routeParams.identifier;


            // called on Networks belonging to group displayed on page
            groupController.setAndDisplayCurrentNetwork = function (identifier) {
                $location.path("/networkQuery/" + identifier);
            };


            //          Members

            // initializations
            groupController.userSearchAdmin = false; // this state needs to be saved to avoid browser refresh
            groupController.userSearchMember = false;
            // declarations
            groupController.submitUserSearch = function() {
                  groupController.userSearchResults = null;

                  var query = {};

                  query.accountName = groupController.displayedGroup.accountName;
                  query.searchString = groupController.memberSearchString
                  if(groupController.userSearchAdmin) query.permission = 'GROUPADMIN';
                  if(groupController.userSearchMember) query.permission = 'MEMBER'
                          
                  //pagination missing
                  ndexService.searchUsers(query, 0, 50,
                        function (users) {
                              // Save the results
                              groupController.userSearchResults = users;
                                  
                        },
                        function (error) {
                                         
                        });
            };

            groupController.submitRequest = function() {
                  var request = {
                    destinationUUID: groupController.displayedGroup.externalId,
                    destinationName: groupController.displayedGroup.organizationName,
                    permission: 'MEMBER'
                  }

                  ndexService.createRequest(request, 
                    function(request) {
                      //TODO some modal
                      console.log('request sent');
                    },
                    function(error){
                      //TODO
                      console.log('failed to send request');
                    })
            }

            // initializations

            ndexService.getGroup(groupController.identifier,
                function (group) {
                    //console.log("Set displayedUser");
                    groupController.displayedGroup = group;
                    cGroup = group;

                    ndexService.getMyMembership(group.externalId, 
                        function(membership) {
                              if(membership.permissions != null)
                                    groupController.isAdmin = true;
                        },
                        function(error){
                              console.log(error);
                        });

                    groupController.submitUserSearch();

                    groupController.networkSearchResults = null;
                    groupController.searchString = "";

                    /*ndexService.findNetworks(groupController.searchString, groupController.displayedGroup.accountName, 'ADMIN', 0, 50)
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
