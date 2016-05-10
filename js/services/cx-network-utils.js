'use strict';

/**
 * @ngdoc service
 * @name ndexLinkedNetworkViewerApp.cxNetworkUtils
 * @description
 * # cxNetworkUtils
 * Service in the ndexLinkedNetworkViewerApp.
 */
angular.module('ndexServiceApp')
  .service('cxNetworkUtils', ['ndexHelper', function (ndexHelper) {
      // AngularJS will instantiate a singleton by calling "new" on this function

      var self = this;

      self.rawCXtoNiceCX = function(rawCX) {

          var niceCX = {};

          for (var i = 0; i < rawCX.length; i++) {
              var fragment = rawCX[i];
              if (fragment) {
                  var aspectName;
                  for (aspectName in fragment) {

                      var elements = fragment[aspectName];

                      if (aspectName === 'numberVerification') {

                          if (!niceCX.numberVerification) {
                              niceCX.numberVerification = fragment;
                          }
                          continue;

                      } else if (aspectName === 'status') {

                          if (!niceCX.status) {
                              niceCX.status = fragment;
                          }
                          continue;

                      } else if (aspectName === 'metaData') {

                          if (!niceCX.preMetaData) {

                              niceCX.preMetaData = fragment;

                          } else if (!niceCX.postMetaData) {

                              niceCX.postMetaData = fragment;
                          }
                          continue;
                      }

                      for (var j = 0; j < elements.length; j++) {
                          var element = elements[j];
                          handleCxElement(aspectName, element, niceCX);
                      }
                  }
              }
          }
          
          return niceCX;
      };
      
      self.niceCXToRawCX = function(niceCX) {
        
        var rawCX = [];

          if (niceCX.numberVerification) {
              rawCX.push(niceCX.numberVerification);
          }

          if (niceCX.preMetaData) {
              rawCX.push(niceCX.preMetaData);
          }

          for (var aspectName in niceCX) {

              if ((aspectName === 'preMetaData') || (aspectName === 'postMetaData') ||
                  (aspectName === 'numberVerification') || (aspectName === 'status')) {
                  continue;

              } else if (aspectName === 'nodeAttributes') {

                  var arrayOfNodeIDs = Object.keys(niceCX[aspectName].nodes);

                  for (var j = 0; j <  arrayOfNodeIDs.length; j++) {

                      var nodeId = arrayOfNodeIDs[j];
                      var nodeAttributeMap  = niceCX[aspectName].nodes[nodeId];

                      var arrayOfAttributeNames = Object.keys(nodeAttributeMap);

                      for (var k = 0; k < arrayOfAttributeNames.length; k++) {
                          var attributeName = arrayOfAttributeNames[k];

                          var attributeObject = nodeAttributeMap[attributeName];
                          var nodeAttributeElement = {po : nodeId, n : attributeName, v : attributeObject.v};

                          if (attributeObject.d) {
                              nodeAttributeElement.d = attributeObject.d;
                          }

                          var fragment = {
                              'nodeAttributes': [ nodeAttributeElement ]
                          };

                          rawCX.push(fragment);
                      }
                  }

              } else {

                  var arrayOfElements = niceCX[aspectName].elements;

                  for (var l = 0; l < arrayOfElements.length; l++) {

                      var element = arrayOfElements[l];

                      var fragment1 = {};
                      fragment1[aspectName] = [];
                      fragment1[aspectName].push(element);

                      rawCX.push(fragment1);
                  }
              }
          }

          if (niceCX.postMetaData) {
              rawCX.push(niceCX.postMetaData);
          }

          if (niceCX.status) {
              rawCX.push(niceCX.status);
          }
        
        return rawCX;
      };

      self.setNodeAttribute = function(niceCX, nodeId, attributeName, attributeValue, attributeDataType) {

          if (!attributeName || !attributeValue) {
              return;
          }

          var attributeObject = {v : attributeValue};

          if (attributeDataType) {
              attributeObject.d = attributeDataType;
          }

          if (!niceCX.nodeAttributes) {
              niceCX['nodeAttributes'] = {};
          }
          if (!niceCX.nodeAttributes.nodes) {
              niceCX['nodeAttributes']['nodes'] = {};
          }
          if (!niceCX.nodeAttributes.nodes[nodeId]) {
              niceCX.nodeAttributes.nodes[nodeId] = {};
          }

          niceCX.nodeAttributes.nodes[nodeId][attributeName] =  attributeObject;
      };

      var addElementToNiceCX = function(niceCX, aspectName, element) {

          var aspect = niceCX[aspectName];

          if (!aspect) {
              // add aspect to niceCX
              aspect = {elements: []};

              niceCX[aspectName] = aspect;
          }

          aspect.elements.push(element);
      };



      var handleCxElement = function (aspectName, element, niceCX) {

          var aspect = niceCX[aspectName];

          if (aspectName === 'nodeAttributes') {

              if (!aspect) {
                  aspect = {nodes: {}};

                  niceCX[aspectName] = aspect;
              }

              var nodeMap = aspect.nodes;

              var attributes = nodeMap[element.po];

              if(!attributes){
                  attributes = {};
                  nodeMap[element.po] = attributes;
              }

              attributes[element.n] = {v: element.v, d : element.d};
              
          } else  {
              // opaque for now

              if (!aspect) {
                  // add aspect to niceCX
                  aspect = {elements: []};

                  niceCX[aspectName] = aspect;
              }

              var elementList = aspect.elements;

              elementList.push(element);

          }
      };


      /*-----------------------------------------------------------------------*
       * Convert network received in JSON format to NiceCX;
       * Convert only nodes and edges now.
       *-----------------------------------------------------------------------*/
      self.convertNetworkInJSONToNiceCX = function (network) {

          var niceCX = {};

          $.each(network.nodes, function (nodeId, node) {
              var element = {
                  '@id' : nodeId,
                  'n': (node && node.name) ? node.name : ""
              };

              addElementToNiceCX(niceCX, 'nodes', element);
              
              if (node.aliases && node.aliases.length > 0) {
                  var aliasList = buildAttributesList(network, node.aliases);
                  self.setNodeAttribute(niceCX, nodeId, 'alias', aliasList, 'list_of_string');
              }

              if (node.properties && node.properties.length > 0) {
                  var propertiesList = buildAttributesList(network, node.properties);
                  self.setNodeAttribute(niceCX, nodeId, 'properties', propertiesList, 'list_of_string');
              }

          });

          $.each(network.edges, function (edgeId, edge) {

              var element = {
                  '@id' : edgeId,
                  's' : (edge && edge.subjectId) ? edge.subjectId : "",
                  't' : (edge && edge.objectId) ? edge.objectId : ""
              };

              if (edge.predicateId) {
                  var edgePredicateId = edge.predicateId;

                  if (network.baseTerms && network.baseTerms[edgePredicateId] && network.baseTerms[edgePredicateId]['name']) {
                      element['i'] = network.baseTerms[edgePredicateId]['name'];
                  }
              }

              addElementToNiceCX(niceCX, 'edges', element);
          });

          return niceCX;
      };

      var buildAttributesList = function(network, arrayOfIDs) {
          var attributes = [];

          for (var i = 0; i < arrayOfIDs.length; i++) {
              var baseTermId = arrayOfIDs[i];

              if (network.baseTerms && network.baseTerms[baseTermId] &&
                  network.baseTerms[baseTermId]['name'])
              {
                  attributes.push(network.baseTerms[baseTermId]['name']);
              }
          }
          return attributes;
      }


  }]);
