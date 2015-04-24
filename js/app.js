//function () {
// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp',
    ['ngRoute', 'ngResource', 'ngTouch', 'ngSanitize', 'ndexServiceApp', 'ui.bootstrap', 'angularFileUpload', 'uiServiceApp', 'ui.grid', 'ui.grid.resizeColumns', 'ui.grid.selection']);
//'ngAnimate', 'ngTouch', 'ui.grid', 'ui.grid.resizeColumns'
var net1, net2;
var cn, csn;
var cUser;

ndexApp.filter('encodeURIComponent', function() {
    return window.encodeURIComponent;
});

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
        setCurrentQueryTerms: function(currentQueryTerms)
        {
            this.currentQueryTerms = currentQueryTerms;
        },
        getCurrentQueryTerms: function()
        {
            return this.currentQueryTerms;
        },
        setCurrentQueryDepth: function(currentQueryDepth)
        {
            this.currentQueryDepth = currentQueryDepth;
        },
        getCurrentQueryDepth: function()
        {
            return this.currentQueryDepth;
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













