ndexApp.controller('groupController',
    ['ndexService', 'ndexUtility', 'ndexNavigation', 'sharedProperties', '$scope', '$location', '$routeParams', '$modal', '$route', 'uiMisc',
        function (ndexService, ndexUtility, ndexNavigation, sharedProperties, $scope, $location, $routeParams, $modal, $route, uiMisc) {

    //              Process the URL to get application state
    //-----------------------------------------------------------------------------------
    var identifier = $routeParams.identifier;


    //              CONTROLLER INTIALIZATIONS
    //------------------------------------------------------------------------------------

    $scope.groupController = {};
    var groupController = $scope.groupController;
    groupController.isAdmin = false;  
    groupController.isMember = false;   
    groupController.identifier = identifier;

    // members
    // convert to query object?
    groupController.userSearchAdmin = false; 
    groupController.userSearchMember = false;
    groupController.userSearchResults = [];
    groupController.originalUserSearchResults = [];


    // networks
    groupController.networkSearchResults = [];
    groupController.networkQuery = {};
    groupController.errors = [];


    //              scope functions
    // called on Networks belonging to group displayed on page
    groupController.setAndDisplayCurrentNetwork = function (identifier) {
        $location.path("/newNetwork/" + identifier);
    };

    var getUsersUUIDs = function(users) {
        var usersUUIDs = [];

        for (var i=0; i<users.length; i++) {
            var userUUID = users[i].memberUUID;
            usersUUIDs.push(userUUID);
        }
        return usersUUIDs;
    }

    groupController.submitUserSearch = function(member, inclusive) {
        /*
         * To get list of User objects we need to:
         *
         * 1) Use getGroupUserMemberships function at
         *    /group/{groupId}/user/{permission}/skipBlocks/blockSize?inclusive=true;
         *    to get the list of USER and GROUP memberships
         *
         * 2) Get a list of User UUIDs from step 1
         *
         * 3) Use this list of User UUIDs to get Users through
         *    /batch/user API.
         *
         */
        ndexService.getGroupUserMemberships(groupController.identifier, member, 0, 1000000, inclusive)
            .success(
                function (users) {

                    var usersUUIDs = getUsersUUIDs(users);

                    ndexService.getUsersByUUIDs(usersUUIDs)
                        .success(
                            function (users) {
                                groupController.userSearchResults = users;
                                groupController.originalUserSearchResults = users;
                            }
                        )
                        .error(
                            function (error) {
                                console.log("unable to get users by UUIDs");
                            }
                        );
                })
            .error(
                function (error, data) {
                    console.log("unable to get group user memberships");
                });
    }

    var checkUserSearchResultObject = function(userObj) {
        var found = false;

        for (var i = 0; i < groupController.originalUserSearchResults.length; i++ ) {
            if (userObj.externalId == groupController.originalUserSearchResults[i].externalId) {
                found = true;
                break;
            }
        }

        return found;
    }

    groupController.searchMembersFromUserInput = function() {
        var searchString = groupController.memberSearchString;

        ndexService.searchUsers(searchString, 0, 1000000,
            function(userObjectsFound) {

                groupController.userSearchResults = [];

                if (userObjectsFound && userObjectsFound.resultList && userObjectsFound.resultList.length > 0) {

                    for (var i = 0; i < userObjectsFound.resultList.length; i++) {
                        var userObj = userObjectsFound.resultList[i];

                        if (checkUserSearchResultObject(userObj)) {
                            groupController.userSearchResults.push(userObj);
                        }
                    }
                }
            },
            function(error) {
                console.log("unable to search users");
            });

    }

    groupController.adminCheckBoxClicked = function()
    {
        var member    = (groupController.userSearchAdmin) ? "GROUPADMIN" : "MEMBER";
        var inclusive = (groupController.userSearchAdmin) ? false : true;

        groupController.userSearchMember = false;

        groupController.submitUserSearch(member, inclusive);
    };

    groupController.memberCheckBoxClicked = function()
    {
        var member    = "MEMBER";
        var inclusive = (groupController.userSearchMember) ? false : true;

        groupController.userSearchAdmin = false;

        groupController.submitUserSearch(member, inclusive);
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
            
    groupController.submitNetworkSearch = function() {

        /*
         * To get list of Network Summaries objects we need to:
         *
         * 1) Use getGroupNetworkMemberships function at
         *  /group/{groupId}/network/{permission}/{skipBlocks}/{blockSize}
         * to get the list of network IDs that this group has permission to.
         *
         * 2) Use getNetworkSummaries function at /network/summaries to get a list of network
         * summaries using the network IDs you got in step 1  (send all network IDs in one call).
         * These changes should be made in groupController.submitNetworkSearch().
         *
         */
        var inclusive = true;

        ndexService.getGroupNetworkMemberships(groupController.identifier, 'READ', 0, 500, inclusive)
            .success(
                function (groupUUIDs) {
                    var UUIDs = getUUIDs(groupUUIDs);

                    ndexService.getNetworkSummariesByIDs(UUIDs)
                        .success(
                            function (networkSummaries) {
                                groupController.networkSearchResults = networkSummaries;
                                populateNetworkTable();
                            })
                        .error(
                            function (error, data) {
                                // Save the error.
                                if (error) {
                                    displayErrorMessage(error);
                                }
                            });
                })
            .error(
                function (error, data) {
                    // Save the error.
                    if (error) {
                        displayErrorMessage(error);
                    }
                });
    };

    //table
    $scope.networkGridOptions =
    {
        enableSorting: true,
        enableFiltering: true,
        showGridFooter: true,
        enableSelectAll: false,
        enableRowSelection: false,
        multiSelect: false,
        enableRowHeaderSelection: false,

        onRegisterApi: function( gridApi )
        {
            $scope.networkGridApi = gridApi;
            gridApi.selection.on.rowSelectionChanged($scope,function(row){
                var selectedRows = gridApi.selection.getSelectedRows();
                groupController.atLeastOneSelected = selectedRows.length > 0;

            });
            gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                var selectedRows = gridApi.selection.getSelectedRows();
                groupController.atLeastOneSelected = selectedRows.length > 0;
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
            { field: 'Last Modified', enableFiltering: false, minWidth: 100, cellFilter: 'date' }
        ];
        $scope.networkGridApi.grid.options.columnDefs = columnDefs;
        refreshNetworkTable();
    };

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

        for(var i = 0; i < groupController.networkSearchResults.length; i++ )
        {
            var network = groupController.networkSearchResults[i];

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

    var displayErrorMessage = function(error) {
        if (error.status != 0) {
            var message;
            if (error.data && error.data.message) {
                message = error.data.message;
            }
            if (error.status) {
                message = message + "  Error Code: " + error.status + ".";
            }
            if (error.statusText) {
                message = message + "  Error Message: " + error.statusText;
            }
            groupController.errors.push(message);
        } else {
            groupController.errors.push("Unknown error; Server returned no error information.");
        }
    }
            
            //              local functions
    var getMembership = function() {

        if (!groupController.isLoggedIn) {
            return;
        }

        ndexService.getMyDirectMembership(groupController.displayedGroup.externalId,

            function(membership) {
                if(membership == 'GROUPADMIN')
                    groupController.isAdmin = true;
                if(membership == 'MEMBER')
                    groupController.isMember = true;
            },
            function(error){
                //console.log(error);
                displayErrorMessage(error);
            });
    };

    $scope.showWarningsOrErrors = function(rowEntity) {

        if (!rowEntity && !rowEntity.externalId) {
            return;
        }

        uiMisc.showNetworkWarningsOrErrors(rowEntity, groupController.networkSearchResults);
    }

    //                  PAGE INITIALIZATIONS/INITIAL API CALLS
    //----------------------------------------------------------------------------
    groupController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);

    ndexService.getGroup(groupController.identifier,
        function (group) {
 
            groupController.displayedGroup = group;
            cGroup = group;

            getMembership();

            var member    = "MEMBER";
            var inclusive = true;
            groupController.submitUserSearch(member, inclusive);

            groupController.submitNetworkSearch();

        });

            //------------------------------------------------------------------------------------//

}]);
