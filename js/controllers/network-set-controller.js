ndexApp.controller('networkSetController',
    ['ndexService', 'ndexUtility', 'ndexNavigation', 'sharedProperties', '$scope', '$location', '$routeParams', '$modal', '$route', 'uiMisc',
        function (ndexService, ndexUtility, ndexNavigation, sharedProperties, $scope, $location, $routeParams, $modal, $route, uiMisc) {

    //              Process the URL to get application state
    //-----------------------------------------------------------------------------------
    var identifier = $routeParams.identifier;


    //              CONTROLLER INTIALIZATIONS
    //------------------------------------------------------------------------------------

    $scope.networkSetController = {};
    var networkSetController = $scope.networkSetController;

    networkSetController.isAdmin = false;
    networkSetController.isMember = false;
    networkSetController.identifier = identifier;

    // members
    // convert to query object?
    networkSetController.userSearchAdmin = false;
    networkSetController.userSearchMember = false;
    networkSetController.userSearchResults = [];
    networkSetController.originalUserSearchResults = [];

    networkSetController.adminsCount = 0;

    // networks
    networkSetController.networkSearchResults = [];
    networkSetController.networkQuery = {};
    networkSetController.errors = [];

    networkSetController.isLoggedInUser = (ndexUtility.getLoggedInUserAccountName() != null);

    //              scope functions
    // called on Networks belonging to group displayed on page
    networkSetController.setAndDisplayCurrentNetwork = function (identifier) {
        $location.path("/network/" + identifier);
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
        networkSetController.adminsUUIDs = [];

        if (!users) {
            return;
        }

        for (var i in users) {
            var user = users[i];

            if (user.permissions.toUpperCase() == 'GROUPADMIN') {
                networkSetController.adminsCount = networkSetController.adminsCount + 1;
            }
        }
    }


    //TODO this should be deleted.  Network Sets do not have members, only an owner
    networkSetController.getMembersOfGroup = function(member) {
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
        ndexService.getMembersOfGroupV2(networkSetController.identifier, member, 0, 1000000,
            function (users) {

                countAdmins(users);

                var usersUUIDs = getUsersUUIDs(users);

                ndexService.getUsersByUUIDsV2(usersUUIDs)
                    .success(
                        function (users) {
                            networkSetController.userSearchResults = users;
                            networkSetController.originalUserSearchResults = users;
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

        for (var i = 0; i < networkSetController.originalUserSearchResults.length; i++ ) {
            if (userObj.externalId == networkSetController.originalUserSearchResults[i].externalId) {
                found = true;
                break;
            }
        }

        return found;
    }

    networkSetController.searchMembersFromUserInput = function() {
        var searchString = networkSetController.memberSearchString;

        ndexService.searchUsersV2(searchString, 0, 1000000,
            function(userObjectsFound) {

                networkSetController.userSearchResults = [];

                if (userObjectsFound && userObjectsFound.resultList && userObjectsFound.resultList.length > 0) {

                    for (var i = 0; i < userObjectsFound.resultList.length; i++) {
                        var userObj = userObjectsFound.resultList[i];

                        if (checkUserSearchResultObject(userObj)) {
                            networkSetController.userSearchResults.push(userObj);
                        }
                    }
                }
            },
            function(error) {
                console.log("unable to search users");
            });

    }


    networkSetController.adminCheckBoxClicked = function()
    {
        var member = (networkSetController.userSearchAdmin) ? "GROUPADMIN" : null;

        networkSetController.userSearchMember = false;

        networkSetController.getMembersOfGroup(member);
    };

    networkSetController.memberCheckBoxClicked = function()
    {
        var member = (networkSetController.userSearchMember) ? "MEMBER" : null;

        networkSetController.userSearchAdmin = false;

        networkSetController.getMembersOfGroup(member);
    };
            
    networkSetController.getNetworksOfNetworkSet = function() {

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

        ndexService.getNetworkSet(networkSetController.identifier,
            
                function (networkSetInformation) {
                    var networkUUIDs = networkSetInformation["networks"];

                    ndexService.getNetworkSummariesByUUIDsV2(networkUUIDs,
                        function (networkSummaries) {
                            networkSetController.networkSearchResults = networkSummaries;
                            $scope.netSummaries = networkSummaries;
                            populateNetworkTable();
                        },
                        function (error) {
                            if (error) {
                                displayErrorMessage(error);
                            }
                        });

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
                networkSetController.atLeastOneSelected = selectedRows.length > 0;

            });
            gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                var selectedRows = gridApi.selection.getSelectedRows();
                networkSetController.atLeastOneSelected = selectedRows.length > 0;
            });

        }
    };

    var populateNetworkTable = function()
    {
        var columnDefs = [
            { field: 'Status', enableFiltering: false, maxWidth: 60, cellTemplate: 'pages/gridTemplates/networkStatus.html', visible: false },
            { field: 'Network Name', enableFiltering: true, cellTemplate: 'pages/gridTemplates/networkName.html'},
            { field: ' ', enableFiltering: false, width:40, cellTemplate: 'pages/gridTemplates/downloadNetwork.html' },
            { field: 'Format', enableFiltering: true, maxWidth:63 },
            { field: 'Ref.', enableFiltering: false, maxWidth: 45, cellTemplate: 'pages/gridTemplates/reference.html' },
            { field: 'Disease', enableFiltering: true, maxWidth: 68, cellTemplate: 'pages/gridTemplates/disease.html'},
            { field: 'Tissue',  enableFiltering: true, maxWidth: 65, cellTemplate: 'pages/gridTemplates/tissue.html'},
            { field: 'Nodes', enableFiltering: false, maxWidth: 70 },
            { field: 'Edges', enableFiltering: false, maxWidth: 70 },
            { field: 'Visibility', enableFiltering: true, maxWidth: 70 },
            { field: 'Owner', enableFiltering: true, maxWidth:80,
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

        for(var i = 0; i < networkSetController.networkSearchResults.length; i++ )
        {
            var network = networkSetController.networkSearchResults[i];
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
            var nodes = network['nodeCount'];
            var edges = network['edgeCount'];
            var owner = network['owner'];
            var visibility = network['visibility'];
            var modified = new Date( network['modificationTime'] );

            var format = uiMisc.getNetworkFormat(subNetworkId, network);
            var download = "Download " + networkName;
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
                "subnetworks"   :   noOfSubNetworks
            };
            $scope.networkGridOptions.data.push(row);
        }
    };

    var displayErrorMessage = function(error) {
        var message = (error && error.message) ? error.message: "Unknown error; Server returned no error information.";
        networkSetController.errors.push(message);
    }
            
            //              local functions
    var getMembership = function() {

        if (!networkSetController.isLoggedInUser) {
            return;
        }
        
        var userId = sharedProperties.getCurrentUserId();
        var groupId = networkSetController.displayedGroup.externalId

        ndexService.getUserMembershipInGroupV2(userId, groupId,

            function(membership) {
                if (membership) {
                    var myMembership = membership[groupId];

                    if (myMembership == 'GROUPADMIN') {
                        networkSetController.isAdmin = true;
                    }
                    if (myMembership == 'MEMBER') {
                        networkSetController.isMember = true;
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

        uiMisc.showNetworkWarningsOrErrors(rowEntity, networkSetController.networkSearchResults);
    }

    $scope.getNetworkDownloadLink = function(rowEntity) {
        return uiMisc.getNetworkDownloadLink(networkSetController, rowEntity);
    };
            
    $scope.getFirstWordFromDisease = function(diseaseDescription) {

        return uiMisc.getFirstWordFromDisease(diseaseDescription);
    };

    $scope.isOwnerOfNetwork = function(networkOwnerUUID)
    {
        if (!networkSetController.isLoggedInUser) {
            return false;
        }
        return (sharedProperties.getCurrentUserId() == networkOwnerUUID);
    }

    //                  PAGE INITIALIZATIONS/INITIAL API CALLS
    //----------------------------------------------------------------------------
    // networkSetController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);

    /*
    ndexService.getGroupV2(networkSetController.identifier,
        function (group) {
 
            networkSetController.displayedGroup = group;

            getMembership();

            networkSetController.getNetworksOfNetworkSet();

            // passing null as type to the Use Get Members of a Group API will
            // find both MEMBER and GROUPADMIN members of the group
            var member = null;
            networkSetController.getMembersOfGroup(member);
        });
    */
    networkSetController.getNetworksOfNetworkSet();

    //------------------------------------------------------------------------------------//
}]);
