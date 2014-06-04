ndexApp.controller('signInController', function ($scope, $location, $http) {
    $scope.username = null;
    $scope.password = null;
    $scope.goHome = function (name) {
        console.log("going to home");
        $location.path("/");
    };
    $scope.submitSignIn = function () {
        NdexClient.clearUserCredentials();
        var config = NdexClient.getSubmitUserCredentialsConfig($scope.username, $scope.password);
        $http(config)
            .success(function (userdata) {
                $scope.goHome();
                NdexClient.setUserCredentials(userdata, $scope.password);
            })
            .error(function (error) {
                $.gritter.add({ title: "Error", text: "Error in sign-in: check username and password." });
            });

    }
    $scope.getNdexServer = function () {
        return NdexClient.NdexServerURI;
    }
});