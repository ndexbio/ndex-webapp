ndexApp.controller('homeController', ['sharedProperties', '$scope', 'uiMisc',
    function (sharedProperties, $scope, uiMisc) {

        $scope.homeController = {};
        var homeController = $scope.homeController;
        homeController.featuredCollections = [];
        homeController.URL = uiMisc.getCurrentServerURL();
        homeController.welcomeHeader = window.ndexSettings.welcome.header;
        homeController.welcomeMessage = window.ndexSettings.welcome.message;
        homeController.linkToReleaseDocs = window.ndexSettings.welcome.linkToReleaseDocs;

        if (window.featuredCollections) {
            homeController.featuredCollections = window.featuredCollections;
        }

        homeController.getURLOfFeaturedCollection = function(collection) {
            return '#/' + collection.account + '/' + collection.UUID;

            //return homeController.URL + collection.account + '/' + collection.UUID;
        };
    }
]);
