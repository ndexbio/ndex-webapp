ndexApp.controller('createGroupController',
    ['ndexService', 'ndexNavigation', '$scope', '$modalInstance',
        function (ndexService, ndexNavigation, $scope, $modalInstance) {

            $scope.group = {};
            $scope.message = null;

            $scope.cancel = function(){
                $modalInstance.dismiss();
            };

            $scope.create = function () {
                console.log("Attempting to call ndexService.createGroup ")
                ndexService.createGroup($scope.group,
                    // Success Handler
                    (function (groupData) {
                        $modalInstance.dismiss();
                        ndexNavigation.displayCurrentGroup(groupData.UUID);
                    }),
                    // Error handler
                    (function (error) {
                        $scope.message = error;
                    }));
            };

        }]);
