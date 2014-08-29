//angularjs suggested function closure
(function () {

    var uiServiceApp = angular.module('uiServiceApp', []);

    uiServiceApp.factory('ndexNavigation',
        ['sharedProperties', '$location', '$modal',
            function (sharedProperties, $location, $modal) {
                var factory = {};

                /*-----------------------------------------------------------------------*
                 * navigation
                 *-----------------------------------------------------------------------*/

                factory.setAndDisplayCurrentNetwork = function (networkId) {
                    console.log("attempting to set and display current network: " + networkId);
                    sharedProperties.setCurrentNetworkId(networkId);
                    $location.path("/networkQuery/" + networkId);
                };

                factory.setAndDisplayCurrentGroup = function (groupId) {
                    console.log("attempting to set and display current group " + groupId);
                    sharedProperties.setCurrentGroupId(groupId);
                    $location.path("/group/" + groupId);
                };

                factory.setAndDisplayCurrentUser = function (userId) {
                    console.log("attempting to set and display current user " + userId);
                    sharedProperties.setCurrentUserId(userId);
                    $location.path("/user/" + userId);
                };

                factory.openConfirmationModal = function(message, confirmHandler){
                    console.log("attempting to open confirmationModal");
                    var ConfirmCtrl = function($scope, $modalInstance) {
                        $scope.input = {};
                        $scope.message = message;
                        $scope.confirm = function(){
                            $modalInstance.dismiss();
                            confirmHandler();
                        }

                        $scope.cancel = function(){
                            $modalInstance.dismiss();
                        };
                    };

                    $modal.open({
                        templateUrl: 'pages/confirmationModal.html',
                        controller: ConfirmCtrl
                    })
                };

                // return factory object
                return factory;
            }]);

    //----------------------------------------------------
    //                  Attributes
    
    // First shot at directives, using a service to invoke modals presents unknown problems
    uiServiceApp.directive('triggerCreateGroupModal', function() {
        return {
            scope: {},
            restrict: 'A',
            templateUrl: 'pages/directives/createGroupModal.html',
            controller: function($scope, $attrs, $modal, $location, ndexService) {
                var modalInstance;

                $scope.group = {};
                $scope.text = $attrs.triggerCreateGroupModal;

                $scope.openMe = function() {
                   modalInstance = $modal.open({
                        templateUrl: 'modal.html',
                        scope: $scope
                    });
                };
                
                $scope.cancel = function() {
                    modalInstance.dismiss();
                };

                $scope.submit = function() {
                    ndexService.createGroup($scope.group,
                        function(groupData){
                            modalInstance.close();
                            console.log(groupData);
                            $location.path('/group/'+groupData.externalId);
                        },
                        function(error){
                            // do some error handling
                        });
                };
            }
        }
    });

    //----------------------------------------------------
    //              Elements

    uiServiceApp.directive('ndexAccountImage', function() {
        return {
            scope: {
                ndexSrc:'=',
                ndexClass: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/accountImage.html',
            link: function($attrs) {
                if ($attrs.ndexSrc == null) $attrs.ndexSrc = 'img/no-pic.jpg';
            } 
        }
    });

    uiServiceApp.directive('ndexNavigation', function(){
        return {
            scope: {
                ndexUrl: '=',
                ndexClass: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/ndexNavigation.html',
            transclude: true,
            controller: function($scope, $location) {
                $scope.location = $location;
            }
        }
    });

    // edit user profile modal
    //      - ndexData takes a user object as a param
    //      - redirects to user page
    uiServiceApp.directive('editUserModal', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/editUserModal.html',
            transclude: true,
            controller: function($scope, $modal, $location, ndexService, $route) {
                var modalInstance;
                $scope.errors = null;

                $scope.openMe = function() {
                   modalInstance = $modal.open({
                        templateUrl: 'edit-user-modal.html',
                        scope: $scope
                    });
                };
                
                $scope.cancel = function() {
                    for(var key in $scope.ndexData) {
                        $scope.user[key] = $scope.ndexData[key];
                    }
                   modalInstance.close();
                   modalInstance = null;
                };

                $scope.submit = function() {
                    ndexService.editUserProfile($scope.user,
                        function(userData){
                            $scope.user = {};
                            modalInstance.close();
                            $route.reload();
                            $location.path('/user/'+userData.externalId);
                        },
                        function(error){
                            $scope.errors = error;
                        });
                };

                // ndexData is undefined at first pass. This seems to be a common problem
                // most likey we aren't doing something the angular way, quick fix below
                $scope.$watch('ndexData', function(value) {
                    $scope.user = {};
                    // Only want copy of object.
                    // Can acheive one way binding using '@' in the scope
                    // but then we have to do JSON.parse(JSON.stringify(value)) on it. 
                    // and use {{value}} in invoking html. 
                    for(var key in value) {
                        $scope.user[key] = value[key];
                    }             
                });
            }
        }
    });

    // edit group profiel modal
    //      - ndexData takes a group object as a param
    //      - redirects to group page
    uiServiceApp.directive('editGroupModal', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/editGroupModal.html',
            transclude: true,
            controller: function($scope, $attrs, $modal, $location, ndexService, $route) {
                var modalInstance;
                $scope.errors = null;
                $scope.openMe = function() {
                   modalInstance = $modal.open({
                        templateUrl: 'edit-group-modal.html',
                        scope: $scope
                    });
                };
                
                $scope.cancel = function() {
                    for(var key in $scope.ndexData) {
                        $scope.group[key] = $scope.ndexData[key];
                    }
                   modalInstance.close();
                   modalInstance = null;
                };

                $scope.submit = function() {
                    ndexService.editGroupProfile($scope.group,
                        function(group){
                            $scope.group = {};
                            modalInstance.close();
                            $route.reload();
                            $location.path('/group/'+group.externalId);
                        },
                        function(error){
                            $scope.errors = error;
                        });
                };
                // ndexData is undefined at first pass. This seems to be a common problem
                // most likey we aren't doing something the angular way, quick fix below
                $scope.$watch('ndexData', function(value) {
                    $scope.group = {};
                    // Only want copy of object.
                    // Can acheive one way binding using '@' in the scope
                    // but then we have to do JSON.parse(JSON.stringify(value)) on it. 
                    // and use {{value}} in invoking html. 
                    for(var key in value) {
                        $scope.group[key] = value[key];
                    }  
                }); 
            }
        }
    });

    // invite members modal
    //      -ndexData takes a group external id as a param
    uiServiceApp.directive('inviteMembersModal', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/invite-members.html',
            transclude: true,
            controller: function($scope, $attrs, $modal, $location, ndexService, $route) {
                var modalInstance;
                $scope.errors = null;
                $scope.query = {};

                $scope.openMe = function() {
                   modalInstance = $modal.open({
                        templateUrl: 'invite-members-modal.html',
                        scope: $scope
                    });
                };
                
                $scope.close = function() {
                   $scope.externalId = $scope.ndexData;
                   $route.reload();
                   modalInstance.close();
                   modalInstance = null;
                };

                $scope.addUser = function(externalId) {
                    var membership = {
                        resourceUUID: $scope.externalId,
                        permissions: 'MEMBER',
                        memberUUID: externalId
                    }

                    ndexService.updateGroupMember(membership, 
                        function(){
                            //TODO
                        },
                        function(){
                            //TODO
                        })
                };

                $scope.$watch('query', function(query) {
                    if(query.searchString !=null) {
                        if(query.searchString.length > 0) {
                            ndexService.searchUsers(query, 0, 5,
                                function (users) {
                                    console.log('got '+users.length+' user search results')
                                    var key = 0;
                                    var length = users.length;

                                    for(; key < length; key++){
                                        //closure allows us to keep current val of iteration in async callback;
                                        (function() {
                                            var val = key;
                                            ndexService.getMembership($scope.externalId, users[val].externalId,
                                                function(membership) {
                                                    if(membership.resourceName)
                                                        users[val].showMe = false
                                                    else
                                                        users[val].showMe = true;

                                                    $scope.userSearchResults = users;
                                                },
                                                function(error) {
                                                    // TODO
                                                });
                                        })()
                                    }

                                },
                                function (error) {
                                    // TODO 
                                });
                        } else {
                            $scope.userSearchResults = [];
                        }
                        
                    }
                }, true)

                // ndexData is undefined at first pass. This seems to be a common problem
                // most likey we aren't doing something the angular way, quick fix below
                $scope.$watch('ndexData', function(value) {
                    $scope.externalId = value;
                }); 
            }
        }
    });

    uiServiceApp.directive('sentRequest', function() {
        return {
            scope: {
                ndexData:'='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/sentRequest.html',
            controller: function($scope, $modal, $route, ndexService) {
                var modalInstance;
                $scope.errors = null;

                $scope.openMe = function() {
                   modalInstance = $modal.open({
                        templateUrl: 'sent-request-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function() {
                    modalInstance.close();
                }

                $scope.delete = function() {
                    ndexService.deleteRequest($scope.request.externalId,
                        function(data) {
                            modalInstance.close();
                            $route.reload();
                        }, 
                        function(error){
                            //TODO
                        })
                }

                $scope.$watch('ndexData', function(value) {
                    $scope.request = {};
                    for(var key in value) {
                        $scope.request[key] = value[key];
                    }  
                }); 
            }
        }
    });

    uiServiceApp.directive('receivedRequest', function() {
        return {
            scope: {
                ndexData:'='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/receivedRequest.html',
            controller: function($scope, $modal, $route, ndexService) {
                var modalInstance;
                $scope.errors = null;

                $scope.openMe = function() {
                   modalInstance = $modal.open({
                        templateUrl: 'received-request-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function() {
                    for(var key in $scope.ndexData) {
                        $scope.request[key] = $scope.ndexData[key];
                    } 
                    modalInstance.close();
                };

                $scope.accept = function() {

                    var membership = {
                        resourceUUID: $scope.request.destinationUUID,
                        permissions: $scope.request.permission,
                        memberUUID: $scope.request.sourceUUID
                    }

                    if($scope.request.permission == 'MEMBER' || $scope.request.permission == 'GROUPADMIN') {
                        
                        ndexService.updateGroupMember(membership, 
                            function(data){
                                
                                $scope.request.response = 'ACCEPTED'
                                ndexService.updateRequest($scope.ndexData.externalId, $scope.request, 
                                    function(data) {
                                        console.log($scope.request)
                                        modalInstance.close();
                                        $route.reload();
                                    },
                                    function(error){
                                        //TODO
                                    });
                            },
                            function(error){
                                //TODO
                            });
                    } else {
                        ndexService.updateNetworkMember(membership,
                            function(data){
                                //TODO
                                $scope.request.response = 'ACCEPTED'
                                ndexService.updateRequest($scope.ndexData.externalId, $scope.request, 
                                    function(data) {
                                        modalInstance.close();
                                        $route.reload();
                                    },
                                    function(error){
                                        //TODO
                                    });
                            },
                            function(error){
                                //TODO
                            });
                    }

                };

                $scope.decline = function() {
                    $scope.request.response = 'DECLINED'
                    ndexService.updateRequest($scope.ndexData.externalId, $scope.request, 
                        function(data) {
                            modalInstance.close();
                            $route.reload();
                        },
                        function(error){
                            //TODO
                        })
                }

                $scope.$watch('ndexData', function(value) {
                    $scope.request = {};
                    for(var key in value) {
                        $scope.request[key] = value[key];
                    }  
                }); 
            }
        }
    });

    uiServiceApp.directive('createRequestGroup', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/createRequestGroup.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility) {
                var modalInstance;
                $scope.errors = null;
                $scope.request = {};
                $scope.permissionLabel ='Is Member';

                $scope.openMe = function() {
                   modalInstance = $modal.open({
                        templateUrl: 'create-request-group-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function() {
                    $scope.request = {};
                    for(var key in $scope.ndexData) {
                        $scope.request.destinationName = $scope.ndexData.accountName;
                        $scope.request.destinationUUID = $scope.ndexData.externalId;
                        $scope.permissionLabel ='Is member';
                    } 
                    modalInstance.close();
                };
                
                $scope.submitRequest = function() {
                    if($scope.permissionLabel == 'Is member')
                        $scope.request.permission = 'MEMBER'
                    else
                        $scope.request.permission = 'GROUPADMIN'

                    $scope.request.sourceName = ndexUtility.getLoggedInUserAccountName();
                    $scope.request.sourceUUID = ndexUtility.getLoggedInUserExternalId();

                    ndexService.createRequest($scope.request, 
                        function(request) {
                          //TODO some modal
                          $scope.close();
                        },
                        function(error){
                          //TODO
                          console.log('failed to send request');
                        });
                }

                $scope.$watch('ndexData', function(value) {
                    $scope.request = {};
                    $scope.request.destinationName = $scope.ndexData.accountName;
                    $scope.request.destinationUUID = $scope.ndexData.externalId;
                    $scope.permissionLabel ='Is member'; 
                }); 
            }
        }
    });

    uiServiceApp.directive('createRequestNetwork', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/createRequestNetwork.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility) {
                var modalInstance;
                $scope.errors = null;
                $scope.request = {};
                $scope.modal = {};
                $scope.accounts = [];

                $scope.openMe = function() {
                intialize();
                   modalInstance = $modal.open({
                        templateUrl: 'create-request-network-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function() {
                    
                    modalInstance.close();
                };
                
                $scope.submitRequest = function() {

                    if($scope.modal.permissionLabel == 'Can edit')
                        $scope.request.permission = 'WRITE';
                    if($scope.modal.permissionLabel == 'Is admin')
                        $scope.request.permission = 'ADMIN';
                    if($scope.modal.permissionLabel == 'Can read')
                        $scope.request.permission = 'READ';

                    var length = $scope.accounts.length;
                    for(var ii=0; ii<length; ii++) {
                        if($scope.accounts[ii].accountName == $scope.request.sourceName)
                            $scope.request.sourceUUID = $scope.accounts[ii].externalId;
                    }

                    ndexService.createRequest($scope.request, 
                        function(request) {
                          //TODO some modal
                          $scope.close();
                        },
                        function(error){
                          //TODO
                          console.log('failed to send request');
                        });
                }

                $scope.$watch('ndexData', function(value) {
                    $scope.request.destinationName = $scope.ndexData.name;
                    $scope.request.destinationUUID = $scope.ndexData.externalId;
                }); 


                var intialize = function() {
                    $scope.accounts = [];

                    $scope.modal.permissionLabel ='Can edit';

                    $scope.request.destinationName = $scope.ndexData.name;
                    $scope.request.destinationUUID = $scope.ndexData.externalId;

                    $scope.request.sourceName = ndexUtility.getLoggedInUserAccountName();
                    $scope.request.sourceUUID = ndexUtility.getLoggedInUserExternalId();

                    var query = {};

                    query.accountName = ndexUtility.getLoggedInUserAccountName();
                    query.permission = 'GROUPADMIN';
                    
                    // TODO 0,50 shouldnt be a set number
                    ndexService.searchGroups(query, 0, 50,
                        function (groups) {
                            var length = groups.length;
                            for(var ii=0; ii < length; ii++) {
                                $scope.accounts.push(groups[ii]);
                            }
                            $scope.accounts.push({
                                accountName: ndexUtility.getLoggedInUserAccountName(),
                                externalId: ndexUtility.getLoggedInUserExternalId()
                            });
                        },
                        function (error) {
                                   
                        });
                }

            }
        }
    });

    uiServiceApp.directive('createExportNetworkTask', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/createExportNetworkTask.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility) {
                var modalInstance;
                $scope.errors = null;
                $scope.modal = {};

                $scope.openMe = function() {
                    intialize();
                    modalInstance = $modal.open({
                        templateUrl: 'create-export-network-task-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function() {
                    
                    modalInstance.close();
                };
                
                $scope.createTask = function() {
                    var task = {
                        description: 'network export',
                        priority: 'MEDIUM',
                        format: 'XBEL',
                        taskType: 'EXPORT_NETWORK_TO_FILE',
                        status: 'QUEUED',
                        progress: 0,
                        resource: $scope.externalId
                    }
                    
                    ndexService.createTask(task, 
                        function(data) {
                            console.log(data);
                            modalInstance.close();
                        },
                        function(error) {
                            console.log(error);
                            //TODO error handling
                        });
                }

                $scope.$watch('ndexData', function(value) {
                    $scope.externalId = $scope.ndexData.externalId;
                }); 


                var intialize = function() {
                    
                }

            }
        }
    });

}) ()