ndexApp.controller('editNetworkPropertiesController', 
	['$scope', '$routeParams', '$route', 'ndexService', 
		function($scope, $routeParams, $route, ndexService){
	 //testing

	//              Process the URL to get application state
    //-----------------------------------------------------------------------------------
    var networkExternalId = $routeParams.identifier;

    //              CONTROLLER INTIALIZATIONS
    //------------------------------------------------------------------------------------

	$scope.editor = {};
	var editor = $scope.editor;
	editor.propertyValuePairs = [];
	editor.networkExternalId = networkExternalId;

	editor.changed = function(index) {
		if(index == (editor.propertyValuePairs.length - 1))
			editor.propertyValuePairs.push({predicatePrefix: 'none', valuePrefix: 'none'});

	}

	editor.save = function() {
		editor.propertyValuePairs.splice(editor.propertyValuePairs.length - 1, 1);

		var length = editor.propertyValuePairs.length;
		for(var ii=0; ii<length; ii++){
			var pair = editor.propertyValuePairs[ii];
			if(pair.predicatePrefix != 'none')
				pair.predicateString = pair.predicatePrefix+':'+pair.predicateString

			if(pair.valuePrefix != 'none')
				pair.value = pair.valuePrefix+':'+pair.value;
		}

		ndexService.setNetworkProperties(networkExternalId, editor.propertyValuePairs,
			function(data) {
				$route.reload();
			},
			function(error) {
				console.log(error)
			})
	}

	editor.removeOntology = function(index) {
		editor.ontologies.splice(index,1);
		//TODO api call
	}

	editor.addOntology = function() {
		//api call
		//add to array
	}

	editor.setURI = function(item, mode, label) {
		editor.newURI = item.uri;
	}

    editor.ontologies = [
    	{
    		uri: 'test.com',
    		prefix: 'GO'
    	},
    	{
    		uri: 'test.com',
    		prefix: 'test'
    	},
    	{
    		uri: 'test.com',
    		prefix: 'test'
    	},
    	{
    		uri: 'test.com',
    		prefix: 'test'
    	},
    	{
    		uri: 'test.com',
    		prefix: 'test'
    	}
    ]

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
    ]

    //				API initializations
    //------------------------------------------------------------------------------------
    ndexService.getNetwork(networkExternalId)
        .success(
            function(network) {
                editor.propertyValuePairs = network.properties;

                var length = editor.propertyValuePairs.length;
                for(var ii=0; ii<length; ii++) {
                	var pair = editor.propertyValuePairs[ii];

                	var arr = pair.predicateString.split(':');
                	if(arr.length > 1) {
                		pair.predicateString = arr[1];
                		pair.predicatePrefix = arr[0]
                	}
                	else {
	                	pair.predicatePrefix = 'none';
	                }

                	var arr = pair.value.split(':');
                	if(arr.length > 1) {
                		pair.value = arr[1];
                		pair.valuePrefix = arr[0]
                	}
                	else {
	                	pair.valuePrefix = 'none';
	                }
                }

                editor.propertyValuePairs.push({predicatePrefix: 'none', valuePrefix: 'none'});
                // todo add local to list
                editor.networkName = network.name;
            }
        )
        .error(
            function(error) {
                // TODO
            }
        );

}]);