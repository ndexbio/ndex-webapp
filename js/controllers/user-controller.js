ndexApp.controller('userController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams', '$route',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams, $route)
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


            //tasks
            userController.pendingTasks = [];

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
                    { field: 'Visibility', enableFiltering: false, minWidth: 70 },
                    { field: 'Owner', enableFiltering: true, minWidth: 70 },
                    { field: 'Modified', enableFiltering: false, minWidth: 100, cellFilter: 'date' }
                ];
                $scope.networkGridApi.grid.options.columnDefs = columnDefs;
                refreshNetworkTable();
            };

            var refreshNetworkTable = function()
            {
                $scope.networkGridOptions.data = [];

                for(var i = 0; i < userController.networkSearchResults.length; i++ )
                {
                    var network = userController.networkSearchResults[i];

                    var networkName = network['name'];
                    var description = network['description'];
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

                    var row = {"Network Name": networkName, "description": description, "externalId": externalId, "Format": format, "Nodes": nodes, "Edges": edges, "Owner": owner, "Visibility": visibility, "Modified": modified };
                    //var row = {"Title": 'foo', "Nodes": 'foo', "Edges": 'foo' };
                    //
                    //
                    $scope.networkGridOptions.data.push(row);
                }
            };


            userController.getTaskFileExt = function(task)
            {
                if( !task.format )
                    return "";
                if( task.format.toUpperCase() == 'BIOPAX' )
                    return 'owl';
                else
                    return task.format.toLowerCase();
            };

            userController.deleteAllTasks = function()
            {
                for( var i = 0; i < userController.pendingTasks.length; i++ )
                {
                    var task = userController.pendingTasks[i];
                    userController.deleteTask(task.externalId);
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
                        ////console.log("Successfully retrieved tasks: " + tasks);
                        userController.pendingTasks = tasks;
                        for (var i = userController.pendingTasks.length - 1; i >= 0; i--)
                        {
                            var task = userController.pendingTasks[i];
                            if( task.status == 'COMPLETED' && task.taskType != 'EXPORT_NETWORK_TO_FILE' )
                            {
                                userController.pendingTasks.splice(i,1);
                            }
                        }


                    },
                    // Error
                    function (response)
                    {
                        //console.log("Failed to retrieve tasks: " + response);
                        //TBD
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
