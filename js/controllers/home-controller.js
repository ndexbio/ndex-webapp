ndexApp.controller('homeController', ['sharedProperties', 'config', '$scope',
    function (sharedProperties, config, $scope) {

        $scope.homeController = {};
        var homeController = $scope.homeController;
        homeController.featuredCollections = [];
        homeController.URL = null;

        if (config.featuredCollections) {
            homeController.featuredCollections = config.featuredCollections;

            var parser = document.createElement('a');
            parser.href = config.ndexServerUriV2;

            homeController.URL = parser.protocol + "//" + parser.hostname + "/#/";
        }

        homeController.getURLOfFeaturedCollection = function(collection) {
            return homeController.URL + collection.account + "/" + collection.UUID;
        }
        
    }
]);
