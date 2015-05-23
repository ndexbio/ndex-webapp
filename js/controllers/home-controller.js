ndexApp.controller('homeController',
    ['sharedProperties', '$location',
        function (sharedProperties, $location) {

            if( sharedProperties.getCurrentUserId() )
                $location.path("/user/" + sharedProperties.getCurrentUserId() );

        }
    ]);
