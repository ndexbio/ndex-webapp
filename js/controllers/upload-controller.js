ndexApp.controller('uploadController',
    ['FileUploader', 'ndexService',  'ndexConfigs', 'ndexUtility', 'sharedProperties', '$scope', '$routeParams', '$modal',
        function(FileUploader, ndexService, ndexConfigs, ndexUtility, sharedProperties, $scope, $routeParams, $modal) {

            $scope.tasks = null;
            $scope.taskSkipBlocks = 0;
            $scope.taskBlockSize = 100;

            $scope.uploadController = {};
            var uploadController = $scope.uploadController;
            uploadController.fileSizeError = false;
            uploadController.fileExtensionError = false;

            $scope.removeItemFromQueue = function (item){
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                item.remove();
            }

            $scope.removeAllFromQueue = function(uploader){
                uploadController.fileExtensionError = false;
                uploadController.fileSizeError = false;
                uploader.clearQueue();
            }



            $scope.refreshTasks = function(){
                ndexService.getUserTasks(
                    sharedProperties.getCurrentUserId(),
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
                        cTasks = $scope.tasks; // convenience variable
                    },
                    // Error
                    function(response){
                        //console.log("Failed to retrieve tasks: " + response);
                       //TBD
                    }
                )

            }

            $scope.markTaskForDeletion= function(taskUUID){
                ndexService.setTaskStatus(taskUUID, "QUEUED_FOR_DELETION",
                    function(){
                        $scope.refreshTasks();
                    })
            }

            $scope.deleteTask= function(taskUUID){
                ndexService.deleteTask(taskUUID,
                    function(){
                        $scope.refreshTasks();
                    })
            }

            var uploader = $scope.uploader = new FileUploader({
                url: ndexService.getNetworkUploadURI(),
                alias: "fileUpload",
                headers: {
                    Authorization: "Basic " + ndexConfigs.getEncodedUser()
                }
            });

            //uploader.autoUpload = true;
            uploader.removeAfterUpload = true;


            //Queue size is the amount of data in the queue.
            uploader.queueSize = 0;

            // FILTERS
            // item is {File|FileLikeObject}
            uploader.filters.push({
                name: 'customFilter',
                fn: function(item , options) {
                    return this.queue.length < 10;
                }
            });

            uploader.filters.push({
                name: 'fileExtensionFilter',
                fn: function(item, options){
                    var allowed = ['xgmml', 'xbel', 'sif'];
                    var ext = item.name.split(".").pop().toLowerCase();
                    return $.inArray(ext, allowed) != -1;
                }
            });

            uploader.filters.push({
                name: 'fileSizeFilter',
                fn: function(item, options)
                {
                    this.queueSize = 0;
                    for( var i = 0; i < this.queue.length; i++ )
                    {
                        this.queueSize += this.queue[i].file.size;
                    }
                    var maxSize = this.queueSize + item.size;
                    return maxSize < 10000000;
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