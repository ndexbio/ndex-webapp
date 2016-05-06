ndexApp.controller('networkViewController',
    ['config','provenanceService','ndexServiceCX', 'ndexService', 'ndexConfigs', 'cyService','cxNetworkUtils',
         'ndexUtility', 'ndexHelper', 'ndexNavigation',
        'sharedProperties', '$scope', '$routeParams', '$modal',
        '$route', '$filter', '$location','$q',
        function (config, provenanceService, ndexServiceCX, ndexService, ndexConfigs, cyService, cxNetworkUtils,
                   ndexUtility, ndexHelper, ndexNavigation,
                  sharedProperties, $scope, $routeParams, $modal,
                  $route, $filter, $location, $q)
        {
            var self = this;
            
            var networkExternalId = $routeParams.identifier;
            sharedProperties.setCurrentNetworkId(networkExternalId);


            $scope.networkController = {};



            var networkController  = $scope.networkController;

            networkController.currentNetworkId = networkExternalId;

            networkController.errors = []; // general page errors
            networkController.queryErrors = [];
            networkController.displayProvenance = {};


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
            };

            /**
             * Return the value of a given property in the network. I assume the perperty names a unique in network.
             * Property name is case sensitive.
             * @param networkProperties
             * @param propertyName
             * @returns {undefined}
             */
            var getNetworkProperty = function(networkProperties, propertyName)
            {
                if ('undefined'===typeof(networkProperties) || !propertyName) {
                    return undefined;
                }

                for( var i = 0; i < networkProperties.length; i++ ) {

                    if (!networkProperties[i].predicateString) {
                        continue;
                    }
                    if ((networkProperties[i].predicateString.toLowerCase() === propertyName.toLowerCase())) {
                            return networkProperties[i].value ;
                    }
                }
                return undefined;
            }

            $scope.build_provenance_view = function() {
                provenanceService.showProvenance(networkController);
            }

            $scope.getProvenanceTitle = function(provenance)
            {
               return provenanceService.getProvenanceTitle(provenance);
            };


            networkController.refreshProvMap = function (obj) {
                $scope.$apply(function () {
                    networkController.displayProvenance = obj;
                });
            }    
            
            //                  local functions

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


            var drawCXNetworkOnCanvas = function (cxNetwork) {
                var attributeNameMap = {};

                var cyElements = cyService.cyElementsFromNiceCX(cxNetwork, attributeNameMap);
                var cyStyle = cyService.cyStyleFromNiceCX(cxNetwork, attributeNameMap);

                var layoutName = 'cose';

                if (cyService.allNodesHaveUniquePositions(cyElements)) {
                    layoutName = 'preset';
                }

                var cyLayout = {name: layoutName};

                cyService.initCyGraphFromCyjsComponents(cyElements, cyLayout, cyStyle, networkController, 'cytoscape-canvas' );

            }
            
            var getNetworkAndDisplay = function (networkId, callback) {
                var config = angular.injector(['ng', 'ndexServiceApp']).get('config');
                // hard-coded parameters for ndexService call, later on we may want to implement pagination
                var blockSize = config.networkTableLimit;
                var skipBlocks = 0;


                if ( networkController.currentNetwork.edgeCount > config.networkDisplayLimit) {
                    // get edges, convert to CX obj
                    (request2 = ndexServiceCX.getSampleCXNetworkFromOldAPI(networkId, config.networkTableLimit) )
                        .success(
                            function (network) {

                                callback(network);
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
                    (request2 = ndexServiceCX.getCXNetwork(networkId) )
                        .success(
                            function (network) {

                                callback(network);
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
                
            }

            var initialize = function () {
                // vars to keep references to http calls to allow aborts
                var request1 = null;
                var request2 = null;

                // get network summary
                // keep a reference to the promise
                (request1 = ndexService.getNetwork(networkExternalId) )
                    .success(
                        function (network) {
                            cn = network;
                            networkController.currentNetwork = network;

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

                                            getNetworkAndDisplay(networkExternalId,drawCXNetworkOnCanvas);
                                }
                            });
                            
                            networkController.readOnlyChecked = cn.readOnlyCommitId > 0;
                            //getNetworkAdmins();

                            var sourceFormat =
                                getNetworkProperty(networkController.currentNetwork.properties, 'sourceFormat');
                            networkController.currentNetwork.sourceFormat = (undefined === sourceFormat) ?
                                'Unknown' : sourceFormat;

                            networkController.currentNetwork.reference =
                                getNetworkProperty(networkController.currentNetwork.properties,'Reference');
                            networkController.currentNetwork.rightsHolder =
                                getNetworkProperty(networkController.currentNetwork.properties,'rightsHolder');
                            networkController.currentNetwork.rights =
                                getNetworkProperty(networkController.currentNetwork.properties,'rights');

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

            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

            networkController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);


            initialize();


        }
        
     ]
);