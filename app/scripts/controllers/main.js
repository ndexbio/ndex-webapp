// create the controller and inject Angular's $scope
ndexApp.controller('mainController', [ 'ndexService', 'ndexUtility', 'sharedProperties', 'userSessionTablesSettings',
    '$scope', '$location', '$modal', '$route', '$http', '$interval', 'uiMisc', '$rootScope', '$uibModal', 'ndexSpinner',
    '$modalStack',
    function ( ndexService, ndexUtility, sharedProperties, userSessionTablesSettings,
              $scope, $location, $modal, $route, $http, $interval, uiMisc, $rootScope, $uibModal, ndexSpinner, $modalStack) {

        $scope.$on('IdleStart', function() {
            if (window.currentSignInType === 'basic') {
                $scope.main.signout();
            }
        });

        $(document).ready(function() {
            $('[data-toggle="tooltip"]').tooltip();
        });
/*
        function setTooltip(message) {
            $('#copyNDExCitationToClipboardId').tooltip('hide')
                .attr('data-original-title', message)
                .tooltip('show');
        }

        $scope.changeTitle = function() {
            setTooltip('Copy the NDEx citation information to the clipboard');
        };
*/
        $scope.logosLoaded = false;

        //noinspection JSCheckFunctionSignatures
        //var clipboard = new Clipboard('#copyNDExCitationToClipboardId');

        $scope.footerHtml = window.ndexSettings.landingPageConfigServer + '/footer.html';
        //$scope.footerHtml = 'v2/footer.html';

        /*
        function hideTooltip() {
            setTimeout(function() {
                $('#copyNDExCitationToClipboardId').tooltip('hide');
            }, 1000);
        };
        */
        /*
        clipboard.on('success', function() {
            setTooltip('Copied');
        });
        $scope.setToolTips = function(){
            var myToolTips = $('[data-toggle="tooltip"]');
            myToolTips.tooltip();
        };
        */

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

        $scope.featuredContentDefined         = false;
        $scope.featuredContentDropDownEnabled = false;

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

        $scope.popupTitleInSearchModal =
            'This option expands the search term(s) to include all known aliases for a "human" gene(s)/protein(s). ' +
            'For example, searching for AKT1 will retrieve all networks where the term AKT1 is mentioned either ' +
            ' in the network name, description or in any of the node names. ' +
            'When the Search Term Expansion option is enabled, search results will also include networks ' +
            ' where a node\'s name is "PKB-ALPHA", "P31749", "HGNC:391", etc. ';

        $scope.main.searchTermExpansionSelected = false;

        $scope.searchTermExpansionEnabled = false;


        $scope.checkLengthOfSearchString = function() {
            var strLength = $scope.main.searchString.length;
            //console.log("strLength = " + strLength);
            if (strLength >= $scope.maxSearchInputLength) {
                $scope.stringTooLongWarning = 'The maximum length for this field is ' +
                    $scope.maxSearchInputLength + ' characters';
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

            if ((typeof config.refreshIntervalInSeconds === 'undefined') ||
                (typeof config.refreshIntervalInSeconds !== 'number') ||
                config.refreshIntervalInSeconds < 0) {
                // refresh interval defaults to 0 seconds (disabled) in case it is not explicitly defined,
                // defined as non-number or negative number
                config.refreshIntervalInSeconds = 0;
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
        $scope.linkToReleaseDocs = window.ndexSettings.linkToReleaseDocs;

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

                document.getElementById('topNavBarId').style.display                = '';
                document.getElementById('ndexLogoId').style.display                 = '';
                document.getElementById('topMenuId').style.display                  = '';
                document.getElementById('searchMyAccountNameLoginId').style.display = '';
                document.getElementById('footerId').style.display                   = '';

                document.getElementById('slidingRightMenuId').style.display         = '';
                document.getElementById('slidingRightMenuSearchMyAccountNameLoginId').style.display = '';
            },
            function() {
                $scope.main.serverIsDown = true;
                window.navigator.ndexServerVersion += 'unknown';

                document.getElementById('topNavBarId').style.display                = '';
                document.getElementById('ndexLogoId').style.display                 = '';
                document.getElementById('topMenuId').style.display                  = '';
                document.getElementById('searchMyAccountNameLoginId').style.display = '';
                document.getElementById('footerId').style.display                   = '';

                document.getElementById('slidingRightMenuId').style.display         = '';
                document.getElementById('slidingRightMenuSearchMyAccountNameLoginId').style.display = '';

                // this will remove (hide) NDEx logo from the top left in the Navigation Bar
                document.getElementById('ndexLogoId').style.background  = 'transparent';
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
                                                    backdrop: 'static',

                                                    controller: function ($scope, $uibModalInstance) {
                                                        $scope.cancel = function () {
                                                            $uibModalInstance.dismiss();
                                                        };
                                                    }
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

                                    var getUserByEmailOrUserName = function (searchStr, successHandler, errorHandler) {
                                        var emailRE = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

                                        if (emailRE.test(String(searchStr).toLowerCase())) {
                                            //search string is a valid email
                                            ndexService.getUserByEmail (searchStr,successHandler, function(err) {
                                                if (err.errorCode === 'NDEx_Object_Not_Found_Exception')
                                                   ndexService.getUserByUserNameV2(searchStr, successHandler, function(err){
                                                       if (err.errorCode === 'NDEx_Object_Not_Found_Exception' ) {
                                                           ndexSpinner.stopSpinner();
                                                           forgot.errorMsg =  "Can't find user with " +
                                                               $scope.forgot.accountName + " as user name or email.";
                                                           $scope.isProcessing = false;
                                                       } else
                                                           errorHandler(err);

                                                   });
                                                else
                                                   errorHandler(err);
                                              }
                                            );
                                         } else
                                           //search string is not an email
                                           ndexService.getUserByUserNameV2(searchStr,successHandler, errorHandler);

                                    };

                                    getUserByEmailOrUserName($scope.forgot.accountName,
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

                                                $scope.counter               = 0;
                                                $scope.maxCounterValue       = 99999;
                                                $scope.limitOfUserNameLength = 95;
                                                $scope.userName              = null;


                                                $scope.createUserWithGoogleIdTokenAndUsername = function(uniqueUserName) {
                                                    ndexService.createUserWithGoogleIdTokenV2(uniqueUserName,
                                                        function () {
                                                            ndexService.authenticateUserWithGoogleIdToken(
                                                                function (data) {
                                                                    $scope.cancel(); // close modal
                                                                    $scope.isProcessing = false;
                                                                    sharedProperties.setCurrentUser(data.externalId, data.userName);

                                                                    window.currentNdexUser = data;
                                                                    window.currentSignInType = 'google';

                                                                    $rootScope.$emit('LOGGED_IN');
                                                                    $location.path('/myAccount');
                                                                    ndexSpinner.stopSpinner();
                                                                },
                                                                function (error) {
                                                                    $scope.isProcessing = false;
                                                                    ndexSpinner.stopSpinner();
                                                                    $scope.errors = error.message;
                                                                });
                                                        },
                                                        function (error) {
                                                            $scope.isProcessing = false;
                                                            ndexSpinner.stopSpinner();
                                                            $scope.errors = error.message;
                                                        });
                                                };

                                                $scope.buildUniqueUserNameAndSignup = function(userName) {

                                                    ndexService.getUserByUserNameV2(userName,
                                                        function() {
                                                            // user with userName already exists, try a new user name
                                                            // by incrementing counter and concatinating it with original user name

                                                            $scope.counter++;

                                                            // check if counter exceeds $scope.maxCounterValue and if yes ...
                                                            if ($scope.counter > $scope.maxCounterValue) {

                                                                // TODO: how do we want to handle this situation?
                                                            }

                                                            var newName = $scope.userName + $scope.counter;
                                                            $scope.buildUniqueUserNameAndSignup(newName);
                                                        },
                                                        function(error) {

                                                            if (error && error.errorCode && error.errorCode === 'NDEx_Object_Not_Found_Exception') {

                                                                // user with userName is not found - unique user name has been constructed
                                                                // let's create user with this name
                                                                $scope.createUserWithGoogleIdTokenAndUsername(userName);
                                                            }
                                                        });
                                                };

                                                $scope.signUpWithGoogle = function() {
                                                    $scope.isProcessing = true;
                                                    delete $scope.errors;

                                                    var spinner = 'spinnerCreateNewAccountViaGoogleId';
                                                    ndexSpinner.startSpinner(spinner);

                                                    // get user email and truncate it from @ to the end to get user name
                                                    var userEmail = curUser.getBasicProfile().getEmail();
                                                    var userName  =  userEmail.replace(/@.*$/,'');

                                                    if (userName.length > $scope.limitOfUserNameLength) {
                                                        // get first $scope.limitOfUserNameLength of user name
                                                        userName = userName.substring(0, $scope.limitOfUserNameLength);
                                                    }
                                                    $scope.userName = userName;

                                                    $scope.buildUniqueUserNameAndSignup(userName);

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
        };

        /*
         * Check what browser is used.
         *
         * We do not support MS Internet Explorer
         * (list of IE user agents is here: http://www.useragentstring.com/pages/useragentstring.php?name=Internet+Explorer).
         *
         * We support Chrome, FireFox, Safari, Opera and MS Edge.
         *
         * This function returns true if Chrome, FireFox, Safari, Opera, MS Edge, or compatible with them browser is used.
         * It returns false for MS IE.
         *
         * Please see link below on how to detect user agent:
         * https://developer.mozilla.org/en-US/docs/Web/API/Window/navigator
         *
         *
         * The function was tested with the following browsers/user agents:
         *   Chrome:  Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36
         *   FireFox: Mozilla/5.0 (Macintosh; Intel Mac OS X 10.11; rv:62.0) Gecko/20100101 Firefox/62.0
         *   Safari:  Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1 Safari/605.1.15
         *   Opera:   Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36 OPR/56.0.3051.43
         *
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

/*
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
*/

        /*----------------------------------------------
         External Link Handling
         ----------------------------------------------*/
        /*
         * As argument, this function takes one of navigation bar
         * menu objects and checks whether this navigation link
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

        $scope.goToLandingPage = function() {
            $location.path('/');
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


        var fillInTopMenu = function(content) {

            if (!(content.hasOwnProperty('topMenu') && Array.isArray(content.topMenu) && content.topMenu.length > 0)) {
                return;
            }

            var topMenu = $scope.topMenu = [];

            _.forEach(content.topMenu, function (menuItem) {

                var label = menuItem.label;
                var href = menuItem.href;
                var showWarning = false;
                if (menuItem.showWarning !== 'undefined') {
                    showWarning = (menuItem.showWarning.toLowerCase() === 'true');
                }

                var warning = showWarning ? menuItem.warning : null;

                topMenu.push({
                    'label': label,
                    'href': href,
                    'showWarning': showWarning,
                    'warning': warning
                });
            });
        };


        var getTopMenu = function() {
            var topMenuConfig  = window.ndexSettings.landingPageConfigServer + '/topmenu.json';

            ndexService.getObjectViaEndPointV2(topMenuConfig,
                function(content) {
                    fillInTopMenu(content);
                },
                function(error) {
                    alert('unable to get Top Menu configuration file ' + topMenuConfig);
                }
            );
        };

        getTopMenu();

        /*
         * stripHTML removes html from a string (using jQuery) an returns text.
         * In case string contains no html, the function returns empty string; to avoid
         * returning empty string, we wrap string in '<html> ... </html>' tags.
         */
        var stripHTML = function(html) {
            return $('<html>'+html+'</html>').text();
        };

        function fillInFeaturedContentChannelAndDropDown(featuredContent) {

            //$scope.featuredContentDefined = false;

            $scope.featuredContentDropDown = [];

            $scope.noWrapSlides = false;

            var slides = $scope.slides = [];
            var currIndex = 0;

            if (!(featuredContent.hasOwnProperty('items') && Array.isArray(featuredContent.items) && featuredContent.items.length > 0)) {
                return;
            }

            $scope.carouselInterval = window.ndexSettings.featuredContentScrollIntervalInMs;

            var featuredContentTypes = new Set(['user', 'group', 'networkset', 'network', 'webpage', 'publication']);

            var ndexServer = window.ndexSettings.ndexServerUri.replace('v2', '#');
            if (ndexServer && !ndexServer.endsWith('/')) {
                ndexServer = ndexServer + '/';
            }

            _.forEach(featuredContent.items, function(featuredItem) {

                var type = featuredItem.hasOwnProperty('type') ? featuredItem.type.toLowerCase() : null;

                if (!(featuredContentTypes.has(type))) {
                    // unknown type or null - return, i.e., get the next element from featuredContent.items
                    return;
                }

                var imageUrl = featuredItem.hasOwnProperty('imageURL') ?  featuredItem.imageURL : null;
                var text     = featuredItem.title + '<br>' + featuredItem.text;
                var link     = null;

                var includeInDropDown = false;
                if (featuredItem.hasOwnProperty('includeInDropDownMenu')) {
                    includeInDropDown = (featuredItem.includeInDropDownMenu.toLowerCase() === 'true');
                }

                switch(type) {

                    case 'user':
                        link = ndexServer + 'user/' +  featuredItem.UUID;
                        break;

                    case 'group':
                        link = ndexServer + 'group/' +  featuredItem.UUID;
                        break;

                    case 'networkset':
                        link = ndexServer + 'networkset/' +  featuredItem.UUID;
                        if (null === imageUrl) {
                            imageUrl = 'images/default_networkSet.png';
                        }
                        break;

                    case 'network':
                        link = ndexServer + 'network/' +  featuredItem.UUID;
                        break;

                    case 'webpage':
                        link = featuredItem.URL;
                        break;

                    case 'publication':
                        link = featuredItem.DOI;
                        break;

                    default:
                        // this should never happen since feature type is validated at this point
                        return;
                }

                slides.push({
                    'image': imageUrl,
                    'text':  text,
                    'link':  link,
                    'id':    currIndex++
                });

                if (includeInDropDown) {
                    var dropDownItem = featuredItem.hasOwnProperty('dropdownDisplayName') ?
                        stripHTML(featuredItem.dropdownDisplayName) : null;

                    if (dropDownItem === null) {
                        dropDownItem = featuredItem.hasOwnProperty('title') ?
                            stripHTML(featuredItem.title) : 'drop down item ' + (currIndex - 1);
                    }
                    $scope.featuredContentDropDown.push(
                        {
                            'description': dropDownItem,
                            'href':        link
                        });
                }
            });

            $scope.featuredContentDefined = slides.length > 0;

            $scope.featuredContentDropDownEnabled = $scope.featuredContentDropDown.length > 0;
        }

        var getFeaturedContentChannel = function() {
            var featuredContentConfig  = window.ndexSettings.landingPageConfigServer + '/featured.json';

            ndexService.getObjectViaEndPointV2(featuredContentConfig,
                function(featuredContent) {
                    fillInFeaturedContentChannelAndDropDown(featuredContent);
                },
                function(error) {
                    alert('unable to get Featured Content configuration file ' + featuredContentConfig);
                }
            );
        };

        getFeaturedContentChannel();

        var fillInMainChannel = function(content) {

            if (!(content.hasOwnProperty('mainContent') && Array.isArray(content.mainContent) && content.mainContent.length > 0)) {
                return;
            }

            var mainContent = $scope.mainContent = [];

            while (content.mainContent.length > 4) {
                content.mainContent.pop();
            }

            //$scope.mainContent = window.mainContent;
            var noOfMainContentItems = content.mainContent.length;
            var mainContentClass = 'col-12 col-xs-12 col-sm-12 col-md-12 wrapLongLine';

            if (2 === noOfMainContentItems) {
                mainContentClass = 'col-6 col-xs-6 col-sm-6 col-md-6 wrapLongLine';

            } else if (3 === noOfMainContentItems) {
                mainContentClass = 'col-4 col-xs-4 col-sm-4 col-md-4 wrapLongLine';

            } else if (4 === noOfMainContentItems) {
                mainContentClass = 'col-3 col-xs-3 col-sm-3 col-md-3 wrapLongLine';
            }

            $scope.mainContentClass = mainContentClass;

            _.forEach(content.mainContent, function(mainItem) {

                var title   = mainItem.title;
                var content =
                    window.ndexSettings.landingPageConfigServer + '/'+ mainItem.content;

                var href = (mainItem.href) ? mainItem.href : null;

                mainContent.push({
                    'title': title,
                    'content': content,
                    'href' : href
                });
            });

        };

        var getMainChannel = function() {
            var mainContentConfig  = window.ndexSettings.landingPageConfigServer + '/main.json';

            ndexService.getObjectViaEndPointV2(mainContentConfig,
                function(mainContent) {
                    fillInMainChannel(mainContent);
                },
                function(error) {
                    alert('unable to get Main Content configuration file ' + mainContentConfig);
                }
            );
        };

        getMainChannel();


        $scope.logos = [];

        var fillInLogosChannel = function(content) {

            if (!(content.hasOwnProperty('logos') && Array.isArray(content.logos) && content.logos.length > 0)) {
                return;
            }

            var logos = $scope.logos = [];

            _.forEach(content.logos, function(logo) {

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
        };

        $scope.logosDefined = function() {
            return $scope.logos.length > 0;
        };

        var getLogos = function() {
            var logosConfig  = window.ndexSettings.landingPageConfigServer + '/logos.json';

            ndexService.getObjectViaEndPointV2(logosConfig,
                function(content) {
                    fillInLogosChannel(content);
                },
                function(error) {
                    alert('unable to get Logos Content configuration file ' + logosConfig);
                }
            );
        };
        getLogos();

        /*
        var fillInFooter = function(content) {

            if (!(content.hasOwnProperty('footerNav') && Array.isArray(content.footerNav) && content.footerNav.length > 0)) {
                return;
            }

            var footer = $scope.footerNav = [];

            _.forEach(content.footerNav, function(footerItem) {

                var label = footerItem.label;
                var href = (typeof footerItem.href === 'undefined') ? '' : footerItem.href;

                footer.push({
                    'label': label,
                    'href': href,
                });
            });
        };
        var getFooter = function() {
            var footerConfig = window.ndexSettings.landingPageConfigServer + '/footer.json';

            ndexService.getObjectViaEndPointV2(footerConfig,
                function(content) {
                    fillInFooter(content);
                },
                function(error) {
                    alert('unable to get Footer configuration file ' + footerConfig);
                }
            );
        };
        getFooter();
        */

        $scope.collapsedMenuOpened = false;

        var hideRightNavBar = function() {
            var myNavBarElement         = document.getElementById('slidingRightMenuDivId');
            $scope.collapsedMenuOpened  = false;
            myNavBarElement.style.width = '0';
        };
        var showRightNavBar = function() {
            var myNavBarElement         = document.getElementById('slidingRightMenuDivId');
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
            $modalStack.dismissAll('close');
        });

        $scope.isSearchIconVisible = function() {
            //we want Magnifying glass icon on top menu to be visible everywhere except '/'
            return $location.path() !== '/';
        };

    }]);
