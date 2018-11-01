ndexApp.controller('searchController',
    [ 'ndexService', 'sharedProperties', '$scope', '$rootScope', 'ndexSpinner',
        '$location', '$modal', 'ndexNavigation', 'uiMisc',
        function (ndexService, sharedProperties, $scope, $rootScope, ndexSpinner,
                  $location, $modal, ndexNavigation, uiMisc) {


            //              Controller Declarations/Initializations
            //---------------------------------------------------------------------
            $scope.searcher = {};
            var searchController = $scope.searcher;
            searchController.isLoggedInUser = !!window.currentNdexUser; //(window.currentNdexUser != null);

            searchController.networkErrors = [];
            searchController.userErrors = [];
            searchController.groupErrors = [];

            searchController.pageSize = 1000000;
            
            searchController.networkSearchResults = [];
            searchController.networkSearchInProgress = false;
            searchController.networkNoResults = false;
            searchController.numberOfNetworksFound = 0;
            searchController.networkSearchIncludeNetworksByGroupPermissions = true;
            searchController.networkSkipPages = 0;
            
            searchController.groupSearchResults = [];
            searchController.groupSearchInProgress = false;
            searchController.groupSearchNoResults = false;
            
            searchController.userSearchResults = [];
            searchController.userSearchInProgress = false;
            searchController.userSearchNoResults = false;

            //              Search Type and Search String
            //---------------------------------------------------------------------
            //
            // extract value of 'networks' from URI; URI looks something like
            // http://localhost:63342/ndex-webapp/index.html#/search?networks=test
            // NOTE: searchString can be 'undefined' in  case 'networks' name in the search portion of URI was
            // manually replaced with a non-existent value (i.e., 'abccba'); URI in this case may look like
            // http://localhost:63342/ndex-webapp/index.html#/search?abccba=test
            searchController.searchString = decodeURIComponent($location.search().searchString);
            searchController.searchType = decodeURIComponent($location.search().searchType);
            searchController.searchTermExpansionSelected =
                (decodeURIComponent($location.search().searchTermExpansion) === 'true');

            // Ensure that we have "search for all" as the default if no parameters are provided
            searchController.searchString = (searchController.searchString.toLowerCase() === 'undefined') ? '' : searchController.searchString;
            searchController.searchType = (searchController.searchType.toLowerCase() === 'undefined') ? 'All' : searchController.searchType;


            // set $scope.main.searchString to searchController.searchString; - this ensures that $scope.main.searchString
            // stays the same (doesn't get reset) in the search window in case of page reload (F5);
            // $scope.main.searchString is "" (empty string) in case searchString is 'undefined'
            $scope.main.searchString = searchController.searchString;
            $scope.main.searchType = searchController.searchType;

            searchController.networkTableRowsSelected = 0;
            searchController.networkSets = [];

            searchController.loggedInUserId = sharedProperties.getCurrentUserId();

            searchController.showNetworkTable = false;
            var spinnerSearchPageId = 'spinnerSearchPageId';

            var windowsHeightCorrection = 170;


            //var tableOptions = {};
            //tableOptions.user = searchController.loggedInUserId ? searchController.loggedInUserId : 'anonymous';

            $(document).ready(function() {
                if (!searchController.loggedInUserId) {
                    document.getElementById('searchResultTableId').className = 'col-12 col-xs-12 col-sm-12 col-md-12';
                }
            });

            // this function gets called when user navigates away from the current page.
            // (can also use "$locationChangeStart" instead of "$destroy"
            $scope.$on('$destroy', function(){
               ndexSpinner.stopSpinner();
            });

            $scope.showNetworkInfo = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                }

                var networkUUID = rowEntity.externalId;
                var networkSummary = _.find(searchController.networkSearchResults, {externalId:networkUUID});

                // make a copy of network summary object since we are going to modify it
                var network = JSON.parse(JSON.stringify(networkSummary));

                if (rowEntity.Status && (rowEntity.Status.toLowerCase() === 'collection')) {
                    network.collection = true;
                    network.subnetworks = rowEntity.subnetworks;
                }

                uiMisc.showNetworkInfo(network);
            };

            /*
             * This function removes most HTML tags and replaces them with markdown symbols so that this
             * field could be displayed in the title element of networkName.html template in the pop-up window
             * when mouse cursor hovers over it.
             */
            var stripHTML = function(html) {

                if (!html) {
                    return '';
                }

                return $('<html>' + html + '</html>').text();

                /*
                // convert HTML to markdown; toMarkdown is defined in to-markdown.min.js
                var markDown = toMarkdown(html);

                // after using toMarkdown() at previous statement, markDown var can still contain
                // some HTML Code (i.e.,<span class=...></span>). In order to remove it, we use jQuery text() function.
                // We need to add <html> and </html> in the beginning and of markDown variable; otherwise, markDown
                // will not be recognized by text() as a valid HTML and exception will be thrown.

                // Note that we need to use toMarkdown() followed by jQuery text(); if just jQuery text() is used, then
                // all new lines and </p> , </h1>...</h6> tags are removed; and all lines get "glued" together
                var markDownFinal  = $("<html>"+markDown+"</html>").text();

                return markDownFinal;
                */
            };

            $scope.activeTab = {};

            $scope.activateTab = function(tabName){
                $scope.activeTab = {};
                $scope.activeTab[tabName] = true;

                switch (tabName.toLowerCase()) {

                    case 'networks':
                        if ($scope.networkGridApi) {
                            setTimeout($scope.networkGridApi.core.handleWindowResize, 250);
                        }
                        break;

                    case 'users':
                        if ($scope.userGridApi) {
                            setTimeout($scope.userGridApi.core.handleWindowResize, 250);
                        }
                        break;

                    case 'groups':
                        if ($scope.groupGridApi) {
                            setTimeout($scope.groupGridApi.core.handleWindowResize, 250);
                        }
                        break;

                    default:
                        break;
                }
            };



            /*---------------------------


             Network Table

             -----------------------------*/

            $scope.networkTabHeading = function(){
                if (searchController.networkSearchInProgress){
                    return 'Networks';
                } else if (searchController.networkSearchNoResults) {
                    return 'Networks (0)';
                } else {
                    return 'Networks (' + searchController.numberOfNetworksFound + ')';
                }
            };

            $scope.networkSearchGridOptions =
            {
                /*
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                enableSelectAll: false,
                enableRowSelection: false,
                multiSelect: false,
                enableRowHeaderSelection: false,
                columnVirtualizationThreshold: 20,
                enableColumnMenus: false,

                */
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                // the default value value of columnVirtualizationThreshold is 10; we need to set it to 20 because
                // otherwise it will not show all columns if we display more than 10 columns in our table

                enableRowHeaderSelection: searchController.isLoggedInUser, // true if user logged; false for anonymous users
                enableRowSelection: false,
                columnVirtualizationThreshold: 20,

                enableColumnMenus: false,

                onRegisterApi: function( gridApi )
                {
                    $scope.networkGridApi = gridApi;
                    gridApi.selection.on.rowSelectionChanged($scope,function(){
                        var selectedRows = gridApi.selection.getSelectedRows();
                        searchController.networkTableRowsSelected = selectedRows.length;
                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(){
                        var selectedRows = gridApi.selection.getSelectedRows();
                        searchController.networkTableRowsSelected = selectedRows.length;
                    });

                    gridApi.core.on.rowsRendered($scope, function() {
                        // we need to call core.handleWindowResize() to fix the table layout in case it is distorted
                        setTimeout(function () {
                            $scope.networkGridApi.core.handleWindowResize();
                            //ndexSpinner.stopSpinner();
                        }, 250);
                    });


/*
                    gridApi.core.on.sortChanged( $scope, function(grid, sortColumns){

                        // sortColumns is an array containing just the column sorted in the grid
                        var name = sortColumns[0].name; // the name of the first column sorted
                        var direction = sortColumns[0].sort.direction; // the direction of the first column sorted: "desc" or "asc"

                        console.log('sort event captured; name=' + name + '  direction=' + direction);

                        // Your logic to do the server sorting
                    });


                    gridApi.core.on.filterChanged( $scope, function() {

                        var grid = this.grid;

                        // Define behavior for cancel filtering

                        $scope.isfilterclear = true;

                        angular.forEach(grid.columns, function( col ) {
                            if(col.filters[0].term){
                                console.log('filter NOT clear');
                            }
                        });

                    });
*/

                }
            };
            
            const NETWORK_COLUMN_FIELDS = [
                { field: '  ', enableFiltering: false, maxWidth: 42, cellTemplate: 'views/gridTemplates/networkStatus.html', visible: true },
                { field: 'Network Name', enableFiltering: true, cellTemplate: 'views/gridTemplates/networkName.html'},
                { field: ' ', enableFiltering: false, width:40, cellTemplate: 'views/gridTemplates/downloadNetwork.html' },
                //{ field: 'Format', enableFiltering: true, maxWidth:63 },
                { field: 'Ref.', enableFiltering: false, maxWidth: 45, cellTemplate: 'views/gridTemplates/reference.html' },
                { field: 'Disease', enableFiltering: true, width: 82, cellTemplate: 'views/gridTemplates/disease.html'},
                { field: 'Tissue',  enableFiltering: true, width: 75, cellTemplate: 'views/gridTemplates/tissue.html'},
                { field: 'Nodes', enableFiltering: false, maxWidth:75,
                    sortingAlgorithm: function (a, b) {
                        if (a === b) {
                            return 0;
                        }
                        if (a < b) {
                            return -1;
                        }
                        return 1;
                    }
                },
                { field: 'Edges', enableFiltering: false, maxWidth:75,
                    sortingAlgorithm: function (a, b) {
                        if (a === b) {
                            return 0;
                        }
                        if (a < b) {
                            return -1;
                        }
                        return 1;
                    }
                },
                { field: 'Visibility', enableFiltering: true, width: 90, cellTemplate: 'views/gridTemplates/visibility.html'},
                { field: 'Owner', enableFiltering: true, width:80,
                    cellTemplate: 'views/gridTemplates/ownedBy.html'},
                { field: 'Last Modified', enableFiltering: false, maxWidth:120, cellFilter: 'date:\'short\'' },

                { field: 'description',  enableFiltering: false,  visible: false},
                { field: 'externalId',   enableFiltering: false,  visible: false},
                { field: 'ownerUUID',    enableFiltering: false,  visible: false},
                { field: 'name',         enableFiltering: false,  visible: false},
                { field: 'errorMessage', enableFiltering: false,  visible: false},
                { field: 'subnetworks',  enableFiltering: false,  visible: false},
                { field: 'indexLevel',   enableFiltering: false,  visible: false}
            ];


            var refreshNetworkTable = function()
            {
                $scope.networkSearchGridOptions.data = [];

                for(var i = 0; i < searchController.networkSearchResults.length; i++ )
                {
                    var network = searchController.networkSearchResults[i];

                    var subNetworkInfo  = uiMisc.getSubNetworkInfo(network);
                    var noOfSubNetworks = subNetworkInfo.numberOfSubNetworks;
                    var subNetworkId    = subNetworkInfo.id;

                    var networkStatus = 'success';
                    if (network.errorMessage) {
                        networkStatus = 'failed';
                    } else if (!network.isValid) {
                        networkStatus = 'processing';
                    } else if (network.isCertified) {
                        networkStatus = 'certified';
                    }

                    if ((networkStatus === 'success') && network.warnings && network.warnings.length > 0) {
                        networkStatus = 'warning';
                    }

                    var networkName = (!network.name) ? 'No name; UUID : ' + network.externalId : network.name;
                    if (networkStatus === 'failed') {
                        networkName = 'Invalid Network. UUID: ' + network.externalId;
                    } else if (noOfSubNetworks >= 1) {
                        networkStatus = 'collection';
                    }

                    var description = stripHTML(network.description);
                    var externalId = network.externalId;
                    var nodes = parseInt(network.nodeCount);
                    var edges = parseInt(network.edgeCount);
                    var owner = network.owner;
                    var indexLevel = network.indexLevel;
                    var visibility = network.visibility;
                    var modified = new Date(network.modificationTime);

                    //var format = uiMisc.getNetworkFormat(subNetworkId, network);
                    var download = 'Download ' + networkName;
                    var reference = uiMisc.getNetworkReferenceObj(subNetworkId, network);
                    var disease   = uiMisc.getDisease(network);
                    var tissue    = uiMisc.getTissue(network);

                    var errorMessage = network.errorMessage;

                    var row = {
                        'Status'        :   networkStatus,
                        'Network Name'  :   networkName,
                        ' '             :   download,
                        //'Format'        :   format,
                        'Reference'     :   reference,
                        'Disease'       :   disease,
                        'Tissue'        :   tissue,
                        'Nodes'         :   nodes,
                        'Edges'         :   edges,
                        'Visibility'    :   visibility,
                        'Owner'         :   owner,
                        'Last Modified' :   modified,
                        'description'   :   description,
                        'externalId'    :   externalId,
                        'ownerUUID'     :   network.ownerUUID,
                        'name'          :   networkName,
                        'errorMessage'  :   errorMessage,
                        'subnetworks'   :   noOfSubNetworks,
                        'indexLevel'    :   indexLevel
                    };

                    $scope.networkSearchGridOptions.data.push(row);
                }

                searchController.showNetworkTable = (_.size($scope.networkSearchGridOptions.data) > 0);
            };

            var populateNetworkTable = function()
            {
                $scope.networkGridApi.grid.options.columnDefs = NETWORK_COLUMN_FIELDS;

                var $foundNetworksTableId = $('#foundNetworksTableId');
                $foundNetworksTableId.height($(window).height() - windowsHeightCorrection);
                $scope.networkGridApi.grid.gridHeight = $foundNetworksTableId.height();

                refreshNetworkTable();
            };

            searchController.setAndDisplayCurrentNetwork = function (networkId) {
                $location.path('/network/' + networkId);
            };


            searchController.submitNetworkSearch = function () {

                searchController.numberOfNetworksFound = 0;
                searchController.networkSearchInProgress = true;
                searchController.networkSearchNoResults = false;

                searchController.networkErrors = [];

                var networkQuery = {
                    'accountName': searchController.userName,
                    'searchString': searchController.searchString,
                    'includeGroups': true
                };

                ndexService.searchNetworksV2(networkQuery, searchController.networkSkipPages, searchController.pageSize,
                    function (searchResult)
                    {
                        searchController.numberOfNetworksFound = searchResult.numFound;
                        searchController.networkSearchResultStart = searchResult.start;
                        var networks = searchResult.networks;
                        searchController.networkSearchInProgress = false;
                        if(networks.length > 0){
                            searchController.networkSearchResults = networks;
                            populateNetworkTable();

                            if (searchController.isLoggedInUser) {
                                searchController.getAllNetworkSetsOwnedByUser(
                                    function() {}, // success handler
                                    function() {}  // failure handler
                                );
                            }

                        } else {
                            searchController.networkSearchNoResults = true;
                            searchController.networkSearchInProgress = false;
                        }
                        ndexSpinner.stopSpinner();
                    },
                    function (error)
                    {
                        ndexSpinner.stopSpinner();
                        if (error) {
                            searchController.networkSearchResults = [];
                            var errorMessage = 'No networks found: ' + error.message;
                            searchController.networkErrors.push(errorMessage);

                            searchController.networkSearchInProgress = false;
                            searchController.networkSearchNoResults = true;
                        }
                    });
            };

            searchController.submitGeneProteinSearch = function () {

                searchController.numberOfNetworksFound = 0;
                searchController.networkSearchInProgress = true;
                searchController.networkSearchNoResults = false;

                var networkQuery = {
                    'searchString': searchController.searchString
                };

                ndexService.searchNetworksByGeneProteinV2(networkQuery, searchController.networkSkipPages, searchController.pageSize,
                    function (searchResult)
                    {
                        searchController.numberOfNetworksFound = searchResult.numFound;
                        searchController.networkSearchResultStart = searchResult.start;
                        searchController.networkSearchInProgress = false;
                        var networks = searchResult.networks;
                        if(networks.length > 0){
                            searchController.networkSearchResults = networks;
                            populateNetworkTable();

                            if (searchController.isLoggedInUser) {
                                searchController.getAllNetworkSetsOwnedByUser(
                                    function() {}, // success handler
                                    function() {}  // failure handler
                                );
                            }

                        } else {
                            searchController.networkSearchNoResults = true;
                            searchController.networkSearchInProgress = false;
                        }
                        ndexSpinner.stopSpinner();
                    },
                    function (error)
                    {
                        ndexSpinner.stopSpinner();
                        if (error) {
                            searchController.networkSearchResults = [];
                            var errorMessage = 'No networks found: ' + error.message;
                            searchController.networkErrors.push(errorMessage);
                            searchController.networkSearchInProgress = false;
                            searchController.networkSearchNoResults = true;
                        }
                    });
            };

            searchController.getIDsOfSelectedNetworks = function () {
                var selectedIds = [];
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                
                _.forEach(selectedNetworksRows, function(row) {
                    if (row.Status.toLowerCase() !== 'set') {
                        selectedIds.push(row.externalId);
                    }
                });
                
                return selectedIds;
            };

            searchController.getAllNetworkSetsOwnedByUser = function (successHandler, errorHandler) {
                var userId = sharedProperties.getCurrentUserId(); // ndexUtility.getLoggedInUserExternalId();
                var offset = -1;
                var limit  = -1;
                
                ndexService.getAllNetworkSetsOwnedByUserV2(userId, offset, limit,
                    function (networkSets) {
                        searchController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);

                        successHandler(searchController.networkSets[0]);
                    },
                    function (error, status) {
                        searchController.networkSets = [];
                        console.log('unable to get network sets');
                        errorHandler(error, status);
                    });
            };
            
            /*---------------------------


             User Tab

             -----------------------------*/

            $scope.userTabHeading = function () {
                if (searchController.userSearchResults) {
                    var numUsers = searchController.userSearchResults.length;
                    var pageLimitPlusSign = '';
                    if (numUsers >= searchController.pageSize) {
                        pageLimitPlusSign = '+';
                    }
                    return 'Users (' + numUsers + pageLimitPlusSign + ')';
                }  else if (searchController.userSearchNoResults) {
                    return 'Users (0)';
                } else {
                    return 'Users';
                }
            };

            $scope.userSearchGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                enableSelectAll: false,
                enableRowSelection: false,
                multiSelect: false,
                enableRowHeaderSelection: false,
                enableColumnMenus: false,


                onRegisterApi: function( gridApi )
                {
                    $scope.userGridApi = gridApi;
                    /*
                    gridApi.selection.on.rowSelectionChanged($scope,function(row){
                        var selectedRows = gridApi.selection.getSelectedRows();

                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                    });
                    */
                }

            };


            const USER_COLUMN_FIELDS = [
                {
                    field: 'User Name',
                    cellTemplate: 'views/gridTemplates/userName.html'
                },
                { field: 'First Name'},
                { field: 'Last Name'},
                { field: 'Description'}

            ];


            var refreshUserTable = function()
            {
                $scope.userSearchGridOptions.data = [];

                for(var i = 0; i < searchController.userSearchResults.length; i++ )
                {
                    var user = searchController.userSearchResults[i];

                    var userName = user.userName;
                    var description = stripHTML(user.description);
                    var externalId = user.externalId;
                    var firstName = user.firstName;
                    var lastName = user.lastName;

                    var row = {
                        'User Name'   : userName,
                        'Description' : description,
                        'externalId'  : externalId,
                        'First Name'  : firstName,
                        'Last Name'   : lastName
                    };

                    $scope.userSearchGridOptions.data.push(row);
                }
                $scope.userGridApi.core.handleWindowResize();
            };

            var populateUserTable = function()
            {
                $scope.userGridApi.grid.options.columnDefs = USER_COLUMN_FIELDS;

                var $foundUsersTableId = $('#foundUsersTableId');
                $foundUsersTableId.height($(window).height() - windowsHeightCorrection);
                $scope.userGridApi.grid.gridHeight = $foundUsersTableId.height();

                refreshUserTable();
                //console.log($scope.userSearchGridOptions.data);

            };

            searchController.submitUserSearch = function(){
                var searchString = searchController.searchString;
                searchController.userSearchResults = null;
                searchController.userSearchInProgress = true;
                searchController.userSearchNoResults = false;
                searchController.userErrors = [];
                // We find only one page of users. No paging.
                ndexService.searchUsersV2(
                    searchString,
                    0,
                    searchController.pageSize,
                    function (users) {
                        if(users.numFound > 0){
                            searchController.userSearchResults = users.resultList;
                            //console.log(searchController.userSearchResults);
                            populateUserTable();
                        } else {
                            searchController.userSearchNoResults = true;
                        }
                        searchController.userSearchInProgress = false;
                        if (searchController.searchType.toLowerCase() !== 'all') {
                            ndexSpinner.stopSpinner();
                        }

                    },
                    function (error) {
                        if (searchController.searchType.toLowerCase() !== 'all') {
                            ndexSpinner.stopSpinner();
                        }

                        if (error.errorMessage && error.errorMessage !== 'NDEx_Bad_Request_Exception') {
                            var errorMessage = 'No networks found: ' + error.message;
                            searchController.userErrors.push(errorMessage);
                        }
                        searchController.userSearchInProgress = false;
                    });
            };


            /*---------------------------


                    Group Tab

             -----------------------------*/

            $scope.groupTabHeading = function(){
                if (searchController.groupSearchResults){
                    var numGroups = searchController.groupSearchResults.length;
                    var pageLimitPlusSign = '';
                    if (numGroups >= searchController.pageSize){
                        pageLimitPlusSign = '+';
                    }
                    return 'Groups (' + numGroups + pageLimitPlusSign + ')';
                } else if (searchController.groupSearchNoResults) {
                    return 'Groups (0)';
                } else {
                    return 'Groups';
                }

            };

            $scope.groupSearchGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                enableSelectAll: false,
                enableRowSelection: false,
                multiSelect: false,
                enableRowHeaderSelection: false,
                enableColumnMenus: false,


                onRegisterApi: function( gridApi )
                {
                    $scope.groupGridApi = gridApi;
                    /*
                    gridApi.selection.on.rowSelectionChanged($scope,function(row){
                        var selectedRows = gridApi.selection.getSelectedRows();

                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                    });
                    */

                }
            };


            const GROUP_COLUMN_FIELDS = [
                { field: 'Group Name',
                    cellTemplate: 'views/gridTemplates/groupName.html'},
                /*
                {
                    field: 'Group Account',
                    cellTemplate: 'views/gridTemplates/groupName.html'
                },
                */
                { field: 'Description'}

            ];

            var refreshGroupTable = function()
            {
                $scope.groupSearchGridOptions.data = [];

                for(var i = 0; i < searchController.groupSearchResults.length; i++ )
                {
                    var group = searchController.groupSearchResults[i];
                    var groupName = group.groupName;
                    var description = stripHTML(group.description);
                    var externalId = group.externalId;
                    //var userName = group['userName'];
                    
                    var row = {
                        'Group Name'  :   groupName,
                        'Description' :   description,
                        'externalId'  :   externalId
                    };

                    $scope.groupSearchGridOptions.data.push(row);
                    //console.log($scope.groupSearchGridOptions);
                }
            };

            var populateGroupTable = function()
            {
                $scope.groupGridApi.grid.options.columnDefs = GROUP_COLUMN_FIELDS;

                var $foundGroupsTableId = $('#foundGroupsTableId');
                $foundGroupsTableId.height($(window).height() - windowsHeightCorrection);
                $scope.groupGridApi.grid.gridHeight = $foundGroupsTableId.height();

                refreshGroupTable();

            };


            searchController.submitGroupSearch = function(){
                searchController.groupSearchResults = null;
                searchController.groupSearchInProgress = true;
                searchController.groupSearchNoResults = false;
                searchController.groupErrors = [];
                // We find only one page of groups. No paging.
                ndexService.searchGroupsV2(
                    searchController.searchString,
                    0,
                    searchController.pageSize,
                    function (groups) {
                        if (groups.numFound > 0){
                            searchController.groupSearchResults = groups.resultList;
                            ////console.log(searchController.groupSearchResults);
                            populateGroupTable();
                        } else {
                            searchController.groupSearchNoResults = true;
                        }
                        searchController.groupSearchInProgress = false;
                        if (searchController.searchType.toLowerCase() !== 'all') {
                            ndexSpinner.stopSpinner();
                        }
                    },
                    function (error) {
                        if (searchController.searchType.toLowerCase() !== 'all') {
                            ndexSpinner.stopSpinner();
                        }

                        if (error.errorMessage && error.errorMessage !== 'NDEx_Bad_Request_Exception') {
                            var errorMessage = 'No groups found: ' + error.message;
                            searchController.groupErrors.push(errorMessage);
                        }
                        searchController.groupSearchInProgress = false;
                        searchController.groupSearchNoResults = true;
                    });
            };


            $scope.showWarningsOrErrors = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                }

                if (rowEntity.subnetworks && (rowEntity.subnetworks >= 1)) {
                    var title = 'Warning';
                    var message = 'This network is part of a Cytoscape collection and cannot be operated on or edited in NDEx.';
                    ndexNavigation.genericInfoModal(title, message);
                } else {
                    uiMisc.showNetworkWarningsOrErrors(rowEntity, searchController.networkSearchResults);
                }
            };

            $scope.getNetworkURL = function(networkUUID) {
                return '#/network/' + networkUUID;
            };

            $scope.downloadNetwork= function(rowEntity) {

                uiMisc.downloadCXNetwork(rowEntity.externalId);

            };
            /*---------------------------

             Perform the Search

             -----------------------------*/

            // set the state to no results for each tab so they default to showing that message
            searchController.groupSearchNoResults = true;
            searchController.userSearchNoResults = true;
            searchController.networkSearchNoResults = true;

            ndexSpinner.startSpinner(spinnerSearchPageId);

             if (searchController.searchType === 'All'){
                 if (searchController.searchTermExpansionSelected) {
                     searchController.submitGeneProteinSearch();
                 } else {
                     searchController.submitNetworkSearch();
                 }
                searchController.submitGroupSearch();
                searchController.submitUserSearch();
                $scope.activateTab('Networks');

            } else if (searchController.searchType === 'Networks') {
                 if (searchController.searchTermExpansionSelected) {
                     searchController.submitGeneProteinSearch();
                 } else {
                     searchController.submitNetworkSearch();
                 }
                 searchController.submitNetworkSearch();
                 $scope.activateTab('Networks');

             } else if (searchController.searchType === 'Users'){
                searchController.submitUserSearch();
                $scope.activateTab('Users');

            } else if (searchController.searchType === 'Groups'){
                searchController.submitGroupSearch();
                $scope.activateTab('Groups');

            }

            $(window).resize(function() {

                var $foundNetworksTableId = $('#foundNetworksTableId');
                $foundNetworksTableId.height($(window).height() - windowsHeightCorrection);
                $scope.networkGridApi.grid.gridHeight = $foundNetworksTableId.height();
                $scope.networkGridApi.core.refresh();

                var $foundUsersTableId = $('#foundUsersTableId');
                $foundUsersTableId.height($(window).height() - windowsHeightCorrection);
                $scope.userGridApi.grid.gridHeight = $foundUsersTableId.height();
                $scope.userGridApi.core.refresh();

                var $foundGroupsTableId = $('#foundGroupsTableId');
                $foundGroupsTableId.height($(window).height() - windowsHeightCorrection);
                $scope.groupGridApi.grid.gridHeight = $foundGroupsTableId.height();
                $scope.groupGridApi.core.refresh();
            });
        }]);

