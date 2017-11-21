/*==============================================================================*
 *                               NDEx Angular Client Module
 *
 * Description : The module consists of services that define the Client. Our
 *               code will make use of the ndexService service to make high level
 *               calls to the rest server.
 *
 * Notes       : Will soon be investigating replacing code with angular-resource
 *
 *==============================================================================*/


//angularjs suggested function closure
(function () {

    var ndexServiceApp = angular.module('ndexServiceApp', ['ngResource', 'ngRoute']);

    ndexServiceApp.config(['$httpProvider', function($httpProvider){
        $httpProvider.interceptors.push(function($q) {
            return {
                'responseError' : function(rejection) {
                    if(rejection.status == 503) {
                        rejection.data = 'The server is temporarily unable to service your request due to maintenance downtime or capacity problems. Please try again later.';
                    }
                    return $q.reject(rejection);
                }
            }
        });
    }]);
    



})(); //end function closure
