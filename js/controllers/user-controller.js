ndexApp.controller('userController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams', '$route', '$modal',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams, $route, $modal)
        {

            //              Process the URL to get application state
            //-----------------------------------------------------------------------------------
            var identifier = $routeParams.identifier;


            //              CONTROLLER INTIALIZATIONS
            //------------------------------------------------------------------------------------

            $scope.userController = {};
            var userController = $scope.userController;
            //userController.isLoggedInUser = (ndexUtility.getLoggedInUserAccountName() != null);
            userController.identifier = identifier;
            userController.loggedInIdentifier = sharedProperties.getCurrentUserId();
            userController.displayedUser = {};

            //groups
            userController.groupSearchAdmin = false; // this state needs to be saved to avoid browser refresh
            userController.groupSearchMember = false;
            userController.groupSearchResults = [];

            //networks
            userController.networkQuery = {};
            userController.networkSearchResults = [];
            userController.skip = 0;
            userController.skipSize = 10000;
            userController.allSelected = false;
            userController.atLeastOneSelected = false;

            userController.pendingRequests = [];
            userController.sentRequests = [];

            //tasks
            userController.tasks = [];

            // list of network IDs of all networks for which the current user has ADMIN access and therefore can delete.
            // These networks are owned by both the current user and other users.
            userController.networksWithAdminAccess = [];

            // list of network IDs of all networks for which the current user has WRITE access and therefore can update.
            // These networks are owned by both the current user and other users.
            userController.networksWithWriteAccess = [];

            var calcColumnWidth = function(header, isLastColumn)
            {
                var result = header.length * 10;
                result = result < 100 ? 100 : result;
                if( isLastColumn )
                    result += 40;
                return result > 250 ? 250 : result;
            };

            //table
            $scope.networkGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,

                onRegisterApi: function( gridApi )
                {
                    $scope.networkGridApi = gridApi;
                    gridApi.selection.on.rowSelectionChanged($scope,function(row){
                        var selectedRows = gridApi.selection.getSelectedRows();
                        userController.atLeastOneSelected = selectedRows.length > 0;

                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                        userController.atLeastOneSelected = selectedRows.length > 0;
                    });

                }
            };

            var populateNetworkTable = function()
            {
                var columnDefs = [
                    { field: 'Network Name', enableFiltering: true, minWidth: 330,
                      cellTemplate: 'pages/gridTemplates/networkName.html'},
                    { field: 'Format', enableFiltering: true, minWidth: 70 },
                    { field: 'Nodes', enableFiltering: false, minWidth: 70 },
                    { field: 'Edges', enableFiltering: false, minWidth: 70 },
                    { field: 'Visibility', enableFiltering: true, minWidth: 90 },
                    { field: 'Owned By', enableFiltering: true, minWidth: 70,
                        cellTemplate: 'pages/gridTemplates/ownedBy.html'},
                    { field: 'Last Modified', enableFiltering: false, minWidth: 100, cellFilter: 'date' }
                ];
                $scope.networkGridApi.grid.options.columnDefs = columnDefs;
                refreshNetworkTable();
            };

            /*
             * This function removes most HTML tags and replaces them with markdown symbols so that this
             * field could be displayed in the title element of networkName.html template in the pop-up window
             * when mouse cursor hovers over it.
             */
            $scope.stripHTML = function(html) {

                if (!html) {
                    return "";
                }

                // convert HTML to markdown; toMarkdown is defined in to-markdown.min.js
                var markDown = toMarkdown(html);

                // after using toMarkdown() at previous statement, markDown var can still contain
                // some HTML Code (i.e.,<span class=...></span>). In order to remove it, we use jQuery text() function.
                // We need to add <html> and </html> in the beginning and of markDown variable; otherwise, markDown
                // will not be recognized byu text() as a valid HTML and exception will be thrown.

                // Note that we need to use toMarkdown() followed by jQuery text(); if just jQuery text() is used, then
                // all new lines and </p> , </h1>...</h6> tags are removed; and all lines get "glued" together
                var markDownFinal  = $("<html>"+markDown+"</html>").text();

                return markDownFinal;
            }

            var refreshNetworkTable = function()
            {
                $scope.networkGridOptions.data = [];

                for(var i = 0; i < userController.networkSearchResults.length; i++ )
                {
                    var network = userController.networkSearchResults[i];

                    var networkName = (!network['name']) ? "No name; UUID : " + network.externalId : network['name'];
                    var description = $scope.stripHTML(network['description']);
                    var externalId = network['externalId'];
                    var nodes = network['nodeCount'];
                    var edges = network['edgeCount'];
                    var owner = network['owner'];
                    var visibility = network['visibility'];
                    var modified = new Date( network['modificationTime'] );

                    var format = "Unknown";
                    for(var j = 0; j < network['properties'].length; j++ )
                    {
                        if( network['properties'][j]['predicateString'] == "sourceFormat" )
                        {
                            format = network['properties'][j]['value'];
                            break;
                        }
                    }

                    var row = {
                        "Network Name"  :   networkName,
                        "Format"        :   format,
                        "Nodes"         :   nodes,
                        "Edges"         :   edges,
                        "Visibility"    :   visibility,
                        "Owned By"      :   owner,
                        "Last Modified" :   modified,
                        "description"   :   description,
                        "externalId"    :   externalId,
                        "owner"         :   owner
                    };
                    $scope.networkGridOptions.data.push(row);
                }
            };

            userController.deleteSelectedNetworks = function ()
            {
                var selectedIds = [];

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                for( var i = 0; i < selectedNetworksRows.length; i ++ )
                {
                    selectedIds.push(selectedNetworksRows[i].externalId);
                }
                for (i = 0; i < selectedIds.length; i++ )
                {
                    var selectedId = selectedIds[i];
                    ndexService.deleteNetwork(selectedId,
                        function (data)
                        {

                        },
                        function (error)
                        {

                        });
                }

                // after we deleted all selected networks, the footer of the table may
                // still show that some networks are selected (must be a bug), so
                // we manually set the selected count to 0 (see defect NDEX-582)
                $scope.networkGridApi.grid.selection.selectedCount = 0;

                for (i = userController.networkSearchResults.length - 1; i >= 0; i-- )
                {
                    var externalId = userController.networkSearchResults[i].externalId;
                    if( selectedIds.indexOf(externalId) != -1 )
                        userController.networkSearchResults.splice(i,1);
                }
                refreshNetworkTable();
                userController.atLeastOneSelected = false;
            };

            //              scope functions

            // change to use directive. setting of current network should occur controller initialization
            userController.setAndDisplayCurrentNetwork = function (identifier)
            {
                $location.path("/network/" + identifier);
            };


            userController.submitGroupSearch = function ()
            {
                var query = {};

                query.userName = userController.displayedUser.userName;
                query.searchString = userController.groupSearchString
                if (userController.groupSearchAdmin) query.permission = 'GROUPADMIN';
                if (userController.groupSearchMember) query.permission = 'MEMBER';

                //pagination missing
                ndexService.searchGroups(query, 0, 50,
                    function (groups)
                    {
                        // Save the results
                        userController.groupSearchResults = groups.resultList;

                    },
                    function (error)
                    {
                        //TODO
                    });
            };

            userController.adminCheckBoxClicked = function()
            {
                userController.groupSearchMember = false;
                userController.submitGroupSearch();
            };

            userController.memberCheckBoxClicked = function()
            {
                userController.groupSearchAdmin = false;
                userController.submitGroupSearch();
            };


            userController.submitNetworkSearch = function ()
            {
                userController.networkSearchResults = [];

                if ((typeof userController.loggedInIdentifier === 'undefined') ||
                    (cUser.externalId !== userController.loggedInIdentifier))
                {
                    // We are getting networks of some user. This is the scenario where we click a user/account name
                    // from the list of found networks on the Network search page (when we are logged in or anonymously)
                    userController.networkQuery.permission = null;
                    userController.networkQuery.networkSearchIncludeNetworksByGroupPermissions = false;
                    userController.networkQuery.userName = cUser.userName;

                } else {

                    // We are getting networks we (the logged in user) have access to (that we and other accounts own).
                    // We are getting networks that we have explicit READ permission at minimum.
                    userController.networkQuery.permission = "READ";
                    userController.networkQuery.networkSearchIncludeNetworksByGroupPermissions = false;
                }

                // the table footer may
                // still show that some networks are selected (must be a bug), so
                // we manually set the selected count to 0
                $scope.networkGridApi.grid.selection.selectedCount = 0;

                // we also need to manually set the selectAll property to false in case
                // user selected all networks and then refreshes the Tasks tab. In this case the Top selector
                // to the left from Network Name is still on/checked, so wee need to unset it.
                $scope.networkGridApi.grid.selection.selectAll = false;

                ndexService.searchNetworks(userController.networkQuery, userController.skip, userController.skipSize,
                    function (networks)
                    {
                        var numberOfNetworksReceived =
                            (networks && networks.numFound && networks.numFound > 0) ? networks.numFound : 0;
                        if (numberOfNetworksReceived > 0) {
                            userController.getNetworksWithAdminAccess();
                            userController.getNetworksWithWriteAccess();
                        } else {
                            // this might be redundant -- userController.networksWithAdminAccess and
                            // userController.networksWithWriteAccess must be empty here
                            userController.networksWithAdminAccess = [];
                            userController.networksWithWriteAccess = [];
                        }
                        userController.networkSearchResults = networks.networks;  // (networks && networks.networks) ? networks.networks : "";

                        populateNetworkTable();
                    },
                    function (error)
                    {
                        console.log(error);
                    });
            }

            userController.refreshPage = function()
            {
                $route.reload();
            };

            userController.getNetworksWithAdminAccess = function ()
            {
                // get all networks for which the current user has ADMIN privilege.
                // These networks include both networks owned by current user and by other accounts.
                ndexService.getUserNetworkMemberships(
                    "ADMIN",
                    0,
                    1000000, //numberOfNetworks,
                    // Success
                    function (networks)
                    {
                        userController.networksWithAdminAccess = [];

                        for (var i = 0; i < networks.length; i++) {
                            var networkUUID = networks[i].resourceUUID;
                            userController.networksWithAdminAccess.push(networkUUID);
                        }
                    },
                    // Error
                    function (response)
                    {
                        console.log(response);
                    }
                )
            };

            userController.getNetworksWithWriteAccess = function ()
            {
                // get all networks for which the current user has WRITE privilege.
                // These networks include both networks owned by current user and by other accounts.
                ndexService.getUserNetworkMemberships(
                    "WRITE",
                    0,
                    1000000,//numberOfNetworks,
                    // Success
                    function (networks)
                    {
                        userController.networksWithWriteAccess = [];

                        for (var i = 0; i < networks.length; i++) {
                            var networkUUID = networks[i].resourceUUID;
                            userController.networksWithWriteAccess.push(networkUUID);
                        }
                    },
                    // Error
                    function (response)
                    {
                        console.log(response);
                    }
                )
            };

            userController.refreshRequests = function ()
            {
                getRequests();
            };

            //              local functions

            var getRequests = function ()
            {
                ndexService.getPendingRequests(0, 20,
                    function (requests)
                    {
                        userController.pendingRequests = requests;
                    },
                    function (error)
                    {
                        //console.log(error);
                    });

                ndexService.getSentRequests(0, 20,
                    function (requests)
                    {
                        userController.sentRequests = requests;

                    },
                    function (error)
                    {
                        //console.log(error);
                    })
            };

            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------


            if ((identifier === userController.loggedInIdentifier) || (identifier === $scope.main.userName)) {
                
                $location.path("/myAccount");    // redirect to My Account page

            } else {

                ndexService.getUser(userController.identifier)
                    .success(
                    function (user)
                    {
                        userController.displayedUser = user;

                        cUser = user;

                        // get groups
                        userController.submitGroupSearch();

                        // get networks
                        userController.submitNetworkSearch();

                    })
                }

            }]);


//------------------------------------------------------------------------------------//
