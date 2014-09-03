ndexApp.controller('signInController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$modal',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $modal) {

    $scope.signIn = {};
    $scope.signIn.newUser = {};

    $scope.signIn.submitSignIn = function () {
        ndexService.signIn($scope.signIn.accountName, $scope.signIn.password).success(function(userData) {
            sharedProperties.setCurrentUser(userData.externalId, userData.accountName); //this info will have to be sent via emit if we want dynamic info on the nav bar
            $scope.$emit('LOGGED_IN'); //Angular service capability, shoot a signal up the scope tree notifying parent scopes this event occurred, see mainController
            $location.path("/user/"+userData.externalId);
        }).error(function(error) {
            $scope.signIn.message = error;
        });
    };

    $scope.signIn.openSignUp = function(){
        $scope.signIn.modalInstance = $modal.open({
            templateUrl: 'signUp.html',
            scope: $scope,
            backdrop: 'static'
        });
    }

    $scope.signIn.cancelSignUp = function(){
        $scope.signIn.newUser = {};
        $scope.signIn.modalInstance.close();
        $scope.signIn.modalInstance = null;
    }

    $scope.signIn.signUp = function(){
        //check if passwords match, else throw error
        if($scope.signIn.newUser.password != $scope.signIn.newUser.passwordConfirm) {
            $scope.signIn.signUpErrors = 'Passwords do not match';
            return;
        }

        ndexService.createUser($scope.signIn.newUser, 
            function(userData) {
                sharedProperties.setCurrentUser(userData.externalId, userData.accountName);
                $scope.$emit('LOGGED_IN');
                $scope.signIn.cancelSignUp();// doesnt really cancel
                $location.path('user/'+userData.accountName);
            },
            function(error) {
                $scope.signIn.signUpErrors = error.data;
                console.log(error)
            });

    }

}]);