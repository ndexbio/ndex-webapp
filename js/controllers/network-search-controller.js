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
                    { field: 'Network Name', enableFiltering: true, minWidth: 330,
                        cellTemplate: 'pages/gridTemplates/networkName.html'},
                    { field: 'Format', enableFiltering: true, minWidth: 70 },
                    { field: 'Nodes', enableFiltering: false, minWidth: 70 },
                    { field: 'Edges', enableFiltering: false, minWidth: 70 },
                    { field: 'Visibility', enableFiltering: true, minWidth: 90 },
                    { field: 'Owned By', enableFiltering: true, minWidth: 70 },
                    { field: 'Last Modified', enableFiltering: false, minWidth: 100, cellFilter: 'date' }
                ];
                $scope.networkGridApi.grid.options.columnDefs = columnDefs;
                refreshNetworkTable();

            };

            var refreshNetworkTable = function()
            {
                $scope.networkSearchGridOptions.data = [];

                for(var i = 0; i < searchController.networkSearchResults.length; i++ )
                {
                    var network = searchController.networkSearchResults[i];

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

                    var row = {"Network Name": networkName, "description": description, "externalId": externalId, "Format": format, "Nodes": nodes, "Edges": edges, "Owned By": owner, "Visibility": visibility, "Last Modified": modified };
                    //var row = {"Title": 'foo', "Nodes": 'foo', "Edges": 'foo' };
                    //
                    //
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

        (request = ndexService.findNetworks(searchController.searchString, 
                                            searchController.accountName, 
                                            searchController.permission,
                                            searchController.includeGroups,
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


    //                  Initializations
    //-----------------------------------------------------------------

    //quick implementation for navbar search support
    if(sharedProperties.doSearch()) {
        searchController.searchString = sharedProperties.getSearchString();
        searchController.submitNetworkSearch();
    }
    else
    {
        searchController.searchString = "";
        searchController.submitNetworkSearch();
    }


}]);

