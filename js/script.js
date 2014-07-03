//function () {
// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp', ['ngRoute', 'ndexServiceApp', 'ui.bootstrap']);
var net1, net2;
var cn, csn;
var cUser;

ndexApp.service('sharedProperties', function () {
    return {
        getCurrentNetworkId: function () {
            if (!this.currentNetworkId) this.currentNetworkId = "C25R1174";   // hardwired for testing
            return this.currentNetworkId;
        },
        setCurrentNetworkId: function (value) {
            this.currentNetworkId = value;
        },
        getCurrentUserId: function () {
            //if (!this.currentUserId) this.currentUserId = "C31R4";   // hardwired for testing
            return this.currentUserId;
        },
        setCurrentUserId: function (value) {
            this.currentUserId = value;
        }
    }
});




// configure our routes
ndexApp.config(['$routeProvider', function ($routeProvider) {
    $routeProvider

        // route for the home page
        .when('/', {
            templateUrl: 'pages/home.html',
            controller: ''
        })

        // route for the about page
        .when('/about', {
            templateUrl: 'pages/about.html',
            controller: 'aboutController'
        })

        // route for the contact page
        .when('/contact', {
            templateUrl: 'pages/contact.html',
            controller: 'contactController'
        })

        // route for the searchNetworks page
        .when('/searchNetworks', {
            templateUrl: 'pages/searchNetworks.html',
            controller: 'searchNetworksController'
        })

        // route for the cjs page
        .when('/cjs', {
            templateUrl: 'pages/cjs.html',
            controller: 'cjsController'
        })

        // route for the triptych page
        .when('/triptych', {
            templateUrl: 'pages/triptych.html',
            controller: 'triptychController'
        })

        // route for the compare page
        .when('/compare', {
            templateUrl: 'pages/compare.html',
            controller: 'compareController'
        })

        // route for the user page
        .when('/user/:userId', {
            templateUrl: 'pages/user.html',
            controller: 'userController'
        })

        // route for the networkQuery page
        .when('/networkQuery/:networkId', {
            templateUrl: 'pages/networkQuery.html',
            controller: 'networkQueryController'
        })

        // route for the signIn page
        .when('/signIn', {
            templateUrl: 'pages/signIn.html',
            controller: ''
        });
}]);

// create the controller and inject Angular's $scope
ndexApp.controller('mainController', ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$modal', function(ndexService, ndexUtility, sharedProperties, $scope, $location, $modal) {

    $scope.main = {};

    $scope.main.url = $location; //expose the service to the scope for nav
    $scope.main.isCollapsed = true;

    $scope.main.loggedIn = false;
    $scope.main.username = '';

    //home page
    $scope.main.getNdexServer = function () {
        return ndexService.getNdexServer();
    };

    //sign in page

    $scope.main.servers = [];
    $scope.main.currentServer = 0;
    $scope.main.editServerForm = false;
    $scope.main.serverInstance = {};

    $scope.main.editServer = function(addEntry){
        $scope.main.editServerForm = true;
        if(addEntry) {
            if($scope.main.currentServer != $scope.main.servers.length) {
                $scope.main.currentServer = $scope.main.servers.length;
            }
            $scope.main.serverInstance = {};
        } else {
            $scope.main.serverInstance = $scope.main.servers[$scope.main.currentServer];
        }
    };

    $scope.main.saveServer = function() {
        if($scope.main.serverInstance != {}){$scope.main.servers[$scope.main.currentServer] = $scope.main.serverInstance;}
        ndexUtility.saveServers($scope.main.servers);
        $scope.main.editServerForm = false;
    };

    $scope.main.deleteServer = function() {
        $scope.main.servers.splice($scope.main.currentServer,1);
        ndexUtility.saveServers($scope.main.servers);
    };

    $scope.main.goHome = function () {
        $location.path("/");
    };
    $scope.main.submitSignIn = function () {
        $scope.main.saveServer();
        ndexService.signIn($scope.main.servers[$scope.main.currentServer].username, $scope.main.servers[$scope.main.currentServer].password).success(function(userData) {
            sharedProperties.setCurrentUserId(userData.id);
            $scope.main.loggedIn = true;
            $scope.main.goHome();
        });
    };

    $scope.main.signout = function () {
        ndexService.signOut();
        $scope.main.loggedIn = false;
        $scope.main.servers[$scope.main.currentServer].password = null;
        $location.path("/signIn");
    };

    //initialization

    $scope.main.servers = ndexUtility.getSavedServers();

    if (ndexUtility.checkLocalStorage()) {
        //the following code should be replace my method in ndex service or ndex utility
        if (localStorage.username) {
            $scope.main.loggedIn = true;
            $scope.main.username = localStorage.username;
            $scope.main.password = localStorage.password;
            sharedProperties.setCurrentUserId(localStorage.userId);
        }
        $scope.networkSearchResults = null;
        //$scope.main.signout();
    } else {
        $.gritter.add({ title: "Error", text: "This web application requires a recent browser that supports localStorage" });
    }

    //navbar
    $scope.main.getCurrentNetwork = function() {
        return sharedProperties.getCurrentNetworkId();
    };
    $scope.main.getCurrentUser = function() {
        return sharedProperties.getCurrentUserId();
    }
}]);
//}) ();










