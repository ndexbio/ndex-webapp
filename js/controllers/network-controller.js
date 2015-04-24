ndexApp.controller('networkController',
    ['ndexService', 'cytoscapeService', 'provenanceVisualizerService', 'ndexUtility', 'ndexNavigation', 'sharedProperties', '$scope', '$routeParams', '$modal', '$route', '$filter',
        function (ndexService, cytoscapeService, provenanceVisualizerService, ndexUtility, ndexNavigation, sharedProperties, $scope, $routeParams, $modal, $route, $filter) {

            //              Process the URL to get application state
            //-----------------------------------------------------------------------------------
            var networkExternalId = $routeParams.identifier;
            sharedProperties.setCurrentNetworkId(networkExternalId);

            //              CONTROLLER INTIALIZATIONS
            //------------------------------------------------------------------------------------

            $scope.edgeGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                onRegisterApi: function( gridApi )
                {
                    $scope.edgeGridApi = gridApi;
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
                }
            };


            $scope.networkController = {};
            var networkController = $scope.networkController;

            networkController.currentNetworkId = networkExternalId; // externalId
            networkController.currentNetwork = {}; // network summary
            networkController.currentSubnetwork = {}; // subnetwork
            networkController.errors = []; // general page errors
            networkController.queryErrors = [];

            networkController.isAdmin = false;
            networkController.canEdit = false;
            networkController.canRead = false;
            networkController.directIsAdmin = false;
            networkController.directCanEdit = false;
            networkController.directCanRead = false;

            networkController.successfullyQueried = false;

            $scope.provenance = [];
            $scope.displayProvenance = [];



            $scope.tree = [{name: "Node", nodes: []}];

            $scope.delete = function(data) {
                data.nodes = [];
            };
            $scope.add = function(data) {
                var post = data.nodes.length + 1;
                var newName = data.name + '-' + post;
                data.nodes.push({name: newName,nodes: []});
            };

            $scope.getProvenanceTitle = function(provenance)
            {
                if( typeof provenance == 'undefined' )
                    return "";
                if( provenance.properties == null )
                    return provenance.uri;
                for( var i = 0; i < provenance.properties.length; i++ )
                {
                    var p = provenance.properties[i];
                    if(p.name == "dc:title")
                        return p.value;
                }
                return provenance.uri;
            };

            $scope.buildGraph = function(prov, level, parent_node, edge_label, merge, nodes, edges, provMap)
            {
                var node_id = nodes.length;

                var node = {
                    id: node_id,
                    label: $scope.getProvenanceTitle(prov),
                    level: level
                };

                nodes.push(node);
                provMap[node_id] = prov;

                if( parent_node != -1 )
                {
                    if( !merge )
                    {
                        var edge = {
                            to: parent_node,
                            from: node_id,
                            label: edge_label
                        };
                        edges.push(edge);
                    }
                    else
                    {
                        var edge = {
                            to: parent_node,
                            from: node_id
                        };
                        edges.push(edge);
                    }
                }

                var inputs = prov.creationEvent.inputs;
                if( inputs != null )
                {
                    if( inputs.length > 1 )
                    {
                        var join_id = node_id + 1;
                        level++;
                        var join_node = {
                            id: join_id,
                            label: "",
                            level: level
                        };
                        nodes.push(join_node);
                        var join_edge = {
                            to: node_id,
                            from: join_id,
                            label: prov.creationEvent.eventType + "\non\n" + $filter('date')(prov.creationEvent.endedAtTime, 'mediumDate')
                        };
                        edges.push(join_edge);
                        node_id = join_id;
                        merge = true;
                    }
                    else
                    {
                        merge = false;
                    }

                    for(var i = 0; i < inputs.length; i++ )
                    {
                        var edgeLabel = prov.creationEvent.eventType + "\non\n" + $filter('date')(prov.creationEvent.endedAtTime, 'mediumDate')
                        $scope.buildGraph(inputs[i], level+1, node_id, edgeLabel, merge, nodes, edges, provMap);
                    }
                }
                else
                {

                    var start_node = {
                        id: node_id+1,
                        label: 'Start',
                        level: level+1
                    };
                    nodes.push(start_node);

                    var edge = {
                        to: node_id,
                        from: node_id+1,
                        label: prov.creationEvent.eventType + "\non\n" + $filter('date')(prov.creationEvent.endedAtTime, 'mediumDate')
                    };

                    edges.push(edge)
                }

            };

            $scope.build_provenance_view = function()
            {
                var nodes = [];
                var edges = [];
                var provMap = [];

                $scope.buildGraph($scope.provenance, 1, -1, '', false, nodes, edges, provMap);

                // create a network
                var container = document.getElementById('provenanceNetwork');
                var data = {
                    nodes: nodes,
                    edges: edges
                };
                var options = {
                    width: '100%',
                    height: '600px',
                    stabilize: false,
                    smoothCurves: false,
                    hierarchicalLayout: {
                        direction: 'UD'
                    },
                    hover: true,
                    selectable: false,
                    edges: {
                        fontFace: 'helvetica',
                        width: 2,
                        style: 'arrow',
                        color: 'silver',
                        fontColor: 'black',
                        widthSelectionMultiplier: 1
                    },
                    nodes: {
                        // default for all nodes
                        fontFace: 'helvetica',
                        shape: 'box',
                        color: {
                            border: 'lightgreen',
                            background: 'lightgreen',
                            hover: {
                                border: 'orange',
                                background: 'orange'
                            }
                        }

                    }
                };

                $scope.displayProvenance = provMap[0];

                var network = new vis.Network(container, data, options);
                network.lastHover = 0;

                network.moveTo(
                    {
                        position: {
                            x: '0',
                            y: '400'
                        },
                        scale: '1'
                    }
                );

                network.on('hoverNode', function (properties) {

                    var node_id = properties.node;
                    var node = this.nodes[node_id];
                    //This is the start node. Don't highlight it.
                    if( node.label == "Start" )
                    {
                        node.hover=false;
                        return;
                    }
                    var hover_id = this.lastHover;
                    var lastHoverNode = this.nodes[hover_id];
                    lastHoverNode.hover=false;
                    node.hover=true;
                    this.lastHover = node_id;
                    if (typeof provMap[node_id] == 'undefined')
                        return;
                    $scope.$apply(function(){
                        $scope.displayProvenance = provMap[node_id];
                    });

                });

                network.on('blurNode', function (properties) {
                    var node_id = properties.node;
                    var node = this.nodes[node_id];
                    node.hover=true;
                });

                network.nodes[0].hover = true;
            };

            networkController.getEdgeKeys = function()
            {
                var keys = [];
                for( var key in networkController.currentSubnetwork.edges )
                {
                    if( networkController.currentSubnetwork.edges.hasOwnProperty(key) )
                        keys.push(key);
                }
                return keys;
            };

            networkController.getNodeKeys = function()
            {
                var keys = [];
                for( var key in networkController.currentSubnetwork.nodes )
                {
                    if( networkController.currentSubnetwork.nodes.hasOwnProperty(key) )
                        keys.push(key);
                }
                return keys;
            };

            //Used for pagination
            $scope.currentEdgePage = 0;
            $scope.currentNodePage = 0;
            $scope.itemsPerPage = 30;
            $scope.paginationMaxSize = 5;

            $scope.numberOfPages=function(){
                length = networkController.currentSubnetwork.edges.length;
                return Math.ceil(length/$scope.pageSize);
            };

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

            //                  scope functions

            // queries within a network
            networkController.submitNetworkQuery = function (networkQueryLimit) {

                // var to keep the reference to http call to call abort method;
                var request = null;


                // replace with in page loader
                var modalInstance = $modal.open({
                    templateUrl: 'queryContent.html',
                    scope: $scope,
                    backdrop: 'static'
                });

                // cancel
                // Close the modal and abort the AJAX request.
                networkController.cancel = function () {
                    modalInstance.close();
                    request.abort();
                };

                // Note we save the 'promise' from the ndexService wrapped http request. We do not want to lose the original
                // reference and lose access to the .abort method.
                // David says: The last parameter is the edgeLimit. We are using this in the Web App temporarily.
                (request = ndexService.queryNetwork(networkController.currentNetworkId, networkController.searchString, networkController.searchDepth.value, networkQueryLimit) )
                    .success(
                    function (network) {
                        //console.log("got query results for : " + networkController.searchString);
                        csn = network;
                        networkController.queryErrors = [];
                        networkController.currentSubnetwork = network;
                        cytoscapeService.setNetwork(network);
                        // close the modal
                        networkController.successfullyQueried = true;
                        modalInstance.close();
                    }
                )
                    .error(
                    function (error) {
                        if (error.status != 0) {
                            if( error.data == "Error in queryForSubnetwork: Result set is too large for this query.")
                            {
                                networkController.queryErrors.push("Error Querying: The maximum query size is " + networkQueryLimit);
                            }
                            else
                            {
                                networkController.queryErrors.push(error.data);
                            }

                            // close the modal.
                            modalInstance.close();
                        }
                    }
                );
            };

            networkController.backToOriginalNetwork = function () {
                $route.reload();
            };


            networkController.getCitation = function (citation) {
                //return;
                var identifier = networkController.currentSubnetwork.citations[citation].identifier;
                var parsedString = identifier.split(':');

                if (parsedString[0] == 'pmid') {
                    return 'http://www.ncbi.nlm.nih.gov/pubmed/' + parsedString[1];
                } else {
                    //TODO
                }
            };

            //                  local functions

            var initialize = function () {
                // vars to keep references to http calls to allow aborts
                var request1 = null;
                var request2 = null;

                // get network summary
                // keep a reference to the promise
                (request1 = ndexService.getNetwork(networkController.currentNetworkId) )
                    .success(
                    function (network) {
                        cn = network;
                        networkController.currentNetwork = network;
                        getMembership(function ()
                        {
                            if (network.visibility == 'PUBLIC'
                                || networkController.isAdmin
                                || networkController.canEdit
                                || networkController.canRead)
                                getEdges(function (subnetwork) {
                                    cytoscapeService.setNetwork(subnetwork);
                                    populateEdgeTable();
                                    populateNodeTable();
                                })
                        });
                        $scope.readOnlyChecked = cn.readOnlyCommitId > 0;
                    }
                )
                    .error(
                    function (error) {
                        if (error.status != 0) {
                            networkController.errors.push({label: "Get Network Info Request: ", error: error});
                        } else {
                            networkController.errors.push({
                                label: "Get Network Info Request: ",
                                error: "Process Killed"
                            });
                        }
                    }
                );

            };

            var getMembership = function (callback) {
                ndexService.getMyMembership(networkController.currentNetworkId,
                    function (membership) {
                        if (membership && membership.permissions == 'ADMIN')
                            networkController.isAdmin = true;
                        if (membership && membership.permissions == 'WRITE')
                            networkController.canEdit = true;
                        if (membership && membership.permissions == 'READ')
                            networkController.canRead = true;
                        callback();
                    },
                    function (error) {
                        //console.log(error);
                    });

            };

            var getDirectMembership = function (callback) {
                ndexService.getMyDirectMembership(networkController.currentNetworkId,
                    function (membership) {
                        if (membership && membership.permissions == 'ADMIN')
                            networkController.directIsAdmin = true;
                        if (membership && membership.permissions == 'WRITE')
                            networkController.directCanEdit = true;
                        if (membership && membership.permissions == 'READ')
                            networkController.directCanRead = true;
                        callback();
                    },
                    function (error) {
                        //console.log(error);
                    });

            };

            var getEdges = function (callback) {
                // hard-coded parameters for ndexService call, later on we may want to implement pagination
                var blockSize = 300;
                var skipBlocks = 0;

                // get first convenienceuple of edges
                (request2 = ndexService.getNetworkByEdges(networkController.currentNetworkId, skipBlocks, blockSize) )
                    .success(
                    function (network) {
                        csn = network; // csn is a debugging convenience variable
                        networkController.currentSubnetwork = network;
                        networkController.selectedEdges = network.edges;
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
            };

            var getProvenance = function () {
                ndexService.getProvenance(networkController.currentNetworkId,
                    function (data) {
                        // fake data
                        // provenanceVisualizerService.setProvenance(provenanceVisualizerService.createFakeProvenance());
                        // real data
                        provenanceVisualizerService.setProvenance(data);
                        $scope.provenance = data;
                        var x = 10;

                    }, function (error) {
                        //TODO
                    });
            };

            var calcColumnWidth = function(header, isLastColumn)
            {
                var result = header.length * 10;
                result = result < 100 ? 100 : result;
                if( isLastColumn )
                    result += 40;
                return result > 250 ? 250 : result;
            };


            $scope.getEdgeCitationLinks = function(edgeKey)
            {
                if( !edgeKey )
                    return "";
                var edge = networkController.currentSubnetwork.edges[edgeKey];
                if( !edge )
                    return "";
                var citationIds = edge.citationIds;
                return $scope.getCitationLinks(citationIds);
            };

            $scope.getNodeCitationLinks = function(nodeKey)
            {
                if( !nodeKey )
                    return "";
                var node = networkController.currentSubnetwork.nodes[nodeKey];
                if( !node )
                    return "";
                var citationIds = node.citationIds;
                return $scope.getCitationLinks(citationIds);
            };

            $scope.getCitationLinks = function(citationIds)
            {
                var links = "";
                for( var i = 0; i < citationIds.length; i++ )
                {
                    var citation = citationIds[i];
                    links += "<a href='"+networkController.getCitation(citation)+"' target='_blank'>";
                    links += "  <sup>";
                    links += "      <span class='glyphicon glyphicon-book'></span>";
                    links += "  </sup>";
                    links += "</a>";
                }
                return links;
            };

            var populateEdgeTable = function()
            {
                var nodeLabelMap = $scope.networkController.currentSubnetwork.nodeLabelMap;
                var edges = networkController.currentSubnetwork.edges;
                var terms = networkController.currentSubnetwork.terms;
                var edgeKeys = $scope.networkController.getEdgeKeys();

                var edgePropertyKeys = {};

                var longestSubject = "";
                var longestPredicate = "";
                var longestObject = "";

                //The primary task performed by this loop is to determine all properties.
                for( var i = 0; i < edgeKeys.length; i++ )
                {
                    //Primary task determine keys in this row.
                    var edgeKey = edgeKeys[i];
                    var properties = edges[edgeKey].properties;
                    for( var j = 0; j < properties.length; j++ )
                    {
                        var key = properties[j].predicateString;
                        edgePropertyKeys[key] = true;
                    }

                    //Determine the length of
                    var subject = nodeLabelMap[edges[edgeKey].subjectId];
                    var predicate = terms[edges[edgeKey].predicateId].name;
                    var object = nodeLabelMap[edges[edgeKey].objectId];

                    longestSubject = longestSubject.length < subject.length ? subject : longestSubject;
                    longestPredicate = longestPredicate.length < predicate.length ? predicate : longestPredicate;
                    longestObject = longestObject.length < object.length ? object : longestObject;
                }

                var columnDefs = [
                    {
                        field: 'Subject',
                        cellTooltip: true,
                        minWidth: calcColumnWidth(longestSubject)
                    },
                    {
                        field: 'Predicate',
                        cellTooltip: true,
                        minWidth: calcColumnWidth(longestPredicate)
                    },
                    {
                        field: 'Object',
                        cellTooltip: true,
                        minWidth: calcColumnWidth(longestObject)
                    },
                    {
                        field: 'Citations',
                        cellToolTip: false,
                        minWidth: calcColumnWidth('Citations'),
                        enableFiltering: false,
                        cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP"><span ng-bind-html="grid.appScope.getEdgeCitationLinks(COL_FIELD)"></span></div>'
                    }
                ];
                var headers = Object.keys(edgePropertyKeys);
                if(  headers.length > 0 )
                {
                    for (i = 0; i < headers.length - 1; i++)
                    {
                        var columnDef = {field: headers[i], cellTooltip: true, minWidth: calcColumnWidth(headers[i])};
                        columnDefs.push(columnDef);
                    }
                    //Special width for the last column
                    var columnDef = {field: headers[i], cellTooltip: true, minWidth: calcColumnWidth(headers[i], true)};
                    columnDefs.push(columnDef);
                }

                for( i = 0; i < edgeKeys.length; i++ )
                {
                    var edgeKey = edgeKeys[i];
                    var subject = nodeLabelMap[edges[edgeKey].subjectId];
                    var predicate = terms[edges[edgeKey].predicateId].name;
                    var object = nodeLabelMap[edges[edgeKey].objectId];

                    var row = {"Subject": subject, "Predicate": predicate, "Object": object, "Citations": edgeKey};

                    for (var j = 0; j < headers.length; j++)
                    {
                        var header = headers[j];
                        row[header] = "";
                    }

                    var properties = edges[edgeKey].properties;
                    for( j = 0; j < properties.length; j++ )
                    {
                        var key = properties[j].predicateString;
                        row[key] = properties[j].value;
                    }

                    $scope.edgeGridOptions.data.push( row );
                }
                $scope.edgeGridApi.grid.options.columnDefs = columnDefs;
                $scope.edgeGridApi.grid.gridWidth = $('#divNetworkTabs').width();
            };

            var populateNodeTable = function()
            {
                var nodes = networkController.currentSubnetwork.nodes;
                var nodeKeys = $scope.networkController.getNodeKeys();

                var nodePropertyKeys = {};

                var longestName = "";

                //The primary task performed by this loop is to determine all properties.
                for( var i = 0; i < nodeKeys.length; i++ )
                {
                    //Primary task determine keys in this row.
                    var nodeKey = nodeKeys[i];
                    var properties = nodes[nodeKey].properties;
                    for( var j = 0; j < properties.length; j++ )
                    {
                        var key = properties[j].predicateString;
                        nodePropertyKeys[key] = true;
                    }

                    //Determine the length of
                    var name = networkController.currentSubnetwork.nodeLabelMap[networkController.currentSubnetwork.nodes[nodeKey].id];

                    longestName = longestName < name ? name : longestName;
                }

                var columnDefs = [
                    {
                        field: 'Label',
                        cellTooltip: true,
                        minWidth: calcColumnWidth(longestName),
                    },
                    {
                        field: 'Citations',
                        cellToolTip: false,
                        minWidth: calcColumnWidth('Citations'),
                        enableFiltering: false,
                        cellTemplate: '<div class="ui-grid-cell-contents" title="TOOLTIP"><span ng-bind-html="grid.appScope.getNodeCitationLinks(COL_FIELD)"></span></div>'
                    }
                ];
                var headers = Object.keys(nodePropertyKeys);
                if( headers.length > 0 )
                {
                    for (i = 0; i < headers.length - 1; i++)
                    {
                        var columnDef = {field: headers[i], cellTooltip: true, minWidth: calcColumnWidth(headers[i])};
                        columnDefs.push(columnDef);
                    }
                    //Special width for the last column
                    var columnDef = {field: headers[i], cellTooltip: true, minWidth: calcColumnWidth(headers[i], true)};
                    columnDefs.push(columnDef);
                }


                for( i = 0; i < nodeKeys.length; i++ )
                {
                    var nodeKey = nodeKeys[i];
                    var label = networkController.currentSubnetwork.nodeLabelMap[networkController.currentSubnetwork.nodes[nodeKey].id];

                    var row = {"Label": label, "Citations": nodeKey};

                    for (var j = 0; j < headers.length; j++)
                    {
                        var header = headers[j];
                        row[header] = "";
                    }

                    var properties = nodes[nodeKey].properties;
                    for( j = 0; j < properties.length; j++ )
                    {
                        var key = properties[j].predicateString;
                        row[key] = properties[j].value;
                    }

                    $scope.nodeGridOptions.data.push( row );
                }
                $scope.nodeGridApi.grid.options.columnDefs = columnDefs;
                $scope.nodeGridApi.grid.gridWidth = $('#divNetworkTabs').width();
            };

            $scope.readOnlyChanged = function(readOnlyChecked)
            {
                ndexService.setReadOnly(networkController.currentNetworkId, readOnlyChecked);
            };

            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

            // prepare the cytoscape viewer
            cytoscapeService.initCyGraph();
            provenanceVisualizerService.initCyGraph();

            // set the initial depth for queries
            networkController.searchDepth = {
                "name": "1-step",
                "description": "1-step",
                "value": 1,
                "id": "1"
            };

            networkController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);
            // Initialize the current network and current subnetwork
            initialize();
            getProvenance();

        }]);


