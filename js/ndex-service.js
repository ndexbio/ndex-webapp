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
(function () {

    var ndexServiceApp = angular.module('ndexServiceApp', []);

    //ndexServiceApp.config(['$httpProvider', 'ndexConfigs', function($httpProvider, ndexConfigs) {
     //  $httpProvider.defaults.headers.common['Authorization'] = ndexConfigs.getEncodedUser();
    //}]);

    /****************************************************************************
     * NDEx HTTP Service
     * description  : $http calls to rest server. can do pre-processing here
     * dependencies : $http and ndexConfigs
     * return       : promise with success and error methods
     ****************************************************************************/
    ndexServiceApp.factory('ndexService',
        ['ndexConfigs', 'ndexUtility', 'ndexHelper', '$http', '$q', '$resource',
            function (ndexConfigs, ndexUtility, ndexHelper, $http, $q, $resource) {
                // define and initialize factory object
                var factory = {};

                var ndexServerURI = "http://localhost:8080/ndexbio-rest";
                // This convention is useful, but we may later allow a
                // site configuration to explicitly specify a different host
                if (location.hostname.toLowerCase() != "localhost")
                    ndexServerURI=  "http://" + location.host + "/rest/ndexbio-rest";



                factory.getNetworkUploadURI = function () {
                    return ndexServerURI + "/network/upload";
                }

                /*---------------------------------------------------------------------*
                 * Users
                 *---------------------------------------------------------------------*/
                //
                //signIn
                //
                factory.signIn = function (accountName, password) {
                    ndexUtility.clearUserCredentials();
                    console.log("submitting user credentials for user: " + accountName);
                    var config = ndexConfigs.getSubmitUserCredentialsConfig(accountName, password);
                    return $http(config).success(function (userData) {
                        ndexUtility.setUserCredentials(userData.accountName, userData.externalId, password);
                        return {success: function (handler) {
                            handler(userData);
                        }
                        }
                    }).error(function (error) {
                            return {error: function (handler) {
                                handler(error);
                            }
                            }
                        });
                };

                //
                //signOut
                //
                factory.signOut = function () {
                    ndexUtility.clearUserCredentials();
                };

                //
                //getUserQuery
                //
                factory.getUser = function (userId) {
                    console.log("retrieving user with id " + userId);
                    var config = ndexConfigs.getUserConfig(userId);
                    return $http(config);
                };

                var UserResource = $resource(ndexServerURI + '/user/:identifier:action/:subResource/:permissions:subId:status/:skipBlocks/:blockSize',
                    //parmaDefaults
                    {
                        identifier: '@identifier',
                        action: '@action',
                        subResource: '@subResource',
                        permissions: '@permissions',
                        status: '@status',
                        subId: '@subId',
                        skipBlocks: '@skipBlocks',
                        blockSize: '@blockSize'
                    },
                    //actions
                    {
                        search: {
                            method: 'POST',
                            params: {
                                action: 'search'
                            },
                            isArray: true
                        },
                        createUser: {
                            method: 'POST',
                            interceptor: {
                                response: function (data) {
                                    ndexUtility.setUserInfo(data.data.accountName, data.data.externalId);
                                    return data.data;
                                },
                                responseError: function (data) {
                                    ndexUtility.clearUserCredentials();
                                    return data;
                                }
                            }
                        },
                        getMembership: {
                            method: 'GET',
                            params: {
                                subResource: 'membership'
                            },
                            interceptor: {
                                response: function(data) {
                                    return data.data;
                                }
                            }
                        }
                    })

                factory.editUserProfile = function(user, successHandler, errorHandler) {
                    user.accountType = 'User';
                    var externalId = ndexUtility.getLoggedInUserExternalId();
                    $http.defaults.headers.common['Authorization'] = ndexConfigs.getEncodedUser();
                    UserResource.save({identifier: externalId}, user, successHandler, errorHandler);
                }

                factory.getMyMembership = function(resourceId, successHandler, errorHandler) {
                    var externalId = ndexUtility.getLoggedInUserExternalId();
                    UserResource.getMembership({identifier: externalId, subId: resourceId}, successHandler, errorHandler);
                };

                factory.searchUsers = function (queryObject, skipBlocks, blockSize, successHandler, errorHandler) {
                    console.log('searching for users with params: \n    ' + JSON.stringify(queryObject));
                    if (queryObject.searchString == null)
                        queryObject.searchString = '';
                    UserResource.search({
                        'skipBlocks': skipBlocks,
                        'blockSize': blockSize},
                        queryObject,
                        successHandler,
                        errorHandler);
                }

                factory.createUser = function (user, successHandler, errorHandler) {
                    console.log('creating user with params:\n    ' + JSON.stringify(user));
                    user.accountType = 'User';
                    ndexUtility.setUserAuthToken(user.password);

                    UserResource.createUser({}, user, successHandler, errorHandler);
                }

                // /user/{userUUID}/task/{status}/{skipBlocks}/{blockSize}
                factory.getUserTasks = function (userUUID, taskStatus, skipBlocks, blockSize, successHandler, errorHandler) {
                    if (!taskStatus){
                        taskStatus = "ALL";
                    }
                    console.log("retrieving tasks for user with id " + userUUID + " status = " + taskStatus);


                    $http.defaults.headers.common['Authorization'] = ndexConfigs.getEncodedUser();
                    UserResource.query({
                            'identifier': userUUID,
                            'skipBlocks': skipBlocks,
                            'blockSize': blockSize,
                            'subResource': "task",
                            'status': taskStatus
                        },
                        successHandler,
                        errorHandler)
                }

                /*---------------------------------------------------------------------*
                 * Groups
                 *---------------------------------------------------------------------*/

                var GroupResource = $resource(ndexServerURI + '/group/:identifier:action/:subResource/:permissionType:subId/:skipBlocks/:blockSize',
                    //paramDefaults
                    {
                        identifier: '@identifier',
                        action: '@action',
                        subResource: '@subResource',
                        permissionType: '@permissionType',
                        subId: '@subId',
                        skipBlocks: '@skipBlocks',
                        blockSize: '@blockSize'
                    },
                    //actions
                    {
                        search: {
                            method: 'POST',
                            params: {
                                action: 'search'
                            },
                            isArray: true
                        },
                        updateMembership: {
                            method: 'POST',
                            params: {
                                subResource: 'member'
                            }
                        }
                    }
                );

                factory.updateGroupMember = function(membership, successHandler, errorHandler) {
                    membership.accountType='Group';
                    membership.type = 'Membership'
                    console.log(membership);
                    $http.defaults.headers.common['Authorization'] = ndexConfigs.getEncodedUser();
                    GroupResource.updateMembership({identifier:membership.resourceUUID}, membership, successHandler, errorHandler);
                }

                factory.editGroupProfile = function(group, successHandler, errorHandler) {
                    group.accountType = 'Group';
                    $http.defaults.headers.common['Authorization'] = ndexConfigs.getEncodedUser();
                    GroupResource.save({identifier: group.externalId}, group, successHandler, errorHandler);
                }

                factory.getGroup = function (groupUUID, successHandler, errorHandler) {
                    console.log("retrieving group with UUID " + groupUUID);
                    GroupResource.get({'identifier': groupUUID}, successHandler, errorHandler);
                };

                factory.createGroup = function (group, successHandler, errorHandler) {
                    // be sure accountType is set
                    group.accountType = "Group";
                    // ensure authorization header is set.
                    // May become superfluous if we update headers on sign-in, sign-out, initialization
                    $http.defaults.headers.common['Authorization'] = ndexConfigs.getEncodedUser();

                    GroupResource.save({}, group, successHandler, errorHandler);
                };

                factory.deleteGroup = function (externalId, successHandler, errorHandler) {
                    console.log("deleting group with UUID " + groupUUID);
                    GroupResource.delete({'identifier': externalId}, successHandler, errorHandler);
                }

                factory.searchGroups = function (queryObject, skipBlocks, blockSize, successHandler, errorHandler) {
                    //an empty js object will cause the request to be canceled
                    if (queryObject.searchString == null)
                        queryObject.searchString = '';
                    console.log('searching for groups');
                    GroupResource.search({'skipBlocks': skipBlocks, 'blockSize': blockSize}, queryObject, successHandler, errorHandler);
                }

                /*---------------------------------------------------------------------*
                 * Tasks
                 *
                 * 	GET	    /task/api		RestResource[]
                 *  GET	    /task/{taskUUID}		Task
                 *  POST	/task/{taskUUID}	Task
                 *  POST	/task	Task	UUID
                 *  DELETE	/task/{taskUUID}
                 *  PUT	    /task/{taskUUID}/status/{status}	Task
                 *---------------------------------------------------------------------*/

                var TaskResource = $resource(ndexServerURI + '/task/:taskId/:action/:status/',
                    //paramDefaults
                    {
                        taskId: '@taskId',
                        status: '@status'
                    },
                    //actions
                    {
                        setStatus: {
                            method: 'PUT',
                            params: {
                                action: 'status'
                            }
                        }
                    }
                );

                factory.getTask = function (taksUUID, successHandler, errorHandler) {
                    console.log("retrieving task with UUID " + taskUUID);
                    TaskResource.get({'taskId': taskUUID}, successHandler, errorHandler);
                };

                factory.createTask = function (task, successHandler, errorHandler) {
                    console.log("creating task with task = " + task.taskType);

                    TaskResource.save({}, task, successHandler, errorHandler);
                };

                factory.deleteTask = function (taskUUID, successHandler, errorHandler) {
                    console.log("deleting task with UUID " + taskUUID);
                    TaskResource.delete({'taskId': taskUUID}, successHandler, errorHandler);
                };

                factory.setTaskStatus = function (taskUUID, status, successHandler, errorHandler) {

                    console.log('updating status to ' + status + " for task " + taskUUID);
                    TaskResource.setStatus(
                        {
                            'taskId': taskUUID,
                            'status': status
                        },
                        {},
                        successHandler,
                        errorHandler
                    );
                };

                /*---------------------------------------------------------------------*
                 * Networks
                 *---------------------------------------------------------------------*/

                //
                // getNetwork
                //
                factory.getNetwork = function (networkId) {
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
                    request.abort = function () {
                        deferredAbort.resolve();
                    };

                    // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
                    request.finally(
                        function () {
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
                factory.getNetworkByEdges = function (networkId, skipBlocks, blockSize) {
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

                    promise.success = function (handler) {
                        request.success(
                            function (network) {
                                ndexUtility.setNetwork(network);
                                ndexHelper.updateNodeLabels(network);
                                //ndexHelper.updateTermLabels(network);
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

                //
                // findNetworks
                //
                // Simple network search
                factory.findNetworks = function (searchString, accountName, permission, includeGroups, skipBlocks, blockSize) {
                    console.log("searching for networks");

                    // The $http timeout property takes a deferred value that can abort AJAX request
                    var deferredAbort = $q.defer();

                    // Grab the config for this request, the last two parameters (skip blocks, block size) are hard coded in
                    // the first pass. We modify the config to allow for $http request aborts. This may become standard in
                    // the client.
                    var config = ndexConfigs.getNetworkSearchConfig(searchString, accountName, permission, includeGroups, skipBlocks, blockSize);
                    config.timeout = deferredAbort.promise;

                    // We keep a reference ot the http-promise. This way we can augment it with an abort method.
                    var request = $http(config);

                    // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
                    request.abort = function () {
                        deferredAbort.resolve();
                    };

                    // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
                    request.finally(
                        function () {
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
                factory.queryNetwork = function (networkId, terms, searchDepth) {
                    console.log("searching for subnetworks");

                    // REMOVED: we pass a simple string.  It is processed on the server, not here on the client
                    // Split the string into an array of strings for the $http request
                    // terms = terms.split(/[ ,]+/);

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

                    promise.success = function (handler) {
                        request.success(
                            function (network) {
                                ndexUtility.setNetwork(network);
                                ndexHelper.updateNodeLabels(network);
                                ndexHelper.updateTermLabels(network);
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

                // return factory object
                return factory;
            }]);


    /****************************************************************************
     * NDEx Utility Service
     ****************************************************************************/
    ndexServiceApp.factory('ndexUtility', function () {

        var factory = {};

        factory.networks = []; //revise: meant for saving multiple networks


        /*-----------------------------------------------------------------------*
         * user credentials and ID
         *-----------------------------------------------------------------------*/
        factory.clearUserCredentials = function () {
            localStorage.setItem('loggedInUser', null);

        };

        factory.checkLocalStorage = function () {
            if (!localStorage) return false;
            return true;
        };

        factory.setUserCredentials = function (accountName, externalId, token) {
            var loggedInUser = {};
            loggedInUser.accountName = accountName;
            loggedInUser.token = token;
            loggedInUser.externalId = externalId;
            localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        };


        factory.getUserCredentials = function () {
            if (factory.checkLocalStorage()) {
                if (localStorage.loggedInUser) {
                    var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
                    var userData = {
                        accountName: loggedInUser.accountName,
                        externalId: loggedInUser.externalId,
                        token: loggedInUser.token
                    };
                    return userData;

                }
            }
        };

        factory.setUserAuthToken = function(token) {
            var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if(!loggedInUser) loggedInUser = {};
            loggedInUser.token = token;
            localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        };

        factory.setUserInfo = function(accountName, externalId) {
            var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if(!loggedInUser) loggedInUser = {};
            loggedInUser.accountName = accountName;
            loggedInUser.externalId = externalId;
            localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
        };

        factory.getLoggedInUserExternalId = function() {
            var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if(!loggedInUser) loggedInUser = {};
            return loggedInUser.externalId;
        };

        factory.getLoggedInUserAccountName = function() {
            var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if(!loggedInUser) loggedInUser = {};
            return loggedInUser.accountName;
        };

        factory.getLoggedInUserAuthToken = function() {
            var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
            if(!loggedInUser) loggedInUser = {};
            return loggedInUser.token;
        };

        /*-----------------------------------------------------------------------*
         * networks
         *-----------------------------------------------------------------------*/
        factory.addNetwork = function (network) {
            factory.networks.push(network);
            network.terms = {};

            $.each(network.baseTerms, function (termId, term) {
                term.network = network;
                network.terms[termId] = term;
            });
            $.each(network.functionTerms, function (termId, term) {
                term.network = network;
                network.terms[termId] = term;
            });
            $.each(network.reifiedEdgeTerms, function (termId, term) {
                term.network = network;
                network.terms[termId] = term;
            });
            $.each(network.nodes, function (nodeId, node) {
                node.network = network;
            });
            $.each(network.edges, function (edgeId, edge) {
                edge.network = network;
            });
            network.nodeCount = Object.keys(network.nodes).length;
            network.edgeCount = Object.keys(network.edges).length;
        };

        factory.setNetwork = function (network) {
            factory.networks = [];
            factory.addNetwork(network);
        };

        factory.getNetworkId = function (network) {
            return factory.networks.indexOf(network);
        };

        factory.removeNetwork = function (network) {
            factory.networks.remove(factory.networks.indexOf(network));
        };

        return factory;
    });

    /****************************************************************************
     * $http configuration service
     ****************************************************************************/
    ndexServiceApp.factory('ndexConfigs', function (ndexUtility) {
        var factory = {};

        //factory.NdexServerURI = "http://test.ndexbio.org/rest/ndexbio-rest";
        factory.NdexServerURI = "http://localhost:8080/ndexbio-rest";

        /*---------------------------------------------------------------------*
         * GET request configuration
         *---------------------------------------------------------------------*/
        factory.getGetConfig = function (url, queryArgs) {
            var config = {
                method: 'GET',
                url: factory.NdexServerURI + url,
                headers: {
                    Authorization: "Basic " + factory.getEncodedUser()
                }
            };
            if (queryArgs) {
                config.data = JSON.stringify(queryArgs);
            }
            return config;
        };

        /*---------------------------------------------------------------------*
         * POST request configuration
         *---------------------------------------------------------------------*/
        factory.getPostConfig = function (url, postData) {
            var config = {
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
            if (ndexUtility.getLoggedInUserAccountName)
                return btoa(ndexUtility.getLoggedInUserAccountName() + ":" + ndexUtility.getLoggedInUserAuthToken());
            else
                return null;
        };

        /*---------------------------------------------------------------------*
         * Users
         *---------------------------------------------------------------------*/
        factory.getSubmitUserCredentialsConfig = function (accountName, password) {
            var url = "/user/authenticate/" + encodeURIComponent(accountName) + "/" + encodeURIComponent(password);
            return this.getGetConfig(url);
        };

        factory.getUserConfig = function (userId) {
            var url = "/user/" + userId;
            return this.getGetConfig(url, null);
        };
        /*---------------------------------------------------------------------*
         * Networks
         *---------------------------------------------------------------------*/

        factory.getNetworkConfig = function (networkId) {
            // networks/{networkId}
            var url = "/network/" + networkId;
            return this.getGetConfig(url, null);
        };

        factory.getNetworkByEdgesConfig = function (networkId, skipBlocks, blockSize) {
            // network/{networkId}/edge/{skip}/{top}
            // GET to NetworkAService
            var url = "/network/" + networkId + "/edge/asNetwork/" + skipBlocks + "/" + blockSize;
            return this.getGetConfig(url, null);
        };

        factory.getNetworkSearchConfig = function (searchString, accountName, permission, includeGroups, skipBlocks, blockSize) {
            var url = "/network/search/" + skipBlocks.toString() + "/" + blockSize.toString();
            var postData = {
                searchString: searchString,
                accountName: accountName
            };

            if (permission) postData.permission = permission;
            if (includeGroups) postData.includeGroups = includeGroups;

            return this.getPostConfig(url, postData);
        };

        factory.getNetworkQueryConfig = function (networkId, startingTerms, searchDepth, skipBlocks, blockSize) {
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
    ndexServiceApp.factory('ndexHelper', function () {
        var factory = {};

        /*-----------------------------------------------------------------------*
         * create a nice label for a node
         *-----------------------------------------------------------------------*/
        factory.updateNodeLabels = function (network) {
            network.nodeLabelMap = [];
            $.each(network.nodes, function (id, node) {
                network.nodeLabelMap[id] = factory.getNodeLabel(node, network);
            });
        };

        factory.getNodeLabel = function (node, network) {
            //if (!network) network = factory.getNodeNetwork(node);
            if ("name" in node && node.name && node.name != "") {
                //console.log(node.name);
                return node.name;
            }
            else if ("represents" in node && node.represents && network.terms[node.represents])
                return factory.getTermLabel(network.terms[node.represents], network);
            else
                return "unknown"
        };

        factory.getNodeNetwork = function (node) {
            //TODO
            return {};
        };

        factory.updateTermLabels = function (network) {
            network.termLabelMap = [];
            var count = 0;
            $.each(network.terms, function (id, term) {
                if (term.termType === "Base") {
                    network.termLabelMap[count] = factory.getTermBase(term, network);
                    count++;
                }
            });
        };

        factory.getTermBase = function (term, network) {
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
        factory.getTermLabel = function (term, network) {
            //if (!network) network = factory.getTermNetwork(term);
            if (term.termType === "BaseTerm") {
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
            else if (term.termType === "FunctionTerm") {
                var functionTerm = network.terms[term.functionTermId];
                if (!functionTerm) {
                    console.log("no functionTerm by id " + term.functionTermId);
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
                return "Unknown Term Type";
        };

        factory.getTermNetwork = function (term) {
            //TODO
            return {};
        }


        /*-----------------------------------------------------------------------*
         * Returns the keys of a dictionary as a sorted array.
         *-----------------------------------------------------------------------*/
        factory.getDictionaryKeysSorted = function (dictionary) {
            var keys = [];
            for (var key in dictionary) {
                if (dictionary.hasOwnProperty(key))
                    keys.push(key);
            }

            return keys.sort();
        };

        /*-----------------------------------------------------------------------*
         * Looks-up abbreviations for term functions.
         *-----------------------------------------------------------------------*/
        factory.lookupFunctionAbbreviation = function (functionLabel) {
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

    /****************************************************************************
     * NDEx Cytoscape Service
     ****************************************************************************/
//     ndexServiceApp.factory('ndexService', ['ndexConfigs', 'ndexUtility', 'ndexHelper', '$http', '$q', function (ndexConfigs, ndexUtility, ndexHelper, $http, $q) {

    ndexServiceApp.factory('cytoscapeService', ['ndexService', 'ndexHelper', '$q', function (ndexService, ndexHelper, $q) {
        var factory = {};
        var cy;

        /*-----------------------------------------------------------------------*
         * initialize the cytoscape instance
         *-----------------------------------------------------------------------*/
        factory.initCyGraph = function () {
            var deferred = $q.defer();

            // elements
            var eles = [];

            $(function () { // on dom ready

                cy = cytoscape({
                    container: $('#canvas')[0],

                    style: cytoscape.stylesheet()
                        .selector('node')
                        .css({
                            'content': 'data(name)',
                            'height': 10,
                            'width': 10,
                            'text-valign': 'center',
                            'background-color': 'blue',
                            'font-size': 8,
                            //'text-outline-width': 2,
                            //'text-outline-color': 'blue',
                            'color': 'black'
                        })
                        .selector('edge')
                        .css({
                            'target-arrow-shape': 'triangle'
                        })
                        .selector(':selected')
                        .css({
                            'background-color': 'white',
                            'line-color': 'black',
                            'target-arrow-color': 'black',
                            'source-arrow-color': 'black',
                            'text-outline-color': 'black'
                        }),

                    layout: {
                        //name : 'circle',
                        //padding: 10

                        name: 'arbor',
                        liveUpdate: true, // whether to show the layout as it's running
                        ready: undefined, // callback on layoutready
                        stop: undefined, // callback on layoutstop
                        maxSimulationTime: 4000, // max length in ms to run the layout
                        fit: true, // reset viewport to fit default simulationBounds
                        padding: [ 50, 50, 50, 50 ], // top, right, bottom, left
                        simulationBounds: undefined, // [x1, y1, x2, y2]; [0, 0, width, height] by default
                        ungrabifyWhileSimulating: true, // so you can't drag nodes during layout

                        // forces used by arbor (use arbor default on undefined)
                        repulsion: undefined,
                        stiffness: undefined,
                        friction: undefined,
                        gravity: true,
                        fps: undefined,
                        precision: undefined,

                        // static numbers or functions that dynamically return what these
                        // values should be for each element
                        nodeMass: undefined,
                        edgeLength: undefined,

                        stepSize: 1, // size of timestep in simulation

                        // function that returns true if the system is stable to indicate
                        // that the layout can be stopped
                        stableEnergy: function (energy) {
                            var e = energy;
                            return (e.max <= 0.5) || (e.mean <= 0.3);
                        }

                        //name: 'cose',
                        //padding: 10
                    },

                    elements: eles,

                    ready: function () {
                        deferred.resolve(this);

                        // add listener behavior later...
                        //cy.on('cxtdrag', 'node', function(e){
                        //    var node = this;
                        //    var dy = Math.abs( e.cyPosition.x - node.position().x );
                        //    var weight = Math.round( dy*2 );
                        //
                        //    node.data('weight', weight);
                        //
                        //    fire('onWeightChange', [ node.id(), node.data('weight') ]);
                        //});

                    }
                });

            }); // on dom ready

            return deferred.promise;
        };

        /*-----------------------------------------------------------------------*
         * Set a network to be displayed in the viewer
         *-----------------------------------------------------------------------*/
        factory.setNetwork = function (network) {
            // build the new elements structure
            var elements = {nodes: [], edges: []};

            $.each(network.nodes, function (index, node) {
                var label = ndexHelper.getNodeLabel(node, network);
                var cyNode = {data: {id: "n" + index, name: label}};
                elements.nodes.push(cyNode);

            });

            $.each(network.edges, function (index, edge) {
                var cyEdge = {data: {source: "n" + edge.subjectId, target: "n" + edge.objectId}};
                elements.edges.push(cyEdge);
            });

            // set the cytoscsape instance elements
            cy.load(elements);

        };


        return factory;
    }]);

})(); //end function closure