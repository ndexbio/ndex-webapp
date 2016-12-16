ndexApp.controller('homeController', ['sharedProperties', 'config', '$scope', 'uiMisc',
    function (sharedProperties, config, $scope, uiMisc) {

        $scope.homeController = {};
        var homeController = $scope.homeController;
        homeController.featuredCollections = [];
        homeController.URL = uiMisc.getCurrentServerURL();
        homeController.welcomeHeader = config.welcome.header;
        homeController.welcomeMessage = config.welcome.message;

        if (config.featuredCollections) {
            homeController.featuredCollections = config.featuredCollections;
        }

        homeController.getURLOfFeaturedCollection = function(collection) {
            return homeController.URL + collection.account + "/" + collection.UUID;
        }
    }
]);
