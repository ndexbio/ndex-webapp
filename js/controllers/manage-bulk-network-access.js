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
    bulkNetworkManager.update = [];
    bulkNetworkManager.remove = [];
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

            ndexService.getNetworkMemberships(networkId, 'ALL',
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

                bulkNetworkManager.newUsers = users;

                var length2 = users.length;
                var length = bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.length
                for(var jj=0; jj<length2; jj++) {
                    for(var ii=0; ii<length; ii++) {
                        if(bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID == users[jj].externalId)
                            users[jj].member = true;
                    }
                }

                for(var jj=0; jj < bulkNetworkManager.selectedNetworksForUpdatingAccessPermissions.length; jj++) {
                    var i = jj;
                    var b = i;
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

                bulkNetworkManager.newGroups = groups;

                var length2 = groups.length;
                var length = bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.length
                for(var jj=0; jj<length2; jj++) {
                    for(var ii=0; ii<length; ii++) {
                        if(bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions[ii].memberUUID == groups[jj].externalId)
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
        bulkNetworkManager.remove.push(memberToRemove);

        for (var i = 0; i < bulkNetworkManager.newUsers.length; i++) {
            if (bulkNetworkManager.newUsers[i].externalId === memberToRemove.memberUUID) {
                bulkNetworkManager.newUsers[i].member = false;
            }
        }
        for (var i = 0; i < bulkNetworkManager.newGroups.length; i++) {
            if (bulkNetworkManager.newGroups[i].externalId === memberToRemove.memberUUID) {
                bulkNetworkManager.newGroups[i].member = false;
            }
        }
    };

    bulkNetworkManager.addMember = function(member) {
        var newMembership = {
            memberAccountName: bulkNetworkManager.getAccountName(member),
            memberUUID: member.externalId,
            //resourceName: bulkNetworkManager.network.name,
            //resourceUUID: bulkNetworkManager.network.externalId,
            permissions: 'WRITE',

        }

        member.member = true;
        bulkNetworkManager.selectedAccountsForUpdatingAccessPermissions.push(newMembership);
    }

    bulkNetworkManager.getAccountName = function(user) {
        if (typeof(user) === 'undefined') {
            return 'undefined';
        }

        if (user.accountName == 'ndexadministrator') {
            return user.accountName;
        }

        if (user.accountType == 'User') {
            return user.firstName + " " + user.lastName;
        }

        if (user.accountType == 'Group') {
            return user.groupName;
        }

        return "unknown account type";
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

