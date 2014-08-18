ndexApp.controller('createGroupController',
    ['ndexService', 'ndexNavigation', '$scope', '$modalInstance',
        function (ndexService, ndexNavigation, $scope, $modalInstance) {

            $scope.group = {};

            $scope.cancel = function(){
                $modalInstance.dismiss();
            };

            $scope.create = function () {
                console.log("Attempting to call ndexService.createGroup ")
                ndexService.createGroup($scope.group,
                    // Handler
                    (function (response, headers) {
                        if (headers.)
                        $modalInstance.dismiss();
                        ndexNavigation.setAndDisplayCurrentGroup(groupData.UUID);
                    })
                    .error(function (error) {
                        $scope.message = error;
                    });
            };

        }]);
