/**
 * Created by vrynkov 28 Oct.2016
 *
 * Miscellaneous useful utilities used by multiple modules.
 */
'use strict';

angular.module('ndexServiceApp')
    .service('uiMisc', ['ndexNavigation', 'ndexService',
                function (ndexNavigation, ndexService) {

        var self = this;

        /*
         * Shows modal with Errors or Warnings when user clicks on the Failed or Warning
         * image in the Status column of Network table on My Account, User, Group or Search pages.
         *
         */
        self.showNetworkWarningsOrErrors = function (rowEntity, networks) {

            for (var i=0; i<networks.length; i++) {
                var network = networks[i];

                if (rowEntity.externalId == network.externalId) {
                    foundNetwork = network;
                    break;
                }
             }

             var foundNetwork;

             var status = rowEntity.Status.toLowerCase();
             var message = "";

             if (status == "failed") {
                message = foundNetwork.errorMessage;
             } else {
                for (var i=0; i<foundNetwork.warnings.length; i++) {
                    message = message + foundNetwork.warnings[i] + "<br>";
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

                    var networkType = (rowEntity.Format.toLowerCase() == 'unknown') ? "cx" : rowEntity.Format;
                    downloadFileName = downloadFileName + "." + networkType;

                    var blob = new Blob([networkInJSON], { type:"application/json;charset=utf-8;" });

                    // saveAs is defined in FileServer.js
                    saveAs(blob, downloadFileName);
                },
                function (error) {
                    console.log("unable to get network in CX");
                }
            );
        };

        self.getNetworkReferenceObj = function(network) {
            var reference = "";

            if (!network || !network.properties) {
                return reference;
            }

            for (var i = 0; i < network.properties.length; i++) {
                var property = network.properties[i];
                if (property.predicateString && property.predicateString.toLowerCase() == "reference") {
                    reference = property.value;
                    break;
                }
            }

            var referenceInPlainText = jQuery(reference).text().trim();
            var url = jQuery(reference).find('a').attr('href');

            var countURLs = (reference.toLowerCase().match(/a href=/g) || []).length;

            var referenceObj = {
                referenceText: referenceInPlainText ? referenceInPlainText : "",
                referenceHTML: reference ? reference : "",
                url: url ? url : "",
                urlCount: countURLs
            };

            return referenceObj;
        };                   

    }
]);