// create the controller and inject Angular's $scope
ndexApp.controller('mainController', [ 'ndexService', 'ndexUtility', 'sharedProperties', 'userSessionTablesSettings',
    '$scope', '$location', '$modal', '$route', '$http', '$interval', 'uiMisc', '$rootScope', '$uibModal', 'ndexSpinner',
    '$window',
    function ( ndexService, ndexUtility, sharedProperties, userSessionTablesSettings,
              $scope, $location, $modal, $route, $http, $interval, uiMisc, $rootScope, $uibModal, ndexSpinner,
               $window) {

        $scope.$on('IdleStart', function() {
            if (window.currentSignInType === 'basic') {
                $scope.main.signout();
            }
        });

        $(document).ready(function() {
            $('[data-toggle="tooltip"]').tooltip();
        });

        function setTooltip(message) {
            $('#copyNDExCitationToClipboardId').tooltip('hide')
                .attr('data-original-title', message)
                .tooltip('show');
        }

        $scope.changeTitle = function() {
            setTooltip('Copy the NDEx citation information to the clipboard');
        };

        $scope.logosLoaded = false;

        //noinspection JSCheckFunctionSignatures
        var clipboard = new Clipboard('#copyNDExCitationToClipboardId');

        /*
        function hideTooltip() {
            setTimeout(function() {
                $('#copyNDExCitationToClipboardId').tooltip('hide');
            }, 1000);
        };
        */
        clipboard.on('success', function() {
            setTooltip('Copied');
        });
        $scope.setToolTips = function(){
            var myToolTips = $('[data-toggle="tooltip"]');
            myToolTips.tooltip();
        };

        $scope.slickConfig = {
            enabled: true,
            autoplay: true,
            draggable: false,
            autoplaySpeed: 1000,
            method: {},
            initialSlide: 0,
            event: {
                beforeChange: function (event, slick, currentSlide, nextSlide) {
                },
                afterChange: function (event, slick, currentSlide, nextSlide) {
                }
            }
        };

        $scope.showFooter = true;

        $scope.main = {};
        $scope.main.ndexServerVersion = null;

        $scope.main.url = $location; //expose the service to the scope for nav

        $scope.main.loggedIn = false;
        $scope.main.showSignIn = true;

        var showUserGreeting = function() {
            var userFirstAndLastNames = sharedProperties.getLoggedInUserFirstAndLastNames();
            $scope.main.userFirstAndLastNames = userFirstAndLastNames ? 'Hi, ' + userFirstAndLastNames : 'MyAccount';
        };

        var signInHandler = function () {
            //listener for changes in log in.
            $scope.main.loggedIn = true;
            $scope.main.showSignIn = false;
            $scope.main.userName = sharedProperties.getCurrentUserAccountName();

            showUserGreeting();

            if ($rootScope.reloadRoute) {
                delete $rootScope.reloadRoute;
                $route.reload();
            }
        };

        $scope.featuredContentDefined = false;

        $rootScope.$on('LOGGED_IN', signInHandler);

        var signOutHandler = function () {
            $rootScope.signOut = true;
            if (typeof(Storage) !== 'undefined') {
                sessionStorage.clear();
            }
            userSessionTablesSettings.clearState();

            $scope.main.loggedIn = false;
            delete $scope.main.userName;
            if (window.currentSignInType === 'basic') {
                ndexUtility.clearUserCredentials();
                delete $http.defaults.headers.common.Authorization;
            } else {
                /** @namespace gapi.auth2.getAuthInstance() **/
                var authInstanceObj =  gapi.auth2.getAuthInstance();
                if (authInstanceObj) {
                    /** @namespace authInstanceObj.signOut() **/
                    authInstanceObj.signOut();
                }
                //gapi.auth2.getAuthInstance().signOut();
            }
	        window.currentNdexUser = null;
            window.currentSignInType = null;
            sharedProperties.currentNetworkId = null;
            sharedProperties.currentUserId = null;
            $scope.main.showSignIn = true;

            $location.path('/');
            //$window.location.href = '#/';
            //$window.location.reload();
        };

        $scope.$on('LOGGED_OUT', signOutHandler);

        $rootScope.$on('SHOW_UPDATED_USER_NAME', showUserGreeting);


        $scope.main.searchString = '';
        $scope.strLength = 0;
        $scope.maxSearchInputLength = 250;

        $scope.notAllowedInSearchExpansion      = [' NOT ', ' OR ', ' AND ', ':'];
        $scope.notAllowedInSearchExpansionStart = ['NOT ',  'OR ',  'AND '];
        $scope.notAllowedInSearchExpansionEnd   = [' NOT',  ' OR',  ' AND'];
        $scope.notAllowedInSearchExpansionEqual = ['NOT',   'OR',   'AND', ':'];

        $scope.arrayOfValsForSearchExpansion = ['ALL', 'NETWORKS'];
        var searchTitle = 'Perform Search Term Expansion (Genes and Proteins only)';

        $scope.main.searchTermExpansionSelected = false;

        $scope.searchTermExpansionEnabled = false;


        $scope.checkLengthOfSearchString = function() {
            var strLength = $scope.main.searchString.length;
            //console.log("strLength = " + strLength);
            if (strLength >= $scope.maxSearchInputLength) {
                $scope.stringTooLongWarning = 'The maximum length for this field is ' +
                    $scope.maxSearchInputLength + ' characters.';
            } else {
                if ($scope.stringTooLongWarning) {
                    delete $scope.stringTooLongWarning;
                }
            }
        };

        $scope.main.goToNetworkView = function(path){
            if (sharedProperties.currentNetworkId) {
                $location.path(path + sharedProperties.currentNetworkId);
            }
        };

        $scope.main.goToCurrentUser = function(){
            if (sharedProperties.currentUserId) {
                //$location.path("/user/" + sharedProperties.currentUserId);
                $location.path('/myAccount');
            }
        };

        $scope.isActiveNetworkView = function (viewLocation) {
            var locationPath = $location.path();
            var viewLocationPath = viewLocation + sharedProperties.getCurrentNetworkId();
            return viewLocationPath === locationPath;
        };

        $scope.isActiveUserView = function (viewLocation) {
            var locationPath = $location.path();
            var viewLocationPath = viewLocation + sharedProperties.getCurrentUserId();
            return viewLocationPath === locationPath;
        };


        function initMissingConfigParams(config) {

            // check configuration parameters loaded from ndex-webapp-config.js;
            // if any of config parameters missing, assign default values
            if (typeof config.requireAuthentication === 'undefined') {
                config.requireAuthentication = false;
            }
            if (typeof config.welcome === 'undefined') {
                config.welcome = 'NDEx Web App deployed at My Company';
            }
            if (typeof config.networkQueryEdgeLimit === 'undefined') {
                config.networkQueryEdgeLimit = 50000;
            }
            if (typeof config.idleTime === 'undefined') {
                config.idleTime = 3600;
            }
            if (typeof config.uploadSizeLimit === 'undefined') {
                config.uploadSizeLimit = 'none';
            }

            if (typeof config.messages === 'undefined') {
                config.messages = {};
            }
            if (typeof config.messages.serverDown === 'undefined') {
                config.messages.serverDown = '<img src="images/maintenance.png">';
            }

            //if (typeof config.contactUs === 'undefined') {
            //    config.contactUs = {};
            //}
            //if (typeof config.contactUs.name === 'undefined') {
            //    config.contactUs.name = "Contact Us";
            //}
            //if (typeof config.contactUs.href === 'undefined') {
            //    config.contactUs.href = "http://www.ndexbio.org/contact-us";
            //}
            //if (typeof config.contactUs.target === 'undefined') {
            //    config.contactUs.target = "NDEx Home";
            //}

            if (typeof config.signIn === 'undefined') {
                config.signIn = {};
            }
            if (typeof config.signIn.header === 'undefined') {
                config.signIn.header = 'Sign in to your NDEx account';
            }
            if (typeof config.signIn.footer === 'undefined') {
                config.signIn.footer = 'Need an account?';
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
                config.messages.serverDown = 'Error in ndex-webapp-config.js:<br>' +
                    'The parameter ndexServerUri is required.<br>' +
                    'Please edit the configuration file to provide this URI.'   ;
            }


            // check if any of configurable Navigation Bar links are missing
            // and assign default values if yes
            if (typeof config.logoLink === 'undefined') {
                config.logoLink = {};
            }
            if (typeof config.logoLink.href === 'undefined') {
                config.logoLink.href = 'http://preview.ndexbio.org';
            }
            if (typeof config.logoLink.warning === 'undefined') {
                config.logoLink.warning = 'Warning! You are about to leave your organization\'s domain. Follow this link?';
            }
            if (typeof config.logoLink.showWarning === 'undefined') {
                config.logoLink.showWarning = false;
            }

            if (typeof config.aboutLink === 'undefined') {
                config.aboutLink = {};
            }
            if (typeof config.aboutLink.label === 'undefined') {
                config.aboutLink.label = 'About';
            }
            if (typeof config.aboutLink.href === 'undefined') {
                config.aboutLink.href = 'http://home.ndexbio.org/about-ndex';
            }
            if (typeof config.aboutLink.warning === 'undefined') {
                config.logoLink.warning = 'Warning! You are about to leave your organization\'s domain. Follow this link?';
            }
            if (typeof config.aboutLink.showWarning === 'undefined') {
                config.aboutLink.showWarning = false;
            }

            if (typeof config.documentationLink === 'undefined') {
                config.documentationLink = {};
            }
            if (typeof config.documentationLink.label === 'undefined') {
                config.documentationLink.label = 'Docs';
            }
            if (typeof config.documentationLink.href === 'undefined') {
                config.documentationLink.href = 'http://home.ndexbio.org/quick-start';
            }
            if (typeof config.documentationLink.warning === 'undefined') {
                config.documentationLink.warning = 'Warning! You are about to leave your organization\'s domain. Follow this link?';
            }
            if (typeof config.documentationLink.showWarning === 'undefined') {
                config.documentationLink.showWarning = false;
            }
            if ((typeof config.refreshIntervalInSeconds === 'undefined') ||
                (typeof config.refreshIntervalInSeconds !== 'number') ||
                config.refreshIntervalInSeconds < 0) {
                // refresh interval defaults to 0 seconds (disabled) in case it is not explicitly defined,
                // defined as non-number or negative number
                config.refreshIntervalInSeconds = 0;
            }
            if (typeof config.reportBugLink === 'undefined') {
                config.reportBugLink = {};
            }
            if (typeof config.reportBugLink.label === 'undefined') {
                config.reportBugLink.label = 'Report Bug';
            }
            if (typeof config.reportBugLink.href === 'undefined') {
                config.reportBugLink.href = 'http://home.ndexbio.org/report-a-bug';
            }
            if (typeof config.reportBugLink.warning === 'undefined') {
                config.reportBugLink.warning = 'Warning! You are about to leave your organization\'s domain. Follow this link?';
            }
            if (typeof config.reportBugLink.showWarning === 'undefined') {
                config.reportBugLink.showWarning = false;
            }

            if (typeof config.contactUsLink === 'undefined') {
                config.contactUsLink = {};
            }
            if (typeof config.contactUsLink.label === 'undefined') {
                config.contactUsLink.label = 'Contact Us';
            }
            if (typeof config.contactUsLink.href === 'undefined') {
                config.contactUsLink.href = 'http://home.ndexbio.org/contact-us/';
            }
            if (typeof config.contactUsLink.warning === 'undefined') {
                config.contactUsLink.warning = 'Warning! You are about to leave your organization\'s domain. Follow this link?';
            }
            if (typeof config.contactUsLink.showWarning === 'undefined') {
                config.contactUsLink.showWarning = false;
            }


            if (typeof config.searchDocLink === 'undefined') {
                config.searchDocLink = {};
            }
            if (typeof config.searchDocLink.label === 'undefined') {
                config.searchDocLink.label = 'Documentation on Searching in NDEx';
            }
            if (typeof config.searchDocLink.href === 'undefined') {
                config.searchDocLink.href = 'http://home.ndexbio.org/finding-and-querying-networks/';
            }
            if (typeof config.searchDocLink.warning === 'undefined') {
                config.searchDocLink.warning = 'Warning! You are about to leave your organization\'s domain. Follow this link?';
            }
            if (typeof config.searchDocLink.showWarning === 'undefined') {
                config.searchDocLink.showWarning = false;
            }

            if ((typeof config.openInCytoscapeEdgeThresholdWarning === 'undefined') ||
                (typeof config.openInCytoscapeEdgeThresholdWarning !== 'number') ||
                config.openInCytoscapeEdgeThresholdWarning < 0) {
                config.openInCytoscapeEdgeThresholdWarning = 0;
            }
        }
        
        // check configuration parameters loaded from ndex-webapp-config.js;
        // if any of config parameters missing, assign default values

        initMissingConfigParams(window.ndexSettings);
        $scope.linkToReleaseDocs = window.ndexSettings.welcome.linkToReleaseDocs;

        // "Cite NDEx" menu item is not configurable.
        window.ndexSettings.citeNDEx = {};
        window.ndexSettings.citeNDEx.label = 'Cite NDEx';


        $scope.config = window.ndexSettings;

        //Test whether the server is up or not.
        $scope.main.serverIsDown = null;


        window.navigator.ndexServerVersion = 'ndex-webapp/';

        ndexService.getServerStatus('full',
            function(data) {
                // this callback will be called asynchronously
                // when the response is available
                if (data && data.properties) {
                    if (data.properties.ImporterExporters && data.properties.ImporterExporters.length > 0) {
                        $scope.$parent.ImporterExporters = JSON.parse(JSON.stringify(data.properties.ImporterExporters));
                    }
                    /** @namespace data.properties.ServerVersion **/
                    if (data.properties.ServerVersion) {
                        $scope.main.ndexServerVersion = data.properties.ServerVersion;
                        window.navigator.ndexServerVersion += data.properties.ServerVersion;
                        document.getElementById('ndexServerVersionId').style.color = '#149FEC';
                    }
                }
                $scope.main.serverIsDown = false;

                document.getElementById('hiddenElementId').style.display  = '';
                document.getElementById('hiddenElementId1').style.display = '';
                document.getElementById('hiddenElementId2').style.display = '';
                document.getElementById('hiddenElementId3').style.display = '';

                document.getElementById('hiddenElementId4').style.display = '';
                document.getElementById('hiddenElementId5').style.display = '';
            },
            function() {
                $scope.main.serverIsDown = true;
                window.navigator.ndexServerVersion += 'unknown';

                document.getElementById('hiddenElementId').style.display  = '';
                document.getElementById('hiddenElementId1').style.display = '';
                document.getElementById('hiddenElementId2').style.display = '';
                document.getElementById('hiddenElementId3').style.display = '';

                document.getElementById('hiddenElementId4').style.display = '';
                document.getElementById('hiddenElementId5').style.display = '';

                // this will remove (hide) NDEx logo from the top left in the Navigation Bar
                document.getElementById('hiddenElementId').style.background  = 'transparent';
            });



        $scope.main.showSignInSignUpOptions = function() {
            $uibModal.open({
                templateUrl: 'views/signInSignUpModal.html',

                controller: function ($scope, $uibModalInstance) {

                    $scope.header             = window.ndexSettings.signIn.header;
                    $scope.showForgotPassword = window.ndexSettings.signIn.showForgotPassword;
                    $scope.cancelLabel        = 'Cancel';
                    $scope.confirmLabel       = 'Sign In';

                    $scope.needAnAccount      = window.ndexSettings.signIn.footer + '&nbsp;';
                    $scope.showSignUp         = window.ndexSettings.signIn.showSignup;

                    $scope.googleSSO          = window.googleSSO;

                    $scope.signIn         = {'userName': '', 'password': ''};
                    $scope.signIn.newUser = {};

                    $scope.cancelButtonDisabled  = false;
                    $scope.confirmButtonDisabled = true;

                    delete $scope.errors;

                    $scope.setToolTips = function(){
                        var myToolTips = $('[data-toggle="tooltip"]');
                        myToolTips.tooltip();
                    };

                    $scope.close = function () {
                        $uibModalInstance.dismiss();
                    };
                    $scope.cancel = function () {
                        $uibModalInstance.dismiss();
                    };

                    $scope.$watch('signIn.userName', function() {
                        delete $scope.errors;
                    });
                    $scope.$watch('signIn.password', function() {
                        delete $scope.errors;
                    });

                    var basicAuthSuccessHandler = function(data) {
                        sharedProperties.setCurrentUser(data.externalId, data.userName); //this info will have to be sent via emit if we want dynamic info on the nav bar
                        ndexUtility.setUserInfo(data.userName, data.firstName, data.lastName, data.externalId, $scope.signIn.password);

                        window.currentNdexUser = data;
                        window.currentSignInType = 'basic';

                        $rootScope.$emit('LOGGED_IN');
                        $location.path('/myAccount');
                        $scope.signIn.userName = null;
                        $scope.signIn.password = null;

                        $uibModalInstance.dismiss();
                    };

                    $scope.submitSignIn = function () {
                        ndexUtility.clearUserCredentials();

                        var userName = $scope.signIn.userName;
                        var password = $scope.signIn.password;

                        ndexService.authenticateUserV2(userName, password,
                            basicAuthSuccessHandler,
                            function(error) { //.error(function (data, status, headers, config, statusText) {

                                if (error && error.message) {
                                    $scope.errors = error.message;
                                } else {
                                    $scope.errors = 'Unexpected error during sign-in with status ' + error.status;
                                }
                            });
                    };

                    $scope.openBasicAuthSignUp = function () {

                        var signInOptionsModalInstance = $uibModalInstance;

                        $uibModal.open({
                            templateUrl: 'signUp.html',
                            backdrop: 'static',

                            controller: function ($scope, $uibModalInstance) {
                                $scope.signIn         = {'userName': '', 'password': ''};
                                $scope.signIn.newUser = {};

                                $scope.cancel = function () {
                                    signInOptionsModalInstance.dismiss();
                                    $uibModalInstance.dismiss();
                                };

                                $scope.back = function () {
                                    $uibModalInstance.dismiss();
                                };

                                $scope.$watch('signIn.newUser.firstName', function () {
                                    $scope.signIn.signUpErrors = null;
                                });
                                $scope.$watch('signIn.newUser.lastName', function () {
                                    $scope.signIn.signUpErrors = null;
                                });
                                $scope.$watch('signIn.newUser.emailAddress', function () {
                                    $scope.signIn.signUpErrors = null;
                                });
                                $scope.$watch('signIn.newUser.userName', function () {
                                    $scope.signIn.signUpErrors = null;
                                });
                                $scope.$watch('signIn.newUser.password', function () {
                                    $scope.signIn.signUpErrors = null;
                                });
                                $scope.$watch('signIn.newUser.passwordConfirm', function () {
                                    $scope.signIn.signUpErrors = null;
                                });

                                $scope.basicAuthSignUp = function () {
                                    //check if passwords match, else throw error
                                    if ($scope.signIn.newUser.password !== $scope.signIn.newUser.passwordConfirm) {
                                        $scope.signIn.signUpErrors = 'Passwords do not match';
                                        return;
                                    }

                                    var basicAuthSuccessHandler = function(data) {
                                        sharedProperties.setCurrentUser(data.externalId, data.userName); //this info will have to be sent via emit if we want dynamic info on the nav bar
                                        ndexUtility.setUserInfo(data.userName, data.firstName, data.lastName, data.externalId, $scope.signIn.password);

                                        window.currentNdexUser = data;
                                        window.currentSignInType = 'basic';

                                        $rootScope.$emit('LOGGED_IN');
                                        $location.path('/myAccount');
                                        $scope.signIn.userName = null;
                                        $scope.signIn.password = null;

                                        $scope.cancel();  // basically, close modals
                                    };

                                    ndexService.createUserV2($scope.signIn.newUser,
                                        function (url) {

                                            if (url) {
                                                var newUserId = url.split('/').pop();
                                                var data = {};

                                                data.userName          = $scope.signIn.newUser.userName;
                                                data.firstName         = $scope.signIn.newUser.firstName;
                                                data.lastName          = $scope.signIn.newUser.lastName;
                                                data.externalId        = newUserId;

                                                $scope.signIn.password = $scope.signIn.newUser.password;

                                                basicAuthSuccessHandler(data);

                                            } else {
                                                $scope.cancel();  // basically, close modals

                                                // display modal asking to check email in order to activate the account
                                                $uibModal.open({
                                                    templateUrl: 'signUpSuccess.html',
                                                    backdrop: 'static'
                                                });
                                            }
                                        },
                                        function (error) {
                                            $scope.signIn.signUpErrors = error.message;
                                        });
                                };
                            }

                        });
                    };


                    $scope.forgot = {};

                    $scope.forgotPassword = function () {
                        $uibModalInstance.dismiss();

                        $uibModal.open({
                            templateUrl: 'forgotPassword.html',
                            controller: function ($scope, $uibModalInstance, $log, forgot) {
                                $scope.forgot = forgot;
                                $scope.resetPassword = function () {
                                    $scope.isProcessing = true;

                                    var spinner = 'spinnerResetPasswordId';
                                    ndexSpinner.startSpinner(spinner);

                                    ndexService.getUserByUserNameV2($scope.forgot.accountName,
                                        function(data) {
                                            var userId = (data && data.externalId) ? data.externalId : null;
                                            if (userId) {

                                                ndexService.emailNewPasswordV2(userId,
                                                    function () {
                                                        ndexSpinner.stopSpinner();
                                                        forgot.done = true;
                                                        forgot.errorMsg = null;
                                                        forgot.successMsg = 'A new password has been sent to the email of record.';
                                                        $scope.isProcessing = false;
                                                    },
                                                    function (error) {
                                                        ndexSpinner.stopSpinner();
                                                        forgot.errorMsg = error.message;
                                                        $scope.isProcessing = false;
                                                    });
                                            }
                                            else {
                                                ndexSpinner.stopSpinner();
                                                forgot.errorMsg = 'Unable to get User Id for user ' +
                                                    $scope.forgot.accountName + ' and request password reset.';
                                                $scope.isProcessing = false;
                                            }
                                        },
                                        function(error){
                                            ndexSpinner.stopSpinner();
                                            forgot.errorMsg =  error.message;
                                            $scope.isProcessing = false;
                                        });
                                };

                                $scope.cancel = function () {
                                    $uibModalInstance.dismiss();
                                };
                                $scope.back = function () {
                                    $rootScope.$emit('SHOW_SIGN_IN_SIGN_UP_MODAL');
                                    $uibModalInstance.dismiss();
                                };

                                $scope.$watch('forgot.accountName', function() {
                                    delete $scope.forgot.successMsg;
                                    delete $scope.forgot.errorMsg;
                                });
                            },
                            resolve: {
                                forgot: function () {
                                    return $scope.forgot;
                                }
                            }
                        });

                        $uibModalInstance.result.finally(function () {
                            $scope.forgot = {};
                        });

                    };


                    var googleUserHandler = function (curUser) {

                        var spinner = 'spinnerSignInWithGoogleId';
                        ndexSpinner.startSpinner(spinner);

                        ndexService.authenticateUserWithGoogleIdToken(
                            function(data) {
                                ndexSpinner.stopSpinner();
                                sharedProperties.setCurrentUser(data.externalId, data.userName);

                                window.currentNdexUser = data;
                                window.currentSignInType = 'google';

                                $rootScope.$emit('LOGGED_IN');

                                $location.path('/myAccount');
                                $scope.signIn.userName = null;
                                $scope.signIn.password = null;

                                $uibModalInstance.dismiss();
                            },
                            function(error) {
                                ndexSpinner.stopSpinner();

                                if (error) {
                                    if (error.errorCode === 'NDEx_Object_Not_Found_Exception') {

                                        //var previousModalInstance = $uibModalInstance;
                                        $uibModalInstance.close();

                                        $uibModal.open({
                                            templateUrl: 'createNewAccountViaGoogle.html',
                                            controller: function ($scope, $uibModalInstance) {

                                                $scope.title = 'Create New Account';
                                                $scope.message =
                                                    'No account was found in NDEx for the selected email address, ' +
                                                    'so we are creating one for you.<br><br>  ' +
                                                    'Please review and accept our ' +
                                                    '<a target="_blank" href="http://home.ndexbio.org/disclaimer-license">Terms and Conditions</a>' +
                                                    ' and then click the blue Sign Up button to complete your registration.';

                                                delete $scope.errors;

                                                $scope.cancel = function() {
                                                    $uibModalInstance.dismiss();
                                                };

                                                $scope.back = function() {
                                                    $uibModalInstance.dismiss();
                                                    $rootScope.$emit('SHOW_SIGN_IN_SIGN_UP_MODAL');
                                                };

                                                $scope.signUpWithGoogle = function() {
                                                    $scope.isProcessing = true;
                                                    delete $scope.errors;

                                                    var spinner = 'spinnerCreateNewAccountViaGoogleId';
                                                    ndexSpinner.startSpinner(spinner);

                                                    ndexService.createUserWithGoogleIdTokenV2(
                                                        function() {
                                                            ndexService.authenticateUserWithGoogleIdToken(
                                                                function(data) {
                                                                    $scope.cancel(); // close modal
                                                                    $scope.isProcessing = false;
                                                                    sharedProperties.setCurrentUser(data.externalId, data.userName);

                                                                    window.currentNdexUser = data;
                                                                    window.currentSignInType = 'google';

                                                                    $rootScope.$emit('LOGGED_IN');
                                                                    $location.path('/myAccount');
                                                                    ndexSpinner.stopSpinner();
                                                                },
                                                                function(error) {
                                                                    $scope.isProcessing = false;
                                                                    ndexSpinner.stopSpinner();
                                                                    $scope.errors = error.message;
                                                                });
                                                        },
                                                        function(error) {
                                                            $scope.isProcessing = false;
                                                            ndexSpinner.stopSpinner();
                                                            $scope.errors = error.message;
                                                        });
                                                };

                                            }
                                        });

                                    } else if (error.message) {
                                        $scope.errors = error.message;
                                    } else {
                                        $scope.errors = 'Unexpected error during sign-in with status ' + error.status;
                                    }
                                }
                            });

                    };

                    var googleFailureHandler = function (err) {
                        if (err.error !== 'popup_closed_by_user') {
                            $scope.errors = 'Failed to authenticate with google: ' + err.error;
                        }
                    };

                    $scope.signIn.SignInWithGoogle = function () {

                        ndexUtility.clearUserCredentials();
                        delete $scope.errors;
                        $scope.signIn.userName = null;
                        $scope.signIn.password = null;

                        gapi.auth2.getAuthInstance().signIn({prompt:'consent select_account'}).then(googleUserHandler, googleFailureHandler);
                    };
                }
            });
        }

        /*
         * Only Google Chrome, Firefox or Safari browsers are supported.
         * Check if the currently used browser is supported.
         */
        $scope.main.isSupportedBrowserUsed = function() {

            $scope.main.showSignIn = true;

            if (navigator.userAgent.indexOf('Chrome') !== -1) {
                return true;
            }

            if (navigator.userAgent.indexOf('Firefox') !== -1) {
                return true;
            }

            if (navigator.userAgent.indexOf('Safari') !== -1) {
                return true;
            }

            $scope.main.showSignIn = false;

            // other browsers are not supported
            return false;
        };


        $scope.main.signout = function () {
            signOutHandler();
        };

        $scope.main.handleStorageEvent = function(event)
        {
            if (event.key === 'loggedInUser')
            {
                // we need to use  /** @type {boolean} */ below to silence up Webstorm's
                // "Binary operation argument type string is not compatible with type null" warning
                if (event.newValue === /** @type {boolean} */null || event.newValue === 'null')
                {
                    $scope.main.signout();
                }
            }
        };

        if (window.addEventListener)
        {
            window.addEventListener('storage', $scope.main.handleStorageEvent, false);
        }
        else
        {
            window.attachEvent('onstorage', $scope.main.handleStorageEvent);
        }

        //The purpose of the heart beat is measure the time since the app was last used.
        var lastHeartbeat = localStorage.getItem('last-heartbeat');
        if( lastHeartbeat && window.currentSignInType === 'basic')
        {
            if( Date.now() - lastHeartbeat > $scope.config.idleTime * 1000 ) {
                $scope.main.signout();
            }
        }

        var recordHeartbeat = function()
        {
            localStorage.setItem('last-heartbeat', Date.now() );
        };


        /*
        $scope.getItemFromLocalStorage = function(item) {
            if (typeof(Storage)) {
                return JSON.parse(localStorage.getItem(item));
            }
            return 'undefined';
        };
        */

        //Hard-coding the heartbeat as a ratio of the idle time for now. So, a heart-beat will be set
        if (window.currentSignInType === 'basic') {
            $interval(recordHeartbeat, $scope.config.idleTime * 10);
        }

        //Whenever the browser or a tab containing the app is closed or reloaded, record the heart beat.
        window.onbeforeunload = function ()
        {
            /*
            if ($scope.main.loggedIn) {
                // for logged in users only, remember the View name where reload was just performed
                userSessionTablesSettings.setLastReloadViewName();
            }
            */
            recordHeartbeat();
        };

        //To avoid affecting other controllers, destroy window.onbeforeunload when this controller goes out of scope.
        $scope.$on('$destroy', function() {
            delete window.onbeforeunload;
        });

        //navbar
        $scope.main.getCurrentNetworkId = function () {
            return sharedProperties.getCurrentNetworkId();
        };
        $scope.main.getCurrentUserId = function () {
            return sharedProperties.getCurrentUserId();
        };


        /*----------------------------------------------
         Search
         ----------------------------------------------*/

        $scope.main.searchType = 'All';
        const SEARCH_PLACEHOLDER_TEXT_MAP = {
            All : 'Search for networks, users, and groups',
            Networks : 'Search for networks',
            Users : 'Search for users',
            Groups : 'Search for groups'
        };

        /*
        $scope.main.searchUsersExamples = [
            {
                description: 'Any occurrence of "NCI" the name of the user',
                searchString: 'NCI',
                searchType: 'Users'
            }
        ];
        */
        
        $scope.main.getSearchPlaceholder = function(){
            //console.log("placeholder for " + $scope.main.searchType);
            return SEARCH_PLACEHOLDER_TEXT_MAP[$scope.main.searchType];
        };
        
        $scope.main.searchString = '';
        $scope.main.search = function () {
            delete $scope.stringTooLongWarning;

            // searchStringEncoded will be either 1) a string encoded as a valid component of URI (spaces and
            // special characters replaced with their Hex representations), or 2) "" in case user entered nothing
            // in the search field and thus runs the search with an empty
            var searchStringEncoded = encodeURIComponent($scope.main.searchString);
            var searchURL = '/search';
            if ($location.path() !== searchURL) {
                $location.path(searchURL);
            }
            var urlBeforePathChange = $location.absUrl();
            // add "?networks=<searchStringEncoded>" to the URL;
            // we do it to be able to get back to this search with the browser Back button
            $location.search({
                'searchType': $scope.main.searchType,
                'searchString': searchStringEncoded,
                'searchTermExpansion':  ($scope.main.searchTermExpansionSelected && $scope.searchTermExpansionEnabled)
            });


            var urlAfterPathChange = $location.absUrl();
            if (urlBeforePathChange === urlAfterPathChange) {
                // if before and after urls are the same, it means that
                // the user is re-issuing the last search, and we need to reload
                // the route to enforce search
                $route.reload();
            }
        };

        // make search type sticky
        /*
        if ($location.path() === '/search') {
            $scope.main.searchType = $location.search().searchType;
        }
        */

/*
        $scope.main.searchAllExamples = [
            {
                description: 'Any mention of "melanoma"',
                searchString: 'melanoma',
                searchType: 'All'
            },
            
            {
                description: 'Any mention of "RBL2"',
                searchString: 'RBL2',
                searchType: 'All'
            }];
*/
        $scope.main.searchNetworksExamples = [

            {
                description: 'Mentioning any term in a list: "TP53 MDM2 RB1 CDK4"',
                searchString: 'TP53 MDM2 RB1 CDK4',
                searchType: 'Networks'
            },

            {
                description: 'With "AND" for co-occurrence : "TP53 AND BARD1"',
                searchString: 'TP53 AND BARD1',
                searchType: 'Networks'
            },

            {
                description: 'By wildcard and property: "name:mel*"',
                searchString: 'name:mel*',
                searchType: 'Networks'
            },

            {
                description: 'By numeric property range: "nodeCount:[11 TO 79]"',
                searchString: 'nodeCount:[11 TO 79]',
                searchType: 'Networks'
            },

            {
                description: 'By UUID: "uuid:c53894ce-8e47-11e5-b435-06603eb7f303"',
                searchString: 'uuid:c53894ce-8e47-11e5-b435-06603eb7f303',
                searchType: 'Networks'
            },

            {
                description: 'Created between 1.1.16 and 4.27.16 : "creationTime:[2016-01-01T00:00:01Z TO 2016-04-27T23:59:59Z]"',
                searchString: 'creationTime:[2016-01-01T00:00:01Z TO 2016-04-27T23:59:59Z]',
                searchType: 'Networks'
            }
            
/*
            {
                description: 'By wildcard terms: "mel*"',
                searchString: 'mel*',
                searchType: 'Networks'
            },
            {
                description: 'With more complex "AND" : "NCI AND edgeCount:[100 TO 300]"',
                searchString: 'NCI AND edgeCount:[100 TO 300]',
                searchType: 'Networks'
            },
            /*
             name:metabolism AND edgeCount:[1 TO 5000]
             creationTime:[2016-02-26T00:00:01Z TO 2016-02-27T23:59:59Z]

            */
        ];

        $scope.main.runSearchExample = function(example){
            $scope.main.searchString = example.searchString;
            $scope.main.searchType = example.searchType;
            $scope.main.search();

        };

        $scope.main.browse = function(){
            $scope.main.searchString = '';
            $scope.main.searchType = 'All';
            $scope.main.search();
        };

        /*----------------------------------------------
         Citing NDEx
         ----------------------------------------------*/


        $scope.NDEx = {};
        // citation that will be presented to a user in a modal after (s)he selects the "Cite NDEx" menu item
        //$scope.NDEx.citation =
        //    "NDEx, the Network Data Exchange.<br><br>" +
        //    "Cell Systems, Volume 1, Issue 4, 28 October 2015 , Pages 302-305<br>" +
        //    "Dexter Pratt, Jing Chen, David Welker, Ricardo Rivas, Rudolf Pillich, Vladimir Rynkov, Keiichiro Ono, Carol " +
        //    "Miello, Lyndon Hicks, Sandor Szalma, Aleksandar Stojmirovic, Radu Dobrin, Michael Braxenthaler, Jan " +
        //    "Kuentzer, Barry Demchak, Trey Ideker.<br><br> " +
        //    "http://www.cell.com/cell-systems/abstract/S2405-4712(15)00147-7";


        $scope.NDEx.citation = 'Dexter Pratt, Jing Chen, David Welker, Ricardo Rivas, Rudolf Pillich, Vladimir Rynkov, ' +
            'Keiichiro Ono, Carol Miello, Lyndon Hicks, Sandor Szalma, Aleksandar Stojmirovic, Radu Dobrin, ' +
            'Michael Braxenthaler, Jan Kuentzer, Barry Demchak, Trey Ideker. NDEx, the Network Data Exchange. ' +
            'Cell Systems, Volume 1, Issue 4, 302-305 (2015). DOI:/10.1016/j.cels.2015.10.001';

        // citation that will be copied to clipboard; we replace HTML new break line chars (<br>) with ascii "\n"
        // $scope.NDEx.citationProcessed = $scope.NDEx.citation.replace(/<br>/g, "\n");

        $scope.NDEx.openQuoteNDExModal = function () {
            $scope.NDEx.modalInstance = $modal.open({
                templateUrl: 'quoteNDEx.html',
                scope: $scope,
                backdrop: 'static'
            });
        };

        $scope.NDEx.closeModal = function () {
            $scope.NDEx.modalInstance.close();
            $scope.NDEx.modalInstance = null;
        };


        /*----------------------------------------------
         External Link Handling
         ----------------------------------------------*/
        /*
         * As argument, this function takes one of configurable navigation bar
         * menu objects specified in ndex-webapp-config.js (i.e., logoLink, aboutLink,
         * documentationLink, etc), and checks whether this navigation link
         * was configured to follow the link "silently" or warn user about navigating
         * to an external domain.
         */
        $scope.redirectToExternalLink = function(redirectObj) {

            if (redirectObj.showWarning) {
                var choice = window.confirm(redirectObj.warning + '\n' + redirectObj.href);
                if (!choice) {
                    // user chose not to follow the link (not to redirect to
                    // external site); don't do anything
                    return;
                }
            }

            // if we are here, then either config parameter redirectObj.showWarning is false
            // or redirectObj.showWarning is true and user chose to follow the link to external site;
            // open the link in new_tab
            var win = window.open(redirectObj.href, 'new_tab');
            win.focus();

        };

        /*
         * Similar to redirectToExternalLink(), but redirects to the current server
         * after clicking on NDEx logo.
         */
        $scope.redirectToCurrentServer = function() {
            var currentServerURL = uiMisc.getCurrentServerURL();
            var win = window.open(currentServerURL, '_self');
            win.focus();
        };


        $scope.collapseHamburgerMenu = function() {
            $('.navbar-collapse.in').collapse('hide');
        };
        $scope.collapseHamburgerMenuAfterMs = function(timeInMs) {
            setTimeout(function() {
                $scope.collapseHamburgerMenu();
            }, timeInMs);
        };



         $scope.showSearchBar = function() {

             $modal.open({
                 templateUrl: 'views/search-modal.html',
                 //keyboard: true,
                 scope: $scope,
                 windowClass: 'popup_search_bar_modal',

                 controller: function($scope, $modalInstance) {

                     $scope.title = 'Search';

                     $scope.cancel = function() {
                         $modalInstance.dismiss();
                     };

                     $scope.closeModal = function() {
                         $modalInstance.close();
                     };
                 }
             });
         };


         $scope.checkSearchTypeAndTermExpansion = function() {

             var foundNotAllowedInSearchExpansion = false;
             $scope.searchTermExpansionEnabled = false;


             if ($scope.main.searchType.toUpperCase() === 'USERS') {
                 $scope.main.searchTitle = 'Search Term Expansion is not available when performing a User search';
                 return true;
             }
             if ($scope.main.searchType.toUpperCase() === 'GROUPS') {
                 $scope.main.searchTitle = 'Search Term Expansion is not available when performing a Group search';
                 return true;
             }

             if (!$scope.main.searchTermExpansionSelected) {
                 $scope.main.searchTitle = searchTitle;
                 $scope.searchTermExpansionEnabled = true;
                 return false;
             }


             _.forEach($scope.notAllowedInSearchExpansionEqual, function(term) {
                 if ($scope.main.searchString.trim() === term) {
                     foundNotAllowedInSearchExpansion = true;
                     // the return false;  statement breaks out of the current lodash _.forEach loop
                     return false;
                 }
             });
             if (foundNotAllowedInSearchExpansion) {
                 $scope.main.searchTitle = 'Search Term Expansion is not compatible with Lucene syntax (Boolean operators)';
                 return true;
             }


             _.forEach($scope.notAllowedInSearchExpansionStart, function(term) {

                 if ($scope.main.searchString.startsWith(term)) {
                     foundNotAllowedInSearchExpansion = true;
                     // the return false;  statement breaks out of the current lodash _.forEach loop
                     return false;
                 }
             });
             if (foundNotAllowedInSearchExpansion) {
                 $scope.main.searchTitle = 'Search Term Expansion is not compatible with Lucene syntax (Boolean operators)';
                 return true;
             }

             _.forEach($scope.notAllowedInSearchExpansion, function(term) {

                 if ($scope.main.searchString.indexOf(term) > -1) {
                     foundNotAllowedInSearchExpansion = true;
                     // the return false;  statement breaks out of the current lodash _.forEach loop
                     return false;
                 }
             });
             if (foundNotAllowedInSearchExpansion) {
                 $scope.main.searchTitle = 'Search Term Expansion is not compatible with Lucene syntax (Boolean operators)';
                 return true;
             }


             _.forEach($scope.notAllowedInSearchExpansionEnd, function(term) {
                 if ($scope.main.searchString.endsWith(term)) {
                     foundNotAllowedInSearchExpansion = true;
                     // the return false;  statement breaks out of the current lodash _.forEach loop
                     return false;
                 }
             });
             if (foundNotAllowedInSearchExpansion) {
                 $scope.main.searchTitle = 'Search Term Expansion is not compatible with Lucene syntax (Boolean operators)';
                 return true;
             }

             $scope.main.searchTitle = searchTitle;
             $scope.searchTermExpansionEnabled = true;
             return false;
         };


        /*----------------------------------------------
         Ensure that Config Parameters have valid values
         ----------------------------------------------*/

        function registerSignedInUser(data) {
            sharedProperties.setCurrentUser(data.externalId, data.userName);

            $rootScope.$emit('LOGGED_IN');
            if ($scope.signIn) {
                $scope.signIn.userName = null;
                $scope.signIn.password = null;
            }
        }

        if (window.currentSignInType) {
            registerSignedInUser(window.currentNdexUser);
        }


        var showSignInSignUpEventHandler = function() {
            $scope.collapseHamburgerMenu();
            $scope.main.showSignInSignUpOptions();
        };

        $rootScope.$on('SHOW_SIGN_IN_SIGN_UP_MODAL', showSignInSignUpEventHandler);


        var fillInTopMenu = function() {
            var script = document.createElement('script');
            script.src = window.ndexSettings.landingPageConfigServer + '/' + 'topmenu.js';
            document.body.appendChild(script);

            var topMenu = $scope.topMenu = [];

            $scope.$watch(
                function watchTopMenu(scope) {
                    return window.topMenu;
                },
                function processTopMenu(newValue, oldValue) {

                    _.forEach(window.topMenu, function (menuItem) {

                        var label = menuItem.label;
                        var href = menuItem.href;
                        var showWarning = (typeof menuItem.showWarning === 'undefined') ? false : menuItem.showWarning;
                        var warning = showWarning ? menuItem.warning : null;

                        topMenu.push({
                            'label': label,
                            'href': href,
                            'showWarning': showWarning,
                            'warning': warning
                        });
                    });
                }
            );
        };

        fillInTopMenu();


        var fillInFeaturedContentChannel = function() {

            var script = document.createElement('script');
            script.src = window.ndexSettings.landingPageConfigServer + '/' + 'featured.js';
            //script.src = 'landing_page_content/v2_4_0/featured.js';
            document.body.appendChild(script);


            $scope.featuredContentDefined = false;

            $scope.featuredContentDropDown = [];

            $scope.$watch(
                function watchFeaturedContent(scope) {
                    return window.featuredContent;
                },
                function processFeaturedContent(newValue, oldValue) {

                    if (typeof window.featuredContent === 'undefined') {
                        return;
                    }

                    $scope.carouselInterval =  window.featuredContent.scrollIntervalInMs;
                    $scope.noWrapSlides = false;

                    if (typeof $rootScope.activeSlideNo === 'undefined') {
                        $rootScope.activeSlideNo = 0;
                    }
                    $scope.active = $rootScope.activeSlideNo;

                    var slides = $scope.slides = [];
                    var currIndex = 0;

                    //var featuredGroupsURLs = _.map(_.filter(window.featuredContent.items, ['account', 'group']), 'link');
                    //var featuredUsersURLs  = _.map(_.filter(window.featuredContent.items, ['account', 'user']), 'link');
                    var featuredURLs  = _.map(window.featuredContent.items, 'link');

                    var noOfFeaturedObjectsDefined   = featuredURLs.length;
                    var noOfFeaturedObjectsRetrieved = 0;

                    var featuredObjectsReceived = [];

                    if (noOfFeaturedObjectsDefined > 0) {

                        _.forEach(featuredURLs, function (featuredURL) {

                            ndexService.getObjectViaEndPointV2(featuredURL,
                                function (featuredObject) {

                                    featuredObjectsReceived.push(featuredObject);

                                    noOfFeaturedObjectsRetrieved += 1;

                                    if (noOfFeaturedObjectsDefined === noOfFeaturedObjectsRetrieved) {
                                        $scope.featuredObjectsReceived = featuredObjectsReceived;
                                    }
                                },
                                function (error) {

                                    noOfFeaturedObjectsRetrieved += 1;

                                    if (noOfFeaturedObjectsDefined === noOfFeaturedObjectsRetrieved) {
                                        $scope.featuredObjectsReceived = featuredObjectsReceived;
                                    }
                                });
                        });

                    } else {
                        $scope.featuredObjectsReceived = [];
                    }

                    $scope.saveSlideId = function(slideIndex) {
                        $rootScope.activeSlideNo = slideIndex;
                    }

                    $scope.$watchGroup(['featuredObjectsReceived'],
                        function () {
                            if ($scope.featuredObjectsReceived) {
                                _.forEach(window.featuredContent.items, function(featuredItem) {

                                    var uuidArray = featuredItem.link.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);

                                    if (!Array.isArray(uuidArray) || uuidArray.length !== 1) {
                                        return;
                                    }

                                    var uuid = uuidArray[0];
                                    var item = _.find($scope.featuredObjectsReceived, {'externalId':uuid});
                                    var itemDescriptionForDropDown;

                                    if (typeof item === 'undefined') {
                                        return;
                                    }

                                    if (item.hasOwnProperty('groupName')) {
                                        itemDescriptionForDropDown = item.groupName;

                                    } else if (item.hasOwnProperty('userName')) {
                                        itemDescriptionForDropDown = item.firstName + ' ' + item.lastName;
                                    }

                                    slides.push({
                                        image: item.image,
                                        text:  item.description,
                                        link:  featuredItem.userLink,
                                        id:    currIndex++
                                    });

                                    $scope.featuredContentDropDown.push(
                                        {
                                            'description': itemDescriptionForDropDown,
                                            'href':       featuredItem.userLink
                                        });
                                });

                                $scope.featuredContentDefined = slides.length > 0;
                            }

                        }, true
                    );
                }
            );

        };


        fillInFeaturedContentChannel();


        var fillInMainChannel = function() {

            var script = document.createElement('script');
            script.src = window.ndexSettings.landingPageConfigServer + '/' + 'main.js';
            document.body.appendChild(script);

            var mainContent = $scope.mainContent = [];

            $scope.$watch(
                function watchMainContent(scope) {
                    return window.mainContent;
                },
                function processMainContent(newValue, oldValue) {

                    if (typeof window.mainContent === 'undefined') {
                        return;
                    }

                    while (window.mainContent.length > 4) {
                        window.mainContent.pop();
                    }

                    //$scope.mainContent = window.mainContent;
                    var noOfMainContentItems = window.mainContent.length;


                    var mainContentClass = 'col-12 col-xs-12 col-sm-12 col-md-12';

                    if (2 === noOfMainContentItems) {
                        mainContentClass = 'col-6 col-xs-6 col-sm-6 col-md-6';

                    } else if (3 === noOfMainContentItems) {
                        mainContentClass = 'col-4 col-xs-4 col-sm-4 col-md-4';

                    } else if (4 === noOfMainContentItems) {
                        mainContentClass = 'col-3 col-xs-3 col-sm-3 col-md-3';
                    }

                    $scope.mainContentClass = mainContentClass;


                    _.forEach(window.mainContent, function(mainItem) {

                        var title   = mainItem.title;
                        var content =
                            window.ndexSettings.landingPageConfigServer + '/'+ mainItem.content;
                        var href    = mainItem.href;

                        mainContent.push({
                            'title': title,
                            'content': content,
                            'href' : href
                        });
                    });
                }
            );
        };

        fillInMainChannel();


        $scope.logos = [];

        var fillInLogosChannel = function() {

            var script = document.createElement('script');
            script.src = window.ndexSettings.landingPageConfigServer + '/' + 'logos.js';
            document.body.appendChild(script);

            var logos = $scope.logos = [];

            $scope.$watch(
                function watchLogos(scope) {
                    return window.logos;
                },
                function processLogos(newValue, oldValue) {

                    if (typeof window.logos === 'undefined') {
                        return;
                    }

                    _.forEach(window.logos, function(logo) {

                        var image = window.ndexSettings.landingPageConfigServer + '/' + logo.image;
                        var title = logo.title;
                        var href  = logo.href;

                        logos.push({
                            'image': image,
                            'title': title,
                            'href' : href
                        });
                    });

                    if (logos.length > 0) {
                        $scope.logosLoaded = true;
                    }
                }
            );
        };

        $scope.logosDefined = function() {
            return $scope.logos.length > 0;
        };

        fillInLogosChannel();


        var fillInFooter = function() {

            var script = document.createElement('script');
            script.src = window.ndexSettings.landingPageConfigServer + '/' + 'footer.js';
            document.body.appendChild(script);


            var footer = $scope.footerNav = [];

            $scope.$watch(
                function watchFooterMenu(scope) {
                    return window.footerNav;
                },
                function processFooterMenu(newValue, oldValue) {

                    _.forEach(window.footerNav, function(footerItem) {

                        var label = footerItem.label;
                        var href  = (typeof footerItem.href === 'undefined') ?  '' : footerItem.href;

                        footer.push({
                            'label': label,
                            'href' : href,
                        });
                    });
                }
            );
        };

        fillInFooter();

        $scope.collapsedMenuOpened = false;

        var hideRightNavBar = function() {
            var myNavBarElement =  document.getElementById('myNavbar1');
            $scope.collapsedMenuOpened  = false;
            myNavBarElement.style.width = '0';
        };
        var showRightNavBar = function() {
            var myNavBarElement =  document.getElementById('myNavbar1');
            $scope.collapsedMenuOpened  = true;
            myNavBarElement.style.width = '250px';
        };

        $scope.switchNav = function(event) {
            event.stopPropagation();
            return $scope.collapsedMenuOpened ? hideRightNavBar() : showRightNavBar();
        };

        window.addEventListener('resize', function() {
            if ($(window).width() >= 1151) {
                hideRightNavBar();
            }
        });

        // when navigating away from this page, close right nav bar if it is opened
        $scope.$on('$locationChangeStart', function(){
            hideRightNavBar();
        });
    }]);
