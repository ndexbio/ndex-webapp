/**
 * Created by vrynkov 28 Oct.2016
 *
 * Miscellaneous useful utilities used by different modules.
 */
'use strict';

angular.module('ndexServiceApp')
    .service('uiMisc', ['ndexNavigation', 'ndexService', 'config', 'ndexUtility',
                function (ndexNavigation, ndexService, config, ndexUtility) {

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

             var title = (status == 'failed') ? "Failed Error Message" : "Warnings";

             ndexNavigation.genericInfoModal(title, message);
        };
                    
        self.getNetworkReferenceObj = function(subNetworkId, network) {
            var reference = "";

            if (!network || !network.properties) {
                return reference;
            }

            for (var i = 0; i < network.properties.length; i++) {
                var property = network.properties[i];
                if (property.predicateString && (property.predicateString.toLowerCase() == "reference") &&
                    property.subNetworkId == subNetworkId)
                {
                    reference = (property.value) ? property.value : "";
                    break;
                }
            }

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
            };
        };

        self.getSetReferenceObj = function(networkSet) {
            var reference = "";

            if (!networkSet || !networkSet.properties || !networkSet.properties.reference) {
                return reference;
            }

            reference = networkSet.properties.reference;
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
            };
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
         * self.getNoOfSubNetworks calculates number of subnetworks in network.properties.
         * Instead of just returning length of network.subnetworkIds, we iterate through network.properties and
         * store each unique subnetworkId in subNetworkIdsList. This is more reliable, since it is possible to
         * have situations where length of network.subnetworkIds doesn't correctly reflect number of subnetwork Ids in
         * network.properties.
         */
        self.getNoOfSubNetworks = function(network) {
            var subNetworkIdsList = [];

            if (network && network.properties) {

                _.forEach(network.properties, function(networkProperty) {

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
            parser.href = config.ndexServerUriV2;

            return parser.protocol + "//" + parser.hostname + "/#/";
        };


        self.getNetworkDownloadLink = function(accountController, rowEntity) {

            var link =
                ndexService.getNdexServerUriV2() + "/network/" +
                    rowEntity.externalId + "?download=true&setAuthHeader=false" ;

            if (accountController.isLoggedInUser && rowEntity.Visibility &&
                (rowEntity.Visibility.toLowerCase() == 'private'))
            {
                var userCredentials = ndexUtility.getUserCredentials();

                if (!userCredentials || !userCredentials['userName'] || !userCredentials['token']) {
                    return link;
                }
                var userName = userCredentials['userName'];
                var password = userCredentials['token'];

                link = link.replace("http://", "http://" + userName + ":" + password + "@");
            };

            return link;
        };

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
            var loggedInUserId = ndexUtility.getLoggedInUserExternalId();

            if (loggedInUserId && loggedInUserId == set.ownerId) {
                var showCased = set['showcased'];
                delete set['showcased'];
                set['showcased'] = showCased ? "Yes" : "No";

                ndexService.getAccessKeyOfNetworkSetV2(set['externalId'],
                    function(data) {

                        if (!data) {
                            // empty string - access is deactivated
                            set['shareLinkStatus'] = 'Inactive';

                        } else if (data['accessKey']) {
                            // received  data['accessKey'] - access is enabled
                            set['shareLinkStatus'] = 'Active';
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
            var referenceObj = self.getNetworkReferenceObj(subNetworkId, network);

            if (referenceObj && (referenceObj.referenceText.length > 0)) {
                if ((referenceObj.url && referenceObj.url.length > 0) && (referenceObj.urlCount == 1)) {
                    network['reference'] =
                        '<a href="' +  referenceObj.url + '" target="_blank">' + referenceObj.url + '</a>';
                }
                else if (referenceObj.urlCount != 1) {
                    network['reference'] =  referenceObj.referenceHTML;
                };
            };

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


    }
]);