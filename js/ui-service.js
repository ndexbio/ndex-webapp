//angularjs suggested function closure
(function () {

    var uiServiceApp = angular.module('uiServiceApp', []);

    uiServiceApp.factory('ndexNavigation',
        ['sharedProperties', '$location', '$modal', '$rootScope',
            function (sharedProperties, $location, $modal, $rootScope) {
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

                factory.openConfirmationModal = function(title, message, confirmLabel, cancelLabel,
                                                         dismissModal, confirmHandler, cancelHandler){

                    ////console.log("attempting to open confirmationModal");

                    var ConfirmCtrl = function($scope, $modalInstance, $rootScope) {

                        $scope.title = title;
                        $scope.message = message;
                        $scope.cancelLabel = cancelLabel ? cancelLabel : "Cancel";
                        $scope.confirmLabel = confirmLabel ? confirmLabel : "Delete";

                        $scope.progress  = $rootScope.progress;
                        $scope.progress2 = $rootScope.progress2;
                        $scope.errors    = $rootScope.errors;
                        $scope.confirmButtonDisabled = $rootScope.confirmButtonDisabled;

                        $scope.confirm = function(){
                            if (dismissModal) {
                                $modalInstance.dismiss();
                                confirmHandler();
                            } else {
                                confirmHandler($modalInstance);
                            };
                        };

                        $scope.cancel = function(){
                            if (dismissModal) {
                                $modalInstance.dismiss();
                                cancelHandler();
                            } else {
                                cancelHandler($modalInstance);
                            };
                        };

                        $rootScope.$watch('progress', function(newValue, oldValue) {
                            $scope.progress = newValue;
                        });
                        $rootScope.$watch('progress2', function(newValue, oldValue) {
                            $scope.progress2 = newValue;
                        });
                        $rootScope.$watch('errors', function(newValue, oldValue) {
                            $scope.errors = newValue;
                        });
                        $rootScope.$watch('confirmButtonDisabled', function(newValue, oldValue) {
                            $scope.confirmButtonDisabled = newValue;
                        });
                    };

                    $modal.open({
                        templateUrl: 'pages/confirmationModal.html',
                        controller: ConfirmCtrl
                    });
                };

                factory.genericInfoModal = function(title, message)
                {
                    var modalInstance = $modal.open({
                        templateUrl: 'pages/generic-info-modal.html',
                        backdrop: 'static',

                        controller: function($scope, $modalInstance) {

                            $scope.title = title;
                            $scope.message = message;

                            $scope.close = function() {
                                $modalInstance.dismiss();
                            };
                        }
                    });
                };

                factory.openManageBulkRequestsModal = function(title, message, acceptLabel, declineLabel, cancelLabel,
                                                         manageHandler, cancelHandler) {
                    var ConfirmCtrl = function($scope, $modalInstance, $rootScope, uiMisc) {

                        $scope.title = title;
                        $scope.message = message;
                        $scope.responseMessage = null;

                        $scope.acceptLabel  = acceptLabel  ? acceptLabel  : "Accept";
                        $scope.declineLabel = declineLabel ? declineLabel : "Decline";
                        $scope.cancelLabel  = cancelLabel  ? cancelLabel  : "Cancel";

                        $scope.progress  = $rootScope.progress;
                        $scope.progress2 = $rootScope.progress2;
                        $scope.errors    = $rootScope.errors;


                        $scope.accept = function() {
                            var acceptRequests = true;
                            var message = uiMisc.replaceNewLinesAndSpaces($scope.responseMessage);
                            manageHandler($modalInstance, acceptRequests, message);
                        };
                        $scope.decline = function() {
                            acceptRequests = false;
                            message = uiMisc.replaceNewLinesAndSpaces($scope.responseMessage);
                            manageHandler($modalInstance, acceptRequests, message);
                        };
                        $scope.cancel = function(){
                            cancelHandler($modalInstance);
                        };

                        $rootScope.$watch('progress', function(newValue, oldValue) {
                            $scope.progress = newValue;
                        });
                        $rootScope.$watch('progress2', function(newValue, oldValue) {
                            $scope.progress2 = newValue;
                        });
                        $rootScope.$watch('errors', function(newValue, oldValue) {
                            $scope.errors = newValue;
                        });
                    };

                    $modal.open({
                        templateUrl: 'pages/receivedBulkRequests.html',
                        controller: ConfirmCtrl
                    });
                };

                factory.networkInfoModal = function(network)
                {
                    var modalInstance = $modal.open({
                        templateUrl: 'pages/networkInfoModal.html',

                        controller: function($scope, $modalInstance) {

                            $scope.network = network;

                            $scope.close = function () {
                                $modalInstance.dismiss();
                            };

                            $scope.showURLInClipboardMessage = function () {

                                var message =
                                    "The URL for this network was copied to the clipboard.";
                                alert(message);
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

                            $scope.showURLInClipboardMessage = function() {

                                var message =
                                    "The URL for this network set was copied to the clipboard.";

                                alert(message);
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
            restrict: 'AE',

            template: '<button class="btn btn-primary customButtonWidth" ng-click="openMe()">Create Group</button>',

            controller: function($scope, $attrs, $modal, $location, ndexService) {
                var modalInstance;
                $scope.group = {};
                $scope.text = $attrs.triggerCreateGroupModal;

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/createGroupModal.html',
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
            restrict: 'AE',

            template: '<button class="btn btn-primary customButtonWidth" ng-click="openMe()">Create Network Set</button>',

            controller: function($scope, $attrs, $modal, $location, ndexService, $rootScope, $route) {
                var modalInstance;

                $scope.openMe = function() {

                    $scope.networkSet = {};
                    $scope.networkSet['properties'] = {};
                    $scope.networkSet['properties']['reference'] = "";
                    $scope.title = 'Select Existing Network Sets Or Create A New Set';

                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/createNetworkSetModal.html',
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

                                        // in case of success, returns the newly created set

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
                            if (error.message) {
                                $scope.errors = error.message
                            } else if (error.description) {
                                $scope.errors = error.description;
                            } else {
                                $scope.errors = "Unable to modify set " + $scope.networkSetController.displayedSet.name;
                            };
                            $scope.isProcessing = false;
                        });
                };
            }
        };
    });

    uiServiceApp.directive('triggerEditNetworkSetModal', function() {
        return {
            scope: {
                networkSetController: '=',
            },
            restrict: 'AE',

            template: '<button class="btn btn-primary customButtonWidth" ng-click="openMe()">Edit Network Set</button>',

            controller: function($scope, $attrs, $modal, $location, ndexService) {
                var modalInstance;

                //$scope.text  = $attrs.triggerEditNetworkSetModal;

                var networkSetId = $scope.networkSetController.identifier;

                $scope.openMe = function() {
                    $scope.networkSet = {};

                    $scope.networkSet['name']        = $scope.networkSetController.displayedSet.name;
                    $scope.networkSet['description'] = $scope.networkSetController.displayedSet.description;
                    $scope.networkSet['properties']  = {reference: ""};

                    $scope.title = $attrs.triggerEditNetworkSetModal + ' ' +  $scope.networkSet['name'];

                    if ($scope.networkSetController.displayedSet['properties'] &&
                        $scope.networkSetController.displayedSet['properties']['reference']) {
                        
                        $scope.networkSet['properties']['reference'] =
                            $scope.networkSetController.displayedSet['properties']['reference'];
                    };

                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/editNetworkSetModal.html',
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


                $scope.$watch("networkSet.name", function () {
                    delete $scope.errors;
                });

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

                            var accessKey = null;
                            ndexService.getNetworkSetV2(networkSetId, accessKey,
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
                            if (error.message) {
                                $scope.errors = error.message
                            } else if (error.description) {
                                $scope.errors = error.description;
                            } else {
                                $scope.errors = "Unable to modify set " + $scope.networkSetController.displayedSet.name;
                            };
                            $scope.isProcessing = false;
                        });
                };
            }
        }
    });

    /*
    uiServiceApp.directive('triggerShareNetworkSetModal', function() {
        return {
            scope: {
                networkSetController: '=',
            },
            restrict: 'A',
            templateUrl: 'pages/directives/shareNetworkSetModal.html',
            controller: function($scope, $attrs, $modal, $location, ndexService) {
                var modalInstance;

                //$scope.networkSet = {};
                $scope.text  = $attrs.triggerShareNetworkSetModal;
                //$scope.title = $attrs.triggerShareNetworkSetModal;

                var networkSetId = $scope.networkSetController.identifier;

                $scope.openMe = function() {
                    $scope.networkSet = {};

                    $scope.title = $attrs.triggerShareNetworkSetModal + ' ' +  $scope.networkSetController.displayedSet.name;

                    $scope.networkSetShareableURL      = $scope.networkSetController.networkSetShareableURL;
                    $scope.networkSetShareableURLLabel = $scope.networkSetController.networkSetShareableURLLabel;

                    modalInstance = $modal.open({
                        templateUrl: 'share-network-set.html',
                        scope: $scope
                    });
                };

                $scope.close = function() {
                    modalInstance.dismiss();
                    delete $scope.errors;
                    $scope.networkSet = {};
                    $scope.isProcessing = false;
                };

                $scope.isProcessing = false;

                $scope.switchShareableURL = function() {
                    if ($scope.isProcessing)
                        return;
                    $scope.isProcessing = true;

                    $scope.networkSetController.switchShareableURL(
                        function() {
                            $scope.networkSetShareableURL      = $scope.networkSetController.networkSetShareableURL;
                            $scope.networkSetShareableURLLabel = $scope.networkSetController.networkSetShareableURLLabel;
                        },
                        function() {

                        });

                    $scope.isProcessing = false;
                };

                $scope.showURLInClipboardMessage = function() {
                    $scope.networkSetController.showURLInClipboardMessage();
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
            restrict: 'AE',
            template: '<button class="dropdown-btn" ng-click="openMe()">Edit Personal Info</span>',

            controller: function($scope, $modal, $location, ndexService, $route) {

                var modalInstance;
                $scope.errors = null;

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/editUserModal.html',
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

            template: '<button class="btn btn-primary customButtonWidth" ng-click="openMe()">Edit Group Profile</button>',

            controller: function($scope, $attrs, $modal, $location, ndexService, $route) {
                var modalInstance;
                $scope.errors = null;
                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/editGroupModal.html',
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
                controllerName: '@controllerName',
                myAccountController: '=',
                myClass: '@'
            },
            restrict: 'AE',
            template: "<button class='{{myClass}}' ng-click='openMe()'>Add To My Sets</button>",

            controller: function($scope, $attrs, $modal, $location, ndexService, $route, $rootScope) {
                var modalInstance;
                $scope.errors = null;

                $scope.loadTheseSets = [];
                $scope.networkSets   = [];

                $scope.openMe = function() {

                    initializeListOfCollections();

                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/showNetworkSetsModal.html',
                        scope: $scope
                    });
                };

                var initializeListOfCollections = function() {
                    var controllerName = $scope.controllerName;
                    $scope.networkSets = [];

                    if ('myAccountController' == controllerName) {
                        //var networkSets = $scope.myAccountController.networkSets;

                        $scope.myAccountController.getAllNetworkSetsOwnedByUser(
                            // success handler
                            function(data) {
                                $scope.networkSets = $scope.myAccountController.networkSets;
                                loadNetworkSets();
                            },
                            function(data, status) {
                                //$scope.main.serverIsDown = true;
                                $scope.networkSets = $scope.myAccountController.networkSets;
                                loadNetworkSets();
                            }
                        );

                    } else {

                        $scope.networkSets = $scope.myAccountController.networkSets;
                        loadNetworkSets();
                    };
                };

                var loadNetworkSets = function() {
                    $scope.loadTheseSets = [];

                    _.forEach($scope.networkSets, function(networkSetObj) {
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
                                    };
                                    delete $scope.progress;
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
                        };
                    }
                }, true);

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
                requestId:'=',
                myAccountController:'='
            },
            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/sentRequest.html',
            controller: function($scope, $modal, $route, ndexService) {
                var modalInstance;
                $scope.errors = null;

                $scope.openMe = function() {

                    $scope.request =
                        _.find($scope.myAccountController.sentRequests, {'externalId':$scope.requestId});

                    modalInstance = $modal.open({
                        templateUrl: 'sent-request-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function() {
                    delete $scope.request.error;
                    delete $scope.request;
                    modalInstance.close();
                }

                $scope.delete = function() {

                    var request = {
                        "requesterId": $scope.request.requesterId,
                        "externalId":  $scope.request.externalId
                    };

                    var requestType = $scope.request.requestType.toLowerCase();

                    if (requestType == "usernetworkaccess" || requestType == "groupnetworkaccess") {

                        ndexService.deletePermissionRequestV2(request,
                            function (data) {
                                // remove request from the table and sent requests list
                                _.remove($scope.myAccountController.sentRequests, {'externalId': $scope.request.externalId});
                                _.remove($scope.myAccountController.tasksAndRequestsGridOptions.data,
                                    {'taskId': $scope.request.externalId});

                                modalInstance.close();
                            },
                            function (error) {
                                if (error && error.message) {
                                    $scope.request.error = error.message;
                                };
                            });

                    } else if (requestType == "joingroup") {

                        ndexService.deleteMembershipRequestV2(request,
                            function(data) {
                                // remove request from the table and sent requests list
                                _.remove($scope.myAccountController.sentRequests, {'externalId': $scope.request.externalId});
                                _.remove($scope.myAccountController.tasksAndRequestsGridOptions.data,
                                    {'taskId': $scope.request.externalId});

                                modalInstance.close();
                            },
                            function(error){
                                if (error && error.message) {
                                    $scope.request.error = error.message;
                                };
                            });
                    };
                };
            }
        }
    });

    // modal to view and act on received request
    uiServiceApp.directive('receivedRequest', function() {
        return {

            scope: {
                requestId:'=',
                myAccountController:'='
            },

            restrict: 'E',
            transclude: true,
            templateUrl: 'pages/directives/receivedRequest.html',
            controller: function($scope, $modal, $route, ndexService, uiMisc) {
                var modalInstance;
                $scope.errors = null;

                $scope.openMe = function() {

                    $scope.request = _.find($scope.myAccountController.pendingRequests,
                        {'externalId':$scope.requestId});

                    modalInstance = $modal.open({
                        templateUrl: 'received-request-modal.html',
                        scope: $scope,
                        backdrop: 'static'
                    });
                };

                $scope.close = function() {
                    modalInstance.close();
                    delete $scope.request.error;
                };

                $scope.accept = function() {

                    var type = $scope.request.requestType.toLowerCase();
                    var networkId     = $scope.request.destinationUUID;
                    var userOrGroupId = $scope.request.sourceUUID;

                    var permission = $scope.request.permission;

                    var recipientId = $scope.myAccountController.identifier;
                    var requestId = $scope.request.externalId;
                    var action = "accept";

                    var message = uiMisc.replaceNewLinesAndSpaces($scope.request.responseMessage);

                    if (type == 'usernetworkaccess' || type == 'groupnetworkaccess') {

                        type = (type == 'usernetworkaccess') ? 'user' : 'group';

                        ndexService.updateNetworkPermissionV2(networkId, type, userOrGroupId, permission,
                            function (data) {

                                ndexService.acceptOrDenyPermissionRequestV2(recipientId, requestId, action, message,
                                    function (data) {

                                        var request =
                                            _.find($scope.myAccountController.tasksAndRequestsGridOptions.data, {'taskId': $scope.requestId});

                                        if (request.newReceived && $scope.myAccountController.numberOfNewTasksAndRequests > 0) {
                                            $scope.myAccountController.numberOfNewTasksAndRequests--;
                                        };

                                        _.remove($scope.myAccountController.pendingRequests, {'externalId': $scope.request.externalId});
                                        _.remove($scope.myAccountController.tasksAndRequestsGridOptions.data,
                                            {'taskId': $scope.request.externalId});

                                        modalInstance.close();
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

                    } else if (type == 'joingroup') {

                        ndexService.acceptOrDenyMembershipRequestV2(recipientId, requestId, action, message,
                            function (data) {
                                var request =
                                    _.find($scope.myAccountController.tasksAndRequestsGridOptions.data,
                                        {'taskId': $scope.requestId});

                                if (request.newReceived && $scope.myAccountController.numberOfNewTasksAndRequests > 0) {
                                    $scope.myAccountController.numberOfNewTasksAndRequests--;
                                };

                                _.remove($scope.myAccountController.pendingRequests, {'externalId': $scope.request.externalId});
                                _.remove($scope.myAccountController.tasksAndRequestsGridOptions.data,
                                    {'taskId': $scope.request.externalId});
                                modalInstance.close();
                            },
                            function (error) {
                                if (error && error.message) {
                                    $scope.request.error = error.message;
                                }
                            });
                    };

                };

                $scope.decline = function() {

                    var type = $scope.request.requestType.toLowerCase();

                    var recipientId = $scope.myAccountController.identifier;
                    var requestId = $scope.request.externalId;
                    var action = "deny";

                    var message = uiMisc.replaceNewLinesAndSpaces($scope.request.responseMessage);

                    if (type == 'usernetworkaccess' || type == 'groupnetworkaccess') {

                        ndexService.acceptOrDenyPermissionRequestV2(recipientId, requestId, action, message,
                            function (data) {
                                var request =
                                    _.find($scope.myAccountController.tasksAndRequestsGridOptions.data, {'taskId': $scope.requestId});

                                if (request.newReceived && $scope.myAccountController.numberOfNewTasksAndRequests > 0) {
                                    $scope.myAccountController.numberOfNewTasksAndRequests--;
                                };

                                _.remove($scope.myAccountController.pendingRequests, {'externalId': $scope.request.externalId});
                                _.remove($scope.myAccountController.tasksAndRequestsGridOptions.data,
                                    {'taskId': $scope.request.externalId});

                                modalInstance.close();
                            },
                            function (error) {
                                if (error && error.message) {
                                    $scope.request.error = error.message;
                                }
                            });

                    } else if (type == 'joingroup') {

                        ndexService.acceptOrDenyMembershipRequestV2(recipientId, requestId, action, message,
                            function (data) {
                                var request =
                                    _.find($scope.myAccountController.tasksAndRequestsGridOptions.data, {'taskId': $scope.requestId});

                                if (request.newReceived && $scope.myAccountController.numberOfNewTasksAndRequests > 0) {
                                    $scope.myAccountController.numberOfNewTasksAndRequests--;
                                };

                                _.remove($scope.myAccountController.pendingRequests, {'externalId': $scope.request.externalId});
                                _.remove($scope.myAccountController.tasksAndRequestsGridOptions.data,
                                    {'taskId': $scope.request.externalId});
                                modalInstance.close();
                            },
                            function (error) {
                                if (error && error.message) {
                                    $scope.request.error = error.message;
                                }
                            });
                    };

                }
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

            template: '<button class="btn btn-primary customButtonWidth" ng-click="openMe()">Ask to Join!</button>',

            controller: function($scope, $modal, $route, ndexService, ndexUtility, sharedProperties, uiMisc) {
                $scope.openMe = function() {
                    $modal.open({
                        templateUrl: 'pages/directives/createRequestGroup.html',
                        scope: $scope,
                        backdrop: 'static',
                        controller: function($scope, $modalInstance, $route, ndexService, ndexUtility, sharedProperties) {
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

                                $scope.request.sourceName = sharedProperties.getCurrentUserAccountName();
                                $scope.request.sourceUUID = sharedProperties.getCurrentUserId();

                                var message = uiMisc.replaceNewLinesAndSpaces($scope.request.message);
                                $scope.request.message = message;

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
                privileges: '=',
                myClass: '@'
            },
            restrict: 'E',

            template: '<button class="{{myClass}}" ng-click="openMe()">Upgrade Permission</button>',

            controller: function($scope, $modal, $route, ndexService, ndexUtility, sharedProperties, uiMisc) {
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
                        templateUrl: 'pages/directives/createRequestNetwork.html',
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

                    // let's close the modal so that the user didn't see how  $scope.request.message
                    // will be changed ...
                    modalInstance.close();

                    var message = uiMisc.replaceNewLinesAndSpaces($scope.request.message);

                    var requestType =  $scope.selected.account.accountType;

                    if (requestType == 'user') {

                        // Create a request to ask a network permission for the authenticated user.
                        var userPermissionRequest = {
                            "networkid"  : $scope.request.destinationUUID,
                            "permission" : $scope.request.permission,
                            "message"    : message,
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
                            "message"    : message
                        };

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

                    $scope.request.sourceName = sharedProperties.getLoggedInUserFirstAndLastNames();
                    $scope.request.sourceUUID = sharedProperties.getCurrentUserId(); //ndexUtility.getLoggedInUserExternalId();

                    $scope.request.accountType = undefined;

                    $scope.modal.permissionLabel = ($scope.privileges == 'None') ? 'Can read' : 'Can edit';

                    $scope.selected.account = undefined;

                    //if( $scope.privileges == 'Edit' )
                    //    $scope.modal.permissionLabel ='Is admin';

                    ndexService.getUserGroupMembershipsV2(sharedProperties.getCurrentUserId(), 'GROUPADMIN', 0, 1000000,
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
                                            userName: sharedProperties.getLoggedInUserFirstAndLastNames(),
                                            externalId: sharedProperties.getCurrentUserId() // .getLoggedInUserExternalId()
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
                privileges: '@privileges',
                myClass: '@'
            },
            restrict: 'E',

            template: '<button class="{{myClass}}" ng-click="openMe()">Upgrade Permission</button>',

            controller: function($scope, $modal, $route, ndexService, ndexUtility, ndexNavigation,
                                 sharedProperties, uiMisc) {
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

                    intialize(
                        function() {
                            if (($scope.privileges == 'Write') || ($scope.privileges == 'Admin')) {
                                var title = "You Already Have Maximum Permission Level";
                                var message =
                                    "You already have the highest permission level available.";
                                ndexNavigation.genericInfoModal(title, message);

                            } else {

                                modalInstance = $modal.open({
                                    templateUrl: 'pages/directives/createRequestNetwork.html',
                                    scope: $scope,
                                    backdrop: 'static'
                                });
                            };
                        },
                        function(errorMessage) {
                            var title = "Unable To Upgrade Permission";
                            var message = errorMessage;
                            ndexNavigation.genericInfoModal(title, message);
                        }
                    );
                };

                var intialize = function(successHandler, errorHandler) {
                    $scope.accounts = [];

                    $scope.request.destinationName = "selected networks";
                    $scope.request.destinationUUID = $scope.ndexData.externalId;

                    $scope.request.sourceName = sharedProperties.getLoggedInUserFirstAndLastNames();
                    $scope.request.sourceUUID = sharedProperties.getCurrentUserId(); //ndexUtility.getLoggedInUserExternalId();

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

                    ndexService.getUserGroupMembershipsV2(sharedProperties.getCurrentUserId(), 'GROUPADMIN', 0, 1000000,
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
                                            userName: sharedProperties.getLoggedInUserFirstAndLastNames(),
                                            externalId: sharedProperties.getCurrentUserId()//ndexUtility.getLoggedInUserExternalId()
                                        }
                                        $scope.accounts.push(currentUserAccount);
                                        $scope.selected.account = currentUserAccount;
                                        successHandler();

                                    })
                                .error(
                                    function(error) {
                                        console.log("unable to get groups by UUIDs");
                                        errorHandler("unable to get groups by UUIDs");
                                    }
                                )
                        },
                        function (error, data) {
                            console.log("unable to get user group memberships");
                            errorHandler("unable to get groups by UUIDs");
                        });
                }

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
                };

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
                    var adminPrivilege = $scope.loggedInUserPermissions['ADMIN'];
                    var editPrivilege  = $scope.loggedInUserPermissions['EDIT'];
                    var readPrivilege  = $scope.loggedInUserPermissions['READ'];
                    var nonePrivilege  = $scope.loggedInUserPermissions['NONE'];
                    var loggedInUserPermission2 = loggedInUserPermission;


                    var message = uiMisc.replaceNewLinesAndSpaces($scope.request.message);


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
                                "message": message,
                            };

                            var userUUID = $scope.selected.account.externalId;

                            var perms   = $scope.loggedInUserPermissions;
                            var priv    = $scope.privileges;
                            var request = $scope.request.permission;


                            $scope.request.progress = "Sending " + $scope.request.permission +
                                " permission request for network " + selectedNetworks[i]['name'];

                            //var action =

                            ndexService.createUserPermissionRequestV2(userUUID, userPermissionRequest,
                                function(data) {
                                    ; //$scope.close();
                                },
                                function(error) {
                                    console.log("unable to send network permission request for the authenticated user");
                                    //$scope.close();
                                });


                        } else if (requestType == 'group') {

                            // Create a request to ask a network permission for a group.
                            var groupPermissionRequest = {
                                "networkid": networkUUID,
                                "permission": $scope.request.permission,
                                "message": message,
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
            }
        }
    });


    // modal to export network
    uiServiceApp.directive('exportNetwork', function() {
        return {
            scope: {
                ndexData: '=',
                myClass: '@'
            },
            restrict: 'E',

            template: '<button class="{{myClass}}" ng-click="openMe()">Export</button>',

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
                        templateUrl: 'pages/directives/exportNetwork.html',
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
                ndexData: '=',
                myClass: '@'
            },
            restrict: 'E',

            template: '<button class="{{myClass}}" ng-click="openMe()">{{ndexData.exportNetworksLabel}}</button>',

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
                        templateUrl: 'pages/directives/bulkExportNetwork.html',
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
                            if (accountController.checkAndRefreshMyTaskAndNotification) {
                                accountController.checkAndRefreshMyTaskAndNotification();
                            };
                            modalInstance.close();
                        },
                        function(error) {
                            //console.log(error);
                            $scope.isProcessing = false;
                            if (accountController.getTasks) {
                                accountController.getTasks();
                            }
                            modalInstance.close();
                        });

                }
            }
        }
    });

    // modal to edit network summary
/*
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
*/

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
            template: '<button class="dropdown-btn" ng-click="openMe()">{{label}}</span>',
            transclude: true,

            controller: function($scope, $modal, ndexService, uiMisc) {

                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                var updatedNetworksCounter = 0;
                var successfullyChangedNetworkIDs = {};

                var operation = null;
                var referenceObj = null;

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
                        templateUrl: 'pages/directives/bulkEditNetworkPropertyModal.html', //'bulk-edit-network-property-modal.html',
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


                var incrementUpdatedNetworksCounter = function(IdsOfSelectedNetworks, networkName) {

                    updatedNetworksCounter = updatedNetworksCounter + 1;

                    $scope.progress1  =
                        "Changed: " + updatedNetworksCounter + " of " + IdsOfSelectedNetworks.length + " selected networks";
                    $scope.progress2 = "Changed: " + networkName;


                    if (IdsOfSelectedNetworks.length == updatedNetworksCounter) {

                        var myAccountController = $scope.ndexData;
                        if ("description" == operation) {
                            myAccountController.updateDescriptionOfNetworks(
                                successfullyChangedNetworkIDs, $scope.network.description);
                        } else if ("reference" == operation) {
                            myAccountController.updateReferenceOfNetworks(
                                successfullyChangedNetworkIDs, referenceObj);
                        };

                        // wait for 1 sec before closing modal; if we don't wait, then the
                        // number of Changed networks will be one less than selected networks (since it modal didn't
                        // update the number of networks updated), even though all selected networks have Changed
                        // successfully.
                        setTimeout(function() {
                            delete $scope.progress1;
                            delete $scope.progress2;
                            delete $scope.errors;
                            $scope.isProcessing = false;
                            modalInstance.close();
                        }, 1000);
                    };
                };

                String.prototype.capitalize = function() {
                    return this.charAt(0).toUpperCase() + this.slice(1);
                };

                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    var myAccountController = $scope.ndexData;
                    var IdsOfSelectedNetworks = myAccountController.getIDsOfSelectedNetworks();

                    operation = $scope.action;

                    var data;
                    referenceObj = null;

                    updatedNetworksCounter = 0;
                    successfullyChangedNetworkIDs = {};

                    var selectedNetworkCount = IdsOfSelectedNetworks.length;

                    if (operation == "description") {
                        data = $scope.network.description;

                    } else if (operation == "reference") {
                        data = $scope.network.reference;

                    } else {
                        data = $scope.network.version;
                    };

                    $scope.progress1  =
                        "Changing " + operation.capitalize() + " of " + IdsOfSelectedNetworks.length + " selected networks ... ";

                    _.forEach(IdsOfSelectedNetworks, function(networkId) {
                        var networkSummary = getNetworkSummary(networkId);
                        var networkName    = networkSummary["name"];

                        var subNetworkId = uiMisc.getSubNetworkId(networkSummary);

                        if ("description" == operation || "version" == operation) {

                            var summary = {};
                            summary["name"] = networkName;
                            summary["description"] = (operation == "description") ? data : networkSummary["description"];
                            summary["version"] = (operation == "version") ? data : networkSummary["version"];

                            ndexService.updateNetworkProfileV2(networkId, summary,
                                function (successData) {

                                    successfullyChangedNetworkIDs[networkId] = "";

                                    if (subNetworkId != null) {

                                        var properties = (networkSummary && networkSummary['properties']) ?
                                            networkSummary['properties'] : [];

                                        upsertProperty(operation, data, properties, subNetworkId);

                                        ndexService.setNetworkPropertiesV2(networkId, properties,
                                            function (data) {
                                                incrementUpdatedNetworksCounter(IdsOfSelectedNetworks, networkName);
                                            },
                                            function (error) {
                                                incrementUpdatedNetworksCounter(IdsOfSelectedNetworks, networkName);
                                                console.log("unable to update Network properites");
                                            });
                                    } else {
                                        incrementUpdatedNetworksCounter(IdsOfSelectedNetworks, networkName);
                                    };

                                },
                                function (error) {
                                    incrementUpdatedNetworksCounter(IdsOfSelectedNetworks, networkName);
                                    console.log("unable to update Network Summary");
                                });

                        } else if ("reference" == operation) {

                            var properties = (networkSummary && networkSummary['properties']) ?
                                networkSummary['properties'] : [];

                            upsertProperty(operation, data, properties, subNetworkId);

                            ndexService.setNetworkPropertiesV2(networkId, properties,
                                function (data, status, headers, config, statusText) {

                                    if (config && config.data && !referenceObj) {

                                        var jsonObj = JSON.parse(config.data);
                                        var refObj = _.find(jsonObj, {"predicateString" : "reference"});

                                        if (refObj) {
                                            var refStr = (refObj.value) ? refObj.value : "";
                                            referenceObj = uiMisc.constructReferenceObj(refStr);
                                        };
                                    };

                                    successfullyChangedNetworkIDs[networkId] = "";
                                    incrementUpdatedNetworksCounter(IdsOfSelectedNetworks, networkName);
                                },
                                function (error) {
                                    incrementUpdatedNetworksCounter(IdsOfSelectedNetworks, networkName);
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
            template: '<button class="dropdown-btn" ng-click="openMe()">{{label}}</span>',

            transclude: true,
            controller: function($scope, $modal, ndexService, ndexNavigation) {

                var modalInstance;
                $scope.errors = null;
                $scope.network = {};

                var successfullyChangedNetworkIDs = {};
                var operation = null;

                var myAccountController = $scope.ndexData;
                var systemPropertiesOfSelectedNetworks = {};

                var updatedNetworksCounter = 0;

                $scope.openMe = function() {

                    // only Admins can modify Network System Properties; check if we have this privilege
                    // for selected network(s)
                    var haveAdminPrivilege = $scope.ndexData.checkAdminPrivilegeOnSelectedNetworks();
                    operation = $scope.action;

                    if (!haveAdminPrivilege) {

                        var title = null;
                        var message = null;

                        if (operation == "visibility") {
                            title = "Cannot Modify Visibility";
                            message =
                                "For some of the selected networks you do not have ADMIN privilege. " +
                                "You need to have the ADMIN privilege in order to modify Visibility of networks. " +
                                " Please make sure you have ADMIN access to all selected networks, and try again.";

                        } else if (operation == "readOnly") {
                            title = "Cannot Modify Read-Only Property";
                            message =
                                "For some of the selected networks you do not have ADMIN privilege. " +
                                "You need to have the ADMIN privilege in order to set or unset the READ-ONLY flag. " +
                                " Please make sure you have ADMIN access to all selected networks, and try again.";
                        };

                        $scope.ndexData.genericInfoModal(title, message);
                        return;

                    } else if (operation == "visibility") {
                        
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
                    $scope.network.showcase = true;

                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/bulkEditNetworkPropertyModal.html',
                        scope: $scope
                    });
                };


                var getNetworkSummary = function(networkUUID) {
                    return _.find($scope.ndexData.networkSearchResults, {externalId: networkUUID});
                };

                $scope.cancel = function() {
                    $scope.isProcessing = false;
                    modalInstance.close();
                    modalInstance = null;
                    $scope.network = {};
                };

                String.prototype.capitalize = function() {
                    return this.charAt(0).toUpperCase() + this.slice(1);
                };

                var updateShowCaseOfSelectedNetworks = function(networkUUIDs, showCase) {

                    var noOfNetworksToUpdate   = _.size(networkUUIDs);
                    var updatedShowCaseCounter = 0;
                    var successfullyChangedShowCaseIDs = {};

                    $scope.progress1 =
                        "Changing Showcase of " + noOfNetworksToUpdate + " networks ... ";

                    delete $scope.progress2;

                    _.forOwn(networkUUIDs, function(unusedArg, networkUUID) {

                        if (showCase == systemPropertiesOfSelectedNetworks[networkUUID]['showCase']) {

                            updatedShowCaseCounter = updatedShowCaseCounter + 1;
                            successfullyChangedShowCaseIDs[networkUUID] = "";

                            $scope.progress1  =
                                "Changed Showcase: " + updatedShowCaseCounter + " of " + noOfNetworksToUpdate + " selected networks";
                            $scope.progress2 = "Changed Showcase: " +
                                systemPropertiesOfSelectedNetworks[networkUUID]['networkName'];

                            if (updatedShowCaseCounter == noOfNetworksToUpdate) {

                                myAccountController.updateShowcaseOfNetworks(
                                    successfullyChangedShowCaseIDs, showCase);

                                setTimeout(function() {
                                    delete $scope.progress1;
                                    delete $scope.progress2;
                                    delete $scope.errors;
                                    $scope.isProcessing = false;
                                    modalInstance.close();

                                    return false;
                                }, 1000);
                            };
                            return true;
                        };

                        ndexService.setNetworkSystemPropertiesV2(networkUUID, "showcase", showCase,
                            function (data, networkId, property, value) {

                                updatedShowCaseCounter = updatedShowCaseCounter + 1;

                                successfullyChangedShowCaseIDs[networkId] = "";

                                $scope.progress1  =
                                    "Changed Showcase: " + updatedShowCaseCounter + " of " + noOfNetworksToUpdate + " selected networks";
                                $scope.progress2 = "Changed Showcase: " +
                                    systemPropertiesOfSelectedNetworks[networkUUID]['networkName'];

                                if (updatedShowCaseCounter == noOfNetworksToUpdate) {

                                    myAccountController.updateShowcaseOfNetworks(
                                        successfullyChangedShowCaseIDs, showCase);

                                    setTimeout(function() {
                                        delete $scope.progress1;
                                        delete $scope.progress2;
                                        delete $scope.errors;
                                        $scope.isProcessing = false;
                                        modalInstance.close();
                                    }, 1000);
                                };
                            },
                            function (error, networkId, property, value) {
                                updatedShowCaseCounter = updatedShowCaseCounter + 1;
                                console.log("unable to change showcase for Network with Id " + networkId);

                                if (updatedShowCaseCounter == noOfNetworksToUpdate) {

                                    myAccountController.updateShowcaseOfNetworks(
                                        successfullyChangedShowCaseIDs, showCase);

                                    setTimeout(function() {
                                        delete $scope.progress1;
                                        delete $scope.progress2;
                                        delete $scope.errors;
                                        $scope.isProcessing = false;
                                        modalInstance.close();
                                    }, 1000);
                                };

                            });
                    });
                };


                var incrementUpdatedNetworksCounter = function(
                    networkId, numOfSelectedNetworks, networkName, visibility, showCase) {

                    updatedNetworksCounter = updatedNetworksCounter + 1;

                    $scope.progress1  =
                        "Changed: " + updatedNetworksCounter + " of " + numOfSelectedNetworks + " selected networks";
                    $scope.progress2 = "Changed: " + networkName;


                    if (numOfSelectedNetworks == updatedNetworksCounter) {

                        myAccountController.updateVisibilityOfNetworks(
                            successfullyChangedNetworkIDs, visibility);

                        updateShowCaseOfSelectedNetworks(
                            successfullyChangedNetworkIDs, showCase);
                        return false;
                    };

                    return true;
                };

                $scope.submit = function() {
                    if( $scope.isProcessing )
                        return;
                    $scope.isProcessing = true;

                    operation = $scope.action;

                    systemPropertiesOfSelectedNetworks =
                        (operation == "visibility")
                            ? myAccountController.getVisibilityAndShowcaseOfSelectedNetworks()
                            : myAccountController.getReadOnlyOfSelectedNetworks();

                    var numOfSelectedNetworks = _.size(systemPropertiesOfSelectedNetworks);

                    updatedNetworksCounter = 0;
                    var visibility = $scope.network.visibility;

                    successfullyChangedNetworkIDs = {};

                    $scope.progress1 =
                        "Changing " + operation.capitalize() + " of " +
                            numOfSelectedNetworks + " selected networks ... ";

                    if (operation == "visibility") {

                        var showCase = ('PRIVATE' == visibility) ? false : $scope.network.showcase;

                        _.forOwn(systemPropertiesOfSelectedNetworks, function(systemPropertiesObj, networkId) {

                            if (visibility == systemPropertiesObj['visibility']) {

                                successfullyChangedNetworkIDs[networkId] = "";

                                var continueLoop = incrementUpdatedNetworksCounter(networkId,
                                    numOfSelectedNetworks,
                                    systemPropertiesOfSelectedNetworks[networkId]['networkName'],
                                    visibility, showCase);

                                return continueLoop;
                            };

                            ndexService.setNetworkSystemPropertiesV2(networkId, "visibility", visibility,
                                function (data, networkId, property, value) {

                                    successfullyChangedNetworkIDs[networkId] = "";

                                    incrementUpdatedNetworksCounter(networkId, numOfSelectedNetworks,
                                        systemPropertiesOfSelectedNetworks[networkId]['networkName'],
                                        visibility, showCase);
                                },
                                function (error, networkId, property, value) {

                                    incrementUpdatedNetworksCounter(networkId, numOfSelectedNetworks,
                                        systemPropertiesOfSelectedNetworks[networkId]['networkName'],
                                        visibility, showCase);

                                    console.log("unable to update Network Visibility for Network with Id " + networkId);
                                });
                        });
                        
                    } else if (operation == "readOnly") {

                        //IdsOfSelectedNetworks = myAccountController.getIDsOfSelectedNetworks();

                        //_.forOwn(systemPropertiesOfSelectedNetworks, function(systemPropertiesObj, networkId)

                        var readOnlyOperation        = $scope.network.readOnly.toUpperCase();
                        var readOnlyOperationBoolean = ('SET' == readOnlyOperation);

                        _.forOwn(systemPropertiesOfSelectedNetworks, function(networkObj, networkUUID) {

                        //for (var i = 0; i < myAccountController.networkSearchResults.length; i++ ) {
                            //var networkObj  = myAccountController.networkSearchResults[i];
                            // networkUUID = myAccountController.networkSearchResults[i].externalId;

                            if (( networkObj['isReadOnly'] && ('UNSET' == readOnlyOperation)) ||
                                (!networkObj['isReadOnly'] && ('SET' == readOnlyOperation)))
                            {
                                ndexService.setNetworkSystemPropertiesV2(networkUUID, "readOnly", readOnlyOperationBoolean,
                                    function(data, networkId, property, value) {
                                        updatedNetworksCounter = updatedNetworksCounter + 1;
                                        $scope.progress1  =
                                            "Changed: " + updatedNetworksCounter + " of " + numOfSelectedNetworks + " selected networks";
                                        $scope.progress2 = "Changed: " +
                                            systemPropertiesOfSelectedNetworks[networkUUID]['networkName'];

                                        successfullyChangedNetworkIDs[networkUUID] = "";

                                        if (numOfSelectedNetworks == updatedNetworksCounter) {

                                            myAccountController.updateReadOnlyOfNetworks(
                                                successfullyChangedNetworkIDs, readOnlyOperationBoolean);

                                            setTimeout(function() {
                                                delete $scope.progress1;
                                                delete $scope.progress2;
                                                delete $scope.errors;
                                                $scope.isProcessing = false;
                                                modalInstance.close();
                                            }, 1000);
                                        };
                                    },
                                    function(error, networkId, property, value) {
                                        console.log("unable to change Read-Only");
                                        updatedNetworksCounter = updatedNetworksCounter + 1;
                                        $scope.progress1  =
                                            "Changed: " + updatedNetworksCounter + " of " + numOfSelectedNetworks + " selected networks";
                                        $scope.progress2 = "Changed: " +
                                            systemPropertiesOfSelectedNetworks[networkId]['networkName'];


                                        if (numOfSelectedNetworks == updatedNetworksCounter) {

                                            myAccountController.updateReadOnlyOfNetworks(
                                                successfullyChangedNetworkIDs, readOnlyOperationBoolean);

                                            setTimeout(function() {
                                                delete $scope.progress1;
                                                delete $scope.progress2;
                                                delete $scope.errors;
                                                $scope.isProcessing = false;
                                                modalInstance.close();

                                                return false;
                                            }, 1000);
                                        };
                                    });

                                // set the read-only flags in networkSearchResults to false showing that this network
                                // is now read-write
                                //myAccountController.networkSearchResults[i].isReadOnly = readOnlyOperationBoolean;
                            } else {

                                updatedNetworksCounter = updatedNetworksCounter + 1;
                                $scope.progress1  =
                                    "Changed: " + updatedNetworksCounter + " of " + numOfSelectedNetworks + " selected networks";
                                $scope.progress2 = "Changed: " +
                                    systemPropertiesOfSelectedNetworks[networkUUID]['networkName'];

                                if (numOfSelectedNetworks == updatedNetworksCounter) {

                                    myAccountController.updateReadOnlyOfNetworks(
                                        successfullyChangedNetworkIDs, readOnlyOperationBoolean);

                                    setTimeout(function() {
                                        delete $scope.progress1;
                                        delete $scope.progress2;
                                        delete $scope.errors;
                                        $scope.isProcessing = false;
                                        modalInstance.close();

                                        return false;
                                    }, 1000);
                                };

                            };

                        });

                    };
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
            restrict: 'AE',

            template: '<button class="dropdown-btn" ng-click="openMe()">Change Password</span>',

            controller: function($scope, $modal, $route, ndexService, ndexUtility, ndexNavigation) {
                var modalInstance;
                $scope.errors = null;
                $scope.change = {};

                $scope.openMe = function() {
                    $scope.change = {};
                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/changePasswordModal.html',
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

                            ndexUtility.setUserPassword($scope.change.newPassword);
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
                        templateUrl: 'pages/directives/confirmationModal.html',
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
            restrict: 'AE',

            template: '<button class="btn btn-primary actionsLabel" ng-click="openMe()">Delete</button>',
            controller: function($scope, $modal, $location) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/confirmationModal.html',
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
                                        $location.path('/user/'+ sharedProperties.getCurrentUserId());
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
            //templateUrl: 'pages/directives/confirmationModal.html',
            transclude: true,
            controller: function($scope, $modal, $location) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/confirmationModal.html',
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

            template: '<button class="btn btn-primary customButtonWidth" ng-click="openMe()">Leave Group</button>',

            controller: function($scope, $modal, $route, ndexService) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/confirmationModal.html',
                        scope: $scope,
                        controller: function($scope, $modalInstance, $location, ndexService, ndexUtility, sharedProperties) {
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
                                ndexService.removeGroupMemberV2($scope.group.externalId,
                                    sharedProperties.getCurrentUserId(), // ndexUtility.getLoggedInUserExternalId(),
                                    function(data) {
                                        $modalInstance.close();
                                        $location.path('/user/'+sharedProperties.getCurrentUserId());
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

            template: '<button class="btn btn-primary customButtonWidth" ng-click="openMe()">Delete Group</button>',

            controller: function($scope, $modal, $location, ndexService) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/confirmationModal.html',
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
                                        $location.path('/user/'+sharedProperties.getCurrentUserId());
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
            restrict: 'AE',
            //templateUrl: 'pages/directives/confirmationModal.html',
            template: '<button class="dropdown-btn" ng-click="openMe()">Delete Account</span>',


            controller: function($scope, $modal, $location, ndexService) {

                $scope.openMe = function() {
                    modalInstance = $modal.open({
                        templateUrl: 'pages/directives/confirmationModal.html',
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
                            templateUrl: 'pages/directives/confirmationModal.html',
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

    /*
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
                        templateUrl: 'pages/directives/confirmationModal.html',
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
    */

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