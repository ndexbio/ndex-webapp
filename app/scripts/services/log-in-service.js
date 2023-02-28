ndexServiceApp.factory('logInService', ['sharedProperties', 'ndexUtility', 'ndexService', '$modal',
    function (sharedProperties, ndexUtility, ndexService, $modal) {

        var factory = {};

        factory.showLogInModal = function(message, successHandler, errorHandler)
        {
            var modalInstance = $modal.open({
                templateUrl: 'views/logInModal.html',

                controller: function($scope, $modalInstance) {

                    $scope.message = message;

                    $scope.credentials = {user: "", password: "", errorMessage: ""};

             //       $scope.isNotSafari = !window.isSafari;

                    $scope.cancel = function() {
                        $modalInstance.dismiss();
                    };
                    
                    $scope.signIn = function() {
                        var userName = $scope.credentials['user'];
                        var password = $scope.credentials['password'];

                        ndexService.authenticateUserV2(userName, password,
                            function(data) {
                                $modalInstance.dismiss();
                                sharedProperties.setCurrentUser(data.externalId, data.userName);
                                ndexUtility.setUserInfo(data.userName, data.firstName, data.lastName, data.externalId, password);

                                window.currentNdexUser = data;
                                window.currentSignInType = 'basic';
                                successHandler();
                            },
                            function(error, status) {

                                if (error && error.message) {
                                    $scope.credentials['errorMessage'] = error.message;
                                } else {
                                    $scope.credentials['errorMessage'] = "Unexpected error during sign-in with status " + error.status;
                                }
                                errorHandler();
                            });
                    }


                    $scope.signInWithGoogle = function () {
                        //gapi.auth2.getAuthInstance().signIn({prompt:'consent select_account'}).then(googleUserHandler, googleFailureHandler);
                        console.log(window.keycloak);
                        window.keycloak.login();
                    };


            /*        var googleUserHandler = function (curUser) {

                        ndexService.authenticateUserWithGoogleIdToken(
                            function(data) {
                                sharedProperties.setCurrentUser(data.externalId, data.userName);

                                window.currentNdexUser = data;
                                window.currentSignInType = 'google';

                                successHandler();

                            },
                            function(error, status) {

                                if (error && error.message) {
                                    $scope.credentials['errorMessage'] = error.message;
                                } else {
                                    $scope.credentials['errorMessage'] = "Unexpected error during sign-in with status " + error.status;
                                }
                                errorHandler();
                            });

                    } */

                    var googleFailureHandler = function ( err) {
                        if ( err.error != "popup_closed_by_user")
                            $scope.signIn.message = "Failed to authenticate with google: " + err.error;
                    }

                }
            });
        };
        
        return factory;
    }
]);