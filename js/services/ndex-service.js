/**
 * Created by chenjing on 5/2/16.
 */


ndexServiceApp.factory('ndexServiceCX', ['cxNetworkUtils', 'config', 'ndexConfigs', 'ndexUtility', 'ndexHelper', '$http', '$q',
    function (cxNetworkUtils, config, ndexConfigs, ndexUtility, ndexHelper, $http, $q) {

        var factory = {};

        var ndexServerURI = config.ndexServerUri;

        factory.getNdexServerUri = function()
        {
            return ndexServerURI;
        };


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
                        var niceCX = cxNetworkUtils.rawCXtoNiceCX(network);
                        handler(niceCX);
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
            var config = ndexConfigs.getNetworkByEdgesConfig(networkId, 0, edgeLimit);
            config.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another psuedo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(config);
            var promise = {};

            promise.success = function (handler) {
                request.success(
                    function (network) {
                        var niceCX = cxNetworkUtils.convertNetworkInJSONToNiceCX(network);
                        handler(niceCX);
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
        
        
        
        return factory;

    }
]);