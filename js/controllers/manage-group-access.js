ndexApp.controller('manageGroupAccessController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams', '$q',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams, $q) {

    //              Process the URL to get application state
    //-----------------------------------------------------------------------------------
    var identifier = $routeParams.identifier;


    //              CONTROLLER DECLARATIONS/INTIALIZATIONS
    //------------------------------------------------------------------------------------

    $scope.groupManager = {};
    var groupManager = $scope.groupManager;

    groupManager.errors = [];
    groupManager.isAdmin = false;
    groupManager.externalId = identifier;
	groupManager.memberships = [];
	groupManager.update = [];
	groupManager.remove = [];
	groupManager.newUsers = {};

	groupManager.save = function() {
		if( $scope.isProcessing )
			return;
		$scope.isProcessing = true;
		//check out network version for info on promise implementation

		var deferred = $q.defer();
		var promise = deferred.promise;

		var length = groupManager.update.length;
		for(var ii=0; ii<length; ii++) {
			(function(m) {
				promise = promise.then(
					function(success) {
						return ndexService.updateGroupMember(m).$promise;
					});
			})(groupManager.update[ii])
		}

		var length2 = groupManager.remove.length;
		for(var ii=0; ii<length2; ii++){
			(function(u) {
				promise = promise.then(
					function(success) {
						return ndexService.removeGroupMember(identifier, u).$promise;
					});
			})(groupManager.remove[ii].memberUUID);
		}

		promise.then(
			function(success){
				groupManager.loadMemberships();
			},
			function(error) {
				groupManager.errors.push(error.data);
			});
		
		deferred.resolve('trigger the chain');
		$location.path("group/"+$scope.groupManager.externalId);
		$scope.isProcessing = false;
	};


	groupManager.loadMemberships = function() {
		groupManager.update = [];
		groupManager.remove = [];
		ndexService.getGroupMemberships(identifier, 'ALL',
			function(memberships) {
				groupManager.memberships = memberships;
			},
			function(error) {
				groupManager.errors.push(error.data);
			})
	}; 	


	groupManager.findUsers = function() {
		var query = {};
		query.searchString = groupManager.searchString;

		ndexService.searchUsers(query, 0, 10,
			function(users) {

				groupManager.newUsers = users;

				var length2 = users.length;
				var length = groupManager.memberships.length
				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if(groupManager.memberships[ii].memberAccountName == users[jj].accountName) 
							users[jj].member = true;
					}
				}
			},
			function(error) {
				groupManager.errors.push(error.data)
			});
	}

	groupManager.addMember = function(member) {
		var newMembership = {
			memberAccountName: member.accountName,
			memberUUID: member.externalId,
			resourceName: groupManager.group.accountName,
			resourceUUID: groupManager.group.externalId,
			permissions: 'MEMBER'
		}

		ndexService.getDirectMembership(groupManager.group.externalId, member.externalId).$promise.then(
			function(membership) {
				//console.log(membership)
				if(membership != null && membership.permissions !=null)
					groupManager.errors.push('User already member in this group');
				else
					return ndexService.updateGroupMember(newMembership).$promise
			}).then(
			function(success) {
				member.member = true;
				groupManager.loadMemberships();
			},
			function(error) {
				groupManager.errors.push(error.data);
			});
	}


	//              INTIALIZATIONS
    //------------------------------------------------------------------------------------

    ndexService.getGroup(identifier,
    	function(group){
    		groupManager.group = group;
    	},
    	function(error){
    		groupManager.errors.push(error.data);
    	})

    ndexService.getMyMembership(identifier,
    	function(membership) {
    		if(membership != null) {
    			if(membership.permission == 'GROUPADMIN')
    				groupManager.isAdmin = true;
    		}
    	},
    	function(error) {
    		groupManager.errors.push(error.data)
    	})

    groupManager.loadMemberships();

}]);