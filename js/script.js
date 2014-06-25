//function () {
// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp', ['ngRoute', 'ndexServiceApp']);
var net1, net2;
var cn, csn;
var cUser;

ndexApp.service('sharedProperties', function () {
    var currentNetworkId = 'none';

    return {
        getCurrentNetworkId: function () {
            return currentNetworkId;
        },
        setCurrentNetworkId: function (value) {
            currentNetworkId = value;
        }
    }
});




// configure our routes
ndexApp.config(function ($routeProvider) {
    $routeProvider

        // route for the home page
        .when('/', {
            templateUrl: 'pages/home.html',
            controller: 'mainController'
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
            controller: 'userController'
        })

        // route for the networkQuery page
        .when('/networkQuery', {
            templateUrl: 'pages/networkQuery.html',
            controller: 'networkQueryController',
            controllerAs: 'networkQuery'
        })

        // route for the signIn page
        .when('/signIn', {
            templateUrl: 'pages/signIn.html',
            controller: 'signInController'
        });
});

// create the controller and inject Angular's $scope
ndexApp.controller('mainController', function ($scope, $location, $http) {
    // create a message to display in our view
    if (NdexClient.checkLocalStorage()) {

        if (localStorage.username) {
            $scope.username = localStorage.username;
            $scope.password = localStorage.password;
        }
        $scope.networkSearchResults = null;
        $scope.signout = function () {
            NdexClient.clearUserCredentials();
            $scope.username = null;
            $scope.password = null;
            $location.path("/signIn");
        }
    } else {
        $.gritter.add({ title: "Error", text: "This web application requires a recent browser that supports localStorage" });
    }
});
//}) ();










