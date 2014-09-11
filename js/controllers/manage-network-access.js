ndexApp.controller('manageNetworkAccessController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams', '$q',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams, $q) {

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
		// create a promise from the $q service
		var deferred = $q.defer(); // save the instance to use the deferred API to resolve the promise
		var promise = deferred.promise; // used to create a dynamic sequentail call of following api

		var length = networkManager.update.length;
		for(var ii=0; ii<length; ii++) {
			 // use closure to capture current value in the scope of the promise
			(function(m) {
			//update reference to last promise in promise chaing
				promise = promise.then(
					function(success) {
						// return the promise, once resolved, its value will be passed to next promise, we dont use it
						return ndexService.updateNetworkMember(m).$promise
					});
			})(networkManager.update[ii]);
		}


		var length2 = networkManager.remove.length;
		for(var ii=0; ii<length2; ii++){
			
			(function(u) {
				promise = promise.then(
					function(success){
						console.log(membership)
						return ndexService.removeNetworkMember(identifier, uuid).$promise
					});	
			})(networkManager.remove[ii].memberUUID);
		}

		// last thing to do once chain of calls is completed
		promise.then(
			function(success) {
				networkManager.loadMemberships();
			},
			function(error) {
				networkManager.errors.push(error.data);
			});

		// fire the promise chain
		deferred.resolve('resolve this promise and set off the promise chain')
	};


	networkManager.loadMemberships = function() {
		networkManager.update = [];
		networkManager.remove = [];
		ndexService.getNetworkMemberships(identifier, 'ALL',
			function(memberships) {
				networkManager.memberships = memberships;
			},
			function(error) {
				networkManager.errors.push(error.data);
			})
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

	networkManager.findGroups = function() {
		var query = {};
		query.searchString = networkManager.groupSearchString;

		ndexService.searchGroups(query, 0, 10,
			function(groups) {

				networkManager.newGroups = groups;

				var length2 = groups.length;
				var length = networkManager.memberships.length
				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if(networkManager.memberships[ii].memberAccountName == groups[jj].accountName) 
							groups[jj].member = true;
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
			resourceName: networkManager.network.name,
			resourceUUID: networkManager.network.externalId,
			permissions: 'WRITE'
		}

		// using this for groups as well, didnt expect it to work. should have own check for group->network using group api call
		ndexService.getDirectMembership(networkManager.network.externalId, member.externalId).$promise.then(
			function(membership) {
				if(membership != null && membership.permissions !=null)
					networkManager.errors.push('User already has access to this network');
				else
					return ndexService.updateNetworkMember(newMembership).$promise
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

    ndexService.getNetwork(identifier)
    	.success(
    	function(network){
    		networkManager.network = network;
    	})
    	.error(
    	function(error){
    		networkManager.errors.push(error.data);
    	})

    ndexService.getMyMembership(identifier,
    	function(membership) {
    		if(membership != null) {
    			if(membership.permission == 'ADMIN')
    				networkManager.isAdmin = true;
    		}
    	},
    	function(error) {
    		networkManager.errors.push(error.data)
    	})

    networkManager.loadMemberships();

}]);