/**
 * Created by chenjing on 5/2/16.
 */


ndexServiceApp.factory('networkService', ['sharedProperties','cxNetworkUtils', 'ndexConfigs', 'ndexUtility', 'ndexHelper', 'provenanceService', 'ndexService','$http', '$q',
    function (sharedProperties, cxNetworkUtils, ndexConfigs, ndexUtility, ndexHelper, provenanceService, ndexService, $http, $q) {

        var factory = {};
        
        var currentNetworkSummary = undefined;

        var ndexServerURI = window.ndexSettings.ndexServerUri;

        //var localNiceCXNetwork ;  // the copy of CX network that we use for display
        
        var localNiceCX;   // the copy of CX network that are currently displayed. It can be a subnetwork from query

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

        factory.getNiceCX = function () {
            return localNiceCX;
        };

        factory.getOriginalCXNetwork = function () {
          return localNiceCXNetwork;
        };

        /*
        factory.resetNetwork = function () {
            localNiceCX = localNiceCXNetwork;
        };
        */

        factory.getLocalNetworkUUID = function() {
            return localNetworkUUID;
        };

        factory.setLocalNetworkUUID = function(networkUUID) {
            localNetworkUUID = networkUUID;
        };

        factory.getNodeInfo = function (nodeId) {
            if (!localNiceCX) return null;

            var node = localNiceCX.nodes[nodeId];
            
            var nodeInfo = {'id': nodeId,
                             '_cydefaultLabel': cxNetworkUtils.getDefaultNodeLabel(localNiceCX,node),
                            'n': node.n,
                            'r': node.r
                            };
            var counter =1;
            if ( localNiceCX.nodeAttributes && localNiceCX.nodeAttributes[nodeId]) {
                var nodeAttrs = localNiceCX.nodeAttributes[nodeId];
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
            if ( !localNiceCX) return null;
            return localNiceCX.nodeAttributes[nodeId];
        };
        
        factory.getEdgeAttributes = function (edgeId) { 
            if ( !localNiceCX) return null;
            
            return localNiceCX.edgeAttributes[edgeId];
        };
        
        factory.getNodeAttr = function (nodeId, propName ) {
            if ( localNiceCX && localNiceCX.nodeAttributes[nodeId] ) {
                return localNiceCX.nodeAttributes[nodeId][propName];
            }
            return null;
        };
        
        factory.getEdgeAttr = function ( edgeId, propName) {
           if ( localNiceCX && localNiceCX.edgeAttributes[edgeId]) {
               return localNiceCX.edgeAttributes[edgeId][propName];
           }
            
            return null;
        };
        
        factory.getEdgeInfo = function (edgeId) {
            if ( !localNiceCX) return null;

            var edge = localNiceCX.edges[edgeId];
            var edgeInfo = { 'id': edgeId,
                            s: edge.s,
                            t: edge.t,
                            i: edge.i};
            var counter;
            if ( localNiceCX.edgeAttributes && localNiceCX.edgeAttributes[edgeId]) {
                var edgeAttrs = localNiceCX.edgeAttributes[edgeId];
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

            if ( localNiceCX.edgeCitations && localNiceCX.edgeCitations[edgeId]) {
                var citationList = [];
                _.forEach(localNiceCX.edgeCitations[edgeId], function ( citationId) {
                    citationList.push ( localNiceCX.citations[citationId]);
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
                        localNiceCX = cxNetworkUtils.rawCXtoNiceCX(network);
                        //localNiceCXNetwork = localNiceCX;
                        handler(localNiceCX);
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
                        localNiceCX = cxNetworkUtils.rawCXtoNiceCX(network);
                        //localNiceCXNetwork = localNiceCX;
                        handler(localNiceCX);
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
            // Server API : Querey Network As CX
            // POST /search/network/{networkId}/query?accesskey={accesskey}

            var url = "/search/network/" + networkId + "/query";
            var postData = {
                searchString: searchString,
                searchDepth: searchDepth,
                edgeLimit: edgeLimit
            };

            if (accesskey) {
                url = url + "?accesskey=" + accesskey;
            };

            var urlConfig = ndexConfigs.getPostConfigV2(url, postData);

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();
            
            urlConfig.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another psuedo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(urlConfig);
            var promise = {};

            promise.success = function (handler) {
                request.success(
                    function (network) {
                        localNiceCX = cxNetworkUtils.rawCXtoNiceCX(network.data);
                        //localNiceCXNetwork = localNiceCX;
                        handler(localNiceCX);
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
                        localNiceCX = cxNetworkUtils.rawCXtoNiceCX(network.data);
                        handler(localNiceCX);
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


            for( i = 0; i < networkProperties.length; i++ ) {
                if ( subNetworkId == networkProperties[i].subNetworkId &&
                    !excludeSet.has(networkProperties[i].predicateString.toLowerCase()) &&
                    !networkProperties[i].predicateString.startsWith("__"))
                    // do not include properties that start with "__" either - those are for internal use
                {
                    result.push(networkProperties[i]);
                }
            }
            return result;
        }
        
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