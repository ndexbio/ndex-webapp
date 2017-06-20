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

                factory.openConfirmationModal = function(title, message, confirmLabel, cancelLabel, confirmHandler, cancelHandler){
                    ////console.log("attempting to open confirmationModal");
                    var ConfirmCtrl = function($scope, $modalInstance) {
                        $scope.input = {};
                        $scope.title = title;
                        $scope.message = message;
                        $scope.cancelLabel = cancelLabel ? cancelLabel : "Cancel";
                        $scope.confirmLabel = confirmLabel ? confirmLabel : "Delete";
                        $scope.confirm = function(){
                            $modalInstance.dismiss();
                            confirmHandler();
                        };

                        $scope.cancel = function(){
                            $modalInstance.dismiss();
                            cancelHandler();
                        };
                    };

                    $modal.open({
                        templateUrl: 'pages/confirmationModal.html',
                        controller: ConfirmCtrl
                    })
                };

                factory.genericInfoModal = function(title, message)
                {
                    var modalInstance = $modal.open({
                        templateUrl: 'pages/generic-info-modal.html',

                        controller: function($scope, $modalInstance) {

                            $scope.title = title;
                            $scope.message = message;

                            $scope.close = function() {
                                $modalInstance.dismiss();
                            };
                        }
                    });
                };

                factory.networkInfoModal = function(network)
                {
                    var modalInstance = $modal.open({
                        templateUrl: 'pages/networkInfoModal.html',

                        controller: function($scope, $modalInstance) {

                            $scope.network = network;

                            $scope.close = function() {
                                $modalInstance.dismiss();
                            };
                        }
                    });
                };

                factory.networkSetInfoModal = function(set)
                {
                    var modalInstance = $modal.open({
                        templateUrl: 'pages/networkSetInfoModal.html',

                        controller: function($scope, $modalInstance) {

                            $scope.set = set;

                            $scope.close = function() {
                                $modalInstance.dismiss();
                            };
                        }
                    });
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

                    ndexService.createGroupV2($scope.group,
                        function(url){
                            if (url) {
                                var groupId = url.split('/').pop();
                                modalInstance.close();
                                ////console.log(groupData);

                                $location.path('/group/' + groupId);
                                $scope.isProcessing = false;
                            }
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

    uiServiceApp.directive('triggerCreateNetworkSetModal', function() {
        return {
            scope: {
                myAccountController: '=',
                signalNewSetCreation: '='
            },
            restrict: 'A',
            templateUrl: 'pages/directives/createNetworkSetModal.html',
            controller: function($scope, $attrs, $modal, $location, ndexService, $rootScope, $route) {
                var modalInstance;

                //$scope.networkSet = {};
                $scope.text = $attrs.triggerCreateNetworkSetModal;

                $scope.openMe = function() {
                    $scope.networkSet = {};
                    $scope.networkSet['properties'] = {};
                    $scope.networkSet['properties']['reference'] = "";
                    $scope.title = 'Create Network Set';
                    modalInstance = $modal.open({
                        templateUrl: 'modalx.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    modalInstance.dismiss();
                    delete $scope.errors;
                    $scope.networkSet = {};
                    $scope.isProcessing = false;
                };

                $scope.$watch("networkSet.networkSetName", function() {
                    delete $scope.errors;
                });

                $scope.isProcessing = false;

                $scope.submit = function() {
                    if ($scope.isProcessing)
                        return;
                    $scope.isProcessing = true;

                    $scope.networkSet.name = $scope.networkSet.networkSetName;

                    ndexService.createNetworkSetV2($scope.networkSet,
                        function(url){
                            if (url) {
                                //var networkSetId = url.split('/').pop();
                                modalInstance.close();

                                $scope.myAccountController.getAllNetworkSetsOwnedByUser(
                                    // success handler
                                    function(newNetworkSet) {

                                        if ($scope.signalNewSetCreation) {
                                            $rootScope.$emit('NEW_NETWORK_SET_CREATED');
                                        };
                                        if ($scope.myAccountController.addNetworkSetToTable) {
                                            $scope.myAccountController.addNetworkSetToTable(newNetworkSet);
                                        };
                                        if (($scope.myAccountController.networkSets.length == 1) &&
                                            ($scope.myAccountController.networkSearchResults) &&
                                            ($scope.myAccountController.networkSearchResults.length == 0)) {
                                            // we are on My Account page and there is only one set there that we
                                            // just created; referesh the whole page to prevent Network Table deformation
                                            $route.reload();
                                        };
                                        $scope.isProcessing = false;
                                    },
                                    function(data, status) {
                                        //$scope.main.serverIsDown = true;
                                        $scope.isProcessing = false;
                                    });
                            };
                        },
                        function(error){
                            if (error.data.errorCode == "NDEx_Duplicate_Object_Exception") {
                                $scope.errors = "Network Set with name " + $scope.networkSet.networkSetName + " already exists.";
                            } else {
                                $scope.errors = error.data.message;
                            }
                            $scope.isProcessing = false;
                        });

                };
            }
        }
    });

    uiServiceApp.directive('triggerEditNetworkSetModal', function() {
        return {
            scope: {
                networkSetController: '=',
            },
            restrict: 'A',
            templateUrl: 'pages/directives/editNetworkSetModal.html',
            controller: function($scope, $attrs, $modal, $location, ndexService) {
                var modalInstance;

                //$scope.networkSet = {};
                $scope.text  = $attrs.triggerEditNetworkSetModal;
                $scope.title = $attrs.triggerEditNetworkSetModal;

                var networkSetId = $scope.networkSetController.identifier;

                $scope.openMe = function() {
                    $scope.networkSet = {};

                    $scope.networkSet['name']        = $scope.networkSetController.displayedSet.name;
                    $scope.networkSet['description'] = $scope.networkSetController.displayedSet.description;
                    $scope.networkSet['properties']  = {reference: ""};

                    if ($scope.networkSetController.displayedSet['properties'] &&
                        $scope.networkSetController.displayedSet['properties']['reference']) {
                        
                        $scope.networkSet['properties']['reference'] =
                            $scope.networkSetController.displayedSet['properties']['reference'];
                    };

                    modalInstance = $modal.open({
                        templateUrl: 'edit-network-set.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    modalInstance.dismiss();
                    delete $scope.errors;
                    $scope.networkSet = {};
                    $scope.isProcessing = false;
                };

                $scope.isProcessing = false;

                $scope.submit = function() {
                    if ($scope.isProcessing)
                        return;
                    $scope.isProcessing = true;

                    ndexService.updateNetworkSetV2(networkSetId, $scope.networkSet,
                        function(data, status, headers, config, statusText){
                            // success; update name and description in controller
                            $scope.networkSetController.displayedSet.name = $scope.networkSet['name'];
                            $scope.networkSetController.displayedSet.description = $scope.networkSet['description'];
                            $scope.networkSetController.displayedSet['properties'] =
                                    {reference: $scope.networkSet['properties']['reference']};

                            ndexService.getNetworkSetV2(networkSetId,
                                function (networkSetInformation) {
                                    var networkUUIDs = networkSetInformation["networks"];
                                    $scope.networkSetController.displayedSet['modificationTime'] = networkSetInformation['modificationTime'];

                                },
                                function (error) {
                                    ;
                                });
                            $scope.cancel();
                        },
                        function(error){
                            if (error.data.errorCode == "NDEx_Duplicate_Object_Exception") {
                                $scope.errors = "Network Set with name " + $scope.networkSet.networkSetName + " already exists.";
                            } else {
                                $scope.errors = error.data.message;
                            }
                            $scope.isProcessing = false;
                        });
                };
            }
        }
    });


    /*
    uiServiceApp.directive('triggerDeleteNetworkSetModal', function() {
        return {
            scope: {
                networkSetController: '=',
            },
            restrict: 'A',
            templateUrl: 'pages/directives/editNetworkSetModal.html',
            controller: function($scope, $attrs, $modal, $location, ndexService) {
                var modalInstance;

                //$scope.networkSet = {};
                $scope.text  = $attrs.triggerEditNetworkSetModal;
                $scope.title = $attrs.triggerEditNetworkSetModal;

                var networkSetId = $scope.networkSetController.identifier;

                $scope.openMe = function() {
                    $scope.networkSet = {};

                    $scope.networkSet['name']        = $scope.networkSetController.displayedSet.name;
                    $scope.networkSet['description'] = $scope.networkSetController.displayedSet.description;

                    modalInstance = $modal.open({
                        templateUrl: 'edit-network-set.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    modalInstance.dismiss();
                    delete $scope.errors;
                    $scope.networkSet = {};
                    $scope.isProcessing = false;
                };

                $scope.isProcessing = false;

                $scope.submit = function() {
                    if ($scope.isProcessing)
                        return;
                    $scope.isProcessing = true;

                    ndexService.updateNetworkSetV2(networkSetId, $scope.networkSet,
                        function(data){
                            // success; update name and description in controller
                            $scope.networkSetController.displayedSet.name = $scope.networkSet['name'];
                            $scope.networkSetController.displayedSet.description = $scope.networkSet['description'];

                            $scope.cancel();
                        },
                        function(error){
                            if (error.data.errorCode == "NDEx_Duplicate_Object_Exception") {
                                $scope.errors = "Network Set with name " + $scope.networkSet.networkSetName + " already exists.";
                            } else {
                                $scope.errors = error.data.message;
                            }
                            $scope.isProcessing = false;
                        });
                };
            }
        }
    });
    */

    //----------------------------------------------------
    //              Elements

    uiServiceApp.directive('ndexAccountImage', function() {
        return {
            scope: {
                ndexSrc:'=',
                ndexClass: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/accountImage.html'
            /*
            link: function($attrs) {
                if (!$attrs.ndexSrc) $attrs.ndexSrc = 'img/no-pic.jpg';
            }
            */
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
                    ndexService.updateUserV2($scope.user,
                        function(userData){
                            $scope.isProcessing = false;
                            var userId = $scope.user.externalId;
                            //$scope.ndexData.firstName = $scope.user.firstName;
                            //$scope.ndexData.lastName = $scope.user.lastName;
                            //$scope.ndexData.website = $scope.user.website;
                            //$scope.ndexData.description = $scope.user.description;
                            //$scope.ndexData.image = $scope.user.image;
                            $scope.user = {};
                            modalInstance.close();
                            $location.path('/user/' + userId);
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
                    delete $scope.errors;
                    modalInstance = null;
                };

                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;
                    ndexService.updateGroupV2($scope.group,
                        function(group){
                            var groupId = $scope.group.externalId;
                            $scope.group = {};
                            modalInstance.close();
                            $location.path('/group/' + groupId);
                            $route.reload();
                            $scope.isProcessing = false;
                        },
                        function(error){
                            $scope.errors = error.message;
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

    // present user with the list of Network Collection 
    //      
    //      
    uiServiceApp.directive('showNetworkSetsModal', function() {
        return {
            scope: {
                myAccountController: '='
            },
            restrict: 'E',
            templateUrl: 'pages/directives/showNetworkSetsModal.html',
            transclude: true,
            controller: function($scope, $attrs, $modal, $location, ndexService, $route, $rootScope) {
                var modalInstance;
                $scope.errors = null;

                $scope.loadTheseSets = [];

                $scope.openMe = function() {

                    initializeListOfCollections();

                    modalInstance = $modal.open({
                        templateUrl: 'show-network-sets-modal.html',
                        scope: $scope
                    });
                };

                var initializeListOfCollections = function() {
                    var networkSets = $scope.myAccountController.networkSets;
                    $scope.loadTheseSets = [];

                    _.forEach(networkSets, function(networkSetObj) {
                        var networkSet = {
                            "id"   : networkSetObj.externalId,
                            "name" :  networkSetObj.name,
                            "description" : networkSetObj.description,
                            "selected": false
                        };

                        $scope.loadTheseSets.push(networkSet);
                    });
                };

                $scope.closeModal = function() {
                    delete $scope.errors;
                    delete $scope.progress;
                    modalInstance.close();
                    modalInstance = null;
                    $scope.isProcessing = false;
                };

                $scope.noSetsSelected = function() {
                    return 0 == getNoOfSelectedSets();
                };

                var getNoOfSelectedSets = function() {
                    var noOfSelectedSets = 0;

                    _.forEach($scope.loadTheseSets, function(setObj) {
                        if (setObj.selected) {
                            noOfSelectedSets = noOfSelectedSets + 1;
                        };
                    });
                    return noOfSelectedSets;
                };

                $scope.submit = function() {
                    if ($scope.isProcessing)
                        return;
                    $scope.isProcessing = true;

                    var idsOfSelectedNetworks = $scope.myAccountController.getIDsOfSelectedNetworks();
                    var noOfSelectedSets = getNoOfSelectedSets();
                    var noOfUpdatedSets = 0;

                    if ($scope.noOfSelectedSets == 0) {
                        $scope.closeModal();
                    };
                    
                    _.forEach($scope.loadTheseSets, function(networkSetObj) {

                        if (networkSetObj.selected) {

                            $scope.progress = "<br>Adding networks to network set " + networkSetObj.name;

                            ndexService.addNetworksToNetworkSetV2(networkSetObj.id, idsOfSelectedNetworks,
                                function(data){

                                    noOfUpdatedSets = noOfUpdatedSets + 1;
                                    
                                    if (noOfSelectedSets == noOfUpdatedSets) {
                                        $scope.myAccountController.getAllNetworkSetsOwnedByUser(
                                            // success handler
                                            function(data) {
                                                $scope.isProcessing = false;
                                            },
                                            function(data, status) {
                                                $scope.isProcessing = false;
                                            });

                                        initializeListOfCollections();
                                        $scope.closeModal();
                                    };
                                },
                                function(error){
                                    noOfUpdatedSets = noOfUpdatedSets + 1;

                                    if (noOfSelectedSets == noOfUpdatedSets) {
                                        $scope.myAccountController.getAllNetworkSetsOwnedByUser(
                                            // success handler
                                            function(data) {
                                                $scope.isProcessing = false;
                                            },
                                            function(data, status) {
                                                //$scope.main.serverIsDown = true;
                                                $scope.isProcessing = false;
                                            });
                                        $scope.closeModal();
                                    };
                                    
                                    $scope.errors = error.message;
                                });
                        };
                    });

                };

                $rootScope.$on('NEW_NETWORK_SET_CREATED', function () {

                    var addedNetworkSet = _.orderBy($scope.myAccountController.networkSets,
                        ['modificationTime','name'], ['desc', 'asc'])[0];

                    if (addedNetworkSet) {
                        var networkSet = {
                            "id": addedNetworkSet.externalId,
                            "name": addedNetworkSet.name,
                            "description": addedNetworkSet.description,
                            "selected": true
                        };
                        $scope.loadTheseSets.unshift(networkSet);
                    };
                });
                
            }
        };
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
                            ndexService.searchUsersV2(query.searchString, 0, 5,
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
                    ndexService.deleteRequestV2($scope.request,
                        function(data) {
                            modalInstance.close();

                            var userController = $scope.userController;
                            userController.refreshRequests();
                        },
                        function(error){
                            console.log("unable to delete request");
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
                    delete $scope.request.error;
                };

                $scope.accept = function() {

                    var type = ($scope.request.requestType.toLowerCase() == "usernetworkaccess") ? "user" : "group";

                    if (type == 'user') {

                        var networkId     = $scope.request.destinationUUID;
                        var userOrGroupId = $scope.request.sourceUUID;

                        var permission = $scope.request.permission

                        ndexService.updateNetworkPermissionV2(networkId, type, userOrGroupId, permission,
                            function (data) {

                                var recipientId = $scope.userController.identifier;
                                var requestId = $scope.request.externalId;
                                var action = "accept";
                                var message = $scope.request.responseMessage;

                                ndexService.acceptOrDenyPermissionRequestV2(recipientId, requestId, action, message,
                                    function (data) {
                                        modalInstance.close();
                                        $scope.userController.refreshRequests();
                                    },
                                    function (error) {
                                        console.log("unable to accept network permission request");
                                    });
                            },
                            function (error) {
                                if (error && error.message) {
                                    $scope.request.error = error.message;
                                }
                            });

                    } else {

                        var groupId = $scope.request.destinationUUID;
                        var requesterId = $scope.request.requesterId;
                        var permission = $scope.request.permission;

                        ndexService.addOrUpdateGroupMemberV2(groupId, requesterId, permission,
                            function(success) {

                                var recipientId = $scope.userController.identifier;
                                var requestId = $scope.request.externalId;
                                var action = "accept";
                                var message = $scope.request.responseMessage;

                                ndexService.acceptOrDenyMembershipRequestV2(recipientId, requestId, action, message,
                                    function (data) {
                                        modalInstance.close();
                                        $scope.userController.refreshRequests();
                                    },
                                    function (error) {
                                        if (error && error.message) {
                                            $scope.request.error = error.message;
                                        }
                                    });
                            },
                            function(error){
                                if (error && error.message) {
                                    $scope.request.error = error.message;
                                }
                            });
                    }
                };

                $scope.decline = function() {

                    var type = ($scope.request.requestType.toLowerCase() == "usernetworkaccess") ? "user" : "group";

                    if (type == 'user') {

                        var recipientId = $scope.userController.identifier;
                        var requestId   = $scope.request.externalId;
                        var action      = "deny";
                        var message     = $scope.request.responseMessage;

                        ndexService.acceptOrDenyPermissionRequestV2(recipientId, requestId, action, message,
                            function (data) {
                                modalInstance.close();
                                $scope.userController.refreshRequests();
                            },
                            function (error) {
                                if (error && error.message) {
                                    $scope.request.error = error.message;
                                }
                            });

                    } else {

                        var recipientId = $scope.userController.identifier;
                        var requestId = $scope.request.externalId;
                        var action = "deny";
                        var message = $scope.request.responseMessage;

                        ndexService.acceptOrDenyMembershipRequestV2(recipientId, requestId, action, message,
                            function (data) {
                                modalInstance.close();
                                $scope.userController.refreshRequests();
                            },
                            function (error) {
                                if (error && error.message) {
                                    $scope.request.error = error.message;
                                }
                            });
                    }
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
                            $scope.request.groupName = $scope.$parent.ndexData.groupName;
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

                                ndexService.createMembershipRequestV2($scope.request,
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
                $scope.selected = {};
                $scope.selected.account = undefined;

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

                    var requestType =  $scope.selected.account.accountType;

                    if (requestType == 'user') {

                        // Create a request to ask a network permission for the authenticated user.
                        var userPermissionRequest = {
                            "networkid"  : $scope.request.destinationUUID,
                            "permission" : $scope.request.permission,
                            "message"    : $scope.request.message,
                        }
                        var userUUID = $scope.selected.account.externalId;

                        ndexService.createUserPermissionRequestV2(userUUID, userPermissionRequest,
                            function(data) {
                                $scope.close();
                            },
                            function(error) {
                                console.log("unable to send network permission request for the authenticated user");
                                $scope.close();
                            })

                    } else if (requestType == 'group') {

                        // Create a request to ask a network permission for a group.
                        var groupPermissionRequest = {
                            "networkid"  : $scope.request.destinationUUID,
                            "permission" : $scope.request.permission,
                            "message"    : $scope.request.message,
                        }
                        var groupUUID = $scope.selected.account.externalId;

                        ndexService.createGroupPermissionRequestV2(groupUUID, groupPermissionRequest,
                            function(data) {
                                $scope.close();
                            },
                            function(error) {
                                console.log("unable to send network permission request for the group");
                                $scope.close();
                            })
                    }
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

                    $scope.request.sourceName = ndexUtility.getLoggedInUserFirstAndLastNames();
                    $scope.request.sourceUUID = ndexUtility.getLoggedInUserExternalId();

                    $scope.request.accountType = undefined;

                    $scope.modal.permissionLabel = ($scope.privileges == 'None') ? 'Can read' : 'Can edit';

                    $scope.selected.account = undefined;

                    //if( $scope.privileges == 'Edit' )
                    //    $scope.modal.permissionLabel ='Is admin';

                    ndexService.getUserGroupMembershipsV2(ndexUtility.getLoggedInUserExternalId(), 'GROUPADMIN', 0, 1000000,
                        function (userMembershipsMap) {

                            var groupsUUIDs = Object.keys(userMembershipsMap);

                            ndexService.getGroupsByUUIDsV2(groupsUUIDs)
                                .success(
                                    function (groupList) {

                                        for(var i=0; i < groupList.length; i++) {
                                            var groupAccount = groupList[i];
                                            groupAccount['accountType'] = 'group';
                                            $scope.accounts.push(groupAccount);
                                        }
                                        var currentUserAccount = {
                                            accountType: 'user',
                                            userName: ndexUtility.getLoggedInUserFirstAndLastNames(),
                                            externalId: ndexUtility.getLoggedInUserExternalId()
                                        }
                                        $scope.accounts.push(currentUserAccount);
                                        $scope.selected.account = currentUserAccount;
                                    })
                                .error(
                                    function(error) {
                                        console.log("unable to get groups by UUIDs");
                                    }
                                )
                        },
                        function (error, data) {
                            console.log("unable to get user group memberships");
                        });
                }
            }
        }
    });


    // modal to request access to network
    uiServiceApp.directive('bulkCreateRequestNetwork', function() {
        return {
            scope: {
                ndexData: '=',
                privileges: '@privileges'
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/createRequestNetwork.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility, ndexNavigation) {
                var modalInstance;
                $scope.errors = null;
                $scope.request = {};
                $scope.modal = {};
                $scope.accounts = [];
                $scope.selected = {};
                $scope.selected.account = undefined;
                $scope.selectedNetworks = [];
                $scope.loggedInUserPermissions = undefined;

                $scope.openMe = function() {
                    $scope.selectedNetworks = $scope.ndexData.getUUIDsOfNetworksForSendingPermissionRequests();
                    $scope.getLoggedInUserPermissions();
                    intialize();

                    if (($scope.privileges == 'Write') || ($scope.privileges == 'Admin')) {
                        var title = "You Already Have Maximum Permission Level";
                        var message =
                            "You already have the highest permission level available.";
                        ndexNavigation.genericInfoModal(title, message);

                    } else {

                        modalInstance = $modal.open({
                            templateUrl: 'create-request-network-modal.html',
                            scope: $scope,
                            backdrop: 'static'
                        });
                    }
                };

                $scope.getLoggedInUserPermissions = function() {
                    var permissionsStats = {
                        'NONE' : 0,
                        'READ' : 0,
                        'WRITE' : 0,
                        'ADMIN' : 0
                    };

                    $scope.selectedNetworks.forEach( function (selectedNetwork)
                    {
                        var permission = selectedNetwork['loggedInUserPermission'];
                        permissionsStats[permission] = permissionsStats[permission] + 1;
                    });
                    $scope.loggedInUserPermissions = permissionsStats;

                }

                $scope.close = function() {
                    modalInstance.close();
                    $scope.request = {};
                };

                $scope.submitRequest = function() {

                    if($scope.modal.permissionLabel == 'Can edit')
                        $scope.request.permission = 'WRITE';
                    if($scope.modal.permissionLabel == 'Can read')
                        $scope.request.permission = 'READ';

                    var requestType =  $scope.selected.account.accountType;

                    var selectedNetworks = $scope.selectedNetworks;

                    for (var i = 0; i < selectedNetworks.length; i++) {
                        var networkUUID = selectedNetworks[i]['networkUUID'];
                        var loggedInUserPermission = selectedNetworks[i]['loggedInUserPermission'];

                        if ( (($scope.request.permission == 'READ')  && (['READ', 'WRITE'].indexOf(loggedInUserPermission) > -1)) ||
                             (($scope.request.permission == 'WRITE') && (loggedInUserPermission == 'WRITE')) )
                        {
                            // no need to send permission request since logged in user already has the same or
                            // higher permission
                            continue;
                        };

                        if (requestType == 'user') {

                            // Create a request to ask a network permission for the authenticated user.
                            var userPermissionRequest = {
                                "networkid": networkUUID,
                                "permission": $scope.request.permission,
                                "message": $scope.request.message,
                            }

                            var userUUID = $scope.selected.account.externalId;

                            $scope.request.progress = "Sending " + $scope.request.permission +
                                " permission request for network " + selectedNetworks[i]['name'];

                            ndexService.createUserPermissionRequestV2(userUUID, userPermissionRequest,
                                function(data) {
                                    //$scope.close();
                                },
                                function(error) {
                                    console.log("unable to send network permission request for the authenticated user");
                                    //$scope.close();
                                })


                        } else if (requestType == 'group') {

                            // Create a request to ask a network permission for a group.
                            var groupPermissionRequest = {
                                "networkid": networkUUID,
                                "permission": $scope.request.permission,
                                "message": $scope.request.message,
                            }
                            var groupUUID = $scope.selected.account.externalId;

                            $scope.request.progress = "Sending " + $scope.request.permission +
                                " permission request for network " + selectedNetworks[i]['name'];

                            ndexService.createGroupPermissionRequestV2(groupUUID, groupPermissionRequest,
                                function(data) {
                                    //$scope.close();
                                },
                                function(error) {
                                    console.log("unable to send network permission request for the group");
                                    //$scope.close();
                                })
                        }
                    }
                    $scope.close();
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

                    $scope.request.destinationName = "selected networks";
                    $scope.request.destinationUUID = $scope.ndexData.externalId;

                    $scope.request.sourceName = ndexUtility.getLoggedInUserFirstAndLastNames();
                    $scope.request.sourceUUID = ndexUtility.getLoggedInUserExternalId();

                    $scope.request.accountType = undefined;
                    
                    if ($scope.loggedInUserPermissions['NONE'] > 0) {
                        $scope.privileges = 'None';
                    } else if ($scope.loggedInUserPermissions['READ'] > 0) {
                        $scope.privileges = 'Read';
                    } else if ($scope.loggedInUserPermissions['WRITE'] > 0) {
                        $scope.privileges = 'Write';
                    } else if ($scope.loggedInUserPermissions['ADMIN'] > 0) {
                        $scope.privileges = 'Admin';
                    }

                    $scope.modal.permissionLabel = ($scope.privileges == 'None') ? 'Can read' : 'Can edit';

                    $scope.selected.account = undefined;

                    //if( $scope.privileges == 'Edit' )
                    //    $scope.modal.permissionLabel ='Is admin';

                    ndexService.getUserGroupMembershipsV2(ndexUtility.getLoggedInUserExternalId(), 'GROUPADMIN', 0, 1000000,
                        function (userMembershipsMap) {

                            var groupsUUIDs = Object.keys(userMembershipsMap);

                            ndexService.getGroupsByUUIDsV2(groupsUUIDs)
                                .success(
                                    function (groupList) {

                                        for(var i=0; i < groupList.length; i++) {
                                            var groupAccount = groupList[i];
                                            groupAccount['accountType'] = 'group';
                                            $scope.accounts.push(groupAccount);
                                        }
                                        var currentUserAccount = {
                                            accountType: 'user',
                                            userName: ndexUtility.getLoggedInUserFirstAndLastNames(),
                                            externalId: ndexUtility.getLoggedInUserExternalId()
                                        }
                                        $scope.accounts.push(currentUserAccount);
                                        $scope.selected.account = currentUserAccount;
                                    })
                                .error(
                                    function(error) {
                                        console.log("unable to get groups by UUIDs");
                                    }
                                )
                        },
                        function (error, data) {
                            console.log("unable to get user group memberships");
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
                //userController: '='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/exportNetwork.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility)
            {
                var modalInstance;
                $scope.errors = null;
                $scope.modal = {};
                $scope.title = 'Export Network';
                $scope.exportButtonLabel = "Export Network";

                $scope.openMe = function() {
                    
                    $scope.exporters = _.filter($scope.$root.ImporterExporters, 'exporter');

                    $scope.networkExporterName =
                        ($scope.exporters && $scope.exporters[0] && $scope.exporters[0].name) ?
                        $scope.exporters[0].name : "No Exporters Available";

                    $scope.selectedExporter =
                        ($scope.exporters && $scope.exporters[0]) ?
                            $scope.exporters[0] : "No Exporters Available";

                    $scope.description = ($scope.exporters && $scope.exporters[0] && $scope.exporters[0].description) ?
                        $scope.exporters[0].description : "No description available for this export format.";

                    modalInstance = $modal.open({
                        templateUrl: 'export-network-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.exporterSelected = function (selectedExporter) {
                    $scope.networkExporterName = selectedExporter.name;
                    $scope.description = (selectedExporter.description) ?
                        selectedExporter.description : "No description available for this export format.";
                    $scope.selectedExporter = selectedExporter;
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

                    var networkExporterName = $scope.networkExporterName;
                    var networkUUIDsList = [];
                    networkUUIDsList.push($scope.externalId);

                    ndexService.exportNetworksV2(networkExporterName, networkUUIDsList,
                        function(data) {
                            ///console.log(data);
                            $scope.isProcessing = false;
                            //var userController = $scope.userController;
                            //userController.refreshTasks();
                            modalInstance.close();
                        },
                        function(error) {
                            //console.log(error);
                            $scope.isProcessing = false;
                            //var userController = $scope.userController;
                            //userController.refreshTasks();
                            modalInstance.close();
                        });

                };

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
            //templateUrl: 'pages/directives/exportNetwork.html',
            controller: function($scope, $modal, $route, ndexService, ndexUtility)
            {
                var modalInstance;
                $scope.errors = null;
                $scope.modal = {};
                $scope.title = 'Export Selected Networks';
                $scope.exportButtonLabel = "Export Networks";

                $scope.openMe = function() {
                    $scope.exporters = _.filter($scope.$root.ImporterExporters, 'exporter');

                    $scope.networkExporterName =
                        ($scope.exporters && $scope.exporters[0] && $scope.exporters[0].name) ?
                            $scope.exporters[0].name : "No Exporters Available";

                    $scope.selectedExporter =
                        ($scope.exporters && $scope.exporters[0]) ?
                            $scope.exporters[0] : "No Exporters Available";

                    $scope.description = ($scope.exporters && $scope.exporters[0] && $scope.exporters[0].description) ?
                        $scope.exporters[0].description : "No description available for this export format.";

                    modalInstance = $modal.open({
                        templateUrl: 'bulk-export-network-modal.html',
                        //templateUrl: 'export-network-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                    
                };

                $scope.exporterSelected = function (selectedExporter) {
                    $scope.networkExporterName = selectedExporter.name;
                    $scope.description = (selectedExporter.description) ?
                        selectedExporter.description : "No description available for this export format.";
                    $scope.selectedExporter = selectedExporter;
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

                    // get reference to myAccountController or userController
                    // accountController is either myAccountController or userController
                    var accountController = $scope.ndexData;

                    // get IDs of networks to be exported
                    var networkUUIDsList = accountController.getIDsOfSelectedNetworks();

                    var networkExporterName = $scope.networkExporterName;


                    ndexService.exportNetworksV2(networkExporterName, networkUUIDsList,
                        function(data) {
                            ///console.log(data);
                            $scope.isProcessing = false;
                            if (accountController.refreshTasks) {
                                accountController.refreshTasks();
                            }
                            modalInstance.close();
                        },
                        function(error) {
                            //console.log(error);
                            $scope.isProcessing = false;
                            if (accountController.refreshTasks) {
                                accountController.refreshTasks();
                            }
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
                ndexData: '=',
                subNetworkId: "="
            },
            restrict: 'E',
            templateUrl: 'pages/directives/editNetworkSummaryModal.html',
            transclude: true,
            controller: function($scope, $modal, ndexService, $route, ndexNavigation, sharedProperties) {
                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                $scope.openMe = function() {

                    $scope.network.name = $scope.ndexData.name;
                    $scope.network.description = $scope.ndexData.description;
                    $scope.network.reference = $scope.ndexData.reference;
                    $scope.network.version = $scope.ndexData.version;
                    $scope.network.visibility = $scope.ndexData.visibility;

                    var networkOwnerUUID = $scope.ndexData.ownerUUID;
                    var loggedInUserUUID = sharedProperties.getCurrentUserId();
                    $scope.network.isOwner = (networkOwnerUUID == loggedInUserUUID);

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

                    // check if reference was modified
                    var updateReference = ($scope.network.reference !== $scope.ndexData.reference);

                    // check if visibility was modified
                    var updateVisibility =
                        $scope.network.isOwner && ($scope.network.visibility !== $scope.ndexData.visibility);

                    // check if any ob network summary fields was modified
                    var updateNetworkSummary =
                        ( ($scope.network.name !== $scope.ndexData.name) ||
                          ($scope.network.description !== $scope.ndexData.description) ||
                          ($scope.network.version !== $scope.ndexData.version)
                        )  ? true : false;


                    if (updateVisibility) {

                        ndexService.setNetworkSystemPropertiesV2($scope.ndexData.externalId,
                            "visibility", $scope.network.visibility,

                            function (data, networkId, property, value) {

                                if (($scope.ndexData.visibility.toUpperCase() == 'PRIVATE') &&
                                    ($scope.network.visibility.toUpperCase() == 'PUBLIC') ) {

                                    ndexService.setNetworkSystemPropertiesV2(networkId, "showcase", true,
                                        function (data, networkId, property, value) {
                                            var title = "This Network is Now Public and Showcased";
                                            var message =
                                                "This network is now public and showcased on your account page. " +
                                                "You can decide to disable the showcase feature for this network " +
                                                "by clicking the corresponding eye icon on your My Account page.";
                                            ndexNavigation.genericInfoModal(title, message);
                                        },
                                        function (error, networkId, property, value) {
                                            console.log("unable to change showcase for Network with Id " + networkId);
                                        })

                                } else {

                                    ndexService.setNetworkSystemPropertiesV2(networkId, "showcase", false,
                                        function (data, networkId, property, value) {
                                            ;
                                        },
                                        function (error, networkId, property, value) {
                                            console.log("unable to change showcase for Network with Id " + networkId);
                                        })
                                }

                                $scope.ndexData.visibility = $scope.network.visibility;
                            },
                            function (error, networkId, property, value) {
                                console.log("unable to update Network Visibility for Network with Id " + networkId);
                            });
                    }

                    var propertyList = $scope.ndexData.properties;
                    var needUpdateProperties = false;

                    var upsertProperty = function (propertyName, propertyValue) {
                        var newProp = {
                            "predicateString" : propertyName,
                            "value"           : propertyValue,
                            "dataType"        : "string",
                            "subNetworkId"    : $scope.subNetworkId
                        };

                        for (var i = 0; i < propertyList.length; i++) {
                            var property = propertyList[i];
                            if (property.subNetworkId == $scope.subNetworkId &&
                                   property.predicateString && property.predicateString.toLowerCase() == propertyName.toLowerCase()) {
                                propertyList.splice(i, 1);
                                break;
                            };
                        };

                        propertyList.push(newProp);
                    };

                    if (updateNetworkSummary) {
                       if ($scope.subNetworkId == null) {  // not from cytoscape.

                           ndexService.updateNetworkProfileV2($scope.ndexData.externalId, $scope.network,
                               function (data) {
                                   $scope.ndexData.name = $scope.network.name;
                                   $scope.ndexData.description = $scope.network.description;
                                   $scope.ndexData.version = $scope.network.version;
                               },
                               function (error) {
                                   console.log("unable to update Network Summary");
                               })
                       } else { // current edit is on a subnetwork
                            if ($scope.network.name !== $scope.ndexData.name) {
                                upsertProperty("name", $scope.network.name);
                                needUpdateProperties = true;
                                ndexService.updateNetworkProfileV2($scope.ndexData.externalId, {"name" : $scope.network.name},
                                    function (data) {
                                        $scope.ndexData.name = $scope.network.name;
                                    },
                                    function (error) {
                                        console.log("unable to update Network Summary");
                                    });
                            }

                            if ($scope.network.description !== $scope.ndexData.description) {
                                upsertProperty("description", $scope.network.description);
                                needUpdateProperties = true;
                                $scope.ndexData.description = $scope.network.description;

                            }

                            if ($scope.network.version !== $scope.ndexData.version ) {
                                upsertProperty("version", $scope.network.version);
                                needUpdateProperties = true;
                                $scope.ndexData.version = $scope.network.version;

                            }
                       }

                    }

                    if (updateReference) {
                        upsertProperty("reference", $scope.network.reference)
                        needUpdateProperties = true;
                        $scope.ndexData.reference = $scope.network.reference;
                    }

                    // do an update here
                    if (needUpdateProperties) {
                        ndexService.setNetworkPropertiesV2($scope.ndexData.externalId, propertyList,
                            function (data) {
                            },
                            function (error) {
                                console.log("unable to update Network properites");
                            });
                    }

                    modalInstance.close();
                    modalInstance = null;
                    $scope.isProcessing = false;
                };
            }
        }
    });


    // modal to show network reference
    uiServiceApp.directive('showNetworkReference', function() {
        return {
            scope: {
                reference: '=',
                action: '@directiveAction',
                title:  '@directiveTitle',
                text:   '@directiveDescription'
            },
            restrict: 'E',
            templateUrl: 'pages/directives/showNetworkReferenceModal.html',
            transclude: true,
            
            controller: function($scope, $modal) {

                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                $scope.openMe = function() {

                    $scope.network = {};
                    $scope.network.reference = $scope.reference;

                    modalInstance = $modal.open({
                        templateUrl: 'show-network-reference-modal.html',
                        scope: $scope
                    });
                };

                $scope.close = function() {
                    modalInstance.close();
                    modalInstance = null;
                    $scope.network = {};
                };

            }
        }
    });


    // modal for modifying in bulk Network Property (Description, Reference or Version)
    uiServiceApp.directive('bulkChangeNetworkProperty', function() {
        return {
            scope: {
                ndexData: '=',
                title:  '@directiveTitle',
                action: '@directiveAction',
                text:   '@directiveDescription',
                label:  '@directiveLabel'
            },

            restrict: 'E',
            templateUrl: 'pages/directives/bulkEditNetworkPropertyModal.html',
            transclude: true,
            controller: function($scope, $modal, ndexService, uiMisc) {

                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                var updatedNetworksCounter = 0;

                $scope.openMe = function() {

                    $scope.network = {};

                    // the following properties should be set to "", not to null; null
                    // doesn't work correctly in case you enter an empty bulk value -- it is
                    // replaced by string that starts with "\n" and followed by some spaces,
                    // like "\n      "
                    $scope.network.description = "";
                    $scope.network.version = "";
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

                    $scope.network.submitButtonLabel = $scope.label;

                    modalInstance = $modal.open({
                        templateUrl: 'bulk-edit-network-property-modal.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    $scope.isProcessing = false;
                    modalInstance.close();
                    modalInstance = null;
                    $scope.network = {};
                };

                $scope.getIndexOfReference = function(properties) {
                    var index = properties.length;

                    for (var i = 0; i < properties.length; i++) {

                        if (properties[i].predicateString &&
                            properties[i].predicateString.toLowerCase() === 'reference') {

                            return i;
                        };
                    };

                    return index;
                };


                var upsertProperty = function (propertyName, propertyValue, propertyList, subNetworkId) {
                    var newProp = {
                        "predicateString" : propertyName,
                        "value"           : propertyValue,
                        "dataType"        : "string",
                        "subNetworkId"    : subNetworkId
                    };

                    for (var i = 0; i < propertyList.length; i++) {
                        var property = propertyList[i];
                        if (property.predicateString && property.predicateString.toLowerCase() == propertyName.toLowerCase())
                        {
                            if ((property["subNetworkId"] && property["subNetworkId"] == subNetworkId) ||
                                (!property["subNetworkId"] || property["subNetworkId"] == null) && (!subNetworkId || subNetworkId == null)) {
                                propertyList.splice(i, 1);
                                break;
                            };
                        };
                    };

                    propertyList.push(newProp);
                };

                var getNetworkSummary = function(networkUUID) {
                    //var networkSummary = _.find($scope.ndexData.networkSearchResults, {externalId: networkUUID});
                    //return (networkSummary && networkSummary.properties) ? networkSummary.properties : [];
                    return _.find($scope.ndexData.networkSearchResults, {externalId: networkUUID});
                };

                var incrementUpdatedNetworksCounter = function(IdsOfSelectedNetworks) {

                    updatedNetworksCounter = updatedNetworksCounter + 1;

                    if (IdsOfSelectedNetworks.length == updatedNetworksCounter) {
                        $scope.isProcessing = false;
                        modalInstance.close();
                    };
                };


                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    var myAccountController = $scope.ndexData;
                    var IdsOfSelectedNetworks = myAccountController.getIDsOfSelectedNetworks();
                    var operation = $scope.action;

                    var data;

                    if (operation == "description") {
                        data = $scope.network.description;

                    } else if (operation == "reference") {
                        data = $scope.network.reference;

                    } else {
                        data = $scope.network.version;
                    };

                    
                    _.forEach (IdsOfSelectedNetworks, function(networkId) {

                        var networkSummary = getNetworkSummary(networkId);

                        var subNetworkId = uiMisc.getSubNetworkId(networkSummary);

                        if ("description" == operation || "version" == operation) {

                            var summary = {};
                            summary["name"] = networkSummary["name"];
                            summary["description"] = (operation == "description") ? data : networkSummary["description"];
                            summary["version"] = (operation == "version") ? data : networkSummary["version"];

                            ndexService.updateNetworkProfileV2(networkId, summary,
                                function (successData) {

                                    if (subNetworkId != null) {

                                        var properties = (networkSummary && networkSummary['properties']) ?
                                            networkSummary['properties'] : [];

                                        upsertProperty(operation, data, properties, subNetworkId);

                                        ndexService.setNetworkPropertiesV2(networkId, properties,
                                            function (data) {
                                                incrementUpdatedNetworksCounter(IdsOfSelectedNetworks);
                                            },
                                            function (error) {
                                                incrementUpdatedNetworksCounter(IdsOfSelectedNetworks);
                                                console.log("unable to update Network properites");
                                            });
                                    } else {
                                        incrementUpdatedNetworksCounter(IdsOfSelectedNetworks);
                                    };

                                },
                                function (error) {
                                    incrementUpdatedNetworksCounter(IdsOfSelectedNetworks);
                                    console.log("unable to update Network Summary");
                                });

                        } else if ("reference" == operation) {

                            var properties = (networkSummary && networkSummary['properties']) ?
                                networkSummary['properties'] : [];

                            upsertProperty(operation, data, properties, subNetworkId);

                            ndexService.setNetworkPropertiesV2(networkId, properties,
                                function (data) {
                                    incrementUpdatedNetworksCounter(IdsOfSelectedNetworks);
                                },
                                function (error) {
                                    incrementUpdatedNetworksCounter(IdsOfSelectedNetworks);
                                    console.log("unable to update Network properites");
                                });
                        };

                    });
                };
            }
        }
    });

    // modal for modifying in bulk Network System Property (Visibility or Read-Only Flag)
    uiServiceApp.directive('bulkChangeNetworkSystemProperty', function() {
        return {
            scope: {
                ndexData: '=',
                title:  '@directiveTitle',
                action: '@directiveAction',
                text:   '@directiveDescription',
                label:  '@directiveLabel'
            },

            restrict: 'E',
            templateUrl: 'pages/directives/bulkEditNetworkPropertyModal.html',
            transclude: true,
            controller: function($scope, $modal, ndexService, ndexNavigation) {

                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                $scope.openMe = function() {

                    // only Admins can modify Network System Properties; check if we have this privilege
                    // for selected network(s)
                    var haveAdminPrivilege = $scope.ndexData.checkAdminPrivilegeOnSelectedNetworks();
                    var action = $scope.action;

                    if (!haveAdminPrivilege) {

                        var title = null;
                        var message = null;

                        if (action == "visibility") {
                            title = "Cannot Modify Visibility";
                            message =
                                "For some of the selected networks you do not have ADMIN privilege. " +
                                "You need to have the ADMIN privilege in order to modify Visibility of networks. " +
                                " Please make sure you have ADMIN access to all selected networks, and try again.";

                        } else if (action == "readOnly") {
                            title = "Cannot Modify Read-Only Property";
                            message =
                                "For some of the selected networks you do not have ADMIN privilege. " +
                                "You need to have the ADMIN privilege in order to set or unset the READ-ONLY flag. " +
                                " Please make sure you have ADMIN access to all selected networks, and try again.";
                        };

                        $scope.ndexData.genericInfoModal(title, message);
                        return;

                    } else if (action == "visibility") {
                        
                        // changing visibility; we have ADMIN privilege for the selected network(s),
                        // now check that the network(s) are not Read-Only
                        var networksUpdateable =
                            $scope.ndexData.checkIfSelectedNetworksCanBeDeletedOrChanged(false);

                        if (!networksUpdateable) {
                            title = "Cannot Modify Visibility";
                            message =
                                "Some of the selected networks are Read Only. " +
                                "You cannot change Visibility of Read Only networks. " +
                                " Please make sure that none of selected networks are Read Only, and try again.";

                            $scope.ndexData.genericInfoModal(title, message);

                            return;
                        };
                    };

                    $scope.network.submitButtonLabel = $scope.label;

                    modalInstance = $modal.open({
                        templateUrl: 'bulk-edit-network-property-modal.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    $scope.isProcessing = false;
                    modalInstance.close();
                    modalInstance = null;
                    $scope.network = {};
                };

                $scope.submit = function() {

                    var myAccountController = $scope.ndexData;
                    var IdsOfSelectedNetworks = myAccountController.getIDsOfSelectedNetworks();

                    var action = $scope.action;

                    var updatedNetworksCounter = 0;

                    if (action == "visibility") {

                        _.forEach (IdsOfSelectedNetworks, function(networkId) {
                            var myNet = {};
                            myNet.networkId = networkId;
                            myNet.visibility = $scope.network.visibility;

                            ndexService.setNetworkSystemPropertiesV2(myNet.networkId, "visibility", myNet.visibility,
                                function (data, networkId, property, value) {
                                    updatedNetworksCounter = updatedNetworksCounter + 1;

                                    myAccountController.updateVisibilityOfNetwork(networkId, myNet.visibility);

                                    if (value == 'PUBLIC') {

                                        ndexService.setNetworkSystemPropertiesV2(networkId, "showcase", true,
                                            function (data, networkId, property, value) {
                                                myAccountController.updateShowcaseOfNetwork(networkId, true);
                                            },
                                            function (error, networkId, property, value) {
                                                console.log("unable to change showcase for Network with Id " + networkId);
                                            });

                                    } else {

                                        ndexService.setNetworkSystemPropertiesV2(networkId, "showcase", false,
                                            function (data, networkId, property, value) {
                                                myAccountController.updateShowcaseOfNetwork(networkId, false);
                                            },
                                            function (error, networkId, property, value) {
                                                console.log("unable to change showcase for Network with Id " + networkId);
                                            });
                                    };
                                    if (IdsOfSelectedNetworks.length == updatedNetworksCounter) {
                                        $scope.isProcessing = false;
                                        modalInstance.close();

                                        if (value == 'PUBLIC') {
                                            var title = "The Selected Networks are Now Public and Showcased";
                                            var message =
                                                "The selected networks are now public and showcased on your account page. " +
                                                "You can decide to disable the showcase feature for these networks " +
                                                "by clicking the corresponding eye icon on your My Account page.";
                                            ndexNavigation.genericInfoModal(title, message);

                                        };
                                    };
                                },
                                function (error, networkId, property, value) {
                                    updatedNetworksCounter = updatedNetworksCounter + 1;

                                    console.log("unable to update Network Visibility for Network with Id " + networkId);

                                    if (IdsOfSelectedNetworks.length == updatedNetworksCounter) {
                                        $scope.isProcessing = false;
                                        modalInstance.close();
                                    };
                                });
                        });
                        
                    } else if (action == "readOnly") {

                        for (var i = 0; i < myAccountController.networkSearchResults.length; i++ )
                        {
                            var networkObj  = myAccountController.networkSearchResults[i];
                            var networkUUID = myAccountController.networkSearchResults[i].externalId;

                            if (IdsOfSelectedNetworks.indexOf(networkUUID) == -1) {
                                continue;
                            };

                            if ((networkObj.isReadOnly) && ($scope.network.readOnly.toUpperCase()==='UNSET')) {

                                // the network is read-only and the operation is UNSET, so let's remove the read-only flag
                                ndexService.setNetworkSystemPropertiesV2(networkUUID, "readOnly", false,
                                    function(data, networkId, property, value) {
                                        // success, do nothing
                                    },
                                    function(error, networkId, property, value) {
                                        console.log("unable to un-set Read-Only");
                                    });

                                // set the read-only flags in networkSearchResults to false showing that this network
                                // is now read-write
                                myAccountController.networkSearchResults[i].isReadOnly = false;

                            } else  if (!networkObj.isReadOnly && ($scope.network.readOnly.toUpperCase()==='SET')) {

                                // the network is not read-only and the true is SET, so let's make network read-only
                                ndexService.setNetworkSystemPropertiesV2(networkUUID, "readOnly", true,
                                    function(data, networkId, property, value) {
                                        // success, do nothing
                                    },
                                    function(error, networkId, property, value) {
                                        console.log("unable to make network Read-Only");
                                    });

                                // set the read-only flags to true showing that this network is now read-only;
                                // the isReadOnly flag will be re-set
                                // when we reload user page and re-populate the myAccountController.networkSearchResults structure;
                                // But for now, keep this value as true so that UI behaves correctly with these networks.
                                myAccountController.networkSearchResults[i].isReadOnly = true;
                            };
                        };

                    };

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
                        " access to " + membershipToSend.memberAccountName +
                            " for network " + membershipToSend.resourceName;
                    
                    ndexService.updateNetworkPermissionV2(
                        membershipToSend.resourceUUID,
                        membershipToSend.accountType,
                        membershipToSend.memberUUID,
                        membershipToSend.permissions,
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

                    var IDsOfSelectedNetworks = Object.keys(bulkNetworkManager.selectedNetworksForUpdatingAccessPermissions);

                    var membershipToUpdateReadyForSending = [];

                    // iterate through the list of networks selected for updating access
                    for (var i = 0;  i < IDsOfSelectedNetworks.length; i++) {

                        var networkId = IDsOfSelectedNetworks[i];
                        var networkPermissionsObjs = bulkNetworkManager.selectedNetworksForUpdatingAccessPermissions[networkId];

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
                                    //memberAccountName: accountForUpdating.memberAccountName,
                                    memberUUID: accountForUpdating.memberUUID,
                                    //resourceName: networkPermissionsObjs[0].resourceName,
                                    resourceUUID: networkId,
                                    permissions: accessTypeSelected,
                                    accountType: accountForUpdating.accountType.toLowerCase()
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
            controller: function($scope, $modal, $route, ndexService, ndexUtility, ndexNavigation) {
                var modalInstance;
                $scope.errors = null;
                $scope.change = {};

                $scope.openMe = function() {
                    $scope.change = {};
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
                    ndexService.changePasswordV2($scope.change.newPassword,
                        function(data) {
                            var userCredentials = ndexUtility.getUserCredentials();
                            var userName = userCredentials['userName'];
                            var externalId = userCredentials['externalId'];

                            ndexUtility.setUserCredentials(userName, externalId, $scope.change.newPassword);
                            modalInstance.close();
                            modalInstance = null;
                            $scope.isProcessing = false;

                            var title = "Password Change Success";
                            var message =
                                "Password has been successfully changed.";
                            ndexNavigation.genericInfoModal(title, message);
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
    /*
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
*/
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
                                ndexService.deleteNetworkV2($scope.externalId,
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

                                var URI = ndexService.getNdexServerUriV2() + '/network/' + networkUUID + '/namespaceFile/' + prefix;

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
                            $scope.title = 'Leave '+ $scope.group.groupName;

                            var groupController = $scope.ndexData;
                            var isAdmin  = groupController.isAdmin;

                            $scope.message = 'You are about to leave this group and will lose access to all ' +
                                'networks shared with the group. Would you like to proceed?';

                            if (isAdmin &&  groupController.adminsCount == 1) {
                                $scope.message = 'You are the admin of this group and cannot leave it ' +
                                 'unless you designate another admin.';

                                $scope.isProcessing = true;  // this disables the Confirm button in the Confirmation modal
                            }

                            $scope.cancel = function() {
                                $scope.isProcessing = false;
                                $modalInstance.dismiss();
                            };

                            $scope.confirm = function() {
                                if( $scope.isProcessing )
                                    return;
                                $scope.isProcessing = true;
                                ndexService.removeGroupMemberV2($scope.group.externalId, ndexUtility.getLoggedInUserExternalId(),
                                    function(data) {
                                        $modalInstance.close();
                                        $location.path('/user/'+ndexUtility.getLoggedInUserExternalId());
                                        $scope.isProcessing = false;
                                    },
                                    function(error) {
                                        if (error && error.message) {
                                            $scope.errors = error.message;
                                        }
                                        //$scope.isProcessing = false;
                                    });
                            };
                        }
                    });
                };

                $scope.$watch('ndexData.displayedGroup', function(value) {
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
                                ndexService.deleteGroupV2($scope.externalId,
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
                                ndexService.deleteUserV2(
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

    // Directive originally authored by Yohai Rosen August 4th 2015
    uiServiceApp.directive('typeaheadFocus', function () {
        return {
            require: 'ngModel',
            link: function (scope, element, attr, ngModel) {

                //trigger the popup on 'click' because 'focus'
                //is also triggered after the item selection
                element.bind('click', function () {

                    var viewValue = ngModel.$viewValue;

                    //restore to null value so that the typeahead can detect a change
                    if (ngModel.$viewValue == ' ') {
                        ngModel.$setViewValue(null);
                    }

                    //force trigger the popup
                    ngModel.$setViewValue(' ');

                    //set the actual value in case there was already a value in the input
                    ngModel.$setViewValue(viewValue || ' ');
                });

                //compare function that treats the empty space as a match
                scope.emptyOrMatch = function (actual, expected) {
                    if (expected == ' ') {
                        return true;
                    }
                    return actual.indexOf(expected) > -1;
                };
            }
        };
    });

    // modal to delete user
    uiServiceApp.directive('confirmAdminRemoval', function(){
        return {
            scope: {
                checkAdminRemoval: "&",
                successCall: "&"
            },
            restrict: 'E',
            templateUrl: 'pages/directives/warningModal.html',
            transclude: true,
            controller: function($scope, $modal, $location, ndexService) {

                $scope.openMe = function() {
                    $scope.canProceed = true;
                    var adminCheck = $scope.checkAdminRemoval();
                    // EVERYTHING IS OK
                    if(!adminCheck['adminIssue']){
                        $scope.successCall();
                    }
                    // USER'S ADMIN ROLE WILL CHANGE
                    else if(adminCheck['issueSeverity'] != 'ABORT'){
                        modalInstance = $modal.open({
                            templateUrl: 'warning-modal.html',
                            scope: $scope,
                            controller: function($scope, $modalInstance, $location, $route, ndexService, ndexUtility) {
                                $scope.title = adminCheck['title'];
                                $scope.message = adminCheck['message'];

                                $scope.cancel = function() {
                                    $modalInstance.dismiss();
                                };

                                $scope.confirm = function() {
                                    if( $scope.isProcessing )
                                        return;
                                    $scope.isProcessing = false;

                                    $scope.successCall();
                                    $modalInstance.dismiss();
                                };
                            }
                        });
                    } else {
                    // NO ADMIN!!! CAN'T PROCEED AS CURRENTLY SPECIFIED
                        $scope.canProceed = false;
                        $scope.isProcessing = false;
                        modalInstance = $modal.open({
                            templateUrl: 'confirmation-modal.html',
                            scope: $scope,
                            controller: function($scope, $modalInstance, $location, $route, ndexService, ndexUtility) {
                                $scope.title = adminCheck['title'];
                                $scope.message = adminCheck['message'];

                                $scope.cancel = function() {
                                    $modalInstance.dismiss();
                                };

                                $scope.confirm = function() {
                                    return;
                                };
                            }
                        });
                    }
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

                    var subPromise = ndexService.getNetworkProvenanceV2(sharedProperties.currentNetworkId).$promise;
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

                            ndexService.setNetworkProvenanceV2(networkSummary.externalId, newProvenance,
                                function(success){
                                    console.log("success");
                                    modal.close();
                                    $scope.isProcessing = false;

                                    $('#tableViewSaveSubnetworkButton').prop('disabled', true);
                                },
                                function(error){
                                    console.log("unable to update network provenance");
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

    // modal to delete user
    uiServiceApp.directive('networkProperty', function(){
        return {
            scope: {
                propertyModel: "=",
                valuePairSplice: "&",
                editorChanged: "&",
                valueChanged: "&",
                netIndex: "=",
                isEdit: "=",
                isAdmin: "="
            },
            restrict: 'E',
            templateUrl: 'pages/directives/networkProperty.html',
            transclude: true,
            controller: function($scope, $modal, $location, ndexService) {

                $scope.vpsplice = function(){
                    $scope.valuePairSplice({passIndex: $scope.netIndex, passOne: 1});
                };

                $scope.editorChangedCall = function(predString){
                    $scope.editorChanged({passIndex: $scope.netIndex, predicateString: predString, property: $scope.propertyModel, del: "del"});
                };

                $scope.updateScore = function(){
                    $scope.valueChanged();
                };
                //scope.onDropCompleteInner = function(parmData, parmEvent, planElementType){
                //    scope.onDropComplete({index: parmData, evt: parmEvent, planType: scope.planType, planElementType: planElementType});
                    //console.log("In drop");
                //};


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