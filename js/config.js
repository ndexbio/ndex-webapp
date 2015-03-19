angular.module('ndexServiceApp').constant('config',
{
    welcome: "NDEx Web App deployed at localhost!!",
    requireAuthentication: true,
    contactUs:
    {
        name: "Pfizer",
        href: "http://www.pfizer.com",
        target: "_blank"
    },
    networkQueryLimit: 1500,
    networkDisplayLimit: 100,
    protocol: "http"
});