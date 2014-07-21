ndexApp.controller('signInController',['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', function (ndexService, ndexUtility, sharedProperties, $scope, $location) {

    $scope.signIn = {};

    $scope.signIn.submitSignIn = function () {
        ndexService.signIn($scope.signIn.username, $scope.signIn.password).success(function(userData) {
            sharedProperties.setCurrentUser(userData.id, userData.username); //this info will have to be sent via emit if we want dynamic info on the nav bar
            $scope.$emit('LOGGED_IN'); //Angular service capability, shoot a signal up the scope tree notifying parent scopes this event occurred, see mainController
            $location.path("/");
        }).error(function(error) {
            $scope.signIn.message = error;
        });
    };

}]);