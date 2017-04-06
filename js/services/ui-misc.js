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

        self.getFirstWordFromDisease = function(diseaseDescription) {

            if (!diseaseDescription) {
                return "";
            }

            return diseaseDescription.split(/[ .,;:]+/).shift();
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

            var link = ndexService.getNdexServerUriV2() + "/network/" + rowEntity.externalId + "?download=true";

            if (accountController.isLoggedInUser && rowEntity.Visibility &&
                rowEntity.Visibility.toLowerCase() == 'private')
            {
                var userCredentials = ndexUtility.getUserCredentials();

                if (!userCredentials) {
                    return link;
                }
                var userName = userCredentials['userName'];
                var password = userCredentials['token'];

                link = link.replace("http://", "http://" + userName + ":" + password + "@");
            };

            return link;
        };
    }
]);