ndexApp.controller('homeController', ['sharedProperties', '$scope', 'uiMisc',
    function (sharedProperties, $scope, uiMisc) {

        $scope.homeController = {};
        var homeController = $scope.homeController;
        homeController.featuredContent = [];
        homeController.URL = uiMisc.getCurrentServerURL();

        if (window.featuredContent) {
            homeController.featuredContent = window.featuredContent;
        }

        homeController.getURLOfFeaturedCollection = function(collection) {
            return '#/' + collection.account + '/' + collection.UUID;

            //return homeController.URL + collection.account + '/' + collection.UUID;
        };
    }
]);
