ndexApp.controller('myAccountController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$rootScope',
        '$location', '$routeParams', '$route', '$modal', 'uiMisc', 'ndexNavigation', 'uiGridConstants', 'ndexSpinner',
         '$compile', 'userSessionTablesSettings', '$interval',
        function (ndexService, ndexUtility, sharedProperties, $scope, $rootScope,
                  $location, $routeParams, $route, $modal, uiMisc, ndexNavigation, uiGridConstants, ndexSpinner,
                  $compile, userSessionTablesSettings, $interval) {
            //              Process the URL to get application state
            //-----------------------------------------------------------------------------------

            //  var identifier = ndexUtility.getUserCredentials()["externalId"];
            var identifier = sharedProperties.getCurrentUserId(); //$routeParams.identifier;


            //              CONTROLLER INITIALIZATIONS
            //------------------------------------------------------------------------------------

            $scope.myAccountController = {};
            var myAccountController = $scope.myAccountController;
            myAccountController.isLoggedInUser = !!window.currentNdexUser;
            myAccountController.identifier = identifier;
            myAccountController.loggedInIdentifier = sharedProperties.getCurrentUserId();
            myAccountController.displayedUser = {};

            //groups
            myAccountController.groupSearchAdmin = false; // this state needs to be saved to avoid browser refresh
            myAccountController.groupSearchMember = false;
            myAccountController.groupSearchResults = [];
            myAccountController.originalGroupSearchResults = [];

            //networks
            myAccountController.networkQuery = {};
            myAccountController.networkSearchResults = [];
            myAccountController.skip = 0;
            myAccountController.skipSize = 10000;
            myAccountController.networkTableRowsSelected = 0;

            myAccountController.taskTableRowsSelected = 0;

            myAccountController.pendingRequests = [];
            myAccountController.sentRequests = [];

            //tasks
            myAccountController.tasks = [];

            $scope.getClassForMyTasksTab = function() {
                var retValue =
                    (myAccountController.tasks.length === 0) &&
                    (myAccountController.pendingRequests.length === 0) &&
                    (myAccountController.sentRequests.length === 0);

                return retValue ? 'disabled' : 'enabled';
            };


            // map of network IDs of all networks for which the current user has ADMIN access and therefore can delete
            myAccountController.networksWithAdminAccess = {};

            // map of network IDs of all networks for which the current user has WRITE access and therefore can update.
            // These networks are owned by other users.
            myAccountController.networksWithWriteAccess = {};

            // map of network IDs owned by other users, for which the current user has READ access and therefore
            // cannot update.
            myAccountController.networksWithReadAccess = {};

            // this map of Cytoscape collection networks; networkUUID is a key and <numberOfSubNetworks> is a value;
            // we only put networks with number of subnetworks greater than 1
            myAccountController.networksWithMultipleSubNetworks = {};

            var spinnerMyAccountPageId = 'spinnerMyAccountPageId';
            var refreshIntervalInSeconds = window.ndexSettings.refreshIntervalInSeconds;
            var timerVariable = -1;
            //var myNetworksNewHash = 0;
            //var myNetworksOldHash = 0;


            var windowsHeightCorrection = 170;


            var pageNo = 1;

            if ((typeof $routeParams.pageNo !== 'undefined') && ($routeParams.pageNo !== null)) {
                if ($routeParams.pageNo.match(/p[1-9]+[0-9]*/)) {
                    var pageNoCastFromStr = $routeParams.pageNo.substring(1);

                    pageNo = Number(pageNoCastFromStr);
                }
            }
            var pageNoP = 'p' + pageNo;


            // check if page was reloaded
            if (window.performance && window.performance.navigation &&
                (typeof window.performance.navigation.type !== 'undefined')) {

                if ((window.performance.navigation.type === 1)) {
                    // it means that the page was reloaded; page no is to be set to 1
                    // and location to /myAccount
                    pageNoP = 'p1';
                    pageNo  = 1;
                    $location.path('/myAccount');
                }
            }


            // this function gets called when user navigates away from the current page.
            // (can also use "$locationChangeStart" instead of "$destroy"
            $scope.$on('$destroy', function(){

                if ((refreshIntervalInSeconds > 0) && (timerVariable !== -1)) {
                    $interval.cancel(timerVariable);
                }

                if ($rootScope.signOut) {
                    // in case user hit Sign Out, need to clear sessionStorage since the current
                    // $scope.$on("$destroy", function() handler might be called AFTER
                    // signOutHandler() handler in main.js
                    $rootScope.signOut = false;
                    userSessionTablesSettings.clearState();
                }

            });

            $scope.diskSpaceInfo = {};

            myAccountController.showNetworkTable = false;

            $scope.enableEditPropertiesBulkButton = false;
            $scope.changeDescriptionButtonTitle   = '';
            $scope.changeReferenceButtonTitle     = '';
            $scope.changeVersionButtonTitle       = '';


            $scope.enableChangeVisibilityBulkButton = false;
            $scope.changeVisibilityButtonTitle      = '';

            $scope.enableSetReadOnlyBulkButton  = false;
            $scope.setReadOnlNetworkButtonTitle = '';

            $scope.enableShareBulkButton   = false;
            $scope.shareNetworkButtonTitle = '';

            $scope.enableExportBulkButton   = false;
            $scope.exportNetworkButtonTitle = '';

            $scope.enableAddToMySetsBulkButton = false;
            $scope.addToMySetsButtonTitle      = '';

            $scope.enableRemoveSharedNetworksBulkButton  = false;
            $scope.removeFromMyNetworksButtonTitle       = '';


            $scope.enableDeleteBulkButton   = false;
            $scope.deleteNetworkButtonTitle = '';

            myAccountController.editProfilesLabel         = 'Edit Profile';
            myAccountController.exportNetworksLabel       = 'Export Network';
            myAccountController.removeNetworksButtonLabel = 'Remove from My Networks';
            myAccountController.deleteNetworksLabel       = 'Delete Network';

            myAccountController.networkSets = [];

            $scope.refreshNetworksButtonDisabled = true;
            $scope.refreshTasksButtonDisabled    = true;

            var tasksAndNotificationsTableDefined = false;

            var networksReceived             = false;

            $scope.tasksReceived             = false;
            $scope.sentRequestsReceived      = false;
            $scope.receivedRequestsReceived  = false;

            $scope.selectedRowsNetworkExternalIds = {};
            $scope.selectedRowsTasksExternalIds   = {};

            myAccountController.numberOfNewTasksAndRequests = 0;
            myAccountController.numberOfReceivedRequests    = 0;
            myAccountController.numberOfDownloadableTasks   = 0;

            myAccountController.currentTab = 'networks';

            userSessionTablesSettings.initMyAccountPageStates();

            $scope.networksTasksAndRequestsReceived = function() {
                return (networksReceived &&
                $scope.tasksReceived &&
                $scope.sentRequestsReceived && $scope.receivedRequestsReceived);
            };
            $scope.resetNetworksFlag = function() {
                networksReceived = false;
            };
            $scope.resetTasksAndRequestsReceivedFlags = function() {
                $scope.tasksReceived = $scope.sentRequestsReceived = $scope.receivedRequestsReceived = false;
            };
            $scope.resetNetworksTasksAndRequestsReceivedFlags = function() {
                networksReceived = false;
                $scope.resetTasksAndRequestsReceivedFlags();
            };


            $scope.onTabSelect = function(tabName) {
                myAccountController.currentTab = tabName;
            };

            var paginationOptions = {
                pageNumber: pageNo,
                pageSize: userSessionTablesSettings.getTablePaginationSize(),
                sort: null,
                networkCount: 0,
                networkSetCount: 0
            };

            var changeNetworkBulkActionsButtonsLabels = function() {
                if (myAccountController.networkTableRowsSelected > 1) {
                    myAccountController.editProfilesLabel   = 'Edit Profiles';
                    myAccountController.exportNetworksLabel = 'Export Networks';
                    myAccountController.deleteNetworksLabel = 'Delete Networks';
                } else {
                    myAccountController.editProfilesLabel   = 'Edit Profile';
                    myAccountController.exportNetworksLabel = 'Export Network';
                    myAccountController.deleteNetworksLabel = 'Delete Network';
                }
            };


            // Enable or Disable Bulk Change Description, Change Reference or Change Version

            var enableOrDisableEditPropertiesBulkMenu = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableEditPropertiesBulkButton = true;

                var unchangeableNetworkStates = {'read' : 0, 'certified' : 0, 'failed' : 0,
                    'processing' : 0, 'collection' : 0, 'readonly': 0};

                var statesForWhichToDisable = Object.keys(unchangeableNetworkStates);

                _.forEach (selectedNetworksRows, function(row) {

                    var status = row.Status;

                    var disableEditBulkButton =
                        (status && statesForWhichToDisable.indexOf(status.toLowerCase()) > -1);

                    if (disableEditBulkButton) {
                        $scope.enableEditPropertiesBulkButton = false;
                        unchangeableNetworkStates[status.toLowerCase()] += 1;

                    } else if (row.isReadOnly) {
                        $scope.enableEditPropertiesBulkButton = false;
                        unchangeableNetworkStates.readonly += 1;

                    } else if (row.externalId in myAccountController.networksWithReadAccess) {
                        $scope.enableEditPropertiesBulkButton = false;
                        unchangeableNetworkStates.read += 1;
                    }
                });

                if ($scope.enableEditPropertiesBulkButton) {
                    $scope.changeDescriptionButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'Change Description of the selected networks' : 'Change Description of the selected network';
                    $scope.changeReferenceButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'Change Reference of the selected networks' : 'Change Reference of the selected network';
                    $scope.changeVersionButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'Change Version of the selected networks' : 'Change Version of the selected network';
                } else {
                    $scope.changeDescriptionButtonTitle = 'Unable to change Description of the selected ';
                    $scope.changeReferenceButtonTitle   = 'Unable to change Reference of the selected ';
                    $scope.changeVersionButtonTitle     = 'Unable to change Version of the selected ';

                    if (myAccountController.networkTableRowsSelected > 1) {
                        $scope.changeDescriptionButtonTitle += 'networks: ';
                        $scope.changeReferenceButtonTitle   += 'networks: ';
                        $scope.changeVersionButtonTitle     += 'networks: ';


                        if (unchangeableNetworkStates.read > 1) {
                            $scope.changeDescriptionButtonTitle += 'you do not have privilege to modify ' +
                                unchangeableNetworkStates.read + ' networks';

                            $scope.changeReferenceButtonTitle += 'you do not have privilege to modify ' +
                                unchangeableNetworkStates.read + ' networks';

                            $scope.changeVersionButtonTitle += 'you do not have privilege to modify ' +
                                unchangeableNetworkStates.read + ' networks';

                        } else if (unchangeableNetworkStates.read === 1) {
                            $scope.changeDescriptionButtonTitle += 'you do not have privilege to modify ' +
                                unchangeableNetworkStates.read + ' network';

                            $scope.changeReferenceButtonTitle += 'you do not have privilege to modify ' +
                                unchangeableNetworkStates.read + ' network';

                            $scope.changeVersionButtonTitle += 'you do not have privilege to modify ' +
                                unchangeableNetworkStates.read + ' network';
                        }

                        if ((unchangeableNetworkStates.read > 0) &&
                            ((unchangeableNetworkStates.certified > 0) || (unchangeableNetworkStates.failed > 0) ||
                            (unchangeableNetworkStates.processing > 0) || (unchangeableNetworkStates.collection > 0) ||
                            (unchangeableNetworkStates.readonly > 0))) {
                            $scope.changeDescriptionButtonTitle += ', ';
                            $scope.changeReferenceButtonTitle   += ', ';
                            $scope.changeVersionButtonTitle     += ', ';
                        }

                        if (unchangeableNetworkStates.certified > 1) {
                            $scope.changeDescriptionButtonTitle +=
                                unchangeableNetworkStates.certified + ' networks are certified';

                            $scope.changeReferenceButtonTitle +=
                                unchangeableNetworkStates.certified + ' networks are certified';

                            $scope.changeVersionButtonTitle +=
                                unchangeableNetworkStates.certified + ' networks are certified';

                        } else if (unchangeableNetworkStates.certified === 1) {
                            $scope.changeDescriptionButtonTitle +=
                                unchangeableNetworkStates.certified + ' network is certified';

                            $scope.changeReferenceButtonTitle +=
                                unchangeableNetworkStates.certified + ' network is certified';

                            $scope.changeVersionButtonTitle +=
                                unchangeableNetworkStates.certified + ' network is certified';
                        }
                        if ((unchangeableNetworkStates.certified > 0) &&
                            ((unchangeableNetworkStates.failed > 0) || (unchangeableNetworkStates.processing > 0) ||
                            (unchangeableNetworkStates.collection > 0) || (unchangeableNetworkStates.readonly > 0))) {
                            $scope.changeDescriptionButtonTitle += ', ';
                            $scope.changeReferenceButtonTitle   += ', ';
                            $scope.changeVersionButtonTitle     += ', ';
                        }
                        if (unchangeableNetworkStates.failed > 1) {
                            $scope.changeDescriptionButtonTitle += unchangeableNetworkStates.failed + ' networks failed';
                            $scope.changeReferenceButtonTitle += unchangeableNetworkStates.failed + ' networks failed';
                            $scope.changeVersionButtonTitle += unchangeableNetworkStates.failed + ' networks failed';

                        } else if (unchangeableNetworkStates.failed === 1) {
                            $scope.changeDescriptionButtonTitle += unchangeableNetworkStates.failed + ' network failed';
                            $scope.changeReferenceButtonTitle += unchangeableNetworkStates.failed + ' network failed';
                            $scope.changeVersionButtonTitle += unchangeableNetworkStates.failed + ' network failed';
                        }
                        if ((unchangeableNetworkStates.failed > 0) &&
                            ((unchangeableNetworkStates.processing > 0) || (unchangeableNetworkStates.collection > 0) ||
                            (unchangeableNetworkStates.readonly > 0)))
                        {
                            $scope.changeDescriptionButtonTitle += ', ';
                            $scope.changeReferenceButtonTitle   += ', ';
                            $scope.changeVersionButtonTitle     += ', ';
                        }
                        if (unchangeableNetworkStates.processing > 1) {
                            $scope.changeDescriptionButtonTitle += unchangeableNetworkStates.processing + ' networks are processing';
                            $scope.changeReferenceButtonTitle += unchangeableNetworkStates.processing + ' networks are processing';
                            $scope.changeVersionButtonTitle += unchangeableNetworkStates.processing + ' networks are processing';

                        } else if (unchangeableNetworkStates.processing === 1) {
                            $scope.changeDescriptionButtonTitle += unchangeableNetworkStates.processing + ' network is processing';
                            $scope.changeReferenceButtonTitle += unchangeableNetworkStates.processing + ' network is processing';
                            $scope.changeVersionButtonTitle += unchangeableNetworkStates.processing + ' network is processing';
                        }
                        if ((unchangeableNetworkStates.processing > 0) &&
                            ((unchangeableNetworkStates.collection > 0) || (unchangeableNetworkStates.readonly > 0))) {
                            $scope.changeDescriptionButtonTitle += ', ';
                            $scope.changeReferenceButtonTitle   += ', ';
                            $scope.changeVersionButtonTitle     += ', ';
                        }
                        if (unchangeableNetworkStates.collection > 1) {
                            $scope.changeDescriptionButtonTitle += unchangeableNetworkStates.collection + ' networks are Cytoscape collections';
                            $scope.changeReferenceButtonTitle += unchangeableNetworkStates.collection + ' networks are Cytoscape collections';
                            $scope.changeVersionButtonTitle += unchangeableNetworkStates.collection + ' networks are Cytoscape collections';

                        } else if (unchangeableNetworkStates.collection === 1) {
                            $scope.changeDescriptionButtonTitle += unchangeableNetworkStates.collection + ' networks is a Cytoscape collection';
                            $scope.changeReferenceButtonTitle += unchangeableNetworkStates.collection + ' networks is a Cytoscape collection';
                            $scope.changeVersionButtonTitle += unchangeableNetworkStates.collection + ' networks is a Cytoscape collection';
                        }
                        if ((unchangeableNetworkStates.collection > 0) && (unchangeableNetworkStates.readonly > 0)) {
                            $scope.changeDescriptionButtonTitle += ', ';
                            $scope.changeReferenceButtonTitle   += ', ';
                            $scope.changeVersionButtonTitle     += ', ';
                        }
                        if (unchangeableNetworkStates.readonly > 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.readonly + ' networks are read-only';

                            $scope.changeDescriptionButtonTitle += unchangeableNetworkStates.readonly + ' networks are read-only';
                            $scope.changeReferenceButtonTitle += unchangeableNetworkStates.readonly + ' networks are read-only';
                            $scope.changeVersionButtonTitle += unchangeableNetworkStates.readonly + ' networks are read-only';

                        } else if (unchangeableNetworkStates.readonly === 1) {
                            $scope.changeDescriptionButtonTitle += unchangeableNetworkStates.readonly + ' network is read-only';
                            $scope.changeReferenceButtonTitle += unchangeableNetworkStates.readonly + ' network is read-only';
                            $scope.changeVersionButtonTitle += unchangeableNetworkStates.readonly + ' network is read-only';
                        }
                    } else {
                        $scope.changeDescriptionButtonTitle += 'network';
                        $scope.changeReferenceButtonTitle   += 'network';
                        $scope.changeVersionButtonTitle     += 'network';

                        if (unchangeableNetworkStates.read > 0) {
                            $scope.changeDescriptionButtonTitle += ': you do not have privilege to modify it ';
                            $scope.changeReferenceButtonTitle   += ': you do not have privilege to modify it ';
                            $scope.changeVersionButtonTitle     += ': you do not have privilege to modify it ';

                        } else if (unchangeableNetworkStates.certified > 0) {
                            $scope.changeDescriptionButtonTitle += ': it is certified ';
                            $scope.changeReferenceButtonTitle   += ': it is certified ';
                            $scope.changeVersionButtonTitle     += ': it is certified ';

                        } else if (unchangeableNetworkStates.failed > 0) {
                            $scope.changeDescriptionButtonTitle += ': it is failed ';
                            $scope.changeReferenceButtonTitle   += ': it is failed ';
                            $scope.changeVersionButtonTitle     += ': it is failed ';

                        } else if (unchangeableNetworkStates.processing > 0) {
                            $scope.changeDescriptionButtonTitle += ': it is processing ';
                            $scope.changeReferenceButtonTitle   += ': it is processing ';
                            $scope.changeVersionButtonTitle     += ': it is processing ';

                        } else if (unchangeableNetworkStates.collection > 0) {
                            $scope.changeDescriptionButtonTitle += ': it is a Cytoscape collection ';
                            $scope.changeReferenceButtonTitle   += ': it is a Cytoscape collection ';
                            $scope.changeVersionButtonTitle     += ': it is a Cytoscape collection ';

                        } else if (unchangeableNetworkStates.readonly > 0) {
                            $scope.changeDescriptionButtonTitle += ': it is read-only ';
                            $scope.changeReferenceButtonTitle   += ': it is read-only ';
                            $scope.changeVersionButtonTitle     += ': it is read-only ';
                        }
                    }
                }
            };

            var enableOrDisableChangeVisibilityBulkMenu = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableChangeVisibilityBulkButton = true;

                var unchangeableNetworkStates = {'nonadmin' : 0, 'certified' : 0, 'failed' : 0,
                    'processing' : 0, /*'collection' : 0, */ 'readonly': 0};

                var statesForWhichToDisable = Object.keys(unchangeableNetworkStates);

                _.forEach (selectedNetworksRows, function(row) {

                    if (row.ownerUUID !== myAccountController.loggedInIdentifier) {
                        unchangeableNetworkStates.nonadmin += 1;
                        $scope.enableChangeVisibilityBulkButton = false;
                        return true; // return true means "continue" in lodash's _.forEach loop
                    }
                    var status = row.Status;

                    var disableChangeVisibilityBulkMenu =
                        (status && statesForWhichToDisable.indexOf(status.toLowerCase()) > -1);

                    if (disableChangeVisibilityBulkMenu) {
                        $scope.enableChangeVisibilityBulkButton = false;
                        unchangeableNetworkStates[status.toLowerCase()] += 1;

                    } else if (row.isReadOnly) {
                        $scope.enableChangeVisibilityBulkButton = false;
                        unchangeableNetworkStates.readonly += 1;

                    }
                });

                if ($scope.enableChangeVisibilityBulkButton) {
                    $scope.changeVisibilityButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'Change Visibility of the selected networks' : 'Change Visibility of the selected network';
                } else {
                    $scope.changeVisibilityButtonTitle = 'Unable to change Visibility of the selected ';

                    if (myAccountController.networkTableRowsSelected > 1) {
                        $scope.changeVisibilityButtonTitle += 'networks: ';

                        if (unchangeableNetworkStates.nonadmin > 1) {
                            $scope.changeVisibilityButtonTitle += 'you do not own ' +
                                unchangeableNetworkStates.nonadmin + ' networks';
                        } else if (unchangeableNetworkStates.nonadmin === 1) {
                            $scope.changeVisibilityButtonTitle += 'you do not own ' +
                                unchangeableNetworkStates.nonadmin + ' network';
                        }
                        if ((unchangeableNetworkStates.nonadmin > 0) &&
                            ((unchangeableNetworkStates.certified > 0) || (unchangeableNetworkStates.failed > 0) ||
                            (unchangeableNetworkStates.processing > 0) || //(unchangeableNetworkStates.collection > 0) ||
                            (unchangeableNetworkStates.readonly > 0))) {
                            $scope.changeVisibilityButtonTitle += ', ';
                        }
                        if (unchangeableNetworkStates.certified > 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.certified + ' networks are certified';
                        } else if (unchangeableNetworkStates.certified === 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.certified + ' network is certified';
                        }
                        if ((unchangeableNetworkStates.certified > 0) &&
                            ((unchangeableNetworkStates.failed > 0) || (unchangeableNetworkStates.processing > 0) ||
                            /*(unchangeableNetworkStates.collection > 0) || */ (unchangeableNetworkStates.readonly > 0))) {
                            $scope.changeVisibilityButtonTitle += ', ';
                        }
                        if (unchangeableNetworkStates.failed > 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.failed + ' networks failed';
                        } else if (unchangeableNetworkStates.failed === 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.failed + ' network failed';
                        }
                        if ((unchangeableNetworkStates.failed > 0) &&
                            ((unchangeableNetworkStates.processing > 0) || //(unchangeableNetworkStates.collection > 0) ||
                            (unchangeableNetworkStates.readonly > 0))) {
                            $scope.changeVisibilityButtonTitle += ', ';
                        }
                        if (unchangeableNetworkStates.processing > 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.processing + ' networks are processing';
                        } else if (unchangeableNetworkStates.processing === 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.processing + ' network is processing';
                        }
                        if ((unchangeableNetworkStates.processing > 0) &&
                            (/*(unchangeableNetworkStates.collection > 0) || */ (unchangeableNetworkStates.readonly > 0))) {
                            $scope.changeVisibilityButtonTitle += ', ';
                        }
                        /*
                        if (unchangeableNetworkStates.collection > 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.collection + ' networks are Cytoscape collections';
                        } else if (unchangeableNetworkStates.collection === 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.collection + ' network is a Cytoscape collection';
                        }
                        if ((unchangeableNetworkStates.collection > 0) && (unchangeableNetworkStates.readonly > 0)) {
                            $scope.changeVisibilityButtonTitle += ', ';
                        }
                        */
                        if (unchangeableNetworkStates.readonly > 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.readonly + ' networks are read-only';
                        } else if (unchangeableNetworkStates.readonly === 1) {
                            $scope.changeVisibilityButtonTitle += unchangeableNetworkStates.readonly + ' network is read-only';
                        }
                    } else {
                        $scope.changeVisibilityButtonTitle += 'network';

                        if (unchangeableNetworkStates.nonadmin > 0) {
                            $scope.changeVisibilityButtonTitle += ': you do not own it ';
                        } else if (unchangeableNetworkStates.certified > 0) {
                            $scope.changeVisibilityButtonTitle += ': it is certified ';
                        } else if (unchangeableNetworkStates.failed > 0) {
                            $scope.changeVisibilityButtonTitle += ': it is failed ';
                        } else if (unchangeableNetworkStates.processing > 0) {
                            $scope.changeVisibilityButtonTitle += ': it is processing ';
                        //} else if (unchangeableNetworkStates.collection > 0) {
                        //    $scope.changeVisibilityButtonTitle += ': it is a Cytoscape collection ';
                        } else if (unchangeableNetworkStates.readonly > 0) {
                            $scope.changeVisibilityButtonTitle += ': it is read-only ';
                        }
                    }
                }
            };

            var enableOrDisableSetReadOnlyBulkMenu = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableSetReadOnlyBulkButton = true;

                var unchangeableNetworkStates = {'nonadmin' : 0, 'certified' : 0, 'failed' : 0, 'processing' : 0 /*, 'collection' : 0*/ };
                var statesForWhichToDisable = Object.keys(unchangeableNetworkStates);

                _.forEach (selectedNetworksRows, function(row) {

                    if (row.ownerUUID !== myAccountController.loggedInIdentifier) {
                        unchangeableNetworkStates.nonadmin += 1;
                        $scope.enableSetReadOnlyBulkButton = false;
                        return true; // return true means "continue" in lodash's _.forEach loop
                    }
                    var status = row.Status;

                    var disableSetReadOnlyBulkMenu  =
                        (status && statesForWhichToDisable.indexOf(status.toLowerCase()) > -1);

                    if (disableSetReadOnlyBulkMenu) {
                        $scope.enableSetReadOnlyBulkButton = false;
                        unchangeableNetworkStates[status.toLowerCase()] += 1;
                    }
                });

                if ($scope.enableSetReadOnlyBulkButton) {
                    $scope.setReadOnlNetworkButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'Change read-only flag of selected networks' : 'Change read-only flag of selected network';
                } else {
                    $scope.setReadOnlNetworkButtonTitle = 'Unable change read-only flag of selected ';

                    if (myAccountController.networkTableRowsSelected > 1) {
                        $scope.setReadOnlNetworkButtonTitle += 'networks: ';

                        if (unchangeableNetworkStates.nonadmin > 1) {
                            $scope.setReadOnlNetworkButtonTitle += 'you do not own ' +
                                unchangeableNetworkStates.nonadmin + ' networks';
                        } else if (unchangeableNetworkStates.nonadmin === 1) {
                            $scope.setReadOnlNetworkButtonTitle += 'you do not own ' +
                                unchangeableNetworkStates.nonadmin + ' network';
                        }
                        if ((unchangeableNetworkStates.nonadmin > 0) &&
                            ((unchangeableNetworkStates.certified > 0)  || (unchangeableNetworkStates.failed > 0) ||
                            (unchangeableNetworkStates.processing > 0) /* || (unchangeableNetworkStates.collection > 0)*/)) {
                            $scope.setReadOnlNetworkButtonTitle += ', ';
                        }
                        if (unchangeableNetworkStates.certified > 1) {
                            $scope.setReadOnlNetworkButtonTitle += unchangeableNetworkStates.certified + ' networks are certified';
                        } else if (unchangeableNetworkStates.certified === 1) {
                            $scope.setReadOnlNetworkButtonTitle += unchangeableNetworkStates.certified + ' network is certified';
                        }
                        if ((unchangeableNetworkStates.certified > 0) &&
                            ((unchangeableNetworkStates.failed > 0) || (unchangeableNetworkStates.processing > 0) /*||
                             (unchangeableNetworkStates.collection > 0)*/ )) {
                            $scope.setReadOnlNetworkButtonTitle += ', ';
                        }
                        if (unchangeableNetworkStates.failed > 1) {
                            $scope.setReadOnlNetworkButtonTitle += unchangeableNetworkStates.failed + ' networks failed';
                        } else if (unchangeableNetworkStates.failed === 1) {
                            $scope.setReadOnlNetworkButtonTitle += unchangeableNetworkStates.failed + ' network failed';
                        }
                        if ((unchangeableNetworkStates.failed > 0) &&
                            ((unchangeableNetworkStates.processing > 0) /*|| (unchangeableNetworkStates.collection > 0)*/)) {
                            $scope.setReadOnlNetworkButtonTitle += ', ';
                        }
                        if (unchangeableNetworkStates.processing > 1) {
                            $scope.setReadOnlNetworkButtonTitle += unchangeableNetworkStates.processing + ' networks are processing';
                        } else if (unchangeableNetworkStates.processing === 1) {
                            $scope.setReadOnlNetworkButtonTitle += unchangeableNetworkStates.processing + ' network is processing';
                        }
                        /*
                        if ((unchangeableNetworkStates.processing > 0) && (unchangeableNetworkStates.collection > 0) ) {
                            $scope.setReadOnlNetworkButtonTitle += ', ';
                        }
                        if (unchangeableNetworkStates.collection > 1) {
                            $scope.setReadOnlNetworkButtonTitle += unchangeableNetworkStates.collection + ' networks are Cytoscape collections';
                        } else if (unchangeableNetworkStates.collection === 1) {
                            $scope.setReadOnlNetworkButtonTitle += unchangeableNetworkStates.collection + ' network is a Cytoscape collection';
                        }
                        */
                    } else {
                        $scope.setReadOnlNetworkButtonTitle += 'network';

                        if (unchangeableNetworkStates.nonadmin > 0) {
                            $scope.setReadOnlNetworkButtonTitle += ': you do not own it ';
                        } else if (unchangeableNetworkStates.certified > 0) {
                            $scope.setReadOnlNetworkButtonTitle += ': it is certified ';
                        } else if (unchangeableNetworkStates.failed > 0) {
                            $scope.setReadOnlNetworkButtonTitle += ': it is failed ';
                        } else if (unchangeableNetworkStates.processing > 0) {
                            $scope.setReadOnlNetworkButtonTitle += ': it is processing ';
                        //} else if (unchangeableNetworkStates.collection > 0) {
                        //    $scope.setReadOnlNetworkButtonTitle += ': it is a Cytoscape collection ';
                        }
                    }
                }
            };

            var enableOrDisableRemoveSharedNetworksBulkButton = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableRemoveSharedNetworksBulkButton = true;

                _.forEach (selectedNetworksRows, function(row) {

                    if (row.ownerUUID === myAccountController.loggedInIdentifier) {
                        $scope.enableRemoveSharedNetworksBulkButton = false;
                        return false;
                    }
                });

                if ($scope.enableRemoveSharedNetworksBulkButton) {
                    $scope.removeFromMyNetworksButtonTitle = (1 === selectedNetworksRows.length) ?
                        ' Remove selected shared network from My Networks ' :
                        ' Remove ' + selectedNetworksRows.length + ' selected shared networks from My Networks ';

                } else {
                    $scope.removeFromMyNetworksButtonTitle =
                        ' You can only remove networks that other NDEx users have shared with you ';
                }
            };

            var enableOrDisableDeleteBulkButton = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableDeleteBulkButton = true;

                var undeleteableNetworkStates = {'nonadmin' : 0, 'certified' : 0, 'readonly' : 0 /*"processing" : 0*/};
                var statesForWhichToDisable = Object.keys(undeleteableNetworkStates);

                _.forEach (selectedNetworksRows, function(row) {

                    if (row.ownerUUID !== myAccountController.loggedInIdentifier) {
                        undeleteableNetworkStates.nonadmin += 1;
                        $scope.enableDeleteBulkButton = false;
                        return true; // return true means "continue" in lodash's _.forEach loop
                    }
                    var status = row.Status;

                    var disableDeleteBulkButton =
                        (status && statesForWhichToDisable.indexOf(status.toLowerCase()) > -1);

                    if (disableDeleteBulkButton) {
                        $scope.enableDeleteBulkButton = false;
                        undeleteableNetworkStates[status.toLowerCase()] += 1;

                    } else if (row.isReadOnly) {
                        $scope.enableDeleteBulkButton = false;
                        undeleteableNetworkStates.readonly += 1;

                    }
                });

                if ($scope.enableDeleteBulkButton) {
                    $scope.deleteNetworkButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'Delete selected networks' : 'Delete selected network';
                } else {
                    $scope.deleteNetworkButtonTitle = 'Unable to delete selected ';

                    if (myAccountController.networkTableRowsSelected > 1) {
                        $scope.deleteNetworkButtonTitle += 'networks: ';

                        if (undeleteableNetworkStates.nonadmin > 1) {
                            $scope.deleteNetworkButtonTitle += 'you do not own ' +
                                undeleteableNetworkStates.nonadmin + ' networks';
                        } else if (undeleteableNetworkStates.nonadmin === 1) {
                            $scope.deleteNetworkButtonTitle += 'you do not own ' +
                                undeleteableNetworkStates.nonadmin + ' network';
                        }
                        if ((undeleteableNetworkStates.nonadmin > 0) &&
                            (((undeleteableNetworkStates.certified > 0) ||
                               undeleteableNetworkStates.readonly > 0) ||
                              (undeleteableNetworkStates.processing > 0))) {
                            $scope.deleteNetworkButtonTitle += ', ';
                        }
                        if (undeleteableNetworkStates.certified > 1) {
                            $scope.deleteNetworkButtonTitle += undeleteableNetworkStates.certified + ' networks are certified';
                        } else if (undeleteableNetworkStates.certified === 1) {
                            $scope.deleteNetworkButtonTitle += undeleteableNetworkStates.certified + ' network is certified';
                        }
                        if ((undeleteableNetworkStates.certified > 0) &&
                            ((undeleteableNetworkStates.readonly > 0) || (undeleteableNetworkStates.processing > 0))) {
                            $scope.deleteNetworkButtonTitle += ', ';
                        }
                        if (undeleteableNetworkStates.readonly > 1) {
                            $scope.deleteNetworkButtonTitle += undeleteableNetworkStates.readonly + ' networks are read-only';
                        } else if (undeleteableNetworkStates.readonly === 1) {
                            $scope.deleteNetworkButtonTitle += undeleteableNetworkStates.readonly + ' network is read-only';
                        }
                        if ((undeleteableNetworkStates.readonly > 0) && (undeleteableNetworkStates.processing > 0)) {
                            $scope.deleteNetworkButtonTitle += ', ';
                        }
                        if (undeleteableNetworkStates.processing > 1) {
                            $scope.deleteNetworkButtonTitle += undeleteableNetworkStates.processing + ' networks are processing';
                        } else if (undeleteableNetworkStates.processing === 1) {
                            $scope.deleteNetworkButtonTitle += undeleteableNetworkStates.processing + ' network is processing';
                        }
                    } else {
                        $scope.deleteNetworkButtonTitle += 'network';

                        if (undeleteableNetworkStates.nonadmin > 0) {
                            $scope.deleteNetworkButtonTitle += ': you do not own it ';
                        } else if (undeleteableNetworkStates.certified > 0) {
                            $scope.deleteNetworkButtonTitle += ': it is certified ';
                        } else if (undeleteableNetworkStates.readonly > 0) {
                            $scope.deleteNetworkButtonTitle += ': it is read-only ';
                        } else if (undeleteableNetworkStates.processing > 0) {
                            $scope.deleteNetworkButtonTitle += ': it is processing ';
                        }
                    }
                }
            };

            var enableOrDisableShareBulkButton = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableShareBulkButton = true;

                var unshareableNetworkStates = {'nonadmin' : 0, 'failed' : 0, 'processing' : 0};
                var statesForWhichToDisable = Object.keys(unshareableNetworkStates);

                _.forEach (selectedNetworksRows, function(row) {

                    if (row.ownerUUID !== myAccountController.loggedInIdentifier) {
                        unshareableNetworkStates.nonadmin += 1;
                        $scope.enableShareBulkButton = false;
                        return true; // return true means "continue" in lodash's _.forEach loop
                    }
                    var status = row.Status;

                    var disableShareBulkButton =
                        (status && statesForWhichToDisable.indexOf(status.toLowerCase()) > -1);

                    if (disableShareBulkButton) {
                        $scope.enableShareBulkButton = false;
                        unshareableNetworkStates[status.toLowerCase()] += 1;
                    }
                });

                if ($scope.enableShareBulkButton) {
                    $scope.shareNetworkButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'Share selected networks' : 'Share selected network';
                } else {
                    $scope.shareNetworkButtonTitle = 'Unable to share selected ';

                    if (myAccountController.networkTableRowsSelected > 1) {
                        $scope.shareNetworkButtonTitle += 'networks: ';

                        if (unshareableNetworkStates.nonadmin > 1) {
                            $scope.shareNetworkButtonTitle += 'you do not own ' +
                                unshareableNetworkStates.nonadmin + ' networks';
                        } else if (unshareableNetworkStates.nonadmin === 1) {
                            $scope.shareNetworkButtonTitle += 'you do not own ' +
                                unshareableNetworkStates.nonadmin + ' network';
                        }
                        if ((unshareableNetworkStates.nonadmin > 0) &&
                            ((unshareableNetworkStates.failed > 0) || (unshareableNetworkStates.processing > 0))) {
                            $scope.shareNetworkButtonTitle += ', ';
                        }
                        if (unshareableNetworkStates.failed > 1) {
                            $scope.shareNetworkButtonTitle += unshareableNetworkStates.failed + ' networks failed';
                        } else if (unshareableNetworkStates.failed === 1) {
                            $scope.shareNetworkButtonTitle += unshareableNetworkStates.failed + ' network failed';
                        }
                        if ((unshareableNetworkStates.failed > 0) && (unshareableNetworkStates.processing > 0)) {
                            $scope.shareNetworkButtonTitle += ', ';
                        }
                        if (unshareableNetworkStates.processing > 1) {
                            $scope.shareNetworkButtonTitle += unshareableNetworkStates.processing + ' networks are processing';
                        } else if (unshareableNetworkStates.processing=== 1) {
                            $scope.shareNetworkButtonTitle += unshareableNetworkStates.processing + ' network is processing';
                        }
                    } else {
                        $scope.shareNetworkButtonTitle += 'network';

                        if (unshareableNetworkStates.nonadmin > 0) {
                            $scope.shareNetworkButtonTitle += ': you do not own it ';
                        } else if (unshareableNetworkStates.failed > 0) {
                            $scope.shareNetworkButtonTitle += ': it is failed ';
                        } else if (unshareableNetworkStates.processing > 0) {
                            $scope.shareNetworkButtonTitle += ': it is processing ';
                        }
                    }
                }
            };

            var enableOrDisableExportBulkButton = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableExportBulkButton = true;

                var unexportableNetworkStates = {'failed' : 0, 'processing' : 0, 'collection' : 0};
                var statesForWhichToDisable = Object.keys(unexportableNetworkStates);

                _.forEach (selectedNetworksRows, function(row) {

                    var status = row.Status;

                    var disableExportBulkButton =
                        (status && statesForWhichToDisable.indexOf(status.toLowerCase()) > -1);

                    if (disableExportBulkButton) {
                        $scope.enableExportBulkButton = false;
                        unexportableNetworkStates[status.toLowerCase()] += 1;
                    }
                });

                if ($scope.enableExportBulkButton) {
                    $scope.exportNetworkButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'Export selected networks' : 'Export selected network';
                } else {
                    $scope.exportNetworkButtonTitle = 'Unable to export selected ';

                    if (myAccountController.networkTableRowsSelected > 1) {
                        $scope.exportNetworkButtonTitle += 'networks: ';

                        if (unexportableNetworkStates.failed > 1) {
                            $scope.exportNetworkButtonTitle += unexportableNetworkStates.failed + ' networks failed';
                        } else if (unexportableNetworkStates.failed === 1) {
                            $scope.exportNetworkButtonTitle += unexportableNetworkStates.failed + ' network failed';
                        }
                        if ((unexportableNetworkStates.failed > 0) &&
                            ((unexportableNetworkStates.processing > 0) || (unexportableNetworkStates.collection > 0))) {
                            $scope.exportNetworkButtonTitle += ', ';
                        }
                        if (unexportableNetworkStates.processing > 1) {
                            $scope.exportNetworkButtonTitle += unexportableNetworkStates.processing + ' networks are processing';
                        } else if (unexportableNetworkStates.processing === 1) {
                            $scope.exportNetworkButtonTitle += unexportableNetworkStates.processing + ' network is processing';
                        }
                        if ((unexportableNetworkStates.processing > 0) && (unexportableNetworkStates.collection > 0)) {
                            $scope.exportNetworkButtonTitle += ', ';
                        }
                        if (unexportableNetworkStates.collection > 1) {
                            $scope.exportNetworkButtonTitle += unexportableNetworkStates.collection + ' networks are Cytoscape collection';
                        } else if (unexportableNetworkStates.collection === 1) {
                            $scope.exportNetworkButtonTitle += unexportableNetworkStates.collection + ' network is Cytoscape collection';
                        }
                    } else {
                        $scope.exportNetworkButtonTitle += 'network';

                        if (unexportableNetworkStates.failed > 0) {
                            $scope.exportNetworkButtonTitle += ': it is failed ';
                        } else if (unexportableNetworkStates.processing > 0) {
                            $scope.exportNetworkButtonTitle += ': it is processing ';
                        } else if (unexportableNetworkStates.collection > 0) {
                            $scope.exportNetworkButtonTitle += ': it is a Cytoscape collection ';
                        }
                    }
                }
            };


            var enableOrDisableAddToMySetsBulkButton = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                $scope.enableAddToMySetsBulkButton = true;

                var invalidNetworkStates = {'failed' : 0};
                var statesForWhichToDisable = Object.keys(invalidNetworkStates);

                _.forEach (selectedNetworksRows, function(row) {

                    var status = row.Status;

                    var disableAddToMySetsBulkButton =
                        (status && statesForWhichToDisable.indexOf(status.toLowerCase()) > -1);

                    if (disableAddToMySetsBulkButton) {
                        $scope.enableAddToMySetsBulkButton = false;
                        invalidNetworkStates[status.toLowerCase()] += 1;
                    }
                });

                if ($scope.enableAddToMySetsBulkButton) {
                    $scope.addToMySetsButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'Add selected networks to my set(s)' : 'Add selected network to my set(s)';
                } else {
                    $scope.addToMySetsButtonTitle = 'Unable to add selected ';

                    if (myAccountController.networkTableRowsSelected > 1) {
                        $scope.addToMySetsButtonTitle += 'networks to my sets: ';

                        if (invalidNetworkStates.failed > 1) {
                            $scope.addToMySetsButtonTitle += invalidNetworkStates.failed + ' networks failed';
                        } else if (invalidNetworkStates.failed === 1) {
                            $scope.addToMySetsButtonTitle += invalidNetworkStates.failed + ' network failed';
                        }
                    } else {
                        $scope.addToMySetsButtonTitle += 'network to my sets';

                        if (invalidNetworkStates.failed > 0) {
                            $scope.addToMySetsButtonTitle += ': it is failed ';
                        }
                    }
                }
            };

            var defineNetworkTable = function()
            {
                //noinspection JSUnusedGlobalSymbols
                $scope.networkGridApi.grid.options.columnDefs = [
                    { field: '  ', enableFiltering: false, maxWidth: 42, cellTemplate: 'views/gridTemplates/networkStatusOnMyAccountPage.html'},
                    { field: 'Network Name', enableFiltering: true, cellTemplate: 'views/gridTemplates/networkName.html' },
                    { field: ' ', enableFiltering: false, width:40, cellTemplate: 'views/gridTemplates/downloadNetwork.html' },

                    { field: 'Format', enableFiltering: true, maxWidth:77,
                        sort: {
                            direction: uiGridConstants.DESC,
                            priority: 0
                        },

                        sortingAlgorithm: function(a, b) {
                            if (a === b) {
                                return 0;
                            }
                            if (a === 'Set') {
                                return 1;
                            }
                            if (b === 'Set') {
                                return -1;
                            }
                            if (a < b) {
                                return -1;
                            }
                            return 1;
                        }
                    },

                    { field: 'Ref.', enableFiltering: false, maxWidth: 45, cellTemplate: 'views/gridTemplates/reference.html' },
                    //{ field: 'Disease', enableFiltering: true, width: 68, cellTemplate: 'views/gridTemplates/disease.html'},
                    //{ field: 'Tissue',  enableFiltering: true, maxWidth: 65, cellTemplate: 'views/gridTemplates/tissue.html'},
                    //{ field: 'Nodes', enableFiltering: false, maxWidth:70 },
                    { field: 'Edges', enableFiltering: false, maxWidth: 75,
                        sortingAlgorithm: function (a, b) {
                            if (a === b) {
                                return 0;
                            }
                            if (a < b) {
                                return -1;
                            }
                            return 1;
                        }
                    },

                    //{ field: 'Visibility', enableFiltering: true, maxWidth:70, cellClass: 'grid-align-cell' },
                    { field: 'Visibility', enableFiltering: true, width: 90, cellTemplate: 'views/gridTemplates/visibility.html'},
                    { field: 'Owner', enableFiltering: true, width:80, cellTemplate: 'views/gridTemplates/ownedBy.html' },

                    // Last Modified is default sort order set by userSessionTablesSettings.clearPreviousSortingAndSetNewOne
                    { field: 'Last Modified', enableFiltering: false, maxWidth:120, cellFilter: 'date:\'short\'',
                        sortingAlgorithm: function (a, b) {
                            var dateA = new Date(a);
                            var dateB = new Date(b);

                            if (dateA === dateB) {
                                return 0;
                            }
                            if (dateA < dateB) {
                                return -1;
                            }
                            return 1;
                        }
                    },

                    { field: 'Show', enableFiltering: false, maxWidth: 60, cellTemplate: 'views/gridTemplates/showCase.html' },

                    { field: 'description', enableFiltering: false,  visible: false},
                    { field: 'externalId',  enableFiltering: false,  visible: false},
                    { field: 'ownerUUID',   enableFiltering: false,  visible: false},
                    { field: 'name',        enableFiltering: false,  visible: false},

                    { field: 'errorMessage', enableFiltering: false,  visible: false},
                    { field: 'subnetworks',  enableFiltering: false,  visible: false},
                    { field: 'isReadOnly',   enableFiltering: false,  visible: false},
                    { field: 'indexLevel',   enableFiltering: false,  visible: false}
                ];

                var $myNetworksGridId = $('#myNetworksGridId');
                $myNetworksGridId.height($(window).height() - windowsHeightCorrection);
                $scope.networkGridApi.grid.gridHeight = $myNetworksGridId.height();
            };

            //table
            $scope.networkGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                // the default value value of columnVirtualizationThreshold is 10; we need to set it to 20 because
                // otherwise it will not show all columns if we display more than 10 columns in our table
                columnVirtualizationThreshold: 20,
                enableColumnMenus: false,
                enableRowHeaderSelection: true,

                paginationPageSizes: [100, 500, 1000],
                paginationPageSize: $rootScope.myAccountPageStates.table.networksPerPage,
                useExternalPagination: true,

                saveFocus: true,

                onRegisterApi: function( gridApi )
                {
                    $scope.networkGridApi = gridApi;

                    defineNetworkTable();

                    /** @namespace gridApi.pagination.on.paginationChanged **/
                    gridApi.pagination.on.paginationChanged($scope, function (newPageNumber, pageSize) {

                        if ((pageNo === newPageNumber) && (pageSize === $rootScope.myAccountPageStates.table.networksPerPage)) {
                            return;
                        }
                        if (pageSize === $rootScope.myAccountPageStates.table.networksPerPage) {
                            if (newPageNumber === 1) {
                                $location.path('/myAccount', false);
                            } else {
                                $location.path('/myAccount/p' + newPageNumber, false);
                            }
                        } else {
                            $rootScope.myAccountPageStates.table.networksPerPage = pageSize;
                        }

                        paginationOptions.pageNumber = newPageNumber;
                        pageNo = newPageNumber;
                        pageNoP = 'p' + pageNo;

                        //myAccountNetworkTableFiltersAndSorting.pageNumber = newPageNumber;
                        paginationOptions.pageSize = pageSize;
                        ndexSpinner.startSpinner(spinnerMyAccountPageId);
                        myAccountController.getNoOfNetworksAndSets(
                            function() {
                                myAccountController.loadNetworks();
                            },
                            function() {
                                console.log('unable to get No of Networks and Sets for this account');
                            });
                    });

                    gridApi.core.on.rowsRendered($scope, function() {
                        // we need to call core.handleWindowResize() to fix the table layout in case it is distorted
                        setTimeout($scope.networkGridApi.core.handleWindowResize, 250);

                        if (myAccountController.networkTableRowsSelected > 0) {
                            for (var i = 0; i < $scope.networkGridApi.grid.rows.length; i++) {
                                var row = $scope.networkGridApi.grid.rows[i];
                                if (row.entity && row.entity.externalId &&
                                    (row.entity.externalId in $scope.selectedRowsNetworkExternalIds)) {
                                    $scope.networkGridApi.grid.rows[i].isSelected = true;
                                }
                            }
                        }

                        $scope.refreshNetworksButtonDisabled = false;

                        enableOrDisableEditPropertiesBulkMenu();
                        enableOrDisableChangeVisibilityBulkMenu();
                        enableOrDisableSetReadOnlyBulkMenu();

                        enableOrDisableExportBulkButton();
                        enableOrDisableShareBulkButton();
                        enableOrDisableAddToMySetsBulkButton();
                        enableOrDisableRemoveSharedNetworksBulkButton();
                        enableOrDisableDeleteBulkButton();
                    });

                    /** @namespace gridApi.selection.on.rowSelectionChanged **/
                    gridApi.selection.on.rowSelectionChanged($scope,function(row){

                        if ((row.entity.Status === 'Set') && (row.isSelected)) {
                            row.isSelected = false;

                            var selectedCount = $scope.networkGridApi.grid.selection.selectedCount;
                            if (selectedCount > 0) {
                                $scope.networkGridApi.grid.selection.selectedCount = selectedCount - 1;

                                var title = 'Cannot Select a Set';
                                var message =
                                    'Cannot select a Set in this release. This feature will be added in future.';

                                ndexNavigation.genericInfoModal(title, message);
                            }
                            return;
                        }

                        if (row.isSelected) {
                            $scope.selectedRowsNetworkExternalIds[row.entity.externalId] = row.entity.name;
                            userSessionTablesSettings.addUUIDToSelectedNetworks(row.entity.externalId);
                        } else {
                            delete $scope.selectedRowsNetworkExternalIds[row.entity.externalId];
                            userSessionTablesSettings.deleteUUIDFromSelectedNetworks(row.entity.externalId);
                        }

                        myAccountController.networkTableRowsSelected = _.size($scope.selectedRowsNetworkExternalIds);

                        changeNetworkBulkActionsButtonsLabels();

                        enableOrDisableEditPropertiesBulkMenu();
                        enableOrDisableChangeVisibilityBulkMenu();
                        enableOrDisableSetReadOnlyBulkMenu();

                        enableOrDisableExportBulkButton();
                        enableOrDisableShareBulkButton();
                        enableOrDisableAddToMySetsBulkButton();
                        enableOrDisableRemoveSharedNetworksBulkButton();
                        enableOrDisableDeleteBulkButton();
                    });

                    /** @namespace gridApi.selection.on.rowSelectionChangedBatch **/
                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){

                        _.forEach(rows, function(row) {
                            if (row.entity.Status === 'Set') {
                                if (row.isSelected) {
                                    // unselect a Set: make row.isSelected false and decrement the number of selected items
                                    row.isSelected = false;

                                    var selectedCount = $scope.networkGridApi.grid.selection.selectedCount;
                                    if (selectedCount > 0) {
                                        $scope.networkGridApi.grid.selection.selectedCount = selectedCount - 1;
                                    }
                                }
                            } else {
                                if (row.isSelected) {
                                    $scope.selectedRowsNetworkExternalIds[row.entity.externalId] = row.entity.name;
                                    userSessionTablesSettings.addUUIDToSelectedNetworks(row.entity.externalId);
                                } else {
                                    delete $scope.selectedRowsNetworkExternalIds[row.entity.externalId];
                                    userSessionTablesSettings.deleteUUIDFromSelectedNetworks(row.entity.externalId);
                                }
                            }
                        });

                        myAccountController.networkTableRowsSelected = _.size( $scope.selectedRowsNetworkExternalIds);

                        changeNetworkBulkActionsButtonsLabels();

                        enableOrDisableEditPropertiesBulkMenu();
                        enableOrDisableChangeVisibilityBulkMenu();
                        enableOrDisableSetReadOnlyBulkMenu();

                        enableOrDisableExportBulkButton();
                        enableOrDisableShareBulkButton();
                        enableOrDisableAddToMySetsBulkButton();
                        enableOrDisableRemoveSharedNetworksBulkButton();
                        enableOrDisableDeleteBulkButton();
                    });


                    gridApi.core.on.sortChanged($scope, function(grid, sortColumns) {

                        if (Array.isArray(sortColumns) && (1 === sortColumns.length)) {
                            userSessionTablesSettings.setPageSorting(pageNoP, sortColumns[0].name, sortColumns[0].sort);
                        }
                        else {
                            userSessionTablesSettings.setPageSortingToUnsorted(pageNoP);
                        }
                    });

                    /** @namespace gridApi.core.on.filterChanged **/
                    gridApi.core.on.filterChanged($scope, function() {

                        var grid = this.grid;

                        angular.forEach(grid.columns, function(col) {

                            var filterTerm = col.filters[0].term;
                            var columnName = col.name;

                            if (filterTerm) {
                                userSessionTablesSettings.setFilterForPage(pageNoP, columnName, filterTerm);

                            } else {
                                userSessionTablesSettings.removeFilterFromPage(pageNoP, columnName);

                            }

                        });
                    });
                }
            };

            $scope.tasksAndRequestsGridOptions =
            {
                enableSorting: true,
                enableFiltering: true,
                showGridFooter: true,
                // the default value value of columnVirtualizationThreshold is 10; we need to set it to 20 because
                // otherwise it will not show all columns if we display more than 10 columns in our table
                columnVirtualizationThreshold: 20,
                enableColumnMenus: false,
                enableRowHeaderSelection: true,

                onRegisterApi: function( gridApi )
                {
                    $scope.taskGridApi = gridApi;

                    gridApi.core.on.rowsRendered($scope, function() {
                        // we need to call core.handleWindowResize() to fix the table layout in case it is distorted
                        // Call core.handleWindowResize in 0.1 sec after gridApi.core.on.rowsRendered has fired to make
                        // sure the table resizes.  It is a known issue with UI Grid that sometimes core.handleWindowResize
                        // doesn't have effect if it is called immediately, thus we delay its' execution.
                        setTimeout($scope.taskGridApi.core.handleWindowResize, 250);
                        $scope.refreshTasksButtonDisabled = false;

                        if (myAccountController.taskTableRowsSelected > 0) {

                            _.forEach ($scope.taskGridApi.grid.rows, function(row) {
                                //var row = $scope.taskGridApi.grid.rows[i];

                                if (row.entity) {

                                    if (row.entity.taskId &&
                                        (row.entity.taskId in $scope.selectedRowsTasksExternalIds)) {
                                        //$scope.taskGridApi.grid.rows[i].isSelected = true;
                                        row.isSelected = true;
                                    }
                                }
                            });
                        }
                    });

                    gridApi.selection.on.rowSelectionChanged($scope,function(row){
                        if (row.isSelected) {
                            if (row.entity.taskId) {
                                $scope.selectedRowsTasksExternalIds[row.entity.taskId] = '';
                            }
                            if ((row.entity.typeFromServer === 'export_network_to_file') &&
                                (row.entity.Status === 'completed')) {
                                myAccountController.numberOfDownloadableTasks++;
                            }
                            if (row.entity.whatType === 'received') {
                                myAccountController.numberOfReceivedRequests++;
                            }
                        } else {
                            if (row.entity.taskId) {
                                delete $scope.selectedRowsTasksExternalIds[row.entity.taskId];
                            }
                            if ((row.entity.typeFromServer === 'export_network_to_file') &&
                                (myAccountController.numberOfDownloadableTasks > 0)) {
                                myAccountController.numberOfDownloadableTasks--;
                            }
                            if ((row.entity.whatType === 'received') &&
                                (myAccountController.numberOfReceivedRequests > 0)) {
                                myAccountController.numberOfReceivedRequests--;
                            }
                        }

                        myAccountController.taskTableRowsSelected = _.size($scope.selectedRowsTasksExternalIds);
                    });

                    gridApi.selection.on.rowSelectionChangedBatch($scope,function(rows){

                        _.forEach(rows, function(row) {
                            if (row.isSelected) {
                                if (row.entity.taskId) {
                                    $scope.selectedRowsTasksExternalIds[row.entity.taskId] = '';
                                }
                                if ((row.entity.typeFromServer === 'export_network_to_file') &&
                                    (row.entity.Status === 'completed')) {
                                    myAccountController.numberOfDownloadableTasks++;
                                }
                                if (row.entity.whatType === 'received') {
                                    myAccountController.numberOfReceivedRequests++;
                                }
                            } else {
                                if (row.entity.taskId) {
                                    delete $scope.selectedRowsTasksExternalIds[row.entity.taskId];
                                }
                                if ((row.entity.typeFromServer === 'export_network_to_file') &&
                                    (myAccountController.numberOfDownloadableTasks > 0)) {
                                    myAccountController.numberOfDownloadableTasks--;
                                }
                                if ((row.entity.whatType === 'received') &&
                                    (myAccountController.numberOfReceivedRequests > 0)) {
                                    myAccountController.numberOfReceivedRequests--;
                                }
                            }
                        });

                        myAccountController.taskTableRowsSelected = _.size($scope.selectedRowsTasksExternalIds);
                    });
                }
            };

            myAccountController.tasksAndRequestsGridOptions = $scope.tasksAndRequestsGridOptions;


            $scope.showTasksAndRequestsTable = function() {
                return (myAccountController.pendingRequests.length > 0 ||
                    myAccountController.sentRequests.length > 0    ||
                    myAccountController.tasks.length > 0);

            };

            var defineTasksAndNotificationsTable = function()
            {
                $scope.taskGridApi.grid.options.columnDefs = [
                    { field: 'New',   enableFiltering: true, width: 60, sort: {direction: 'desc', priority: 5},
                        cellTemplate: 'views/gridTemplates/taskOrRequestNew.html' },  // , new, etc. cellTemplate: 'views/gridTemplates/taskStatusOnTasksPage.html'
                    { field: 'Status', enableFiltering: true, maxWidth: 80, cellTemplate: 'views/gridTemplates/taskOrRequestStatus.html' },
                    { field: 'Type', enableFiltering: true,   width: 150, cellTemplate: 'views/gridTemplates/taskOrRequestType.html' },  // task, sent/received notification
                    { field: 'Description', enableFiltering: true, cellTemplate: 'views/gridTemplates/taskOrRequestDescription.html'},
                    { field: 'Created', enableFiltering: false, maxWidth: 120,
                        cellFilter: 'date:\'short\'',  sort: {direction: 'desc', priority: 5}
                    },
                    //{ field: 'Last Accessed', enableFiltering: false, cellFilter: "date:'short'", visible: false },
                    { field: 'Delete',  enableFiltering: false, maxWidth: 60, cellTemplate: 'views/gridTemplates/deleteTask.html' },

                    { field: 'taskId',      enableFiltering: false,  visible: false},
                    { field: 'ownerUUID',   enableFiltering: false,  visible: false},
                    { field: 'typeFromServer',  enableFiltering: false,  visible: false},
                    { field: 'newTask',      enableFiltering: false,  visible: false},
                    { field: 'newSent',      enableFiltering: false,  visible: false},
                    { field: 'newReceived',  enableFiltering: false,  visible: false},
                    { field: 'whatType',     enableFiltering: false,  visible: false}
                ];

                var $myTasksAndRequestsGridId = $('#myTasksAndRequestsGridId');
                $myTasksAndRequestsGridId.height($(window).height() - windowsHeightCorrection);
                $scope.taskGridApi.grid.gridHeight = $myTasksAndRequestsGridId.height();
            };

/*
            $scope.getExportedNetworkDownloadLink = function(taskId) {
                return ndexService.getNdexServerUri() + "/task/" + taskId + "/file?download=true";
            }; */

            $scope.getCredentialsForExportedNetworkDownload = function(taskId) {
                var link = ndexService.getNdexServerUri() + '/task/' + taskId + '/file?download=true';
                var anchor = document.createElement('a');
                //var myId = taskId + '';

                if (window.currentSignInType === 'google') {
                    anchor.setAttribute('href', link + '&id_token=' +
                         window.keycloak.token);
                    //gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token);
                }

                else if (window.currentSignInType === 'basic') {
                    var userCredentials = ndexUtility.getUserCredentials();
                    anchor.setAttribute('href', link + '&auth_token=' +  btoa(userCredentials['userName'] + ':' +userCredentials['token']));
                 //   anchor.setAttribute('id', myId);
                //    anchor.username = userCredentials.userName;
                //    anchor.password = userCredentials.token;
                }

                anchor.setAttribute('type', 'hidden');
                document.body.appendChild(anchor);
                anchor.click();
                anchor.remove();
            };

            myAccountController.downloadSelectedTasks = function() {
                var tasksToDownload = _.filter($scope.taskGridApi.selection.getSelectedRows(),
                        {typeFromServer: 'export_network_to_file', Status: 'completed'});
                var countSelectedRows = tasksToDownload.length;

                for (var i = 0; i < countSelectedRows; i++) {
                    var taskId = tasksToDownload[i].taskId;
                    setTimeout(
                        $scope.getCredentialsForExportedNetworkDownload, i*500, taskId);
                }
            };

            $scope.enabledManageRequestsBulkButton = function() {
                return myAccountController.numberOfReceivedRequests > 0;
            };
            $scope.enabledBulkDownloadButton = function() {
                return myAccountController.numberOfDownloadableTasks > 0;
            };

            $scope.markAsRead = function(entity) {

                // we only update sent requests; can't update received requests since logged in user doesn't own them

                if ((entity.whatType === 'sent') && (entity.newSent) &&
                    (entity.Status !== 'accepted') && (entity.Status !== 'declined') ||
                    (!entity.newTask && !entity.newSent)) {
                    return;
                }
                var properties = {};
                if (entity.whatType === 'task') {
                    properties.newTask = false;
                    ndexService.updateTaskPropertiesV2(entity.taskId, properties,
                        function () {
                            entity.newTask = false;
                            entity.New = '&nbsp;&nbsp;';

                            if (myAccountController.numberOfNewTasksAndRequests > 0) {
                                myAccountController.numberOfNewTasksAndRequests--;
                            }
                            $scope.taskGridApi.core.refresh();
                        },
                        function () {
                            console.log('unable to update task');
                        }
                    );
                } else if (entity.whatType === 'sent') {

                    properties.newSent = false;

                    // entity.taskId below is in fact request Id
                    ndexService.updateRequestPropertiesV2(entity.taskId, properties,
                        function () {
                            entity.newSent = false;
                            entity.New = '&nbsp;&nbsp;';

                            if (myAccountController.numberOfNewTasksAndRequests > 0) {
                                myAccountController.numberOfNewTasksAndRequests--;
                            }

                            $scope.taskGridApi.core.refresh();
                        },
                        function () {
                            console.log('unable to update request');
                        }
                    );
                }
            };

            $scope.showSetInfo = function(setId) {
                var networkSet = _.find(myAccountController.networkSets, {externalId:setId});

                // make a copy of network summary object since we are going to modify it
                var set = JSON.parse(JSON.stringify(networkSet));

                uiMisc.showSetInfo(set);
            };

            /*
             * This function removes most HTML tags and replaces them with markdown symbols so that this
             * field could be displayed in the title element of networkName.html template in the pop-up window
             * when mouse cursor hovers over it.
             */
            $scope.stripHTML = function(html) {

                if (!html) {
                    return '';
                }

                // convert HTML to markdown; toMarkdown is defined in to-markdown.min.js
                var markDown = toMarkdown(html); // jshint ignore:line

                // after using toMarkdown() at previous statement, markDown var can still contain
                // some HTML Code (i.e.,<span class=...></span>). In order to remove it, we use jQuery text() function.
                // We need to add <html> and </html> in the beginning and of markDown variable; otherwise, markDown
                // will not be recognized byu text() as a valid HTML and exception will be thrown.

                // Note that we need to use toMarkdown() followed by jQuery text(); if just jQuery text() is used, then
                // all new lines and </p> , </h1>...</h6> tags are removed; and all lines get "glued" together
                return $('<html>'+markDown+'</html>').text();
            };

            var populateNetworkTable = function()
            {
                $scope.networkGridOptions.data = [];

                _.forEach(myAccountController.networkSets, function(networkSet) {
                    myAccountController.addNetworkSetToTable(networkSet);
                });

                for(var i = 0; i < myAccountController.networkSearchResults.length; i++ )
                {
                    var network = myAccountController.networkSearchResults[i];

                    var subNetworkInfo  = uiMisc.getSubNetworkInfo(network);
                    var noOfSubNetworks = subNetworkInfo.numberOfSubNetworks;
                    var subNetworkId    = subNetworkInfo.id;

                    var networkStatus = 'success';
                    if (network.errorMessage) {
                        networkStatus = 'failed';
                    } else if (!network.isValid) {
                        networkStatus = 'processing';
                    } else if (network.isCertified) {
                        networkStatus = 'certified';
                    }
                    if ((networkStatus === 'success') && network.warnings && network.warnings.length > 0) {
                        networkStatus = 'warning';
                    }
                    var networkName = (!network.name) ? 'No name; UUID : ' + network.externalId : network.name;
                    if (networkStatus === 'failed') {
                        networkName = 'Invalid Network. UUID: ' + network.externalId;
                    } else if (noOfSubNetworks >= 1) {
                        networkStatus = 'collection';
                    }
                    var description = $scope.stripHTML(network.description);
                    var externalId = network.externalId;
                    //var nodes = network['nodeCount'];
                    var edges = parseInt(network.edgeCount);
                    var owner = network.owner;
                    var indexLevel = network.indexLevel;
                    var visibility = network.visibility;
                    var modified = new Date(network.modificationTime);
                    var showcase = network.isShowcase;

                    var format = (subNetworkId) ? uiMisc.getNetworkFormat(subNetworkId, network) :
                        uiMisc.getNetworkFormatForMultipleSubNetworks(network);
                    var download  = 'Download ' + networkName;
                    var reference = uiMisc.getNetworkReferenceObj(subNetworkId, network);
                    //var disease   = uiMisc.getDisease(network);
                    //var tissue    = uiMisc.getTissue(network);

                    var errorMessage = network.errorMessage ? network.errorMessage : '';

                    //var networks = 0;
                    //var isReadOnly = network['isReadOnly'] ? network['isReadOnly'] : false;

                    /*
                    if (networkStatus == "collection") {
                        format = "Collection";
                    };
                    */

                    var row =   {
                        'Status'        :   networkStatus,
                        'Network Name'  :   networkName,
                        'Download'      :   download,
                        'Format'        :   format,
                        'Reference'     :   reference,
                        //'Disease'       :   disease,
                        //'Tissue'        :   tissue,
                        //"Nodes"         :   nodes,
                        'Edges'         :   edges,
                        'Visibility'    :   visibility,
                        'Owner'         :   owner ,
                        'Last Modified' :   modified,
                        'Show'          :   showcase,
                        'description'   :   description,
                        'externalId'    :   externalId,
                        'ownerUUID'     :   network.ownerUUID,
                        'name'          :   networkName,
                        'errorMessage'  :   errorMessage,
                        'subnetworks'   :   noOfSubNetworks,
                        'isReadOnly'    :   network.isReadOnly,
                        'indexLevel'    :   indexLevel
                    };
                    $scope.networkGridOptions.data.push(row);
                }

                myAccountController.showNetworkTable = (_.size($scope.networkGridOptions.data) > 0);

                $scope.networkGridApi.grid.options.paginationCurrentPage = pageNo;

                userSessionTablesSettings.clearPreviousFiltersAndSetNewOnes($scope.networkGridApi.grid, pageNoP);
                userSessionTablesSettings.clearPreviousSortingAndSetNewOne($scope.networkGridApi.grid, pageNoP);
            };


            var populateTasksAndNotificationsTable = function()
            {
                $scope.tasksAndRequestsGridOptions.data = [];

                var newTasksAndNotifications = 0;

                _.forEach(myAccountController.tasks, function(task)
                {
                    /** @namespace task.taskType **/
                    /** @namespace task.taskOwnerId **/
                    var taskType         = task.taskType.toLowerCase();
                    var taskCreationTime = task.creationTime;
                    var taskDescription  = task.description;
                    var taskUUID         = task.externalId;
                    var taskOwnerUUID    = task.taskOwnerId;
                    var taskStatus       = task.status.toLowerCase();

                    if (taskType && taskType.toUpperCase() === 'EXPORT_NETWORK_TO_FILE' && task.attributes) {
                        //var taskDownloadFileExtension = task.attributes.downloadFileExtension;
                        var taskDownloadFileName      = task.attributes.downloadFileName;
                        //var taskAttributeName          = task.attributes.name;

                        if (taskStatus === 'processing') {
                            taskDescription = 'Exporting ' + taskDownloadFileName + '...';
                        } else if (taskStatus === 'completed') {
                            taskDescription = 'Download ' + taskDownloadFileName;
                        }
                    }
                    if (taskType === 'export_network_to_file') {
                        taskType = 'export network to file';
                    }
                    var newTask =
                        /** @namespace task.ownerProperties **/
                        (task.ownerProperties &&
                            (typeof task.ownerProperties.newTask !== 'undefined')) ? task.ownerProperties.newTask : true;

                    var newLabel = 'New!';
                    if (newTask && (taskStatus === 'failed' || taskStatus === 'completed')) {
                        newTasksAndNotifications++;
                    } else {
                        newLabel = ' ';
                    }
                    var newSent     = false;
                    var newReceived = false;

                    var row = {
                        'New'            : newLabel,
                        'Status'         : taskStatus,
                        'Type'           : taskType,
                        'Description'    : taskDescription,
                        'Created'        : taskCreationTime,
                        'Delete'         : 'delete',
                        'taskId'         : taskUUID,
                        'ownerUUID'      : taskOwnerUUID,
                        'typeFromServer' : task.taskType.toLowerCase(),
                        'newTask'        : newTask,
                        'newSent'        : newSent,
                        'newReceived'    : newReceived,
                        'whatType'       : 'task'
                    };
                    $scope.tasksAndRequestsGridOptions.data.push(row);
                });

                _.forEach(myAccountController.pendingRequests, function(pendingRequest)  {

                    var requestType = 'unknown';

                    /** @namespace pendingRequest.requestType **/
                    if (pendingRequest.requestType) {
                        var requestTypeLowerCased = pendingRequest.requestType.toLowerCase();
                        if (requestTypeLowerCased === 'usernetworkaccess') {
                            requestType = 'user network access';
                        } else if (requestTypeLowerCased === 'groupnetworkaccess') {
                            requestType = 'group network access';
                        } else if (requestTypeLowerCased === 'joingroup') {
                            requestType = 'received join group';
                        }
                    }

                    var requestCreationTime    = pendingRequest.creationTime;

                    var requestDescription = pendingRequest.sourceName + ' requests ' +
                        _.startCase(pendingRequest.permission.toLowerCase()) + ' access to ' + pendingRequest.destinationName;

                    var requestUUID      = pendingRequest.externalId;
                    var requestOwnerUUID = pendingRequest.requesterId;
                    var requestStatus    = pendingRequest.response.toLowerCase();

                    var newRequest =
                        (pendingRequest.properties && (typeof pendingRequest.properties.newReceived !== 'undefined')) ?
                            pendingRequest.properties.newReceived : true;

                    var newLabel = 'New!';
                    if (newRequest) {
                        newTasksAndNotifications++;
                    } else {
                        newLabel = ' ';
                    }
                    var typeFromServer = pendingRequest.requestType.toLowerCase();

                    var newTask = false;
                    var newSent = false;

                    var row = {
                        'New'            : newLabel,
                        'Status'         : requestStatus,
                        'Type'           : requestType,
                        'Description'    : requestDescription,
                        'Created'        : requestCreationTime,
                        'Delete'         : 'delete',
                        'taskId'         : requestUUID,
                        'ownerUUID'      : requestOwnerUUID,
                        'typeFromServer' : typeFromServer,
                        'newTask'        : newTask,
                        'newSent'        : newSent,
                        'newReceived'    : newRequest,
                        'whatType'       : 'received'
                    };
                    $scope.tasksAndRequestsGridOptions.data.push(row);

                });

                _.forEach(myAccountController.sentRequests, function(sentRequest) {

                    var requestType = 'unknown';
                    if (sentRequest.requestType) {
                        if (sentRequest.requestType.toLowerCase() === 'usernetworkaccess') {
                            requestType = 'user network access';
                        } else if (sentRequest.requestType.toLowerCase() === 'groupnetworkaccess') {
                            requestType = 'group network access';
                        } else if (sentRequest.requestType.toLowerCase() === 'joingroup') {
                            requestType = 'sent join group';
                        }
                    }
                    var requestCreationTime    = sentRequest.creationTime;

                    var requestDescription = sentRequest.sourceName + ' requests ' +
                        _.startCase(sentRequest.permission.toLowerCase()) + ' access to ' + sentRequest.destinationName;

                    var requestUUID       = sentRequest.externalId;
                    var requestOwnerUUID  = sentRequest.requesterId;
                    var requestStatus     = sentRequest.response.toLowerCase();

                    var newRequest =
                        (sentRequest.properties && (typeof sentRequest.properties.newSent !== 'undefined')) ?
                            sentRequest.properties.newSent : true;

                    var newLabel = 'New!';
                    if (newRequest && (requestStatus === 'accepted' || requestStatus === 'declined')) {
                        newTasksAndNotifications++;
                    } else {
                        newLabel = ' ';
                    }
                    var typeFromServer = sentRequest.requestType.toLowerCase();

                    var newTask     = false;
                    var newReceived = false;

                    var row = {
                        'New'            : newLabel,
                        'Status'         : requestStatus,
                        'Type'           : requestType,
                        'Description'    : requestDescription,
                        'Created'        : requestCreationTime,
                        'Delete'         : 'delete',
                        'taskId'         : requestUUID,
                        'ownerUUID'      : requestOwnerUUID,
                        'typeFromServer' : typeFromServer,
                        'newTask'        : newTask,
                        'newSent'        : newRequest,
                        'newReceived'    : newReceived,
                        'whatType'       : 'sent'
                    };
                    $scope.tasksAndRequestsGridOptions.data.push(row);
                });

                myAccountController.numberOfNewTasksAndRequests = newTasksAndNotifications;
            };

            myAccountController.getNoOfSelectedNetworksOnCurrentPage = function() {
                if ($scope.networkGridApi && $scope.networkGridApi.selection) {
                    return $scope.networkGridApi.selection.getSelectedRows().length;
                }
                return 0;
            };

            myAccountController.getTaskFileExt = function(task)
            {
                if( !task.format ) {
                    return '';
                }
                if( task.format.toUpperCase() === 'BIOPAX' ) {
                    return 'owl';
                }
                else {
                    return task.format.toLowerCase() + '.gz';
                }
            };

            myAccountController.getNetworkDownloadName = function(taskId)
            {
                var task = _.find(myAccountController.tasks, {'externalId': taskId});

                if (!task || typeof task.attributes === 'undefined') {
                    return;
                }

                /** @namespace task.attributes.downloadFileName **/
                var name = (typeof task.attributes.downloadFileName === 'undefined') ?
                    task.externalId : task.attributes.downloadFileName.replace(/ /g, '_');

                /** @namespace task.attributes.downloadFileExtension **/
                var extension = (typeof task.attributes.downloadFileExtension === 'undefined') ?
                    'txt' : myAccountController.getTaskFileExt(task);

                return (name + '.' + extension);
            };

            myAccountController.getNetworkName = function(task)
            {
                if (typeof task.attributes === 'undefined' ||
                    typeof task.attributes.downloadFileName === 'undefined') {
                    return task.externalId;
                }

                return task.attributes.downloadFileName;
            };

            function sequence(array, callback) {
                return array.reduce(function chain(promise, item) {
                    return promise.then(function () {
                        return callback(item);
                    });
                }, Promise.resolve());
            }


            function removeSharedNetwork(networkId) {
                return ndexService.deleteNetworkPermissionNoHandlersV2(
                    networkId, 'user', myAccountController.loggedInIdentifier);
            }

            myAccountController.removeSharedSelectedNetworks = function() {

                var networksToRemove         = $scope.networkGridApi.selection.getSelectedRows();
                var numberOfNetworksToRemove = $scope.networkGridApi.selection.getSelectedRows().length;
                var dismissModal = false;

                var title   = (numberOfNetworksToRemove > 1) ?
                    'Remove Selected Shared Networks' : 'Remove Selected Shared Network';

                var message = (numberOfNetworksToRemove > 1) ?
                    'Another NDEx user has shared these ' + numberOfNetworksToRemove + ' networks with you and ' +
                    ' removing them from your account might prevent you from accessing them in the future. <br><br>' +
                    'Are you sure you want to remove these shared networks?' :

                    'Another NDEx user has shared this network with you and ' +
                    ' removing it from your account might prevent you from accessing it in the future. <br><br>' +
                    'Are you sure you want to remove this shared network?';

                var cancelHit = false;
                var errorFromServer = false;
                var removedCount = 0;

                ndexNavigation.openConfirmationModal(title, message, 'Remove', 'Cancel', dismissModal,
                    function ($modalInstance) {
                        $modalInstance.disableConfirmButton();

                        sequence(networksToRemove, function (network) {
                            if (cancelHit || errorFromServer) {
                                return;
                            }
                            return removeSharedNetwork(network.externalId).then(function () {
                                removedCount++;

                                if (myAccountController.networkTableRowsSelected > 0) {
                                    myAccountController.networkTableRowsSelected--;
                                }
                                delete $scope.selectedRowsNetworkExternalIds[network.externalId];
                                userSessionTablesSettings.deleteUUIDFromSelectedNetworks(network.externalId);

                                $modalInstance.setProgress('Removed: ' + removedCount + ' of ' + numberOfNetworksToRemove + ' selected networks');
                                $modalInstance.setProgress2('Removed: ' + network.name);

                                if ((removedCount === numberOfNetworksToRemove) || !$scope.isProcessing) {
                                    $scope.networkGridApi.grid.selection.selectedCount = myAccountController.networkTableRowsSelected;
                                    myAccountController.checkAndRefreshMyNetworksTableAndDiskInfo();

                                    $modalInstance.dismiss();
                                }
                            });
                        }).catch(function (reason) {

                            errorFromServer = true;
                            var errorMessage = 'Unable to remove';
                            var errorMessage1 =
                                (reason.data && reason.data.message) ? errorMessage + ': ' +  reason.data.message :
                                    errorMessage + '.';

                            $modalInstance.setError(errorMessage1);

                            $scope.networkGridApi.grid.selection.selectedCount = myAccountController.networkTableRowsSelected;
                            myAccountController.checkAndRefreshMyNetworksTableAndDiskInfo();

                        });
                    },
                    function ($modalInstance) {
                        // user hit Cancel; in case operation was in progress, set cancelHit to true
                        // to prevent sending more requests to the server
                        cancelHit = true;

                        $modalInstance.dismiss();
                    });
            };

            function deleteNetwork(network) {
                return ndexService.deleteNetworkNoHandlersV2(network.externalId);
            }

            var deleteSelectedNetworks = function(networksInfo) {

                var numberOfSelectedNetworks    = networksInfo.selected;
                var numberOfReadOnly            = networksInfo.readOnly;
                var numberOfNonAdminNetworks    = networksInfo.nonAdmin;
                var networksToDelete            = networksInfo.networks;

                var numberOfNetworksToDel = networksToDelete.length;

                var message = '';
                var title   = '';

                if ((numberOfReadOnly > 0) || (numberOfNonAdminNetworks > 0)) {
                    title = (numberOfSelectedNetworks === 1) ? 'Cannot Delete Selected Network' :
                        'Cannot Delete Selected Networks';

                    if (numberOfSelectedNetworks === 1) {
                        message = 'The selected network cannot be deleted: ';

                        if ((1 === numberOfReadOnly) && (1 === numberOfNonAdminNetworks)) {
                            message += ' you are not an owner and it is read-only.';
                        } else if (1 === numberOfReadOnly) {
                            message += ' it is read-only.';
                        } else if (1 === numberOfNonAdminNetworks) {
                            message += ' you are not an owner.';
                        } else {
                            // this should never execute though
                            message += '.';
                        }
                    } else {
                        message = 'The selected ' + numberOfSelectedNetworks + ' networks cannot be deleted: ';

                        if (0 === numberOfReadOnly) {
                            if (numberOfNonAdminNetworks === numberOfSelectedNetworks) {
                                message += ' you are not an owner.';
                            } else {

                                if (1 === numberOfNonAdminNetworks) {
                                    message += ' you are not an owner of ' + numberOfNonAdminNetworks + ' network.';
                                } else {
                                    message += ' you are not an owner of ' + numberOfNonAdminNetworks + ' networks.';
                                }
                            }
                        } else if (0 === numberOfNonAdminNetworks) {
                            if (numberOfReadOnly === numberOfSelectedNetworks) {
                                message += ' they are read-only.';
                            } else {
                                if (1 === numberOfReadOnly) {
                                    message += numberOfReadOnly + ' network is read-only.';
                                } else {
                                    message += numberOfReadOnly + ' networks are read-only.';
                                }
                            }
                        } else {
                            if (1 === numberOfNonAdminNetworks) {
                                message += ' you do not own 1 network';
                            } else {
                                message += ' you do not own ' + numberOfNonAdminNetworks + ' networks';
                            }
                            if (1 === numberOfReadOnly) {
                                message += ' and 1 network is read-only.';
                            } else {
                                message += ' and ' + numberOfReadOnly + ' networks are read-only.';
                            }
                        }
                    }
                    ndexNavigation.genericInfoModal(title, message);
                    return;
                }
                var dismissModal = false;

                var deletedCount = 0;

                var cancelHit = false;
                var errorFromServer = false;

                title = (numberOfNetworksToDel > 1) ? 'Delete Selected Networks' : 'Delete Selected Network';
                message = (numberOfNetworksToDel > 1) ?
                    'The selected ' + numberOfNetworksToDel + ' networks ' : 'The selected network ';

                message += 'will be permanently deleted from NDEx. Are you sure you want to proceed?';

                ndexNavigation.openConfirmationModal(title, message, 'Confirm', 'Cancel', dismissModal,
                    function ($modalInstance) {
                        $modalInstance.disableConfirmButton();

                        sequence(networksToDelete, function (network) {
                            if (cancelHit|| errorFromServer) {
                                return;
                            }
                            return deleteNetwork(network).then(function () {
                                deletedCount++;

                                if (myAccountController.networkTableRowsSelected > 0) {
                                    myAccountController.networkTableRowsSelected--;
                                }
                                delete $scope.selectedRowsNetworkExternalIds[network.externalId];
                                userSessionTablesSettings.deleteUUIDFromSelectedNetworks(network.externalId);

                                $modalInstance.setProgress('Deleted: ' + deletedCount + ' of ' + numberOfNetworksToDel + ' selected networks');
                                $modalInstance.setProgress2('Deleted: ' + network.name);

                                if ((deletedCount === numberOfNetworksToDel) || !$scope.isProcessing) {
                                    $scope.networkGridApi.grid.selection.selectedCount = myAccountController.networkTableRowsSelected;
                                    myAccountController.checkAndRefreshMyNetworksTableAndDiskInfo();

                                    $modalInstance.dismiss();
                                }
                            });
                        }).catch(function (reason) {

                            errorFromServer = true;
                            var errorMessage = 'Unable to delete';
                            var errorMessage1 =
                                (reason.data && reason.data.message) ? errorMessage + ': ' +  reason.data.message :
                                    errorMessage + '.';

                            $modalInstance.setError(errorMessage1);

                            $scope.networkGridApi.grid.selection.selectedCount = myAccountController.networkTableRowsSelected;
                            myAccountController.checkAndRefreshMyNetworksTableAndDiskInfo();

                        });
                    },
                    function ($modalInstance) {
                        // user hit Cancel; in case operation was in progress, set cancelHit to true
                        // to prevent sending more requests to the server
                        cancelHit = true;

                        $modalInstance.dismiss();

                    });
            };

            myAccountController.checkAndDeleteSelectedNetworks = function() {

                var permission = 'admin';

                uiMisc.findWhatSelectedNetworksCanBeModified(myAccountController, permission,
                    function(networkInfo) {
                        deleteSelectedNetworks(networkInfo);
                    },
                    function() {
                        var title   = 'Unable To Get Info About Selected Networks';
                        var message = 'Unable To Get Info About Selected Networks.';
                        ndexNavigation.genericInfoModal(title, message);
                    });
            };

            function markTask(task) {

                var typeFromServer = task.typeFromServer.toLowerCase();

                var properties = {};
                if (typeFromServer === 'export_network_to_file') {
                    properties.newTask = false;
                    return ndexService.updateTaskPropertiesNoHandlersV2(task.id, properties);

                } else {

                    if (typeFromServer === 'usernetworkaccess'  || typeFromServer === 'groupnetworkaccess' ||
                        typeFromServer === 'joingroup')
                    {
                        properties.newSent = false;
                        return ndexService.updateRequestPropertiesNoHandlersV2(task.id, properties);
                    }
                }
            }

            myAccountController.checkAndMarkAsRead = function() {

                var tasksToMark =
                    _.map($scope.taskGridApi.selection.getSelectedRows(),
                        function(task)
                        {
                            var taskNotToMark =
                                ((task.whatType === 'sent') && (task.newSent) &&
                                (task.Status !== 'accepted') && (task.Status !== 'declined') ||
                                (!task.newTask && !task.newSent));

                            return taskNotToMark ? null :
                                {
                                    'id': task.taskId,
                                    'typeFromServer' : task.typeFromServer,
                                    'ownerUUID' : task.ownerUUID
                                };
                        });

                tasksToMark = _.without(tasksToMark, null);
                var numberOfTasksToMark = tasksToMark.length;
                var selectedTasks = myAccountController.taskTableRowsSelected;
                var title   = '';
                var message = '';

                if ((numberOfTasksToMark === 0) && (selectedTasks > 0)) {
                    title = (selectedTasks === 1) ? 'Cannot Mark Selected Task' :
                        'Cannot Mark Selected Tasks';

                    message = (selectedTasks === 1) ?
                        'The selected task cannot be marked as read.' :
                        'The selected ' + selectedTasks + ' tasks can not be marked as read.';

                    ndexNavigation.genericInfoModal(title, message);
                    return;
                }
                if (numberOfTasksToMark > 1) {
                    title = 'Mark Selected Tasks';

                    message = (numberOfTasksToMark !== selectedTasks) ?
                        numberOfTasksToMark + ' of the selected ' +  selectedTasks +
                        ' tasks will be marked as read. Are you sure you want to proceed?' :

                        'The selected ' + numberOfTasksToMark + ' tasks will be marked as read. ' +
                        'Are you sure you want to proceed?';
                } else {

                    title = 'Mark Selected Task';

                    message = (selectedTasks > 1) ?
                        numberOfTasksToMark + ' of the selected ' +  selectedTasks +
                        ' tasks will be marked as read. Are you sure you want to proceed?' :

                        'The selected task will be marked as read. Are you sure you want to proceed?';
                }
                var dismissModal = false;

                var markedCount = 0;

                var cancelHit = false;
                var errorFromServer = false;

                ndexNavigation.openConfirmationModal(title, message, 'Mark As Read', 'Cancel', dismissModal,
                    function ($modalInstance) {
                        $modalInstance.disableConfirmButton();

                        sequence(tasksToMark, function (task) {
                            if (cancelHit|| errorFromServer) {
                                return;
                            }
                            return markTask(task).then(function () {
                                markedCount++;

                                $modalInstance.setProgress('Marked: ' + markedCount + ' of ' + numberOfTasksToMark + ' selected tasks');

                                if ((markedCount === numberOfTasksToMark) || !$scope.isProcessing) {
                                    myAccountController.checkAndRefreshMyTaskAndNotification();
                                    $modalInstance.dismiss();
                                }
                            });
                        }).catch(function (reason) {

                            errorFromServer = true;
                            var errorMessage = 'Unable to mark';

                            var errorMessage1 =
                                (reason.data && reason.data.message) ? errorMessage + ': ' +  reason.data.message :
                                    errorMessage + '.';

                            $modalInstance.setError(errorMessage1);

                            myAccountController.checkAndRefreshMyTaskAndNotification();
                        });
                    },
                    function ($modalInstance) {
                        // user hit Cancel; in case operation was in progress, set cancelHit to true
                        // to prevent sending more requests to the server
                        cancelHit = true;

                        $modalInstance.dismiss();
                    });


            };

            function delTask(task) {
                var typeFromServer = task.typeFromServer.toLowerCase();

                if (typeFromServer === 'export_network_to_file') {

                    return ndexService.deleteTaskNoHandlersV2(task.id);

                } else {

                    var request = {'requesterId': task.ownerUUID, 'externalId':  task.id};

                    if (typeFromServer === 'usernetworkaccess'  || typeFromServer === 'groupnetworkaccess') {

                        return ndexService.deletePermissionRequestNoHandlersV2(request);

                    } else if  (typeFromServer === 'joingroup') {

                        return ndexService.deleteMembershipRequestNoHandlersV2(request);
                    }
                }
            }

            myAccountController.checkAndDeleteSelectedTasks = function() {

                var countTasksThatCannotBeDeleted = _.sumBy($scope.taskGridApi.selection.getSelectedRows(),
                    function(task) {return task.newReceived ? 1 : 0;});

                var selectedTasks = myAccountController.taskTableRowsSelected;

                var title   = '';
                var message = '';

                if (countTasksThatCannotBeDeleted === selectedTasks) {
                    title = (countTasksThatCannotBeDeleted === 1) ? 'Cannot Delete Selected Task' :
                        'Cannot Delete Selected Tasks';

                    message =(countTasksThatCannotBeDeleted === 1) ?
                        'The selected task is received and cannot be deleted.' :
                        'All of ' + countTasksThatCannotBeDeleted + ' selected tasks are received and cannot be deleted.';

                    ndexNavigation.genericInfoModal(title, message);
                    return;
                }
                var numberOfTasksToDelete = selectedTasks - countTasksThatCannotBeDeleted;

                if (numberOfTasksToDelete > 1) {
                    title = 'Remove Selected Tasks';

                    message = (countTasksThatCannotBeDeleted > 0) ?
                        numberOfTasksToDelete + ' of the selected ' +  selectedTasks +
                        ' tasks will be deleted. Are you sure you want to proceed?' :

                        'The selected ' + numberOfTasksToDelete + ' tasks will be deleted. Are you sure you want to proceed?';
                } else {

                    title = 'Remove Selected Task';

                    message = (countTasksThatCannotBeDeleted > 0) ?
                        numberOfTasksToDelete + ' of the selected ' +  selectedTasks +
                        ' tasks will be deleted. Are you sure you want to proceed?' :

                        'The selected task will be deleted. Are you sure you want to proceed?';
                }
                var dismissModal = false;

                var deletedCount = 0;

                var cancelHit = false;
                var errorFromServer = false;

                ndexNavigation.openConfirmationModal(title, message, 'Delete', 'Cancel', dismissModal,
                    function ($modalInstance) {
                        $modalInstance.disableConfirmButton();

                        var selTaskRows = $scope.taskGridApi.selection.getSelectedRows();

                        var tasks =
                            _.map(selTaskRows, function(task) {
                                    return task.newReceived ? null :
                                        {
                                            'id': task.taskId,
                                            'typeFromServer' : task.typeFromServer,
                                            'ownerUUID' : task.ownerUUID
                                        };
                            });

                        var tasksToDel = _.without(tasks, null);

                        sequence(tasksToDel, function (task) {
                            if (cancelHit|| errorFromServer) {
                                return;
                            }
                            return delTask(task).then(function () {
                                deletedCount++;

                                var taskId = task.id;
                                myAccountController.taskTableRowsSelected--;
                                delete $scope.selectedRowsTasksExternalIds[taskId];

                                $modalInstance.setProgress('Deleted: ' + deletedCount + ' of ' + numberOfTasksToDelete + ' selected tasks');

                                if ((deletedCount === numberOfTasksToDelete) || !$scope.isProcessing) {
                                    myAccountController.checkAndRefreshMyTaskAndNotification();
                                    $scope.taskGridApi.grid.selection.selectedCount = myAccountController.taskTableRowsSelected;

                                    $modalInstance.dismiss();
                                }
                            });
                        }).catch(function (reason) {

                            errorFromServer = true;
                            var errorMessage = 'Unable to delete';

                            var errorMessage1 =
                                (reason.data && reason.data.message) ? errorMessage + ': ' +  reason.data.message :
                                    errorMessage + '.';

                            $modalInstance.setError(errorMessage1);

                            myAccountController.checkAndRefreshMyTaskAndNotification();
                            $scope.taskGridApi.grid.selection.selectedCount = myAccountController.taskTableRowsSelected;

                        });
                    },
                    function ($modalInstance) {
                        // user hit Cancel; in case operation was in progress, set cancelHit to true
                        // to prevent sending more requests to the server
                        cancelHit = true;

                        $modalInstance.dismiss();
                    });

            };

            function manageRequest(request, acceptRequests, message) {

                var typeFromServer = request.typeFromServer.toLowerCase();

                var recipientId = myAccountController.identifier;
                var requestId   = request.taskId;
                var action      = acceptRequests ? 'accept' : 'deny';

                if (acceptRequests) {
                    // request(s) accepted/approved

                    if (typeFromServer === 'usernetworkaccess' || typeFromServer === 'groupnetworkaccess') {

                        var receivedRequest =
                            _.find($scope.myAccountController.pendingRequests, {'externalId': requestId});

                        var networkId     = receivedRequest.destinationUUID;
                        var userOrGroupId = receivedRequest.sourceUUID;
                        var permission    = receivedRequest.permission;

                        var type = (typeFromServer === 'usernetworkaccess') ? 'user' : 'group';

                        return ndexService.updateNetworkPermissionNoHandlersV2(networkId, type, userOrGroupId, permission).then(
                            function () {
                                return ndexService.acceptOrDenyPermissionRequestNoHandlersV2(recipientId,
                                    requestId, action, message);

                        }).catch(
                            function () {
                                return ndexService.acceptOrDenyPermissionRequestNoHandlersV2(recipientId,
                                    requestId, action, message);
                            });

                    } else if (typeFromServer === 'joingroup') {

                        return ndexService.acceptOrDenyMembershipRequestNoHandlersV2(recipientId,
                            requestId, action, message);
                    }
                } else {
                    // request(s) declined/denied

                    if (typeFromServer === 'usernetworkaccess' || typeFromServer === 'groupnetworkaccess') {

                       return ndexService.acceptOrDenyPermissionRequestNoHandlersV2(recipientId,
                           requestId, action, message);

                    } else if (typeFromServer === 'joingroup') {

                        return ndexService.acceptOrDenyMembershipRequestNoHandlersV2(recipientId,
                            requestId, action, message);
                    }
                }
            }
            myAccountController.manageSelectedRequests = function() {

                var requestsToManage = _.filter($scope.taskGridApi.selection.getSelectedRows(), {whatType: 'received'});
                var countSelectedRequests = requestsToManage.length;

                var managedCount = 0;

                var cancelHit = false;
                var errorFromServer = false;

                var title = 'Respond to ' + countSelectedRequests + ' Selected '  +
                    (countSelectedRequests > 1 ? 'Requests'  : 'Request');

                var message = null;

                ndexNavigation.openManageBulkRequestsModal(title, message, 'Accept', 'Decline', 'Cancel',
                    function ($modalInstance, acceptRequests, responseMessage) {

                        var progressLabel = acceptRequests ? 'Accepted: ' : 'Declined: ';

                        sequence(requestsToManage, function (request) {
                            if (cancelHit || errorFromServer) {
                                return;
                            }
                            return manageRequest(request, acceptRequests, responseMessage).then(function () {
                                managedCount++;

                                $modalInstance.setProgress(
                                    progressLabel + managedCount + ' of ' + countSelectedRequests + ' selected requests');

                                if ((managedCount === countSelectedRequests) || !$scope.isProcessing) {
                                    myAccountController.checkAndRefreshMyTaskAndNotification();

                                    $modalInstance.dismiss();
                                }
                            });

                        }).catch(function (reason) {

                            errorFromServer = true;
                            var errorMessage = 'Unable to process request';

                            var errorMessage1 =
                                (reason.data && reason.data.message) ? errorMessage + ': ' +  reason.data.message :
                                    errorMessage + '.';

                            $modalInstance.setError(errorMessage1);

                            myAccountController.checkAndRefreshMyTaskAndNotification();
                        });
                    },

                    function ($modalInstance) {
                        // user hit Cancel; in case operation was in progress, set cancelHit to true
                        // to prevent sending more requests to the server
                        cancelHit = true;

                        $modalInstance.dismiss();
                    });
            };


            myAccountController.genericInfoModal = function(title, message)
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

            /*
            myAccountController.confirmDeleteSelectedSets = function()
            {
                var   modalInstance = $modal.open({
                    templateUrl: 'views/directives/confirmationModal.html',
                    scope: $scope,

                    controller: function($scope, $modalInstance) {

                        if (myAccountController.collectionTableRowsSelected > 1) {
                            $scope.title = 'Delete Selected Sets';
                            $scope.message =
                                'The selected ' + myAccountController.collectionTableRowsSelected +
                                ' sets will be deleted from NDEx. Are you sure you want to proceed?';
                        } else {
                            $scope.title = 'Delete Selected Set';
                            $scope.message =
                                'The selected set will be deleted from NDEx. Are you sure you want to proceed?';
                        };

                        $scope.cancel = function() {
                            $modalInstance.dismiss();
                            $scope.isProcessing = false;
                        };

                        $scope.confirm = function() {
                            $scope.isProcessing = true;
                            myAccountController.deleteSelectedSets();
                            $modalInstance.dismiss();
                            $scope.isProcessing = false;
                        };
                    }
                });
            };
            */

            myAccountController.manageBulkAccess = function(path, currentUserId)
            {
                //var selectedIDs = myAccountController.getIDsOfSelectedNetworks();
                sharedProperties.setSelectedNetworkIDs($scope.selectedRowsNetworkExternalIds);
                sharedProperties.setCurrentUserId(currentUserId);
                $location.path(path);
            };

            myAccountController.allTasksCompleted = function() {
                var task;

                for (var i = 0; i < myAccountController.tasks.length; i++) {
                    task = myAccountController.tasks[i];
                    if (task.status.toUpperCase() === 'PROCESSING') {
                        return false;
                    }
                }
                return true;
            };

            myAccountController.getIDsOfSelectedNetworks = function ()
            {
                return Object.keys($scope.selectedRowsNetworkExternalIds);
            };

            myAccountController.getSummariesOfSelectedNetworks = function ()
            {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                var idsOfSelectedNetworks = {};

                _.forEach(selectedNetworksRows, function(networkRow) {
                    idsOfSelectedNetworks[networkRow.externalId] = null;
                });

                var summariesOfSelectednetworks = [];

                _.forEach(myAccountController.networkSearchResults, function(networkSummary) {
                    if (networkSummary.externalId in idsOfSelectedNetworks) {
                        summariesOfSelectednetworks.push(networkSummary);
                    }
                });

                return summariesOfSelectednetworks;
            };

            myAccountController.updateVisibilityOfNetworks = function (networkUUIDs, networkVisibility)
            {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                // change 'Visibility' in the Network Table
                _.forEach(selectedNetworksRows, function(row) {
                    if (row.externalId in networkUUIDs) {
                        row.Visibility = networkVisibility;
                    }
                });

                // change 'visibility' in the Network Search list
                _.forEach(myAccountController.networkSearchResults, function(row) {
                    if (row.externalId in networkUUIDs) {
                        row.visibility = networkVisibility;
                    }
                });
            };

            myAccountController.updateShowcaseOfNetworks = function (networkUUIDs, showCase)
            {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                _.forEach(selectedNetworksRows, function(row) {
                    if (row.externalId in networkUUIDs) {
                        row.Show = showCase;
                    }
                });

                _.forEach(myAccountController.networkSearchResults, function(row) {
                    if (row.externalId in networkUUIDs) {
                        row.isShowcase = showCase;
                    }
                });
            };

            myAccountController.updateReadOnlyOfNetworks = function (networkUUIDs, readOnly)
            {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                _.forEach(selectedNetworksRows, function(row) {
                    if (row.externalId in networkUUIDs) {
                        row.isReadOnly = readOnly;
                    }
                });

                _.forEach(myAccountController.networkSearchResults, function(row) {
                    if (row.externalId in networkUUIDs) {
                        row.isReadOnly = readOnly;
                    }
                });
            };


            myAccountController.updateDescriptionOfNetworks = function (networkUUIDs, newDescription)
            {
                var description = (newDescription) ? $scope.stripHTML(newDescription) : newDescription;

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                // change Network Summaries in Network table
                _.forEach(selectedNetworksRows, function(row) {
                    var networkId = row.externalId;

                    if (networkId in networkUUIDs) {
                        row.description = description;
                    }
                });


                // change Network Summary in Network Search list
                _.forEach(myAccountController.networkSearchResults, function (row) {

                    var networkId = row.externalId;

                    if (networkId in networkUUIDs) {
                        row.description = description;
                    }
                });
            };

            myAccountController.updateReferenceOfNetworks = function (networkUUIDs, newReference)
            {
                //var reference = (newReference) ? $scope.stripHTML(newDescription) : newDescription;

                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();

                // change Network References in Network table
                _.forEach(selectedNetworksRows, function(row) {
                    var networkId = row.externalId;

                    if (networkId in networkUUIDs) {
                        row.Reference = newReference;
                    }
                });

                // change Network Summary in Network Search list
                /*
                _.forEach(myAccountController.networkSearchResults, function (row) {

                    var networkId = row.externalId;

                    if (networkId in networkUUIDs) {
                        row['reference'] = description;
                    };

                });
                */
            };
            
            /*
             * This function returns true if the current user has ADMIN access to all selected networks,
             * and false otherwise.
             *
            myAccountController.checkAdminPrivilegeOnSelectedNetworks = function() {
                var selectedNetworksRows = $scope.networkGridApi.selection.getSelectedRows();
                var retValue = true;

                // iterate through the list of selected networks and check if user has ADMIN access to all of them
                _.forEach(selectedNetworksRows, function(row) {
                    var networkUUID = row.externalId;

                    // check if you have admin privilege for this network
                    if (myAccountController.networksWithAdminAccess.indexOf(networkUUID) === -1) {
                        retValue = false;
                        return false;
                    }
                });

                return retValue;
            };
            */

/*
            var removeDeletedNetworksFromSearchAndNetworksTable = function($scope, networkIds) {
                var externalId = null;

                for (var i = $scope.networkGridOptions.data.length - 1; i >= 0; i--)
                {
                    externalId = $scope.networkGridOptions.data[i].externalId;
                    if (externalId in networkIds) {
                        $scope.networkGridOptions.data.splice(i, 1);
                    }
                }
                $scope.networkGridApi.selection.clearSelectedRows();
                myAccountController.networkTableRowsSelected = 0;

                // remove the networks from the search result
                for (i = myAccountController.networkSearchResults.length - 1; i >= 0; i--)
                {
                    externalId = myAccountController.networkSearchResults[i].externalId;
                    if (externalId in networkIds) {
                        myAccountController.networkSearchResults.splice(i, 1);
                    }
                }
            };
*/
            /*
            myAccountController.deleteSelectedSets = function ()
            {
                var selectedCollectionsRows = $scope.collectionGridApi.selection.getSelectedRows();
                var selectedIds = [];

                _.forEach(selectedCollectionsRows, function(row) {

                    var collectionUUID = row.externalId;

                    selectedIds.push(collectionUUID);

                    ndexService.deleteNetworkSetV2(collectionUUID,

                        function (data)
                        {
                            //console.log("success");
                        },
                        function (error)
                        {
                            console.log("unable to delete network set");
                        });
                });

                // after we deleted all selected collections, the footer of the table may
                // still show that some networks are selected (must be a bug), so
                // we manually set the selected count to 0 (see defect NDEX-582)
                $scope.collectionGridApi.grid.selection.selectedCount = 0;

                for (var i = myAccountController.networkSets.length - 1; i >= 0; i--) {
                    var collectionUUID = myAccountController.networkSets[i].externalId;
                    if (selectedIds.indexOf(collectionUUID) != -1) {
                        myAccountController.networkSets.splice(i, 1);
                    };
                };
                refreshCollectionsTable();
                myAccountController.collectionTableRowsSelected = 0;
            };
            */


            //              scope functions

            // change to use directive. setting of current network should occur controller initialization
            myAccountController.setAndDisplayCurrentNetwork = function (identifier)
            {
                $location.path('/network/' + identifier);
            };

            var checkGroupSearchResultObject = function(groupObj) {
                var found = false;

                for (var i = 0; i < myAccountController.originalGroupSearchResults.length; i++ ) {
                    if (groupObj.externalId === myAccountController.originalGroupSearchResults[i].externalId) {
                        found = true;
                        break;
                    }
                }

                return found;
            };

            myAccountController.searchGroupsFromUserInput = function() {
                /** @namespace myAccountController.groupSearchString **/
                var searchString = myAccountController.groupSearchString;

                ndexService.searchGroupsV2(searchString, 0, 1000000,
                    function(groupObjectsFound) {

                        myAccountController.groupSearchResults = [];

                        /** @namespace groupObjectsFound.resultList **/
                        if (groupObjectsFound && groupObjectsFound.resultList && groupObjectsFound.resultList.length > 0) {

                            for (var i = 0; i < groupObjectsFound.resultList.length; i++) {
                                var groupObj = groupObjectsFound.resultList[i];

                                if (checkGroupSearchResultObject(groupObj)) {
                                    myAccountController.groupSearchResults.push(groupObj);
                                }
                            }
                        }
                    },
                    function() {
                        console.log('unable to search groups');
                    });
            };

            myAccountController.getUserGroupMemberships = function (member)
            {
                /*
                 * To get list of Group objects we need to:
                 *
                 * 1) Use Get User’s Group Memberships API at
                 *    /user/{userid}/membership?type={membershiptype}&start={startPage}&size={pageSize}
                 *    to get the list of GROUPADMIN and MEMBER memberships
                 *
                 * 2) Get a list of Group UUIDs from step 1
                 *
                 * 3) Use this list of Group UUIDs to get Groups through
                 *    /group/groups API.
                 */
                ndexService.getUserGroupMembershipsV2(myAccountController.identifier, member, 0, 1000000,

                        function (userMembershipsMap) {

                            var groupsUUIDs = Object.keys(userMembershipsMap);

                            ndexService.getGroupsByUUIDsV2(groupsUUIDs)
                                .success(
                                    function (groupList) {
                                        myAccountController.groupSearchResults = groupList;
                                        myAccountController.originalGroupSearchResults = groupList;
                                    })
                                .error(
                                    function() {
                                        console.log('unable to get groups by UUIDs');
                                    }
                                );
                        },
                        function () {
                            console.log('unable to get user group memberships');
                        });
            };

            myAccountController.getAllNetworkSetsOwnedByUser = function (successHandler, errorHandler)
            {
                var offset = -1;
                var limit  = -1;

                ndexService.getAllNetworkSetsOwnedByUserV2(myAccountController.identifier, offset, limit,
                    
                    function (networkSets) {
                        myAccountController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);
                        successHandler(myAccountController.networkSets[0]);
                    },
                    function (error, status) {
                        console.log('unable to get network sets');
                        errorHandler(error, status);
                    });
            };

            myAccountController.addNetworkSetToTable = function(networkSet) {
                var status = 'Set';
                var setName = networkSet.name;
                var setDescription = $scope.stripHTML(networkSet.description);

                var networks = networkSet.networks.length;

                var setId = networkSet.externalId;

                var setReference = uiMisc.getSetReferenceObj(networkSet);

                var setDisease   = '';
                var setTissue    = '';
                var setEdges     = '';
                var setVisibility = networkSet.visibility ? networkSet.visibility : 'PUBLIC';
                var setOwner = sharedProperties.getCurrentUserAccountName();

                var setModified = new Date(networkSet.modificationTime);

                var setShowcased      = networkSet.showcased;

                /** @namespace networkSet.ownerId **/
                var row =   {
                    'Status'        :   status,
                    'Network Name'  :   setName,
                    ' '             :   '',
                    'Format'        :   status,
                    'Reference'     :   setReference,
                    'Disease'       :   setDisease,
                    'Tissue'        :   setTissue,
                    //'Nodes'         :   nodes,
                    'Edges'         :   setEdges,
                    'Visibility'    :   setVisibility,
                    'Owner'         :   setOwner,
                    'Last Modified' :   setModified,
                    'Show'          :   setShowcased,
                    'description'   :   setDescription,
                    'externalId'    :   setId,
                    'ownerUUID'     :   networkSet.ownerId,
                    'name'          :   setName,
                    'errorMessage'  :   '',
                    'subnetworks'   :   0,
                    'networks'      :   networks
                };
                $scope.networkGridOptions.data.push(row);
            };

            myAccountController.adminCheckBoxClicked = function()
            {
                var member = (myAccountController.groupSearchAdmin) ? 'GROUPADMIN' : null;

                myAccountController.groupSearchMember = false;

                myAccountController.getUserGroupMemberships(member);
            };

            myAccountController.memberCheckBoxClicked = function()
            {
                var member = (myAccountController.groupSearchMember) ? 'MEMBER' : null;

                myAccountController.groupSearchAdmin = false;

                myAccountController.getUserGroupMemberships(member);
            };

            $scope.getLoggedInUserUUID = function() {
                return myAccountController.loggedInIdentifier;
            };

            $scope.deleteTask = function (entity)
            {
               if (entity.typeFromServer === 'export_network_to_file') {

                   if (entity.ownerUUID !== myAccountController.loggedInIdentifier) {
                       alert('You cannot delete this task since you are not the owner.'); // jshint ignore:line
                       return;
                   }
                   var taskUUID = entity.taskId;

                   myAccountController.deleteTask(taskUUID,
                       function () {
                           // remove task from the table and task list
                           _.remove($scope.tasksAndRequestsGridOptions.data, {taskId: taskUUID});
                           _.remove(myAccountController.tasks, {externalId: taskUUID});
                           if (entity.newTask && (entity.Status !== 'queued') && (entity.Status !== 'processing') &&
                                myAccountController.numberOfNewTasksAndRequests > 0) {
                               myAccountController.numberOfNewTasksAndRequests--;
                           }
                           if (taskUUID in $scope.selectedRowsTasksExternalIds) {
                               delete $scope.selectedRowsTasksExternalIds[taskUUID];

                               $scope.taskGridApi.grid.selection.selectedCount =
                               myAccountController.taskTableRowsSelected =
                                      _.size($scope.selectedRowsTasksExternalIds);

                           }
                       },
                       function () {
                           console.log('unable to delete task');
                       }
                   );
               } else if (entity.typeFromServer === 'usernetworkaccess' ||
                          entity.typeFromServer === 'groupnetworkaccess') {

                   if (entity.ownerUUID !== myAccountController.loggedInIdentifier) {
                       alert('You cannot delete this request since you are not the owner.'); // jshint ignore:line
                       return;
                   }
                   var request = {'requesterId': entity.ownerUUID, 'externalId':  entity.taskId};

                   ndexService.deletePermissionRequestV2(request,
                       function() {
                           // remove task from the table and task list
                           _.remove($scope.tasksAndRequestsGridOptions.data, {taskId: entity.taskId});
                           _.remove(myAccountController.sentRequests,   { externalId: entity.taskId});
                           if (((entity.newSent && (entity.Status !== 'pending')) ||
                                    entity.newReceived) && myAccountController.numberOfNewTasksAndRequests > 0) {
                               myAccountController.numberOfNewTasksAndRequests--;
                           }
                           if (entity.taskId in $scope.selectedRowsTasksExternalIds) {
                               delete $scope.selectedRowsTasksExternalIds[taskUUID];

                               $scope.taskGridApi.grid.selection.selectedCount =
                               myAccountController.taskTableRowsSelected =
                                       _.size($scope.selectedRowsTasksExternalIds);
                           }
                       },
                       function(){
                           console.log('unable to delete request');
                       });
               }
               else if (entity.typeFromServer === 'joingroup') {
                   if (entity.ownerUUID !== myAccountController.loggedInIdentifier) {
                       alert('You cannot delete this request since you are not the owner.'); // jshint ignore:line
                       return;
                   }
                   var request2 = {'requesterId': entity.ownerUUID, 'externalId': entity.taskId};

                   ndexService.deleteMembershipRequestV2(request2,
                       function() {
                           // remove task from the table and task list
                           _.remove($scope.tasksAndRequestsGridOptions.data, {taskId: entity.taskId});
                           _.remove(myAccountController.sentRequests,    {externalId: entity.taskId});
                           if ((entity.newSent || entity.newReceived) && myAccountController.numberOfNewTasksAndRequests > 0) {
                               myAccountController.numberOfNewTasksAndRequests--;
                           }
                           if (entity.taskId in $scope.selectedRowsTasksExternalIds) {
                               delete $scope.selectedRowsTasksExternalIds[taskUUID];

                               $scope.taskGridApi.grid.selection.selectedCount =
                               myAccountController.taskTableRowsSelected =
                                       _.size($scope.selectedRowsTasksExternalIds);
                           }
                       },
                       function(){
                           console.log('unable to delete request');
                       });
               }
            };

            myAccountController.deleteTask = function (taskUUID, successHandler, errorHandler)
            {
                ndexService.deleteTaskV2(taskUUID,
                    function ()
                    {
                        if (successHandler) {
                            successHandler();
                        }
                    },
                    function ()
                    {
                        console.log('unable to delete task');
                        if (errorHandler) {
                            errorHandler();
                        }
                    }
                );
            };

            myAccountController.getTasks = function (successHandler, errorHandler)
            {
                ndexService.getUserTasksV2(
                    'ALL',
                    0,
                    0,
                    // Success
                    function (tasks)
                    {
                        myAccountController.tasks = tasks;

                        if (successHandler) {
                            successHandler();
                        }
                    },
                    function()
                    {
                        console.log('unable to get user\'s tasks');
                        if (errorHandler) {
                            errorHandler();
                        }
                    }
                );
            };


            // local functions

            var getUsersUUIDs = function(requests) {
                var UUIDs = [];

                if (!requests || requests.length === 0) {
                    return UUIDs;
                }

                for (var i=0; i<requests.length; i++) {
                    var requesterId = requests[i].requesterId;

                    if (UUIDs.indexOf(requesterId) < 0) {
                        UUIDs.push(requesterId);
                    }
                }

                return UUIDs;
            };

            var getNamesOfRequesters = function(requests, users) {

                if (!users || !requests || users.length === 0 || requests.length === 0) {
                    return;
                }

                for (var i = 0; i < requests.length; i++) {
                    /** @namespace requestType **/
                    if (requests[i].requestType && (requests[i].requestType.toLowerCase() !== 'usernetworkaccess')) {
                        continue;
                    }
                    var requesterId = requests[i].requesterId;

                    for (var j = 0; j < users.length; j++) {
                        if (requesterId === users[j].externalId) {
                            requests[i].sourceName = users[j].firstName + ' ' + users[j].lastName;

                        }
                    }
                }
            };

            myAccountController.getSentRequests = function (successHandler, errorHandler) {
                // get all user sent requests
                ndexService.getUserPermissionRequestsV2(myAccountController.identifier, 'sent',
                    function (requests)
                    {
                        var userUUIDs = getUsersUUIDs(requests);

                        ndexService.getUsersByUUIDsV2(userUUIDs)
                            .success(
                                function (userList) {
                                    // make sure that sourceName has "First Name  Second Name" instead of "Account Name"
                                    getNamesOfRequesters(requests, userList);

                                    myAccountController.sentRequests = requests;

                                    // get all group sent requests
                                    ndexService.getUserMembershipRequestsV2(myAccountController.identifier, 'sent',
                                        function (requests)
                                        {
                                            if (requests && requests.length > 0) {
                                                myAccountController.sentRequests =
                                                    myAccountController.sentRequests.concat(requests);
                                            }
                                            successHandler();
                                        },
                                        function ()
                                        {
                                            console.log('unable to get sent requests');
                                            errorHandler();
                                        });
                                })
                            .error(
                                function() {
                                    console.log('unable to get users by UUIDs');
                                    errorHandler();
                                }
                            );
                    },
                    function ()
                    {
                        console.log('unable to get sent requests');
                        errorHandler();
                    });
            };

            myAccountController.getReceivedRequests = function (successHandler, errorHandler) {
                // get all user pending requests
                ndexService.getUserPermissionRequestsV2(myAccountController.identifier, 'received',
                    function (requests)
                    {
                        var userUUIDs = getUsersUUIDs(requests);

                        ndexService.getUsersByUUIDsV2(userUUIDs)
                            .success(
                                function (userList) {
                                    // make sure that sourceName has "First Name  Second Name" instead of "Account Name"
                                    getNamesOfRequesters(requests, userList);

                                    myAccountController.pendingRequests = requests;

                                    // get all group pending requests
                                    ndexService.getUserMembershipRequestsV2(myAccountController.identifier, 'received',
                                        function (requests)
                                        {
                                            if (requests && requests.length > 0) {
                                                myAccountController.pendingRequests =
                                                    myAccountController.pendingRequests.concat(requests);
                                            }
                                            successHandler();
                                        },
                                        function ()
                                        {
                                            console.log('unable to get pending requests');
                                            errorHandler();
                                        });
                                })
                            .error(
                                function() {
                                    console.log('unable to get users by UUIDs');
                                    errorHandler();
                                });
                    },
                    function ()
                    {
                        console.log('unable to get pending requests');
                        errorHandler();
                    });
            };

            // this is one of hashing suggestions taken from
            // https://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
            /*
            var stringHash = function(str) {
                var hash = 0, i = 0, len = str.length;
                while ( i < len ) {
                    hash  = ((hash << 5) - hash + str.charCodeAt(i++)) << 0;
                }
                return hash;
            };
            */

            myAccountController.getUserAccountPageNetworks = function (successHandler, errorHandler)
            {
                var noOfNetworkSetsOnPage = myAccountController.networkSets.length;

                if (noOfNetworkSetsOnPage >= paginationOptions.pageSize) {
                    successHandler();
                }
                var offset = 0;
                var limit  = 0;
                if ((noOfNetworkSetsOnPage > 0) && (noOfNetworkSetsOnPage < paginationOptions.pageSize)) {
                    limit = paginationOptions.pageSize - noOfNetworkSetsOnPage;
                }
                else if ((noOfNetworkSetsOnPage === 0) && (paginationOptions.networkSetCount === 0)) {
                    offset = (paginationOptions.pageNumber - 1) * paginationOptions.pageSize;
                    limit  = paginationOptions.pageSize;

                } else if ((noOfNetworkSetsOnPage === 0) && (paginationOptions.networkSetCount > 0)) {
                    offset = (paginationOptions.pageNumber - 1) * paginationOptions.pageSize - paginationOptions.networkSetCount;
                    limit  = paginationOptions.pageSize;
                }
                ndexService.getUserAccountPageNetworksV2(myAccountController.identifier, offset, limit,
                    function(networkSummaries) {

                        myAccountController.networkSearchResults = networkSummaries;

                        /*
                        myNetworksOldHash = myNetworksNewHash;
                        myNetworksNewHash = stringHash(angular.toJson(networkSummaries));

                        if ((myNetworksOldHash != myNetworksNewHash) || (0 == refreshIntervalInSeconds)) {
                            ndexSpinner.startSpinner(spinnerMyAccountPageId);
                        };
                        */

                        if (_.size(networkSummaries) === 0) {
                            successHandler();
                        }
                        var networkUUIDs = _.map(networkSummaries, 'externalId');

                        var networkPermissionsMapHandler = function(networkPermissionsMap) {

                            // build list of networks with ADMIN and WRITE permissions
                            var invertedMapsPermissions = _.invertBy(networkPermissionsMap);

                            var networksWithAdminPermissions = invertedMapsPermissions.ADMIN;
                            var networksWithWritePermissions = invertedMapsPermissions.WRITE;
                            var networksWithReadPermissions  = invertedMapsPermissions.READ;

                            myAccountController.networksWithAdminAccess =
                                networksWithAdminPermissions ? _.invert(networksWithAdminPermissions) : {};

                            myAccountController.networksWithWriteAccess =
                                networksWithWritePermissions ? _.invert(networksWithWritePermissions) : {};

                            myAccountController.networksWithReadAccess =
                                networksWithReadPermissions ? _.invert(networksWithReadPermissions) : {};

                            // loop through the network summaries and find what networks have multiple subnetworks
                            _.forEach(myAccountController.networkSearchResults, function (networkSummaryObj) {

                                var noOfSubNetworks = uiMisc.getNoOfSubNetworks(networkSummaryObj);

                                if (noOfSubNetworks >= 1) {
                                    myAccountController.networksWithMultipleSubNetworks[networkSummaryObj.externalId] = noOfSubNetworks;
                                }
                            });

                            successHandler();
                        };

                        ndexService.getNetworkPermissionsByUUIDs(networkUUIDs,
                            networkPermissionsMapHandler,
                            function() {
                                console.log('unable to get user network permissions for the logged in user');
                                errorHandler();
                            });
                    },
                    function() {
                       console.log('unable to get user account page networks');
                       errorHandler();
                    });
            };

            var markSelectedNetworks = function() {
                $scope.selectedRowsNetworkExternalIds = {};
                myAccountController.networkTableRowsSelected = 0;
                $scope.networkGridApi.grid.selection.selectedCount = 0;

                if (userSessionTablesSettings.noNetworksSelected()) {
                    return;
                }
                _.forEach($scope.networkGridOptions.data, function(tableRowObj) {

                    var networkId = tableRowObj.externalId;

                    if (userSessionTablesSettings.isUUIDInSelectedNetworks(networkId)) {
                        $scope.networkGridApi.selection.selectRow(tableRowObj, null);
                        $scope.selectedRowsNetworkExternalIds[networkId] = tableRowObj.name;
                    }
                });
                myAccountController.networkTableRowsSelected = _.size( $scope.selectedRowsNetworkExternalIds);
                $scope.networkGridApi.grid.selection.selectedCount = myAccountController.networkTableRowsSelected;
            };

            myAccountController.getUserNetworksAndPopulateTable = function (successHandler, errorHandler)
            {
                // get networks
                myAccountController.getUserAccountPageNetworks(
                    function () {

                        populateNetworkTable();
                        markSelectedNetworks();

                        if (successHandler) {
                            successHandler();
                        }
                    },
                    function () {
                        if (errorHandler) {
                            errorHandler();
                        }
                    });
            };


            $scope.showWarningsOrErrors = function(rowEntity) {

                if (!rowEntity && !rowEntity.externalId) {
                    return;
                }

                if (rowEntity.subnetworks >= 1) {
                    var title = 'Warning';
                    var message = 'This network is part of a Cytoscape collection and cannot be operated on or edited in NDEx.';
                    ndexNavigation.genericInfoModal(title, message);
                } else {
                    uiMisc.showNetworkWarningsOrErrors(rowEntity, myAccountController.networkSearchResults);
                }
            };

            $scope.switchShowcase = function(row) {
                if (row && row.entity) {

                    var show = !row.entity.Show;

                    //row.entity.Show = !row.entity.Show;

                    if (row.entity.Status === 'Set') {

                        var setToShowcase = _.find(myAccountController.networkSets, {'externalId': row.entity.externalId});

                        if (show) {
                            var networksIds = (setToShowcase.networks) ? setToShowcase.networks : [];
                            var privateNetworksCount = 0;

                            _.forEach(myAccountController.networkSearchResults, function (network) {
                                if (_.includes(networksIds, network.externalId)) {
                                    if (network.visibility.toUpperCase() === 'PRIVATE') {
                                        privateNetworksCount = privateNetworksCount + 1;
                                    }
                                }
                            });

                            if (privateNetworksCount > 0) {

                                var message = '';
                                if (privateNetworksCount === 1) {
                                    message = privateNetworksCount + '  network in this Set is private ' +
                                        ' and will not be visible to other users. <br><br>';
                                } else {
                                    message = privateNetworksCount + ' networks in this Set are private ' +
                                        ' and will not be visible to other users. <br><br>';
                                }
                                var title = 'Activate Showcase function';
                                message = message + 'Do you want to proceed and activate the Showcase function?';

                                var dismissModal = true;
                                ndexNavigation.openConfirmationModal(title, message, 'Proceed', 'Cancel', dismissModal,
                                    function () {
                                        ndexService.updateNetworkSetSystemPropertiesV2(row.entity.externalId, 'showcase', show,
                                            function () {
                                                row.entity.Show = !row.entity.Show; // success
                                                setToShowcase.showcased = row.entity.Show;
                                            },
                                            function (error, setId) {
                                                console.log('unable to update showcase for Network Set with Id ' + setId);
                                            });
                                    },
                                    function () {
                                        // User selected Cancel; return
                                    });

                            } else {
                                // turning on showcase for a Set with no private networks
                                ndexService.updateNetworkSetSystemPropertiesV2(row.entity.externalId, 'showcase', show,
                                    function () {
                                        row.entity.Show = !row.entity.Show; // success
                                        setToShowcase.showcased = row.entity.Show;
                                    },
                                    function (error, setId) {
                                        console.log('unable to update showcase for Network Set with Id ' + setId);
                                    });
                            }
                        } else {

                            // turning off showcase for a Set
                            ndexService.updateNetworkSetSystemPropertiesV2(row.entity.externalId, 'showcase', show,
                                function () {
                                    row.entity.Show = !row.entity.Show; // success
                                    setToShowcase.showcased = row.entity.Show;
                                },
                                function (error, setId) {
                                    console.log('unable to update showcase for Network Set with Id ' + setId);
                                });
                        }
                    } else {

                        // turning on/off showcase for a network
                        ndexService.setNetworkSystemPropertiesV2(row.entity.externalId, 'showcase', show,
                            function () {
                                row.entity.Show = !row.entity.Show; // success
                            },
                            function (error) {
                                var errorMessage = uiMisc.formatErrorMessage('Unable to change showcase for network ' +
                                    '<strong>' + row.entity.name + '</strong>', error);
                                var title = 'Unable to Change Showcase';

                                ndexNavigation.genericInfoModal(title, errorMessage);
                            });
                    }
                }
            };

            $scope.getNetworkURL = function(networkUUID) {
                return 'viewer/networks/' + networkUUID;
            };

            $scope.downloadNetwork= function(rowEntity) {

                uiMisc.downloadCXNetwork(rowEntity.externalId);

            };


            $scope.isOwnerOfNetwork = function(networkOwnerUUID)
            {
                if (!myAccountController.isLoggedInUser) {
                    return false;
                }
                return (myAccountController.loggedInIdentifier === networkOwnerUUID);
            };

            $scope.failedNetworkWarning = function(rowEntity) {
                var networkName  = rowEntity.name;
                var errorMessage = rowEntity.errorMessage;
                var status       = rowEntity.Status;
                var networkUUID  = rowEntity.externalId;


                var title = 'This Network is Invalid';
                var body  =
                    '<strong>Name: </strong>' + networkName + '<br>' +
                    '<strong>Status: </strong>' + status + '<br>' +
                    '<strong>Error Message: </strong>' + errorMessage + '<br><br>' +
                    '<strong>Would you like to permanently DELETE this network?</strong>';

                var dismissModal = true;
                ndexNavigation.openConfirmationModal(title, body, 'Delete', 'Cancel', dismissModal,
                    function () {
                        ndexService.deleteNetworkV2(networkUUID,
                            function ()
                            {
                                // remove deleted network from myAccountController.networkSearchResults
                                for (var i = myAccountController.networkSearchResults.length - 1; i >= 0; i--)
                                {
                                    var externalId = myAccountController.networkSearchResults[i].externalId;
                                    if (externalId === networkUUID) {
                                        myAccountController.networkSearchResults.splice(i, 1);
                                        populateNetworkTable();
                                        break;
                                    }
                                }
                            },
                            function ()
                            {
                                console.log('unable to delete network');
                            });

                    },
                    function () {
                        // User selected Cancel; do not do anything here
                    });
            };


            $scope.updateLastTimeVisitedMyTasksTimestamp = function() {

                myAccountController.displayedUser.properties.lastTimeVisitedMyTasksTab =
                    new Date().getTime();

                    ndexService.updateUserV2(myAccountController.displayedUser,
                        function () {},
                        function () {}
                    );
            };

            $scope.isEditProfileDropDownButtonDisabled = function() {
                var isDisabled = (!$scope.enableEditPropertiesBulkButton &&
                    !$scope.enableChangeVisibilityBulkButton && !$scope.enableSetReadOnlyBulkButton);

                if (isDisabled) {
                    $scope.editProfileDropDownBulkButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        'No editing options are available for the selected networks' :
                        'No editing options are available for the selected network';
                } else {
                    $scope.editProfileDropDownBulkButtonTitle = '';
                    /*
                    $scope.editProfileDropDownBulkButtonTitle = (myAccountController.networkTableRowsSelected > 1) ?
                        "Change description, reference, version, visibility, read-only flag of the selected networks" :
                        "Change description, reference, version, visibility, read-only flag of the selected network";
                        */
                }

                return isDisabled;
            };


            //                  PAGE INITIALIZATIONS/INITIAL API CALLS
            //----------------------------------------------------------------------------

            myAccountController.getNoOfNetworksAndSets = function(successHandler, errorHandler) {
                ndexService.getNumberOfNetworksInUsersAccountPageV2(myAccountController.identifier,
                    function(data) {

                        paginationOptions.networkCount       = data.networkCount;
                        paginationOptions.networkSetCount    = data.networkSetCount;
                        $scope.networkGridOptions.totalItems =
                            paginationOptions.networkCount + paginationOptions.networkSetCount;

                        if(successHandler) {
                            successHandler();
                        }
                    },
                    function() {
                        if(errorHandler) {
                            errorHandler();
                        }
                    });
            };

            myAccountController.checkAndRefreshMyNetworksTableAndDiskInfo = function() {

                myAccountController.getNoOfNetworksAndSets(
                    function() {
                        myAccountController.loadNetworks();
                    },
                    function() {
                        console.log('unable to get No of Networks and Sets for this account');
                    }
                );

            };

            $scope.checkAndRefreshMyNetworksTableAndDiskInfo = function() {

                if ($scope.refreshNetworksButtonDisabled) {
                    // we need this check to safeguard against rapid multiple hits of refresh button,
                    // in which case it may start multiple refresh timers
                    return;
                }

                if ((refreshIntervalInSeconds > 0) && (timerVariable !== -1)) {
                    $interval.cancel(timerVariable);
                }

                // start spinner if it is not already started
                ndexSpinner.startSpinner(spinnerMyAccountPageId);
                myAccountController.checkAndRefreshMyNetworksTableAndDiskInfo();
            };



            myAccountController.checkAndRefreshMyTaskAndNotification = function() {

                myAccountController.loadTasksAndRequests();
            };

            $scope.checkAndRefreshMyTaskAndNotification = function() {
                if ($scope.refreshTasksButtonDisabled) {
                    // we need this check to safeguard against rapid multiple hits of refresh button,
                    // in which case it may start multiple refresh timers
                    return;
                }

                if ((refreshIntervalInSeconds > 0) && (timerVariable !== -1)) {
                    $interval.cancel(timerVariable);
                }

                myAccountController.checkAndRefreshMyTaskAndNotification();
            };

            myAccountController.refreshMyNetworksTableAndDiskInfo = function(successHandler, errorHandler) {

                ndexService.getUserByUUIDV2(myAccountController.identifier)
                    .success(
                        function (user) {
                            myAccountController.displayedUser = user;

                            $scope.diskSpaceInfo = uiMisc.showAvailableDiskSpace(user);

                            if (paginationOptions.networkSetCount > 0) {

                                ndexService.getAllNetworkSetsOwnedByUserV2(myAccountController.identifier,
                                    (paginationOptions.pageNumber - 1) * paginationOptions.pageSize, paginationOptions.pageSize,

                                    function (networkSets) {
                                        myAccountController.networkSets = _.orderBy(networkSets, ['modificationTime'], ['desc']);

                                        myAccountController.getUserNetworksAndPopulateTable(successHandler, errorHandler);
                                    },
                                    function () {
                                        console.log('unable to get network sets');
                                        errorHandler();
                                    });

                            } else {
                                //  network set count is 0; no need to call API to call network sets
                                myAccountController.networkSets = [];

                                // get networks
                                myAccountController.getUserNetworksAndPopulateTable(successHandler, errorHandler);
                            }
                        });
            };


            myAccountController.loadNetworksTasksAndRequests = function() {
                myAccountController.loadNetworks();
                myAccountController.loadTasksAndRequests();
            };

            var stopSpinnerAndRestartRefreshTimer = function() {

                if ($scope.networksTasksAndRequestsReceived()) {
                    ndexSpinner.stopSpinner();
                    $scope.refreshTasksButtonDisabled = false;

                    if (refreshIntervalInSeconds > 0) {
                        if (timerVariable !== -1) {
                            $interval.cancel(timerVariable);
                        }

                        timerVariable = $interval(
                            myAccountController.loadNetworks,
                            //myAccountController.loadNetworksTasksAndRequests,
                            refreshIntervalInSeconds * 1000);
                    }
                }
            };

            myAccountController.loadNetworks = function() {
                $scope.resetNetworksFlag();

                $scope.refreshNetworksButtonDisabled = true;

                // start spinner if it is not already started
                // ndexSpinner.startSpinner(spinnerMyAccountPageId);

                myAccountController.refreshMyNetworksTableAndDiskInfo(
                    function() {
                        networksReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                        $scope.refreshNetworksButtonDisabled = false;
                    },
                    function() {
                        networksReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                        $scope.refreshNetworksButtonDisabled = false;
                    }
                );
            };


            $scope.loadTasksAndRequests = function() {
                // wrapper for calling myAccountController.loadTasksAndRequests from deleteTask.html template
                myAccountController.loadTasksAndRequests();
            };


            myAccountController.loadTasksAndRequests = function() {
                $scope.resetTasksAndRequestsReceivedFlags();

                $scope.refreshTasksButtonDisabled = true;

                // start spinner if it is not already started
                //ndexSpinner.startSpinner(spinnerMyAccountPageId);

                //get tasks
                myAccountController.getTasks(
                    function() {
                        $scope.tasksReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    },
                    function() {
                        $scope.tasksReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    }
                );

                // get requests
                myAccountController.getSentRequests(
                    function() {
                        $scope.sentRequestsReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    },
                    function() {
                        $scope.sentRequestsReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    }
                );

                myAccountController.getReceivedRequests(
                    function() {
                        $scope.receivedRequestsReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    },
                    function() {
                        $scope.receivedRequestsReceived = true;
                        stopSpinnerAndRestartRefreshTimer();
                    }
                );
            };

            $scope.$watchGroup(['tasksReceived', 'sentRequestsReceived', 'receivedRequestsReceived'],
                function () {
                    if ($scope.tasksReceived && $scope.sentRequestsReceived && $scope.receivedRequestsReceived) {

                        if (!tasksAndNotificationsTableDefined) {
                            tasksAndNotificationsTableDefined = true;
                            defineTasksAndNotificationsTable();
                        }
                        populateTasksAndNotificationsTable();
                    }
                },
                true);

            ndexSpinner.startSpinner(spinnerMyAccountPageId);

            myAccountController.getNoOfNetworksAndSets(
                function() {
                    myAccountController.loadNetworksTasksAndRequests();
                },
                function() {
                    console.log('unable to get No of Networks and Sets for this account');
                }
            );


            $(window).resize(function() {

                var $myNetworksGridId = $('#myNetworksGridId');
                $myNetworksGridId.height($(window).height() - windowsHeightCorrection);
                $scope.networkGridApi.grid.gridHeight = $myNetworksGridId.height();
                $scope.networkGridApi.core.refresh();

                var $myTasksAndRequestsGridId = $('#myTasksAndRequestsGridId');
                $myTasksAndRequestsGridId.height($(window).height() - windowsHeightCorrection);
                $scope.taskGridApi.grid.gridHeight = $myTasksAndRequestsGridId.height();
                $scope.taskGridApi.core.refresh();
            });

            // get groups
            var member = null;
            myAccountController.getUserGroupMemberships(member);

            angular.element(document).ready(function () {
                $(window).trigger('resize');
            });

        }]);
            //------------------------------------------------------------------------------------//
