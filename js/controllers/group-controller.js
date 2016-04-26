ndexApp.controller('groupController',
    ['ndexService', 'ndexUtility', 'ndexNavigation', 'sharedProperties', '$scope', '$location', '$routeParams', '$modal', '$route',
        function (ndexService, ndexUtility, ndexNavigation, sharedProperties, $scope, $location, $routeParams, $modal, $route) {

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

    // networks
    groupController.networkSearchResults = [];
    groupController.networkQuery = {};
    groupController.errors = [];


    //              scope functions
    // called on Networks belonging to group displayed on page
    groupController.setAndDisplayCurrentNetwork = function (identifier) {
        $location.path("/network/" + identifier);
    };


    groupController.submitUserSearch = function() {

        var query = {};

        query.accountName = groupController.displayedGroup.accountName;
        query.searchString = groupController.memberSearchString;
        if(groupController.userSearchAdmin) query.permission = 'GROUPADMIN';
        if(groupController.userSearchMember) query.permission = 'MEMBER'
                          
        //pagination missing
        ndexService.searchUsers(query, 0, 50,
            function (users) {
                // Save the results
                groupController.userSearchResults = users;
                                  
            },
            function (error) {
                                         
            });
    };

    groupController.adminCheckBoxClicked = function()
    {
        groupController.userSearchMember = false;
        groupController.submitUserSearch();
    };

    groupController.memberCheckBoxClicked = function()
    {
        groupController.userSearchAdmin = false;
        groupController.submitUserSearch();
    };

    groupController.submitNetworkSearch = function() {
        groupController.networkSearchResults = [];

        groupController.networkQuery.accountName = groupController.displayedGroup.accountName;

        ndexService.getNetworkSummariesOfTheGroup(groupController.identifier,
            function(networks) {
                groupController.networkSearchResults = networks;
                populateNetworkTable();
            },
            function(error){
                if ((typeof error.data !== 'undefined') &&
                    (typeof error.data.message !== 'undefined')) {
                    groupController.errors.push(error.data.message);
                } else {
                    groupController.errors.push("Server returned HTTP error response code " +
                        error.status);
                }
            })
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


            //              local functions
    var getMembership = function() {
        ndexService.getMyDirectMembership(groupController.displayedGroup.externalId, 
            function(membership) {
                if(membership && membership.permissions == 'GROUPADMIN')
                    groupController.isAdmin = true;
                if(membership && membership.permissions == 'MEMBER')
                    groupController.isMember = true;
            },
            function(error){
                //console.log(error);
            });
    };

    //                  PAGE INITIALIZATIONS/INITIAL API CALLS
    //----------------------------------------------------------------------------
    groupController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);

    ndexService.getGroup(groupController.identifier,
        function (group) {
 
            groupController.displayedGroup = group;
            cGroup = group;

            getMembership();

            groupController.submitUserSearch();

            groupController.submitNetworkSearch();

        });

            //------------------------------------------------------------------------------------//

        }]);
