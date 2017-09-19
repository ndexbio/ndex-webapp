ndexApp.controller('myAccountController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$rootScope',
        '$location', '$routeParams', '$route', '$modal', 'uiMisc', 'ndexNavigation', 'uiGridConstants', 'ndexSpinner',
        'config', '$compile',
        function (ndexService, ndexUtility, sharedProperties, $scope, $rootScope,
                  $location, $routeParams, $route, $modal, uiMisc, ndexNavigation, uiGridConstants, ndexSpinner,
                  config, $compile)
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
            myAccountController.networkTableRowsSelected = 0;

            myAccountController.taskTableRowsSelected = 0;

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

            // this function gets called when user navigates away from the current page.
            // (can also use "$locationChangeStart" instead of "$destroy"
            $scope.$on("$destroy", function(){
                // hide the Search menu item in Nav Bar
                $scope.$parent.showSearchMenu = false;
                uiMisc.showSearchMenuItem();

                if ((refreshIntervalInSeconds > 0) && (timerVariable)) {
                    clearInterval(timerVariable);
                };
            });

            $scope.diskSpaceInfo = {};

            uiMisc.hideSearchMenuItem();
            $scope.$parent.showSearchMenu = true;

            $scope.enableEditPropertiesBulkButton = false;
            $scope.enableShareBulkButton = false;
            $scope.enableEditAndExportBulkButtons = false;


            myAccountController.editProfilesLabel    = "Edit Profile";
            myAccountController.exportNetworksLabel  = "Export Network";
            myAccountController.addToNetworkSetLabel = "Add To Set";
            myAccountController.deleteNetworksLabel  = "Delete Network";

            myAccountController.networkSets = [];

            $scope.selectedRowsNetworkExternalIds = {};

            $scope.refreshNetworksButtonDisabled = true;
            $scope.refreshTasksButtonDisabled    = true;

            var spinnerMyAccountPageId = "spinnerMyAccountPageId";
            var refreshIntervalInSeconds = config.refreshIntervalInSeconds;
            var timerVariable = undefined;

            var networkTableDefined               = false;
            var tasksAndNotificationsTableDefined = false;

            var networksReceived             = false;

            $scope.tasksReceived             = false;
            $scope.sentRequestsReceived      = false;
            $scope.receivedRequestsReceived  = false;


            myAccountController.numberOfNewTasksAndRequests = 0;

            myAccountController.currentTab = 'networks';

            $scope.networksTasksAndRequestsReceived = function() {
                return (networksReceived &&
                $scope.tasksReceived &&
                $scope.sentRequestsReceived && $scope.receivedRequestsReceived);
            };
            $scope.resetNetworksFlag = function() {
                networksReceived = false;
            };
            $scope.resetTasksAndRequestsReceivedFlags = function() {
                $scope.tasksReceived = $scope.sentRequestsReceived = $scope.receivedRequestsReceived = false;
            };
            $scope.resetNetworksTasksAndRequestsReceivedFlags = function() {
                networksReceived = false;
                $scope.resetTasksAndRequestsReceivedFlags();
            };


            $scope.onTabSelect = function(tabName) {
                myAccountController.currentTab = tabName;
            };


            var paginationOptions = {
                pageNumber: 1,
                pageSize: 15,
                sort: null,
                networkCount: 0,
                networkSetCount: 0
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
                enableRowHeaderSelection: true,

                paginationPageSizes: [15, 20, 25],
                paginationPageSize: 15,
                useExternalPagination: true,

                onRegisterApi: function( gridApi )
                {
                    $scope.networkGridApi = gridApi;

                    gridApi.pagination.on.paginationChanged($scope, function (newPage, pageSize) {
                        paginationOptions.pageNumber = newPage;
                        paginationOptions.pageSize = pageSize;
                        myAccountController.getNoOfNetworksAndSets(
                            function() {
                                myAccountController.loadNetworks();
                            },
                            function() {
                                console.log("unable to get No of Networks and Sets for this account");
                            });

                        $scope.networkGridApi.selection.clearSelectedRows();
                        myAccountController.networkTableRowsSelected = 0;

                    });

                    gridApi.core.on.rowsRendered($scope, function() {
                        // we need to call core.handleWindowResize() to fix the table layout in case it is distorted
                        $scope.networkGridApi.core.handleWindowResize();

                        if (myAccountController.networkTableRowsSelected > 0) {
                            for (var i = 0; i < $scope.networkGridApi.grid.rows.length; i++) {
                                var row = $scope.networkGridApi.grid.rows[i];
                                if (row['entity'] && row['entity']['externalId']
                                        && (row['entity']['externalId'] in $scope.selectedRowsNetworkExternalIds)) {
                                    $scope.networkGridApi.grid.rows[i].isSelected = true;
                                };
                            };
                        };

                        $scope.refreshNetworksButtonDisabled = false;
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
                        myAccountController.networkTableRowsSelected = selectedRows.length;

                        changeNetworkBulkActionsButtonsLabels();

                        enableOrDisableEditAndExportBulkButtons();
                        enableOrDisableEditPropertiesBulkButton();
                        enableOrDisableManageAccessBulkButton();
                    });

                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){

                        _.forEach(rows, function(row) {
                            if ((row.entity.Status == 'Set') && (row.isSelected)) {
                                // unselect a Set: make row.isSelected false and decrement the number of selected items
                                row.isSelected = false;

                                var selectedCount = $scope.networkGridApi.grid.selection.selectedCount;
                                if (selectedCount > 0) {
                                    $scope.networkGridApi.grid.selection.selectedCount = selectedCount - 1;
                                };
                            };
                        });

                        var selectedRows = gridApi.selection.getSelectedRows();
                        myAccountController.networkTableRowsSelected = selectedRows.length;

                        changeNetworkBulkActionsButtonsLabels();

                        enableOrDisableEditAndExportBulkButtons();
                        enableOrDisableEditPropertiesBulkButton();
                        enableOrDisableManageAccessBulkButton();
                    });
                }
            };

            $scope.tasksAndRequestsGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                // the default value value of columnVirtualizationThreshold is 10; we need to set it to 20 because
                // otherwise it will not show all columns if we display more than 10 columns in our table
                columnVirtualizationThreshold: 20,
                enableColumnMenus: false,
                enableRowHeaderSelection: true,

                onRegisterApi: function( gridApi )
                {
                    $scope.taskGridApi = gridApi;

                    gridApi.core.on.rowsRendered($scope, function() {
                        // we need to call core.handleWindowResize() to fix the table layout in case it is distorted
                        $scope.taskGridApi.core.handleWindowResize();
                        $scope.refreshTasksButtonDisabled = false;
                    });

                    gridApi.selection.on.rowSelectionChanged($scope,function(row){
                        var selectedRows = gridApi.selection.getSelectedRows();
                        myAccountController.taskTableRowsSelected = selectedRows.length;
                    });

                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                        myAccountController.taskTableRowsSelected = selectedRows.length;
                    });
                }
            };

            myAccountController.tasksAndRequestsGridOptions = $scope.tasksAndRequestsGridOptions;

            $scope.showNetworkTable = function() {
                return myAccountController.networkSearchResults.length > 0
                    || myAccountController.networkSets.length > 0;
            };

            $scope.showTasksAndRequestsTable = function() {
                var retValue =
                        myAccountController.pendingRequests.length > 0
                    || myAccountController.sentRequests.length > 0
                    || myAccountController.tasks.length > 0;
                return retValue;
            };

            var changeNetworkBulkActionsButtonsLabels = function() {
                if (myAccountController.networkTableRowsSelected > 1) {
                    myAccountController.editProfilesLabel   = "Edit Profiles";
                    myAccountController.exportNetworksLabel = "Export Networks";
                    myAccountController.deleteNetworksLabel = "Delete Networks";
                } else {
                    myAccountController.editProfilesLabel   = "Edit Profile";
                    myAccountController.exportNetworksLabel = "Export Network";
                    myAccountController.deleteNetworksLabel = "Delete Network";
                };
            };

            var defineNetworkTable = function()
            {
                var columnDefs = [
                    { field: '  ', enableFiltering: false, maxWidth: 42, cellTemplate: 'pages/gridTemplates/networkStatusOnMyAccountPage.html'},
                    { field: 'Network Name', enableFiltering: true, cellTemplate: 'pages/gridTemplates/networkName.html' },
                    { field: ' ', enableFiltering: false, width:40, cellTemplate: 'pages/gridTemplates/downloadNetwork.html' },

                    { field: 'Format', enableFiltering: true, maxWidth:77,
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

                    { field: 'Ref.', enableFiltering: false, maxWidth: 45, cellTemplate: 'pages/gridTemplates/reference.html' },
                    { field: 'Disease', enableFiltering: true, width: 68, cellTemplate: 'pages/gridTemplates/disease.html'},
                    { field: 'Tissue',  enableFiltering: true, maxWidth: 65, cellTemplate: 'pages/gridTemplates/tissue.html'},
                    //{ field: 'Nodes', enableFiltering: false, maxWidth:70 },
                    { field: 'Edges', enableFiltering: false, maxWidth:70 },
                    { field: 'Visibility', enableFiltering: true, maxWidth:70, cellClass: 'grid-align-cell' },
                    { field: 'Owner', enableFiltering: true, width:80, cellTemplate: 'pages/gridTemplates/ownedBy.html' },
                    { field: 'Last Modified', enableFiltering: false, maxWidth:120,
                        cellFilter: "date:'short'",  sort: {direction: 'desc', priority: 5}
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
            };

            var defineTasksAndNotificationsTable = function()
            {
                var columnDefs = [
                    { field: '  ',   enableFiltering: true, width: 52, sort: {direction: 'desc', priority: 5},
                        cellTemplate: 'pages/gridTemplates/taskOrRequestNew.html' },  // , new, etc. cellTemplate: 'pages/gridTemplates/taskStatusOnTasksPage.html'
                    { field: 'Status', enableFiltering: true, maxWidth: 80, cellTemplate: 'pages/gridTemplates/taskOrRequestStatus.html' },
                    { field: 'Type', enableFiltering: true,   width: 150, cellTemplate: 'pages/gridTemplates/taskOrRequestType.html' },  // task, sent notif., received notific.
                    { field: 'Description', enableFiltering: true, cellTemplate: 'pages/gridTemplates/taskOrRequestDescription.html'},
                    { field: 'Created', enableFiltering: false, maxWidth: 120,
                        cellFilter: "date:'short'",  sort: {direction: 'desc', priority: 5}
                    },
                    //{ field: 'Last Accessed', enableFiltering: false, cellFilter: "date:'short'", visible: false },
                    { field: 'Delete',  enableFiltering: false, maxWidth: 60, cellTemplate: 'pages/gridTemplates/deleteTask.html' },

                    { field: 'taskId',      enableFiltering: false,  visible: false},
                    { field: 'ownerUUID',   enableFiltering: false,  visible: false},
                    { field: 'typeFromServer',  enableFiltering: false,  visible: false},
                    { field: 'newTask',      enableFiltering: false,  visible: false},
                    { field: 'newSent',      enableFiltering: false,  visible: false},
                    { field: 'newReceived',  enableFiltering: false,  visible: false},
                    { field: 'whatType',     enableFiltering: false,  visible: false}
                ];
                $scope.taskGridApi.grid.options.columnDefs = columnDefs;
            };


            $scope.getExportedNetworkDownloadLink = function(taskId) {
                return ndexService.getNdexServerUri() + "/task/" + taskId + "/file?download=true";
            };

            $scope.getCredentialsForExportedNetworkDownload = function() {
                document.getElementById("exportedNetworkDownoadLinkId").username = ndexUtility.getUserCredentials()['userName'];
                document.getElementById("exportedNetworkDownoadLinkId").password = ndexUtility.getUserCredentials()['token'];
            };

            $scope.markAsRead = function(entity) {

                // we only update sent requests; can't update received requests since logged int user doesn't own them

                if ((entity.whatType == 'sent') && (entity.newSent) &&
                    (entity.Status != 'accepted') && (entity.Status != 'declined')) {
                    return;
                };

                // we only update sent requests; can't update received requests since logged int user doesn't own them
                var isItNewTaskOrRequest = (entity.newTask || entity.newSent);

                if (isItNewTaskOrRequest) {

                    if (entity.whatType == "task") {
                        var properties = {"newTask" : false};
                        ndexService.updateTaskPropertiesV2(entity.taskId, properties,
                            function (data) {
                                entity.newTask = false;

                                if (myAccountController.numberOfNewTasksAndRequests > 0) {
                                    myAccountController.numberOfNewTasksAndRequests--;
                                };

                                var request =
                                    _.find(myAccountController.tasksAndRequestsGridOptions.data,
                                        {'taskId': entity.taskId});

                            },
                            function (error) {
                                console.log("unable to update task");
                            }
                        );
                    } else if (entity.whatType == "sent") {

                        //properties = (entity.whatType == "received") ? {"newReceived" : false} : {"newSent" : false};
                        properties = {"newSent" : false};

                        // entity.taskId below is in fact request Id
                        ndexService.updateRequestPropertiesV2(entity.taskId, properties,
                            function (data) {
                                entity.newSent = false;

                                if (myAccountController.numberOfNewTasksAndRequests > 0) {
                                    myAccountController.numberOfNewTasksAndRequests--;
                                };
                            },
                            function (error) {
                                console.log("unable to update request");
                            }
                        );
                    }
                };
            };

            $scope.showSetInfo = function(setId) {
                var networkSet = _.find(myAccountController.networkSets, {externalId:setId});

                // make a copy of network summary object since we are going to modify it
                var set = JSON.parse(JSON.stringify(networkSet));

                uiMisc.showSetInfo(set);
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
            
            var enableOrDisableEditAndExportBulkButtons = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableEditAndExportBulkButtons = true;

                var statesForWhichToDisable = ["failed", "processing", "collection"];

                _.forEach (selectedNetworksRows, function(row) {

                    var status = row.Status;

                    var disableEditAndExportBulkButtons =
                        (status && statesForWhichToDisable.indexOf(status.toLowerCase()) > -1);

                    if (disableEditAndExportBulkButtons) {
                        $scope.enableEditAndExportBulkButtons = false;
                        return;
                    };
                });
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
                    /*
                    if ((myAccountController.networksWithAdminAccess.indexOf(networkUUUID) == -1) &&
                        (myAccountController.networksWithWriteAccess.indexOf(networkUUUID) == -1) ) {
                        return;
                    };
                    */
                };

                $scope.enableEditPropertiesBulkButton = true;
            };

            var enableOrDisableManageAccessBulkButton = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableShareBulkButton = false;

                for (var i = 0; i < selectedNetworksRows.length; i++) {

                    var ownerUUID = selectedNetworksRows[i].ownerUUID;
                    var status = selectedNetworksRows[i].Status;

                    var network_in_invalid_state =
                        (status && ["failed", "processing"].indexOf(status.toLowerCase()) > -1);

                    if (ownerUUID != myAccountController.loggedInIdentifier || network_in_invalid_state) {
                        return;
                    };
                };

                $scope.enableShareBulkButton = true;
            };
            
            var populateNetworkTable = function()
            {
                $scope.networkGridOptions.data = [];

                _.forEach(myAccountController.networkSets, function(networkSet) {
                    myAccountController.addNetworkSetToTable(networkSet);
                });

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

                    var networks = 0;
                    var isReadOnly = network['isReadOnly'] ? network['isReadOnly'] : false;

                    /*
                    if (networkStatus == "collection") {
                        format = "Collection";
                    };
                    */

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
                        "subnetworks"   :   noOfSubNetworks,
                        "networks"      :   networks,
                        "isReadOnly"    :   isReadOnly
                    };
                    $scope.networkGridOptions.data.push(row);
                };
            };



            var populateTasksAndNotificationsTable = function()
            {
                $scope.tasksAndRequestsGridOptions.data = [];

                var newTasksAndNotifications = 0;

                _.forEach(myAccountController.tasks, function(task)
                {
                    var taskType         = task.taskType.toLowerCase();
                    var taskCreationTime = task.creationTime;
                    var taskDescription  = task.description;
                    var taskUUID         = task.externalId;
                    var taskOwnerUUID    = task.taskOwnerId;
                    var taskStatus       = task.status.toLowerCase();

                    if (taskType && taskType.toUpperCase() == 'EXPORT_NETWORK_TO_FILE' && task.attributes) {
                        var taskDownloadFileExtension = task.attributes.downloadFileExtension;
                        var taskDownloadFileName      = task.attributes.downloadFileName;
                        var taskAtributeName          = task.attributes.name;

                        if (taskStatus == 'processing') {
                            taskDescription = 'Exporting ' + taskDownloadFileName + '...';
                        } else if (taskStatus == 'completed') {
                            taskDescription = 'Download ' + taskDownloadFileName;
                        }
                    };

                    if (taskType == 'export_network_to_file') {
                        taskType = 'export network to file';
                    };

                    var newTask =
                        (task.ownerProperties
                            && (typeof task.ownerProperties.newTask !== 'undefined')) ? task.ownerProperties.newTask : true;

                    if (newTask && (taskStatus == 'failed' || taskStatus == 'completed')) {
                        var newLabel = "New";
                        newTasksAndNotifications++;
                    } else {
                        newLabel = " ";
                    };

                    var newSent     = undefined;
                    var newReceived = undefined;

                    var row = {
                        "  "             : newLabel,
                        "Status"         : taskStatus,
                        "Type"           : taskType,
                        "Description"    : taskDescription,
                        "Created"        : taskCreationTime,
                        "Delete"         : "delete",
                        "taskId"         : taskUUID,
                        "ownerUUID"      : taskOwnerUUID,
                        "typeFromServer" : task.taskType.toLowerCase(),
                        "newTask"        : newTask,
                        "newSent"        : newSent,
                        "newReceived"    : newReceived,
                        "whatType"       : "task"
                    };
                    $scope.tasksAndRequestsGridOptions.data.push(row);
                });

                _.forEach(myAccountController.pendingRequests, function(pendingRequest)  {

                    var requestType = "unknown";
                    if (pendingRequest.requestType) {
                        if (pendingRequest.requestType.toLowerCase() == "usernetworkaccess") {
                            requestType = "user network access";
                        } else if (pendingRequest.requestType.toLowerCase() == "groupnetworkaccess") {
                            requestType = "group network access";
                        } else if (pendingRequest.requestType.toLowerCase() == "joingroup") {
                            requestType = "received join group";
                        };
                    }

                    var requestCreationTime    = pendingRequest.creationTime;

                    var requestDescription = pendingRequest.sourceName + " requests " +
                        _.startCase(pendingRequest.permission.toLowerCase()) + " access to " + pendingRequest.destinationName;

                    var requestUUID      = pendingRequest.externalId;
                    var requestOwnerUUID = pendingRequest.requesterId;
                    var requestStatus    = pendingRequest.response.toLowerCase();

                    var newRequest =
                        (pendingRequest.properties && (typeof pendingRequest.properties.newReceived !== 'undefined'))
                            ? pendingRequest.properties.newReceived : true;

                    if (newRequest) {
                        var newLabel = "New";
                        newTasksAndNotifications++;
                    } else {
                        newLabel = " ";
                    };

                    var typeFromServer = pendingRequest.requestType.toLowerCase();

                    var newTask = undefined;
                    var newSent = undefined;

                    var row = {
                        "  "             : newLabel,
                        "Status"         : requestStatus,
                        "Type"           : requestType,
                        "Description"    : requestDescription,
                        "Created"        : requestCreationTime,
                        "Delete"         : "delete",
                        "taskId"         : requestUUID,
                        "ownerUUID"      : requestOwnerUUID,
                        "typeFromServer" : typeFromServer,
                        "newTask"        : newTask,
                        "newSent"        : newSent,
                        "newReceived"    : newRequest,
                        "whatType"       : "received"
                    };
                    $scope.tasksAndRequestsGridOptions.data.push(row);

                });

                _.forEach(myAccountController.sentRequests, function(sentRequest) {

                    var requestType = "unknown";
                    if (sentRequest.requestType) {
                        if (sentRequest.requestType.toLowerCase() == "usernetworkaccess") {
                            requestType = "user network access";
                        } else if (sentRequest.requestType.toLowerCase() == "groupnetworkaccess") {
                            requestType = "group network access";
                        } else if (sentRequest.requestType.toLowerCase() == "joingroup") {
                            requestType = "sent join group";
                        };
                    };

                    var requestCreationTime    = sentRequest.creationTime;

                    var requestDescription = sentRequest.sourceName + " requests " +
                        _.startCase(sentRequest.permission.toLowerCase()) + " access to " + sentRequest.destinationName;

                    var requestUUID       = sentRequest.externalId;
                    var requestOwnerUUID  = sentRequest.requesterId;
                    var requestStatus     = sentRequest.response.toLowerCase();

                    var newRequest =
                        (sentRequest.properties && (typeof sentRequest.properties.newSent !== 'undefined'))
                            ? sentRequest.properties.newSent : true;

                    if (newRequest && (requestStatus == 'accepted' || requestStatus == 'declined')) {
                        var newLabel = "New";
                        newTasksAndNotifications++;
                    } else {
                        newLabel = " ";
                    };


                    var typeFromServer = sentRequest.requestType.toLowerCase();

                    var newTask     = undefined;
                    var newReceived = undefined;

                    var row = {
                        "  "             : newLabel,
                        "Status"         : requestStatus,
                        "Type"           : requestType,
                        "Description"    : requestDescription,
                        "Created"        : requestCreationTime,
                        "Delete"         : "delete",
                        "taskId"         : requestUUID,
                        "ownerUUID"      : requestOwnerUUID,
                        "typeFromServer" : typeFromServer,
                        "newTask"        : newTask,
                        "newSent"        : newRequest,
                        "newReceived"    : newReceived,
                        "whatType"       : "sent"
                    };
                    $scope.tasksAndRequestsGridOptions.data.push(row);
                });

                myAccountController.numberOfNewTasksAndRequests = newTasksAndNotifications;
            };

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

            myAccountController.getNetworkDownloadName = function(taskId)
            {
                var task = _.find(myAccountController.tasks, {'externalId': taskId});

                if (!task || typeof task.attributes === 'undefined') {
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

            myAccountController.checkAndDeleteSelectedNetworks = function() {
                var checkWritePrivilege = false;
                var networksDeleteable =
                    myAccountController.checkIfSelectedNetworksCanBeDeletedOrChanged(checkWritePrivilege);

                if (networksDeleteable) {
                    myAccountController.confirmDeleteSelectedNetworks(
                        function() {
                            // all selected networks have been deleted ...
                            // update available storage indication

                            ndexService.getUserByUUIDV2(myAccountController.identifier)
                                .success(
                                    function (user) {
                                        $scope.diskSpaceInfo = uiMisc.showAvailableDiskSpace(user);
                                    });
                        },
                        function() {
                            ; // canceled, nothing to do here
                        }
                    );
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

            myAccountController.confirmDeleteSelectedNetworks = function(deletedHandler, canceledHandler)
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
                            canceledHandler();
                        };

                        $scope.confirm = function() {
                            $scope.isProcessing = true;
                            myAccountController.deleteSelectedNetworks($scope, $modalInstance, deletedHandler);
                            //$modalInstance.dismiss();
                            $scope.isProcessing = false;
                        };
                    }
                });
            };

            /*
            myAccountController.confirmDeleteSelectedSets = function()
            {
                var   modalInstance = $modal.open({
                    templateUrl: 'confirmation-modal.html',
                    scope: $scope,

                    controller: function($scope, $modalInstance) {

                        if (myAccountController.collectionTableRowsSelected > 1) {
                            $scope.title = 'Delete Selected Sets';
                            $scope.message =
                                'The selected ' + myAccountController.collectionTableRowsSelected +
                                ' sets will be deleted from NDEx. Are you sure you want to proceed?';
                        } else {
                            $scope.title = 'Delete Selected Set';
                            $scope.message =
                                'The selected set will be deleted from NDEx. Are you sure you want to proceed?';
                        };

                        $scope.cancel = function() {
                            $modalInstance.dismiss();
                            $scope.isProcessing = false;
                        };

                        $scope.confirm = function() {
                            $scope.isProcessing = true;
                            myAccountController.deleteSelectedSets();
                            $modalInstance.dismiss();
                            $scope.isProcessing = false;
                        };
                    }
                });
            };
            */

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

                _.forEach(selectedNetworksRows, function(row) {
                    if (row.Format.toLowerCase() != "set") {
                        selectedIds.push(row['externalId']);
                    };
                });

                return selectedIds;
            };

            myAccountController.getVisibilityAndShowcaseOfSelectedNetworks = function ()
            {
                var visibilityAndShowcase = {};
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                _.forEach(selectedNetworksRows, function(row) {
                    if (row.Format.toLowerCase() != "set") {

                        visibilityAndShowcase[row['externalId']] =
                            {
                                'visibility':  row['Visibility'] ? row['Visibility'] : 'PRIVATE',
                                'showCase':    row['Show'] ? row['Show'] : false,
                                'networkName': row['name']
                            };
                    };
                });

                return visibilityAndShowcase;
            };

            myAccountController.getReadOnlyOfSelectedNetworks = function ()
            {
                var readOnly = {};
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                _.forEach(selectedNetworksRows, function(row) {
                    if (row.Format.toLowerCase() != "set") {

                        readOnly[row['externalId']] =
                            {
                                'isReadOnly':  row['isReadOnly'] ? row['isReadOnly'] : false,
                                'networkName': row['name']
                            };
                    };
                });

                return readOnly;
            };

            myAccountController.updateVisibilityOfNetworks = function (networkUUIDs, networkVisibility)
            {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                // change 'Visibility' in the Network Table
                _.forEach(selectedNetworksRows, function(row) {
                    if (row['externalId'] in networkUUIDs) {
                        row['Visibility'] = networkVisibility;
                    };
                });

                // change 'visibility' in the Network Search list
                _.forEach(myAccountController.networkSearchResults, function(row) {
                    if (row['externalId'] in networkUUIDs) {
                        row['visibility'] = networkVisibility;
                    };
                });
            };

            myAccountController.updateShowcaseOfNetworks = function (networkUUIDs, showCase)
            {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                _.forEach(selectedNetworksRows, function(row) {
                    if (row['externalId'] in networkUUIDs) {
                        row['Show'] = showCase;
                    };
                });

                _.forEach(myAccountController.networkSearchResults, function(row) {
                    if (row['externalId'] in networkUUIDs) {
                        row['isShowcase'] = showCase;
                    };
                }
                );
            };
            myAccountController.updateReadOnlyOfNetworks = function (networkUUIDs, readOnly)
            {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                _.forEach(selectedNetworksRows, function(row) {
                    if (row['externalId'] in networkUUIDs) {
                        row['isReadOnly'] = readOnly;
                    };
                });

                _.forEach(myAccountController.networkSearchResults, function(row) {
                    if (row['externalId'] in networkUUIDs) {
                        row['isReadOnly'] = readOnly;
                    };
                });
            };


            myAccountController.updateDescriptionOfNetworks = function (networkUUIDs, newDescription)
            {
                var description = (newDescription) ? $scope.stripHTML(newDescription) : newDescription;

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                // change Network Summaries in Network table
                _.forEach(selectedNetworksRows, function(row) {
                    var networkId = row.externalId;

                    if (networkId in networkUUIDs) {
                        row['description'] = description;
                    };
                });


                // change Network Summary in Network Search list
                _.forEach(myAccountController.networkSearchResults, function (row) {

                    var networkId = row.externalId;

                    if (networkId in networkUUIDs) {
                        row['description'] = description;
                    };

                });

                return;
            };

            myAccountController.updateReferenceOfNetworks = function (networkUUIDs, newReference)
            {
                //var reference = (newReference) ? $scope.stripHTML(newDescription) : newDescription;

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                var mySearch = myAccountController.networkSearchResults;

                // change Network References in Network table
                _.forEach(selectedNetworksRows, function(row) {
                    var networkId = row.externalId;

                    if (networkId in networkUUIDs) {
                        row['Reference'] = newReference;
                    };
                });


                // change Network Summary in Network Search list
                /*
                _.forEach(myAccountController.networkSearchResults, function (row) {

                    var networkId = row.externalId;

                    if (networkId in networkUUIDs) {
                        row['reference'] = description;
                    };

                });
                */

                return;
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
            myAccountController.checkAdminPrivilegeOnSelectedNetworks = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                var retValue = true;

                // iterate through the list of selected networks and check if user has ADMIN access to all of them
                _.forEach(selectedNetworksRows, function(row) {
                    var networkUUID = row.externalId;

                    // check if you have admin privilege for this network
                    if (myAccountController.networksWithAdminAccess.indexOf(networkUUID) == -1) {
                        retValue = false;
                        return;
                    };
                });

                return retValue;
            };


            var removeDeletedNetworksFromSearchAndNetworksTable = function($scope, networkIds) {
                var externalId = null;

                for (var i = $scope.networkGridOptions.data.length - 1; i >= 0; i--)
                {
                    externalId = $scope.networkGridOptions.data[i].externalId;
                    if (externalId in networkIds) {
                        $scope.networkGridOptions.data.splice(i, 1);
                    };
                };

                $scope.networkGridApi.selection.clearSelectedRows();
                myAccountController.networkTableRowsSelected = 0;

                // remove the networks from the search result
                for (var i = myAccountController.networkSearchResults.length - 1; i >= 0; i--)
                {
                    externalId = myAccountController.networkSearchResults[i].externalId;
                    if (externalId in networkIds) {
                        myAccountController.networkSearchResults.splice(i, 1);
                    };
                };
            };

            myAccountController.deleteSelectedNetworks = function ($scope, $modalInstance, deletedHandler)
            {
                var selectedIds = [];
                var successfullyDeletedNetworkIDs = {};

                var deletedNetworksCounter = 0;
                var selectedNetworkCount = $scope.networkGridApi.selection.getSelectedRows().length;

                $scope.progress  = "Deleted: " + deletedNetworksCounter + " of " + selectedNetworkCount + " selected networks";

                _.forEach($scope.networkGridApi.selection.getSelectedRows(), function(row) {

                    if (row.Status && row.Status.toLowerCase() == 'set') {
                        // this should never happen since we do not allow selecting sets,
                        // but just in case ...
                        deletedNetworksCounter = deletedNetworksCounter + 1;
                        return;
                    };

                    var networkId   = row.externalId;
                    var networkName = row.name;

                    ndexService.deleteNetworkV2(networkId,
                        function (data)
                        {
                            deletedNetworksCounter = deletedNetworksCounter + 1;
                            successfullyDeletedNetworkIDs[networkId] = "";

                            $scope.progress  = "Deleted: " + deletedNetworksCounter + " of " + selectedNetworkCount + " selected networks";
                            $scope.progress2 = "Deleted: " + networkName;

                            if (deletedNetworksCounter == selectedNetworkCount) {

                                removeDeletedNetworksFromSearchAndNetworksTable($scope, successfullyDeletedNetworkIDs);

                                setTimeout(function() {
                                    delete $scope.progress;
                                    delete $scope.progress2;
                                    delete $scope.errors;
                                    $scope.isProcessing = false;
                                    $modalInstance.dismiss();
                                }, 1000);

                                deletedHandler();
                            };
                        },
                        function (error)
                        {
                            deletedNetworksCounter = deletedNetworksCounter + 1;

                            $scope.error = "Unable to delete network " + networkName;

                            if (deletedNetworksCounter == selectedNetworkCount) {

                                removeDeletedNetworksFromSearchAndNetworksTable($scope, successfullyDeletedNetworkIDs);

                                setTimeout(function() {
                                    delete $scope.progress;
                                    delete $scope.progress2;
                                    delete $scope.errors;
                                    $scope.isProcessing = false;
                                    $modalInstance.dismiss();
                                }, 1000);

                                deletedHandler();
                            };
                        });
                });
            };

            /*
            myAccountController.deleteSelectedSets = function ()
            {
                var selectedCollectionsRows = $scope.collectionGridApi.selection.getSelectedRows();
                var selectedIds = [];

                _.forEach(selectedCollectionsRows, function(row) {

                    var collectionUUID = row.externalId;

                    selectedIds.push(collectionUUID);

                    ndexService.deleteNetworkSetV2(collectionUUID,

                        function (data)
                        {
                            //console.log("success");
                        },
                        function (error)
                        {
                            console.log("unable to delete network set");
                        });
                });

                // after we deleted all selected collections, the footer of the table may
                // still show that some networks are selected (must be a bug), so
                // we manually set the selected count to 0 (see defect NDEX-582)
                $scope.collectionGridApi.grid.selection.selectedCount = 0;

                for (var i = myAccountController.networkSets.length - 1; i >= 0; i--) {
                    var collectionUUID = myAccountController.networkSets[i].externalId;
                    if (selectedIds.indexOf(collectionUUID) != -1) {
                        myAccountController.networkSets.splice(i, 1);
                    };
                };
                refreshCollectionsTable();
                myAccountController.collectionTableRowsSelected = 0;
            };
            */


            //              scope functions

            // change to use directive. setting of current network should occur controller initialization
            myAccountController.setAndDisplayCurrentNetwork = function (identifier)
            {
                $location.path("/network/" + identifier);
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
                                };
                            };
                        };
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
                        function (error, status, headers, config, statusText) {
                            console.log("unable to get user group memberships");
                        });
            };

            myAccountController.getAllNetworkSetsOwnedByUser = function (successHandler, errorHandler)
            {
                var offset = undefined;
                var limit  = undefined;

                ndexService.getAllNetworkSetsOwnedByUserV2(myAccountController.identifier, offset, limit,
                    
                    function (networkSets) {
                        myAccountController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);
                        successHandler(myAccountController.networkSets[0]);
                    },
                    function (error, status) {
                        console.log("unable to get network sets");
                        errorHandler(error, status);
                    });
            };

            myAccountController.addNetworkSetToTable = function(networkSet) {
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
                var setOwner = sharedProperties.getCurrentUserAccountName();

                var setModified = new Date(networkSet['modificationTime']);

                var setShowcased = networkSet['showcased'];

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

            $scope.getLoggedInUserUUID = function() {
                return myAccountController.loggedInIdentifier;
            };

            $scope.deleteTask = function (entity)
            {
               if (entity.typeFromServer == "export_network_to_file") {

                   if (entity.ownerUUID != myAccountController.loggedInIdentifier) {
                       alert("You cannot delete this task since you are not the owner.");
                       return;
                   };

                   var taskUUID = entity.taskId;

                   myAccountController.deleteTask(taskUUID,
                       function (data) {
                           // remove task from the table and task list
                           _.remove($scope.tasksAndRequestsGridOptions.data, {taskId: taskUUID});
                           _.remove(myAccountController.tasks, {externalId: taskUUID});
                           if (entity.newTask && myAccountController.numberOfNewTasksAndRequests > 0) {
                               myAccountController.numberOfNewTasksAndRequests--;
                           };
                       },
                       function (error) {
                           console.log("unable to delete task");
                       }
                   )
               } else if (entity.typeFromServer == "usernetworkaccess"
                       || entity.typeFromServer == "groupnetworkaccess") {

                   if (entity.ownerUUID != myAccountController.loggedInIdentifier) {
                       alert("You cannot delete this request since you are not the owner.");
                       return;
                   };

                   var request = {"requesterId": entity.ownerUUID, "externalId":  entity.taskId};

                   ndexService.deletePermissionRequestV2(request,
                       function(data) {
                           // remove task from the table and task list
                           _.remove($scope.tasksAndRequestsGridOptions.data, {taskId: entity.taskId});
                           _.remove(myAccountController.sentRequests,   { externalId: entity.taskId});
                           if ((entity.newSent || entity.newReceived) && myAccountController.numberOfNewTasksAndRequests > 0) {
                               myAccountController.numberOfNewTasksAndRequests--;
                           };
                       },
                       function(error){
                           console.log("unable to delete request");
                       });
               }
               else if (entity.typeFromServer == "joingroup") {
                   if (entity.ownerUUID != myAccountController.loggedInIdentifier) {
                       alert("You cannot delete this request since you are not the owner.");
                       return;
                   };

                   var request = {"requesterId": entity.ownerUUID, "externalId": entity.taskId};

                   ndexService.deleteMembershipRequestV2(request,
                       function(data) {
                           // remove task from the table and task list
                           _.remove($scope.tasksAndRequestsGridOptions.data, {taskId: entity.taskId});
                           _.remove(myAccountController.sentRequests,    {externalId: entity.taskId});
                           if ((entity.newSent || entity.newReceived) && myAccountController.numberOfNewTasksAndRequests > 0) {
                               myAccountController.numberOfNewTasksAndRequests--;
                           };
                       },
                       function(error){
                           console.log("unable to delete request");
                       });
               };
            };

            myAccountController.deleteTask = function (taskUUID, successHandler, errorHandler)
            {
                ndexService.deleteTaskV2(taskUUID,
                    function (data)
                    {
                        successHandler(data);
                    },
                    function (error)
                    {
                        console.log("unable to delete task");
                        errorHandler();
                    }
                )
            };

            myAccountController.getTasks = function (successHandler, errorHandler)
            {
                ndexService.getUserTasksV2(
                    "ALL",
                    0,
                    100,
                    // Success
                    function (tasks)
                    {
                        myAccountController.tasks = tasks;

                        if (successHandler) {
                            successHandler();
                        };
                    },
                    function (error)
                    {
                        console.log("unable to get user's tasks");
                        if (errorHandler) {
                            errorHandler();
                        };
                    }
                )
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
                    if (requests[i].requestType && (requests[i].requestType.toLowerCase() != "usernetworkaccess")) {
                        continue;
                    };

                    var requesterId = requests[i].requesterId;

                    for (var j = 0; j < users.length; j++) {
                        if (requesterId == users[j].externalId) {
                            requests[i].sourceName = users[j].firstName + " " + users[j].lastName;
                            continue;
                        }
                    }
                }
            };

            myAccountController.getSentRequests = function (successHandler, errorHandler) {
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
                                            };
                                            successHandler();
                                        },
                                        function (error)
                                        {
                                            console.log("unable to get sent requests");
                                            errorHandler();
                                        });
                                })
                            .error(
                                function(error) {
                                    console.log("unable to get users by UUIDs");
                                    errorHandler();
                                }
                            )
                    },
                    function (error)
                    {
                        console.log("unable to get sent requests");
                        errorHandler();
                    });
            };

            myAccountController.getReceivedRequests = function (successHandler, errorHandler) {
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
                                            };
                                            successHandler();
                                        },
                                        function (error)
                                        {
                                            console.log("unable to get pending requests");
                                            errorHandler();
                                        });
                                })
                            .error(
                                function(error) {
                                    console.log("unable to get users by UUIDs");
                                    errorHandler();
                                });
                    },
                    function (error)
                    {
                        console.log("unable to get pending requests");
                        errorHandler();
                    });
            };

            myAccountController.getUserAccountPageNetworks = function (successHandler, errorHandler)
            {
                var noOfNetworkSetsOnPage = myAccountController.networkSets.length;

                if (noOfNetworkSetsOnPage >= paginationOptions.pageSize) {
                    successHandler();
                };

                if ((noOfNetworkSetsOnPage > 0) && (noOfNetworkSetsOnPage < paginationOptions.pageSize)) {
                    var offset = 0;
                    var limit = paginationOptions.pageSize - noOfNetworkSetsOnPage;
                }
                else if ((noOfNetworkSetsOnPage == 0) && (paginationOptions.networkSetCount == 0)) {
                    offset = (paginationOptions.pageNumber - 1) * paginationOptions.pageSize;
                    limit  = paginationOptions.pageSize;

                } else if ((noOfNetworkSetsOnPage == 0) && (paginationOptions.networkSetCount > 0)) {
                    offset = (paginationOptions.pageNumber - 1) * paginationOptions.pageSize - paginationOptions.networkSetCount;
                    limit  = paginationOptions.pageSize;
                };

                ndexService.getUserAccountPageNetworksV2(myAccountController.identifier, offset, limit,
                    function(networkSummaries) {

                        myAccountController.networkSearchResults = networkSummaries;

                        var networkUUIDs = _.map(networkSummaries, 'externalId');

                        ndexService.getNetworkPermissionsByUUIDsV2(networkUUIDs,
                            function(networkPermissionsMap) {

                                // build list of networks with ADMIN and WRITE permissions
                                var invertedMapsPermissions = _.invertBy(networkPermissionsMap);

                                var networksWithAdminPermissions = invertedMapsPermissions['ADMIN'];
                                var networksWithWritePermissions = invertedMapsPermissions['WRITE'];

                                myAccountController.networksWithAdminAccess =
                                    networksWithAdminPermissions ? networksWithAdminPermissions : [];

                                myAccountController.networksWithWriteAccess =
                                    networksWithWritePermissions ? networksWithWritePermissions : [];


                                // loop through the network summaries and find what networks have multiple subnetworks
                                _.forEach(myAccountController.networkSearchResults, function (networkSummaryObj) {

                                    var noOfSubNetworks = uiMisc.getNoOfSubNetworks(networkSummaryObj);

                                    if (noOfSubNetworks > 1) {
                                        myAccountController.networksWithMultipleSubNetworks[networkSummaryObj.externalId] = noOfSubNetworks;
                                    };
                                });

                                successHandler();
                            },
                            function(error) {
                                console.log("unable to get user network permissions for the logged in user");
                                errorHandler();
                            });
                    },
                    function(error) {
                       console.log("unable to get user account page networks");
                       errorHandler();
                    });
            };


            myAccountController.getUserNetworksAndPopulateTable = function (successHandler, errorHandler)
            {
                // get networks
                myAccountController.getUserAccountPageNetworks(
                    function () {

                        if (!networkTableDefined) {
                            networkTableDefined = true;
                            defineNetworkTable();
                        };

                        populateNetworkTable();

                        $scope.selectedRowsNetworkExternalIds = {};

                        if (myAccountController.networkTableRowsSelected > 0) {

                            var selectedRows = $scope.networkGridApi.selection.getSelectedRows();

                            _.forEach(selectedRows, function (row) {
                                $scope.selectedRowsNetworkExternalIds[row.externalId] = '';
                            });
                        };

                        if (successHandler) {
                            successHandler();
                        };
                    },
                    function () {
                        if (errorHandler) {
                            errorHandler();
                        };
                    });
            };


            $scope.showWarningsOrErrors = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                }

                if (rowEntity.subnetworks > 1) {
                    var title = "Warning";
                    var message = "This network is part of a Cytoscape collection with " +
                        rowEntity.subnetworks + " subnetworks and cannot be edited in NDEx."
                    ndexNavigation.genericInfoModal(title, message);
                } else {
                    uiMisc.showNetworkWarningsOrErrors(rowEntity, myAccountController.networkSearchResults);
                };  
            };

            $scope.switchShowcase = function(row) {
                if (row && row.entity) {

                    var show = !row.entity.Show;

                    //row.entity.Show = !row.entity.Show;

                    if (row.entity.Status == 'Set') {

                        var setToShowcase = _.find(myAccountController.networkSets, {'externalId': row.entity.externalId});

                        if (show) {
                            var networksIds = (setToShowcase.networks) ? setToShowcase.networks : [];
                            var privateNetworksCount = 0;

                            _.forEach(myAccountController.networkSearchResults, function (network) {
                                if (_.includes(networksIds, network.externalId)) {
                                    if (network.visibility.toUpperCase() == "PRIVATE") {
                                        privateNetworksCount = privateNetworksCount + 1;
                                    };
                                };
                            });

                            if (privateNetworksCount > 0) {

                                if (privateNetworksCount == 1) {
                                    var message = privateNetworksCount + "  network in this Set is private " +
                                        " and will not be visible to other users. <br><br>";
                                } else {
                                    var message = privateNetworksCount + " networks in this Set are private " +
                                        " and will not be visible to other users. <br><br>";
                                };

                                var title = "Activate Showcase function";
                                message = message + "Do you want to proceed and activate the Showcase function?";

                                ndexNavigation.openConfirmationModal(title, message, "Proceed", "Cancel",
                                    function () {
                                        ndexService.updateNetworkSetSystemPropertiesV2(row.entity.externalId, "showcase", show,
                                            function (data, networkId, property, value) {
                                                row.entity.Show = !row.entity.Show; // success
                                                setToShowcase['showcased'] = row.entity.Show;
                                            },
                                            function (error, setId, property, value) {
                                                console.log("unable to update showcase for Network Set with Id " + setId);
                                            });
                                    },
                                    function () {
                                        // User selected Cancel; return
                                        return;
                                    });

                            } else {

                                // turning on showcase for a Set with no private networks
                                ndexService.updateNetworkSetSystemPropertiesV2(row.entity.externalId, "showcase", show,
                                    function (data, networkId, property, value) {
                                        row.entity.Show = !row.entity.Show; // success
                                        setToShowcase['showcased'] = row.entity.Show;
                                    },
                                    function (error, setId, property, value) {
                                        console.log("unable to update showcase for Network Set with Id " + setId);
                                    });
                            }
                        } else {

                            // turning off showcase for a Set
                            ndexService.updateNetworkSetSystemPropertiesV2(row.entity.externalId, "showcase", show,
                                function (data, networkId, property, value) {
                                    row.entity.Show = !row.entity.Show; // success
                                    setToShowcase['showcased'] = row.entity.Show;
                                },
                                function (error, setId, property, value) {
                                    console.log("unable to update showcase for Network Set with Id " + setId);
                                });
                        };

                    } else {

                        // turning on/off showcase for a network
                        ndexService.setNetworkSystemPropertiesV2(row.entity.externalId, "showcase", show,
                            function (data, networkId, property, value) {
                                row.entity.Show = !row.entity.Show; // success
                            },
                            function (error, networkId, property, value) {
                                console.log("unable to update showcase for Network with Id " + networkId);
                            });
                    };
                };
            };

            $scope.getNetworkURL = function(networkUUID) {
                return "#/network/" + networkUUID;
            };

            $scope.getNetworkDownloadLink = function(rowEntity) {
                return uiMisc.getNetworkDownloadLink(myAccountController, rowEntity);
            };

            $scope.isOwnerOfNetwork = function(networkOwnerUUID)
            {
                if (!myAccountController.isLoggedInUser) {
                    return false;
                }
                return (myAccountController.loggedInIdentifier == networkOwnerUUID);
            };

            $scope.failedNetworkWarning = function(rowEntity) {
                var networkName  = rowEntity.name;
                var errorMessage = rowEntity.errorMessage;
                var status       = rowEntity.Status;
                var networkUUID  = rowEntity.externalId;


                var title = "This Network is Invalid";
                var body  =
                    "<strong>Name: </strong>" + networkName + "<br>" +
                    "<strong>Status: </strong>" + status + "<br>" +
                    "<strong>Error Message: </strong>" + errorMessage + "<br><br>" +
                    "<strong>Would you like to permanently DELETE this network?</strong>"
                
                ndexNavigation.openConfirmationModal(title, body, "Delete", "Cancel",
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
                                        populateNetworkTable();
                                        break;
                                    }
                                }
                            },
                            function (error)
                            {
                                console.log("unable to delete network");
                            });

                    },
                    function () {
                        // User selected Cancel; do not do anything here
                    });

                return;
            };


            $scope.updateLastTimeVisitedMyTasksTimestamp = function() {

                myAccountController.displayedUser.properties.lastTimeVisitedMyTasksTab =
                    new Date().getTime();

                    ndexService.updateUserV2(myAccountController.displayedUser,
                        function (userData) {
                            ;
                        },
                        function (error) {
                            ;
                        });
            };


            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

            myAccountController.getNoOfNetworksAndSets = function(successHandler, errorHandler) {
                ndexService.getNumberOfNetworksInUsersAccountPageV2(myAccountController.identifier,
                    function(data) {

                        paginationOptions.networkCount       = data.networkCount;
                        paginationOptions.networkSetCount    = data.networkSetCount;
                        $scope.networkGridOptions.totalItems =
                            paginationOptions.networkCount + paginationOptions.networkSetCount;

                        if(successHandler) {
                            successHandler();
                        };
                    },
                    function(error) {
                        if(errorHandler) {
                            errorHandler();
                        };
                    });
            };

            myAccountController.checkAndRefreshMyNetworksTableAndDiskInfo = function() {

                if ($scope.refreshNetworksButtonDisabled) {
                    // we need this check to safeguard against rapid multiple hits of refresh button,
                    // in which case it may start multiple refresh timers
                    return;
                }

                if ((refreshIntervalInSeconds > 0) && (timerVariable)) {
                    clearInterval(timerVariable);
                };

                myAccountController.getNoOfNetworksAndSets(
                    function() {
                        myAccountController.loadNetworks();
                    },
                    function() {
                        console.log("unable to get No of Networks and Sets for this account");
                    }
                );

                myAccountController.loadNetworks();
            };

            myAccountController.checkAndRefreshMyTaskAndNotification = function() {

                if ($scope.refreshTasksButtonDisabled) {
                    // we need this check to safeguard against rapid multiple hits of refresh button,
                    // in which case it may start multiple refresh timers
                    return;
                }

                if ((refreshIntervalInSeconds > 0) && (timerVariable)) {
                    clearInterval(timerVariable);
                };

                myAccountController.loadTasksAndRequests();
            };

            myAccountController.refreshMyNetworksTableAndDiskInfo = function(successHandler, errorHandler) {

                ndexService.getUserByUUIDV2(myAccountController.identifier)
                    .success(
                        function (user) {
                            myAccountController.displayedUser = user;

                            $scope.diskSpaceInfo = uiMisc.showAvailableDiskSpace(user);

                            cUser = user;

                            if (paginationOptions.networkSetCount > 0) {

                                ndexService.getAllNetworkSetsOwnedByUserV2(myAccountController.identifier,
                                    (paginationOptions.pageNumber - 1) * paginationOptions.pageSize, paginationOptions.pageSize,

                                    function (networkSets) {
                                        myAccountController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);

                                        myAccountController.getUserNetworksAndPopulateTable(successHandler, errorHandler);

                                    },
                                    function (error, status, headers, config, statusText) {
                                        console.log("unable to get network sets");
                                    });

                            } else {
                                //  network set count is 0; no need to call API to call network sets
                                myAccountController.networkSets = [];

                                // get networks
                                myAccountController.getUserNetworksAndPopulateTable(successHandler, errorHandler);
                            };
                        });
            };


            myAccountController.loadNetworksTasksAndRequests = function() {
                myAccountController.loadNetworks();
                myAccountController.loadTasksAndRequests();
            };

            myAccountController.loadNetworks = function() {
                $scope.resetNetworksFlag();

                $scope.refreshNetworksButtonDisabled = true;

                // start spinner if it is not already started
                ndexSpinner.startSpinner(spinnerMyAccountPageId);



                myAccountController.refreshMyNetworksTableAndDiskInfo(
                    function() {
                        networksReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                        $scope.refreshNetworksButtonDisabled = false;
                    },
                    function() {
                        networksReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                        $scope.refreshNetworksButtonDisabled = false;
                    }
                );
            };


            $scope.loadTasksAndRequests = function() {
                // wrapper for calling myAccountController.loadTasksAndRequests from deleteTask.html template
                myAccountController.loadTasksAndRequests();
            };


            myAccountController.loadTasksAndRequests = function() {
                $scope.resetTasksAndRequestsReceivedFlags();

                $scope.refreshTasksButtonDisabled = true;

                // start spinner if it is not already started
                ndexSpinner.startSpinner(spinnerMyAccountPageId);

                //get tasks
                myAccountController.getTasks(
                    function() {
                        $scope.tasksReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    },
                    function() {
                        $scope.tasksReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    }
                );

                // get requests
                myAccountController.getSentRequests(
                    function() {
                        $scope.sentRequestsReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    },
                    function() {
                        $scope.sentRequestsReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    }
                );

                myAccountController.getReceivedRequests(
                    function() {
                        $scope.receivedRequestsReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    },
                    function() {
                        $scope.receivedRequestsReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    }
                );
            };


            var stopSpinnerAndRestartRefreshTimer = function() {
                
                if ($scope.networksTasksAndRequestsReceived()) {
                    ndexSpinner.stopSpinner();
                    $scope.refreshTasksButtonDisabled = false;

                    if (refreshIntervalInSeconds > 0) {
                        if (timerVariable) {
                            clearInterval(timerVariable);
                        };

                        timerVariable = setInterval(myAccountController.loadNetworksTasksAndRequests,
                                refreshIntervalInSeconds * 1000);
                    };
                };
            };


            $scope.$watchGroup(['tasksReceived', 'sentRequestsReceived', 'receivedRequestsReceived'],
                function (newValue, oldValue) {
                    if ($scope.tasksReceived && $scope.sentRequestsReceived && $scope.receivedRequestsReceived) {

                        if (!tasksAndNotificationsTableDefined) {
                            tasksAndNotificationsTableDefined = true;
                            defineTasksAndNotificationsTable();
                        };
                        populateTasksAndNotificationsTable();
                    };
                },
                true);


            myAccountController.getNoOfNetworksAndSets(
                function() {
                    myAccountController.loadNetworksTasksAndRequests();
                },
                function() {
                    console.log("unable to get No of Networks and Sets for this account");
                }
            );

            // get groups
            var member = null;
            myAccountController.getUserGroupMemberships(member);

        }]);
            //------------------------------------------------------------------------------------//
