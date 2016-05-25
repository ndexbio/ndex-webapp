// create the controller and inject Angular's $scope
ndexApp.controller('mainController', ['config', 'ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$modal', '$route', '$http', '$interval',
    function (config, ndexService, ndexUtility, sharedProperties, $scope, $location, $modal, $route, $http, $interval, Idle) {

        $scope.$on('IdleStart', function() {
            $scope.main.signout();
        });

        $scope.main = {};

        $scope.main.url = $location; //expose the service to the scope for nav

        $scope.main.loggedIn = false;
        //$scope.main.showSignIn = false;

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

        $scope.main.goToCurrentNetwork = function(){
            if (sharedProperties.currentNetworkId) {
                $location.path("/network/" + sharedProperties.currentNetworkId);
            }
        };

        $scope.main.goToCurrentUser = function(){
            if (sharedProperties.currentUserId) {
                $location.path("/user/" + sharedProperties.currentUserId);
            }
        };


        // check configuration parameters loaded from ndex-webapp-config.js;
        // if any of config parameters missing, assign default values
        initMissingConfigParams(config);

        // "Cite NDEx" menu item is not configurable.
        config.citeNDEx = {};
        config.citeNDEx.label = "Cite NDEx";


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
            $location.path("/signIn");
        };

        $scope.main.isInternetExplorerUsed = function() {
            var ua = window.navigator.userAgent;

            var msie = ua.indexOf('MSIE ');
            if (msie > 0) {
                // IE 10 or older => return version number
                // return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
                return true;
            }

            var trident = ua.indexOf('Trident/');
            if (trident > 0) {
                // IE 11 => return version number
                //var rv = ua.indexOf('rv:');
                //return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
                return true;
            }

            /*
            var edge = ua.indexOf('Edge/');
            if (edge > 0) {
                // Edge (IE 12+) => return version number
                // return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
                return true;
            }
            */

            // other browser
            return false;
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
        
        $scope.main.getSearchPlaceholder = function(){
            //console.log("placeholder for " + $scope.main.searchType);
            return SEARCH_PLACEHOLDER_TEXT_MAP[$scope.main.searchType];
        };
        
        $scope.main.searchString = '';
        $scope.main.search = function () {
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
            $location.search({'searchType': $scope.main.searchType, 'searchString': searchStringEncoded});
            var urlAfterPathChange = $location.absUrl();
            if (urlBeforePathChange === urlAfterPathChange) {
                // if before and after urls are the same, it means that
                // the user is re-issuing the last search, and we need to reload
                // the route to enforce search
                $route.reload();
            }
        };

        // make search type sticky
        if ($location.path() == '/search')
            $scope.main.searchType = $location.search().searchType;


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

        $scope.main.searchNetworksExamples = [

            {
                description: 'Mentioning any term in a list: "TP53 MDM2 RB1 CDK4"',
                searchString: 'TP53 MDM2 RB1 CDK4',
                searchType: 'Networks'
            },
            
            {
                description: 'By wildcard terms: "mel*"',
                searchString: 'mel*',
                searchType: 'Networks'
            },
/*
            {
                description: 'By network id: "uuid:"',
                searchString: 'uuid:',
                searchType: 'Networks'
            },
*/
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
                description: 'With "AND" for co-occurance : "TP53 AND BARD1"',
                searchString: 'TP53 AND BARD1',
                searchType: 'Networks'
            },

            {
                description: 'With more complex "AND" : "NCI AND edgeCount:[100 TO 300]"',
                searchString: 'NCI AND edgeCount:[100 TO 300]',
                searchType: 'Networks'
            },

            {
                description: 'Created between 1.1.16 and 4.27.16 : "creationTime:[2016-01-01T00:00:01Z TO 2016-04-27T23:59:59Z]"',
                searchString: 'creationTime:[2016-01-01T00:00:01Z TO 2016-04-27T23:59:59Z]',
                searchType: 'Networks'
            }
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
        var accountName = ndexUtility.getLoggedInUserAccountName();
        if (accountName) {
            sharedProperties.setCurrentUser(ndexUtility.getLoggedInUserExternalId(), accountName);
            $scope.main.accountName = accountName;
            $scope.$emit('LOGGED_IN');
        }


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

        /*----------------------------------------------
         * This function closes/collapses the opened hamburger menu after user selected (clicked) an item from this menu.
         ----------------------------------------------*/
        $scope.collapseHamburgerMenu = function() {
            $(".navbar-collapse.in").collapse('hide');
        };


        /*----------------------------------------------
         * Use an alert to let the user know that the citation has been copied to the clipboard
         ----------------------------------------------*/

        $scope.showNDExCitationInClipboardMessage = function(redirectObj) {

            var message =
                "The NDEx citation information was copied to the clipboard. \n" +
                "To paste it using keyboard, press Ctrl-V. \n" +
                "To paste it using mouse, Right-Click and select Paste.";

            alert(message);
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
            if (typeof config.networkDisplayLimit === 'undefined') {
                config.networkDisplayLimit = 300;
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
                config.logoLink.href = "http://www.ndexbio.org";
            }
            if (typeof config.logoLink.warning === 'undefined') {
                config.logoLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.logoLink.showWarning === 'undefined') {
                config.logoLink.showWarning = false;
            }



            /*
             if (typeof config.homeLink === 'undefined') {
             config.homeLink = {};
             }
             if (typeof config.homeLink.label === 'undefined') {
             config.homeLink.label = "Home";
             }
             if (typeof config.homeLink.href === 'undefined') {
             config.homeLink.href = "http://www.ndexbio.org/home";
             }
             if (typeof config.homeLink.warning === 'undefined') {
             config.homeLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
             }
             if (typeof config.homeLink.showWarning === 'undefined') {
             config.homeLink.showWarning = false;
             }
             */



            if (typeof config.aboutLink === 'undefined') {
                config.aboutLink = {};
            }
            if (typeof config.aboutLink.label === 'undefined') {
                config.aboutLink.label = "About";
            }
            if (typeof config.aboutLink.href === 'undefined') {
                config.aboutLink.href = "http://www.ndexbio.org/about-ndex";
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
                config.documentationLink.href = "http://www.ndexbio.org/quick-start";
            }
            if (typeof config.documentationLink.warning === 'undefined') {
                config.documentationLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.documentationLink.showWarning === 'undefined') {
                config.documentationLink.showWarning = false;
            }

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

            if (typeof config.reportBugLink === 'undefined') {
                config.reportBugLink = {};
            }
            if (typeof config.reportBugLink.label === 'undefined') {
                config.reportBugLink.label = "Report Bug";
            }
            if (typeof config.reportBugLink.href === 'undefined') {
                config.reportBugLink.href = "http://www.ndexbio.org/report-a-bug";
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
                config.contactUsLink.href = "http://www.ndexbio.org/contact-us/";
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
                config.searchDocLink.href = "http://www.ndexbio.org/finding-and-querying-networks/";
            }
            if (typeof config.searchDocLink.warning === 'undefined') {
                config.searchDocLink.warning = "Warning! You are about to leave your organization's domain. Follow this link?";
            }
            if (typeof config.searchDocLink.showWarning === 'undefined') {
                config.searchDocLink.showWarning = false;
            }
        }



    }]);
