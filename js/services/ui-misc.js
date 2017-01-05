/**
 * Created by vrynkov 28 Oct.2016
 *
 * Miscellaneous useful utilities used by different modules.
 */
'use strict';

angular.module('ndexServiceApp')
    .service('uiMisc', ['ndexNavigation', 'ndexService', 'config',
                function (ndexNavigation, ndexService, config) {

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

        
        self.getNetworkFromServerAndSaveToDisk = function(rowEntity) {
            if (!rowEntity && !rowEntity.externalId) {
                return;
            }

            ndexService.getCompleteNetworkInCXV2(rowEntity.externalId,
                function (network) {

                    var networkInJSON = angular.toJson(network);

                    var downloadFileName = rowEntity.name;
                    downloadFileName = downloadFileName.replace(/ /g,"_");

                    //var networkType = (rowEntity.Format.toLowerCase() == 'unknown') ? "cx" : rowEntity.Format;

                    // network is in CX format, so we save it in file with extension ".cx"
                    var networkType = "cx";
                    downloadFileName = downloadFileName + "." + networkType;

                    var blob = new Blob([networkInJSON], { type:"application/json;charset=utf-8;" });

                    // saveAs is defined in FileSaver.js
                    saveAs(blob, downloadFileName);
                },
                function (error) {
                    var message = "Unable to get network in CX";
                    if (error && error.message) {
                        message = message + ": "  + error.message;
                    }
                    var title = "Unable to Download This Network";
                    ndexNavigation.genericInfoModal(title, message);
                }
            );
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

        self.getFirstWordFromDisease = function(diseaseDescription) {

            if (!diseaseDescription) {
                return "";
            }

            return diseaseDescription.split(/[ .,;:]+/).shift();
        };
                    
        self.getSubNetworkId = function(network) {
            return (network.subnetworkIds && (network.subnetworkIds.length == 1)) ? network.subnetworkIds[0] : null;
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

        self.getCurrentServerURL = function() {
            var parser = document.createElement('a');
            parser.href = config.ndexServerUriV2;

            return parser.protocol + "//" + parser.hostname + "/#/";
        }
    }
]);