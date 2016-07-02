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

            // turn on (show) Search menu item on the Nav Bar
            $scope.$parent.showSearchMenu = true;

            // turn on (show) Graphic View and Table View menu items on the Nav Bar
            $scope.$parent.showViewMenus = true;

            networkController.baseURL = networkController.baseURL.replace(/(.*\/).*$/,'$1');

            networkController.advancedQueryNodeCriteria = 'source';
            networkController.advancedQueryEdgeProperties = [{}];
            networkController.advancedQueryNodeProperties = [{}];

            networkController.edgePropertyNamesForAdvancedQuery = undefined;
            networkController.nodePropertyNamesForAdvancedQuery = undefined;


            networkController.context = {};

            networkController.tabs = [
                {"heading": "Network Info", 'active':true},
                {'heading': 'Nodes/Edges', 'active': false, 'disabled': true},
                {'heading': 'Provenance', 'active': false},
                {'heading': 'Advanced Query', 'hidden': true, 'active': false}
            ];

            //networkController.prettyStyle = "no style yet";
            //networkController.prettyVisualProperties = "nothing yet";
            var resetBackgroudColor = function () {
                networkController.bgColor = '#8fbdd7';
            }


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

            $scope.setReturnView = function(view) {
                sharedProperties.setNetworkViewPage(view);
            }

            $scope.backToSimpleQuery = function(event) {

                // this is needed to Close the Advacned Query tab in case the Close tab sign (x) was clicked
                event.stopPropagation();


                networkController.tabs[3].active = false;
                networkController.tabs[3].hidden = true;

                networkController.backToOriginalNetwork();
                
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

                showSearchMenuItem();

                // also, hide the Graphic View nad Table View menu items from that nav bar
                $scope.$parent.showViewMenus = false;
            });

            /*
            $scope.$watch(function(){
                return $location.path();
            }, function(newPath, oldPath){
                console.log('oldPath = ' + oldPath + '  newPath = ' + newPath );
            })
            */


            $scope.activateAdvancedQueryTab = function() {

                //populate the node and edge properties

                if ( networkController.edgePropertyNamesForAdvancedQuery == undefined) {

                    networkController.edgePropertyNamesForAdvancedQuery = [];
                    networkController.nodePropertyNamesForAdvancedQuery = [];
                    populateNodeAndEdgeAttributesForAdvancedQuery();
                }    

                networkController.queryMode = 'advanced';

                for (var i = 0; i < 3; i++) {
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
            }
            
            
            $scope.build_provenance_view = function() {
                provenanceService.showProvenance(networkController);
            };

            $scope.getProvenanceTitle = function()
            {
               return provenanceService.getProvenanceTitle();
            };


            networkController.refreshProvMap = function (obj) {
                $scope.$apply(function () {
                    networkController.displayProvenance = obj;
                });
            };


            var hideSearchMenuItem = function() {
                var searhMenuItemElement = document.getElementById("searchBarId");
                searhMenuItemElement.style.display = 'none';
            }

            var showSearchMenuItem = function() {
                var searhMenuItemElement = document.getElementById("searchBarId");
                searhMenuItemElement.style.display = 'block';
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
                }

                return retValue;
            }


            var getStringAttributeValue = function(attribute) {

                if (!attribute) {
                    return null;
                }

                var attributeValue = attribute;
                var attr = attribute.toLowerCase();

                if (attr.startsWith('http://')
                    && !attr.startsWith('http://biopax') && !attr.startsWith('http://www.biopax')
                    && !attr.startsWith('http://purl') && !attr.startsWith('http://www.purl')) {

                    attributeValue = '<a target="_blank" href="' + attribute + '">' + attribute + '</a>';
                    return attributeValue;
                }

                var splitString = attribute.split(":");
                if ((splitString.length != 2) && (splitString.length != 3)) {
                    return attributeValue;
                }

                var prefix = splitString[0].toLowerCase();
                var value  = (splitString.length == 3) ? (splitString[1] + ":" + splitString[2]) : splitString[1];
                var URI;

                if (prefix in networkController.context) {
                    URI = networkController.context[prefix];
                    if (!URI.endsWith("/")) {
                        URI = URI + "/";
                    }

                    if (value.startsWith('CHEMBL')) {
                        // remove ":" from  CHEMBL since the pattern for CHEMBL Id is '^CHEMBL\d+$'
                        value = value.replace(':', '');
                    }

                    if (validateEntityID(URI, value)) {
                        attributeValue = '<a target="_blank" href="' + URI + value + '">' + attribute + '</a>';
                    }

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

                    if (!isNaN(value)) {

                        // valid CHEBI Entity identifier is described by this
                        // regular expression: '^CHEBI:\d+$'
                        // but here we already know that value is a number, so no need to use regex for
                        // validating entityId

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

                } else if (attr.startsWith('pubchem.compound:')) {

                    var entityId = splitString[1];

                    // valid Pubchem Compound Entity identifier is described by this
                    // regular expression: '^\d+$';
                    var isBubchemCompoundIdValid = /^\d+$/.test(value);

                    if (isBubchemCompoundIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/pubchem.compound/' +
                            value + '">' + attribute + '</a>';
                    }

                }

                return attributeValue;
            }


            $scope.getNodeName = function(node)
            {
            
                return node['_cydefaultLabel'];
            };

            $scope.getNodeAttributesNames = function(node) {
                var attributeNames = Object.keys(node);

                var resultList = ['id'];

                //First section has these attributes in order if they exists
                var topList = ['n', 'r','alias','relatedTo','citations'];
                _(topList).forEach(function (value) {
                    if ( node[value]) {
                        resultList.push(value);
                    }
                });

                var elementsToRemove = topList.concat([ '_cydefaultLabel','id', '$$hashKey', '$$expanded']);

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
                if (!attributeName) {
                    return null;
                }
                if ('citations' === attributeName.toLowerCase()) {
                    return attribute;
                }

                var attributeValue = "";

                if (attribute instanceof Object) {
                    if (attribute['v'] && Array.isArray(attribute['v']) && attribute['v'].length > 0) {

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
                        attributeValue = (attribute['v']) ? attribute['v'] : '';

                        var typeOfAttributeValue = typeof(attributeValue);

                        if (attributeValue && (typeOfAttributeValue === 'string')) {
                            attributeValue = getStringAttributeValue(attributeValue);
                        }
                    }

                } else {

                    if (typeof attribute === 'string') {

                        attributeValue = getStringAttributeValue(attribute);

                    } else {

                        attributeValue = attribute;
                    }
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

                var attributeValue = "";

                if (attribute instanceof Object) {
                    if (attribute['v'] && Array.isArray(attribute['v'])) {

                        for (var i = 0; i < attribute['v'].length; i++) {
                            attributeValue = attributeValue + getStringAttributeValue(attribute['v'][i]) + '<br>';
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

                var retString = 'PMID : unable to get citation info';

                if (citation && citation['dc:identifier']) {

                    var splitString = citation['dc:identifier'].split(':');
                    
                    if (splitString.length == 2) {

                        var prefix = splitString[0].toString().toLowerCase();

                        if (prefix === 'pubmed' || prefix === 'pmid') {

                            if (!isNaN(splitString[1])) {
                                // it is a number

                                retString = '<a target="_blank" href="http://www.ncbi.nlm.nih.gov/pubmed/' +
                                    splitString[1] + '"><strong>PMID: </strong>' +
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

                var contextAspect = networkService.getNiceCX()['@context'];

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


            var populateNodeAndEdgeAttributesForAdvancedQuery = function() {
                
                var cxNetwork = networkService.getOriginalCXNetwork();
                
                if (!cxNetwork) {
                    return;
                }

                var edgeAttributesMap = {};
                var nodeAttributesMap = {};


                if (cxNetwork.edgeAttributes) {

                    var allEdgesAttributeObjectsIDs = _.keys(cxNetwork.edgeAttributes);

                    _.forEach(allEdgesAttributeObjectsIDs, function(edgeAttributeId) {

                        var edgeAttributeObjects = _.keys(cxNetwork.edgeAttributes[edgeAttributeId]);

                        _.forEach(edgeAttributeObjects, function(edgeAttribute) {
                            edgeAttributesMap[edgeAttribute] = edgeAttribute;
                        });
                    });
                }

                if (cxNetwork.nodeAttributes) {

                    var allNodesAttributeObjectsIDs = _.keys(cxNetwork.nodeAttributes);

                    _.forEach(allNodesAttributeObjectsIDs, function(nodeAttributeId) {

                        var nodeAttributeObjects = _.keys(cxNetwork.nodeAttributes[nodeAttributeId]);

                        _.forEach(nodeAttributeObjects, function(nodeAttribute) {
                            nodeAttributesMap[nodeAttribute] = nodeAttribute;
                        });
                    });
                }

                var attributeNames = _.keys(edgeAttributesMap);
                _.forEach(attributeNames, function(attributeName) {
                    networkController.edgePropertyNamesForAdvancedQuery.push(attributeName);
                 });

                var attributeNames = _.keys(nodeAttributesMap);
                _.forEach(attributeNames, function(attributeName) {
                    networkController.nodePropertyNamesForAdvancedQuery.push(attributeName);
                });
            }
            


            var drawCXNetworkOnCanvas = function (cxNetwork, noStyle) {
                
                $scope.getContextAspectFromNiceCX();

                var attributeNameMap = {} ; //cyService.createElementAttributeTable(cxNetwork);

                var cyElements = cyService.cyElementsFromNiceCX(cxNetwork, attributeNameMap);
                
                var cyStyle ;
                if ( noStyle ) {
                    cyStyle =  cyService.getDefaultStyle()
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
                
                var layoutName = 'cose';

                if ( ! noStyle && cyService.allNodesHaveUniquePositions(cyElements)) {
                    layoutName = 'preset';
                }

                var cyLayout = {name: layoutName};

                initCyGraphFromCyjsComponents(cyElements, cyLayout, cyStyle, 'cytoscape-canvas', attributeNameMap);

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
                            var resultName = "Neighborhood query result on network - " + currentNetworkSummary.name;
                            networkController.successfullyQueried = true;
                            networkController.currentNetwork =
                              {name: resultName,
                                  "nodeCount": (network.nodes) ? Object.keys(network.nodes).length : 0,
                                  "edgeCount": (network.edges) ? Object.keys(network.edges).length : 0,
                                  "queryString": networkController.searchString,
                                  "queryDepth" : networkController.searchDepth.value
                              };

                            cxNetworkUtils.setNetworkProperty(network, 'name', resultName);
                       //     var networkAttrList = [];
                        //    networkAttrList.push({'n': 'name', 'v': resultName });
                    //        networkAttrList.push ( {'n': 'queryString' , 'v': networkController.searchString });
                    //        networkAttrList.push ( {'n': 'queryDepth' , 'v': networkController.searchDepth.value });

                         //   network["networkAttributes"] = networkAttrList;
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

                networkController.tabs[3].active = false;
                networkController.tabs[3].hidden = true;

                enableSimpleQueryElements();
                $scope.hideAdvancedSearchLink = false;


            };

            networkController.saveQueryResult = function() {

                var  modalInstanceSave = $modal.open({
                    templateUrl: 'confirmation-modal.html',
                    scope: $scope,
                    controller: function($scope, $modalInstance) {
                        $scope.title = 'Save query result?'
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

                            var rawCX = cxNetworkUtils.niceCXToRawCX(networkService.getNiceCX());

                            //               console.log ( JSON.stringify(rawCX));

                            networkService.saveQueryResults(currentNetworkSummary, networkController.currentNetwork, rawCX, function (){
                                $modalInstance.close();
                                $scope.isProcessing = false;

                                $('#saveQueryButton').prop('disabled', true)

                            }, function (msg) {
                                $scope.progress = ("Failed to save query result to NDEx. Please try again later. \nErrror message: " + msg );

                            });

                        };
                    }
                });

            }


            networkController.runAdvancedQuery = function(networkQueryLimit)
            {
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

                networkService.advancedQueryFromOldAPI(networkController.currentNetworkId, postData)
                    .success(
                        function (network) {
                            networkController.successfullyQueried = true;
                            var resultName = "Advanced query result on network - " + currentNetworkSummary.name;
                            networkController.currentNetwork =
                            {name: resultName,
                                "nodeCount": Object.keys(network.nodes).length,
                                "edgeCount": Object.keys(network.edges).length,

                                "edgeFilter": postData.edgeFilter,
                                "nodeFilter": postData.nodeFilter
                            };

                            cxNetworkUtils.setNetworkProperty(network, 'name', resultName);
                          //  var networkAttrList = [];
                          //  networkAttrList.push({'n': 'name', 'v': resultName });

                        /*    if ( postData.edgeFilter && postData.edgeFilter.propertySpecifications.length > 0 ) {
                                var prop = {'n': 'Edge Filter', 'd' : 'list_of_string'};
                                var specList = [];
                                _.forEach(postData.edgeFilter.propertySpecifications, function (filter) {
                                    var v = filter.name + '=' + filter.value;
                                    specList.push(v);
                                });
                                prop['v'] = specList;
                                networkAttrList.push ( prop);
                            }
                            if ( postData.nodeFilter && postData.nodeFilter.propertySpecifications.length > 0 ) {
                                var prop = {'n': 'Node Filter', 'd': 'list_of_string'};
                                var specList = [];
                                _.forEach(postData.nodeFilter.propertySpecifications, function ( filter){
                                    var v = filter.name + '=' + filter.value;
                                    specList.push(v);
                                });
                                prop['v'] = specList;

                                networkAttrList.push (prop);
                            }*/

                        //    network["networkAttributes"] = networkAttrList;

                            drawCXNetworkOnCanvas(network,true);
                            if (!networkController.tabs[0].active )
                                networkController.tabs[0].active = true;
                            networkController.selectionContainer = {};
                        }
                    )
                    .error(
                        function (error) {
                            if (error.status != 0) {
                                if( error.data.message == "Error in advanced query: Result set is too large for this query.")
                                {
                                    networkController.queryErrors.push("Error Querying: The maximum query size is " + networkQueryLimit);
                                }
                                else
                                {
                                    networkController.queryErrors.push(error.data.message);
                                }
                            }
                        }
                    );
            };


            var initialize = function () {
                // vars to keep references to http calls to allow aborts

                provenanceService.resetProvenance();

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
                                            resetBackgroudColor();
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