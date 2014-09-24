ndexApp.controller('apiController',
    [ 'ndexService', 'sharedProperties', '$scope', '$location', '$modal',
        function (ndexService, sharedProperties, $scope, $location, $modal) {
            $scope.api = {};

            $scope.api.network = null;
            $scope.api.error = null;

            $scope.api.getNetworkApi = function()
            {
                (request = ndexService.getNetworkApi()
                    .success( function(methods)
                    {
                        api.network = methods;
                    })
                    .failure( function(error, data)
                    {
                        api.error = "Error while retrieving Network API";
                    }
                ))
            }
        }
    ]);