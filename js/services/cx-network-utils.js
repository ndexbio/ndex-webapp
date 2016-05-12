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
      

      var addNodePropertyToNiceCX = function(niceCX, nodeId, propertyObj) {

          if (!propertyObj) {
              return;
          }

          var attributeName  = (propertyObj['predicateString']) ? propertyObj['predicateString'] : null;
          var attributeValue = (propertyObj['value']) ? propertyObj['value'] : null;
          var attributeType  = (propertyObj['dataType']) ? propertyObj['dataType'] : null;

          self.setNodeAttribute(niceCX, nodeId, attributeName, attributeValue, attributeType);
      };

      var addEdgePropertyToNiceCX = function(niceCX, edgeId, propertyObj) {

          if (!propertyObj) {
              return;
          }

          var po = Number(edgeId);
          var n  = (propertyObj['predicateString']) ? propertyObj['predicateString'] : null;
          var v  = (propertyObj['value']) ? propertyObj['value'] : null;
          var d  = (propertyObj['dataType']) ? propertyObj['dataType'] : null;

          var element = {
              'po': po, 'n' : n, 'v' : v, 'd' : d
          }

          addElementToNiceCX(niceCX, 'edgeAttributes', element);

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

      var addElementToNiceCXForLookup = function(niceCX, aspectName, id, element) {

          if (!aspectName || !id || !element) {
              return;
          }

          var aspect = niceCX[aspectName];

          if (!aspect) {
              // add aspect to niceCX
              aspect = {elements: {}};

              niceCX[aspectName] = aspect;
          }

          aspect.elements[id] = element;
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

          $.each(network.citations, function (citationId, citation) {

              //addElementToNiceCXForLookup(niceCX, 'citations', citationId, citation);

              /* ATTENTION: we still need to process citation.contributors and citation.properties fields */
              if (citation) {

                  var citationElement = {
                      "@id"            : (citation.id)          ? citation.id : null,
                      "dc:identifier"  : (citation.identifier)  ? citation.identifier : null,
                      "dc:title"       : (citation.title)       ? citation.title : null,
                      "dc:type"        : (citation.idType)      ? citation.idType : null,
                      "dc:description" : (citation.description) ? citation.description : null,

                  }
              }

              // ALSO:  do we want to add citationElement as a lookup with citationID as the key --
              // if yest, then use addElementToNiceCXForLookup() below instead of addElementToNiceCX()
              //addElementToNiceCXForLookup(niceCX, 'citations', citationId, citationElement);

              addElementToNiceCX(niceCX, 'citations', citationElement);
          });


          $.each(network.nodes, function (nodeId, node) {
              var element = {
                  '@id' : Number(nodeId),
                  'n': (node && node.name) ? node.name : null
              };

              addElementToNiceCX(niceCX, 'nodes', element);
              
              if (node.aliases && node.aliases.length > 0) {
                  var aliasList = buildListOfAliasIDs(network, node.aliases);
                  self.setNodeAttribute(niceCX, nodeId, 'alias', aliasList, 'list_of_string');
              }


              if (node.properties && node.properties.length > 0) {

                  for (var i = 0; i < node.properties.length; i++) {

                      var propertyObj = node.properties[i];

                      addNodePropertyToNiceCX(niceCX, nodeId, propertyObj);
                  }

              }

          });

          $.each(network.edges, function (edgeId, edge) {

              var element = {
                  '@id' : Number(edgeId),
                  's' : (edge && edge.subjectId) ? edge.subjectId : null,
                  't' : (edge && edge.objectId) ? edge.objectId : null
              };

              if (edge.predicateId) {
                  var edgePredicateId = edge.predicateId;

                  if (network.baseTerms && network.baseTerms[edgePredicateId] && network.baseTerms[edgePredicateId]['name']) {
                      element['i'] = network.baseTerms[edgePredicateId]['name'];
                  }
              }

              addElementToNiceCX(niceCX, 'edges', element);


              if (edge.properties && edge.properties.length > 0) {

                  for (var i = 0; i < edge.properties.length; i++) {

                      var propertyObj = edge.properties[i];

                      addEdgePropertyToNiceCX(niceCX, edgeId, propertyObj);
                  }
              }

              if (edge.citationIds && edge.citationIds.length > 0) {

                  for (var i = 0; i < edge.citationIds.length; i++) {

                      var citationId = edge.citationIds[i];

                      //console.log('citation Id = ' + citationId);


                  }
              }

          });

          return niceCX;
      };

      var buildListOfAliasIDs = function(network, arrayOfIDs) {
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
