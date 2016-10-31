ndexApp.controller('myAccountController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams', '$route', '$modal', 'uiMisc',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams, $route, $modal, uiMisc)
        {

            //              Process the URL to get application state
            //-----------------------------------------------------------------------------------
            
            var identifier = ndexUtility.getUserCredentials()["externalId"];
            //var identifier = sharedProperties.getCurrentUserId(); //$routeParams.identifier;


            //              CONTROLLER INTIALIZATIONS
            //------------------------------------------------------------------------------------

            $scope.myAccountController = {};
            var myAccountController = $scope.myAccountController;
            myAccountController.isLoggedInUser = (ndexUtility.getLoggedInUserAccountName() != null);
            myAccountController.identifier = identifier;
            myAccountController.loggedInIdentifier = sharedProperties.getCurrentUserId();
            myAccountController.displayedUser = {};

            //groups
            myAccountController.groupSearchAdmin = false; // this state needs to be saved to avoid browser refresh
            myAccountController.groupSearchMember = false;
            myAccountController.groupSearchResults = [];
            myAccountController.originalGroupSearchResults = [];

            //networks
            myAccountController.networkQuery = {};
            myAccountController.networkSearchResults = [];
            myAccountController.skip = 0;
            myAccountController.skipSize = 10000;
            myAccountController.allSelected = false;
            myAccountController.atLeastOneSelected = false;

            myAccountController.pendingRequests = [];
            myAccountController.sentRequests = [];

            //tasks
            myAccountController.tasks = [];

            // list of network IDs of all networks for which the current user has ADMIN access and therefore can delete.
            // These networks are owned by both the current user and other users.
            myAccountController.networksWithAdminAccess = [];

            // list of network IDs of all networks for which the current user has WRITE access and therefore can update.
            // These networks are owned by both the current user and other users.
            myAccountController.networksWithWriteAccess = [];

            // when My Account (this current) page loads, we need to hide the My Account menu link
            $scope.$parent.showMyAccountMenu = false;
            
            // this function gets called when user navigates away from the current My Account page.
            // (can also use "$locationChangeStart" instead of "$destroy"
            $scope.$on("$destroy", function(){
                // hide the My Account menu item in Nav Bar
                $scope.$parent.showMyAccountMenu = true;
            });
            
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
                        myAccountController.atLeastOneSelected = selectedRows.length > 0;

                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                        myAccountController.atLeastOneSelected = selectedRows.length > 0;
                    });

                }
            };

            var populateNetworkTable = function()
            {
                var columnDefs = [
                    { field: 'Network Name', enableFiltering: true, minWidth: 400,
                      cellTemplate: 'pages/gridTemplates/networkName.html'},
                    { field: 'Status', enableFiltering: true, minWidth: 70, cellTemplate: 'pages/gridTemplates/networkStatus.html' },
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

                for(var i = 0; i < myAccountController.networkSearchResults.length; i++ )
                {
                    var network = myAccountController.networkSearchResults[i];

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
                        if( network['properties'][j]['predicateString'] == "sourceFormat" )
                        {
                            format = network['properties'][j]['value'];
                            break;
                        }
                    }

                    var row = {
                        "Network Name"  :   networkName,
                        "Status"        :   networkStatus,
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


            myAccountController.tasksNotificationsTabDisabled = function() {

                if ( (myAccountController.tasks.length > 0) ||
                     (myAccountController.pendingRequests.length > 0) ||
                     (myAccountController.sentRequests.length > 0)) {
                    return false;
                }

                return true;
            }

            myAccountController.getTaskFileExt = function(task)
            {
                if( !task.format )
                    return "";
                if( task.format.toUpperCase() == 'BIOPAX' )
                    return 'owl';
                else {
                    var networkFileExtension = task.format.toLowerCase() + ".gz";
                    return networkFileExtension;
                }
            };

            myAccountController.getNetworkDownloadName = function(task)
            {
                if (typeof task.attributes === 'undefined') {
                    return;
                }

                var name = (typeof task.attributes.downloadFileName === 'undefined') ?
                    task.externalId : task.attributes.downloadFileName.replace(/ /g, "_");

                var extension = (typeof task.attributes.downloadFileExtension === 'undefined') ?
                    "txt" : myAccountController.getTaskFileExt(task);

                var networkNameForDownload = name + "." + extension;

                return networkNameForDownload;
            };

            myAccountController.getNetworkName = function(task)
            {
                if (typeof task.attributes === 'undefined' ||
                    typeof task.attributes.downloadFileName === 'undefined') {
                    return task.externalId;
                }

                return task.attributes.downloadFileName + " " + "(" +
                    myAccountController.getTaskFileExt(task).toUpperCase() + ")";
            };

            // recursive function that deletes all tasks from the server
            myAccountController.deleteAllTasks = function()
            {

                // delete all tasks that are visible to the user
                for (var i = 0; i < myAccountController.tasks.length; i++) {
                    var task = myAccountController.tasks[i];
                    myAccountController.deleteTask(task.externalId);
                }

                // there may be more tasks on the server; try to get them
                ndexService.getUserTasks(
                     "ALL",
                     0,
                     100,
                     // Success callback function
                     function (tasks)
                     {
                         if (tasks.length == 0) {
                             // recursive base case: no task was retrieved from the server
                             return;
                         }

                         // recursive general case: more tasks were retrieved -- call itself
                         // (myAccountController.deleteAllTasks) to delete them
                         myAccountController.tasks = tasks;
                         myAccountController.deleteAllTasks();
                     },
                     // Error
                     function (response)
                     {
                         return;
                     }
                )
            };

            myAccountController.checkAndDeleteSelectedNetworks = function() {
                var checkWritePrivilege = false;
                var networksDeleteable =
                    myAccountController.checkIfSelectedNetworksCanBeDeletedOrChanged(checkWritePrivilege);

                if (networksDeleteable) {
                    myAccountController.confirmDeleteSelectedNetworks();
                } else {
                    var title = "Cannot Delete Selected Networks";
                    var message =
                        "Some selected networks could not be deleted because they are either marked READ-ONLY" +
                        " or you do not have ADMIN privileges. Please uncheck the READ-ONLY box in each network " +
                        " page, make sure you have ADMIN access to all selected networks, and try again.";

                    myAccountController.genericInfoModal(title, message);
                }
                return;
            }

            
            myAccountController.genericInfoModal = function(title, message)
            {
                var   modalInstance = $modal.open({
                    templateUrl: 'pages/generic-info-modal.html',
                    scope: $scope,

                    controller: function($scope, $modalInstance) {

                        $scope.title = title;
                        $scope.message = message;

                        $scope.close = function() {
                            $modalInstance.dismiss();
                        };
                    }
                });
            }

            myAccountController.confirmDeleteSelectedNetworks = function()
            {
                var   modalInstance = $modal.open({
                    templateUrl: 'confirmation-modal.html',
                    scope: $scope,

                    controller: function($scope, $modalInstance) {

                        $scope.title = 'Delete Selected Networks';
                        $scope.message =
                            'The selected networks will be permanently deleted from NDEx. Are you sure you want to proceed?';

                        $scope.cancel = function() {
                            $modalInstance.dismiss();
                            $scope.isProcessing = false;
                        };

                        $scope.confirm = function() {
                            $scope.isProcessing = true;
                            myAccountController.deleteSelectedNetworks();
                            $modalInstance.dismiss();
                            $scope.isProcessing = false;
                        };
                    }
                });
            }

            myAccountController.manageBulkAccess = function(path, currentUserId)
            {
                var selectedIDs = myAccountController.getIDsOfSelectedNetworks();
                sharedProperties.setSelectedNetworkIDs(selectedIDs);
                sharedProperties.setCurrentUserId(currentUserId);
                $location.path(path);
            }


            myAccountController.allTasksCompleted = function() {
                var task;

                for (var i = 0; i < myAccountController.tasks.length; i++) {
                    task = myAccountController.tasks[i];
                    if (task.status.toUpperCase() === 'PROCESSING') {
                        return false;
                    }
                }
                return true;
            }

            myAccountController.getIDsOfSelectedNetworks = function ()
            {
                var selectedIds = [];

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                for( var i = 0; i < selectedNetworksRows.length; i ++ )
                {
                    selectedIds.push(selectedNetworksRows[i].externalId);
                }

                return selectedIds;
            };

            myAccountController.updateVisibilityOfNetwork = function (networkId, networkVisibility)
            {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                for( var i = 0; i < selectedNetworksRows.length; i ++ )
                {
                    if (selectedNetworksRows[i].externalId == networkId) {
                        selectedNetworksRows[i].Visibility = networkVisibility;
                        break;
                    }
                }
            };

            /*
             * This function is used by Bulk Network Delete and Bulk Network Edit Properties operations.
             * It goes through the list of selected networks and checks if the networks
             * can be deleted (or modified in case checkWriteAccess is set to true).
             * It makes sure that in the list of selected networks
             *
             * 1) there are no read-only networks, and
             * 2) that the current user can delete the selected networks (i.e., has Admin access to all of them).
             *
             * If either of the above conditions is false, than the list of networks cannot be deleted.
             *
             * If the function was called with (checkWriteAccess=true) then it also checks if user has
             * WRITE access to the networks.
             *
             * The function returns true if all networks can be deleted or modified, and false otherwise (all or none).
             */
            myAccountController.checkIfSelectedNetworksCanBeDeletedOrChanged = function(checkWriteAccess) {

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                // iterate through the list of selected networks
                for (var i = 0; i < selectedNetworksRows.length; i++) {
                    var externalId1 = selectedNetworksRows[i].externalId;

                    // check if the selected network is read-only and can be deleted by the current account
                    for (var j = 0; j < myAccountController.networkSearchResults.length; j++) {

                        var externalId2 = myAccountController.networkSearchResults[j].externalId;

                        // find the current network info in the list of networks this user has access to
                        if (externalId1 !== externalId2) {
                            continue;
                        }

                        // check if network is read-only
                        if (myAccountController.networkSearchResults[j].isReadOnly) {
                            // it is read-only; cannot delete or modify
                            return false;
                        }

                        // check if you have admin privilege for this network
                        if (myAccountController.networksWithAdminAccess.indexOf(externalId1) == -1) {
                            // the current user is not admin for this network, therefore, (s)he cannot delete it

                            // see if user has WRITE access in case this function was called to check whether
                            // network can be modified
                            if (checkWriteAccess) {

                                if (myAccountController.networksWithWriteAccess.indexOf(externalId1) == -1) {
                                    // no ADMIN or WRITE priviled for this network.  The current user cannot modify it.
                                    return false;
                                }

                            } else {
                                // we don't check if user has WRITE privilege here (since checkWriteAccess is false)
                                // and user has no ADMIN access, which means the network cannot be deleted by the current user
                                return false;
                            }
                        }
                    }
                }

                return true;
            }
            
            /*
             * This function returns true if the current user has ADMIN access to all selected networks,
             * and false otherwise.
             */
            myAccountController.checkAdminPrivilegeOnSelectedNetworks = function(checkWriteAccess) {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                // iterate through the list of selected networks and check if user has ADMIN access to all of them
                for (var i = 0; i < selectedNetworksRows.length; i++) {
                    var networkUUID = selectedNetworksRows[i].externalId;

                    // check if you have admin privilege for this network
                    if (myAccountController.networksWithAdminAccess.indexOf(networkUUID) == -1) {
                        return false;
                    }
                }
                return true;
            }

            myAccountController.deleteSelectedNetworks = function ()
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
                            console.log("unable to delete network");

                        });
                }

                // after we deleted all selected networks, the footer of the table may
                // still show that some networks are selected (must be a bug), so
                // we manually set the selected count to 0 (see defect NDEX-582)
                $scope.networkGridApi.grid.selection.selectedCount = 0;

                for (i = myAccountController.networkSearchResults.length - 1; i >= 0; i-- )
                {
                    var externalId = myAccountController.networkSearchResults[i].externalId;
                    if( selectedIds.indexOf(externalId) != -1 )
                        myAccountController.networkSearchResults.splice(i,1);
                }
                refreshNetworkTable();
                myAccountController.atLeastOneSelected = false;
            };

            //              scope functions

            // change to use directive. setting of current network should occur controller initialization
            myAccountController.setAndDisplayCurrentNetwork = function (identifier)
            {
                $location.path("/newNetwork/" + identifier);
            };


            var getGroupsUUIDs = function(groups) {
                var groupsUUIDs = [];

                for (var i=0; i<groups.length; i++) {
                    var groupUUID = groups[i].resourceUUID;
                    groupsUUIDs.push(groupUUID);
                }
                return groupsUUIDs;
            }

            var checkGroupSearchResultObject = function(groupObj) {
                var found = false;

                for (var i = 0; i < myAccountController.originalGroupSearchResults.length; i++ ) {
                    if (groupObj.externalId == myAccountController.originalGroupSearchResults[i].externalId) {
                        found = true;
                        break;
                    }
                }

                return found;
            }

            myAccountController.searchGroupsForUsersInput = function() {
                var searchString = myAccountController.groupSearchString;

                ndexService.searchGroupsV2(searchString, 0, 1000000,
                    function(groupObjectsFound) {

                        myAccountController.groupSearchResults = [];

                        if (groupObjectsFound && groupObjectsFound.resultList && groupObjectsFound.resultList.length > 0) {

                            for (var i = 0; i < groupObjectsFound.resultList.length; i++) {
                                var groupObj = groupObjectsFound.resultList[i];

                                if (checkGroupSearchResultObject(groupObj)) {
                                    myAccountController.groupSearchResults.push(groupObj);
                                }
                            }
                        }
                    },
                    function(error) {
                        console.log("unable to search groups");
                    });
            }

            myAccountController.submitGroupSearch = function (member, inclusive)
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
                 *
                 */
                ndexService.getUserGroupMemberships(myAccountController.identifier, member, 0, 1000000, inclusive)
                    .success(
                        function (groups) {

                            var groupsUUIDs = getGroupsUUIDs(groups);

                            ndexService.getGroupsByUUIDs(groupsUUIDs)
                                .success(
                                    function (groupList) {
                                        myAccountController.groupSearchResults = groupList;
                                        myAccountController.originalGroupSearchResults = groupList;
                                    })
                                .error(
                                    function(error) {
                                        console.log("unable to get groups by UUIDs");
                                    }
                                )
                        })
                    .error(
                        function (error, data) {
                            console.log("unable to get user group memberships");
                        });
            }
            
            myAccountController.adminCheckBoxClicked = function()
            {
                var member    = (myAccountController.groupSearchAdmin) ? "GROUPADMIN" : "MEMBER";
                var inclusive = (myAccountController.groupSearchAdmin) ? false : true;

                myAccountController.groupSearchMember = false;

                myAccountController.submitGroupSearch(member, inclusive);
            };

            myAccountController.memberCheckBoxClicked = function()
            {
                var member    = "MEMBER";
                var inclusive = (myAccountController.groupSearchMember) ? false : true;

                myAccountController.groupSearchAdmin = false;

                myAccountController.submitGroupSearch(member, inclusive);
            };

            myAccountController.getNetworksWithAdminAccess = function ()
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
                        myAccountController.networksWithAdminAccess = [];

                        for (var i = 0; i < networks.length; i++) {
                            var networkUUID = networks[i].resourceUUID;
                            myAccountController.networksWithAdminAccess.push(networkUUID);
                        }
                    },
                    // Error
                    function (response) {
                        console.log(response);
                    }
                )
            };

            myAccountController.getNetworksWithWriteAccess = function ()
            {
                // get all networks for which the current user has WRITE privilege.
                // These networks include both networks owned by current user and by other accounts.
                ndexService.getUserNetworkMemberships(
                    "WRITE",
                    0,
                    1000000, //numberOfNetworks,
                    // Success
                    function (networks)
                    {
                        userContromyAccountControllerller.networksWithWriteAccess = [];

                        for (var i = 0; i < networks.length; i++) {
                            var networkUUID = networks[i].resourceUUID;
                            myAccountController.networksWithWriteAccess.push(networkUUID);
                        }
                    },
                    // Error
                    function (response)
                    {
                        console.log(response);
                    }
                )
            };

            myAccountController.markTaskForDeletion = function (taskUUID)
            {
                ndexService.setTaskStatus(taskUUID, "QUEUED_FOR_DELETION",
                    function ()
                    {
                        myAccountController.refreshTasks();
                    })
            };

            myAccountController.deleteTask = function (taskUUID)
            {
                ndexService.deleteTask(taskUUID,
                    function ()
                    {
                        myAccountController.refreshTasks();
                    })
            };

            myAccountController.refreshTasks = function ()
            {
                ndexService.getUserTasks(
                    "ALL",
                    0,
                    100,
                    // Success
                    function (tasks)
                    {
                        myAccountController.tasks = tasks;
                    },
                    // Error
                    function (response)
                    {
                    }
                )
            };

            //myAccountController.identifier, 'READ', 0, 1000000, inclusive)

            myAccountController.getNetworksWithAdminAccess = function ()
            {
                var inclusive = true;
                // get all networks for which the current user has ADMIN privilege.
                // These networks include both networks owned by current user and by other accounts.
                ndexService.getUserNetworkMemberships(
                    myAccountController.identifier,
                    "ADMIN",
                    0,
                    1000000,
                    inclusive)
                    .success (function(networks)
                    {
                        myAccountController.networksWithAdminAccess = [];

                        for (var i = 0; i < networks.length; i++) {
                            var networkUUID = networks[i].resourceUUID;
                            myAccountController.networksWithAdminAccess.push(networkUUID);
                        }
                    })
                    .error (function(response)
                    {
                        console.log(response);
                    })
            };

            myAccountController.getNetworksWithWriteAccess = function ()
            {
                var inclusive = true;
                // get all networks for which the current user has WRITE privilege.
                // These networks include both networks owned by current user and by other accounts.
                ndexService.getUserNetworkMemberships(
                    myAccountController.identifier,
                    "WRITE",
                    0,
                    1000000,
                    inclusive)
                    .success (function(networks)
                    {
                        myAccountController.networksWithWriteAccess = [];

                        for (var i = 0; i < networks.length; i++) {
                            var networkUUID = networks[i].resourceUUID;
                            myAccountController.networksWithWriteAccess.push(networkUUID);
                        }
                    })
                    .error (function(response)
                    {
                        console.log(response);
                    })
            };


            myAccountController.refreshRequests = function ()
            {
                getRequests();
            };

            // local functions

            var getRequests = function ()
            {
                // get all pending requests
                ndexService.getUserPermissionRequests(myAccountController.identifier, "received",
                    function (requests)
                    {
                        myAccountController.pendingRequests = requests;
                    },
                    function (error)
                    {
                        console.log("unable to get pending requests");
                    });

                // get all sent requests
                ndexService.getUserPermissionRequests(myAccountController.identifier, "sent",
                    function (requests)
                    {
                        myAccountController.sentRequests = requests;
                    },
                    function (error)
                    {
                        console.log("unable to get sent requests");
                    })
            };

            var getUUIDs = function(data) {
                var UUIDs = [];
                if (data) {
                    for (i=0; i<data.length; i++) {
                        var o = data[i];
                        UUIDs.push(o.resourceUUID);
                    }
                }
                return UUIDs;
            }
            
            myAccountController.submitNetworkSearchForLoggedInUser = function ()
            {
                /*
                 * To get list of Network Summaries objects we need to:
                 *
                 * 1) Use getUserNetworkMemberships function at
                 *    /user/network/{permission}/{skipBlocks}/{blockSize}
                 *    to get the list of network IDs that this user has permission to.
                 *
                 * 2) Use getNetworkSummaries function at /network/summaries to get a list of network
                 *    summaries using the network IDs we got in step 1  (send all network IDs in one call).
                 *
                 */
                var inclusive = true;

                ndexService.getUserNetworkMemberships(myAccountController.identifier, 'READ', 0, 1000000, inclusive)
                    .success(
                        function (networkUUIDs) {
                            var UUIDs = getUUIDs(networkUUIDs);

                            ndexService.getNetworkSummariesByIDs(UUIDs)
                                .success(
                                    function (networkSummaries) {
                                        myAccountController.networkSearchResults = networkSummaries;

                                        if (myAccountController.networkSearchResults.length > 0) {
                                            myAccountController.getNetworksWithAdminAccess();
                                            myAccountController.getNetworksWithWriteAccess();
                                        } else {
                                            // this might be redundant -- myAccountController.networksWithAdminAccess and
                                            // userController.networksWithWriteAccess must be empty here
                                            myAccountController.networksWithAdminAccess = [];
                                            myAccountController.networksWithWriteAccess = [];
                                        }

                                        populateNetworkTable();
                                    })
                                .error(
                                    function (error, data) {
                                        console.log("unable to get network summaries by IDs");
                                    });
                        })
                    .error(
                        function (error, data) {
                            console.log("unable to get user network memberships");
                        });
            };

            $scope.showWarningsOrErrors = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                }
                
                uiMisc.showNetworkWarningsOrErrors(rowEntity, myAccountController.networkSearchResults);
            }


            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------
            myAccountController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);

            ndexService.getUser(myAccountController.identifier)
                .success(
                function (user)
                {
                    myAccountController.displayedUser = user;

                    cUser = user;

                    // get requests
                    getRequests();

                    //get tasks
                    myAccountController.refreshTasks();

                    // get groups
                    var member = "MEMBER";
                    var inclusive = true;
                    myAccountController.submitGroupSearch(member, inclusive);

                    // get networks
                    myAccountController.submitNetworkSearchForLoggedInUser();
                })
        }]);


//------------------------------------------------------------------------------------//
