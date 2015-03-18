//function () {
// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp',
    ['ngRoute', 'ngResource', 'ndexServiceApp', 'ui.bootstrap', 'angularFileUpload', 'uiServiceApp']);
var net1, net2;
var cn, csn;
var cUser;

//Internet Explorer solution???
ndexApp.config(['$httpProvider', function ($httpProvider) {

    //First, test if this is IE. If it is not, don't mess with caching.
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf("MSIE ");

    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))      // If Internet Explorer, return version number
    {
        //initialize get if not there
        if (!$httpProvider.defaults.headers.get) {
            $httpProvider.defaults.headers.get = {};
        }
        //disable IE ajax request caching
        $httpProvider.defaults.headers.get['If-Modified-Since'] = '0';
    }
}]);

ndexApp.service('sharedProperties', function ($http) {
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
        },
        setDoSearch: function () {
            this.Search = true;
        },
        doSearch: function () {
            var val = this.Search
            this.Search = false;
            return val;
        },
        setSearchString: function (searchString) {
            this.searchString = searchString
        },
        getSearchString: function ()
        {
            return this.searchString;
        },
        setConfig: function(config)
        {
            this.config = cofig;
        },
        getConfig: function()
        {
            return this.config;
        }
    }
});


// configure our routes
ndexApp.config(['$routeProvider', function ($routeProvider) {
    $routeProvider

        // route for the home page (where sign-in is handled)
        .when('/', {
            templateUrl: 'pages/home.html',
            controller: ''
        })

        // route for the api page
        .when('/api', {
            templateUrl: 'pages/api.html',
            controller: 'apiController'
        })

        // route for the searchNetworks page
        .when('/searchNetworks', {
            templateUrl: 'pages/searchNetworks.html',
            controller: 'searchNetworksController'
        })

        // route for searchUsers page
        .when('/searchUsers', {
            templateUrl: 'pages/searchUsers.html',
            controller: 'searchUsersController'
        })

        //route for seatchGroups page
        .when('/searchGroups', {
            templateUrl: 'pages/searchGroups.html',
            controller: 'searchGroupsController'
        })

        // route for the user page
        .when('/user/:identifier', {
            templateUrl: 'pages/user.html',
            controller: 'userController'
        })

        // route for the group page
        .when('/group/:identifier', {
            templateUrl: 'pages/group.html',
            controller: 'groupController'
        })

        // route for the network page
        .when('/network/:identifier', {
            templateUrl: 'pages/network.html',
            controller: 'networkController'
        })

        // route for the upload page
        .when('/upload', {
            templateUrl: 'pages/upload.html',
            controller: 'uploadController'
        })

        // route to edit network custom properties
        .when('/properties/network/:identifier', {
            templateUrl: 'pages/editNetworkProperties.html',
            controller: 'editNetworkPropertiesController'
        })

        .when('/access/network/:identifier', {
            templateUrl: 'pages/manageNetworkAccess.html',
            controller: 'manageNetworkAccessController'
        })

        .when('/access/group/:identifier', {
            templateUrl: 'pages/manageGroupAccess.html',
            controller: 'manageGroupAccessController'
        });
}]);

// create the controller and inject Angular's $scope
ndexApp.controller('mainController', ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$modal', '$route', '$http',
    function (ndexService, ndexUtility, sharedProperties, $scope, $location, $modal, $route, $http) {



        $scope.main = {};

        $scope.main.url = $location; //expose the service to the scope for nav
        $scope.main.isCollapsed = true;  //angular-ui bootstrap collapse implementation

        $scope.main.loggedIn = false;

        $scope.$on('LOGGED_IN', function () {
            //listener for changes in log in.
            $scope.main.loggedIn = true;
            $scope.main.accountName = sharedProperties.getCurrentUserAccountName();
        });

        $scope.$on('LOGGED_OUT', function () {
            $scope.main.loggedIn = false;
            delete $scope.main.accountName;
        });

        //$scope.config = {};

        $scope.main.config = "bar";
        $scope.main.config.msg1 = 'punk';

        $http.get('ndex-webapp-config.json').
            success(function(data, status, headers, config) {
                $scope.config = data;
                $rootScope.$broadcast('READ_CONFIG_JSON', data);
            }).
            error(function(data, status, headers, config) {
                //Do nothing

            });


        // This checks for a successful transition to the home page.
        // If the user is logged in, then redirect to their account page
        //$scope.$on('$routeChangeSuccess', function(){
        //    if($scope.main.loggedIn){
        //        var externalId = ndexUtility.getLoggedInUserExternalId();
        //        if (externalId)
        //            $location.path("/user/"+externalId);
        //    }
        //})

        $scope.main.host = $location.host();
        $scope.main.port = $location.port();
        $scope.main.defaultSite = false;
        $scope.main.localSite = false;
        $scope.main.testSite = false;
        $scope.main.productionSite = false;
        if ($scope.main.host == 'localhost')
            $scope.main.localSite = true;
        else if ($scope.main.host == 'www.ndexbio.org')
            $scope.main.productionSite = true;
        else if ($scope.main.host == 'test.ndexbio.org')
            $scope.main.testSite = true;
        else
            $scope.main.defaultSite = true;


        $scope.main.signout = function () {
            ndexUtility.clearUserCredentials();
            $scope.main.loggedIn = false;
            sharedProperties.currentNetworkId = null;
            delete $scope.main.accountName;
            $location.path("/home");
        };

        //navbar
        $scope.main.getCurrentNetwork = function () {
            return sharedProperties.getCurrentNetworkId();
        };
        $scope.main.getCurrentUser = function () {
            return sharedProperties.getCurrentUserAccountName();
        };

        $scope.main.searchType = 'Networks';
        $scope.main.searchString = '';
        $scope.main.search = function () {
            ////console.log("navbar search");
            sharedProperties.setDoSearch();
            //could user url instead, good for refresh
            sharedProperties.setSearchString($scope.main.searchString);

            if ($scope.main.searchType == 'Networks') {
                if ($location.path() == '/searchNetworks')
                    $route.reload();
                else
                    $location.path("/searchNetworks");
            } else if ($scope.main.searchType == 'Users') {
                if ($location.path() == '/searchUsers')
                    $route.reload();
                else
                    $location.path("/searchUsers");
            } else if ($scope.main.searchType == 'Groups') {
                if ($location.path() == '/searchGroups')
                    $route.reload();
                else
                    $location.path("/searchGroups");
            }

        }

        //navbar initializations
        if ($location.path() == '/searchNetworks')
            $scope.main.searchType = 'Networks';
        if ($location.path() == '/searchUsers')
            $scope.main.searchType = 'Users';
        if ($location.path() == '/searchGroups')
            $scope.main.searchType = 'Groups';

        //end navbar code

        //initializions for page refresh
        var accountName = ndexUtility.getLoggedInUserAccountName();
        if (accountName) {
            sharedProperties.setCurrentUser(ndexUtility.getLoggedInUserExternalId(), accountName);
            $scope.main.accountName = accountName;
            $scope.main.loggedIn = true;
        }

        //---------------------------------------------
        // SignIn / SignUp Handler
        //---------------------------------------------

        $scope.signIn = {};
        $scope.signIn.newUser = {};

        $scope.signIn.submitSignIn = function () {
            ndexService.signIn($scope.signIn.accountName, $scope.signIn.password)
                .success(function (userData) {
                    sharedProperties.setCurrentUser(userData.externalId, userData.accountName); //this info will have to be sent via emit if we want dynamic info on the nav bar
                    $scope.$emit('LOGGED_IN'); //Angular service capability, shoot a signal up the scope tree notifying parent scopes this event occurred, see mainController
                    $location.path("/user/" + userData.externalId);
                    $scope.signIn.accountName = null;
                    $scope.signIn.password = null;
            }).error(function (error) {
                $scope.signIn.message = error;
            });
        };

        $scope.signIn.openSignUp = function () {
            $scope.signIn.modalInstance = $modal.open({
                templateUrl: 'signUp.html',
                scope: $scope,
                backdrop: 'static'
            });
        }

        $scope.signIn.cancelSignUp = function () {
            $scope.signIn.newUser = {};
            $scope.signIn.modalInstance.close();
            $scope.signIn.modalInstance = null;
        }

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

            ndexService.createUser($scope.signIn.newUser,
                function (userData) {
                    sharedProperties.setCurrentUser(userData.externalId, userData.accountName);
                    $scope.$emit('LOGGED_IN');
                    $scope.signIn.cancelSignUp();// doesnt really cancel
                    $location.path('user/' + userData.accountName);
                    $scope.isProcessing = false;
                },
                function (error) {
                    $scope.signIn.signUpErrors = error.data;
                    $scope.isProcessing = false;
                    //console.log(error)
                });

        }

    }]);











