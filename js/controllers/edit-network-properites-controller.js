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

	editor.networkExternalId = networkExternalId;

	editor.changed = function(index) {
		if(index == (editor.propertyValuePairs.length - 1))
			editor.propertyValuePairs.push({});

	}

	editor.save = function() {
		editor.propertyValuePairs.splice(editor.propertyValuePairs.length - 1, 1);

		ndexService.setNetworkProperties(networkExternalId, editor.propertyValuePairs,
			function(data) {
				$route.reload();
			},
			function(error) {
				console.log(error)
			})
	}

    editor.existingTerms = [
        'term1',
        'term2',
        'term3'
    ]


    editor.ontologies = [
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
    	},
    	{
    		uri: 'test.com',
    		prefix: 'test'
    	}
    ]



    //				API initializations
    //------------------------------------------------------------------------------------
    ndexService.getNetwork(networkExternalId)
        .success(
            function(network) {
               editor.propertyValuePairs = network.properties;
               editor.propertyValuePairs.push({});
               editor.networkName = network.name;
            }
        )
        .error(
            function(error) {
                // TODO
            }
        );

}]);