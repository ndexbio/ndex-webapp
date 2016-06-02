/**
 * Created by chenjing on 5/2/16.
 */


ndexServiceApp.factory('networkService', ['cxNetworkUtils', 'config', 'ndexConfigs', 'ndexUtility', 'ndexHelper', '$http', '$q',
    function (cxNetworkUtils, config, ndexConfigs, ndexUtility, ndexHelper, $http, $q) {

        var factory = {};
        
        var currentNetworkSummary = undefined;

        var ndexServerURI = config.ndexServerUri;

        var localNiceCXNetwork ;
        
        var localNiceCX;

        factory.getNdexServerUri = function()
        {
            return ndexServerURI;
        };


        factory.getNetworkSummaryFromNdex = function (networkId) {

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Grab the config for this request. We modify the config to allow for $http request aborts.
            // This may become standard in the client.
            var config = ndexConfigs.getNetworkConfig(networkId);
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


        factory.resetNetwork = function () {
            localNiceCX = localNiceCXNetwork;
        };

        factory.getNodeInfo = function (nodeId) {
            if (!localNiceCX) return null;

            var node = localNiceCX.nodes[nodeId];
            var nodeInfo = {'id': nodeId,
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

        factory.getCXNetwork = function (networkId) {

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Grab the config for this request. We modify the config to allow for $http request aborts.
            // This may become standard in the client.
            var config = ndexConfigs.getCompleteCXNetworkConfig(networkId);
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
                        localNiceCXNetwork = localNiceCX;
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



        factory.getSampleCXNetworkFromOldAPI = function (networkId, edgeLimit) {

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Grab the config for this request. We modify the config to allow for $http request aborts.
            // This may become standard in the client.
            var urlConfig = ndexConfigs.getNetworkByEdgesConfig(networkId, 0, edgeLimit);
            urlConfig.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another psuedo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(urlConfig);
            var promise = {};

            promise.success = function (handler) {
                request.success(
                    function (network) {
                        localNiceCX = cxNetworkUtils.convertNetworkInJSONToNiceCX(network);
                        localNiceCXNetwork = localNiceCX;
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


        factory.neighborhoodQueryFromOldAPI = function (networkId, searchString, searchDepth) {

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Grab the config for this request. We modify the config to allow for $http request aborts.
            // This may become standard in the client.
            var edgeLimit = config.networkQueryLimit;
            var urlConfig = ndexConfigs.getNetworkQueryConfig(networkId, searchString, searchDepth, edgeLimit, 0, edgeLimit);
            urlConfig.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another psuedo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(urlConfig);
            var promise = {};

            promise.success = function (handler) {
                request.success(
                    function (network) {
                        localNiceCX = cxNetworkUtils.convertNetworkInJSONToNiceCX(network);
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
         * Return the value of a given property in the network. I assume the perperty names a unique in network.
         * Property name is case insensitive.
         * @param networkProperties
         * @param propertyName
         * @returns {undefined}
         */

        factory.getNetworkProperty = function( propertyName)
        {
            if ('undefined'===typeof(currentNetworkSummary) || !propertyName) {
                return undefined;
            }

            var networkProperties = currentNetworkSummary.properties;
            for( var i = 0; i < networkProperties.length; i++ ) {

                if ((networkProperties[i].predicateString.toLowerCase() === propertyName.toLowerCase())) {
                    return networkProperties[i].value ;
                }
            }
            return undefined;
        }

        factory.getPropertiesExcluding = function (excludeList) {
            var result = [];
            var excludeSet = new Set();
            for ( var i = 0 ; i < excludeList.length ; i++ ) {
                excludeSet.add(excludeList[i].toLowerCase());
            }
            var networkProperties = currentNetworkSummary.properties;
            for( i = 0; i < networkProperties.length; i++ ) {
                if (!excludeSet.has(networkProperties[i].predicateString.toLowerCase()) ){
                    result.push(networkProperties[i]) ;
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