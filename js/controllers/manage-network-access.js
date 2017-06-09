ndexApp.controller('manageNetworkAccessController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location',
		'$routeParams', '$q', 'ndexNavigation',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location,
				  $routeParams, $q, ndexNavigation) {

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

	networkManager.mapOfUserPermissions = {};
	networkManager.mapOfGroupPermissions = {};

	networkManager.modifiedAccessObjects = [];
	networkManager.deletedAccessObjects  = [];
	networkManager.newAdminObj  		 = [];

	networkManager.networkShareableURL = null;
	networkManager.networkShareableURLLabel = null;

	$scope.progressMessage = null;
	$scope.errorMessage = null;

	// turn on (show) Search menu item on the Nav Bar
	$scope.$parent.showSearchMenu = true;
	$scope.$parent.showViewMenus = true;


	// this function gets called when user navigates away from the current view.
	// (can also use "$locationChangeStart" instead of "$destroy"
	$scope.$on("$destroy", function(){

		// hide the Search menu item in Nav Bar
		$scope.$parent.showSearchMenu = false;

		showSearchMenuItem();

		$scope.$parent.showViewMenus = false;
	});

	var showSearchMenuItem = function() {
		var searhMenuItemElement = document.getElementById("searchBarId");
		searhMenuItemElement.style.display = 'block';
	};

	var hideSearchMenuItem = function() {
		var searhMenuItemElement = document.getElementById("searchBarId");
		searhMenuItemElement.style.display = 'none';
	};

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



	$scope.$on('ADDING_PERMISSIONS_DONE', function () {
		//console.log('DONE adding permissions, now update');
		updateNetworkMembership(networkManager.modifiedAccessObjects, 5, 1, 'UPDATING_PERMISSIONS_DONE');
	});

	$scope.$on('UPDATING_PERMISSIONS_DONE', function () {
		//console.log('DONE updating permissions, now delete');
		deleteNetworkMembership(networkManager.deletedAccessObjects, 5, 1, 'DELETING_PERMISSIONS_DONE');
	});

	$scope.$on('DELETING_PERMISSIONS_DONE', function () {
		//console.log('DONE deleting permissions, finally change admin');
		updateNetworkMembership(networkManager.newAdminObj, 5, 1, 'ALL_PERMISSIONS_DONE');
	});

	$scope.$on('ALL_PERMISSIONS_DONE', function () {
		//console.log('DONE changing admin, go back to Network View page.');
		$scope.progressMessage = null;
		$scope.isProcessing = false;
		$location.path("network/"+ $scope.networkManager.externalId);
	});


	var updateNetworkMembership = function(memberships, updateNetworkMembershipTries, secsToWait, eventToEmit) {

		if (!memberships || memberships.length == 0) {
			$scope.$emit(eventToEmit);
			return;
		}

		var newMembership = memberships[0];

		var permissionAccount = (newMembership.accountType.toLowerCase() == 'user') ?
			" user " + newMembership.firstName + " " + newMembership.lastName :
			" group " + newMembership.groupName;

		$scope.progressMessage = "Processing permission " + newMembership.permissions + " for " + permissionAccount;

		
		ndexService.updateNetworkPermissionV2(
			newMembership.resourceUUID,
			newMembership.accountType,
			newMembership.memberUUID,
			newMembership.permissions,
				function(data, status, headers, config, statusText) {
					//console.log(" update network permissions successfully");
					memberships.splice(0 ,1);

					updateNetworkMembership(memberships, updateNetworkMembershipTries, secsToWait, eventToEmit);
				},
				function(error, status, headers, config, statusText) {

					if ((status == 500) &&
						(error && error.errorCode && (error.errorCode == 'NDEx_Concurrent_Modification_Exception')))
					{
						updateNetworkMembershipTries = updateNetworkMembershipTries - 1;

						if (updateNetworkMembershipTries == 0) {
							
							var title = "Unable to Update Network Access";
							var message = "Unable to update access to network for ";

							if (newMembership.accountType.toLowerCase() == 'group') {
								message = message + ' group <strong>' + newMembership.groupName + '</strong>.<br>'
							} else {
								message = message + ' user <strong>' + newMembership.firstName + ' ' +
									newMembership.lastName + '</strong>.<br>'
							}

							$scope.progressMessage = null;

							message = message + error.message;
							$scope.errorMessage = message;

							ndexNavigation.genericInfoModal(title, message);
							//$scope.$emit(eventToEmit);
							return;
						};

						if (secsToWait === undefined) {
							secsToWait = 1;
						}

						// wait and try to update/add this membership again (recursively call itself)
						setTimeout(function()
							{
								updateNetworkMembership(memberships, updateNetworkMembershipTries, secsToWait, eventToEmit);
							},
							secsToWait * 1000);

					} else {

						// server reported error ... give error message and stop processing

						var title = "Unable to Update or Add Network Access";
						var message = "Unable to update or add network access for ";

						if (newMembership.accountType.toLowerCase() == 'group') {
							message = message + ' group <strong>' + newMembership.groupName + '</strong>.<br>'
						} else {
							message = message + ' user <strong>' + newMembership.firstName + ' ' +
								newMembership.lastName + '</strong>.<br>'
						}

						$scope.progressMessage = null;

						message = message + error.message;
						$scope.errorMessage = message;

						ndexNavigation.genericInfoModal(title, message);

						return;
					};

					// give error message here -- and continue updating ...
					//updateNetworkMembership(memberships, updateNetworkMembershipTries, secsToWait, eventToEmit);
				});
	}



	var deleteNetworkMembership = function (memberships, deleteNetworkMembershipTries, secsToWait, eventToEmit) {

		if (!memberships || memberships.length == 0) {
			$scope.$emit(eventToEmit);
			return;
		}

		var membershipObj = memberships[0];

		var permissionAccount = (membershipObj.accountType.toLowerCase() == 'user') ?
		" user " + membershipObj.firstName + " " + membershipObj.lastName :
		" group " + membershipObj.groupName;

		$scope.progressMessage = "Deleting permission " + membershipObj.permissions + " for " + permissionAccount;

		ndexService.deleteNetworkPermissionV2(membershipObj.resourceUUID, membershipObj.accountType, membershipObj.memberUUID,
			function(data, status, headers, config, statusText) {
				// success, membership deleted
				memberships.splice(0 ,1);

				deleteNetworkMembership(memberships, deleteNetworkMembershipTries, secsToWait, eventToEmit);
			},
			function(error, status, headers, config, statusText) {

				// memberships.splice(0 ,1);

				// unable to delete membership.  Check if network is currently locked on the
				// server by another process, wait, and try to delete again
				if ((status == 500) &&
					(error && error.errorCode && (error.errorCode == 'NDEx_Concurrent_Modification_Exception')))
				{
					deleteNetworkMembershipTries = deleteNetworkMembershipTries - 1;

					if (deleteNetworkMembershipTries == 0) {
						//console.log("unable to delete network membership");

						var title = "Unable to Delete Network Access";
						var message = "Unable to remove access to network for ";

						if (membershipObj.accountType.toLowerCase() == 'group') {
							message = message + ' group <strong>' + membershipObj.groupName + '</strong>.<br>'
						} else {
							message = message + ' user <strong>' + membershipObj.firstName + ' ' +
								membershipObj.lastName + '</strong>.<br>'
						}

						$scope.progressMessage = null;

						message = message + error.message;
						$scope.errorMessage = message;

						ndexNavigation.genericInfoModal(title, message);
						//$scope.$emit(eventToEmit);
						return;
					};

					if (secsToWait === undefined) {
						secsToWait = 1;
					}

					// wait and try to delete this membership again (recursively call itself)
					setTimeout(function()
						{
							deleteNetworkMembership(membershipObj, deleteNetworkMembershipTries, secsToWait)
						},
						secsToWait * 1000);

				} else {

					// server reported error ... give error message and stop processing

					var title = "Unable to Delete Network Access";
					var message = "Unable to remove access to network for ";

					if (membershipObj.accountType.toLowerCase() == 'group') {
						message = message + ' group <strong>' + membershipObj.groupName + '</strong>.<br>'
					} else {
						message = message + ' user <strong>' + membershipObj.firstName + ' ' +
							membershipObj.lastName + '</strong>.<br>'
					}

					$scope.progressMessage = null;

					message = message + error.message;
					$scope.errorMessage = message;

					ndexNavigation.genericInfoModal(title, message);

					return;
				}

				// give error message here -- and continue deleting ...
				//deleteNetworkMembership(memberships, deleteNetworkMembershipTries, secsToWait, eventToEmit);

			});
	}

	/*
	 * Find and return UUID of ADMIN.
	 */
	var getAdminUUID = function(accounts) {
		_.each(accounts, function(membershipObj)
		{
			if (membershipObj['permissions']) {
				membershipObj['permissions'] = membershipObj['permissions'].toUpperCase();
			};
		});

		var adminObj = _.find(accounts, {permissions: "ADMIN"});
		return adminObj ? adminObj['memberUUID'] : null;
	};

	var getAccountName = function(accounts, memberUUID) {
		var memberObj = _.find(accounts, {memberUUID: memberUUID});

		if (memberObj) {
			var accountName = (memberObj['accountType'] && (memberObj['accountType'].toLowerCase() == 'user')) ?
				memberObj['firstName'] + ' ' + memberObj['lastName'] : memberObj['groupName'];
		}

		return accountName ? accountName : "";
	};


	networkManager.isSelfAdminRemoval = function(){
		//Determine if the user is going to remove themselves as admin

		var return_dict = {'adminIssue': false, 'issueSeverity': 'none'};
		var newAdminUUIDs = [];

		var multiple_admin_count = 0;

		var originalAdminUUID = getAdminUUID(networkManager.originalAccessPermissions);

		_.each(networkManager.selectedAccountsForUpdatingAccessPermissions, function(membershipObj)
		{
			if (membershipObj['permissions'] == 'ADMIN') {
				multiple_admin_count++;
				if (originalAdminUUID != membershipObj['memberUUID']) {
					newAdminUUIDs.push(membershipObj['memberUUID']);
				}
			};
		});

		if (multiple_admin_count == 0) { //User removed admin (self) but did not specify new admin
			return_dict['adminIssue'] = true;
			return_dict['issueSeverity'] = 'ABORT';
			return_dict['title'] = 'Admin Required';
			return_dict['message'] = 'This action cannot be completed because one admin should always be designated.';
			return return_dict;
		}

		if ((multiple_admin_count > 2) ||
			((multiple_admin_count == 2) && (newAdminUUIDs.length > 1))) {
			//We do not support multiple admins, or two admins if there are no original admin
			return_dict['adminIssue'] = true;
			return_dict['issueSeverity'] = 'ABORT';
			return_dict['title'] = 'Too Many Admins Specified';
			return_dict['message'] = 'You specified ' + multiple_admin_count + ' admins. ' +
				'Please select only one admin.';
			return return_dict;
		}


		// At this point we know that there are 2 or 1 admin specified.
		// In case there are 2 admins, then one is new and one is old;
		// In case there is one admin, we need to check if it is not the same as old one --
		// in both cases we downgraded the current admin and assign a newly selected admin

		if ((multiple_admin_count == 2) ||
			((multiple_admin_count == 1) && ((newAdminUUIDs.length == 1)))) {
				return_dict['adminIssue'] = true;
				return_dict['issueSeverity'] = 'WARNING';
				return_dict['title'] = 'New Admin Specified';

				var newAdminName =
					getAccountName(networkManager.selectedAccountsForUpdatingAccessPermissions, newAdminUUIDs[0]);
				var oldAdminName = getAccountName(networkManager.originalAccessPermissions, originalAdminUUID);

				return_dict['message'] = 'You specified <strong>' + newAdminName + ' </strong>as new admin. <br><br>' +

					'<strong>' + oldAdminName + '</strong> permission will be downgraded to "Can Edit" and this ' +
					' user will no longer be able to manage access permissions for this network. <br><br>' +
						'Are you sure you want to proceed?';

				return return_dict;
		}

		// same admin, no new admin selected

		return return_dict;
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
		$scope.isProcessing = true;

		var originalAdminUUID = getAdminUUID(networkManager.originalAccessPermissions);
		var newAdminUUID = getAdminUUID(networkManager.selectedAccountsForUpdatingAccessPermissions);
		var downgradeOriginalAdmin = (originalAdminUUID != newAdminUUID);

		if (downgradeOriginalAdmin) {
			// we selected a new Admin; the current one will be downgraded
			// so we need to make sure that the
			// permission object with (memberUUID == originalAdminUUID) is processed very last

			_.remove(networkManager.originalAccessPermissions, {memberUUID: originalAdminUUID});
			_.remove(networkManager.originalAccessPermissions, {memberUUID: newAdminUUID});

			_.remove(networkManager.selectedAccountsForUpdatingAccessPermissions, {memberUUID: originalAdminUUID});

			networkManager.newAdminObj.push(_.clone(_.find(networkManager.selectedAccountsForUpdatingAccessPermissions,
					{memberUUID: newAdminUUID})));

			_.remove(networkManager.selectedAccountsForUpdatingAccessPermissions, {memberUUID: newAdminUUID});
		}


		var addedAccessObjects = [];


		_.each(networkManager.selectedAccountsForUpdatingAccessPermissions, function(accessObj) {

			if (networkManager.accessWasAdded(accessObj)) {

				var newMembership = {
					memberUUID:   accessObj.memberUUID,
					resourceUUID: accessObj.resourceUUID,
					permissions:  accessObj.permissions,
					accountType:  accessObj.accountType.toLowerCase()
				}
				if (newMembership['accountType'] == 'user') {
					newMembership['firstName'] = accessObj.firstName;
					newMembership['lastName'] = accessObj.lastName;
				} else {
					newMembership['groupName'] = accessObj.groupName;
				}

				addedAccessObjects.push(newMembership);
			}
		});
		_.each(addedAccessObjects, function(membershipObj) {
			// remove added permission objects from networkManager.selectedAccountsForUpdatingAccessPermissions
			_.remove(networkManager.selectedAccountsForUpdatingAccessPermissions, {memberUUID: membershipObj.memberUUID});
		});



		_.each(networkManager.originalAccessPermissions, function(accessObj) {
			if (networkManager.accessWasRemoved(accessObj)) {
				networkManager.deletedAccessObjects.push(accessObj);
			}
		});
		_.each(networkManager.deletedAccessObjects, function(membershipObj) {
			// remove deleted permission objects from networkManager.originalAccessPermissions list
			_.remove(networkManager.originalAccessPermissions, {memberUUID: membershipObj.memberUUID});
		});



		_.each(networkManager.originalAccessPermissions, function(accessObj) {

			if (networkManager.accessWasModified(accessObj)) {

				var modifiedAccessObj =
					_.find(networkManager.selectedAccountsForUpdatingAccessPermissions,
						{memberUUID: accessObj.memberUUID});

				var newMembership = {
					memberUUID:   accessObj.memberUUID,
					resourceUUID: accessObj.resourceUUID,
					permissions:  modifiedAccessObj.permissions,
					accountType:  accessObj.accountType.toLowerCase()
				}
				if (newMembership['accountType'] == 'user') {
					newMembership['firstName'] = accessObj.firstName;
					newMembership['lastName']  = accessObj.lastName;
				} else {
					newMembership['groupName'] = accessObj.groupName;
				}

				networkManager.modifiedAccessObjects.push(newMembership);
			}
		});
		_.each(networkManager.modifiedAccessObjects, function(membershipObj)
		{
			_.remove(networkManager.selectedAccountsForUpdatingAccessPermissions, {memberUUID: membershipObj.memberUUID});
		});


		// add new network memberships, once done, dispatch ADDING_PERMISSIONS_DONE event that will be caught
		// by the function that listens on this event.
		// updateNetworkMembership is recursive, it calls itself until it exhausts the addedAccessObjects list,
		// at which point it dispatches ADDING_PERMISSIONS_DONE.
		// The function that catches this event then calls updateNetworkMembership with
		// networkManager.modifiedAccessObjects list for modifying permissions on the server, etc.
		// We process permissions recursively since we want to make sure that changing admin (if it was selected)
		// is the very last operation.
		updateNetworkMembership(addedAccessObjects, 5, 1, 'ADDING_PERMISSIONS_DONE');
	};

	networkManager.memberIsAdmin = function(member) {
		if  (!member || !member.memberUUID) {
			return false;
		};

		var adminPermissionObj = _.find(networkManager.originalAccessPermissions, {permissions: 'ADMIN'});
		var retValue =  (adminPermissionObj && (adminPermissionObj['memberUUID'] == member.memberUUID));
		return retValue;
	};


	networkManager.loadUserPermissionsOnNetwork = function() {

		// no permission means return all permissions
		var permission = null;

		ndexService.getAllPermissionsOnNetworkV2(networkManager.externalId, "user", permission, 0, 1000000,
			function (mapOfUserPermissions, networkId) {

				var userUUIDs = Object.keys(mapOfUserPermissions);
				networkManager.mapOfUserPermissions = mapOfUserPermissions;

				ndexService.getUsersByUUIDsV2(userUUIDs)
					.success(
						function (userList) {
							networkManager.networkUserMemberships = userList;
							networkManager.processUserAccessPermissions();
						})
					.error(
						function(error) {
							console.log("unable to get users by UUIDs");
						}
					)
			}),
			function (error, networkId) {
				console.log("unable to get user permissions on network");
			};

	};

	networkManager.loadGroupPermissionsOnNetwork = function() {
		
		// no permission means return all permissions
		var permission = null;

		ndexService.getAllPermissionsOnNetworkV2(networkManager.externalId, "group", permission, 0, 1000000,
			function (mapOfGroupPermissions, groupId) {

				var groupsUUIDs = Object.keys(mapOfGroupPermissions);
				networkManager.mapOfGroupPermissions = mapOfGroupPermissions;

				ndexService.getGroupsByUUIDsV2(groupsUUIDs)
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
			}),
			function (error, groupId) {
				console.log("unable to get group permissions on network");
			};

	};

	networkManager.processGroupAccessPermissions = function() {
		// get accounts info; we need to know what accounts are user
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

			// make a copy of newMembership anda push it to selectedAccountsForUpdatingAccessPermissions;
			// we cannot do just networkManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership)
			// since in this case any manipulations on selectedAccountsForUpdatingAccessPermissions will
			// also affect networkManager.originalAccessPermissions
			networkManager.selectedAccountsForUpdatingAccessPermissions.push(JSON.parse(JSON.stringify(newMembership)));
		}
	}

	networkManager.processUserAccessPermissions = function() {
		// get accounts info; we need to know what accounts are user
		// and what accounts are group accounts;  we display First and Last Names for User accounts
		// and Group Account Name for group accounts

		for (var i = 0; i < networkManager.networkUserMemberships.length; i++) {
			var user = networkManager.networkUserMemberships[i];

			var newMembership = {

				memberAccountName: user.userName,
				memberUUID: user.externalId,
				resourceUUID: networkManager.externalId,
				permissions: networkManager.mapOfUserPermissions[user.externalId],
				firstName: user.firstName,
				lastName: user.lastName,
				accountType: "user",
				member: true
			}
			
			networkManager.originalAccessPermissions.push(newMembership);

			// make a copy of newMembership anda push it to selectedAccountsForUpdatingAccessPermissions;
			// we cannot do just networkManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership)
			// since in this case any manipulations on selectedAccountsForUpdatingAccessPermissions will
			// also affect networkManager.originalAccessPermissions
			networkManager.selectedAccountsForUpdatingAccessPermissions.push(JSON.parse(JSON.stringify(newMembership)));
		}
	};
			
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
		var searchString = networkManager.searchString;

		ndexService.searchUsersV2(searchString, 0, 10,
			function(users) {

				networkManager.newUsers = users.resultList;

				var length2 = users.resultList.length;
				var length = networkManager.selectedAccountsForUpdatingAccessPermissions.length;
				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if(networkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID == users.resultList[jj].externalId)
							users.resultList[jj].member = true;
					};
				};
			},
			function(error) {
				networkManager.errors.push(error.data)
			});
	};

	networkManager.findGroups = function() {

		ndexService.searchGroupsV2(networkManager.groupSearchString, 0, 10,
			function(groups) {

				networkManager.newGroups = groups.resultList;

				var length2 = groups.resultList.length;
				var length = networkManager.selectedAccountsForUpdatingAccessPermissions.length
				for(var jj=0; jj<length2; jj++) {
					for(var ii=0; ii<length; ii++) {
						if(networkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID == groups.resultList[jj].externalId)
							groups.resultList[jj].member = true;
					};
				};
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
		};

		// to discard all the changes, we need to empty the list of selectedAccountsForUpdatingAccessPermissions and
		// repopulate it with the values from originalAccessPermissions

		for (var i = 0; i < networkManager.selectedAccountsForUpdatingAccessPermissions.length; i++) {
			var accountToRemove = networkManager.selectedAccountsForUpdatingAccessPermissions[i];

			if ((accountToRemove.accountType.toLowerCase() === 'user') &&
				(typeof(networkManager.newUsers) !== 'undefined')) {
			    for (var j = 0; j < networkManager.newUsers.length; j++) {
				    if (networkManager.newUsers[j].externalId === accountToRemove.memberUUID) {
					    networkManager.newUsers[j].member = false;
				    };
				};
			} else if ((accountToRemove.accountType.toLowerCase() === 'group') &&
				       (typeof(networkManager.newGroups) !== 'undefined')) {
				for (var j = 0; j < networkManager.newGroups.length; j++) {
					if (networkManager.newGroups[j].externalId === accountToRemove.memberUUID) {
						networkManager.newGroups[j].member = false;
					};
				};
			};
		};

		networkManager.selectedAccountsForUpdatingAccessPermissions = [];

		for (var i = 0; i < networkManager.originalAccessPermissions.length; i++) {
			var originalAccessPerm = networkManager.originalAccessPermissions[i];
			networkManager.selectedAccountsForUpdatingAccessPermissions.push(JSON.parse(JSON.stringify(originalAccessPerm)));

			if (typeof(networkManager.newUsers) !== 'undefined') {
				for (var j = 0; j < networkManager.newUsers.length; j++) {
					if (networkManager.newUsers[j].externalId === originalAccessPerm.memberUUID) {
						networkManager.newUsers[j].member = true;
					};
				};
			};
			if (typeof(networkManager.newGroups) !== 'undefined') {
				for (var j = 0; j < networkManager.newGroups.length; j++) {
					if (networkManager.newGroups[j].externalId === originalAccessPerm.memberUUID) {
						networkManager.newGroups[j].member = true;
					};
				};
			};
		};
	};

	networkManager.removeMember = function(index, memberToRemove) {
		networkManager.selectedAccountsForUpdatingAccessPermissions.splice(index, 1);

		if (typeof(networkManager.newUsers) !== 'undefined') {
			for (var i = 0; i < networkManager.newUsers.length; i++) {
				if (networkManager.newUsers[i].externalId === memberToRemove.memberUUID) {
					networkManager.newUsers[i].member = false;
				};
			};
		};
		if (typeof(networkManager.newGroups) !== 'undefined') {
		    for (var i = 0; i < networkManager.newGroups.length; i++) {
				if (networkManager.newGroups[i].externalId === memberToRemove.memberUUID) {
					networkManager.newGroups[i].member = false;
				};
			};
		};
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
		};

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
		};

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
		};

		group.member = true;

		networkManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership);
	};

	networkManager.changesWereMade = function() {

		if (networkManager.selectedAccountsForUpdatingAccessPermissions.length !=
			networkManager.originalAccessPermissions.length) {
			return true;
		};

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
					};
				};
			};
			if (!found) {
				return true;
			};
		};

		return false;
	};

	networkManager.nothingSelected = function() {
		return networkManager.selectedAccountsForUpdatingAccessPermissions.length == 0;
	};

	networkManager.getAccountName = function(account) {
		if (typeof(account) === 'undefined') {
			return 'undefined';
		};

		if ((typeof(account.userName) !== 'undefined') && (account.userName === 'ndexadministrator')) {
			return account.userName;
		};

		if ((typeof(account.memberAccountName) !== 'undefined') && (account.memberAccountName === 'ndexadministrator')) {
			return account.memberAccountName;
		};

		if (account.accountType.toLowerCase() == 'user') {
			return account.firstName + " " + account.lastName;
		};

		if (account.accountType.toLowerCase() == 'group') {
			return account.groupName;
		};

		return "unknown account type";
	};


	networkManager.getUserAccountName = function(user) {
		if (typeof(user) === 'undefined') {
			return 'undefined';
		};

		if ((typeof(user.userName) !== 'undefined') && (user.userName === 'ndexadministrator')) {
			return user.userName;
		};

		if ((typeof(user.memberAccountName) !== 'undefined') && (user.memberAccountName === 'ndexadministrator')) {
			return user.memberAccountName;
		};

		if (user.isIndividual) {
			if (user.firstName && user.lastName) {
				return user.firstName + " " + user.lastName;
			};
		} else {
			if (user.displayName) {
				return user.displayName;
			};
		};

		return "unknown user";
	};

	networkManager.getGroupAccountName = function(group) {
		if (typeof(group) === 'undefined') {
			return 'undefined';
		};

		if (group.groupName) {
			return group.groupName;
		};
		
		return "unknown group";
	};


	networkManager.checkIfUserAccount = function(member) {

		if (member && member.accountType) {
			return (member.accountType.toLowerCase() === 'user') ? true : false;
		};

		return false;
	};


	networkManager.switchShareableURL = function() {

        var action = (networkManager.networkShareableURL) ? "disable" : "enable";

        ndexService.disableOrEnableAccessKeyOnNetworkV2(networkManager.externalId, action,
            function(data, status, headers, config, statusText) {

                if (action == 'enable') {
                    networkManager.networkShareableURLLabel = "Deactivate Shareable URL";
                    var clickLink = true;
                    networkManager.getStatusOfShareableURL(clickLink);

				} else {networkManager.networkShareableURLLabel = "Activate Shareable URL";
                    networkManager.networkShareableURL = null;
				};
            },
            function(error) {
                console.log("unable to get access key for network " + networkManager.externalId);
            });
	};

	$scope.showURLInClipboardMessage = function() {

		var message =
			"The URL for this network was copied to the clipboard. \n" +
			"To paste it using keyboard, press Ctrl-V. \n" +
			"To paste it using mouse, Right-Click and select Paste.";

		alert(message);
	};


	networkManager.getStatusOfShareableURL = function(clickLink) {
		var currentServer = ndexService.getNdexServerUriV2().split("/");
        currentServer[currentServer.length - 1] = '#';
		var server = currentServer.join("/");

		var URI = server + "/network/" + networkManager.externalId + "?accesskey=";

        ndexService.getAccessKeyOfNetworkV2(networkManager.externalId,
            function(data) {

				if (!data) {
					// empty string - access is deactivated
                    networkManager.networkShareableURL = null;
                    networkManager.networkShareableURLLabel = "Activate Shareable URL";

				} else if (data['accessKey']) {
					// received  data['accessKey'] - access is active
					URI = URI + data['accessKey'];
					networkManager.networkShareableURL = URI;
                    networkManager.networkShareableURLLabel = "Deactivate Shareable URL";


				} else {
					// this should not happen; something went wrong; access deactivated
                    networkManager.networkShareableURL = null;
                    networkManager.networkShareableURLLabel = "Activate Shareable URL";
				};
            },
			function(error) {
        		console.log("unable to get access key for network " + networkManager.externalId);
			});
	};




	//              INTIALIZATIONS
    //------------------------------------------------------------------------------------

	hideSearchMenuItem();

    ndexService.getNetworkSummaryV2(identifier)
    	.success(
    	function(network){
    		networkManager.network = network;
    	})
    	.error(
    	function(error){
    		networkManager.errors.push(error.data);
    	})

	var userId = sharedProperties.getCurrentUserId();
	var networkId = identifier;
	var directonly = false;

    ndexService.getUserPermissionForNetworkV2(userId, networkId, directonly,
    	function(membership) {
			if (membership) {
				var myMembership = membership[networkId];

				if (myMembership == 'ADMIN') {
					networkManager.isAdmin = true;
				}
			}
    	},
    	function(error) {
    		networkManager.errors.push(error.data)
    	})

	networkManager.getStatusOfShareableURL();
	networkManager.loadUserPermissionsOnNetwork();
	networkManager.loadGroupPermissionsOnNetwork();

}]);