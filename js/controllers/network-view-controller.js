ndexApp.controller('networkViewController',
    ['config','ndexServiceCX', 'ndexService', 'ndexConfigs', 'cyService',
        'provenanceVisualizerService', 'ndexUtility', 'ndexHelper', 'ndexNavigation',
        'sharedProperties', '$scope', '$routeParams', '$modal',
        '$route', '$filter', '$location','$q',
        function (config, ndexServiceCX, ndexService, ndexConfigs, cyService,
                  provenanceVisualizerService, ndexUtility, ndexHelper, ndexNavigation,
                  sharedProperties, $scope, $routeParams, $modal,
                  $route, $filter, $location, $q)
        {
            var networkExternalId = $routeParams.identifier;
            sharedProperties.setCurrentNetworkId(networkExternalId);
            
            $scope.networkController = {};

            var networkController  = $scope.networkController;
            /**
             * Return the value of a given property in the network. I assume the perperty names a unique in network.
             * Property name is case sensitive.
             * @param networkProperties
             * @param propertyName
             * @returns {undefined}
             */
            var getNetworkProperty = function(networkProperties, propertyName)
            {
                if ('undefined'===typeof(networkProperties)) {
                    return undefined;
                }

                for( var i = 0; i < networkProperties.length; i++ ) {

                    if ((networkProperties[i].predicateString === propertyName)) {
                            return networkProperties[i].value ;
                    }
                }
            }

            
            var drawCXNetworkOnCanvas = function (cxNetwork) {
                var attributeNameMap = {};

                var cyElements = cyService.cyElementsFromNiceCX(niceCX, attributeNameMap);
                var cyStyle = cyService.cyStyleFromNiceCX(niceCX, attributeNameMap);

                var layoutName = 'cose';

                if (cyService.allNodesHaveUniquePositions(cyElements)) {
                    layoutName = 'preset';
                }

                var cyLayout = {name: layoutName};

                cyService.initCyGraphFromCyjsComponents(cyElements, cyLayout, cyStyle, viewer, 'cytoscape-canvas' );

            }
            
            var getNetworkAndDisplay = function (callback) {
                var config = angular.injector(['ng', 'ndexServiceApp']).get('config');
                // hard-coded parameters for ndexService call, later on we may want to implement pagination
                var blockSize = config.networkTableLimit;
                var skipBlocks = 0;

                if ( networkController.currentNetworkSummary.edgeCount > config.networkDisplayLimit) {
                    // get edges, convert to CX obj
                } else {
                    // get complete CX stream and build the CX network object.
                }
                
                (request2 = ndexServiceCX.getCXNetwork(networkController.currentNetworkId) )
                    .success(
                        function (network) {
                            csn = network; // csn is a debugging convenience variable
                   //         networkController.currentSubnetwork = network;
                   //         networkController.selectedEdges = network.edges;
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
            }

/*            var initialize = function () {
                // vars to keep references to http calls to allow aborts
                var request1 = null;
                var request2 = null;

                // get network summary
                // keep a reference to the promise
                (request1 = ndexService.getNetwork(networkExternalId) )
                    .success(
                        function (network) {
                            cn = network;
                            networkController.currentNetworkSummary = network;

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
                                    || networkController.canRead)
                                    getNetworkAndDisplay(drawCXNetworkOnCanvas);
                            });
                            
                            networkController.readOnlyChecked = cn.readOnlyCommitId > 0;
                            getNetworkAdmins();

                            networkController.currentNetworkSourceFormat =
                                getNetworkProperty(networkController.currentNetwork.properties, 'sourceFormat');
                            networkController.currentNetwork.reference =
                                getNetworkProperty(networkController.currentNetwork.properties,'reference');
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

*/
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


            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

     //       networkController.isLoggedIn = (ndexUtility.getLoggedInUserAccountName() != null);


      //      initialize();


        }
        
     ]
);