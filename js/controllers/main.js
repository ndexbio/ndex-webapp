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
        });


        $scope.config = config;

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

        $scope.main.startSignIn = function()
        {
            $scope.main.showSignIn = true;
            $location.path("/");
        };


        $scope.main.signout = function () {
            ndexUtility.clearUserCredentials();
            $scope.$emit('LOGGED_OUT');
            sharedProperties.currentNetworkId = null;
            sharedProperties.currentUserId = null;
            delete $http.defaults.headers.common['Authorization'];
            $scope.main.showSignIn = false;
            //delete $scope.main.accountName;
            $location.path("/");
        };

        //The purpose of the heart beat is measure the time since the app was last used.
        var lastHeartbeat = localStorage.getItem('last-heartbeat');
        if( lastHeartbeat )
        {
            if( Date.now() - lastHeartbeat > config.idleTime )
                $scope.main.signout();
        }

        var recordHeartbeat = function()
        {
            localStorage.setItem('last-heartbeat', Date.now() );
        };

        //Hard-coding the heartbeat as a ratio of the idle time for now. So, a heart-beat will be set
        $interval(recordHeartbeat, config.idleTime / 100 );

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
