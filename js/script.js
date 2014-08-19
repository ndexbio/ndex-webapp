//function () {
// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp',
    ['ngRoute', 'ngResource', 'ndexServiceApp', 'ui.bootstrap', 'angularFileUpload']);
var net1, net2;
var cn, csn;
var cUser;

ndexApp.service('sharedProperties', function () {
    // this service is going to act as a general global variable throughout the application
    // should consider implementing some degree of relationship with localStorage to guard against
    // refreshes. In fact, we might just use cookies or something else because we may not want this to be permanent
    return {
        getCurrentNetworkId: function () {
            //if (!this.currentNetworkId) this.currentNetworkId = "C25R1174";   // hardwired for testing
            return this.currentNetworkId;
        },
        setCurrentNetworkId: function (value) {
            //should save in local storage
            this.currentNetworkId = value;
        },
        getCurrentUserId: function () {
            //if (!this.currentUserId) this.currentUserId = "C31R4";   // hardwired for testing
            return this.currentUserId;
        },
        getCurrentUserAccountName: function () {
            //if (!this.currentUserId) this.currentUserId = "C31R4";   // hardwired for testing
            return this.accountName;
        },
        setCurrentUser: function (value, accountName) {
            this.currentUserId = value;
            this.accountName = accountName;
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

        // route for the user page
        .when('/user/:userId', {
            templateUrl: 'pages/user.html',
            controller: 'userController'
        })

        // route for the group page
        .when('/group/:groupId', {
            templateUrl: 'pages/group.html',
            controller: 'groupController'
        })

        // route for the network page
        .when('/network/:networkId', {
            templateUrl: 'pages/network.html',
            controller: 'networkController'
        })

        // route for the upload page
        .when('/upload', {
            templateUrl: 'pages/upload.html',
            controller: 'uploadController'
        })

        // route for the signIn page
        .when('/signIn', {
            templateUrl: 'pages/signIn.html',
            controller: 'signInController'
        });
}]);

// create the controller and inject Angular's $scope
ndexApp.controller('mainController', ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$modal', function(ndexService, ndexUtility, sharedProperties, $scope, $location, $modal) {

    $scope.main = {};

    $scope.main.url = $location; //expose the service to the scope for nav
    $scope.main.isCollapsed = true;  //angular-ui bootstrap collapse implementation

    $scope.main.loggedIn = false;

    $scope.$on('LOGGED_IN', function() {
        $scope.main.loggedIn = true;
        $scope.main.accountName = sharedProperties.getCurrentUserAccountName();
    });

    $scope.main.signout = function () {
        ndexService.signOut();
        $scope.main.loggedIn = false;
        delete $scope.main.accountName;
        $location.path("/signIn");
    };

    //navbar
    $scope.main.getCurrentNetwork = function() {
        return sharedProperties.getCurrentNetworkId();
    };
    $scope.main.getCurrentUser = function() {
        return sharedProperties.getCurrentUserAccountName();
    };


    var userData = ndexUtility.getUserCredentials();
    if(userData) {
        sharedProperties.setCurrentUser(userData.userId, userData.accountName);
        $scope.main.accountName = userData.accountName;
        $scope.main.loggedIn = true;
    }

    //test group functions
    var group = 
    {
        "accountType": "Group",
        "description": "change",
        "organizationName" : "group",
        "accountName": "group",
        "image": "http://i.imgur.com/09oVvZg.jpg",
        "website": "www.triptychjs.com",
        "type": "Group"
    }

    $scope.main.createGroup = function() {

        ndexService.createGroup(group, 
            function(groupData) {
                $scope.main.group = groupData;
            },
            function(error) {
                $scope.main.errors = error;
            });

    }

    $scope.main.getGroup = function() {
        ndexService.getGroup($scope.main.group.externalId,
            function(groupData) {
                $scope.main.retrievedGroup = groupData;
            },
            function(error) {
                $scope.main.errors = error;
            });
    }

    $scope.main.deleteGroup = function() {
        ndexService.deleteGroup($scope.main.group.externalId,
            function() {
                $scope.main.group = {};
                $scope.main.retrievedGroup = {};
            },
            function(error) {
                $scope.main.errors = error;
            });
    }

    $scope.main.searchGroups = function() {
        ndexService.searchGroups({},
            function(results){
                $scope.main.searchResults = results;
            },
            function(error) {
                $scope.main.errors = error;
            });
    }

}]);
//}) ();










