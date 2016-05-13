//'use strict';   //comment out this line because Safari doesn' allow using const in strict mood.

/**
 * @ngdoc service
 * @name ndexCravatWebappApp.cyService
 * @description
 * # cyService
 * Service in the ndexCravatWebappApp.
 */
angular.module('ndexServiceApp')
    .factory('cyService', ['$q', function ($q) {

        // Public API here: the factory object will be returned
        var factory = {};
        var cy;
        var selectionContainer = {};

        // Original position will be used when layout positions are available
        const DEF_LAYOUT = 'preset';

        // Layout to be used when there is no layout information
        const DEF_NO_LAYOUT = 'cose';


        const DEF_VISUAL_STYLE = [
            {
                selector: 'node',
                style: {
                    'background-color': 'rgb(0, 220, 200)',
                    'background-opacity': 0.8,
                    'width': '40px',
                    'height': '40px',
                    'label': 'data(name)',
                    'font-family': 'Roboto, sans-serif'
                }
            },
            {
                selector: 'edge',
                style: {
                    'line-color': '#aaaaaa',
                    'width': '2px',
                    'label': 'data(interaction)',
                    'font-family': 'Roboto, sans-serif',
                    'text-opacity': 0.8
                }
            },
            {
                selector: 'node:selected',
                style: {
                    'background-color': 'yellow'
                }
            },
            {
                selector: 'edge:selected',
                style: {
                    'line-color': 'yellow',
                    'width': 6
                }
            }
        ];

        factory.getDefaultStyle = function () {
            return DEF_VISUAL_STYLE;
        };

        var getCyAttributeName = function (attributeName, attributeNameMap) {

            var cyAttributeName = attributeNameMap[attributeName];

            // handle attribute names that conflict with reserved names used by cyjs

            // The attributeNameMap maps attribute names in niceCX to attribute names in cyjs.
            // In some cases, such as 'id', 'source', and 'target', cyjs uses reserved names and
            // any attribute names that conflict must be mapped.
            // Also, cyjs requires that attribute names avoid special characters, so names with
            // special characters must be transformed and mapped.

            // This function updates the attributeNameMap if a new mapping is required

            if (!cyAttributeName) {
                attributeNameMap[attributeName] = attributeName; // direct mapping
                cyAttributeName = attributeName;
            }

            return cyAttributeName;

        };

        const CX_NUMBER_DATATYPES = ['boolean','byte','char', 'double', 'float', 'integer', 'long', 'short'];


        factory.cyElementsFromNiceCX = function (niceCX, attributeNameMap) {

            var elements = {};

            var nodeList = [];
            var nodeMap = {};
            var edgeList = [];
            var edgeMap = {};

            elements.nodes = nodeList;
            elements.edges = edgeList;

            // handle node aspect
            if (niceCX.nodes) {
                _.forEach(niceCX.nodes.elements, function (nodeElement) {
                    var cxNodeId = nodeElement['@id'];
                    var nodeData = {'id': cxNodeId};
                    if (nodeElement.n) {
                        nodeData.name = nodeElement.n;
                    }
                    if (nodeElement.represents) {
                        nodeData.represents = nodeElement.represents;
                    }
                    nodeMap[cxNodeId] = {data: nodeData};
                });
            }

            // handle nodeAttributes aspect
            // Note that nodeAttributes elements are handled specially in niceCX as a map of maps!!
            if (niceCX.nodeAttributes) {
                // for each node id
                _.forEach(niceCX.nodeAttributes.nodes, function (nodeAttributeMap, nodeId) {
                    var node = nodeMap[nodeId];
                    if (node) {
                        _.forEach(nodeAttributeMap, function (attributeObject, attributeName) {
                            var cyAttributeName = getCyAttributeName(attributeName, attributeNameMap);
                            var dataType = attributeObject.d;
                            if (dataType && _.includes(CX_NUMBER_DATATYPES, dataType)){
                                node.data[cyAttributeName] = parseFloat(attributeObject.v);
                            } else {
                                // Default to String
                                node.data[cyAttributeName] = attributeObject.v;
                            }
                        });
                    }
                });
            }

            // handle cartesianCoordinates aspect
            if (niceCX.cartesianLayout) {
                _.forEach(niceCX.cartesianLayout.elements, function (element) {
                    var nodeId = element.node;
                    var node = nodeMap[nodeId];
                    node.position = {x: element.x, y: element.y};
                });
            }

            // handle edge aspect
            if (niceCX.edges) {
                _.forEach(niceCX.edges.elements, function (element) {
                    var cxEdgeId = element['@id'];
                    var edgeData = {
                        id: cxEdgeId,
                        source: element.s,
                        target: element.t
                    };

                    if (element.i) {
                        edgeData.interaction = element.i;
                    }

                    edgeMap[cxEdgeId] = {data: edgeData};
                });
            }

            // handle edgeAttributes aspect
            // Note that edgeAttributes elements are just in a list in niceCX for the moment!!
            if (niceCX.edgeAttributes) {
                _.forEach(niceCX.edgeAttributes.elements, function (element) {
                    var edgeId = element.po;
                    var edge = edgeMap[edgeId];
                    var cyAttributeName = getCyAttributeName(element.n, attributeNameMap);
                    var dataType = element.d;
                    if (dataType && _.includes(CX_NUMBER_DATATYPES, dataType)){
                        edge.data[cyAttributeName] = parseFloat(element.v);
                    } else {
                        // Default to String
                        edge.data[cyAttributeName] = element.v;
                    }

                });
            }

            // output the nodeMap to the nodeList
            _.forEach(nodeMap, function (node) {
                nodeList.push(node);
            });

            // output the edgeMap to the edgeList
            _.forEach(edgeMap, function (edge) {
                edgeList.push(edge);
            });

            return elements;

            // #10 Need to Override ID if exists
            //​ *ID*​ has a special meaning in Cytoscape.js and if such attribute is available in CX, it should be replaced to something else.
            // This should be handled carefully because it breaks graph topology if not correctly converted.

            /*

             #15 Implement object position parser and serializer
             Cytoscape uses a special parser/serializer for object position (mainly for label position).  Need to design and implement such function in this converter to handle label positions.


             #16 Replace invalid characters in column names

             This should be done in both attribute names ​_and_​ controlling attribute name in style object.

             replaceInvalid = regexp.MustCompile(`^[^a-zA-Z_]+|[^a-zA-Z_0-9]+`)

             In JavaScript, some of the characters has special meanings.  For example, '.' is used to specify properties of an object, like:

             ```var label = node.label;
             ```

             If CX contains attribute names containing such characters, it breaks Cytoscape.js.  The converter find and replace all of them before converting the actual data.
             */



        };

        var cyColorFromCX = function (hex) {
            hex = hex.replace('#', '');
            var r = parseInt(hex.substring(0, 2), 16);
            var g = parseInt(hex.substring(2, 4), 16);
            var b = parseInt(hex.substring(4, 6), 16);

            return 'rgb(' + r + ',' + g + ',' + b + ')';
        };

        var cyNumberFromString = function (string) {
            return parseFloat(string);
        };

        // Opacity conversion
        // convert from 0-255 to 0-1.
        var cyOpacityFromCX = function (string) {
            var trans = parseInt(string);
            return Math.round(trans / 255);
        };

        // "COL=interaction,T=string,K=0=binds,V=0=#3300FF,K=1=isa,V=1=#FF0000"
        // "COL=interaction,T=string,K=0=binds,V=0=NONE,K=1=isa,V=1=ARROW"
        // "COL=weight,T=double,L=0=1.0,E=0=1.0,G=0=1.0,OV=0=0.0,L=1=8.0,E=1=8.0,G=1=1.0,OV=1=70.0"
        var parseMappingDefinition = function (definition) {
            var items = definition.split(',');
            var mapping = {};
            var def = {m: mapping};
            _.forEach(items, function (item) {
                item = item.trim();
                var vals = item.split('=');
                var v0 = vals[0];
                var v1 = vals[1];
                if (vals.length > 2) {
                    var v2 = vals[2];
                    var m = mapping[v1];
                    if (!m) {
                        m = {};
                        mapping[v1] = m;
                    }
                    m[v0] = v2;
                } else {
                    def[v0] = v1;
                }
            });
            return def;
        };

        const NODE_SHAPE_MAP = {
            'RECTANGLE': 'rectangle',
            'ROUND_RECTANGLE': 'roundrectangle',
            'TRIANGLE': 'triangle',
            'PARALLELOGRAM': 'rectangle',
            'DIAMOND': 'diamond',
            'ELLIPSE': 'ellipse',
            'HEXAGON': 'hexagon',
            'OCTAGON': 'octagon',
            'VEE':	'vee'
        };

        const ARROW_SHAPE_MAP = {
            'T': 'tee',
            'DELTA' : 'triangle',
            'CIRCLE' : 'circle',
            'DIAMOND': 'diamond',
            'ARROW': 'triangle',
            'HALF_BOTTOM': 'triangle',
            'HALF_TOP': 'triangle',
            'NONE': 'none'
        };

        const LINE_STYLE_MAP = {
            'SOLID': 'solid',
            'DOT': 'dotted',
            'DASH_DOT': 'dotted',
            'LONG_DASH': 'dashed',
            'EQUAL_DASH': 'dashed'
        };

        const TEXT_ALIGN_MAP = {
            'C' : 'center',
            'T' : 'top',
            'B' : 'bottom',
            'L' : 'left',
            'R' : 'right'
        };

        var getTextAlign = function(align){
            if (!align){
                return 'center';
            }
            var ta = TEXT_ALIGN_MAP[align];
            if (ta){
                return ta;
            }
            return 'center';
        };

        const visualPropertyMap = {

            'NODE_FILL_COLOR': {'att': 'background-color', 'type': 'color'},
            'NODE_TRANSPARENCY': {'att': 'background-opacity', 'type': 'opacity'},
            'NODE_SHAPE': {'att': 'shape', 'type': 'nodeShape'},
            'NODE_WIDTH': {'att': 'width', 'type': 'number'},
            'NODE_HEIGHT': {'att': 'height', 'type': 'number'},
            'NODE_BORDER_PAINT': {'att': 'border-color', 'type': 'color'},
            'NODE_BORDER_TRANSPARENCY': {'att': 'border-opacity', 'type': 'opacity'},
            'NODE_BORDER_WIDTH': {'att': 'border-width', 'type': 'number'},

            'NODE_LABEL': {'att': 'content', 'type': 'string'},
            'NODE_LABEL_COLOR': {'att': 'color', 'type': 'color'},
            'NODE_LABEL_FONT_SIZE': {'att': 'font-size', 'type': 'number'},
            'NODE_LABEL_TRANSPARENCY': {'att': 'text-opacity', 'type': 'opacity'},

            'EDGE_WIDTH': {'att' : 'width', 'type': 'number'},
            'EDGE_LABEL': {'att': 'label', 'type': 'string'},
            'EDGE_LABEL_COLOR': {'att': 'color', 'type': 'color'},
            'EDGE_LABEL_FONT_SIZE': {'att': 'font-size', 'type': 'number'},
            'EDGE_LABEL_FONT_FACE': {'att': 'font-size', 'type': 'fontFamily'},
            'EDGE_LABEL_TRANSPARENCY': {'att': 'text-opacity', 'type': 'opacity'},
            'EDGE_LINE_TYPE': {'att': 'line-style', 'type': 'line'},
            'EDGE_STROKE_UNSELECTED_PAINT': {'att': 'line-color', 'type': 'color'},
            'EDGE_UNSELECTED_PAINT': {'att': 'line-color', 'type': 'color'},
            'EDGE_TRANSPARENCY': {'att': 'opacity', 'type': 'opacity'},
            'EDGE_SOURCE_ARROW_SHAPE': {'att': 'source-arrow-shape', 'type': 'arrow'},
            'EDGE_TARGET_ARROW_SHAPE': {'att': 'target-arrow-shape', 'type': 'arrow'}
        };

        var getCyVisualAttributeForVP = function (vp) {
            var attProps = visualPropertyMap[vp];
            if (attProps){
                return attProps.att;
            }
            return false;
        };

        var getCyVisualAttributeTypeForVp = function (vp) {
            var attProps = visualPropertyMap[vp];
            return attProps.type;
        };

        var mappingStyle = function (elementType, vp, type, definition) {
            var def = parseMappingDefinition(definition);
            if (type === 'DISCRETE') {
                return discreteMappingStyle(elementType, vp, def);
            } else if (type === 'CONTINUOUS') {
                return continuousMappingStyle(elementType, vp, def);
            } else if (type === 'PASSTHROUGH') {
                return passthroughMappingStyle(elementType, vp, def);
            }
        };

        var getCyVisualAttributeValue = function(visualAttributeValue, cyVisualAttributeType){
            if (cyVisualAttributeType === 'number') {
                return cyNumberFromString(visualAttributeValue);
            } else if (cyVisualAttributeType === 'color') {
                return cyColorFromCX(visualAttributeValue);
            } else if (cyVisualAttributeType === 'opacity') {
                return cyOpacityFromCX(visualAttributeValue);
            } else if (cyVisualAttributeType === 'nodeShape') {
                var shapeValue = NODE_SHAPE_MAP[visualAttributeValue];
                if (shapeValue){
                    return shapeValue;
                }
            } else if (cyVisualAttributeType === 'arrow') {
                var arrowValue = ARROW_SHAPE_MAP[visualAttributeValue];
                if (arrowValue){
                    return arrowValue;
                }
            } else if (cyVisualAttributeType === 'line') {
                var lineValue = LINE_STYLE_MAP[visualAttributeValue];
                if (lineValue){
                    return lineValue;
                }
            }
            // assume string
            return visualAttributeValue;
        };

        var discreteMappingStyle = function (elementType, vp, def) {
            console.log(def);
            var elements = [];
            var cyVisualAttribute = getCyVisualAttributeForVP(vp);
            if (!cyVisualAttribute) {
                console.log("no visual attribute for " + vp);
                return elements;  // empty result, vp not handled
            }

            //console.log("visual attribute for " + vp + ' = ' + cyVisualAttribute);

            var cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);

            var cyDataAttribute = def.COL;

            _.forEach(def.m, function (pair) {
                var cyDataAttributeValue = pair.K;
                var visualAttributeValue = pair.V;
                var cyVisualAttributeValue = getCyVisualAttributeValue(visualAttributeValue, cyVisualAttributeType);
                var cySelector = elementType + '[' + cyDataAttribute + ' = \'' + cyDataAttributeValue + '\']';
                var cyVisualAttributePair = {};
                cyVisualAttributePair[cyVisualAttribute] = cyVisualAttributeValue;
                var element = {'selector': cySelector, 'css': cyVisualAttributePair};
                console.log(element);
                elements.push(element);
            });
            return elements;
        };

        var continuousMappingStyle = function (elementType, vp, def) {
            var elements = [];
            var cyVisualAttribute = getCyVisualAttributeForVP(vp);
            if (!cyVisualAttribute) {
                console.log("no visual attribute for " + vp);
                return elements;  // empty result, vp not handled
            }
            var cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);
            var cyDataAttribute = def.COL;
            var lastPointIndex = Object.keys(def.m).length - 1;

            // Each Continuous Mapping Point in def.m has 4 entries:
            // L - Lesser Visual Attribute Value
            // E - Equal Visual Attribute Value
            // G - Greater Visual Attribute Value
            // OV - Mapped Data Value

            var previousTranslatedPoint = null;

            console.log('m =' + JSON.stringify(def.m) );

            _.forEach(def.m, function (point, index) {

                var translatedPoint = {
                    lesserValue: getCyVisualAttributeValue(point.L, cyVisualAttributeType),
                    equalValue: getCyVisualAttributeValue(point.E, cyVisualAttributeType),
                    greaterValue: getCyVisualAttributeValue(point.G, cyVisualAttributeType),
                    mappedDataValue: cyNumberFromString(point.OV)
                };

                var lesserSelector = null;
                var lesserCSS = {};

                var equalSelector = null;
                var equalCSS = {};

                var middleSelector = null;
                var middleCSS = {};

                var greaterSelector = null;
                var greaterCSS = {};

                console.log('tp = ' + JSON.stringify(translatedPoint));
                console.log('ptp = ' + JSON.stringify(previousTranslatedPoint));

                var i = parseInt(index);

                if (i === 0){
                    // first Continuous Mapping point in sequence
                    // output a style for values less than the point
                    lesserSelector = elementType + '[' + cyDataAttribute + ' < ' + translatedPoint.mappedDataValue + ']';
                    lesserCSS[cyVisualAttribute] = translatedPoint.lesserValue;
                    elements.push({'selector': lesserSelector, 'css': lesserCSS});

                    // output a style for values equal to the point
                    equalSelector = elementType + '[' + cyDataAttribute + ' = ' + translatedPoint.mappedDataValue + ']';
                    equalCSS[cyVisualAttribute] = translatedPoint.equalValue;
                    elements.push({'selector': equalSelector, 'css': equalCSS});

                    // set the previous point values to use when processing the next point
                    previousTranslatedPoint = translatedPoint;

                } else {
                    // intermediate or final Continuous Mapping point in sequence
                    // output a style for the range between the previous point and this point
                    // "selector": "edge[weight > 0][weight < 70]"
                    middleSelector = elementType + '[' + cyDataAttribute + ' > ' + previousTranslatedPoint.mappedDataValue + ']' + '[' + cyDataAttribute + ' < ' + translatedPoint.mappedDataValue + ']'  ;

                    //"width": "mapData(weight,0,70,1.0,8.0)"
                    middleCSS[cyVisualAttribute] = 'mapData(' + cyDataAttribute + ',' + previousTranslatedPoint.mappedDataValue + ',' + translatedPoint.mappedDataValue + ',' + previousTranslatedPoint.equalValue  + ',' + translatedPoint.equalValue + ')';
                    elements.push({'selector': middleSelector, 'css': middleCSS});

                    // output a style for values equal to this point
                    equalSelector = elementType + '[' + cyDataAttribute + ' = ' + translatedPoint.mappedDataValue + ']';
                    equalCSS[cyVisualAttribute] = translatedPoint.equalValue;
                    elements.push({'selector': equalSelector, 'css': equalCSS});

                    // if this is the last point, output a style for values greater than this point
                    if (i === lastPointIndex){

                        greaterSelector = elementType + '[' + cyDataAttribute + ' > ' + translatedPoint.mappedDataValue + ']';
                        greaterCSS[cyVisualAttribute] = translatedPoint.equalValue;
                        elements.push({'selector': greaterSelector, 'css': greaterCSS});
                    }

                    // set the previous point to this point for the next iteration
                    previousTranslatedPoint = translatedPoint;
                }
            });

            return elements;

        };

        var passthroughMappingStyle = function (elementType, vp, def) {
            var elements = [];
            var cyVisualAttribute = getCyVisualAttributeForVP(vp);
            if (!cyVisualAttribute) {
                console.log("no visual attribute for " + vp);
                return elements;  // empty result, vp not handled
            }
            var properties = {};
            properties[cyVisualAttribute] = 'data(' + def.COL + ')';
            var style = {'selector': elementType, 'css': properties};
            elements.push(style);
            return elements;
        };



        // get the color from the network visual property and convert it to CSS format
        factory.cyBackgroundColorFromNiceCX = function (niceCX) {
            //console.log(niceCX);
            return 'rgb(1.0, 1.0, 1.0)';
        };

        factory.cyStyleFromNiceCX = function (niceCX, attributeNameMap) {
            //console.log('style from niceCX: ' + Object.keys(niceCX).length);

            var node_default_styles = [];
            var node_default_mappings = [];
            var node_specific_styles = [];
            var edge_default_styles = [];
            var edge_default_mappings = [];
            var edge_specific_styles = [];


            if ( !niceCX.visualProperties || niceCX.visualProperties.length ==0)
                return DEF_VISUAL_STYLE;

            // TODO handle cases with multiple views


            _.forEach(niceCX.visualProperties, function (vpAspectElement) {
                _.forEach(vpAspectElement, function (vpElement) {
                    console.log(vpElement);
                    var elementType = vpElement['properties_of'];
                    if (elementType === 'nodes:default') {

                        var nodeLabelPosition = null;
                        var nodeLabelFontFace = null;
                        var defaultNodeProperties = {};

                        _.forEach(vpElement.properties, function(value, vp){
                            console.log('default node property ' + vp + ' = ' + value);
                            var cyVisualAttribute = getCyVisualAttributeForVP(vp);
                            if (cyVisualAttribute) {
                                if (cyVisualAttribute === 'NODE_LABEL_POSITION'){
                                    nodeLabelPosition = value;
                                } else if (cyVisualAttribute === 'NODE_LABEL_FONT_FACE'){
                                    nodeLabelFontFace  = value;
                                } else {
                                    var cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);
                                    defaultNodeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                                }
                            }
                        });

                        if (nodeLabelPosition){
                            var position = nodeLabelPosition.split(',');
                            defaultNodeProperties['text-valign'] = getTextAlign(position[0]);
                            defaultNodeProperties['text-halign'] = getTextAlign(position[1]);
                        } else {
                            defaultNodeProperties['text-valign'] = 'center';
                            defaultNodeProperties['text-halign'] = 'center';
                        }
                        if (nodeLabelFontFace){
                            var font = nodeLabelFontFace.split(',');
                            defaultNodeProperties['font-family'] = font[0];
                            defaultNodeProperties['font-weight'] = font[1];
                        } else {
                            defaultNodeProperties['font-family'] = 'SansSerif';
                            defaultNodeProperties['font-weight'] = 'normal';
                        }
                        var defaultNodeStyle = {'selector': 'node', 'css': defaultNodeProperties};
                        node_default_styles.push(defaultNodeStyle);

                        _.forEach(vpElement.mappings, function (mapping, vp) {
                            console.log(mapping);
                            console.log('VP = ' + vp);
                            elementType = 'node';
                            var styles = mappingStyle(elementType, vp, mapping.type, mapping.definition);
                            node_default_mappings = node_default_mappings.concat(styles);
                        });

                    } else if (elementType === 'edges:default') {

                        var defaultEdgeProperties = {};
                        _.forEach(vpElement.properties, function(value, vp){
                            console.log('default node property ' + vp + ' = ' + value);
                            var cyVisualAttribute = getCyVisualAttributeForVP(vp);
                            if (cyVisualAttribute) {
                                var cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);
                                defaultEdgeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                            }
                        });
                        var defaultEdgeStyle = {'selector': 'edge', 'css': defaultEdgeProperties};
                        edge_default_styles.push(defaultEdgeStyle);

                        _.forEach(vpElement.mappings, function (mapping, vp) {
                            console.log(mapping);
                            console.log('VP = ' + vp);
                            elementType = 'edge';
                            var styles = mappingStyle(elementType, vp, mapping.type, mapping.definition);
                            edge_default_mappings = edge_default_mappings.concat(styles);
                        });

                    } else if (elementType === 'nodes'){
                        // 'bypass' setting node specific properties
                        var nodeId = vpElement['applies_to'];
                        var nodeProperties = {};
                        _.forEach(vpElement.properties, function(value, vp){
                            var cyVisualAttribute = getCyVisualAttributeForVP(vp);
                            if (cyVisualAttribute) {
                                var cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);
                                nodeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                            }
                        });
                        var nodeSelector = 'node[ id = \'' + nodeId + '\' ]';
                        var nodeStyle = {'selector': nodeSelector, 'css': nodeProperties};
                        node_specific_styles.push(nodeStyle);
                        
                    } else if (elementType === 'edges'){
                        // 'bypass' setting edge specific properties
                        var edgeId = vpElement['applies_to'];
                        var edgeProperties = {};
                        _.forEach(vpElement.properties, function(value, vp){
                            var cyVisualAttribute = getCyVisualAttributeForVP(vp);
                            if (cyVisualAttribute) {
                                var cyVisualAttributeType = getCyVisualAttributeTypeForVp(vp);
                                edgeProperties[cyVisualAttribute] = getCyVisualAttributeValue(value, cyVisualAttributeType);
                            }
                        });
                        var edgeSelector = 'edge[ id = \'' + edgeId + '\' ]';
                        var edgeStyle = {'selector': edgeSelector, 'css': edgeProperties};
                        edge_specific_styles.push(edgeStyle);


                    }
                });
            });


            // concatenate all of the style elements in order of specificity
            return node_default_styles.concat(node_default_mappings, node_specific_styles, edge_default_styles, edge_default_mappings, edge_specific_styles);
        };


        /*

         Issues reported for cx2cyjs

         */

        /*        #12 Selected Node/Edge default value handler
         In Cytoscape, there are selected node/edge color visual property, but there is no such thing in Cytoscape.js.  We need to convert default value of selected colors into special CSS Selector, like:

         ```"selector": "node:selected",
         "css": {
         "background-color": "#0033CC"


         #13 Locked Visual Properties are not handled properly
         VP lock is not handled in current version.
         Need to design and implement such function in Style converter.  Two main lockings are:

         • Size
         • Arrow Color

         #14 Filter / Ignore unused Visual Properties
         CX file contains a lot of incompatible, unused Visual Properties.  Need to properly ignore them.  Otherwise, some side-effect happens in style conversion process.
         }*/
        /*

         #17 Bypass support
         Currently, conversion result is unpredictable if Bypass is set in a Style.  Need to handle this as a special case for selector converter.

         #18 Passthrough mapping conversion is incomplete
         In Cytoscape, Passthrough mapping supports various data types, including numbers, custom graphics, and labels.  Currently, this Style converter only supports labels.  Need to add support for other data types.

         */

        /*

         #19 Add Custom Graphics Support
         Cytoscape.js has an easy-to-use data mapper function from URL to images on nodes:

         https://gist.github.com/maxkfranz/aedff159b0df05ccfaa5

         This can be done by supporting discrete/passthrough mapping, but not implemented.  We need to add support for this type of mappings.


         #22 Handle text wrapping and LABEL_WIDTH visual property
         Cytoscape supports LABEL_WIDTH visual property to limit the width of labels.  And Cytoscape.js supports similar property ​_text-max-width_​.  But currently these are simply ignored and always render very long label if text length is long.

         The Style converter should support this visual property.


         #23 Implement workaround for NODE_SIZE defaults and mappings
         Current converter cannot handle NODE_SIZE because it depends on visual property locks.

         Before implementing complete lock handler, we need to implement some workaround to handle size.

         */


        factory.allNodesHaveUniquePositions = function (cyElements) {
            var nodePositionMap = {};
            var nodes = cyElements.nodes;
            for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
                var node = nodes[nodeIndex];
                var position = node.position;
                if (!position) {
                    // found a node without a position so we return false
                    return false;
                }
                var positionKey = position.x + '_' + position.y;
                if (nodePositionMap[positionKey]) {
                    // found a duplicate position so we return false
                    return false;
                } else {
                    // add this position to the map
                    nodePositionMap[positionKey] = position;
                }

            }
            return true;

        };


        /*-----------------------------------------------------------------------*
         * initialize the cytoscape instance from niceCX
         *-----------------------------------------------------------------------*/
        factory.initCyGraphFromCyjsComponents = function (cyElements, cyLayout, cyStyle, viewer, canvasName) {

            //console.log(cyElements);

            $(function () { // on dom ready

                var cv = document.getElementById(canvasName);

                cy = cytoscape({
                    container: cv,

                    style: cyStyle,

                    layout: cyLayout,

                    elements: cyElements,

                    ready: function () {
                        window.cy = this;
                    }
                });
                
                cy.on ( 'select unselect',function (event) {
                    clearTimeout(cy.nodesSelectionTimeout);
                    cy.nodesSelectionTimeout = setTimeout(function () {
                        var cxNodes = [];
                        var cxEdges = [];
                        _.forEach(cy.$("node:selected"), function (node) {
                            var data = node.data();
                            var id = node.id;
                            cxNodes.push({'id': id, 'data': data})   ;
                        });
                        selectionContainer.nodes = cxNodes;
                      //  selectionContainer.nodes = cy.$("node:selected");
                      //  selectionContainer.edges = cy.$("edge:selected");
                      viewer.refreshNodeEdgeTab(selectionContainer);
                    }, 300) ;
                });


            }); // on dom ready

        };

        factory.getCy = function () {
            return cy;
        };

        return factory;

    }]);

