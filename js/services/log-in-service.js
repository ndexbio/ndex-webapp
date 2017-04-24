ndexServiceApp.factory('logInService', ['sharedProperties', 'ndexUtility', 'ndexService', '$modal',
    function (sharedProperties, ndexUtility, ndexService, $modal) {

        var factory = {};

        factory.showLogInModal = function(message, successHandler, errorHandler)
        {
            var modalInstance = $modal.open({
                templateUrl: 'pages/logInModal.html',

                controller: function($scope, $modalInstance) {

                    $scope.message = message;

                    $scope.credentials = {user: "", password: "", errorMessage: ""};

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
                                ndexUtility.setUserCredentials(data.userName, data.externalId, password);
                                ndexUtility.setUserInfo(data.userName, data.firstName, data.lastName, data.externalId);
                                successHandler();
                            },
                            function(error, status) {

                                if (error && error.message) {
                                    $scope.credentials['errorMessage'] = error.message;
                                } else {
                                    $scope.credentials['errorMessage'] = "Unexpected error during sign-in with status " + error.status;
                                };
                                errorHandler();
                            });
                    };

                }
            });
        };
        
        return factory;
    }
]);