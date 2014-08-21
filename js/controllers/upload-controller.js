ndexApp.controller('uploadController',
    ['FileUploader', 'ndexService',  'ndexConfigs', 'ndexUtility', 'sharedProperties', '$scope', '$routeParams', '$modal',
        function(FileUploader, ndexService, ndexConfigs, ndexUtility, sharedProperties, $scope, $routeParams, $modal) {

            var uploader = $scope.uploader = new FileUploader({
                url: ndexService.getNetworkUploadURI(),
                alias: "fileUpload",
                headers: {
                    Authorization: "Basic " + ndexConfigs.getEncodedUser()
                }
            });

            // FILTERS
            // item is {File|FileLikeObject}
            uploader.filters.push({
                name: 'customFilter',
                fn: function(item , options) {
                    return this.queue.length < 10;
                }
            });

            // CALLBACKS

            // /*{File|FileLikeObject}*/
            uploader.onWhenAddingFileFailed = function(item, filter, options) {
                console.info('onWhenAddingFileFailed', item, filter, options);
            };
            uploader.onAfterAddingFile = function(fileItem) {
                console.info('onAfterAddingFile', fileItem);
            };
            uploader.onAfterAddingAll = function(addedFileItems) {
                console.info('onAfterAddingAll', addedFileItems);
            };
            uploader.onBeforeUploadItem = function(item) {
                item.formData.push({filename: item.file.name});
                console.log('onBeforeUploadItem', item);
                console.info('onBeforeUploadItem', item);
            };
            uploader.onProgressItem = function(fileItem, progress) {
                console.info('onProgressItem', fileItem, progress);
            };
            uploader.onProgressAll = function(progress) {
                console.info('onProgressAll', progress);
            };
            uploader.onSuccessItem = function(fileItem, response, status, headers) {
                console.info('onSuccessItem', fileItem, response, status, headers);
            };
            uploader.onErrorItem = function(fileItem, response, status, headers) {
                console.info('onErrorItem', fileItem, response, status, headers);
            };
            uploader.onCancelItem = function(fileItem, response, status, headers) {
                console.info('onCancelItem', fileItem, response, status, headers);
            };
            uploader.onCompleteItem = function(fileItem, response, status, headers) {
                console.log('onCompleteItem', fileItem, response, status, headers);
                console.info('onCompleteItem', fileItem, response, status, headers);
            };
            uploader.onCompleteAll = function() {
                console.info('onCompleteAll');
            };

            console.info('uploader', uploader);

        }]);