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

    groupController.adminsCount = 0;

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

    var countAdmins = function(users) {
        groupController.adminsUUIDs = [];

        if (!users) {
            return;
        }

        for (var i in users) {
            var user = users[i];

            if (user.permissions.toUpperCase() == 'GROUPADMIN') {
                groupController.adminsCount = groupController.adminsCount + 1;
            }
        }
    }

    groupController.getMembersOfGroup = function(member) {
        /*
         * To get list of User objects we need to:
         *
         * 1) Use Get Members of a Group API:
         *    GET /group/{groupid}/membership?type={membershiptype}&start={start}&size={size}
         *    to get the GROUP memberships
         *
         * 2) Get a list of User UUIDs from step 1
         *
         * 3) Use this list of User UUIDs to get Users through
         *    /batch/user API.
         *
         */
        ndexService.getMembersOfGroupV2(groupController.identifier, member, 0, 1000000,
            function (users) {

                countAdmins(users);

                var usersUUIDs = getUsersUUIDs(users);

                ndexService.getUsersByUUIDsV2(usersUUIDs)
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
            },
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

        ndexService.searchUsersV2(searchString, 0, 1000000,
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
        var member = (groupController.userSearchAdmin) ? "GROUPADMIN" : null;

        groupController.userSearchMember = false;

        groupController.getMembersOfGroup(member);
    };

    groupController.memberCheckBoxClicked = function()
    {
        var member = (groupController.userSearchMember) ? "MEMBER" : null;

        groupController.userSearchAdmin = false;

        groupController.getMembersOfGroup(member);
    };
            
    groupController.getNetworksOfGroup = function() {

        /*
         * To get list of Network Summaries objects we need to:
         *
         * 1) Use getNetworkPermissionsOfGroup function at
         *  /group/{groupid}/permission?permission={permission}&start={startPage}&size={pageSize}
         * to get the list of network IDs that this group has permission to.
         *
         * 2) Use getNetworkSummaries function at /network/summaries to get a list of network
         * summaries using the network IDs you got in step 1  (send all network IDs in one call).
         *
         */

        ndexService.getNetworkPermissionsOfGroupV2(groupController.identifier, 'READ', 0, 1000,
            
                function (networkPermissionsMap) {
                    var networkUUIDs = Object.keys(networkPermissionsMap);

                    ndexService.getNetworkSummariesByUUIDsV2(networkUUIDs,
                        function (networkSummaries) {
                            groupController.networkSearchResults = networkSummaries;
                            populateNetworkTable();
                        },
                        function (error) {
                            if (error) {
                                displayErrorMessage(error);
                            }
                        })
                },
                function (error) {
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
        columnVirtualizationThreshold: 20,
        enableColumnMenus: false,

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
            { field: 'Status', enableFiltering: false, maxWidth: 55, cellTemplate: 'pages/gridTemplates/networkStatus.html', visible: false },
            { field: 'Network Name', enableFiltering: true, cellTemplate: 'pages/gridTemplates/networkName.html'},
            { field: ' ', enableFiltering: false, width:40, cellTemplate: 'pages/gridTemplates/downloadNetwork.html' },
            { field: 'Reference', enableFiltering: false, maxWidth: 76, cellTemplate: 'pages/gridTemplates/reference.html' },
            { field: 'Disease', enableFiltering: true, maxWidth: 65, cellTemplate: 'pages/gridTemplates/disease.html'},
            { field: 'Tissue',  enableFiltering: true, maxWidth: 65, cellTemplate: 'pages/gridTemplates/tissue.html'},
            { field: 'Nodes', enableFiltering: false, maxWidth: 70 },
            { field: 'Edges', enableFiltering: false, maxWidth: 70 },
            { field: 'Visibility', enableFiltering: true, maxWidth: 70 },
            { field: 'Owned By', enableFiltering: true, maxWidth:80,
                cellTemplate: 'pages/gridTemplates/ownedBy.html'},
            { field: 'Last Modified', enableFiltering: false, maxWidth:120, cellFilter: "date:'short'" }
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

            var download = "Download " + networkName;
            var reference = uiMisc.getNetworkReferenceObj(network);
            var disease   = uiMisc.getDisease(network);
            var tissue    = uiMisc.getTissue(network);

            var row = {
                "Status"        :   networkStatus,
                "Network Name"  :   networkName,
                " "             :   download,
                "Reference"     :   reference,
                "Disease"       :   disease,
                "Tissue"        :   tissue,
                "Nodes"         :   nodes,
                "Edges"         :   edges,
                "Visibility"    :   visibility,
                "Owned By"      :   owner,
                "Last Modified" :   modified,
                "description"   :   description,
                "externalId"    :   externalId,
                "ownerUUID"     :   network['ownerUUID'],
                "name"          :   networkName
            };
            $scope.networkGridOptions.data.push(row);
        }
    };

    var displayErrorMessage = function(error) {
        var message = (error && error.message) ? error.message: "Unknown error; Server returned no error information.";
        groupController.errors.push(message);
    }
            
            //              local functions
    var getMembership = function() {

        if (!groupController.isLoggedIn) {
            return;
        }
        
        var userId = sharedProperties.getCurrentUserId();
        var groupId = groupController.displayedGroup.externalId

        ndexService.getUserMembershipInGroupV2(userId, groupId,

            function(membership) {
                if (membership) {
                    var myMembership = membership[groupId];

                    if (myMembership == 'GROUPADMIN') {
                        groupController.isAdmin = true;
                    }
                    if (myMembership == 'MEMBER') {
                        groupController.isMember = true;
                    }
                }
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

    $scope.getNetworkFromServerAndSaveToDisk = function(rowEntity) {

        uiMisc.getNetworkFromServerAndSaveToDisk(rowEntity);
    }
            
    $scope.getFirstWordFromDisease = function(diseaseDescription) {

        return uiMisc.getFirstWordFromDisease(diseaseDescription);
    };

    //                  PAGE INITIALIZATIONS/INITIAL API CALLS
    //----------------------------------------------------------------------------
    groupController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);

    ndexService.getGroupV2(groupController.identifier,
        function (group) {
 
            groupController.displayedGroup = group;

            getMembership();

            groupController.getNetworksOfGroup();

            // passing null as type to the Use Get Members of a Group API will
            // find both MEMBER and GROUPADMIN members of the group
            var member = null;
            groupController.getMembersOfGroup(member);
        });

    //------------------------------------------------------------------------------------//
}]);
