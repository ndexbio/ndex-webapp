ndexApp.controller('homeController', ['sharedProperties', 'config', '$scope', 'uiMisc',
    function (sharedProperties, config, $scope, uiMisc) {

        $scope.homeController = {};
        var homeController = $scope.homeController;
        homeController.featuredCollections = [];
        homeController.URL = uiMisc.getCurrentServerURL();

        if (config.featuredCollections) {
            homeController.featuredCollections = config.featuredCollections;
        }

        homeController.getURLOfFeaturedCollection = function(collection) {
            return homeController.URL + collection.account + "/" + collection.UUID;
        }
    }
]);
