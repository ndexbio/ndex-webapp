ndexApp.controller('networkController',
    ['config', 'ndexService', 'ndexConfigs', 'cytoscapeService', 'provenanceVisualizerService', 'ndexUtility', 'ndexHelper', 'ndexNavigation', 'sharedProperties', '$scope', '$routeParams', '$modal', '$route', '$filter', '$location', '$http','$q', '$sce',
        function (config, ndexService, ndexConfigs, cytoscapeService, provenanceVisualizerService, ndexUtility, ndexHelper, ndexNavigation, sharedProperties, $scope, $routeParams, $modal, $route, $filter, $location, $http, $q, $sce) {

            //              Process the URL to get application state
            //-----------------------------------------------------------------------------------
            var networkExternalId = $routeParams.identifier;
            sharedProperties.setCurrentNetworkId(networkExternalId);

            var INCOMPLETE_QUERY_CODE = -1;
            var EMPTY_QUERY_CODE = 0;
            var VALID_QUERY_CODE = 1;

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

            networkController.privilegeLevel = "None";

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

            networkController.networkAdmins = null;

            networkController.edgePropertyNamesForAdvancedQuery = [];
            networkController.nodePropertyNamesForAdvancedQuery = [];

            networkController.numberOfBelNetworkNamespacesAsInt = 0;

            networkController.currentNetwork.rightsHolder = [];
            networkController.currentNetwork.rights = [];

            $scope.provenance = [];
            $scope.displayProvenance = [];

            networkController.readyToRenderNetworkInUI = false;
            networkController.showRetrieveMessage = true;


            // when this page loads, we need to show Graphic View and Table View menus in the nav bar
            $scope.$parent.showViewMenus = true;

            $scope.tree = [{name: "Node", nodes: []}];

            $scope.delete = function(data) {
                data.nodes = [];
            };
            $scope.add = function(data) {
                var post = data.nodes.length + 1;
                var newName = data.name + '-' + post;
                data.nodes.push({name: newName,nodes: []});
            };

            // when user navigates away from this page, we need to hidde Graphic View and Table View menus
            // fron the nav bar
            $scope.$on("$destroy", function(){
                $scope.$parent.showViewMenus = false;
            });

            $scope.getProvenanceTitle = function(provenance)
            {
                if( typeof provenance == 'undefined' )
                    return "";
                if( provenance.properties == null )
                    return provenance.uri;
                for( var i = 0; i < provenance.properties.length; i++ )
                {
                    var p = provenance.properties[i];
                    if(p.name.toLowerCase() == "dc:title")
                        return p.value;
                }
                return provenance.uri;
            };

            var extractUuidFromUri = function( uri )
            {
                var idStart = uri.lastIndexOf('/');
                return uri.substring(idStart + 1);
            };

            var extractHostFromUri = function( uri )
            {
                var parser = document.createElement('a');
                parser.href = uri;
                return parser.protocol + "//" + parser.host;
            };


            var generateWebAppUrlFromUuid = function(uuid)
            {
                var baseUrl = $location.absUrl();
                baseUrl = baseUrl.substring( 0, baseUrl.indexOf( $location.url() ) );

                return baseUrl + "/network/" + uuid;
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
                var uuid = extractUuidFromUri(prov.uri);
                provMap[node_id].uuid = uuid;
                provMap[node_id].host = extractHostFromUri(prov.uri);
                if( uuid != cn.externalId )
                {
                    //Check and see if the UUID is on this server, if so, set the webapp url. Otherwise, it should
                    //not be set.
                    (ndexService.getNetwork(uuid) )
                        .success( function (network)
                        {
                            provMap[node_id].webapp_url = generateWebAppUrlFromUuid(uuid);
                        }
                    )
                        .error( function (error)
                        {

                        }
                    );
                }

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

            /*
            $scope.networkToBeDisplayedInCanvas = function() {

                if (typeof(networkController) === 'undefined' ||
                    typeof(networkController.currentSubnetwork) === 'undefined' ||
                    typeof(networkController.currentSubnetwork.edgeCount) === 'undefined' ||
                    typeof(config) === 'undefined' ||
                    typeof(config.networkDisplayLimit) === 'undefined') {
                    return false;
                }

                return ((networkController.currentSubnetwork.edgeCount <= config.networkDisplayLimit) &&
                        (networkController.currentSubnetwork.edgeCount > 0));
            }
            */

            $scope.currentSubnetworkEdgeCountNotZero = function() {
                if (typeof(networkController) === 'undefined' ||
                    typeof(networkController.currentSubnetwork) === 'undefined' ||
                    typeof(networkController.currentSubnetwork.edgeCount) === 'undefined') {
                    return false;
                }
                return (networkController.currentSubnetwork.edgeCount > 0);
            }

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
                    function (network, json) {
                        //console.log("got query results for : " + networkController.searchString);
                        //csn = network;
                        //csn.json = json;
                        networkController.queryErrors = [];
                        networkController.currentSubnetwork = network;
                        /*
                        if ($scope.networkToBeDisplayedInCanvas()) {
                            cytoscapeService.setNetwork(network);
                        }
                        */

                        // enableFiltering set to true means that filtering will be on regardless of the size
                        // of the network
                        var enableFiltering = true;
                        populateEdgeTable(enableFiltering);
                        populateNodeTable(enableFiltering);

                        // close the modal
                        networkController.successfullyQueried = true;
                        modalInstance.close();
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
                initialize();
                networkController.successfullyQueried = false;
            };

            networkController.isPredicateReservedWord = function(wordToCheck) {
                var reservedWords = ['rights', 'rightsHolder'];

                if (!wordToCheck) {
                    return true;
                }

                return reservedWords.indexOf(wordToCheck) > -1;
            }



            //                  local functions

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

            var getNumberOfBelNetworkNamespaces = function()
            {
                ndexService.getNumberOfBelNetworkNamespaces(networkController.currentNetworkId,
                    function(data)
                    {
                        networkController.numberOfBelNetworkNamespaces = "Not Archived";

                        var i = 0;
                        for (i = 0; i < data.metaData.length; i++) {

                            if (data.metaData[i].name.toLowerCase() === 'belnamespacefiles') {
                                if (data.metaData[i].elementCount > 0) {
                                    networkController.numberOfBelNetworkNamespaces = "Archived (" +
                                        data.metaData[i].elementCount + ")";
                                    networkController.numberOfBelNetworkNamespacesAsInt = data.metaData[i].elementCount;
                                }
                                return;
                            }
                        }
                    },
                    function(error)
                    {
                        networkController.numberOfBelNetworkNamespaces = "Can't retrieve";
                    });
            };

            var getNetworkSourceFormat = function(networkProperties)
            {
                networkController.currentNetworkSourceFormat = 'undefined';

                if ('undefined'===typeof(networkProperties)) {
                    return;
                }

                for( var i = 0; i < networkProperties.length; i++ ) {

                    if ((typeof(networkProperties[i].predicateString) !== 'undefined') &&
                                (networkProperties[i].predicateString.toLowerCase() === 'sourceformat')) {

                        if (typeof(networkProperties[i].value) !== 'undefined') {
                            networkController.currentNetworkSourceFormat =
                                networkProperties[i].value.toUpperCase();
                            return;
                        }
                    }
                }
            }

            var getNetworkReference = function(networkProperties)
            {
                networkController.currentNetwork.reference = "";

                if ('undefined'===typeof(networkProperties)) {
                    return;
                }

                var length = networkProperties.length;
                var i = 0;

                // remove all Reference attributes (there should only be one, but we'll
                // handle the erroneous case when there are more than one)
                while (i < length) {

                    if ((typeof(networkProperties[i].predicateString) !== 'undefined') &&
                        (networkProperties[i].predicateString.toLowerCase() === 'reference')) {

                        if (typeof(networkProperties[i].value) !== 'undefined') {
                            networkController.currentNetwork.reference = networkProperties[i].value;
                            networkProperties.splice(i, 1);
                            length = length - 1;
                            continue;
                        }
                    }
                    i = i + 1;
                }
            }

            var getLicensingInfo = function(networkProperties)
            {
                networkController.currentNetwork.rightsHolder = [];
                networkController.currentNetwork.rights = [];

                if ('undefined'===typeof(networkProperties)) {
                    return;
                }

                for( var i = 0; i < networkProperties.length; i++ ) {

                    if (typeof(networkProperties[i].predicateString) !== 'undefined') {

                        if (networkProperties[i].predicateString === 'rightsHolder') {

                            networkController.currentNetwork.rightsHolder.push(networkProperties[i].value);

                        } else if (networkProperties[i].predicateString === 'rights') {

                            networkController.currentNetwork.rights.push(networkProperties[i].value);

                        }
                    }
                }

                return;
            }

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

                        if (!network.name) {
                            networkController.currentNetwork.name = "No name";
                        }

                        getMembership(function ()
                        {
                            networkController.showRetrieveMessage = false;
                            networkController.readyToRenderNetworkInUI = true;

                            if (network.visibility == 'PUBLIC'
                                || networkController.isAdmin
                                || networkController.canEdit
                                || networkController.canRead)
                                getEdges(function (subnetwork) {
                                    /*
                                    if ($scope.networkToBeDisplayedInCanvas()) {
                                        cytoscapeService.setNetwork(subnetwork);
                                    }
                                    */

                                    // enableFiltering set to false means that filtering will be on if the size
                                    // of the network is no greater than 500 edges
                                    var enableFiltering = false;
                                    populateEdgeTable(enableFiltering);
                                    populateNodeTable(enableFiltering);
                                });
                        });
                        networkController.readOnlyChecked = cn.readOnlyCommitId > 0;
                        getNetworkAdmins();

                        getNetworkSourceFormat(networkController.currentNetwork.properties);
                        getNetworkReference(networkController.currentNetwork.properties);
                        getLicensingInfo(networkController.currentNetwork.properties);

                        if ("BEL" === networkController.currentNetworkSourceFormat) {
                            // for BEL networks, check if Namespaces have been archived
                            getNumberOfBelNetworkNamespaces();
                        }
                        getProvenance();
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
                var config = angular.injector(['ng', 'ndexServiceApp']).get('config');
                // hard-coded parameters for ndexService call, later on we may want to implement pagination
                var blockSize = config.networkTableLimit;
                var skipBlocks = 0;

                // get first convenienceuple of edges
                (request2 = ndexService.getNetworkByEdges(networkController.currentNetworkId, skipBlocks, blockSize) )
                    .success(
                    function (network) {
                        //csn = network; // csn is a debugging convenience variable
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
                        networkController.showRetrieveMessage = false;
                        if ((error != null) && (typeof error.message !== 'undefined')) {
                            networkController.errors.push({label: "Unable to retrieve network provenance: ", error: error.message});
                        } else {
                            networkController.errors.push({label: "Unable to retrieve network provenance: ", error: "Unknown error"});
                        }
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

            var getEdgeCitationIds = function(edgeKey)
            {
                if( !edgeKey )
                    return [];
                var edge = networkController.currentSubnetwork.edges[edgeKey];
                if( !edge )
                    return [];
                return edge.citationIds;
            };

            var getNodeCitationIds = function(nodeKey)
            {
                if( !nodeKey )
                    return [];
                var node = networkController.currentSubnetwork.nodes[nodeKey];
                if( !node )
                    return [];
                return node.citationIds;
            };

            $scope.getNumEdgeCitations = function(edgeKey)
            {
                var citationIds = getEdgeCitationIds(edgeKey);
                return citationIds.length;
            };

            $scope.getNumNodeCitations = function(nodeKey)
            {
                var citationIds = getNodeCitationIds(nodeKey);
                return citationIds.length;
            };

            $scope.linkify = function(cellContents)
            {
                if (typeof(cellContents) === "undefined" || cellContents === "") {
                    return "";
                }
                if( cellContents.startsWith("http") )
                {
                    return '&nbsp;<a target="_blank" href="'+cellContents+'">External Link</a>'
                }
                else
                {
                    return '<span title=' + "'"+ cellContents + "'>" + cellContents + '</span>';
                }
            };

            var getCitationContributorsString = function(citationId)
            {
                var citation = networkController.currentSubnetwork.citations[citationId];
                if( citation.contributors.length < 1 )
                    return "";
                var result = "";
                for( var i = 0; i < citation.contributors.length - 1; i++ )
                {
                    result += citation.contributors[i] + ", ";
                }
                result += citation.contributors[citation.contributors.length - 1];
                return result;
            };

            var getCitations = function(citationIds)
            {
                var result = [];
                for( var i = 0; i < citationIds.length; i++ )
                {
                    var citationId = citationIds[i];
                    var citation = networkController.currentSubnetwork.citations[citationId];
                    if( networkController.hasCitation(citationId) )
                        citation.link = networkController.getCitation(citationId);
                    citation.contributorsString = getCitationContributorsString(citationId);
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

            $scope.showEdgeCitations = function(edgeKey)
            {
                var edgeCitationIds = getEdgeCitationIds(edgeKey);
                var edgeCitations = getCitations( edgeCitationIds );
                showCitations(edgeCitations);
            };

            $scope.showNodeCitations = function(edgeKey)
            {
                var nodeCitationIds = getNodeCitationIds(edgeKey);
                var nodeCitations = getCitations( nodeCitationIds );
                showCitations(nodeCitations);
            };

            networkController.hasCitation = function(citationId)
            {
                if( !networkController.currentSubnetwork.citations[citationId].identifier )
                    return false;
                var identifier = networkController.currentSubnetwork.citations[citationId].identifier;
                if( identifier.startsWith('http') )
                    return true;
                if( identifier.toLowerCase().startsWith('pubmed') )
                    return identifier.toLowerCase().split(':')[0] == 'pubmed';
                return identifier.toLowerCase().split(':')[0] == 'pmid';
            };


            networkController.getCitation = function (citationId) {
                if( !networkController.hasCitation(citationId) )
                    return "javaScript:void(0)";
                var identifier = networkController.currentSubnetwork.citations[citationId].identifier;
                if( identifier.startsWith('http') )
                    return identifier;
                return 'http://www.ncbi.nlm.nih.gov/pubmed/' + identifier.split(':')[1];
            };

            var populateEdgeTable = function(enableFiltering)
            {
                var nodeLabelMap = $scope.networkController.currentSubnetwork.nodeLabelMap;
                var edges = networkController.currentSubnetwork.edges;
                var terms = networkController.currentSubnetwork.terms;
                var edgeKeys = $scope.networkController.getEdgeKeys();

                var edgePropertyKeys = {};

                var longestSubject = "";
                var longestPredicate = "";
                var longestObject = "";

                var isCitationColumnVisible = false;

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

                    //var predicate = terms[edges[edgeKey].predicateId].name;
                    var predicate = "";

                    if ((typeof(edges[edgeKey]) !== 'undefined') &&
                        (typeof(edges[edgeKey].predicateId) !== 'undefined') &&
                        (typeof(terms[edges[edgeKey].predicateId]) !== 'undefined') &&
                        (typeof(terms[edges[edgeKey].predicateId].name) !== 'undefined') ) {

                        predicate = terms[edges[edgeKey].predicateId].name;
                    }


                    var object = nodeLabelMap[edges[edgeKey].objectId];

                    longestSubject = longestSubject.length < subject.length ? subject : longestSubject;
                    longestPredicate = longestPredicate.length < predicate.length ? predicate : longestPredicate;
                    longestObject = longestObject.length < object.length ? object : longestObject;

                    if (edges[edgeKey].citationIds.length > 0) {
                        isCitationColumnVisible = true;
                    }
                }


                // enable filtering if number of edges in the network is no greater than 500
                var filteringEnabled = (networkController.currentNetwork.edgeCount <= 500) ? true : false;


                if (enableFiltering) {
                    // enable filtering even if the number of edges in the network is greater than 500;
                    // this is the case when we want filtering on after running simple or advance query
                    filteringEnabled = true;
                }
                var columnDefs = [
                    {
                        field: 'Subject',
                        displayName: 'Subject',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestSubject)
                    },
                    {
                        field: 'Predicate',
                        displayName: 'Predicate',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestPredicate)
                    },
                    {
                        field: 'Object',
                        displayName: 'Object',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestObject)
                    },
                    {
                        field: 'Citations',
                        displayName: 'Citations',
                        cellToolTip: false,
                        minWidth: calcColumnWidth('Citations'),
                        enableFiltering: false,
                        enableSorting: false,
                        visible: isCitationColumnVisible,
                        cellTemplate: "<div class='text-center'><h6><a ng-show='grid.appScope.getNumEdgeCitations(COL_FIELD) > 0' ng-click='grid.appScope.showEdgeCitations(COL_FIELD)'>{{grid.appScope.getNumEdgeCitations(COL_FIELD)}}</a></h6></div>"
                    }
                ];
                var headers = Object.keys(edgePropertyKeys);

                if (headers.length > 0) {
                    networkController.edgePropertyNamesForAdvancedQuery = [];

                    var field = "";
                    for (i = 0; i < headers.length - 1; i++)
                    {
                        field = headers[i];
                        field = field.replace("(", "*");
                        field = field.replace(")", "*");
                        var columnDef = {
                            field: field,
                            displayName: headers[i],
                            cellTooltip: true,
                            minWidth: calcColumnWidth(headers[i]),
                            enableFiltering: filteringEnabled,
                            cellTemplate: "<div class='ui-grid-cell-contents hideLongLine' ng-bind-html='grid.appScope.linkify(COL_FIELD)'></div>"
                        };
                        columnDefs.push(columnDef);
                        networkController.edgePropertyNamesForAdvancedQuery.push(field);
                    }
                    //Special width for the last column
                    field = headers[i];
                    field = field.replace("(", "*");
                    field = field.replace(")", "*");
                    var columnDef = {
                        field: field,
                        displayName: headers[i],
                        cellTooltip: true,
                        minWidth: calcColumnWidth(headers[i], true),
                        enableFiltering: filteringEnabled,
                        cellTemplate: "<div class='ui-grid-cell-contents hideLongLine' ng-bind-html='grid.appScope.linkify(COL_FIELD)'></div>"
                    };
                    columnDefs.push(columnDef);
                    networkController.edgePropertyNamesForAdvancedQuery.push(field);

                }

                $scope.edgeGridApi.grid.options.columnDefs = columnDefs;
                $scope.edgeGridApi.grid.gridWidth = $('#divNetworkTabs').width();

                refreshEdgeTable(headers);
            };

            var refreshEdgeTable = function (headers) {
                var nodeLabelMap = $scope.networkController.currentSubnetwork.nodeLabelMap;
                var edges = networkController.currentSubnetwork.edges;
                var terms = networkController.currentSubnetwork.terms;
                var edgeKeys = $scope.networkController.getEdgeKeys();

                $scope.edgeGridOptions.data = [];
                for( i = 0; i < edgeKeys.length; i++ )
                {
                    var edgeKey = edgeKeys[i];
                    var subject = nodeLabelMap[edges[edgeKey].subjectId];

                    //var predicate = terms[edges[edgeKey].predicateId].name;
                    var predicate = "";

                    if ((typeof(edges[edgeKey]) !== 'undefined') &&
                        (typeof(edges[edgeKey].predicateId) !== 'undefined') &&
                        (typeof(terms[edges[edgeKey].predicateId]) !== 'undefined') &&
                        (typeof(terms[edges[edgeKey].predicateId].name) !== 'undefined') ) {

                        predicate = terms[edges[edgeKey].predicateId].name;
                    }

                    var object = nodeLabelMap[edges[edgeKey].objectId];

                    var row = {"Subject": subject, "Predicate": predicate, "Object": object, "Citations": edgeKey};

                    var properties = edges[edgeKey].properties;

                    // create row of properties for the table
                    for( j = 0; j < properties.length; j++ )
                    {
                        var key = properties[j].predicateString;
                        key = key.replace("(", "*");
                        key = key.replace(")", "*");
                        row[key] = properties[j].value;
                    }

                    // The Edges table defines properties header columns, but
                    // not all properties declared in the table header can be present for every row.
                    // For cases where some property is missing from the table row, we need to implicitly assign it an
                    // empty value to provide correct scrolling behavior of the table (defect NDEX-656).
                    for( k = 0; k < headers.length; k++ )
                    {
                        var key = headers[k];
                        key = key.replace("(", "*");
                        key = key.replace(")", "*");
                        if (!row.hasOwnProperty(key)) {
                            row[key] = "";
                        }
                    }

                    $scope.edgeGridOptions.data.push( row );
                }
                /*
                if (changeEnableFiltering) {
                    for (j = 0; j < $scope.edgeGridApi.grid.options.columnDefs.length; j++) {
                        if ($scope.edgeGridApi.grid.options.columnDefs[j].displayName.toLowerCase() !== 'citations') {
                            $scope.edgeGridApi.grid.options.columnDefs[j].enableFiltering = true;
                            $scope.edgeGridOptions.columnDefs[j].enableFiltering = true;
                        }
                    }
                    $scope.edgeGridApi.core.refresh();
                }
                */
            };

            var populateNodeTable = function(enableFiltering)
            {
                var nodes = networkController.currentSubnetwork.nodes;
                var nodeKeys = $scope.networkController.getNodeKeys();

                var nodePropertyKeys = {};

                var longestName = "Label";

                var isCitationColumnVisible = false;

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

                    longestName = name.length > longestName.length ? name : longestName;

                    if (nodes[nodeKey].citationIds.length > 0) {
                        isCitationColumnVisible = true;
                    }
                }

                // enable filtering if number of edges in the network is no greater than 500;
                // we still check number of edges even though we populate node headers in this routine
                var filteringEnabled = (networkController.currentNetwork.edgeCount <= 500) ? true : false;

                if (enableFiltering) {
                    // enable filtering even if the number of edges in the network is greater than 500;
                    // this is the case when we want filtering on after running simple or advance query.
                    // we still check number of edges even though we populate node header in this routine
                    filteringEnabled = true;
                }
                var columnDefs = [
                    {
                        field: 'Label',
                        displayName: 'Label',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestName)
                    },
                    {
                        field: 'Citations',
                        displayName: 'Citations',
                        cellToolTip: false,
                        minWidth: calcColumnWidth('Citations'),
                        enableFiltering: false,
                        visible: isCitationColumnVisible,
                        cellTemplate: "<div class='text-center'><h6><a ng-show='grid.appScope.getNumNodeCitations(COL_FIELD) > 0' ng-click='grid.appScope.showNodeCitations(COL_FIELD)'>{{grid.appScope.getNumNodeCitations(COL_FIELD)}}</a></h6></div>"
                    }
                ];
                var headers = Object.keys(nodePropertyKeys);
                if (headers.length > 0) {
                    networkController.nodePropertyNamesForAdvancedQuery = [];
                    var field = "";
                    for (i = 0; i < headers.length - 1; i++)
                    {
                        field = headers[i];
                        field = field.replace("(", "*");
                        field = field.replace(")", "*");
                        var columnDef = {
                            field: field,
                            displayName: headers[i],
                            cellTooltip: true,
                            minWidth: calcColumnWidth(headers[i]),
                            enableFiltering: filteringEnabled,
                            cellTemplate: "<div class='ui-grid-cell-contents hideLongLine' ng-bind-html='grid.appScope.linkify(COL_FIELD)'></div>"
                        };
                        columnDefs.push(columnDef);
                        networkController.nodePropertyNamesForAdvancedQuery.push(field);
                    }
                    //Special width for the last column
                    field = headers[i];
                    field = field.replace("(", "*");
                    field = field.replace(")", "*");
                    var columnDef = {
                        field: headers[i],
                        displayName: headers[i],
                        cellTooltip: true,
                        minWidth: calcColumnWidth(headers[i], true),
                        enableFiltering: filteringEnabled,
                        cellTemplate: "<div class='ui-grid-cell-contents  hideLongLine' ng-bind-html='grid.appScope.linkify(COL_FIELD)'></div>"
                    };
                    columnDefs.push(columnDef);
                    networkController.nodePropertyNamesForAdvancedQuery.push(field);
                }

                $scope.nodeGridApi.grid.options.columnDefs = columnDefs;
                $scope.nodeGridApi.grid.gridWidth = $('#divNetworkTabs').width();

                refreshNodeTable(headers);
            };

            var refreshNodeTable = function(headers)
            {
                var nodes = networkController.currentSubnetwork.nodes;
                var nodeKeys = $scope.networkController.getNodeKeys();

                $scope.nodeGridOptions.data = [];

                for( i = 0; i < nodeKeys.length; i++ )
                {
                    var nodeKey = nodeKeys[i];
                    var label = networkController.currentSubnetwork.nodeLabelMap[networkController.currentSubnetwork.nodes[nodeKey].id];

                    var row = {"Label": label, "Citations": nodeKey};

                    var properties = nodes[nodeKey].properties;

                    // create row of properties for the table
                    for( j = 0; j < properties.length; j++ )
                    {
                        var key = properties[j].predicateString;
                        key = key.replace("(", "*");
                        key = key.replace(")", "*");
                        row[key] = properties[j].value;
                    }

                    // The Nodes table defines properties header columns, but
                    // not all properties declared in the table header can be present for every row.
                    // For cases where some property is missing from the table row, we need to implicitly assign it an
                    // empty value to provide correct scrolling behavior of the table (defect NDEX-656).
                    for( k = 0; k < headers.length; k++ )
                    {
                        var key = headers[k];
                        key = key.replace("(", "*");
                        key = key.replace(")", "*");
                        if (!row.hasOwnProperty(key)) {
                            row[key] = "";
                        }
                    }

                    $scope.nodeGridOptions.data.push( row );
                }
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

            //$("#divNetworkTabs").height(500);

            initialize();

            //Advanced Query
            networkController.advancedQueryNodeCriteria = 'source';
            networkController.advancedQueryEdgeProperties = [{}];
            networkController.advancedQueryNodeProperties = [{}];
            networkController.queryMode = 'simple';
            networkController.advancedQueryIsValid = false;

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

            networkController.runAdvancedQuery = function(networkQueryLimit)
            {
                var url = "/network/"+networkController.currentNetworkId+"/asNetwork/prototypeNetworkQuery";
                var mode = 'Source';
                if( networkController.advancedQueryNodeCriteria == 'target' )
                {
                    mode = 'Target'
                }
                else if( networkController.advancedQueryNodeCriteria.indexOf('both') != -1 )
                {
                    mode = 'Both'
                }
                else if( networkController.advancedQueryNodeCriteria.indexOf('either') != -1 )
                {
                    mode = 'Either'
                }

                var validEdgeProperties = null;
                var i;
                for( i = 0; i < networkController.advancedQueryEdgeProperties.length; i++ )
                {
                    var edgeProperty = networkController.advancedQueryEdgeProperties[i];
                    if( edgeProperty.name && edgeProperty.value )
                    {
                        if( !validEdgeProperties )
                            validEdgeProperties = [];
                        validEdgeProperties.push( {name: edgeProperty.name, value: edgeProperty.value} );
                    }
                }

                var validNodeProperties = null;
                for( i = 0; i < networkController.advancedQueryNodeProperties.length; i++ )
                {
                    var nodeProperty = networkController.advancedQueryNodeProperties[i];
                    if( nodeProperty.name && nodeProperty.value )
                    {
                        if( !validNodeProperties )
                            validNodeProperties = [];
                        validNodeProperties.push( {name: nodeProperty.name, value: nodeProperty.value} );
                    }
                }

                var postData =
                {
                    nodePropertyFilter:
                    {
                        propertySpecifications: validNodeProperties,
                        mode: mode
                    },
                    edgeLimit: networkQueryLimit,
                    queryName: "Not used yet."
                };

                if( validEdgeProperties )
                {
                    postData.edgeFilter =
                    {
                        propertySpecifications: validEdgeProperties
                    };
                }

                if( validNodeProperties )
                {
                    postData.nodeFilter =
                    {
                        propertySpecifications: validNodeProperties,
                        mode: mode
                    };
                }

                var config = ndexConfigs.getPostConfig(url, postData);
                var canceler = $q.defer();
                config.timeout = canceler.promise;

                var modalInstance = $modal.open({
                    templateUrl: 'queryContent.html',
                    scope: $scope,
                    backdrop: 'static'
                });

                // cancel
                // Close the modal and abort the AJAX request.
                networkController.cancel = function () {
                    modalInstance.close();
                    canceler.resolve();
                };

                $http(config).
                    success(function(network, status, headers, config)
                    {
                        //var json = angular.toJson(network);
                        ndexUtility.setNetwork(network);
                        ndexHelper.updateNodeLabels(network);
                        //ndexHelper.updateTermLabels(network);
                        //csn = network;
                        //csn.json = json;
                        networkController.queryErrors = [];
                        networkController.currentSubnetwork = network;

                        /*
                        if ($scope.networkToBeDisplayedInCanvas()) {
                            cytoscapeService.setNetwork(network);
                        }
                        */

                        // enableFiltering set to true means that filtering will be on regardless of the size
                        // of the network
                        var enableFiltering = true;
                        populateEdgeTable(enableFiltering);
                        populateNodeTable(enableFiltering);

                        // close the modal
                        networkController.successfullyQueried = true;
                        modalInstance.close();
                    }).
                    error(function(error, status, headers, config)
                    {
                        networkController.queryErrors.push(error.message);
                        modalInstance.close();
                    });
            };

            /*
             * var INCOMPLETE_QUERY_CODE = -1;
             * var EMPTY_QUERY_CODE = 0;
             * var VALID_QUERY_CODE = 1;
             */

            networkController.advancedEdgeQueryIsValid = function () {
                return (VALID_QUERY_CODE == networkController.validateAdvancedEdgeQuery()) ? true : false;
            }
            networkController.advancedNodeQueryIsValid = function () {
                return (VALID_QUERY_CODE == networkController.validateAdvancedNodeQuery()) ? true : false;
            }

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
                networkController.validateAdvancedQuery();
            };

        }]);


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
