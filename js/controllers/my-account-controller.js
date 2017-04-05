ndexApp.controller('myAccountController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope',
        '$location', '$routeParams', '$route', '$modal', 'uiMisc', 'ndexNavigation',
        function (ndexService, ndexUtility, sharedProperties, $scope,
                  $location, $routeParams, $route, $modal, uiMisc, ndexNavigation)
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
            myAccountController.rowsSelected = 0;

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

            // this map of Cytoscape collection networks; networkUUID is a key and <numberOfSubNetworks> is a value;
            // we only put networks with number of subnetwroks greater than 1
            myAccountController.networksWithMultipleSubNetworks = {};

            // when My Account (this current) page loads, we need to hide the My Account menu link
            $scope.$parent.showMyAccountMenu = false;
            
            // this function gets called when user navigates away from the current My Account page.
            // (can also use "$locationChangeStart" instead of "$destroy"
            $scope.$on("$destroy", function(){
                // hide the My Account menu item in Nav Bar
                $scope.$parent.showMyAccountMenu = true;
            });

            $scope.enableEditPropertiesBulkButton = false;
            $scope.enableManageAccessBulkButton = false;

            myAccountController.editProfilesLabel   = "Edit Profile";
            myAccountController.exportNetworksLabel = "Export Network";
            myAccountController.deleteNetworksLabel = "Delete Network";
            

            $scope.selectedRowsUids = {};
            
            $scope.updateSelectedRowsUidsList = function(row) {
                var hashKey = row['entity']["$$hashKey"];

                if (row['isSelected']) {
                    $scope.selectedRowsUids[hashKey] = true;
                } else {
                    delete $scope.selectedRowsUids[hashKey];
                };
            };

            $scope.selectPreviouslySelectedNetworks = function() {
                var selectedCount = 0;
                for (var hashKey in $scope.selectedRowsUids) {
                    $scope.networkGridApi.grid.rowHashMap['object:'+hashKey]['isSelected'] = true;
                    selectedCount = selectedCount + 1;
                };

                // This shows (Selected Items: <>) at the bottom of network table
                $scope.networkGridApi.grid.selection.selectedCount = selectedCount;
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

                onRegisterApi: function( gridApi )
                {
                    $scope.networkGridApi = gridApi;
                    gridApi.selection.on.rowSelectionChanged($scope,function(row){
                        var selectedRows = gridApi.selection.getSelectedRows();
                        myAccountController.rowsSelected = selectedRows.length;

                        $scope.updateSelectedRowsUidsList(row);

                        changeBulkActionsButtonsLabels();

                        enableOrDisableEditPropertiesBulkButton();
                        enableOrDisableManageAccessBulkButton();
                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                        myAccountController.rowsSelected = selectedRows.length;

                        _.forEach(rows, function(row) {
                            $scope.updateSelectedRowsUidsList(row);
                        });

                        changeBulkActionsButtonsLabels();
                        enableOrDisableEditPropertiesBulkButton();
                        enableOrDisableManageAccessBulkButton();
                    });
                }
            };

            var changeBulkActionsButtonsLabels = function() {
                if (myAccountController.rowsSelected > 1) {
                    myAccountController.editProfilesLabel   = "Edit Profiles";
                    myAccountController.exportNetworksLabel = "Export Networks";
                    myAccountController.deleteNetworksLabel = "Delete Networks";
                } else {
                    myAccountController.editProfilesLabel   = "Edit Profile";
                    myAccountController.exportNetworksLabel = "Export Network";
                    myAccountController.deleteNetworksLabel = "Delete Network";
                };
            };

            var populateNetworkTable = function()
            {
                var columnDefs = [
                    { field: '  ', enableFiltering: false, maxWidth: 40, cellTemplate: 'pages/gridTemplates/networkStatus.html' },
                    { field: 'Network Name', enableFiltering: true, cellTemplate: 'pages/gridTemplates/networkName.html' },
                    { field: ' ', enableFiltering: false, width:40, cellTemplate: 'pages/gridTemplates/downloadNetwork.html' },
                    { field: 'Format', enableFiltering: true, maxWidth:63 },
                    { field: 'Ref.', enableFiltering: false, maxWidth: 45, cellTemplate: 'pages/gridTemplates/reference.html' },
                    { field: 'Disease', enableFiltering: true, maxWidth: 68, cellTemplate: 'pages/gridTemplates/disease.html'},
                    { field: 'Tissue',  enableFiltering: true, maxWidth: 65, cellTemplate: 'pages/gridTemplates/tissue.html'},
                    //{ field: 'Nodes', enableFiltering: false, maxWidth:70 },
                    { field: 'Edges', enableFiltering: false, maxWidth:70 },
                    { field: 'Visibility', enableFiltering: true, maxWidth:70, cellClass: 'grid-align-cell' },
                    { field: 'Owner', enableFiltering: true, maxWidth:80, cellTemplate: 'pages/gridTemplates/ownedBy.html' },
                    { field: 'Last Modified', enableFiltering: false, maxWidth:120,
                        cellFilter: "date:'short'",  sort: {direction: 'desc', priority: 0}
                    },

                    /*
                    { field: 'Last Modified', enableFiltering: false, width:170,
                        cellFilter: 'date:\'MMM dd, yyyy hh:mm:ssa\'',  sort: {direction: 'desc', priority: 0},
                        cellClass: 'grid-align-cell' },
                    */

                    { field: 'Show', enableFiltering: false, maxWidth: 60, cellTemplate: 'pages/gridTemplates/showCase.html' },

                    { field: 'description', enableFiltering: false,  visible: false},
                    { field: 'externalId',  enableFiltering: false,  visible: false},
                    { field: 'ownerUUID',   enableFiltering: false,  visible: false},
                    { field: 'name',        enableFiltering: false,  visible: false}
                ];
                $scope.networkGridApi.grid.options.columnDefs = columnDefs;
                refreshNetworkTable();
            };

            $scope.getExportedNetworkDownloadLink = function(taskId) {
                return ndexService.getNdexServerUriV2() + "/task/" + taskId + "/file?download=true";
            };

            $scope.getCredentialsForExportedNetworkDownload = function() {
                document.getElementById("exportedNetworkDownoadLinkId").username = ndexUtility.getUserCredentials()['userName'];
                document.getElementById("exportedNetworkDownoadLinkId").password = ndexUtility.getUserCredentials()['token'];
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

            var enableOrDisableEditPropertiesBulkButton = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableEditPropertiesBulkButton = false;

                for (var i = 0; i < selectedNetworksRows.length; i++) {

                    var ownerUUID = selectedNetworksRows[i].ownerUUID;
                    var status = selectedNetworksRows[i].Status;

                    var network_in_invalid_state =
                        (status && ["failed", "processing"].indexOf(status.toLowerCase()) > -1);

                    if (network_in_invalid_state) {
                        return;
                    }

                    var networkUUUID = selectedNetworksRows[i].externalId;
                    if (networkUUUID in myAccountController.networksWithMultipleSubNetworks) {
                        return;
                    };

                    if (ownerUUID == myAccountController.loggedInIdentifier) {
                        // we are owner of the network, it means we can change it; get next selected network
                        continue;
                    };

                    // here, ownerUUID != myAccountController.loggedInIdentifier
                    if ((myAccountController.networksWithAdminAccess.indexOf(networkUUUID) == -1) &&
                        (myAccountController.networksWithWriteAccess.indexOf(networkUUUID) == -1) ) {
                        return;
                    };

                };

                $scope.enableEditPropertiesBulkButton = true;
            };

            var enableOrDisableManageAccessBulkButton = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableManageAccessBulkButton = false;

                for (var i = 0; i < selectedNetworksRows.length; i++) {

                    var ownerUUID = selectedNetworksRows[i].ownerUUID;
                    var status = selectedNetworksRows[i].Status;

                    var network_in_invalid_state =
                        (status && ["failed", "processing"].indexOf(status.toLowerCase()) > -1);

                    if (ownerUUID != myAccountController.loggedInIdentifier || network_in_invalid_state) {
                        return;
                    };
                };

                $scope.enableManageAccessBulkButton = true;
            };
            
            var refreshNetworkTable = function()
            {
                $scope.networkGridOptions.data = [];

                for(var i = 0; i < myAccountController.networkSearchResults.length; i++ )
                {
                    var network = myAccountController.networkSearchResults[i];

                    var subNetworkInfo  = uiMisc.getSubNetworkInfo(network);
                    var noOfSubNetworks = subNetworkInfo['numberOfSubNetworks'];
                    var subNetworkId    = subNetworkInfo['id'];

                    var networkStatus = "success";
                    if (network.errorMessage) {
                        networkStatus = "failed";
                    } else if (!network.isValid) {
                        networkStatus = "processing";
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
                    //var nodes = network['nodeCount'];
                    var edges = network['edgeCount'];
                    var owner = network['owner'];
                    var visibility = network['visibility'];
                    var modified = new Date( network['modificationTime'] );
                    var showcase = network['isShowcase'];

                    var format    = (subNetworkId) ? uiMisc.getNetworkFormat(subNetworkId, network) :
                        uiMisc.getNetworkFormatForMultipleSubNetworks(network);
                    var download  = "Download " + networkName;
                    var reference = uiMisc.getNetworkReferenceObj(subNetworkId, network);
                    var disease   = uiMisc.getDisease(network);
                    var tissue    = uiMisc.getTissue(network);

                    var errorMessage = network.errorMessage;

                    var row =   {
                        "Status"        :   networkStatus,
                        "Network Name"  :   networkName,
                        " "             :   download,
                        "Format"        :   format,
                        "Reference"     :   reference,
                        "Disease"       :   disease,
                        "Tissue"        :   tissue,
                        //"Nodes"         :   nodes,
                        "Edges"         :   edges,
                        "Visibility"    :   visibility,
                        "Owner"         :   owner ,
                        "Last Modified" :   modified,
                        "Show"          :   showcase,
                        "description"   :   description,
                        "externalId"    :   externalId,
                        "ownerUUID"     :   network['ownerUUID'],
                        "name"          :   networkName,
                        "errorMessage"  :   errorMessage,
                        "subnetworks"   :   noOfSubNetworks
                    };
                    $scope.networkGridOptions.data.push(row);
                }
            };

            myAccountController.getTitle = function() {
                return (!$scope.enableEditPropertiesBulkButton) ?
                    "1 or more selected networks are Cytoscape collections with multiple subnetworks and cannot be edited in NDEx." :
                    "";
            }

            myAccountController.tasksNotificationsTabDisabled = function() {

                if ( (myAccountController.tasks.length > 0) ||
                     (myAccountController.pendingRequests.length > 0) ||
                     (myAccountController.sentRequests.length > 0)) {
                    return false;
                }

                return true;
            };

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

                return task.attributes.downloadFileName;
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
                ndexService.getUserTasksV2(
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
            };

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
            };

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
            };

            myAccountController.manageBulkAccess = function(path, currentUserId)
            {
                var selectedIDs = myAccountController.getIDsOfSelectedNetworks();
                sharedProperties.setSelectedNetworkIDs(selectedIDs);
                sharedProperties.setCurrentUserId(currentUserId);
                $location.path(path);
            };

            myAccountController.allTasksCompleted = function() {
                var task;

                for (var i = 0; i < myAccountController.tasks.length; i++) {
                    task = myAccountController.tasks[i];
                    if (task.status.toUpperCase() === 'PROCESSING') {
                        return false;
                    }
                }
                return true;
            };

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

            /*
            myAccountController.getSelectedNetworks = function ()
            {
                var selectedNetworks = {};
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                for (var i = 0; i < selectedNetworksRows.length; i ++)
                {
                    selectedNetworks[selectedNetworksRows[i].externalId] = {
                        Showcase : selectedNetworksRows[i].Showcase,
                        Visibility: selectedNetworksRows[i].Visibility
                    }

                }

                return selectedNetworks;
            };\*/

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
            
            myAccountController.updateShowcaseOfNetwork = function (networkId, networkShowcase)
            {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                for( var i = 0; i < selectedNetworksRows.length; i ++ )
                {
                    if (selectedNetworksRows[i].externalId == networkId) {
                        selectedNetworksRows[i].Show = networkShowcase;
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
                                    // no ADMIN or WRITE privilege for this network.  The current user cannot modify it.
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
            };
            
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
            };

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
                    ndexService.deleteNetworkV2(selectedId,
                        function (data)
                        {
                            //;
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

                for (var i = myAccountController.networkSearchResults.length - 1; i >= 0; i-- )
                {
                    var externalId = myAccountController.networkSearchResults[i].externalId;
                    if( selectedIds.indexOf(externalId) != -1 )
                        myAccountController.networkSearchResults.splice(i,1);
                }
                refreshNetworkTable();
                myAccountController.rowsSelected = 0;
            };

            //              scope functions

            // change to use directive. setting of current network should occur controller initialization
            myAccountController.setAndDisplayCurrentNetwork = function (identifier)
            {
                $location.path("/newNetwork/" + identifier);
            };

            var checkGroupSearchResultObject = function(groupObj) {
                var found = false;

                for (var i = 0; i < myAccountController.originalGroupSearchResults.length; i++ ) {
                    if (groupObj.externalId == myAccountController.originalGroupSearchResults[i].externalId) {
                        found = true;
                        break;
                    }
                }

                return found;
            };

            myAccountController.searchGroupsFromUserInput = function() {
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
            };

            myAccountController.getUserGroupMemberships = function (member)
            {
                /*
                 * To get list of Group objects we need to:
                 *
                 * 1) Use Get User’s Group Memberships API at
                 *    /user/{userid}/membership?type={membershiptype}&start={startPage}&size={pageSize}
                 *    to get the list of GROUPADMIN and MEMBER memberships
                 *
                 * 2) Get a list of Group UUIDs from step 1
                 *
                 * 3) Use this list of Group UUIDs to get Groups through
                 *    /group/groups API.
                 */
                ndexService.getUserGroupMembershipsV2(myAccountController.identifier, member, 0, 1000000,

                        function (userMembershipsMap) {

                            var groupsUUIDs = Object.keys(userMembershipsMap);

                            ndexService.getGroupsByUUIDsV2(groupsUUIDs)
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
                        },
                        function (error, data) {
                            console.log("unable to get user group memberships");
                        });
            };
            
            myAccountController.adminCheckBoxClicked = function()
            {
                var member = (myAccountController.groupSearchAdmin) ? "GROUPADMIN" : null;

                myAccountController.groupSearchMember = false;

                myAccountController.getUserGroupMemberships(member);
            };

            myAccountController.memberCheckBoxClicked = function()
            {
                var member = (myAccountController.groupSearchMember) ? "MEMBER" : null;

                myAccountController.groupSearchAdmin = false;

                myAccountController.getUserGroupMemberships(member);
            };
            
            myAccountController.deleteTask = function (taskUUID)
            {
                ndexService.deleteTaskV2(taskUUID,
                    function (data)
                    {
                        myAccountController.refreshTasks();
                    },
                    function (error)
                    {
                        console.log("unable to delete task");
                    }
                )
            };

            myAccountController.refreshTasks = function ()
            {
                ndexService.getUserTasksV2(
                    "ALL",
                    0,
                    100,
                    // Success
                    function (tasks)
                    {
                        myAccountController.tasks = tasks;
                    },
                    function (error)
                    {
                        console.log("unable to get user's tasks");
                    }
                )
            };

            myAccountController.refreshRequests = function ()
            {
                getRequests();
            };

            // local functions

            var getUsersUUIDs = function(requests) {
                var UUIDs = [];

                if (!requests || requests.length == 0) {
                    return UUIDs;
                }

                for (var i=0; i<requests.length; i++) {
                    var requesterId = requests[i].requesterId;

                    if (UUIDs.indexOf(requesterId) < 0) {
                        UUIDs.push(requesterId);
                    }
                }

                return UUIDs;
            }

            var getNamesOfRequesters = function(requests, users) {

                if (!users || !requests || users.length == 0 || requests.length == 0) {
                    return;
                }

                for (var i = 0; i < requests.length; i++) {
                    var requesterId = requests[i].requesterId;

                    for (var j = 0; j < users.length; j++) {
                        if (requesterId == users[j].externalId) {
                            requests[i].sourceName = users[j].firstName + " " + users[j].lastName;
                            continue;
                        }
                    }
                }
            }

            var getRequests = function ()
            {
                // get all user pending requests
                ndexService.getUserPermissionRequestsV2(myAccountController.identifier, "received",
                    function (requests)
                    {
                        var userUUIDs = getUsersUUIDs(requests);

                        ndexService.getUsersByUUIDsV2(userUUIDs)
                            .success(
                                function (userList) {
                                    // make sure that sourceName has "First Name  Second Name" instead of "Account Name"
                                    getNamesOfRequesters(requests, userList);

                                    myAccountController.pendingRequests = requests;

                                    // get all group pending requests
                                    ndexService.getUserMembershipRequestsV2(myAccountController.identifier, "received",
                                        function (requests)
                                        {
                                            if (requests && requests.length > 0) {
                                                myAccountController.pendingRequests =
                                                    myAccountController.pendingRequests.concat(requests);
                                            }
                                        },
                                        function (error)
                                        {
                                            console.log("unable to get pending requests");
                                        });
                                })
                            .error(
                                function(error) {
                                    console.log("unable to get users by UUIDs");
                                }
                            )

                    },
                    function (error)
                    {
                        console.log("unable to get pending requests");
                    });

                // get all user sent requests
                ndexService.getUserPermissionRequestsV2(myAccountController.identifier, "sent",
                    function (requests)
                    {
                        var userUUIDs = getUsersUUIDs(requests);

                        ndexService.getUsersByUUIDsV2(userUUIDs)
                            .success(
                                function (userList) {
                                    // make sure that sourceName has "First Name  Second Name" instead of "Account Name"
                                    getNamesOfRequesters(requests, userList);

                                    myAccountController.sentRequests = requests;

                                    // get all group sent requests
                                    ndexService.getUserMembershipRequestsV2(myAccountController.identifier, "sent",
                                        function (requests)
                                        {
                                            if (requests && requests.length > 0) {
                                                myAccountController.sentRequests =
                                                    myAccountController.sentRequests.concat(requests);
                                            }
                                        },
                                        function (error)
                                        {
                                            console.log("unable to get sent requests");
                                        });
                                })
                            .error(
                                function(error) {
                                    console.log("unable to get users by UUIDs");
                                }
                            )
                    },
                    function (error)
                    {
                        console.log("unable to get sent requests");
                    })

            };

            myAccountController.getUserAccountPageNetworks = function ()
            {
                /*
                 * To get list of Network Summaries objects we need to:
                 *
                 * 1) Use Get User Network Permissions API at
                 *   /user/{userid}/permission?permission={permission}&start={startPage}&size={pageSize}&directonly={true|false}
                 *   to get the list of network IDs that this user has permissions to.
                 *
                 * 2) Use getNetworkSummaries function at /network/summaries to get a list of network
                 *    summaries using the network IDs we got in step 1  (send all network IDs in one call).
                 */
                var directOnly = false;
                ndexService.getUserNetworkPermissionsV2(myAccountController.identifier, 'READ', 0, 1000000, directOnly,
                    function (networkPermissionsMap) {

                        ndexService.getUserAccountPageNetworksV2(myAccountController.identifier,
                            function(networkSummaries) {
                                myAccountController.networkSearchResults = networkSummaries;

                                myAccountController.networksWithAdminAccess = [];
                                myAccountController.networksWithWriteAccess = [];

                                // loop through the network summaries and fill in lists of UUIDs
                                // for networks with ADMIN and WRITE permissions
                                _.forEach(myAccountController.networkSearchResults, function (networkSummaryObj) {

                                    var networkUUID = networkSummaryObj.externalId;

                                    if (networkUUID in networkPermissionsMap) {
                                        var networkPermission = networkPermissionsMap[networkUUID];

                                        if (networkPermission) {
                                            networkPermission = networkPermission.toUpperCase();

                                            if (networkPermission == "ADMIN") {
                                                myAccountController.networksWithAdminAccess.push(networkUUID);
                                            } else if (networkPermission == "WRITE") {
                                                myAccountController.networksWithWriteAccess.push(networkUUID);
                                            };
                                        };
                                    };

                                    var noOfSubNetworks = uiMisc.getNoOfSubNetworks(networkSummaryObj);

                                    if (noOfSubNetworks > 1) {
                                        myAccountController.networksWithMultipleSubNetworks[networkUUID] = noOfSubNetworks;
                                    };
                                });

                                populateNetworkTable();

                            },
                            function(error) {
                               console.log("unable to get user account page networks");
                            });

                    },
                    function (error, data) {
                        console.log("unable to get user network memberships");
                    });
            };


            $scope.showWarningsOrErrors = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                }

                if (rowEntity.subnetworks > 1) {
                    var title = "Warnings";
                    var message = "This network is part of a Cytoscape collection with " +
                        rowEntity.subnetworks + " subnetworks and cannot be edited in NDEx."
                    ndexNavigation.genericInfoModal(title, message);
                } else {
                    uiMisc.showNetworkWarningsOrErrors(rowEntity, myAccountController.networkSearchResults);
                };
            };

            $scope.switchShowcase = function(row) {
                if (row && row.entity) {

                    if (row.entity.Show) {
                        row.entity.Show = false;
                    } else {
                        row.entity.Show = true;
                    }

                    ndexService.setNetworkSystemPropertiesV2(row.entity.externalId, "showcase", row.entity.Show,
                        function (data, networkId, property, value) {
                            // success
                        },
                        function (error, networkId, property, value) {
                            console.log("unable to update showcase for Network with Id " + networkId);
                        });
                }
            };

            $scope.getNetworkDownloadLink = function(rowEntity) {
                return  ndexService.getNdexServerUriV2() + "/network/" + rowEntity.externalId + "?download=true";
            };

            $scope.getCredentialsForNetworkDownload = function(rowEntity) {

                // if user logged in (not anonymous user) add username and password
                // for private networks
                if (myAccountController.isLoggedInUser && rowEntity.Visibility &&
                    rowEntity.Visibility.toLowerCase() == 'private')
                {
                    document.getElementById("downLoadLinkId").username = ndexUtility.getUserCredentials()['userName'];
                    document.getElementById("downLoadLinkId").password = ndexUtility.getUserCredentials()['token'];
                }
            };

            $scope.getFirstWordFromDisease = function(diseaseDescription) {

                return uiMisc.getFirstWordFromDisease(diseaseDescription);
            };

            $scope.isOwnerOfNetwork = function(networkOwnerUUID)
            {
                if (!myAccountController.isLoggedInUser) {
                    return false;
                }
                return (myAccountController.loggedInIdentifier == networkOwnerUUID);
            }

            $scope.deleteFailedNetwork = function(rowEntity) {
                var networkName  = rowEntity.name;
                var errorMessage = rowEntity.errorMessage;
                var status       = rowEntity.Status;
                var networkUUID  = rowEntity.externalId;


                var title = "This Network is Invalid";
                var body  =
                    "<strong>Name: </strong>" + networkName + "<br>" +
                    "<strong>Status: </strong>" + status + "<br>" +
                    "<strong>Error Message: </strong>" + errorMessage + "<br><br>" +
                    "Would you like to permanently DELETE this network?"
                
                ndexNavigation.openConfirmationModal(title, body, "Cancel", "Delete",
                    function () {
                        ndexService.deleteNetworkV2(networkUUID,
                            function (data)
                            {
                                // remove deleted network from myAccountController.networkSearchResults
                                for (var i = myAccountController.networkSearchResults.length - 1; i >= 0; i--)
                                {
                                    var externalId = myAccountController.networkSearchResults[i].externalId;
                                    if (externalId == networkUUID) {
                                        myAccountController.networkSearchResults.splice(i, 1);
                                        refreshNetworkTable();
                                        break;
                                    }
                                }
                            },
                            function (error)
                            {
                                console.log("unable to delete network");
                            });

                    });

                return;
            };
            
            

            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

            ndexService.getUserByUUIDV2(myAccountController.identifier)
                .success(
                function (user)
                {
                    myAccountController.displayedUser = user;

                    cUser = user;

                    // get requests
                    getRequests();

                    //get tasks
                    myAccountController.refreshTasks();

                    // get networks
                    myAccountController.getUserAccountPageNetworks();


                    // get groups
                    var member = null;
                    myAccountController.getUserGroupMemberships(member);
                })
        }]);


//------------------------------------------------------------------------------------//
