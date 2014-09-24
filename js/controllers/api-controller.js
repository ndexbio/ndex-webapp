ndexApp.controller('apiController',
    [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal',
        function (ndexService, sharedProperties, $scope, $location, $modal) {
            $scope.api = {};
            var api = $scope.api;

            api.network = false;
            api.error = false;
            console.log("about to call api method");
            api.getNetworkApi = function()
            {
                console.log("invoking api method");
                ndexService.getNetworkApi(
                    function(methods)
                    {
                        console.log("got methods");
                        api.network = methods;
                    },
                    function(error, data)
                    {
                        console.log("got error");
                        api.error = "Error while retrieving Network API";
                    })
            }
            api.getNetworkApi();
        }
    ]);