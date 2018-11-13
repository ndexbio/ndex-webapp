//function () {
// create the module and name it ndexApp
var ndexApp = angular.module('ndexApp',
    ['ngRoute', 'ngResource', 'ngTouch', 'ngSanitize', 'ndexServiceApp',//'ngDialog',
     'ui.bootstrap', 'angularFileUpload', 'uiServiceApp', 'ui.grid', 'ui.grid.resizeColumns',
     'ui.grid.selection', 'ui.grid.expandable', 'ui.grid.pinning', 'ui.grid.pagination',
      'ngclipboard', 'textAngular', 'ngtweet', 'ngAnimate', 'slick']);

ndexApp.filter('encodeURIComponent', function() {
    return window.encodeURIComponent;
});


// The code below allows you to change path URL with $location.path()
// without page reloading
// It is taken from https://www.consolelog.io/angularjs-change-path-without-reloading/
ndexApp.run(['$route', '$rootScope', '$location', function ($route, $rootScope, $location) {
    var original = $location.path;
    $location.path = function (path, reload) {
        if (reload === false) {
            if (sessionStorage.getItem('pageReloaded') === 'true') {
                sessionStorage.setItem('pageReloaded', 'false');
            } else {
                var lastRoute = $route.current;
                var un = $rootScope.$on('$locationChangeSuccess', function () {
                    $route.current = lastRoute;
                    un();
                });
            }
        }
        return original.apply($location, [path]);
    };
}]);

var safeURLs = window.ndexSettings.landingPageConfigServer + '**';
ndexApp.config(function($sceDelegateProvider) {
    $sceDelegateProvider.resourceUrlWhitelist([
        'self', safeURLs
    ]);
});


//Internet Explorer solution???
ndexApp.service('authInterceptor', function($q) {
    //noinspection JSUnusedGlobalSymbols
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
            /*
            if (response.status == 401){
                //$location.path('/signIn').search('returnTo', $location.path());
                return $q.reject(response);
            }
            else if (response.status == 409) {
                return $q.reject(response)
            }
            */
            return $q.reject(response);
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
    /* IE is not supported any longer ...
    var ua = window.navigator.userAgent;
    var msie = ua.indexOf('MSIE ');

    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./))      // If Internet Explorer, return version number
    {
        //initialize get if not there
        if (!$httpProvider.defaults.headers.get) {
            $httpProvider.defaults.headers.get = {};
        }
        //disable IE ajax request caching
        $httpProvider.defaults.headers.get['If-Modified-Since'] = '0';
    }
    */

    $httpProvider.interceptors.push('authInterceptor');
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
    function ($q, $location, $route, ndexUtility, ndexService, ndexNavigation, logInService, $rootScope, sharedProperties, $modalStack) {

        //var loggedInUser = ndexUtility.getUserCredentials();
        var loggedInUserId = sharedProperties.getCurrentUserId();
        //  (loggedInUser && loggedInUser['externalId']) ? loggedInUser['externalId'] : null;
        var networkUUID =  $route.current.params.identifier;

        var accessKey = ($route.current.params && $route.current.params.accesskey) ?
            $route.current.params.accesskey : null;

        var deferred = $q.defer();

        if (loggedInUserId) {

            // user logged in and is trying to access a network ... check if (s)he has
            // permissions to do so (has at least READ access on this network)

            (ndexService.getNetworkSummaryV2(networkUUID, accessKey))

                .success(
                    function () {
                        deferred.resolve();
                    })

                .error(
                    function (error) {

                        if (error.errorCode && (error.errorCode === 'NDEx_Unauthorized_Operation_Exception')) {

                            deferred.reject();

                            var title = 'You Do Not Have Access to this Network';
                            var message  = 'You do not have permission to access this network.  ' +
                                'Please contact the network owner and ask her/him to share this network with you.';

                            $modalStack.dismissAll();
                            ndexNavigation.genericInfoModal(title, message);
                            $location.path('/myAccount');

                        } else if (error.errorCode && (error.errorCode === 'NDEx_Object_Not_Found_Exception')) {

                            deferred.reject();

                            var title1 = 'Network Not Found';

                            var message1  = 'Network was not found on the NDEx server. ';

                            if (error.message) {
                                message1 = error.message;
                            }

                            $modalStack.dismissAll();
                            ndexNavigation.genericInfoModal(title1, message1);
                            $location.path('/myAccount');
                        }
                    });

        } else {

            //user anonymous; check if network is public and if not, ask if user wants to log in
            // this may execute when an owner of a private network sent a link to this network to
            // another user  who tries to access this network without being logged in (anonymously)

            (ndexService.getNetworkSummaryV2(networkUUID, accessKey))

                .success(
                    function () {
                        deferred.resolve();
                    })

                .error(
                    function (error) {

                        if (error.errorCode && (error.errorCode === 'NDEx_Unauthorized_Operation_Exception')) {

                            deferred.reject();

                            var message  = 'This network is not public. <br /> ' +
                                'If you log in, you may have access to it. <br />';

                            logInService.showLogInModal(message,
                                function() {
                                    //deferred.resolve();
                                    $rootScope.reloadRoute = true;
                                    $rootScope.$emit('LOGGED_IN');
                                },
                                function() {
                                    deferred.resolve();
                                });

                        } else if (error.errorCode && (error.errorCode === 'NDEx_Object_Not_Found_Exception')) {

                            deferred.reject();

                            var title2 = 'Network Not Found';

                            var message2  = 'Network was not found on the NDEx server. ';

                            if (error.message) {
                                message2 = error.message;
                            }

                            $modalStack.dismissAll();
                            ndexNavigation.genericInfoModal(title2, message2);
                            $location.path('/');
                        }
                    });
        }

        return deferred.promise;
    };

var checkIfUserExists =
    function ($q, $location, $route, ndexService, ndexNavigation, sharedProperties, $modalStack, $rootScope) {

        //var loggedInUser = ndexUtility.getUserCredentials();
        var loggedInUserId = sharedProperties.getCurrentUserId();
        var userUUID       =  $route.current.params.identifier;

        var deferred = $q.defer();
        if ((loggedInUserId === userUUID) && (loggedInUserId !== null) && (userUUID !== null)) {
            $location.path('/myAccount');
            return deferred.resolve();
        }

        ndexService.getUserByUUIDV2(userUUID)
            .success(
                function (user)
                {
                    $rootScope.user = user;
                    return deferred.resolve();
                })
            .error(
                function(error) {

                    if (error.errorCode && (error.errorCode === 'NDEx_Object_Not_Found_Exception')) {

                        deferred.reject();

                        var title = 'User Not Found';
                        var message = 'User was not found on the NDEx server. ';

                        if (error.message) {
                            message = error.message;
                        }

                        $modalStack.dismissAll();
                        ndexNavigation.genericInfoModal(title, message);

                        if (loggedInUserId) {
                            $location.path('/myAccount');
                        } else {
                            $location.path('/');
                        }
                    }
                }
            );

        return deferred.promise;
    };

// configure our routes
ndexApp.config(['$routeProvider', function ($routeProvider) {
    $routeProvider

        // route for the home page (where sign-in is handled)
        .when('/', {
            templateUrl: 'views/home.html',
            controller: 'homeController'
        })
        // route for the home page (where sign-in is handled)
        .when('/signIn', {
            templateUrl: 'views/home.html',
            controller: 'signInController'
        })

        // route for the api page
      /* .when('/api', {
            templateUrl: 'views/api.html',
            controller: 'apiController'
        }) */

        //route for search page
        .when('/search', {
            templateUrl: 'views/search.html',
            controller: 'searchController'
        })

        // route for the user page
        .when('/user/:identifier', {
            templateUrl: 'views/user.html',
            controller: 'userController',
            resolve: {
                //"check": checkRouting
                factory: checkIfUserExists
            }
        })

        // route for the MyAccount page
        .when('/myAccount/:pageNo?', {
            templateUrl: 'views/myAccount.html',
            controller: 'myAccountController'
        })

        // route for the group page
        .when('/group/:identifier', {
            templateUrl: 'views/group.html',
            controller: 'groupController'
        })

        // route for the Network Set
        .when('/networkSet/:identifier', {
            templateUrl: 'views/networkSet.html',
            controller: 'networkSetController'
        })

        // route for external network viewer page
        .when('/viewer', {
            templateUrl: 'views/network.html',
            controller: 'networkController'
        })

        // route for the network view page
        .when('/network/:identifier', {
            templateUrl: 'views/network.html',
            controller: 'networkController',

            resolve: {
                //"check": checkRouting
                factory: checkIfUserHasAccessToTheClickedNetwork
            }
        })

        // route for the alternative network view page for fixing the routing issue that JP's network link has
        .when('/newNetwork/:identifier', {
            templateUrl: 'views/network.html',
            controller: 'networkController',

            resolve: {
                //"check": checkRouting
                factory: checkIfUserHasAccessToTheClickedNetwork
            }
        })

        // route for the upload page
        .when('/upload', {
            templateUrl: 'views/upload.html',
            controller: 'uploadController'
        })


        // route to edit network custom properties
        .when('/properties/network/:identifier/:subNetworkId', {
            templateUrl: 'views/editNetworkPropertiesFixedForm.html',
            controller: 'editNetworkPropertiesFixedFormController'
        })

        .when('/access/network/:identifier', {
            templateUrl: 'views/manageNetworkAccess.html',
            controller: 'manageNetworkAccessController'
        })

        .when('/access/bulk/network', {
            templateUrl: 'views/manageBulkNetworkAccess.html',
            controller: 'manageBulkNetworkAccessController'
        })

        .when('/networkset/:identifier', {
            templateUrl: 'views/networkSet.html',
            controller: 'networkSetController'
        })

        .when('/access/group/:identifier', {
            templateUrl: 'views/manageGroupAccess.html',
            controller: 'manageGroupAccessController'
        });
}]);

//Handle enter key with ng-enter
ndexApp.directive('ngEnter', function($document) {
    return {
        scope: {
            ngEnter: '&'
        },
        link: function(scope) {
            var enterWatcher = function(event) {
                if (event.which === 13) {
                    scope.ngEnter();
                    scope.$apply();
                    event.preventDefault();
                    $document.unbind('keydown keypress', enterWatcher);
                }
            };
            $document.bind('keydown keypress', enterWatcher);
        }
    };
});













