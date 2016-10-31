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
    groupManager.externalId = identifier;
	groupManager.newUsers = {};

	groupManager.originalAccessPermissions = [];
	groupManager.selectedAccountsForUpdatingAccessPermissions = [];

	groupManager.userGroupMemberships = [];

	groupManager.save = function() {

		if (!groupManager.changesWereMade()) {
			// theoretically, this "if" should never execute since if no changes were made, then
			// the "Save Changes" button is unavailable on the Manage Members page and
			// this function cannot be called since it is invoked by clicking the "Save Changes" button
			$scope.isProcessing = false;
			$location.path("group/" + $scope.groupManager.externalId);

			return;
		}

		if ($scope.isProcessing) {
			return;
		}

		$scope.isProcessing = false;

		var addedAccessObjects = [];

		// add new membership(s) (if any)
		for (var i = 0; i < groupManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {
			var accessObj = groupManager.selectedAccountsForUpdatingAccessPermissions[i];

			if (groupManager.accessWasAdded(accessObj)) {
				// remember index of the added element
				addedAccessObjects.push(i);

				var newMembership = {
					memberUUID: accessObj.memberUUID,
					resourceUUID: accessObj.resourceUUID,
					permissions: groupManager.selectedAccountsForUpdatingAccessPermissions[i].permissions,
					accountType: accessObj.accountType.toLowerCase()
				}

				updateGroupMembership(newMembership);
			}
		}
		
		// remove added objects from groupManager.selectedAccountsForUpdatingAccessPermissions
		for (var i = addedAccessObjects.length-1; i >= 0; i--) {
			groupManager.selectedAccountsForUpdatingAccessPermissions.splice(addedAccessObjects[i], 1);
		}

		var deletedAccessObjects = [];

		for (var i = 0; i < groupManager.originalAccessPermissions.length; i++) {
			var accessObj = groupManager.originalAccessPermissions[i];

			if (groupManager.accessWasRemoved(accessObj)) {
				// remember index of the deleted element
				deletedAccessObjects.push(i);

				deleteGroupMembership(accessObj);
			}
		}

		if (deletedAccessObjects.length > 0) {
			// remove deleted access objects from networkManager.originalAccessPermissions
			for (var i = deletedAccessObjects.length-1; i >= 0; i--) {
				groupManager.originalAccessPermissions.splice(deletedAccessObjects[i], 1);
			}
		}

		for (var i = 0; i < groupManager.originalAccessPermissions.length; i++) {
			var accessObj = groupManager.originalAccessPermissions[i];

			if (groupManager.accessWasModified(accessObj)) {

				var newMembership = {
					memberUUID: accessObj.memberUUID,
					resourceUUID: accessObj.resourceUUID,
					permissions: groupManager.selectedAccountsForUpdatingAccessPermissions[i].permissions,
					accountType: accessObj.accountType.toLowerCase()
				}

				updateGroupMembership(newMembership);
			}
		}

		$scope.isProcessing = false;
		$location.path("group/" + $scope.groupManager.externalId);

	};

	groupManager.accessWasAdded = function(accessObj) {

		if ((typeof(accessObj) === 'undefined') ||
			(typeof(accessObj.memberUUID) === 'undefined')) {
			return false;
		}

		for (var i = 0; i < groupManager.originalAccessPermissions.length; i++) {

			if (accessObj.memberUUID ===
				groupManager.originalAccessPermissions[i].memberUUID) {
				return false;
			}
		}
		return true;
	}

	groupManager.accessWasRemoved = function(accessObj) {

		if ((typeof(accessObj) === 'undefined') ||
			(typeof(accessObj.memberUUID) === 'undefined')) {
			return false;
		}

		for (var i = 0; i < groupManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {

			if (accessObj.memberUUID ===
				groupManager.selectedAccountsForUpdatingAccessPermissions[i].memberUUID) {
				return false;
			}
		}
		return true;
	}

	groupManager.accessWasModified = function(accessObj) {

		if ((typeof(accessObj) === 'undefined') ||
			(typeof(accessObj.memberUUID) === 'undefined')) {
			return false;
		}

		for (var i = 0; i < groupManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {

			if ((accessObj.memberUUID ===
				groupManager.selectedAccountsForUpdatingAccessPermissions[i].memberUUID) &&
				(accessObj.permissions.toLowerCase() !==
				groupManager.selectedAccountsForUpdatingAccessPermissions[i].permissions.toLowerCase())) {
				return true;
			}
		}
		return false;
	}

	var updateGroupMembership = function(newMembership) {
		var groupId = newMembership.resourceUUID;
		var userId  = newMembership.memberUUID;
		var type    = newMembership.permissions;

		ndexService.addOrUpdateGroupMember(groupId, userId, type,
			function(success){
				//console.log("addOrUpdateGroupMember -- success"); // do nothing
			},
			function(error){
				console.log("unable to update group membership for group=" + groupId +
					" user=" + userId + " membership type=" + type);
			})
	}

	var deleteGroupMembership = function(membershipObj) {

		var groupId = membershipObj.resourceUUID;
		var userId  = membershipObj.memberUUID;

		ndexService.removeGroupMember(groupId, userId,
			function(data) {
				//console.log("removeGroupMember -- success"); // do nothing
			},
			function(error) {
				console.log("unable to remove group member with Id=" + userId + " from group=" + groupId);

				if (error && error.message) {
					groupManager.errors.push(error.message);
				}
			});
	} 
			

	var getUsersUUIDs = function(users) {
		var usersUUIDs = [];

		for (var i=0; i<users.length; i++) {
			var userUUID = users[i].memberUUID;
			usersUUIDs.push(userUUID);
		}
		return usersUUIDs;
	}

	groupManager.loadMemberships = function() {
		/*
		 * To get list of User objects we need to:
		 *
		 * 1) Use getGroupUserMemberships function at
		 *    /group/{groupId}/user/{permission}/skipBlocks/blockSize?inclusive=true;
		 *    to get the list of USER and GROUP memberships
		 *
		 * 2) Get a list of User UUIDs from step 1
		 *
		 * 3) Use this list of User UUIDs to get Users through
		 *    /batch/user API.
		 *
		 */
		var inclusive = true;

		ndexService.getGroupUserMemberships(groupManager.externalId, 'MEMBER', 0, 1000000, inclusive)
			.success(
				function (users) {

					groupManager.userGroupMemberships = users;

					var usersUUIDs = getUsersUUIDs(users);

					ndexService.getUsersByUUIDs(usersUUIDs)
						.success(
							function (userAccounts) {
								groupManager.originalAccessPermissions = [];
								groupManager.selectedAccountsForUpdatingAccessPermissions = [];

								for (var i = 0; i < groupManager.userGroupMemberships.length; i++) {
									var user = groupManager.userGroupMemberships[i];

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

									groupManager.getUserAccountNames(userAccounts, newMembership);
									groupManager.originalAccessPermissions.push(newMembership);
									groupManager.selectedAccountsForUpdatingAccessPermissions.push(JSON.parse(JSON.stringify(newMembership)));
								}
							}
						)
						.error(
							function (error) {
								console.log("unable to get users by UUIDs");
							}
						);
				})
			.error(
				function (error, data) {
					console.log("unable to get group user memberships");
				});
	}

	groupManager.getUserAccountNames = function(accountsInfo, newMembership) {

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

	groupManager.getUserAccountName = function(user) {
		if (typeof(user) === 'undefined') {
			return 'undefined';
		}

		if ((typeof(user.userName) !== 'undefined') && (user.userName === 'ndexadministrator')) {
			return user.userName;
		}

		if ((typeof(user.memberAccountName) !== 'undefined') && (user.memberAccountName === 'ndexadministrator')) {
			return user.memberAccountName;
		}

		if (user.firstName && user.lastName) {
			return user.firstName + " " + user.lastName;
		}

		return "unknown user";
	};
			
	groupManager.findUsers = function() {
		var query = {};
		query.searchString = groupManager.searchString;

		ndexService.searchUsers(query, 0, 10,
			function(users) {

				groupManager.newUsers = users.resultList;

				var length2 = users.resultList.length;
				var length = groupManager.selectedAccountsForUpdatingAccessPermissions.length;

				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if (groupManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID == users.resultList[jj].externalId) {
							users.resultList[jj].member = true;
						}
					}
				}
			},
			function(error) {
				groupManager.errors.push(error.data)
			});
	}

	groupManager.addUserMember = function(user) {
		var newMembership = {
			memberAccountName: groupManager.getUserAccountName(user),
			memberUUID: user.externalId,
			resourceName: groupManager.group.name,
			resourceUUID: groupManager.group.externalId,
			permissions: 'MEMBER',
			firstName: ((typeof(user.firstName) === 'undefined') ? "" : user.firstName),
			lastName: ((typeof(user.lastName) === 'undefined') ? "" : user.lastName),
			accountType: 'user',
			member: true
		}

		user.member = true;

		groupManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership);
	};

	groupManager.removeMember = function(index, memberToRemove) {
		groupManager.selectedAccountsForUpdatingAccessPermissions.splice(index, 1);

		if (typeof(groupManager.newUsers) !== 'undefined') {
			for (var i = 0; i < groupManager.newUsers.length; i++) {
				if (groupManager.newUsers[i].externalId === memberToRemove.memberUUID) {
					groupManager.newUsers[i].member = false;
				}
			}
		}
	};

	groupManager.changesWereMade = function() {

		if (groupManager.selectedAccountsForUpdatingAccessPermissions.length !=
			groupManager.originalAccessPermissions.length) {
			return true;
		}

		for (var i = 0; i < groupManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {

			var selectedObj = groupManager.selectedAccountsForUpdatingAccessPermissions[i];
			var found = false;

			for (var j = 0; j < groupManager.originalAccessPermissions.length; j++) {
				var originalObj = groupManager.originalAccessPermissions[j];

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

	groupManager.discardChanges = function() {

		if (!groupManager.changesWereMade()) {
			// no changes to the list of accounts with permissions were made;
			// no action is required
			return;
		}

		// to discard all the changes, we need to empty the list of selectedAccountsForUpdatingAccessPermissions and
		// repopulate it with the values from originalAccessPermissions
		for (var i = 0; i < groupManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {
			var accountToRemove = groupManager.selectedAccountsForUpdatingAccessPermissions[i];

			if ((accountToRemove.accountType.toLowerCase() === 'user') &&
				(typeof(groupManager.newUsers) !== 'undefined')) {
				for (var j = 0; j < groupManager.newUsers.length; j++) {
					if (groupManager.newUsers[j].externalId === accountToRemove.memberUUID) {
						groupManager.newUsers[j].member = false;
					}
				}
			}
		}

		groupManager.selectedAccountsForUpdatingAccessPermissions = [];

		for (var i = 0; i < groupManager.originalAccessPermissions.length; i++) {
			var originalAccessPerm = groupManager.originalAccessPermissions[i];
			groupManager.selectedAccountsForUpdatingAccessPermissions.push(JSON.parse(JSON.stringify(originalAccessPerm)));

			if (typeof(groupManager.newUsers) !== 'undefined') {
				for (var j = 0; j < groupManager.newUsers.length; j++) {
					if (groupManager.newUsers[j].externalId === originalAccessPerm.memberUUID) {
						groupManager.newUsers[j].member = true;
					}
				}
			}
		}
	};


	//              INTIALIZATIONS
    //------------------------------------------------------------------------------------

    ndexService.getGroup(identifier,
    	function(group){
    		groupManager.group = group;
    	},
    	function(error){
    		groupManager.errors.push(error.data);
    	})

    groupManager.loadMemberships();

}]);