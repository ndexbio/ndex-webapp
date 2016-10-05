ndexApp.controller('uploadController',
    ['FileUploader', 'ndexService',  'ndexConfigs', 'ndexUtility', 'sharedProperties', '$scope', '$routeParams', '$modal', '$location',
        function(FileUploader, ndexService, ndexConfigs, ndexUtility, sharedProperties, $scope, $routeParams, $modal, $location) {

            $scope.tasks = null;
            $scope.taskSkipBlocks = 0;
            $scope.taskBlockSize = 100;

            $scope.uploadController = {};

            var uploadController = $scope.uploadController;

            var config = angular.injector(['ng', 'ndexServiceApp']).get('config');
            uploadController.uploadSizeLimit = config.uploadSizeLimit;
            uploadController.hasSizeLimit = false;
            if( uploadController.uploadSizeLimit )
            {
                if( uploadController.uploadSizeLimit != "none" )
                    uploadController.hasSizeLimit = true;
            }


            uploadController.fileSizeError = false;
            uploadController.fileExtensionError = false;

            $scope.removeItemFromQueue = function (item){
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                item.remove();
            };

            $scope.removeAllFromQueue = function(uploader){
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                uploader.clearQueue();
            };



            $scope.refreshTasks = function(){
                ndexService.getUserTasks(
                    "ALL",
                    $scope.taskSkipBlocks,
                    $scope.taskBlockSize,
                    // Success
                    function(tasks){
                        ////console.log("Successfully retrieved tasks: " + tasks);
                        $scope.tasks = [];
                        $.each(tasks, function(index, task){
                            if (task.taskType == "PROCESS_UPLOADED_NETWORK"){
                                $scope.tasks.push(task);
                            }
                        });
                    },
                    // Error
                    function(response){
                        //console.log("Failed to retrieve tasks: " + response);
                       //TBD
                    }
                )

            };

            $scope.deleteAllTasks = function()
            {
                if( $scope.tasks == undefined )
                    return;
                for(var i = $scope.tasks.length - 1; i >= 0; i-- )
                {
                    var task = $scope.tasks[i];
                    ndexService.deleteTask(task.externalId,
                        function()
                        {
                        });
                }
                $scope.tasks = [];
            };

            $scope.markTaskForDeletion= function(taskUUID){
                ndexService.setTaskStatus(taskUUID, "QUEUED_FOR_DELETION",
                    function(){
                        $scope.refreshTasks();
                    })
            };

            $scope.deleteTask= function(taskUUID){
                ndexService.deleteTask(taskUUID,
                    function(){
                        $scope.refreshTasks();
                    })
            };

            var uploader = $scope.uploader = new FileUploader({
                url: ndexService.getNetworkUploadURI(),
                alias: "CXNetworkStream",
                headers: {
                    Authorization: "Basic " + ndexConfigs.getEncodedUser()
                }
            });

            //uploader.autoUpload = true;
            uploader.removeAfterUpload = false;


            //Queue size is the amount of data in the queue.
            uploader.queueSize = 0;

            // FILTERS
            // item is {File|FileLikeObject}
            uploader.filters.push({
                name: 'fileExtensionFilter',
                fn: function(item, options){
                    // var allowed = ['xgmml', 'xbel', 'sif', 'owl', 'cx'];
                    // For Releasee 2.0, as of 5 Oct. 2016, only CX format is allowed.
                    var allowed = ['cx'];
                    var ext = item.name.split(".").pop().toLowerCase();
                    return $.inArray(ext, allowed) != -1;
                }
            });

            uploader.filters.push({
                name: 'fileSizeFilter',
                fn: function(item, options)
                {
                    if( !uploadController.hasSizeLimit )
                        return true;
                    this.queueSize = 0;
                    for( var i = 0; i < this.queue.length; i++ )
                    {
                        this.queueSize += this.queue[i].file.size;
                    }
                    var maxSize = this.queueSize + item.size;
                    return maxSize < uploadController.uploadSizeLimit * 1024 * 1024;
                }
            });




            // CALLBACKS

            // /*{File|FileLikeObject}*/
            uploader.onWhenAddingFileFailed = function(item, filter, options) {
                if( filter.name === 'fileExtensionFilter' )
                    uploadController.fileExtensionError = true;
                if( filter.name === 'fileSizeFilter' )
                    uploadController.fileSizeError = true;

                //console.info('onWhenAddingFileFailed', item, filter, options);
            };
            uploader.onAfterAddingFile = function(fileItem) {
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                //console.info('onAfterAddingFile', fileItem);
            };
            uploader.onAfterAddingAll = function(addedFileItems) {
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                //console.info('onAfterAddingAll', addedFileItems);
            };
            uploader.onBeforeUploadItem = function(item) {
                item.formData.push({filename: item.file.name});
                //console.log('onBeforeUploadItem', item);
                //console.info('onBeforeUploadItem', item);
            };
            uploader.onProgressItem = function(fileItem, progress) {
                //console.info('onProgressItem', fileItem, progress);
            };
            uploader.onProgressAll = function(progress) {
                //console.info('onProgressAll', progress);
            };
            uploader.onSuccessItem = function(fileItem, response, status, headers) {
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                //console.info('onSuccessItem', fileItem, response, status, headers);
            };
            uploader.onErrorItem = function(fileItem, response, status, headers) {
                //console.info('onErrorItem', fileItem, response, status, headers);
            };
            uploader.onCancelItem = function(fileItem, response, status, headers) {
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                //console.info('onCancelItem', fileItem, response, status, headers);
            };
            uploader.onCompleteItem = function(fileItem, response, status, headers) {
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                //console.log('onCompleteItem', fileItem, response, status, headers);
                //console.info('onCompleteItem', fileItem, response, status, headers);
            };
            uploader.onCompleteAll = function() {
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                //console.info('onCompleteAll');
                //console.log('onCompleteAll');
                $scope.refreshTasks();
            };

            //console.info('uploader', uploader);

            $scope.refreshTasks();
        }]);