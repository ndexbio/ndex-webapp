ndexApp.controller('editNetworkPropertiesFixedFormController',
	['$scope', '$location', '$routeParams', '$route', 'ndexService', '$modal', 'sharedProperties', '$timeout', 'uiMisc', 'ndexNavigation', 'ndexUtility',
		function($scope, $location, $routeParams, $route, ndexService, $modal, sharedProperties, $timeout, uiMisc, ndexNavigation, ndexUtility, datepicker){
	 //testing

	//              Process the URL to get application state
    //-----------------------------------------------------------------------------------
    var networkExternalId = $routeParams.identifier;
    var subNetworkId = ($routeParams.subNetworkId.toLocaleLowerCase() == "null") ? null : $routeParams.subNetworkId;

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
    editor.showcased = {"state": true};
    editor.subNetworkId = subNetworkId;
    editor.visibilityIndex = "PRIVATE_NOT_INDEXED";
    editor.idexed = false;
    $scope.$watch('editor.visibilityIndex', function() {
        if(editor.visibilityIndex === "PUBLIC"){
            $scope.mainProperty.visibility = "PUBLIC";
            $scope.mainProperty.indexed = true;
        } else if(editor.visibilityIndex === "PUBLIC_NOT_INDEXED"){
            $scope.mainProperty.visibility = "PUBLIC";
            $scope.mainProperty.indexed = false;
        } else if(editor.visibilityIndex === "PRIVATE"){
            $scope.mainProperty.visibility = "PRIVATE";
            $scope.mainProperty.indexed = true;
        } else if(editor.visibilityIndex === "PRIVATE_NOT_INDEXED"){
            $scope.mainProperty.visibility = "PRIVATE";
            $scope.mainProperty.indexed = false;
        }
    });

    editor.reference = null;

    editor.disableSaveChangesButton = false;

    editor.namespaces = [];

    editor.viewfilter = {"state": "MAIN"};

    editor.showNameSpaces = false;
    editor.propertyValuePairs = [];
    editor.propertyValuePairsIndex = {};
    editor.hiddenValuePairs = [];
    editor.propertyTemplate = {
        'author': {predicateString: "author", value: "", isReadOnlyLabel: false, dataType: "string", subNetworkId: subNetworkId},
        'disease': {predicateString: "disease", value: "", isReadOnlyLabel: false, dataType: "string", subNetworkId: subNetworkId},
        'labels': {predicateString: "labels", value: "", isReadOnlyLabel: false, dataType: "string", subNetworkId: subNetworkId},
        'methods': {predicateString: "methods", value: "", isReadOnlyLabel: false, dataType: "string", subNetworkId: subNetworkId},
        'organism': {predicateString: "organism", value: "", isReadOnlyLabel: false, dataType: "string", subNetworkId: subNetworkId},
        'networkType': {predicateString: "networkType", value: "", isReadOnlyLabel: false, dataType: "string", subNetworkId: subNetworkId},
        'rights': {predicateString: "rights", value: "", isReadOnlyLabel: false, dataType: "string", subNetworkId: subNetworkId},
        'rightsHolder': {predicateString: "rightsHolder", value: "", isReadOnlyLabel: false, dataType: "string", subNetworkId: subNetworkId},
        'tissue': {predicateString: "tissue", value: "", isReadOnlyLabel: false, dataType: "string", subNetworkId: subNetworkId}
    };

    editor.rights = [
        "",
        "Attribution 4.0 International (CC BY 4.0)",
        "Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)",
        "Attribution-ShareAlike 4.0 International (CC BY-SA 4.0)",
        "Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)",
        "Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0)",
        "Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)",
        "Waiver-No rights reserved (CC0)",
        "Apache License 2.0 (Apache-2.0)",
        "3-clause BSD license (BSD-3-Clause)",
        "2-clause BSD license (BSD-2-Clause)",
        "GNU General Public License (GPL)",
        "GNU Lesser General Public License (LGPL)",
        "MIT license (MIT)",
        "Mozilla Public License 2.0 (MPL-2.0)",
        "Common Development and Distribution License (CDDL-1.0)",
        "Eclipse Public License (EPL-1.0)",
        "Other"
    ];

    editor.rightsOther = "";

    editor.scoringLookup = {
        'author': 10,
        'disease': 10,
        'labels': 5,
        'methods': 10,
        'organism': 10,
        'networkType': 10,
        'rights': 5,
        'rightsHolder': 5,
        'tissue': 5,
        'name': 10,
        'description': 10,
        'reference': 10,
        'version': 10
    };

    editor.score = 0;
    $scope.score = 0;
    $scope.scoreClass = "progress-bar-danger";
    $scope.mainProperty = {
        "name": "",
        "description": "",
        "reference": "",
        "version": "",
        "visibility": "PRIVATE",
        "indexed": true
    };

    editor.doiRequired = {
        'name': $scope.mainProperty.name,
        'description': $scope.mainProperty.decription,
        'author': editor.propertyTemplate.author,
        'rights': editor.propertyTemplate.rights,
        'rightsHolder': editor.propertyTemplate.rightsHolder,
        'reference': $scope.mainProperty.reference
    };

    var loggedInUser = ndexUtility.getUserCredentials();
    var loggedInUserName = (loggedInUser && loggedInUser['userName']) ? loggedInUser['userName'] : null;

    editor.doiInfo = {
        "user": {"username": loggedInUserName},
        "visibility": "PUBLIC",
        "pubDate": ""
    }


    $scope.updatecalendar = function(){
        editor.doiInfo.pubDate = $('#doiDTPicker').val();
    };

    // grab today and inject into field
    $scope.today = function() {
        $scope.dt = new Date();
    };

    // run today() function
    $scope.today();

    // setup clear
    $scope.clear = function () {
        $scope.dt = null;
    };

    // handle formats
    $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate'];

    // assign custom format
    $scope.format = $scope.formats[0];


    // open min-cal
    $scope.open = function($event) {
        $event.preventDefault();
        $event.stopPropagation();

        $scope.opened = true;
    };
    uiMisc.hideSearchMenuItem();
    $scope.$parent.showSearchMenu = true;

    editor.buildAttributeDictionary = function() {
        var dict = {};
        var attribute;

        for (var i = 0; i < editor.propertyValuePairs.length; i++) {

            attribute = editor.propertyValuePairs[i].predicateString;
            if(attribute === "custom..."){
                attribute = editor.propertyValuePairs[i].predicateStringCustom;
            }

            if (attribute) {

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
        var nonEditableLabels = ["sourceformat", "name", "description", "version", "reference"]

		if((index == (editor.propertyValuePairs.length - 1)) && (value.trim().length > 0)) {

            if ((!action) || (action.toLowerCase() !== 'del')) {
                editor.propertyValuePairs.push({predicateString: "", value: "", isReadOnlyLabel: false,
                    dataType: "string", subNetworkId: subNetworkId});
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

        if (!action || (action.toLowerCase() !== 'del')) {

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

                    //            } else if (value.toLowerCase() === 'custom...' && !property.predicateStringCustom) {

                    //                property.labelError = "Custom field is empty";
                    //                editor.disableSaveChangesButton = true;

                } else if (nonEditableLabels.indexOf(value.toLowerCase()) > -1) {
                    var myval = nonEditableLabels.indexOf(value.toLowerCase());
                    property.labelError = value + " is a reserved keyword. Please enter a different value.";
                    editor.disableSaveChangesButton = true;

                } else if (property.predicateStringCustom && (property.predicateString == "custom...")) {

                    editor.propertyValuePairs[index].labelValue = (property.predicateStringCustom) ?
                        (property.predicateStringCustom) : "";
                    delete property.labelError;

                } else {

                    //property.labelValue = property.predicatePrefix + ":" + property.predicateString;
                    editor.propertyValuePairs[index].labelValue = property.predicateString;
                    delete property.labelError;

                }


            } else if (property) {

                // no value entered (one possible scenario is user marked and deleted the whole word); remove error message
                property.labelError = "Missing attribute.";
                editor.disableSaveChangesButton = true;
            }
        }

        // enable or disable the Save button
        editor.disableSaveChangesButton = editor.checkIfFormIsValid(attributeDictionary);
	};

    editor.valueChanged = function(index, property) {

        if (property.value && pair.predicateString) {
            disableSaveChangesButton = true;
            pair.valueError = "Please enter a Value.";
        } else {
            delete pair.valueError;
        }
    }

    editor.updateScore = function() {
        $scope.score = 0;

        var myElement = angular.element(document.querySelector('#descriptionTextBox'));
        //console.log(myElement);

        for(var i=0; i<editor.propertyValuePairs.length; i++) {
            var pair = editor.propertyValuePairs[i];
            var predicateStr = pair.predicateString;

            if (editor.scoringLookup[predicateStr]) {
                if (pair.value && pair.value.length > 0) {
                    $scope.score += editor.scoringLookup[predicateStr];
                }
            }
        }

        for(key in $scope.mainProperty) {

            if (editor.scoringLookup[key]) {
                if ($scope.mainProperty[key] && $scope.mainProperty[key].length > 0) {
                    $scope.score += editor.scoringLookup[key];
                }
            }
        }

        if($scope.score >= 25 && $scope.score < 50){
            $scope.scoreClass = "progress-bar-warning";
        } else if($scope.score >= 50 && $scope.score < 75){
            $scope.scoreClass = "";
        } else if($scope.score >= 75){
            $scope.scoreClass = "progress-bar-success";
        } else {
            $scope.scoreClass = "progress-bar-danger";
        }
    };

    editor.checkIfFormIsValid = function(attributeDictionary) {

        var disableSaveChangesButton = false;
        var nonEditableLabels = ["sourceformat", "name", "description", "version", "reference"]

        for(var i=0; i<editor.propertyValuePairs.length; i++) {

            var pair = editor.propertyValuePairs[i];
            var labelValue = pair.labelValue;
            var predicateStr = pair.predicateString;

            if(predicateStr === "custom..."){
                predicateStr = (pair.predicateStringCustom) ? pair.predicateStringCustom : "";
            }

            if (predicateStr.toLowerCase() === 'reference') {

                pair.labelError = "This interface handles 'Reference' specially. " +
                    "If you need to edit Reference property " +
                    "of the current network, please select Edit Network Profile button from the Network page.";
                disableSaveChangesButton = true;

            } else if (predicateStr.toLowerCase() === 'sourceformat') {

                pair.labelError = "sourceFormat is reserved for internal use by NDEx and " +
                    "cannot be used as predicate.";
                disableSaveChangesButton = true;

            } else if (nonEditableLabels.indexOf(predicateStr.toLowerCase()) > -1) {

                pair.labelError = predicateStr + " is a reserved keyword. Please enter a different value.";

                // there are duplicate attributes, so disable the Save Changes button
                disableSaveChangesButton = true;

            } else if ((labelValue in attributeDictionary) && (attributeDictionary[labelValue] > 1)) {

                // we found attribute that is duplicate; mark it with error message
                editor.propertyValuePairs[i].labelError =
                    "This attribute entered " + attributeDictionary[labelValue] + " times."

                disableSaveChangesButton = true;

            }  else {

                if (pair.labelError) {
                    delete pair.labelError;
                }
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
            var predicateStr = pair.predicateString;

            if (((typeof(pair.predicateString) === 'undefined') || !(pair.predicateString)) &&
                ((editor.propertyValuePairs.length - 1) != i)) {
                pair.labelError = "Missing attribute."
                disableSaveChangesButton = true;
            }

            //if(editor.scoringLookup[predicateStr]){
            //    if(pair.value.length > 0){
            //        $scope.score += editor.scoringLookup[predicateStr];
            //    }
            //}
            editor.updateScore();

            // check labelValue (that is prefix:attribute) has been entered more than once
            if ((labelValue in attributeDictionary) && (attributeDictionary[labelValue] > 1)) {

                disableSaveChangesButton = true;

                // we found attribute that is duplicate.  Mark all these attributes with error message

                for (var j=i; j<editor.propertyValuePairs.length; j++) {
                    var pairForError = editor.propertyValuePairs[j];

                    if (pairForError.labelValue === labelValue) {
                        editor.propertyValuePairs[j].labelError = "This attribute entered " + attributeDictionary[labelValue] + " times."
                    }
                }
            }
        }

        if($scope.score >= 25 && $scope.score < 50){
            $scope.scoreClass = "progress-bar-warning";
        } else if($scope.score >= 50 && $scope.score < 75){
            $scope.scoreClass = "";
        } else if($scope.score >= 75){
            $scope.scoreClass = "progress-bar-success";
        } else {
            $scope.scoreClass = "progress-bar-danger";
        }

        if ((editor.propertyValuePairs.length == 0) ||
           ((editor.propertyValuePairs.length == 1) && ((typeof (editor.propertyValuePairs[0].predicateString) === 'undefined') ||
                !(editor.propertyValuePairs[0].predicateString))) )
          {
              disableSaveChangesButton = true;
          }

        return disableSaveChangesButton;

    }

    // this function gets called when user navigates away from the current page
    // (can also use "$locationChangeStart" instead of "$destroy"
    $scope.$on("$destroy", function(){

        // hide the Search menu item in Nav Bar
        $scope.$parent.showSearchMenu = false;

        uiMisc.showSearchMenuItem();
    });

    // these are names used by Solr for indexing.
    // They are found in the server's ndexbio-rest/src/main/resources/solr/ndex-networks/conf/schema.xml
    // under the "Collaborator required index fields" comment
    $scope.namesForSolrIndexing = [
        "custom..."
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

    $scope.reservedNames = [
        "name",
        "description",
        "version",
        "reference",
        "ndex:sourceformat",
        "sourceformat"
    ];

    $scope.namesForCustom = [
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

    $scope.customItem = function (item) {
        return item.predicateString == 'custom...';
    };

    $scope.updateFieldFilters = function(filterType){
        editor.viewfilter.state = filterType;
    }

    editor.saveAndSubmitDOI = function(){
        if(editor.errors.length < 1){
            if(editor.checkDOIRequirements()){
                editor.save();


                var saveTheseProperties = {
                    "name": $scope.mainProperty.name,
                    "description": $scope.mainProperty.description,
                    "version": $scope.mainProperty.version,
                    "author": editor.getPropertyValue('author'),
                    "rights": editor.getPropertyValue('rights'),
                    "rightsHolder": editor.getPropertyValue('rightsHolder'),
                    "reference": $scope.mainProperty.reference,
                    "contactEmail": editor.doiInfo.user.email,
                    "pubDate": $('#doiDTPicker').val()
                };

                console.log(saveTheseProperties);
/*
                ndexService.requestDoi(editor.networkExternalId, saveTheseProperties,
                    function() {
                        console.log("request created successfully!");
                    },
                    function(error){
                        editor.errors.push(error)
                    });
*/

            } else {
                editor.errors.push("Missing value")
            }
        }
    };

    editor.save = function() {
        if(editor.checkPublicRequirements()){

            if( $scope.isProcessing )
                return;
            $scope.isProcessing = true;

            var length = editor.propertyValuePairs.length;
            var i = 0;

            // remove all "reserved property" (listed in $scope.reservedNames) attributes from
            // editor.propertyValuePairs, if there are any;
            // also, remove all attributes with no values
            while (i < length){

                if( (editor.propertyValuePairs[i].predicateString &&
                    ($scope.reservedNames.indexOf(editor.propertyValuePairs[i].predicateString.toLowerCase()) != -1)) ||
                    (!editor.propertyValuePairs[i].value) )
                {

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

                if(pair.predicateString === 'rights' && pair.value == "Other")
                    pair.value = pair.rightsOther + " (" + pair.rightsOtherURL + ")";

                delete pair.isReadOnlyLabel;
                delete pair.labelValue;
                delete pair.labelValue;
            }

            var networkProperties = editor.propertyValuePairs.concat(editor.hiddenValuePairs);

            var foundReference = false;
            for (var i=0;i<networkProperties.length;i++){
                if(networkProperties[i].predicateString.toLowerCase() === "reference"){
                    networkProperties[i].value = $scope.mainProperty.reference;
                    foundReference = true;
                    break;
                }
            }

            if(!foundReference){
                if(editor.subNetworkId && $scope.mainProperty.reference && $scope.mainProperty.reference.length > 0){
                    networkProperties.push({"dataType": "string", "predicateString": "reference",
                        "subNetworkId": parseInt(editor.subNetworkId), "value": $scope.mainProperty.reference});
                } else if($scope.mainProperty.reference && $scope.mainProperty.reference.length > 0){
                    networkProperties.push({"dataType": "string", "predicateString": "reference",
                       "value": $scope.mainProperty.reference});
                }
            }

            var networkSummaryProperties = {
                'properties': networkProperties,
                'name': $scope.mainProperty.name,
                'description': $scope.mainProperty.description,
                'version': $scope.mainProperty.version,
                'visibility': $scope.mainProperty.visibility,
                'index': $scope.mainProperty.indexed
            }

            ndexService.setNetworkSummaryV2(networkExternalId, networkSummaryProperties,
                function(data) {
                    //$route.reload();
                    var networkViewPage = sharedProperties.getNetworkViewPage();
                    var networkID = editor.networkExternalId;
                    $location.path(networkViewPage + networkID);
                    $scope.isProcessing = false;

                    if($scope.mainProperty.visibility == "PUBLIC"){
                        ndexService.setNetworkSystemPropertiesV2(networkId, "showcase", editor.showcased.state,
                            function (data, networkId, property, value) {
                                ;
                            },
                            function (error, networkId, property, value) {
                                console.log("unable to change showcase for Network with Id " + networkId);
                            });
                    }

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

            ndexService.setNetworkSystemPropertiesV2(networkId, "index", $scope.mainProperty.indexed,
                function (data, networkId, property, value) {
                    console.log("index set to " + $scope.mainProperty.indexed);
                },
                function (error, networkId, property, value) {
                    console.log("unable to change indexed for Network with Id " + networkId);
                });


    /*
            ndexService.setNetworkPropertiesV2(networkExternalId, networkProperties,
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
    */
        } else {
            console.log("can't make public");
            var title = "Unable to Update Network Access";
            var message = "Unable to make network public. <br /><br /> <strong>Name, Description and Version</strong> fields are all required to make this network Public";
            ndexNavigation.genericInfoModal(title, message);
        }


	};

	editor.checkPublicRequirements = function(){
        if($scope.mainProperty.visibility != "PRIVATE"){
            if (!$scope.mainProperty.name ||
                !$scope.mainProperty.description ||
                !$scope.mainProperty.version ||
                $scope.mainProperty.name.length < 1 ||
                $scope.mainProperty.description.length < 1 ||
                $scope.mainProperty.version.length < 1){
                return false;
            }
        }

        return true;
    };

    editor.checkDOIRequirements = function(){
        if (!$scope.mainProperty.name ||
            !$scope.mainProperty.description ||
            !$scope.mainProperty.version ||
            !editor.getPropertyValue('rights') ||
            !editor.getPropertyValue('rightsHolder') ||
            !editor.getPropertyValue('author') ||
            $scope.mainProperty.name.length < 1 ||
            $scope.mainProperty.description.length < 1 ||
            $scope.mainProperty.version.length < 1 ||
            editor.getPropertyValue('rights').length < 1 ||
            editor.getPropertyValue('rightsHolder').length < 1 ||
            editor.getPropertyValue('author').length < 1)
        {
            return false;
        } else {
            return true;
        }
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

    editor.cancel = function() {
        $location.path("/network/" + editor.networkExternalId);
    }


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

                editor.propertyValuePairs = [];
                editor.hiddenValuePairs = [];
                $scope.mainProperty.name = network.name;
                $scope.mainProperty.indexed = network.indexed;
                if(!$scope.mainProperty.name){
                    $scope.mainProperty.name = "";
                }
                $scope.mainProperty.description = network.description;
                if(!$scope.mainProperty.description){
                    $scope.mainProperty.description = "";
                }
                $scope.mainProperty.reference = network.reference;
                if(!$scope.mainProperty.reference){
                    for(var i=0;i<network.properties.length;i++){
                        if(network.properties[i].predicateString.toLowerCase() === "reference"){
                            $scope.mainProperty.reference = network.properties[i].value;
                            break;
                        }
                    }
                    // Still couldn't find references and references are undefined
                    if(!$scope.mainProperty.reference){
                        $scope.mainProperty.reference = "";
                    }
                }
                $scope.mainProperty.version = network.version;
                if(!$scope.mainProperty.version) {
                    $scope.mainProperty.version = "";
                }
                $scope.mainProperty.visibility = network.visibility;
                if($scope.mainProperty.visibility === "PRIVATE"){
                    if($scope.mainProperty.indexed){
                        editor.visibilityIndex = "PRIVATE";
                    } else {
                        editor.visibilityIndex = "PRIVATE_NOT_INDEXED";
                    }
                    editor.showcased.state = true;
                } else {
                    if($scope.mainProperty.indexed){
                        editor.visibilityIndex = "PUBLIC";
                    } else {
                        editor.visibilityIndex = "PUBLIC_NOT_INDEXED";
                    }
                    editor.showcased.state = network.isShowcase;
                }

                // break network properties into two sets: one set is "hidden", it contains
                // "reserved property names" that every network has (these names are listed in $scope.reservedNames).
                // The hidden properties are not available for modification.  Another set (editor.propertyValuePairs)
                // are properties presented to user for editing.
                var propIndex = 0;
                for(var i=0; i< network.properties.length; i++){
                    if ( network.properties[i].predicateString
                          && ($scope.reservedNames.indexOf(network.properties[i].predicateString.toLowerCase()) === -1)
                          && (network.properties[i].subNetworkId == subNetworkId) )
                    {
                        network.properties[i].labelValue = network.properties[i].predicateString;
                        editor.propertyValuePairs.push(network.properties[i]);
                        editor.propertyValuePairsIndex[network.properties[i].predicateString] = propIndex;
                        propIndex++;
                    } else {
                        editor.hiddenValuePairs.push(network.properties[i]);
                    }
                }


                if (editor.propertyValuePairs.length > 1) {
                    editor.propertyValuePairs = _.sortBy(editor.propertyValuePairs, 'predicateString');
                }

                var arrayLength = editor.propertyValuePairs.length;
                var i = 0;

                while ( i < arrayLength ) {
                    editor.propertyValuePairs[i].isReadOnlyLabel = true;

                    if($scope.namesForSolrIndexing.indexOf(editor.propertyValuePairs[i].predicateString) == -1){
                        //$scope.namesForSolrIndexing.push(editor.propertyValuePairs[i].predicateString);
                    } else {
                        var dropdownIndex = $scope.namesForSolrIndexing.indexOf(editor.propertyValuePairs[i].predicateString);
                        $scope.namesForSolrIndexing.splice(dropdownIndex, 1);
                    }
                    i = i + 1;

                    //==============================================================
                    // CHECK IF RIGHTS PROPERTY IS IN THE DROPDOWN.  IF NOT ADD IT
                    //==============================================================
                    if(editor.propertyValuePairs[i] && editor.propertyValuePairs[i].predicateString == "rights"){
                        if(editor.rights.indexOf(editor.propertyValuePairs[i].value) < 0){
                            editor.rights.push(editor.propertyValuePairs[i].value);
                        }
                    }
                }


                if($scope.namesForSolrIndexing.indexOf("custom...") > -1) {
                    $scope.namesForSolrIndexing.splice($scope.namesForSolrIndexing.indexOf("custom..."))
                }
                $scope.namesForSolrIndexing.push("custom...");



                for (var label in editor.propertyTemplate) {
                    // skip loop if the property is from prototype
                    if(editor.propertyTemplate.hasOwnProperty(label)){
                        var foundKey = false;
                        for(var i=0; i< editor.propertyValuePairs.length; i++) {
                            if(editor.propertyValuePairs[i].predicateString === label){
                                foundKey = true;
                                break;
                            }
                        }

                        if(!foundKey){
                            editor.propertyValuePairs.push(editor.propertyTemplate[label]);
                            editor.propertyValuePairsIndex[label] = propIndex;
                            propIndex++;
                        }

                    }
                }


                editor.propertyValuePairs.push({dataType: "string", predicateString: "", value: "", subNetworkId: subNetworkId});

                editor.disableSaveChangesButton = editor.checkIfFormIsValidOnLoad();
                var networkOwnerUUID = network.ownerUUID;
                var loggedInUserUUID = sharedProperties.getCurrentUserId();
                editor.isOwner = (networkOwnerUUID == loggedInUserUUID);
                var me = "";

                if($routeParams.doi){
                    editor.viewfilter.state = "DOI"
                } else {
                    editor.viewfilter.state = "MAIN"
                }

            }
        )
        .error(
            function(error) {
                editor.errors.push(error)
            }
        )
        .then(
            ndexService.getUserByUserNameV2(editor.doiInfo.user.username,
                function(data) {
                    var userId = (data && data.externalId) ? data.externalId : null;
                    if (userId) {
                        editor.doiInfo.user.email = data.emailAddress;
                    }
                    else {
                        forgot.errorMsg = "Unable to get User Id for user " + $scope.forgot.accountName +
                            " and request password reset."
                    }
                },
                function(error){
                    editor.errors.push(error)
                })
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

/*
    ndexService.getNetworkSummaryV2(networkExternalId)
        .success(
            function (network) {
                editor.currentNetwork = network;
            }
        )
        .error(
            function (error) {
                displayErrorMessage(error);
            }
        );
*/

    editor.showNameSpaces = (editor.namespaces.length > 0) ? true : false;

    $scope.setToolTips = function(){
        var myToolTips = $('[data-toggle="tooltip"]');

        myToolTips.tooltip();
    };

    editor.getPropertyValue = function(propName){
        //editor.propertyValuePairs[editor.propertyValuePairsIndex['rights']].value

        for(var i=0; i<editor.propertyValuePairs.length; i++){
            if(editor.propertyValuePairs[i].predicateString === propName){
                return editor.propertyValuePairs[i].value;
            }
        }

        return null;
    }

}]);