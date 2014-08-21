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
                        controller: 'createGroupController'
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

}) ()