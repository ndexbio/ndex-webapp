ndexApp.controller('requestController',
    ['ndexService', 'ndexNavigation', '$scope', '$modalInstance',
        function (ndexService, ndexNavigation, $scope, $modalInstance) {

            $scope.group = {};
            $scope.message = null;

            $scope.cancel = function(){
                $modalInstance.dismiss();
            };

            $scope.create = function () {
                console.log("Attempting to call ndexService.createRequest")
                ndexService.createRequest($scope.request,
                    // Success Handler
                    (function (requestData) {
                        $modalInstance.dismiss();
                        $scope.refreshRequests();
                    }),
                    // Error handler
                    (function (error) {
                        $scope.message = error;
                    }));
            };

            $scope.respond = function () {
                console.log("Attempting to call ndexService.updateRequest")
                ndexService.updateRequest($scope.request,
                    // Success Handler
                    (function (requestData) {
                        $modalInstance.dismiss();
                        $scope.refreshRequests();
                    }),
                    // Error handler
                    (function (error) {
                        $scope.message = error;
                    }));
            };

        }]);
