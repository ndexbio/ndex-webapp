ndexApp.controller('networkSetController',
    ['ndexService', 'ndexUtility', 'ndexNavigation', 'sharedProperties', '$scope', '$location', '$routeParams', 'uiMisc',
        'ndexSpinner',
        function (ndexService, ndexUtility, ndexNavigation, sharedProperties, $scope, $location, $routeParams, uiMisc,
                  ndexSpinner) {

    //              Process the URL to get application state
    //-----------------------------------------------------------------------------------
    var identifier = $routeParams.identifier;


    //              CONTROLLER INTIALIZATIONS
    //------------------------------------------------------------------------------------

    $scope.networkSetController = {};
    var networkSetController = $scope.networkSetController;

    networkSetController.identifier = identifier;
    networkSetController.accesskey = $routeParams.accesskey;

    // networks
    networkSetController.networkSearchResults = [];
    networkSetController.errors = [];

    networkSetController.networkTableRowsSelected = 0;

    networkSetController.isLoggedInUser = (window.currentNdexUser != null);

    networkSetController.maxNetworksInSetToDisplay = window.ndexSettings.maxNetworksInSetToDisplay;
    networkSetController.summaryRetrievalChunks = 2000;

    networkSetController.isSetOwner = false;


    networkSetController.displayedSet = {};

    networkSetController.networkSets = [];


    networkSetController.networkSetShareableURL = null;
    networkSetController.networkSetShareableURLLabel = null;
    networkSetController.networkSetOwnerId = null;

    var activateURLLabel   = "Enable Share URL";
    var deActivateURLLabel = "Disable Share URL";

    var spinnerNetworkSetPageId = 'spinnerNetworkSetPageId';

    var windowsHeightCorrection = 170;

    $(document).ready(function(){
        $('[data-toggle="tooltip"]').tooltip();
    });
    $scope.changeTitle = function(obj) {
        setTooltip("Copy network set share URL to clipboard");
    };

    networkSetController.renderNetworkTable = false;

    $scope.showOriginalTitle = function() {
        networkSetController.copyNetworkSetURLTitle = 'Copy network set share URL to clipboard';
    };
    $scope.showCopiedTitle = function() {
        networkSetController.copyNetworkSetURLTitle = 'Copied';
    };

    var displayErrorMessage = function(error) {
        ndexSpinner.stopSpinner(); // it is safe to call stopSpinner if it is not running

        var message = (error && error.message) ? error.message: "Unknown error; Server returned no error information.";
        networkSetController.errors.push(message);
    };


    var getNetworkSummaries = function(networkUUIDs) {

        if ( networkUUIDs.length === 0 ) {
            populateNetworkTable();
            ndexSpinner.stopSpinner();
            return;
        }

        var firstUUIDs = networkUUIDs.slice(0, networkSetController.summaryRetrievalChunks);
        var trailingUUIDs = networkUUIDs.slice(networkSetController.summaryRetrievalChunks);

        ndexService.getNetworkSummariesByUUIDsV2(firstUUIDs, networkSetController.accesskey,
            function (networkSummaries) {

                networkSetController.networkSearchResults =
                    networkSetController.networkSearchResults.concat(networkSummaries);

                getNetworkSummaries(trailingUUIDs);
            },
            displayErrorMessage
        );

    };


    networkSetController.getNetworksOfNetworkSet = function() {

        // need network sets owned by logged in user in order to show them in case user
        // will want to add networks to his/her sets; thus calling networkSetController.getAllNetworkSetsOwnedByUser ...
        if (networkSetController.isLoggedInUser) {
            networkSetController.getAllNetworkSetsOwnedByUser(
                // success handler
                function(data) {
                    ; //networkSetController.getNetworksOfNetworkSet();
                },
                function(data, status) {
                    ; //networkSetController.getNetworksOfNetworkSet();
                });
        }

        ndexService.getNetworkSetV2(networkSetController.identifier, networkSetController.accesskey,
            
            function (networkSetInformation) {
                var networkUUIDs = networkSetInformation["networks"];


                networkSetController.networkSetOwnerId = networkSetInformation["ownerId"];
                networkSetController.displayedSet['name'] = networkSetInformation['name'];

                var desc = (networkSetInformation['description']) ? networkSetInformation['description'].trim() : "";
                if (!desc) {
                    // sometime description contains string starting with new line followed by blank spaces ("\n   ").
                    // To prevent it, we set description to null thus eliminating it from showing.
                    networkSetController.displayedSet['description'] = null;
                } else {
                    networkSetController.displayedSet['description'] = networkSetInformation['description'];
                };

                networkSetController.displayedSet['creationTime'] = networkSetInformation['creationTime'];
                networkSetController.displayedSet['modificationTime'] = networkSetInformation['modificationTime'];
                networksInSet = networkSetInformation['networks'].length
                networkSetController.displayedSet['networks'] = networksInSet;

                if (networkSetInformation['properties'] &&
                    networkSetInformation['properties']['reference']) {
                    networkSetController.displayedSet['properties'] =
                        {reference: networkSetInformation['properties']['reference']};
                }

                if (networkSetController.isLoggedInUser &&
                    (networkSetInformation['ownerId'] == sharedProperties.getCurrentUserId()) ) {
                    networkSetController.isSetOwner = true;

                    // status of the Shareable URl is shown in the Share Set modal that pops up after
                    // selecting Share button. This button is only shown to the owner of the set.
                    networkSetController.getStatusOfShareableURL();
                }

                if (networksInSet > networkSetController.maxNetworksInSetToDisplay) {
                    networkSetController.tooManyNetworksWarning =
                        'The number of networks in this set exceeds the maximum limit allowed for display ('+
                        (networkSetController.maxNetworksInSetToDisplay).toLocaleString() + ' networks).';

                } else  {
                    // start spinner before performing a potentially time-consuming operation
                    ndexSpinner.startSpinner(spinnerNetworkSetPageId);
                    getNetworkSummaries(networkUUIDs);
                }

            },

            displayErrorMessage
        );
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
                networkSetController.networkTableRowsSelected = selectedRows.length;
            });
            gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){
                var selectedRows = gridApi.selection.getSelectedRows();
                networkSetController.networkTableRowsSelected = selectedRows.length;
            });
        }
    };

    var populateNetworkTable = function()
    {
        var columnDefs = [
            { field: 'Status', enableFiltering: false, maxWidth: 60, cellTemplate: 'views/gridTemplates/networkStatus.html', visible: false },
            { field: 'Network Name', enableFiltering: true, cellTemplate: 'views/gridTemplates/networkName.html'},
            { field: ' ', enableFiltering: false, width:40, cellTemplate: 'views/gridTemplates/downloadNetwork.html' },
            //{ field: 'Format', enableFiltering: true, maxWidth:63 },
            { field: 'Ref.', enableFiltering: false, maxWidth: 45, cellTemplate: 'views/gridTemplates/reference.html' },
            { field: 'Disease', enableFiltering: true, width: 82, cellTemplate: 'views/gridTemplates/disease.html'},
            { field: 'Tissue',  enableFiltering: true, width: 75, cellTemplate: 'views/gridTemplates/tissue.html'},
            { field: 'Nodes', enableFiltering: false, maxWidth: 75,
                sortingAlgorithm: function (a, b) {
                    if (a === b) {
                        return 0;
                    }
                    if (a < b) {
                        return -1;
                    }
                    return 1;
                }
            },
            { field: 'Edges', enableFiltering: false, maxWidth: 75,
                sortingAlgorithm: function (a, b) {
                    if (a === b) {
                        return 0;
                    }
                    if (a < b) {
                        return -1;
                    }
                    return 1;
                }
            },
            { field: 'Visibility', enableFiltering: true, width: 90, cellTemplate: 'views/gridTemplates/visibility.html'},
            { field: 'Owner', enableFiltering: true, width:80,
                cellTemplate: 'views/gridTemplates/ownedBy.html'},
            { field: 'Last Modified', enableFiltering: false, maxWidth:120, cellFilter: "date:'short'" },
            { field: 'indexLevel',   enableFiltering: false,  visible: false}
        ];
        $scope.networkGridApi.grid.options.columnDefs = columnDefs;

        $("#myNetworksOfSetGridId").height($(window).height() - windowsHeightCorrection);
        $scope.networkGridApi.grid.gridHeight = $("#myNetworksOfSetGridId").height();

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
            } else if (network.isCertified) {
                networkStatus = "certified";
            };

            if ((networkStatus == "success") && network.warnings && network.warnings.length > 0) {
                networkStatus = "warning";
            };

            var networkName = (!network['name']) ? "No name; UUID : " + network.externalId : network['name'];
            if (networkStatus == "failed") {
                networkName = "Invalid Network. UUID: " + network.externalId;
            } else if (noOfSubNetworks >= 1) {
                networkStatus = "collection";
            };

            var description = $scope.stripHTML(network['description']);
            var externalId  = network['externalId'];
            var nodes       = parseInt(network.nodeCount);
            var edges       = parseInt(network.edgeCount);
            var owner       = network['owner'];
            var indexLevel  = network['indexLevel'];
            var visibility  = network['visibility'];
            var modified    = new Date( network['modificationTime'] );

            //var format    = uiMisc.getNetworkFormat(subNetworkId, network);
            var download  = "Download " + networkName;
            var reference = uiMisc.getNetworkReferenceObj(subNetworkId, network);
            var disease   = uiMisc.getDisease(network);
            var tissue    = uiMisc.getTissue(network);

            var errorMessage = network.errorMessage;

            var row = {
                "Status"        :   networkStatus,
                "Network Name"  :   networkName,
                " "             :   download,
                //"Format"        :   format,
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
                "subnetworks"   :   noOfSubNetworks,
                "indexLevel"    :   indexLevel
            };
            $scope.networkGridOptions.data.push(row);
            networkSetController.renderNetworkTable = true;
            setTimeout($scope.networkGridApi.core.handleWindowResize, 5);
        }
    }

    var removeSelectedNetworksFromSet = function ()
    {
        var selectedNetworksIds = [];

        var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

        _.forEach(selectedNetworksRows, function(row) {
            selectedNetworksIds.push(row.externalId);
        });

        if (selectedNetworksIds.length == 0) {
            return;
        };

        ndexService.deleteNetworksFromNetworkSetV2(networkSetController.identifier, selectedNetworksIds,

            function (data) {

                // after we removed the selected networks, the footer of the table may
                // still show that some networks are selected (must be a bug), so
                // we manually set the selected count to 0 (see defect NDEX-582)
                $scope.networkGridApi.grid.selection.selectedCount = 0;

                for (var i = networkSetController.networkSearchResults.length - 1; i >= 0; i-- )
                {
                    var externalId = networkSetController.networkSearchResults[i].externalId;
                    if  (selectedNetworksIds.indexOf(externalId) != -1) {
                        networkSetController.networkSearchResults.splice(i, 1);
                    };
                }
                refreshNetworkTable();
                networkSetController.displayedSet['networks'] = networkSetController.networkSearchResults.length;
                networkSetController.networkTableRowsSelected = 0;

            },

            displayErrorMessage
        );

    };

    networkSetController.confirmRemoveSelectedNetworksFromSet = function() {

        var networksSelected = networkSetController.networkTableRowsSelected;

        if (networksSelected > 1) {
            var title = 'Remove Selected Networks';
            var body = 'The selected ' +  networksSelected +
                ' networks will be removed from this Set. Are you sure you want to proceed?';
        } else {
            var title = 'Remove Selected Network';
            var body = 'The selected  network will be removed from this Set. Are you sure you want to proceed?';
        };

        var dismissModal = true;
        ndexNavigation.openConfirmationModal(title, body, "Remove", "Cancel", dismissModal,
            function () {
                $scope.isProcessing = true;
                removeSelectedNetworksFromSet();
                $scope.isProcessing = false;
            },
            function () {
                $scope.isProcessing = false;
            });

        return;
    };


    networkSetController.getAllNetworkSetsOwnedByUser = function (successHandler, errorHandler) {
        var userId = sharedProperties.getCurrentUserId(); //ndexUtility.getLoggedInUserExternalId();

        var offset = undefined;
        var limit  = undefined;

        ndexService.getAllNetworkSetsOwnedByUserV2(userId, offset, limit,
            function (networkSets) {
                networkSetController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);
                successHandler(networkSetController.networkSets[0]);
            },
            function (error, status) {
                networkSetController.networkSets = [];
                console.log("unable to get network sets");
                errorHandler(error, status);
            });
    };

    networkSetController.getIDsOfSelectedNetworks = function () {
        var selectedIds = [];
        var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

        _.forEach(selectedNetworksRows, function(row) {
            if (row.Status.toLowerCase() != "set") {
                selectedIds.push(row['externalId']);
            };
        });

        return selectedIds;
    };

    networkSetController.deleteNetworkSet = function(networkSetId) {
        var noOfNetworksInThisSet = networkSetController.networkSearchResults.length;
        var title = 'Delete This Network Set';
        var body  = 'This network set will be deleted from NDEx. ';

        if (noOfNetworksInThisSet == 1) {
            body = body + 'The network in this set will not be deleted. ';
        } else if (noOfNetworksInThisSet > 1) {
            body = body + 'The ' + noOfNetworksInThisSet + ' networks in this set will not be deleted. ';
        };

        body = body + 'Are you sure you want to proceed?';

        var dismissModal = true;
        ndexNavigation.openConfirmationModal(title, body, "Confirm", "Cancel", dismissModal,
            function () {
                $scope.isProcessing = true;

                ndexService.deleteNetworkSetV2(networkSetId,

                    function (data)
                    {
                        $scope.isProcessing = false;
                        $location.path('/myAccount');
                    },
                    function (error)
                    {
                        console.log("unable to delete network set");
                        $scope.isProcessing = false;
                        $location.path('/myAccount');
                    });
            },
            function () {
                $scope.isProcessing = false;
            });

        return;
    };


    // local functions

    $scope.showWarningsOrErrors = function(rowEntity) {

        if (!rowEntity && !rowEntity.externalId) {
            return;
        };

        uiMisc.showNetworkWarningsOrErrors(rowEntity, networkSetController.networkSearchResults);
    };

    $scope.getNetworkURL = function(networkUUID) {
        var url =  "#/network/" + networkUUID;

        if (networkSetController.accesskey) {
            url = url + "?accesskey=" + networkSetController.accesskey;
        };

        return url;
    };


    $scope.downloadNetwork= function(rowEntity) {
        uiMisc.downloadCXNetwork(rowEntity.externalId);
    }

    $scope.isOwnerOfNetwork = function(networkOwnerUUID)
    {
        if (!networkSetController.isLoggedInUser) {
            return false;
        };
        return (sharedProperties.getCurrentUserId() == networkOwnerUUID);
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
            "<strong>Error Message: </strong>" + errorMessage;

        ndexNavigation.genericInfoModal(title, body);

        return;
    };


    networkSetController.switchShareableURL = function() {

        var action = (networkSetController.networkSetShareableURL) ? "disable" : "enable";

        ndexService.disableOrEnableAccessKeyOnNetworkSetV2(networkSetController.identifier, action,
            function(data, status, headers, config, statusText) {

                if (action == 'enable') {
                    networkSetController.networkSetShareableURLLabel = deActivateURLLabel;
                    networkSetController.networkSetShareableURL =
                        uiMisc.buildShareableNetworkSetURL(data['accessKey'], networkSetController.identifier);

                } else {
                    networkSetController.networkSetShareableURLLabel = activateURLLabel;
                    networkSetController.networkSetShareableURL = null;
                };
            },
            function(error) {

                var failedAction = (action == 'enable') ? " Enable " : " Disable ";

                title = "Unable to " + failedAction + "URL";
                message  = "Unable to " + failedAction.toLowerCase() + " URL on network set <strong>" +
                    networkSetController.displayedSet['name'] + "</strong>.";

                if (error.message) {
                    message = message + '<br><br>' + error.message;
                };

                ndexNavigation.genericInfoModal(title, message);
            });
    };

    networkSetController.getStatusOfShareableURL = function() {
        ndexService.getAccessKeyOfNetworkSetV2(networkSetController.identifier,
            function(data) {

                if (!data) {
                    // empty string - access is deactivated
                    networkSetController.networkSetShareableURL = null;
                    networkSetController.networkSetShareableURLLabel = activateURLLabel;

                } else if (data['accessKey']) {
                    // received  data['accessKey'] - access is enabled
                    networkSetController.networkSetShareableURL =
                        uiMisc.buildShareableNetworkSetURL(data['accessKey'], networkSetController.identifier);
                    networkSetController.networkSetShareableURLLabel = deActivateURLLabel;

                } else {
                    // this should not happen; something went wrong; access deactivated
                    networkSetController.networkSetShareableURL = null;
                    networkSetController.networkSetShareableURLLabel = activateURLLabel;
                };
            },
            function(error) {
                title = "Unable to Get Status of URL";
                message  = "Unable to get status of share URL on network set <strong>" +
                    networkSetController.displayedSet['name'] + "</strong>.";

                if (error.message) {
                    message = message + '<br><br>' + error.message;
                };
                networkSetController.networkSetShareableURLLabel = null;

                ndexNavigation.genericInfoModal(title, message);
            });
    };

    /*
    networkSetController.switchShareableURLModal = function() {

        var action = (networkSetController.networkSetShareableURL) ? "disable" : "enable";

        if (action == "disable") {
            networkSetController.switchShareableURL(action);
            return;
        };

        //alert("enabling ... ");
        networkSetController.switchShareableURL(action);
    }
    */


    //                  PAGE INITIALIZATIONS/INITIAL API CALLS
    //------------------------------------------------------------------------------------
    networkSetController.getNetworksOfNetworkSet();

    $(window).resize(function() {

        $("#myNetworksOfSetGridId").height($(window).height() - windowsHeightCorrection);
        $scope.networkGridApi.grid.gridHeight = $("#myNetworksOfSetGridId").height();
        $scope.networkGridApi.core.refresh();
    })

    //------------------------------------------------------------------------------------//
}]);
