ndexApp.controller('networkController',
    ['networkService', 'ndexService', 'ndexConfigs',
         'ndexUtility', 'ndexHelper', 'ndexNavigation',
        'sharedProperties', '$scope', '$rootScope', '$routeParams', '$modal', '$modalStack',
        '$route', '$location', 'uiGridConstants', 'uiMisc', 'ndexSpinner', 'cyREST', '$timeout',
        function ( networkService, ndexService, ndexConfigs,
                   ndexUtility, ndexHelper, ndexNavigation,
                  sharedProperties, $scope, $rootScope, $routeParams, $modal, $modalStack,
                  $route , $location, uiGridConstants, uiMisc, ndexSpinner, cyREST , $timeout)
        {
            //var self = this;
            
            var cxNetworkUtils = new cytoscapeCx2js.CyNetworkUtils();
            var cyService = new cytoscapeCx2js.CxToJs(cxNetworkUtils);

            const defaultStyle = [  {
                "selector": "node",
                "css": {
                  "border-color": "rgb(204,204,204)",
                  "border-opacity": 1,
                  "border-width": 0,
                  "background-color": "rgb(137,208,245)",
                  "height": 35,
                  "color": "rgb(0,0,0)",
                  "font-family": "Arial,Helvetica Neue,Helvetica,sans-serif",
                  "font-size": 12,
                  "text-valign": "center",
                  "text-halign": "center",
                  "text-opacity": 1,
                  "text-wrap": "wrap",
                  "text-max-width": "200.0",
                  "shape": "roundrectangle",
                  "width": 75,
                  "background-opacity": 1
                }
              },
              {
                "selector": "node[name]",
                "css": {
                  "content": "data(name)"
                }
              },
              {
                "selector": "edge",
                "css": {
                  "curve-style": "bezier",
                  "color": "rgb(0,0,0)",
                  "font-family": "Segoe UI,Frutiger,Frutiger Linotype,Dejavu Sans,Helvetica Neue,Arial,sans-serif",
                  "font-size": 10,
                  "text-opacity": 1,
                  "line-style": "solid",
                  "source-arrow-shape": "none",
                  "source-arrow-color": "rgb(0,0,0)",
                  "line-color": "rgb(132,132,132)",
                  "target-arrow-shape": "none",
                  "target-arrow-color": "rgb(0,0,0)",
                  "opacity": 1,
                  "width": 2
                }
              }, {
                "selector": "node:selected",
                "css": {
                  "background-color": "rgb(255,255,0)"
                }
              },
              {
                "selector": "edge:selected",
                "css": {
                  "source-arrow-color": "rgb(255,255,0)",
                  "line-color": "rgb(255,0,0)",
                  "target-arrow-color": "rgb(255,255,0)"
                }
              }];
            
            var cy;

            var directQueryName = "Direct";

            var currentNetworkSummary;
            var networkExternalId = $routeParams.identifier;
            var accesskey         = $routeParams.accesskey;

            sharedProperties.setCurrentNetworkId(networkExternalId);

            $scope.networkController = {};

            var networkController  = $scope.networkController;
            networkController.isLoggedInUser = !!window.currentNdexUser; // same as window.currentNdexUser  ? true : false;
            networkController.networkOwner = {};

            networkController.privilegeLevel = 'None';
            networkController.currentNetworkId = networkExternalId;
            networkController.accesskey = accesskey;

            networkController.errors = []; // general page errors
            networkController.queryErrors = [];
            networkController.selectionContainer = {};
            networkController.baseURL = $location.absUrl();
            networkController.isSample=false;
            networkController.sampleSize = 0;
            networkController.isSamplePrevious=false;
            networkController.sampleSizePrevious=0;

            networkController.successfullyQueried = false;
            networkController.highlightNodes = true;
            /* sorting order for the Node/Edge attribute inspector:
                true -> ascending
                false -> descending
                */
            networkController.nodeAttrListSortingAsc = true;
            networkController.edgeAttrListSortingAsc = true;


            networkController.baseURL = networkController.baseURL.replace(/(.*\/).*$/,'$1');

            //networkController.advancedQueryNodeCriteria = 'Source';
            //networkController.advancedQueryEdgeProperties = [{}];
            //networkController.advancedQueryNodeProperties = [{}];

            //networkController.networkAdmins = null;

            //networkController.edgePropertyNamesForAdvancedQuery = undefined;
            //networkController.nodePropertyNamesForAdvancedQuery = undefined;

            networkController.context = {};
            networkController.contextIsFromAspect = true; // false if the aspect is from network Attribute

            networkController.isAdmin = false;

            networkController.networkShareURL = null;
            networkController.visibility      = '';

            // get URL of this network without network access key; this URL is used
            // for copying it to clipboard if this Network is PUBLIC
            networkController.networkURL = uiMisc.buildNetworkURL(null, networkExternalId);


            // close any modal if opened.
            // We need to close a modal in case we come to this page
            // if we cloned a network and followed a link to the newly cloned network
            // from the "Network Cloned" information modal.
            //$modalStack.dismissAll('close');

            //$scope.fullScreen = false;

            $scope.query = null;
            networkController.searchString = '';

            $scope.showSetSampleButton            = false;
            $scope.showSetSampleButtonEnabled     = false;
            $scope.noOfEdgesToShowSetSampleButton = 100;


            networkController.queryEdgeLimitToShowGraph     = 1000;
            networkController.queryEdgeLimitToShowTableOnly = 3000;
            networkController.warningShown                  = false;

            var checkCytoscapeStatusTimer     = null;
            var checkCytoscapeStatusInSeconds = 5;
            var cytoscape360AndCyndex20RequiredToolTip =
                'To use this feature, you need Cytoscape 3.6.0 or higher running on ' +
                ' your machine (default port: 1234) and the CyNDEx-2 app installed';
            var openNetworkInCytoscapeToolTip = 'Open this network in Cytoscape';

            $scope.openInCytoscapeTitle = 'Checking status ...';
            $scope.isCytoscapeRunning   = false;

            $(document).ready(function(){
                $('[data-toggle="tooltip"]').tooltip({
                    html: true
                });
            });

            $scope.setToolTips = function(){
                var myToolTips = $('[data-toggle="tooltip"]');
                myToolTips.tooltip();
            };

            $scope.enableSetSampleViaUUID    = false;
            $scope.enableRemoveFromMyAccount = false;


            $scope.showOriginalCopyNetworkShareURLTitle = function() {
                $scope.copyNetworkShareURLTitle =
                    (networkController.currentNetwork.visibility.toUpperCase() == 'PUBLIC') ?
                    'Copy network URL to clipboard' :
                    'Copy Share URL to clipboard';
            };
            $scope.showCopiedNetworkShareURLTitle = function() {
                $scope.copyNetworkShareURLTitle = 'Copied';
            };
            $scope.showOriginalCopyDOITitle = function() {
                $scope.copyNetworkDOITitle = 'Copy network DOI to clipboard';
            };
            $scope.showCopiedDOITitle = function() {
                $scope.copyNetworkDOITitle = 'Copied';
            };


            /*
             *  We hide the network owner from Network page if
             *
             *      1) network is PRIVATE, and
             *      2) it is shared via shared URL
             *
             *  This is to resolve NWA-198 (https://ndexbio.atlassian.net/browse/NWA-198)
             *  'Handling of author information exposed for anonymous access?'.  Note that we
             *  hide owners of PRIVATE and networks with access key for both anonymous
             *  and logged in users.
             */
         /*   $scope.hideNetworkOwner = function() {

                var isVisibility = ((typeof networkController.currentNetwork !== 'undefined') &&
                                    (typeof networkController.currentNetwork.visibility !== 'undefined') &&
                                    (networkController.currentNetwork.visibility === 'PRIVATE'));

                var isAccessKey = (typeof accesskey !== 'undefined');

                return (isVisibility && isAccessKey);
            }; */

            $scope.onlyNetworkOwnersCanUnsetReadOnlyTitle = 'Only network owners can set/unset Read Only flag';

            $scope.isEdgesAndNodesTabDisabled = function() {
                return networkController.tabs[1].disabled ? 'disabled' : 'enabled';
            };

            $scope.activeTab = 'Edges';

            $scope.activateTab = function(tabName){
                $scope.activeTab = tabName;

                if ('Edges' === tabName) {
                    $('#edgeGridId').height($(window).height() - 195);
                    /** @namespace $scope.edgeGridApi.core.refresh() **/
                    $scope.edgeGridApi.core.refresh();

                } else if ('Nodes' === tabName) {
                    $('#nodeGridId').height($(window).height() - 195);
                    /** @namespace $scope.nodeGridApi.core.refresh(); **/
                    $scope.nodeGridApi.core.refresh();
                }
            };

            networkController.tabs    = new Array(2);
            networkController.tabs[0] = {'heading': 'Network Info',   'active': true};
            networkController.tabs[1] = {'heading': 'Nodes/Edges',    'active': false, 'disabled': true};

            $scope.setToolTipOnNodesAndEdgesTab = function() {
                $scope.nodesAndEdgesTabTitle = networkController.tabs[1].disabled ? 'Select nodes or edges in the graph to enable this tab' : '';
            };

            $scope.handleNodesAndEdgesTabClick = function() {

                if (networkController.tabs[1].disabled) {
                    // if Nodes/Edges is clicked and it is disabled, then de-activate Nodes/Edges and activate Network Info tab
                    networkController.tabs[0].active = true;
                    networkController.tabs[1].active = false;
                }
            };

            /* TODO: for 2.4.1, remove all networkController.tabs[2] since we do not support provevance any longer  */
            /* TODO: networkController.tabs[2] is left not to refactor code by changing Advanced Query networkController.tabs[3] */
            /* TODO: to networkController.tabs[2]. We probably need to remove Advanced Query code as well ... Don't we? */
            //networkController.tabs[2] = {'heading': 'Provenance',     'active': false};
            //networkController.tabs[3] = {'heading': 'Advanced Query', 'active': false, 'hidden': true};

            networkController.queryWarnings = [];
            networkController.queryErrors   = [];


            networkController.subNetworkId = null;
            networkController.noOfSubNetworks = 0;

            networkController.networkSets = [];

            networkController.isNetworkOwner = false;

            networkController.otherProperties = [];


            $scope.requestDOITitle           = '';
            $scope.exportTitle               = '';
            $scope.upgradePermissionTitle    = '';
            $scope.shareTitle                = 'Share this network internally or externally';
            $scope.deleteTitle               = '';
            $scope.setNetworkSampleViaUUIDTitle     = '';
            $scope.removeFromMyAccountTitle  = '';

            $scope.disabledQueryTooltip      = 'Please type a query term in the box to the left to enable this button.';

            $scope.disableQuery = false;

            $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

            var spinnerId = 'spinnerId';

            $scope.showAdvancedQuery = true;

            $scope.showDeleteDOILink = false;

            var localNetwork;

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

            var changeHighlightOnCy = function (cy, highlightNodes) {
                if ( highlightNodes) {
                    cy.elements().addClass('faded');
                    var query = cy.nodes('[?querynode]');
                    query.addClass('highlight')
                } else {
                    cy.elements()
                        .removeClass('faded')
                        .removeClass('highlight')
                }
            };

            networkController.toggleHighlight = function () {
                var cy = window.cy;
                changeHighlightOnCy(cy, networkController.highlightNodes);
            };

            var showCitations = function(citations)
            {
                $modal.open({
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

            var getCitationLink = function (identifier) {
                //if( !networkController.hasCitation(citationId) )
                //    return "javaScript:void(0)";
                var retLink = '';

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
                var citations = (localNetwork && localNetwork.citations) ? localNetwork.citations : '';

                var result = [];
                for (var i=0; i<citationsIDs.length; i++)
                {
                    var citationObj = citations[citationsIDs[i]];
                    var citation = {};

                    if (citationObj['@id']) {
                        citation.id = citationObj['@id'];
                    }
                    if (citationObj['dc:contributor']) {
                        citation.contributor = citationObj['dc:contributor'];
                    }
                    if (citationObj['dc:description']) {
                        citation.description = citationObj['dc:description'];
                    }
                    if (citationObj['dc:identifier']) {
                        citation.identifier = citationObj['dc:identifier'];
                    }
                    if (citationObj['dc:title']) {
                        citation.title = citationObj['dc:title'];
                    }
                    if (citationObj['dc:type']) {
                        citation.type = citationObj['dc:type'];
                    }
                    if (citationObj.attributes.length>0) {
                        citation.attributes = JSON.stringify(citationObj.attributes);
                    }
                    citation.link = getCitationLink(citation.identifier);

                    result.push( citation );
                }
                return result;
            };

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

            var getStringAttributeValue = function(attribute) {

                if (!attribute) {
                    return attribute;
                }

                var attributeValue =
                    ((attribute instanceof Object) && (attribute['dc:identifier'])) ?
                        attribute['dc:identifier'] : attribute;

                attribute = attributeValue;

                var attr = attributeValue.toLowerCase();

                if ((attr.startsWith('http://') || attr.startsWith('https://')) &&
                    !attr.startsWith('http://biopax') && !attr.startsWith('http://www.biopax') &&
                    !attr.startsWith('http://purl') && !attr.startsWith('http://www.purl')) {

                    attributeValue = '<a target="_blank" href="' + attribute + '">External Link</a>';
                    return attributeValue;

                } else if (attr.startsWith('www.')) {
                    attributeValue = '<a target="_blank" href="http://' + attribute + '">External Link</a>';
                    return attributeValue;

                }

                var splitString = attribute.split(':');
                if ((splitString.length !== 2) && (splitString.length !== 3)) {
                    return attributeValue;
                }

                var prefix = splitString[0];
                var value  = (splitString.length === 3) ? (splitString[1] + ':' + splitString[2]) : splitString[1];
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

                    var isUniprotidValid = /^([A-N,R-Z][0-9]([A-Z][A-Z, 0-9][A-Z, 0-9][0-9]){1,2})|([O-Q][0-9][A-Z, 0-9][A-Z, 0-9][A-Z, 0-9][0-9])(\.\d+)?$/.test(value);

                    if (isUniprotidValid) {
                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/uniprot/' + value + '">' +
                            attribute + '</a>';
                    }

                } else if (attr.startsWith('tair')) {

                    var isValidTair = /^AT[1-5]G\d{5}$/.test(value);

                    if (isValidTair) {
                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/tair.locus/' + value + '">' +
                            attribute + '</a>';
                    }

                } else if (attr.startsWith('hgnc:')) {

                    // namespace: hgnc;  URI: http://identifiers.org/hgnc/;  Pattern: '^((HGNC|hgnc):)?\d{1,5}$'
                    var isHgncIdValid = /^\d{1,5}$/.test(value);

                    if (isHgncIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/hgnc/' + value + '">' +
                            attribute + '</a>';

                    }

                } else if (attr.startsWith('hgnc.symbol:')) {

                    // namespace: hgnc.symbol;  URI: http://identifiers.org/hgnc.symbol/;  Pattern: '^[A-Za-z-0-9_]+(\@)?$'
                    var isHgncSymbolIdValid = /^[A-Za-z-0-9_]+(\@)?$/.test(value);

                    if (isHgncSymbolIdValid) {
                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/hgnc.symbol/' + value + '">' +
                            attribute + '</a>';

                    }

                } else if (attr.startsWith('chebi')) {

                    // valid CHEBI Entity identifier is described by this
                    // regular expression: '^CHEBI:\d+$'
                    var isCHEBIIdValid = /^CHEBI:\d+$/.test(value);

                    if (isCHEBIIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/chebi/' + value + '">' + attribute + '</a>';

                    }
                    else { //noinspection JSCheckFunctionSignatures
                        if (!isNaN(value)) {

                            attributeValue =
                                '<a target="_blank" href="http://identifiers.org/chebi/CHEBI:' + value + '">' +
                                attribute + '</a>';
                        }
                    }

                } else if (attr.startsWith('chembl')) {

                    //noinspection JSCheckFunctionSignatures
                    if (!isNaN(value)) {

                        // valid CHEMBL Compound Entity identifier is described by this
                        // regular expression: '^CHEMBL\d+$'
                        // but here we know that value is a number, so no need to use regex for validating

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/chembl.compound/CHEMBL' + value + '">' +
                            attribute + '</a>';
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

                    //var entityId = splitString[1];

                    // valid Pubchem Compound Entity identifier is described by this
                    // regular expression: '^\d+$';
                    var isPubchemCompoundIdValid = /^\d+$/.test(value);

                    if (isPubchemCompoundIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/pubchem.compound/' +
                            value + '">' + attribute + '</a>';
                    }

                } else if (attr.startsWith('sid:')) {

                    //var entityId = splitString[1];

                    // valid Pubchem Substance Entity identifier is described by this
                    // regular expression: '^\d+$';
                    var isPubchemSubstanceIdValid = /^\d+$/.test(value);

                    if (isPubchemSubstanceIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/pubchem.substance/' +
                            value + '">' + attribute + '</a>';
                    }

                } else if (attr.startsWith('pmid:')) {

                    //var entityId = splitString[1];

                    // valid PubMed Substance Entity identifier is described by this
                    // regular expression: '^\d+$';
                    var isPubMedIdValid = /^\d+$/.test(value);

                    if (isPubMedIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/pubmed/' +
                            value + '">' + attribute + '</a>';
                    }

                } else if (attributeValue.startsWith('BTO:')) {

                    //var entityId = splitString[1];

                    // valid BTO Entity identifier is described by this
                    // regular expression: '^BTO:\d{7}$';
                    //noinspection JSCheckFunctionSignatures
                    var isBTOIdValid = /^BTO:\d{7}$/.test(attributeValue);

                    if (isBTOIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://identifiers.org/bto/' +
                            attributeValue + '">' + attributeValue + '</a>';
                    }

                } else if (attr.startsWith('signor:')) {

                    //var entityId = splitString[1];

                    //var isBTOIdValid = /^BTO:\d{7}$/.test(value);

                    //if (isBTOIdValid) {

                    attributeValue =
                        '<a target="_blank" href="http://signor.uniroma2.it/relation_result.php?id=' +
                        value + '">' + attribute + '</a>';

                } else if (attr.startsWith('go:')) {

                    //var entityId = splitString[1];

                    //noinspection JSCheckFunctionSignatures
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
                    }

                    if (isGDCIdValid) {

                        attributeValue =
                            '<a target="_blank" href="http://gdc-portal.nci.nih.gov/projects/' +
                            value + '">' + attribute + '</a>';
                    }
                }

                return attributeValue;
            };

            $scope.linkify = function(cellContents)
            {
                var returnStr = '';

                if (typeof(cellContents) === 'undefined' || cellContents === '' || cellContents === null) {
                    return returnStr;
                }

                if (typeof(cellContents) === 'object') {
                    // this is the case where cellContents is as list/array ... so just
                    // return it wrapped in <title>. It will be converted to a comma-separated string of values
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
                        var linkifiedElement1 = getStringAttributeValue(cellContents);

                        returnStr =  '<span title=' + '"' + cellContents + '">' + linkifiedElement1 + '</span>';
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

            $scope.getNumOfAttributes = function(edgeAttributesObj)
            {
                var numOfEdgeAttributes = 1;

                if (edgeAttributesObj && Array.isArray(edgeAttributesObj)) {
                    numOfEdgeAttributes = edgeAttributesObj.length;
                }
                return numOfEdgeAttributes;
            };

            var parseNdexMarkupValue = function ( value ) {
                return {n:  value.replace(/(\[(.*)\])?\(.*\)$/, '$2'),
                    id: value.replace(/(\[.*\])?\((.*)\)$/, '$2')};
            };

            $scope.getInternalNetworkUUID = function(nodeAttributeInternalLink)
            {
                if (!nodeAttributeInternalLink) {
                    return null;
                }

                var markup = parseNdexMarkupValue(nodeAttributeInternalLink);
                return (markup && markup.id) ? markup.id : null;
            };

             $scope.getURLForMapNode = function(attribute) {

                 if (!attribute) {
                    return null;
                 }

                 var url = null;
                 var markup = parseNdexMarkupValue(attribute);

                 if (markup && markup.id) {
                     url = networkController.baseURL + markup.id;
                 }
                 return url;
             };


            $scope.showNodeAttributes = function(attributesObj)
            {
                if (attributesObj && attributesObj.n && attributesObj.v && (attributesObj.v.length > 0)) {
                    var attributeName = attributesObj.n;
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

                    /** @namespace gridApi.core.on.rowsRendered **/
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

                    /** @namespace gridApi.core.on.rowsRendered **/
                    gridApi.core.on.rowsRendered($scope, function() {
                        // we need to call core.handleWindowResize() to fix the table layout in case it is distorted
                        setTimeout($scope.nodeGridApi.core.handleWindowResize, 250);
                    });
                }
            };


            /*
            var INCOMPLETE_QUERY_CODE = -1;
            var EMPTY_QUERY_CODE = 0;
            var VALID_QUERY_CODE = 1;
            */

            /*
             * the elements in drop-down Neigborhood Query menu on Network page will appear in order specified
             * in networkController.queryTypes below.
             */
            networkController.queryTypes = [
                {
                    'name': '1-step neighborhood',
                    'searchDepth': 1,
                    'directOnly': false,
                    'type': 'query'
                },
                {
                    'name': '1-step adjacent',
                    'searchDepth': 1,
                    'directOnly': true,
                    'type': 'query'
                },
                {
                    'name': directQueryName,
                    'searchDepth': 1,
                    'type': 'interconnect'

                },
                {
                    'name': 'Interconnect',
                    'searchDepth': 2,
                    'type': 'interconnect'
                },
                {
                    'name': '2-step neighborhood',
                    'searchDepth': 2,
                    'directOnly': false,
                    'type': 'query'
                },
                {
                    'name': '2-step adjacent',
                    'searchDepth': 2,
                    'directOnly': true,
                    'type': 'query'
                }
            ];


            $scope.selectedQuery = networkController.queryTypes[0];

            $scope.queryTypesTooltipText  =
                'Click here for info on available query types.';

            $scope.showQueriesExplanation = function() {

                var modalInstance = $modal.open({
                    templateUrl: 'views/queriesExplanationModal.html',

                    controller: function($scope, $modalInstance, ndexNavigation) {
                        $scope.generalDescription =
                            'This section explains briefly all the available types of query using the ' +
                            ' simple example network pictured to the right. In the examples below, the orange node(s)' +
                            ' indicate the query terms while blue nodes and edges identify the retrieved subnetwork.';

                        $scope.neigborhoodQueryDescription =
                            'Returns all the nodes connected to the query term(s) and all edges between these nodes. ' +
                            'For example, querying the network for "B" (orange node), will return the subnetwork highlighted in blue.';

                        $scope.adjacentQueryDescription =
                            'Returns all nodes connected to the query term(s) and only the edges between these nodes and the ' +
                            ' query term(s). In this case querying the network for "B" will return a smaller subnetwork.';

                        $scope.directQueryDescription =
                            'Returns all edges between the query terms. This type of query requires at least 2 terms ' +
                            '(or use of wildcards). Querying for "A" and "B" returns only the connection between them.';

                        $scope.interconnectQueryDescription =
                            'Returns all edges connecting the query terms and including up to one intermediate node. ' +
                            'Also for this type of query at least 2 terms (or use of wildcards) are required. ' +
                            'In this case, querying for "A" and "B" returns the subnetwork highlighted in blue.';

                        $scope.stepsQueryDescription =
                            'indicate the depth of the traversal query and only apply to Neighborhood and Adjacent queries.' +
                            '<br><br>For more info, please review the manual on ' +
                            '<a href="http://www.home.ndexbio.org/finding-and-querying-networks/" target="_blank">' +
                            'Finding and Querying Networks in NDEx.</a>';


                        $scope.queryTypesDescription = 'col-6 col-xs-6 col-sm-6 col-md-6';
                        $scope.queryTypesImages      = 'col-6 col-xs-6 col-sm-6 col-md-6';
                        $scope.stepsClass            = 'col-12 col-xs-12 col-sm-12 col-md-12';



                        $scope.close = function () {
                            $modalInstance.dismiss();
                        };
                    }
                });

            }


            $scope.currentView = 'Graphic';
            $scope.buttonLabel = 'Table';
            $scope.switchViewButtonEnabled = true;
            $scope.beforeQueryView = null;

            $scope.showNetworkSample = function() {
                return (networkController.isSample && (networkController.sampleSize > 0));
            };

            $scope.getURLsForNdexExternalLink = function(attribute) {

                if (!attribute) {
                    return null;
                }

                var urls = '';
                var url  = '';

                _.forEach(attribute, function (e) {
                    var markup = parseNdexMarkupValue(e);

                    if (markup.id) {

                        url = '<a target=\"_blank\" href=\"' + markup.id + '\">' + (markup.n ? markup.n : 'external link') + '</a>';
                        url = url.replace(/<br\s*\/?>/gi,'');
                        url = url.replace(/&nbsp;&nbsp;&nbsp;/gi,'&nbsp;');
                        url = url + '&nbsp;&nbsp;&nbsp;';

                        urls = urls + url;
                    }
                });

                return urls;
            };

            $scope.getURLsForNdexInternalLink = function(attribute) {

                if (!attribute) {
                    return null;
                }

                var url = null;
                var markup = parseNdexMarkupValue(attribute);

                if (markup.id) {
                    url = networkController.baseURL + markup.id;

                    url =
                        '<a target=\"_blank\" href=\"' + url + '\">' + (markup.n? markup.n : markup.id)+ '</a>';

                    url = url.replace(/<br\s*\/?>/gi,'');
                    url = url.replace(/&nbsp;&nbsp;&nbsp;/gi,'&nbsp;');
                    url = url + '&nbsp;&nbsp;&nbsp;';
                }

                return url;
            };

            var initCyGraphFromCyjsComponents = function (cxNetwork, cyElements, cyLayout, cyStyle, canvasName, attributeNameMap) {

                //console.log(cyStyle);

                $(function () { // on dom ready

                    var cv = document.getElementById(canvasName);

                    try {
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
                    catch (e) {
                        
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

                    // cxBGColor is used as fill color for Canvas
                    // cyService.cyBackgroundColorFromNiceCX returns color as string, or undefined
                    var cxBGColor = cyService.cyBackgroundColorFromNiceCX(cxNetwork);

                    // see if cxNetwork has background color; if no - we will use default.
                    if (!cxBGColor) {
                        // default background color for the Cytsocape.js Graph mode;
                        cxBGColor = 'rgba(0, 0, 0, 0)';
                    }

                    var backgroundLayer = cy.cyCanvas({
                        zIndex: -2
                    });

                    var canvas = backgroundLayer.getCanvas();
                    var ctx = backgroundLayer.getCanvas().getContext("2d");

                    cy.on("render cyCanvas.resize", function() {
                        ctx.fillStyle = cxBGColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    });

                    var cyAnnotationService = new cyannotationCx2js.CxToCyCanvas(cyService);
                    cyAnnotationService.drawAnnotationsFromNiceCX(cy, cxNetwork);


                    // highlighting query nodes if displaying query result
                    if ( networkController.successfullyQueried && networkController.highlightNodes)
                        changeHighlightOnCy(cy, true);


                    // this is a workaround to catch select, deselect in one event. Otherwise if a use select multiple nodes/
                    // edges, the event is triggered for each node/edge.
                    cy.on('select unselect', function () {
                        clearTimeout(cy.nodesSelectionTimeout);
                        cy.nodesSelectionTimeout = setTimeout(function () {
                            var cxNodes = [];
                            var cxEdges = [];
                            _.forEach(cy.$('node:selected'), function (node) {
                                var id = Number(node.id());
                                cxNodes.push(networkService.getNodeInfo(id));

                            });
                            _.forEach(cy.$('edge:selected'), function (edge) {
                                var idstr = edge.id();
                                var id = Number(idstr.substring(1));
                                cxEdges.push(networkService.getEdgeInfo(id));
                            });


                            $scope.$apply(function () {
                                networkController.selectionContainer = {'nodes': cxNodes, 'edges': cxEdges}; //{'nodes': selectedNodes, 'edges': selectedEdges};

                                if (cxNodes.length === 0 && cxEdges.length === 0) {

                                    if (networkController.tabs[1].active) {
                                        networkController.tabs[0].active = true;
                                    }
                                    networkController.tabs[1].disabled = true;
                                    networkController.tabs[1].active = false;

                                } else if (!networkController.tabs[1].active ) {
                                    networkController.tabs[1].active = true;
                                    networkController.tabs[1].disabled = false;
                                    //networkController.tabs[2].active = false;
                                }

                                if (cxNodes.length === 1) {
                                    cxNodes[0].$$expanded = true;
                                }
                                if (cxEdges.length === 1) {
                                    cxEdges[0].$$expanded = true;
                                }
                            });
                        }, 300) ;
                    });


                    // handles the linked networks.

                    var ndexLink = attributeNameMap['ndex:internalLink'];
                    var ndexDesc = attributeNameMap['ndex:description'];
                    var ndexExtLink = attributeNameMap['ndex:externalLink'];

                    if (ndexLink || ndexDesc || ndexExtLink) {
                        var tmpArry = [];
                        [ndexLink,ndexDesc, ndexExtLink].forEach(function(entry){
                            if (entry) {
                                tmpArry.push('[' + entry + ']');
                            }
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
                                if ( typeof ndexLinkList === 'string') {
                                    ndexLinkList = [ndexLinkList];
                                }

                                _.forEach(ndexLinkList, function (e) {

                                    var ndexInternalLink = $scope.getURLsForNdexInternalLink(e);
                                    if (ndexInternalLink) {
                                        menuList.push(ndexInternalLink);
                                    }
                                });
                            }
                            if (ndexExtLink) {
                                var extLinkList = n.data(ndexExtLink);
                                if (typeof extLinkList === 'string') {
                                    extLinkList = [extLinkList];
                                }


                                var ndexExternalLinks = $scope.getURLsForNdexExternalLink(extLinkList);
                                if (ndexExternalLinks) {
                                    menuList.push(ndexExternalLinks);
                                }
                            }
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
                                if ( typeof ndexLinkList === 'string') {
                                    ndexLinkList = [ndexLinkList];
                                }
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
                                if ( typeof extLinkList === 'string') {
                                    extLinkList = [extLinkList];
                                }
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

            var drawCXNetworkOnCanvas = function (cxNetwork, noStyle) {

                $scope.getContextAspectFromNiceCX();

                var attributeNameMap = {} ; //cyService.createElementAttributeTable(cxNetwork);

                try {
                    var cyElements = cyService.cyElementsFromNiceCX(cxNetwork, attributeNameMap);

                    var cyStyle;

                    if (noStyle || !cxNetwork['cyVisualProperties']) {
                        cyStyle = defaultStyle;
                    } else {
                        cyStyle = cyService.cyStyleFromNiceCX(cxNetwork, attributeNameMap);
                    }
                } catch (error) {
                    networkController.errors.push ("Web app failed to render the network (Error: " + error.message +
                        ".). Please contact support@ndexbio.org to report this error.");
                    ndexSpinner.stopSpinner();
                    return;
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
                }

                if ( networkController.successfullyQueried) {
                    cyStyle = cyStyle.concat([
                        {
                            selector: 'node.faded',
                            css: {
                                opacity: 0.8
                            }
                        },

                        {
                            selector: 'edge.faded',
                            css: {
                                opacity: 0.8
                            }
                        },
                        {
                            selector: '.highlight',
                            css: {
                                opacity: 1.0,
                                'overlay-color': '#C51162',
                                'overlay-padding': 12,
                                'overlay-opacity': 0.5
                            }
                        }
                        ]

                    );
                }

                /** @namespace cxNetwork.cartesianLayout **/
                var layoutName = (cxNetwork.cartesianLayout) ? 'preset' :
                    (Object.keys(cxNetwork.edges).length <= 1000 ? 'cose' : 'circle') ;

                var cyLayout = {name: layoutName, animate: false, numIter: 50, coolingFactor: 0.9};

                initCyGraphFromCyjsComponents(cxNetwork, cyElements, cyLayout, cyStyle, 'cytoscape-canvas', attributeNameMap);
            };

            function checkIfCanvasIsVisibleAndDrawNetwork() {
                if($('#cytoscape-canvas').is(':visible')) {
                    drawCXNetworkOnCanvas(localNetwork, false);
                } else {
                    setTimeout(checkIfCanvasIsVisibleAndDrawNetwork, 50);
                }
            }

            var calcColumnWidth = function(header, isLastColumn)
            {
                var result = header.length * 10;
                result = result < 100 ? 100 : result;
                if (isLastColumn) {
                    result += 40;
                }
                return result > 250 ? 250 : result;
            };

            var populateNodeTable = function(cxNetwork, enableFiltering, setGridWidth)
            {
                var nodes = cxNetwork.nodes;

                if (!nodes) {
                    return;
                }

               // var nodeCitations = cxNetwork.nodeCitations;
                var nodeAttributeTable = cxNetwork.nodeAttributes;

                var numOfNodes = 0;
                var dataTable = [];
                var longestName = 'Name';
                var longestRepresents = 'Represents';
                var reservedTableColumnNames = ['Name', 'Represents'];

                var columnDefinitionList = []; //cj: column definitions for ui-grid
                var attributeCounter = 0;  //cj: counter to create unique simple attribute names in data
                var attributeNameMapper = {}; //cj: a mapping table to map an edge attribute name to a unique attibute name we created (A0,A1,A2...)

                for (var key in nodes) {
                    //optional check for properties from prototype chain
                    if (nodes.hasOwnProperty(key)) {
                        var currentNode = nodes[key];
                        var nodeName = cxNetworkUtils.getDefaultNodeLabel(cxNetwork, currentNode);
                        if (currentNode.n) {
                            longestName = (currentNode.n.length > longestName.length) ? currentNode.n : longestName;
                        }
                        if ( currentNode.r) {
                            longestRepresents = (currentNode.r.length > longestRepresents.length) ? currentNode.r : longestRepresents;
                        }

                        var row = {'Name': nodeName, 'Represents': currentNode.r ? currentNode.r : ''};


                        if (nodeAttributeTable) {
                            for (var attrName in nodeAttributeTable[key]) {

                                if (nodeAttributeTable[key].hasOwnProperty(attrName)) {
                                    if (attrName.startsWith('__')) {
                                        continue;
                                    }

                                    var attributeValue = nodeAttributeTable[key][attrName].v;
                                    var attributeType = nodeAttributeTable[key][attrName].d;

                                    var internalAttrName = attributeNameMapper[attrName];

                                    if ( !internalAttrName ) {
                                        //handles new attribute name.
                                        internalAttrName = 'A' + attributeCounter;
                                        attributeCounter ++;
                                        attributeNameMapper[attrName]= internalAttrName;

                                        if (attrName === 'ndex:externallink') {

                                            columnDef = {
                                                field: internalAttrName,
                                                displayName: attrName,
                                                cellTooltip: true,
                                                minWidth: calcColumnWidth(attrName, false),
                                                //enableFiltering: filteringEnabled,
                                                type: 'string',
                                                cellTemplate: '<div class="ui-grid-cell-contents hideLongLine" ng-bind-html="grid.appScope.getURLsForNdexExternalLink(COL_FIELD)"></div>'
                                            };

                                        } else if (attrName === 'ndex:internalLink') {

                                            columnDef = {
                                                field: internalAttrName,
                                                displayName: attrName,
                                                cellTooltip: true,
                                                minWidth: calcColumnWidth(attrName, false),
                                                //enableFiltering: filteringEnabled,
                                                type: 'string',
                                                cellTemplate: '<a class="ui-grid-cell-contents" ' +
                                                    'ng-href="{{grid.appScope.getURLForMapNode(COL_FIELD)}}" target="_blank">' +
                                                    '{{grid.appScope.getInternalNetworkUUID(COL_FIELD)}}' +
                                                    '</a>'
                                            };

                                        } else {

                                            var columnDef = {
                                                field: internalAttrName,
                                                displayName: reservedTableColumnNames.includes(attrName) ?
                                                    (attrName + ' (2)') : attrName,
                                                cellTooltip: true,
                                                minWidth: calcColumnWidth(attrName, false),
                                                //enableFiltering: filteringEnabled,  // add back at the very end.
                                                cellTemplate: 'views/gridTemplates/showCellContentsInNetworkTable.html'
                                            };

                                            var colComparator = getComparator(attributeType);
                                            if (colComparator) {
                                                columnDef.sortingAlgorithm = colComparator;
                                            }
                                        }

                                        columnDefinitionList.push(columnDef);

                                    }

                                    row[internalAttrName] = (attributeValue) ?
                                        attributeValue : '';
                                }
                            }
                        }

                        dataTable.push(row);
                        numOfNodes = numOfNodes + 1;
                    }
                }

                // enable filtering if number of edges in the network is no greater than 500;
                // we still check number of edges even though we populate node headers in this routine
                var filteringEnabled = (numOfNodes <= 500);

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
                    },
                    {
                        field: 'Represents',
                        displayName: 'Represents',
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestRepresents),
                        cellTemplate: 'views/gridTemplates/showCellContentsInNetworkTable.html'
                    }

                ];

                var fullDefinition = columnDefs.concat(columnDefinitionList);

                var lastDef = fullDefinition[fullDefinition.length-1];
                lastDef.minWidth = calcColumnWidth(lastDef.displayName, true);

                $scope.nodeGridOptions.data = dataTable;
                $scope.nodeGridApi.grid.options.columnDefs = fullDefinition;

                if (setGridWidth) {
                    var cytoscapeCanvasWidth = $('#cytoscape-canvas').width();
                    if (cytoscapeCanvasWidth > 0) {
                        $scope.nodeGridApi.grid.gridWidth = cytoscapeCanvasWidth;
                    }
                }

                var windowHeight = $(window).height() - 195;
                $('#nodeGridId').height(windowHeight);
                $scope.nodeGridApi.grid.gridHeight = windowHeight;

               // refreshNodeTable(network);
            };

  
            var stringComparator = function ( a, b) {
                if ( !a && !b) return 0;
                if (!a && b ) return -1;
                if ( a && !b ) return 1;

                var a1 = a.toLowerCase();
                var b1 = b.toLowerCase();

                if (a1 > b1 ) return 1;
                if ( a1 < b1 ) return -1;
                if ( a > b ) return 1;
                if ( a < b ) return -1;
                return 0;
            };

            var numericStringComparator = function (a, b) {
                if ( !a && !b) return 0;
                if (!a && b ) return -1;
                if ( a && !b ) return 1;

                var parsedA = parseFloat(a);
                var parsedB = parseFloat(b);

                if (parsedA > parsedB) {
                    return 1;
                }
                if (parsedA < parsedB) {
                    return -1;
                }
                return 0;

            };

            // comparator used for sorting list values in UI-grid
            var comparatorForList =  function (a, b , elementIsNumeric) {

                if ( !a && !b) return 0;
                if (!a && b ) return -1;
                if ( a && !b ) return 1;

                if ( a instanceof Array ) {
                    if ( b instanceof Array) {
                        if (a.length > b.length)
                            return 1;
                        if (a.length < b.length)
                            return -1;
                        else {
                            for (var i = 0, l=a.length; i < l; i++) {
                                var result = elementIsNumeric ?
                                        numericStringComparator(a[i], b[i]) : stringComparator(a[i],b[i]);
                                if (result != 0)
                                    return result;
                            }

                            return 0;
                        }
                    } else
                        return -1;
                }

                if ( b instanceof Array) return 1;

                if (elementIsNumeric) {
                    return numericStringComparator(a,b);
                } else {
                    return stringComparator(a,b);
                }

            };

            //numeric list comparator
            var numericListComparator = function (a,b) {
                return comparatorForList(a,b,true);
            };

            var nonNumericListComparator = function ( a,b) {
                return comparatorForList(a,b,false);
            };

            var getComparator = function ( cxDataType ) {
                if (!cxDataType  || cxDataType === 'string' || cxDataType === 'boolean')
                    return null;

                if ( cxDataType === 'double' || cxDataType === 'long' ||
                    cxDataType === 'integer' || cxDataType === 'float' )
                    return numericStringComparator;

                if (cxDataType === 'list_of_string' || cxDataType === 'list_of_boolean')
                   return nonNumericListComparator;

                return numericListComparator;

            };

            var populateEdgeTable = function(network, enableFiltering, setGridWidth)
            {
                var edges = network.edges;
                var edgeCitations = network.edgeCitations;

                var reservedTableColumnNames = ['Source Node', 'Interaction', 'Target Node'];
                var edgeAttributes = network.edgeAttributes;

                var longestSubject   = '';    // source
                var longestPredicate = '';
                var longestObject    = '';     // target

                if (!edges) {
                    return;
                }

                var rowCount = 0;
                var dataTable = [];  //cj: the actual data in the table
                var columnDefinitionList = []; //cj: column definitions for ui-grid
                var attributeCounter = 0;  //cj: counter to create unique simple attribute names in data
                var attributeNameMapper = {};   //cj: a mapping table to map an edge attribute name to a unique attibute name we created (A0,A1,A2...)

                for ( var key in edges) {
                    var edge = edges[key];

                    //optional check for properties from prototype chain
                    if ( edges.hasOwnProperty(key)) {

                        // determine the longest subject, predicate and object
                        var predicate = edge.i ? (edge) : '';
                        var subject = network.nodes[edge.s].n ? network.nodes[edge.s].n : '';
                        var object = network.nodes[edge.t].n ? network.nodes[edge.t].n : '';

                        longestSubject = longestSubject.length < subject.length ? subject : longestSubject;
                        longestPredicate = longestPredicate.length < predicate.length ? predicate : longestPredicate;
                        longestObject = longestObject.length < object.length ? object : longestObject;

                        //Get edge source, target and interaction
                        var source = cxNetworkUtils.getDefaultNodeLabel(network, network.nodes[edge.s]);
                        var interaction = edge.i;
                        var target = cxNetworkUtils.getDefaultNodeLabel(network, network.nodes[edge.t]);

                        var row = {'Source Node': source, 'Interaction': interaction, 'Target Node': target};

                        //Add citation aspect
                        if (edgeCitations) {
                            row.citation = (edgeCitations[key]) ? key : '';
                        }

                        // handles edge attributes
                        if (edgeAttributes) {
                            for (var attrName in edgeAttributes[key]) {

                                if (edgeAttributes[key].hasOwnProperty(attrName)) {
                                    if (attrName.startsWith('__')) {
                                        continue;
                                    }

                                    var attributeValue = edgeAttributes[key][attrName].v;
                                    var attributeType = edgeAttributes[key][attrName].d;

                                    var internalAttrName = attributeNameMapper[attrName];

                                    if ( !internalAttrName ) {
                                        //handles new attribute name.
                                        internalAttrName = 'A' + attributeCounter;
                                        attributeCounter ++;
                                        attributeNameMapper[attrName]= internalAttrName;

                                        if (attrName === 'ndex:externallink') {

                                            columnDef = {
                                                field: internalAttrName,
                                                displayName: attrName,
                                                cellTooltip: true,
                                                minWidth: calcColumnWidth(attrName, false),
                                                //enableFiltering: filteringEnabled,
                                                type: 'string',
                                                cellTemplate: '<div class="ui-grid-cell-contents hideLongLine" ng-bind-html="grid.appScope.getURLsForNdexExternalLink(COL_FIELD)"></div>'
                                            };

                                        } else {

                                            var columnDef = {
                                                field: internalAttrName,
                                                displayName: reservedTableColumnNames.includes(attrName) ?
                                                    (attrName + ' (2)') : attrName,
                                                cellTooltip: true,
                                                minWidth: calcColumnWidth(attrName, false),
                                                //enableFiltering: filteringEnabled,  // add back at the very end.
                                                cellTemplate: 'views/gridTemplates/showCellContentsInNetworkTable.html'
                                            };

                                            var colComparator = getComparator(attributeType);
                                            if (colComparator) {
                                                columnDef.sortingAlgorithm = colComparator;
                                            }
                                        }

                                        columnDefinitionList.push(columnDef);

                                    }

                                    row[internalAttrName] = (attributeValue) ?
                                        attributeValue : '';
                                }
                            }
                        }

                        dataTable.push(row);
                        rowCount++;
                    }
                }


                // enable filtering if number of edges in the network is no greater than 500
                var filteringEnabled = (rowCount <= 500);

                if (enableFiltering) {
                    // enable filtering even if the number of edges in the network is greater than 500;
                    // this is the case when we want filtering on after running simple or advance query
                    filteringEnabled = true;
                }

                var columnDefs = [
                    {
                        field: reservedTableColumnNames[0],
                        displayName: reservedTableColumnNames[0],
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestSubject, false)
                    },
                    {
                        field: reservedTableColumnNames[1],
                        displayName: reservedTableColumnNames[1],
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestPredicate, false)
                    },
                    {
                        field: reservedTableColumnNames[2],
                        displayName: reservedTableColumnNames[2],
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
                            minWidth: calcColumnWidth('citation'),  //cj: default is not last column. might be wrong if there is no edge attributes.
                            enableFiltering: true,
                            cellTemplate: '<div class="text-center"><h6>' +
                            '<a ng-click="grid.appScope.showEdgeCitations(COL_FIELD)" ng-show="grid.appScope.getNumEdgeCitations(COL_FIELD) > 0">' +
                            '{{grid.appScope.getNumEdgeCitations(COL_FIELD)}}' +
                            '</h6></div>'
                        };
                    columnDefs.push(citationsHeader);
                }

                var fullDefinition = columnDefs.concat(columnDefinitionList);

                var lastDef = fullDefinition[fullDefinition.length-1];
                lastDef.minWidth = calcColumnWidth(lastDef.displayName, true);

                $scope.edgeGridOptions.data = dataTable;
                $scope.edgeGridApi.grid.options.columnDefs = fullDefinition;

                if (setGridWidth) {
                    var cytoscapeCanvasWidth = $('#cytoscape-canvas').width();
                    if (cytoscapeCanvasWidth > 0) {
                        $scope.edgeGridApi.grid.gridWidth = cytoscapeCanvasWidth;
                    }
                }
                var windowHeight = $(window).height() - 195;
                $('#edgeGridId').height(windowHeight);
                $scope.edgeGridApi.grid.gridHeight = windowHeight;

           //     refreshEdgeTable(network);
            };

            $scope.switchView = function() {
                if (!$scope.switchViewButtonEnabled) {
                    return;
                }

                if ($scope.currentView === 'Graphic') {
                    // switch to table view
                    $scope.currentView = 'Table';
                    $scope.buttonLabel = 'Graph';

                    var enableFiltering = true;
                    var setGridWidth = true;

                    localNetwork = networkService.getCurrentNiceCX();

                    populateEdgeTable(localNetwork, enableFiltering, setGridWidth);
                    populateNodeTable(localNetwork, enableFiltering, setGridWidth);

                } else if  ($scope.currentView === 'Table') {

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

                        ndexNavigation.openConfirmationModal(title, message, 'Switch to Graph', 'Cancel', dismissModal,
                            function () {

                                networkController.warningShown = true;

                                // switch to graphic view
                                $scope.currentView = 'Graphic';
                                $scope.buttonLabel = 'Table';

                                if ($scope.drawCXNetworkOnCanvasWhenViewSwitched) {
                                    $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

                                    localNetwork = networkService.getCurrentNiceCX();

                                    checkIfCanvasIsVisibleAndDrawNetwork();
                                }
                            },
                            function () {
                                // do not do anything
                            });
                    } else {

                        // switch to graphic view
                        $scope.currentView = 'Graphic';
                        $scope.buttonLabel = 'Table';

                        if ($scope.drawCXNetworkOnCanvasWhenViewSwitched) {
                            $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

                            localNetwork = networkService.getCurrentNiceCX();

                            checkIfCanvasIsVisibleAndDrawNetwork();
                        }
                    }
                }

            };

            $scope.saveAsTSV = function() {

                var anchor = document.createElement('a');
                var textToSaveInTheFile = networkService.getTSVOfCurrentNiceCX();

                var currentNetworkCXName = networkService.getCurrentNetworkName();
                var outputFileName = (currentNetworkCXName) ?
                    currentNetworkCXName : networkController.currentNetwork.name;

                outputFileName += '.txt';

                anchor.setAttribute('href',
                    URL.createObjectURL(new Blob([textToSaveInTheFile],{type: "application/octet-stream;charset=utf-8" }))
                );
                anchor.setAttribute('download', outputFileName);

                document.body.appendChild(anchor);
                anchor.click();

                document.body.removeChild(anchor);
            };


            var openCurrentNetworkInCytoscape = function() {

                $scope.openInCytoscapeTitle = 'Opening ' + networkController.currentNetwork.name +
                    ' in Cytoscape...';

                // open network in Viewer
                if ( networkController.successfullyQueried || networkExternalId === undefined) {
                    var rawCX = cxNetworkUtils.niceCXToRawCX(networkService.getCurrentNiceCX());
                    cyREST.postRawCXToCytoscape(rawCX,
                        function () {
                            console.log('opened.');
                        },
                        function() {
                            console.log('failed.');
                        });
                    return;
                }

                var serverURL  = cyREST.getNdexServerUriHTTP();

                var postData = {
                    'serverUrl': serverURL,
                    'uuid': networkExternalId,
                    'createView': true
                };

                if (accesskey) {
                    postData.accessKey = accesskey;

                } else if (networkController.networkShareURL) {   // is this redundant to the above? -- cj
                    var splitURLArray = networkController.networkShareURL.split('accesskey=');
                    if (splitURLArray.length === 2) {
                        postData.accessKey = splitURLArray[1];
                    }
                }

                if (window.currentSignInType === 'google') {
                    postData.idToken = window.keycloak.token;
                    //gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;

                } else if (window.currentSignInType === 'basic') {

                    var userCredentials = ndexUtility.getUserCredentials();

                    postData.username = userCredentials.userName;
                    postData.password = userCredentials.token;
                }

                cyREST.exportNetworkToCytoscape(postData,
                    function() {
                        // show the "Opened" tooltip ...
                        $scope.openInCytoscapeTitle = 'Opened';
                        $scope.isCytoscapeRunning = true;

                        // remove the "Opened" after 2 secs
                        $timeout( function(){
                            $scope.openInCytoscapeTitle = openNetworkInCytoscapeToolTip;
                        }, 2000 );
                    },
                    function() {

                        console.log('unable to open network in Cytoscape error');

                        $scope.openInCytoscapeTitle = 'Unable to open this network in Cytoscape';
                        $scope.cytoscapeIsRunning = false;

                    });
            };

            $scope.networkToCytoscape = function() {

                // check if Cytoscape button is disabled
                if (!$scope.isCytoscapeRunning) {
                    return;
                }

                var numberOfEdges  = networkController.currentNetwork.edgeCount;
                var edgesThreshold = window.ndexSettings.openInCytoscapeEdgeThresholdWarning;

                if ((edgesThreshold === 0) || (numberOfEdges < edgesThreshold)) {
                    openCurrentNetworkInCytoscape();

                } else {

                    var dismissModal = true;
                    var title   = 'Performance Notice';
                    var message = 'This is a large network and opening it in Cytoscape might take a long time or ' +
                        ' even cause a system crash if your computer\'s hardware resources are not sufficient ' +
                        'to complete the task. <br><br> ' +
                        '<strong>Would you like to proceed anyway?</strong>';

                    ndexNavigation.openConfirmationModal(title, message, 'Yes', 'Cancel', dismissModal,
                        function () {
                            openCurrentNetworkInCytoscape();
                        },
                        function () {

                        });
                }
            };

            /*
            var enableSimpleQueryElements = function () {
                var nodes = document.getElementById('simpleQueryNetworkViewId').getElementsByTagName('*');
                for(var i = 0; i < nodes.length; i++){
                    nodes[i].disabled = false;
                }
                $('#saveQueryButton').prop('disabled', false);
            };
            */


            // this function gets called when user navigates away from the current Graphic View page.
            // (can also use "$locationChangeStart" instead of "$destroy"
            $scope.$on('$destroy', function() {

                if (checkCytoscapeStatusTimer) {
                    clearInterval(checkCytoscapeStatusTimer);
                }

                networkService.clearNiceCX();
                networkService.clearQueryResultInCX();
            });

            /*
            $scope.$watch(function(){
                return $location.path();
            }, function(newPath, oldPath){
                console.log('oldPath = ' + oldPath + '  newPath = ' + newPath );
            })
            */
/*          // TODO: delete later if not needed
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

                            if (edgeAttribute.d) {
                                if ((edgeAttribute.d === 'string') || (edgeAttribute.d === 'boolean')) {
                                    edgeAttributesMap.key = key;
                                }
                            } else if (edgeAttribute.v) {
                                if ((typeof(edgeAttribute.v) === 'string') || (typeof(edgeAttribute.v) === 'boolean')) {
                                    edgeAttributesMap.key = key;
                                }
                            }
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

                            if (nodeAttribute.d) {
                                if ((nodeAttribute.d === 'string') || (nodeAttribute.d === 'boolean')) {
                                    nodeAttributesMap[key] = key;
                                }
                            } else if (nodeAttribute.v) {
                                if ((typeof(nodeAttribute.v) === 'string') || (typeof(nodeAttribute.v) === 'boolean')) {
                                    nodeAttributesMap[key] = key;
                                }
                            }
                        });
                    });
                }

                var attributeNames = _.keys(edgeAttributesMap);
                _.forEach(attributeNames, function(attributeName) {
                    networkController.edgePropertyNamesForAdvancedQuery.push(attributeName);
                });

                attributeNames = _.keys(nodeAttributesMap);
                _.forEach(attributeNames, function(attributeName) {
                    if (attributeName && (attributeName.toLowerCase() !== ('ndex:internallink'))) {
                        networkController.nodePropertyNamesForAdvancedQuery.push(attributeName);
                    }
                });
            };
*/
            /*
            // TODO: delete later if not needed
            $scope.activateAdvancedQueryTab = function() {

                networkController.previousNetwork = networkController.currentNetwork;
                //networkService.saveCurrentNiceCXBeforeQuery();
                $scope.query = 'advanced';

                //populate the node and edge properties

                if ( typeof(networkController.edgePropertyNamesForAdvancedQuery) === 'undefined') {

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
                var nodes = document.getElementById('simpleQueryNetworkViewId').getElementsByTagName('*');
                for(var j = 0; j < nodes.length; j++){
                    nodes[j].disabled = true;
                }

                $scope.disableQuery = true;
            };
            */

            $scope.downloadNetwork = function () {
                uiMisc.downloadCXNetwork(networkExternalId);
            };

            $scope.getNodeName = function(node)
            {
                return networkService.getNodeName(node);
            };

            $scope.removeHiddenAttributes = function(attributeNames) {

                var attributeNamesWithoutHiddenElements = [];

                // remove all attributes that start with two underscores ("__") - these attributes are "hidden",
                // i.e., they are for internal use and should not be shown to the user
                _.forEach(attributeNames, function(attribute) {

                    if (attribute && !attribute.startsWith('__')) {
                        attributeNamesWithoutHiddenElements.push(attribute);
                    }
                });

                return attributeNamesWithoutHiddenElements;
            };

            /**
             *
             * @param node
             * @return Object with this structure:
             *   { reserved: array of {"n", "v"},
             *     others: array of {"n","v"}}
             *     where n is the display name, and v is the stringified attribute value.
             *
             */
            $scope.getNodeAttributesForPanel = function (node) {
                //var cxn = networkService.getCXNode(node.id);
                // this array holds reserved fields in a certain order
                var resv = [];
                // 1. node id
                resv.push ( {"n": "Node Id", "v": 2333});

          /*      //2. node name
                if ( cxn.n !== undefined) {
                    resv.push ( {"n": "Name", "v": cxn.n});
                }
                //3. represents
                if ( cxn.r !== undefined ) {
                    resv.push({"n": "Represents", "v": cxn.r});
                } */
                //4. citations
          //      var otherAttrs = networkService.getNodeAttributes(cxn.id);
          //      var othv = [];

      /*          var topList = ['alias','relatedTo','citations'];
                topList.forEach(function (value) {
                    if (otherAttrs[value]) {
                        resv.push({"n": value, "v": $scope.getAttributeValue("1",otherAttrs[value])});
                    }
                });

                for (var prop in otherAttrs) {
                    if (Object.prototype.hasOwnProperty.call(otherAttrs, prop)) {
                        if (topList.indexOf(prop) <0) {
                            othv.push ({"n": prop,"v": $scope.getAttributeValue(prop,otherAttrs[prop])});
                        }
                    }
                };
*/
                return resv;
               // return {reserved: resv, others: othv };
            };

            $scope.getNodeAttributesNames = function(node) {

                var nodeAttributeNames = _.keys(node);
                var attributeNames     =  $scope.removeHiddenAttributes(nodeAttributeNames);

                var resultList = [];

                //First section has these attributes in order if they exists
                var topList = [ 'n','r','alias','relatedTo','citations'];
                _(topList).forEach(function (value) {
                    if (node[value]) {
                        resultList.push(value);
                    }
                });

                var elementsToRemove = topList.concat([ '_cydefaultLabel', 'id', '$$hashKey', '$$expanded']);

                for (var i = 0; i < elementsToRemove.length; i++) {

                    var index = attributeNames.indexOf(elementsToRemove[i]);
                    if (index > -1) {
                        attributeNames.splice(index, 1);
                    }
                }

                var comparator2 = function (a, b) {
                    if ( networkController.nodeAttrListSortingAsc) {
                        return a.localeCompare(b, 'en', {sensitivity: 'base'});
                    } else {
                        return b.localeCompare(a, 'en', {sensitivity: 'base'});
                    }
                };

                attributeNames = Array.from(attributeNames).sort(comparator2);


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
                }
                if (attributeNames.indexOf(ndexExternalLink) > -1) {
                    links.push(ndexExternalLink);
                    _.pull(attributeNames, ndexExternalLink);
                }

                resultList = resultList.concat(attributeNames);
                if (links.length > 0) {
                    resultList = resultList.concat(links);
                }

                return resultList;
            };

            $scope.getEdgeAttributesNames = function(node) {

                var edgeAttributeNames  = _.keys(node);
                var attributeNames      =  $scope.removeHiddenAttributes(edgeAttributeNames);

                var elementsToRemove = ['s', 't', 'i', 'id', '$$hashKey', '$$expanded'];

                for (var i = 0; i < elementsToRemove.length; i++) {

                    var index = attributeNames.indexOf(elementsToRemove[i]);
                    if (index > -1) {
                        attributeNames.splice(index, 1);
                    }
                }

                var comparator3 = function (a, b) {
                    if ( networkController.edgeAttrListSortingAsc) {
                        return a.localeCompare(b, 'en', {sensitivity: 'base'});
                    } else {
                        return b.localeCompare(a, 'en', {sensitivity: 'base'});
                    }
                };

                attributeNames = Array.from(attributeNames).sort(comparator3);

                return attributeNames;
            };

            $scope.getAttributeValue = function(attributeName, attribute) {

                if (!attribute && (attribute !== 0)) {
                    return attribute;
                }
                if (!attributeName) {
                    return attributeName;
                }

                var attributeValue = '';

                if (attribute instanceof Object) {
                    if (attribute.v && Array.isArray(attribute.v) && (attribute.v.length > 0) &&
                        (attributeName.toLowerCase() !== 'ndex:externallink'))
                    {
                            for (var i = 0; i < 5 && i < attribute.v.length; i++) {
                                if (i === 0) {
                                    attributeValue =  '&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                        getStringAttributeValue(attribute.v[i]) + '<br>';
                                } else {
                                    attributeValue = attributeValue +  '&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                        getStringAttributeValue(attribute.v[i]) + '<br>';
                                }
                            }
                            if ( attribute.v.length > 5) {
                                attributeValue += '&nbsp;&nbsp;&nbsp;&nbsp; <a ng-click="networkController.showMoreAttributes(attributeName, node[attributeName])">more...</a>';
                            }
                    } else {

                        if (attributeName.toLowerCase() === 'ndex:internallink') {

                            return $scope.getURLsForNdexInternalLink(attribute.v);

                        } else if (attributeName.toLowerCase() === 'ndex:externallink') {

                            return  $scope.getURLsForNdexExternalLink(attribute.v);

                        } else if  (Array.isArray(attribute) && attribute.length > 0) {

                                for (var i2 = 0; i2 < 5 && i2 < attribute.length; i2++) {
                                    if (i2 === 0) {
                                        attributeValue = '<br>' + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                            getStringAttributeValue(attribute[i2]) + '<br>';
                                    } else {
                                        attributeValue = attributeValue +  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                            getStringAttributeValue(attribute[i2]) + '<br>';
                                    }
                                }

                            return attributeValue;
                        }

                        attributeValue = (attribute.v) ? attribute.v : '';

                        var typeOfAttributeValue = typeof(attributeValue);

                        if (attributeValue && (typeOfAttributeValue === 'string')) {
                            attributeValue = getStringAttributeValue(attributeValue);
                        }
                    }

                } else {

                    if (typeof attribute === 'string') {

                        attributeValue = getStringAttributeValue(attribute);

                    } else {

                        attributeValue = (attribute === 0) ? '0' : attribute;
                    }
                }

                return attributeValue;
            };

            $scope.howManyAttributes = function(attribute) {
                var numOfAttributes = 0;

                if (!attribute) {
                    return numOfAttributes;
                }

                if ((attribute instanceof Object) && (attribute.v) && (Array.isArray(attribute.v))) {

                    numOfAttributes = attribute.v.length;

                }  else if ((attribute instanceof Object) && (Array.isArray(attribute))) {

                    numOfAttributes = attribute.length;

                } else if (_.isString(attribute)) {

                    numOfAttributes = 1;
                }

                return numOfAttributes;
            };

            networkController.genericInfoModal = function(title, message)
            {
                $modal.open({
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
            };

            networkController.showMoreAttributesByNodeId = function(nodeId, attributeName) {

                var title = attributeName + ':';

                var attributeValue = '';

                var attribute = networkService.getNodeAttr(nodeId,attributeName);
                if (attribute instanceof Object) {
                    if (attribute.v && Array.isArray(attribute.v)) {

                        for (var i = 0; i < attribute.v.length; i++) {
                            attributeValue = attributeValue + getStringAttributeValue(attribute.v[i]) + '<br>';
                        }

                    } else if (attribute && Array.isArray(attribute)) {

                        for (var j = 0; j < attribute.length; j++) {
                            attributeValue = attributeValue + getStringAttributeValue(attribute[j]) + '<br>';
                        }
                    }
                }

                networkController.genericInfoModal(title, attributeValue);
            };

            networkController.showMoreAttributes = function(attributeName, attribute) {

                var title = attributeName + ':';

                var attributeValue = '';

                if (attribute instanceof Object) {
                    if (attribute.v && Array.isArray(attribute.v)) {

                        for (var i = 0; i < attribute.v.length; i++) {
                            attributeValue = attributeValue + getStringAttributeValue(attribute.v[i]) + '<br>';
                        }

                    } else if (attribute && Array.isArray(attribute)) {

                        for (var j = 0; j < attribute.length; j++) {
                            attributeValue = attributeValue + getStringAttributeValue(attribute[j]) + '<br>';
                        }
                    }
                }
                
                networkController.genericInfoModal(title, attributeValue);
            };

            // The only difference between this and -- cj

            $scope.showMoreAttributesInTable = function(attributeDisplayName, attributeObj) {

             //   var title = attributeDisplayName;
          /*      var typeOfAttributeName = typeof attributeName;

                if ((typeOfAttributeName === 'object') && (Array.isArray(attributeObj))) {

                    var attributeObjLen = attributeObj.length;

                    if (attributeName && attributeName.entity) {

                        _.forOwn(attributeName.entity, function(value, key) {

                            title = key + ':';

                            if (Array.isArray(value) && (value.length === attributeObjLen)) {

                                for (var i=0; i<attributeObjLen; i++) {
                                    if (value[i] !== attributeObj[i]) {
                                        title = null;
                                    }
                                }

                                if (title !== null) {
                                    return false;
                                }
                            }
                        });
                    }
                } else {
                    title = attributeName + ':';
                } */

                var attributeValue = '';

                if (attributeObj instanceof Object) {
                    if (attributeObj.v && Array.isArray(attributeObj.v)) {

                        for (var i = 0; i < attributeObj.v.length; i++) {
                            attributeValue = attributeValue + getStringAttributeValue(attributeObj.v[i]) + '<br>';
                        }

                    } else if (_.isArray(attributeObj)) {

                        _.forEach(attributeObj, function (attribute) {

                            if (_.isString(attribute)) {
                                attributeValue = attributeValue + '<br>' + $scope.linkify(attribute);
                                /*
                                if (attributeValue) {
                                    attributeValue = attributeValue + '<br>' + $scope.linkify(attribute);
                                } else {
                                    attributeValue = $scope.linkify(attribute);
                                }
                                */
                            }
                        });
                    }
                }

                networkController.genericInfoModal(attributeDisplayName + ":", attributeValue);
            };

            networkController.contextModal = function(title, message, isEdit)
            {
                $modal.open({
                    templateUrl: 'views/context-modal.html',
                    windowClass: 'app-modal-window-800',
                    scope: $scope,

                    controller: function($scope, $modalInstance) {
                        //$scope.context = {"ncbi": "http://identifiers.org/ncbi",
                        //"pmid": "http://identifiers.org/pubmed"};

                        $scope.context = [];
                        _.forEach(networkController.context, function (value,key) {
                            if ( value && key)
                                $scope.context.push( {'namespace' :key, 'url' : value});
                        });

                        $scope.contextIsEmpty = $scope.context.length === 0;

                        $scope.title = title;
                        $scope.message = message;
                        $scope.isEdit = isEdit;
                        $scope.errors = '';

                        $scope.removeContext = function(index){
                            delete $scope.context.splice(index,1);
                        };

                        $scope.addContext = function(){
                            $scope.context.push({'namespace': '', 'url': ''});
                            $scope.contextIsEmpty = false;
                        };

                        $scope.close = function() {
                            $modalInstance.dismiss();
                        };

                        $scope.save = function() {
                            var contextObj = {};

                            _.forEach($scope.context, function (addThis) {
                                if ( addThis.namespace && addThis.url)
                                    contextObj[addThis.namespace] = addThis.url;
                            });

                            networkController.context = contextObj;

                            if ( networkController.contextIsFromAspect) {
                                networkService.updateNetworkContextFromNdexV2([networkController.context], networkExternalId,
                                    function (dummy) {
                                        $modalInstance.dismiss();
                                    }, function (errorMessage) {
                                        $scope.errors = errorMessage;
                                    }
                                );
                            } else {
                                // modify the network attribute
                                networkService.setNetworkProperty(currentNetworkSummary,'@context',
                                    JSON.stringify(networkController.context));
                                ndexService.setNetworkPropertiesV2(networkController.currentNetworkId,
                                    currentNetworkSummary.properties, function(res){
                                        $modalInstance.dismiss();
                                    },
                                    function(err) {
                                        $scope.errors = err;

                                     }
                                );
                            }
                        };
                    }
                });
            };

            networkController.showContextModal = function(isEdit){
                networkController.contextModal('title', 'message', isEdit);
            };

            $scope.getEdgeLabel = function(edge) {

                if (!edge) {
                    return 'unknown';
                }

                var source='source unknown', target='target unknown', predicate='->';

                if (edge.s || (edge.s === 0)) {
                    var sourceNodeObj = networkService.getNodeInfo(edge.s);
                    source = networkService.getNodeName(sourceNodeObj);
                }
                if (edge.t || (edge.t === 0)) {
                    var targetNodeObj = networkService.getNodeInfo(edge.t);
                    target = networkService.getNodeName(targetNodeObj);
                }
                if (edge.i) {
                    predicate = edge.i;
                }

                return source + ' ' + predicate + ' ' + target;
            };


            $scope.getCitation = function (citation) {

                var retString = 'pmid : unable to get citation info';
                var isCitationAString = (typeof citation === 'string');

                if (citation && (citation['dc:identifier'] || isCitationAString)) {

                    var splitString = (isCitationAString) ?
                        citation.split(':') : citation['dc:identifier'].split(':');
                    
                    if (splitString.length === 2) {

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

                networkController.context = {};

                var contextStr = getNetworkPropertyFromSummary(undefined, '@context');

                if ( contextStr) {
                    networkController.context = JSON.parse(contextStr);
                    networkController.contextIsFromAspect = false;
                    return;
                }

                var contextAspect = networkService.getCurrentNiceCX()['@context'];

                if (contextAspect) {
                    if (contextAspect.elements) {
                        networkController.context =  contextAspect.elements[0];
                    } else {
                        networkController.context = contextAspect[0];
                    }
                }

                //networkController.context =
                //    (contextAspect && contextAspect['elements']) ? contextAspect['elements'][0] : {};


                // Not sure why do we have this. RDF prefix should be case sensitive. commmenting it out for now -- cj

                /*
                var keys = Object.keys(networkController.context);

                // now, let's lower-case all keys in networkController.context
                for (var i = 0; i < keys.length; i++) {

                    var lowerCaseKey = keys[i].toLowerCase();
                    var value = networkController.context[keys[i]];

                    // delete original entry
                    delete networkController.context[keys[i]];

                    // add value with lower-case key
                    networkController.context[lowerCaseKey] = value;
                }  */
            };


            /*-----------------------------------------------------------------------*
             * initialize the cytoscape instance from niceCX
             *-----------------------------------------------------------------------*/
            var displayErrorMessage = function(error) {
                if (error.status !== 0) {
                    var message;
                    if (error.data && error.data.message) {
                        message = error.data.message;
                    }
                    if (error.status) {
                        message = message + '  Error Code: ' + error.status + '.';
                    }
                    if (error.statusText) {
                        message = message + '  Error Message: ' + error.statusText;
                    }
                    networkController.errors.push('Unable to get network: ' + message);
                } else {
                    networkController.errors.push('Unable to get network; Server returned no error information.');
                }
            };

            var getNetworkAndDisplay = function (networkId, callback) {

                var hasLayout = networkController.currentNetwork.hasLayout;

                /** @namespace networkController.currentNetwork.hasSample **/
                if (hasLayout && networkController.currentNetwork.edgeCount <= 20000) {
                    // get complete CX stream and build the CX network object.
                    networkController.isSample = false;
                    networkService.getCompleteNetworkInCXV2(networkId, accesskey)
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

                else if ((hasLayout && networkController.currentNetwork.edgeCount > 20000) ||
                        networkController.currentNetwork.hasSample) {
                    // get sample CX network
                    networkController.isSample = true;
                    networkService.getNetworkSampleV2(networkId, accesskey)
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
                    networkService.getCompleteNetworkInCXV2(networkId, accesskey)
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

/*
            var calcColumnWidth = function(header, isLastColumn)
            {
                var result = header.length * 10;
                result = result < 100 ? 100 : result;
                if (isLastColumn) {
                    result += 40;
                }
                return result > 250 ? 250 : result;
            };
*/

/*
            $scope.getAttributeValueForTable = function(attribute) {

                if (!attribute && (attribute !== 0)) {
                    return "";
                }

                var attributeValue = "";

                if (attribute instanceof Object) {
                    if (Array.isArray(attribute) && (attribute.length > 0))
                    {

                        for (var i = 0; i < attribute.length; i++) {
                            if (i === 0) {
                                attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                    getStringAttributeValue(attribute[i]) + "<br>";
                            } else {
                                attributeValue = attributeValue + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                    getStringAttributeValue(attribute[i]) + "<br> ";
                            }
                        }

                    } else {

                        if (attributeName.toLowerCase() === 'ndex:internallink') {

                            return $scope.getURLsForNdexInternalLink(attribute.v);

                        } else if (attributeName.toLowerCase() === 'ndex:externallink') {

                            return  $scope.getURLsForNdexExternalLink(attribute.v);

                        } else if  (Array.isArray(attribute) && attribute.length > 0) {

                            if(attribute.length > 5) {

                                for (var i = 0; i < 5; i++) {
                                    if (i === 0) {
                                        attributeValue = "<br>" + " &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            getStringAttributeValue(attribute[i]) + "<br>";
                                    } else {
                                        attributeValue = attributeValue +  "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; " +
                                            getStringAttributeValue(attribute[i]) + "<br>";
                                    }
                                }

                            } else {

                                for (var i = 0; i < attribute.length; i++) {
                                    if (i === 0) {
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


                        attributeValue = (attribute.v) ? attribute.v : '';

                        var typeOfAttributeValue = typeof(attributeValue);

                        if (attributeValue && (typeOfAttributeValue === 'string')) {
                            attributeValue = getStringAttributeValue(attributeValue);
                        }
                    }

                } else {

                    if (typeof attribute === 'string') {

                        attributeValue = getStringAttributeValue(attribute);

                    } else {

                        attributeValue = (attribute === 0) ? "0" : attribute;
                    }
                }

                return attributeValue;
            };
*/
            networkController.checkQueryNetworkAndDisplay = function (query) {

                if ('neighborhood' === query) {
                    if (!networkController.searchString || !networkController.searchString.trim()) {
                        networkController.searchString = '';
                        $('#inputQueryStrId').val('');
                        return;
                    }
                }

                $scope.query = query;
                networkController.previousNetwork = networkController.currentNetwork;
                $scope.beforeQueryView = $scope.currentView;


                // release 2.4.0 does not support Advanced Query, so we only have neighborhood
                networkController.queryNetworkAndDisplay();
                /*
                if ('neighborhood' === query) {
                    networkController.queryNetworkAndDisplay();
                } else {
                    networkController.runAdvancedQuery();
                }
                */

            };

            networkController.cleanUpAfterQuerying = function() {
                networkService.restoreCurrentNiceCXAfterQuery();
                networkController.successfullyQueried = false;
                networkController.queryWarnings = [];
                ndexSpinner.stopSpinner();
            };

            networkController.rerunQueryAndSaveResult = function (networkId, accesskey, searchString,
                                                                  edgeLimit, save, errorWhenLimitIsOver) {

                ndexService.queryNetworkV2(networkId, accesskey, searchString, $scope.selectedQuery,
                    edgeLimit, save, errorWhenLimitIsOver,
                        function() {
                            /*
                            var regExpToSplitBy = /^http:.*\/network\//;
                            var networkUUIDArray = networkURI.split(regExpToSplitBy);

                            var networkUUID = (Array.isArray(networkUUIDArray) && (networkUUIDArray.length == 2)) ?
                                networkUUIDArray[1] : "";
                                */
                            // do nothing here

                        },
                        function(error) {
                            if (error && error.errorCode && (error.errorCode === 'NDEx_Bad_Request_Exception')) {
                                if (error.message) {
                                    networkController.queryErrors.push(error.message);
                                }
                            }
                        });
            };


            networkController.presentQueryResult = function(nodeCount, edgeCount, queryStatus) {

                if ((nodeCount === 0) && (queryStatus.success)) {
                    networkService.restoreCurrentNiceCXAfterQuery();
                    networkController.successfullyQueried = false;
                    networkController.queryWarnings = [];
                    networkController.queryWarnings.push('No nodes matching your query terms were found in this network.');
                    ndexSpinner.stopSpinner();
                    return;
                }

                networkController.successfullyQueried = true;

                var network = networkService.getCurrentNiceCX();
                var resultName = networkService.getCurrentNetworkName();

                networkController.currentNetwork =
                    {
                        'name': resultName,
                        'nodeCount': nodeCount,
                        'edgeCount': edgeCount,
                        'queryString': networkController.searchString,
                        'depth' : $scope.selectedQuery.searchDepth
                    };

                cxNetworkUtils.setNetworkProperty(network, 'name', resultName);

                if (!networkController.tabs[0].active) {
                    networkController.tabs[0].active = true;
                }
                networkController.selectionContainer = {};

                //var networkQueryEdgeLimit = ndexSettings.networkQueryEdgeLimit;

                networkController.isSamplePrevious   = networkController.isSample;
                networkController.sampleSizePrevious = networkController.sampleSize;
                networkController.isSample   = false;
                networkController.sampleSize = 0;

                var enableFiltering = false;
                var setGridWidth    = false;


                $scope.showSetSampleButton = (networkController.isAdmin); // || networkController.canEdit) &&
                    //(networkController.previousNetwork.edgeCount > $scope.noOfEdgesToShowSetSampleButton));


                if ($scope.showSetSampleButton) {

                    if (edgeCount > 1000) {

                        $scope.showSetSampleButtonEnabled = false;
                        $scope.setSampleButtonToolTip = 'Cannot set sample for query results with more than 1000 edges';

                    } else if (networkController.previousNetwork.edgeCount < $scope.noOfEdgesToShowSetSampleButton) {

                        $scope.showSetSampleButtonEnabled = false;
                        $scope.setSampleButtonToolTip =
                            'Cannot set sample for networks with less than ' + $scope.noOfEdgesToShowSetSampleButton +  ' edges';

                    } else if ((networkController.previousNetwork.edgeCount <= 12000) && networkController.previousNetwork.hasLayout) {

                        $scope.showSetSampleButtonEnabled = false;
                        $scope.setSampleButtonToolTip = 'This feature is not yet implemented';

                    }
                    else {
                            $scope.showSetSampleButtonEnabled = true;
                            $scope.setSampleButtonToolTip = 'Set this query as network sample ';
                        }
                    }


                // re-draw network in Cytoscape Canvas regardless of whether we are in Table or Graph View
                if (edgeCount <= networkController.queryEdgeLimitToShowGraph) {
                    drawCXNetworkOnCanvas(network, false);

                    if ($scope.currentView === 'Table') {
                        enableFiltering = true;
                        setGridWidth = false;
                        populateNodeTable(network, enableFiltering, setGridWidth);
                        populateEdgeTable(network, enableFiltering, setGridWidth);
                        $scope.drawCXNetworkOnCanvasWhenViewSwitched = true;
                    } else {
                        $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;
                        $scope.switchToGraphViewButtonTitle = 'Switch to Graphic View';
                    }

                } else if ((edgeCount > networkController.queryEdgeLimitToShowGraph) &&
                    (edgeCount <= networkController.queryEdgeLimitToShowTableOnly)) {

                    $scope.currentView = 'Table';
                    $scope.buttonLabel = 'Graph';
                    $scope.switchViewButtonEnabled = true;

                    enableFiltering = true;
                    setGridWidth    = true;
                    $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

                    $scope.switchToGraphViewButtonTitle = 'Switch to Graphic View';

                    drawCXNetworkOnCanvas(network, false);

                    populateNodeTable(network, enableFiltering, setGridWidth);
                    populateEdgeTable(network, enableFiltering, setGridWidth);

                } else if (edgeCount > networkController.queryEdgeLimitToShowTableOnly) {

                    $scope.currentView = 'Table';
                    $scope.buttonLabel = 'Graph';
                    $scope.switchViewButtonEnabled = false;

                    $scope.switchToGraphViewButtonTitle =
                        'This network is too large to display in the browser. Please import it in Cytoscape for visualization purposes.';

                    enableFiltering = true;
                    setGridWidth    = true;
                    $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

                    populateNodeTable(network, enableFiltering, setGridWidth);
                    populateEdgeTable(network, enableFiltering, setGridWidth);
                }
            };


            networkController.queryNetworkAndDisplay = function () {
                // remove old query and error messages, if any
                networkController.queryWarnings = [];
                networkController.queryErrors = [];

                ndexSpinner.startSpinner(spinnerId);
                var networkQueryEdgeLimit = window.ndexSettings.networkQueryEdgeLimit;
                var save = false;
                var errorWhenOverLimit = true;

                ndexService.queryNetworkV2(networkController.currentNetworkId,
                    accesskey, networkController.searchString, $scope.selectedQuery, networkQueryEdgeLimit, save, errorWhenOverLimit,
                        function (networkInCX) {

                            networkController.highlightNodes = $scope.selectedQuery.name != directQueryName;

                            networkService.setQueryResultInCX(networkInCX);

                            var network = cxNetworkUtils.rawCXtoNiceCX(networkInCX);
                            networkService.setCurrentNiceCX(network);

                            var nodeCount = (network.nodes) ? Object.keys(network.nodes).length : 0;
                            var edgeCount = (network.edges) ? Object.keys(network.edges).length : 0;

                            var queryStatus =
                                (network.status && network.status.status && network.status.status[0]) ?
                                    network.status.status[0] : null;

                            if (!queryStatus.success && ('edgelimitexceeded' === queryStatus.error.toLowerCase())) {

                                var dismissModal = true;
                                var title = 'Query Result Exceeds Limit';

                                if (networkController.isLoggedInUser) {

                                    var message = 'Your query returned more than ' + networkQueryEdgeLimit +
                                        ' edges and cannot be executed in the browser. <br><br> ' +
                                        '<strong>Would you like to save the result directly to your account?</strong>';

                                    ndexNavigation.openConfirmationModal(title, message, 'Save Result', 'Cancel', dismissModal,
                                        function () {
                                            var save = true;
                                            var errorWhenLimitIsOver = false;
                                            networkQueryEdgeLimit = -1;

                                            networkController.rerunQueryAndSaveResult(networkController.currentNetworkId,
                                                accesskey, networkController.searchString,
                                                networkQueryEdgeLimit, save, errorWhenLimitIsOver);

                                            networkController.cleanUpAfterQuerying();
                                        },
                                        function () {

                                            networkController.cleanUpAfterQuerying();
                                        });

                                } else {
                                    // user is anonymous; prompt her/him to log in to save this query to her/his account

                                    var message1 = 'Your query returned more than ' + networkQueryEdgeLimit +
                                        ' edges and cannot be executed in the browser. <br><br> ' +
                                        '<strong>Please log in so that the result can be saved to your NDEx account.</strong>';

                                    ndexSpinner.stopSpinner();

                                    ndexNavigation.openConfirmationModal(title, message1, 'Log in', 'Close', dismissModal,
                                        function () {

                                            // log in - forward to Sign In page
                                            networkController.cleanUpAfterQuerying();

                                            $location.path('/signIn');

                                        },
                                        function () {
                                            // user canceled
                                            networkController.cleanUpAfterQuerying();
                                        });

                                    return;
                                }

                            } else {

                                networkController.presentQueryResult(nodeCount, edgeCount, queryStatus);
                            }

                            ndexSpinner.stopSpinner();
                        },
                        function (error) {
                            ndexSpinner.stopSpinner();
                            if (error.status !== 0) {
                                if (error.message) {
                                    networkController.queryWarnings = [];
                                    if (error.stack) {
                                        networkController.queryWarnings.push(error.message + ' ' + error.stack);
                                    } else {
                                        networkController.queryWarnings.push(error.message);
                                    }
                                }
                                else if (error.data.message &&
                                    (error.data.message.toLowerCase().indexOf('edgelimitexceeded') > 0))
                                {
                                    var edgeLimitExceededWarning =
                                        'Query returned more than max edges (' + networkQueryEdgeLimit + '). Please refine your query.';
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
                networkController.highlightNodes = true;

/*
                if ($scope.query === 'advanced') {

                    if (typeof event !== 'undefined') {
                        // 'event' is not defined in FireFox (this is bug of the current FireFox v.58.0.2),
                        // but defined in Chrome, Safari and Opera
                        event.stopPropagation();
                    }

                    networkController.tabs[3].active   = false;
                    networkController.tabs[3].disabled = true;
                    networkController.tabs[3].hidden   = true;

                    enableSimpleQueryElements();
                }
*/

                networkController.tabs[0].active   = true;
                networkController.tabs[0].disabled = false;
                networkController.tabs[0].hidden   = false;

                $scope.query = null;

                networkController.successfullyQueried = false;
                $scope.disableQuery = false;

                networkController.currentNetwork = networkController.previousNetwork;
                networkService.restoreCurrentNiceCXAfterQuery();
                localNetwork = networkService.getOriginalNiceCX();
                networkService.clearQueryResultInCX();

                if ($scope.currentView === 'Table') {
                    $scope.drawCXNetworkOnCanvasWhenViewSwitched = true;
                }

                ndexSpinner.startSpinner(spinnerId);
                drawCXNetworkOnCanvas(localNetwork,false);

                networkController.isSample   = networkController.isSamplePrevious;
                networkController.sampleSize = networkController.sampleSizePrevious;

                var enableFiltering = true;
                var setGridWidth = true;
                populateEdgeTable(localNetwork, enableFiltering, setGridWidth);
                populateNodeTable(localNetwork, enableFiltering, setGridWidth);

                if ($scope.currentView !== $scope.beforeQueryView) {
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

                $modal.open({
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
                            if ($scope.isProcessing) {
                                return;
                            }
                            $scope.isProcessing = true;
                            $scope.progress = 'Save in progress.... ';

                            var networkQueryEdgeLimit = -1;
                            var save = true;
                            var errorWhenLimitIsOver = false;

                            networkController.rerunQueryAndSaveResult(networkController.currentNetworkId,
                                accesskey, networkController.searchString,
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

            };

/*
            networkController.runAdvancedQuery = function()
            {
                var mode = networkController.advancedQueryNodeCriteria;
                var validEdgeProperties = [];
                var validNodeProperties = [];

                // remove old query and error messages, if any
                networkController.queryWarnings = [];
                networkController.queryErrors = [];

                var networkQueryEdgeLimit = window.ndexSettings.networkQueryEdgeLimit;

                ndexSpinner.startSpinner(spinnerId);

                var postData =
                {
                    edgeLimit: networkQueryEdgeLimit,
                    queryName: 'Not used yet.'
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
                }

                if (validNodeProperties.length > 0)
                {
                    postData.nodeFilter =
                    {
                        propertySpecifications: validNodeProperties,
                        mode: mode
                    };
                }

                //console.log(JSON.stringify(postData,null,2));
                
                networkService.advancedNetworkQueryV2(networkController.currentNetworkId, accesskey, postData)
                    .success(
                        function (networkInNiceCX) {

                            ndexSpinner.stopSpinner();

                            var localNiceCX = networkInNiceCX;

                            var nodeCount = (localNiceCX.nodes) ? Object.keys(localNiceCX.nodes).length : 0;
                            var edgeCount = (localNiceCX.edges) ? Object.keys(localNiceCX.edges).length : 0;

                            if (nodeCount === 0) {
                                networkService.restoreCurrentNiceCXAfterQuery();
                                networkController.queryWarnings = [];
                                networkController.queryWarnings.push('No nodes matching your query terms were found in this network.');
                                return;
                            }

                            var resultName = 'Advanced query result on network - ' + currentNetworkSummary.name;
                            networkController.successfullyQueried = true;
                            //networkController.previousNetwork = networkController.currentNetwork;
                            networkController.currentNetwork = {
                                    name: resultName,
                                    'nodeCount': nodeCount,
                                    'edgeCount': edgeCount
                                };

                            cxNetworkUtils.setNetworkProperty(localNiceCX, 'name', resultName);


                            // re-draw network in Cytoscape Canvas regardless of whether we are in Table or Graph View
                            drawCXNetworkOnCanvas(localNiceCX,false);

                            networkController.selectionContainer = {};

                            if ($scope.currentView === 'Table') {
                                var enableFiltering = true;
                                var setGridWidth = false;
                                populateNodeTable(localNiceCX, enableFiltering, setGridWidth);
                                populateEdgeTable(localNiceCX, enableFiltering, setGridWidth);
                                $scope.drawCXNetworkOnCanvasWhenViewSwitched = true;
                            } else {
                                $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;
                            }
                        })
                    .error(

                        function (error) {
                            ndexSpinner.stopSpinner();

                            if (error.status !== 0) {
                                if (error.data && error.data.message &&
                                    (error.data.message.toLowerCase().indexOf('edgelimitexceeded') > 0))
                                {
                                    var networkQueryEdgeLimit = window.ndexSettings.networkQueryEdgeLimit;
                                    var edgeLimitExceededWarning =
                                        'Query returned more than max edges (' + networkQueryEdgeLimit + '). Please refine your query.';
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
*/
            networkController.getStatusOfShareableURL = function(checkCytoscapeAndCyRESTVersions) {
                ndexService.getAccessKeyOfNetworkV2(networkExternalId,
                    function(data) {

                        if (!data) {
                            // empty string - access is deactivated
                            networkController.networkShareURL = null;

                        } else if (data.accessKey) {
                            // received  data['accessKey'] - access is enabled
                            networkController.networkShareURL =
                                uiMisc.buildNetworkURL(data.accessKey, networkExternalId);

                        } else {
                            // this should not happen; something went wrong; access deactivated
                            networkController.networkShareURL = null;
                        }

  //                      if (networkController.networkShareURL) {
                            // network Share URL is enabled; This network can be opened in Cytoscape.
                            //$scope.openInCytoscapeTitle = openNetworkInCytoscapeToolTip;

                            // check if Cytoscape is running and if yes if it and CyNDEX have the right versions
                            checkCytoscapeAndCyRESTVersions();


    /*                    } else {
                            // network Share URL is disabled; This network can not be opened in Cytoscape.
                            $scope.openInCytoscapeTitle =
                                'This feature can be used only with Public networks, or Private networks ' +
                                'with an enabled Share URL';
                            doNothing();

                        } */
                    },
                    function() {
                        console.log('unable to get access key for network ' + networkExternalId);
                        $scope.openInCytoscapeTitle =
                            'unable to get access key for network ' + networkExternalId;
                    });
            };


            var getOwnerOfTheNetwork = function(networkOwnerUUID) {

                if (networkController.isLoggedInUser &&
                    (networkOwnerUUID === window.currentNdexUser.externalId))
                {
                    networkController.networkOwner.firstName = window.currentNdexUser.firstName;
                    networkController.networkOwner.lastName  = window.currentNdexUser.lastName;
                    networkController.networkOwner.ownerUUID = networkOwnerUUID;

                    $scope.showDeleteDOILink = $scope.isDOIPending();

                } else {

                    ndexService.getUserByUUIDV2(networkOwnerUUID)
                        .success(
                            function (user) {
                                networkController.networkOwner.firstName = user.firstName;
                                networkController.networkOwner.lastName = user.lastName;
                                networkController.networkOwner.ownerUUID = networkOwnerUUID;
                            })
                        .error(
                            function () {
                                console.log('unable to get the network owner info');
                            });
                }
            };

            const getNetworkPropertyFromSummary = function (subNetworkId, attributeName) {
                return networkService.getNetworkProperty(currentNetworkSummary, subNetworkId, attributeName);
            };

            var setTitlesForCytoscapeCollection = function () {
                $scope.requestDOITitle = 'This network is a Cytoscape collection. Cannot request DOI';
                $scope.exportTitle     = 'This network is a Cytoscape collection and cannot be exported';
                $scope.upgradePermissionTitle =
                    'This network is a Cytoscape collection and cannot be edited in NDEx';
                $scope.editPropertiesButtonTitle = 'This network is a Cytoscape collection and cannot be edited in NDEx';

                if (!networkController.isNetworkOwner) {
                    $scope.shareTitle  = 'Unable to share this network: you do not own it';
                    $scope.deleteTitle = 'Unable to delete this network: you do not own it';
                }
            };

            var setDOITitle = function() {
                // we set DOI title only if Request DOI option of More menu is disabled:
                //      !networkController.isNetworkOwner || networkController.readOnlyChecked ||
                //          networkController.hasMultipleSubNetworks())'
                if (!networkController.isNetworkOwner) {
                    $scope.requestDOITitle = 'Unable to request DOI for this network: you do not own it ';

                } else if (uiMisc.isNetworkCertified(networkController.currentNetwork)) {

                    if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                        $scope.requestDOITitle = 'Unable to request DOI for this network: it is certified and a DOI has been assigned';

                    } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                        $scope.requestDOITitle = 'Unable to request DOI for this network: a request has been submitted and the DOI is pending assignment';

                    }
                } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                    $scope.requestDOITitle = 'Unable to request DOI for this network: a request has been submitted and the DOI is pending assignment';

                } else if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                    $scope.requestDOITitle = 'Unable to request DOI for this network: a DOI has already been assigned';

                } else if (networkController.readOnlyChecked) {
                    $scope.requestDOITitle = 'Unable to request DOI for this network: please uncheck the Read Only box and try again';
                }
            };

            var setShareTitle = function() {
                // we set Share title only if Share option of More menu is disabled:
                // !networkController.isAdmin
                if (!networkController.isNetworkOwner) {
                    $scope.shareTitle = 'You must own the network to manage its access permissions';
                }
            };

            networkController.setNetworkSampleViaUUID = function() {
                if (!$scope.enableSetSampleViaUUID) {
                    return;
                }
                var parentScope = $scope;

                $modal.open({
                    templateUrl: 'views/setNetworkSampleViaUUIDModal.html',
                    backdrop: 'static',

                    controller: function($scope, $modalInstance) {

                        $scope.title       = 'Set Network Sample';
                        //$scope.text        = 'Please enter UUID of network to be used as sample below.<br><br>';
                        $scope.networkUUID = '';

                        $scope.cancel = function() {
                            $modalInstance.dismiss();
                            delete $scope.networkUUID;
                            delete $scope.errors;
                        };

                        $scope.$watch('networkUUID', function() {
                            delete $scope.errors;
                        });

                        $scope.submit = function() {
                            var accessKey = null;

                            if ($scope.networkUUID === networkController.currentNetworkId) {
                                $scope.errors = 'The sample and target are the same network.  Please select a different sample.';
                                return;
                            }

                            networkService.getNetworkSummaryFromNdexV2($scope.networkUUID, accessKey)
                                .success(
                                    function (network) {

                                        var sampleNetworkEdgeCount = network.edgeCount;
                                        //var currentNetworkEdgeCount = networkController.currentNetwork.edgeCount;
                                        var limitForSettingNetwrokSample = 2500;

                                        if (sampleNetworkEdgeCount > limitForSettingNetwrokSample) {
                                            $scope.errors = 'The network with UUID ' + $scope.networkUUID + ' has ' +
                                                sampleNetworkEdgeCount + ' edges. Cannot set as sample networks with more than ' +
                                                limitForSettingNetwrokSample + ' edges.';
                                            return;
                                        }


                                        ndexService.getCompleteNetworkInCXV2($scope.networkUUID, accessKey,

                                            function (network) {

                                                ndexService.setNetworkSampleV2(networkController.currentNetworkId, network,
                                                    function () {
                                                        var sampleInNiceCX = cxNetworkUtils.rawCXtoNiceCX(network);

                                                        networkController.isSample = true;
                                                        networkController.sampleSize = (sampleInNiceCX.edges) ? _.size(sampleInNiceCX.edges) : 0;

                                                        networkService.setCurrentNiceCX(sampleInNiceCX);
                                                        networkService.setOriginalNiceCX(sampleInNiceCX);

                                                        drawCXNetworkOnCanvas(sampleInNiceCX, false);

                                                        if (parentScope.currentView === 'Table') {
                                                            var enableFiltering = true;
                                                            var setGridWidth = false;
                                                            populateNodeTable(sampleInNiceCX, enableFiltering, setGridWidth);
                                                            populateEdgeTable(sampleInNiceCX, enableFiltering, setGridWidth);
                                                            parentScope.drawCXNetworkOnCanvasWhenViewSwitched = true;
                                                        } else {
                                                            parentScope.drawCXNetworkOnCanvasWhenViewSwitched = false;
                                                        }

                                                        $modalInstance.dismiss();
                                                    },
                                                    function (error) {
                                                        if (error && error.hasOwnProperty('data') &&
                                                            error.data.hasOwnProperty('message')) {

                                                            $scope.errors = 'Unable to set network ' + $scope.networkUUID +
                                                                ' as sample: ' + error.data.message;

                                                        } else {

                                                            $scope.errors = 'Unable to set network ' + $scope.networkUUID + ' as sample.';
                                                        }

                                                    });
                                                },

                                            function (error) {
                                                if (error && error.hasOwnProperty('data') &&
                                                    error.data.hasOwnProperty('message')) {

                                                    $scope.errors = 'Unable to set network ' + $scope.networkUUID +
                                                        ' as sample: ' + error.data.message;

                                                } else {

                                                    $scope.errors = 'Unable to set network ' + $scope.networkUUID + ' as sample.';
                                                }
                                            });
                                    })
                                .error(
                                    function (error) {

                                        if (error && error.hasOwnProperty('data') &&
                                            error.data.hasOwnProperty('message')) {

                                            $scope.errors = 'Unable to set network ' + $scope.networkUUID +
                                                ' as sample: ' + error.data.message;

                                        } else {

                                            $scope.errors = 'Unable to set network ' + $scope.networkUUID + ' as sample.';
                                        }
                                    }
                                );
                        };
                    }
                });
            };

            networkController.removeFromMyNetworks = function() {
                if (!$scope.enableRemoveFromMyAccount) {
                    return;
                }

                var title = 'Remove Shared Network';
                var message = 'Another NDEx user has shared this network with you and removing it from your ' +
                    'account might prevent you from accessing it in the future.<br><br>' +
                    'Are you sure you want to remove this shared network?';

                var dismissModal = true;

                ndexNavigation.openConfirmationModal(title, message, 'Remove', 'Cancel', dismissModal,
                    function () {

                        var currentLoggedInUserId = sharedProperties.getCurrentUserId();
                        var currentNetworkId      =  networkController.currentNetworkId;

                        ndexService.deleteNetworkPermissionV2(currentNetworkId, 'user', currentLoggedInUserId,
                            function() {

                                sharedProperties.setCurrentNetworkId(null);
                                $location.path('/myAccount');

                            },
                            function(error) {

                                title   = 'Unable to Delete Network Access';
                                message = 'Unable to remove access to network for user <strong>';

                                message = message + sharedProperties.getLoggedInUserFirstAndLastNames() + '</strong>.<br><br>';
                                message = message + error.message;

                                ndexNavigation.genericInfoModal(title, message);
                            });
                    },
                    function () {
                        // user canceled - do nothing
                    });
            };


            var setEnableSetSampleViaUUID = function() {
                $scope.enableSetSampleViaUUID = true;

                if (!networkController.isLoggedInUser) {
                    $scope.setNetworkSampleViaUUIDTitle = 'You need to be logged in to set network sample';
                    $scope.enableSetSampleViaUUID = false;

                } else if (!networkController.isNetworkOwner) {
                    $scope.setNetworkSampleViaUUIDTitle = 'Cannot set sample for networks you do not own';
                    $scope.enableSetSampleViaUUID = false;

                } else if (networkController.currentNetwork.edgeCount < $scope.noOfEdgesToShowSetSampleButton) {
                    $scope.setNetworkSampleViaUUIDTitle =
                        'Cannot set sample for networks with less than ' + $scope.noOfEdgesToShowSetSampleButton + ' edges';
                    $scope.enableSetSampleViaUUID = false;

                } else if ((networkController.currentNetwork.edgeCount <= 12000) &&
                    networkController.currentNetwork.hasLayout) {
                    $scope.setNetworkSampleViaUUIDTitle = 'This feature is not yet implememted';
                    $scope.enableSetSampleViaUUID = false;
                }
            };

            var setRemoveFromMyAccountTitle = function() {
                $scope.enableRemoveFromMyAccount = true;

                if (!networkController.isLoggedInUser) {
                    $scope.removeFromMyAccountTitle = 'You need to be logged in to remove from My Networks table networks shared with you';
                    $scope.enableRemoveFromMyAccount = false;

                } else if (networkController.isNetworkOwner) {
                    $scope.removeFromMyAccountTitle = 'You can only remove networks that other NDEx users have shared with you';
                    $scope.enableRemoveFromMyAccount = false;

                } else if (networkController.privilegeLevel === 'None') {
                    $scope.removeFromMyAccountTitle = 'You can only remove networks that other NDEx users have shared with you';
                    $scope.enableRemoveFromMyAccount = false;

                }
            };

            var setDeleteTitle = function() {
                if (!networkController.isNetworkOwner) {
                    $scope.deleteTitle = 'Unable to Delete this network: you do not own it ';
                } else if (uiMisc.isNetworkCertified(networkController.currentNetwork)) {
                    $scope.deleteTitle = 'This network is certified and cannot be deleted';
                } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                    $scope.deleteTitle = 'This network has a DOI pending and cannot be deleted ';
                } else if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                    $scope.deleteTitle = 'This network has been assigned a DOI and cannot be deleted ';
                }  else if (networkController.readOnlyChecked) {
                    $scope.deleteTitle = 'Unable to Delete this network: it is read-only ';
                }
            };


            var getCytoscapeAndCyRESTVersions = function() {

                cyREST.getCytoscapeVersion(
                    function(data) {

                        // the @namespace data.cytoscapeVersion silences the 'Unresolved variable cytoscapeVersion'
                        // weak warning produced by WebStorm Annotator
                        /** @namespace data.cytoscapeVersion **/
                        if (data && data.cytoscapeVersion) {

                            var minAcceptableCSVersion = 360;

                            var cytoscapeVersionStr = data.cytoscapeVersion;
                            cytoscapeVersionStr = cytoscapeVersionStr.replace(/\./g,'');

                            var currentCytoscapeVersion = parseInt(cytoscapeVersionStr);

                            if (currentCytoscapeVersion < minAcceptableCSVersion) {

                                $scope.openInCytoscapeTitle  =
                                    'You need Cytoscape version 3.6.0 or later to use this feature.\n';
                                $scope.openInCytoscapeTitle +=
                                    'Your version of Cytoscape is ' + data.cytoscapeVersion + '.';
                                $scope.isCytoscapeRunning = false;

                            } else {

                                // get CyNDEX version

                                cyREST.getCyNDEXVersion(
                                    function (data) {

                                        if (data && data.data && data.data.appVersion) {

                                            var minAcceptableCyNDEXVersion = 223;

                                            var cyNDEXVersionStr = data.data.appVersion;
                                            cyNDEXVersionStr = cyNDEXVersionStr.replace(/\./g,'');

                                            var currentCyNDEXVersion = parseInt(cyNDEXVersionStr);

                                            if (currentCyNDEXVersion < minAcceptableCyNDEXVersion) {

                                                $scope.openInCytoscapeTitle =
                                                    'You need CyNDEx-2 version 2.2.3 or later to use this feature.\n';
                                                $scope.openInCytoscapeTitle +=
                                                    'Your version of CyNDEx-2 is ' + data.data.appVersion + '.';
                                                $scope.isCytoscapeRunning = false;

                                            } else {
                                                // everything is fine: both Cytoscape and CyNDEx-2 are recent enough to
                                                // support the Open in Cytoscape feature.  Enable this button.
                                                $scope.openInCytoscapeTitle = openNetworkInCytoscapeToolTip;
                                                $scope.isCytoscapeRunning = true;
                                            }
                                        } else {
                                            $scope.openInCytoscapeTitle =
                                                'You need CyNDEx-2 version 2.2.3 or later to use this feature.\n' +
                                                'Your version of CyNDEx-2 is too old.';
                                            $scope.isCytoscapeRunning = false;
                                        }
                                    },
                                    function () {
                                        $scope.openInCytoscapeTitle = cytoscape360AndCyndex20RequiredToolTip;
                                        $scope.isCytoscapeRunning = false;
                                    }
                                );
                            }
                        } else {
                            $scope.openInCytoscapeTitle = cytoscape360AndCyndex20RequiredToolTip;
                            $scope.isCytoscapeRunning = false;
                        }
                    },
                    function() {
                        $scope.openInCytoscapeTitle = cytoscape360AndCyndex20RequiredToolTip;
                        $scope.isCytoscapeRunning = false;
                    });
            };

            $scope.getCytoscapeButtonClass = function() {
                return $scope.isCytoscapeRunning ? 'cyButton' : 'cyButtonDisabled';
            }


            var setEditPropertiesTitle = function() {
                // !networkController.isAdmin || networkController.hasMultipleSubNetworks()
                if (networkController.hasMultipleSubNetworks()) {
                    $scope.editPropertiesButtonTitle = 'This network is a Cytoscape collection and cannot be edited in NDEx';
                } else if (!networkController.isNetworkOwner) {
                    $scope.editPropertiesButtonTitle = 'Unable to edit this network: you do not have privilege to modify it';
                } else if (uiMisc.isNetworkCertified(networkController.currentNetwork)) {
                    $scope.editPropertiesButtonTitle = 'This network is certified and cannot be modified further';
                } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                    $scope.editPropertiesButtonTitle = 'Unable to edit this network: DOI is pending';
                } else if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                    $scope.editPropertiesButtonTitle = 'This network has been assigned a DOI and cannot be modified further. ';
                    $scope.editPropertiesButtonTitle += 'If you need to update this network please clone it.';
                }  else if (networkController.readOnlyChecked) {
                    $scope.editPropertiesButtonTitle = 'Unable to edit this network: it is read-only';
                } else {
                    $scope.editPropertiesButtonTitle = 'Modify network properties';  // default value - Edit button is enabled
                }
            };

            var setUpgradePermissionTitle = function() {
                // we set Upgrade Permission title only if Upgrade Permission option of More menu is disabled:
                // networkController.isAdmin || networkController.canEdit || networkController.hasMultipleSubNetworks()
                if (networkController.hasMultipleSubNetworks()) {
                    $scope.upgradePermissionTitle =
                        'This network is a Cytoscape collection and cannot be edited in NDEx';
                } else if (uiMisc.isNetworkCertified(networkController.currentNetwork)) {
                    $scope.upgradePermissionTitle = 'Unable to Upgrade Permission for this network: it is certified ';
                } else if (uiMisc.isDOIPending(networkController.currentNetwork)) {
                    $scope.upgradePermissionTitle = 'Unable to Upgrade Permission for this network: DOI is pending ';
                } else if (uiMisc.isDOIAssigned(networkController.currentNetwork)) {
                    $scope.upgradePermissionTitle = 'Unable to Upgrade Permission for this network: it has DOI assigned to it ';
                } else if (networkController.isNetworkOwner) {
                    $scope.upgradePermissionTitle = 'Unable to Upgrade Permission for this network: you already own it ';
                } else if (networkController.privilegeLevel.toLowerCase() === 'edit' ) {
                    $scope.upgradePermissionTitle = 'Unable to Upgrade Permission for this network: you already have Edit privilege ';
                }
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

                                if (myMembership === 'ADMIN') {
                                    networkController.isAdmin = true;
                                    networkController.privilegeLevel = 'Admin';
                                }
                                if (myMembership === 'WRITE') {
                                    networkController.canEdit = true;
                                    networkController.privilegeLevel = 'Edit';
                                }
                                if (myMembership === 'READ') {
                                    networkController.canRead = true;
                                    networkController.privilegeLevel = 'Read';
                                }

                                $scope.showSetSampleButton = (networkController.isAdmin);
                                    //(networkController.currentNetwork.edgeCount > $scope.noOfEdgesToShowSetSampleButton));


                                setEnableSetSampleViaUUID();
                                setRemoveFromMyAccountTitle();
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

            $scope.isRequestingDOIEnabled = function() {
                var enabled =
                 networkController.isNetworkOwner && !networkController.hasMultipleSubNetworks() &&
                    !$scope.isNetworkCertified() && !$scope.isDOIAssigned() && !$scope.isDOIPending();

                return enabled;
            };

            $scope.isUpgradingPermissionsEnabled = function() {
                var enabled =
                    !networkController.isAdmin && !networkController.canEdit &&
                    !networkController.hasMultipleSubNetworks() &&
                    !$scope.isNetworkCertified() && !$scope.isDOIAssigned() && !$scope.isDOIPending();

                return enabled;
            };

            $scope.isDeleteNetworkEnabled = function() {
                var enabled =
                    networkController.isAdmin && !networkController.readOnlyChecked;

                return enabled;
            };

            var initialize = function () {

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
                            }

                            if (!network.name) {
                                networkController.currentNetwork.name = 'Untitled';
                            }

                            // subNetworkId is the current subNetwork we are displaying
                            // If the network is a Cytoscape collection, we only handle the case that the collection has
                            // only one subnetwork.
                            networkController.subNetworkId = uiMisc.getSubNetworkId(network);

                            networkController.noOfSubNetworks = uiMisc.getNoOfSubNetworks(network);

                            if (networkController.noOfSubNetworks >= 1) {
                                $scope.disabledQueryTooltip =
                                    'This network is part of a Cytoscape collection and cannot be operated on or edited in NDEx';
                            }

                            if (networkController.subNetworkId !== null) {
                                networkController.currentNetwork.description = getNetworkPropertyFromSummary(networkController.subNetworkId, 'description');
                                networkController.currentNetwork.version = getNetworkPropertyFromSummary(networkController.subNetworkId, 'version');
                            }

                            if (networkController.isLoggedInUser && (network.ownerUUID === sharedProperties.getCurrentUserId())) {
                                networkController.isNetworkOwner = true;
                            }

                            // decide whether to enable the Open In Cytoscape button
                            if (networkController.visibility === 'public' || networkController.accesskey) {

                                // Network is Public or (private and accessed through Share URL); enable the button
                                // in case we have the right versions of Cytoscape and CyREST.

                                if (networkController.visibility === 'private' && networkController.accesskey) {
                                    networkController.networkShareURL =
                                        uiMisc.buildNetworkURL(networkController.accesskey, networkExternalId);
                                }

                                getCytoscapeAndCyRESTVersions();
                                if (!checkCytoscapeStatusTimer) {
                                    checkCytoscapeStatusTimer = setInterval(getCytoscapeAndCyRESTVersions,
                                        checkCytoscapeStatusInSeconds * 1000);
                                }

                            } else if (networkController.isNetworkOwner) {

                                // Network is private, access key is not set, we are the owner - check the status of
                                // shareable URL.  If shareable URL is on, then check if Cytoscape is running and
                                // its and CyNDEX's versions

                                // TODO - vrynkov, 22 May 2018:
                                // TODO - we probably do not need to check the status of share URL since now
                                // TODO owners of private networks can open them in Cytoscape.
                                // TODO In the past owners could only open in Cytoscape private shared networks. Confirm with Jing.
                                networkController.getStatusOfShareableURL(
                                    function() {
                                        getCytoscapeAndCyRESTVersions();
                                        if (!checkCytoscapeStatusTimer) {
                                            checkCytoscapeStatusTimer = setInterval(getCytoscapeAndCyRESTVersions,
                                                checkCytoscapeStatusInSeconds * 1000);
                                        }
                                    });

                            } else {
                                // Network is private, access key is not set, we are not the owner.
                                // This network is shared with us. It can be opened in Cytoscape.
                                getCytoscapeAndCyRESTVersions();
                                if (!checkCytoscapeStatusTimer) {
                                    checkCytoscapeStatusTimer = setInterval(getCytoscapeAndCyRESTVersions,
                                        checkCytoscapeStatusInSeconds * 1000);
                                }
                            }

                            getMembership(function ()
                            {
                                if (networkController.visibility === 'public' ||
                                    networkController.isAdmin ||
                                    networkController.canEdit ||
                                    networkController.canRead || accesskey)
                                {
                                    getNetworkAndDisplay(networkExternalId, drawCXNetworkOnCanvas);
                                }
                            });

                            networkController.readOnlyChecked = networkController.currentNetwork.isReadOnly;
                            //getNetworkAdmins();

                            const sourceFormat =
                                getNetworkPropertyFromSummary(networkController.subNetworkId, 'ndex:sourceFormat');
                            networkController.currentNetwork.sourceFormat = (undefined === sourceFormat) ?
                                'Unknown' : sourceFormat;

                            networkController.currentNetwork.reference = getNetworkPropertyFromSummary(networkController.subNetworkId, 'Reference');
                            networkController.currentNetwork.rightsHolder = getNetworkPropertyFromSummary(networkController.subNetworkId, 'rightsHolder');
                            networkController.currentNetwork.rights = getNetworkPropertyFromSummary(networkController.subNetworkId, 'rights');

                            if ((undefined !== networkController.currentNetwork.rights) && networkController.currentNetwork.rights.indexOf('|') > -1){
                                var rightsTemp = networkController.currentNetwork.rights;

                                var rightsArray = rightsTemp.split('|');
                                if(rightsArray.length > 1){
                                    networkController.currentNetwork.rights = "<a href='" + rightsArray[0] + "'>" + rightsArray[1] + "</a>";

                                }
                            }

/*
                            networkController.currentNetwork.userSetSample = getNetworkPropertyFromSummary(networkController.subNetworkId, 'userSetSample');

                            if (typeof networkController.currentNetwork.userSetSample === 'undefined') {
                                networkController.currentNetwork.userSetSample = false;
                            }
                            currentNetworkSummary.userSetSample = networkController.currentNetwork.userSetSample;
*/
                            networkController.otherProperties =
                                _.sortBy(
                                    networkService.getPropertiesExcluding(currentNetworkSummary, networkController.subNetworkId, [
                                        'rights', 'rightsHolder', 'Reference', 'ndex:sourceFormat', 'name', 'description', 'version', '@context']), 'predicateString');

                            //TODO: need to move this to 'add to my set' modal.
                            networkController.getAllNetworkSetsOwnedByUser(
                                function() {

                                },
                                function() {

                                });

                            if (networkController.hasMultipleSubNetworks()) {
                                setTitlesForCytoscapeCollection();
                            } else {
                                setDOITitle();
                                setShareTitle();
                            }
                            setEditPropertiesTitle();
                            //setRemoveFromMyAccountTitle();
                            setDeleteTitle();
                        }
                    )
                    .error(
                        function (error) {
                            displayErrorMessage(error);
                        }
                    );
            };


            var initializeAsViewer = function (cxURL) {

                networkService.getNiceCXNetworkFromURL(cxURL,
                    function (niceCX) {
                        networkController.currentNetwork = cxNetworkUtils.getPartialSummaryFromNiceCX(niceCX);
                        currentNetworkSummary = networkController.currentNetwork;

                        networkController.visibility = undefined;
                        networkController.isAdmin = false;

                        // subNetworkId is the current subNetwork we are displaying
                        // If the network is a Cytoscape collection, we only handle the case that the collection has
                        // only one subnetwork.
                        networkController.subNetworkId = undefined; //uiMisc.getSubNetworkId(network);

                        networkController.noOfSubNetworks = undefined; //uiMisc.getNoOfSubNetworks(network);

                        $scope.disabledQueryTooltip =
                            'This network is not in NDEx yet. Saving it to NDEx will enable more operations on it.';



                        /*   if (networkController.subNetworkId != null) {
                               networkController.currentNetwork.description = networkService.getNetworkProperty(networkController.subNetworkId, "description");
                               networkController.currentNetwork.version = networkService.getNetworkProperty(networkController.subNetworkId, "version");
                           } */


                        //enable the Open In Cytoscape button
                        //getCytoscapeAndCyRESTVersions();


                        drawCXNetworkOnCanvas(niceCX, false);

                        networkController.readOnlyChecked = networkController.currentNetwork.isReadOnly;

                        const sourceFormat =
                            networkService.getNetworkProperty(networkController.subNetworkId, 'ndex:sourceFormat');
                        networkController.currentNetwork.sourceFormat = (undefined === sourceFormat) ?
                            'Unknown' : sourceFormat;

                        networkController.currentNetwork.reference = networkService.getNetworkProperty(networkController.subNetworkId, 'Reference');
                        networkController.currentNetwork.rightsHolder = networkService.getNetworkProperty(networkController.subNetworkId, 'rightsHolder');
                        networkController.currentNetwork.rights = networkService.getNetworkProperty(networkController.subNetworkId, 'rights');
                        /*
                        networkController.currentNetwork.userSetSample = getNetworkPropertyFromSummary(networkController.subNetworkId, 'userSetSample');
                        if (typeof networkController.currentNetwork.userSetSample === 'undefined') {
                            networkController.currentNetwork.userSetSample = false;
                        }
                        currentNetworkSummary.userSetSample = networkController.currentNetwork.userSetSample;
                        */
                        networkController.otherProperties =
                            _.sortBy(
                                networkService.getPropertiesExcluding(currentNetworkSummary, networkController.subNetworkId, [
                                    'rights', 'rightsHolder', 'Reference', 'ndex:sourceFormat', 'name', 'description', 'version']), 'predicateString');



                        /*   networkController.getAllNetworkSetsOwnedByUser(
                               function (newNetworkSet) {
                                   ;
                               },
                               function (data, status) {
                                   ;
                               }); */

                        $scope.disableQuery = true;

                        if (networkController.hasMultipleSubNetworks()) {
                            setTitlesForCytoscapeCollection();
                        } else {
                            setDOITitle();
                            setShareTitle();
                        }

                        setEditPropertiesTitle();
                        //setRemoveFromMyAccountTitle();
                        setDeleteTitle();
                    },
                    function (error) {
                        displayErrorMessage(error);
                    }
                );
            };

            $scope.readOnlyChanged = function()
            {
                ndexService.setNetworkSystemPropertiesV2(networkController.currentNetworkId,
                    'readOnly', networkController.readOnlyChecked,
                    function() {
                        setDOITitle();
                        setDeleteTitle();
                        setEditPropertiesTitle();
                    },
                    function() {
                        console.log('unable to make network Read-Only');
                    });
            };
/*
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
*/
            /*
             * var INCOMPLETE_QUERY_CODE = -1;
             * var EMPTY_QUERY_CODE = 0;
             * var VALID_QUERY_CODE = 1;
             */
/*
            networkController.advancedEdgeQueryIsValid = function () {
                return (VALID_QUERY_CODE === networkController.validateAdvancedEdgeQuery());
            };

            networkController.advancedNodeQueryIsValid = function () {
                return (VALID_QUERY_CODE === networkController.validateAdvancedNodeQuery());
            };
*/

            networkController.isStringEmpty = function(s) {
                if (typeof(s) === 'undefined' || s === null) {
                    return true;
                }
                return ((s.trim()).length === 0);
            };
/*
            networkController.validateAdvancedQuery = function () {
                var advancedEdgeQueryState = networkController.validateAdvancedEdgeQuery();
                var advancedNodeQueryState = networkController.validateAdvancedNodeQuery();

                if ((INCOMPLETE_QUERY_CODE === advancedEdgeQueryState) ||
                    (INCOMPLETE_QUERY_CODE === advancedNodeQueryState)) {
                    networkController.advancedQueryIsValid = false;
                    return;
                }
                if ((EMPTY_QUERY_CODE === advancedEdgeQueryState) &&
                    (EMPTY_QUERY_CODE === advancedNodeQueryState)) {
                    networkController.advancedQueryIsValid = false;
                    return;
                }

                if (((VALID_QUERY_CODE === advancedEdgeQueryState) &&
                    (EMPTY_QUERY_CODE === advancedNodeQueryState) &&
                    (networkController.advancedQueryNodeProperties.length === 1)) ||
                    ((EMPTY_QUERY_CODE === advancedEdgeQueryState) &&
                    (VALID_QUERY_CODE === advancedNodeQueryState) &&
                    (networkController.advancedQueryEdgeProperties.length === 1))) {
                    networkController.advancedQueryIsValid = true;
                    return;
                }

                if ((VALID_QUERY_CODE === advancedEdgeQueryState) &&
                    (VALID_QUERY_CODE === advancedNodeQueryState)) {
                    networkController.advancedQueryIsValid = true;
                    return;
                }

                networkController.advancedQueryIsValid = false;
            };
/*
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
            };

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
            };

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
                networkController.successfullyQueried = false;

                networkService.restoreCurrentNiceCXAfterQuery();
                localNetwork = networkService.getOriginalNiceCX();

                if ('Graphic' === $scope.currentView) {
                    // no need to call ndexSpinner.stopSpinner() here since it
                    //will be called in drawCXNetworkOnCanvas->initCyGraphFromCyjsComponents()
                    drawCXNetworkOnCanvas(localNetwork, false);

                } else {

                    var enableFiltering = true;
                    var setGridWidth = false;

                    populateNodeTable(localNetwork, enableFiltering, setGridWidth);
                    populateEdgeTable(localNetwork, enableFiltering, setGridWidth);
                    ndexSpinner.stopSpinner();
                }
            };
*/

            networkController.getAllNetworkSetsOwnedByUser = function (successHandler, errorHandler) {
                if (!networkController.isLoggedInUser) {
                    networkController.networkSets = [];
                    return;
                }

                var userId = sharedProperties.getCurrentUserId(); //ndexUtility.getLoggedInUserExternalId();

                // negative offset and limit means "do not use these values in ndexService.getAllNetworkSetsOwnedByUserV2"
                var offset = -1;
                var limit  = -1;

                ndexService.getAllNetworkSetsOwnedByUserV2(userId, offset, limit,
                    function (networkSets) {
                        networkController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);
                        successHandler(networkController.networkSets[0]);
                    },
                    function (error, status) {
                        networkController.networkSets = [];
                        console.log('unable to get network sets');
                        errorHandler(error, status);
                    });
            };

            networkController.cloneNetwork = function() {

                var title = 'Clone This Network';

                var networkName  = 'The network <strong>' + networkController.currentNetwork.name + '</strong> ';

                var message = networkName +
                    'will be cloned to your account. <br><br> Are you sure you want to proceed?';

                var dismissModal = false;

                ndexNavigation.openConfirmationModal(title, message, 'Confirm', 'Cancel', dismissModal,
                    function ($modalInstance) {

                        $modalInstance.disableConfirmButton();
                        $modalInstance.disableCancelButton();

                        $modalInstance.setProgress('Cloning network in progress ...');

                        var confirmationSpinnerId = 'confirmationSpinnerId';
                        ndexSpinner.startSpinner(confirmationSpinnerId);

                        ndexService.cloneNetworkV2(networkController.currentNetworkId,
                            function() {
                                ndexSpinner.stopSpinner();
                                $modalInstance.dismiss();
                            },
                            function(error) {
                                ndexSpinner.stopSpinner();
                                title = 'Unable to Clone Network';
                                message  = networkName + ' wasn\'t cloned to your account.';

                                if (error.message) {
                                    message = message + '<br>' + error.message;
                                }
                                $modalInstance.clearProgressMessage();
                                $modalInstance.setError(message);
                                $modalInstance.enableCancelButton();
                            });
                    },
                    function ($modalInstance) {
                        // User selected Cancel; return
                        $modalInstance.dismiss();
                    });
            };

            networkController.setSampleFromQuery = function() {

                if (!$scope.showSetSampleButtonEnabled) {
                    return;
                }

                var title        = 'Set Sample For This Network';
                var message      = 'Set this query as sample for this network?';
                var dismissModal = false;

                ndexNavigation.openConfirmationModal(title, message, 'Set Sample', 'Cancel', dismissModal,
                    function ($modalInstance) {

                        $modalInstance.disableConfirmButton();
                        $modalInstance.disableCancelButton();

                        $modalInstance.setProgress('Setting sample network in progress ...');

                        var confirmationSpinnerId = 'confirmationSpinnerId';
                        ndexSpinner.startSpinner(confirmationSpinnerId);
                        var queryResultInCX = networkService.getQueryResultInCX();

                        ndexService.setNetworkSampleV2(networkController.currentNetworkId, queryResultInCX,
                            function() {
                                //setUserSetSampleProperty();
                                networkService.setQueryResultAsOriginalNiceCX();

                                networkController.previousNetwork.hasSample     = true;
                                networkController.isSamplePrevious              = true;
                                networkController.sampleSizePrevious = networkController.currentNetwork.edgeCount;

                                $scope.showSetSampleButton = false;

                                ndexSpinner.stopSpinner();
                                $modalInstance.dismiss();

                            },
                            function(error) {
                                //$location.path();
                                ndexSpinner.stopSpinner();
                                title = 'Unable to Set Sample';
                                message  = 'The query result wasn\'t set as sample for this network.';

                                if (error.message) {
                                    message = message + '<br>' + error.message;
                                }

                                $modalInstance.clearProgressMessage();
                                $modalInstance.setError(message);
                                $modalInstance.enableCancelButton();
                            });
                    },
                    function ($modalInstance) {
                        // User selected Cancel; return
                        $modalInstance.dismiss();
                    });

                //factory.setNetworkSampleV2 = function (networkId, sampleInCX, successHandler, errorHandler) {
            };

            networkController.deletePendingDOIRequest = function() {

                var title = 'Delete DOI Request';

                var message =
                    'This will delete your DOI request, ' +
                    'please verify that your network\'s visibility is correct. <br>' +
                    ' If you still want a DOI for your network, please submit a new request. <br><br>' +
                    'Would you like to delete this request?';

                var dismissModal = false;

                ndexNavigation.openConfirmationModal(title, message, 'Confirm', 'Cancel', dismissModal,
                    function ($modalInstance) {

                        $modalInstance.disableConfirmButton();
                        $modalInstance.disableCancelButton();

                        $modalInstance.setProgress('Deleting DOI request in progress ...');

                        var confirmationSpinnerId = 'confirmationSpinnerId';
                        ndexSpinner.startSpinner(confirmationSpinnerId);


                        ndexService.cancelDoi(networkController.currentNetworkId,
                            function() {
                                delete networkController.currentNetwork.doi;
                                delete networkController.currentNetwork.isCertified;
                                networkController.currentNetwork.isReadOnly = false;
                                networkController.readOnlyChecked = networkController.currentNetwork.isReadOnly;
                                setEditPropertiesTitle();
                                ndexSpinner.stopSpinner();
                                $modalInstance.dismiss();
                            },
                            function(error) {
                                ndexSpinner.stopSpinner();
                                title = 'Unable to delete DOI';
                                message  = 'DOI was not deleted for network ' + networkController.currentNetwork.name + '.';

                                if (error.message) {
                                    message = message + '<br><br>' + error.message;
                                }

                                $modalInstance.clearProgressMessage();
                                $modalInstance.setError(message);
                                $modalInstance.enableCancelButton();
                            });
                    },
                    function ($modalInstance) {
                        // User selected Cancel; return
                        $modalInstance.dismiss();
                    });
            };



            /*
            var resizeCanvas = function() {
                cy.destroy();
                localNetwork = networkService.getCurrentNiceCX();

                setTimeout(
                    function () {
                        drawCXNetworkOnCanvas(localNetwork, false);
                    }, 200);
            }

            /*
            $scope.openInFullScreenMode = function(mode) {
                // the code below is taken from
                // https://hacks.mozilla.org/2012/01/using-the-fullscreen-api-in-web-browsers/

                var docElm;

                // console.log('cy.width() = ' + cy.width()  + '  cy.height() = ' + cy.height());

                if (mode) {
                    if ('canvas' === mode) {
                        docElm = document.getElementById("cytoscape-canvas");
                    } else if ('page' === mode) {
                        docElm = document.documentElement;
                    }
                }

                if (docElm.requestFullscreen) {
                    docElm.requestFullscreen();
                }
                else if (docElm.mozRequestFullScreen) {
                    docElm.mozRequestFullScreen();
                }
                else if (docElm.webkitRequestFullScreen) {
                    docElm.webkitRequestFullScreen();
                }
                else if (docElm.msRequestFullscreen) {
                    docElm.msRequestFullscreen();
                }
            };

            var setListenerForFullScreenChange = function() {
                var docElm = document.documentElement;


                if (docElm.requestFullscreen) {
                    document.addEventListener("fullscreenchange", function () {
                        resizeCanvas();
                    }, false);
                }
                else if (docElm.mozRequestFullScreen) {
                    document.addEventListener("mozfullscreenchange", function () {
                        resizeCanvas();
                    }, false);
                }
                else if (docElm.webkitRequestFullScreen) {
                    document.addEventListener("webkitfullscreenchange", function () {
                        resizeCanvas();
                    }, false);
                }
                else if (docElm.msRequestFullscreen) {
                    document.addEventListener("msfullscreenchange", function () {
                        resizeCanvas();
                    }, false);
                };
            };

            if ($scope.fullScreen) {
                setListenerForFullScreenChange();
            };
            */

            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------


            /*
            var windowHeight = $(window).height();
            var $cytoscapeCanvas = $('#cytoscape-canvas');
            $cytoscapeCanvas.height(windowHeight - 160);

            $('#divNetworkTabs').height(windowHeight);

            if ($scope.currentView === 'Graphic') {
                //$("#queryWarningsOrErrorsId").width($("#cytoscape-canvas").width());
                $('#queryWarningsOrErrorsId').width($cytoscapeCanvas.width());
            } else {

                if ($scope.activeTab === 'Edges') {
                    var $edgeGridId = $('#edgeGridId');
                    $edgeGridId.height(windowHeight - 235);
                    $('#queryWarningsOrErrorsId').width($edgeGridId.width());
                } else {
                    var $nodeGridId = $('#nodeGridId');
                    $nodeGridId.height(windowHeight - 235);
                    $('#queryWarningsOrErrorsId').width($nodeGridId.width());
                }
            }
            */


            $(window).resize(function() {

                var $cytoscapeCanvas = $('#cytoscape-canvas');

                $cytoscapeCanvas.height($(window).height() - 160);
                $('#divNetworkTabs').height($(window).height() - 160);

                if ($scope.currentView === 'Graphic') {
                    $('#queryWarningsOrErrorsId').width($cytoscapeCanvas.width());
                } else {

                    if ($scope.activeTab === 'Edges') {
                        var $edgeGridId = $('#edgeGridId');
                        $('#queryWarningsOrErrorsId').width($edgeGridId.width());
                        $edgeGridId.height($(window).height() - 195);
                        $scope.edgeGridApi.grid.gridHeight = $edgeGridId.height();
                        $scope.edgeGridApi.core.refresh();

                    } else {
                        var $nodeGridId = $('#nodeGridId');
                        $('#queryWarningsOrErrorsId').width($nodeGridId.width());
                        $nodeGridId.height($(window).height() - 195);
                        $scope.nodeGridApi.grid.gridHeight = $nodeGridId.height();
                        $scope.nodeGridApi.core.refresh();
                    }
                }
            });


            $(window).trigger('resize');

            ndexSpinner.startSpinner(spinnerId);

            if ($routeParams.identifier !== undefined) {
                initialize();
            }
            else if ($routeParams.url !== undefined) {
                var cxURL = $routeParams.url;
                delete $routeParams.url;
                initializeAsViewer(cxURL);
            }
            else {
                // TODO: Handle error
                console.log('Unexpected route.');f
            }
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
