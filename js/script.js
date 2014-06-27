//function () {
// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp', ['ngRoute', 'ndexServiceApp']);
var net1, net2;
var cn, csn;
var cUser;

ndexApp.service('sharedProperties', function () {
    this.currentNetworkId = 'none';
    this.userLoggedIn = false;

    return {
        //may soon be deprecated
        getCurrentNetworkId: function () {
            return this.currentNetworkId;
        },
        setCurrentNetworkId: function (value) {
            this.currentNetworkId = value;
        },
        //
        isUserLoggedIn: function() {
            return this.userLoggedIn;
        },
        setUserLoggedIn: function(userBoolean) {
            this.userLoggedIn = userBoolean;
        }
    }
});




// configure our routes
ndexApp.config(function ($routeProvider) {
    $routeProvider

        // route for the home page
        .when('/', {
            templateUrl: 'pages/home.html',
            controller: 'mainController',
            controllerAs: 'main'
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
            controller: 'searchNetworksController',
            controllerAs: 'networkSearch'
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
        .when('/user', {
            templateUrl: 'pages/user.html',
            controller: 'userController',
            controllerAs: 'user'
        })

        // route for the networkQuery page
        .when('/networkQuery/:networkId', {
            templateUrl: 'pages/networkQuery.html',
            controller: 'networkQueryController',
            controllerAs: 'networkQuery'
        })

        // route for the signIn page
        .when('/signIn', {
            templateUrl: 'pages/signIn.html',
            controller: ''
        });
});

// create the controller and inject Angular's $scope
ndexApp.controller('mainController', function (ndexService, sharedProperties, $scope, $location, $http) {
    controller = this;

    controller.loggedIn = false;
    controller.username = '';
    controller.password = '';

    //controller.loggedIn = function() {return sharedProperties.isUserLoggedIn()};
    //console.log(controller.loggedIn());

    controller.goHome = function (name) {
        console.log("going to home");
        $location.path("/");
    };
    controller.submitSignIn = function () {
        NdexClient.clearUserCredentials();
        //sharedProperties.setUserLoggedIn(false); //refactor 1.0
        controller.loggedIn = false;
        var config = NdexClient.getSubmitUserCredentialsConfig(controller.username, controller.password);
        $http(config)
            .success(function (userdata) {
                //sharedProperties.setUserLoggedIn(true); //refactor 1.0
                controller.loggedIn = true;
                controller.goHome();
                NdexClient.setUserCredentials(userdata, $scope.password);
            })
            .error(function (error) {
                $.gritter.add({ title: "Error", text: "Error in sign-in: check username and password." });
            });

    }
    controller.getNdexServer = function () {
        console.log("called");
        return ndexService.getNdexServer();
    }

    controller.signout = function () {
        NdexClient.clearUserCredentials();
        controller.loggedIn = false;
        $scope.username = null;
        $scope.password = null;
        $location.path("/signIn");
    }
    // create a message to display in our view
    if (NdexClient.checkLocalStorage()) {

        if (localStorage.username) {
            controller.loggedIn = true;
            $scope.username = localStorage.username;
            $scope.password = localStorage.password;
        }
        $scope.networkSearchResults = null;
        controller.signout();
    } else {
        $.gritter.add({ title: "Error", text: "This web application requires a recent browser that supports localStorage" });
    }
});
//}) ();










