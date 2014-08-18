ndexApp.controller('createGroupController',
    ['ndexService', 'ndexNavigation', '$scope', '$modalInstance',
        function (ndexService, ndexNavigation, $scope, $modalInstance) {

            $scope.group = {};

            $scope.cancel = function(){
                $modalInstance.dismiss();
            };

            $scope.create = function () {
                console.log("Attempting to call ndexService.createGroup ")
                ndexService.createGroup($scope.group.groupName, $scope.group.organizationName)
                    .success(function (groupData) {
                        $modalInstance.dismiss();
                        ndexNavigation.setAndDisplayCurrentGroup(groupData.UUID);
                    }).error(function (error) {
                        $scope.message = error;
                    });
            };

        }]);
