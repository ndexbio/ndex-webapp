/**
 * Created by vrynkov 4 June 2018
 *
 * This service is used to keep settings (Page Number, Sorting Column and Column Filters) of the
 * My Networks table defined on MyAccount page throughout the session.
 *
 */
'use strict';

angular.module('ndexServiceApp')
    .service('userSessionTablesSettings', ['$rootScope',
        function ($rootScope) {

            var self = this;

            self.clearState = function() {
                delete $rootScope.myAccountPageStates;
            };



            self.clearPreviousSortingAndSetNewOne = function(columnDefs, pageNoP) {

                var pageSetup = self.getPage(pageNoP);

                if (!pageSetup || ((!pageSetup.sorting || !pageSetup.sorting.name || !pageSetup.sorting.direction))) {
                    self.setPageSorting(pageNoP, 'Last Modified', 'desc');
                    pageSetup = self.getPage(pageNoP);
                }

                var columnName = self.getPageSortingColumnName(pageNoP);
                var columnObj  = _.find(columnDefs, {field: columnName});

                if (columnObj) {
                    columnObj.sort = {};
                    columnObj.sort.direction = pageSetup.sorting.direction;
                    columnObj.sort.priority  = 5;
                }

            };


            self.getPage = function(pageNoP) {

                var pageToReturn = null;

                if ($rootScope.myAccountPageStates.pages[pageNoP] &&
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting &&
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting.name &&
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting.direction)
                {
                    pageToReturn = $rootScope.myAccountPageStates.pages[pageNoP];
                }

                return pageToReturn;
            };

            self.getPageSortingColumnName = function(pageNoP) {
                return  $rootScope.myAccountPageStates.pages[pageNoP].sorting.name;
            };

            self.getPageSortingDirection = function(pageNoP) {
                return  $rootScope.myAccountPageStates.pages[pageNoP].sorting.direction;
            };


            self.setPageSorting = function(pageNoP, sortingColumnName, sortingDirection) {

                if (!$rootScope.myAccountPageStates.pages[pageNoP]) {
                    $rootScope.myAccountPageStates.pages[pageNoP] = {};
                }
                if (!$rootScope.myAccountPageStates.pages[pageNoP].sorting) {
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting = {};
                }

                $rootScope.myAccountPageStates.pages[pageNoP].sorting.name      = sortingColumnName;
                $rootScope.myAccountPageStates.pages[pageNoP].sorting.direction = sortingDirection;
                $rootScope.myAccountPageStates.pages[pageNoP].sorting.sorted    = true;

            };

            self.setPageSortingToUnsorted = function(pageNoP) {
                if ($rootScope.myAccountPageStates.pages[pageNoP] &&
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting) {

                    $rootScope.myAccountPageStates.pages[pageNoP].sorting.name      = null;
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting.direction = null;
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting.sorted    = false;
                }
            };

            self.setFilterForPage = function(pageNoP, columnName, filterTerm) {
                if (!$rootScope.myAccountPageStates.pages[pageNoP]) {
                    $rootScope.myAccountPageStates.pages[pageNoP] = {};
                }
                if (!$rootScope.myAccountPageStates.pages[pageNoP].filters) {
                    $rootScope.myAccountPageStates.pages[pageNoP].filters = {};
                }

                $rootScope.myAccountPageStates.pages[pageNoP].filters.columnName = filterTerm;

            };

            self.removeFilterFromPage = function(pageNoP, columnName) {

                if ($rootScope.myAccountPageStates.pages[pageNoP] &&
                    $rootScope.myAccountPageStates.pages[pageNoP].filters &&
                    $rootScope.myAccountPageStates.pages[pageNoP].filters.hasOwnProperty(columnName)) {

                    delete $rootScope.myAccountPageStates.pages[pageNoP].filters.columnName;
                }
            };


            self.getFiltersForPage = function(pageNoP) {

                if ($rootScope.myAccountPageStates.pages &&
                    $rootScope.myAccountPageStates.pages[pageNoP] &&
                    $rootScope.myAccountPageStates.pages[pageNoP].filters) {

                    return $rootScope.myAccountPageStates.pages[pageNoP].filters;
                }
                return {};
            };

            self.getTablePaginationSize = function() {
                return  $rootScope.myAccountPageStates.table.networksPerPage;
            };

            self.initMyAccountPageStates = function() {
                if (!$rootScope.myAccountPageStates) {

                    $rootScope.myAccountPageStates = {};
                    $rootScope.myAccountPageStates.pages = {};
                    $rootScope.myAccountPageStates.table = {};

                    $rootScope.myAccountPageStates.table.selectedNetworks = new Set([]);
                    $rootScope.myAccountPageStates.table.networksPerPage  = 50;
                }

                console.log();
            };

            self.addUUIDToSelectedNetworks = function(networkUUID) {
                $rootScope.myAccountPageStates.table.selectedNetworks.add(networkUUID);
            };
            self.deleteUUIDFromSelectedNetworks = function(networkUUID) {
                $rootScope.myAccountPageStates.table.selectedNetworks.delete(networkUUID);
            };
            self.isUUIDInSelectedNetworks = function(networkUUID) {
                return $rootScope.myAccountPageStates.table.selectedNetworks.has(networkUUID);
            };
            self.noNetworksSelected = function() {
                return $rootScope.myAccountPageStates.table.selectedNetworks.size === 0;
            };

/*
            self.getCurrentUserName = function() {
                return sharedProperties.getCurrentUserAccountName();
            };

            /*
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
            */

/*
            self.saveTableSettings = function(tableSettings) {
                if (typeof(Storage) !== 'undefined') {
                    var userName = self.getCurrentUserName();
                    sessionStorage.setItem(userName, JSON.stringify(tableSettings));
                }
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
*/
        }
    ]);
