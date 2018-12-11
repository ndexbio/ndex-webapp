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

            var cy;

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

                $scope.setToolTips();
            });


            //noinspection JSCheckFunctionSignatures
            var clipboard  = new Clipboard('#copyNetworkShareURLToClipboardId1');
            //noinspection JSCheckFunctionSignatures
            var clipboard2 = new Clipboard('#copyNetworkShareURLToClipboardId2');
            //noinspection JSCheckFunctionSignatures
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
            $scope.changeTitle = function() {
                setTooltip('Copy network share URL to clipboard');
            };
            $scope.changeTitle2 = function() {
                setTooltip2('Copy network URL to clipboard');
            };
            $scope.changeTitle3 = function() {
                setTooltip3('Copy network DOI to clipboard');
            };
            clipboard.on('success', function() {
                setTooltip('Copied');
            });
            clipboard2.on('success', function() {
                setTooltip2('Copied');
            });
            clipboard3.on('success', function() {
                setTooltip3('Copied');
            });

            $scope.setToolTips = function(){
                var myToolTips = $('[data-toggle="tooltip"]');
                myToolTips.tooltip();
            };

            $scope.enableSetSampleViaUUID    = false;
            $scope.enableRemoveFromMyAccount = false;

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
            $scope.hideNetworkOwner = function() {

                var isVisibility = ((typeof networkController.currentNetwork !== 'undefined') &&
                                    (typeof networkController.currentNetwork.visibility !== 'undefined') &&
                                    (networkController.currentNetwork.visibility === 'PRIVATE'));

                var isAccessKey = (typeof accesskey !== 'undefined');

                return (isVisibility && isAccessKey);
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

            $scope.changeSetSampleViaUUIDTitle  = function() {
                $('#setSampleViaUUID').tooltip('hide')
                    .attr('data-original-title', $scope.setNetworkSampleViaUUIDTitle)
                    .tooltip('show');
            };

            $scope.changeRemoveFromMyNetworksTitle  = function() {
                $('#removeFromMyAccountTitleId').tooltip('hide')
                    .attr('data-original-title', $scope.removeFromMyAccountTitle)
                    .tooltip('show');
            };

            $scope.changeDeleteNetworkTitle  = function() {
                $('#deleteNetworkTitleId').tooltip('hide')
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
            $scope.shareTitle                = '';
            $scope.deleteTitle               = '';
            $scope.setNetworkSampleViaUUIDTitle     = '';
            $scope.removeFromMyAccountTitle  = '';

            $scope.disabledQueryTooltip      = 'The Advanced Query feature is being improved and will be back soon!';

            $scope.disableQuery = false;

            $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

            var spinnerId = 'spinnerId';

            $scope.showAdvancedQuery = true;

            $scope.showDeleteDOILink = false;


            //networkController.prettyStyle = "no style yet";
            //networkController.prettyVisualProperties = "nothing yet";
            var resetBackgroundColor = function () {
                networkController.bgColor = '#8fbdd7';
            };

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
                    return null;
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
                if (nodeAttributesObj && nodeAttributesObj.v) {
                    numOfNodeAttributes = nodeAttributesObj.v.length;
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

            var parseNdexMarkupValue = function ( value ) {
                return {n:  value.replace(/(\[(.*)\])?\(.*\)$/, '$2'),
                    id: value.replace(/(\[.*\])?\((.*)\)$/, '$2')};
            };

            $scope.getInternalNetworkUUID = function(nodeAttributeInternalLink)
            {
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
                    'name': 'Direct',
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

            var initCyGraphFromCyjsComponents = function (cyElements, cyLayout, cyStyle, canvasName, attributeNameMap) {

                //console.log(cyElements);

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
                        var defaultStyle = [{
                            'selector': 'node',
                            'style': {
                                'background-color': '#f6eecb',
                                'background-opacity': 0.8,
                                'width': '40px',
                                'height': '40px',
                                'label': 'data(name)',
                                'font-family': 'Roboto, sans-serif'
                            }
                        }, {
                            'selector': 'edge',
                            'style': {
                                'line-color': '#75736c',
                                'width': '2px',
                                'font-family': 'Roboto, sans-serif',
                                'text-opacity': 0.8
                            }
                        }, {
                            'selector': 'node:selected',
                            'style': {'color': '#fb1605', 'background-color': 'yellow'}
                        }, {
                            'selector': 'edge:selected',
                            'style': {
                                'label': 'data(interaction)',
                                'color': '#fb1605',
                                'line-color': 'yellow',
                                'width': 6
                            }
                        }];
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

                var cyElements = cyService.cyElementsFromNiceCX(cxNetwork, attributeNameMap);

                var cyStyle ;
                if (noStyle) {
                    cyStyle =  cyService.getDefaultStyle();
                    resetBackgroundColor();
                } else {
                    cyStyle = cyService.cyStyleFromNiceCX(cxNetwork, attributeNameMap);
                    var cxBGColor = cyService.cyBackgroundColorFromNiceCX(cxNetwork);
                    if (cxBGColor) {
                        networkController.bgColor = cxBGColor;
                    }
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

                /** @namespace cxNetwork.cartesianLayout **/
                var layoutName = (cxNetwork.cartesianLayout) ? 'preset' :
                    (Object.keys(cxNetwork.edges).length <= 1000 ? 'cose' : 'circle') ;

                var cyLayout = {name: layoutName, animate: false, numIter: 50, coolingFactor: 0.9};

                initCyGraphFromCyjsComponents(cyElements, cyLayout, cyStyle, 'cytoscape-canvas', attributeNameMap);
            };

            function checkIfCanvasIsVisibleAndDrawNetwork() {
                if($('#cytoscape-canvas').is(':visible')) {
                    drawCXNetworkOnCanvas(localNetwork, false);
                } else {
                    setTimeout(checkIfCanvasIsVisibleAndDrawNetwork, 50);
                }
            }

            var refreshNodeTable = function(network)
            {
                var nodes = network.nodes;
                var nodeKeys = Object.keys(nodes);

                $scope.nodeGridOptions.data = [];

                // the @namespace network.nodeAttributes silences the 'Unresolved variable nodeAttributes'
                // weak warning produced by WebStorm Annotator
                /** @namespace network.nodeAttributes **/
                var nodeAttributes = network.nodeAttributes;

                for (var key in nodeKeys)
                {
                    var nodeId = nodeKeys[key];

                    var nodeObj = networkService.getNodeInfo(nodeId);
                    var nodeName = networkService.getNodeName(nodeObj);

                    var row = {'Name': nodeName};

                    if (nodeAttributes) {

                        var nodeAttrs = nodeAttributes[nodeId];

                        for (var key1 in nodeAttrs) {

                            // we need to add the nodeAttrs.hasOwnProperty(key1) check to
                            // silence the JSHint warning
                            // Warning: Possible iteration over unexpected (custom / inherited) members, probably missing hasOwnProperty check
                            if (nodeAttrs.hasOwnProperty(key1)) {
                                var attributeObj = nodeAttrs[key1];
                                var attributeObjName = attributeObj.n;

                                if (attributeObjName && attributeObjName.startsWith('__')) {
                                    continue;
                                }

                                if (attributeObjName && ((attributeObjName === 'alias') || (attributeObjName === 'relatedTo'))) {
                                    row[key1] = attributeObj;
                                } else {
                                    row[key1] = (attributeObj.v) ? attributeObj.v : '';
                                }
                            }
                        }
                    }

                    $scope.nodeGridOptions.data.push( row );
                }
            };

            var calcColumnWidth = function(header, isLastColumn)
            {
                var result = header.length * 10;
                result = result < 100 ? 100 : result;
                if (isLastColumn) {
                    result += 40;
                }
                return result > 250 ? 250 : result;
            };

            var populateNodeTable = function(network, enableFiltering, setGridWidth)
            {
                var nodes = network.nodes;
                var nodeCitations = network.nodeCitations;
                var numOfNodeKeys = 0;

                if (!nodes) {
                    return;
                }

                var longestName = 'Name';
                for (var key in nodes) {
                    // we need to add the nodes.hasOwnProperty(key) check to
                    // silence the JSHint warning
                    // Warning: Possible iteration over unexpected (custom / inherited) members, probably missing hasOwnProperty check
                    if (nodes.hasOwnProperty(key)) {
                        if (nodes[key].n) {
                            longestName = (nodes[key].n.length > longestName.length) ? nodes[key].n : longestName;
                        }
                        numOfNodeKeys = numOfNodeKeys + 1;
                    }
                }

                // enable filtering if number of edges in the network is no greater than 500;
                // we still check number of edges even though we populate node headers in this routine
                var filteringEnabled = (numOfNodeKeys <= 500);

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
                            cellTemplate: '<div class="text-center"><h6>' +
                            '<a ng-click="grid.appScope.showNodeCitations(COL_FIELD)" ng-show="grid.appScope.getNumNodeCitations(COL_FIELD) > 0">' +
                            '{{grid.appScope.getNumNodeCitations(COL_FIELD)}}' +
                            '</h6></div>'
                        };
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
                        }
                        if (nodeAttributePropertiesKeys.indexOf(ndexExternalLink) > -1) {
                            _.pull(nodeAttributePropertiesKeys, ndexExternalLink);
                        }

                        if (links.length > 0) {
                            nodeAttributePropertiesKeys = nodeAttributePropertiesKeys.concat(links);
                        }

                        for (var j=0; j<nodeAttributePropertiesKeys.length; j++) {
                            var nodeAttributteProperty = nodeAttributePropertiesKeys[j];

                            var columnDef;

                            if ((nodeAttributteProperty === 'alias') || (nodeAttributteProperty === 'relatedTo')) {
                                columnDef = {
                                    field: nodeAttributteProperty,
                                    displayName: nodeAttributteProperty,
                                    cellTooltip: true,
                                    minWidth: calcColumnWidth(nodeAttributteProperty, false),
                                    enableFiltering: filteringEnabled,
                                    //cellTemplate: "<div class='ui-grid-cell-contents hideLongLine' ng-bind-html='grid.appScope.linkify(COL_FIELD)'></div>"

                                    cellTemplate: '<div class="text-center"><h6>' +
                                    '<a ng-click="grid.appScope.showNodeAttributes(COL_FIELD)" ng-show="grid.appScope.getNumNodeAttributes(COL_FIELD) > 0">' +
                                    '{{grid.appScope.getNumNodeAttributes(COL_FIELD)}}' +
                                    '</a></h6></div>'
                                };

                            } else if (nodeAttributteProperty === ndexInternalLink) {

                                var sampleUUIDToCalcFieldWidth = 'cfab341c-362d-11e5-8ac5-06603eb7f303';

                                columnDef = {
                                    field: nodeAttributteProperty,
                                    displayName: 'View Network',
                                    cellTooltip: true,
                                    minWidth: calcColumnWidth(sampleUUIDToCalcFieldWidth, false),
                                    enableFiltering: filteringEnabled,
                                    cellTemplate: '<a class="ui-grid-cell-contents hideLongLine" ' +
                                    'ng-bind-html="grid.appScope.getInternalNetworkUUID(COL_FIELD)" ' +
                                    'ng-href="{{grid.appScope.getURLForMapNode(COL_FIELD)}}" target="_blank">' +
                                    '</a>'
                                };

                            } else {
                                columnDef = {
                                    field: nodeAttributteProperty,
                                    displayName: nodeAttributteProperty,
                                    cellTooltip: true,
                                    minWidth: calcColumnWidth(nodeAttributteProperty, false),
                                    enableFiltering: filteringEnabled,
                                    sortingAlgorithm: function (a, b) {
                                        if (!isNaN(a) && !isNaN(b)) {
                                            var parsedA = parseFloat(a);
                                            var parsedB = parseFloat(b);

                                            if (parsedA === parsedB) {
                                                return 0;
                                            }
                                            if (parsedA < parsedB) {
                                                return -1;
                                            }
                                            return 1;

                                        } else {
                                            if (a === b) {
                                                return 0;
                                            }
                                            if (a < b) {
                                                return -1;
                                            }
                                            return 1;
                                        }
                                    },
                                    cellTemplate: '<div class="ui-grid-cell-contents hideLongLine" ng-bind-html="grid.appScope.linkify(COL_FIELD)"></div>'
                                };
                            }
                            nodeAttributesHeaders[nodeAttributteProperty] = columnDef;
                        }
                    }
                }

                for (var key1 in nodeAttributesHeaders) {
                    var col = nodeAttributesHeaders[key1];
                    columnDefs.push(col);
                }

                $scope.nodeGridApi.grid.options.columnDefs = columnDefs;

                if (setGridWidth) {
                    var cytoscapeCanvasWidth = $('#cytoscape-canvas').width();
                    if (cytoscapeCanvasWidth > 0) {
                        $scope.nodeGridApi.grid.gridWidth = cytoscapeCanvasWidth;
                    }
                }

                var windowHeight = $(window).height() - 195;
                $('#nodeGridId').height(windowHeight);
                $scope.nodeGridApi.grid.gridHeight = windowHeight;

                refreshNodeTable(network);
            };

            var refreshEdgeTable = function (network) {

                var edges = network.edges;
                var edgeCitations = network.edgeCitations;
                var edgeKeys = Object.keys(edges);

                $scope.edgeGridOptions.data = [];

                // the @namespace network.edgeAttributes silences the 'Unresolved variable edgeAttributes'
                // weak warning produced by WebStorm Annotator
                /** @namespace network.edgeAttributes **/
                var edgeAttributes = network.edgeAttributes;

                for (var i = 0; i < edgeKeys.length; i++)
                {
                    var edgeKey = edgeKeys[i];

                    var edgeObj = networkService.getEdgeInfo(edgeKey);

                    var sourceNodeObj = networkService.getNodeInfo(edgeObj.s);
                    var source = networkService.getNodeName(sourceNodeObj);
                    var interaction = edgeObj.i;
                    var targetNodeObj = networkService.getNodeInfo(edgeObj.t);
                    var target = networkService.getNodeName(targetNodeObj);

                    var row = {'Source Node': source, 'Interaction': interaction, 'Target Node': target};

                    if (edgeCitations) {
                        row.citation = (edgeCitations[edgeKey]) ? edgeKey : '';
                    }

                    if (edgeAttributes) {

                        var reservedEdgeTableColumnNames = ['Source Node', 'Interaction', 'Target Node'];

                        for (var key in edgeAttributes[edgeKey]) {
                            // we need to add the  if (edgeAttributes[edgeKey].hasOwnProperty(key) check to
                            // silence the JSHint warning
                            // Warning: Possible iteration over unexpected (custom / inherited) members, probably missing hasOwnProperty check
                            if (edgeAttributes[edgeKey].hasOwnProperty(key)) {
                                if (key.startsWith('__')) {
                                    continue;
                                }
                                if (key.toLowerCase() === 'pmid') {
                                    // exclude PMID data from the table
                                    continue;
                                }
                                var attributeValue = edgeAttributes[edgeKey][key].v;

                                if (_.includes(reservedEdgeTableColumnNames, key)) {
                                    key = key + ' 2';
                                }

                                row[key] = (attributeValue) ? attributeValue : '';
                            }
                        }
                    }
                    $scope.edgeGridOptions.data.push( row );
                }
            };

            var populateEdgeTable = function(network, enableFiltering, setGridWidth)
            {
                var edges = network.edges;
                var edgeCitations = network.edgeCitations;

                var longestSubject   = '';    // source
                var longestPredicate = '';
                var longestObject    = '';     // target

                if (!edges) {
                    return;
                }

                var edgeKeys = Object.keys(edges);

                // determine the longest subject, predicate and object
                for( var i = 0; i < edgeKeys.length; i++ )
                {
                    var edgeKey = edgeKeys[i];

                    var predicate = edges[edgeKey].i ? (edges[edgeKey].i) : '';
                    var subject = network.nodes[edges[edgeKey].s].n ? network.nodes[edges[edgeKey].s].n : '';
                    var object = network.nodes[edges[edgeKey].t].n ? network.nodes[edges[edgeKey].t].n : '';

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

                var reservedEdgeTableColumnNames = ['Source Node', 'Interaction', 'Target Node'];

                var columnDefs = [
                    {
                        field: reservedEdgeTableColumnNames[0],
                        displayName: reservedEdgeTableColumnNames[0],
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestSubject, false)
                    },
                    {
                        field: reservedEdgeTableColumnNames[1],
                        displayName: reservedEdgeTableColumnNames[1],
                        cellTooltip: true,
                        enableFiltering: filteringEnabled,
                        minWidth: calcColumnWidth(longestPredicate, false)
                    },
                    {
                        field: reservedEdgeTableColumnNames[2],
                        displayName: reservedEdgeTableColumnNames[2],
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
                            cellTemplate: '<div class="text-center"><h6>' +
                            '<a ng-click="grid.appScope.showEdgeCitations(COL_FIELD)" ng-show="grid.appScope.getNumEdgeCitations(COL_FIELD) > 0">' +
                            '{{grid.appScope.getNumEdgeCitations(COL_FIELD)}}' +
                            '</h6></div>'
                        };
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

                        var columnDef;

                        for (var j=0; j<edgeAttributePropertiesKeys.length; j++) {
                            var edgeAttributteProperty = edgeAttributePropertiesKeys[j];

                            if (edgeAttributteProperty && edgeAttributteProperty.toLowerCase() === 'pmid') {
                                // exclude column PMID from the table
                                continue;
                            }

                            var isItCitationHeader = (edgeAttributteProperty.toLowerCase().indexOf('citation') > -1);

                            if (isItCitationHeader) {

                                columnDef =
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
                            } else if (edgeAttributteProperty.toLowerCase() === 'ndex:externallink') {

                                columnDef = {
                                    field: edgeAttributteProperty,
                                    displayName: edgeAttributteProperty,
                                    cellTooltip: true,
                                    minWidth: calcColumnWidth(edgeAttributteProperty, false),
                                    enableFiltering: filteringEnabled,
                                    cellTemplate: '<div class="ui-grid-cell-contents hideLongLine" ng-bind-html="grid.appScope.getURLsForNdexExternalLink(COL_FIELD)"></div>'
                                };

                            } else {

                                if (_.includes(reservedEdgeTableColumnNames, edgeAttributteProperty)) {

                                    columnDef = {
                                        field: edgeAttributteProperty + ' 2',
                                        displayName: edgeAttributteProperty + ' (2)',
                                        cellTooltip: true,
                                        minWidth: calcColumnWidth(edgeAttributteProperty, false),
                                        enableFiltering: filteringEnabled
                                    };

                                    edgeAttributteProperty = edgeAttributteProperty + ' 2';

                                } else {

                                    columnDef = {
                                        field: edgeAttributteProperty,
                                        displayName: edgeAttributteProperty,
                                        cellTooltip: true,
                                        minWidth: calcColumnWidth(edgeAttributteProperty, false),
                                        enableFiltering: filteringEnabled,
                                        cellTemplate: 'views/gridTemplates/showCellContentsInNetworkTable.html',
                                        sortingAlgorithm: function (a, b) {
                                            if (!isNaN(a) && !isNaN(b)) {
                                                var parsedA = parseFloat(a);
                                                var parsedB = parseFloat(b);

                                                if (parsedA === parsedB) {
                                                    return 0;
                                                }
                                                if (parsedA < parsedB) {
                                                    return -1;
                                                }
                                                return 1;

                                            } else {
                                                if (a === b) {
                                                    return 0;
                                                }
                                                if (a < b) {
                                                    return -1;
                                                }
                                                return 1;
                                            }
                                        }
                                    };
                                }
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
                    }
                }
                var windowHeight = $(window).height() - 195;
                $('#edgeGridId').height(windowHeight);
                $scope.edgeGridApi.grid.gridHeight = windowHeight;

                refreshEdgeTable(network);
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

                anchor.setAttribute('href', 'data:application/octet-stream;charset=utf-8,' + encodeURIComponent(textToSaveInTheFile));
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
                    'uuid': networkExternalId
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
                    postData.idToken = gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;

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

            $scope.setReturnView = function(view) {
                sharedProperties.setNetworkViewPage(view);
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


            $scope.downloadNetwork = function () {
                uiMisc.downloadCXNetwork(networkExternalId);
            };

            /*
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
            */

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

                for (var i = 0; i < elementsToRemove.length; i++) {

                    var index = attributeNames.indexOf(elementsToRemove[i]);
                    if (index > -1) {
                        attributeNames.splice(index, 1);
                    }
                }

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

                var elementsToRemove = ['s', 't', 'i', 'id', '$$hashKey', '$$expanded', 'pmid'];

                for (var i = 0; i < elementsToRemove.length; i++) {

                    var index = attributeNames.indexOf(elementsToRemove[i]);
                    if (index > -1) {
                        attributeNames.splice(index, 1);
                    }
                }

                return attributeNames;
            };

            $scope.getAttributeValue = function(attributeName, attribute) {

                if (!attribute && (attribute !== 0)) {
                    return null;
                }
                if (!attributeName) {
                    return null;
                }

                var attributeValue = '';

                if (attribute instanceof Object) {
                    if (attribute.v && Array.isArray(attribute.v) && (attribute.v.length > 0) &&
                        (attributeName.toLowerCase() !== 'ndex:externallink'))
                    {
                        if(attribute.v.length > 5) {

                            for (var i = 0; i < 5; i++) {
                                if (i === 0) {
                                    attributeValue = '<br>' + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                        getStringAttributeValue(attribute.v[i]) + '<br>';
                                } else {
                                    attributeValue = attributeValue +  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                        getStringAttributeValue(attribute.v[i]) + '<br>';
                                }
                            }

                        } else {

                            for (var i1 = 0; i1 < attribute.v.length; i1++) {
                                if (i1 === 0) {
                                    attributeValue = '<br>' + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                        getStringAttributeValue(attribute.v[i1]) + '<br>';
                                } else {
                                    attributeValue = attributeValue + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                        getStringAttributeValue(attribute.v[i1]) + '<br> ';
                                }
                            }
                        }
                        
                    } else {

                        if (attributeName.toLowerCase() === 'ndex:internallink') {

                            return $scope.getURLsForNdexInternalLink(attribute.v);

                        } else if (attributeName.toLowerCase() === 'ndex:externallink') {

                            return  $scope.getURLsForNdexExternalLink(attribute.v);

                        } else if  (Array.isArray(attribute) && attribute.length > 0) {

                            if(attribute.length > 5) {

                                for (var i2 = 0; i2 < 5; i2++) {
                                    if (i2 === 0) {
                                        attributeValue = '<br>' + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                            getStringAttributeValue(attribute[i2]) + '<br>';
                                    } else {
                                        attributeValue = attributeValue +  '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                            getStringAttributeValue(attribute[i2]) + '<br>';
                                    }
                                }

                            } else {

                                for (var i3 = 0; i3 < attribute.length; i3++) {
                                    if (i3 === 0) {
                                        attributeValue = '<br>' + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                            getStringAttributeValue(attribute[i3]) + '<br>';
                                    } else {
                                        attributeValue = attributeValue + ' &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ' +
                                            getStringAttributeValue(attribute[i3]) + '<br> ';
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

            $scope.showMoreEdgeAttributes = function(attributeName, attributeObj) {

                var title;
                var typeOfAttributeName = typeof attributeName;

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
                }

                var attributeValue = '';

                if (attributeObj instanceof Object) {
                    if (attributeObj.v && Array.isArray(attributeObj.v)) {

                        for (var i = 0; i < attributeObj.v.length; i++) {
                            attributeValue = attributeValue + getStringAttributeValue(attributeObj.v[i]) + '<br>';
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
                if (hasLayout && networkController.currentNetwork.edgeCount <= 12000) {
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

                else if ((hasLayout && networkController.currentNetwork.edgeCount > 12000) ||
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
                    }

                } else if ((edgeCount > networkController.queryEdgeLimitToShowGraph) &&
                    (edgeCount <= networkController.queryEdgeLimitToShowTableOnly)) {

                    $scope.currentView = 'Table';
                    $scope.buttonLabel = 'Graph';
                    $scope.switchViewButtonEnabled = true;

                    enableFiltering = true;
                    setGridWidth    = true;
                    $scope.drawCXNetworkOnCanvasWhenViewSwitched = false;

                    drawCXNetworkOnCanvas(network, false);

                    populateNodeTable(network, enableFiltering, setGridWidth);
                    populateEdgeTable(network, enableFiltering, setGridWidth);

                } else if (edgeCount > networkController.queryEdgeLimitToShowTableOnly) {

                    $scope.currentView = 'Table';
                    $scope.buttonLabel = 'Graph';
                    $scope.switchViewButtonEnabled = false;

                    var networkIsTooLargeMessage =
                        'This network is too large to display in the browser. Please import it in Cytoscape for visualization purposes.';

                    $('#switchViewButtonId2').tooltip('hide').attr('data-original-title', networkIsTooLargeMessage);

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
                    $scope.shareTitle = 'Unable to Share this network: you do not own it ';
                }
            };

            $scope.setNetworkSampleViaUUID = function() {
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
                                        var limitForSettingNetwrokSample = 1000;

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

            $scope.removeFromMyNetworks = function() {
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
                                        resetBackgroundColor();
                                        getNetworkAndDisplay(networkExternalId,drawCXNetworkOnCanvas);
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


                        resetBackgroundColor();
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

                        $rootScope.errors = null;
                        $rootScope.confirmButtonDisabled = true;
                        $rootScope.cancelButtonDisabled = true;
                        $rootScope.progress = 'Cloning network in progress ...';

                        var confirmationSpinnerId = 'confirmationSpinnerId';
                        ndexSpinner.startSpinner(confirmationSpinnerId);

                        ndexService.cloneNetworkV2(networkController.currentNetworkId,
                            function() {
                                ndexSpinner.stopSpinner();
                                $modalInstance.dismiss();
                                delete $rootScope.errors;
                                delete $rootScope.confirmButtonDisabled;
                                delete $rootScope.cancelButtonDisabled;
                                delete $rootScope.progress;
                            },
                            function(error) {
                                ndexSpinner.stopSpinner();
                                title = 'Unable to Clone Network';
                                message  = networkName + ' wasn\'t cloned to your account.';

                                if (error.message) {
                                    message = message + '<br>' + error.message;
                                }
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
                    });
            };

            /*
            var setUserSetSampleProperty = function() {
                // sets userSetSample network property on the server
                // if it is not already set

                if(currentNetworkSummary.userSetSample) {
                    return;
                }
                var properties = (currentNetworkSummary.hasOwnProperty('properties')) ? currentNetworkSummary.properties : [];

                uiMisc.addNetworkProperty('userSetSample', true, 'boolean', properties, networkController.subNetworkId);

                ndexService.setNetworkPropertiesV2(networkController.currentNetworkId, properties,
                    function() {
                        networkController.currentNetwork.userSetSample  = true;
                        networkController.previousNetwork.userSetSample = true;
                        currentNetworkSummary.userSetSample             = true;
                    },
                    function() {

                    });
            };
*/
            networkController.setSampleFromQuery = function() {

                if (!$scope.showSetSampleButtonEnabled) {
                    return;
                }

                var title        = 'Set Sample For This Network';
                var message      = 'Set this query as sample for this network?';
                var dismissModal = false;

                ndexNavigation.openConfirmationModal(title, message, 'Set Sample', 'Cancel', dismissModal,
                    function ($modalInstance) {

                        $rootScope.errors = null;
                        $rootScope.confirmButtonDisabled = true;
                        $rootScope.cancelButtonDisabled = true;
                        $rootScope.progress = 'Setting sample network in progress ...';

                        var confirmationSpinnerId = 'confirmationSpinnerId';
                        ndexSpinner.startSpinner(confirmationSpinnerId);
                        var queryResultInCX = networkService.getQueryResultInCX();

                        ndexService.setNetworkSampleV2(networkController.currentNetworkId, queryResultInCX,
                            function() {
                                //setUserSetSampleProperty();
                                networkService.setQueryResultAsOriginalNiceCX();

                                networkController.previousNetwork.hasSample     = true;
                                //networkController.previousNetwork.userSetSample = true;
                                //networkController.currentNetwork.userSetSample  = true;
                                networkController.isSamplePrevious              = true;
                                networkController.sampleSizePrevious = networkController.currentNetwork.edgeCount;

                                $scope.showSetSampleButton = false;

                                ndexSpinner.stopSpinner();
                                $modalInstance.dismiss();
                                delete $rootScope.errors;
                                delete $rootScope.confirmButtonDisabled;
                                delete $rootScope.cancelButtonDisabled;
                                delete $rootScope.progress;
                            },
                            function(error) {
                                //$location.path();
                                ndexSpinner.stopSpinner();
                                title = 'Unable to Set Sample';
                                message  = 'The query result wasn\'t set as sample for this network.';

                                if (error.message) {
                                    message = message + '<br>' + error.message;
                                }
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
                    });

                //factory.setNetworkSampleV2 = function (networkId, sampleInCX, successHandler, errorHandler) {
            };



            networkController.deletelPendingDOIRequest = function() {

                var title = 'Delete DOI Request';

                var message =
                    'This will delete your DOI request, ' +
                    'please verify that your network\'s visibility is correct. <br>' +
                    ' If you still want a DOI for your network, please submit a new request. <br><br>' +
                    'Would you like to delete this request?';

                var dismissModal = false;

                ndexNavigation.openConfirmationModal(title, message, 'Confirm', 'Cancel', dismissModal,
                    function ($modalInstance) {

                        $rootScope.errors = null;
                        $rootScope.confirmButtonDisabled = true;
                        $rootScope.cancelButtonDisabled = true;
                        $rootScope.progress = 'Deleting DOI request in progress ...';

                        var confirmationSpinnerId = 'confirmationSpinnerId';
                        ndexSpinner.startSpinner(confirmationSpinnerId);


                        ndexService.cancelDoi(networkController.currentNetworkId,
                            function() {
                                delete networkController.currentNetwork.doi;
                                networkController.currentNetwork.isReadOnly = false;
                                networkController.readOnlyChecked = networkController.currentNetwork.isReadOnly;
                                ndexSpinner.stopSpinner();
                                $modalInstance.dismiss();
                                delete $rootScope.errors;
                                delete $rootScope.confirmButtonDisabled;
                                delete $rootScope.cancelButtonDisabled;
                                delete $rootScope.progress;
                            },
                            function(error) {
                                ndexSpinner.stopSpinner();
                                title = 'Unable to delete DOI';
                                message  = 'DOI was not deleted for network ' + networkName + '.';

                                if (error.message) {
                                    message = message + '<br><br>' + error.message;
                                }
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
                console.log('Unexpected route.');
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
