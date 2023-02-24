/**
 * Created by vrynkov 28 Oct.2016
 *
 * Miscellaneous useful utilities used by different modules.
 */
'use strict';

angular.module('ndexServiceApp')
    .service('uiMisc', ['ndexNavigation', 'ndexService', 'ndexUtility','sharedProperties', '$routeParams',
                function (ndexNavigation, ndexService, ndexUtility, sharedProperties, $routeParams) {

        var self = this;

        /*
         * Shows modal with Errors or Warnings when user clicks on the Failed or Warning
         * image in the Status column of Network table on My Account, User, Group or Search pages.
         *
         */
        self.showNetworkWarningsOrErrors = function (rowEntity, networks) {
            var foundNetwork;

            for (var i=0; i<networks.length; i++) {
                var network = networks[i];

                if (rowEntity.externalId == network.externalId) {
                    foundNetwork = network;
                    break;
                }
             }

             var status = rowEntity.Status.toLowerCase();
             var message = "";

             if (status == "failed") {
                message = foundNetwork.errorMessage;
             } else {
                for (var j=0; j<foundNetwork.warnings.length; j++) {
                    message = message + foundNetwork.warnings[j] + "<br>";
                }
             }

             var title = (status === 'failed') ? "Failed Error Message" : "Warnings";

             ndexNavigation.genericInfoModal(title, message);
        };

/*
        self.constructReferenceObj = function(referenceStr) {
            var referenceInPlainText;

            // referenceStr can be plain text (has no HTML tags), in which case the text() method of jQuery
            // will throw exception.  In this case, don't convert referenceStr to text
            try {
                referenceInPlainText = jQuery(referenceStr).text();
            } catch(err) {
                referenceInPlainText = referenceStr;
            }

            var url;

            // in case jQuery can't find URL and throws exception, initialize URL to an empty string
            try {
                url = jQuery(referenceStr).find('a').attr('href');
            } catch(err) {
                url = "";
            }

            var countURLs = (referenceStr.toLowerCase().match(/a href=/g) || []).length;

            return {
                referenceText: referenceInPlainText ? referenceInPlainText : "",
                referenceHTML: referenceStr ? referenceStr : "",
                url: url ? url : "",
                urlCount: countURLs
            };
        };
*/
        self.getNetworkReferenceObj = function(subNetworkId, network) {
            var reference = null;

            if (!network || !network.properties) {
                return reference;
            }

            for (var i = 0; i < network.properties.length; i++) {
                var property = network.properties[i];
                if (property.predicateString && (property.predicateString.toLowerCase() == "reference") &&
                    property.subNetworkId == subNetworkId)
                {
                    reference = (property.value) ? property.value : null;

                    // if reference only has white spaces (i.e., "\n      "), then we treat it as null
                    if (reference && !(/\S/.test(reference))) {
                        reference = null;
                    }
                    break;
                }
            }

            return reference; //self.constructReferenceObj(reference);
        };

        self.getSetReferenceObj = function(networkSet) {

            return (!networkSet || !networkSet.properties || !networkSet.properties.reference) ?
                 "" : networkSet.properties.reference;

/*            reference = networkSet.properties.reference;
            var referenceInPlainText;

            // reference can be plain text (has no HTML tags), in which case the text() method of jQuery
            // will throw exception.  In this case, don't convert reference to text
            try {
                referenceInPlainText = jQuery(reference).text();
            } catch(err) {
                referenceInPlainText = reference;
            }

            var url;

            // in case jQuery can't find URL and throws exception, initialize URL to an empty string
            try {
                url = jQuery(reference).find('a').attr('href');
            } catch(err) {
                url = "";
            }

            var countURLs = (reference.toLowerCase().match(/a href=/g) || []).length;

            return {
                referenceText: referenceInPlainText ? referenceInPlainText : "",
                referenceHTML: reference ? reference : "",
                url: url ? url : "",
                urlCount: countURLs
            };*/
        };



        self.getSubNetworkInfo = function(network) {
            var noOfSubNetworks = this.getNoOfSubNetworks(network);
            var subnetworkId = ((noOfSubNetworks == 1) && (network.subnetworkIds[0])) ? network.subnetworkIds[0] : null;
            return {id: subnetworkId, numberOfSubNetworks: noOfSubNetworks};
        };


        self.getSubNetworkId = function(network) {
            var noOfSubnetworks = this.getNoOfSubNetworks(network);
            return ((noOfSubnetworks == 1) && (network.subnetworkIds[0])) ? network.subnetworkIds[0] : null;
        };

        /*
         * self.getNoOfSubNetworks calculates number of subnetworks in networkSummary.properties.
         * Instead of just returning length of networkSummary.subnetworkIds, we iterate through
         * networkSummary.properties and store each unique subnetworkId in subNetworkIdsList. This is more reliable,
         * since it is possible to have situations where length of network.subnetworkIds doesn't correctly reflect
         * number of subnetwork Ids in networkSummary.properties.
         */
        self.getNoOfSubNetworks = function(networkSummary) {
            var subNetworkIdsList = [];

            if (networkSummary && networkSummary.properties) {

                _.forEach(networkSummary.properties, function(networkProperty) {

                    if ("subNetworkId" in networkProperty) {
                        if (subNetworkIdsList.indexOf(networkProperty['subNetworkId']) == -1) {
                            subNetworkIdsList.push(networkProperty['subNetworkId']);
                        };
                    } else {
                        if (subNetworkIdsList.indexOf(null) == -1) {
                            subNetworkIdsList.push(null);
                        };
                    }
                });
            };

            return ((subNetworkIdsList.length == 1) && (!subNetworkIdsList[0]) ? 0 : subNetworkIdsList.length);
        };

        self.getNetworkFormat = function(subNetworkId, network) {

            var format = "";

            if (!network || !network.properties) {
                return format;
            }

            for(var j = 0; j < network['properties'].length; j++ )
            {
                if ((network['properties'][j]['predicateString'] == "ndex:sourceFormat") &&
                    (subNetworkId == network['properties'][j]['subNetworkId']))
                {
                    format = network['properties'][j]['value'];
                    if (format.toLowerCase() == "unknown") {
                        format = "";
                    }
                    break;
                }
            }
            return format;
        };


        /*
         * In case there are multiple subnetworks on a network, we return network format in case
         * all ndex:sourceFormat are same.
         */
        self.getNetworkFormatForMultipleSubNetworks = function(network) {

            if (!network || !network.properties) {
                return "";
            }

            var formatArr = [];

            _.forEach(network.properties, function(property) {
                if (property.predicateString && (property.predicateString == "ndex:sourceFormat")) {
                    if (formatArr.indexOf(property.value) == -1) {
                        formatArr.push(property.value);
                    };
                };
            });

            return (formatArr.length == 1) ? formatArr[0] : "";
        };

        self.getDisease = function(network) {
            var disease = "";

            if (!network || !network.properties) {
                return disease;
            }

            for (var i = 0; i < network.properties.length; i++) {
                var property = network.properties[i];
                if (property.predicateString && property.predicateString.toLowerCase() == "disease") {
                    disease = (property.value) ? property.value : "";
                    break;
                }
            }

            return disease;
        };

        self.getTissue = function(network) {
            var tissue = "";

            if (!network || !network.properties) {
                return tissue;
            }

            for (var i = 0; i < network.properties.length; i++) {
                var property = network.properties[i];
                if (property.predicateString && property.predicateString.toLowerCase() == "tissue") {
                    tissue = (property.value) ? property.value : "";
                    break;
                }
            }

            return tissue;
        };

        self.getCurrentServerURL = function() {
            var parser = document.createElement('a');
            parser.href = ndexService.getNdexServerUri();

            return parser.protocol + "//" + parser.hostname + "/#/";
        };


        self.downloadCXNetwork = function(networkId) {
            var accesskey = $routeParams.accesskey;

            var anchor = document.createElement('a');

            var link = ndexService.getNdexServerUri() + "/network/" + networkId + "?download=true";

            if (accesskey) {
                link = link + "&accesskey=" + accesskey;
            };

            if ( window.currentSignInType=='google') {
                link = link + "&id_token=" + window.keycloak.token; //gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;

            } else if (window.currentSignInType == 'basic') {

                var userCredentials = ndexUtility.getUserCredentials();

                link = link + "&auth_token=" + btoa(userCredentials['userName'] + ':' +userCredentials['token']);
                //console.log('in downloadCXNetwork link=' + link);
            };

            anchor.setAttribute('href', link);

            anchor.setAttribute("type","hidden");
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
        };

 /*       self.getNetworkDownloadLink = function(accountController, rowEntity) {

            var link =
                ndexService.getNdexServerUri() + "/network/" + rowEntity.externalId + "?download=true";


            if (window.currentSignInType == 'basic')
            {
                var userCredentials = ndexUtility.getUserCredentials();

                if (!userCredentials || !userCredentials['userName'] || !userCredentials['token']) {
                    return link;
                }
                var userName = userCredentials['userName'];
                var password = userCredentials['token'];

                link = link.replace("http://", "http://" + userName + ":" + password + "@");
            } else if ( window.currentSignInType == 'google') {

               link = link + "?id_token=" + gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().id_token;
            }

          return link;
        }; */

        self.showSetInfo = function(set) {

            var desc = (set['description']) ? set['description'].trim() : "";
            if (!desc) {
                // sometime description contains string starting with new line followed by blank spaces ("\n   ").
                // This breaks the description field in the modal shown by the call ndexNavigation.networkInfoModal(network);
                // To prevent it, we set description to null thus eliminating it from showing.
                set['description'] = null;
            };

            var setReference =
                (set['properties'] && set['properties']['reference'])
                    ? set['properties']['reference'] : null;

            if (setReference) {
                set['reference'] = setReference;
            };

            set['networkCount'] = set['networks'] ? set['networks'].length : 0;

            // if user is a set owner, ahow if networksa is showcased
            var loggedInUserId = sharedProperties.getCurrentUserId(); //ndexUtility.getLoggedInUserExternalId();

            if (loggedInUserId && loggedInUserId == set.ownerId) {
                var showCased = set['showcased'];
                delete set['showcased'];
                set['showcased'] = showCased ? "Yes" : "No";

                ndexService.getAccessKeyOfNetworkSetV2(set['externalId'],
                    function(data) {

                        if (!data) {
                            // empty string - access is deactivated
                            set['shareLinkStatus'] = 'Disabled';

                        } else if (data['accessKey']) {
                            // received  data['accessKey'] - access is enabled
                            set['shareLinkStatus'] = 'Enabled';
                            set['networkSetShareableURL'] =
                                self.buildShareableNetworkSetURL(data['accessKey'], set['externalId']);

                        } else {
                            // this should not happen; something went wrong
                            set['shareLinkStatus'] = 'Unknown';
                        };
                    },
                    function(error) {
                        console.log("unable to get access key for network set " + set['externalId']);
                    });

            } else {
                delete set['showcased'];
            };

            ndexNavigation.networkSetInfoModal(set);
        };

        self.showNetworkInfo = function(network) {
            // add reference field to network
            var subNetworkId = self.getSubNetworkId(network);
            var reference = self.getNetworkReferenceObj(subNetworkId, network);

            /*
            if (referenceObj && (referenceObj.referenceText.length > 0)) {
                if ((referenceObj.url && referenceObj.url.length > 0) && (referenceObj.urlCount == 1)) {
                    network['reference'] =
                        '<a href="' +  referenceObj.url + '" target="_blank">' + referenceObj.url + '</a>';
                }
                else if (referenceObj.urlCount != 1) {
                    network['reference'] =  referenceObj.referenceHTML;
                };
            };

            if (referenceObj) {
                if (referenceObj.referenceHTML) {
                    network['reference'] =  referenceObj.referenceHTML;

                } else if (referenceObj.referenceText) {
                    network['reference'] =  referenceObj.referenceText;

                } else if (referenceObj.url) {
                    network['reference'] =  referenceObj.url;

                };
            }
            */
            network['reference'] = reference;

            var desc = (network['description']) ? network['description'].trim() : "";
            if (!desc) {
                // sometime description contains string starting with new line followed by blank spaces ("\n   ").
                // This breaks the description field in the modal shown by the call ndexNavigation.networkInfoModal(network);
                // To prevent it, we set description to null thus eliminating it from showing.
                network['description'] = null;
            };

            ndexNavigation.networkInfoModal(network);
        };


        self.buildNetworkURL = function(accessKey, networkUUID) {
            var url = self.getCurrentServerURL() + "network/" + networkUUID;
            if (accessKey) {
                url = url + "?accesskey=" + accessKey;
            };
            return url;
        };

        self.buildShareableNetworkSetURL = function(accessKey, networkSetUUID) {
            return self.getCurrentServerURL() + "networkset/" + networkSetUUID + "?accesskey=" + accessKey;
        };

        self.showAvailableDiskSpace = function(userInfo) {
            var diskInfo = {};

            var oneMB    = 1024.0 * 1024.0;
            var one100MB = 100 * oneMB;

            var oneGB    = 1024.0 * 1024.0 * 1024.0;
            var one100GB = 100 * oneGB;

            var oneTB = 1024.0 * 1024.0 * 1024.0 * 1024.0;

            var diskUsed        = 0.0;
            var diskUsedRounded = 0.0;

            var diskQuota        = 0.0;
            var diskQuotaRounded = 0.0;



            diskInfo['diskQuota']            = userInfo.diskQuota;
            diskInfo['diskQuotaUnlimited']   = (diskInfo['diskQuota'] <= 0);
            diskInfo['diskUsed']             = userInfo.diskUsed;

            // initialize to 0 in case disk quota is unlimited; it will not be shown in view
            // if diskInfo['diskPercentageUsed'] is 0
            diskInfo['diskPercentageUsed']   = 0;



            if (diskInfo['diskUsed'] < oneGB) {
                // used less than 1 GB
                diskUsed = userInfo.diskUsed / oneMB;

                // we need + below to drop 0
                diskUsedRounded = +diskUsed.toFixed(1);
                if ((diskUsedRounded == 0) && (userInfo.diskUsed > 0)) {
                    diskUsedRounded = 0.1;
                }

                diskInfo['diskUsedString'] = diskUsedRounded + " MB of ";

            } else if ((diskInfo['diskUsed'] >= oneGB) && (diskInfo['diskUsed'] < oneTB)) {
                // used between 1 GB and 1 TB

                diskUsed = userInfo.diskUsed / oneGB;

                diskUsedRounded = +((diskUsed * 10) / 10).toFixed(2);

                diskInfo['diskUsedString'] = diskUsedRounded + " GB of ";

            } else {
                // used more than 1 TB used
                diskUsed = userInfo.diskUsed / oneTB;

                diskUsedRounded = +((diskUsed * 10) / 10).toFixed(3);

                diskInfo['diskUsedString'] = diskUsedRounded + " TB of ";
            };



            if (diskInfo['diskQuotaUnlimited']) {
                diskInfo['diskUsedString'] += " Unlimited";
                return diskInfo;

            } else  if (diskInfo['diskQuota'] < oneGB) {
                // disk quota less than 1 GB
                diskQuota        = diskInfo['diskQuota'] / oneMB;
                diskQuotaRounded = +((diskQuota * 10) / 10).toFixed(1);

                diskInfo['diskUsedString'] += diskQuotaRounded + " MB used";

            } else if ((diskInfo['diskQuota'] >= oneGB) && (diskInfo['diskQuota'] < oneTB)) {
                // disk quota between 1 GB and 1 TB
                diskQuota        = diskInfo['diskQuota'] / oneGB;
                diskQuotaRounded = +((diskQuota * 10) / 10).toFixed(1);

                diskInfo['diskUsedString'] += diskQuotaRounded + " GB used";

            } else if (diskInfo['diskQuota'] >= oneTB) {
                // disk quota more than 100GB; measure in TB
                diskQuota        = diskInfo['diskQuota'] / oneTB;
                diskQuotaRounded = +((diskQuota * 10) / 10).toFixed(1);

                diskInfo['diskUsedString'] += diskQuotaRounded + " TB used";
            };


            diskInfo['diskPercentageUsed'] =
                +(_.round(parseFloat(userInfo.diskUsed / userInfo.diskQuota * 100), 1)).toFixed(1);

            if (diskInfo['diskPercentageUsed'] == 0.0) {
                diskInfo['diskPercentageUsed'] = (diskInfo['diskUsed'] > 0) ? 0.1 : 0;
            };


            diskInfo['diskPercentageUsedStyle'] = {
                'width':  diskInfo['diskPercentageUsed'] + '%',
                'color': 'black'
            };

            if (diskInfo['diskPercentageUsed'] <= 25) {
                diskInfo['diskPercentageUsedClass'] = "progress-bar progress-bar-success";

            } else if ((diskInfo['diskPercentageUsed'] > 25) && (diskInfo['diskPercentageUsed'] <= 50)) {
                diskInfo['diskPercentageUsedClass'] = "progress-bar progress-bar-info";

            } else if ((diskInfo['diskPercentageUsed'] > 50) && (diskInfo['diskPercentageUsed'] <= 75)) {
                diskInfo['diskPercentageUsedClass'] = "progress-bar progress-bar-warning";

            } else { // 76% or more
                diskInfo['diskPercentageUsedClass'] = "progress-bar progress-bar-danger";
            };

            return diskInfo;
        };

        self.replaceNewLinesAndSpaces = function(str) {
            if (str) {
                var str1 = str.replace(/\n/g, '<br>');
                return str1.replace(/\s/g, '&nbsp;');
            };
            return str;
        };


        self.findWhatSelectedNetworksCanBeModified = function(controller, permission, successHandler, errorHandler) {

            var numberOfReadOnly = 0;
            var numberOfNonAdminNetworks = 0;
            var numberOfAdminNetworks = 0;
            var numberOfWriteNetworks = 0;

            var networkSummaries = controller.getSummariesOfSelectedNetworks();
            var numberOfSelectedNetworks = networkSummaries.length;

            var networkInfo = {
                'selected': numberOfSelectedNetworks,
                'readOnly': 0,
                'nonAdmin': 0,
                'admin'   : 0,
                'write'   : 0,
                'read'    : 0,
                'networks': [],
                'writeNetworks': [],
                'readNetworks' : []
            };

            var accesskey = null;


            var adminWriteableNetworks = _.map(networkSummaries,
                function (network) {
                    if (network.isReadOnly) {
                        numberOfReadOnly++;
                    };
                    if (network.ownerUUID != controller.identifier) {
                        numberOfNonAdminNetworks++;
                    } else {
                        numberOfAdminNetworks++;
                    };
                    return (network.ownerUUID == controller.identifier) ?
                        {'externalId': network.externalId,       'name': network.name,
                         'visibility': network.visibility, 'isShowcase': network.isShowcase,
                         'indexLevel': network.indexLevel, 'isReadOnly': network.isReadOnly
                        } : null;
                });

            networkInfo['readOnly'] = numberOfReadOnly;
            networkInfo['nonAdmin'] = numberOfNonAdminNetworks;
            networkInfo['admin']    = numberOfAdminNetworks;
            networkInfo['networks'] = _.without(adminWriteableNetworks, null);

            if ('admin' == permission) {
                successHandler(networkInfo);
                return;
            };

            // get IDs of networks for which we are (the currently logged in user) is not an owner
            // to see what kind of access (READ or WRITE) we have for these networks
            if (numberOfNonAdminNetworks > 0) {
                var nonAdminNetworkIDs = _.map(networkSummaries,
                    function (network) {
                        return (network.ownerUUID != controller.identifier) ? network.externalId : null;
                    });

                nonAdminNetworkIDs = _.without(nonAdminNetworkIDs, null);

                var writeNetworks = _.map(networkSummaries,
                    function (network) {
                        return (network.externalId in controller.networksWithWriteAccess) ?
                            {'externalId': network.externalId,       'name': network.name,
                             'visibility': network.visibility, 'isShowcase': network.isShowcase,
                             'indexLevel': network.indexLevel, 'isReadOnly': network.isReadOnly
                            } : null;
                    });

                networkInfo['writeNetworks'] = _.without(writeNetworks, null);
                networkInfo['write']         = networkInfo['writeNetworks'].length;


                var readNetworks = _.map(networkSummaries,
                    function (network) {
                        return (network.externalId in controller.networksWithReadAccess) ?
                            {'externalId': network.externalId,       'name': network.name,
                             'visibility': network.visibility, 'isShowcase': network.isShowcase,
                             'indexLevel': network.indexLevel, 'isReadOnly': network.isReadOnly
                            } : null;
                    });

                networkInfo['readNetworks'] = _.without(readNetworks, null);
                networkInfo['read']         = networkInfo['readNetworks'].length;
            };

            successHandler(networkInfo);

            return;
        };


        /*
        self.findWhatSelectedNetworksCanBeModified = function(controller, permission, successHandler, errorHandler) {

                        var networkUUIDs = controller.getIDsOfSelectedNetworks();
                        var numberOfSelectedNetworks = networkUUIDs.length;

                        var numberOfReadOnly = 0;
                        var numberOfNonAdminNetworks = 0;
                        var numberOfAdminNetworks = 0;
                        var numberOfWriteNetworks = 0;

                        var networkInfo = {
                            'selected': numberOfSelectedNetworks,
                            'readOnly': 0,
                            'nonAdmin': 0,
                            'admin'   : 0,
                            'write'   : 0,
                            'read'    : 0,
                            'networks': [],
                            'writeNetworks': [],
                            'readNetworks' : []
                        };

                        var accesskey = null;

                        // the selected networks can span multiple pages, so we we use the bulk getNetworkSummariesByUUIDsV2 API
                        ndexService.getNetworkSummariesByUUIDsV2(networkUUIDs, accesskey,
                            function (networkSummaries) {

                                var adminWriteableNetworks = _.map(networkSummaries,
                                    function (network) {
                                        if (network.isReadOnly) {
                                            numberOfReadOnly++;
                                        };
                                        if (network.ownerUUID != controller.identifier) {
                                            numberOfNonAdminNetworks++;
                                        } else {
                                            numberOfAdminNetworks++;
                                        };
                                        return (network.ownerUUID == controller.identifier) ?
                                            {'externalId': network.externalId,        'name': network.name,
                                                'visibility': network.visibility,  'isShowcase': network.isShowcase,
                                                'indexed': network.indexed,     'isReadOnly': network.isReadOnly
                                            } : null;
                                    });

                                networkInfo['readOnly'] = numberOfReadOnly;
                                networkInfo['nonAdmin'] = numberOfNonAdminNetworks;
                                networkInfo['admin']    = numberOfAdminNetworks;
                                networkInfo['networks'] = _.without(adminWriteableNetworks, null);

                                if ('admin' == permission) {
                                    successHandler(networkInfo);
                                    return;
                                };

                                // get IDs of networks for which we are (the currently logged in user) is not an owner
                                // to see what kind of access (READ or WRITE) we have for these networks
                                if (numberOfNonAdminNetworks > 0) {
                                    var nonAdminNetworkIDs = _.map(networkSummaries,
                                        function (network) {
                                            return (network.ownerUUID != controller.identifier) ? network.externalId : null;
                                        });

                                    nonAdminNetworkIDs = _.without(nonAdminNetworkIDs, null);

                                    ndexService.getNetworkPermissionsByUUIDsV2(nonAdminNetworkIDs,
                                        function(networkPermissionsMap) {

                                            // build list of networks with ADMIN and WRITE permissions
                                            var invertedMapsPermissions = _.invertBy(networkPermissionsMap);
                                            var invertedMapsPermissionsKeys = Object.keys(invertedMapsPermissions);

                                            if ('WRITE' in invertedMapsPermissions) {
                                                networkInfo['write']  = invertedMapsPermissions['WRITE'].length;

                                                var writeNetworks = _.map(networkSummaries,
                                                    function (network) {
                                                        return (invertedMapsPermissions['WRITE'].indexOf(network.externalId) > -1) ?
                                                            {'externalId': network.externalId,           'name': network.name,
                                                                'visibility': network.visibility,  'isShowcase': network.isShowcase,
                                                                'indexed': network.indexed,        'isReadOnly': network.isReadOnly
                                                            } : null;
                                                    });
                                                networkInfo['writeNetworks'] = _.without(writeNetworks, null);
                                            };

                                            if ('READ' in invertedMapsPermissions) {
                                                networkInfo['read']  = invertedMapsPermissions['READ'].length;

                                                var readNetworks = _.map(networkSummaries,
                                                    function (network) {
                                                        return (invertedMapsPermissions['READ'].indexOf(network.externalId) > -1) ?
                                                            {'externalId': network.externalId,           'name': network.name,
                                                                'visibility': network.visibility,  'isShowcase': network.isShowcase,
                                                                'indexed': network.indexed,        'isReadOnly': network.isReadOnly
                                                            } : null;
                                                    });
                                                networkInfo['readNetworks'] = _.without(readNetworks, null);
                                            };
                                            successHandler(networkInfo);
                                        },
                                        function(error) {
                                            errorHandler(error);
                                        });

                                } else {
                                    successHandler(networkInfo);
                                };
                            },
                            function (error) {
                                errorHandler(error);
                            }
                        );
                        return;
            };
        */

        self.formatErrorMessage = function(ourMessage, error) {
            var errorMessage = ourMessage;

            if (error && error.data && error.data.message) {
                errorMessage = errorMessage + ": " + error.data.message;
            } else if (error && error.message) {
                errorMessage = errorMessage + ": " + error.message;
            } else {
                errorMessage += ".";
            };

            return errorMessage;
        };

        // returns true if DOI for network is Pending; false otherwise
        self.isDOIPending = function(networkSummary) {
            return (networkSummary &&
                    (networkSummary.doi != 'undefined') &&
                    (networkSummary.doi != null) &&
                    (networkSummary.doi.toLowerCase() == 'pending'));
        };
        // returns true if DOI for network has been assigned, false otherwise
        self.isDOIAssigned = function(networkSummary) {
            return (networkSummary &&
            (networkSummary.doi != 'undefined') &&
            (networkSummary.doi != null) &&
            (networkSummary.doi.toLowerCase() != 'pending'));
        };
        // returns true if network is certified, false otherwise
        self.isNetworkCertified = function(networkSummary) {
            return (networkSummary && (networkSummary.isCertified != 'undefined') && networkSummary.isCertified);
        };


        self.addNetworkProperty = function (propertyName, propertyValue, propertyType, propertyList, subNetworkId) {
            var newProp = {
                "predicateString" : propertyName,
                "value"           : propertyValue,
                "dataType"        : propertyType,
                "subNetworkId"    : subNetworkId
            };

            for (var i = 0; i < propertyList.length; i++) {
                var property = propertyList[i];
                if (property.predicateString && property.predicateString.toLowerCase() == propertyName.toLowerCase())
                {
                    if ((property["subNetworkId"] && property["subNetworkId"] == subNetworkId) ||
                        (!property["subNetworkId"] || property["subNetworkId"] == null) && (!subNetworkId || subNetworkId == null)) {
                        propertyList.splice(i, 1);
                        break;
                    };
                };
            };

            propertyList.push(newProp);
        };

        /*
         *  Called by
         *
         *      bulkChangeNetworkProperty
         *      bulkChangeNetworkSystemProperty
         *
         *  directives.
         *
         *  Before opening modal, we need to clear the state variables possibly left
         *  from previous invocation of this operation.
         *
         */
        self.resetProgressErrosRunningFlagNetworkStruct = function (scope) {
            delete scope.progress1;
            delete scope.progress2;
            delete scope.errors;
            scope.isProcessing = false;

            scope.network = {};
        };

        /*
         * stripHTML removes html from a string (using jQuery) and returns text.
         * In case string contains no html, the function returns empty string; to avoid
         * returning empty string, we wrap string in '<html> ... </html>' tags.
         */
        self.stripHTML = function(html) {
            return $('<html>'+html+'</html>').text();
        };
    }
]);
