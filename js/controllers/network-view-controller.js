ndexApp.controller('networkViewController',
    ['config','provenanceService','networkService', 'ndexService', 'ndexConfigs', 'cyService','cxNetworkUtils',
         'ndexUtility', 'ndexHelper', 'ndexNavigation',
        'sharedProperties', '$scope', '$routeParams', '$modal',
        '$route', '$location', 'uiGridConstants', /*'$filter', '$location','$q',*/
        function (config, provenanceService, networkService, ndexService, ndexConfigs, cyService, cxNetworkUtils,
                   ndexUtility, ndexHelper, ndexNavigation,
                  sharedProperties, $scope, $routeParams, $modal,
                  $route , $location, uiGridConstants /*, $filter /*, $location, $q */)
        {
            var self = this;

            var cy;

            var currentNetworkSummary;

            var networkExternalId = $routeParams.identifier;
            sharedProperties.setCurrentNetworkId(networkExternalId);

            $scope.showFooter = false;

            $scope.networkController = {};

            var networkController  = $scope.networkController;

            networkController.privilegeLevel = "None";
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

            //networkController.networkAdmins = null;

            networkController.edgePropertyNamesForAdvancedQuery = undefined;
            networkController.nodePropertyNamesForAdvancedQuery = undefined;

            networkController.numberOfBelNetworkNamespacesAsInt = 0;

            networkController.context = {};

            networkController.isAdmin = false;

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

            var localNetwork = undefined;

            var spinner = undefined;

            $scope.showEdgeCitations = function(edgeKey)
            {
                if (localNetwork && localNetwork.edgeCitations && localNetwork.edgeCitations[edgeKey])
                {
                    // get list/array of citation IDs
                    var citationsIDs = localNetwork.edgeCitations[edgeKey];
                    var edgeCitations = getCitations(citationsIDs);
                    showCitations(edgeCitations);
                }
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

            $scope.getNumEdgeCitations = function(edgeKey)
            {
                var numOfCitations = 0;
                
                if (localNetwork && localNetwork.edgeCitations && localNetwork.edgeCitations[edgeKey]) {
                    numOfCitations = localNetwork.edgeCitations[edgeKey].length;
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


            $scope.currentView = "Graphic";
            $scope.buttonLabel = "Switch To Table View"

            $scope.switchView = function() {
                if ($scope.currentView == "Graphic") {
                    // switch to table view
                    $scope.currentView = "Table";
                    $scope.buttonLabel = "Switch To Graphic View"

                    var enableFiltering = true;
                    var setGridWidth = true;
                    localNetwork = networkService.getNiceCX();
                    populateEdgeTable(localNetwork, enableFiltering, setGridWidth);
                    populateNodeTable(localNetwork, enableFiltering, setGridWidth);

                    //$scope.edgeGridApi.core.queueRefresh();
                    //$scope.edgeGridApi.core.queueGridRefresh();

                    //$scope.edgeGridApi.core.notifyDataChange(uiGridConstants.dataChange.ALL);

                    //gridApi.core.notifyDataChange( uiGridConstants.dataChange.ALL)

                } else if  ($scope.currentView == "Table") {
                    // switch to graphic view
                    $scope.currentView = "Graphic";
                    $scope.buttonLabel = "Switch To Table View"
                }
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

            var getCitationLink = function (identifier) {
                //if( !networkController.hasCitation(citationId) )
                //    return "javaScript:void(0)";
                var retLink = "";

                if (identifier) {
                    if (identifier.startsWith('http')) {
                        retLink = identifier;
                    } else {
                        retLink = 'http://www.ncbi.nlm.nih.gov/pubmed/' + identifier.split(':')[1];
                    }
                }
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


            /*
            var getNetworkAdmins = function()
            {
                if (networkController.isLoggedIn) {
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
                            stopSpinner();
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
                                var idstr = edge.id();
                                var id= Number(idstr.substring(1));
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
      //          var config = angular.injector(['ng', 'ndexServiceApp']).get('config');
                // hard-coded parameters for ndexService call, later on we may want to implement pagination

                var hasLayout = networkService.getNetworkProperty(networkController.subNetworkId,'hasLayout');

                if ( hasLayout == undefined ) {
                    if ( networkController.subNetworkId != null)
                        hasLayout = true;
                    else
                        hasLayout = false;

                }

                if (  (hasLayout && networkController.currentNetwork.edgeCount > 12000) ||
                    (  (!hasLayout) && networkController.currentNetwork.edgeCount > config.networkDisplayLimit ) ) {
                    // get sample CX network
                    networkController.isSample = true;
                    (request2 = networkService.getNetworkSampleV2(networkId) )
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
                } else {
                    // get complete CX stream and build the CX network object.
                    networkController.isSample = false;
                    (request2 = networkService.getCompleteNetworkInCXV2(networkId) )
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

                    var predicate = (edges[edgeKey].i) ? (edges[edgeKey].i) : "";
                    var subject = network.nodes[edges[edgeKey].s].n;
                    var object = network.nodes[edges[edgeKey].t].n;

                    longestSubject = longestSubject.length < subject.length ? subject : longestSubject;
                    longestPredicate = longestPredicate.length < predicate.length ? predicate : longestPredicate;
                    longestObject = longestObject.length < object.length ? object : longestObject;
                }

                // enable filtering if number of edges in the network is no greater than 500
                var filteringEnabled = (edgeKeys.length <= 500) ? true : false;

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
                        minWidth: calcColumnWidth(longestSubject, false)
                    },
                    {
                        field: 'Predicate',
                        displayName: 'Predicate',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestPredicate, false)
                    },
                    {
                        field: 'Object',
                        displayName: 'Object',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestObject, false)
                    }
                ];

                if (edgeCitations) {
                    var citationsHeader =
                    {
                        field: 'Citations',
                        displayName: 'Citations',
                        cellToolTip: false,
                        //minWidth: calcColumnWidth('Citations'),
                        enableFiltering: false,
                        enableSorting: false,
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

                    var edgeAttributesKeys = Object.keys(edgeAttributes);

                    for (var i=0; i<edgeAttributesKeys.length; i++)
                    {
                        var edgeAttributeKey = edgeAttributesKeys[i];

                        var edgeAttributePropertiesKeys = Object.keys(edgeAttributes[edgeAttributeKey]);

                        for (var j=0; j<edgeAttributePropertiesKeys.length; j++) {
                            var edgeAttributteProperty = edgeAttributePropertiesKeys[j];

                            var columnDef = {
                                field: edgeAttributteProperty,
                                displayName: edgeAttributteProperty,
                                cellTooltip: true,
                                minWidth: calcColumnWidth(edgeAttributteProperty, false),
                                enableFiltering: filteringEnabled,
                                cellTemplate: "<div class='ui-grid-cell-contents hideLongLine' ng-bind-html='grid.appScope.linkify(COL_FIELD)'></div>"
                            };
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
                    $scope.edgeGridApi.grid.gridWidth = $('#cytoscape-canvas').width();
                }
                //$scope.edgeGridApi.grid.gridHeight = $('#cytoscape-canvas').height();

               refreshEdgeTable(network);
            };

            var refreshEdgeTable = function (network) {

                var edges = network.edges;
                var edgeCitations = network.edgeCitations;
                var edgeKeys = Object.keys(edges);

                $scope.edgeGridOptions.data = [];

                var edgeAttributes = network.edgeAttributes;

                for( i = 0; i < edgeKeys.length; i++ )
                {
                    var edgeKey = edgeKeys[i];

                    var predicate = edges[edgeKey].i;
                    var subject = network.nodes[edges[edgeKey].s].n;
                    var object = network.nodes[edges[edgeKey].t].n;

                    var row = {"Subject": subject, "Predicate": predicate, "Object": object};
                    
                    if (edgeCitations) {
                        row["Citations"] = (edgeCitations[edgeKey]) ? edgeKey : "";
                    }

                    if (edgeAttributes) {
                        for (var key in edgeAttributes[edgeKey]) {
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

                var longestName = "Label";
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
                        field: 'Label',
                        displayName: 'Label',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestName)
                    }
                ];

                if (nodeCitations) {
                    var citationsHeader =
                    {
                        field: 'Citations',
                        displayName: 'Citations',
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

                        var nodeAttributePropertiesKeys = Object.keys(nodeAttributes[nodeAttributeKey]);

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
                                    "</h6></div>"
                                };
                            } else {
                                columnDef = {
                                    field: nodeAttributteProperty,
                                    displayName: nodeAttributteProperty,
                                    cellTooltip: true,
                                    minWidth: calcColumnWidth(nodeAttributteProperty, false),
                                    enableFiltering: filteringEnabled,
                                    cellTemplate: "<div class='ui-grid-cell-contents hideLongLine' ng-bind-html='grid.appScope.linkify(COL_FIELD)'></div>"
                                }
                            }
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
                    $scope.nodeGridApi.grid.gridWidth = $('#cytoscape-canvas').width();
                }

                //$scope.nodeGridApi.grid.gridHeight = $('#cytoscape-canvas').height();

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
                    var nodeAttributeIndex = nodeKeys[key];
                    var nodeAttrs = nodeAttributes[nodeAttributeIndex];

                    var label = (nodes[nodeAttributeIndex].n) ? (nodes[nodeAttributeIndex].n) : "";

                    var row = {"Label": label};

                    if (nodeAttributes) {
                        for (var key1 in nodeAttrs) {
                            var attributeObj = (nodeAttrs[key1]) ? (nodeAttrs[key1]) : "";
                            var attributeObjName = attributeObj['n'];

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

            networkController.queryNetworkAndDisplay = function () {
                startSpinner();
                var edgeLimit = config.networkQueryLimit;
                networkService.neighborhoodQuery(networkController.currentNetworkId, networkController.searchString, networkController.searchDepth.value, edgeLimit)
                    .success(
                        function (network) {
                            // success - remove old error messages, if any
                            networkController.queryErrors = [];

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
                            drawCXNetworkOnCanvas(network,false);
                            if (!networkController.tabs[0].active )
                                networkController.tabs[0].active = true;
                            networkController.selectionContainer = {};

                            if ($scope.currentView == "Table") {
                                var enableFiltering = true;
                                var setGridWidth = false;
                                localNetwork = networkService.getNiceCX();
                                populateNodeTable(localNetwork, enableFiltering, setGridWidth);
                                populateEdgeTable(localNetwork, enableFiltering, setGridWidth);
                            }
                        }
                    )
                    .error(
                        function (error) {
                            stopSpinner();
                            if (error.status != 0) {
                                if( error.data.message == "Error in queryForSubnetwork: Result set is too large for this query.")
                                {
                                    networkController.queryErrors.push("Error Querying: The maximum query size is " + config.networkQueryLimit);
                                }
                                else
                                {
                                    networkController.queryErrors.push(error.data.message);
                                }
                            }
                        }
                    );  
            };

            /*
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
            */

            networkController.backToOriginalNetwork = function () {
                $route.reload();
            };
            
            networkController.saveQueryResult = function() {

                var  modalInstanceSave = $modal.open({
                    templateUrl: 'confirmation-modal.html',
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

                            var rawCX = cxNetworkUtils.niceCXToRawCX(networkService.getNiceCX());

                            //               console.log ( JSON.stringify(rawCX));

                            networkService.saveQueryResults(currentNetworkSummary, networkController.currentNetwork, rawCX,
                                function (data) {
                                    $modalInstance.close();
                                    $scope.isProcessing = false;

                                    $('#saveQueryButton').prop('disabled', true);
                                },
                                function (error) {
                                    delete $scope.progress;
                                    $scope.errors = (error && error.message) ? error.message : "Unable to save Query results"
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
                networkService.getNetworkSummaryFromNdexV2(networkExternalId) 
                    .success(
                        function (network) {
                            networkController.currentNetwork = network;
                            currentNetworkSummary = network;

                            if (!network.name) {
                                networkController.currentNetwork.name = "Untitled";
                            }

                            // subNetworkId is the current subNetwork we are displaying
                            if ( network.subnetworkIds && network.subnetworkIds.length == 1) {
                                networkController.subNetworkId = network.subnetworkIds[0];
                            } else
                                networkController.subNetworkId = null;

                            if ( networkController.subNetworkId != null) {
                                networkController.currentNetwork.description = networkService.getNetworkProperty(networkController.subNetworkId,"description");
                                networkController.currentNetwork.version = networkService.getNetworkProperty(networkController.subNetworkId,"version");
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
                            
                            networkController.readOnlyChecked = networkController.currentNetwork.isReadOnly;
                            //getNetworkAdmins();

                            var sourceFormat =
                                networkService.getNetworkProperty(networkController.subNetworkId,'ndex:sourceFormat');
                            networkController.currentNetwork.sourceFormat = (undefined === sourceFormat) ?
                                'Unknown' : sourceFormat;

                            if ("BEL" === networkController.currentNetwork.sourceFormat) {
                                // for BEL networks, check if Namespaces have been archived
                                getNumberOfBelNetworkNamespaces();
                            }

                            networkController.currentNetwork.reference = networkService.getNetworkProperty(networkController.subNetworkId,'Reference');
                            networkController.currentNetwork.rightsHolder = networkService.getNetworkProperty(networkController.subNetworkId,'rightsHolder');
                            networkController.currentNetwork.rights = networkService.getNetworkProperty(networkController.subNetworkId, 'rights');
                            networkController.otherProperties = networkService.getPropertiesExcluding(networkController.subNetworkId,['rights','rightsHolder','Reference','ndex:sourceFormat','name','description','version']);
                        }
                    )
                    .error(
                        function (error) {
                            networkController.showRetrieveMessage = false;
                            displayErrorMessage(error);
                        }
                    );

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

            var getMembership = function (callback) {
                if (!networkController.isLoggedIn) {
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
                                }
                                if (myMembership == 'WRITE') {
                                    networkController.canEdit = true;
                                    networkController.privilegeLevel = "Edit";
                                }
                                if (myMembership == 'READ') {
                                    networkController.canRead = true;
                                    networkController.privilegeLevel = "Read";
                                }
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
                    function(data, networkId) {
                        // success, do nothing
                    },
                    function(error, networkId) {
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


            var startSpinner = function () {
                // please see more info about this spinner at http://spin.js.org/
                if (!spinner) {
                    var opts = {
                        lines: 11 // The number of lines to draw
                        , length: 19 // The length of each line
                        , width: 13 // The line thickness
                        , radius: 26 // The radius of the inner circle
                        , scale: 0.5 // Scales overall size of the spinner
                        , corners: 1 // Corner roundness (0..1)
                        , color: '#fff' // #rgb or #rrggbb or array of colors
                        , opacity: 0.25 // Opacity of the lines
                        , rotate: 11 // The rotation offset
                        , direction: 1 // 1: clockwise, -1: counterclockwise
                        , speed: 0.6 // Rounds per second
                        , trail: 100 // Afterglow percentage
                        , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
                        , zIndex: 2e9 // The z-index (defaults to 2000000000)
                        , className: 'spinner' // The CSS class to assign to the spinner
                        , top: '50%' // Top position relative to parent
                        , left: '51%' // Left position relative to parent
                        , shadow: true // Whether to render a shadow
                        , hwaccel: false // Whether to use hardware acceleration
                        , position: 'absolute' // Element positioning
                    }

                    var target = document.getElementById('spinner')
                    spinner = new Spinner(opts).spin(target);

                } else {
                    var target = document.getElementById('spinner')
                    spinner.spin(target);
                }
            }

            var stopSpinner = function() {
                spinner.stop();
            }



            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

            networkController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);

            $("#cytoscape-canvas").height($(window).height() - 222);
            $("#divNetworkTabs").height($(window).height() - 185);
            
            startSpinner();

            hideSearchMenuItem();

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
