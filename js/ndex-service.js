/*==============================================================================*
 *                               NDEx Angular Client Module
 *
 * Description : The module consists of services that define the Client. Our
 *               code will make use of the ndexService service to make high level
 *               calls to the rest server.
 *
 * Notes       : Will soon be investigating replacing code with angular-resource
 *
 *==============================================================================*/


//angularjs suggested function closure
(function() {

    var ndexServiceApp = angular.module('ndexServiceApp', []);

    /****************************************************************************
     * NDEx HTTP Service
     * description  : $http calls to rest server. can do pre-processing here
     * dependencies : $http and ndexConfigs
     * return       : promise with success and error methods
     ****************************************************************************/
    ndexServiceApp.factory('ndexService',['ndexConfigs', 'ndexUtility', 'ndexHelper', '$http', '$q', function(ndexConfigs, ndexUtility, ndexHelper, $http, $q) {
        // define and initialize factory object
        var factory = {};

        /*---------------------------------------------------------------------*
         * Users
         *---------------------------------------------------------------------*/
        //
        //signIn
        //
        factory.signIn = function(accountName, password) {
            ndexUtility.clearUserCredentials();
            console.log("submitting user credentials for user: " + accountName);
            var config = ndexConfigs.getSubmitUserCredentialsConfig(accountName, password);
            return $http(config).success(function(userData){
                ndexUtility.setUserCredentials(userData, password);
                return {success: function(handler){
                    handler(userData);
                }
                }
            }).error(function(error){
                return {error: function(handler){
                    handler(error);
                }
                }
            });
        };

        //
        //signOut
        //
        factory.signOut = function() {
            ndexUtility.clearUserCredentials();
        };

        //
        //getUserQuery
        //
        factory.getUser = function(userId) {
            console.log("retrieving user with id " + userId);
            var config = ndexConfigs.getUserConfig(userId);
            return $http(config);
        };


        /*---------------------------------------------------------------------*
         * Networks
         *---------------------------------------------------------------------*/

        // 
        // getNetwork
        // 
        factory.getNetwork = function(networkId) {
            console.log("retrieving network " + networkId);

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Grab the config for this request. We modify the config to allow for $http request aborts.
            // This may become standard in the client.
            var config = ndexConfigs.getNetworkConfig(networkId);
            config.timeout = deferredAbort.promise;

            // We keep a reference ot the http-promise. This way we can augment it with an abort method.
            var request = $http(config);

            // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
            request.abort = function(){
                deferredAbort.resolve();
            };

            // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
            request.finally(
                function() {
                    request.abort = angular.noop; // angular.noop is an empty function
                    deferredAbort = request = null;
                }
            );

            return request;
        };

        // 
        // getNetworkByEdges
        // 
        // Get a block of edges
        factory.getNetworkByEdges = function(networkId, skipBlocks, blockSize) {
            console.log("retrieving edges (" + skipBlocks + ", " + (skipBlocks + blockSize) + ")");

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Grab the config for this request. We modify the config to allow for $http request aborts.
            // This may become standard in the client.
            var config = ndexConfigs.getNetworkByEdgesConfig(networkId, skipBlocks, blockSize);
            config.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another psuedo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(config);
            var promise = {};

            promise.success = function(handler) {
                request.success(
                    function(network) {
                        ndexHelper.updateNodeLabels(network);
                        ndexHelper.updateTermLabels(network);
                        ndexUtility.setNetwork(network); // consider removing, this is for future possibility of saving networks
                        handler(network);
                    }
                );
                return promise;
            };

            promise.error = function(handler) {
                request.then(
                    null,
                    function(error) {
                        handler(error);
                    }
                );
                return promise;
            };

            // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
            promise.abort = function() {
                deferredAbort.resolve();
            };

            // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
            promise.finally = function(){
                request.finally(
                    function() {
                        promise.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = promise = null;
                    }
                );
            };

            return promise;
        };

        // 
        // findNetworks
        // 
        // Simple network search
        factory.findNetworks = function(searchString, accountName, skipBlocks, blockSize) {
            console.log("searching for networks");

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Grab the config for this request, the last two parameters (skip blocks, block size) are hard coded in
            // the first pass. We modify the config to allow for $http request aborts. This may become standard in
            // the client.
            var config = ndexConfigs.getNetworkSearchConfig(searchString, accountName, skipBlocks, blockSize);
            config.timeout = deferredAbort.promise;

            // We keep a reference ot the http-promise. This way we can augment it with an abort method.
            var request = $http(config);

            // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
            request.abort = function(){
                deferredAbort.resolve();
            };

            // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
            request.finally(
                function() {
                    request.abort = angular.noop; // angular.noop is an empty function
                    deferredAbort = request = null;
                }
            );

            return request;
        };

        // 
        // queryNetwork
        // 
        // search the network for a subnetwork via search terms and depth
        factory.queryNetwork = function(networkId, terms, searchDepth) {
            console.log("searching for subnetworks");

            // Split the string into an array of strings for the $http request
            terms = terms.split(/[ ,]+/);

            // The $http timeout property takes a deferred value that can abort AJAX request
            var deferredAbort = $q.defer();

            // Grab the config for this request, the last two parameters (skip blocks, block size) are hard coded in
            // the first pass. We modify the config to allow for $http request aborts. This may become standard in
            // the client.
            var config = ndexConfigs.getNetworkQueryConfig(networkId, terms, searchDepth, 0, 500);
            config.timeout = deferredAbort.promise;

            // We want to perform some operations on the response from the $http request. We can simply wrap the
            // returned $http-promise around another psuedo promise. This way we can unwrap the response and return the
            // preprocessed data. Additionally, the wrapper allows us to augment the return promise with an abort method.
            var request = $http(config);
            var promise = {};

            promise.success = function(handler) {
                request.success(
                    function(network) {
                        ndexHelper.updateNodeLabels(network);
                        ndexHelper.updateTermLabels(network);
                        ndexUtility.setNetwork(network); // consider removing, this is for future possibility of saving networks
                        handler(network);
                    }
                );
                return promise;
            };

            promise.error = function(handler) {
                request.then(
                    null,
                    function(error) {
                        handler(error);
                    }
                );
                return promise;
            };

            // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
            promise.abort = function() {
                deferredAbort.resolve();
            };

            // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
            promise.finally = function(){
                request.finally(
                    function() {
                        promise.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = promise = null;
                    }
                );
            };

            return promise;
        };

        // return factory object
        return factory;
    }]);


    /****************************************************************************
     * NDEx Utility Service
     ****************************************************************************/
    ndexServiceApp.factory('ndexUtility', function() {

        var factory = {};

        factory.networks = []; //revise: meant for saving multiple networks


        /*-----------------------------------------------------------------------*
         * user credentials and ID
         *-----------------------------------------------------------------------*/
        factory.clearUserCredentials = function () {
            if (this.checkLocalStorage()){
                delete localStorage.accountName;
                delete localStorage.password;
                delete localStorage.userId;
            }
            //if (localStorage["Groups Search"]) delete localStorage["Groups Search"];
            //if (localStorage["Users Search"]) delete localStorage["Users Search"];
            //if (localStorage["Networks Search"]) delete localStorage["Networks Search"];

        };

        factory.checkLocalStorage = function(){
            if(!localStorage) return false;
            return true;
        };
        factory.setUserCredentials = function(userData, password){
            localStorage.accountName = userData.accountName;
            localStorage.password = password;
            localStorage.userId = userData.externalId;
        };

        /*factory.getUserId = function(){
            return localStorage.userId;
        };*/

        factory.getUserCredentials = function() {
            if (factory.checkLocalStorage()) {
                if (localStorage.accountName) {
                    var userData = {accountName: localStorage.accountName,
                        userId: localStorage.userId,
                        token: localStorage.password
                    };
                    return userData;

                }
            }
        };

        /*-----------------------------------------------------------------------*
         * networks
         *-----------------------------------------------------------------------*/
        factory.addNetwork = function(network){
            factory.networks.push(network);

            $.each(network.terms, function(termId, term){
                term.network = network;
            });
            $.each(network.nodes, function(nodeId, node){
                node.network = network;
            });
            $.each(network.edges, function(edgeId, edge){
                edge.network = network;
            });
        };

        factory.setNetwork = function(network){
            factory.networks = [];
            factory.addNetwork(network);
        };

        factory.getNetworkId = function(network){
            return factory.networks.indexOf(network);
        };

        factory.removeNetwork = function(network){
            factory.networks.remove(factory.networks.indexOf(network));
        };

        return factory;
    });

    /****************************************************************************
     * $http configuration service
     ****************************************************************************/
    ndexServiceApp.factory('ndexConfigs', function() {
        var factory = {};

        //factory.NdexServerURI = "http://test.ndexbio.org/rest/ndexbio-rest";
        factory.NdexServerURI = "http://localhost:8080/ndexbio-rest";

        /*---------------------------------------------------------------------*
         * GET request configuration
         *---------------------------------------------------------------------*/
        factory.getGetConfig = function(url, queryArgs){
            var config ={
                method: 'GET',
                url: factory.NdexServerURI + url,
                headers: {
                    Authorization: "Basic " + factory.getEncodedUser()
                }
            };
            if (queryArgs){
                config.data =  JSON.stringify(queryArgs);
            }
            return config;
        };

        /*---------------------------------------------------------------------*
         * POST request configuration
         *---------------------------------------------------------------------*/
        factory.getPostConfig = function(url, postData){
            var config ={
                method: 'POST',
                url: factory.NdexServerURI + url,
                data: JSON.stringify(postData),
                headers: {
                    Authorization: "Basic " + factory.getEncodedUser()
                }
            };
            return config;
        };

        /*---------------------------------------------------------------------*
         * Returns the user's credentials as required by Basic Authentication base64
         * encoded.
         *---------------------------------------------------------------------*/
        factory.getEncodedUser = function () {
            if (localStorage.accountName)
                return btoa(localStorage.accountName + ":" + localStorage.password);
            else
                return null;
        };

        /*---------------------------------------------------------------------*
         * Users
         *---------------------------------------------------------------------*/
        factory.getSubmitUserCredentialsConfig = function (accountName, password){
            var url = "/user/authenticate/" + encodeURIComponent(accountName) + "/" + encodeURIComponent(password);
            return this.getGetConfig(url);
        };

        factory.getUserConfig = function(userId){
            var url = "/user/" + userId;
            return this.getGetConfig(url, null);
        };
        /*---------------------------------------------------------------------*
         * Networks
         *---------------------------------------------------------------------*/

        factory.getNetworkConfig = function(networkId){
            // networks/{networkId}
            var url = "/network/" + networkId ;
            return this.getGetConfig(url, null);
        };

        factory.getNetworkByEdgesConfig = function(networkId, skipBlocks, blockSize){
            // network/{networkId}/edge/{skip}/{top}
            // GET to NetworkAService
            var url = "/network/" + networkId + "/edge/asNetwork/" + skipBlocks + "/" + blockSize;
            return this.getGetConfig(url, null);
        };

        factory.getNetworkSearchConfig = function(searchString, accountName, skipBlocks, blockSize){
            var url = "/network/search/" + skipBlocks.toString() + "/" + blockSize.toString();
            var postData = {
                searchString: searchString,
                accountName: accountName
            };
            return this.getPostConfig(url, postData);
        };

        factory.getNetworkQueryConfig = function(networkId, startingTerms, searchDepth, skipBlocks, blockSize){
            // POST to NetworkAService
            console.log("searchType = " + "NEIGHBORHOOD");
            console.log("searchDepth = " + searchDepth);
            /*for (index in startingTerms){
                console.log("searchTerm " + index + " : " + startingTerms[index]);
            }*/
            var url = "/network/" + networkId + "/asNetwork/query/";
            var postData = {
                searchString: startingTerms,
                searchDepth: searchDepth
            };
            return this.getPostConfig(url, postData);
        };

        return factory;

    });

    /****************************************************************************
     * NDEx Helper Service
     ****************************************************************************/
    ndexServiceApp.factory('ndexHelper', function() {
        var factory = {};

        /*-----------------------------------------------------------------------*
         * create a nice label for a node
         *-----------------------------------------------------------------------*/
        factory.updateNodeLabels = function(network){
            network.nodeLabelMap = [];
            $.each(network.nodes, function (id, node){
                network.nodeLabelMap[id] = factory.getNodeLabel(node, network) ;
            });
        };

        factory.getNodeLabel = function(node, network) {
            //if (!network) network = factory.getNodeNetwork(node);
            if ("name" in node && node.name && node.name != ""){
                //console.log(node.name);
                return node.name;}
            else if ("represents" in node && node.represents && network.terms[node.represents])
                return factory.getTermLabel(network.terms[node.represents], network);
            else
                return "unknown"
        };

        factory.getNodeNetwork = function(node) {
            //TODO
            return {};
        };

        factory.updateTermLabels = function(network) {
            network.termLabelMap = [];
            var count = 0;
            $.each(network.terms, function (id, term){
                if (term.termType === "Base") {
                    network.termLabelMap[count] = factory.getTermBase(term, network);
                    count++;
                }
            });
        };

        factory.getTermBase = function(term, network) {
            if (term.namespace) {
                var namespace = network.namespaces[term.namespace];

                if (!namespace || namespace.prefix === "LOCAL")
                    return {prefix: 'none', name: term.name};
                else if (!namespace.prefix)
                    return {prefix: '', name: term.name};
                else
                    return {prefix: namespace.prefix, name: term.name};
            }
            else {
                return term.name;
            }

        };

        /*-----------------------------------------------------------------------*
         * Builds a term label based on the term type; labels rely on Base Terms,
         * which have names and namespaces. Function Terms can refer to other
         * Function Terms or Base Terms, and as such must be traversed until a Base
         * Term is reached.
         *-----------------------------------------------------------------------*/
        factory.getTermLabel = function(term, network) {
            //if (!network) network = factory.getTermNetwork(term);
            if (term.termType === "Base") {
                if (term.namespace) {
                    var namespace = network.namespaces[term.namespace];

                    if (!namespace || namespace.prefix === "LOCAL")
                        return term.name;
                    else if (!namespace.prefix)
                        return namespace.uri + term.name;
                    else
                        return namespace.prefix + ":" + term.name;
                }
                else
                    return term.name;
            }
            else if (term.termType === "Function") {
                var functionTerm = network.terms[term.termFunction];
                if (!functionTerm) {
                    console.log("no functionTerm by id " + term.termFunction);
                    return;
                }

                var functionLabel = factory.getTermLabel(functionTerm, network);
                functionLabel = factory.lookupFunctionAbbreviation(functionLabel);

                var sortedParameters = factory.getDictionaryKeysSorted(term.parameters);
                var parameterList = [];

                for (var parameterIndex = 0; parameterIndex < sortedParameters.length; parameterIndex++) {
                    var parameterId = term.parameters[sortedParameters[parameterIndex]];
                    var parameterTerm = network.terms[parameterId];

                    if (parameterTerm)
                        var parameterLabel = factory.getTermLabel(parameterTerm, network);
                    else
                        console.log("no parameterTerm by id " + parameterId);

                    parameterList.push(parameterLabel);
                }

                return functionLabel + "(" + parameterList.join(", ") + ")";
            }
            else
                return "Unknown";
        };

        factory.getTermNetwork = function(term) {
            //TODO
            return {};
        }


        /*-----------------------------------------------------------------------*
         * Returns the keys of a dictionary as a sorted array.
         *-----------------------------------------------------------------------*/
        factory.getDictionaryKeysSorted = function(dictionary)
        {
            var keys = [];
            for(var key in dictionary)
            {
                if(dictionary.hasOwnProperty(key))
                    keys.push(key);
            }

            return keys.sort();
        };

        /*-----------------------------------------------------------------------*
         * Looks-up abbreviations for term functions.
         *-----------------------------------------------------------------------*/
        factory.lookupFunctionAbbreviation = function(functionLabel) {
            var fl = functionLabel.toLowerCase();
            if (fl.match(/^bel:/)) fl = fl.replace(/^bel:/, '');
            switch (fl) {
                case "abundance":
                    return "a";
                case "biological_process":
                    return "bp";
                case "catalytic_activity":
                    return "cat";
                case "complex_abundance":
                    return "complex";
                case "pathology":
                    return "path";
                case "peptidase_activity":
                    return "pep";
                case "protein_abundance":
                    return "p";
                case "rna_abundance":
                    return "r";
                case "protein_modification":
                    return "pmod";
                case "transcriptional_activity":
                    return "trans";
                case "molecular_activity":
                    return "act";
                case "degradation":
                    return "deg";
                case "kinase_activity":
                    return "kin";
                default:
                    return fl;
            }
        };

        return factory;
    });

}) (); //end function closure