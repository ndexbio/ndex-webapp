/**
 * Created by vrynkov 4 June 2018
 *
 * This service is used to keep settings (Page Number, Sorting Column and Column Filters) of the
 * My Networks table defined on MyAccount page throughout the session.
 *
 */
'use strict';

angular.module('ndexServiceApp')
    .service('userSessionTablesSettings', ['$location','sharedProperties',
        function ($location, sharedProperties) {

            var self = this;

            self.getCurrentUserName = function() {
                return sharedProperties.getCurrentUserAccountName();
            };

            self.initMyAccountNetworkTableFiltersAndSorting = function() {

                var userName = self.getCurrentUserName();

                var myAccountNetworkTableFiltersAndSorting =
                    (typeof(Storage) !== 'undefined') ? JSON.parse(sessionStorage.getItem(userName)) : null;

                var lastReloadViewName = self.getCurrentViewName();

                if ((myAccountNetworkTableFiltersAndSorting === null) ||
                    ((myAccountNetworkTableFiltersAndSorting.lastReloadViewName) &&
                    (myAccountNetworkTableFiltersAndSorting.lastReloadViewName === lastReloadViewName))) {

                    myAccountNetworkTableFiltersAndSorting = {};
                    myAccountNetworkTableFiltersAndSorting.filters = {};
                    myAccountNetworkTableFiltersAndSorting.sorting = {};
                    myAccountNetworkTableFiltersAndSorting.pageNumber = 1;

                    if (myAccountNetworkTableFiltersAndSorting.lastReloadViewName) {
                        delete myAccountNetworkTableFiltersAndSorting.lastReloadViewName;
                    }
                }

                return myAccountNetworkTableFiltersAndSorting;
            };

            self.saveTableSettings = function(tableSettings) {
                if (typeof(Storage) !== 'undefined') {
                    var userName = self.getCurrentUserName();
                    sessionStorage.setItem(userName, JSON.stringify(tableSettings));
                }
            };

            self.initMyAccountNetworkTableFiltersAndSorting = function() {

                var userName = self.getCurrentUserName();

                var myAccountNetworkTableFiltersAndSorting =
                    (typeof(Storage) !== 'undefined') ? JSON.parse(sessionStorage.getItem(userName)) : null;

                var lastReloadViewName = self.getCurrentViewName();

                if ((myAccountNetworkTableFiltersAndSorting === null) ||
                    ((myAccountNetworkTableFiltersAndSorting.lastReloadViewName) &&
                    (myAccountNetworkTableFiltersAndSorting.lastReloadViewName === lastReloadViewName))) {

                    myAccountNetworkTableFiltersAndSorting = {};
                    myAccountNetworkTableFiltersAndSorting.filters = {};
                    myAccountNetworkTableFiltersAndSorting.sorting = {};
                    myAccountNetworkTableFiltersAndSorting.pageNumber = 1;

                    if (myAccountNetworkTableFiltersAndSorting.lastReloadViewName) {
                        delete myAccountNetworkTableFiltersAndSorting.lastReloadViewName;
                    }
                }

                return myAccountNetworkTableFiltersAndSorting;
            };

            self.clearLastReloadView = function(table) {
                if (table.lastReloadViewName) {
                    delete table.lastReloadViewName;
                }
            };

            self.getCurrentViewName = function() {
                var currentViewName = $location.path();

                if (currentViewName) {

                    var currentViewNameExtracted = currentViewName.split('/');

                    if ((Array.isArray(currentViewNameExtracted) && (currentViewNameExtracted.length > 1))) {
                        currentViewName = currentViewNameExtracted[1].toLowerCase();
                    }
                }
                return currentViewName;
            };


            self.setLastReloadViewName = function () {

                var currentViewName = self.getCurrentViewName();

                var userName = self.getCurrentUserName();

                if (typeof(Storage) !== 'undefined') {
                    var myAccountNetworkTableFiltersAndSorting = JSON.parse(sessionStorage.getItem(userName));

                    if (!myAccountNetworkTableFiltersAndSorting) {
                        myAccountNetworkTableFiltersAndSorting = {};
                        myAccountNetworkTableFiltersAndSorting.filters = {};
                        myAccountNetworkTableFiltersAndSorting.sorting = {};
                        myAccountNetworkTableFiltersAndSorting.pageNumber = 1;
                    }
                    myAccountNetworkTableFiltersAndSorting.lastReloadViewName = currentViewName;
                    sessionStorage.setItem(userName, JSON.stringify(myAccountNetworkTableFiltersAndSorting));
                }
            };
        }
    ]);
