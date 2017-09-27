ndexApp.controller('homeController', ['sharedProperties', '$scope', 'uiMisc',
    function (sharedProperties, $scope, uiMisc) {

        $scope.homeController = {};
        var homeController = $scope.homeController;
        homeController.featuredCollections = [];
        homeController.URL = uiMisc.getCurrentServerURL();
        homeController.welcomeHeader = window.ndexSettings.welcome.header;
        homeController.welcomeMessage = window.ndexSettings.welcome.message;

        if (window.ndexSettings.featuredCollections) {
            homeController.featuredCollections = window.ndexSettings.featuredCollections;
        }

        homeController.getURLOfFeaturedCollection = function(collection) {
            return homeController.URL + collection.account + "/" + collection.UUID;
        }
    }
]);
