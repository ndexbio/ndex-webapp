ndexApp.controller('userController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams', '$route', '$modal', 'uiMisc',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams, $route, $modal, uiMisc)
        {

            //              Process the URL to get application state
            //-----------------------------------------------------------------------------------
            var identifier = $routeParams.identifier;


            //              CONTROLLER INTIALIZATIONS
            //------------------------------------------------------------------------------------

            $scope.userController = {};
            var userController = $scope.userController;
            userController.isLoggedInUser = (ndexUtility.getLoggedInUserAccountName() != null);
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
            userController.atLeastOneSelected = false;

            userController.pendingRequests = [];
            userController.sentRequests = [];

            //tasks
            userController.tasks = [];

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
                    { field: 'Status', enableFiltering: true, width: 60, cellTemplate: 'pages/gridTemplates/networkStatus.html' },
                    { field: 'Network Name', enableFiltering: true, minWidth: 390,
                      cellTemplate: 'pages/gridTemplates/networkName.html'},
                    { field: 'Format', enableFiltering: true, minWidth: 70 },
                    { field: 'Nodes', enableFiltering: false, minWidth: 70 },
                    { field: 'Edges', enableFiltering: false, minWidth: 70 },
                    { field: 'Visibility', enableFiltering: true, minWidth: 90 },
                    { field: 'Owned By', enableFiltering: true, minWidth: 70,
                        cellTemplate: 'pages/gridTemplates/ownedBy.html'},
                    { field: 'Last Modified', enableFiltering: false, minWidth: 150, cellFilter: 'date:\'MMM dd, yyyy hh:mm:ssa\'',  sort: {direction: 'desc', priority: 0}  }
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

                    var networkStatus = "success";
                    if (!network.isValid) {
                        if (network.errorMessage) {
                            networkStatus = "failed";
                        } else {
                            networkStatus = "processing";
                        }
                    }

                    if ((networkStatus == "success") && network.warnings && network.warnings.length > 0) {
                        networkStatus = "warning";
                    }

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
                        if( network['properties'][j]['predicateString'] == "ndex:sourceFormat" )
                        {
                            format = network['properties'][j]['value'];
                            break;
                        }
                    }

                    var row = {
                        "Status"        :   networkStatus,
                        "Network Name"  :   networkName,
                        "Format"        :   format,
                        "Nodes"         :   nodes,
                        "Edges"         :   edges,
                        "Visibility"    :   visibility,
                        "Owned By"      :   owner,
                        "Last Modified" :   modified,
                        "description"   :   description,
                        "externalId"    :   externalId,
                        "ownerUUID"     :   network['ownerUUID']
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
                    ndexService.deleteNetworkV2(selectedId,
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

            userController.getUserGroupMemberships = function (member)
            {
                /*
                 * To get list of Group objects we need to:
                 *
                 * 1) Use getUserGroupMemberships function at
                 *    /user/{userId}/group/{permission}/skipBlocks/blockSize?inclusive=true;
                 *    to get the list of GROUPADMIN and MEMBER memberships
                 *
                 * 2) Get a list of Group UUIDs from step 1
                 *
                 * 3) Use this list of Group UUIDs to get Groups through
                 *    /group/groups API.
                 */
                ndexService.getUserGroupMembershipsV2(userController.identifier, member, 0, 1000000,
                        function (userMembershipsMap) {

                            var groupsUUIDs = Object.keys(userMembershipsMap);

                            ndexService.getGroupsByUUIDsV2(groupsUUIDs)
                                .success(
                                    function (groupList) {
                                        userController.groupSearchResults = groupList;
                                    })
                                .error(
                                    function(error) {
                                        console.log("unable to get groups by UUIDs");
                                    }
                                )
                        },
                        function (error, data) {
                            console.log("unable to get user group memberships");
                        });
            }


            userController.adminCheckBoxClicked = function()
            {
                var member = (userController.groupSearchAdmin) ? "GROUPADMIN" : null;

                userController.groupSearchMember = false;

                userController.getUserGroupMemberships(member);
            };

            userController.memberCheckBoxClicked = function()
            {
                var member = (userController.groupSearchMember) ? "MEMBER" : null;

                userController.groupSearchAdmin = false;

                userController.getUserGroupMemberships(member);
            };

            userController.submitNetworkSearch = function ()
            {
                userController.networkSearchResults = [];

                // We are getting networks of some user. This is the scenario where we click a user/account name
                // from the list of found networks on the Network search page (when we are logged in or anonymously)
                
                userController.networkQuery.accountName = cUser.userName;

                ndexService.searchNetworksV2(userController.networkQuery, userController.skip, userController.skipSize,
                    function (networks)
                    {
                        userController.networkSearchResults = networks.networks;

                        populateNetworkTable();
                    },
                    function (error)
                    {
                        console.log(error);
                    });
            }

            userController.getUserShowcaseNetworks = function ()
            {
                ndexService.getUserShowCaseNetworksV2(userController.identifier,
                    function (networks)
                    {
                        userController.networkSearchResults = networks;
                        populateNetworkTable();
                    },
                    function (error)
                    {
                        console.log("unable to get user show case networks");
                    });
            }

            userController.refreshRequests = function ()
            {
                getRequests();
            };

            //              local functions

            var getRequests = function ()
            {
                // get all pending requests
                ndexService.getUserPermissionRequestsV2(userController.identifier, "received",
                    function (requests)
                    {
                        userController.pendingRequests = requests;
                    },
                    function (error)
                    {
                        console.log("unable to get pending requests");
                    });

                // get all sent requests
                ndexService.getUserPermissionRequestsV2(userController.identifier, "sent",
                    function (requests)
                    {
                        userController.sentRequests = requests;
                    },
                    function (error)
                    {
                        console.log("unable to get sent requests");
                    })
            };

            $scope.showWarningsOrErrors = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                }

                uiMisc.showNetworkWarningsOrErrors(rowEntity, userController.networkSearchResults);
            }
            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------


            if ((identifier === userController.loggedInIdentifier) || (identifier === $scope.main.userName)) {
                
                $location.path("/myAccount");    // redirect to My Account page

            } else {

                ndexService.getUserByUUIDV2(userController.identifier)
                    .success(
                    function (user)
                    {
                        userController.displayedUser = user;

                        cUser = user;

                        // get groups. Server-side API requires authentication,
                        // so only show groups if a user is logged in.
                        if (userController.isLoggedInUser) {
                            var member = null;
                            userController.getUserGroupMemberships(member);
                        }

                        // get networks
                        //userController.submitNetworkSearch();

                        userController.getUserShowcaseNetworks();
                    })
                }

            }]);


//------------------------------------------------------------------------------------//
