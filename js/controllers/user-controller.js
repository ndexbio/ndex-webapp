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
            var stripHTML = function(html) {

                // remove convert HTML to markdown; toMarkdown is defined in to-markdown.min.js
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
                    var description = stripHTML(network['description']);
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


            userController.tasksNotificationsTabDisabled = function() {

                if ( (userController.tasks.length > 0) ||
                     (userController.pendingRequests.length > 0) ||
                     (userController.sentRequests.length > 0)) {
                    return false;
                }

                return true;
            }

            userController.getTaskFileExt = function(task)
            {
                if( !task.format )
                    return "";
                if( task.format.toUpperCase() == 'BIOPAX' )
                    return 'owl';
                else
                    return task.format.toLowerCase();
            };

            userController.getNetworkDownloadName = function(task)
            {
                if (typeof task.attributes === 'undefined') {
                    return;
                }

                var name = (typeof task.attributes.downloadFileName === 'undefined') ?
                    task.externalId : task.attributes.downloadFileName.replace(/ /g, "_");

                var extension = (typeof task.attributes.downloadFileExtension === 'undefined') ?
                    "txt" : userController.getTaskFileExt(task);

                var networkNameForDownload = name + "." + extension;

                return networkNameForDownload;
            };

            userController.getNetworkName = function(task)
            {
                if (typeof task.attributes === 'undefined' ||
                    typeof task.attributes.downloadFileName === 'undefined') {
                    return task.externalId;
                }

                return task.attributes.downloadFileName + " " + "(" +
                    userController.getTaskFileExt(task).toUpperCase() + ")";
            };

            // recursive function that deletes all tasks from the server
            userController.deleteAllTasks = function()
            {

                // delete all tasks that are visible to the user
                for (var i = 0; i < userController.tasks.length; i++) {
                    var task = userController.tasks[i];
                    userController.deleteTask(task.externalId);
                }

                // there may be more tasks on the server; try to get them
                ndexService.getUserTasks(
                     sharedProperties.getCurrentUserId(),
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
                         // (userController.deleteAllTasks) to delete them
                         userController.tasks = tasks;
                         userController.deleteAllTasks();
                     },
                     // Error
                     function (response)
                     {
                         return;
                     }
                )
            };

            userController.checkAndDeleteSelectedNetworks = function() {
                var checkWritePrivilege = false;
                var networksDeleteable =
                    userController.checkIfSelectedNetworksCanBeDeletedOrChanged(checkWritePrivilege);

                if (networksDeleteable) {
                    userController.confirmDeleteSelectedNetworks();
                } else {
                    var title = "Cannot Delete Selected Networks";
                    var message =
                        "Some selected networks could not be deleted because they are either marked READ-ONLY" +
                        " or you do not have ADMIN privileges. Please uncheck the READ-ONLY box in each network " +
                        " page, make sure you have ADMIN access to all selected networks, and try again.";

                    userController.genericInfoModal(title, message);
                }
                return;
            }

            userController.genericInfoModal = function(title, message)
            {
                var   modalInstance = $modal.open({
                    templateUrl: 'generic-info-modal.html',
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

            userController.confirmDeleteSelectedNetworks = function()
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
                            userController.deleteSelectedNetworks();
                            $modalInstance.dismiss();
                            $scope.isProcessing = false;
                        };
                    }
                });
            }

            userController.manageBulkAccess = function(path, currentUserId)
            {
                var selectedIDs = userController.getIDsOfSelectedNetworks();
                sharedProperties.setSelectedNetworkIDs(selectedIDs);
                sharedProperties.setCurrentUserId(currentUserId);
                $location.path(path);
            }


            userController.allTasksCompleted = function() {
                var task;

                for (var i = 0; i < userController.tasks.length; i++) {
                    task = userController.tasks[i];
                    if (task.status.toUpperCase() === 'PROCESSING') {
                        return false;
                    }
                }
                return true;
            }

            userController.getIDsAndTypesOfSelectedNetworks = function ()
            {
                var selectedIdsAndTypes = {};   //[];

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                var IdsAndTypes = {};
                for( var i = 0; i < selectedNetworksRows.length; i ++ )
                {
                    selectedIdsAndTypes[i] = {};
                    selectedIdsAndTypes[i]['externalId']  = selectedNetworksRows[i].externalId;
                    selectedIdsAndTypes[i]['format']      = selectedNetworksRows[i].Format;
                    selectedIdsAndTypes[i]['networkName'] = selectedNetworksRows[i]["Network Name"];
                }

                return selectedIdsAndTypes;
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

            userController.updateVisibilityOfNetwork = function (networkId, networkVisibility)
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
            userController.checkIfSelectedNetworksCanBeDeletedOrChanged = function(checkWriteAccess) {

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                // iterate through the list of selected networks
                for (var i = 0; i < selectedNetworksRows.length; i++) {
                    var externalId1 = selectedNetworksRows[i].externalId;

                    // check if the selected network is read-only and can be deleted by the current account
                    for (var j = 0; j < userController.networkSearchResults.length; j++) {

                        var externalId2 = userController.networkSearchResults[j].externalId;

                        // find the current network info in the list of networks this user has access to
                        if (externalId1 !== externalId2) {
                            continue;
                        }

                        // check if network is read-only
                        if (userController.networkSearchResults[j].readOnlyCommitId > 0) {
                            // it is read-only; cannot delete or modify
                            return false;
                        }

                        // check if you have admin privilege for this network
                        if (userController.networksWithAdminAccess.indexOf(externalId1) == -1) {
                            // the current user is not admin for this network, therefore, (s)he cannot delete it

                            // see if user has WRITE access in case this function was called to check whether
                            // network can be modified
                            if (checkWriteAccess) {

                                if (userController.networksWithWriteAccess.indexOf(externalId1) == -1) {
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
            userController.checkAdminPrivilegeOnSelectedNetworks = function(checkWriteAccess) {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                // iterate through the list of selected networks and check if user has ADMIN access to all of them
                for (var i = 0; i < selectedNetworksRows.length; i++) {
                    var networkUUID = selectedNetworksRows[i].externalId;

                    // check if you have admin privilege for this network
                    if (userController.networksWithAdminAccess.indexOf(networkUUID) == -1) {
                        return false;
                    }
                }
                return true;
            }



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

                query.accountName = userController.displayedUser.accountName;
                query.searchString = userController.groupSearchString
                if (userController.groupSearchAdmin) query.permission = 'GROUPADMIN';
                if (userController.groupSearchMember) query.permission = 'MEMBER';

                //pagination missing
                ndexService.searchGroups(query, 0, 50,
                    function (groups)
                    {
                        // Save the results
                        userController.groupSearchResults = groups;

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
                userController.networkQuery.accountName = userController.displayedUser.accountName;
                userController.networkQuery.permission = "READ";

                ndexService.searchNetworks(userController.networkQuery, userController.skip, userController.skipSize,
                    function (networks)
                    {
                        userController.getNetworksWithAdminAccess();
                        userController.getNetworksWithWriteAccess();
                        userController.networkSearchResults = networks;
                        populateNetworkTable();
                    },
                    function (error)
                    {
                        //TODO
                    })
            };

            userController.markTaskForDeletion = function (taskUUID)
            {
                ndexService.setTaskStatus(taskUUID, "QUEUED_FOR_DELETION",
                    function ()
                    {
                        userController.refreshTasks();
                    })
            };

            userController.deleteTask = function (taskUUID)
            {
                ndexService.deleteTask(taskUUID,
                    function ()
                    {
                        userController.refreshTasks();
                    })
            };

            userController.refreshPage = function()
            {
                $route.reload();
            };

            userController.refreshTasks = function ()
            {
                ndexService.getUserTasks(
                    sharedProperties.getCurrentUserId(),
                    "ALL",
                    0,
                    100,
                    // Success
                    function (tasks)
                    {
                        userController.tasks = tasks;
                    },
                    // Error
                    function (response)
                    {
                    }
                )
            };

            userController.getNetworksWithAdminAccess = function ()
            {
                // get all networks for which the current user has ADMIN privilege.
                // These networks include both networks owned by current user and by other accounts.
                ndexService.getUserNetworkMemberships(
                    sharedProperties.getCurrentUserId(),
                    "ADMIN",
                    0,
                    100,
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
                    }
                )
            };

            userController.getNetworksWithWriteAccess = function ()
            {
                // get all networks for which the current user has WRITE privilege.
                // These networks include both networks owned by current user and by other accounts.
                ndexService.getUserNetworkMemberships(
                    sharedProperties.getCurrentUserId(),
                    "WRITE",
                    0,
                    100,
                    // Success
                    function (networks)
                    {
                        userController.networksWithWriteAccess = [];

                        for (var i = 0; i < networks.length; i++) {
                            var networkUUID = networks[i].resourceUUID;
                            userController.networksWithWriteAccess.push(networkUUID);
                        }
                        var i = 10;
                    },
                    // Error
                    function (response)
                    {
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

            userController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);

            ndexService.getUser(userController.identifier)
                .success(
                function (user)
                {
                    userController.displayedUser = user;
                    var loggedInUser = ndexUtility.getUserCredentials();

                    if (loggedInUser &&
                        ((user.externalId == loggedInUser.userId) || (user.accountName == loggedInUser.accountName)))
                        userController.isLoggedInUser = true;

                    cUser = user;
                    // get requests

                    // get requests
                    if (userController.isLoggedIn)
                        getRequests();

                    //get tasks
                    if (userController.isLoggedIn)
                        userController.refreshTasks();

                    // get groups
                    userController.submitGroupSearch();

                    // get networks
                    userController.submitNetworkSearch();


                })


        }]);


//------------------------------------------------------------------------------------//
