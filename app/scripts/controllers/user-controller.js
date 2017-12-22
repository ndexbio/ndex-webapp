ndexApp.controller('userController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location',
    '$routeParams', '$route', '$modal', 'uiMisc', 'uiGridConstants', 'ndexNavigation', 'networkService',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location,
                  $routeParams, $route, $modal, uiMisc, uiGridConstants, ndexNavigation, networkService)
        {

            //              Process the URL to get application state
            //-----------------------------------------------------------------------------------
            var identifier = $routeParams.identifier;


            //              CONTROLLER INTIALIZATIONS
            //------------------------------------------------------------------------------------

            $scope.userController = {};
            var userController = $scope.userController;
            userController.isLoggedInUser = (window.currentNdexUser != null);
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
            userController.networkTableRowsSelected = 0;

            userController.pendingRequests = [];
            userController.sentRequests = [];

            //tasks
            userController.tasks = [];

            userController.userPageNetworksUUIDs = [];
            userController.loggedInUsersNetworkPermissionsMap = {};

            $scope.enableUpgradePermissionButton = false;

            userController.networkSetsOwnerOfPage = [];
            userController.networkSets = [];


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
                // the default value value of columnVirtualizationThreshold is 10; we need to set it to 20 because
                // otherwise it will not show all columns if we display more than 10 columns in our table
                columnVirtualizationThreshold: 20,
                enableColumnMenus: false,
                enableRowHeaderSelection: userController.isLoggedInUser,
                enableRowSelection: false,

                onRegisterApi: function( gridApi )
                {
                    $scope.networkGridApi = gridApi;


                    gridApi.core.on.rowsRendered($scope, function() {
                        // we need to call core.handleWindowResize() to fix the table layout in case it is distorted
                        $scope.networkGridApi.core.handleWindowResize();
                    });

                    gridApi.selection.on.rowSelectionChanged($scope,function(row){

                        if ((row.entity.Status == 'Set') && (row.isSelected)) {
                            row.isSelected = false;

                            var selectedCount = $scope.networkGridApi.grid.selection.selectedCount;
                            if (selectedCount > 0) {
                                $scope.networkGridApi.grid.selection.selectedCount = selectedCount - 1;

                                var title = "Cannot Select a Set";
                                var message =
                                    "Cannot select a Set in this release. This feature will be added in future.";

                                ndexNavigation.genericInfoModal(title, message);
                            };

                            return;
                        };

                        var selectedRows = gridApi.selection.getSelectedRows();
                        userController.networkTableRowsSelected = selectedRows.length;

                        enableOrDisableUpgradePermissionButton();
                    });

                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows) {

                        _.forEach(rows, function(row) {
                            // unselect a Set: make row.isSelected false and decrement the number of selected items
                            if ((row.entity.Status == 'Set') && (row.isSelected)) {
                                row.isSelected = false;

                                var selectedCount = $scope.networkGridApi.grid.selection.selectedCount;
                                if (selectedCount > 0) {
                                    $scope.networkGridApi.grid.selection.selectedCount = selectedCount - 1;
                                };
                            };
                        });

                        var selectedRows = gridApi.selection.getSelectedRows();
                        userController.networkTableRowsSelected = selectedRows.length;

                        enableOrDisableUpgradePermissionButton();
                    });

                }
            };

            var populateNetworkTable = function()
            {
                var columnDefs = [
                    { field: '  ', enableFiltering: false, maxWidth: 42, cellTemplate: 'views/gridTemplates/networkStatus.html', visible: true },
                    { field: 'Network Name', enableFiltering: true, cellTemplate: 'views/gridTemplates/networkName.html'},
                    { field: ' ', enableFiltering: false, width:40, cellTemplate: 'views/gridTemplates/downloadNetwork.html' },
                    { field: 'Format', enableFiltering: true, maxWidth:63, visible: false,
                        sort: {
                            direction: uiGridConstants.DESC,
                            priority: 0,
                        },

                        sortingAlgorithm: function(a, b, rowA, rowB, direction) {
                            if (a === b) {
                                return 0;
                            };
                            if (a === 'Set') {
                                return 1;
                            };
                            if (b === 'Set') {
                                return -1;
                            };
                            return 0;
                        }
                    },
                    { field: 'Ref.', enableFiltering: false, maxWidth: 45, cellTemplate: 'views/gridTemplates/reference.html' },
                    { field: 'Disease', enableFiltering: true, width: 68, cellTemplate: 'views/gridTemplates/disease.html'},
                    { field: 'Tissue',  enableFiltering: true, maxWidth: 65, cellTemplate: 'views/gridTemplates/tissue.html'},
                    { field: 'Nodes', enableFiltering: false, maxWidth:70 },
                    { field: 'Edges', enableFiltering: false, maxWidth:70 },
                    { field: 'Visibility', enableFiltering: true, width: 90, cellTemplate: 'views/gridTemplates/visibility.html'},
                    { field: 'Owner', enableFiltering: true, width:80,
                        cellTemplate: 'views/gridTemplates/ownedBy.html'},
                    { field: 'Last Modified', enableFiltering: false, maxWidth:120, cellFilter: "date:'short'",  sort: {direction: 'desc', priority: 5}},

                    { field: 'description', enableFiltering: false,  visible: false},
                    { field: 'externalId',  enableFiltering: false,  visible: false},
                    { field: 'ownerUUID',   enableFiltering: false,  visible: false},
                    { field: 'name',        enableFiltering: false,  visible: false},
                    { field: 'indexLevel',  enableFiltering: false,  visible: false}
                ];
                $scope.networkGridApi.grid.options.columnDefs = columnDefs;
                refreshNetworkTable();
            };


            $scope.showNetworkTable = function() {
                return (userController.networkSearchResults.length > 0) || (userController.networkSetsOwnerOfPage.length > 0);
            };


            $scope.showSetInfo = function(setId) {
                var networkSet = _.find( userController.networkSetsOwnerOfPage, {externalId:setId});

                // make a copy of network summary object since we are going to modify it
                var set = JSON.parse(JSON.stringify(networkSet));

                uiMisc.showSetInfo(set);
            };


            $scope.showNetworkInfo = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                };

                var networkUUID = rowEntity.externalId;
                var networkSummary = _.find(userController.networkSearchResults, {externalId:networkUUID});

                // make a copy of network summary object since we are going to modify it
                var network = JSON.parse(JSON.stringify(networkSummary));

                if (rowEntity['Status'] && (rowEntity['Status'].toLowerCase() == "collection")) {
                    network['collection'] = true;
                    network['subnetworks'] = rowEntity['subnetworks'];
                };

                uiMisc.showNetworkInfo(network);
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
            };

            var enableOrDisableUpgradePermissionButton = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                for (var i = 0; i < selectedNetworksRows.length; i++) {

                    var ownerUUID = selectedNetworksRows[i].ownerUUID;
                    if (ownerUUID == userController.loggedInIdentifier) {
                        $scope.enableUpgradePermissionButton = false;
                        return;
                    };
                };

                $scope.enableUpgradePermissionButton = true;
            };

            userController.getUUIDsOfNetworksForSendingPermissionRequests = function() {
                var UUIDs = [];
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                if (selectedNetworksRows.length == 0) {
                    // nothing is selected (all rows un-selected)
                    return UUIDs;
                }

          //      var loggedInUserId = ndexUtility.getLoggedInUserExternalId();

                _.forEach(selectedNetworksRows, function(selectedNetworkRow) {

                    if (selectedNetworkRow.Status.toLowerCase() == "set") {
                        // this row is a Set and we only want networks, so return - get the next
                        // item from selectedNetworksRows (go for another iteration in the  _.forEach loop)
                      return;
                    };

                    var networkUUID = selectedNetworkRow.externalId;
                    var ownerUUID = selectedNetworkRow.ownerUUID;
                    var loggedInUserPermission = (networkUUID in userController.loggedInUsersNetworkPermissionsMap) ?
                        userController.loggedInUsersNetworkPermissionsMap[networkUUID] : 'NONE';

                    UUIDs.push(
                        {
                            'networkUUID': networkUUID,
                            'owner': selectedNetworkRow['Owner'],
                            'name': selectedNetworkRow['name'],
                            'loggedInUserPermission': loggedInUserPermission
                        });
                });

                return UUIDs;
            };


            var refreshNetworkTable = function()
            {
                $scope.networkGridOptions.data = [];

                _.forEach( userController.networkSetsOwnerOfPage, function(networkSet) {
                    userController.addNetworkSetToTable(networkSet);
                });

                for(var i = 0; i < userController.networkSearchResults.length; i++ )
                {
                    var network = userController.networkSearchResults[i];
                    var subNetworkInfo  = uiMisc.getSubNetworkInfo(network);
                    var noOfSubNetworks = subNetworkInfo['numberOfSubNetworks'];
                    var subNetworkId    = subNetworkInfo['id'];

                    var networkStatus = "success";
                    if (network.errorMessage) {
                        networkStatus = "failed";
                    } else if (!network.isValid) {
                        networkStatus = "processing";
                    } else if (network.isCertified) {
                        networkStatus = "certified";
                    };

                    if ((networkStatus == "success") && network.warnings && network.warnings.length > 0) {
                        networkStatus = "warning";
                    };

                    var networkName = (!network['name']) ? "No name; UUID : " + network.externalId : network['name'];
                    if (networkStatus == "failed") {
                        networkName = "Invalid Network. UUID: " + network.externalId;
                    } else if (noOfSubNetworks > 1) {
                        networkStatus = "collection";
                    };

                    var description = $scope.stripHTML(network['description']);
                    var externalId = network['externalId'];
                    var nodes = network['nodeCount'];
                    var edges = network['edgeCount'];
                    var owner = network['owner'];
                    var indexLevel = network['indexLevel'];
                    var visibility = network['visibility'];
                    var modified = new Date( network['modificationTime'] );

                    var format = uiMisc.getNetworkFormat(subNetworkId, network);
                    var download  = "Download " + networkName;
                    var reference = uiMisc.getNetworkReferenceObj(subNetworkId, network);
                    var disease   = uiMisc.getDisease(network);
                    var tissue    = uiMisc.getTissue(network);

                    var errorMessage = network.errorMessage;

                    var row = {
                        "Status"        :   networkStatus,
                        "Network Name"  :   networkName,
                        " "             :   download,
                        "Format"        :   format,
                        "Reference"     :   reference,
                        "Disease"       :   disease,
                        "Tissue"        :   tissue,
                        "Nodes"         :   nodes,
                        "Edges"         :   edges,
                        "Visibility"    :   visibility,
                        "Owner"         :   owner,
                        "Last Modified" :   modified,
                        "description"   :   description,
                        "externalId"    :   externalId,
                        "ownerUUID"     :   network['ownerUUID'],
                        "name"          :   networkName,
                        "errorMessage"  :   errorMessage,
                        "subnetworks"   :   noOfSubNetworks,
                        "indexLevel"    :   indexLevel
                     };
                    $scope.networkGridOptions.data.push(row);
                }
            };
/*
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
                userController.networkTableRowsSelected = 0;
            };
*/
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
            };

            userController.getAllNetworkSetsOwnedByVisitingUser = function()
            {
                // get all network sets owned by logged in user who came to this page
                if (userController.isLoggedInUser) {
                    var offset = undefined;
                    var limit  = undefined;

                    ndexService.getAllNetworkSetsOwnedByUserV2(userController.loggedInIdentifier, offset, limit,

                        function (networkSets) {
                            userController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);
                        },
                        function (error, status) {
                            console.log("unable to get network sets");
                        });
                };
            };

            userController.getAllNetworkSetsOwnedByUser = function(successHandler, errorHandler)
            {
                var offset = undefined;
                var limit  = undefined;

                if (userController.isLoggedInUser && (identifier != userController.loggedInIdentifier)) {

                    ndexService.getAllNetworkSetsOwnedByUserV2(userController.loggedInIdentifier, offset, limit,

                        function (networkSets) {
                            userController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);
                            successHandler(userController.networkSets[0]);
                        },
                        function (error, status) {
                            console.log("unable to get network sets");
                            errorHandler(error, status);
                        });

                } else {

                    ndexService.getAllNetworkSetsOwnedByUserV2(userController.identifier, offset, limit,
                        function (networkSets) {
                            userController.networkSetsOwnerOfPage = _.orderBy(networkSets, ['modificationTime'], ['desc']);
                        },
                        function (error, status) {
                            console.log("unable to get network sets");
                        });
                };
            };

            userController.getIDsOfSelectedNetworks = function ()
            {
                var selectedIds = [];

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                for( var i = 0; i < selectedNetworksRows.length; i ++ )
                {
                    selectedIds.push(selectedNetworksRows[i].externalId);
                }

                return selectedIds;
            };

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

            userController.getUserShowcaseNetworks = function(successHandler, errorHandler)
            {
                ndexService.getUserShowCaseNetworksV2(userController.identifier,
                    function (networks)
                    {
                        userController.networkSearchResults = networks;
                        populateNetworkTable();

                        var directOnly = false;
                        var loggedInUserId = sharedProperties.getCurrentUserId(); //ndexUtility.getLoggedInUserExternalId();

                        // get IDs of all networks shown on User page
                        getNetworksUUIDs(networks);

                        if ((userController.userPageNetworksUUIDs.length > 0) && loggedInUserId) {
                            // get permissions of all networks for the logged in user
                            ndexService.getUserNetworkPermissionsV2(loggedInUserId, 'READ', 0, 1000000, directOnly,
                                function (networkPermissionsMap) {
                                    userController.loggedInUsersNetworkPermissionsMap = networkPermissionsMap;
                                    successHandler();
                                },
                                function (error, data) {
                                    console.log("unable to get user network memberships");
                                    successHandler();
                                });
                        } else {
                            successHandler();
                        };
                    },
                    function (error)
                    {
                        console.log("unable to get user show case networks");
                        errorHandler();
                    });
            };

            userController.refreshRequests = function ()
            {
                getRequests();
            };

            userController.addNetworkSetToTable = function(networkSet) {

                var setShowcased = networkSet['showcased'];
                if (!setShowcased) {
                    return;
                };

                var status = "Set";
                var setName = networkSet.name;
                var setDescription = $scope.stripHTML(networkSet.description);

                var networks = networkSet.networks.length;

                var setId = networkSet['externalId'];

                var setReference = uiMisc.getSetReferenceObj(networkSet);

                var setDisease   = "";
                var setTissue    = "";
                var setEdges     = "";
                var setVisibility = networkSet['visibility'] ? networkSet['visibility'] : "PUBLIC";
                var setOwner = userController.displayedUser.userName;

                var setModified = new Date(networkSet['modificationTime']);

                var row =   {
                    "Status"        :   status,
                    "Network Name"  :   setName,
                    " "             :   "",
                    "Format"        :   status,
                    "Reference"     :   setReference,
                    "Disease"       :   setDisease,
                    "Tissue"        :   setTissue,
                    //"Nodes"         :   nodes,
                    "Edges"         :   setEdges,
                    "Visibility"    :   setVisibility,
                    "Owner"         :   setOwner,
                    "Last Modified" :   setModified,
                    "Show"          :   setShowcased,
                    "description"   :   setDescription,
                    "externalId"    :   setId,
                    "ownerUUID"     :   networkSet['ownerId'],
                    "name"          :   setName,
                    "errorMessage"  :   "",
                    "subnetworks"   :   0,
                    "networks"      :   networks
                };
                $scope.networkGridOptions.data.push(row);
            };

            //  local functions

            var getNetworksUUIDs = function(networks) {
                userController.userPageNetworksUUIDs = [];

                if (!networks || networks.length == 0) {
                    return;
                }

                for (var i=0; i<networks.length; i++) {
                    var networkUUID = networks[i].externalId;

                    if (userController.userPageNetworksUUIDs.indexOf(networkUUID) < 0) {
                        userController.userPageNetworksUUIDs.push(networkUUID);
                    }
                }
            }

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

            /*
            $scope.showWarningsOrErrors = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                }

                uiMisc.showNetworkWarningsOrErrors(rowEntity, userController.networkSearchResults);
            };
            */

            $scope.getNetworkURL = function(networkUUID) {
                return "#/network/" + networkUUID;
            };

 /*           $scope.getNetworkDownloadLink = function(rowEntity) {
                return uiMisc.getNetworkDownloadLink(userController, rowEntity);
            }; */

            $scope.downloadNetwork= function(rowEntity) {

                uiMisc.downloadCXNetwork(rowEntity.externalId);

            }

            $scope.isOwnerOfNetwork = function(networkOwnerUUID)
            {
                if (!userController.isLoggedInUser) {
                    return false;
                }
                return (sharedProperties.getCurrentUserId() == networkOwnerUUID);
            };

            
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

                        // get all network sets owned by user visiting this page
                        userController.getAllNetworkSetsOwnedByVisitingUser();

                        cUser = user;

                        // get groups. Server-side API requires authentication,
                        // so only show groups if a user is logged in.
                        if (userController.isLoggedInUser) {
                            var member = null;
                            userController.getUserGroupMemberships(member);
                        };

                        // get networks
                        userController.getUserShowcaseNetworks(
                            function() {
                                var offset = undefined;
                                var limit  = undefined;

                                ndexService.getAllNetworkSetsOwnedByUserV2(userController.identifier, offset, limit,

                                    function (networkSets) {
                                        userController.networkSetsOwnerOfPage = _.orderBy(networkSets, ['modificationTime'], ['desc']);

                                        _.forEach( userController.networkSetsOwnerOfPage, function(networkSet) {

                                            if (networkSet['showcased']) {
                                                userController.addNetworkSetToTable(networkSet);
                                            };
                                        });
                                    },
                                    function (error, status, headers, config, statusText) {
                                        console.log("unable to get network sets");
                                    });
                            },
                            function() {
                                console.log("unable to get showcased networks for user");
                            }
                        );
                    })
                };

            }]);


//------------------------------------------------------------------------------------//
