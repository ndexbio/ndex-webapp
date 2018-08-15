ndexApp.controller('signInController', ['$location', '$rootScope',
    function ($location, $rootScope) {

        var userLoggedIn = !!window.currentNdexUser;

        if (!userLoggedIn) {
            $location.path('/');
            $rootScope.$emit('SHOW_SIGN_IN_SIGN_UP_MODAL');
        }
    }]);
