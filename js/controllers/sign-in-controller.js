ndexApp.controller('signInController', ['config', 'ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$modal', '$route', '$http', '$interval',
    function (config, ndexService, ndexUtility, sharedProperties, $scope, $location, $modal, $route, $http, $interval, Idle) {


        $scope.config = config;

//---------------------------------------------
// SignIn / SignUp Handler
//---------------------------------------------

        $scope.signIn = {};
        $scope.signIn.newUser = {};

        $scope.signIn.submitSignIn = function () {
            ndexUtility.clearUserCredentials();

            var userName = $scope.signIn.userName;
            var password = $scope.signIn.password;

            ndexService.authenticateUserV2(userName, password,
                 function(data) {
                    sharedProperties.setCurrentUser(data.externalId, data.userName); //this info will have to be sent via emit if we want dynamic info on the nav bar
                    ndexUtility.setUserCredentials(data.userName, data.externalId, $scope.signIn.password);
                    $scope.$emit('LOGGED_IN'); //Angular service capability, shoot a signal up the scope tree notifying parent scopes this event occurred, see mainController
                    //$location.path("/user/" + data.externalId);
                    $location.path("/myAccount");
                    $scope.signIn.userName = null;
                    $scope.signIn.password = null;
                },
                function(error) { //.error(function (data, status, headers, config, statusText) {
                    if (error && error.message) {
                        $scope.signIn.message = error.message;
                    } else {
                        $scope.signIn.message = "Unexpected error during sign-in with status " + error.status;
                    }
            });
        };

        $scope.signIn.cancel = function () {
            $location.path("/");
        };

        $scope.signIn.openSignUp = function () {
            $scope.signIn.modalInstance = $modal.open({
                templateUrl: 'signUp.html',
                scope: $scope,
                backdrop: 'static'
            });
        };

        $scope.signIn.cancelSignUp = function () {
            $scope.signIn.modalInstance.close();
            $scope.signIn.modalInstance = null;
            delete $scope.signIn.signUpErrors;
            $scope.signIn.newUser = {};
        };

        $scope.$watch("signIn.newUser.password", function () {
            delete $scope.signIn.signUpErrors;
        });
        $scope.$watch("signIn.newUser.passwordConfirm", function () {
            delete $scope.signIn.signUpErrors;
        });

        $scope.signIn.signUp = function () {
            if ($scope.isProcessing)
                return;
            $scope.isProcessing = true;
            //check if passwords match, else throw error
            if ($scope.signIn.newUser.password != $scope.signIn.newUser.passwordConfirm) {
                $scope.signIn.signUpErrors = 'Passwords do not match';
                $scope.isProcessing = false;
                return;
            }

            ndexService.createUserV2($scope.signIn.newUser,
                function (url) {

                    if (url) {
                        var newUserId = url.split('/').pop();
                        var userName = $scope.signIn.newUser.userName;
                        var password = $scope.signIn.newUser.password;

                        sharedProperties.setCurrentUser(newUserId, userName);
                        ndexUtility.setUserInfo(userName, newUserId);
                        ndexUtility.setUserCredentials(userName, newUserId, password);

                        $scope.$emit('LOGGED_IN');
                        $scope.signIn.cancelSignUp();// doesnt really cancel
                        $location.path('user/' + newUserId);
                        $scope.isProcessing = false;

                    } else {

                        $scope.isProcessing = false;
                        $scope.signIn.cancelSignUp();  // doesnt really cancel

                        // display modal asking to check email in order to activate the account
                        $scope.signIn.modalInstance = $modal.open({
                            templateUrl: 'signUpSuccess.html',
                            scope: $scope,
                            backdrop: 'static'
                        });
                    }
                },
                function (error) {
                    $scope.signIn.signUpErrors = error.message;
                    $scope.isProcessing = false;
                });
        };

        $scope.forgot = {};

        $scope.forgotPassword = function () {
            var modalInstance = $modal.open({
                templateUrl: 'forgotPassword.html',
                controller: function ($scope, $modalInstance, $log, forgot) {
                    $scope.forgot = forgot;
                    $scope.resetPassword = function () {
                        var url = ndexService.getNdexServerUri() + '/user/forgot-password';
                        $http.post(url, $scope.forgot.userName).success(function (data, status, headers, config) {
                            forgot.done = true;
                            forgot.errorMsg = null;
                            forgot.successMsg = "A new password has been sent to the email of record."
                        }).error(function (data, status, headers, config) {
                            forgot.errorMsg = data.message;
                        });
                    };

                    $scope.cancel = function () {
                        $modalInstance.dismiss('cancel');
                    };
                },
                resolve: {
                    forgot: function () {
                        return $scope.forgot;
                    }
                }
            });

            modalInstance.result.finally(function () {
                $scope.forgot = {};
            });

        };


    }]);
