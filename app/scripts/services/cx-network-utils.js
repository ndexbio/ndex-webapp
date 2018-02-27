'use strict';

/**
 * @ngdoc service
 * @name ndexServiceApp.cxNetworkUtils
 * @description
 * # cxNetworkUtils
 * Service in the ndexLinkedNetworkViewerApp.
 */
angular.module('ndexServiceApp')
  .service('cxNetworkUtils', [ function () {
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


      var computePreMetadata = function ( niceCX) {
          var preMetaData=[];
          var d = new Date();
          var currentTime = d.getTime();

          _.forEach( niceCX, function (aspectValues, aspectName) {
              var metadataElement = {
                  "consistencyGroup" : 1,
              //    "elementCount" : aspectValues.length,
                  "lastUpdate" : currentTime,
                  "name" : aspectName,
                  "properties" : [ ],
                  "version" : "1.0"
              };

              if ( aspectName === 'nodes' ||
                   aspectName === 'edges' ||
                   aspectName === 'citations' ||
                   aspectName === 'supports') {
                   var objids = Object.keys(aspectValues);
                   metadataElement['elementCount'] = objids.length;
                   metadataElement["idCounter"] = Number(objids.reduce (function (a,b) {
                      return Number(a) > Number(b) ? a: b;
                    }));
              }

              preMetaData.push (metadataElement);
          });

          return { "metaData": preMetaData };
      };
      
      self.niceCXToRawCX = function(niceCX) {
        
        var rawCX = [];

          if (niceCX.numberVerification) {
              rawCX.push(niceCX.numberVerification);
          } else {
              rawCX.push ({
                  "numberVerification" : [ {
                      "longNumber" : 281474976710655
                  }]});
          }

          if (niceCX.preMetaData) {
              rawCX.push(niceCX.preMetaData);
          } else {
              rawCX.push(computePreMetadata(niceCX));
          }

          for (var aspectName in niceCX) {


              if ((aspectName === 'preMetaData') || (aspectName === 'postMetaData') ||
                  (aspectName === 'numberVerification') || (aspectName === 'status')) {
                  continue;

              }

              var elements= [];

              if ( aspectName === 'nodes' || aspectName === 'edges' ||
                          aspectName === 'citations' || aspectName === 'supports' || aspectName === 'functionTerms') {

                  _.forEach( niceCX[aspectName], function (element, id) {
                      elements.push(element);
                  });
              } else if (aspectName === 'nodeAttributes' || aspectName === 'edgeAttributes') {
                  _.forEach(niceCX[aspectName], function(attributes, id) {
                     _.forEach ( attributes, function (attribute, attrName) {
                         elements.push(attribute);
                     });
                  });

              } else if ( aspectName === 'edgeCitations' || aspectName === 'nodeCitations' ) {
                  _.forEach(niceCX[aspectName], function (citationIds, elementId) {
                      var citation = {'po': [Number(elementId)], 'citations': citationIds} ;
                      elements.push ( citation);
                  });

              } else if ( aspectName === 'edgeSupports' || aspectName === 'nodeSupports') {
                  _.forEach(niceCX[aspectName], function (supportIds, elementId) {
                      var support = {'po': [Number(elementId)], 'supports': supportIds} ;
                      elements.push ( support);
                  });
              }  else {
                  elements = niceCX[aspectName]['elements'];
              }

              if ( elements.length > 0 ) {
                  var fragment = {};
                  fragment[aspectName] = elements;
                  rawCX.push(fragment);
              }
          }

          if (niceCX.postMetaData) {
              rawCX.push(niceCX.postMetaData);
          }

          if (niceCX.status) {
              rawCX.push(niceCX.status);
          } else {
              rawCX.push ( {
                  "status" : [ {
                      "error" : "",
                      "success" : true
                  } ]
              } );
          }
        
        return rawCX;
      };


      var addElementToAspectValueMap = function (aspectValueMap, element) {
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
                  addElementToAspectValueMap(aspect, element);
                  break;
              case 'edgeAttributes':
                  addElementToAspectValueMap(aspect, element);
                  break;
              case 'edgeCitations':
              case 'nodeCitations':
                  addRelationToRelationAspect(aspect,element, 'citations');
                  break;
              case 'edgeSupports':
              case 'nodeSupports':
                  addRelationToRelationAspect(aspect,element,'supports');
                  break;
              case 'functionTerms':
                  aspect[element['po']] = element;
                  break;
              default:
                  // opaque for now

                  if (!aspect.elements) {
                      aspect.elements = [];
                  }
                  
                  aspect.elements.push(element);
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

      var stringifyFunctionTerm = function (functionTerm) {
          var params = [];
          angular.forEach(functionTerm.args, function (parameter) {
              if (parameter.f) {
                  params.push(stringifyFunctionTerm(parameter));
              } else {
                  params.push(parameter);
              }
          });
          return abbreviate(functionTerm.f)+ '(' + params.join(', ') + ')';
      };


      var abbreviate = function (functionName) {
          var pureFunctionName =functionName;
          var arr = functionName.split(':');
          if (arr.length==2)
              pureFunctionName = arr[1];

          switch (pureFunctionName) {
              case 'abundance':
                  return 'a';
              case 'biologicalProcess':
                  return 'bp';
              case 'catalyticActivity':
                  return 'cat';
              case 'cellSecretion':
                  return 'sec';
              case 'cellSurfaceExpression':
                  return 'surf';
              case 'chaperoneActivity':
                  return 'chap';
              case 'complexAbundance':
                  return 'complex';
              case 'compositeAbundance':
                  return 'composite';
              case 'degradation':
                  return 'deg';
              case 'fusion':
                  return 'fus';
              case 'geneAbundance':
                  return 'g';
              case 'gtpBoundActivity':
                  return 'gtp';
              case 'kinaseActivity':
                  return 'kin';
              case 'microRNAAbundance':
                  return 'm';
              case 'molecularActivity':
                  return 'act';
              case 'pathology':
                  return 'path';
              case 'peptidaseActivity':
                  return 'pep';
              case 'phosphateActivity':
                  return 'phos';
              case 'proteinAbundance':
                  return 'p';
              case 'proteinModification':
                  return 'pmod';
              case 'reaction':
                  return 'rxn';
              case 'ribosylationActivity':
                  return 'ribo';
              case 'rnaAbundance':
                  return 'r';
              case 'substitution':
                  return 'sub';
              case 'translocation':
                  return 'tloc';
              case 'transcriptionalActivity':
                  return 'tscript';
              case 'transportActivity':
                  return 'tport';
              case 'truncation':
                  return 'trunc';
              case 'increases':
                  return '->';
              case 'decreases':
                  return '-|';
              case 'directlyIncreases':
                  return '=>';
              case 'directlyDecreases':
                  return '=|';
              default:
                  return pureFunctionName;
          }
      };


      
      var createCXFunctionTerm = function (oldJSONNetwork, jsonFunctionTerm ) {
         var functionTerm = { 'f': getBaseTermStr(oldJSONNetwork , jsonFunctionTerm.functionTermId)};
          var parameters = [];
          _.forEach ( jsonFunctionTerm.parameterIds, function (parameterId) {
              var baseTerm = oldJSONNetwork['baseTerms'][parameterId];
              if ( baseTerm ) {
                  parameters.push ( getBaseTermStr(oldJSONNetwork , parameterId));
              } else {
                  var paraFunctionTerm = oldJSONNetwork['functionTerms'] [parameterId];
                  parameters.push (createCXFunctionTerm(oldJSONNetwork,paraFunctionTerm));
              }
          });
          functionTerm['args'] = parameters;

          return functionTerm;
      };
      
      /*-----------------------------------------------------------------------*
       * Convert network received in JSON format to NiceCX;
       * Convert only nodes and edges now.
       *-----------------------------------------------------------------------*/
      self.convertNetworkInJSONToNiceCX = function (network) {

          var niceCX = {
              'edges': {},
              'nodes': {}
          };

          if (Object.keys(network.namespaces).length > 0) {
              var nstable = {};
              niceCX['@context'] = { 'elements': [nstable]} ;

              $.each(network.namespaces, function (namespaceId, namespace) {
                  nstable[namespace['prefix']] = namespace['uri'];
                  /*  _.forEach(namespace, function (value, prefix) {
                   nstable[prefix] = value;
                   }); */
              });
          }

          if (network.properties) {
              _.forEach(network.properties, function (propertyObj){
                  self.setNetworkProperty(niceCX, propertyObj['predicateString'],propertyObj['value'],
                      propertyObj['dataType'])});
          }

          var functionTermTable = {};  //functionTermId to CXFunctionTerm maping table.
          if ( network.functionTerms) {
              niceCX['functionTerms'] = {};
              _.forEach (network.functionTerms, function (funcTerm, id) {
                  functionTermTable[id] = createCXFunctionTerm(network, funcTerm);
              });
          }

          $.each(network.citations, function (citationId, citation) {
                  /* ATTENTION: we still need to process citation.contributors and citation.properties fields */

                  var citationElement = {
                      "@id": citation.id,
                      "dc:identifier": (citation.identifier) ? citation.identifier : null,
                      "dc:title": citation.title,
                      "dc:type": (citation.idType) ? citation.idType : null,
                      "dc:description": (citation.description) ? citation.description : null,
                      "dc:contributor": citation.constructor
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
                  '@id' : nodeId
              };

              if ( node.name )
                  element['n'] = node.name;

              if ( node.represents) {
                  if ( node.representsTermType === 'baseTerm') {
                      element['r'] = getBaseTermStr(network,node.represents);
                  } else if ( node.representsTermType === 'functionTerm') {
                      var cxFunctionTerm = functionTermTable[node.represents];
                      cxFunctionTerm['po'] = nodeId;
                      niceCX['functionTerms'][nodeId] = cxFunctionTerm;
                  } else {
                    console.log("unsupported termType found in the network ...");
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


              if (node.citationIds && node.citationIds.length > 0) {

                  var aspect = niceCX['nodeCitations'];
                  if ( !aspect) {
                      aspect = {};
                      niceCX['nodeCitations'] = aspect;
                  }

                  var oldList = aspect[nodeId];

                  if ( !oldList) {
                      oldList = [];
                      aspect[nodeId] = oldList;
                  }

                  for (var i = 0; i < node.citationIds.length; i++) {
                      oldList.push(node.citationIds[i]);
                  }

              }

              if (node.supportIds && node.supportIds.length > 0) {

                  var aspect = niceCX['nodeSupports'];
                  if ( !aspect) {
                      aspect = {};
                      niceCX['nodeSupports'] = aspect;
                  }

                  var oldList = aspect[nodeId];

                  if ( !oldList) {
                      oldList = [];
                      aspect[nodeId] = oldList;
                  }

                  for (var i = 0; i < node.supportIds.length; i++) {
                      oldList.push(node.supportIds[i]);
                  }

              }

          });

          $.each(network.edges, function (edgeId, edge) {

              var element = {
                  '@id' : Number(edgeId),
                  's' : edge.subjectId,
                  't' : edge.objectId
              };

              if (edge.predicateId && edge.predicateId>=0) {
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
                      aspect[edgeId] = oldList;
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
                      aspect[edgeId] = oldList;
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
          if ( bterm && bterm.namespaceId && (bterm.namespaceId > 0) ) {
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

          var attributeObject = {'v' :  ( (attributeDataType.substring(0,7) === 'list_of' && typeof attributeValue === 'string') ? JSON.parse(attributeValue) :  attributeValue),
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


       self.setNetworkProperty = function ( niceCX, attributeName, attributeValue, attributeDataType)  {
           var dType = attributeDataType ? attributeDataType : 'string';

           var value = ( (dType.substring(0,7) === 'list_of' && typeof attributeValue === 'string') ? JSON.parse(attributeValue) :  attributeValue);

           var attributes = niceCX['networkAttributes'];
           if (!attributes ) {
               attributes = {'elements':[{'v' : value,
                   'd' :  dType,
                   'n' : attributeName
               }]};
               niceCX['networkAttributes'] = attributes;
           } else {
               var found = false;
               _.forEach ( attributes.elements, function (attr) {
                   if ( attr['n'] === attributeName) {
                       attr['d'] = dType;
                       attr['v'] = value;
                       found = true;
                       return false;
                   }
               });
               if ( !found ) {
                   attributes['elements'].push ({'v' : value,
                       'd' :  dType,
                       'n' : attributeName
                   } );
               }
           }
           
       };


      self.getDefaultNodeLabel = function (niceCX, nodeElement) {
          if (nodeElement.n) {
                 return nodeElement.n;
          } else if (nodeElement.represents) {
             return nodeElement.represents;
          } else if ( niceCX['functionTerms']) {
              var functionTerm = niceCX['functionTerms'][nodeElement['@id']] ;
              if ( functionTerm ) {
                  return stringifyFunctionTerm(functionTerm);
              }
          }

          return nodeElement['@id'];

      };

  }]);
