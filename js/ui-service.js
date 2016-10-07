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
                    ////console.log("attempting to set and display current network: " + networkId);
                    sharedProperties.setCurrentNetworkId(networkId);
                    $location.path("/networkQuery/" + networkId);
                };

                factory.setAndDisplayCurrentGroup = function (groupId) {
                    ////console.log("attempting to set and display current group " + groupId);
                    sharedProperties.setCurrentGroupId(groupId);
                    $location.path("/group/" + groupId);
                };

                factory.setAndDisplayCurrentUser = function (userId) {
                    ////console.log("attempting to set and display current user " + userId);
                    sharedProperties.setCurrentUserId(userId);
                    $location.path("/user/" + userId);
                };

                factory.openConfirmationModal = function(message, confirmHandler){
                    ////console.log("attempting to open confirmationModal");
                    var ConfirmCtrl = function($scope, $modalInstance) {
                        $scope.input = {};
                        $scope.message = message;
                        $scope.confirm = function(){
                            $modalInstance.dismiss();
                            confirmHandler();
                        };

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
                    delete $scope.errors;
                    $scope.group = {};
                };

                $scope.$watch("group.groupName", function() {
                    delete $scope.errors;
                });

                $scope.isProcessing = false;

                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    // when creating a new account, user enters Group name;
                    // but we also need to supply account name to the Server API --
                    // so we create account name by removing all blanks from  Group name.
                    var accountName = $scope.group.groupName.replace(/\s+/g,"");
                    $scope.group.userName = accountName;

                    ndexService.createGroup($scope.group,
                        function(groupData){
                            modalInstance.close();
                            ////console.log(groupData);
                            $location.path('/group/'+groupData.externalId);
                            $scope.isProcessing = false;
                        },
                        function(error){
                            if (error.data.errorCode == "NDEx_Duplicate_Object_Exception") {
                                $scope.errors = "Group with name " + $scope.group.groupName + " already exists.";
                            } else {
                                $scope.errors = error.data.message;
                            }
                            $scope.isProcessing = false;
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
                if (!$attrs.ndexSrc) $attrs.ndexSrc = 'img/no-pic.jpg';
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
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true
                    ndexService.editUserProfile($scope.user,
                        function(userData){
                            $scope.isProcessing = false;
                            $scope.user = {};
                            modalInstance.close();
                            $route.reload();
                            $location.path('/user/'+userData.externalId);
                        },
                        function(error){
                            $scope.isProcessing = false;
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
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;
                    ndexService.editGroupProfile($scope.group,
                        function(group){
                            $scope.group = {};
                            modalInstance.close();
                            $route.reload();
                            $location.path('/group/'+group.externalId);
                            $scope.isProcessing = false;
                        },
                        function(error){
                            $scope.errors = error;
                            $scope.isProcessing = false;
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
                                    ////console.log('got '+users.length+' user search results')
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

    // modal to present error message describing why the task failed
    uiServiceApp.directive('showTaskFailureInfo', function() {
        return {
            scope: {
                ndexData:'='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/informationModal.html',
            controller: function($scope, $modal) {
                var modalInstance;
                var task = $scope.ndexData;

                $scope.errors = null;
                $scope.message = task.message;
                $scope.title = task.description + " " + task.status;

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'information-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.cancel = function () {
                    modalInstance.close();
                };
            }
        }
    });

    // modal to view request sent by user
    uiServiceApp.directive('sentRequest', function() {
        return {
            scope: {
                ndexData:'=',
                userController:'='
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

                            var userController = $scope.userController;
                            userController.refreshRequests();
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

    // modal to view and act on received request
    uiServiceApp.directive('receivedRequest', function() {
        return {
            scope: {
                ndexData:'=',
                userController:'='
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
                                        ////console.log($scope.request)
                                        modalInstance.close();
                                        $scope.userController.refreshRequests();
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
                                        $scope.userController.refreshRequests();
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
                            $scope.userController.refreshRequests();
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


    // modal to request access to group
    uiServiceApp.directive('createRequestGroup', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/createRequestGroup.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility) {
                $scope.openMe = function() {
                    $modal.open({
                        templateUrl: 'create-request-group-modal.html',
                        scope: $scope,
                        backdrop: 'static',
                        controller: function($scope, $modalInstance, $route, ndexService, ndexUtility) {
                            $scope.request = {};
                            $scope.request.permissionLabel ='Is member';
                            $scope.close = function() {
                                $scope.request = {};
                                for(var key in $scope.ndexData) {
                                    $scope.request.destinationName = $scope.ndexData.userName;
                                    $scope.request.destinationUUID = $scope.ndexData.externalId;
                                    $scope.request.permissionLabel ='Is member';
                                }
                                $modalInstance.close();
                            };

                            $scope.submitRequest = function() {
                                if($scope.request.permissionLabel == 'Is member')
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
                                    function(error) {
                                        if ((typeof error.data !== 'undefined') &&
                                            (typeof error.data.message !== 'undefined')) {
                                            $scope.request.error = error.data.message;
                                        } else {
                                            $scope.request.error = "Server returned HTTP error response code " +
                                                error.status;
                                        }
                                    });
                            }

                            $scope.$watch('ndexData', function(value) {
                                $scope.request = {};
                                $scope.request.destinationName = $scope.ndexData.userName;
                                $scope.request.destinationUUID = $scope.ndexData.externalId;
                                $scope.request.permissionLabel ='Is member';
                            });
                        }
                    });
                };


            }
        }
    });

    // modal to request access to network
    uiServiceApp.directive('createRequestNetwork', function() {
        return {
            scope: {
                ndexData: '=',
                privileges: '='
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
                    $scope.request = {};
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
                        if($scope.accounts[ii].userName == $scope.request.sourceName)
                            $scope.request.sourceUUID = $scope.accounts[ii].externalId;
                    }

                    ndexService.createRequest($scope.request,
                        function(request) {
                            //TODO some modal
                            $scope.close();
                        },
                        function(error) {
                            if ((typeof error.data !== 'undefined') &&
                                (typeof error.data.message !== 'undefined')) {
                                $scope.request.error = error.data.message;
                            } else {
                                $scope.request.error = "Server returned HTTP error response code " +
                                        error.status;
                            }
                        });
                };

                $scope.$watch('ndexData', function(value) {
                    $scope.request.destinationName = ($scope.ndexData && $scope.ndexData.name) ?
                        $scope.ndexData.name :
                        null;

                    $scope.request.destinationUUID = ($scope.ndexData && $scope.ndexData.externalId) ?
                        $scope.ndexData.externalId :
                        null;
                });

                //$scope.$watch('privileges', function(value) {
                //    $scope.request.privileges = $scope.privileges;
                //});


                var intialize = function() {
                    $scope.accounts = [];

                    $scope.request.destinationName = $scope.ndexData.name;
                    $scope.request.destinationUUID = $scope.ndexData.externalId;

                    $scope.request.sourceName = ndexUtility.getLoggedInUserAccountName();
                    $scope.request.sourceUUID = ndexUtility.getLoggedInUserExternalId();

                    //$scope.request.privileges = $scope.privileges;

                    $scope.modal.permissionLabel ='Can edit';
                    if( $scope.privileges == 'Edit' )
                        $scope.modal.permissionLabel ='Is admin';

                    var query = {};

                    query.userName = ndexUtility.getLoggedInUserAccountName();
                    query.permission = 'GROUPADMIN';

                    // TODO 0,50 shouldnt be a set number
                    ndexService.searchGroups(query, 0, 50,
                        function (groups) {
                            var length = groups.length;
                            for(var ii=0; ii < length; ii++) {
                                $scope.accounts.push(groups[ii]);
                            }
                            $scope.accounts.push({
                                userName: ndexUtility.getLoggedInUserAccountName(),
                                externalId: ndexUtility.getLoggedInUserExternalId()
                            });
                        },
                        function (error) {

                        });
                }

            }
        }
    });

    // modal to export network
    uiServiceApp.directive('exportNetwork', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/exportNetwork.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility)
            {
                var modalInstance;
                $scope.errors = null;
                $scope.modal = {};

                $scope.openMe = function() {
                    $scope.networkExportFormat = "CX";

                    modalInstance = $modal.open({
                        templateUrl: 'export-network-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function()
                {
                    $scope.isProcessing = false;
                    modalInstance.close();
                };

                $scope.exportNetwork = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    var networkExportFormat = $scope.networkExportFormat;
                    var networkUUIDsList = [];
                    networkUUIDsList.push($scope.externalId);

                    ndexService.exportNetwork(networkExportFormat, networkUUIDsList,
                        function(data) {
                            ///console.log(data);
                            $scope.false = true;
                            $scope.isProcessing = false;
                            modalInstance.close();
                        },
                        function(error) {
                            //console.log(error);
                            $scope.isProcessing = false;
                            modalInstance.close();
                        });
                }

                $scope.$watch('ndexData', function(value) {
                    $scope.externalId = ($scope.ndexData && $scope.ndexData.externalId) ?
                        $scope.ndexData.externalId :
                        null;

                    $scope.name = ($scope.ndexData && $scope.ndexData.name) ?
                        $scope.ndexData.name :
                        null;
                });


            }
        }
    });

    // modal to bulk export selected networks
    uiServiceApp.directive('bulkExportNetwork', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/bulkExportNetwork.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility)
            {
                var modalInstance;
                $scope.errors = null;
                $scope.modal = {};
                $scope.title = 'Export Selected Networks';

                $scope.openMe = function() {
                    $scope.networkExportFormat = "CX";

                    modalInstance = $modal.open({
                        templateUrl: 'bulk-export-network-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function()
                {
                    $scope.isProcessing = false;
                    modalInstance.close();
                };

                $scope.exportNetworks = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    // get reference to userController from user.html
                    var userController = $scope.ndexData;

                    // get IDs of networks to be exported
                    var networkUUIDsList = userController.getIDsOfSelectedNetworks();

                    var networkExportFormat = $scope.networkExportFormat;

                    ndexService.exportNetwork(networkExportFormat, networkUUIDsList,
                        function(data) {
                            ///console.log(data);
                            $scope.isProcessing = false;
                            modalInstance.close();
                        },
                        function(error) {
                            //console.log(error);
                            $scope.isProcessing = false;
                            modalInstance.close();
                        });

                }
            }
        }
    });



    // modal to edit network summary
    uiServiceApp.directive('editNetworkSummaryModal', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/editNetworkSummaryModal.html',
            transclude: true,
            controller: function($scope, $modal, ndexService, $route) {
                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                $scope.openMe = function() {

                    $scope.network.name = $scope.ndexData.name;
                    $scope.network.description = $scope.ndexData.description;
                    $scope.network.reference = $scope.ndexData.reference;
                    $scope.network.version = $scope.ndexData.version;
                    $scope.network.visibility = $scope.ndexData.visibility;

                    modalInstance = $modal.open({
                        templateUrl: 'edit-network-summary-modal.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    modalInstance.close();
                    modalInstance = null;
                    $scope.network.name = $scope.ndexData.name;
                    $scope.network.description = $scope.ndexData.description;
                    $scope.network.reference = $scope.ndexData.reference;
                    $scope.network.version = $scope.ndexData.version;
                    $scope.network.visibility = $scope.ndexData.visibility;
                };

                $scope.getIndexOfReference = function(properties) {
                    var index = properties.length;

                    for (var i = 0; i < properties.length; i++) {

                        if (properties[i].predicateString &&
                            properties[i].predicateString.toLowerCase() === 'reference') {

                            return i;
                        }
                    }

                    return index;
                };

                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    var updateReference =
                        ($scope.network.reference !== $scope.ndexData.reference) ? true : false;

                    // check if visibility was modified
                    var updateVisibility =
                        ($scope.network.visibility !== $scope.ndexData.visibility) ? true : false;

                    // check if any ob network summary fields was modified
                    var updateNetworkSummary =
                        ( ($scope.network.name !== $scope.ndexData.name) ||
                          ($scope.network.description !== $scope.ndexData.description) ||
                          ($scope.network.version !== $scope.ndexData.version)
                        )  ? true : false;


                    if (updateVisibility) {
                        ndexService.setVisibility($scope.ndexData.externalId, $scope.network.visibility,
                            function (data, networkId) {
                                $scope.ndexData.visibility = $scope.network.visibility;
                            },
                            function (error, networkId) {
                                console.log("unable to update Network Visibility for Network with Id " + networkId );
                            });
                    }

                    if (updateReference) {
                        var referenceProperty  =
                            { "predicateString" : "Reference",
                              "value"           : $scope.network.reference,
                              "dataType"        : "string",
                              "subNetworkId"    : null
                            };

                        var referenceList = [];
                        referenceList.push(referenceProperty);

                        ndexService.setNetworkProperties($scope.ndexData.externalId, referenceList,
                            function (data) {
                                $scope.ndexData.reference = $scope.network.reference;
                            },
                            function (error) {
                                console.log("unable to update Network Reference");
                            });
                    }

                    if (updateNetworkSummary) {
                        ndexService.editNetworkSummary($scope.ndexData.externalId, $scope.network,
                            function (data) {
                                $scope.ndexData.name = $scope.network.name;
                                $scope.ndexData.description = $scope.network.description;
                                $scope.ndexData.version = $scope.network.version;
                            },
                            function (error) {
                                console.log("unable to update Network Summary");
                            })
                    }

                    modalInstance.close();
                    modalInstance = null;
                    $scope.isProcessing = false;
                };
            }
        }
    });

    // modal to bulk edit networks property (description, reference, version or visibility)
    uiServiceApp.directive('bulkEditNetworkProperty', function() {
        return {
            scope: {
                ndexData: '=',
                action: '@directiveAction',
                title:  '@directiveTitle',
                text:   '@directiveDescription'
            },
            restrict: 'E',
            templateUrl: 'pages/directives/bulkEditNetworkPropertyModal.html',
            transclude: true,
            controller: function($scope, $modal, ndexService) {

                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                $scope.openMe = function() {

                    $scope.network = {};

                    // the following properties should be set to "", not to null; null
                    // doesn't work correctly in case you enter an empty bulk value -- it is
                    // replaced by string that starts with "\n" and followed by some spaces,
                    // like "\n      "
                    $scope.network.description = "";
                    $scope.network.version = "";
                    $scope.network.visibility = "";
                    $scope.network.reference = "";

                    var checkWritePrivilege = true;
                    var networksUpdateable =
                        $scope.ndexData.checkIfSelectedNetworksCanBeDeletedOrChanged(checkWritePrivilege);

                    // before updating networks, we want to make sure that all of the selected networks can be modified.
                    if (!networksUpdateable) {
                        var title = "Cannot Modify Selected Networks";
                        var message =
                            "Some selected networks could not be modified because they are either marked READ-ONLY" +
                            " or you do not have ADMIN or WRITE privileges. Please uncheck the READ-ONLY box in each network " +
                            " page, make sure you have either ADMIN or WRITE access to all selected networks, and try again.";

                        $scope.ndexData.genericInfoModal(title, message);

                        return;
                    }

                    modalInstance = $modal.open({
                        templateUrl: 'bulk-edit-network-property-modal.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    modalInstance.close();
                    modalInstance = null;
                    $scope.network = {};
                };

                $scope.getNetworkProperties = function(networkId, userController) {
                    var properties = [];

                    if (!userController || !userController.networkSearchResults) {
                        return properties;
                    }

                    for (var i = 0; i < userController.networkSearchResults.length; i++) {
                        var networkObj = userController.networkSearchResults[i]

                        if (networkId === networkObj.externalId) {
                            if (networkObj.properties) {
                                properties = networkObj.properties;
                            }
                            break;
                        }
                    }

                    return properties;
                }

                $scope.getIndexOfReference = function(properties) {
                    var index = properties.length;

                    for (var i = 0; i < properties.length; i++) {

                        if (properties[i].predicateString &&
                            properties[i].predicateString.toLowerCase() === 'reference') {

                            return i;
                        }
                    }

                    return index;
                }

                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    var userController = $scope.ndexData;
                    var IdsOfSelectedNetworks = userController.getIDsOfSelectedNetworks();

                    var operation = $scope.network.operation.toLowerCase();
                    delete $scope.network.operation;

                    var createdTasksCounter = 0;

                    for (i = 0; i < IdsOfSelectedNetworks.length; i++ )
                    {
                        var networkId = IdsOfSelectedNetworks[i];
                        var myNet = {};
                        myNet.networkId = networkId;

                        var properties = [];
                        var referenceProperty = {};

                        if (operation === 'description') {
                            myNet.description = $scope.network.description;

                        } else if(operation === 'version') {
                            myNet.version = $scope.network.version;

                        } else if (operation === 'visibility') {
                            myNet.visibility = $scope.network.visibility;

                        } else if (operation === 'reference') {

                            referenceProperty =
                                {
                                    "predicateString" : "Reference",
                                    "value"           : $scope.network.reference,
                                    "dataType"        : "string",
                                    "subNetworkId"    : null
                                };
                        }

                        if (operation === 'reference') {

                            var referenceList = [];
                            referenceList.push(referenceProperty);

                            ndexService.setNetworkProperties(myNet.networkId, referenceList,
                                function (data) {
                                    createdTasksCounter = createdTasksCounter + 1;

                                    if (i == createdTasksCounter) {
                                        $scope.isProcessing = false;
                                        modalInstance.close();
                                    }
                                },

                                function (error) {
                                    createdTasksCounter = createdTasksCounter + 1;

                                    if (i == createdTasksCounter) {
                                        $scope.isProcessing = false;
                                        modalInstance.close();
                                    }
                                });

                        } else if (operation === 'description' || operation === 'version') {

                            ndexService.editNetworkSummary(myNet.networkId, myNet,
                                function (data) {
                                    createdTasksCounter = createdTasksCounter + 1;

                                    if (i == createdTasksCounter) {
                                        $scope.isProcessing = false;
                                        modalInstance.close();
                                    }
                                },
                                function (error) {
                                    createdTasksCounter = createdTasksCounter + 1;

                                    if (i == createdTasksCounter) {
                                        $scope.isProcessing = false;
                                        modalInstance.close();
                                    }
                                }
                            )
                        } else if (operation === 'visibility') {

                            ndexService.setVisibility(myNet.networkId, myNet.visibility,
                                function (data, networkId) {
                                    createdTasksCounter = createdTasksCounter + 1;

                                    userController.updateVisibilityOfNetwork(networkId, myNet.visibility);

                                    if (i == createdTasksCounter) {
                                        $scope.isProcessing = false;
                                        modalInstance.close();
                                    }
                                },
                                function (error, networkId) {
                                    createdTasksCounter = createdTasksCounter + 1;

                                    console.log("unable to update Network Visibility");

                                    if (i == createdTasksCounter) {
                                        $scope.isProcessing = false;
                                        modalInstance.close();
                                    }
                                });

                        }
                    }
                };
            }
        }
    });

    // modal to bulk set/unset read-only flag
    uiServiceApp.directive('bulkChangeReadonlyProperty', function() {
        return {
            scope: {
                ndexData: '=',
                action: '@directiveAction',
                title:  '@directiveTitle',
                text:   '@directiveDescription'
            },
            restrict: 'E',
            templateUrl: 'pages/directives/bulkEditNetworkPropertyModal.html',
            transclude: true,
            controller: function($scope, $modal, ndexService) {

                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                $scope.openMe = function() {

                    $scope.network = {};
                    $scope.network.readOnly = null;
                    $scope.network.label = "Change Read-Only Flag";

                    var haveAdminPrivilege = $scope.ndexData.checkAdminPrivilegeOnSelectedNetworks();

                    // before setting/unsetting the READ-ONLY flag, we want to make sure that user has
                    // ADMIN access to all of them
                    if (!haveAdminPrivilege) {
                        var title = "Cannot Modify Read-Only Property";
                        var message =
                            "For some of the selected networks you do not have ADMIN privilege. " +
                            "You need to have the ADMIN privilege in order to set or unset the READ-ONLY flag. " +
                            " Please make sure you have ADMIN access to all selected networks, and try again.";

                        $scope.ndexData.genericInfoModal(title, message);

                        return;
                    }

                    modalInstance = $modal.open({
                        templateUrl: 'bulk-edit-network-property-modal.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    modalInstance.close();
                    modalInstance = null;
                    $scope.network = {};
                };

                $scope.submit = function() {

                    var userController = $scope.ndexData;

                    var IdsOfSelectedNetworks = userController.getIDsOfSelectedNetworks();

                    for (var i = 0; i < userController.networkSearchResults.length; i++ )
                    {
                        var networkObj  = userController.networkSearchResults[i];
                        var networkUUID = userController.networkSearchResults[i].externalId;

                        if (IdsOfSelectedNetworks.indexOf(networkUUID) == -1) {
                            continue;
                        }

                        if ((networkObj.isReadOnly) && ($scope.network.readOnly.toUpperCase()==='UNSET')) {

                            // the network is read-only and the operation is UNSET, so let's remove the read-only flag
                            ndexService.setReadOnly(networkUUID, false);

                            // set the read-only flags in networkSearchResults to false showing that this network
                            // is now read-write
                            userController.networkSearchResults[i].isReadOnly = false;

                        } else  if (!networkObj.isReadOnly && ($scope.network.readOnly.toUpperCase()==='SET')) {

                            // the network is not read-only and the true is SET, so let's make network read-only
                            ndexService.setReadOnly(networkUUID, true);

                            // set the read-only flags to true showing that this network is now read-only;
                            // the isReadOnly flag will be re-set
                            // when we reload user page and re-populate the userController.networkSearchResults structure;
                            // But for now, keep this value as true so that UI behaves correctly with these networks.
                            userController.networkSearchResults[i].isReadOnly = true;
                        }
                    }

                    modalInstance.close();
                };
            }
        }
    });


    uiServiceApp.directive('bulkNetworkAccessModal', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'A',
            transclude: true,
            templateUrl: 'pages/directives/bulkNetworkAccessModal.html',
            controller: function($scope, $attrs, $modal, $location, ndexService) {
                var modalInstance;

                //$scope.group = {};
                $scope.text = $attrs.bulkNetworkAccessModal;
                $scope.accessType = {};

                $scope.openMe = function() {
                    $scope.accessType.permission = '';

                    delete $scope.errors;
                    delete $scope.progress;
                    $scope.summary = "";
                    $scope.IDsOfNetworksToUpdate = [];

                    modalInstance = $modal.open({
                        templateUrl: 'modal.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    modalInstance.dismiss();
                    delete $scope.errors;
                    delete $scope.progress;
                    delete $scope.summary;
                    $scope.IDsOfNetworksToUpdate = [];

                };

                $scope.close = function() {
                    modalInstance.dismiss();
                    delete $scope.errors;
                    delete $scope.progress;
                    delete $scope.summary;
                    $scope.IDsOfNetworksToUpdate = [];
                };
                //$scope.$watch("group.groupName", function() {
                //    delete $scope.errors;
                //});

                $scope.isProcessing = false;


                $scope.updateMembershipsOnServer = function(membershipsForSending) {

                    if (typeof(membershipsForSending) === 'undefined') {
                        return;
                    }
                    if (membershipsForSending.length == 0) {
                        var bulkNetworkManager = $scope.ndexData;
                        bulkNetworkManager.getNetworkPermissions($scope.IDsOfNetworksToUpdate);
                        $scope.progress = "Done";
                        $scope.close();
                        $scope.isProcessing = false;
                        $location.path("/user/" + bulkNetworkManager.currentUserId);
                        return;
                    }

                    // remove membership object from the list of memberships to send
                    membershipToSend = membershipsForSending.shift();


                    $scope.progress = "Granting " + membershipToSend.permissions +
                        " access to '" + membershipToSend.memberAccountName +
                            "' for network '" + membershipToSend.resourceName + "'";

                    ndexService.updateNetworkMember(membershipToSend,
                        function(success){
                            $scope.summary = $scope.summary +
                                    $scope.progress.replace("Granting", "Granted") + "\n";
                            $scope.updateMembershipsOnServer(membershipsForSending);
                        },
                        function(error){
                            $scope.updateMembershipsOnServer(membershipsForSending);
                        })
                }

                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    var accessTypeSelected =
                        ($scope.accessType.permission.toUpperCase()==="EDIT") ? "WRITE" :
                        $scope.accessType.permission.toUpperCase();

                    var bulkNetworkManager = $scope.ndexData;

                    var updateAccessRequestsSent = 0;
                    var updateAccessRequestsResponsesReceived = 0;

                    var IDsOfSelectedNetworks =
                        Object.keys(bulkNetworkManager.selectedNetworksForUpdatingAccessPermissions);

                    var membershipToUpdateReadyForSending = [];

                    // iterate through the list of networks selected for updating access
                    for (var i = 0;  i < IDsOfSelectedNetworks.length; i++) {

                        var networkId = IDsOfSelectedNetworks[i];
                        var networkPermissionsObjs =
                            bulkNetworkManager.selectedNetworksForUpdatingAccessPermissions[networkId];

                        // loop through the list of accounts whose access for the networks we modify
                        for (var j = 0;
                                 j <  bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.length; j++) {

                            var accountForUpdating =
                                bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions[j];

                            var updateNetworkAccessPermissions =
                                bulkNetworkManager.checkIfNetworkAccessNeedsUpdating(
                                    networkPermissionsObjs, accountForUpdating, accessTypeSelected);

                            if (updateNetworkAccessPermissions) {

                                var updatedMembership = {
                                    memberAccountName: accountForUpdating.memberAccountName,
                                    memberUUID: accountForUpdating.memberUUID,
                                    resourceName: networkPermissionsObjs[0].resourceName,
                                    resourceUUID: networkId,
                                    permissions: accessTypeSelected
                                }

                                if ((accountForUpdating.accountType.toUpperCase() === "GROUP") &&
                                    accessTypeSelected.toUpperCase() === "ADMIN") {
                                    // user is trying to grant ADMIN access to a group, NDEx cannot do that for security
                                    // reasons.  Instead of ADMIN, grant this group WRITE permission.
                                    updatedMembership.permissions = "WRITE";
                                }

                                membershipToUpdateReadyForSending.push(updatedMembership);
                                if ($scope.IDsOfNetworksToUpdate.indexOf(updatedMembership.resourceUUID) == -1) {
                                    $scope.IDsOfNetworksToUpdate.push(updatedMembership.resourceUUID);
                                }
                            }
                        }
                    }

                    if (membershipToUpdateReadyForSending.length == 0) {
                        $scope.progress = "No need to update.";
                        $scope.close();
                        $scope.isProcessing = false;
                        $location.path("/user/" + bulkNetworkManager.currentUserId);
                    } else {
                        $scope.updateMembershipsOnServer(membershipToUpdateReadyForSending);
                    }

                };
            }
        }
    });



    // modal to change password
    uiServiceApp.directive('changePasswordModal', function() {
        return {
            scope: {},
            restrict: 'E',
            templateUrl: 'pages/directives/changePasswordModal.html',
            transclude: true,
            controller: function($scope, $modal, $route, ndexService) {
                var modalInstance;
                $scope.errors = null;
                $scope.change = {};

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'change-password-modal.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    $scope.change = {};
                    modalInstance.close();
                    modalInstance = null;
                };

                $scope.$watch("change.newPassword", function() {
                    delete $scope.errors;
                });
                $scope.$watch("change.newPasswordConfirm", function() {
                    delete $scope.errors;
                });

                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;
                    if($scope.change.newPassword != $scope.change.newPasswordConfirm) {

                        $scope.errors = 'Passwords do not match';
                        $scope.isProcessing = false;
                        return;
                    }
                    ndexService.changeAccountPassword($scope.change.password, $scope.change.newPassword,
                        function(data) {
                            $route.reload();
                            modalInstance.close();
                            modalInstance = null;
                            $scope.isProcessing = false;
                        },
                        function(error){
                            $scope.errors =  error.data;
                            $scope.isProcessing = false;
                        })
                };
            }
        }
    });

    // modal to remove own access to network
    uiServiceApp.directive('leaveNetwork', function(){
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/confirmationModal.html',
            transclude: true,
            controller: function($scope, $modal, $route, ndexService) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'confirmation-modal.html',
                        scope: $scope,
                        controller: function($scope, $modalInstance, $location, ndexService, ndexUtility) {
                            $scope.title = 'Disaffiliate this Network'
                            $scope.message = 'You can lose access to this network!';

                            $scope.cancel = function() {
                                $modalInstance.dismiss();
                            };

                            $scope.confirm = function() {
                                if( $scope.isProcessing )
                                    return;
                                $scope.isProcessing = true;
                                ndexService.removeNetworkMember($scope.externalId, ndexUtility.getLoggedInUserExternalId(),
                                    function(data) {
                                        $modalInstance.close();
                                        $location.path('/user/'+ndexUtility.getLoggedInUserExternalId());
                                        $scope.isProcessing = false;
                                    },
                                    function(error) {
                                        $scope.errors = error.data;
                                        $scope.isProcessing = false;
                                    });
                            };
                        }
                    });
                };

                $scope.$watch('ndexData', function(value) {
                    $scope.externalId = value
                });

            }
        }
    });

    // modal to delete network
    uiServiceApp.directive('deleteNetwork', function(){
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/confirmationModal.html',
            transclude: true,
            controller: function($scope, $modal, $location) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'confirmation-modal.html',
                        scope: $scope,
                        controller: function($scope, $modalInstance, $route, ndexService, ndexUtility, sharedProperties) {

                            $scope.title = 'Delete this Network'; //pass network name and add to title
                            $scope.message = 'This network will be permanently deleted from NDEx. Are you sure you want to proceed?';

                            $scope.cancel = function() {
                                $modalInstance.dismiss();
                                $scope.isProcessing = true;
                            };

                            $scope.confirm = function() {
                                if( $scope.isProcessing )
                                    return;
                                $scope.isProcessing = true;
                                $scope.progress = 'Delete in progress....';
                                ndexService.deleteNetwork($scope.externalId,
                                    function(data) {
                                        sharedProperties.setCurrentNetworkId(null);
                                        $modalInstance.close();
                                        $location.path('/user/'+ndexUtility.getLoggedInUserExternalId());
                                        $scope.isProcessing = false;
                                    },
                                    function(error) {
                                        delete $scope.progress;
                                        $scope.errors = error.data.message;
                                        $scope.isProcessing = false;
                                    });
                            };
                        }
                    });
                };

                $scope.$watch('ndexData', function(value) {
                    $scope.externalId = value
                });

            }
        }
    })

    // modal to archive BEL name spaces of the network
    uiServiceApp.directive('archiveBelNamespaces', function(){
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/confirmationModal.html',
            transclude: true,
            controller: function($scope, $modal, $location) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'confirmation-modal.html',
                        scope: $scope,
                        controller: function($scope, $modalInstance, $route, ndexService, ndexUtility, sharedProperties) {

                            $scope.title = 'Archive Name Spaces';
                            $scope.message = 'This network\'s namespaces will be archived on NDEx. Are you sure you want to proceed?';

                            $scope.cancel = function() {
                                $modalInstance.dismiss();
                                $scope.isProcessing = true;
                            };

                            $scope.confirm = function() {
                                if( $scope.isProcessing )
                                    return;
                                $scope.isProcessing = true;
                                $scope.progress = 'Archivinig in progress....';

                                ndexService.archiveBelNamespaces($scope.externalId,
                                    function(data) {
                                        $modalInstance.close();
                                        $scope.isProcessing = false;
                                    },
                                    function(error) {
                                        $scope.errors = error.data;
                                        $scope.isProcessing = false;
                                    });
                            };
                        }
                    });
                };

                $scope.$watch('ndexData', function(value) {
                    $scope.externalId = value
                });

            }
        }
    });

    // modal to download BEL name space file of the network
    uiServiceApp.directive('downloadBelNamespace', function(){
        return {
            scope: {
                ndexNetworkUuid: '=',
                ndexNetworkName: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/downloadBelNamespace.html',
            transclude: true,
            controller: function($scope, $modal, $location, $http) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'download-bel-namespace-modal.html',
                        scope: $scope,
                        backdrop: 'static',

                        controller: function($scope, $modalInstance, $route, ndexService, ndexUtility, sharedProperties) {

                            $scope.title = 'Download BEL Namespace';
                            //$scope.progress = 'Getting namespaces for this network ....';

                            $scope.close = function() {
                                $modalInstance.dismiss();
                                $scope.isProcessing = false;
                            };

                            $scope.nameSpaces = [];

                            $scope.namespace = {};
                            delete $scope.namespace.namespaceFileContents;
                            delete $scope.namespace.modalInstance;

                            $scope.namespace.selectedNameSpace = 'undefined';

                            $scope.errors = null;

                            ndexService.getNetworkNamespaces($scope.ndexNetworkUuid,
                                function(namespaces) {

                                    $scope.nameSpaces = namespaces;

                                    if (namespaces.length > 0) {
                                        $scope.namespace.selectedNameSpace = namespaces[0];
                                    }
                                },
                                function(error) {

                                });

                            $scope.$watch("namespace.selectedNameSpace", function() {
                                $scope.errors = null;
                            });

                            $scope.viewNameSpace = function() {

                                var networkUUID = $scope.ndexNetworkUuid;
                                var prefix = $scope.namespace.selectedNameSpace.prefix;

                                var URI = ndexService.getNdexServerUri() + '/network/' + networkUUID + '/namespaceFile/' + prefix;

                                // since the server REST API returns String (text/plain), we need to use the $http service.
                                // When server was returning String as application/json,  the client (Web UI) was unable to pase the expected JSON and threw errors,
                                // so we changed the server to return text/plain.
                                $http.get(URI).
                                    success(function(data, status, headers, config) {

                                        $scope.namespace.namespaceFileContents = data;
                                        $scope.namespace.prefixForTitle = prefix;

                                        $scope.namespace.modalInstance = $modal.open({
                                            templateUrl: 'bel-namespace-show-contents.html',
                                            scope: $scope,
                                            backdrop: 'static'
                                        });

                                        $scope.namespace.close = function() {
                                            $scope.namespace.modalInstance.dismiss();
                                            //$scope.isProcessing = false;
                                        };

                                        $scope.namespace.saveToFile = function() {
                                            $scope.namespace.modalInstance.dismiss();


                                            var textFileAsBlob = new Blob([$scope.namespace.namespaceFileContents], {type:'text/plain'});
                                            var fileNameToSaveAs = $scope.namespace.selectedNameSpace.prefix + ".txt";

                                            var downloadLink = document.createElement("a");
                                            downloadLink.download = fileNameToSaveAs;
                                            downloadLink.innerHTML = "Download File";

                                            if (window.webkitURL != null)
                                            {
                                                // Chrome allows the link to be clicked
                                                // without actually adding it to the DOM.
                                                downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
                                            }
                                            else
                                            {
                                                // Firefox requires the link to be added to the DOM
                                                // before it can be clicked.
                                                downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
                                                document.body.appendChild(downloadLink);
                                            }

                                            if (confirm("Save BEL Namespace file for prefix " + prefix + " in " + fileNameToSaveAs + "?"))
                                            {
                                                downloadLink.click();
                                            }
                                        };
                                    }).
                                    error(function(error, status, headers, config) {

                                        $scope.errors = error.message;
                                    }
                                );
                            }
                        }
                    });
                };
            }
        }
    });

    // modal to remove own access to group
    uiServiceApp.directive('leaveGroup', function(){
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/confirmationModal.html',
            transclude: true,
            controller: function($scope, $modal, $route, ndexService) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'confirmation-modal.html',
                        scope: $scope,
                        controller: function($scope, $modalInstance, $location, ndexService, ndexUtility) {
                            $scope.title = 'Leave '+$scope.group.userName
                            $scope.message = 'There must be other admin in the group';

                            $scope.cancel = function() {
                                $modalInstance.dismiss();
                            };

                            $scope.confirm = function() {
                                if( $scope.isProcessing )
                                    return;
                                $scope.isProcessing = true;
                                ndexService.removeGroupMember($scope.group.externalId, ndexUtility.getLoggedInUserExternalId(),
                                    function(data) {
                                        $modalInstance.close();
                                        $location.path('/user/'+ndexUtility.getLoggedInUserExternalId());
                                        $scope.isProcessing = false;
                                    },
                                    function(error) {
                                        $scope.errors = error.data;
                                        $scope.isProcessing = false;
                                    });
                            };
                        }
                    });
                };

                $scope.$watch('ndexData', function(value) {
                    $scope.group = value
                });

            }
        }
    });

    // modal to delete gorup
    uiServiceApp.directive('deleteGroup', function(){
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/confirmationModal.html',
            transclude: true,
            controller: function($scope, $modal, $location, ndexService) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'confirmation-modal.html',
                        scope: $scope,
                        controller: function($scope, $modalInstance, $route, ndexService, ndexUtility) {
                            $scope.title = 'Delete this Group'
                            $scope.message = 'This group will be permanently deleted from NDEx. Are you sure you want to delete?';

                            $scope.cancel = function() {
                                $modalInstance.dismiss();
                            };

                            $scope.confirm = function() {
                                if( $scope.isProcessing )
                                    return;
                                $scope.isProcessing = true;
                                ndexService.deleteGroup($scope.externalId,
                                    function(data) {
                                        $modalInstance.close();
                                        $location.path('/user/'+ndexUtility.getLoggedInUserExternalId());
                                        $scope.isProcessing = false;
                                    },
                                    function(error) {
                                        $scope.errors = error.data;
                                        $scope.isProcessing = false;
                                    });
                            };
                        }
                    });
                };

                $scope.$watch('ndexData', function(value) {
                    $scope.externalId = value
                });

            }
        }
    });

    // modal to delete user
    uiServiceApp.directive('deleteUser', function(){
        return {
            scope: {},
            restrict: 'E',
            templateUrl: 'pages/directives/confirmationModal.html',
            transclude: true,
            controller: function($scope, $modal, $location, ndexService) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'confirmation-modal.html',
                        scope: $scope,
                        controller: function($scope, $modalInstance, $location, $route, ndexService, ndexUtility) {
                            $scope.title = 'Delete Your Account'
                            $scope.message = 'Your account will be permanently deleted from NDEx. Are you sure you want to delete?';

                            $scope.cancel = function() {
                                $modalInstance.dismiss();
                            };

                            $scope.confirm = function() {
                                if( $scope.isProcessing )
                                    return;
                                $scope.isProcessing = true;
                                ndexService.deleteUser(
                                    function(data) {
                                        $modalInstance.close();
                                        $scope.$emit('LOGGED_OUT'); //emit event to clear up variables in main controller scope, route refresh does not clear those variables, probably because they are probably of the rootscope
                                        $location.path('/');
                                        $route.reload();
                                        $scope.isProcessing = false;
                                    },
                                    function(error) {
                                        $scope.errors = error.data.message;
                                        $scope.isProcessing = false;
                                    });
                            };
                        }
                    });
                };

            }
        }
    });

    uiServiceApp.directive('saveSubnetwork', function(){
        return {
            restrict: 'E',
            templateUrl: 'pages/directives/confirmationModal.html',
            transclude: true,
            controller: function(sharedProperties, $http, $scope, $modal, $location, ndexService) {

                var saveSubnetworkProvenance = function(networkSummary, modal)
                {
                    var terms = sharedProperties.getCurrentQueryTerms();
                    var depth = sharedProperties.getCurrentQueryDepth();

                    var subPromise = ndexService.getProvenance(sharedProperties.currentNetworkId).$promise;
                    return subPromise.then(
                        function(provenance)
                        {
                            var newProvenance =
                            {
                                uri: networkSummary.uri,
                                properties:
                                [
                                    {
                                        name: 'edge count',
                                        value: networkSummary.edgeCount,
                                        type: 'SimplePropertyValuePair'
                                    },
                                    {
                                        name: 'node count',
                                        value: networkSummary.nodeCount,
                                        type: 'SimplePropertyValuePair'
                                    },
                                    {
                                        name: 'dc:title',
                                        value: networkSummary.name,
                                        type: 'SimplePropertyValuePair'
                                    }
                                ],
                                creationEvent:
                                {
                                    startedAtTime: networkSummary.creationTime,
                                    endedAtTime: networkSummary.creationTime,
                                    inputs: [provenance],
                                    type: 'ProvenanceEvent',
                                    eventType: 'Query',
                                    properties:
                                    [
                                        {
                                            name: 'query terms',
                                            value: terms,
                                            type: 'SimplePropertyValuePair'
                                        },
                                        {
                                            name: 'query depth',
                                            value: depth,
                                            type: 'SimplePropertyValuePair'
                                        }
                                    ]
                                }
                            };

                            if( networkSummary.description )
                            {
                                newProvenance.properties.push( {name:'description', value:networkSummary.description, type:'SimplePropertyValuePair'}  )
                            }
                            if( networkSummary.version )
                            {
                                newProvenance.properties.push( {name:'version', value:networkSummary.version, type:'SimplePropertyValuePair'}  )
                            }

                            ndexService.setProvenance(networkSummary.externalId, newProvenance).$promise.then(
                                function(res)
                                {
                                    modal.close();
                                    $scope.isProcessing = false;

                                    $('#tableViewSaveSubnetworkButton').prop('disabled', true);
                                    
                                   // $location.path('/network/'+networkSummary.externalId);
                                });
                        })
                };

                var saveSubnetwork = function(modal, scope) {
                    var d = new Date();

                    var terms = sharedProperties.getCurrentQueryTerms();
                    var depth = sharedProperties.getCurrentQueryDepth();

                    var configProp = angular.injector(['ng', 'ndexServiceApp']).get('config');
                    var ndexServerURI = configProp.ndexServerUri;

                    var postData = angular.fromJson(csn.json);
                    if( terms )
                    {
                        postData.name = "Neighborhood query result on network - " +  cn.name ;
                    }
                    else
                    {
                        postData.name = "Advanced query result on network -" + cn.name ;
                    }

                    csn.json = angular.toJson(postData);

                    $http.post(ndexServerURI + '/network/asNetwork', csn.json).
                        success(function(data, status, headers, config) {
                            saveSubnetworkProvenance(data, modal);
                        }).
                        error(function(error, status, headers, config) {
                            if( error )
                            {
                                $scope.errors = error.message;
                            }
                            else
                            {
                                scope.errors = "There was an unknown error saving the network.";
                            }
                            scope.progress = "";
                        });


                };

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'confirmation-modal.html',
                        scope: $scope,
                        controller: function($scope, $modalInstance, $location, $route, ndexService) {
                            $scope.title = 'Save Subnetwork?'
                            $scope.message = 'The subnetwork for '+cn.name+' will be saved to your account?';

                            $scope.cancel = function() {
                                $scope.errors = null;
                                $scope.progress = 'Save in progress....'
                                $modalInstance.dismiss();
                            };

                            $scope.confirm = function() {
                                if( $scope.isProcessing )
                                    return;
                                $scope.isProcessing = true;
                                $scope.progress = 'Save in progress....';

                                saveSubnetwork($modalInstance, $scope);

                            };
                        }
                    });
                };

            }
        }
    });

    //----------------------------------------------------
    //                  Filters
    uiServiceApp.filter('permissionToLabel', function() {
        return function(input) {
            switch(input) {
                case 'ADMIN':
                    return 'Is Admin';
                case 'WRITE':
                    return 'Can Edit';
                case 'READ':
                    return 'Can Read';
                case 'GROUPADMIN':
                    return 'Is Admin';
                case 'MEMBER':
                    return 'Is Member';
            }
        }
    })

    uiServiceApp.filter('requestStatusToLabel', function() {
        return function(input) {
            switch(input) {
                case 'PENDING':
                    return 'pending';
                case 'DECLINED':
                    return 'declined';
                case 'ACCEPTED':
                    return 'accepted';
            }
        }
    });

    uiServiceApp.filter('taskStatusToLabel', function() {
        return function(input) {
            switch(input) {
                case 'COMPLETED':
                    return 'completed';
                case 'QUEUED':
                    return 'queued';
                case 'STAGED' :
                    return 'staged';
                case 'PROCESSING':
                    return 'processing';
                case 'COMPLETED_WITH_WARNINGS':
                    return 'completed with warnings';
                case 'COMPLETED_WITH_ERRORS' :
                    return 'completed with errors';
                case 'FAILED':
                    return 'failed';
                case 'QUEUED_FOR_DELETION':
                    return 'queued for deletion';
                case 'ALL':
                    return 'all';
            }
        }
    })

}) ();