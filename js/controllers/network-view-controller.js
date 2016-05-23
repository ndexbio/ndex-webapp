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
            
            var networkExternalId = $routeParams.identifier;
            sharedProperties.setCurrentNetworkId(networkExternalId);


            $scope.networkController = {};

            var networkController  = $scope.networkController;

            networkController.currentNetworkId = networkExternalId;

            networkController.errors = []; // general page errors
            networkController.queryErrors = [];
            networkController.displayProvenance = {};
            networkController.selectionContainer = {};
            networkController.baseURL = $location.absUrl();

            networkController.baseURL = networkController.baseURL.replace(/(.*\/).*$/,'$1');
            
            networkController.tabs = [
                    {"heading": "Network Info", 'active':true},
                    {'heading': 'Nodes/Edges', 'active': false},
                    {'heading': 'Provenance', 'active': false}
                ];

            networkController.prettyStyle = "no style yet";
            networkController.prettyVisualProperties = "nothing yet";


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
            };


            var setSelectionContainer = function (updatedSelection) {
                //networkController.selectionContainer

                var selectedNodes = {};
                var selectedEdges = {};
                _.forEach(updatedSelection.nodes, function (node) {
                    var data = node.data;
                    //var id = node.id;
                    selectedNodes[node.id] = networkService.getNodeInfo(data.id);
                   // nodes.id({'id': id, 'data': data})   ;
                });
                
                _.forEach ( updatedSelection.edges, function (edge){
                    selectedEdges[edge.id] = networkService.getEdgeInfo(edge.id);
                });

                networkController.selectionContainer = {'nodes': selectedNodes, 'edges': selectedEdges};
            };


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
                            //            selectionContainer.nodes = cxNodes;
                            //            selectionContainer.nodes = cxEdges;

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

       /*             if ( ndexLink || ndexDesc || ndexExtLink) {
                        var selectorStr = [ndexLink,ndexDesc, ndexExtLink].join(' ');
                        selectorStr = '['+ selectorStr +']';
                        cy.nodes(selectorStr).forEach(function (n) {
                            var ndex_link = n.data(ndexLink);
                            var mArry = ndex_link.match(/(\[(.*)\])?(.*)$/);
                            if ( mArray ) {
                                if (mArry.length === 2 ) {
                                    var m_title = mArry[0];
                                    var m_uuid = mArry[1];
                                } else {
                                    var m_title = null;
                                    var m_uuid = mArray[0];
                                }
                            }
                            var m_uuid = ndex_link.replace(/(\[.*\])?(.*)$/, '$2');
                            var url = networkController.baseURL  + '/' + id;

                            console.log("process node " + g + " , id:" + id);
                            n.qtip({
                                content: //'hello'
                                '<a target="_blank" href="' + url + '">' + g + '</a>',
                                /*  [  {
                                 name: 'GeneCard',
                                 url: 'http://www.genecards.org/cgi-bin/carddisp.pl?gene=' + g
                                 },
                                 {
                                 name: 'UniProt search',
                                 url: 'http://www.uniprot.org/uniprot/?query='+ g +'&fil=organism%3A%22Homo+sapiens+%28Human%29+%5B9606%5D%22&sort=score'
                                 },
                                 {
                                 name: 'GeneMANIA',
                                 url: 'http://genemania.org/search/human/' + g
                                 }
                                 ].map(function( link ){
                                 return '<a target="_blank" href="' + link.url + '">' + link.name + '</a>';
                                 }).join('<br />\n')
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
                    } */

                }); // on dom ready

            };



            var drawCXNetworkOnCanvas = function (cxNetwork) {
                var attributeNameMap = {} ; //cyService.createElementAttributeTable(cxNetwork);

                var cyElements = cyService.cyElementsFromNiceCX(cxNetwork, attributeNameMap);
                var cyStyle = cyService.cyStyleFromNiceCX(cxNetwork, attributeNameMap);

                // networkController.prettyStyle added for debugging -- remove/comment out when done
                networkController.prettyStyle = JSON.stringify(cyStyle, null, 2);

                // networkController.prettyVisualProperties added for debugging -- remove/comment out when done
                networkController.prettyVisualProperties = JSON.stringify(cxNetwork.visualProperties, null, 2);
                
                var layoutName = 'cose';

                if (cyService.allNodesHaveUniquePositions(cyElements)) {
                    layoutName = 'preset';
                }

                var cyLayout = {name: layoutName};

                initCyGraphFromCyjsComponents(cyElements, cyLayout, cyStyle, 'cytoscape-canvas' ,attributeNameMap);

            };
            
            var getNetworkAndDisplay = function (networkId, callback) {
                var config = angular.injector(['ng', 'ndexServiceApp']).get('config');
                // hard-coded parameters for ndexService call, later on we may want to implement pagination

                if ( networkController.currentNetwork.edgeCount > config.networkDisplayLimit) {
                    // get edges, convert to CX obj
                    (request2 = networkService.getSampleCXNetworkFromOldAPI(networkId, config.networkDisplayLimit) )
                        .success(
                            function (network) {

                                callback(network);
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

                                callback(network);
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

            var initialize = function () {
                // vars to keep references to http calls to allow aborts

                // get network summary
                // keep a reference to the promise
                networkService.getNetworkSummaryFromNdex(networkExternalId) 
                    .success(
                        function (network) {
                            networkController.currentNetwork = network;

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


            initialize();


        }
        
     ]
);