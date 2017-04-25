//function () {
// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp',
    ['ngRoute', 'ngResource', 'ngTouch', 'ngSanitize', 'ndexServiceApp',//'ngDialog',
     'ui.bootstrap', 'angularFileUpload', 'uiServiceApp', 'ui.grid', 'ui.grid.resizeColumns',
     'ui.grid.selection', 'ngIdle', 'ngclipboard', 'textAngular']);
//'ngAnimate', 'ngTouch', 'ui.grid', 'ui.grid.resizeColumns'
//var net1, net2;
var cn, csn;
var cUser;

ndexApp.filter('encodeURIComponent', function() {
    return window.encodeURIComponent;
});

//Internet Explorer solution???
ndexApp.service('authInterceptor', function($q, $rootScope, $location) {
    return {
        request: function (config) {
            return config || $q.when(config);
        },
        requestError: function(request){
            return $q.reject(request);
        },
        response: function (response) {
            return response || $q.when(response);
        },
        responseError: function (response) {
            if (response.status == 401){
                //$location.path('/signIn').search('returnTo', $location.path());
                return $q.reject(response);
            }
            //return $q.reject(response);
        }
    };


//    var service = this;

//    service.responseError = function(response) {
 //       if (response.status == 401){
 //           $location.path('/signIn').search('returnTo', $location.path());;
 //       }
  //      return $q.reject(response);
    //};
}).config(['$httpProvider', function ($httpProvider) {

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

    $httpProvider.interceptors.push('authInterceptor');
}]);


// configure our routes
ndexApp.config(['$routeProvider', function ($routeProvider) {
    $routeProvider

        // route for the home page (where sign-in is handled)
        .when('/', {
            templateUrl: 'pages/home.html',
            controller: 'homeController'
        })
        // route for the home page (where sign-in is handled)
        .when('/signIn', {
            templateUrl: 'pages/signIn.html',
            controller: 'signInController'
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

        //route for search page
        .when('/search', {
            templateUrl: 'pages/search.html',
            controller: 'searchController'
        })

        // route for the user page
        .when('/user/:identifier', {
            templateUrl: 'pages/user.html',
            controller: 'userController'
        })

        // route for the MyAccount page
        .when('/myAccount', {
            templateUrl: 'pages/myAccount.html',
            controller: 'myAccountController'
        })
            
        // route for the group page
        .when('/group/:identifier', {
            templateUrl: 'pages/group.html',
            controller: 'networkSetController'
        })

        // route for the group page
        .when('/networkSet/:identifier', {
            templateUrl: 'pages/networkSet.html',
            controller: 'networkSetController'
        })

        // route for the network view page
        .when('/network/:identifier', {
            templateUrl: 'pages/network.html',
            controller: 'networkController',

            resolve: {
                //"check": checkRouting
                factory: checkIfUserHasAccessToTheClickedNetwork
            }
        })
            
        // route for the upload page
        .when('/upload', {
            templateUrl: 'pages/upload.html',
            controller: 'uploadController'
        })

        // route to edit network custom properties
        .when('/properties/network/:identifier/:subNetworkId', {
            templateUrl: 'pages/editNetworkProperties.html',
            controller: 'editNetworkPropertiesController'
        })

        .when('/access/network/:identifier', {
            templateUrl: 'pages/manageNetworkAccess.html',
            controller: 'manageNetworkAccessController'
        })

        .when('/access/bulk/network', {
            templateUrl: 'pages/manageBulkNetworkAccess.html',
            controller: 'manageBulkNetworkAccessController'
        })

        .when('/access/group/:identifier', {
            templateUrl: 'pages/manageGroupAccess.html',
            controller: 'manageGroupAccessController'
        });
}]);


/*
 * This function is need to handle a situation when one user sends a URI of network to another user via e-mail,
 * for example,  http://dev.ndexbio.org/#/network/16c9dc4d-1e0f-11e7-8145-06832d634f41, and recipient clicks
 * the URL in the browser, ot just copies and pastes the URL into the browser.
 *
 * 1) If network is PUBLIC, and user (anonymous or logged in) selects the link, (s)he is presented with network
 *    in the Graphic Network View.
 *
 * 2) If user is logged in and has access to the network (whether (s)he is the owner or this network is shared with
 *    her/him), this network is presented to the user in the  Graphic Network View.
 *
 * 3) If user is logged in and has no access to the network, the "You Do Not Have Access to this Network" modal is shown
 *    to the user.
 *
 * 4) If user is not logged in (anonymous) and selects the URI from email of just copies and pastes the URI into the
 *    browser, in case network is PUBLIC, it is presented to the user.  If network is private, a login modal is
 *    presented stating that user may have access to the network after signing in.  If user signs in and has access to
 *    the network, it is presented to him/her, if user signs in and has no access to the network, (s)he is presented with
 *    the "You Do Not Have Access to this Network" modal (step 3).
 */

var checkIfUserHasAccessToTheClickedNetwork =
    function ($q, $location, $route, ndexUtility, ndexService, ndexNavigation, logInService, $rootScope) {

     var loggedInUser = ndexUtility.getUserCredentials();
     var loggedInUserId =
        (loggedInUser && loggedInUser['externalId']) ? loggedInUser['externalId'] : null;
     var networkUUID =  $route.current.params.identifier;
    

     var deferred = $q.defer();

     if (loggedInUserId) {
         
         // user logged in and is trying to access a network ... check if (s)he has
         // permissions to do so (has at least READ access on this network)
         
         (ndexService.getNetworkSummaryV2(networkUUID))

             .success(
                 function (network) {
                     deferred.resolve();
                 })

             .error(
                 function (error) {

                     if (error.errorCode && (error.errorCode == 'NDEx_Unauthorized_Operation_Exception')) {

                         deferred.reject();

                         var title = "You Do Not Have Access to this Network";
                         var message  = "You do not have permission to access this network.  " +
                             "Please contact the network owner and ask her/him to share this network with you.";

                         ndexNavigation.genericInfoModal(title, message);
                         $location.path("/myAccount");
                     };
                 });

     } else {

         //user anonymous; check if network is public and if not, ask if user wants to log in
         // this may execute when an owner of a private network sent a link to this network to
         // another user  who tries to access this network without being logged in (anonymously)

         (ndexService.getNetworkSummaryV2(networkUUID))

             .success(
                 function (network) {

                     deferred.resolve();
                 })

             .error(
                 function (error) {

                     if (error.errorCode && (error.errorCode == 'NDEx_Unauthorized_Operation_Exception')) {

                         deferred.reject();
                         
                         var message  = "This network is not public. <br /> " +
                             "If you log in, you may have access to it. <br />";

                         logInService.showLogInModal(message, 
                             function() {
                                 //deferred.resolve();
                                 $rootScope.reloadRoute = true;
                                 $rootScope.$emit('LOGGED_IN');
                             }, 
                             function() {
                                 deferred.resolve();
                             });
                     };
                 });

     };

     return deferred.promise;
 };


//Idle
ndexApp.config(["IdleProvider", function(IdleProvider) {
    var config = angular.injector(['ng', 'ndexServiceApp']).get('config');
    IdleProvider.idle( config.idleTime );
}]);

ndexApp.run(function(Idle){
    Idle.watch();
});

//Handle enter key with ng-enter
ndexApp.directive('ngEnter', function($document) {
    return {
        scope: {
            ngEnter: "&"
        },
        link: function(scope, element, attrs) {
            var enterWatcher = function(event) {
                if (event.which === 13) {
                    scope.ngEnter();
                    scope.$apply();
                    event.preventDefault();
                    $document.unbind("keydown keypress", enterWatcher);
                }
            };
            $document.bind("keydown keypress", enterWatcher);
        }
    }
});













