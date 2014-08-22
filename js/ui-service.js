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

                factory.openCreateGroupModal = function(){
                    // display the create group modal using its template and controller
                    console.log("attempting to open createGroupModal");
                    $modal.open({
                        templateUrl: 'pages/createGroupModal.html',
                        controller: 'createGroupController2'
                    })
                };

                factory.openCreateRequestModal = function(){
                    console.log("attempting to open createRequestModal");
                    $modal.open({
                        templateUrl: 'pages/createRequestModal.html',
                        controller: 'requestController'
                    })
                };

                factory.openRequestResponseModal = function(){
                    console.log("attempting to open requestResponseModal");
                    $modal.open({
                        templateUrl: 'pages/requestResponseModal.html',
                        controller: 'requestController'
                    })
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


}) ()