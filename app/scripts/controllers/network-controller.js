ndexApp.controller('networkController',
    ['provenanceService','networkService', 'ndexService', 'ndexConfigs', 'cyService','cxNetworkUtils',
         'ndexUtility', 'ndexHelper', 'ndexNavigation',
        'sharedProperties', '$scope', '$rootScope', '$routeParams', '$modal', '$modalStack',
        '$route', '$location', 'uiGridConstants', 'uiMisc', 'ndexSpinner', 'cyREST', '$timeout', /*'$filter', '$location','$q',*/
        function ( provenanceService, networkService, ndexService, ndexConfigs, cyService, cxNetworkUtils,
                   ndexUtility, ndexHelper, ndexNavigation,
                  sharedProperties, $scope, $rootScope, $routeParams, $modal, $modalStack,
                  $route , $location, uiGridConstants, uiMisc, ndexSpinner, cyREST , $timeout /*, $filter /*, $location, $q */)
        {
            var self = this;

            var cy;

            var currentNetworkSummary;
            var networkExternalId = $routeParams.identifier;
            var accesskey         = $routeParams.accesskey;


            sharedProperties.setCurrentNetworkId(networkExternalId);

            $scope.showFooter = false;

            $scope.networkController = {};

            var networkController  = $scope.networkController;
            networkController.isLoggedInUser = (window.currentNdexUser != null);
            networkController.networkOwner = {};

            networkController.privilegeLevel = "None";
            networkController.currentNetworkId = networkExternalId;
            networkController.accesskey = accesskey;

            networkController.errors = []; // general page errors
            networkController.queryErrors = [];
            networkController.displayProvenance = {};
            networkController.selectionContainer = {};
            networkController.baseURL = $location.absUrl();
            networkController.isSample=false;
            networkController.sampleSize = 0;
            networkController.isSamplePrevious=false;
            networkController.sampleSizePrevious=0;

            networkController.successfullyQueried = false;

            // turn on (show) Search menu item on the Nav Bar
            $scope.$parent.showSearchMenu = true;

            networkController.baseURL = networkController.baseURL.replace(/(.*\/).*$/,'$1');

            networkController.advancedQueryNodeCriteria = 'Source';
            networkController.advancedQueryEdgeProperties = [{}];
            networkController.advancedQueryNodeProperties = [{}];

            //networkController.networkAdmins = null;

            networkController.edgePropertyNamesForAdvancedQuery = undefined;
            networkController.nodePropertyNamesForAdvancedQuery = undefined;

            networkController.context = {};

            networkController.isAdmin = false;

            networkController.networkShareURL = null;
            networkController.visibility      = "";

            // get URL of this network without network access key; this URL is used
            // for copying it to clipboard if this Network is PUBLIC
            networkController.networkURL = uiMisc.buildNetworkURL(null, networkExternalId);


            // close any modal if opened.
            // We need to close a modal in case we come to this page
            // if we cloned a network and followed a link to the newly cloned network
            // from the "Network Cloned" information modal.
            //$modalStack.dismissAll('close');

            $scope.query = null;
            networkController.searchString = "";


            networkController.queryEdgeLimitToShowGraph     = 1000;
            networkController.queryEdgeLimitToShowTableOnly = 3000;
            networkController.warningShown                  = false;


            $(document).ready(function(){
                $('[data-toggle="tooltip"]').tooltip();

                $scope.setToolTips();
            });
            $scope.changeTitle = function(obj) {
                setTooltip("Copy network share URL to clipboard");
            };
            $scope.changeTitle2 = function(obj) {
                setTooltip2("Copy network URL to clipboard");
            };
            $scope.changeTitle3 = function(obj) {
                setTooltip3("Copy network DOI to clipboard");
            };

            var clipboard  = new Clipboard('#copyNetworkShareURLToClipboardId1');
            var clipboard2 = new Clipboard('#copyNetworkShareURLToClipboardId2');
            var clipboard3 = new Clipboard('#copyNetworkShareURLToClipboardId3');

            function setTooltip(message) {
                $('#copyNetworkShareURLToClipboardId1').tooltip('hide')
                    .attr('data-original-title', message)
                    .tooltip('show');
            }
            function setTooltip2(message) {
                $('#copyNetworkShareURLToClipboardId2').tooltip('hide')
                    .attr('data-original-title', message)
                    .tooltip('show');
            }
            function setTooltip3(message) {
                $('#copyNetworkShareURLToClipboardId3').tooltip('hide')
                    .attr('data-original-title', message)
                    .tooltip('show');
            }
            clipboard.on('success', function(e) {
                setTooltip('Copied');
            });
            clipboard2.on('success', function(e) {
                setTooltip2('Copied');
            });
            clipboard3.on('success', function(e) {
                setTooltip3('Copied');
            });

            $scope.setToolTips = function(){
                var myToolTips = $('[data-toggle="tooltip"]');
                myToolTips.tooltip();
            };


            function setTooltipForSwitchViewButton(message) {
                $('#switchViewButtonId1').tooltip('hide')
                    .attr('data-original-title', message)
                    .tooltip('show');

                $('#switchViewButtonId2').tooltip('hide')
                    .attr('data-original-title', message)
                    .tooltip('show');
            };

            $scope.changeCytoscapeButtonTitle = function() {
                $('#openInCytoscapeButtonId').tooltip('hide')
                    .attr('data-original-title', $scope.openInCytoscapeTitle)
                    .tooltip('show');
            };

            $scope.changeShareButtonTitle = function() {
                $('#shareButtonId').tooltip('hide')
                    .attr('data-original-title', $scope.shareTitle)
                    .tooltip('show');
            };

            $scope.changeEditButtonTitle = function() {
                $('#editButtonId').tooltip('hide')
                    .attr('data-original-title', $scope.editPropertiesButtonTitle)
                    .tooltip('show');
            };

            $scope.changeRequestDOITitle = function() {
                $('#requestDOIId').tooltip('hide')
                    .attr('data-original-title', $scope.requestDOITitle)
                    .tooltip('show');
            };

            $scope.changeReadOnlyButtonTitle = function() {
                var title =
                    networkController.hasMultipleSubNetworks() ?
                        $scope.editPropertiesButtonTitle :
                        'Only network owners can set/unset Read Only flag';

                $('#readOnlyButtonId').tooltip('hide')
                    .attr('data-original-title', title)
                    .tooltip('show');
            };


            $scope.activeTab = "Edges";

            $scope.activateTab = function(tabName){
                $scope.activeTab = tabName;

                if('Edges' == tabName) {
                    $("#edgeGridId").height($(window).height() - 235);
                    $scope.edgeGridApi.core.refresh();

                } else if ('Nodes' == tabName) {
                    $("#nodeGridId").height($(window).height() - 235);
                    $scope.nodeGridApi.core.refresh();
                }
            };


            $scope.changeExportNetworkTitle  = function() {
                $('#exportNetworkId').tooltip('hide')
                    .attr('data-original-title', $scope.exportTitle)
                    .tooltip('show');
            };

            $scope.changeUpgradePermissionTitle  = function() {
                $('#upgradePermissionTitleId').tooltip('hide')
                    .attr('data-original-title', $scope.upgradePermissionTitle)
                    .tooltip('show');
            };

            $scope.changeDeleteNetworkTitle  = function() {
                $('#deleteNetwoprkTitleId').tooltip('hide')
                    .attr('data-original-title', $scope.deleteTitle)
                    .tooltip('show');
            };

            $scope.changeDisabledQueryTitle1 = function() {
                $('#disabledQueryId1').tooltip('hide')
                    .attr('data-original-title', $scope.disabledQueryTooltip)
                    .tooltip('show');
            };
            $scope.changeDisabledQueryTitle2 = function() {
                $('#disabledQueryId2').tooltip('hide')
                    .attr('data-original-title', $scope.disabledQueryTooltip)
                    .tooltip('show');
            };
            $scope.changeDisabledQueryTitle3 = function() {
                $('#disabledQueryId3').tooltip('hide')
                    .attr('data-original-title', $scope.disabledQueryTooltip)
                    .tooltip('show');
            };
            $scope.changeDisabledQueryTitle4 = function() {
                $('#disabledQueryId4').tooltip('hide')
                    .attr('data-original-title', $scope.disabledQueryTooltip)
                    .tooltip('show');
            };

            networkController.tabs = [
                {"heading": "Network Info", 'active':true},
                {'heading': 'Nodes/Edges', 'active': false, 'disabled': true},
                {'heading': 'Provenance', 'active': false},
                {'heading': 'Advanced Query', 'hidden': true, 'active': false}
            ];

            networkController.queryWarnings = [];
            networkController.queryErrors   = [];


            networkController.subNetworkId = null;
            networkController.noOfSubNetworks = 0;

            networkController.networkSets = [];

            networkController.isNetworkOwner = false;

            networkController.otherProperties = [];


            $scope.requestDOITitle           = "";
            $scope.exportTitle               = "";
            $scope.upgradePermissionTitle    = "";
            $scope.shareTitle                = "";
            $scope.deleteTitle               = "";
            $scope.openInCytoscapeTitle      = "Checking status ...";

            $scope.disabledQueryTooltip      = "The Advanced Query feature is being improved and will be back soon!";

            $scope.disableQuery = false;

            $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

            var spinnerId = "spinnerId";

            $scope.showAdvancedQuery = true;


            //networkController.prettyStyle = "no style yet";
            //networkController.prettyVisualProperties = "nothing yet";
            var resetBackgroudColor = function () {
                networkController.bgColor = '#8fbdd7';
            };

            var localNetwork = undefined;

            var spinner = undefined;

            networkController.hasMultipleSubNetworks = function() {
                return (networkController.noOfSubNetworks >= 1);
            };

            $scope.isDOIPending = function() {
                return uiMisc.isDOIPending(networkController.currentNetwork);
            };
            $scope.isDOIAssigned = function() {
                return uiMisc.isDOIAssigned(networkController.currentNetwork);
            };
            $scope.isNetworkCertified = function() {
                return uiMisc.isNetworkCertified(networkController.currentNetwork);
            };


            $scope.showEdgeCitations = function(edgeKey)
            {
                if (localNetwork && localNetwork.edgeCitations && localNetwork.edgeCitations[edgeKey])
                {
                    // get list/array of citation IDs
                    var citationsIDs = localNetwork.edgeCitations[edgeKey];
                    var edgeCitations = getCitations(citationsIDs);
                    showCitations(edgeCitations);
                };
            };

            $scope.showNodeCitations = function(nodeKey)
            {
                if (localNetwork && localNetwork.nodeCitations && localNetwork.nodeCitations[nodeKey])
                {
                    // get list/array of citation IDs
                    var citationsIDs = localNetwork.nodeCitations[nodeKey];
                    var nodeCitations = getCitations(citationsIDs);
                    showCitations(nodeCitations);
                }
            };

            $scope.linkify = function(cellContents)
            {
                var returnStr = '';

                if (typeof(cellContents) === 'undefined' || cellContents === '' || cellContents == null) {
                    return returnStr;
                }

                if (typeof(cellContents) === 'object') {
                    // this is the case where cellContents is as list/array ... so just
                    // return it wraped in <title>. It will be converted to a comma-separated string of values
                    // returnStr =  '<span title=' + "'"+ cellContents + "'>" + cellContents + '</span>';

                    _.forEach(cellContents, function(element) {

                        var linkifiedElement = getStringAttributeValue(element);
                        if (returnStr) {
                            returnStr = returnStr + ', ' + linkifiedElement;
                        } else {
                            returnStr = linkifiedElement;
                        }
                    });

                    returnStr =  '<span title=' + '"' + cellContents + '">' + returnStr + '</span>';

                } else if (typeof(cellContents) === 'string') {
                    if (cellContents.startsWith('http')) {
                        returnStr = '&nbsp;<a target="_blank" href="' + cellContents + '">External Link</a>';
                    }
                    else {
                        linkifiedElement = getStringAttributeValue(cellContents);

                        returnStr =  '<span title=' + '"' + cellContents + '">' + linkifiedElement + '</span>';
                    }
                }

                return returnStr;
            };

            $scope.getNumEdgeCitations = function(edgeKey)
            {
                var numOfCitations = 0;
                
                if (localNetwork && localNetwork.edgeCitations && localNetwork.edgeCitations[edgeKey]) {
                    numOfCitations = localNetwork.edgeCitations[edgeKey].length;
                }
                return numOfCitations;
            };

            $scope.getNumEdgeNdexCitations = function(citations)
            {
                var numOfCitations = 0;

                if (citations) {
                    if (_.isArray(citations)) {
                        numOfCitations = citations.length;

                    } else if (_.isString(citations)) {
                        numOfCitations = 1;

                    }
                }

                return numOfCitations;
            };

            $scope.getNumNodeCitations = function(nodeKey)
            {
                var numOfCitations = 0;

                if (localNetwork && localNetwork.nodeCitations && localNetwork.nodeCitations[nodeKey]) {
                    numOfCitations = localNetwork.nodeCitations[nodeKey].length;
                }
                return numOfCitations;
            };

            $scope.getNumNodeAttributes = function(nodeAttributesObj)
            {
                var numOfNodeAttributes = 0;
                if (nodeAttributesObj && nodeAttributesObj['v']) {
                    numOfNodeAttributes = nodeAttributesObj['v'].length;
                }
                return numOfNodeAttributes;
            };
            $scope.getNumEdgeAttributes = function(edgeAttributesObj)
            {
                var numOfEdgeAttributes = 1;

                if (edgeAttributesObj && Array.isArray(edgeAttributesObj)) {
                    numOfEdgeAttributes = edgeAttributesObj.length;
                }
                return numOfEdgeAttributes;
            };


            $scope.getInternalNetworkUUID = function(nodeAttributeInternalLink)
            {
                var markup = parseNdexMarkupValue(nodeAttributeInternalLink);
                return (markup && markup.id) ? markup.id : null;
            };

             $scope.getURLForMapNode = function(attribute) {

                 if (!attribute) {
                    return null;
                 };

                 var url = null;
                 var markup = parseNdexMarkupValue(attribute);

                 if (markup && markup.id) {
                     url = networkController.baseURL + markup.id;
                 };
                 return url;
             };


            $scope.showNodeAttributes = function(attributesObj)
            {
                if (attributesObj && attributesObj['n'] && attributesObj['v'] && attributesObj['v'].length > 0) {
                    var attributeName = attributesObj['n'];
                    networkController.showMoreAttributes(attributeName, attributesObj);
                }
            };

            $scope.edgeGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                onRegisterApi: function( gridApi )
                {
                    $scope.edgeGridApi = gridApi;

                    gridApi.core.on.rowsRendered($scope, function() {
                        // we need to call core.handleWindowResize() to fix the table layout in case it is distorted
                        setTimeout($scope.edgeGridApi.core.handleWindowResize, 250);
                    });
                }
            };

            $scope.nodeGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                onRegisterApi: function( gridApi )
                {
                    $scope.nodeGridApi = gridApi;

                    gridApi.core.on.rowsRendered($scope, function() {
                        // we need to call core.handleWindowResize() to fix the table layout in case it is distorted
                        setTimeout($scope.nodeGridApi.core.handleWindowResize, 250);
                    });
                }
            };


            var INCOMPLETE_QUERY_CODE = -1;
            var EMPTY_QUERY_CODE = 0;
            var VALID_QUERY_CODE = 1;


            networkController.searchDepths = [
                {
                    "name": "1-step",
                    "description": "1-step",
                    "value": 1,
                    "id": "1"
                },
                {
                    "name": "2-step",
                    "description": "2-step",
                    "value": 2,
                    "id": "2"
                },
                {
                    "name": "Interconnect",
                    "description": "Interconnect",
                    "value": 3,
                    "id": "3"
                }
            ];

            networkController.searchDepth = {
                "name": "1-step",
                "description": "1-step",
                "value": 1,
                "id": "1"
            }


            $scope.currentView = "Graphic";
            $scope.buttonLabel = "Table";
            $scope.switchViewButtonEnabled = true;
            $scope.beforeQueryView = null;

            $scope.showNetworkSample = function() {
                return (($scope.currentView == "Graphic") && networkController.isSample && (networkController.sampleSize > 0));
            };

            $scope.switchView = function() {
                if (!$scope.switchViewButtonEnabled) {
                    return;
                };

                if ($scope.currentView == "Graphic") {
                    // switch to table view
                    $scope.currentView = "Table";
                    $scope.buttonLabel = "Graph";

                    setTooltipForSwitchViewButton("Switch to Graphic View");

                    var enableFiltering = true;
                    var setGridWidth = true;

                    localNetwork = networkService.getCurrentNiceCX();

                    populateEdgeTable(localNetwork, enableFiltering, setGridWidth);
                    populateNodeTable(localNetwork, enableFiltering, setGridWidth);

                } else if  ($scope.currentView == 'Table') {

                    if (('neighborhood' === $scope.query) && !networkController.warningShown &&
                        networkController.currentNetwork.edgeCount &&
                        ((networkController.currentNetwork.edgeCount > networkController.queryEdgeLimitToShowGraph) &&
                        (networkController.currentNetwork.edgeCount <= networkController.queryEdgeLimitToShowTableOnly))) {
                        //

                        var title = 'Performance Notice';
                        var message =  'Your query result is ' + networkController.currentNetwork.edgeCount +
                            ' edges and graphic rendering may be slow.  <br> <br>' +
                            '<strong>Would you like to switch to Graphic View?';

                        var dismissModal = true;

                        ndexNavigation.openConfirmationModal(title, message, "Switch to Graph", "Cancel", dismissModal,
                            function () {

                                networkController.warningShown = true;

                                // switch to graphic view
                                $scope.currentView = "Graphic";
                                $scope.buttonLabel = "Table";

                                setTooltipForSwitchViewButton("Switch to Table View");

                                if ($scope.drawCXNetworkOnCanvasWhenViewSwitched) {
                                    $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

                                    localNetwork = networkService.getCurrentNiceCX();

                                    checkIfCanvasIsVisibleAndDrawNetwork();
                                }

                                return;
                            },
                            function () {

                                return;
                            });
                    } else {

                        // switch to graphic view
                        $scope.currentView = "Graphic";
                        $scope.buttonLabel = "Table";

                        setTooltipForSwitchViewButton("Switch to Table View");

                        if ($scope.drawCXNetworkOnCanvasWhenViewSwitched) {
                            $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

                            localNetwork = networkService.getCurrentNiceCX();

                            checkIfCanvasIsVisibleAndDrawNetwork();
                        }
                    }
                }

            };

            function checkIfCanvasIsVisibleAndDrawNetwork() {
                if($('#cytoscape-canvas').is(':visible')) {
                    drawCXNetworkOnCanvas(localNetwork, false);
                } else {
                    setTimeout(checkIfCanvasIsVisibleAndDrawNetwork, 50);
                };
            };



            $scope.saveAsTSV = function() {

                var anchor = document.createElement('a');
                var textToSaveInTheFile = networkService.getTSVOfCurrentNiceCX();

                var currentNetworkCXName = networkService.getCurrentNetworkName();
                var outputFileName = (currentNetworkCXName) ?
                    currentNetworkCXName : networkController.currentNetwork.name;

                outputFileName += '.txt';

                anchor.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(textToSaveInTheFile));
                anchor.setAttribute('download', outputFileName);

                document.body.appendChild(anchor);
                anchor.click();

                document.body.removeChild(anchor);

                return;
            };


            $scope.networkToCytoscape = function() {

                $scope.openInCytoscapeTitle = "Opening " + networkController.currentNetwork.name +
                    " in Cytoscape...";

                var serverURL  = cyREST.getNdexServerUriHTTP();

                var postData = {
                    'serverUrl': serverURL,
                    'uuid': networkExternalId
                };

                if (accesskey) {
                    postData.accessKey = accesskey;

                } else if ((networkController.visibility == 'private') && networkController.networkShareURL) {
                    var splitURLArray = networkController.networkShareURL.split("accesskey=");
                    if (splitURLArray.length == 2) {
                        postData.accessKey = splitURLArray[1];
                    };
                };

                cyREST.exportNetworkToCytoscape(postData,
                    function(data, status, headers, config, statusText) {

                        // show the "Opened" tooltip ...
                        $scope.openInCytoscapeTitle = "Opened";
                        $scope.changeCytoscapeButtonTitle();

                        // remove the "Opened" after 2 secs
                        $timeout( function(){
                            $scope.openInCytoscapeTitle = "";
                        }, 2000 );

                    },
                    function(data, status, headers, config, statusText) {
                        console.log('unable to open network in Cytoscape error');

                        $scope.openInCytoscapeTitle = "Unable to open this network in Cytoscape";
                        $scope.changeCytoscapeButtonTitle();

                        $timeout( function(){
                            $scope.openInCytoscapeTitle = "";
                        }, 2000 );

                    });
            };

            $scope.setReturnView = function(view) {
                sharedProperties.setNetworkViewPage(view);
            }



            var enableSimpleQueryElements = function () {
                var nodes = document.getElementById("simpleQueryNetworkViewId").getElementsByTagName('*');
                for(var i = 0; i < nodes.length; i++){
                    nodes[i].disabled = false;
                }
                $('#saveQueryButton').prop('disabled', false);
            };


            // this function gets called when user navigates away from the current Graphic View page.
            // (can also use "$locationChangeStart" instead of "$destroy"
            $scope.$on("$destroy", function(){

                // hide the Search menu item in Nav Bar
                $scope.$parent.showSearchMenu = false;

                uiMisc.showSearchMenuItem();

                networkService.clearNiceCX();
            });

            /*
            $scope.$watch(function(){
                return $location.path();
            }, function(newPath, oldPath){
                console.log('oldPath = ' + oldPath + '  newPath = ' + newPath );
            })
            */

            var getCitationLink = function (identifier) {
                //if( !networkController.hasCitation(citationId) )
                //    return "javaScript:void(0)";
                var retLink = "";

                if (identifier) {
                    if (identifier.startsWith('http')) {
                        retLink = identifier;
                    } else {
                        retLink = 'http://www.ncbi.nlm.nih.gov/pubmed/' + identifier.split(':')[1];
                    };
                };
                return retLink;
            };

            var getCitations = function(citationsIDs)
            {
                var citations = (localNetwork && localNetwork.citations) ? localNetwork.citations : "";

                var result = [];
                for (var i=0; i<citationsIDs.length; i++)
                {
                    var citationObj = citations[citationsIDs[i]];
                    var citation = {};

                    if (citationObj['@id']) {
                        citation['id'] = citationObj['@id'];
                    }
                    if (citationObj['dc:contributor']) {
                        citation['contributor'] = citationObj['dc:contributor'];
                    }
                    if (citationObj['dc:description']) {
                        citation['description'] = citationObj['dc:description'];
                    }
                    if (citationObj['dc:identifier']) {
                        citation['identifier'] = citationObj['dc:identifier'];
                    }
                    if (citationObj['dc:title']) {
                        citation['title'] = citationObj['dc:title'];
                    }
                    if (citationObj['dc:type']) {
                        citation['type'] = citationObj['dc:type'];
                    }
                    if (citationObj['attributes'].length>0) {
                        citation['attributes'] = JSON.stringify(citationObj['attributes']);
                    }
                    citation['link'] = getCitationLink(citation['identifier']);

                    result.push( citation );
                }
                return result;
            };

            var showCitations = function(citations)
            {
                var modalInstance = $modal.open({
                    animation: true,
                    templateUrl: 'citations.html',
                    controller: 'CitationModalCtrl',
                    resolve: {
                        citations: function () {
                            return citations;
                        }
                    }
                });
            };


            $scope.activateAdvancedQueryTab = function() {

                networkController.previousNetwork = networkController.currentNetwork;
                //networkService.saveCurrentNiceCXBeforeQuery();
                $scope.query = 'advanced';

                //populate the node and edge properties

                if ( networkController.edgePropertyNamesForAdvancedQuery == undefined) {

                    networkController.edgePropertyNamesForAdvancedQuery = [];
                    networkController.nodePropertyNamesForAdvancedQuery = [];
                    populateNodeAndEdgeAttributesForAdvancedQuery();
                }

                for (var i = 0; i < 2; i++) {
                    networkController.tabs[i].active = false;
                }

                networkController.tabs[3].active = true;
                networkController.tabs[3].disabled = false;
                networkController.tabs[3].hidden = false;

                // disable all elements in the Simple Query
                var nodes = document.getElementById("simpleQueryNetworkViewId").getElementsByTagName('*');
                for(var i = 0; i < nodes.length; i++){
                    nodes[i].disabled = true;
                }

                $scope.disableQuery = true;
            }
            
            
            $scope.build_provenance_view = function() {
                provenanceService.showProvenance(networkController);
            };

            $scope.getProvenanceTitle = function(prov)
            {
               return provenanceService.getProvenanceTitle(prov);
            };


            networkController.refreshProvMap = function (obj) {
                $scope.$apply(function () {
                    networkController.displayProvenance = obj;
                });
            };

            /*
            var getNetworkAdmins = function()
            {
                if (networkController.isLoggedInUser) {
                    ndexService.getNetworkUserMemberships(networkController.currentNetworkId, 'ADMIN',
                        function (networkAdmins) {
                            for (var i = 0; i < networkAdmins.length; i++) {
                                var networkAdmin = networkAdmins[i];
                                if (networkAdmin.memberUUID == sharedProperties.getCurrentUserId()) {
                                    networkAdmins.splice(i, 1);
                                }
                            }
                            networkController.networkAdmins = networkAdmins;
                        },
                        function (error) {
                            var errorMessageText;
                            if (error) {
                                if (error.status) {
                                    errorMessageText = "HTTP response code: " + error.status + ". ";
                                }
                                if (error.data && error.data.message) {
                                    errorMessageText = errorMessageText + error.data.message;
                                }
                            }
                            console.log(errorMessageText);
                        });
                }
            };
            */

       /*     $scope.getNetworkDownloadLink = function(currentNetwork) {
                //var visibility = networkController.currentNetwork.visibility;
                if (currentNetwork) {
                    var rowEntity = {
                        'Visibility': currentNetwork.visibility,
                        'externalId': currentNetwork.externalId
                    };
                    return uiMisc.getNetworkDownloadLink(networkController, rowEntity);
                };

                return;
            }; */

            $scope.downloadNetwork = function () {
                uiMisc.downloadCXNetwork(networkExternalId);
            }

            var parseNdexMarkupValue = function ( value ) {
                return {n:  value.replace(/(\[(.*)\])?\(.*\)$/, '$2'),
                        id: value.replace(/(\[.*\])?\((.*)\)$/, "$2")};
            };


            var validateEntityID = function(URI, entityId) {
                var retValue = false;

                if (!URI || !entityId) {
                    return retValue;
                }
                
                switch (URI.toLowerCase()) {

                    case 'http://identifiers.org/bindingDB/':
                        retValue = /^\d+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/cas/':
                        retValue = /^\d{1,7}\-\d{2}\-\d$/.test(entityId);
                        break;

                    case 'http://identifiers.org/chebi/':
                        retValue = /^CHEBI:\d+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/chembl.compound/':
                        retValue = /^CHEMBL\d+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/drugbank/':
                        retValue = /^DB\d{5}$/.test(entityId);
                        break;

                    case 'http://identifiers.org/go/':
                        retValue = /^GO:\d{7}$/.test(entityId);
                        break;

                    case 'http://identifiers.org/hgnc/':
                        retValue = /^((HGNC|hgnc):)?\d{1,5}$/.test(entityId);
                        break;

                    case 'http://identifiers.org/hgnc.symbol/':
                        retValue = /^[A-Za-z-0-9_]+(\@)?$/.test(entityId);
                        break;

                    case 'http://identifiers.org/biogrid/':
                        retValue = /^\d+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/intact/':
                        retValue = /^EBI\-[0-9]+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/kegg.compound/':
                        retValue = /^C\d+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/kegg.pathway/':
                        retValue = /^\w{2,4}\d{5}$/.test(entityId);
                        break;

                    case 'http://identifiers.org/ncbigene/':
                        retValue = /^\d+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/pubmed/':
                        retValue = /^\d+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/reactome/':
                        retValue = /(^(REACTOME:)?R-[A-Z]{3}-[0-9]+(-[0-9]+)?$)|(^REACT_\d+$)/.test(entityId);
                        break;

                    case 'http://identifiers.org/refseq/':
                        retValue =
                           /^((AC|AP|NC|NG|NM|NP|NR|NT|NW|XM|XP|XR|YP|ZP)_\d+|(NZ\_[A-Z]{4}\d+))(\.\d+)?$'/.test(entityId);
                        break;

                    case 'http://identifiers.org/omim/':
                        retValue = /^[*#+%^]?\d{6}$/.test(entityId);
                        break;

                    case 'http://identifiers.org/pdb/':
                        retValue = /^[0-9][A-Za-z0-9]{3}$/.test(entityId);
                        break;

                    case 'http://identifiers.org/rgd/':
                        retValue = /^\d{4,7}$/.test(entityId);
                        break;

                    case 'http://identifiers.org/uniprot/':
                        retValue =
                            /^([A-N,R-Z][0-9]([A-Z][A-Z, 0-9][A-Z, 0-9][0-9]){1,2})|([O,P,Q][0-9][A-Z, 0-9][A-Z, 0-9][A-Z, 0-9][0-9])(\.\d+)?$/.test(entityId);
                        break;

                    case 'http://identifiers.org/mgd/':
                        retValue = /^MGI:\d+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/sgd/':
                        retValue = /^((S\d+$)|(Y[A-Z]{2}\d{3}[a-zA-Z](\-[A-Z])?))$/.test(entityId);
                        break;


                    case 'http://identifiers.org/ricegap/':
                        retValue = /^LOC\_Os\d{1,2}g\d{5}$/.test(entityId);
                        break;

                    case 'http://identifiers.org/mesh/':
                        retValue = /^(C|D)\d{6}$/.test(entityId);
                        break;

                    case 'http://identifiers.org/pubchem.compound/':
                        retValue = /^\d+$/.test(entityId);
                        break;

                    case 'http://identifiers.org/tair.locus/':
                        retValue = /^AT[1-5]G\d{5}$/.test(entityId);
                        break;

                    case 'http://gdc-portal.nci.nih.gov/projects/':
                        if (!entityId) {
                            return false;
                        };

                        retValue = /^TCGA-[A-Z]+$/.test(entityId);
                        if (!retValue) {
                            retValue = /^TARGET-[A-Z]+$/.test(entityId);
                        };
                        break;
                }

                return retValue;
            }


            var getStringAttributeValue = function(attribute) {

                if (!attribute) {
                    return null;
                }

                var attributeValue =
                    ((attribute instanceof Object) && (attribute['dc:identifier'])) ?
                    attribute['dc:identifier'] : attribute;

                attribute = attributeValue;

                var attr = attributeValue.toLowerCase();

                if ((attr.startsWith('http://') || attr.startsWith('https://'))
                    && !attr.startsWith('http://biopax') && !attr.startsWith('http://www.biopax')
                    && !attr.startsWith('http://purl') && !attr.startsWith('http://www.purl')) {

                    attributeValue = '<a target="_blank" href="' + attribute + '">External Link</a>';
                    return attributeValue;

                } else if (attr.startsWith('www.')) {
                    attributeValue = '<a target="_blank" href="http://' + attribute + '">External Link</a>';
                    return attributeValue;

                };

                var splitString = attribute.split(":");
                if ((splitString.length != 2) && (splitString.length != 3)) {
                    return attributeValue;
                }

                var prefix = splitString[0].toLowerCase();
                var value  = (splitString.length == 3) ? (splitString[1] + ":" + splitString[2]) : splitString[1];
                var URI;

                if (prefix in networkController.context) {
                    URI = networkController.context[prefix];
                    //if (!URI.endsWith("/")) {
                    //    URI = URI + "/";
                    //}

                    if (value.startsWith('CHEMBL')) {
                        // remove ":" from  CHEMBL since the pattern for CHEMBL Id is '^CHEMBL\d+$'
                        value = value.replace(':', '');
                    }

                    /*
                    if (validateEntityID(URI, value)) {
                        attributeValue = '<a target="_blank" href="' + URI + value + '">' + attribute + '</a>';
                    };
                    */

                    if (attr.startsWith('go:')) {
                        attributeValue = '<a target="_blank" href="' + URI + attributeValue + '">' + attributeValue + '</a>';
                    } else {
                        attributeValue = '<a target="_blank" href="' + URI + value + '">' + attribute + '</a>';
                    };

                    return attributeValue;
                }


                if (attr.startsWith('ncbi')) {

                    // valid  NCBI gene Entity identifier consists of all numbers and is described by this
                    // regular expression: '^\d+$';

                    var isValidNCBIId = /^\d+$/.test(value);

                    if (isValidNCBIId) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/ncbigene/' + value + '">' + attribute + '</a>';
                    }

                } else if (attr.startsWith('uniprot')) {

                    var isUniprotidValid = /^([A-N,R-Z][0-9]([A-Z][A-Z, 0-9][A-Z, 0-9][0-9]){1,2})|([O,P,Q][0-9][A-Z, 0-9][A-Z, 0-9][A-Z, 0-9][0-9])(\.\d+)?$/.test(value);

                    if (isUniprotidValid) {
                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/uniprot/' + value + '">'
                            + attribute + '</a>';
                    }

                } else if (attr.startsWith('tair')) {

                    var isValidTair = /^AT[1-5]G\d{5}$/.test(value);

                    if (isValidTair) {
                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/tair.locus/' + value + '">'
                            + attribute + '</a>';
                    }

                } else if (attr.startsWith('hgnc:')) {

                    // namespace: hgnc;  URI: http://identifiers.org/hgnc/;  Pattern: '^((HGNC|hgnc):)?\d{1,5}$'
                    var isHgncIdValid = /^\d{1,5}$/.test(value);

                    if (isHgncIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/hgnc/' + value + '">'
                            + attribute + '</a>';

                    }

                } else if (attr.startsWith('hgnc.symbol:')) {

                    // namespace: hgnc.symbol;  URI: http://identifiers.org/hgnc.symbol/;  Pattern: '^[A-Za-z-0-9_]+(\@)?$'
                    var isHgncSymbolIdValid = /^[A-Za-z-0-9_]+(\@)?$/.test(value);

                    if (isHgncSymbolIdValid) {
                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/hgnc.symbol/' + value + '">'
                            + attribute + '</a>';

                    }

                } else if (attr.startsWith('chebi')) {

                    // valid CHEBI Entity identifier is described by this
                    // regular expression: '^CHEBI:\d+$'
                    var isCHEBIIdValid = /^CHEBI:\d+$/.test(value);

                    if (isCHEBIIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/chebi/' + value + '">' + attribute + '</a>';

                    } else if (!isNaN(value)) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/chebi/CHEBI:' + value + '">'
                            + attribute + '</a>';
                    }

                } else if (attr.startsWith('chembl')) {

                    if (!isNaN(value)) {

                        // valid CHEMBL Compound Entity identifier is described by this
                        // regular expression: '^CHEMBL\d+$'
                        // but here we know that value is a number, so no need to use regex for validating

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/chembl.compound/CHEMBL' + value + '">'
                            + attribute + '</a>';
                    }

                } else if (attr.startsWith('kegg.compound:')) {

                    // valid KEGG Compound Entity identifier is described by this
                    // regular expression: '^C\d+$'; let's validate it (we allow the Id to start with
                    // lower- or upper- case "C"  ("C" or "c")

                    var isKeggCompoundIdValid = /^[cC]\d+$/.test(value);

                    if (isKeggCompoundIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/kegg.compound/' +
                                value.toUpperCase() + '">' + attribute + '</a>';
                    }

                } else if (attr.startsWith('pubchem.compound:') || attr.startsWith('cid:')) {

                    var entityId = splitString[1];

                    // valid Pubchem Compound Entity identifier is described by this
                    // regular expression: '^\d+$';
                    var isPubchemCompoundIdValid = /^\d+$/.test(value);

                    if (isPubchemCompoundIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/pubchem.compound/' +
                            value + '">' + attribute + '</a>';
                    }

                } else if (attr.startsWith('sid:')) {

                    var entityId = splitString[1];

                    // valid Pubchem Substance Entity identifier is described by this
                    // regular expression: '^\d+$';
                    var isPubchemSubstanceIdValid = /^\d+$/.test(value);

                    if (isPubchemSubstanceIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/pubchem.substance/' +
                            value + '">' + attribute + '</a>';
                    }

                } else if (attr.startsWith('pmid:')) {

                    var entityId = splitString[1];

                    // valid PubMed Substance Entity identifier is described by this
                    // regular expression: '^\d+$';
                    var isPubMedIdValid = /^\d+$/.test(value);

                    if (isPubMedIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/pubmed/' +
                            value + '">' + attribute + '</a>';
                    }

                } else if (attributeValue.startsWith('BTO:')) {

                    var entityId = splitString[1];

                    // valid BTO Entity identifier is described by this
                    // regular expression: '^BTO:\d{7}$';
                    var isBTOIdValid = /^BTO:\d{7}$/.test(attributeValue);

                    if (isBTOIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/bto/' +
                            attributeValue + '">' + attributeValue + '</a>';
                    }

                } else if (attr.startsWith('signor:')) {

                    var entityId = splitString[1];

                    //var isBTOIdValid = /^BTO:\d{7}$/.test(value);

                    //if (isBTOIdValid) {

                    attributeValue =
                        '<a target="_blank" href="http://signor.uniroma2.it/relation_result.php?id=' +
                        value + '">' + attribute + '</a>';

                } else if (attr.startsWith('go:')) {

                    var entityId = splitString[1];

                    var isGOIdValid = /^GO:\d{7}$/.test(attributeValue);

                    if (isGOIdValid) {
                        attributeValue = '<a target="_blank" href="http://identifiers.org/go/' +
                            attributeValue + '">' + attributeValue + '</a>';
                    }

                } else if (attr.startsWith('gdc:')) {

                    // valid GDC projects are listed at https://portal.gdc.cancer.gov/projects/t
                    var isGDCIdValid = /^TCGA-[A-Z]+$/.test(value);

                    if (!isGDCIdValid) {
                        isGDCIdValid = /^TARGET-[A-Z]+$/.test(value);
                    };

                    if (isGDCIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://gdc-portal.nci.nih.gov/projects/' +
                            value + '">' + attribute + '</a>';
                    };
                }

                return attributeValue;
            }


            $scope.getNodeName = function(node)
            {
                return networkService.getNodeName(node);
            };


            $scope.removeHiddenAttributes = function(attributeNames) {

                var attributeNamesWithoutHiddenElements = [];

                // remove all attributes that start with two undescores ("__") - these attributes are "hidden",
                // i.e., they are for internal use and should not be shown to the user
                _.forEach(attributeNames, function(attribute) {

                    if (attribute && !attribute.startsWith("__")) {
                        attributeNamesWithoutHiddenElements.push(attribute);
                    };
                });

                return attributeNamesWithoutHiddenElements;
            };


            $scope.getNodeAttributesNames = function(node) {

                var nodeAttributeNames = _.keys(node);
                var attributeNames     =  $scope.removeHiddenAttributes(nodeAttributeNames);

                var resultList = ['id'];

                //First section has these attributes in order if they exists
                var topList = ['n', 'r','alias','relatedTo','citations'];
                _(topList).forEach(function (value) {
                    if (node[value]) {
                        resultList.push(value);
                    }
                });

                var elementsToRemove = topList.concat([ '_cydefaultLabel', 'id', '$$hashKey', '$$expanded', 'pmid']);

                for (i = 0; i < elementsToRemove.length; i++) {

                    var index = attributeNames.indexOf(elementsToRemove[i]);
                    if (index > -1) {
                        attributeNames.splice(index, 1);
                    }
                };

                // here, we want the last elements in resultList to be ndex:internalLink and ndex:externalLink (if
                // they are present in attributeNames).  So we remove them from attributeNames, and then add them
                // to the end of the list.
                // This is done so that they are in the same order in the Nodes/Edges tab on the right  as in pop-up
                // Qtip menu (when clicking on a node in a network map).
                var links = [];
                var ndexInternalLink = 'ndex:internalLink';
                var ndexExternalLink = 'ndex:externalLink';

                if (attributeNames.indexOf(ndexInternalLink) > -1) {
                    links.push(ndexInternalLink);
                    _.pull(attributeNames, ndexInternalLink);
                };
                if (attributeNames.indexOf(ndexExternalLink) > -1) {
                    links.push(ndexExternalLink);
                    _.pull(attributeNames, ndexExternalLink);
                };

                resultList = resultList.concat(attributeNames);
                if (links.length > 0) {
                    resultList = resultList.concat(links);
                };

                return resultList;
            };

            $scope.getEdgeAttributesNames = function(node) {

                var edgeAttributeNames  = _.keys(node);
                var attributeNames      =  $scope.removeHiddenAttributes(edgeAttributeNames);

                var elementsToRemove = ['s', 't', 'i', 'id', '$$hashKey', '$$expanded', 'pmid'];

                for (i = 0; i < elementsToRemove.length; i++) {

                    var index = attributeNames.indexOf(elementsToRemove[i]);
                    if (index > -1) {
                        attributeNames.splice(index, 1);
                    }
                };

                return attributeNames;
            };

            var getURLForNdexInternalLink = function(attribute) {

                if (!attribute) {
                    return null;
                };

                var url = null;
                var markup = parseNdexMarkupValue(attribute);

                if (markup.id) {
                    var url = networkController.baseURL + markup.id;

                    url =
                        '<a target=\"_blank\" href=\"' + url + '\">' + (markup.n? markup.n : markup.id)+ '</a>';

                    url = url.replace(/<br\s*\/?>/gi,'');
                    url = url.replace(/&nbsp;&nbsp;&nbsp;/gi,'&nbsp;');
                    url = url + "&nbsp;&nbsp;&nbsp;";
                };

                return url;
            };

            var getURLsForNdexExternalLink = function(attribute) {

                if (!attribute) {
                    return null;
                };

                var urls = "";
                var url  = "";

                _.forEach(attribute, function (e) {
                    var markup = parseNdexMarkupValue(e);

                    if (markup.id) {

                        url = '<a target=\"_blank\" href=\"' + markup.id + '\">' + (markup.n ? markup.n : 'external link') + '</a>';
                        url = url.replace(/<br\s*\/?>/gi,'');
                        url = url.replace(/&nbsp;&nbsp;&nbsp;/gi,'&nbsp;');
                        url = url + "&nbsp;&nbsp;&nbsp;";

                        urls = urls + url;
                    };
                });


                return urls;
            };


            $scope.getAttributeValue = function(attributeName, attribute) {

                if (!attribute && (attribute != 0)) {
                    return null;
                }
                if (!attributeName) {
                    return null;
                }

                var attributeValue = "";

                if (attribute instanceof Object) {
                    if (attribute['v'] && Array.isArray(attribute['v']) && (attribute['v'].length > 0) &&
                        (attributeName.toLowerCase() != 'ndex:externallink'))
                    {
                        if(attribute['v'].length > 5) {

                            for (var i = 0; i < 5; i++) {
                                if (i == 0) {
                                    attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                        getStringAttributeValue(attribute['v'][i]) + "<br>";
                                } else {
                                    attributeValue = attributeValue +  "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                        getStringAttributeValue(attribute['v'][i]) + "<br>";
                                }
                            }

                        } else {

                            for (var i = 0; i < attribute['v'].length; i++) {
                                if (i == 0) {
                                    attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                        getStringAttributeValue(attribute['v'][i]) + "<br>";
                                } else {
                                    attributeValue = attributeValue + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                        getStringAttributeValue(attribute['v'][i]) + "<br> ";
                                }
                            }
                        }
                        
                    } else {

                        if (attributeName.toLowerCase() == 'ndex:internallink') {

                            return getURLForNdexInternalLink(attribute.v);

                        } else if (attributeName.toLowerCase() == 'ndex:externallink') {

                            return  getURLsForNdexExternalLink(attribute.v);

                        } else if  (Array.isArray(attribute) && attribute.length > 0) {

                            if(attribute.length > 5) {

                                for (var i = 0; i < 5; i++) {
                                    if (i == 0) {
                                        attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            getStringAttributeValue(attribute[i]) + "<br>";
                                    } else {
                                        attributeValue = attributeValue +  "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            getStringAttributeValue(attribute[i]) + "<br>";
                                    }
                                }

                            } else {

                                for (var i = 0; i < attribute.length; i++) {
                                    if (i == 0) {
                                        attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            $getStringAttributeValue(attribute[i]) + "<br>";
                                    } else {
                                        attributeValue = attributeValue + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            getStringAttributeValue(attribute[i]) + "<br> ";
                                    }
                                }
                            }

                            return attributeValue;
                        }


                        attributeValue = (attribute['v']) ? attribute['v'] : '';

                        var typeOfAttributeValue = typeof(attributeValue);

                        if (attributeValue && (typeOfAttributeValue === 'string')) {
                            attributeValue = getStringAttributeValue(attributeValue);
                        };
                    }

                } else {

                    if (typeof attribute === 'string') {

                        attributeValue = getStringAttributeValue(attribute);

                    } else {

                        attributeValue = (attribute == 0) ? "0" : attribute;
                    }
                }

                return attributeValue;
            }

            $scope.howManyAttributes = function(attribute) {
                var numOfAttributes = 0;

                if (!attribute) {
                    return numOfAttributes;
                }

                if ((attribute instanceof Object) && (attribute['v']) && (Array.isArray(attribute['v']))) {

                    numOfAttributes = attribute['v'].length;

                }  else if ((attribute instanceof Object) && (Array.isArray(attribute))) {

                    numOfAttributes = attribute.length;

                } else if (_.isString(attribute)) {

                    numOfAttributes = 1;
                }

                return numOfAttributes;
            }


            networkController.showMoreAttributes = function(attributeName, attribute) {

                var title = attributeName + ':';

                var attributeValue = "";

                if (attribute instanceof Object) {
                    if (attribute['v'] && Array.isArray(attribute['v'])) {

                        for (var i = 0; i < attribute['v'].length; i++) {
                            attributeValue = attributeValue + getStringAttributeValue(attribute['v'][i]) + '<br>';
                        }

                    } else if (attribute && Array.isArray(attribute)) {

                        for (var i = 0; i < attribute.length; i++) {
                            attributeValue = attributeValue + getStringAttributeValue(attribute[i]) + '<br>';
                        }
                    }
                }
                
                networkController.genericInfoModal(title, attributeValue);

                return;
            };

            $scope.showMoreEdgeAttributes = function(attributeName, attributeObj) {

                var title;
                var typeOfAttributeName = typeof attributeName;

                if ((typeOfAttributeName === 'object') && (Array.isArray(attributeObj))) {

                    var attributeObjLen = attributeObj.length;

                    if (attributeName && attributeName.entity) {

                        _.forOwn(attributeName.entity, function(value, key) {

                            title = key + ':';

                            if (Array.isArray(value) && (value.length == attributeObjLen)) {

                                for (var i=0; i<attributeObjLen; i++) {
                                    if (value[i] != attributeObj[i]) {
                                        title = null;
                                    };
                                };

                                if (title != null) {
                                    return false;
                                }
                            };
                        });
                    }
                } else {
                    title = attributeName + ':';
                }

                var attributeValue = "";

                if (attributeObj instanceof Object) {
                    if (attributeObj['v'] && Array.isArray(attributeObj['v'])) {

                        for (var i = 0; i < attributeObj['v'].length; i++) {
                            attributeValue = attributeValue + getStringAttributeValue(attributeObj['v'][i]) + '<br>';
                        }

                    } else if (_.isArray(attributeObj)) {

                        _.forEach(attributeObj, function (attribute) {

                            if (_.isString(attribute)) {
                                if (attributeValue) {
                                    attributeValue = attributeValue + '<br>' + $scope.linkify(attribute);
                                } else {
                                    attributeValue = $scope.linkify(attribute);
                                }
                            }
                        });
                    }
                }

                networkController.genericInfoModal(title, attributeValue);

                return;
            }

            networkController.genericInfoModal = function(title, message)
            {
                var   modalInstance = $modal.open({
                templateUrl: 'views/generic-info-modal.html',
                scope: $scope,

                controller: function($scope, $modalInstance) {

                    $scope.title = title;
                    $scope.message = message;

                    $scope.close = function() {
                        $modalInstance.dismiss();
                    };
                }
                });
            }


            networkController.showContextModal = function(isEdit){
                networkController.contextModal("title", "message", isEdit);
            };

            networkController.contextModal = function(title, message, isEdit)
            {
                var   modalInstance = $modal.open({
                    templateUrl: 'views/context-modal.html',
                    windowClass: 'app-modal-window-800',
                    scope: $scope,

                    controller: function($scope, $modalInstance) {
                        //$scope.context = {"ncbi": "http://identifiers.org/ncbi",
                        //"pmid": "http://identifiers.org/pubmed"};

                        $scope.context = networkController.context;
                        $scope.contextIsEmpty = true;
                        $scope.restoreIfCanceled = [];

                        for(var key in $scope.context) {
                            if($scope.context.hasOwnProperty(key)){
                                $scope.contextIsEmpty = false;
                                break;
                            }
                        }

                        $scope.addTheseContexts = [];

                        $scope.title = title;
                        $scope.message = message;
                        $scope.isEdit = isEdit;

                        $scope.removeContext = function(key){
                            $scope.restoreIfCanceled.push({"namespace": key, "url": $scope.context[key]});
                            delete $scope.context[key];
                        };

                        $scope.removeCustomContext = function(index){
                            if (index > -1) {
                                $scope.addTheseContexts.splice(index, 1);
                            }
                        };

                        $scope.addContext = function(){
                            $scope.addTheseContexts.push({"namespace": "", "url": ""});
                            $scope.contextIsEmpty = false;
                        };

                        $scope.close = function() {
                            $modalInstance.dismiss();
                            _.forEach($scope.restoreIfCanceled, function (addThis) {
                                $scope.context[addThis.namespace] = addThis.url;
                            });
                        };

                        $scope.save = function() {
                            _.forEach($scope.addTheseContexts, function (addThis) {
                                $scope.context[addThis.namespace] = addThis.url;
                            });

                            networkService.updateNetworkContextFromNdexV2([$scope.context], networkExternalId,
                            function(contextSuccess) {

                            }, function(errorMessage){
                                    console.log(errorMessage);
                                }
                            )

                            $modalInstance.dismiss();
                        };
                    }
                });
            }

            $scope.getEdgeLabel = function(edge) {

                if (!edge) {
                    return "unknown";
                }

                var source="source unknown", target="target unknown", predicate="->";

                if (edge['s'] || edge['s'] == 0) {
                    var nodeObj = networkService.getNodeInfo(edge['s']);
                    source = networkService.getNodeName(nodeObj);
                }
                if (edge['t'] || edge['t'] == 0) {
                    var nodeObj = networkService.getNodeInfo(edge['t']);
                    target = networkService.getNodeName(nodeObj);
                }
                if (edge['i']) {
                    predicate = edge['i'];
                }

                return source + ' ' + predicate + ' ' + target;
            }


            $scope.getCitation = function (citation) {

                var retString = 'pmid : unable to get citation info';
                var isCitationAString = (typeof citation == 'string');

                if (citation && (citation['dc:identifier'] || isCitationAString)) {

                    var splitString = (isCitationAString) ?
                        citation.split(':') : citation['dc:identifier'].split(':');
                    
                    if (splitString.length == 2) {

                        var prefix = splitString[0].toString().toLowerCase();

                        if (prefix === 'pubmed' || prefix === 'pmid') {

                            if (!isNaN(splitString[1])) {
                                // it is a number

                                retString = '<a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/' +
                                    splitString[1] + '"><strong>pmid: </strong>' +
                                    splitString[1] + '</a>';

                            } else if (typeof splitString[1] === 'string') {
                                // it is a string -- see if it is a URL. If it is, create a link.

                                if (splitString[1].startsWith('http://') || splitString[1].startsWith('https://')) {
                                    retString = '<a target="_blank" href="' + splitString[1] + '">' + splitString[1] + '</a>';
                                }

                            }
                        }
                    }
                }

                return retString;
            };

            $scope.getContextAspectFromNiceCX = function() {

                var contextAspect = networkService.getCurrentNiceCX()['@context'];

                networkController.context = {};

                if (contextAspect) {
                    if (contextAspect['elements']) {
                        networkController.context =  contextAspect['elements'][0];
                    } else {
                        networkController.context = contextAspect[0];
                    }
                }

                //networkController.context =
                //    (contextAspect && contextAspect['elements']) ? contextAspect['elements'][0] : {};

                var keys = Object.keys(networkController.context);

                // now, let's lower-case all keys in networkController.context
                for (var i = 0; i < keys.length; i++) {

                    var lowerCaseKey = keys[i].toLowerCase();
                    var value = networkController.context[keys[i]];

                    // delete original entry
                    delete networkController.context[keys[i]];

                    // add value with lower-case key
                    networkController.context[lowerCaseKey] = value;
                }   
            }


            /*-----------------------------------------------------------------------*
             * initialize the cytoscape instance from niceCX
             *-----------------------------------------------------------------------*/
            var initCyGraphFromCyjsComponents = function (cyElements, cyLayout, cyStyle, canvasName, attributeNameMap) {

                //console.log(cyElements);

                $(function () { // on dom ready

                    var cv = document.getElementById(canvasName);

                    try{
                        cy = cytoscape({
                            container: cv,

                            style: cyStyle,

                            layout: cyLayout,

                            elements: cyElements,

                            ready: function () {
                                window.cy = this;
                                ndexSpinner.stopSpinner();
                            }
                        });
                    }
                    catch(e){
                        var defaultStyle = [{"selector":"node","style":{"background-color":"#f6eecb","background-opacity":0.8,"width":"40px","height":"40px","label":"data(name)","font-family":"Roboto, sans-serif"}},{"selector":"edge","style":{"line-color":"#75736c","width":"2px","font-family":"Roboto, sans-serif","text-opacity":0.8}},{"selector":"node:selected","style":{"color":"#fb1605","background-color":"yellow"}},{"selector":"edge:selected","style":{"label":"data(interaction)","color":"#fb1605","line-color":"yellow","width":6}}];
                        cy = cytoscape({
                            container: cv,

                            style: defaultStyle,

                            layout: cyLayout,

                            elements: cyElements,

                            ready: function () {
                                window.cy = this;
                                ndexSpinner.stopSpinner();
                            }
                        });
                        console.log(e);
                    }




                    // this is a workaround to catch select, deselect in one event. Otherwise if a use select multiple nodes/
                    // edges, the event is triggered for each node/edge.
                    cy.on ( 'select unselect',function (event) {
                        clearTimeout(cy.nodesSelectionTimeout);
                        cy.nodesSelectionTimeout = setTimeout(function () {
                            var cxNodes = [];
                            var cxEdges = [];
                            _.forEach(cy.$("node:selected"), function (node) {
                                var id = Number(node.id());
                                cxNodes.push( networkService.getNodeInfo(id));

                            });
                            _.forEach(cy.$("edge:selected"), function (edge) {
                                var idstr = edge.id();
                                var id= Number(idstr.substring(1));
                                cxEdges.push( networkService.getEdgeInfo(id));
                            });


                            $scope.$apply(function () {
                                networkController.selectionContainer = {'nodes': cxNodes, 'edges': cxEdges}; //{'nodes': selectedNodes, 'edges': selectedEdges};

                                if ( cxNodes.length ===0 && cxEdges.length ===0 ) {
                                    networkController.tabs[0].active = true;
                                    networkController.tabs[1].disabled = true;
                                    networkController.tabs[1].active = false;
                                    networkController.tabs[2].active = false;
                                } else if (!networkController.tabs[1].active ) {
                                    networkController.tabs[1].active = true;
                                    networkController.tabs[1].disabled = false;
                                    networkController.tabs[2].active = false;
                                }

                                if (cxNodes.length == 1) {
                                    cxNodes[0].$$expanded = true;
                                }
                                if (cxEdges.length == 1) {
                                    cxEdges[0].$$expanded = true;
                                }
                            });
                        }, 300) ;
                    }); 


                    // handles the linked networks.

                    var ndexLink = attributeNameMap['ndex:internalLink'];
                    var ndexDesc = attributeNameMap['ndex:description'];
                    var ndexExtLink = attributeNameMap['ndex:externalLink'];

                    if ( ndexLink || ndexDesc || ndexExtLink) {
                        var tmpArry = [];
                        [ndexLink,ndexDesc, ndexExtLink].forEach(function(entry){
                            if (entry)
                                tmpArry.push ( '[' + entry + ']');
                        });

                        var selectorStr = tmpArry.join(',');

                        // render properties on nodes
                        cy.nodes(selectorStr).forEach(function (n) {
                            var menuList = [];
                            // check description
                            if (ndexDesc) {
                                var desc = n.data(ndexDesc);
                                if (desc) {
                                    menuList.push(desc);
                                }
                            }
                            if (ndexLink) {
                                var ndexLinkList = n.data(ndexLink);
                                if ( typeof ndexLinkList === 'string')
                                    ndexLinkList = [ndexLinkList];

                                _.forEach(ndexLinkList, function (e) {

                                    var ndexInternalLink = getURLForNdexInternalLink(e);
                                    if (ndexInternalLink) {
                                        menuList.push(ndexInternalLink);
                                    };
                                });
                            };
                            if (ndexExtLink) {
                                var extLinkList = n.data(ndexExtLink);
                                if (typeof extLinkList === 'string')
                                    extLinkList = [ extLinkList];

                                var ndexExternalLinks = getURLsForNdexExternalLink(extLinkList);
                                if (ndexExternalLinks) {
                                    menuList.push(ndexExternalLinks);
                                };
                            };
                            /*
                            n.qtip({
                                content:
                                  menuList.join('<br />\n'),
                                position: {
                                    my: 'top center',
                                    at: 'bottom center'
                                },
                                style: {
                                    classes: 'qtip-bootstrap',
                                    tip: {
                                        width: 16,
                                        height: 8
                                    }
                                }
                            });
                            */
                        });

                        // handles edges
                        cy.edges(selectorStr).forEach(function (n) {
                            var menuList = [];
                            // check description
                            if ( ndexDesc) {
                                var desc = n.data(ndexDesc);
                                if (desc) {
                                    menuList.push(desc);
                                }
                            }
                            if ( ndexLink) {
                                var ndexLinkList = n.data(ndexLink);
                                if ( typeof ndexLinkList === 'string')
                                    ndexLinkList = [ ndexLinkList];
                                _.forEach(ndexLinkList, function (e) {
                                    var markup = parseNdexMarkupValue(e);
                                    if ( markup.id) {
                                        var url = networkController.baseURL + markup.id;
                                        menuList.push('<a target="_blank" href="' + url + '">' +
                                            (markup.n? markup.n : markup.id)+ '</a>');
                                    }
                                });
                            }
                            if ( ndexExtLink) {
                                var extLinkList = n.data(ndexExtLink);
                                if ( typeof extLinkList == 'string')
                                    extLinkList = [ extLinkList];
                                _.forEach(extLinkList, function (e) {
                                    var markup = parseNdexMarkupValue(e);
                                    if ( markup.id) {
                                        menuList.push('<a target="_blank" href="' + markup.id + '">' +
                                            (markup.n? markup.n : 'external link') + '</a>');
                                    }
                                });
                            }
                            n.qtip({
                                content:
                                    menuList.join('<br />\n'),
                                position: {
                                    my: 'top center',
                                    at: 'bottom center'
                                },
                                style: {
                                    classes: 'qtip-bootstrap',
                                    tip: {
                                        width: 16,
                                        height: 8
                                    }
                                }
                            });
                        });
                    }

                }); // on dom ready

            };


            var populateNodeAndEdgeAttributesForAdvancedQuery = function() {
                
                var cxNetwork = networkService.getOriginalNiceCX();
                
                if (!cxNetwork) {
                    return;
                }

                var edgeAttributesMap = {};
                var nodeAttributesMap = {};


                if (cxNetwork.edgeAttributes) {

                    var allEdgesAttributeObjectsIDs = _.keys(cxNetwork.edgeAttributes);

                    _.forEach(allEdgesAttributeObjectsIDs, function(edgeAttributeId) {

                        var edgeAttributeObject = cxNetwork.edgeAttributes[edgeAttributeId];
                        var edgeAttributeObjectKeys = _.keys(edgeAttributeObject);

                        _.forEach(edgeAttributeObjectKeys, function(key) {

                            var edgeAttribute = edgeAttributeObject[key];

                            if (edgeAttribute['d']) {
                                if ((edgeAttribute['d'] == 'string') || (edgeAttribute['d'] == 'boolean')) {
                                    edgeAttributesMap[key] = key;
                                };
                            } else if (edgeAttribute['v']) {
                                if ((typeof(edgeAttribute['v']) == 'string') || (typeof(edgeAttribute['v']) == 'boolean')) {
                                    edgeAttributesMap[key] = key;
                                };
                            };
                        });
                    });
                }

                if (cxNetwork.nodeAttributes) {

                    var allNodesAttributeObjectsIDs = _.keys(cxNetwork.nodeAttributes);

                    _.forEach(allNodesAttributeObjectsIDs, function(nodeAttributeId) {

                        var nodeAttributeObject = cxNetwork.nodeAttributes[nodeAttributeId];
                        var nodeAttributeObjectKeys = _.keys(nodeAttributeObject);

                        _.forEach(nodeAttributeObjectKeys, function(key) {

                            var nodeAttribute = nodeAttributeObject[key];

                            if (nodeAttribute['d']) {
                                if ((nodeAttribute['d'] == 'string') || (nodeAttribute['d'] == 'boolean')) {
                                    nodeAttributesMap[key] = key;
                                };
                            } else if (nodeAttribute['v']) {
                                if ((typeof(nodeAttribute['v']) == 'string') || (typeof(nodeAttribute['v']) == 'boolean')) {
                                    nodeAttributesMap[key] = key;
                                };
                            };
                        });
                    });
                }

                var attributeNames = _.keys(edgeAttributesMap);
                _.forEach(attributeNames, function(attributeName) {
                    networkController.edgePropertyNamesForAdvancedQuery.push(attributeName);
                 });

                attributeNames = _.keys(nodeAttributesMap);
                _.forEach(attributeNames, function(attributeName) {
                    if (attributeName && (attributeName.toLowerCase() != ("ndex:internallink"))) {
                        networkController.nodePropertyNamesForAdvancedQuery.push(attributeName);
                    };
                });
            };
            


            var drawCXNetworkOnCanvas = function (cxNetwork, noStyle) {
                
                $scope.getContextAspectFromNiceCX();

                var attributeNameMap = {} ; //cyService.createElementAttributeTable(cxNetwork);

                var cyElements = cyService.cyElementsFromNiceCX(cxNetwork, attributeNameMap);
                
                var cyStyle ;
                if (noStyle) {
                    cyStyle =  cyService.getDefaultStyle();
                    resetBackgroudColor();
                } else {
                    cyStyle = cyService.cyStyleFromNiceCX(cxNetwork, attributeNameMap);
                    var cxBGColor = cyService.cyBackgroundColorFromNiceCX(cxNetwork);
                    if ( cxBGColor)
                        networkController.bgColor = cxBGColor;
                }

                // networkController.prettyStyle added for debugging -- remove/comment out when done
                //networkController.prettyStyle = JSON.stringify(cyStyle, null, 2);

                // networkController.prettyVisualProperties added for debugging -- remove/comment out when done
                //networkController.prettyVisualProperties = JSON.stringify(cxNetwork.visualProperties, null, 2);

                /*
                 * NB:
                 * setting "curve-style" to "bezier" for the "edge" selector in Cytoscape.js 3.2.9 shows
                 * all multiple edges between two nodes separately;
                 * in other words, if you do not specify 'curve-style': 'bezier', then multiple edges
                 * between any two nodes will be shown on top of one another creating a deceptive visibility
                 * of only one edge ...
                 */
                var edgeCSS = _.find(cyStyle, {'selector': 'edge'});
                if (edgeCSS && edgeCSS.css && !edgeCSS.css['curve-style']) {
                    edgeCSS.css['curve-style'] = 'bezier';
                };

                var layoutName = (cxNetwork.cartesianLayout) ? 'preset' :
                    (Object.keys(cxNetwork.edges).length <= 1000 ? 'cose' : 'circle') ;

                var cyLayout = {name: layoutName, animate: false, numIter: 50, coolingFactor: 0.9};

                initCyGraphFromCyjsComponents(cyElements, cyLayout, cyStyle, 'cytoscape-canvas', attributeNameMap);
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
                    networkController.errors.push("Unable to get network: " + message);
                } else {
                    networkController.errors.push("Unable to get network; Server returned no error information.");
                }
            }

            var getNetworkAndDisplay = function (networkId, callback) {

                var hasLayout = networkController.currentNetwork.hasLayout;

                if (  (hasLayout && networkController.currentNetwork.edgeCount > 12000) ||
                    (  (!hasLayout) && networkController.currentNetwork.hasSample ) ) {
                    // get sample CX network
                    networkController.isSample = true;
                    (request2 = networkService.getNetworkSampleV2(networkId, accesskey) )
                        .success(
                            function (network) {
                                networkController.sampleSize = (network.edges) ? _.size(network.edges) : 0;
                                callback(network, false);
                            }
                        )
                        .error(
                            function (error) {
                                displayErrorMessage(error);
                            }
                        );
                } else {
                    // get complete CX stream and build the CX network object.
                    networkController.isSample = false;
                    (request2 = networkService.getCompleteNetworkInCXV2(networkId, accesskey) )
                        .success(
                            function (network) {
                                callback(network, false);
                            }
                        )
                        .error(
                            function (error) {
                                displayErrorMessage(error);
                            }
                        );
                }
            };

            var calcColumnWidth = function(header, isLastColumn)
            {
                var result = header.length * 10;
                result = result < 100 ? 100 : result;
                if( isLastColumn )
                    result += 40;
                return result > 250 ? 250 : result;
            };

            var populateEdgeTable = function(network, enableFiltering, setGridWidth)
            {
                var edges = network.edges;
                var edgeCitations = network.edgeCitations;
                var edgeCitationsNdexCitation = false;


                var longestSubject = "";    // source
                var longestPredicate = "";
                var longestObject = "";     // target

                if (!edges) {
                    return;
                }

                var edgeKeys = Object.keys(edges);

                // determine the longest subject, predicate and object
                for( var i = 0; i < edgeKeys.length; i++ )
                {
                    var edgeKey = edgeKeys[i];

                    var predicate = edges[edgeKey].i ? (edges[edgeKey].i) : "";
                    var subject = network.nodes[edges[edgeKey].s].n ? network.nodes[edges[edgeKey].s].n : "";
                    var object = network.nodes[edges[edgeKey].t].n ? network.nodes[edges[edgeKey].t].n : "";

                    longestSubject = longestSubject.length < subject.length ? subject : longestSubject;
                    longestPredicate = longestPredicate.length < predicate.length ? predicate : longestPredicate;
                    longestObject = longestObject.length < object.length ? object : longestObject;
                }

                // enable filtering if number of edges in the network is no greater than 500
                var filteringEnabled = (edgeKeys.length <= 500);

                if (enableFiltering) {
                    // enable filtering even if the number of edges in the network is greater than 500;
                    // this is the case when we want filtering on after running simple or advance query
                    filteringEnabled = true;
                }
                var columnDefs = [
                    {
                        field: 'Source Node',
                        displayName: 'Source Node',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestSubject, false)
                    },
                    {
                        field: 'Interaction',
                        displayName: 'Interaction',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestPredicate, false)
                    },
                    {
                        field: 'Target Node',
                        displayName: 'Target Node',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestObject, false)
                    }
                ];

                if (edgeCitations) {
                    var citationsHeader =
                    {
                        field: 'citation',
                        displayName: 'citation',
                        cellToolTip: false,
                        minWidth: calcColumnWidth('citation'),
                        enableFiltering: true,
                        enableSorting: true,
                        cellTemplate: "<div class='text-center'><h6>" +
                            "<a ng-click='grid.appScope.showEdgeCitations(COL_FIELD)' ng-show='grid.appScope.getNumEdgeCitations(COL_FIELD) > 0'>" +
                            "{{grid.appScope.getNumEdgeCitations(COL_FIELD)}}" +
                            "</h6></div>"
                     }
                    columnDefs.push(citationsHeader);
                }


                var edgeAttributes = network.edgeAttributes;
                var edgeAttributesHeaders = {};

                if (edgeAttributes) {

                    var edgeAttributesKeys = _.keys(edgeAttributes);

                    for ( i=0; i<edgeAttributesKeys.length; i++)
                    {
                        var edgeAttributeKey = edgeAttributesKeys[i];

                        var keys = _.keys(edgeAttributes[edgeAttributeKey]);
                        var edgeAttributePropertiesKeys =  $scope.removeHiddenAttributes(keys);

                        for (var j=0; j<edgeAttributePropertiesKeys.length; j++) {
                            var edgeAttributteProperty = edgeAttributePropertiesKeys[j];

                            if (edgeAttributteProperty && edgeAttributteProperty.toLowerCase() === 'pmid') {
                                // exclude column PMID from the table
                                continue;
                            }

                            var isItCitationHeader = (edgeAttributteProperty.toLowerCase().indexOf('citation') > -1);

                            if (isItCitationHeader) {

                                var columnDef =
                                    {
                                        field: edgeAttributteProperty,
                                        displayName: edgeAttributteProperty,
                                        cellToolTip: false,
                                        minWidth: calcColumnWidth(edgeAttributteProperty),
                                        enableFiltering: true,
                                        enableSorting: true,
                                        cellTemplate: '<div class="text-center"><h6>' +
                                        '<a ng-click="grid.appScope.showMoreEdgeAttributes(\'Citations\', COL_FIELD)" ng-show="grid.appScope.getNumEdgeNdexCitations(COL_FIELD) > 0">' +
                                        '{{grid.appScope.getNumEdgeNdexCitations(COL_FIELD)}}</a></h6></div>'
                                    };
                            } else {
                                columnDef = {
                                    field: edgeAttributteProperty,
                                    displayName: edgeAttributteProperty,
                                    cellTooltip: true,
                                    minWidth: calcColumnWidth(edgeAttributteProperty, false),
                                    enableFiltering: filteringEnabled,
                                    cellTemplate: 'views/gridTemplates/showCellContentsInNetworkTable.html'

                                    //'<div class="ui-grid-cell-contents hideLongLine" ng-bind-html="grid.appScope.getAttributeValueForTable(COL_FIELD)"></div>'
                                    //cellTemplate: '<div class="ui-grid-cell-contents hideLongLine" ng-bind-html="grid.appScope.linkify(COL_FIELD)"></div>'
                                };
                           }
                            edgeAttributesHeaders[edgeAttributteProperty] = columnDef;
                        }
                    }
                }

                for (var key in edgeAttributesHeaders) {
                    var col = edgeAttributesHeaders[key];
                    columnDefs.push(col);
                }
                
                $scope.edgeGridApi.grid.options.columnDefs = columnDefs;

                if (setGridWidth) {
                    var cytoscapeCanvasWidth = $('#cytoscape-canvas').width();
                    if (cytoscapeCanvasWidth > 0) {
                        $scope.edgeGridApi.grid.gridWidth = cytoscapeCanvasWidth;
                    };
                }
                $("#edgeGridId").height($(window).height() - 235);
                $scope.edgeGridApi.grid.gridHeight = $("#edgeGridId").height();

               refreshEdgeTable(network);
            };


            $scope.getAttributeValueForTable = function(attribute) {

                if (!attribute && (attribute != 0)) {
                    return "";
                }

                var attributeValue = "";

                if (attribute instanceof Object) {
                    if (Array.isArray(attribute) && (attribute.length > 0))
                    {

                        for (var i = 0; i < attribute.length; i++) {
                            if (i == 0) {
                                attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                    getStringAttributeValue(attribute[i]) + "<br>";
                            } else {
                                attributeValue = attributeValue + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                    getStringAttributeValue(attribute[i]) + "<br> ";
                            }
                        }

                    } else {

                        if (attributeName.toLowerCase() == 'ndex:internallink') {

                            return getURLForNdexInternalLink(attribute.v);

                        } else if (attributeName.toLowerCase() == 'ndex:externallink') {

                            return  getURLsForNdexExternalLink(attribute.v);

                        } else if  (Array.isArray(attribute) && attribute.length > 0) {

                            if(attribute.length > 5) {

                                for (var i = 0; i < 5; i++) {
                                    if (i == 0) {
                                        attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            getStringAttributeValue(attribute[i]) + "<br>";
                                    } else {
                                        attributeValue = attributeValue +  "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            getStringAttributeValue(attribute[i]) + "<br>";
                                    }
                                }

                            } else {

                                for (var i = 0; i < attribute.length; i++) {
                                    if (i == 0) {
                                        attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            $getStringAttributeValue(attribute[i]) + "<br>";
                                    } else {
                                        attributeValue = attributeValue + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            getStringAttributeValue(attribute[i]) + "<br> ";
                                    }
                                }
                            }

                            return attributeValue;
                        }


                        attributeValue = (attribute['v']) ? attribute['v'] : '';

                        var typeOfAttributeValue = typeof(attributeValue);

                        if (attributeValue && (typeOfAttributeValue === 'string')) {
                            attributeValue = getStringAttributeValue(attributeValue);
                        };
                    }

                } else {

                    if (typeof attribute === 'string') {

                        attributeValue = getStringAttributeValue(attribute);

                    } else {

                        attributeValue = (attribute == 0) ? "0" : attribute;
                    }
                }

                return attributeValue;
            }

            var refreshEdgeTable = function (network) {

                var edges = network.edges;
                var edgeCitations = network.edgeCitations;
                var edgeKeys = Object.keys(edges);

                $scope.edgeGridOptions.data = [];

                var edgeAttributes = network.edgeAttributes;

                for( i = 0; i < edgeKeys.length; i++ )
                {
                    var edgeKey = edgeKeys[i];

                    var edgeObj = networkService.getEdgeInfo(edgeKey);

                    var sourceNodeObj = networkService.getNodeInfo(edgeObj['s']);
                    var source = networkService.getNodeName(sourceNodeObj);
                    var interaction = edgeObj['i'];
                    var targeteNodeObj = networkService.getNodeInfo(edgeObj['t']);
                    var target = networkService.getNodeName(targeteNodeObj);

                    var row = {"Source Node": source, "Interaction": interaction, "Target Node": target};
                    
                    if (edgeCitations) {
                        row["citation"] = (edgeCitations[edgeKey]) ? edgeKey : "";
                    }

                    if (edgeAttributes) {
                        for (var key in edgeAttributes[edgeKey]) {
                            if (key.startsWith("__")) {
                                continue;
                            }
                            if (key.toLowerCase() == 'pmid') {
                                // exclude PMID data from the table
                                continue;
                            }
                            var attributeValue = edgeAttributes[edgeKey][key]['v'];
                            row[key] = (attributeValue) ? attributeValue : "";
                        }
                    }
                    $scope.edgeGridOptions.data.push( row );
                }
            };


            var populateNodeTable = function(network, enableFiltering, setGridWidth)
            {
                var nodes = network.nodes;
                var nodeCitations = network.nodeCitations;
                var numOfNodeKeys = 0;

                if (!nodes) {
                    return;
                }

                var longestName = "Name";
                for (var key in nodes) {

                    if (nodes[key].n) {
                        longestName = (nodes[key].n.length > longestName.length) ? nodes[key].n : longestName;
                    }
                    numOfNodeKeys = numOfNodeKeys + 1;
                }

                // enable filtering if number of edges in the network is no greater than 500;
                // we still check number of edges even though we populate node headers in this routine
                var filteringEnabled = (numOfNodeKeys <= 500) ? true : false;

                if (enableFiltering) {
                    // enable filtering even if the number of edges in the network is greater than 500;
                    // this is the case when we want filtering on after running simple or advance query.
                    // we still check number of edges even though we populate node header in this routine
                    filteringEnabled = true;
                }
                var columnDefs = [
                    {
                        field: 'Name',
                        displayName: 'Name',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestName)
                    }
                ];

                if (nodeCitations) {
                    var citationsHeader =
                    {
                        field: 'Citations',
                        displayName: 'citation',
                        cellToolTip: false,
                        enableFiltering: false,
                        enableSorting: false,
                        cellTemplate: "<div class='text-center'><h6>" +
                        "<a ng-click='grid.appScope.showNodeCitations(COL_FIELD)' ng-show='grid.appScope.getNumNodeCitations(COL_FIELD) > 0'>" +
                        "{{grid.appScope.getNumNodeCitations(COL_FIELD)}}" +
                        "</h6></div>"
                    }
                    columnDefs.push(citationsHeader);
                }

                var nodeAttributes = network.nodeAttributes;
                var nodeAttributesHeaders = {};

                if (nodeAttributes) {

                    var nodeAttributesKeys = Object.keys(nodeAttributes);

                    for (var i=0; i<nodeAttributesKeys.length; i++)
                    {
                        var nodeAttributeKey = nodeAttributesKeys[i];

                        var keys = _.keys(nodeAttributes[nodeAttributeKey]);
                        var nodeAttributePropertiesKeys = $scope.removeHiddenAttributes(keys);

                        var links = [];
                        var ndexInternalLink = 'ndex:internalLink';
                        var ndexExternalLink = 'ndex:externalLink';

                        if (nodeAttributePropertiesKeys.indexOf(ndexInternalLink) > -1) {
                            links.push(ndexInternalLink);
                            _.pull(nodeAttributePropertiesKeys, ndexInternalLink);
                        };
                        if (nodeAttributePropertiesKeys.indexOf(ndexExternalLink) > -1) {
                            _.pull(nodeAttributePropertiesKeys, ndexExternalLink);
                        };

                        if (links.length > 0) {
                            nodeAttributePropertiesKeys = nodeAttributePropertiesKeys.concat(links);
                        };

                        for (var j=0; j<nodeAttributePropertiesKeys.length; j++) {
                            var nodeAttributteProperty = nodeAttributePropertiesKeys[j];

                            var columnDef;

                            if ((nodeAttributteProperty == "alias") || (nodeAttributteProperty == "relatedTo")) {
                                columnDef = {
                                    field: nodeAttributteProperty,
                                    displayName: nodeAttributteProperty,
                                    cellTooltip: true,
                                    minWidth: calcColumnWidth(nodeAttributteProperty, false),
                                    enableFiltering: filteringEnabled,
                                    //cellTemplate: "<div class='ui-grid-cell-contents hideLongLine' ng-bind-html='grid.appScope.linkify(COL_FIELD)'></div>"

                                    cellTemplate: "<div class='text-center'><h6>" +
                                    "<a ng-click='grid.appScope.showNodeAttributes(COL_FIELD)' ng-show='grid.appScope.getNumNodeAttributes(COL_FIELD) > 0'>" +
                                    "{{grid.appScope.getNumNodeAttributes(COL_FIELD)}}" +
                                    "</a></h6></div>"
                                };

                            } else if (nodeAttributteProperty == ndexInternalLink) {

                                var sampleUUIDToCalcFieldWidth = "cfab341c-362d-11e5-8ac5-06603eb7f303";

                                columnDef = {
                                    field: nodeAttributteProperty,
                                    displayName: "View Network",
                                    cellTooltip: true,
                                    minWidth: calcColumnWidth(sampleUUIDToCalcFieldWidth, false),
                                    enableFiltering: filteringEnabled,
                                    cellTemplate: "<a class='ui-grid-cell-contents hideLongLine' " +
                                        "ng-bind-html='grid.appScope.getInternalNetworkUUID(COL_FIELD)' " +
                                        "ng-href='{{grid.appScope.getURLForMapNode(COL_FIELD)}}' target='_blank'>" +
                                    "</a>"
                                };

                            } else {
                                columnDef = {
                                    field: nodeAttributteProperty,
                                    displayName: nodeAttributteProperty,
                                    cellTooltip: true,
                                    minWidth: calcColumnWidth(nodeAttributteProperty, false),
                                    enableFiltering: filteringEnabled,
                                    cellTemplate: "<div class='ui-grid-cell-contents hideLongLine' ng-bind-html='grid.appScope.linkify(COL_FIELD)'></div>"
                                };
                            };
                            nodeAttributesHeaders[nodeAttributteProperty] = columnDef;
                        }
                    }
                }

                for (var key in nodeAttributesHeaders) {
                    var col = nodeAttributesHeaders[key];
                    columnDefs.push(col);
                }

                $scope.nodeGridApi.grid.options.columnDefs = columnDefs;

                if (setGridWidth) {
                    var cytoscapeCanvasWidth = $('#cytoscape-canvas').width();
                    if (cytoscapeCanvasWidth > 0) {
                        $scope.nodeGridApi.grid.gridWidth = cytoscapeCanvasWidth;
                    }
                }
                $("#nodeGridId").height($(window).height() - 235);
                $scope.nodeGridApi.grid.gridHeight = $("#nodeGridId").height();

                refreshNodeTable(network);
            };

            var refreshNodeTable = function(network)
            {
                var nodes = network.nodes;
                var nodeKeys = Object.keys(nodes);

                $scope.nodeGridOptions.data = [];

                var nodeAttributes = network.nodeAttributes;

                for (var key in nodeKeys)
                {
                    var nodeId = nodeKeys[key];

                    var nodeObj = networkService.getNodeInfo(nodeId);
                    var nodeName = networkService.getNodeName(nodeObj);

                    var row = {"Name": nodeName};

                    if (nodeAttributes) {

                        var nodeAttrs = nodeAttributes[nodeId];

                        for (var key1 in nodeAttrs) {
                            var attributeObj = (nodeAttrs[key1]) ? (nodeAttrs[key1]) : "";
                            var attributeObjName = attributeObj['n'];

                            if (attributeObjName && attributeObjName.startsWith("__")) {
                                continue;
                            };

                            if (attributeObjName && ((attributeObjName == 'alias') || (attributeObjName == 'relatedTo')) ) {
                                row[key1] = attributeObj;
                            } else {
                                row[key1] = (attributeObj['v']) ? attributeObj['v'] : "";
                            }
                        }
                    }

                    $scope.nodeGridOptions.data.push( row );
                }
            };

            networkController.checkQueryNetworkAndDisplay = function (query) {

                if ('neighborhood' == query) {
                    if (!networkController.searchString || !networkController.searchString.trim()) {
                        networkController.searchString = "";
                        $("#inputQueryStrId").val("");
                        return;
                    }
                }

                $scope.query = query;
                networkController.previousNetwork = networkController.currentNetwork;
                $scope.beforeQueryView = $scope.currentView;

                if (query == 'neighborhood') {
                    networkController.queryNetworkAndDisplay();
                } else {
                    networkController.runAdvancedQuery();
                };


            };

            networkController.cleanUpAfterQuerying = function() {
                networkService.restoreCurrentNiceCXAfterQuery();
                networkController.successfullyQueried = false;
                networkController.queryWarnings = [];
                ndexSpinner.stopSpinner();
            };

            networkController.rerunQueryAndSaveResult = function (networkId, accesskey, searchString,
                                                                  searchDepth, edgeLimit, save, errorWhenLimitIsOver) {

                ndexService.queryNetworkV2(networkId, accesskey, searchString, searchDepth,
                    edgeLimit, save, errorWhenLimitIsOver,
                        function(networkURI) {
                            /*
                            var regExpToSplitBy = /^http:.*\/network\//;
                            var networkUUIDArray = networkURI.split(regExpToSplitBy);

                            var networkUUID = (Array.isArray(networkUUIDArray) && (networkUUIDArray.length == 2)) ?
                                networkUUIDArray[1] : "";
                                */
                            ; // do nothing here

                        },
                        function(error) {
                            if (error && error.errorCode && error.errorCode == 'NDEx_Bad_Request_Exception') {
                                if (error.message) {
                                    networkController.queryErrors.push(error.message);
                                }
                            };
                        });
            };


            networkController.presentQueryResult = function(nodeCount, edgeCount, queryStatus) {

                if ((nodeCount == 0) && (queryStatus.success)) {
                    networkService.restoreCurrentNiceCXAfterQuery();
                    networkController.successfullyQueried = false;
                    networkController.queryWarnings = [];
                    networkController.queryWarnings.push("No nodes matching your query terms were found in this network.");
                    ndexSpinner.stopSpinner();
                    return;
                }

                networkController.successfullyQueried = true;

                var network     = networkService.getCurrentNiceCX();
                var networkName = networkService.getCurrentNetworkName();

                var resultName = (networkName) ? networkName :
                    "Neighborhood query result on network - " + currentNetworkSummary.name;

                networkController.currentNetwork =
                    {name: resultName,
                        "nodeCount": nodeCount,
                        "edgeCount": edgeCount,
                        "queryString": networkController.searchString,
                        "queryDepth" : networkController.searchDepths[networkController.searchDepth.value-1]['description']
                    };

                cxNetworkUtils.setNetworkProperty(network, 'name', resultName);

                if (!networkController.tabs[0].active) {
                    networkController.tabs[0].active = true;
                }
                networkController.selectionContainer = {};

                var networkQueryEdgeLimit = ndexSettings.networkQueryEdgeLimit;

                networkController.isSamplePrevious   = networkController.isSample;
                networkController.sampleSizePrevious = networkController.sampleSize;
                networkController.isSample   = false;
                networkController.sampleSize = 0;


                // re-draw network in Cytoscape Canvas regardless of whether we are in Table or Graph View
                if (edgeCount <= networkController.queryEdgeLimitToShowGraph) {
                    drawCXNetworkOnCanvas(network, false);

                    if ($scope.currentView == "Table") {
                        var enableFiltering = true;
                        var setGridWidth = false;
                        populateNodeTable(network, enableFiltering, setGridWidth);
                        populateEdgeTable(network, enableFiltering, setGridWidth);
                        $scope.drawCXNetworkOnCanvasWhenViewSwitched = true;
                    } else {
                        $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;
                    }

                } else if ((edgeCount > networkController.queryEdgeLimitToShowGraph) &&
                    (edgeCount <= networkController.queryEdgeLimitToShowTableOnly)) {

                    $scope.currentView = "Table";
                    $scope.buttonLabel = "Graph";
                    $scope.switchViewButtonEnabled = true;

                    setTooltipForSwitchViewButton("Switch to Graphic View");


                    var enableFiltering = true;
                    var setGridWidth    = true;
                    $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

                    drawCXNetworkOnCanvas(network, false);

                    populateNodeTable(network, enableFiltering, setGridWidth);
                    populateEdgeTable(network, enableFiltering, setGridWidth);

                } else if (edgeCount > networkController.queryEdgeLimitToShowTableOnly) {

                    $scope.currentView = "Table";
                    $scope.buttonLabel = "Graph";
                    $scope.switchViewButtonEnabled = false;

                    var networkIsTooLargeMessage =
                        'This network is too large to display in the browser. Please import it in Cytoscape for visualization purposes.';

                    $('#switchViewButtonId2').tooltip('hide').attr('data-original-title', networkIsTooLargeMessage);

                    var enableFiltering = true;
                    var setGridWidth    = true;
                    $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

                    populateNodeTable(network, enableFiltering, setGridWidth);
                    populateEdgeTable(network, enableFiltering, setGridWidth);
                };

                return;
            };


            networkController.queryNetworkAndDisplay = function () {
                // remove old query and error messages, if any
                networkController.queryWarnings = [];
                networkController.queryErrors = [];

                ndexSpinner.startSpinner(spinnerId);
                var networkQueryEdgeLimit = ndexSettings.networkQueryEdgeLimit;
                networkService.neighborhoodQuery(networkController.currentNetworkId,
                            accesskey, networkController.searchString, networkController.searchDepth.value, networkQueryEdgeLimit)
                    .success(
                        function (network) {

                            var nodeCount = (network.nodes) ? Object.keys(network.nodes).length : 0;
                            var edgeCount = (network.edges) ? Object.keys(network.edges).length : 0;

                            var queryStatus =
                                (network.status && network.status.status && network.status.status[0]) ?
                                    network.status.status[0] : null;

                            if (!queryStatus.success && ('edgelimitexceeded' == queryStatus.error.toLowerCase())) {

                                if (networkController.isLoggedInUser) {

                                    var title = 'Query Result Exceeds Limit';
                                    var message = 'Your query returned more than ' + networkQueryEdgeLimit  +
                                        ' edges and cannot be executed in the browser. <br><br> ' +
                                        '<strong>Would you like to save the result directly to your account?</strong>';

                                    var dismissModal = true;

                                    ndexNavigation.openConfirmationModal(title, message, "Save Result", "Cancel", dismissModal,
                                        function () {
                                            var save = true;
                                            var errorWhenLimitIsOver = false;
                                            networkQueryEdgeLimit = -1;

                                            networkController.rerunQueryAndSaveResult(networkController.currentNetworkId,
                                                accesskey, networkController.searchString,
                                                networkController.searchDepth.value,
                                                networkQueryEdgeLimit, save, errorWhenLimitIsOver);

                                            networkController.cleanUpAfterQuerying();
                                            return;
                                        },
                                        function () {

                                            networkController.cleanUpAfterQuerying();
                                            return;
                                        });

                                } else {
                                    // user is anonymous; prompt her/him to log in to save this query to her/his account
                                    var title   = 'Query Result Exceeds Limit';
                                    var message = 'Your query returned more than ' + networkQueryEdgeLimit  +
                                        ' edges and cannot be executed in the browser. <br><br> ' +
                                        '<strong>Please log in so that the result can be saved to your NDEx account.</strong>';

                                    dismissModal = true;
                                    ndexSpinner.stopSpinner();

                                    ndexNavigation.openConfirmationModal(title, message, "Log in", "Close", dismissModal,
                                        function () {

                                            // log in - forward to Sign In page
                                            networkController.cleanUpAfterQuerying();

                                            $location.path('/signIn');

                                            return;
                                        },
                                        function () {
                                            // user canceled
                                            networkController.cleanUpAfterQuerying();
                                            return;
                                        });

                                    return;
                                };

                            } else {

                                networkController.presentQueryResult(nodeCount, edgeCount, queryStatus);
                            }

                            ndexSpinner.stopSpinner();
                            return;
                        }
                    )
                    .error(
                        function (error) {
                            ndexSpinner.stopSpinner();
                            if (error.status != 0) {
                                if (error.data.message &&
                                    (error.data.message.toLowerCase().indexOf("edgelimitexceeded") > 0))
                                {
                                    var edgeLimitExceededWarning =
                                        "Query returned more than max edges (" + networkQueryEdgeLimit + "). Please refine your query.";
                                    networkController.queryWarnings = [];
                                    networkController.queryWarnings.push(edgeLimitExceededWarning);
                                }
                                else
                                {
                                    networkController.queryErrors = [];
                                    networkController.queryErrors.push(error.data.message);
                                }
                            }
                        }
                    );  
            };


            networkController.backToOriginalNetwork = function (event) {

                networkController.selectionContainer = {};
                $scope.switchViewButtonEnabled = true;
                networkController.warningShown = false;


                if ($scope.query == 'advanced') {

                    if (typeof event !== 'undefined') {
                        // 'event' is not defined in FireFox (this is bug of the current FireFox v.58.0.2),
                        // but defined in Chrome, Safari and Opera
                        event.stopPropagation();
                    }

                    networkController.tabs[3].active   = false;
                    networkController.tabs[3].disabled = true;
                    networkController.tabs[3].hidden   = true;

                    enableSimpleQueryElements();
                };

                networkController.tabs[0].active   = true;
                networkController.tabs[0].disabled = false;
                networkController.tabs[0].hidden   = false;

                $scope.query = null;

                networkController.successfullyQueried = false;
                $scope.disableQuery = false;

                networkController.currentNetwork = networkController.previousNetwork;
                networkService.restoreCurrentNiceCXAfterQuery();
                localNetwork = networkService.getOriginalNiceCX();

                if ($scope.currentView == "Table") {
                    $scope.drawCXNetworkOnCanvasWhenViewSwitched = true;
                    setTooltipForSwitchViewButton("Switch to Graphic View");
                } else {
                    setTooltipForSwitchViewButton("Switch to Table View");
                }

                ndexSpinner.startSpinner(spinnerId);
                drawCXNetworkOnCanvas(localNetwork,false);

                networkController.isSample   = networkController.isSamplePrevious;
                networkController.sampleSize = networkController.sampleSizePrevious;

                var enableFiltering = true;
                var setGridWidth = true;
                populateEdgeTable(localNetwork, enableFiltering, setGridWidth);
                populateNodeTable(localNetwork, enableFiltering, setGridWidth);

                if ($scope.currentView != $scope.beforeQueryView) {
                    $scope.switchView();
                }

                ndexSpinner.stopSpinner();
            };


            // this is used by showNetworkSetsModal directive in ui-services.js for adding
            // selected networks to selected sets.  In network-controller there is only one "selected" network
            // (the current one), so we add it to the list and return to the caller,
            networkController.getIDsOfSelectedNetworks = function () {
                var selectedIds = [];
                selectedIds.push(networkController.currentNetworkId);
                return selectedIds;
            };

            networkController.saveQueryResult = function() {

                var  modalInstanceSave = $modal.open({
                    templateUrl: 'views/directives/confirmationModal.html',
                    scope: $scope,
                    controller: function($scope, $modalInstance) {
                        $scope.title = 'Save query result?';
                        $scope.message = 'The query result for "'+currentNetworkSummary.name+'" will be saved to your account?';

                        $scope.cancel = function() {
                            $scope.errors = null;
                            $modalInstance.dismiss();
                        };

                        $scope.confirm = function() {
                            if( $scope.isProcessing )
                                return;
                            $scope.isProcessing = true;
                            $scope.progress = 'Save in progress.... ';

                            networkQueryEdgeLimit = -1;
                            var save = true;
                            var errorWhenLimitIsOver = false;

                            networkController.rerunQueryAndSaveResult(networkController.currentNetworkId,
                                accesskey, networkController.searchString,
                                networkController.searchDepth.value,
                                networkQueryEdgeLimit, save, errorWhenLimitIsOver);

                            $modalInstance.close();
                            $scope.isProcessing = false;


                            /*

                            var rawCX = cxNetworkUtils.niceCXToRawCX(networkService.getCurrentNiceCX());

                            networkService.createCXNetwork(rawCX,
                                function (newNetworkURL) {
                                    $modalInstance.close();
                                    $scope.isProcessing = false;

                                    //$('#saveQueryButton').prop('disabled', true);
                                },
                                function (error) {
                                    delete $scope.progress;
                                    $scope.errors = (error && error.message) ? error.message : "Unable to save Query results"
                                });


                            */
                        };
                    }
                });

            }


            networkController.runAdvancedQuery = function()
            {
                var mode = networkController.advancedQueryNodeCriteria;
                var validEdgeProperties = [];
                var validNodeProperties = [];

                // remove old query and error messages, if any
                networkController.queryWarnings = [];
                networkController.queryErrors = [];

                var networkQueryEdgeLimit = ndexSettings.networkQueryEdgeLimit;

                ndexSpinner.startSpinner(spinnerId);

                var postData =
                {
                    edgeLimit: networkQueryEdgeLimit,
                    queryName: "Not used yet."
                };

                _.forEach(networkController.advancedQueryEdgeProperties, function (edgeProperty) {

                    if (edgeProperty.name && edgeProperty.value) {
                        validEdgeProperties.push( {name: edgeProperty.name, value: edgeProperty.value} );
                    }
                });
                _.forEach(networkController.advancedQueryNodeProperties, function (nodeProperty) {
                    if( nodeProperty.name && nodeProperty.value ) {
                        validNodeProperties.push( {name: nodeProperty.name, value: nodeProperty.value} );
                    }
                });

                if (validEdgeProperties.length > 0)
                {
                    postData.edgeFilter =
                    {
                        propertySpecifications: validEdgeProperties
                    };
                };

                if (validNodeProperties.length > 0)
                {
                    postData.nodeFilter =
                    {
                        propertySpecifications: validNodeProperties,
                        mode: mode
                    };
                };

                //console.log(JSON.stringify(postData,null,2));
                
                networkService.advancedNetworkQueryV2(networkController.currentNetworkId, accesskey, postData)
                    .success(
                        function (networkInNiceCX) {

                            ndexSpinner.stopSpinner();

                            var networkName = networkController.currentNetwork.name;
                            var localNiceCX = networkInNiceCX;

                            var nodeCount = (localNiceCX.nodes) ? Object.keys(localNiceCX.nodes).length : 0;
                            var edgeCount = (localNiceCX.edges) ? Object.keys(localNiceCX.edges).length : 0;

                            if (nodeCount == 0) {
                                networService.restoreCurrentNiceCXAfterQuery();
                                networkController.queryWarnings = [];
                                networkController.queryWarnings.push("No nodes matching your query terms were found in this network.");
                                return;
                            }

                            var resultName = "Advanced query result on network - " + currentNetworkSummary.name;
                            networkController.successfullyQueried = true;
                            //networkController.previousNetwork = networkController.currentNetwork;
                            networkController.currentNetwork = {
                                    name: resultName,
                                    "nodeCount": nodeCount,
                                    "edgeCount": edgeCount
                                };

                            cxNetworkUtils.setNetworkProperty(localNiceCX, 'name', resultName);


                            // re-draw network in Cytoscape Canvas regardless of whether we are in Table or Graph View
                            drawCXNetworkOnCanvas(localNiceCX,false);

                            networkController.selectionContainer = {};

                            if ($scope.currentView == "Table") {
                                var enableFiltering = true;
                                var setGridWidth = false;
                                populateNodeTable(localNiceCX, enableFiltering, setGridWidth);
                                populateEdgeTable(localNiceCX, enableFiltering, setGridWidth);
                                $scope.drawCXNetworkOnCanvasWhenViewSwitched = true;
                            } else {
                                $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;
                            };

                        })
                    .error(

                        function (error) {
                            ndexSpinner.stopSpinner();

                            if (error.status != 0) {
                                if (error.data && error.data.message &&
                                    (error.data.message.toLowerCase().indexOf("edgelimitexceeded") > 0))
                                {
                                    var edgeLimitExceededWarning =
                                        "Query returned more than max edges (" + edgeLimit + "). Please refine your query.";
                                    networkController.queryWarnings = [];
                                    networkController.queryWarnings.push(edgeLimitExceededWarning);
                                }
                                else
                                {
                                    networkController.queryErrors = [];
                                    networkController.queryErrors.push(error.data.message);
                                };
                            };
                        }
                    );
            };

            networkController.getStatusOfShareableURL = function(checkCytoscapeAndCyRESTVersions, doNothing) {
                ndexService.getAccessKeyOfNetworkV2(networkExternalId,
                    function(data) {

                        if (!data) {
                            // empty string - access is deactivated
                            networkController.networkShareURL = null;

                        } else if (data['accessKey']) {
                            // received  data['accessKey'] - access is enabled
                            networkController.networkShareURL =
                                uiMisc.buildNetworkURL(data['accessKey'], networkExternalId);

                        } else {
                            // this should not happen; something went wrong; access deactivated
                            networkController.networkShareURL = null;
                        };

                        if (networkController.networkShareURL) {
                            // network Share URL is enabled; This network can be opened in Cytoscape.
                            $scope.openInCytoscapeTitle = "";

                            // check if Cytoscape is running and if yes if it and CyNDEX have the right versions
                            checkCytoscapeAndCyRESTVersions();


                        } else {
                            // network Share URL is disabled; This network can not be opened in Cytoscape.
                            $scope.openInCytoscapeTitle =
                                "This feature can be used only with Public networks, or Private networks " +
                                "with an enabled Share URL";
                            doNothing();

                        };
                    },
                    function(error) {
                        console.log("unable to get access key for network " + networkExternalId);
                        $scope.openInCytoscapeTitle =
                            "unable to get access key for network " + networkExternalId;
                    });
            };


            var getOwnerOfTheNetwork = function(networkOwnerUUID) {

                if (networkController.isLoggedInUser &&
                    (networkOwnerUUID == window.currentNdexUser.externalId))
                {
                    networkController.networkOwner.firstName = window.currentNdexUser.firstName;
                    networkController.networkOwner.lastName  = window.currentNdexUser.lastName;
                    networkController.networkOwner.ownerUUID = networkOwnerUUID;

                } else {

                    ndexService.getUserByUUIDV2(networkOwnerUUID)
                        .success(
                            function (user) {
                                networkController.networkOwner.firstName = user.firstName;
                                networkController.networkOwner.lastName = user.lastName;
                                networkController.networkOwner.ownerUUID = networkOwnerUUID;
                            })
                        .error(
                            function (error) {
                                console.log('unable to get the network owner info');
                            })
                };
            };


            var initialize = function () {
                // vars to keep references to http calls to allow aborts

                provenanceService.resetProvenance();

                // get network summary
                // keep a reference to the promise
                networkService.getNetworkSummaryFromNdexV2(networkExternalId, accesskey)
                    .success(
                        function (network) {
                            networkController.currentNetwork = network;
                            currentNetworkSummary = network;

                            var networkOwnerUUID = network.ownerUUID;
                            getOwnerOfTheNetwork(networkOwnerUUID);

                            if (network && network.visibility) {
                                networkController.visibility = network.visibility.toLowerCase();
                            };

                            if (!network.name) {
                                networkController.currentNetwork.name = "Untitled";
                            };

                            // subNetworkId is the current subNetwork we are displaying
                            networkController.subNetworkId = uiMisc.getSubNetworkId(network);

                            networkController.noOfSubNetworks = uiMisc.getNoOfSubNetworks(network);

                            if (networkController.noOfSubNetworks >= 1) {
                                $scope.disabledQueryTooltip =
                                    "This network is part of a Cytoscape collection and cannot be operated on or edited in NDEx";
                            };

                            if (networkController.subNetworkId != null) {
                                networkController.currentNetwork.description = networkService.getNetworkProperty(networkController.subNetworkId,"description");
                                networkController.currentNetwork.version = networkService.getNetworkProperty(networkController.subNetworkId,"version");
                            };

                            if (networkController.isLoggedInUser && (network['ownerUUID'] == sharedProperties.getCurrentUserId()) ) {
                                networkController.isNetworkOwner = true;
                            };

                            // decide whether to enable the Open In Cytoscape button
                            if (networkController.visibility == 'public' || networkController.accesskey) {

                                // Network is Public or (private and accessed through Share URL); enable the button
                                // in case we have the right versions of Cytoscape and CyREST.

                                if (networkController.visibility == 'private' && networkController.accesskey) {
                                    networkController.networkShareURL =
                                        uiMisc.buildNetworkURL(networkController.accesskey, networkExternalId);
                                };

                                getCytoscapeAndCyRESTVersions();

                            } else if (networkController.isNetworkOwner) {

                                // Network is private, access key is not set, we are the owner - check the status of
                                // shareable URL.  If shareable URL is on, then check if Cytoscape is running and
                                // its and CyNDEX's versions

                                networkController.getStatusOfShareableURL(
                                    function() {
                                        getCytoscapeAndCyRESTVersions();
                                    },
                                    function() {
                                        ; // do nothing here
                                    });

                            } else {
                                // Network is private, access key is not set, we are not the owner.
                                // This network cannot be opened in Cytoscape.  So, disable Open In Cytoscape button.
                                $scope.openInCytoscapeTitle =
                                    "This feature can be used only with Public networks, or Private networks " +
                                    "with an enabled Share URL";
                            };


                            getMembership(function ()
                            {
                                if (networkController.visibility == 'public'
                                    || networkController.isAdmin
                                    || networkController.canEdit
                                    || networkController.canRead
                                    || accesskey) {
                                            resetBackgroudColor();
                                            getNetworkAndDisplay(networkExternalId,drawCXNetworkOnCanvas);
                                }
                            });

                            networkController.readOnlyChecked = networkController.currentNetwork.isReadOnly;
                            //getNetworkAdmins();

                            var sourceFormat =
                                networkService.getNetworkProperty(networkController.subNetworkId,'ndex:sourceFormat');
                            networkController.currentNetwork.sourceFormat = (undefined === sourceFormat) ?
                                'Unknown' : sourceFormat;

                            networkController.currentNetwork.reference = networkService.getNetworkProperty(networkController.subNetworkId,'Reference');
                            networkController.currentNetwork.rightsHolder = networkService.getNetworkProperty(networkController.subNetworkId,'rightsHolder');
                            networkController.currentNetwork.rights = networkService.getNetworkProperty(networkController.subNetworkId, 'rights');
                            networkController.otherProperties =
                                _.sortBy(
                                networkService.getPropertiesExcluding(networkController.subNetworkId,[
                                    'rights','rightsHolder','Reference','ndex:sourceFormat','name','description','version']), 'predicateString');

                            networkController.getAllNetworkSetsOwnedByUser(
                                function(newNetworkSet) {
                                    ;
                                },
                                function(data, status) {
                                    ;
                                });

                            if (networkController.hasMultipleSubNetworks()) {
                                setTitlesForCytoscapeCollection();
                            } else {
                                setDOITitle();
                                setShareTitle();
                            };
                            setEditPropertiesTitle();
                            setDeleteTitle();
                        }
                    )
                    .error(
                        function (error) {
                            displayErrorMessage(error);
                        }
                    );
            };

            var setTitlesForCytoscapeCollection = function() {
                $scope.requestDOITitle = "This network is a Cytoscape collection. Cannot request DOI";
                $scope.exportTitle     = "This network is a Cytoscape collection and cannot be exported";
                $scope.upgradePermissionTitle =
                    "This network is a Cytoscape collection and cannot be edited in NDEx";
                $scope.editPropertiesButtonTitle = "This network is a Cytoscape collection and cannot be edited in NDEx";

                if (!networkController.isNetworkOwner) {
                    $scope.shareTitle  = "Unable to share this network: you do not own it";
                    $scope.deleteTitle = "Unable to delete this network: you do not own it";
                };
            };

            var setDOITitle = function() {
                // we set DOI title only if Request DOI option of More menu is disabled:
                //      !networkController.isNetworkOwner || networkController.readOnlyChecked ||
                //          networkController.hasMultipleSubNetworks())'
                if (!networkController.isNetworkOwner) {
                    $scope.requestDOITitle = "Unable to request DOI for this network: you do not own it ";

                } else if (uiMisc.isNetworkCertified(networkController.currentNetwork)) {

                    if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                        $scope.requestDOITitle = "Unable to request DOI for this network: it is certified and a DOI has been assigned";

                    } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                        $scope.requestDOITitle = "Unable to request DOI for this network: a request has been submitted and the DOI is pending assignment";

                    };

                } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                    $scope.requestDOITitle = "Unable to request DOI for this network: a request has been submitted and the DOI is pending assignment";

                } else if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                    $scope.requestDOITitle = "Unable to request DOI for this network: a DOI has already been assigned";

                } else if (networkController.readOnlyChecked) {
                    $scope.requestDOITitle = "Unable to request DOI for this network: please uncheck the Read Only box and try again";
                };
            };

            var setUpgradePermissionTitle = function() {
                // we set Upgrade Permission title only if Upgrade Permission option of More menu is disabled:
                // networkController.isAdmin || networkController.canEdit || networkController.hasMultipleSubNetworks()
                if (networkController.hasMultipleSubNetworks()) {
                    $scope.upgradePermissionTitle =
                        "This network is a Cytoscape collection and cannot be edited in NDEx";
                } else if (uiMisc.isNetworkCertified(networkController.currentNetwork)) {
                    $scope.upgradePermissionTitle = "Unable to Upgrade Permission for this network: it is certified ";
                } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                    $scope.upgradePermissionTitle = "Unable to Upgrade Permission for this network: DOI is pending ";
                } else if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                    $scope.upgradePermissionTitle = "Unable to Upgrade Permission for this network: it has DOI assigned to it ";
                } else if (networkController.isNetworkOwner) {
                    $scope.upgradePermissionTitle = "Unable to Upgrade Permission for this network: you already own it ";
                } else if (networkController.privilegeLevel.toLowerCase() == 'edit' ) {
                    $scope.upgradePermissionTitle = "Unable to Upgrade Permission for this network: you already have Edit privilege ";
                };
            };

            var setShareTitle = function() {
                // we set Share title only if Share option of More menu is disabled:
                // !networkController.isAdmin
                if (!networkController.isNetworkOwner) {
                    $scope.shareTitle = "Unable to Share this network: you do not own it ";
                };
            };

            var setDeleteTitle = function() {
                // we set Share title only if Share option of More menu is disabled:
                // !(networkController.isAdmin && !networkController.readOnlyChecked)
                if (!networkController.isNetworkOwner) {
                    $scope.deleteTitle = "Unable to Delete this network: you do not own it ";
                } else if (uiMisc.isNetworkCertified(networkController.currentNetwork)) {
                    $scope.deleteTitle = "This network is certified and cannot be deleted";
                } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                    $scope.deleteTitle = "This network has a DOI pending and cannot be deleted ";
                } else if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                    $scope.deleteTitle = "This network has been assigned a DOI and cannot be deleted ";
                }  else if (networkController.readOnlyChecked) {
                    $scope.deleteTitle = "Unable to Delete this network: it is read-only ";
                };
            };

            var setEditPropertiesTitle = function() {
                // !networkController.isAdmin || networkController.hasMultipleSubNetworks()
                if (networkController.hasMultipleSubNetworks()) {
                    $scope.editPropertiesButtonTitle = "This network is a Cytoscape collection and cannot be edited in NDEx";
                } else if (!networkController.isNetworkOwner) {
                    $scope.editPropertiesButtonTitle = "Unable to edit this network: you do not have privilege to modify it";
                } else if (uiMisc.isNetworkCertified(networkController.currentNetwork)) {
                    $scope.editPropertiesButtonTitle = "This network is certified and cannot be modified further";
                } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                    $scope.editPropertiesButtonTitle = "Unable to edit this network: DOI is pending";
                } else if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                    $scope.editPropertiesButtonTitle = "This network has been assigned a DOI and cannot be modified further. ";
                    $scope.editPropertiesButtonTitle += "If you need to update this network please clone it."
                }  else if (networkController.readOnlyChecked) {
                    $scope.editPropertiesButtonTitle = "Unable to edit this network: it is read-only";
                };
            };

            var getMembership = function (callback) {
                if (!networkController.isLoggedInUser) {
                    // if user is anonymous, don't call getMyMembership() because it requires user to be authenticated
                    callback();
                } else {

                    var userId = sharedProperties.getCurrentUserId();
                    var networkId = networkController.currentNetworkId;
                    var directonly = false;

                    ndexService.getUserPermissionForNetworkV2(userId, networkId, directonly,
                        function (membership) {
                            if (membership) {
                                var myMembership = membership[networkId];

                                if (myMembership == 'ADMIN') {
                                    networkController.isAdmin = true;
                                    networkController.privilegeLevel = "Admin";
                                };
                                if (myMembership == 'WRITE') {
                                    networkController.canEdit = true;
                                    networkController.privilegeLevel = "Edit";
                                };
                                if (myMembership == 'READ') {
                                    networkController.canRead = true;
                                    networkController.privilegeLevel = "Read";
                                };
                                setEditPropertiesTitle();
                                setUpgradePermissionTitle();
                            }
                            callback();
                        },
                        function (error) {
                            displayErrorMessage(error);
                        });
                }
            };

            $scope.readOnlyChanged = function()
            {
                ndexService.setNetworkSystemPropertiesV2(networkController.currentNetworkId,
                    "readOnly", networkController.readOnlyChecked,
                    function(data, networkId, property, value) {
                        setDOITitle();
                        setDeleteTitle();
                        setEditPropertiesTitle();
                    },
                    function(error, networkId, property, value) {
                        console.log("unable to make network Read-Only");
                    });
            };
            
            networkController.addQueryEdgeProperty = function () {
                networkController.advancedQueryEdgeProperties.push({});
                networkController.validateAdvancedQuery();
            };

            networkController.removeQueryEdgeProperty = function (index) {
                networkController.advancedQueryEdgeProperties.splice(index, 1);
                networkController.validateAdvancedQuery();
            };

            networkController.addQueryNodeProperty = function () {
                networkController.advancedQueryNodeProperties.push({});
                networkController.validateAdvancedQuery();
            };

            networkController.removeQueryNodeProperty = function (index) {
                networkController.advancedQueryNodeProperties.splice(index, 1);
                networkController.validateAdvancedQuery();
            };

            /*
             * var INCOMPLETE_QUERY_CODE = -1;
             * var EMPTY_QUERY_CODE = 0;
             * var VALID_QUERY_CODE = 1;
             */

            networkController.advancedEdgeQueryIsValid = function () {
                return (VALID_QUERY_CODE == networkController.validateAdvancedEdgeQuery());
            };

            networkController.advancedNodeQueryIsValid = function () {
                return (VALID_QUERY_CODE == networkController.validateAdvancedNodeQuery());
            };

            networkController.isStringEmpty = function(s) {
                if (typeof(s) === 'undefined' || s == null) {
                    return true;
                }
                return ((s.trim()).length > 0) ? false : true;
            }

            networkController.validateAdvancedQuery = function () {
                var advancedEdgeQueryState = networkController.validateAdvancedEdgeQuery();
                var advancedNodeQueryState = networkController.validateAdvancedNodeQuery();

                if ((INCOMPLETE_QUERY_CODE == advancedEdgeQueryState) ||
                    (INCOMPLETE_QUERY_CODE == advancedNodeQueryState)) {
                    networkController.advancedQueryIsValid = false;
                    return;
                }
                if ((EMPTY_QUERY_CODE == advancedEdgeQueryState) &&
                    (EMPTY_QUERY_CODE == advancedNodeQueryState)) {
                    networkController.advancedQueryIsValid = false;
                    return;
                }

                if (((VALID_QUERY_CODE == advancedEdgeQueryState) &&
                    (EMPTY_QUERY_CODE == advancedNodeQueryState) &&
                    (networkController.advancedQueryNodeProperties.length == 1)) ||
                    ((EMPTY_QUERY_CODE == advancedEdgeQueryState) &&
                    (VALID_QUERY_CODE == advancedNodeQueryState) &&
                    (networkController.advancedQueryEdgeProperties.length == 1))) {
                    networkController.advancedQueryIsValid = true;
                    return;
                }

                if ((VALID_QUERY_CODE == advancedEdgeQueryState) &&
                    (VALID_QUERY_CODE == advancedNodeQueryState)) {
                    networkController.advancedQueryIsValid = true;
                    return;
                }

                networkController.advancedQueryIsValid = false;
                return;
            }

            networkController.validateAdvancedEdgeQuery = function () {
                var i;

                for (i = 0; i < networkController.advancedQueryEdgeProperties.length; i++) {
                    var edgeProperty = networkController.advancedQueryEdgeProperties[i];

                    if (networkController.isStringEmpty(edgeProperty.name) &&
                        networkController.isStringEmpty(edgeProperty.value)) {
                        return EMPTY_QUERY_CODE;
                    }

                    if ( (networkController.isStringEmpty(edgeProperty.name) &&
                        !networkController.isStringEmpty(edgeProperty.value) ) ||
                        (!networkController.isStringEmpty(edgeProperty.name) &&
                        networkController.isStringEmpty(edgeProperty.value)) ) {
                        return INCOMPLETE_QUERY_CODE;
                    }
                }

                return VALID_QUERY_CODE;
            }

            networkController.validateAdvancedNodeQuery = function () {
                var i;

                for (i = 0; i < networkController.advancedQueryNodeProperties.length; i++) {
                    var nodeProperty = networkController.advancedQueryNodeProperties[i];

                    if (networkController.isStringEmpty(nodeProperty.name) &&
                        networkController.isStringEmpty(nodeProperty.value)) {
                        return EMPTY_QUERY_CODE;
                    }

                    if ( (networkController.isStringEmpty(nodeProperty.name) &&
                        !networkController.isStringEmpty(nodeProperty.value) ) ||
                        (!networkController.isStringEmpty(nodeProperty.name) &&
                        networkController.isStringEmpty(nodeProperty.value)) ) {
                        return INCOMPLETE_QUERY_CODE;
                    }
                }

                return VALID_QUERY_CODE;
            }

            networkController.resetForm = function () {
                networkController.advancedQueryEdgeProperties = [{}];
                networkController.advancedQueryNodeProperties = [{}];

                networkController.queryWarnings = [];
                networkController.queryErrors = [];

                networkController.validateAdvancedQuery();
                networkController.advancedQueryNodeCriteria = 'Source';
            };

            networkController.resetAdvancedQuery = function () {

                ndexSpinner.startSpinner(spinnerId);
                provenanceService.resetProvenance();
                networkController.successfullyQueried = false;

                networkService.restoreCurrentNiceCXAfterQuery();
                localNetwork = networkService.getOriginalNiceCX();

                if ("Graphic" == $scope.currentView) {
                    // no need to call ndexSpinner.stopSpinner() here since it
                    //will be called in drawCXNetworkOnCanvas->initCyGraphFromCyjsComponents()
                    drawCXNetworkOnCanvas(localNetwork,false);

                } else {

                    var enableFiltering = true;
                    var setGridWidth = false;

                    populateNodeTable(localNetwork, enableFiltering, setGridWidth);
                    populateEdgeTable(localNetwork, enableFiltering, setGridWidth);
                    ndexSpinner.stopSpinner();
                };
            };




            networkController.getAllNetworkSetsOwnedByUser = function (successHandler, errorHandler) {
                if (!networkController.isLoggedInUser) {
                    networkController.networkSets = [];
                    return;
                };

                var userId = sharedProperties.getCurrentUserId(); //ndexUtility.getLoggedInUserExternalId();

                var offset = undefined;
                var limit  = undefined;

                ndexService.getAllNetworkSetsOwnedByUserV2(userId, offset, limit,
                    function (networkSets) {
                        networkController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);
                        successHandler(networkController.networkSets[0]);
                    },
                    function (error, status) {
                        networkController.networkSets = [];
                        console.log("unable to get network sets");
                        errorHandler(error, status);
                    });
            };

            networkController.cloneNetwork = function() {

                var title = 'Clone This Network';

                var networkName  = 'The network <strong>' + networkController.currentNetwork.name + '</strong> ';

                var message = networkName +
                    'will be cloned to your account. <br><br> Are you sure you want to proceed?';

                var dismissModal = false;

                ndexNavigation.openConfirmationModal(title, message, "Confirm", "Cancel", dismissModal,
                    function ($modalInstance) {

                        $rootScope.errors = null;
                        $rootScope.confirmButtonDisabled = true;
                        $rootScope.cancelButtonDisabled = true;
                        $rootScope.progress = "Cloning network in progress ...";

                        var confirmationSpinnerId = "confirmationSpinnerId";
                        ndexSpinner.startSpinner(confirmationSpinnerId);

                        ndexService.cloneNetworkV2(networkController.currentNetworkId,
                            function(data, status, headers, config, statusText) {
                                ndexSpinner.stopSpinner();
                                $modalInstance.dismiss();
                                delete $rootScope.errors;
                                delete $rootScope.confirmButtonDisabled;
                                delete $rootScope.cancelButtonDisabled;
                                delete $rootScope.progress;
                            },
                            function(error) {
                                ndexSpinner.stopSpinner();
                                title = "Unable to Clone Network";
                                message  = networkName + " wasn't cloned to your account.";

                                if (error.message) {
                                    message = message + '<br>' + error.message;
                                };
                                $rootScope.errors = message;
                                delete $rootScope.progress;
                                delete $rootScope.cancelButtonDisabled;

                            });
                    },
                    function ($modalInstance) {
                        // User selected Cancel; return
                        $modalInstance.dismiss();
                        delete $rootScope.errors;
                        delete $rootScope.confirmButtonDisabled;
                        delete $rootScope.cancelButtonDisabled;
                        delete $rootScope.progress;
                        return;
                    });

                return;
            };


            var getCytoscapeAndCyRESTVersions = function() {

                cyREST.getCytoscapeVersion(
                    function(data) {

                        if (data && data['cytoscapeVersion']) {

                            var minAcceptableCSVersion = 360;

                            var cytoscapeVersionStr = data['cytoscapeVersion'];
                            cytoscapeVersionStr = cytoscapeVersionStr.replace(/\./g,'');

                            var currentCytoscapeVersion = parseInt(cytoscapeVersionStr);

                            if (currentCytoscapeVersion < minAcceptableCSVersion) {

                                $scope.openInCytoscapeTitle  =
                                    "You need Cytoscape version 3.6.0 or later to use this feature.\n";
                                $scope.openInCytoscapeTitle +=
                                    "Your version of Cytoscape is " + data['cytoscapeVersion'] + ".";

                            } else {

                                // get CyNDEX version

                                cyREST.getCyNDEXVersion(
                                    function (data) {

                                        if (data && data['data'] && data['data']['appVersion']) {

                                            var minAcceptableCyNDEXVersion = 220;

                                            var cyNDEXVersionStr = data['data']['appVersion'];
                                            cyNDEXVersionStr = cyNDEXVersionStr.replace(/\./g,'');

                                            var currentCyNDEXVersion = parseInt(cyNDEXVersionStr);

                                            if (currentCyNDEXVersion < minAcceptableCyNDEXVersion) {

                                                $scope.openInCytoscapeTitle =
                                                    "You need CyNDEx-2 version 2.2.0 or later to use this feature.\n";
                                                $scope.openInCytoscapeTitle +=
                                                    "Your version of CyNDEx-2 is " + data['data']['appVersion'] + ".";

                                            } else {
                                                // everything is fine: both Cytoscape and CyNDEx-2 are recent enough to
                                                // support the Open in Cytoscape feature.  Enable this button.
                                                $scope.openInCytoscapeTitle = "";
                                            };

                                        } else {
                                            $scope.openInCytoscapeTitle =
                                                "You need CyNDEx-2 version 2.2.0 or later to use this feature.\n" +
                                                "Your version of CyNDEx-2 is too old.";
                                        };

                                    },
                                    function (error) {
                                        $scope.openInCytoscapeTitle =
                                            "To use this feature, you need Cytoscape 3.6.0 or higher running on " +
                                            " your machine (default port: 1234) and the CyNDEx-2 app installed";
                                    }
                                );
                            };
                        } else {
                            $scope.openInCytoscapeTitle =
                                "To use this feature, you need Cytoscape 3.6.0 or higher running on " +
                                " your machine (default port: 1234) and the CyNDEx-2 app installed";
                        };

                    },
                    function(err) {
                        $scope.openInCytoscapeTitle =
                            "To use this feature, you need Cytoscape 3.6.0 or higher running on " +
                            " your machine (default port: 1234) and the CyNDEx-2 app installed";
                    });
            };


            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------
            
            $("#cytoscape-canvas").height($(window).height() - 200);
            $("#divNetworkTabs").height($(window).height() - 200);

            if ($scope.currentView == "Graphic") {
                $("#queryWarningsOrErrorsId").width($("#cytoscape-canvas").width());
            } else {

                if ($scope.activeTab == "Edges") {
                    $("#edgeGridId").height($(window).height() - 235);
                    $("#queryWarningsOrErrorsId").width($("#edgeGridId").width());
                } else {
                    $("#nodeGridId").height($(window).height() - 235);
                    $("#queryWarningsOrErrorsId").width($("#nodeGridId").width());
                };
            };


            $(window).resize(function() {
                $('#cytoscape-canvas').height($(window).height() - 200);
                $('#divNetworkTabs').height($(window).height() - 200);

                if ($scope.currentView == "Graphic") {
                    $("#queryWarningsOrErrorsId").width($("#cytoscape-canvas").width());
                } else {

                    if ($scope.activeTab == "Edges") {
                        $("#queryWarningsOrErrorsId").width($("#edgeGridId").width());
                        $("#edgeGridId").height($(window).height() - 235);
                        $scope.edgeGridApi.grid.gridHeight = $("#edgeGridId").height();
                        $scope.edgeGridApi.core.refresh();

                    } else {
                        $("#queryWarningsOrErrorsId").width($("#nodeGridId").width());
                        $("#nodeGridId").height($(window).height() - 235);
                        $scope.nodeGridApi.grid.gridHeight = $("#nodeGridId").height();
                        $scope.nodeGridApi.core.refresh();
                    };


                };

            });

            $(window).trigger('resize');

             ndexSpinner.startSpinner(spinnerId);

            uiMisc.hideSearchMenuItem();

            initialize();
        }
        
     ]
);


ndexApp.controller('CitationModalCtrl', function ($scope, $modalInstance, citations)
{
    $scope.citations = citations;

    $scope.ok = function () {
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
});
