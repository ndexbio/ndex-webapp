/**
 * Created by chenjing on 5/2/16.
 */


ndexServiceApp.factory('networkService', ['sharedProperties','cxNetworkUtils', 'ndexConfigs', 'ndexUtility', 'ndexHelper', 'provenanceService', 'ndexService','$http', '$q',
    function (sharedProperties, cxNetworkUtils, ndexConfigs, ndexUtility, ndexHelper, provenanceService, ndexService, $http, $q) {

        var factory = {};
        
        var currentNetworkSummary = undefined;

        var ndexServerURI = window.ndexSettings.ndexServerUri;
        
        var currentNiceCX  = null;   // the copy of CX network that are currently displayed
        var originalNiceCX = null;

        var localNetworkUUID = undefined;


        factory.getNdexServerUri = function()
        {
            return ndexServerURI;
        };


        factory.getNetworkSummaryFromNdexV2 = function (networkId,accesskey) {

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Server API: Get Network Summary
            // GET /network/{networkid}/summary?accesskey={accessKey}
            //var url = "/network/" + networkId + "/summary?setAuthHeader=false";

            var url = "/network/" + networkId + "/summary";
            if (accesskey) {
                url = url + "?accesskey=" + accesskey;
            };

            var config = ndexConfigs.getGetConfigV2(url, null);

            config.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another psuedo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(config);
            var promise = {};

            promise.success = function (handler) {
                request.success(
                    function (network) {
                        currentNetworkSummary = network;
                        handler(network);
                    }
                );
                return promise;
            };

            promise.error = function (handler) {
                request.then(
                    null,
                    function (error) {
                        handler(error);
                    }
                );
                return promise;
            };

            // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
            promise.abort = function () {
                deferredAbort.resolve();
            };

            // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
            promise.finally = function () {
                request.finally(
                    function () {
                        promise.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = promise = null;
                    }
                );
            };

            return promise;
        };


        factory.getCurrentNetworkSummary = function () {
            return currentNetworkSummary;
        };

        factory.getCurrentNiceCX = function () {
            return currentNiceCX;
        };
        factory.setCurrentNiceCX = function (networkInNiceCX) {
            currentNiceCX = networkInNiceCX;
        };

        factory.clearNiceCX = function() {
            currentNiceCX  = null;
            originalNiceCX = null;
        };
        factory.saveOriginalNiceCX = function(originalNetworkInNiceCX) {
            originalNiceCX = originalNetworkInNiceCX;
        };
        factory.getOriginalNiceCX = function() {
            return originalNiceCX;
        };
        factory.restoreCurrentNiceCXAfterQuery = function() {
            currentNiceCX = originalNiceCX;
        };

        factory.getLocalNetworkUUID = function() {
            return localNetworkUUID;
        };

        factory.setLocalNetworkUUID = function(networkUUID) {
            localNetworkUUID = networkUUID;
        };

        factory.getNodeName = function(node) {
            return node['_cydefaultLabel'];
        };

        var removeTabsAndPipesFromString = function(strToNormalize) {
            var strWithoutTabsOrPipes = strToNormalize.replace(/\t/g, ' ').replace(/\|/g, ' ');
            return strWithoutTabsOrPipes;
        };



        factory.getTSVOfCurrentNiceCX = function() {

            /*
             Source		Node name (if Node Name missing, then represents, node Id)
             Interaction
             Target		Node name (if Node Name missing, then represents, node Id)
             Source Id
             Source Alias
             Source Properties 1,2,3
             Target Id
             Target Alias
             Target Properties 1,2,3
             Citation
             Edge Properties 1,2,3

             cx edge id
             cx source node id
             cx target node id
             */

            var network = currentNiceCX;

            var edges = network.edges;
            var edgeKeys = Object.keys(edges);


            data = [];
            var row = {};

            var edgeAttributes = network.edgeAttributes;

            var headers = {Source: 0, Interaction: 1, Target: 2, 'Source ID': 3, 'Source Alias': 4};
            var sourceAliasOrder = headers['Source Alias'];
            var headersSize = 0;


            var nodes = network.nodes;

            // in this loop, build headers for Node: Source NAme (s.n), Source Represents (s.r),
            // Target Name (t.n), Target Represents (t.r)
            /*
            _.forEach(nodes, function(node) {

                if (node) {
                    if (node['n'] && !('s.n' in headers)) {
                        headers['s.n'] = _.size(headers);
                    }
                    if (node['r'] && !('s.r' in headers)) {
                        headers['s.r'] = _.size(headers);
                    }
                    if (node['n'] && !('t.n' in headers)) {
                        headers['t.n'] = _.size(headers);
                    }
                    if (node['r'] && !('t.r' in headers)) {
                        headers['t.r'] = _.size(headers);
                    }
                }
            });
            */

            var nodeKeys = Object.keys(nodes);
            var nodeAttributes = network.nodeAttributes;
            var aliasColumnHeader = null;

            for (var key in nodeKeys)
            {
                var nodeId = nodeKeys[key];

                //var nodeObj = networkService.getNodeInfo(nodeId);
                //var nodeName = networkService.getNodeName(nodeObj);

                if (nodeAttributes) {

                    var nodeAttrs = nodeAttributes[nodeId];

                    for (var key1 in nodeAttrs) {
                        var attributeObj = (nodeAttrs[key1]) ? (nodeAttrs[key1]) : "";

                        var attributeObjName = removeTabsAndPipesFromString(attributeObj['n']);

                        var attributeObjNameSource = 'Source ' + attributeObjName;

                        if (attributeObjName && (attributeObjName.toLowerCase() == 'alias')) {
                            aliasColumnHeader = attributeObjName;
                            if (!(attributeObjNameSource in headers)) {
                                delete headers['Source Alias'];
                                headers[attributeObjNameSource] = sourceAliasOrder;
                            }
                        }
                        //var attributeObjNameTarget = 'Target ' + attributeObjName;

                        if (!(attributeObjNameSource in headers)) {
                            headers[attributeObjNameSource] = _.size(headers);
                        }

                        //if (!(attributeObjNameTarget in headers)) {
                        //    headers[attributeObjNameTarget] = _.size(headers);
                        //}
                    }
                }
            }

            headers['Target ID']    = _.size(headers);
            headers['Target Alias'] = _.size(headers);
            var targetAliasOrder    = headers['Target Alias'];



            for (var key in nodeKeys)
            {
                var nodeId = nodeKeys[key];

                if (nodeAttributes) {

                    var nodeAttrs = nodeAttributes[nodeId];

                    for (var key1 in nodeAttrs) {
                        var attributeObj = (nodeAttrs[key1]) ? (nodeAttrs[key1]) : "";

                        var attributeObjName = removeTabsAndPipesFromString(attributeObj['n']);

                        var attributeObjNameTarget = 'Target ' + attributeObjName;

                        if (attributeObjName && (attributeObjName.toLowerCase() == 'alias')) {
                            if (!(attributeObjNameTarget in headers)) {
                                delete headers['Target Alias'];
                                headers[attributeObjNameTarget] = targetAliasOrder;
                            }
                        }

                        if (!(attributeObjNameTarget in headers)) {
                            headers[attributeObjNameTarget] = _.size(headers);
                        }
                    }
                }
            }

            headers['Citation'] = _.size(headers);
            var citationOrder   = headers['Citation'];

            for( i = 0; i < edgeKeys.length; i++ )
            {
                var edgeKey = edgeKeys[i];

                if (edgeAttributes) {
                    for (var key in edgeAttributes[edgeKey]) {

                        var keySanitized = removeTabsAndPipesFromString(key);

                        if (keySanitized && (keySanitized.toLowerCase() == 'citation')) {
                            if (!(keySanitized in headers)) {
                                delete headers['Citation'];
                                headers[keySanitized] = citationOrder;
                            }
                        }

                        if (!(keySanitized in headers)) {
                            headers[keySanitized] = _.size(headers);
                        }
                    }
                }
            }

            headers['cx edge id']        = _.size(headers);
            headers['cx source node id'] = _.size(headers);
            headers['cx target node id'] = _.size(headers);


            var headersKeysSorted = Object.keys(headers);
            headersKeysSorted.sort(function(a, b) {
                return headers[a] - headers[b];
            });
            var headerKeysJoined = headersKeysSorted.join('\t') + '\n';



            var headersInverted = _.invert(headers);
            var fileString      = headerKeysJoined;

            var row = {};

            var nodeAttributesAlreadyProcessed = {'n':0,  'r':0, 'id':0, '_cydefaultLabel':0};
            var edgeAttributesAlreadyProcessed = {'id':0, 's':0, 't':0,  'i':0};

            // Generate Source Node, Source Node Represents, Target Node, Target Node Represents,
            // if present
            for( i = 0; i < edgeKeys.length; i++ )
            {
                for (key in headers) {
                    row[key] = '';
                };

                var rowStringTemp = '';
                var edgeKey       = edgeKeys[i];
                var edgeObj       = factory.getEdgeInfo(edgeKey);


                row['cx edge id']        = (edgeObj && edgeObj.id) ? edgeObj.id : '';
                row['cx source node id'] = (edgeObj && (edgeObj.s || edgeObj.s == 0)) ? edgeObj.s  : '';
                row['Interaction']       = (edgeObj && edgeObj.i)  ? edgeObj.i  : '';
                row['cx target node id'] = (edgeObj && (edgeObj.t || edgeObj.t == 0)) ? edgeObj.t  : '';


                var sourceNodeObj = factory.getNodeInfo(edgeObj['s']);
                var targetNodeObj = factory.getNodeInfo(edgeObj['t']);

                row['Source']    = getNodeNameFromNodeObj(sourceNodeObj);
                row['Source ID'] = (sourceNodeObj && sourceNodeObj.r) ? sourceNodeObj.r : '';
                row['Target']    = getNodeNameFromNodeObj(targetNodeObj);
                row['Target ID'] = (targetNodeObj && targetNodeObj.r) ? targetNodeObj.r : '';

                // get Source Node attributes
                for (var nodeAttr in sourceNodeObj) {
                    var nodeAttrNormalized = removeTabsAndPipesFromString(nodeAttr);
                    if (nodeAttrNormalized in nodeAttributesAlreadyProcessed) {
                        continue;
                    }
                    row['Source ' + nodeAttrNormalized] = getAttributeValue(sourceNodeObj[nodeAttr]);
                }
                // get Target Node attributes
                for (nodeAttr in targetNodeObj) {
                    var nodeAttrNormalized1 = removeTabsAndPipesFromString(nodeAttr);
                    if (nodeAttrNormalized1 in nodeAttributesAlreadyProcessed) {
                        continue;
                    }
                    row['Target ' + nodeAttrNormalized1] = getAttributeValue(targetNodeObj[nodeAttr]);
                }

                // get edge attributes
                for (var edgeAttr in edgeObj) {
                    var edgeAttrNormalized = removeTabsAndPipesFromString(edgeAttr);
                    if (edgeAttrNormalized in edgeAttributesAlreadyProcessed) {
                        continue;
                    }
                    row[edgeAttrNormalized] = getAttributeValue(edgeObj[edgeAttr]);
                }

                var tabSeparatedRow = '';
                for (key in headersKeysSorted) {
                    var rowElement = row[headersKeysSorted[key]];
                    tabSeparatedRow = tabSeparatedRow + rowElement + '\t';
                }
                // replace last \t (tab) in tabSeparatedRow with \n (new line)
                tabSeparatedRow = tabSeparatedRow.slice(0, -1) + '\n';

                fileString = fileString + tabSeparatedRow;

            }

            return fileString;
        };

        /*
        factory.getTSVOfCurrentNiceCX1 = function() {


                // Source		Node name (if Node Name missing, then represents, node Id)
                // Interaction
                // Target		Node name (if Node Name missing, then represents, node Id)
                // Source Id
                // Source Alias
                // Source Properties 1,2,3
                // Target Id
                // Target Alias
                // Target Properties 1,2,3
                // Citation
                // Edge Properties 1,2,3

                // cx edge id
                // cx source node id
                // cx target node id


            var network = currentNiceCX;

            var edges = network.edges;
            var edgeKeys = Object.keys(edges);


            data = [];
            var row = {};

            var edgeAttributes = network.edgeAttributes;

            var headers = {edge_id: 0, Source: 1, Interaction: 2, Target: 3};
            var headersSize = 0;


            var nodes = network.nodes;

            // in this loop, build headers for Node: Source NAme (s.n), Source Represents (s.r),
            // Target Name (t.n), Target Represents (t.r)
            _.forEach(nodes, function(node) {

                if (node) {
                    if (node['n'] && !('s.n' in headers)) {
                        headers['s.n'] = _.size(headers);
                    }
                    if (node['r'] && !('s.r' in headers)) {
                        headers['s.r'] = _.size(headers);
                    }
                    if (node['n'] && !('t.n' in headers)) {
                        headers['t.n'] = _.size(headers);
                    }
                    if (node['r'] && !('t.r' in headers)) {
                        headers['t.r'] = _.size(headers);
                    }
                }
            });

            var nodeKeys = Object.keys(nodes);
            var nodeAttributes = network.nodeAttributes;

            for (var key in nodeKeys)
            {
                var nodeId = nodeKeys[key];

                //var nodeObj = networkService.getNodeInfo(nodeId);
                //var nodeName = networkService.getNodeName(nodeObj);

                if (nodeAttributes) {

                    var nodeAttrs = nodeAttributes[nodeId];

                    for (var key1 in nodeAttrs) {
                        var attributeObj = (nodeAttrs[key1]) ? (nodeAttrs[key1]) : "";

                        var attributeObjName = removeTabsAndPipesFromString(attributeObj['n']);

                        var attributeObjNameSource = 'Source_' + attributeObjName;
                        var attributeObjNameTarget = 'Target_' + attributeObjName;

                        if (!(attributeObjNameSource in headers)) {
                            headers[attributeObjNameSource] = _.size(headers);
                        }
                        if (!(attributeObjNameTarget in headers)) {
                            headers[attributeObjNameTarget] = _.size(headers);
                        }
                    }
                }
            }

            for( i = 0; i < edgeKeys.length; i++ )
            {
                var edgeKey = edgeKeys[i];

                if (edgeAttributes) {
                    for (var key in edgeAttributes[edgeKey]) {

                        var keySanitized = removeTabsAndPipesFromString(key);

                        if (!(keySanitized in headers)) {
                            headers[keySanitized] = _.size(headers);
                        }
                    }
                }
            }

            var headersKeysSorted = Object.keys(headers);
            headersKeysSorted.sort(function(a, b) {
                return headers[a] - headers[b];
            });
            var headerKeysJoined = headersKeysSorted.join('\t') + '\n';


            var headersInverted = _.invert(headers);
            var fileString      = headerKeysJoined;

            var row = {};

            var nodeAttributesAlreadyProcessed = {'n':0,  'r':0, 'id':0, '_cydefaultLabel':0};
            var edgeAttributesAlreadyProcessed = {'id':0, 's':0, 't':0,  'i':0};

            // Generate Source Node, Source Node Represents, Target Node, Target Node Represents,
            // if present
            for( i = 0; i < edgeKeys.length; i++ )
            {
                for (key in headers) {
                    row[key] = '';
                };

                var rowStringTemp = '';
                edgeKey           = edgeKeys[i];
                var edgeObj       = factory.getEdgeInfo(edgeKey);


                row['edge_id']     = (edgeObj && edgeObj.id) ? edgeObj.id : '';
                row['Source']      = (edgeObj && (edgeObj.s || edgeObj.s == 0)) ? edgeObj.s  : '';
                row['Interaction'] = (edgeObj && edgeObj.i)  ? edgeObj.i  : '';
                row['Target']      = (edgeObj && (edgeObj.t || edgeObj.t == 0)) ? edgeObj.t  : '';


                var sourceNodeObj = factory.getNodeInfo(edgeObj['s']);
                var targetNodeObj = factory.getNodeInfo(edgeObj['t']);

                if (headers['s.n']) {
                    row['s.n'] = (sourceNodeObj && sourceNodeObj.n) ? sourceNodeObj.n : '';
                }
                if (headers['s.r']) {
                    row['s.r'] = (sourceNodeObj && sourceNodeObj.r) ? sourceNodeObj.r : '';
                }
                if (headers['t.n']) {
                    row['t.n'] = (targetNodeObj && targetNodeObj.n) ? targetNodeObj.n : '';
                }
                if (headers['t.r']) {
                    row['t.r'] = (targetNodeObj && targetNodeObj.r) ? targetNodeObj.r : '';
                }


                // get Source Node attributes
                for (var nodeAttr in sourceNodeObj) {
                    var nodeAttrNormalized = removeTabsAndPipesFromString(nodeAttr);
                    if (nodeAttrNormalized in nodeAttributesAlreadyProcessed) {
                        continue;
                    }
                    row['Source_' + nodeAttrNormalized] = getAttributeValue(sourceNodeObj[nodeAttr]);
                }
                // get Target Node attributes
                for (nodeAttr in targetNodeObj) {
                    var nodeAttrNormalized1 = removeTabsAndPipesFromString(nodeAttr);
                    if (nodeAttrNormalized1 in nodeAttributesAlreadyProcessed) {
                        continue;
                    }
                    row['Target_' + nodeAttrNormalized1] = getAttributeValue(targetNodeObj[nodeAttr]);
                }

                // get edge attributes
                for (var edgeAttr in edgeObj) {
                    var edgeAttrNormalized = removeTabsAndPipesFromString(edgeAttr);
                    if (edgeAttrNormalized in edgeAttributesAlreadyProcessed) {
                        continue;
                    }
                    row[edgeAttrNormalized] = getAttributeValue(edgeObj[edgeAttr]);
                }

                var tabSeparatedRow = '';
                for (key in headersKeysSorted) {
                    var rowElement = row[headersKeysSorted[key]];
                    tabSeparatedRow = tabSeparatedRow + rowElement + '\t';
                }
                // replace last \t (tab) in tabSeparatedRow with \n (new line)
                tabSeparatedRow = tabSeparatedRow.slice(0, -1) + '\n';

                fileString = fileString + tabSeparatedRow;
            }

            console.log(fileString);
            return fileString;
        };
*/
        var getNodeNameFromNodeObj = function(nodeObj) {

            var nodeName = 'No Name';

            if (nodeObj) {

                if (nodeObj.n) {
                    nodeName = nodeObj.n;

                } else if (nodeObj.id) {
                    nodeName = nodeObj.id;
                }
            }
            return nodeName;
        };

        var getAttributeValue = function(attribute)
        {
            var returnStr = '';

            if (typeof(attribute) === 'undefined' || attribute === '' || attribute == null) {
                return returnStr;
            }
            if (typeof(attribute) === 'string') {
                return attribute;
            }


            if (typeof(attribute) === 'object') {

                if (attribute.v) {

                    if (Array.isArray(attribute.v)) {

                        for (var i = 0; i < attribute.v.length; i++) {
                            attribute.v[i] = removeTabsAndPipesFromString(attribute.v[i]);
                        }

                        returnStr = attribute.v.join('|');

                    } else if (typeof(attribute.v) === 'string') {

                        returnStr = attribute.v;
                    }
                }
            }

            return returnStr;
        };


        factory.getNodeInfo = function (nodeId) {
            if (!currentNiceCX) return null;

            var node = currentNiceCX.nodes[nodeId];
            
            var nodeInfo = {'id': nodeId,
                             '_cydefaultLabel': cxNetworkUtils.getDefaultNodeLabel(currentNiceCX,node),
                            'n': node.n,
                            'r': node.r
                            };
            var counter =1;
            if ( currentNiceCX.nodeAttributes && currentNiceCX.nodeAttributes[nodeId]) {
                var nodeAttrs = currentNiceCX.nodeAttributes[nodeId];
                _.forEach(nodeAttrs, function(value, pname) {
                    if ( pname != "selected") {
                        if ( !nodeInfo[pname] ) {
                            nodeInfo[pname] = value;
                        } else {
                            while (nodeInfo[pname+ '_' + counter]) {
                                counter++;
                            };
                            nodeInfo[pname+ '_' + counter] = value;
                            counter++;
                        }
                    }

                });
            }


            return nodeInfo;
        };


        factory.getNodeAttributes = function ( nodeId) { 
            if ( !currentNiceCX) return null;
            return currentNiceCX.nodeAttributes[nodeId];
        };
        
        factory.getEdgeAttributes = function (edgeId) { 
            if ( !currentNiceCX) return null;
            
            return currentNiceCX.edgeAttributes[edgeId];
        };
        
        factory.getNodeAttr = function (nodeId, propName ) {
            if ( currentNiceCX && currentNiceCX.nodeAttributes[nodeId] ) {
                return currentNiceCX.nodeAttributes[nodeId][propName];
            }
            return null;
        };
        
        factory.getEdgeAttr = function ( edgeId, propName) {
           if ( currentNiceCX && currentNiceCX.edgeAttributes[edgeId]) {
               return currentNiceCX.edgeAttributes[edgeId][propName];
           }
            
            return null;
        };
        
        factory.getEdgeInfo = function (edgeId) {
            if ( !currentNiceCX) return null;

            var edge = currentNiceCX.edges[edgeId];
            var edgeInfo = { 'id': edgeId,
                            s: edge.s,
                            t: edge.t,
                            i: edge.i};
            var counter;
            if ( currentNiceCX.edgeAttributes && currentNiceCX.edgeAttributes[edgeId]) {
                var edgeAttrs = currentNiceCX.edgeAttributes[edgeId];
                _.forEach(edgeAttrs, function(value, pname) {
                    if ( pname != 'selected') {
                        if ( !edgeInfo[pname]) {
                            edgeInfo[pname] = value;
                        } else {
                            while (edgeInfo[pname+ '_' + counter]) {
                                counter++;
                            };
                            edgeInfo[pname+ '_' + counter] = value;
                            counter++;
                        }   
                    }
                });
            }

            if ( currentNiceCX.edgeCitations && currentNiceCX.edgeCitations[edgeId]) {
                var citationList = [];
                _.forEach(currentNiceCX.edgeCitations[edgeId], function ( citationId) {
                    citationList.push ( currentNiceCX.citations[citationId]);
                });
                if (citationList.length >0 )
                    edgeInfo['citations'] = citationList;
            }

            return edgeInfo;
        }

        factory.getCompleteNetworkInCXV2 = function (networkId, accesskey) {

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Grab the config for this request. We modify the config to allow for $http request aborts.
            // This may become standard in the client.

            // Get Complete Network in CX
            // GET /network/{networkId}?accesskey={accesskey}
            var url = "/network/" + networkId;

            if (accesskey) {
                url = url + "?accesskey=" + accesskey;
            };

            var config = ndexConfigs.getGetConfigV2(url, null);

            config.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another psuedo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(config);
            var promise = {};

            promise.success = function (handler) {
                request.success(
                    function (network) {
                        currentNiceCX = cxNetworkUtils.rawCXtoNiceCX(network);
                        originalNiceCX = currentNiceCX;
                        handler(currentNiceCX);
                    }
                );
                return promise;
            };

            promise.error = function (handler) {
                request.then(
                    null,
                    function (error) {
                        handler(error);
                    }
                );
                return promise;
            };

            // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
            promise.abort = function () {
                deferredAbort.resolve();
            };

            // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
            promise.finally = function () {
                request.finally(
                    function () {
                        promise.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = promise = null;
                    }
                );
            };

            return promise;
        };

        factory.getNetworkSampleV2 = function (networkId, accesskey) {
            // Server API: Get Network Sample
            // GET /network/{networkId}/sample

            var url = "/network/" + networkId + "/sample";

            if (accesskey) {
                url = url + "?accesskey=" + accesskey;
            };
            var config = ndexConfigs.getGetConfigV2(url, null);

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            config.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another psuedo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(config);
            var promise = {};

            promise.success = function (handler) {
                request.success(
                    function (network) {
                        currentNiceCX = cxNetworkUtils.rawCXtoNiceCX(network);
                        originalNiceCX = currentNiceCX;
                        handler(currentNiceCX);
                    }
                );
                return promise;
            };

            promise.error = function (handler) {
                request.then(
                    null,
                    function (error) {
                        handler(error);
                    }
                );
                return promise;
            };

            // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
            promise.abort = function () {
                deferredAbort.resolve();
            };

            // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
            promise.finally = function () {
                request.finally(
                    function () {
                        promise.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = promise = null;
                    }
                );
            };

            return promise;
        };

        factory.neighborhoodQuery = function (networkId, accesskey, searchString, searchDepth, edgeLimit) {
            // Server API : Query Network As CX
            // POST /search/network/{networkId}/query?accesskey={accesskey} or
            // POST /search/network/{networkId}/interconnectquery?accesskey={accesskey}

            if (3 == searchDepth) {

                // this is 1-step Interconnect
                var url = "/search/network/" + networkId + "/interconnectquery";
                var postData = {
                    searchString: searchString,
                    edgeLimit: edgeLimit
                };

            } else {
                var url = "/search/network/" + networkId + "/query";
                var postData = {
                    searchString: searchString,
                    searchDepth: searchDepth,
                    edgeLimit: edgeLimit
                };
            };

            postData['errorWhenLimitIsOver'] = true;

            if (accesskey) {
                url = url + "?accesskey=" + accesskey;
            };

            var urlConfig = ndexConfigs.getPostConfigV2(url, postData);

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();
            
            urlConfig.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another pseudo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(urlConfig);
            var promise = {};

            promise.success = function (handler) {
                request.success(
                    function (network) {
                        currentNiceCX = cxNetworkUtils.rawCXtoNiceCX(network);
                        handler(currentNiceCX);
                    }
                );
                return promise;
            };

            promise.error = function (handler) {
                request.then(
                    null,
                    function (error) {
                        handler(error);
                    }
                );
                return promise;
            };

            // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
            promise.abort = function () {
                deferredAbort.resolve();
            };

            // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
            promise.finally = function () {
                request.finally(
                    function () {
                        promise.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = promise = null;
                    }
                );
            };

            return promise;
        };

        var extractUuidFromUri = function( uri )
        {
            var uuidRegExPattern = /[0-9a-z]{8}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{4}-[0-9a-z]{12}/i;

            var n = uri.search(uuidRegExPattern);
            var uuid = uri.substr(n, 36);

            return uuid;
        };


        // TODO: delete factory.saveQueryResults -- it is obsolete.  No need to add Provenance Event to
        // the network created by search since service already adds this event to provenance
        factory.saveQueryResults = function (currentNetworkSummary, currentSubNetwork, rawCX, onSuccess, onError) {

            // let's get provenance from rawCX

            factory.createCXNetwork(rawCX, function(newNetworkURL) {

                provenanceService.getNetworkProvenance(currentNetworkSummary.externalId,
                    function (provenance) {

                    var eventProperties= [];

                    if (currentSubNetwork['queryString']) { // is neighborhood query
                        eventProperties = [
                            {
                                name: 'query terms',
                                value: currentSubNetwork['queryString'],
                                type: 'SimplePropertyValuePair'
                            },
                            {
                                name: 'query depth',
                                value: currentSubNetwork['queryDepth'],
                                type: 'SimplePropertyValuePair'
                            }
                        ];
                    } else {

                        if (currentSubNetwork.edgeFilter && currentSubNetwork.edgeFilter.propertySpecifications.length > 0) {
                            _.forEach(currentSubNetwork.edgeFilter.propertySpecifications, function (filter) {
                                var prop = {
                                    'name': 'Edge Filter',
                                    'value': filter.name + '=' + filter.value,
                                    'type': 'SimplePropertyValuePair'
                                };

                                eventProperties.push(prop);
                            });
                        }

                        if (currentSubNetwork.nodeFilter && currentSubNetwork.nodeFilter.propertySpecifications.length > 0) {
                            _.forEach(currentSubNetwork.nodeFilter.propertySpecifications, function (filter) {
                                var prop = {
                                    'name': 'node Filter',
                                    'value': filter.name + '=' + filter.value,
                                    'type': 'SimplePropertyValuePair'
                                };
                                eventProperties.push(prop);
                            });

                        }
                    }

                    var newProvenance =
                    {
                        uri: ndexServerURI + '/network/' + currentNetworkSummary.externalId,
                        properties: [
                            {
                                name: 'edge count',
                                value: currentNetworkSummary.edgeCount,
                                type: 'SimplePropertyValuePair'
                            },
                            {
                                name: 'node count',
                                value: currentNetworkSummary.nodeCount,
                                type: 'SimplePropertyValuePair'
                            },
                            {
                                name: 'dc:title',
                                value: currentNetworkSummary.name,
                                type: 'SimplePropertyValuePair'
                            }
                        ],
                        creationEvent: {
                            startedAtTime: currentNetworkSummary.creationTime,
                            endedAtTime: currentNetworkSummary.creationTime,
                            inputs: [provenance],
                            type: 'ProvenanceEvent',
                            eventType: 'Query',
                            properties: eventProperties

                        }
                    };

                    if (currentNetworkSummary.description) {
                        newProvenance.properties.push({
                            name: 'description',
                            value: currentNetworkSummary.description,
                            type: 'SimplePropertyValuePair'
                        })
                    }
                    if (currentNetworkSummary.version) {
                        newProvenance.properties.push({
                            name: 'version',
                            value: currentNetworkSummary.version,
                            type: 'SimplePropertyValuePair'
                        })
                    }

                    var newUUID = extractUuidFromUri(newNetworkURL);

                    ndexService.setNetworkProvenanceV2(newUUID, newProvenance,
                        function(success){
                            onSuccess(success);
                        },
                        function(error){
                            onError(error);
                        })
                },
                 onError)
                },
                onError);
        }

        factory.updateNetworkContextFromNdexV2 = function (contextArray, networkId, onSuccess, onError) {
            var rawCX = [
                {"numberVerification": [{"longNumber": 281474976710655}]},
                {"metaData": [{"elementCount": 1,"name": "@context","properties": []}]},
                {"@context": contextArray},
                {"status": [{"error": "","success": true}]}
            ]

            factory.updateContext(rawCX, networkId, function(putResponse) {
                    onSuccess(putResponse);
            },onError);
        };

        factory.updateContext = function (rawCX, networkId, onSuccess, onError) {

            var url = ndexServerURI + "/network/" + networkId + "/aspects";

            var XHR = new XMLHttpRequest();
            var FD  = new FormData();

            var content = JSON.stringify(rawCX);

            var blob = new Blob([content], { type: "application/octet-stream"});

            // data.append("myfile", myBlob, "filename.txt");
            FD.append('CXNetworkStream', blob);

            XHR.addEventListener('load', function(event) {

                if (XHR.readyState === XHR.DONE) {
                    if (XHR.status === 200 || XHR.status === 201) {
                        var newUUID = XHR.responseText;
                        onSuccess(XHR.responseText);
                    }
                }
                //    alert('Yeah! Data sent and response loaded.');
            });

            // We define what will happen in case of error
            XHR.addEventListener('error', function(event) {
                //   alert('Oups! Something goes wrong.');
                onError(XHR.responseText);
            });

            XHR.open('PUT', url);
            var authValue = ndexUtility.getAuthHeaderValue();
            if ( authValue != null )
                XHR.setRequestHeader("Authorization", authValue );

            // We just send our FormData object, HTTP headers are set automatically
            var foo =  XHR.send(FD);

        };

        factory.createCXNetwork = function (rawCX, onSuccess, onError) {

            var url = ndexServerURI + '/network';

            var XHR = new XMLHttpRequest();
            var FD  = new FormData();

            var content = JSON.stringify(rawCX);

            var blob = new Blob([content], { type: "application/octet-stream"});

           // data.append("myfile", myBlob, "filename.txt");
            FD.append('CXNetworkStream', blob);

            XHR.addEventListener('load', function(event) {

                if (XHR.readyState === XHR.DONE) {
                    if (XHR.status === 200 || XHR.status === 201) {
                        var newUUID = XHR.responseText;
                        onSuccess(XHR.responseText);
                    }
                }
            //    alert('Yeah! Data sent and response loaded.');
            });

            // We define what will happen in case of error
            XHR.addEventListener('error', function(event) {
             //   alert('Oups! Something goes wrong.');
                onError(XHR.responseText);
            });

            XHR.open('POST', url);
            var authValue = ndexUtility.getAuthHeaderValue();
            if ( authValue != null )
            XHR.setRequestHeader("Authorization", authValue );

            // We just send our FormData object, HTTP headers are set automatically
            var foo =  XHR.send(FD);

        };


        factory.advancedNetworkQueryV2 = function (networkId, accesskey, query, size) {
            // Server API: Query Network
            // POST /search/network/{networkId}/advancedquery?accesskey={accesskey}

            var url = "/search/network/" + networkId + "/advancedquery";
            if (accesskey) {
                url = url + "?accesskey=" + accesskey;
            };
            
            //var urlConfig = ndexConfigs.getPostConfigAdvQueryV2(url, query);
            var urlConfig = ndexConfigs.getPostConfigV2(url, query);

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            urlConfig.timeout = deferredAbort.promise;

            var request = $http(urlConfig);
            var promise = {};

            promise.success = function (handler) {
                request.success(
                    function (network) {
                        currentNiceCX = cxNetworkUtils.rawCXtoNiceCX(network.data);
                        handler(currentNiceCX);
                    }
                );
                return promise;
            };

            promise.error = function (handler) {
                request.then(
                    null,
                    function (error) {
                        handler(error);
                    }
                );
                return promise;
            };

            // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
            promise.abort = function () {
                deferredAbort.resolve();
            };

            // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
            promise.finally = function () {
                request.finally(
                    function () {
                        promise.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = promise = null;
                    }
                );
            };

            return promise;
        };


        /**
         * Return the value of a given property in the network. I assume the property names a unique in each subnetwork.
         * Property name is case insensitive.
         * @param networkProperties
         * @param subNetworkId
         * @param propertyName
         *
         * @returns {undefined}
         */

        factory.getNetworkProperty = function( subNetworkId, propertyName)
        {
            if ('undefined'===typeof(currentNetworkSummary) || !propertyName) {
                return undefined;
            }

            var networkProperties = currentNetworkSummary.properties;
            for( var i = 0; i < networkProperties.length; i++ ) {

                if ((networkProperties[i].predicateString.toLowerCase() === propertyName.toLowerCase()) &&
                    subNetworkId == networkProperties[i].subNetworkId) {
                    return networkProperties[i].value ;
                }
            }
            return undefined;
        }

        factory.getPropertiesExcluding = function (subNetworkId, excludeList) {

            var result = [];
            var excludeSet = new Set();
            for ( var i = 0 ; i < excludeList.length ; i++ ) {
                excludeSet.add(excludeList[i].toLowerCase());
            }

            var networkProperties = currentNetworkSummary.properties;

            // do not include properties that start with "__" either - those are for internal use
            _.forEach(networkProperties, function(property) {

                if ((subNetworkId == property.subNetworkId) && !excludeSet.has(property.predicateString.toLowerCase())
                    && !property.predicateString.startsWith("__"))
                {
                    if (property.value.startsWith('http://') || property.value.startsWith('https://'))  {
                        var href = property.value;
                        property.value = '<a target="_blank" href="' + href + '">External Link</a>';

                    } else if (property.value.startsWith('www.')) {
                        href = property.value;
                        property.value = '<a target="_blank" href="http://' + href + '">External Link</a>';

                    };
                    result.push(property);
                };
            });

            return result;
        };
        
        factory.setNetworkProperty = function ( propertyName, propertyValue, propertyValueType ) {

            var propObject = { "predicateString": propertyName, "value": propertyValue,
                "dataType": (typeof propertyValueType !== 'undefined ') ? b : 'string'  };

            var networkProperties = currentNetworkSummary.properties;

            for( var i = 0; i < networkProperties.length; i++ ) {

                if ((networkProperties[i].predicateString.toLowerCase() === propertyName.toLowerCase())) {
                    networkProperties[i] = propObject;
                    return;
                }
                networkProperties.push(propObject);
            }
        }
        
        return factory;

    }
]);