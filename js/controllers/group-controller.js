ndexApp.controller('groupController',
    ['ndexService', 'ndexUtility', 'ndexNavigation', 'sharedProperties', '$scope', '$location', '$routeParams', '$modal', '$route',
        function (ndexService, ndexUtility, ndexNavigation, sharedProperties, $scope, $location, $routeParams, $modal, $route) {

    //              Process the URL to get application state
    //-----------------------------------------------------------------------------------
    var identifier = $routeParams.identifier;


    //              CONTROLLER INTIALIZATIONS
    //------------------------------------------------------------------------------------

    $scope.groupController = {};
    var groupController = $scope.groupController;
    groupController.isAdmin = false;     
    groupController.identifier = identifier;

    // members
    groupController.userSearchAdmin = false; // this state needs to be saved to avoid browser refresh
    groupController.userSearchMember = false;
    groupController.userSearchResults = [];

    // networks
    groupController.networkSearchResults = [];
    groupController.networkQuery = {};

    //              scope functions
    // called on Networks belonging to group displayed on page
    groupController.setAndDisplayCurrentNetwork = function (identifier) {
        $location.path("/networkQuery/" + identifier);
    };


    groupController.submitUserSearch = function() {
        groupController.userSearchResults = [];

        var query = {};

        query.accountName = groupController.displayedGroup.accountName;
        query.searchString = groupController.memberSearchString
        if(groupController.userSearchAdmin) query.permission = 'GROUPADMIN';
        if(groupController.userSearchMember) query.permission = 'MEMBER'
                          
        //pagination missing
        ndexService.searchUsers(query, 0, 50,
            function (users) {
                // Save the results
                groupController.userSearchResults = users;
                                  
            },
            function (error) {
                                         
            });
    };

    groupController.leaveGroup = function() {
        ndexNavigation.openConfirmationModal(
            'Are you sure you want to leave this group?',
            function() {
                ndexService.removeGroupMember(
                    groupController.displayedGroup.externalId,
                    ndexUtility.getLoggedInUserExternalId(),
                    function(data){
                        //TODO
                        $route.reload();
                    },
                    function(error){
                        //TODO
                    });
            });
    };

    groupController.submitNetworkSearch = function() {
        groupController.networkSearchResults = [];

        groupController.networkQuery.accountName = groupController.displayedGroup.accountName;

        ndexService.searchNetworks(groupController.networkQuery, 0, 50,
            function(networks) {
                groupController.networkSearchResults = networks;
            },
            function(error){
                //TODO
            })
    }
    

    //              local functions
    var getMembership = function() {
        ndexService.getMyMembership(groupController.displayedGroup.externalId, 
            function(membership) {
                if(membership.permissions != null)
                    groupController.isAdmin = true;
            },
            function(error){
                console.log(error);
            });
    }

    //                  PAGE INITIALIZATIONS/INITIAL API CALLS
    //----------------------------------------------------------------------------

    ndexService.getGroup(groupController.identifier,
        function (group) {
 
            groupController.displayedGroup = group;
            cGroup = group;

            getMembership();

            groupController.submitUserSearch();

            groupController.submitNetworkSearch();

        });

            //------------------------------------------------------------------------------------//

        }]);
