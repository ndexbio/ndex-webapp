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
                    $scope.group.accountName = accountName;

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

    // modal to view and act on received request
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
                                        ////console.log($scope.request)
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
                                    $scope.request.destinationName = $scope.ndexData.accountName;
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
                                $scope.request.destinationName = $scope.ndexData.accountName;
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
                        if($scope.accounts[ii].accountName == $scope.request.sourceName)
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
                    $scope.request.destinationName = $scope.ndexData.name;
                    $scope.request.destinationUUID = $scope.ndexData.externalId;
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

    // modal to create network export task
    uiServiceApp.directive('createExportNetworkTask', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/createExportNetworkTask.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility)
            {
                var modalInstance;
                $scope.errors = null;
                $scope.modal = {};
                $scope.networkType = 'SIF';

                $scope.task = {
                    description: 'network export',
                    priority: 'MEDIUM',
                    taskType: 'EXPORT_NETWORK_TO_FILE',
                    status: 'QUEUED',
                    progress: 0,
                    //This old approach doesn't work, because at this point, externalId is undefined.
                    //We are making resource undefined explicitly and we set it equal to the UUID of the network
                    //in createTask() function below...
                    //old - resource: $scope.externalId
                    //new - resource: undefined
                    resource: undefined
                };

                $scope.openMe = function() {
                    $scope.networkType = $scope.task.format;
                    var types = ["CX", "SIF", "XGMML", "BEL", "XBEL", "BIOPAX"];
                    if (typeof $scope.networkType === 'undefined') {
                        $scope.networkType = 'CX';
                    }
                    if (csn)
                    {
                        for (var i = 0; i < csn.properties.length; i++)
                        {
                            var property = csn.properties[i];
                            if (property.predicateString.toUpperCase() == "SOURCEFORMAT")
                            {
                                if( $.inArray(property.value.toUpperCase(), types) == -1 )
                                    break;
                                $scope.networkType = property.value.toUpperCase();
                                if( $scope.networkType == 'BEL' )
                                    $scope.networkType = 'XBEL';
                                break;
                            }
                        }
                    }
                    $scope.task.format = $scope.networkType;
                    modalInstance = $modal.open({
                        templateUrl: 'create-export-network-task-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function()
                {
                    $scope.isProcessing = false;
                    modalInstance.close();
                };

                $scope.createTask = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;
                    //This is a hack of sorts. The tasks resource was set to undefined earlier, since the network
                    // UUID wasn't yet available.

                    myTask = $scope.task;
                    myTask.resource = $scope.externalId;

                    ndexService.createTask(myTask,
                        function(data) {
                            ////console.log(data);
                            $scope.false = true;
                            $scope.isProcessing = false;
                            modalInstance.close();
                        },
                        function(error) {
                            //console.log(error);
                            $scope.isProcessing = false;
                            //TODO error handling
                        });
                }

                $scope.$watch('ndexData', function(value) {
                    $scope.externalId = $scope.ndexData.externalId;
                    $scope.name = $scope.ndexData.name;
                });


            }
        }
    });

    // modal to create bulk network export task
    uiServiceApp.directive('createBulkExportNetworkTasks', function() {
        return {
            scope: {
                ndexData: '='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/createBulkExportNetworkTask.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility)
            {
                var modalInstance;
                $scope.errors = null;
                $scope.modal = {};
                //$scope.task.networkType = 'Default 11';
                $scope.title = 'Export Selected Networks';
                $scope.export = {};

                $scope.task = {
                    description: 'bulk network export',
                    priority: 'MEDIUM',
                    taskType: 'EXPORT_NETWORK_TO_FILE',
                    status: 'QUEUED',
                    progress: 0,
                    //This old approach doesn't work, because at this point, externalId is undefined.
                    //We are making resource undefined explicitly and we set it equal to the UUID of the network
                    //in createTask() function below...
                    //old - resource: $scope.externalId
                    //new - resource: undefined
                    resource: undefined
                };

                $scope.openMe = function() {
                    $scope.export.networkType = "Default";
                    //$scope.task.format = $scope.networkType;

                    modalInstance = $modal.open({
                        templateUrl: 'create-bulk-export-network-task-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function()
                {
                    $scope.isProcessing = false;
                    modalInstance.close();
                };

                $scope.createTasks = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    // get reference to userController from user.html
                    var userController = $scope.ndexData;

                    // call the userController.getIDsAndTypesOfSelectedNetworks() function
                    var IDsAndTypesOfSelectedNetworks = userController.getIDsAndTypesOfSelectedNetworks();

                    //This is a hack of sorts. The tasks resource was set to undefined earlier, since the network
                    // UUID wasn't yet available.

                    var createdTasksCounter = 0;

                    for (i = 0; i < Object.keys(IDsAndTypesOfSelectedNetworks).length; i++) {
                        // clone $scope.task; myTask should be unique object since it
                        // will be passed as argment to ndexService.createTask
                        var myTask = JSON.parse(JSON.stringify($scope.task));

                        myTask.format = ($scope.export.networkType === 'Default') ?
                            IDsAndTypesOfSelectedNetworks[i]['format'] :
                            $scope.export.networkType;

                        myTask.resource = IDsAndTypesOfSelectedNetworks[i]['externalId'];
                        if (myTask.format.toUpperCase() === 'BEL') {
                            myTask.format = 'XBEL';
                        }

                        ndexService.createTask(myTask,
                            function (data) {
                                createdTasksCounter = createdTasksCounter + 1;

                                if (i == createdTasksCounter) {
                                    //$scope.false = true;
                                    $scope.isProcessing = false;
                                    userController.refreshTasks();
                                    modalInstance.close();
                                }
                            },
                            function (error) {
                                createdTasksCounter = createdTasksCounter + 1;

                                if (i == createdTasksCounter) {
                                    //$scope.false = true;
                                    $scope.isProcessing = false;
                                    userController.refreshTasks();
                                    modalInstance.close();
                                }

                            });
                    }
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
                    $scope.network.version = $scope.ndexData.version;
                    $scope.network.visibility = $scope.ndexData.visibility;
                    $scope.network.reference2 = $scope.network.reference1;
                };

                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    // check if reference field was modified.  As of Release 1.3, this field
                    // is not part of NetworkSummary object; so it needs to be sent to the server
                    // separately
                    var updateProperties =
                        ($scope.network.reference1 === $scope.network.reference2) ? false : true;
                    var properties = null;

                    if (updateProperties) {

                        // properties need to be updated on the server since reference was modified
                        if ((typeof $scope.ndexData !== 'undefined') &&
                            (typeof $scope.ndexData.properties !== 'undefined')) {

                            var found = false;
                            for (i = 0; i < $scope.ndexData.properties.length; i++) {
                                if($scope.ndexData.properties[i].predicateString.toLowerCase() === 'reference') {
                                    // reference property is found; modify it
                                    $scope.ndexData.properties[i].value = $scope.network.reference2;
                                    found = true;
                                    break;
                                }
                            }
                            properties = $scope.ndexData.properties;

                            if (!found) {
                                // if reference property is not found (it was just added),
                                // add it to the array of properties before sending the properties to server
                                properties[properties.length] =
                                    { "predicateString" : "Reference",
                                      "value"           : $scope.network.reference2,
                                      "dataType"        : "string",
                                      "subNetworkId"    : null
                                    };
                            }
                        } else {
                            // properties not found; create the properties array and send it to the server
                            properties =
                                { "predicateString" : "Reference",
                                  "value"           : $scope.network.reference2,
                                  "dataType"        : "string",
                                  "subNetworkId"    : null
                                };
                        }
                        // remove reference1 and reference2 fields since $scope.network maps
                        // to NetworkSummary object on server; this object doesn't have reference[1,2] fields;
                        // it is safe to send ctation fields to the server, but let's still remove them
                        delete $scope.network.reference1;
                        delete $scope.network.reference2;
                    }



                    ndexService.editNetworkSummary($scope.ndexData.externalId, $scope.network,
                        function(data) {
                            modalInstance.close();
                            modalInstance = null;

                            if (updateProperties) {
                                ndexService.setNetworkProperties($scope.ndexData.externalId, properties,
                                    function (data) {
                                        $route.reload();
                                    },
                                    function (error) {
                                        //editor.errors.push(error)
                                    });
                            } else {
                                $route.reload();
                            }
                        },
                        function(error) {
                            $scope.isProcessing = false;
                            //console.log('error' + error);
                        })
                };

                $scope.findCitationForNetworkSummary = function(propertiesArray) {
                    if (typeof propertiesArray === 'undefined') {
                        return null;
                    }
                    for( var i = 0; i < propertiesArray.length; i++ ) {
                        if (propertiesArray[i].predicateString.toLowerCase().trim() === 'reference') {
                            return propertiesArray[i].value;
                        }
                    }
                    return null;
                }

                $scope.$watch('ndexData', function(value) {
                    $scope.network.name = $scope.ndexData.name;
                    $scope.network.description = $scope.ndexData.description;
                    $scope.network.version = $scope.ndexData.version;
                    $scope.network.visibility = $scope.ndexData.visibility;

                    // reference1 and reference2 are used to decide whether to send setNetworkProperties
                    // request to the server.  The request is sent if after editing Network Profile
                    // the reference2 field was modified, i.e., if
                    // $scope.network.reference1 !== $scope.network.reference2.
                    $scope.network.reference1 =
                        $scope.findCitationForNetworkSummary($scope.ndexData.properties);
                    $scope.network.reference2 = $scope.network.reference1;

                });
            }
        }
    });

    // modal to bulk edit networks description
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
            controller: function($scope, $modal, ndexService, $route) {

                var visibilities = ["PUBLIC", "DISCOVERABLE", "PRIVATE"];

                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                $scope.openMe = function() {

                    $scope.network = {};

                    $scope.network.name = null;
                    $scope.network.description = null;
                    $scope.network.version = null;
                    $scope.network.visibility = null;

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
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    var userController = $scope.ndexData;

                    if (visibilities.indexOf($scope.network.visibility.toUpperCase()) == -1) {
                        $scope.network.visibility = null;
                    }

                    var myNetwork = JSON.parse(JSON.stringify($scope.network));
                    var IdsOfSelectedNetworks = userController.getIDsOfSelectedNetworks();

                    var createdTasksCounter = 0;

                    for (i = 0; i < IdsOfSelectedNetworks.length; i++ )
                    {
                        var networkId = IdsOfSelectedNetworks[i];
                        var myNetwork = JSON.parse(JSON.stringify($scope.network));
                        myNetwork.networkId  = networkId;

                        ndexService.editNetworkSummary(networkId, myNetwork,
                            function(data) {
                                createdTasksCounter =  createdTasksCounter + 1;

                                if (myNetwork.visibility != null) {
                                    userController.updateVisibilityOfNetwork(data.networkId, myNetwork.visibility);
                                }

                                if (i == createdTasksCounter) {
                                    $scope.isProcessing = false;
                                    modalInstance.close();
                                }
                            },
                            function(error) {
                                createdTasksCounter =  createdTasksCounter + 1;

                                if (i == createdTasksCounter) {
                                    $scope.isProcessing = false;
                                    modalInstance.close();

                                }
                            }
                        )
                    }
                };

                $scope.findCitationForNetworkSummary = function(propertiesArray) {
                    if (typeof propertiesArray === 'undefined') {
                        return null;
                    }
                    for( var i = 0; i < propertiesArray.length; i++ ) {
                        if (propertiesArray[i].predicateString.toLowerCase().trim() === 'reference') {
                            return propertiesArray[i].value;
                        }
                    }
                    return null;
                }

                $scope.$watch('ndexData', function(value) {
                    $scope.network.name = $scope.ndexData.name;
                    $scope.network.description = $scope.ndexData.description;
                    $scope.network.version = $scope.ndexData.version;
                    $scope.network.visibility = $scope.ndexData.visibility;

                    // reference1 and reference2 are used to decide whether to send setNetworkProperties
                    // request to the server.  The request is sent if after editing Network Profile
                    // the reference2 field was modified, i.e., if
                    // $scope.network.reference1 !== $scope.network.reference2.
                    $scope.network.reference1 =
                        $scope.findCitationForNetworkSummary($scope.ndexData.properties);
                    $scope.network.reference2 = $scope.network.reference1;

                });
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
                            $scope.title = 'Leave '+$scope.group.accountName
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
                            $scope.title = 'Delete your Account'
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
                                    $location.path('/network/'+networkSummary.externalId);
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
                        postData.name = cn.name + ': Simple Query, Terms = ' + terms;
                    }
                    else
                    {
                        postData.name = cn.name + ': Advanced Query';
                    }
                    if( depth )
                    {
                        postData.name += ' at Depth ' + depth;
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