/****************************************************************************
 * NDEx HTTP Service
 * description  : $http calls to rest server. can do pre-processing here
 * dependencies : $http and ndexConfigs
 * return       : promise with success and error methods
 ****************************************************************************/

var ndexServiceApp = angular.module('ndexServiceApp');

ndexServiceApp.factory('ndexService',
    ['sharedProperties', 'config', 'ndexConfigs', 'ndexUtility', 'ndexHelper', '$http', '$q', '$resource',
        function (sharedProperties, config, ndexConfigs, ndexUtility, ndexHelper, $http, $q, $resource) {
            // define and initialize factory object
            var factory = {};

            var ndexServerURI = config.ndexServerUriV2;
            var ndexServerURIV2 = config.ndexServerUriV2;

            factory.getNdexServerUri = function()
            {
                return ndexServerURIV2;
            };
            
            factory.getNdexServerUriV2 = function()
            {
                return ndexServerURIV2;
            };
            
            factory.getNetworkUploadURI = function () {
                //return ndexServerURI + "/network/upload";
                return ndexServerURIV2 + "/network";
            };

            factory.sendHTTPRequest = function(config, successHandler, errorHandler) {
                $http(config)
                    .success(function(data, status, headers, config, statusText) {
                        successHandler(data, status, headers, config, statusText);
                    })
                    .error(function(error, status, headers, config, statusText) {
                        errorHandler(error, status, headers, config, statusText);
                    })
            }


            /*---------------------------------------------------------------------*
             * Admin
             *---------------------------------------------------------------------*/
            
            factory.getServerStatus = function (format, successHandler, errorHandler) {
                // Server API : Get Server Status
                // /admin/status?format={full|standard}

                var url = "/admin/status";

                if (format) {
                    url = url + "?format=" + format;
                } else {
                    url = url + "?format=standard";
                }

                var config = ndexConfigs.getGetConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };


            /*---------------------------------------------------------------------*
             * User
             *---------------------------------------------------------------------*/

            factory.getUserByUUIDV2 = function (userId) {
                // Server API : Get User By UUID
                // GET /user/{userId}

                var url = "/user/" + userId;
                var config = ndexConfigs.getGetConfigV2(url, null);

                return $http(config);
            };

            var UserResource = $resource(ndexServerURI + '/user/:identifier:action/:subResource/:sub2Resource/:permissions:subId:status/:skipBlocks:membershipDepth/:blockSize',
                //parmaDefaults
                {
                    identifier: '@identifier',
                    action: '@action',
                    subResource: '@subResource',
                    permissions: '@permissions',
                    status: '@status',
                    subId: '@subId',
                    skipBlocks: '@skipBlocks',
                    blockSize: '@blockSize',
                    membershipDepth: '@membershipDepth'
                },
                //actions
                {
                    getApi: {
                        method: 'GET',
                        params:{
                            action: 'api'
                        },
                        isArray: true
                    }
                });

            factory.getUserApi = function(successHandler, errorHandler)
            {
                UserResource.getApi({}, successHandler, errorHandler);
            };

            function handleAuthorizationHeader()
            {
                if (ndexConfigs.getEncodedUser())
                    $http.defaults.headers.common['Authorization'] = 'Basic ' + ndexConfigs.getEncodedUser();
                else
                    $http.defaults.headers.common['Authorization'] = undefined;
            }

            factory.createUserV2 = function (user, successHandler, errorHandler) {
                // Server API: Create User
                // POST /user

                var url = "/user";
                var config = ndexConfigs.getPostConfigV2(url, user);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.deleteUserV2 = function(successHandler, errorHandler){
                // Server API: Delete User
                // DELETE /user/{userId}
                
                var userId = sharedProperties.getCurrentUserId();
                var url = "/user/" + userId ;

                var config = ndexConfigs.getDeleteConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };
            
            factory.updateUserV2 = function (user, successHandler, errorHandler) {
                // Server API: Update User
                // PUT /user/{userId}

                var userId = ndexUtility.getLoggedInUserExternalId();
                var url = "/user/" + userId;

                if (user.website)
                {
                    if( !user.website.startsWith("http") )
                        user.website = "http://" + user.website;
                }

                var config = ndexConfigs.getPutConfigV2(url, user);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getUserByUserNameV2 = function (userName, successHandler, errorHandler) {
                // Server API: Get User By userName
                // GET /user?username={userName}

                var url = "/user?username=" + userName;
                var config = ndexConfigs.getGetConfigV2(url, null);
                
                this.sendHTTPRequest(config, successHandler, errorHandler);
            }

            factory.authenticateUserV2 = function (userName, password, successHandler, errorHandler) {
                // Server API: Authenticate User
                // GET /user?valid=true&setAuthHeader=false

                var url = "/user?valid=true&setAuthHeader=false";
                var headers = {
                    'Authorization': "Basic " + btoa(userName + ":" + password)
                };

                var config = ndexConfigs.getGetConfigV2(url, null);
                config['headers'] = headers;
                this.sendHTTPRequest(config, successHandler, errorHandler);
            }

            factory.changePasswordV2 = function(newPassword, successHandler, errorHandler) {
                // Server API: Change Password
                // PUT /user/{userId}/password

                var userId = sharedProperties.getCurrentUserId();
                var url = "/user/" + userId + "/password";

                var config = ndexConfigs.getPutConfigV2(url, newPassword);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };
            
            factory.emailNewPasswordV2 = function(userId, successHandler, errorHandler) {
                // Server API: Email New Password
                // PUT /user/{userId}/password?forgot=true

                var url = "/user/" + userId + "/password?forgot=true";

                var config = ndexConfigs.getPutConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };
            
            factory.getUserMembershipInGroupV2 = function (userId, groupId, successHandler, errorHandler) {
                // Server API: Get User's Membership in Group
                // GET /user/{userId}/membership?groupid={groupid}
                
                var url = "/user/" + userId + "/membership?groupid=" + groupId;

                var config = ndexConfigs.getGetConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };
            
            factory.getUserGroupMembershipsV2 = function(userId, type, startPage, pageSize, successHandler, errorHandler) {
                // Server API : Get User’s Group Memberships
                // /user/{userid}/membership?type={membershiptype}&start={startPage}&size={pageSize}

                var url = "/user/" + userId + "/membership"; // + permission + "/" + skipBlocks + "/" + blockSize;

                if (type) {
                    url = url + "?type=" + type + "&start=" + startPage + "&size=" + pageSize;
                } else {
                    url = url + "?start=" + startPage + "&size=" + pageSize
                }

                var config = ndexConfigs.getGetConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            }

            factory.getUserPermissionForNetworkV2 = function (userId, networkId, directonly, successHandler, errorHandler) {
                // Server API: Get User's Permission for Network
                // GET /user/{userid}/permission?networkid={networkId}&directonly={true|false}

                var url = "/user/" + userId + "/permission?networkid=" + networkId;
                if (directonly) {
                    url = url + "&directonly=" + directonly
                }
                var config = ndexConfigs.getGetConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
             };

            factory.getUserNetworkPermissionsV2 =
                function(userId, permission, startPage, pageSize, directOnly, successHandler, errorHandler) {
                    // API: Get User's Network Permissions
                    // GET /user/{userid}/permission?permission={permission}&start={startPage}&size={pageSize}&directonly={true|false}

                    var url = "/user/" + userId + "/permission?permission=" + permission;
                    url = url + "&start=" + startPage + "&size=" + pageSize;

                    if (directOnly) {
                        url = url + "&directonly=" + directOnly;
                    }

                    var config = ndexConfigs.getGetConfigV2(url, null);
                    this.sendHTTPRequest(config, successHandler, errorHandler);
                }

            factory.getUserShowCaseNetworksV2 = function (userId, successHandler, errorHandler) {
                // Server API: Get User’s Showcase Networks
                // GET /user/{userid}/showcase

                var url = "/user/" + userId + "/showcase";
                var config = ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getUserAccountPageNetworksV2 = function (userId, successHandler, errorHandler) {
                // Server API: Get User’s Account Page Networks (used for MyAccount page)
                // GET /user/{userid}/networksummary

                var url = "/user/" + userId + "/networksummary";
                var config = ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getAllNetworkSetsOwnedByUserV2 = function (userId, successHandler, errorHandler) {
                // Server API: Get All Network Sets Owned by a User
                // GET /user/{userid}/networksets

                var url = "/user/" + userId + "/networksets";
                var config = ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            /*---------------------------------------------------------------------*
             * Groups
             *---------------------------------------------------------------------*/

            var GroupResource = $resource(ndexServerURI + '/group/:identifier:action/:subResource/:permissionType:subId/:skipBlocks/:blockSize',
                //paramDefaults
                {
                    identifier: '@identifier',
                    action: '@action',
                    subResource: '@subResource',
                    permissionType: '@permissionType',
                    subId: '@subId',
                    skipBlocks: '@skipBlocks',
                    blockSize: '@blockSize'
                },
                //actions
                {
                    getApi: {
                        method: 'GET',
                        params:{
                            action: 'api'
                        },
                        isArray: true
                    }
                }
            );

            factory.getGroupApi = function(successHandler, errorHandler)
            {
                GroupResource.getApi({}, successHandler, errorHandler);
            };

            factory.createGroupV2 = function (group, successHandler, errorHandler) {
                // Server API: Create Group
                // POST /group

                if (group.website)
                {
                    if( !group.website.startsWith("http") )
                        group.website = "http://" + group.website;
                }
                var url = "/group";

                var config = ndexConfigs.getPostConfigV2(url, group);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.updateGroupV2 = function (group, successHandler, errorHandler) {
                // Server API: Update Group
                // PUT /group/{groupid}

                if (group.website)
                {
                    if( !group.website.startsWith("http") )
                        group.website = "http://" + group.website;
                }
                var url = "/group/" + group.externalId;

                var config = ndexConfigs.getPutConfigV2(url, group);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.deleteGroupV2 = function(groupId, successHandler, errorHandler) {
                // Server API: Delete Group
                // DELETE /group/{groupid}

                var url = "/group/" + groupId ;

                var config = ndexConfigs.getDeleteConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getGroupV2 = function (groupId, successHandler, errorHandler) {
                // Server API: Get a Group
                // /group/{groupid}
                var url = "/group/" + groupId;

                var config = ndexConfigs.getGetConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.addOrUpdateGroupMemberV2 = function (groupId, userId, type, successHandler, errorHandler) {
                // Server API: Add or Update a Group Member
                // /group/{groupid}/membership?userid={userid}&type={GROUPADMIN|MEMBER}

                var url = "/group/" + groupId + "/membership?userid=" + userId + "&type=" + type;
                var config = ndexConfigs.getPutConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.removeGroupMemberV2 = function (groupId, userId, successHandler, errorHandler) {
                // Server API: Remove a Group Member
                // /group/{groupid}/membership?userid={userid}

                var url = "/group/" + groupId + "/membership?userid=" + userId;
                var config = ndexConfigs.getDeleteConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getMembersOfGroupV2 = function(groupId, type, start, size, successHandler, errorHandler) {
                // API: Get Members of a Group
                // GET /group/{groupid}/membership?type={membershiptype}&start={start}&size={size}

                var url = "/group/" + groupId + "/membership";

                if (type) {
                    url = url + "?type=" + type + "&start=" + start + "&size=" + size;
                } else {
                    url = url + "?start=" + start + "&size=" + size;
                }
                var config = ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            }

            factory.getNetworkPermissionsOfGroupV2 =
                function(groupId, permission, startPage, pageSize, successHandler, errorHandler) {
                    // API: Get Network Permissions of a Group
                    // GET /group/{groupid}/permission?permission={permission}&start={startPage}&size={pageSize}

                    var url = "/group/" + groupId + "/permission?permission=" + permission;
                    url = url + "&start=" + startPage + "&size=" + pageSize;

                    var config = ndexConfigs.getGetConfigV2(url, null);

                    this.sendHTTPRequest(config, successHandler, errorHandler);
                }


            /*---------------------------------------------------------------------*
             * Requests
             *---------------------------------------------------------------------*/

            var RequestResource = $resource(ndexServerURI + '/request/:action:identifier',
                //paramDefaults
                {
                },
                //actions
                {
                    getApi: {
                        method: 'GET',
                        params:{
                            action: 'api'
                        },
                        isArray: true
                    }
                }
            );

            factory.getRequestApi = function(successHandler, errorHandler)
            {
                RequestResource.getApi({}, successHandler, errorHandler);
            };

            factory.createMembershipRequestV2 = function (request, successHandler, errorHandler) {
                // Server API: Create Membership Request
                // POST /user/{userid}/membershiprequest

                var postData = {
                    "groupid" : request["destinationUUID"],
                    "type" : request["permission"]
                };

                if (request["message"]) {
                    postData["message"] = request["message"];
                }

                var url = "/user/" + request["sourceUUID"] + "/membershiprequest";
                var config = ndexConfigs.getPostConfigV2(url, postData);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };


            /*---------------------------------------------------------------------*
             * Tasks
             *---------------------------------------------------------------------*/

            var TaskResource = $resource(ndexServerURI + '/task/:taskId/:action/:status/',
                //paramDefaults
                {
                    taskId: '@taskId',
                    status: '@statusType'
                },
                //actions
                {
                    getApi: {
                        method: 'GET',
                        params:{
                            action: 'api'
                        },
                        isArray: true
                    }
                }
            );

            factory.getTaskApi = function(successHandler, errorHandler)
            {
                TaskResource.getApi({}, successHandler, errorHandler);
            };

            factory.getUserTasksV2 = function (status, startPage, pageSize, successHandler, errorHandler) {
                // Server API: Get User's Tasks
                // GET /task?status={status}&start={startPage}&size={pageSize}

                if (!status) {
                    status = "ALL";
                }

                var url = "/task?status=" + status + "&start=" + startPage + "&size=" + pageSize ;

                var config = ndexConfigs.getGetConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.deleteTaskV2 = function (taskId, successHandler, errorHandler) {
                // Server API: Delete A Task
                // DELETE /task/{taskid}

                var url = "/task/" + taskId;
                var config = ndexConfigs.getDeleteConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            /*---------------------------------------------------------------------*
             * Request and Response
             *---------------------------------------------------------------------*/

            factory.createUserPermissionRequestV2 = function (userUUID, userPermissionRequest, successHandler, errorHandler) {
                // Server API: Create User Permission Request
                // POST /user/{userId}/permissionrequest

                var url = "/user/" + userUUID + "/permissionrequest";
                var config = ndexConfigs.getPostConfigV2(url, userPermissionRequest);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.createGroupPermissionRequestV2 = function (groupUUID, groupPermissionRequest, successHandler, errorHandler) {
                // Server API: Create Group Permission Request
                // POST /group/{groupId}/permissionrequest

                var url = "/group/" + groupUUID + "/permissionrequest";
                var config = ndexConfigs.getPostConfigV2(url, groupPermissionRequest);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getUserPermissionRequestsV2 = function (userUUID, type, successHandler, errorHandler) {
                // Server API: Get a User’s Permission Requests
                // GET /user/{userId}/permissionrequest?type={sent|received}

                var url = "/user/" + userUUID + "/permissionrequest";

                if (type && ((type.toLowerCase() == "sent") || (type.toLowerCase() == "received"))) {
                    url = url + "?type=" + type;
                }

                var config =  ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getUserMembershipRequestsV2 = function (userUUID, type, successHandler, errorHandler) {
                // Server API: Get a User’s Membership Requests
                // GET /user/{userId}/membershiprequest?type={sent|received}

                var url = "/user/" + userUUID + "/membershiprequest";

                if (type && ((type.toLowerCase() == "sent") || (type.toLowerCase() == "received"))) {
                    url = url + "?type=" + type;
                }

                var config =  ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.acceptOrDenyPermissionRequestV2 = function (recipientId, requestId, action, message, successHandler, errorHandler) {
                // Server API: Accept or Deny a permission request
                // PUT /user/{recipient_id}/permissionrequest/{requestid}?action={accept|deny}&message={message}

                var url =
                    "/user/" + recipientId + "/permissionrequest/" + requestId +
                    "?action=" + action + "&message=" + message;

                var config = ndexConfigs.getPutConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.acceptOrDenyMembershipRequestV2 = function (recipientId, requestId, action, message, successHandler, errorHandler) {
                // Server API: Accept or Deny a membership request
                // PUT /user/{recipient_id}/membershiprequest/{requestid}?action={accept|deny}&message={message}

                var url =
                    "/user/" + recipientId + "/membershiprequest/" + requestId +
                    "?action=" + action + "&message=" + message;

                var config = ndexConfigs.getPutConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.deleteRequestV2 = function (request, successHandler, errorHandler) {
                // Server API: Delete a Permission Request or Delete a Membership Request (depending on request.requestType)
                //    DELETE /user/{sender_id}/permissionrequest/{requestid}
                // or DELETE /user/{sender_id}/membershiprequest/{requestid}

                if (!request && !request.requestType) {
                    errorHandler()
                }

                var senderId  = request.requesterId;
                var requestId = request.externalId;
                var type      = (request.requestType.toLowerCase() == 'usernetworkaccess') ? 'permissionrequest' :
                    'membershiprequest';

                var url = "/user/" + senderId + "/" + type + "/" + requestId;

                var config =  ndexConfigs.getDeleteConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            /*---------------------------------------------------------------------*
             * Networks
             *---------------------------------------------------------------------*/
            var NetworkResource = $resource(ndexServerURI + '/network/:identifier:action/:subResource/:permissionType:subId:subAction/:skipBlocks/:blockSize',
                //paramDefaults
                {
                    identifier: '@identifier',
                    action: '@action',
                    subResource: '@subResource',
                    permissionType: '@permissionType',
                    subId: '@subId',
                    skipBlocks: '@skipBlocks',
                    blockSize: '@blockSize',
                    subAction: '@subAction'
                },
                //actions
                {
                    getApi: {
                        method: 'GET',
                        params:{
                            action: 'api'
                        },
                        isArray: true
                    },
                    getNamespaces: {
                        method: 'GET',
                        params: {
                            subResource: 'namespace'
                        },
                        isArray: true
                    },
                    addNamespace: {
                        method: 'POST',
                        params: {
                            subResource: 'namespace'
                        }
                    },
                    archiveBelNamespaces: {
                        method: 'PUT',
                        params: {
                            subResource: 'attachNamespaceFiles'
                        }
                    },
                    getNumberOfBelNetworkNamespaces: {
                        method: 'GET',
                        params: {
                            subResource: 'metadata'
                        }
                    }
                }
            );

            /* -------------------------- old 1.3 methods  ---------------------------- */
            factory.getNetworkApi = function(successHandler, errorHandler)
            {
                NetworkResource.getApi({}, successHandler, errorHandler);
            };
            factory.addNamespaceToNetwork = function(externalId, namespace, successHandler, errorHandler) {
                handleAuthorizationHeader();
                NetworkResource.addNamespace({identifier: externalId}, namespace, successHandler, errorHandler)
            };
            factory.getNetworkNamespaces = function(externalId, successHandler, errorHandler) {
                handleAuthorizationHeader();
                NetworkResource.getNamespaces({identifier: externalId}, successHandler, errorHandler)
            };
            factory.archiveBelNamespaces = function(externalId, successHandler, errorHandler) {
                handleAuthorizationHeader();
                NetworkResource.archiveBelNamespaces({identifier: externalId}, null, successHandler, errorHandler);
            };
            factory.getNumberOfBelNetworkNamespaces = function(externalId, successHandler, errorHandler) {
                handleAuthorizationHeader();
                NetworkResource.getNumberOfBelNetworkNamespaces({identifier: externalId}, null, successHandler, errorHandler);
            };
            /* -------------------------- older 1.3 methods  -------------------------- */


            factory.deleteNetworkV2 = function(networkId, successHandler, errorHandler) {
                // Server API: Delete a Network
                // DELETE /network/{networkId}

                var url = "/network/" + networkId;
                var config = ndexConfigs.getDeleteConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getNetworkSummaryV2 = function (networkId, accesskey) {
                // Server API: Get Network Summary
                // GET /network/{networkid}/summary?accesskey={accessKey}

                // The $http timeout property takes a deferred value that can abort AJAX request
                var deferredAbort = $q.defer();

                var url = "/network/" + networkId + "/summary?setAuthHeader=false";

                if (accesskey) {
                    url = url + "&accesskey=" + accesskey;
                };

                var config = ndexConfigs.getGetConfigV2(url, null);
                config.timeout = deferredAbort.promise;

                // We keep a reference ot the http-promise. This way we can augment it with an abort method.
                var request = $http(config);

                // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
                request.abort = function () {
                    deferredAbort.resolve();
                };

                // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
                request.finally(
                    function () {
                        request.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = null;
                    }
                );

                return request;
            };

            factory.getCompleteNetworkInCXV2 = function(networkId, download, successHandler, errorHandler) {
                // Server API: Get Complete Network in CX
                // GET /network/{networkId}?download=[true|false]

                var url = "/network/" + networkId;

                if (download) {
                    url = url + "?download=true"
                }
                var config = ndexConfigs.getGetConfigV2(url, null);
                
                this.sendHTTPRequest(config, successHandler, errorHandler);
            }
            
            factory.setNetworkSystemPropertiesV2 = function(networkId, property, value, successHandler, errorHandler) {
                // Server API: Set Network System Properties
                // PUT /network/{networkId}/systemproperty

                var url = "/network/" + networkId + "/systemproperty";
                var putData = {};
                putData[property] = value;
                var config = ndexConfigs.getPutConfigV2(url, putData);

                $http(config)
                    .success(function(data)
                    {
                        // note that we need to pass the Id of network back in order to correctly update
                        // visibility of network in the Table while performing Bulk Change Visibility
                        successHandler(data, networkId, property, value);
                    })
                    .error(function(data)
                    {
                        errorHandler(data, networkId, property, value);
                    });
            };

            factory.getAllPermissionsOnNetworkV2 = function(networkId, type, permission, startPage, size, successHandler, errorHandler) {
                // calls NetworkServiceV2.getNetworkUserMemberships server API at
                // /network/{networkID}/permission?type={user|group}&start={startPage}&size={size}

                var url = "/network/" + networkId + "/permission?type=" + type;

                if (permission) {
                    url = url + "&permission=" + permission;
                }
                url = url + "&start=" + startPage + "&size=" + size;

                var config = ndexConfigs.getGetConfigV2(url, null);

                $http(config)
                    .success(function(data)
                    {
                        // note that we need to pass the Id of network back to the caller
                        successHandler(data, networkId);
                    })
                    .error(function(data)
                    {
                        errorHandler(data, networkId);
                    });
            }

            factory.updateNetworkPermissionV2 = function (networkId, type, resourceId, permission, successHandler, errorHandler) {
                // Server API: Update Network Permission
                // PUT /network/{networkid}/permission?(userid={uuid}|groupid={uuid})&permission={permission}

                var url = "/network/" + networkId + "/permission?";
                if (type == 'user') {
                    url = url + 'userid=';
                } else if (type == 'group') {
                    url = url + 'groupid=';
                }
                url = url + resourceId + '&permission=' + permission;

                var config = ndexConfigs.getPutConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.deleteNetworkPermissionV2 = function (networkId, type, resourceId, successHandler, errorHandler) {
                // Server API: Delete Network Permission
                // DELETE /network/{networkid}/permission?(userid={uuid}|groupid={uuid})

                var url = "/network/" + networkId + "/permission?";
                if (type == 'user') {
                    url = url + 'userid=';
                } else if (type == 'group') {
                    url = url + 'groupid=';
                }
                url = url + resourceId;
                var config = ndexConfigs.getDeleteConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.setNetworkPropertiesV2 = function(networkId, properties, successHandler, errorHandler) {
                // Server API: Set Network Properties
                // PUT /network/{networkId}/properties

                var url = "/network/" + networkId + "/properties";
                var config = ndexConfigs.getPutConfigV2(url, properties);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.updateNetworkProfileV2 = function (networkId, profile, successHandler, errorHandler) {
                // Server API: Update Network Profile
                // PUT /network/{networkId}/profile

                var url = "/network/" + networkId + "/profile";
                var config = ndexConfigs.getPutConfigV2(url, profile);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };
            
            factory.getNetworkProvenanceV2 = function (networkId, successHandler, errorHandler) {
                // Server API: Get Network Provenance
                // GET /network/{networkId}/provenance

                var url = "/network/" + networkId + "/provenance";
                var config = ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.setNetworkProvenanceV2 = function(networkId, provenance, successHandler, errorHandler) {
                // Server API: Set Network Provenance
                // PUT /network/{networkId}/provenance

                var url = "/network/" + networkId + "/provenance";
                var config = ndexConfigs.getPutConfigV2(url, provenance);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getNetworkAspectAsCXV2 = function(networkId, aspectName, size, successHandler, errorHandler) {
                // Server API: Get a Network Aspect As CX
                // GET /network/{networkid}/aspect/{aspectName}?size={limit}

                var url = "/network/" + networkId + "/aspect/" + aspectName;
                if (size) {
                    url = url + "?size=" + size;
                }
                var config = ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getAccessKeyOfNetworkV2 = function(networkId, successHandler, errorHandler) {
                // Server API: Get Access Key of Network
                // GET /network/{networkid}/accesskey
                var url = "/network/" + networkId + "/accesskey";
                var config = ndexConfigs.getGetConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };


            factory.disableOrEnableAccessKeyOnNetworkV2 = function(networkId, action, successHandler, errorHandler) {
                // Server API: Disable/enable Access Key on Network
                // PUT /{networkid}/accesskey?action=disable|enable
                var url = "/network/" + networkId + "/accesskey?action=" + action;
                var config = ndexConfigs.getPutConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            /*---------------------------------------------------------------------*
             * Network Sets
             *---------------------------------------------------------------------*/
            factory.createNetworkSetV2 = function (networkSet, successHandler, errorHandler) {
                // Server API: Create A Network Set
                // POST /networkset

                var url = "/networkset";

                var config = ndexConfigs.getPostConfigV2(url, networkSet);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.updateNetworkSetV2 = function (networkSetId, networkSet, successHandler, errorHandler) {
                // Server API: Update A Network Set
                // PUT /networkset/{networksetId}

                var url = "/networkset/" + networkSetId;

                var config = ndexConfigs.getPutConfigV2(url, networkSet);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.deleteNetworkSetV2 = function (networkSetId, successHandler, errorHandler) {
                // Server API: Delete A Network Set
                // DELETE /networkset/{networksetId}

                var url = "/networkset/" + networkSetId;

                var config = ndexConfigs.getDeleteConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getNetworkSetV2 = function(networkSetId, accesskey, successHandler, errorHandler) {
                // API: Get a Network Set
                // GET /networkset/{networkSetId}?accesskey={accesskey}

                var url = "/networkset/" + networkSetId;

                if (accesskey) {
                    url = url + "?accesskey=" + accesskey;
                };

                var config = ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.addNetworksToNetworkSetV2 = function(networkSetId, networkIds, successHandler, errorHandler) {
                // API: Add Networks to Network Set
                // POST /networkset/{networkSetId}/members

                var url = "/networkset/" + networkSetId + "/members";

                var config = ndexConfigs.getPostConfigV2(url, networkIds);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.deleteNetworksFromNetworkSetV2 = function(networkSetId, networkIds, successHandler, errorHandler) {
                // API: Delete Networks from Network Set
                // DELETE /networkset/{networkSetId}/members

                var url = "/networkset/" + networkSetId + "/members";

                var config = ndexConfigs.getDeleteConfigV2(url, networkIds);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.getAccessKeyOfNetworkSetV2 = function(networkSetId, successHandler, errorHandler) {
                // API: Get Access Key of a  Network Set
                // GET /networkset/{networkSetId}/accesskey

                var url = "/networkset/" + networkSetId + "/accesskey";

                var config = ndexConfigs.getGetConfigV2(url, null);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.disableOrEnableAccessKeyOnNetworkSetV2 = function(networkSetId, action, successHandler, errorHandler) {
                // Server API: Disable/enable Access Key on Network Set
                // PUT /{networksetid}/accesskey?action=disable|enable
                var url = "/networkset/" + networkSetId + "/accesskey?action=" + action;
                var config = ndexConfigs.getPutConfigV2(url, null);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.updateNetworkSetSystemPropertiesV2 = function(networkSetId, property, value, successHandler, errorHandler) {
                // Server API: Update Network Set System Properties
                // PUT /networkset/{networkSetId}/systemproperty

                var url = "/networkset/" + networkSetId + "/systemproperty";
                var putData = {};
                putData[property] = value;
                var config = ndexConfigs.getPutConfigV2(url, putData);

                $http(config)
                    .success(function(data)
                    {
                        // note that we need to pass the Id of network back in order to correctly update
                        // visibility of network in the Table while performing Bulk Change Visibility
                        successHandler(data, networkSetId, property, value);
                    })
                    .error(function(data)
                    {
                        errorHandler(data, networkSetId, property, value);
                    });
            };

            /*---------------------------------------------------------------------*
             * Batch Operations
             *---------------------------------------------------------------------*/
            factory.getUsersByUUIDsV2 = function(usersUUIDsList) {
                // Server API: Get Users By UUIDs
                // GET /batch/user

                var url = "/batch/user";
                var config = ndexConfigs.getPostConfigV2(url, usersUUIDsList);

                var deferredAbort = $q.defer();

                config.timeout = deferredAbort.promise;

                // We keep a reference ot the http-promise. This way we can augment it with an abort method.
                var request = $http(config);

                // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
                request.abort = function () {
                    deferredAbort.resolve();
                };

                // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
                request.finally(
                    function () {
                        request.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = null;
                    }
                );

                return request;
            }

            factory.getGroupsByUUIDsV2 = function(UUIDs) {
                // Server API: Get Groups By UUIDs
                // POST /batch/group

                var postData = UUIDs;
                var url = "/batch/group";
                var config = ndexConfigs.getPostConfigV2(url, postData);

                var deferredAbort = $q.defer();

                config.timeout = deferredAbort.promise;

                // We keep a reference ot the http-promise. This way we can augment it with an abort method.
                var request = $http(config);

                // The $http service uses a deferred value for the timeout. Resolving the value will abort the AJAX request
                request.abort = function () {
                    deferredAbort.resolve();
                };

                // Let's make garbage collection smoother. This cleanup is performed once the request is finished.
                request.finally(
                    function () {
                        request.abort = angular.noop; // angular.noop is an empty function
                        deferredAbort = request = null;
                    }
                );

                return request;
            }

            factory.getNetworkSummariesByUUIDsV2 = function(networksUUIDsList, accesskey, successHandler, errorHandler) {
                // Server API: Get Network Summaries by UUIDs
                // POST /network/summaries?accesskey={accesskey}

                var url = "/batch/network/summary";
                if (accesskey) {
                    url = url + "?accesskey=" + accesskey;
                };

                var config = ndexConfigs.getPostConfigV2(url, networksUUIDsList);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            }

            factory.exportNetworksV2 = function (networkExportFormat, listOfNetworkIDs, successHandler, errorHandler)
            {
                // Server API: Export Networks
                // POST /network/export
                // The structure of the export POST request is:
                //      {
                //          "networkFormat": "cx",
                //          "networkIds":  [a list of network UUIDs]
                //      }

                var url = "/batch/network/export";

                var postData = {};
                postData["exportFormat"] = networkExportFormat;
                postData["networkIds"] = listOfNetworkIDs;

                var config = ndexConfigs.getPostConfigV2(url, postData);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            /*---------------------------------------------------------------------*
             * Search
             *---------------------------------------------------------------------*/
            factory.searchUsersV2 = function (searchString, skipBlocks, blockSize, successHandler, errorHandler) {
                // Server API: Search Users
                // POST /search/user?start={number}&size={number}

                if (searchString == null) {
                    searchString = '';
                }

                var url = "/search/user?start=" + skipBlocks + "&size=" + blockSize;
                var postData = {
                    searchString: searchString
                };

                var config = ndexConfigs.getPostConfigV2(url, postData);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.searchGroupsV2 = function (searchString, skipBlocks, blockSize, successHandler, errorHandler) {
                // Server API: Search Groups
                // POST /search/group?start={skipBlocks}&size={blockSize}

                if (searchString == null) {
                    searchString = '';
                }

                var url = "/search/group?start=" + skipBlocks + "&size=" + blockSize;
                var postData = {
                    searchString: searchString
                };

                var config = ndexConfigs.getPostConfigV2(url, postData);
                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.searchNetworksV2 = function (query, start, size, successHandler, errorHandler) {
                // Server API: Search Networks
                // POST /search/network?start={number}&size={number}

                if (query.searchString == null)
                    query.searchString = '';

                var url = "/search/network?start=" + start + "&size=" + size;
                var config = ndexConfigs.getPostConfigV2(url, query);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            factory.searchNetworksByGeneProteinV2 = function (query, start, size, successHandler, errorHandler) {
                // Server API: Search Networks by Gene/Protein
                // POST /search/network/genes?start={number}&size={number}

                if (query.searchString == null)
                    query.searchString = '';

                var url = "/search/network/genes?start=" + start + "&size=" + size;
                var config = ndexConfigs.getPostConfigV2(url, query);

                this.sendHTTPRequest(config, successHandler, errorHandler);
            };

            // return factory object
            return factory;
        }]);

/****************************************************************************
 * NDEx Utility Service
 ****************************************************************************/
ndexServiceApp.factory('ndexUtility', function () {

    var factory = {};

    factory.networks = []; //revise: meant for saving multiple networks


    /*-----------------------------------------------------------------------*
     * user credentials and ID
     *-----------------------------------------------------------------------*/
    factory.clearUserCredentials = function () {
        localStorage.removeItem('loggedInUser');
        localStorage.clear();
    };

    factory.checkLocalStorage = function () {
        if (!localStorage) return false;
        return true;
    };

    factory.getUserCredentials = function () {
        if (factory.checkLocalStorage()) {
            if (localStorage.loggedInUser) {
                var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
                if (loggedInUser == null)
                    return null;
                var userData = {
                    userName: loggedInUser.userName,
                    externalId: loggedInUser.externalId,
                    token: loggedInUser.token
                };
                return userData;
            };
        };
        return null;
    };

    factory.setUserPassword = function (password) {
        var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) loggedInUser = {};
        loggedInUser.token = password;
        localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
    };

    factory.setUserInfo = function (accountName, firstName, lastName, externalId, password) {
        var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) loggedInUser = {};
        loggedInUser.userName  = accountName;
        loggedInUser.firstName = firstName;
        loggedInUser.lastName  = lastName;
        loggedInUser.externalId = externalId;
        loggedInUser.token = password;
        localStorage.setItem('loggedInUser', JSON.stringify(loggedInUser));
    };

    factory.getLoggedInUserExternalId = function () {
        var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) {
            return null;
        };
        return (loggedInUser.externalId) ? loggedInUser.externalId : null;
    };

    factory.getLoggedInUserAccountName = function () {
        var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) {
            return null;
        };
        return (loggedInUser.userName) ? loggedInUser.userName : null;
    };

    factory.getLoggedInUserFirstAndLastNames = function () {
        var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) loggedInUser = {};
        return loggedInUser.firstName + " " + loggedInUser.lastName;
    };

    factory.getLoggedInUserFirstNames = function () {
        var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) {
            return null;
        };
        return loggedInUser.firstName ? loggedInUser.firstName : null;
    };
    
    factory.getLoggedInUserAuthToken = function () {
        var loggedInUser = JSON.parse(localStorage.getItem('loggedInUser'));
        if (!loggedInUser) {
            return null;
        };
        return (loggedInUser.token) ? loggedInUser.token : null;
    };


    factory.getEncodedUser = function () {
        var userCredentials = ndexUtility.getUserCredentials();

        if (!userCredentials || !userCredentials['userName'] || !userCredentials['token']) {
            return null;
        };

        return btoa(userCredentials['userName'] + ":" + userCredentials['token']);
    };
    

    /*-----------------------------------------------------------------------*
     * networks
     *-----------------------------------------------------------------------*/
    factory.addNetwork = function (network) {
        factory.networks.push(network);
        network.terms = {};

        $.each(network.baseTerms, function (termId, term) {
            term.network = network;
            network.terms[termId] = term;
        });
        $.each(network.functionTerms, function (termId, term) {
            term.network = network;
            network.terms[termId] = term;
        });
        $.each(network.reifiedEdgeTerms, function (termId, term) {
            term.network = network;
            network.terms[termId] = term;
        });
        $.each(network.nodes, function (nodeId, node) {
            node.network = network;
        });
        $.each(network.edges, function (edgeId, edge) {
            edge.network = network;
        });
        network.nodeCount = Object.keys(network.nodes).length;
        network.edgeCount = Object.keys(network.edges).length;
    };

    factory.setNetwork = function (network) {
        factory.networks = [];
        factory.addNetwork(network);
    };

    factory.getNetworkId = function (network) {
        return factory.networks.indexOf(network);
    };

    factory.removeNetwork = function (network) {
        factory.networks.remove(factory.networks.indexOf(network));
    };

    return factory;
});

/****************************************************************************
 * $http configuration service
 ****************************************************************************/
ndexServiceApp.factory('ndexConfigs', function (config, ndexUtility) {
    var factory = {};

    var ndexServerURI = config.ndexServerUri;
    var ndexServerURIV2 = config.ndexServerUriV2;


    /*---------------------------------------------------------------------*
     * GET request configuration
     *---------------------------------------------------------------------*/
    factory.getGetConfigV2 = function (url, queryArgs) {
        var config = {
            method: 'GET',
            url: ndexServerURIV2 + url,
            headers: {
                //Authorization: "Basic " + factory.getEncodedUser()
            }
        };
        if( factory.getEncodedUser() )
        {
            config['headers']['Authorization'] = "Basic " + factory.getEncodedUser();
        }
        else
        {
            config['headers']['Authorization'] = undefined;
        }
        if (queryArgs) {
            config.data = JSON.stringify(queryArgs);
        }
        return config;
    };

    /*---------------------------------------------------------------------*
     * POST request configuration
     *---------------------------------------------------------------------*/
    factory.getPostConfigV2 = function (url, postData) {
        var config = {
            method: 'POST',
            url: ndexServerURIV2 + url,
            data: angular.toJson(postData),
            headers: {}
        };
        if( factory.getEncodedUser() )
        {
            config['headers']['Authorization'] = "Basic " + factory.getEncodedUser();
        }
        else
        {
            config['headers']['Authorization'] = undefined;
        }
        return config;
    };

/*
    factory.getPostConfigAdvQueryV2 = function (url, postData) {

        var config = {
            method: 'POST',
            //url: ndexServerURIV2 + url,
            url: 'http://0.0.0.0:8072' + url,
            data: angular.toJson(postData),
            headers: {}
        };

        if( factory.getEncodedUser() )
        {
            config['headers']['Authorization'] = "Basic " + factory.getEncodedUser();
        }
        else
        {
            config['headers']['Authorization'] = undefined;
        };

        return config;
    };
    */

    /*---------------------------------------------------------------------*
     * PUT request configuration
     *---------------------------------------------------------------------*/
    factory.getPutConfigV2 = function (url, putData) {
        var config = {
            method: 'PUT',
            url: ndexServerURIV2 + url,
            //data: angular.toJson(putData),
            headers: {}
        };
        if( factory.getEncodedUser() )
        {
            config['headers']['Authorization'] = "Basic " + factory.getEncodedUser();
        }
        else
        {
            config['headers']['Authorization'] = undefined;
        }
        if (putData) {
            if (typeof putData == "string") {
                config.data = putData;
            } else {
                config.data = JSON.stringify(putData);
            };
        }
        return config;
    };
    
    /*---------------------------------------------------------------------*
     * DELETE request configuration
     *---------------------------------------------------------------------*/
    factory.getDeleteConfigV2 = function (url, deleteData) {
        var config = {
            method: 'DELETE',
            url: ndexServerURIV2 + url,
            headers: {}
        };
        if( factory.getEncodedUser() )
        {
            config['headers']['Authorization'] = "Basic " + factory.getEncodedUser();
        }
        else
        {
            config['headers']['Authorization'] = undefined;
        }
        if (deleteData) {
            if (typeof deleteData == "string") {
                config.data = deleteData;
            } else {
                config.data = JSON.stringify(deleteData);
                // we must specify comntent type as application/json when setting body of HTTP DELETE request;
                // if we do not do that, then the contents type will be set to text/plain and the call will fail
                config['headers']['Content-Type'] = 'application/json';
            };
        };
        return config;
    };
    
    /*---------------------------------------------------------------------*
     * Returns the user's credentials as required by Basic Authentication base64
     * encoded.
     *---------------------------------------------------------------------*/
    factory.getEncodedUser = function () {
        var userCredentials = ndexUtility.getUserCredentials();

        if (!userCredentials || !userCredentials['userName'] || !userCredentials['token']) {
            return null;
        };

        return btoa(userCredentials['userName'] + ":" + userCredentials['token']);
    };

    return factory;
});

/****************************************************************************
 * NDEx Helper Service
 ****************************************************************************/
ndexServiceApp.factory('ndexHelper', function () {
    var factory = {};

    /*-----------------------------------------------------------------------*
     * create a nice label for a node
     *-----------------------------------------------------------------------*/
    factory.updateNodeLabels = function (network) {
        network.nodeLabelMap = [];
        $.each(network.nodes, function (id, node) {
            network.nodeLabelMap[id] = factory.getNodeLabel(node, network);
        });
    };

    factory.getNodeLabel = function (node, network) {
        //if (!network) network = factory.getNodeNetwork(node);
        if ("name" in node && node.name && node.name != "") {
            ////console.log(node.name);
            return node.name;
        }
        else if ("represents" in node && node.represents &&
            network && network.terms && network.terms[node.represents]){
            
            // calculate termType here
            var termType;
            if ("representsTermType" in node){
                termType = node.representsTermType;
            } else if ("functionTermId" in node.represents){
                termType = "functionTerm"
            } else if ("name" in node.represents){
                termType = "BaseTerm";
            } else {
                return "unknown"
            }
            return factory.getTermLabel(network.terms[node.represents], termType, network);
        } else {
            return "unknown";
        }
    };

    factory.getNodeNetwork = function (node) {
        //TODO
        return {};
    };

/*
    factory.updateTermLabels = function (network) {
        network.termLabelMap = [];
        var count = 0;
        $.each(network.terms, function (id, term) {
            if (term.termType === "Base") {
                network.termLabelMap[count] = factory.getTermBase(term, network);
                count++;
            }
        });
    };
*/

    factory.getTermBase = function (term, network) {
        if (term.namespaceId) {
            var namespace = network.namespaces[term.namespaceId];

            if (!namespace || namespace.prefix === "LOCAL")
                return {prefix: 'none', name: term.name};
            else if (!namespace.prefix)
                return {prefix: '', name: term.name};
            else
                return {prefix: namespace.prefix, name: term.name};
        }
        else {
            return term.name;
        }

    };

    /*-----------------------------------------------------------------------*
     * Builds a term label based on the term type; labels rely on Base Terms,
     * which have names and namespaces. Function Terms can refer to other
     * Function Terms or Base Terms, and as such must be traversed until a Base
     * Term is reached.
     *-----------------------------------------------------------------------*/
    factory.getTermLabel = function (term, termType, network) {
        //if (!network) network = factory.getTermNetwork(term);
        if (termType === "baseTerm") {
            if (term.namespaceId) {
                var namespace = network.namespaces[term.namespaceId];

                if (!namespace || namespace.prefix === "LOCAL")
                    return term.name;
                else if (!namespace.prefix)
                    return namespace.uri + term.name;
                else
                    return namespace.prefix + ":" + term.name;
            }
            else
                return term.name;
        }
        else if (termType === "functionTerm") {
            var baseTermForFunction = network.terms[term.functionTermId];
            if (!baseTermForFunction) {
                ////console.log("no functionTerm by id " + term.functionTermId);
                return;
            }

            var functionLabel = factory.getTermLabel(baseTermForFunction, "baseTerm", network);
            functionLabel = factory.lookupFunctionAbbreviation(functionLabel);

            var sortedParameters = factory.getDictionaryKeysSorted(term.parameterIds);
            var parameterList = [];

            for (var parameterIndex = 0; parameterIndex < sortedParameters.length; parameterIndex++) {
                var parameterId = term.parameterIds[sortedParameters[parameterIndex]];
                var parameterTerm = network.terms[parameterId];

                var parameterTermType;
                if ("functionTermId" in parameterTerm){
                    parameterTermType = "functionTerm"
                } else {
                    parameterTermType = "baseTerm";
                }

                if (parameterTerm)
                    var parameterLabel = factory.getTermLabel(parameterTerm, parameterTermType, network);
                //else
                //    //console.log("no parameterTerm by id " + parameterId);

                parameterList.push(parameterLabel);
            }

            return functionLabel + "(" + parameterList.join(", ") + ")";
        }
        else if (termType === "reifiedEdgeTerm") {

            var subjectLabel   = factory.getNodeLabelForReifiedEdge(network, term, 'subjectId');
            var predicateLabel = factory.getPredicateLabelForReifiedEdge(network, term);
            var objectLabel    = factory.getNodeLabelForReifiedEdge(network, term, 'objectId');

            return subjectLabel + " " + predicateLabel + " " + objectLabel;
        }
        else
            return "Unknown Term Type: " + termType;
    };

    factory.getPredicateLabelForReifiedEdge = function(network, term) {
        var predicateLabel = "Predicate Undefined;"

        if ((typeof network === 'undefined') || (typeof network.edges === 'undefined')  ||
            (typeof term === 'undefined') || (typeof term.edgeId === 'undefined') ||
            (typeof network.edges[term.edgeId] === 'undefined') ||
            (typeof network.edges[term.edgeId].predicateId === 'undefined'))
        {
            return predicateLabel;
        }

        var predicateId = network.edges[term.edgeId].predicateId;

        if ((typeof network.terms === 'undefined') ||
            (typeof network.terms[predicateId] === 'undefined')) {
            return predicateLabel;
        }

        var termWithFoundPredicateId = network.terms[predicateId];

        predicateLabel = factory.getTermLabel(termWithFoundPredicateId, "baseTerm", network);

        return predicateLabel;
    }


    factory.getNodeLabelForReifiedEdge = function(network, term, type) {
        var nodeLabel = "Label: N/A";
        var subjectUnknown = "Subject Unknown;"
        var objectUnknown = "Object Unknown;"

        if ((typeof network === 'undefined') || (typeof network.edges === 'undefined')  ||
            (typeof term === 'undefined') || (typeof term.edgeId === 'undefined') ||
            (typeof network.edges[term.edgeId] === 'undefined'))
        {
            if (type === 'subjectId') {
                return subjectUnknown;
            } else if (type === 'objectId') {
                return objectUnknown;
            }
            return nodeLabel;
        }

        if (type === 'subjectId') {

            if (typeof network.edges[term.edgeId].subjectId === 'undefined') {
                return subjectUnknown;
            }

            var subjectId = network.edges[term.edgeId].subjectId;
            nodeLabel     = factory.getNodeLabel(network.nodes[subjectId], network);

        } else if (type === 'objectId') {

            if (typeof  network.edges[term.edgeId].objectId === 'undefined') {
                return objectUnknown;
            }
            var objectId  = network.edges[term.edgeId].objectId;
            nodeLabel     =  factory.getNodeLabel(network.nodes[objectId], network);
        }

        return nodeLabel;
    }

    factory.getTermNetwork = function (term) {
        //TODO
        return {};
    }


    /*-----------------------------------------------------------------------*
     * Returns the keys of a dictionary as a sorted array.
     *-----------------------------------------------------------------------*/
    factory.getDictionaryKeysSorted = function (dictionary) {
        var keys = [];
        for (var key in dictionary) {
            if (dictionary.hasOwnProperty(key))
                keys.push(key);
        }

        return keys.sort();
    };

    /*-----------------------------------------------------------------------*
     * Looks-up abbreviations for term functions.
     *-----------------------------------------------------------------------*/
    factory.lookupFunctionAbbreviation = function (functionLabel) {
        var fl = functionLabel;
        if (fl.match(/^bel:/)) fl = fl.replace(/^bel:/, '');
        switch (fl) {
            case "abundance":
                return "a";
            case "biologicalProcess":
                return "bp";
            case "catalyticActivity":
                return "cat";
            case "cellSecretion":
                return "sec";
            case "cellSurfaceExpression":
                return "surf";
            case "chaperoneActivity":
                return "chap";
            case "complexAbundance":
                return "complex";
            case "compositeAbundance":
                return "composite";
            case "degradation":
                return "deg";
            case "fusion":
                return "fus";
            case "geneAbundance":
                return "g";
            case "gtpBoundActivity":
                return "gtp";
            case "kinaseActivity":
                return "kin";
            case "microRNAAbundance":
                return "m";
            case "molecularActivity":
                return "act";
            case "pathology":
                return "path";
            case "peptidaseActivity":
                return "pep";
            case "phosphateActivity":
                return "phos";
            case "proteinAbundance":
                return "p";
            case "proteinModification":
                return "pmod";
            case "reaction":
                return "rxn";
            case "ribosylationActivity":
                return "ribo";
            case "rnaAbundance":
                return "r";
            case "substitution":
                return "sub";
            case "translocation":
                return "tloc";
            case "transcriptionalActivity":
                return "tscript";
            case "transportActivity":
                return "tport";
            case "truncation":
                return "trunc";
            default:
                return fl;
        }
    };

    return factory;
});

/****************************************************************************
 * NDEx Cytoscape Service
 ****************************************************************************/
//     ndexServiceApp.factory('ndexService', ['ndexConfigs', 'ndexUtility', 'ndexHelper', '$http', '$q', function (ndexConfigs, ndexUtility, ndexHelper, $http, $q) {

ndexServiceApp.factory('cytoscapeService', ['ndexService', 'ndexHelper', '$q', function (ndexService, ndexHelper, $q) {
    var factory = {};
    var cy;

    /*-----------------------------------------------------------------------*
     * initialize the cytoscape instance
     *-----------------------------------------------------------------------*/
    factory.initCyGraph = function () {
        var deferred = $q.defer();

        // elements
        var eles = [];

        $(function () { // on dom ready

            cy = cytoscape({
                container: $('#canvas')[0],

                style: cytoscape.stylesheet()
                    .selector('node')
                    .css({
                        'content': 'data(name)',
                        'height': 10,
                        'width': 10,
                        'text-valign': 'center',
                        'background-color': 'orange',
                        'font-size': 8,
                        //'text-outline-width': 2,
                        //'text-outline-color': 'blue',
                        'color': 'black'
                    })
                    .selector('edge')
                    .css({
                        'target-arrow-shape': 'triangle'
                    })
                    .selector(':selected')
                    .css({
                        'background-color': 'white',
                        'line-color': 'black',
                        'target-arrow-color': 'black',
                        'source-arrow-color': 'black',
                        'text-outline-color': 'black'
                    }),

                layout: {
                 //padding: 10
                    name: 'circle',
                    padding: 10
                },

                elements: eles,

                ready: function () {
                    deferred.resolve(this);

                    // add listener behavior later...
                    //cy.on('cxtdrag', 'node', function(e){
                    //    var node = this;
                    //    var dy = Math.abs( e.cyPosition.x - node.position().x );
                    //    var weight = Math.round( dy*2 );
                    //
                    //    node.data('weight', weight);
                    //
                    //    fire('onWeightChange', [ node.id(), node.data('weight') ]);
                    //});

                }
            });

        }); // on dom ready

        return deferred.promise;
    }; 

    /*-----------------------------------------------------------------------*
     * Set a network to be displayed in the viewer
     *-----------------------------------------------------------------------*/
    factory.setNetwork = function (network) {
        // build the new elements structure
        var elements = {nodes: [], edges: []};

        $.each(network.nodes, function (index, node) {
            var label = ndexHelper.getNodeLabel(node, network);
            var cyNode = {data: {id: "n" + index, name: label}};
            elements.nodes.push(cyNode);

        });

        $.each(network.edges, function (index, edge) {
            var cyEdge = {data: {source: "n" + edge.subjectId, target: "n" + edge.objectId}};
            elements.edges.push(cyEdge);
        });


        cy = cytoscape({
            container: $('#canvas')[0],

            style: cytoscape.stylesheet()
                .selector('node')
                .css({
                    'content': 'data(name)',
                    'height': 10,
                    'width': 10,
                    'text-valign': 'center',
                    'background-color': 'orange',
                    'font-size': 8,
                    //'text-outline-width': 2,
                    //'text-outline-color': 'blue',
                    'color': 'black'
                })
                .selector('edge')
                .css({
                    'target-arrow-shape': 'triangle'
                })
                .selector(':selected')
                .css({
                    'background-color': 'white',
                    'line-color': 'black',
                    'target-arrow-color': 'black',
                    'source-arrow-color': 'black',
                    'text-outline-color': 'black'
                }),

            layout: {
                //padding: 10
                name: 'circle',
                padding: 10
            },

            elements: elements,

            ready: function () {
                window.cy = this;
            }
        });


        // set the cytoscsape instance elements
        //cy.load(elements);
        //cy.fit();
        //cy.forceRender();

    };
    

    return factory;
}]);


/****************************************************************************
 * NDEx Provenance Visualizer Service
 ****************************************************************************/
ndexServiceApp.factory('provenanceVisualizerService', ['ndexService', 'ndexHelper', '$q', function (ndexService, ndexHelper, $q) {
    var factory = {};
    var cy;
    var elements;
    var elementIndex = 0;

    /*-----------------------------------------------------------------------*
     * Set a provenance structure to be displayed in the viewer
     *-----------------------------------------------------------------------*/
    factory.setProvenance = function (provenanceRoot) {
        // build the new elements structure
        elements = {nodes: [], edges: []};
        elementIndex = 0;
        processProvenanceEntity(provenanceRoot);
        // set the cytoscsape instance elements
        cy.load(elements);

    };

    factory.makeProvenanceEntity = function (uri) {
        return {
            uri: uri
        }
    };

    factory.makeProvenanceEvent = function (eventType) {
        return {
            eventType: eventType,
            inputs: []
        }
    };

    factory.createFakeProvenance = function () {
        var fakeRoot = this.makeProvenanceEntity("www.example.com/fakeThing");
        var fakeEvent1 = this.makeProvenanceEvent("Transform");
        fakeRoot.creationEvent = fakeEvent1;
        var fakeThing2 = this.makeProvenanceEntity("www.example.com/fakeThing2");
        fakeEvent1.inputs.push(fakeThing2);
        var fakeEvent2 = this.makeProvenanceEvent("Copy");
        fakeThing2.creationEvent = fakeEvent2;
        var fakeThing3 = this.makeProvenanceEntity("www.example.com/fakeThing3");
        fakeEvent2.inputs.push(fakeThing3);
        return fakeRoot;

    };

    var processProvenanceEntity = function (pEntity, parentEventNode) {
        // Make the node for the entity
        var entityLabel;
        if (null == pEntity) {
            entityLabel = "Error: Null Entity";
        } else {
            entityLabel = pEntity.uri; //getProperty("dc:title", pEntity.properties);
        }
        elementIndex = elementIndex + 1;
        var entityNode = {
            data: {
                id: "n" + elementIndex,
                name: entityLabel
            }};
        elements.nodes.push(entityNode);

        // if there is a parentEventNode, link it to the entityNode
        if (parentEventNode != null) {
            var eventToEntityEdge = {
                data: {
                    target: parentEventNode.data.id,
                    source: entityNode.data.id}
            }
            elements.edges.push(eventToEntityEdge);
        };

        // if there is a creation event:
        if (pEntity && pEntity.creationEvent) {
            // Create the node for the event
            var eventLabel = pEntity.creationEvent.eventType;
            elementIndex = elementIndex + 1;
            var eventNode = {
                data: {
                    id: "n" + elementIndex,
                    name: eventLabel
                }};

            // Link the entityNode to the eventNode
            var entityToEventEdge = {
                data: {
                    target: entityNode.data.id,
                    source: eventNode.data.id
                }};

            elements.nodes.push(eventNode);
            elements.edges.push(entityToEventEdge);

            // get the event inputs.
            // for each input, call processProvenanceEntity and link the returned node to the event
            if (pEntity.creationEvent.inputs) {
                $.each(pEntity.creationEvent.inputs, function (index, inputEntity) {
                    processProvenanceEntity(inputEntity, eventNode);

                });
            }
        }
    };

    /*-----------------------------------------------------------------------*
     * initialize the cytoscape instance
     *-----------------------------------------------------------------------*/
    factory.initCyGraph = function () {
        var deferred = $q.defer();

        // elements
        var eles = [];

        $(function () { // on dom ready

            cy = cytoscape({
                container: $('#provenanceCanvas')[0],

                style: cytoscape.stylesheet()
                    .selector('node')
                    .css({
                        'content': 'data(name)',
                        'height': 10,
                        'width': 10,
                        'text-valign': 'center',
                        'background-color': 'lightgreen',
                        'font-size': 8,
                        //'text-outline-width': 2,
                        //'text-outline-color': 'blue',
                        'color': 'black'
                    })
                    .selector('edge')
                    .css({
                        'target-arrow-shape': 'triangle'
                    })
                    .selector(':selected')
                    .css({
                        'background-color': 'white',
                        'line-color': 'black',
                        'target-arrow-color': 'black',
                        'source-arrow-color': 'black',
                        'text-outline-color': 'black'
                    }),

                layout: {
                    name: 'breadthfirst',
                    directed: false,
                    fit: true,
                    roots: '#n1',
                    padding: 10
                },

                elements: eles,

                ready: function () {
                    deferred.resolve(this);

                    // add listener behavior later...
                    //cy.on('cxtdrag', 'node', function(e){
                    //    var node = this;
                    //    var dy = Math.abs( e.cyPosition.x - node.position().x );
                    //    var weight = Math.round( dy*2 );
                    //
                    //    node.data('weight', weight);
                    //
                    //    fire('onWeightChange', [ node.id(), node.data('weight') ]);
                    //});

                }
            });

        }); // on dom ready

        return deferred.promise;
    };


    return factory;

}]);