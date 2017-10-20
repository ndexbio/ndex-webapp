// create the controller and inject Angular's $scope
ndexApp.controller('mainController', [ 'ndexService', 'ndexUtility', 'sharedProperties', '$route',
    '$scope', '$location', '$modal', '$route', '$http', '$interval', 'uiMisc', '$rootScope', 'ndexNavigation',
    function ( ndexService, ndexUtility, sharedProperties, $route,
              $scope, $location, $modal, $route, $http, $interval, uiMisc, $rootScope, ndexNavigation) {

        $scope.$on('IdleStart', function() {
            if ( window.currentSignInType == 'basic')
                $scope.main.signout();
        });

        $scope.showFooter = true;

        $scope.main = {};

        $scope.main.url = $location; //expose the service to the scope for nav

        $scope.main.loggedIn = false;
        $scope.main.showSignIn = true;

        var signInHandler = function () {
            //listener for changes in log in.
            $scope.main.loggedIn = true;
            $scope.main.showSignIn = false;
            $scope.main.userName = sharedProperties.getCurrentUserAccountName();

            showUserGreeting();

            if ($rootScope.reloadRoute) {
                delete $rootScope.reloadRoute;
                $route.reload();
            };
        };

        $rootScope.$on('LOGGED_IN', signInHandler);

        var signOutHandler = function () {
            $scope.main.loggedIn = false;
            delete $scope.main.userName;
            if ( window.currentSignInType == "basic") {
                ndexUtility.clearUserCredentials();
                delete $http.defaults.headers.common['Authorization'];
            } else {
                gapi.auth2.getAuthInstance().signOut();
            };
	        window.currentNdexUser = null;
            window.currentSignInType = null;
            sharedProperties.currentNetworkId = null;
            sharedProperties.currentUserId = null;
            $scope.main.showSignIn = true;
        }

        $scope.$on('LOGGED_OUT', signOutHandler);


        var showUserGreeting = function() {
            var userFirstAndLastNames = sharedProperties.getLoggedInUserFirstAndLastNames();
            $scope.main.userFirstAndLastNames = userFirstAndLastNames ? "Hi, " + userFirstAndLastNames : "MyAccount";
        };

        $rootScope.$on('SHOW_UPDATED_USER_NAME', showUserGreeting);


        $scope.main.searchString = '';
        $scope.strLength = 0;
        $scope.maxSearchInputLength = 250;

        $scope.notAllowedInSearchExpansion      = [" NOT ", " OR ", " AND ", ":"];
        $scope.notAllowedInSearchExpansionStart = ["NOT ",  "OR ",  "AND "];
        $scope.notAllowedInSearchExpansionEnd   = [" NOT",  " OR",  " AND"];
        $scope.notAllowedInSearchExpansionEqual = ["NOT",   "OR",   "AND", ":"];

        $scope.arrayOfValsForSearchExpansion = ["ALL", "NETWORKS"];
        var searchTitle = "Perform Search Term Expansion (Genes and Proteins only)";

        $scope.main.searchTermExpansionSelected = false;

        $scope.searchTermExpansionEnabled = false;


        $scope.checkLengthOfSearchString = function() {
            var strLength = $scope.main.searchString.length;
            //console.log("strLength = " + strLength);
            if (strLength >= $scope.maxSearchInputLength) {
                $scope.stringTooLongWarning = "The maximum length for this field is " +
                    $scope.maxSearchInputLength + " characters.";
            } else {
                delete $scope.stringTooLongWarning;
            };
        };


        if( $location.path() == '/' || $location.path() == '/signIn')
            $scope.main.hideSearchBar = true;
        else
            $scope.main.hideSearchBar = false;

        $scope.$on('$routeChangeSuccess',function(){
            if( $location.path() == '/' || $location.path() == '/signIn')
                $scope.main.hideSearchBar = true;
            else
                $scope.main.hideSearchBar = false;
        });

        $scope.showSearchMenu = false;

        $scope.main.goToNetworkView = function(path){
            if (sharedProperties.currentNetworkId) {
                $location.path(path + sharedProperties.currentNetworkId);
            }
        };

        $scope.main.goToCurrentUser = function(){
            if (sharedProperties.currentUserId) {
                //$location.path("/user/" + sharedProperties.currentUserId);
                $location.path("/myAccount");
            }
        };

        $scope.isActiveNetworkView = function (viewLocation) {
            var locationPath = $location.path();
            var viewLocationPath = viewLocation + sharedProperties.getCurrentNetworkId();
            var active = (viewLocationPath === locationPath);
            return active;
        };

        $scope.isActiveUserView = function (viewLocation) {
            var locationPath = $location.path();
            var viewLocationPath = viewLocation + sharedProperties.getCurrentUserId();
            var active = (viewLocationPath === locationPath);
            return active;
        };
        
        // check configuration parameters loaded from ndex-webapp-config.js;
        // if any of config parameters missing, assign default values

        initMissingConfigParams(window.ndexSettings);

        // "Cite NDEx" menu item is not configurable.
        window.ndexSettings.citeNDEx = {};
        window.ndexSettings.citeNDEx.label = "Cite NDEx";


        $scope.config = window.ndexSettings;

        //Test whether the server is up or not.
        $scope.main.serverIsDown = false;
        ndexService.getServerStatus('full',
            function(data, status, headers, config) {
                // this callback will be called asynchronously
                // when the response is available
                if (data && data.properties && data.properties.ImporterExporters
                    && data.properties.ImporterExporters.length > 0) {
                    $scope.$parent.ImporterExporters = JSON.parse(JSON.stringify(data.properties.ImporterExporters));
                }
                $scope.main.serverIsDown = false;
            },
            function(data, status, headers, config) {
                $scope.main.serverIsDown = true;
            });

        $scope.main.startSignIn = function()
        {
            $location.path("/signIn");
        };

        
        /*
         * Only Google Chrome, Firefox or Safari browsers are supported.
         * Check if the currently used browser is supported.
         */
        $scope.main.isSupportedBrowserUsed = function() {

            if (navigator.userAgent.indexOf("Chrome") != -1) {
                return true;
            }

            if (navigator.userAgent.indexOf("Firefox") != -1) {
                return true;
            }

            if (navigator.userAgent.indexOf("Safari") != -1) {
                return true;
            }

            $scope.main.showSignIn = false;

            // other browsers are not supported
            return false;
        };


        $scope.main.signout = function (noRedirectToHome) {
            $scope.$emit('LOGGED_OUT');
            if (!noRedirectToHome){
                $location.path("/");
            }
        };

        $scope.main.handleStorageEvent = function(event)
        {
            if( event.key == "loggedInUser" )
            {
                if( event.newValue == null || event.newValue == "null" )
                {
                    $scope.main.signout();
                }
            };
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
        if( lastHeartbeat && window.currentSignInType == 'basic')
        {
            if( Date.now() - lastHeartbeat > $scope.config.idleTime * 1000 )
                $scope.main.signout(true); // true = no redirect to home
        }

        var recordHeartbeat = function()
        {
            localStorage.setItem('last-heartbeat', Date.now() );
        };


        var setItemToLocalStorage = function(item, value) {
            if (typeof(Storage)) {
                localStorage.setItem(item, value);
            }
        };

        $scope.getItemFromLocalStorage = function(item) {
            if (typeof(Storage)) {
                var v = JSON.parse(localStorage.getItem(item));
                return v;
            }
            return 'undefined';
        };

        //Hard-coding the heartbeat as a ratio of the idle time for now. So, a heart-beat will be set
        if (window.currentSignInType == 'basic')
            $interval(recordHeartbeat, $scope.config.idleTime * 10 );

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
            All : "Search for networks, users, and groups",
            Networks : "Search for networks",
            Users : "Search for users",
            Groups : "Search for groups"
        };

        /*
        $scope.main.searchUsersExamples = [
            {
                description: 'Any occurance of "NCI" the name of the user',
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
            if ($location.path() != searchURL) {
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
            };
        };

        // make search type sticky
        if ($location.path() == '/search')
            $scope.main.searchType = $location.search().searchType;

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
                description: 'With "AND" for co-occurance : "TP53 AND BARD1"',
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

        //end Search code

        //initializions for page refresh

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


        $scope.NDEx.citation = "Dexter Pratt, Jing Chen, David Welker, Ricardo Rivas, Rudolf Pillich, Vladimir Rynkov, " +
            "Keiichiro Ono, Carol Miello, Lyndon Hicks, Sandor Szalma, Aleksandar Stojmirovic, Radu Dobrin, " +
            "Michael Braxenthaler, Jan Kuentzer, Barry Demchak, Trey Ideker. NDEx, the Network Data Exchange. " +
            "Cell Systems, Volume 1, Issue 4, 302-305 (2015). DOI:/10.1016/j.cels.2015.10.001";

        // ctation that will be copied to clipboard; we replace HTML new break line chars (<br>) with ascii "\n"
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
                var choice = confirm(redirectObj.warning + "\n" + redirectObj.href);
                if (!choice) {
                    // user chose not to follow the link (not to redirect to
                    // external site); don't do anything
                    return;
                }
            }

            // if we are here, then either config parameter redirectObj.showWarning is false
            // or redirectObj.showWarning is true and user chose to follow the link to external site;
            // open the link in new tab
            var win = window.open(redirectObj.href, '_blank');
            win.focus();

        };

        /*
         * Similar to redirectToExternalLink(), but redirects to the current server
         * after clicking on NDEx logo.
         */
        $scope.redirectToCurrentServer = function() {
            var currentServerURL = uiMisc.getCurrentServerURL();
            var win = window.open(currentServerURL, '_blank');
            win.focus();
        };

        /*----------------------------------------------
         * This function closes/collapses the opened hamburger menu after user selected (clicked) an item from this menu.
         ----------------------------------------------*/
        $scope.collapseHamburgerMenu = function() {
            $(".navbar-collapse.in").collapse('hide');
        };


        /*----------------------------------------------
         * Use an alert to let the user know that the citation has been copied to the clipboard
         ----------------------------------------------*/

        $scope.showNDExCitationInClipboardMessage = function() {
            var closeModalInterval = 2000; // ms

            var title   = "NDEx Citation Copied";
            var message  = "The NDEx citation information was copied to the clipboard. ";

            ndexNavigation.genericInfoModalAutoClose(title, message, closeModalInterval);
        };

         $scope.showSearchBar = function() {

             var  modalInstance = $modal.open({
                 templateUrl: 'pages/search-modal.html',
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


             if ($scope.main.searchType.toUpperCase() == "USERS") {
                 $scope.main.searchTitle = "Search Term Expansion is not available when performing a User search";
                 return true;
             };
             if ($scope.main.searchType.toUpperCase() == "GROUPS") {
                 $scope.main.searchTitle = "Search Term Expansion is not available when performing a Group search";
                 return true;
             };


             if (!$scope.main.searchTermExpansionSelected) {
                 $scope.main.searchTitle = searchTitle;
                 $scope.searchTermExpansionEnabled = true;
                 return false;
             };


             _.forEach($scope.notAllowedInSearchExpansionEqual, function(term) {
                 if ($scope.main.searchString.trim() == term) {
                     foundNotAllowedInSearchExpansion = true;
                     // the return false;  statement breaks out of the current lodash _.forEach loop
                     return false;
                 };
             });
             if (foundNotAllowedInSearchExpansion) {
                 $scope.main.searchTitle = "Search Term Expansion is not compatible with Lucene syntax (Boolean operators)";
                 return true;
             };


             _.forEach($scope.notAllowedInSearchExpansionStart, function(term) {

                 if ($scope.main.searchString.startsWith(term)) {
                     foundNotAllowedInSearchExpansion = true;
                     // the return false;  statement breaks out of the current lodash _.forEach loop
                     return false;
                 };
             });
             if (foundNotAllowedInSearchExpansion) {
                 $scope.main.searchTitle = "Search Term Expansion is not compatible with Lucene syntax (Boolean operators)";
                 return true;
             };

             _.forEach($scope.notAllowedInSearchExpansion, function(term) {

                 if ($scope.main.searchString.indexOf(term) > -1) {
                     foundNotAllowedInSearchExpansion = true;
                     // the return false;  statement breaks out of the current lodash _.forEach loop
                     return false;
                 };
             });
             if (foundNotAllowedInSearchExpansion) {
                 $scope.main.searchTitle = "Search Term Expansion is not compatible with Lucene syntax (Boolean operators)";
                 return true;
             };


             _.forEach($scope.notAllowedInSearchExpansionEnd, function(term) {
                 if ($scope.main.searchString.endsWith(term)) {
                     foundNotAllowedInSearchExpansion = true;
                     // the return false;  statement breaks out of the current lodash _.forEach loop
                     return false;
                 };
             });
             if (foundNotAllowedInSearchExpansion) {
                 $scope.main.searchTitle = "Search Term Expansion is not compatible with Lucene syntax (Boolean operators)";
                 return true;
             };

             $scope.main.searchTitle = searchTitle;
             $scope.searchTermExpansionEnabled = true;
             return false;
         };


        /*----------------------------------------------
         Ensure that Config Parameters have valid values
         ----------------------------------------------*/

        function initMissingConfigParams(config) {

            // check configuration parameters loaded from ndex-webapp-config.js;
            // if any of config parameters missing, assign default values
            if (typeof config.requireAuthentication === 'undefined') {
                config.requireAuthentication = false;
            }
            if (typeof config.welcome === 'undefined') {
                config.welcome = "NDEx Web App deployed at My Company";
            }
            if (typeof config.networkQueryLimit === 'undefined') {
                config.networkQueryLimit = 1500;
            }
            if (typeof config.networkTableLimit === 'undefined') {
                config.networkTableLimit = 500;
            }
            if (typeof config.idleTime === 'undefined') {
                config.idleTime = 3600;
            }
            if (typeof config.uploadSizeLimit === 'undefined') {
                config.uploadSizeLimit = "none";
            }

            if (typeof config.messages === 'undefined') {
                config.messages = {};
            }
            if (typeof config.messages.serverDown === 'undefined') {
                config.messages.serverDown = "<img src='img/maintenance.png'>";
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


            // check if any of configurable Navigation Bar links are missing
            // and assign default values if yes
            if (typeof config.logoLink === 'undefined') {
                config.logoLink = {};
            }
            if (typeof config.logoLink.href === 'undefined') {
                config.logoLink.href = "http://preview.ndexbio.org";
            }
            if (typeof config.logoLink.warning === 'undefined') {
                config.logoLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.logoLink.showWarning === 'undefined') {
                config.logoLink.showWarning = false;
            }


            if (typeof config.newsLink === 'undefined') {
                config.newsLink = {};
            }
            if (typeof config.newsLink.label === 'undefined') {
                config.newsLink.label = "News";
            }
            if (typeof config.newsLink.href === 'undefined') {
                config.newsLink.href = "http://www.home.ndexbio.org/index";
            }
            if (typeof config.newsLink.warning === 'undefined') {
                config.newsLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.newsLink.showWarning === 'undefined') {
                config.newsLink.showWarning = false;
            }

            if (typeof config.aboutLink === 'undefined') {
                config.aboutLink = {};
            }
            if (typeof config.aboutLink.label === 'undefined') {
                config.aboutLink.label = "About";
            }
            if (typeof config.aboutLink.href === 'undefined') {
                config.aboutLink.href = "http://home.ndexbio.org/about-ndex";
            }
            if (typeof config.aboutLink.warning === 'undefined') {
                config.logoLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.aboutLink.showWarning === 'undefined') {
                config.aboutLink.showWarning = false;
            }

            if (typeof config.documentationLink === 'undefined') {
                config.documentationLink = {};
            }
            if (typeof config.documentationLink.label === 'undefined') {
                config.documentationLink.label = "Docs";
            }
            if (typeof config.documentationLink.href === 'undefined') {
                config.documentationLink.href = "http://home.ndexbio.org/quick-start";
            }
            if (typeof config.documentationLink.warning === 'undefined') {
                config.documentationLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.documentationLink.showWarning === 'undefined') {
                config.documentationLink.showWarning = false;
            }
            if ((typeof config.refreshIntervalInSeconds === 'undefined') ||
                (typeof config.refreshIntervalInSeconds != 'number') ||
                config.refreshIntervalInSeconds < 0) {
                // refresh interval defaults to 0 seconds (disabled) in case it is not explicitly defined,
                // defined as non-number or negative number
                config.refreshIntervalInSeconds = 0;
            };


            /*
            if (typeof config.apiLink === 'undefined') {
                config.apiLink = {};
            }
            if (typeof config.apiLink.label === 'undefined') {
                config.apiLink.label = "API";
            }
            if (typeof config.apiLink.href === 'undefined') {
                //config.apiLink.href = "http://public.ndexbio.org/#/api";
                config.apiLink.href = "#/api";
            }
            if (typeof config.apiLink.warning === 'undefined') {
                config.apiLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.apiLink.warn === 'undefined') {
                config.apiLink.warn = false;
            }
            */

            if (typeof config.reportBugLink === 'undefined') {
                config.reportBugLink = {};
            }
            if (typeof config.reportBugLink.label === 'undefined') {
                config.reportBugLink.label = "Report Bug";
            }
            if (typeof config.reportBugLink.href === 'undefined') {
                config.reportBugLink.href = "http://home.ndexbio.org/report-a-bug";
            }
            if (typeof config.reportBugLink.warning === 'undefined') {
                config.reportBugLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.reportBugLink.showWarning === 'undefined') {
                config.reportBugLink.showWarning = false;
            }

            if (typeof config.contactUsLink === 'undefined') {
                config.contactUsLink = {};
            }
            if (typeof config.contactUsLink.label === 'undefined') {
                config.contactUsLink.label = "Contact Us";
            }
            if (typeof config.contactUsLink.href === 'undefined') {
                config.contactUsLink.href = "http://home.ndexbio.org/contact-us/";
            }
            if (typeof config.contactUsLink.warning === 'undefined') {
                config.contactUsLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.contactUsLink.showWarning === 'undefined') {
                config.contactUsLink.showWarning = false;
            }

            
            if (typeof config.searchDocLink === 'undefined') {
                config.searchDocLink = {};
            }
            if (typeof config.searchDocLink.label === 'undefined') {
                config.searchDocLink.label = "Documentation on Searching in NDEx";
            }
            if (typeof config.searchDocLink.href === 'undefined') {
                config.searchDocLink.href = "http://home.ndexbio.org/finding-and-querying-networks/";
            }
            if (typeof config.searchDocLink.warning === 'undefined') {
                config.searchDocLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.searchDocLink.showWarning === 'undefined') {
                config.searchDocLink.showWarning = false;
            }
        }


        function registerSignedInUser(data, type) {
            sharedProperties.setCurrentUser(data.externalId, data.userName);

            $rootScope.$emit('LOGGED_IN');
            if ( $scope.signIn != null) {
                $scope.signIn.userName = null;
                $scope.signIn.password = null;
            }
        }

        if (window.currentSignInType != null ) {
            registerSignedInUser(window.currentNdexUser, window.currentSignInType);
        }


    }]);
