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
	networkManager.networkUserMemberships = [];
	networkManager.networkGroupMemberships = [];
	networkManager.newUsers = {};
	networkManager.newGroups = {};

	networkManager.selectedAccountsForUpdatingAccessPermissions = [];
	networkManager.originalAccessPermissions = [];

	networkManager.mapOfGroupPermissions = {};

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

	var updateNetworkMembership = function(newMembership) {
		if (newMembership.accountType == "user") {

			ndexService.updateNetworkUserMembership(
				newMembership.memberUUID,
				newMembership.resourceUUID,
				newMembership.permissions,
					function(success){
						; // do nothing
					},
					function(error){
						console.log("unable to update network user membership for Network=" + newMembership.resourceUUID +
							" user=" + newMembership.memberUUID + " permission=" + newMembership.permissions );
					})


		} else if (newMembership.accountType == "group") {

			// updateNetworkGroupMembership
			ndexService.updateNetworkGroupMembership(
				newMembership.memberUUID,
				newMembership.resourceUUID,
				newMembership.permissions,
					function(success){
						; // do nothing
					},
					function(error){
						console.log("unable to update network group membership for Network=" + newMembership.resourceUUID +
							" group=" + newMembership.memberUUID + " permission=" + newMembership.permissions );
					})	
		}
	}

	var deleteNetworkMembership = function(membershipObj) {
		if (membershipObj.accountType == "user") {

			ndexService.deleteNetworkUserMembership(membershipObj.resourceUUID, membershipObj.memberUUID,
				function(data) {
					// successs
				},
				function(error) {
					console.log("unable to delete network user membership");
				});

		} else if (membershipObj.accountType == "group") {

			ndexService.deleteNetworkGroupMembership(membershipObj.resourceUUID, membershipObj.memberUUID,
				function(data) {
					// successs
				},
				function(error) {
					console.log("unable to delete network group membership");
				});
		}
	}

	networkManager.save = function() {

		if (!networkManager.changesWereMade()) {
			// theoretically, this "if" should never execute since if no changes were made, then
			// the "Save Changes" button is unavailable on the Manage Access page and
			// this function cannot be called since it is invoked by clicking the "Save Changes" button
			$scope.isProcessing = false;
			$location.path("newNetwork/"+ $scope.networkManager.externalId);
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
					permissions: networkManager.selectedAccountsForUpdatingAccessPermissions[i].permissions,
					accountType: accessObj.accountType.toLowerCase()
				}

				updateNetworkMembership(newMembership);
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

				deleteNetworkMembership(accessObj);
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
					permissions: networkManager.selectedAccountsForUpdatingAccessPermissions[i].permissions,
					accountType: accessObj.accountType.toLowerCase()
				}

				updateNetworkMembership(newMembership);
			}
		}

		$location.path("newNetwork/"+ $scope.networkManager.externalId);
		$scope.isProcessing = false;

	};


	networkManager.loadMemberships = function() {
		
		ndexService.getNetworkUserMemberships(identifier, 'ALL',
			function(networkUserMemberships) {
				networkManager.networkUserMemberships = networkUserMemberships;
				networkManager.processUserAccessPermissions();


				// networkManager.networkGroupMemberships = networkGroupMemberships;

				ndexService.getAllGroupsPermissionsOnNetwork(networkManager.externalId, "group", 0, 1000000)
					.success(
						function (mapOfGroupPermissions) {

							var groupsUUIDs = Object.keys(mapOfGroupPermissions);
							networkManager.mapOfGroupPermissions = mapOfGroupPermissions;

							ndexService.getGroupsByUUIDs(groupsUUIDs)
								.success(
									function (groupList) {
										networkManager.networkGroupMemberships = groupList;
										networkManager.processGroupAccessPermissions();
									})
								.error(
									function(error) {
										console.log("unable to get groups by UUIDs");
									}
								)
						})
					.error(
						function (error, data) {
							console.log("unable to get group permissions on network");
						});

			},
			function(error) {
				networkManager.errors.push(error.data);
			})
	};

	networkManager.processGroupAccessPermissions = function() {

		var groupAccountIds = [];

		for (var i = 0; i < networkManager.networkGroupMemberships.length; i++) {
			var membership = networkManager.networkGroupMemberships[i];
			groupAccountIds.push(membership.externalId);
		}

		// get accounts info; we need to know what accounts are user and
		// and what accounts are group accounts;  we display First and Last Names for User accounts
		// and Group Account Name for group accounts

		for (var i = 0; i < networkManager.networkGroupMemberships.length; i++) {
			var group = networkManager.networkGroupMemberships[i];

			var newMembership = {

				memberUUID: group.externalId,
				groupName: group.groupName,
				resourceUUID: networkManager.externalId,
				permissions: networkManager.mapOfGroupPermissions[group.externalId],
				accountType: "group",
				member: true
			}

			networkManager.originalAccessPermissions.push(newMembership);
			networkManager.selectedAccountsForUpdatingAccessPermissions.push(JSON.parse(JSON.stringify(newMembership)));
		}
	}

	networkManager.processUserAccessPermissions = function() {
		networkManager.originalAccessPermissions = [];

		var userAccountIds = [];

		// build array of accounts IDs
		for (var i = 0; i < networkManager.networkUserMemberships.length; i++) {
			var membership = networkManager.networkUserMemberships[i];
			userAccountIds.push(membership.memberUUID);
		}

		if (userAccountIds.length > 0) {
			ndexService.getUsersByUUIDs(userAccountIds)
				.success(
					function (accountsInfo) {

						for (var i = 0; i < networkManager.networkUserMemberships.length; i++) {
							var user = networkManager.networkUserMemberships[i];

							var newMembership = {

								memberAccountName: user.memberAccountName,
								memberUUID: user.memberUUID,
								resourceName: user.resourceName,
								resourceUUID: user.resourceUUID,
								permissions: user.permissions,
								firstName: "",
								lastName: "",
								accountType: "user",
								member: true
							}

							networkManager.getUserAccountNames(accountsInfo, newMembership);
						 	networkManager.originalAccessPermissions.push(newMembership);
						 	networkManager.selectedAccountsForUpdatingAccessPermissions.push(JSON.parse(JSON.stringify(newMembership)));
						 }
					}
				)
				.error(
					function (error) {
						console.log("unable to get users by UUIDs");
					}
				);
		}

	};

	networkManager.getUserAccountNames = function(accountsInfo, newMembership) {

		var accountUUID = newMembership.memberUUID;

		for (var i = 0; i < accountsInfo.length; i++)
		{
			if (accountUUID === accountsInfo[i].externalId)
			{
				newMembership.firstName = accountsInfo[i].firstName;
				newMembership.lastName = accountsInfo[i].lastName;
				break;
			}
		}
		return;
	}

	networkManager.getGroupPermissions = function(accountsInfo, newMembership) {

		var accountUUID = newMembership.memberUUID;

		for (var i = 0; i < accountsInfo.length; i++)
		{
			if (accountUUID === accountsInfo[i].externalId)
			{
				newMembership.groupName = accountsInfo[i].groupName;
				break;
			}
		}
		return;
	}

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

				networkManager.newUsers = users.resultList;

				var length2 = users.numFound;
				var length = networkManager.selectedAccountsForUpdatingAccessPermissions.length
				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if(networkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID == users.resultList[jj].externalId)
							users.resultList[jj].member = true;
					}
				}
			},
			function(error) {
				networkManager.errors.push(error.data)
			});
	};

	networkManager.findGroups = function() {

		ndexService.searchGroups(networkManager.groupSearchString, 0, 10,
			function(groups) {

				networkManager.newGroups = groups.resultList;

				var length2 = groups.numFound;
				var length = networkManager.selectedAccountsForUpdatingAccessPermissions.length
				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if(networkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID == groups.resultList[jj].externalId)
							groups.resultList[jj].member = true;
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

			
	networkManager.addUserMember = function(user) {
		var newMembership = {
			memberAccountName: networkManager.getUserAccountName(user),
			memberUUID: user.externalId,
			resourceName: networkManager.network.name,
			resourceUUID: networkManager.network.externalId,
			permissions: 'READ',
			firstName: ((typeof(user.firstName) === 'undefined') ? "" : user.firstName),
			lastName: ((typeof(user.lastName) === 'undefined') ? "" : user.lastName),
			accountType: 'user',
			member: true
		}

		user.member = true;

		networkManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership);
	};

	networkManager.addGroupMember = function(group) {
		var newMembership = {
			memberAccountName: networkManager.getGroupAccountName(group),
			memberUUID: group.externalId,
			resourceName: networkManager.network.name,
			resourceUUID: networkManager.network.externalId,
			permissions: 'READ',
			groupName: ((typeof(group.groupName) === 'undefined') ? "" : group.groupName),
			accountType: 'group',
			member: true
		}

		group.member = true;

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


	networkManager.getAccountName = function(account) {
		if (typeof(account) === 'undefined') {
			return 'undefined';
		}

		if ((typeof(account.userName) !== 'undefined') && (account.userName === 'ndexadministrator')) {
			return account.userName;
		}

		if ((typeof(account.memberAccountName) !== 'undefined') && (account.memberAccountName === 'ndexadministrator')) {
			return account.memberAccountName;
		}

		if (account.accountType.toLowerCase() == 'user') {
			return account.firstName + " " + account.lastName;
		}

		if (account.accountType.toLowerCase() == 'group') {
			return account.groupName;
		}

		return "unknown account type";
	};


	networkManager.getUserAccountName = function(user) {
		if (typeof(user) === 'undefined') {
			return 'undefined';
		}

		if ((typeof(user.userName) !== 'undefined') && (user.userName === 'ndexadministrator')) {
			return user.userName;
		}

		if ((typeof(user.memberAccountName) !== 'undefined') && (user.memberAccountName === 'ndexadministrator')) {
			return user.memberAccountName;
		}

		if (user.isIndividual) {
			if (user.firstName && user.lastName) {
				return user.firstName + " " + user.lastName;
			}
		} else {
			if (user.displayName) {
				return user.displayName;
			}
		}

		return "unknown user";
	};

	networkManager.getGroupAccountName = function(group) {
		if (typeof(group) === 'undefined') {
			return 'undefined';
		}

		if (group.groupName) {
			return group.groupName;
		}
		
		return "unknown group";
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