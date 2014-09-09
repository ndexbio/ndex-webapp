ndexApp.controller('manageNetworkAccessController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams) {

    //              Process the URL to get application state
    //-----------------------------------------------------------------------------------
    var identifier = $routeParams.identifier;


    //              CONTROLLER DECLARATIONS/INTIALIZATIONS
    //------------------------------------------------------------------------------------

    $scope.networkManager = {};
    var networkManager = $scope.networkManager;

    networkManager.errors = [];
    networkManager.isAdmin = false;
    networkManager.externalId = identifier;
	networkManager.memberships = [];
	networkManager.update = [];
	networkManager.remove = [];
	networkManager.newUsers = {};

	networkManager.save = function() {
		var length = networkManager.update.length;
		for(var ii=0; ii<length; ii++) {
			/*ndexService.updateGroupMember(networkManager.update[ii],
				function(membership) {
					//TODO
				},
				function(error) {
					networkManager.errors.push(error.data);
				})*/
		}

		var length2 = networkManager.remove.length;
		for(var ii=0; ii<length2; ii++){
			/*ndexService.removeGroupMember(identifier, networkManager.remove[ii].memberUUID,
				function(success){

				},
				function(error){
					networkManager.errors.push(error.data);
				})*/
		}

	};


	networkManager.loadMemberships = function() {
		networkManager.update = [];
		networkManager.remove = [];
		/*ndexService.getGroupMemberships(identifier, 'ALL',
			function(memberships) {
				networkManager.memberships = memberships;
			},
			function(error) {
				networkManager.errors.push(error.data);
			})*/
	}; 	


	networkManager.findUsers = function() {
		var query = {};
		query.searchString = networkManager.searchString;

		ndexService.searchUsers(query, 0, 10,
			function(users) {

				networkManager.newUsers = users;

				var length2 = users.length;
				var length = networkManager.memberships.length
				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if(networkManager.memberships[ii].memberAccountName == users[jj].accountName) 
							users[jj].member = true;
					}
				}
			},
			function(error) {
				networkManager.errors.push(error.data)
			});
	};

	networkManager.addMember = function(member) {
		var newMembership = {
			memberAccountName: member.accountName,
			memberUUID: member.externalId,
			resourceName: networkManager.group.accountName,
			resourceUUID: networkManager.group.externalId,
			permissions: 'MEMBER'
		}

		ndexService.getDirectMembership(networkManager.group.externalId, member.externalId).$promise.then(
			function(membership) {
				console.log(membership)
				if(membership != null && membership.permissions !=null)
					networkManager.errors.push('User already member in this group');
				else
					return ndexService.updateGroupMember(newMembership).$promise
			}).then(
			function(success) {
				member.member = true;
				networkManager.loadMemberships();
			},
			function(error) {
				networkManager.errors.push(error.data);
			});
	}


	//              INTIALIZATIONS
    //------------------------------------------------------------------------------------

    /*ndexService.getGroup(identifier,
    	function(group){
    		networkManager.group = group;
    	},
    	function(error){
    		networkManager.errors.push(error.data);
    	})

    ndexService.getMyMembership(identifier,
    	function(membership) {
    		if(membership != null) {
    			if(membership.permission == 'GROUPADMIN')
    				networkManager.isAdmin = true;
    		}
    	},
    	function(error) {
    		networkManager.errors.push(error.data)
    	})

    networkManager.loadMemberships();*/

}]);