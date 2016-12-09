ndexApp.controller('editNetworkPropertiesController',
	['$scope', '$location', '$routeParams', '$route', 'ndexService', '$modal', 'sharedProperties', '$timeout',
		function($scope, $location, $routeParams, $route, ndexService, $modal, sharedProperties, $timeout){
	 //testing

	//              Process the URL to get application state
    //-----------------------------------------------------------------------------------
    var networkExternalId = $routeParams.identifier;

    //              CONTROLLER INTIALIZATIONS
    //------------------------------------------------------------------------------------

	$scope.editor = {};
	var editor = $scope.editor;
    editor.networkExternalId = networkExternalId;
	editor.propertyValuePairs = [];
	editor.errors = [];
    editor.isAdmin = false;
    editor.canEdit = false;
    editor.canRead = false;

    editor.reference = null;

    editor.disableSaveChangesButton = false;

    editor.namespaces = [];

    editor.showNameSpaces = false;

    editor.buildAttributeDictionary = function() {
        var dict = {};
        var prefix, attribute;

        for (var i = 0; i < editor.propertyValuePairs.length; i++) {

            prefix = editor.propertyValuePairs[i].predicatePrefix;
            attribute = editor.propertyValuePairs[i].predicateString

            if (attribute) {

                attribute = prefix + ":" + attribute;

                if (attribute in dict) {
                    dict[attribute] = dict[attribute] + 1;
                } else {
                    dict[attribute] = 1;
                }

            } else {
                // attribute is empty string
                continue;
            }

        }

        return dict;
    };

	editor.changed = function(index, value, property, action) {

        var attributeDictionary = editor.buildAttributeDictionary();


		if((index == (editor.propertyValuePairs.length - 1)) && (value.trim().length > 0)) {

            if ((!action) || (action.toLowerCase() !== 'del')) {
                editor.propertyValuePairs.push({predicatePrefix: 'none', valuePrefix: 'none', predicateString: "", value: "", isReadOnlyLabel: false});
            }
        }

        //If user deletes a property we need to add the property label back into the dropdown (if applicable)
        if(action === 'del' && value){
            if($scope.namesForSolrIndexing.indexOf(value) === -1){
                if($scope.permaNamesForSolrIndexing.indexOf(value) > -1){
                    $scope.namesForSolrIndexing.push(value);
                }
            }
        }

        // there are 2 reserved case-incensitive words, "reference" and "sourceFormat"
        // check if user entered one of them and if yes, then give an error.
        if (value) {
            if (value.toLowerCase() === 'reference') {

                property.labelError = "This interface handles 'Reference' specially. " +
                    "If you need to edit Reference property " +
                    "of the current network, please select Edit Network Profile button from the Network page.";
                editor.disableSaveChangesButton = true;

            } else if (value.toLowerCase() === 'sourceformat') {

                property.labelError = "sourceFormat is reserved for internal use by NDEx and " +
                    "cannot be used as predicate.";
                editor.disableSaveChangesButton = true;

            } else if (value.toLowerCase() === 'custom...' && !property.predicateStringCustom) {

                property.labelError = "Custom field is empty";
                editor.disableSaveChangesButton = true;

            } else {

                property.labelValue = property.predicatePrefix + ":" + property.predicateString;
                delete property.labelError;

            }
        } else if (property) {

            // no value entered (one possible scenario is user marked and deleted the whole word); remove error message
            property.labelError = "Missing attribute.";
            editor.disableSaveChangesButton = true;
        }

        // enable or disable the Save button
        editor.disableSaveChangesButton = editor.checkIfFormIsValid(attributeDictionary);
	};



    editor.checkIfFormIsValid = function(attributeDictionary) {

        var disableSaveChangesButton = false;

        for(var i=0; i<editor.propertyValuePairs.length; i++) {

            var pair = editor.propertyValuePairs[i];
            var labelValue = pair.labelValue;
            var predicateStr = pair.predicateString;

            if (predicateStr.toLowerCase() === 'reference') {

                pair.labelError = "This interface handles 'Reference' specially. " +
                    "If you need to edit Reference property " +
                    "of the current network, please select Edit Network Profile button from the Network page.";
                disableSaveChangesButton = true;

            } else if (predicateStr.toLowerCase() === 'sourceformat') {

                pair.labelError = "sourceFormat is reserved for internal use by NDEx and " +
                    "cannot be used as predicate.";
                disableSaveChangesButton = true;

            } else if ((labelValue in attributeDictionary) && (attributeDictionary[labelValue] > 1)) {

                 // check labelValue (that is prefix:attribute) has been entered more than once

                // we found attribute that is duplicate.  Mark all these attributes with error message
                // if they are not marked already

                for (var j=i; j<editor.propertyValuePairs.length; j++) {
                    var pairForError = editor.propertyValuePairs[j];

                    if ((pairForError.labelValue === labelValue) && (!pairForError.labelError)) {
                        pairForError.labelError = "This attribute entered more than once."
                    }
                }

            } else {

                if (pair.predicateString !== "") {
                    delete pair.labelError;
                }
            }
        }


        // run through all attribute objects and see if any object has an error message field.
        // If there is at least one error message, the form is invalid
        for(var i=0; i<editor.propertyValuePairs.length; i++) {

            if (editor.propertyValuePairs[i].labelError) {
                disableSaveChangesButton = true;
                break;
            }
        }

        if (editor.propertyValuePairs.length == 1) {
            if ((typeof (editor.propertyValuePairs[0].predicateString) === 'undefined') ||
                !(editor.propertyValuePairs[0].predicateString)) {
                disableSaveChangesButton = false;
            }
        }

        return disableSaveChangesButton;
    };


    editor.checkIfFormIsValidOnLoad = function() {
        var attributeDictionary = editor.buildAttributeDictionary();
        var disableSaveChangesButton = false;


        for(var i=0; i<editor.propertyValuePairs.length; i++) {

            var pair = editor.propertyValuePairs[i];
            var labelValue = pair.labelValue;

            if (((typeof(pair.predicateString) === 'undefined') || !(pair.predicateString)) &&
                ((editor.propertyValuePairs.length - 1) != i)) {
                pair.labelError = "Missing attribute."
                disableSaveChangesButton = true;
            }


            // check labelValue (that is prefix:attribute) has been entered more than once
            if ((labelValue in attributeDictionary) && (attributeDictionary[labelValue] > 1)) {

                disableSaveChangesButton = true;

                // we wound attribute that is duplicate.  Mark all these attributes with error message
                // if they are not marked already

                for (var j=i; j<editor.propertyValuePairs.length; j++) {
                    var pairForError = editor.propertyValuePairs[j];

                    if ((pairForError.labelValue === labelValue) && (!pairForError.labelError)) {
                        pairForError.labelError = "This attribute entered more than once."
                    }
                }
            }
        }

        if ((editor.propertyValuePairs.length == 0) ||
           ((editor.propertyValuePairs.length == 1) && ((typeof (editor.propertyValuePairs[0].predicateString) === 'undefined') ||
                !(editor.propertyValuePairs[0].predicateString))) )
          {
              disableSaveChangesButton = true;
          }

        return disableSaveChangesButton;

    }




    // these are names used by Solr for indexing.
    // They are found in the server's ndexbio-rest/src/main/resources/solr/ndex-networks/conf/schema.xml
    // under the "Collaborator required index fields" comment
    $scope.namesForSolrIndexing = [
        "author",
        "disease",
        "labels",
        "methods",
        "organism",
        "networkType",
        "rights",
        "rightsHolder",
        "tissue"
    ];

    //This is for comparison
    $scope.permaNamesForSolrIndexing = [
        "author",
        "disease",
        "labels",
        "methods",
        "organism",
        "networkType",
        "rights",
        "rightsHolder",
        "tissue"
    ];

    $scope.namesForSolrIndexingDictionary = {};

    $scope.namesForSolrIndexing.forEach(function(val, i) {
        $scope.namesForSolrIndexingDictionary[val] = "";
    });


    editor.save = function() {
        if( $scope.isProcessing )
            return;
        $scope.isProcessing = true;

        if ((editor.propertyValuePairs[editor.propertyValuePairs.length - 1].predicatePrefix.toLowerCase()==='none') &&
            (editor.propertyValuePairs[editor.propertyValuePairs.length - 1].valuePrefix.toLowerCase()==='none')) {
            editor.propertyValuePairs.splice(editor.propertyValuePairs.length - 1, 1);
        }

		var length = editor.propertyValuePairs.length;
        var i = 0;

        // remove all "Reference" attributes
        while (i < length){

            if((typeof editor.propertyValuePairs[i].predicateString !== 'undefined') &&
                (editor.propertyValuePairs[i].predicateString.trim().toLowerCase() === 'reference') ) {

                // here, we just found "Reference" element entered by user; remove it
                editor.propertyValuePairs.splice(i,1);
                length = length - 1;

                // here, DO NOT increment the loop counter i since array has shrunk
                // after splicing and we have a new element at editor.propertyValuePairs[i] after splicing
                continue;
            }
            i = i + 1;
        }

        length = editor.propertyValuePairs.length;
        i = 0;

        // now, remove all attributes with no values -- we don't want to save them
        while (i < length){

            if (( typeof editor.propertyValuePairs[i].value === 'undefined') || (!editor.propertyValuePairs[i].value) ) {

                // remove attribute with no value
                editor.propertyValuePairs.splice(i,1);
                length = length - 1;

                // here, DO NOT increment the loop counter i since array has shrunk
                // after splicing and we have a new element at editor.propertyValuePairs[i] after splicing
                continue;
            }
            i = i + 1;
        }

        length = editor.propertyValuePairs.length;

		for(var ii=0; ii<length; ii++){
			var pair = editor.propertyValuePairs[ii];

            if(pair.predicateString === 'custom...')
                pair.predicateString = pair.predicateStringCustom;

			if((typeof pair.predicatePrefix !== 'undefined') && (pair.predicatePrefix != 'none') )
				pair.predicateString = pair.predicatePrefix+':'+pair.predicateString

            if((typeof pair.valuePrefix !== 'undefined') && (pair.valuePrefix != 'none') )
				pair.value = pair.valuePrefix+':'+pair.value;
		}


        if (typeof editor.propertyValuePairs !== 'undefined') {
            editor.propertyValuePairs[editor.propertyValuePairs.length] =
            {   "predicateString" : "Reference",
                "value"           : editor.reference,
                "dataType"        : "string",
                "subNetworkId"    : null
            }
        } else {
            editor.propertyValuePairs =
            {   "predicateString" : "Reference",
                "value"           : editor.reference,
                "dataType"        : "string",
                "subNetworkId"    : null
            };
        }


		ndexService.setNetworkPropertiesV2(networkExternalId, editor.propertyValuePairs,
			function(data) {
				//$route.reload();
                var networkViewPage = sharedProperties.getNetworkViewPage();
                var networkID = editor.networkExternalId;
                $location.path(networkViewPage + networkID);
                $scope.isProcessing = false;
			},
			function(error) {

                if (error.data && error.data.message) {
                    editor.errors.push(error.data.message);
                } else {
                    editor.errors.push("Server returned HTTP error response code : " +
                        error.status + ". Error message : " + error.statusText + ".");
                }

                $scope.isProcessing = false;
            });
	};

	editor.removeNamespace = function(index) {
		editor.ontologies.splice(index,1);
		//TODO api call
	};

	editor.addNamespace = function() {
        var namespace = {
            prefix : editor.newPrefix,
            uri : editor.newURI
        };
		ndexService.addNamespaceToNetwork(networkExternalId, namespace,
            function(success) {
                editor.namespaces.push(namespace);
                editor.newPrefix = null;
                editor.newURI = null;
                editor.showNameSpaces = (editor.namespaces.length > 0) ? true : false;
            },
            function(error) {
                editor.errors.push(error.data)
            })
	};

	editor.setURI = function(item, mode, label) {
		editor.newURI = item.uri;
	};

    editor.refresh = $route.reload;

    editor.preloadedOntologies = [
        {
            prefix: 'GO',
            uri: 'http://identifiers.org/go/'
        },
        {
            prefix: 'HGNC',
            uri: 'http://identifiers.org/hgnc/'
        },
        {
            prefix: 'CHEBI',
            uri: 'http://identifiers.org/chebi/'
        },
        {
            prefix: 'InChI',
            uri: 'http://identifiers.org/inchi/'
        },
        {
            prefix: 'BTO',
            uri: 'http://identifiers.org/bto/'
        },
        {
            prefix: 'CCO',
            uri: 'http://identifiers.org/cco/'
        },
        {
            prefix: 'CL',
            uri: 'http://identifiers.org/cl/'
        },
        {
            prefix: 'DOID',
            uri: 'http://identifiers.org/doid/'
        },
        {
            prefix: 'MA',
            uri: 'http://identifiers.org/ma/'
        },
        {
            prefix: 'OBI',
            uri: 'http://identifiers.org/obi/'
        },
        {
            prefix: 'OPB',
            uri: 'http://identifiers.org/opb/'
        },
        {
            prefix: 'PATO',
            uri: 'http://identifiers.org/pato/'
        },
        {
            prefix: 'CCO',
            uri: 'http://identifiers.org/cco/'
        },
        {
            prefix: 'PW',
            uri: 'http://identifiers.org/pw/'
        },
        {
            prefix: 'MOD',
            uri: 'http://identifiers.org/psimod/'
        },
        {
            prefix: 'PR',
            uri: 'http://identifiers.org/pr/'
        },
        {
            prefix: 'OBO_REL',
            uri: 'http://identifiers.org/ro/'
        },
        {
            prefix: 'SO',
            uri: 'http://identifiers.org/so/'
        },
        {
            prefix: 'SBO',
            uri: 'http://identifiers.org/sbo/'
        },
        {
            prefix: 'TTHERM',
            uri: 'http://identifiers.org/tgd/'
        }
    ];

    //				API initializations
    //------------------------------------------------------------------------------------
    ndexService.getNetworkSummaryV2(networkExternalId)
        .success(
            function(network) {
                editor.propertyValuePairs = network.properties;

                var arrayLength = editor.propertyValuePairs.length;
                var i = 0;

                // we need to remove all "sourceformat" objects.  There should always be only one
                // "sourceformat" element sent by the  server; we want to make sure we remove them
                // all in case server by mistake sends multiple "sourceformat" elements.
                while ( i < arrayLength ) {
                    editor.propertyValuePairs[i].isReadOnlyLabel = true;

                    if($scope.namesForSolrIndexing.indexOf(editor.propertyValuePairs[i].predicateString) == -1){
                        //$scope.namesForSolrIndexing.push(editor.propertyValuePairs[i].predicateString);
                    } else {
                        var dropdownIndex = $scope.namesForSolrIndexing.indexOf(editor.propertyValuePairs[i].predicateString);
                        $scope.namesForSolrIndexing.splice(dropdownIndex, 1);
                    }
                    if ((editor.propertyValuePairs[i].predicateString.toLowerCase() === "sourceformat") ||
                        (editor.propertyValuePairs[i].predicateString.toLowerCase() === "reference")) {

                        if( editor.propertyValuePairs[i].predicateString.toLowerCase() === "reference") {
                            editor.reference = editor.propertyValuePairs[i].value;
                        }
                        editor.propertyValuePairs.splice(i,1);
                        arrayLength = arrayLength - 1;
                        // here, DO NOT increment the loop counter i since array has shrunk
                        // after splicing and we have a new element at editor.propertyValuePairs[i] after splicing
                        continue;
                    }
                    i = i + 1;
                }
                if($scope.namesForSolrIndexing.indexOf("custom...") > -1) {
                    $scope.namesForSolrIndexing.splice($scope.namesForSolrIndexing.indexOf("custom..."))
                }
                $scope.namesForSolrIndexing.push("custom...");

                //ndexService.getNetworkNamespaces(networkExternalId,
                var size = null;
                ndexService.getNetworkAspectAsCXV2(networkExternalId, encodeURIComponent("@context"), size,
                    function(namespaces) {

                        editor.namespaces = namespaces;
                        editor.showNameSpaces = (editor.namespaces.length > 0) ? true : false;

                        var namespaceSet = {};
                        for( var i = 0; i < namespaces.length; i++ )
                        {
                            namespace = namespaces[i];
                            namespaceSet[namespace.prefix] = true;
                        }

                        var length = editor.propertyValuePairs.length;
                        for(var ii=0; ii<length; ii++) {
                            var pair = editor.propertyValuePairs[ii];

                            var colonIndex = pair.predicateString.indexOf(':');

                            if (colonIndex != -1 && pair.predicateString.substring(0, colonIndex) in namespaceSet) {
                                pair.predicatePrefix = pair.predicateString.substring(0, colonIndex);
                                pair.predicateString = pair.predicateString.substring(colonIndex + 1);
                            }
                            else {
                                pair.predicatePrefix = 'none';
                            }


                            if (pair.value == null)
                            {
                                pair.valuePrefix = 'none';
                            }
                            else
                            {
                                colonIndex = pair.value.indexOf(':');

                                if (colonIndex != -1 && pair.value.substring(0, colonIndex) in namespaceSet)
                                {
                                    pair.valuePrefix = pair.value.substring(0, colonIndex);
                                    pair.value = pair.value.substring(colonIndex + 1);
                                }
                                else
                                {
                                    pair.valuePrefix = 'none';
                                }
                                pair.labelValue = pair.predicatePrefix + ":" + pair.predicateString;
                                //pair.valueValue = pair.valuePrefix     + ":" + pair.value;
                            }
                        }

                        editor.disableSaveChangesButton = editor.checkIfFormIsValidOnLoad();

                        editor.propertyValuePairs.push({predicatePrefix: 'none',  labelValue: "none: ''",
                                                        valuePrefix: 'none', predicateString: "", value: ""});
                        // todo add local to list
                        editor.networkName = network.name;

                    },
                    function(error) {
                        editor.disableSaveChangesButton = editor.checkIfFormIsValidOnLoad();
                        
                        editor.propertyValuePairs.push({predicatePrefix: 'none', labelValue: "none:''",
                                                        valuePrefix: 'none', predicateString: "", value: ""});

                        editor.networkName = network.name;

                        //editor.errors.push(error)

                        console.log("unable to get @context aspect for network ")
                    });

            }
        )
        .error(
            function(error) {
                editor.errors.push(error)
            }
        );

    var userId = sharedProperties.getCurrentUserId();
    var networkId = networkExternalId;
    var directonly = false;

    ndexService.getUserPermissionForNetworkV2(userId, networkId, directonly,
        function(membership) {

            if (membership) {
                var myMembership = membership[networkId];

                if (myMembership == 'ADMIN') {
                    editor.isAdmin = true;
                }
                if (myMembership == 'WRITE') {
                    editor.canEdit = true;
                }
                if (myMembership == 'READ') {
                    editor.canRead = true;;
                }
            }
        },
        function(error){
            editor.errors.push(error)
        });

    editor.showNameSpaces = (editor.namespaces.length > 0) ? true : false;

}]);