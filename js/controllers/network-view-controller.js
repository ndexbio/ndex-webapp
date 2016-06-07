ndexApp.controller('networkViewController',
    ['config','provenanceService','networkService', 'ndexService', 'ndexConfigs', 'cyService','cxNetworkUtils',
         'ndexUtility', 'ndexHelper', 'ndexNavigation',
        'sharedProperties', '$scope', '$routeParams', '$modal',
        '$route', '$location', /*'$filter', '$location','$q',*/
        function (config, provenanceService, networkService, ndexService, ndexConfigs, cyService, cxNetworkUtils,
                   ndexUtility, ndexHelper, ndexNavigation,
                  sharedProperties, $scope, $routeParams, $modal,
                  $route , $location/*, $filter /*, $location, $q */)
        {
            var self = this;

            var cy;

            var currentNetworkSummary;

            var networkExternalId = $routeParams.identifier;
            sharedProperties.setCurrentNetworkId(networkExternalId);

            $scope.showFooter = false;

            $scope.networkController = {};

            var networkController  = $scope.networkController;

            networkController.currentNetworkId = networkExternalId;

            networkController.errors = []; // general page errors
            networkController.queryErrors = [];
            networkController.displayProvenance = {};
            networkController.selectionContainer = {};
            networkController.baseURL = $location.absUrl();
            networkController.isSample=false;
            networkController.displayLimit = config.networkDisplayLimit;
            networkController.successfullyQueried = false;

            // turn on (show) Search menu item on Nav Bar
            $scope.$parent.showSearchMenu = true;

            networkController.baseURL = networkController.baseURL.replace(/(.*\/).*$/,'$1');
            
            networkController.tabs = [
                    {"heading": "Network Info", 'active':true},
                    {'heading': 'Nodes/Edges', 'active': false},
                    {'heading': 'Provenance', 'active': false},
                    {'heading': 'Table View', 'active': false}
                ];

            networkController.prettyStyle = "no style yet";
            networkController.prettyVisualProperties = "nothing yet";
            networkController.bgColor = '#8fbdd7';


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
                    "name": "3-step",
                    "description": "3-step",
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


            // this function gets called when user navigates away from the current New Network view.
            // (can also use "$locationChangeStart" instead of "$destroy"
            $scope.$on("$destroy", function(){

                // hide the Search menu item in Nav Bar
                $scope.$parent.showSearchMenu = false;

                showSearchMenuItem();
            });

            /*
            $scope.$watch(function(){
                return $location.path();
            }, function(newPath, oldPath){
                console.log('oldPath = ' + oldPath + '  newPath = ' + newPath );
            })
            */

            $scope.build_provenance_view = function() {
                provenanceService.showProvenance(networkController);
            };

            $scope.getProvenanceTitle = function(provenance)
            {
               return provenanceService.getProvenanceTitle(provenance);
            };


            networkController.refreshProvMap = function (obj) {
                $scope.$apply(function () {
                    networkController.displayProvenance = obj;
                });
            };


            var hideSearchMenuItem = function() {
                var searhMenuItemElemenmt = document.getElementById("searchBarId");
                searhMenuItemElemenmt.style.display = 'none';
            }

            var showSearchMenuItem = function() {
                var searhMenuItemElemenmt = document.getElementById("searchBarId");
                searhMenuItemElemenmt.style.display = 'block';
            }


            var getNetworkAdmins = function()
            {
                ndexService.getNetworkMemberships(networkController.currentNetworkId, 'ADMIN',
                    function(networkAdmins)
                    {
                        for( var i = 0; i < networkAdmins.length; i++ )
                        {
                            var networkAdmin = networkAdmins[i];
                            if( networkAdmin.memberUUID == sharedProperties.getCurrentUserId() )
                            {
                                networkAdmins.splice(i, 1);
                            }
                        }
                        networkController.networkAdmins = networkAdmins;
                    },
                    function(error)
                    {

                    });
            };


            var parseNdexMarkupValue = function ( value ) {
                return {n:  value.replace(/(\[(.*)\])?\(.*\)$/, '$2'),
                        id: value.replace(/(\[.*\])?\((.*)\)$/, "$2")};
            };


            $scope.getNodeName = function(node)
            {
                if (!node) {
                    return 'unknown';
                }

                if (node['n']) {
                    return node['n'];
                }

                if (node['name'] && node['name']['v']) {
                    return node['name']['v'];
                }

                if (node['id']) {
                    return node['id'];
                }

                return 'unknown';
            };

            $scope.getNodeAttributesNames = function(node) {
                var attributeNames = _.keys(node);

                var resultList = ['id'];

                //First section will these attributes in order if they exists
                var topList = ['n', 'r','alias','relatedTo','citations'];
                _(topList).forEach(function (value) {
                    if ( node[value]) {
                        resultList.push(value);
                    }
                });

                var elementsToRemove = topList.concat(['id', '$$hashKey', '$$expanded']);

                for (i = 0; i < elementsToRemove.length; i++) {

                    var index = attributeNames.indexOf(elementsToRemove[i]);
                    if (index > -1) {
                        attributeNames.splice(index, 1);
                    }
                }

                return resultList.concat(attributeNames);
            };

            $scope.getEdgeAttributesNames = function(node) {
                var attributeNames = _.keys(node);

                var elementsToRemove = ['s', 't', 'i', 'id', '$$hashKey', '$$expanded'];

                for (i = 0; i < elementsToRemove.length; i++) {

                    var index = attributeNames.indexOf(elementsToRemove[i]);
                    if (index > -1) {
                        attributeNames.splice(index, 1);
                    }
                }

                return attributeNames;
            };

            $scope.getAttributeValue = function(attributeName, attribute) {

                if (!attribute) {
                    return null;
                }

                var attributeValue ="";

                if (attribute instanceof Object) {
                    if (attribute['v'] && Array.isArray(attribute['v']) && attribute['v'].length > 1) {

                        if(attribute['v'].length > 5) {

                            for (var i = 0; i < 5; i++) {
                                if (i == 0) {
                                    attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " + attribute['v'][i] + "<br>";
                                } else {
                                    attributeValue = attributeValue +  "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " + attribute['v'][i] + "<br>";
                                }
                            }

                            //attributeValue = attributeValue + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +

                                //' <a target="_blank" href="http://www.yahoo.com">more...</a> <br>' ;


/*
                       ' <a class="btn btn-primary" style="width: 150px;">' +
                                '<edit-network-summary-modal ndex-data="networkController.currentNetwork">' +
                                ' Edit Network Profile ' + ' </edit-network-summary-modal> </a><br>';


/*
                        '<a  ng-click="networkController.showMoreAttributes()"> ' + 'more...</a><br>';
*/


                        //<a class="btn btn-primary customButtonWidth"
                        //   ng-click="userController.checkAndDeleteSelectedNetworks()">Delete Networks
                        //</a>


                            //console.log('attributeValue = ' + attributeValue);
                            //console.log();



                        } else {

                            for (var i = 0; i < attribute['v'].length; i++) {
                                if (i == 0) {
                                    attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " + attribute['v'][i] + "<br>";
                                } else {
                                    attributeValue = attributeValue + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " + attribute['v'][i] + "<br> ";
                                }
                            }

                        }


                    } else {
                        attributeValue = (attribute['v']) ? attribute['v'] : '';
                    }
                } else {
                    attributeValue = attribute;
                }

                return attributeValue;
            }

            $scope.checkHowManyAttributes = function(attributeName, attribute) {

                if (!attribute) {
                    return false;
                }

                if ((attribute instanceof Object)
                    && (attribute['v'])
                    && (Array.isArray(attribute['v']))
                    && (attribute['v'].length > 5)) {

                    return true;
                }

                return false;
            }


            networkController.showMoreAttributes = function(attributeName, attribute) {

                var title = attributeName + ':';
                var message =
                    "More attributes is to be shown in this modal ...";

                var attributeValue = "";

                if (attribute instanceof Object) {
                    if (attribute['v'] && Array.isArray(attribute['v'])) {

                        for (var i = 0; i < attribute['v'].length; i++) {
                            attributeValue = attributeValue + attribute['v'][i] + '<br>';
                        }
                    }
                }
                
                networkController.genericInfoModal(title, attributeValue);

                return;
            }

            networkController.genericInfoModal = function(title, message)
            {
                var   modalInstance = $modal.open({
                templateUrl: 'pages/generic-info-modal.html',
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


        $scope.getEdgeLabel = function(edge) {

                if (!edge) {
                    return "unknown";
                }

                var source="source unknown", target="target unknown", predicate="->";

                if (edge['s']) {
                    var nodeObj = networkService.getNodeInfo(edge['s']);
                    source = $scope.getNodeName(nodeObj);
                }
                if (edge['t']) {
                    var nodeObj = networkService.getNodeInfo(edge['t']);
                    target = $scope.getNodeName(nodeObj);
                }
                if (edge['i']) {
                    predicate = edge['i'];
                }

                return source + ' ' + predicate + ' ' + target;
            }

            $scope.getCitation = function (citation) {

                var identfier, retString = 'PMID : unable to get citation info';

                if (citation && citation['dc:type'] && citation['dc:type'].toLowerCase() === 'uri'
                    && citation['dc:identifier']) {

                    identifier = citation['dc:identifier'].split(':')[1];

                    retString = '<a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/' +
                        identifier + '"><strong>PMID: </strong>' +
                        identifier + '</a>';
                }

                return retString;
            };
            /*-----------------------------------------------------------------------*
             * initialize the cytoscape instance from niceCX
             *-----------------------------------------------------------------------*/
            var initCyGraphFromCyjsComponents = function (cyElements, cyLayout, cyStyle, canvasName, attributeNameMap) {

                //console.log(cyElements);

                $(function () { // on dom ready

                    var cv = document.getElementById(canvasName);

                    cy = cytoscape({
                        container: cv,

                        style: cyStyle,

                        layout: cyLayout,

                        elements: cyElements,

                        ready: function () {
                            window.cy = this;
                        }
                    });

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
                                var id= Number(edge.id());
                                cxEdges.push( networkService.getEdgeInfo(id));
                            });

                            $scope.$apply(function () {
                                networkController.selectionContainer = {'nodes': cxNodes, 'edges': cxEdges} ; //{'nodes': selectedNodes, 'edges': selectedEdges};
                                if (!networkController.tabs[1].active )
                                    networkController.tabs[1].active = true;
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
                            if ( ndexDesc) {
                                var desc = n.data(ndexDesc);
                                if (desc) {
                                    menuList.push(desc);
                                }
                            }
                            if ( ndexLink) {
                                var ndexLinkList = n.data(ndexLink);
                                if ( typeof ndexLinkList === 'string')
                                    ndexLinkList = [ndexLinkList];
                                _.forEach(ndexLinkList, function (e) {
                                    var markup = parseNdexMarkupValue(e);
                                    if ( markup.id) {
                                        var url = networkController.baseURL + markup.id;
                                        menuList.push('<a href="' + url + '">' +
                                            (markup.n? markup.n : markup.id)+ '</a>');
                                    }
                                });
                            }
                            if ( ndexExtLink) {
                                var extLinkList = n.data(ndexExtLink);
                                if ( typeof extLinkList === 'string')
                                    extLinkList = [ extLinkList];
                                _.forEach(extLinkList, function (e) {
                                    var markup = parseNdexMarkupValue(e);
                                    if ( markup.id) {
                                        menuList.push('<a href="' + markup.id + '">' +
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
                                        menuList.push('<a href="' + url + '">' +
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
                                        menuList.push('<a href="' + markup.id + '">' +
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



            var drawCXNetworkOnCanvas = function (cxNetwork, noStyle) {
                var attributeNameMap = {} ; //cyService.createElementAttributeTable(cxNetwork);

                var cyElements = cyService.cyElementsFromNiceCX(cxNetwork, attributeNameMap);
                var cyStyle = cyService.cyStyleFromNiceCX(cxNetwork, attributeNameMap);

                var cxBGColor = cyService.cyBackgroundColorFromNiceCX(cxNetwork);
                if ( cxBGColor)
                    networkController.bgColor = cxBGColor;
                // networkController.prettyStyle added for debugging -- remove/comment out when done
                networkController.prettyStyle = JSON.stringify(cyStyle, null, 2);

                // networkController.prettyVisualProperties added for debugging -- remove/comment out when done
                networkController.prettyVisualProperties = JSON.stringify(cxNetwork.visualProperties, null, 2);
                
                var layoutName = 'cose';

                if ( ! noStyle && cyService.allNodesHaveUniquePositions(cyElements)) {
                    layoutName = 'preset';
                }

                var cyLayout = {name: layoutName};

                initCyGraphFromCyjsComponents(cyElements, cyLayout, cyStyle, 'cytoscape-canvas' ,attributeNameMap);

            };
            
            var getNetworkAndDisplay = function (networkId, callback) {
      //          var config = angular.injector(['ng', 'ndexServiceApp']).get('config');
                // hard-coded parameters for ndexService call, later on we may want to implement pagination

                if ( networkController.currentNetwork.edgeCount > config.networkDisplayLimit) {
                    // get edges, convert to CX obj
                    networkController.isSample = true;
                    (request2 = networkService.getSampleCXNetworkFromOldAPI(networkId, config.networkDisplayLimit) )
                        .success(
                            function (network) {

                                callback(network, true);
                            }
                        )
                        .error(
                            function (error) {
                                if (error.status != 0) {
                                    networkController.errors.push({label: "Get Network Edges Request: ", error: error});
                                } else {
                                    networkController.errors.push({
                                        label: "Get Network Edges Request: ",
                                        error: "Process killed"
                                    });
                                }
                            }
                        );
                } else {
                    // get complete CX stream and build the CX network object.
                    (request2 = networkService.getCXNetwork(networkId) )
                        .success(
                            function (network) {

                                callback(network, false);
                            }
                        )
                        .error(
                            function (error) {
                                if (error.status != 0) {
                                    networkController.errors.push({label: "Get Network in CX: ", error: error});
                                } else {
                                    networkController.errors.push({
                                        label: "Get network in CX fromat: ",
                                        error: "Process killed"
                                    });
                                }
                            }
                        );

                }

            };

            networkController.queryNetworkAndDisplay = function () {
                networkService.neighborhoodQueryFromOldAPI(networkController.currentNetworkId, networkController.searchString, networkController.searchDepth.value)
                    .success(
                        function (network) {
                            networkController.successfullyQueried = true;
                            networkController.currentNetwork =
                              {name: "Neighborhood query result on network - " + currentNetworkSummary.name,
                                  "nodeCount": Object.keys(network.nodes).length,
                                  "edgeCount": Object.keys(network.edges).length,
                                  "queryString": networkController.searchString,
                                  "queryDepth" : networkController.searchDepth.value
                              };
                            drawCXNetworkOnCanvas(network,true);
                            if (!networkController.tabs[0].active )
                                networkController.tabs[0].active = true;
                            networkController.selectionContainer = {};
                        }
                    )
                    .error(
                        function (error) {
                            if (error.status != 0) {
                                if( error.data.message == "Error in queryForSubnetwork: Result set is too large for this query.")
                                {
                                    networkController.queryErrors.push("Error Querying: The maximum query size is " + networkQueryLimit);
                                }
                                else
                                {
                                    networkController.queryErrors.push(error.data.message);
                                }

                                // close the modal.
                                modalInstance.close();
                            }
                        }
                    );  
            };

            networkController.backToOriginalNetwork = function () {
                networkService.resetNetwork();
                networkController.currentNetwork = currentNetworkSummary;
                drawCXNetworkOnCanvas(networkService.getNiceCX(),false);
                networkController.successfullyQueried = false;
                if (!networkController.tabs[0].active )
                    networkController.tabs[0].active = true;
                networkController.selectionContainer = {};

            };

            var initialize = function () {
                // vars to keep references to http calls to allow aborts

                // get network summary
                // keep a reference to the promise
                networkService.getNetworkSummaryFromNdex(networkExternalId) 
                    .success(
                        function (network) {
                            networkController.currentNetwork = network;
                            currentNetworkSummary = network;

                            if (!network.name) {
                                networkController.currentNetwork.name = "Untitled";
                            }

                            getMembership(function ()
                            {
                                networkController.showRetrieveMessage = false;
                                networkController.readyToRenderNetworkInUI = true;

                                if (network.visibility == 'PUBLIC'
                                    || networkController.isAdmin
                                    || networkController.canEdit
                                    || networkController.canRead) {

                                            getNetworkAndDisplay(networkExternalId,drawCXNetworkOnCanvas);

                                }
                            });
                            
                            networkController.readOnlyChecked = networkController.currentNetwork.readOnlyCommitId > 0;
                            getNetworkAdmins();

                            var sourceFormat =
                                networkService.getNetworkProperty('sourceFormat');
                            networkController.currentNetwork.sourceFormat = (undefined === sourceFormat) ?
                                'Unknown' : sourceFormat;

                            networkController.currentNetwork.reference = networkService.getNetworkProperty('Reference');
                            networkController.currentNetwork.rightsHolder = networkService.getNetworkProperty('rightsHolder');
                            networkController.currentNetwork.rights = networkService.getNetworkProperty('rights');
                            networkController.otherProperties = networkService.getPropertiesExcluding(['rights','rightsHolder','Reference','sourceFormat']);
                        }
                    )
                    .error(
                        function (error) {
                            networkController.showRetrieveMessage = false;
                            if ((error != null) && (typeof(error.message) !== 'undefined')) {
                                networkController.errors.push({label: "Unable to retrieve network. ", error: error.message});
                            } else {
                                networkController.errors.push({label: "Unable to retrieve network. ", error: "Unknown error."});
                            }
                        }
                    );

            };
            

            var getMembership = function (callback) {
                ndexService.getMyMembership(networkController.currentNetworkId,
                    function (membership)
                    {
                        if (membership && membership.permissions == 'ADMIN')
                        {
                            networkController.isAdmin = true;
                            networkController.privilegeLevel = "Admin";
                        }
                        if (membership && membership.permissions == 'WRITE')
                        {
                            networkController.canEdit = true;
                            networkController.privilegeLevel = "Edit";
                        }
                        if (membership && membership.permissions == 'READ')
                        {
                            networkController.canRead = true;
                            networkController.privilegeLevel = "Read";

                        }
                        callback();
                    },
                    function (error) {
                        //console.log(error);
                    });

            };
            
            $scope.readOnlyChanged = function()
            {
                ndexService.setReadOnly(networkController.currentNetworkId, networkController.readOnlyChecked);
            };



            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

            networkController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);

            $("#cytoscape-canvas").height($(window).height() - 185);
            $("#divNetworkTabs").height($(window).height() - 185);

            hideSearchMenuItem();

            initialize();


        }
        
     ]
);