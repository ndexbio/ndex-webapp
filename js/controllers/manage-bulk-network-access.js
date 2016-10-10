ndexApp.controller('manageBulkNetworkAccessController',
    ['ndexService', 'ndexUtility', 'sharedProperties', '$scope', '$location', '$routeParams', '$q',
        function (ndexService, ndexUtility, sharedProperties, $scope, $location, $routeParams, $q) {

    //              Process the URL to get application state
    //-----------------------------------------------------------------------------------


    //              CONTROLLER DECLARATIONS/INTIALIZATIONS
    //------------------------------------------------------------------------------------

    $scope.bulkNetworkManager = {};
    var bulkNetworkManager = $scope.bulkNetworkManager;

    bulkNetworkManager.errors = [];
    bulkNetworkManager.isAdmin = false;
    bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions = [];
    bulkNetworkManager.newUsers = {};
    bulkNetworkManager.newGroups = {};
    $scope.noNetworksSelected = false;

    bulkNetworkManager.selectedIDs = sharedProperties.getSelectedNetworkIDs();
    bulkNetworkManager.currentUserId = sharedProperties.getCurrentUserId();

    bulkNetworkManager.selectedNetworksForUpdatingAccessPermissions = {};


    bulkNetworkManager.getNetworkPermissions = function(IDs) {

        if (typeof(IDs) === 'undefined') {
            // most likely, refresh/reload button was hit;
            // Next button
            $scope.noNetworksSelected = true;
            return;
        }
        for (var i = 0; i <  IDs.length; i++) {

            var networkId = IDs[i];

            ndexService.getNetworkUserMemberships(networkId, 'ALL',
                function(memberships) {

                    var networkId = memberships[0].resourceUUID;
                    bulkNetworkManager.
                        selectedNetworksForUpdatingAccessPermissions[networkId] = memberships;

                },
                function(error) {
                    bulkNetworkManager.errors.push(error.data);
                })
        }
    };

    bulkNetworkManager.findUsers = function() {
        var query = {};
        query.searchString = bulkNetworkManager.searchString;

        ndexService.searchUsers(query, 0, 10,
            function(users) {

                bulkNetworkManager.newUsers = users.resultList;

                var length2 = users.numFound;
                var length = bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.length
                for(var jj=0; jj<length2; jj++) {
                    for(var ii=0; ii<length; ii++) {
                        if(bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID ==
                            users.resultList[jj].externalId)
                            users[jj].member = true;
                    }
                }
            },
            function(error) {
                bulkNetworkManager.errors.push(error.data)
            });
    };

    bulkNetworkManager.findGroups = function() {
        var query = {};
        query.searchString = bulkNetworkManager.groupSearchString;

        ndexService.searchGroups(query, 0, 10,
            function(groups) {

                bulkNetworkManager.newGroups = groups.resultList;

                var length2 = groups.numFound;
                var length = bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.length
                for(var jj=0; jj<length2; jj++) {
                    for(var ii=0; ii<length; ii++) {
                        if(bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID ==
                            groups.resultList[jj].externalId)
                            groups[jj].member = true;
                    }
                }
            },
            function(error) {
                bulkNetworkManager.errors.push(error.data)
            });
    };

    bulkNetworkManager.removeMember = function(index, memberToRemove) {
        memberToRemove.member = false;
        bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.splice(index, 1);

        if (typeof(bulkNetworkManager.newUsers.length) !== 'undefined') {
            for (var i = 0; i < bulkNetworkManager.newUsers.length; i++) {
                if (bulkNetworkManager.newUsers[i].externalId === memberToRemove.memberUUID) {
                    bulkNetworkManager.newUsers[i].member = false;
                }
            }
        }
        if (typeof(bulkNetworkManager.newGroups.length) !== 'undefined') {
            for (var i = 0; i < bulkNetworkManager.newGroups.length; i++) {
                if (bulkNetworkManager.newGroups[i].externalId === memberToRemove.memberUUID) {
                    bulkNetworkManager.newGroups[i].member = false;
                }
            }
        }
    };

    /*
    bulkNetworkManager.addMember = function(member) {
        var newMembership = {
            memberAccountName: bulkNetworkManager.getAccountName(member),
            memberUUID: member.externalId,
            //resourceName: bulkNetworkManager.network.name,
            //resourceUUID: bulkNetworkManager.network.externalId,
            permissions: 'WRITE',
            accountType: member.accountType
        }

        member.member = true;
        bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership);
    }
    */

    bulkNetworkManager.addUserMember = function(user) {
        var newMembership = {
            memberAccountName: bulkNetworkManager.getUserAccountName(user),
            memberUUID: user.externalId,
            permissions: 'READ',
            firstName: ((typeof(user.firstName) === 'undefined') ? "" : user.firstName),
            lastName: ((typeof(user.lastName) === 'undefined') ? "" : user.lastName),
            accountType: 'User',
            member: true
        }

        user.member = true;

        bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership);
    };

    bulkNetworkManager.addGroupMember = function(group) {
        var newMembership = {
            memberAccountName: bulkNetworkManager.getGroupAccountName(group),
            memberUUID: group.externalId,
            permissions: 'READ',
            groupName: ((typeof(group.groupName) === 'undefined') ? "" : group.groupName),
            accountType: 'Group',
            member: true
        }

        group.member = true;

        bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership);
    };

    bulkNetworkManager.getAccountName = function(user) {
        if (typeof(user) === 'undefined') {
            return 'undefined';
        }

        if (user.userName == 'ndexadministrator') {
            return user.userName;
        }

        if (user.accountType == 'User') {
            return user.firstName + " " + user.lastName;
        }

        if (user.accountType == 'Group') {
            return user.groupName;
        }

        return "unknown account type";
    };

    bulkNetworkManager.getUserAccountName = function(user) {
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

    bulkNetworkManager.getGroupAccountName = function(group) {
        if (typeof(group) === 'undefined') {
            return 'undefined';
        }

        if (group.groupName) {
            return group.groupName;
        }

        return "unknown group";
    };

    bulkNetworkManager.checkIfNetworkAccessNeedsUpdating = function(
        networkPermissionsObjs, accountForUpdating, accessTypeSelected) {

        // networkPermissionsObjs - array of permissions objects for a network
        // accountForUpdating - object with info about user or group account
        // accessType is "ADMIN", "WRITE" or "READ"

        var permissions;

        // find out what access type current user or group has on the current network (if any)
        for (var i = 0; i < networkPermissionsObjs.length; i++) {

            var networkPermissions = networkPermissionsObjs[i];

            if (networkPermissions.memberUUID == accountForUpdating.memberUUID) {
                permissions = networkPermissions.permissions;
                break;
            }
        }

        if (typeof(permissions) === 'undefined') {
            // network has no permissions for this account; we need to add it
            return true;
        }

        var weightOfSelectedAccess = 3; // 3 - ADMIN, 2 - WRITE, 1 - READ
        var weightOfExistingAccess = 3;

        if (accessTypeSelected === 'WRITE') {
            weightOfSelectedAccess = 2;
        } else if (accessTypeSelected === 'READ') {
            weightOfSelectedAccess = 1;
        }
        if (permissions.toUpperCase() === 'WRITE') {
            weightOfExistingAccess = 2;
        } else if (permissions.toUpperCase() === 'READ') {
            weightOfExistingAccess = 1;
        }

        return (weightOfSelectedAccess > weightOfExistingAccess) ? true : false;
    };


    bulkNetworkManager.getNetworkPermissions(bulkNetworkManager.selectedIDs);
}]);

