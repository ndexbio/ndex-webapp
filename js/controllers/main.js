// create the controller and inject Angular's $scope
ndexApp.controller('mainController', ['config', 'ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$modal', '$route', '$http', '$interval',
    function (config, ndexService, ndexUtility, sharedProperties, $scope, $location, $modal, $route, $http, $interval, Idle) {

        $scope.$on('IdleStart', function() {
            $scope.main.signout();
        });

        $scope.main = {};

        $scope.main.url = $location; //expose the service to the scope for nav
        $scope.main.isCollapsed = true;  //angular-ui bootstrap collapse implementation

        $scope.main.loggedIn = false;
        $scope.main.showSignIn = false;

        $scope.$on('LOGGED_IN', function () {
            //listener for changes in log in.
            $scope.main.loggedIn = true;
            $scope.main.accountName = sharedProperties.getCurrentUserAccountName();
        });

        $scope.$on('LOGGED_OUT', function () {
            $scope.main.loggedIn = false;
            delete $scope.main.accountName;
            ndexUtility.clearUserCredentials();
            sharedProperties.currentNetworkId = null;
            sharedProperties.currentUserId = null;
            delete $http.defaults.headers.common['Authorization'];
            $scope.main.showSignIn = false;
        });

        if( $location.path() == '/' )
            $scope.main.hideSearchBar = true;
        else
            $scope.main.hideSearchBar = false;

        $scope.$on('$routeChangeSuccess',function(){
            if( $location.path() == '/' )
                $scope.main.hideSearchBar = true;
            else
                $scope.main.hideSearchBar = false;
        });




        // check configuration parameters loaded from ndex-webapp-coinfig.js;
        // if any of config parameeters missing, assign default values
        if (typeof config.requireAuthentication === 'undefined') {
            config.requireAuthentication = false;
        }
        if (typeof config.welcome === 'undefined') {
            config.welcome = "NDEx Web App deployed at My Company";
        }
        if (typeof config.networkQueryLimit === 'undefined') {
            config.networkQueryLimit = 1500;
        }
        if (typeof config.networkDisplayLimit === 'undefined') {
            config.networkDisplayLimit = 300;
        }
        if (typeof config.networkTableLimit === 'undefined') {
            config.networkTableLimit = 500;
        }
        if (typeof config.protocol === 'undefined') {
            config.protocol = "http";
        }
        if (typeof config.idleTime === 'undefined') {
            config.idleTime = 3600;
        }
        if (typeof config.uploadSizeLimit === 'undefined') {
            config.uploadSizeLimit = "none";
        }

        if (typeof config.logo === 'undefined') {
            config.logo = {};
        }
        if (typeof config.logo.href === 'undefined') {
            config.logo.href = "http://www.ndexbio.org";
        }
        if (typeof config.messages === 'undefined') {
            config.messages = {};
        }
        if (typeof config.messages.serverDown === 'undefined') {
            config.messages.serverDown =
                "<img src='http://www.ndexbio.org/wp-content/uploads/2015/06/manteinance2.png'>";
        }

        if (typeof config.contactUs === 'undefined') {
            config.contactUs = {};
        }
        if (typeof config.contactUs.name === 'undefined') {
            config.contactUs.name = "Contact Us";
        }
        if (typeof config.contactUs.href === 'undefined') {
            config.contactUs.href = "http://www.ndexbio.org/contact-us";
        }
        if (typeof config.contactUs.target === 'undefined') {
            config.contactUs.target = "NDEx Home";
        }

        if (typeof config.signIn === 'undefined') {
            config.signIn = {};
        }
        if (typeof config.signIn.header === 'undefined') {
            config.signIn.header = "Sign in to your NDEx account";
        }
        if (typeof config.signIn.footer === 'undefined') {
            config.signIn.footer = "Need an account?";
        }
        if (typeof config.signIn.showForgotPassword === 'undefined') {
            config.signIn.showForgotPassword = true;
        }
        if (typeof config.signIn.showSignup === 'undefined') {
            config.signIn.showSignup = true;
        }
        if (typeof config.ndexServerUri === 'undefined') {
            // ndexServerUri is a required parameter -- give an error message;
            // replace the messages.serverDown message
            config.messages.serverDown = "Error in ndex-webapp-config.js:<br>" +
                                         "The parameter ndexServerUri is required.<br>" +
                                         "Please edit the configuration file to provide this URI."   ;
        }


        $scope.config = config;

        //Test whether the server is up or not.
        var ndexServerUri = ndexService.getNdexServerUri();
        $scope.main.serverIsDown = false;
        $http.get(ndexServerUri + '/admin/status').
            success(function(data, status, headers, config) {
                // this callback will be called asynchronously
                // when the response is available
            }).
            error(function(data, status, headers, config) {
                $scope.main.serverIsDown = true;
            });



        $scope.main.startSignIn = function()
        {
            $scope.main.showSignIn = true;
            $location.path("/");
        };




        $scope.main.signout = function () {
            $scope.$emit('LOGGED_OUT');
            $location.path("/");
        };

        $scope.main.handleStorageEvent = function(event)
        {
            if( event.key == "loggedInUser" )
            {
                if( event.newValue == null || event.newValue == "null" )
                {
                    $scope.main.signout();
                }
            }
        };

        if (window.addEventListener)
        {
            window.addEventListener("storage", $scope.main.handleStorageEvent, false);
        }
        else
        {
            window.attachEvent("onstorage", $scope.main.handleStorageEvent);
        }

        //The purpose of the heart beat is measure the time since the app was last used.
        var lastHeartbeat = localStorage.getItem('last-heartbeat');
        if( lastHeartbeat )
        {
            if( Date.now() - lastHeartbeat > config.idleTime * 1000 )
                $scope.main.signout();
        }

        var recordHeartbeat = function()
        {
            localStorage.setItem('last-heartbeat', Date.now() );
        };

        //Hard-coding the heartbeat as a ratio of the idle time for now. So, a heart-beat will be set
        $interval(recordHeartbeat, config.idleTime * 10 );

        //Whenever the browser or a tab containing the app is closed, record the heart beat.
        window.onbeforeunload = function (event)
        {
            recordHeartbeat();
        };

        //To avoid affecting other controllers, destroy window.onbeforeunload when this controller goes out of scope.
        $scope.$on('$destroy', function() {
            delete window.onbeforeunload;
        });

        //navbar
        $scope.main.getCurrentNetwork = function () {
            return sharedProperties.getCurrentNetworkId();
        };
        $scope.main.getCurrentUserId = function () {
            return sharedProperties.getCurrentUserId();
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

        };

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
            $scope.$emit('LOGGED_IN');
        }

        //---------------------------------------------
        // SignIn / SignUp Handler
        //---------------------------------------------

        $scope.signIn = {};
        $scope.signIn.newUser = {};

        $scope.signIn.submitSignIn = function ()
        {
            ndexUtility.clearUserCredentials();
            var url = ndexService.getNdexServerUri() + '/user/authenticate';
            var config =
            {
                headers: {
                    'Authorization':  "Basic " + btoa($scope.signIn.accountName + ":" + $scope.signIn.password)
                }
            };
            $http.get(url, config).
                success(function(data, status, headers, config, statusText) {
                    sharedProperties.setCurrentUser(data.externalId, data.accountName); //this info will have to be sent via emit if we want dynamic info on the nav bar
                    ndexUtility.setUserCredentials(data.accountName, data.externalId, $scope.signIn.password);
                    $scope.$emit('LOGGED_IN'); //Angular service capability, shoot a signal up the scope tree notifying parent scopes this event occurred, see mainController
                    $location.path("/user/" + data.externalId);
                    $scope.signIn.accountName = null;
                    $scope.signIn.password = null;
                }).
                error(function(data, status, headers, config, statusText) {
                    $scope.signIn.message = "Your credentials are incorrect.";
                });
        };

        $scope.signIn.cancel = function()
        {
            $scope.main.showSignIn=false;
        };

        $scope.signIn.openSignUp = function () {
            $scope.signIn.modalInstance = $modal.open({
                templateUrl: 'signUp.html',
                scope: $scope,
                backdrop: 'static'
            });
        };

        $scope.signIn.cancelSignUp = function () {
            $scope.signIn.newUser = {};
            $scope.signIn.modalInstance.close();
            $scope.signIn.modalInstance = null;
        };

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
                    ndexUtility.setUserInfo(userData.accountName, userData.externalId);
                    $scope.$emit('LOGGED_IN');
                    $scope.signIn.cancelSignUp();// doesnt really cancel
                    $location.path('user/' + userData.externalId);
                    $scope.isProcessing = false;
                },
                function (error) {
                    $scope.signIn.signUpErrors = error.data.message;
                    $scope.isProcessing = false;
                    //console.log(error)
                });

        };

        $scope.forgot = {};

        $scope.forgotPassword = function()
        {
            var modalInstance = $modal.open({
                templateUrl: 'forgotPassword.html',
                controller: function ($scope, $modalInstance, $log, forgot)
                {
                    $scope.forgot = forgot;
                    $scope.resetPassword = function ()
                    {
                        var url = ndexService.getNdexServerUri() + '/user/forgot-password';
                        $http.post(url, $scope.forgot.accountName ).
                            success(function(data, status, headers, config) {
                                forgot.done = true;
                                forgot.errorMsg = null;
                                forgot.successMsg = "A new password has been sent to the email of record."
                            }).
                            error(function(data, status, headers, config) {
                                forgot.errorMsg = data.message;
                            });
                    };

                    $scope.cancel = function () {
                        $modalInstance.dismiss('cancel');
                    };
                },
                resolve:
                {
                    forgot: function ()
                    {
                        return $scope.forgot;
                    }
                }
            });

            modalInstance.result.finally( function()
            {
               $scope.forgot = {};
            });

        };



    }]);
