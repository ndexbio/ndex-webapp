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
	networkManager.newUsers = {};
	networkManager.newGroups = {};

	networkManager.selectedAccountsForUpdatingAccessPermissions = [];
	networkManager.originalAccessPermissions = [];

	networkManager.accessWasRemoved = function(accessObj) {

		if ((typeof(accessObj) === 'undefined') ||
			(typeof(accessObj.memberUUID) === 'undefined')) {
			return false;
		}

		for (var i = 0; i < networkManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {

			if (accessObj.memberUUID ===
				networkManager.selectedAccountsForUpdatingAccessPermissions[i].memberUUID) {
				return false;
			}
		}

		return true;
	}

	networkManager.accessWasAdded = function(accessObj) {

		if ((typeof(accessObj) === 'undefined') ||
			(typeof(accessObj.memberUUID) === 'undefined')) {
			return false;
		}

		for (var i = 0; i < networkManager.originalAccessPermissions.length; i++) {

			if (accessObj.memberUUID ===
				networkManager.originalAccessPermissions[i].memberUUID) {
				return false;
			}
		}

		return true;
	}


	networkManager.accessWasModified = function(accessObj) {

		if ((typeof(accessObj) === 'undefined') ||
			(typeof(accessObj.memberUUID) === 'undefined')) {
			return false;
		}

		for (var i = 0; i < networkManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {

			if ((accessObj.memberUUID ===
				networkManager.selectedAccountsForUpdatingAccessPermissions[i].memberUUID) &&
				(accessObj.permissions.toLowerCase() !==
				 networkManager.selectedAccountsForUpdatingAccessPermissions[i].permissions.toLowerCase())) {
				return true;
			}
		}

		return false;
	}


	networkManager.save = function() {

		if (!networkManager.changesWereMade()) {
			// theoretically, this "if" should never execute since if no changes were made, then
			// the "Save Changes" button is unavailable on the Manage Access page and
			// this function cannot be called since it is invoked by clicking the "Save Changes" button
			$scope.isProcessing = false;
			$location.path("network/"+ $scope.networkManager.externalId);
			return;
		}

		if( $scope.isProcessing )
			return;
		$scope.isProcessing = false;




		var addedAccessObjects = [];

		for (var i = 0; i < networkManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {
			var accessObj = networkManager.selectedAccountsForUpdatingAccessPermissions[i];

			if (networkManager.accessWasAdded(accessObj)) {
				// remember index of the added element
				addedAccessObjects.push(i);

				var newMembership = {
					memberUUID: accessObj.memberUUID,
					resourceUUID: accessObj.resourceUUID,
					permissions: accessObj.permissions
				}

				var addedMembership = JSON.parse(JSON.stringify(newMembership));

				ndexService.updateNetworkMember(addedMembership,
					function(data) {},
					function(error) {}
				)
			}
		}

		// remove added objects from networkManager.selectedAccountsForUpdatingAccessPermissions
		for (var i = addedAccessObjects.length-1; i >= 0; i--) {
			networkManager.selectedAccountsForUpdatingAccessPermissions.splice(addedAccessObjects[i], 1);
		}




		var deletedAccessObjects = [];

		for (var i = 0; i < networkManager.originalAccessPermissions.length; i++) {
			var accessObj = networkManager.originalAccessPermissions[i];

			if (networkManager.accessWasRemoved(accessObj)) {
				// remember index of the deleted element
				deletedAccessObjects.push(i);

				var networkId = accessObj.resourceUUID;
				var memberId = accessObj.memberUUID;

				ndexService.removeNetworkMember(networkId, memberId,
					function(data) {},
					function(error) {}
				)
			}
		}

		if (deletedAccessObjects.length > 0) {
			// remove deleted access objects from networkManager.originalAccessPermissions
			for (var i = deletedAccessObjects.length-1; i >= 0; i--) {
				networkManager.originalAccessPermissions.splice(deletedAccessObjects[i], 1);
			}
		}




		var modifiedAccessObjects = [];

		for (var i = 0; i < networkManager.originalAccessPermissions.length; i++) {
			var accessObj = networkManager.originalAccessPermissions[i];

			if (networkManager.accessWasModified(accessObj)) {
				// remember index of the modified element
				modifiedAccessObjects.push(i);

				var newMembership = {
					memberUUID: accessObj.memberUUID,
					resourceUUID: accessObj.resourceUUID,
					permissions: networkManager.selectedAccountsForUpdatingAccessPermissions[i].permissions
				}

				var modifiedMembership = JSON.parse(JSON.stringify(newMembership));

				ndexService.updateNetworkMember(modifiedMembership,
					function(data) {},
					function(error) {}
				)
			}
		}

		$location.path("network/"+ $scope.networkManager.externalId);
		$scope.isProcessing = false;

	};


	networkManager.loadMemberships = function() {
		ndexService.getNetworkMemberships(identifier, 'ALL',
			function(memberships) {
				networkManager.memberships = memberships;

				networkManager.processReceivedAccessPermissions(memberships);
			},
			function(error) {
				networkManager.errors.push(error.data);
			})
	};

	networkManager.processReceivedAccessPermissions = function(memberships) {
		networkManager.originalAccessPermissions = [];

		var accountsIds = [];

		// build array of accounts IDs
		for (var i = 0; i < memberships.length; i++) {

			var membership = memberships[i];

			accountsIds.push(membership.memberUUID);
		}

		// get accounts info; we need to know what accounts are user and
		// and what accounts are group accounts;  we display First and Last Names for User accounts
		//and Group Account Name for group accounts
		ndexService.getAccountsByUUIDs(accountsIds,
			function(accountsInfo) {

				for (var i = 0; i < memberships.length; i++) {

					var membership = memberships[i];

					var newMembership = {
						memberAccountName: membership.memberAccountName,
						memberUUID: membership.memberUUID,
						resourceName: membership.resourceName,
						resourceUUID: membership.resourceUUID,
						permissions: membership.permissions,
						firstName: "",
						lastName: "",
						groupName: "",
						accountType: "",
						member: true
					}

					networkManager.getNamesAndAccountType(accountsInfo, newMembership);

					networkManager.originalAccessPermissions.push(newMembership);

					networkManager.selectedAccountsForUpdatingAccessPermissions.push(JSON.parse(JSON.stringify(newMembership)));
				}
			},
			function(error) {

			});
	};

	networkManager.getNamesAndAccountType = function(accountsInfo, newMembership) {

		var accountUUID = newMembership.memberUUID;

		for (var i = 0; i < accountsInfo.length; i++) {
			if (accountUUID === accountsInfo[i].externalId) {
				if (accountsInfo[i].accountType.toLowerCase() === "user") {
					newMembership.firstName = accountsInfo[i].firstName;
					newMembership.lastName = accountsInfo[i].lastName;
					newMembership.accountType = accountsInfo[i].accountType;

				} else if (accountsInfo[i].accountType.toLowerCase() === "group") {
					newMembership.groupName = accountsInfo[i].groupName;
					newMembership.accountType = accountsInfo[i].accountType;
				}
				break;
			}
		}
		return;
	}

	networkManager.findUsers = function() {
		var query = {};
		query.searchString = networkManager.searchString;

		ndexService.searchUsers(query, 0, 10,
			function(users) {

				networkManager.newUsers = users;

				var length2 = users.length;
				var length = networkManager.selectedAccountsForUpdatingAccessPermissions.length
				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if(networkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID == users[jj].externalId)
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
				var length = networkManager.selectedAccountsForUpdatingAccessPermissions.length
				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if(networkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID == groups[jj].externalId)
							groups[jj].member = true;
					}
				}
			},
			function(error) {
				networkManager.errors.push(error.data)
			});
	};


	networkManager.discardChanges = function() {

		if (!networkManager.changesWereMade()) {
			// no changes to the list of accounts with permissions were made;
			// no action is required
			return;
		}

		// to discard all the changes, we need to empty the list of selectedAccountsForUpdatingAccessPermissions and
		// repopulate it with the values from originalAccessPermissions

		for (var i = 0; i < networkManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {
			var accountToRemove = networkManager.selectedAccountsForUpdatingAccessPermissions[i];

			if ((accountToRemove.accountType.toLowerCase() === 'user') &&
				(typeof(networkManager.newUsers) !== 'undefined')) {
			    for (var j = 0; j < networkManager.newUsers.length; j++) {
				    if (networkManager.newUsers[j].externalId === accountToRemove.memberUUID) {
					    networkManager.newUsers[j].member = false;
				    }
				}
			} else if ((accountToRemove.accountType.toLowerCase() === 'group') &&
				       (typeof(networkManager.newGroups) !== 'undefined')) {
				for (var j = 0; j < networkManager.newGroups.length; j++) {
					if (networkManager.newGroups[j].externalId === accountToRemove.memberUUID) {
						networkManager.newGroups[j].member = false;
					}
				}
			}
		}

		networkManager.selectedAccountsForUpdatingAccessPermissions = [];

		for (var i = 0; i < networkManager.originalAccessPermissions.length; i++) {
			var originalAccessPerm = networkManager.originalAccessPermissions[i];
			networkManager.selectedAccountsForUpdatingAccessPermissions.push(JSON.parse(JSON.stringify(originalAccessPerm)));

			if (typeof(networkManager.newUsers) !== 'undefined') {
				for (var j = 0; j < networkManager.newUsers.length; j++) {
					if (networkManager.newUsers[j].externalId === originalAccessPerm.memberUUID) {
						networkManager.newUsers[j].member = true;
					}
				}
			}
			if (typeof(networkManager.newGroups) !== 'undefined') {
				for (var j = 0; j < networkManager.newGroups.length; j++) {
					if (networkManager.newGroups[j].externalId === originalAccessPerm.memberUUID) {
						networkManager.newGroups[j].member = true;
					}
				}
			}
		}
	};

	networkManager.removeMember = function(index, memberToRemove) {
		networkManager.selectedAccountsForUpdatingAccessPermissions.splice(index, 1);

		if (typeof(networkManager.newUsers) !== 'undefined') {
			for (var i = 0; i < networkManager.newUsers.length; i++) {
				if (networkManager.newUsers[i].externalId === memberToRemove.memberUUID) {
					networkManager.newUsers[i].member = false;
				}
			}
		}
		if (typeof(networkManager.newGroups) !== 'undefined') {
		    for (var i = 0; i < networkManager.newGroups.length; i++) {
				if (networkManager.newGroups[i].externalId === memberToRemove.memberUUID) {
					networkManager.newGroups[i].member = false;
				}
			}
		}
	};

	networkManager.addMember = function(member) {
		var newMembership = {
			memberAccountName: networkManager.getAccountName(member),
			memberUUID: member.externalId,
			resourceName: networkManager.network.name,
			resourceUUID: networkManager.network.externalId,
			permissions: 'READ',
			firstName: ((typeof(member.firstName) === 'undefined') ? "" : member.firstName),
			lastName: ((typeof(member.lastName) === 'undefined') ? "" : member.lastName),
			groupName: ((typeof(member.groupName) === 'undefined') ? "" : member.groupName),
			accountType: member.accountType,
			member: true
		}

		member.member = true;

		networkManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership);
	};

	networkManager.changesWereMade = function() {

		if (networkManager.selectedAccountsForUpdatingAccessPermissions.length !=
			networkManager.originalAccessPermissions.length) {
			return true;
		}

		for (var i = 0; i < networkManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {

			var selectedObj = networkManager.selectedAccountsForUpdatingAccessPermissions[i];
			var found = false;

			for (var j = 0; j < networkManager.originalAccessPermissions.length; j++) {
				var originalObj = networkManager.originalAccessPermissions[j];

				if (selectedObj.memberUUID === originalObj.memberUUID) {
					if (selectedObj.permissions.toUpperCase() === originalObj.permissions.toUpperCase()) {
						found = true;
						break;
					}
					else {
						return true;
					}
				}
			}
			if (!found) {
				return true;
			}
		}

		return false;
	};

	networkManager.getAccountName = function(user) {
		if (typeof(user) === 'undefined') {
			return 'undefined';
		}

		if ((typeof(user.accountName) !== 'undefined') && (user.accountName === 'ndexadministrator')) {
			return user.accountName;
		}

		if ((typeof(user.memberAccountName) !== 'undefined') && (user.memberAccountName === 'ndexadministrator')) {
			return user.memberAccountName;
		}

		if (user.accountType == 'User') {
			return user.firstName + " " + user.lastName;
		}

		if (user.accountType == 'Group') {
			return user.groupName;
		}

		return "unknown account type";
	};

	networkManager.checkIfUserAccount = function(member) {

		if (member && member.accountType) {
			return (member.accountType.toLowerCase() === 'user') ? true : false;
		}

		return false;
	};




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