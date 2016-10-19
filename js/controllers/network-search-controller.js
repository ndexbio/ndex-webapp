ndexApp.controller('searchNetworksController', 
    [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal',
        function (ndexService, sharedProperties, $scope, $location, $modal) {


    //              Controller Declarations/Initializations
    //---------------------------------------------------------------------
    $scope.networkSearch = {};
    var searchController = $scope.networkSearch;

    searchController.errors = [];
    searchController.networkSearchResults = [];
    searchController.skip = 0;
    searchController.skipSize = 100000;

            //table
            $scope.networkSearchGridOptions =
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

                    });
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                        var selectedRows = gridApi.selection.getSelectedRows();
                    });

                }
            };

            var populateNetworkTable = function()
            {
                var columnDefs = [
                    { field: 'Network Name', enableFiltering: true, minWidth: 400,
                        cellTemplate: 'pages/gridTemplates/networkName.html'},
                    { field: 'Status', enableFiltering: true, minWidth: 70 },
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
                $scope.networkSearchGridOptions.data = [];

                for(var i = 0; i < searchController.networkSearchResults.length; i++ )
                {
                    var network = searchController.networkSearchResults[i];

                    var networkName = (!network['name']) ? "No name; UUID : " + network.externalId : network['name'];

                    var networkStatus = 'success';
                    if (!network.isValid) {
                        if (network.errorMessage) {
                            networkStatus = "failed";
                        } else {
                            networkStatus = "processing";
                        }
                    }

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

                    $scope.networkSearchGridOptions.data.push(row);
                }
            };



    searchController.setAndDisplayCurrentNetwork = function (networkId) {
        $location.path("/network/" + networkId);
    };


    searchController.submitNetworkSearch = function () {

        // We want to hold on to the request for the subnetwork query. The request contains the .abort method.
        // This way, we can call the method midstream and cancel the AJAX call.
        var request = null;

        // AngularUi modal service use. queryContent.html is reused across this controller. It is located in our
        // network.html page. We pass this controllers scope and do not allow close by clicking outside of the modal.
        var modalInstance = $modal.open({
            templateUrl: 'searchContent.html',
            scope: $scope,
            backdrop: 'static'
        });

        // Close the modal and abort the AJAX request.
        searchController.cancel = function () {
            modalInstance.close();
            request.abort();
        };

        searchController.networkSearchIncludeNetworksByGroupPermissions = true;

        (request = ndexService.findNetworks(searchController.searchString, 
                                            searchController.userName,
                                            searchController.permission,
                                            searchController.networkSearchIncludeNetworksByGroupPermissions,
                                            searchController.skip,
                                            searchController.skipSize) )
            .success(
            function (networks) {
                if(networks.length == 0)
                    searchController.errors.push('No results found that match your criteria')

                //console.log('got results')
                // Save the results
                searchController.networkSearchResults = networks;
                populateNetworkTable();
                modalInstance.close();
            })
            .error(
            function (error, data) {
                // Save the error.
                if (error) {
                    searchController.networkSearchResults = [];
                    searchController.errors.push(error.message);

                    // close the modal.
                    modalInstance.close();

                }
            })

    };

    // extract value of 'networks' from URI; URI looks something like
    // http://localhost:63342/ndex-webapp/index.html#/searchNetworks?networks=test
    // NOTE: searchString can be 'undefined' in  case 'networks' name in the search portion of URI was
    // manually replaced with a non-existant value (i.e., 'abccba'); URI in this case may look like
    // http://localhost:63342/ndex-webapp/index.html#/searchNetworks?abccba=test
    var searchString = decodeURIComponent($location.search().networks);

    // if no 'networks' name was found in the search portion of URI (it is 'undefined'),
    // then the search string is "" (i.e., "search for all networks")
    searchController.searchString = (searchString.toLowerCase() === 'undefined') ? "" : searchString;

    // set $scope.main.searchString to searchController.searchString; - this ensures that $scope.main.searchString
    // stays the same (doesn't get reset) in the search window in case of page reload (F5);
    // $scope.main.searchString is "" (empty string) in case searchString is 'undefined'
    $scope.main.searchString = searchController.searchString;

    searchController.submitNetworkSearch();
}]);

