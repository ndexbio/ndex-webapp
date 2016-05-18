'use strict';

/**
 * @ngdoc service
 * @name ndexServiceApp.cxNetworkUtils
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


      var addElementToAspactValueMap = function (aspectValueMap, element) {
          var attributes = aspectValueMap[element.po];

          if (!attributes) {
              attributes = {};
              aspectValueMap[element.po] = attributes;
          }

          attributes[element.n] = element;
      };


      var addRelationToRelationAspect = function (aspect, element, relationName) {

          for (var l = 0; l < element.po.length; l++) {
              var srcId = element.po[l];
              var relations = aspect[srcId];
              if ( !relations) {
                  aspect[srcId] = element[relationName];
              } else {
                  aspect[srcId].push.apply(element[relationName]);
              }
          }
      };



      var handleCxElement = function (aspectName, element, niceCX) {

          var aspect = niceCX[aspectName];

          if (!aspect) {
              aspect = {};

              niceCX[aspectName] = aspect;
          }

          switch (aspectName) {
              case 'nodes':
              case 'edges':
              case 'citations':
              case 'supports':
                  aspect[element['@id']] = element;
                  break;
              case 'nodeAttributes':
                  addElementToAspactValueMap(aspect, element);
                  break;
              case 'edgeAttributes':
                  addElementToAspactValueMap(aspect, element);
                  break;
              case 'edgeCitations':
              case 'nodeCitations':
                  addRelationToRelationAspect(aspect,element, 'citations');
                  break;
              case 'edgeSupports':
              case 'nodeSupports':
                  addRelationToRelationAspect(aspect,element,'supports');
                  break;
              default:
                  // opaque for now

                  if (!aspect.elements) {
                      aspect = {elements: []};
                  }

                  var elementList = aspect.elements;

                  elementList.push(element);
          }
      };


      /** utility functions for nice cx */

      self.getNodes = function (niceCX) {
          return _.values(niceCX['nodes']);
      };

      self.getNodeAttributes = function (niceCX) {
          return niceCX['nodeAttributes'];
      };

      self.getEdges = function (niceCX) {
          return _.values(niceCX.edges);
      };

      self.getEdgeAttributes = function (niceCX) {
          return niceCX['edgeAttributes'];
      };

      /*-----------------------------------------------------------------------*
       * Convert network received in JSON format to NiceCX;
       * Convert only nodes and edges now.
       *-----------------------------------------------------------------------*/
      self.convertNetworkInJSONToNiceCX = function (network) {

          var niceCX = {};

          $.each(network.citations, function (citationId, citation) {
              /* ATTENTION: we still need to process citation.contributors and citation.properties fields */

              var citationElement = {
                  "@id"            : citation.id ,
                  "dc:identifier"  : (citation.identifier)  ? citation.identifier : null,
                  "dc:title"       : citation.title,
                  "dc:type"        : (citation.idType)      ? citation.idType : null,
                  "dc:description" : (citation.description) ? citation.description : null,
                  "dc:contributor" : citation.constructor
              };

              // ALSO:  do we want to add citationElement as a lookup with citationID as the key --
              // if yest, then use addElementToNiceCXForLookup() below instead of addElementToNiceCX()
              //addElementToNiceCXForLookup(niceCX, 'citations', citationId, citationElement);

              addElementToNiceCX(niceCX, 'citations', citationElement);
          });


          $.each(network.supports, function (supportId, support) {
              /* ATTENTION: we still need to process citation.contributors and citation.properties fields */

              var supportElement = {
                  "@id"         : supportId ,
                  "text"        : support.text,
                  "citation"    : support.citaitonId

              };

              // ALSO:  do we want to add citationElement as a lookup with citationID as the key --
              // if yest, then use addElementToNiceCXForLookup() below instead of addElementToNiceCX()
              //addElementToNiceCXForLookup(niceCX, 'citations', citationId, citationElement);

              addElementToNiceCX(niceCX, 'supports', supportElement);
          });

          $.each(network.nodes, function (nodeId, node) {
              var element = {
                  '@id' : nodeId,
                  'n': node.name
              };

              if ( node.represents) {
                  if ( node.representsTermType === 'baseTerm') {
                      element['r'] = getBaseTermStr(network,node.represents);
                  } else if ( node.representsTermType === 'functionTerm') {
                  //     var funElement = cvtFuctionTermToCXElmt ( network, node.representsId);
                  //    niceCX.
                  } else {

                  }
              }

              addElementToNiceCX(niceCX, 'nodes', element);
              
              if (node.aliases && node.aliases.length > 0) {
                  var aliasList = buildBasetermStrListFromIDs(network, node.aliases);
                  setNodeAttribute(niceCX, nodeId, 'alias', aliasList, 'list_of_string');
              }

              // related terms...
              if (node.relatedTerms && node.relatedTerms.length > 0) {
                  var relatedToList = buildBasetermStrListFromIDs(network, node.relatedTerms);
                  setNodeAttribute(niceCX, nodeId, 'relatedTo', relatedToList, 'list_of_string');
              }

              //node properties
              if (node.properties && node.properties.length > 0) {

                  for (var i = 0; i < node.properties.length; i++) {

                      var propertyObj = node.properties[i];

                      setNodeAttribute(niceCX,nodeId, propertyObj['predicateString'],propertyObj['value'],
                                propertyObj['dataType']);
                  }

              }

          });

          $.each(network.edges, function (edgeId, edge) {

              var element = {
                  '@id' : Number(edgeId),
                  's' : edge.subjectId,
                  't' : edge.objectId
              };

              if (edge.predicateId) {
                  element ['i'] = getBaseTermStr(network,edge.predicateId);
              }

              addElementToNiceCX(niceCX, 'edges', element);


              if (edge.properties && edge.properties.length > 0) {

                  for (var i = 0; i < edge.properties.length; i++) {

                      var propertyObj = edge.properties[i];

                      setEdgeAttribute(niceCX, edgeId, propertyObj['predicateString'],propertyObj['value'],
                          propertyObj['dataType']);
                  }
              }

              if (edge.citationIds && edge.citationIds.length > 0) {

                  var aspect = niceCX['edgeCitations'];
                  if ( !aspect) {
                      aspect = {};
                      niceCX['edgeCitations'] = aspect;
                  }

                  var oldList = aspect[edgeId];

                  if ( !oldList) {
                      oldList = [];
                  }

                  for (var i = 0; i < edge.citationIds.length; i++) {
                      oldList.push(edge.citationIds[i]);
                  }

              }

              if (edge.supportIds && edge.supportIds.length > 0) {

                  var aspect = niceCX['edgeSupports'];
                  if ( !aspect) {
                      aspect = {};
                      niceCX['edgeSupports'] = aspect;
                  }

                  var oldList = aspect[edgeId];

                  if ( !oldList) {
                      oldList = [];
                  }

                  for (var i = 0; i < edge.supportIds.length; i++) {
                      oldList.push(edge.supportIds[i]);
                  }

              }

          });

          return niceCX;
      };

      /**
       * Stringify a baseterm.
       * @param network
       * @param baseTermId
       * @returns {*}
       */
      var getBaseTermStr = function (network, baseTermId) {
          var bterm = network.baseTerms[baseTermId];
          if ( bterm.namespaceId > 0 ) {
              var ns = network.namespaces[bterm.namespaceId];
              if ( ns.prefix)
                  return ns.prefix + ":" + bterm.name;
              else
                  return ns.uri + bterm.name;
          }
          return bterm.name;
      };

      var addElementToNiceCX = function(niceCX, aspectName, element) {

          var aspect = niceCX[aspectName];

          if (!aspect) {
              // add aspect to niceCX
              aspect = {};

              niceCX[aspectName] = aspect;
          }

          aspect[element['@id']] = element;
      };


      var buildBasetermStrListFromIDs = function(network, arrayOfIDs) {
          var attributes = [];

          for (var i = 0; i < arrayOfIDs.length; i++) {
              var baseTermId = arrayOfIDs[i];
              attributes.push(getBaseTermStr(network, baseTermId));
          }
          return attributes;
      };

      var setNodeAttribute = function(niceCX, nodeId, attributeName, attributeValue, attributeDataType) {

          setCoreAspectAttributes(niceCX, 'nodeAttributes', nodeId, attributeName, attributeValue, attributeDataType);

      };

      var setEdgeAttribute = function (niceCX, edgeId, attributeName,attributeValue, attributeDataType) {
          setCoreAspectAttributes(niceCX, 'edgeAttributes', edgeId, attributeName, attributeValue, attributeDataType);
      };


      var setCoreAspectAttributes = function(niceCX, aspectName, referenceId, attributeName, attributeValue, attributeDataType) {

          var attributeObject = {'v' : attributeValue,
              'd' :  attributeDataType,
              'po' : referenceId,
              'n' : attributeName
          };

          if (!niceCX[aspectName]) {
              niceCX[aspectName] = {};
          }

          if (!niceCX[aspectName][referenceId]) {
              niceCX[aspectName][referenceId] = {};
          }

          niceCX[aspectName][referenceId][attributeName] =  attributeObject;
      };


  }]);
