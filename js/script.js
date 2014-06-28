//function () {
// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp', ['ngRoute', 'ndexServiceApp']);
var net1, net2;
var cn, csn;
var cUser;

ndexApp.service('sharedProperties', function () {
    //revise
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
    }
});




// configure our routes
ndexApp.config(function ($routeProvider) {
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
ndexApp.controller('mainController', function (ndexService, ndexUtility, sharedProperties, $scope, $location, $http) {
    controller = this;

    //consider placing variables to holder signin submit that are different from saved credentials
    controller.loggedIn = false;
    controller.username = '';
    controller.password = '';

    controller.goHome = function () {
        console.log("going to home");
        $location.path("/");
    };
    controller.submitSignIn = function () {
        //ndexUtility.clearUserCredentials();
        controller.loggedIn = false;
        ndexService.signIn(controller.username, controller.password).success(function(userData) {
            controller.loggedIn = true;
            controller.goHome();
        });
    };
    controller.getNdexServer = function () {
        //console.log("called");
        return ndexService.getNdexServer();
    };

    controller.signout = function () {
        ndexService.signOut();
        controller.loggedIn = false;
        controller.username = null;
        controller.password = null;
        $location.path("/signIn");
        console.log('scope not changing:' + controller.loggedIn);
    };

    console.log(controller.username);
    // create a message to display in our view
    if (ndexUtility.checkLocalStorage()) {

        if (localStorage.username) {
           // controller.loggedIn = true;
            controller.username = localStorage.username;
            controller.password = localStorage.password;
        }
        $scope.networkSearchResults = null;
        //controller.signout();
    } else {
        $.gritter.add({ title: "Error", text: "This web application requires a recent browser that supports localStorage" });
    }
});
//}) ();










