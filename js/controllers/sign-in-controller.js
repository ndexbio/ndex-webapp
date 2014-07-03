ndexApp.controller('signInController',['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', function (ndexService, ndexUtility, sharedProperties, $scope, $location) {

    $scope.signIn = {};
    $scope.signIn.servers = [];
    $scope.signIn.currentServer = 0;
    $scope.signIn.editServerForm = false;
    $scope.signIn.serverInstance = {};

    //todo fix bugs with sign in without credentials
    //todo fix bug on sign out and then sign back in

    $scope.signIn.editServer = function(addEntry){
        $scope.signIn.editServerForm = true;
        if(addEntry) {
            if($scope.signIn.currentServer != $scope.signIn.servers.length) {
                $scope.signIn.currentServer = $scope.signIn.servers.length;
            }
            $scope.signIn.serverInstance = {};
        } else {
            $scope.signIn.serverInstance = $scope.signIn.servers[$scope.signIn.currentServer];
        }
    };

    $scope.signIn.saveServer = function() {
        if($scope.signIn.serverInstance != {}){$scope.signIn.servers[$scope.signIn.currentServer] = $scope.signIn.serverInstance;}
        //dont save password?
        ndexUtility.saveServers($scope.signIn.servers);
        $scope.signIn.editServerForm = false;
    };

    $scope.signIn.deleteServer = function() {
        $scope.signIn.servers.splice($scope.signIn.currentServer,1);
        ndexUtility.saveServers($scope.signIn.servers);
    };

    $scope.signIn.submitSignIn = function () {
        $scope.signIn.saveServer();//should be done automatically
        ndexService.signIn($scope.signIn.servers[$scope.signIn.currentServer].username, $scope.signIn.servers[$scope.signIn.currentServer].password).success(function(userData) {
            sharedProperties.setCurrentUserId(userData.id);
            $scope.$emit('LOGGED_IN');
            $location.path("/");
        });
    };

    //initializations
    $scope.signIn.servers = ndexUtility.getSavedServers();

}]);