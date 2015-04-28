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
            userController.displayedUser = {};

            //groups
            userController.groupSearchAdmin = false; // this state needs to be saved to avoid browser refresh
            userController.groupSearchMember = false;
            userController.groupSearchResults = [];

            //networks
            userController.networkQuery = {};
            userController.networkSearchResults = [];
            userController.skip = 0;
            userController.skipSize = 25;
            userController.allSelected = false;
            userController.atLeastOneSelected = false;


            //tasks
            userController.pendingTasks = [];

            userController.getTaskFileExt = function(task)
            {
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

            // gui control
            userController.selectAll = function ()
            {
                //Note that userController.allSelected lags behind ng-model. That is why we seem to be testing for
                //values opposite of what you would expect here.
                //UPDATE: This test has been reversed, because after upgrading Angular, there is no longer a lag.
                for (var i = 0; i < userController.networkSearchResults.length; i++)
                {
                    userController.networkSearchResults[i].selected = userController.allSelected;
                }
                userController.atLeastOneSelected = userController.allSelected;
            };

            userController.selectNetwork = function (network)
            {
                //This test is the opposite of what you think, because this method is called before this value is
                //changed by the ng-model.
                //UPDATE: This test has been reversed, because after upgrading Angular, there is no longer a lag.
                if (network.selected)
                {
                    userController.atLeastOneSelected = true;
                    return;
                }
                else
                {
                    userController.allSelected = false;
                }

                for (var i = 0; i < userController.networkSearchResults.length; i++)
                {
                    n = userController.networkSearchResults[i];
                    if (n.externalId == network.externalId)
                        continue;
                    if (n.selected)
                    {
                        userController.atLeastOneSelected = true;
                        return;
                    }
                }
                userController.atLeastOneSelected = false;
            };

            userController.deleteSelectedNetworks = function ()
            {
                var selectedIds = [];
                for (var i = 0; i < userController.networkSearchResults.length; i++)
                {
                    if (userController.networkSearchResults[i].selected)
                    {
                        selectedIds.push(userController.networkSearchResults[i].externalId);
                    }
                }

                for (i = 0; i < selectedIds.length; i++ )
                {
                    var selectedId = selectedIds[i];
                    ndexService.deleteNetwork(selectedId,
                        function (data)
                        {
                            //for( var j = 0; j < userController.networkSearchResults.length; j++ )
                            //{
                            //    if( userController.networkSearchResults[j].externalId == selectedId )
                            //    {
                            //        userController.networkSearchResults.splice(j, 1);
                            //        return;
                            //    }
                            //}
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
                userController.networkQuery.permission = "ADMIN";

                ndexService.searchNetworks(userController.networkQuery, userController.skip, userController.skipSize,
                    function (networks)
                    {
                        userController.networkSearchResults = networks;
                        for (i in userController.networkSearchResults)
                            userController.networkSearchResults[i].selected = false;

                        ////console.log(userController.networkSearchResults[0])
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
