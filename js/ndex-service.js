(function() {

var ndexServiceApp = angular.module("ndexServiceApp", []);

ndexServiceApp.factory('ndexService',function($http) {
    // define and initialize factory object
    var factory = {};

    factory.findNetworks = function (searchType, searchString) {
        var config = NdexClient.getNetworkSearchConfig(searchType, searchString);
        return $http(config);
    }



    // return factory object
    return factory;
});


}) ();