(function () {

    var networkSetServiceApp = angular.module('networkSetServiceApp', []);

    networkSetServiceApp.directive('deleteNetworkSetModal', function() {
        return {
            scope: { networkSetController: '=' },
            restrict: 'AE',

            template: '<button class="btn btn-primary customButtonWidth" ng-click="openMe()">Delete Network Set</button>',

            controller: function($scope, $modal, $location, ndexService) {
                var modalInstance;
                $scope.deleteNetworkSetController = {};
                var deleteNetworkSetController = $scope.deleteNetworkSetController;
                deleteNetworkSetController.keepNetwork = "true";

                $scope.openMe = function() {
                    deleteNetworkSetController.isProcessing = false;
                    deleteNetworkSetController.errors = null;
                    deleteNetworkSetController.keepNetwork = "true";
                    var userUUID = window.currentNdexUser.externalId;
                    deleteNetworkSetController.networkSummaries = $scope.networkSetController.networkSearchResults
                        .filter(function (summary) { return summary.ownerUUID === userUUID; } );
                    deleteNetworkSetController.uuid = $scope.networkSetController.identifier;
                    deleteNetworkSetController.cancelled = false;

                    deleteNetworkSetController.nNetworks = ndexService.pluralize(
                            deleteNetworkSetController.networkSummaries.length, "network");

                    modalInstance = $modal.open({
                        templateUrl: 'views/directives/deleteNetworkSetModal.html',
                        scope: $scope
                    });
                };

                $scope.cancel = function() {
                    deleteNetworkSetController.cancelled = true;
                    modalInstance.close();
                    modalInstance = null;
                };

                var deleteNetworkSet = function () {

                    ndexService.deleteNetworkSetV2(deleteNetworkSetController.uuid,

                        function () {
                            deleteNetworkSetController.isProcessing = false;
                            modalInstance.dismiss();
                            $location.path('/myAccount');
                        },
                        function (error) {
                            console.log("unable to delete network set");
                            deleteNetworkSetController.isProcessing = false;
                            deleteNetworkSetController.errors = error.message;
                        });
                };

                $scope.submit = function() {

                    deleteNetworkSetController.isProcessing = true;

                    if ( deleteNetworkSetController.keepNetwork === 'false') {
                        //need to delete all my networks in this set
                        var userNets = deleteNetworkSetController.networkSummaries;

                        // check if any of them is readonly
                        if (userNets.some(function (summary) { return summary.isReadOnly;} )) {
                            deleteNetworkSetController.errors = "Some of the networks you own are read only. Please clear the readonly flag on therm first.";
                            deleteNetworkSetController.isProcessing = false;
                            return;
                        }
                        var myNetIds = userNets.map(function (summary) { return summary.externalId;} );
                        var deletedCount = 0;

                        ndexService.sequence(myNetIds, function (networkid) {
                            if (deleteNetworkSetController.cancelled || deleteNetworkSetController.errors !== null ) {
                                   return;
                               }
                            return ndexService.deleteNetworkNoHandlersV2(networkid).then(function() {
                                deletedCount++;
                                if ( deletedCount === myNetIds.length) {
                                    deleteNetworkSet();
                                }
                            });
                        }).catch(function (reason) {

                            var errorMessage = 'Unable to delete';
                            var errorMessage1 =
                                    (reason.data && reason.data.message) ? errorMessage + ': ' +  reason.data.message :
                                        errorMessage + '.';

                            deleteNetworkSetController.errors = errorMessage1;

                        });

                    } else {
                        deleteNetworkSet();
                    }

                };
            }
        };
    });

}) ();