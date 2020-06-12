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


            self.getPageSortingColumnName = function(pageNoP) {
                return  $rootScope.myAccountPageStates.pages[pageNoP].sorting.name;
            };

            self.getPageSortingDirection = function(pageNoP) {
                return  $rootScope.myAccountPageStates.pages[pageNoP].sorting.direction;
            };
            self.getPageSorting = function(pageNoP) {

                if ($rootScope.hasOwnProperty('myAccountPageStates') &&
                    $rootScope.myAccountPageStates.hasOwnProperty('pages') &&
                    $rootScope.myAccountPageStates.pages.hasOwnProperty(pageNoP) &&
                    $rootScope.myAccountPageStates.pages[pageNoP].hasOwnProperty('sorting'))
                {
                    return $rootScope.myAccountPageStates.pages[pageNoP].sorting;
                }

                return {};
            };


            self.setPageSorting = function(pageNoP, sortedColumnName, sortingObj) {

                if (!$rootScope.myAccountPageStates.pages[pageNoP]) {
                    $rootScope.myAccountPageStates.pages[pageNoP] = {};
                }
                if (!$rootScope.myAccountPageStates.pages[pageNoP].sorting) {
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting = {};
                }

                $rootScope.myAccountPageStates.pages[pageNoP].sorting.name      = sortedColumnName;
                $rootScope.myAccountPageStates.pages[pageNoP].sorting.direction = sortingObj.direction;
                $rootScope.myAccountPageStates.pages[pageNoP].sorting.priority  = sortingObj.priority;
                $rootScope.myAccountPageStates.pages[pageNoP].sorting.sorted    = true;

            };

            self.setPageSortingToUnsorted = function(pageNoP) {
                if ($rootScope.myAccountPageStates.pages[pageNoP] &&
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting) {

                    $rootScope.myAccountPageStates.pages[pageNoP].sorting.name      = null;
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting.direction = null;
                    $rootScope.myAccountPageStates.pages[pageNoP].sorting.prirority = null;
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

                $rootScope.myAccountPageStates.pages[pageNoP].filters[columnName] = filterTerm;

            };

            self.removeFilterFromPage = function(pageNoP, columnName) {

                if ($rootScope.myAccountPageStates.pages[pageNoP] &&
                    $rootScope.myAccountPageStates.pages[pageNoP].filters &&
                    $rootScope.myAccountPageStates.pages[pageNoP].filters.hasOwnProperty(columnName)) {

                    delete $rootScope.myAccountPageStates.pages[pageNoP].filters[columnName];
                }
            };


            self.getPageFilters = function(pageNoP) {

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
                    $rootScope.myAccountPageStates.table.networksPerPage  = 500;
                }

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



            self.clearPreviousFiltersAndSetNewOnes = function(networksGrid, pageNoP) {

                var pageFilters = self.getPageFilters(pageNoP);
                var grid        = networksGrid;

                // iterate through all visible columns and clear all currently set filters
                // while setting new ones (if any were set for this page earlier)
                if (grid && grid.hasOwnProperty('columns')) {
                    _.forEach(grid.columns, function(column) {
                        if (column && (!column.hasOwnProperty('visible') || (column.visible === true))) {

                            if (column.hasOwnProperty('filters') && Array.isArray(column.filters)) {
                                delete column.filters[0].term;
                            }
                            if (column.name in pageFilters) {
                                column.filters[0].term = pageFilters[column.name];
                            }
                        }
                    });
                }
            };

            self.clearPreviousSortingAndSetNewOne = function(networksGrid, pageNoP) {

                var pageSorting      = self.getPageSorting(pageNoP);
                var grid             = networksGrid;

                var sortedColumnName = pageSorting.name;


                // iterate through all visible columns and clear all currently set filters
                // while setting new ones (if any were set for this page earlier)
                if (grid && grid.hasOwnProperty('columns')) {
                    _.forEach(grid.columns, function(column) {
                        if (column && (!column.hasOwnProperty('visible') || (column.visible === true))) {

                            if (column.hasOwnProperty('sort') && column.sort.hasOwnProperty('direction')) {
                                delete column.sort.direction;
                                delete column.sort.priority;
                            }

                            if (column.name === sortedColumnName) {
                                column.sort.direction = pageSorting.direction;
                                column.sort.priority  = pageSorting.priority;
                            }
                        }
                    });
                }

            };
        }
    ]);
