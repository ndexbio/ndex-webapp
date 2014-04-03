/*

 The jdex.js library will be used as a Node.js server module or as a browser client library

 (function(exports){

 // The

 exports.test = function(){
 return 'hello world'
 };

 })(typeof exports === 'undefined'? this['mymodule']={}: exports);

 */

(function (exports) {

    if (typeof($) === 'undefined') {
        console.log("requiring jquery");
        $ = require('jquery');
    }

    exports.debug = null;
    /*
     if (typeof($) === 'undefined') {
     console.log("requiring xmldom DOMParser");
     DOMParser = require('xmldom').DOMParser;
     }
     */

    /*
     //------------------------------------
     //	JDEx Graph Format
     //------------------------------------

     //
     // Predicates are assumed to take nodes as their subject and object.
     // A predicate with objecttypes : ["string"] or "integer" or "number"... can be used as
     // a predicate in a property list
     // a predicate with subjecttypes : ["node"] can be used in a node property list

     {
     name : "<string>",
     version : "<string>",
     format : "<string>",

     namespaces : {<namespace id> : {
     uri : <string>,
     prefix : <string>,
     properties : {<predicate id> : value}
     }
     },

     predicates : {<predicate id> : {
     name : <string>,
     identifier : <string>,
     namespace : <namespace id>,
     properties : {<predicate id> : value}
     }
     },

     nodeTypes : {<type id> : {
     name : <string>,
     identifier : <string>,
     namespace : <namespace id>,
     properties : {<predicate id> : value}
     }
     },

     nodes : { <node id> : {
     namespace : <namespace id>,
     identifier : <string>,
     type : <nodeType id>,
     properties : {<predicate id> : value}
     },

     },

     edges : {	<edge id> : {
     s : <node id>,
     p : <predicate id>,
     o : <node id>,
     properties : {<predicate id> : value}
     }
     },

     paths : { 	<path id> : {
     edges : [id, id, id...]
     properties : {<predicateId> : value}
     }
     },

     // TODO: consider issues of hierarchical subnetworks

     subnetworks :
     {	<subnetwork id> : {
     nodes : [ <array of node ids>],
     edges : [<array of edge ids>],
     properties : {<predicateId> : <value>}
     layouts :
     },

     // TODO: layouts / graphic properties.


     }

     ------------------------------------
     */

    exports.Graph = function () {
        // We have one counter for internal IDs of objects
        // (i.e. avoid confusion where two objects of different types have the same id)
        this.maxInternalId = 0;
        this.namespaces = {};

        this.namespacePrefixMap = {};

        this.terms = {};
        this.nodeTypes = {};
        this.nodes = {};
        this.edges = {};

        this.nodeIdentifierMap = {};
        this.termMap = {};

        this.paths = {};
        this.subnetworks = {};

        this.citations = {};
        this.supports = {};
        this.properties = {};
    };

    exports.Graph.prototype = {

        constructor: exports.Graph,

//---------------Node Methods -------------------------------------------


        // id within the graph
        nodeById: function (id) {
            return this.nodes[id];
        },

        // id across graphs
        // (a given application is responsible for assigning unique identifiers
        // for nodes in the graphs that it loads)
        nodeByIdentifier: function (identifier) {
            if (identifier) return this.nodeIdentifierMap[identifier];
            return false;
        },

        nodesByProperty: function (predicateIdentifier, value) {
            var foundNodes = [];
            $.each(this.nodes, function (index, node) {
                if (node.properties[predicateIdentifier] == value) {
                    foundNodes.push(node);
                }
            });
            return foundNodes;
        },

        findOrCreateNodeByIdentifier: function (identifier) {
            var node = this.nodeByIdentifier(identifier);
            if (node) return node;
            node = new exports.Node(identifier);
            this.addNode(node)
            return node;
        },

        findOrCreateNodeByTerm: function (term, name) {
            //console.log("find or create node by " + term.identifier() + " with name : " + name) ;
            var node = this.nodeByIdentifier(term.identifier());
            if (node) {
                //console.log("found: " + node.name);
                return node;
            }
            node = new exports.Node(name, term);
            this.addNode(node)
            return node;
        },

        addNode: function (node) {
            node.id = this.maxInternalId++;
            this.nodes[node.id] = node;
            if (node.represents) {
                this.nodeIdentifierMap[node.represents.identifier()] = node;
            } else {
                this.nodeIdentifierMap[node.name] = node;
            }
            node.graph = this;
        },

        copyExternalNode: function (externalNode) {
            var internalNode = this.nodeByIdentifier(externalNode.identifier);
            if (internalNode) return internalNode;
            internalNode = new exports.Node();
            internalNode.identifier = externalNode.identifier;
            internalNode.type = externalNode.type;
            /*
             if (externalNode.properties.label){
             internalNode.properties.label = externalNode.properties.label;
             }

             $.each(externalNode.properties, function(predicate, value){
             internalNode.setLiteral(predicate, value);
             });
             */
            this.addNode(internalNode);
            return internalNode;

        },

        getOutgoing: function (node) {
            var outgoing = [];
            $.each(this.edges, function (index, edge) {
                if (edge.from == node && outgoing.indexOf(edge) == -1) {
                    outgoing.push(edge);
                }
            });
            return outgoing;
        },

        getIncoming: function (node) {
            var incoming = [];
            $.each(this.edges, function (index, edge) {
                if (edge.to == node && incoming.indexOf(edge) == -1) {
                    incoming.push(edge);
                }
            });
            return incoming;
        },

        getEdges: function (node) {
            var allEdges = [];
            $.each(this.edges, function (index, edge) {
                if ((edge.from == node || edge.to == node) && allEdges.indexOf(edge) == -1) {
                    allEdges.push(edge);
                }
            });
            return allEdges;
        },

        isSink: function (node) {
            var isSink = true;
            $.each(this.edges, function (index, edge) {
                if (node == edge.from) {
                    isSink = false;
                    return;
                }
            });
            return isSink;
        },

        isSource: function (node) {
            var isSource = true;
            $.each(this.edges, function (index, edge) {
                if (node == edge.to) {
                    isSource = false;
                    return;
                }
            });
            return isSource;
        },

//---------------Edge Methods -------------------------------------------

        addEdge: function (edge) {
            edge.id = this.maxInternalId++;
            this.edges[edge.id] = edge;
            edge.graph = this;
            return edge;
        },

        findEdge: function (subjectNode, predicate, objectNode) {
            for (var i = 0; i < this.edges.length; i++) {
                var edge = this.edges[i];
                if (subjectNode == edge.s && objectNode == edge.o && relationship == edge.p) {

                    return edge;
                }
            }
            return false;
        },

        findOrCreateEdge: function (subjectNode, predicate, objectNode) {
            var edge = this.findEdge(subjectNode, predicate, objectNode);
            if (edge) return edge;
            edge = new exports.Edge(subjectNode, predicate, objectNode);
            this.addEdge(edge);
            return edge;
        },

        copyExternalEdge: function (edge) {
            var predicate = this.findOrCreateTerm(edge.p.identifier);
            var subjectNode = this.copyExternalNode(edge.s);
            var objectNode = this.copyExternalNode(edge.o);
            var internalEdge = this.findEdge(subjectNode, predicate, objectNode);
            if (internalEdge) return internalEdge;
            internalEdge = new exports.Edge(subjectNode, predicate, objectNode);
            this.addEdge(internalEdge);
            return internalEdge;
        },

//---------------Term Methods -------------------------------------------
        /*
         termByNameAndNamespace : function (name, ns){
         var key = name + ":" + namespace,
         term = this.termMap(key);

         if(term) return term;


         if (ns){
         for (index in this.terms){
         var term = this.terms[index];
         if (term.ns && ns.id == term.ns.id && name == term.name){
         //console.log("term found for " + name + " in " + ns.uri);
         return term;
         }
         }
         //console.log("term not found for " + name + " in " + ns.uri);
         } else {
         for (index in this.terms){
         var term = this.terms[index];
         if (!term.ns && name == term.name){
         //console.log("term found for " + name);
         return term;
         }
         }
         //console.log("term not found for " + name);
         }

         return false;
         },
         */

        termByNameAndNamespace: function (name, ns) {
            return this.termMap[termIdentifier(name, ns)];
        },

        findOrCreateTerm: function (name, ns) {
            if (!name && !ns) {
                throw new Error("attempt to create term without name or namespace");
            }
            if (!name) {
                throw new Error("attempt to create term in namespace " + ns.uri + " with no name");
            }
            var term = this.termByNameAndNamespace(name, ns);
            if (term) return term;
            term = new exports.Term(name, ns);
            return this.addTerm(term);
        },

        functionTermByFunctionAndParameters: function (fn, parameters) {
            return this.termMap[functionTermIdentifier(fn, parameters)];
        },

        findOrCreateFunctionTerm: function (fn, parameters) {
            if (!fn) {
                throw new Error("attempt to create functionTerm with no function");
            }
            if (!parameters || parameters.length == 0) {
                throw new Error("attempt to create functionTerm with no parameters");
            }
            var term = this.functionTermByFunctionAndParameters(fn, parameters);
            if (term) return term;
            term = new exports.FunctionTerm(fn, parameters);
            return this.addTerm(term);
        },

        addTerm: function (term) {
            term.id = this.maxInternalId++;
            this.terms[term.id] = term;
            this.termMap[term.identifier()] = term;
            return term;
        },

//---------------Namespace Methods --------------------------------------

        namespaceByURI: function (uri) {
            for (id in this.namespaces) {
                if (uri == this.namespaces[id].uri) {
                    return this.namespaces[id];
                }
            }
            return false;
        },

        namespaceByPrefix: function (prefix) {
            return this.namespacePrefixMap[prefix];
        },

        findOrCreateNamespace: function (uri, prefix, description) {
            if (!uri) uri = prefix;
            var ns = this.namespaceByURI(uri);
            if (ns) return ns;

            if (description) {
                console.log("creating namespace for " + prefix + " : " + uri + "  " + description);
            } else {
                console.log("creating namespace for " + prefix + " : " + uri);
            }
            ns = new exports.Namespace(uri, prefix, description);
            return this.addNamespace(ns)
        },

        addNamespace: function (ns) {
            ns.id = this.maxInternalId++;
            this.namespaces[ns.id] = ns;
            if (ns.prefix) {
                this.namespacePrefixMap[ns.prefix] = ns;
            }
            return ns;
        },


//---------------Citation Methods ----------------------------------------

        addCitation: function (citation) {
            citation.id = this.maxInternalId++;
            this.citations[citation.id] = citation;
            citation.graph = this;
            return citation;
        },


//---------------Suport Methods -----------------------------------------

        addSupport: function (support) {
            support.id = this.maxInternalId++;
            this.supports[support.id] = support;
            support.graph = this;
            return support;
        },

//---------------Whole Graph Methods -------------------------------------


        setProperty: function (predicate, value) {
            this.properties[predicate.identifier()] = value;
        },

// TODO: other graph elements need to be copied

        addGraph: function (graph) {
            var internalGraph = this;
            $.each(graph.nodes, function (index, node) {
                internalGraph.copyExternalNode(node);
            });

            $.each(graph.edges, function (index, edge) {
                internalGraph.copyExternalEdge(edge);
            });

            return internalGraph;

        },

        mappedClone: function () {
            var originalGraph = this;
            var mappedGraph = new exports.Graph();
            $.each(originalGraph.nodes, function (index, node) {
                var mappedNode = mappedGraph.copyExternalNode(node);
                mappedNode.mapsTo = node;
            });

            $.each(originalGraph.edges, function (index, edge) {
                var mappedEdge = mappedGraph.copyExternalEdge(edge);
                mappedEdge.mapsTo = edge;
            });

            return mappedGraph;

        },

        getSinks: function () {
            var sinks = [];
            $.each(this.nodes, function (index, node) {
                if (node.isSink()) {
                    sinks.push(node);
                }
            });
            return sinks;
        },

        getSources: function () {
            var sources = [];
            $.each(this.nodes, function (index, node) {
                if (node.isSource(node)) {
                    sources.push(node);
                }
            });
            return sources;
        },

        toJDEx: function () {
            var s_nodes = {},
                s_namespaces = {},
                s_nodeTypes = {},
                s_edges = {},
                s_terms = {},
                s_properties = {},
                s_supports = {},
                s_citations = {};

            $.each(this.namespaces, function (index, ns) {
                s_namespaces[index] = ns.serializeJDEx();
            });

            $.each(this.terms, function (index, term) {
                s_terms[index] = term.serializeJDEx();
            });

            $.each(this.properties, function (identifier, value) {
                s_properties[identifier] = value;
            });

            $.each(this.nodes, function (index, node) {
                s_nodes[index] = node.serializeJDEx();
            });

            $.each(this.edges, function (index, edge) {
                s_edges[index] = edge.serializeJDEx();
            });

            $.each(this.supports, function (index, support) {
                s_supports[index] = support.serializeJDEx();
            });

            $.each(this.citations, function (index, citation) {
                s_citations[index] = citation.serializeJDEx();
            });
            /*
             $.each(this.nodeTypes, function(index, nodeType){
             s_nodeTypes[index] = nodeType.serializeJDEx();
             });

             */

            return {
                format: this.format,
                nodes: s_nodes,
                edges: s_edges,
                namespaces: s_namespaces,
                terms: s_terms,
                nodeTypes: s_nodeTypes,
                properties: s_properties,
                citations: s_citations,
                supports: s_supports
            };

        },

        serializeJDEx: function () {

            return JSON.stringify(this.toJDEx(), null, 4);
        }



    };


    /*
     ------------------------------------
     Node
     ------------------------------------
     */

    exports.Node = function (name, representedTerm) {

        this.properties = {};
        this.name = name;
        if (representedTerm) {
            this.represents = representedTerm;
        }
        this.type = null;				// primary type of node

    };

    exports.Node.prototype = {

        constructor: exports.Node,

        serializeJDEx: function () {
            var jdex = { name: this.name};
            /*
             for (property in this.properties){
             jdex.properties[property] = this.properties[property];
             }
             */
            if (this.represents) jdex.represents = this.represents.id;
            return jdex;
        },

        getOutgoing: function () {
            return this.graph.getOutgoing(this);
        },

        getIncoming: function () {
            return this.graph.getIncoming(this);
        },

        getEdges: function () {
            return this.graph.getEdges(this);
        },

        getChildren: function () {
            var children = [];
            $.each(this.getOutgoing(), function (index, edge) {
                if (children.indexOf(edge.o) == -1) {
                    children.push(edge.o);
                }
            });
            return children;
        },

        getParents: function () {
            var parents = [];
            $.each(this.getIncoming(), function (index, edge) {
                var parent = edge.s;
                if (parents.indexOf(parent) == -1) {
                    parents.push(parent);
                }
            });
            return parents;

        },

        isSource: function () {
            return this.graph.isSource(this);
        },

        isSink: function () {
            return this.graph.isSink(this);
        },

    };

    /*
     ------------------------------------
     Edge
     ------------------------------------
     */

    exports.Edge = function (subject, predicate, object) {
        //console.log("creating edge with " + subject.name + " " + predicate.identifier() + " " + object.name);
        this.s = subject;
        this.o = object;
        this.p = predicate;
        this.properties = {};
        this.citations = [];
        this.supports = [];
        this.id = null;

    };

    exports.Edge.prototype = {

        constructor: exports.Edge,

        serializeJDEx: function () {
            var s_edge = {s: this.s.id, p: this.p.id, o: this.o.id};
            if (this.citations && this.citations.length > 0) {
                var cites = [];
                $.each(this.citations, function (i, citationId) {
                    cites.push(citationId);
                });
                s_edge.citations = cites;
            }
            if (this.supports && this.supports.length > 0) {
                var supps = [];
                $.each(this.supports, function (i, supportId) {
                    supps.push(supportId);
                });
                s_edge.supports = supps;
            }
            if (this.properties && this.properties.length > 0) {
                var props = {};
                $.each(this.properties, function (property, value) {
                    props[property] = value.id;
                });
                s_edge.properties = props;
            }
            return s_edge;
        },

        reverse: function () {
            var temp = this.s;
            this.s = this.o;
            this.o = temp;
        },

    };


    /*
     ------------------------------------
     Namespace
     ------------------------------------
     */

    exports.Namespace = function (uri, prefix, description) {

        this.uri = uri;
        if (prefix) {
            this.prefix = prefix;
        }
        if (description) {
            this.description = description;
        } else {
            this.description = "";
        }
        this.properties = {};

    };

    exports.Namespace.prototype = {

        constructor: exports.Namespace,

        serializeJDEx: function () {
            if (this.prefix) {
                return {uri: this.uri, prefix: this.prefix, description: this.description};
            } else {
                return {uri: this.uri, description: this.description};
            }

        }

    };

    /*
     ------------------------------------
     Term
     ------------------------------------
     */

    exports.Term = function (name, ns) {

        if (name) {
            this.name = name;
        }
        if (ns) {
            //console.log("creating term " + name + " in " + ns.uri);
            this.ns = ns;
        } else {
            //console.log("creating term for " + name + " with no namespace");
        }

    };

    function termIdentifier(name, ns) {
        if (ns) {
            // treat 'internal' namespace like null for identifier
            if (ns.uri == 'internal') {
                return name;
            } else if (ns.prefix) {
                return ns.prefix + ":" + name;
            } else {
                return ns.uri + name;
            }
        } else {
            return name;
        }
    };

    exports.Term.prototype = {

        constructor: exports.Term,

        serializeJDEx: function () {
            if (this.ns) {
                return {name: this.name, ns: this.ns.id};
            } else {
                return {name: this.name};
            }

        },

        identifier: function () {
            return termIdentifier(this.name, this.ns);
        }

    };

    exports.FunctionTerm = function (fn, parameters) {

        //console.log("creating function term using " + fn.name);

        this.termFunction = fn;
        this.parameters = parameters;
    };

    function functionTermIdentifier(termFunction, parameters) {
        var params = [];
        $.each(parameters, function (index, parameter) {
            if (parameter.termFunction || parameter.name) {
                params.push(parameter.identifier());
            } else {
                params.push(parameter);
            }
        });
        return termFunction.identifier() + "(" + params.join(', ') + ")";
    }

    exports.FunctionTerm.prototype = {

        constructor: exports.Term,

        serializeJDEx: function () {
            var params = {};
            $.each(this.parameters, function (key, value) {
                if (typeof(value) == 'object') {
                    params[key] = {term: value.id};
                } else {
                    params[key] = value;
                }
            });
            return {termFunction: this.termFunction.id, parameters: params};
        },

        identifier: function () {
            return functionTermIdentifier(this.termFunction, this.parameters);
        }

    };


    /*
     ------------------------------------
     Citation
     ------------------------------------
     */

    exports.Citation = function (citationType, referenceIdentifier, bibliographicCitation, title) {

        this.type = citationType;
        this.identifier = referenceIdentifier;
        this.properties = {};
        this.contributors = [];
        this.edges = [];
        if (bibliographicCitation) {
            this.citation = bibliographicCitation;
        }
        if (title) {
            //console.log("creating citation " + this.identifier + " titled " + title);
            this.title = title;
        }

    };

    exports.Citation.prototype = {

        constructor: exports.Citation,

        addContributor: function (contributor_name) {
            this.contributors.push(contributor_name);
        },

        addEdge: function (edge) {
            this.edges.push(edge);
            this.edges = $.unique(this.edges);
        },

        serializeJDEx: function () {
            var jdex = {identifier: this.identifier, type: this.type};
            if (this.title) jdex['title'] = this.title;
            if (this.citation) jdex['citation'] = this.citation;
            if (this.edges && this.edges.length > 0) {
                var edge_ids = [];
                $.each(this.edges, function (index, edge) {
                    edge_ids.push(edge.id);
                });
                jdex['edges'] = edge_ids;
            }
            jdex['contributors'] = [];
            $.each(this.contributors, function (index, contributors) {
                jdex.contributors.push(contributors);
            });
            return jdex;
        }

    };


    /*
     ------------------------------------
     Support
     ------------------------------------
     */

    exports.Support = function (text) {

        this.text = text;
        //console.log("creating Support: " + text);
        this.properties = {};
        this.edges = [];
    };

    exports.Support.prototype = {

        constructor: exports.Support,

        addEdge: function (edge) {
            this.edges.push(edge);
            this.edges = $.unique(this.edges);
        },

        serializeJDEx: function () {
            var jdex = {text: this.text};
            if (this.citation) jdex.citation = this.citation.id;
            if (this.edges && this.edges.length > 0) {
                var edge_ids = [];
                $.each(this.edges, function (index, edge) {
                    edge_ids.push(edge.id);
                });
                jdex['edges'] = edge_ids;
            }
            return jdex;
        }

    };


    /*
     ------------------------------------
     SIF -> JDEx
     ------------------------------------
     */

    exports.createGraphFromSIF = function (data) {
        var graph = new exports.Graph();
        graph.format = "SIF";

        // get the BEL relationship namespace
        var internalNS = graph.findOrCreateNamespace('internal', 'internal');

        //graph.name = pathwayName;
        // data is assumed to be an array of lines
        // and that tokens on a line are separated by whitespace of some kind
        for (i = 1; i < data.length; i++) {
            var line = data[i];
            if (line.trim().length != 0) {
                var tokens = line.split(/\s+/),
                    subjectIdentifier = tokens[0],
                    predicateIdentifier = tokens[1],
                    objectIdentifier = tokens[2];

                if (subjectIdentifier && predicateIdentifier && objectIdentifier) {
                    var predicate = graph.findOrCreateTerm(predicateIdentifier, internalNS);

                    var subjectTerm = graph.findOrCreateTerm(subjectIdentifier, internalNS);
                    var subjectNode = graph.findOrCreateNodeByIdentifier(subjectIdentifier);
                    subjectNode.represents = subjectTerm;

                    var objectTerm = graph.findOrCreateTerm(objectIdentifier);
                    var objectNode = graph.findOrCreateNodeByIdentifier(objectIdentifier);
                    objectNode.represents = objectTerm;

                    graph.findOrCreateEdge(subjectNode, predicate, objectNode);
                } else {
                    console.log("Malformed SIF triple:" + subjectIdentifier + " - " + predicateIdentifier + " - " + objectIdentifier);
                    //console.log(internalNS);
                }
            }
        }
        /*
         // data is assumed to be an array of lines
         $.each(data, function (index, line) {
         var tokens = line.split("\t"),
         subjectIdentifier = tokens[0],
         predicateIdentifier = tokens[1],
         objectIdentifier = tokens[2];

         var predicate = graph.findOrCreateTerm(predicateIdentifier);
         var subjectNode = graph.findOrCreateNodeByIdentifier(subjectIdentifier);
         var objectNode = graph.findOrCreateNodeByIdentifier(objectIdentifier);
         graph.findOrCreateEdge(subjectNode, predicate, objectNode);

         });
         */
        return graph;
    }


    /*
     ------------------------------------
     XBEL -> JDEx
     ------------------------------------
     */

    exports.createGraphFromXBEL = function (xml) {
        var graph = new exports.Graph();
        graph.format = "BEL";
        //x var doc = new DOMParser().parseFromString(xml_text, 'text/xml');

        //x console.log("parsed XML text");

        // Process the header
        //x var header = doc.documentElement.getElementsByTagName('bel\\:header').item(0);
        var doc = $(xml).find('document')[0];

        var headers = $(doc).children('bel\\:header');
        if (headers.length == 0) throw new Error("no header in XBEL document");
        exports.processXBELHeader(graph, headers[0]);

        // get the BEL relationship namespace
        graph.belNS = graph.findOrCreateNamespace('http://resource.belframework.org/belframework/1.0/schema/', 'bel');


        // Process the namespace group
        //x var namespaceGroup = doc.documentElement.getElementsByTagName('bel\\:namespaceGroup').item(0);
        var namespaceGroups = $(doc).children('bel\\:namespaceGroup');
        if (namespaceGroups.length == 0) throw new Error("no namespaceGroup in XBEL document");
        exports.processXBELNamespaceGroup(graph, namespaceGroups[0]);


        // Process the annotation definition
        //x var annotationDefinitionGroup = doc.documentElement.getElementsByTagName('bel\\:annotationDefinitionGroup').item(0);
        var annotationDefinitionGroups = $(doc).children('bel\\:annotationDefinitionGroup');
        if (annotationDefinitionGroups.length == 0) throw new Error("no annotationDefinitionGroup in XBEL document");
        exports.processXBELAnnotationDefinitionGroup(graph, annotationDefinitionGroups[0]);

        // Process the statementGroups
        // Note that we use the children method to only take the top level of statement groups
        var statementGroups = $(doc).children('bel\\:statementGroup');
        //x var nStatementGroups = doc.documentElement.childNodes.length;

        $.each(statementGroups, function (index, statementGroup) {
            var context = {annotations: []};
            console.log(index + " / " + statementGroups.length + " maxID: " + graph.maxInternalId);
            exports.processXBELStatementGroup(graph, statementGroup, context);
        });


        /*
         $.each(doc.documentElement.childNodes, function (index, statementGroup) {
         if (statementGroup.tagName == 'bel\\:statementGroup') {
         var context = {annotations: []};
         console.log(index + " / " + nStatementGroups + " maxID: " + graph.maxInternalId);
         exports.processXBELStatementGroup(graph, statementGroup, context);
         }
         });
         */
        return graph;

    }

    /*

     Header Example:

     <bel:name>BEL Framework Small Corpus Document</bel:name>
     <bel:description>Approximately 2000 hand curated statements drawn from 57 PubMeds</bel:description>
     <bel:version>1.2</bel:version>
     <bel:copyright>Copyright (c) 2011, Selventa. All Rights Reserved.</bel:copyright>
     <bel:contactInfo>support@belframework.org</bel:contactInfo>
     <bel:authorGroup>
     <bel:author>Selventa</bel:author>
     </bel:authorGroup>
     <bel:licenseGroup>
     <bel:license>Creative Commons Attribution-Non-Commercial-ShareAlike 3.0 Unported License</bel:license>
     </bel:licenseGroup>


     @values["title"] = title if title
     @values["authors"] = authors if authors
     @values["version"] = version if version
     @values["copyright"] = copyright if copyright
     @values["description"] = description if description
     */


    exports.processXBELHeader = function (graph, header) {
        // Add DublinCore namespace
        var dc_namespace_uri = graph.findOrCreateNamespace("http://purl.org/dc/terms/", "DC", "DublinCore");

        // Add TextLocation namespace
        var dc_namespace_uri = graph.findOrCreateNamespace("http://purl.org/dc/terms/", "TextLocation", "BEL TextLocation Namespace");

        // Unary properties mapped from BEL to DC
        var Unary_Properties_XBEL_to_DC = {
            "bel\\:name": {identifier: "DC:title", term: "title"},
            "bel\\:description": {identifier: "DC:description", term: "description"},
            "bel\\:version": {identifier: "DC:version", term: "version"},
            "bel\\:copyright": {identifier: "DC:copyright", term: "copyright"}
        };

        $.each(Unary_Properties_XBEL_to_DC, function (tag, dc_info) {
            // For each tag that we can translate, check to see
            // if it is set in the xbel header
            //* var elements = header.getElementsByTagName(tag);
            var elements = $(header).children(tag);
            if (elements && elements.length > 0) {
                var header_element = elements[0],
                    value = $(header_element).text(),
                    predicate = graph.findOrCreateTerm(dc_info.term, dc_namespace_uri);
                //console.log("adding graph property: " + predicate.identifier() + " : " + value);
                //graph.setProperty(predicate, value);
                graph.properties[dc_info.term] = value;
            }

        });
    }

    exports.processXBELNamespaceGroup = function (graph, namespaceGroup) {
        var elements = $(namespaceGroup).children('bel\\:namespace');
        //x $.each(namespaceGroup.getElementsByTagName('bel\\:namespace'), function (index, ns_info) {

        $.each(elements, function (index, ns_info) {
            var uri = $(ns_info).attr('bel:resourceLocation'),
                prefix = $(ns_info).attr('bel:prefix');
            if (uri && prefix) {
                graph.findOrCreateNamespace(uri, prefix);
            } else {
                throw new Error("attempt to create namespace with missing URI or prefix")
            }

        });
    }

    exports.processXBELAnnotationDefinitionGroup = function (graph, AnnotationDefinitionGroup) {
        var elements = $(AnnotationDefinitionGroup).children('bel\\:externalAnnotationDefinition');
        $.each(elements, function (index, extDef_info) {
            var uri = $(extDef_info).attr('bel:url'),
                prefix = $(extDef_info).attr('bel:id');
            graph.findOrCreateNamespace(uri, prefix);
            graph.findOrCreateTerm(prefix, graph.belNS);
        });

        /*

         <bel:internalAnnotationDefinition bel:id="TextLocation">
         <bel:description>indicates which section of text a statement is derived from</bel:description>
         <bel:usage>indicates which section of text a statement is derived from</bel:usage>
         <bel:listAnnotation>
         <bel:listValue>Abstract</bel:listValue>
         <bel:listValue>Results</bel:listValue>
         <bel:listValue>Legend</bel:listValue>
         <bel:listValue>Review</bel:listValue>
         </bel:listAnnotation>
         </bel:internalAnnotationDefinition>
         */

        elements = $(AnnotationDefinitionGroup).children('bel\\:internalAnnotationDefinition');
        $.each(elements, function (index, intDefElement) {

            var description = "",
                prefix = $(intDefElement).attr('bel:id'),
                termElements = [];

            // process the description element, if present
            var descriptionElements = $(intDefElement).children('bel\\:description');
            if (descriptionElements) description = $(descriptionElements).text();

            var ns = graph.findOrCreateNamespace("internal", prefix, description);
            graph.findOrCreateTerm(prefix, graph.belNS);

            var listAnnotationElements = $(intDefElement).children('bel\\:listAnnotation');
            if (listAnnotationElements) {
                termElements = $(listAnnotationElements).children();

                $.each(termElements, function (j, termElement) {
                    exports.debug = termElement;
                    var termName = $(termElement).text();
                    console.log("creating internal annotation term: " + termName + " in " + ns.prefix);
                    graph.findOrCreateTerm(termName, ns);
                });
            }

        });

    }

    exports.processXBELStatementGroup = function (graph, statementGroup, context) {


        // process the annotation group
        $(statementGroup).children('bel\\:annotationGroup').each(function (index, element) {
            exports.processXBELAnnotationGroup(graph, element, context);
        });

        // process statements, using the annotations
        $(statementGroup).children('bel\\:statement').each(function (index, statement) {
            exports.processXBELStatement(graph, statement, context);
        });

        // recurse into any statement groups
        $(statementGroup).children('bel\\:statementGroup').each(function (index, innerGroup) {
            var innerContext = {citation: context.citation, support: context.support, annotations: []};
            $.each(context.annotations, function (index, value) {
                innerContext[index] = value;
            });
            exports.processXBELStatementGroup(graph, innerGroup, innerContext);
        });
    }

    exports.processXBELAnnotationGroup = function (graph, annotationGroup, context) {
        $(annotationGroup).children('bel\\:annotation').each(function (index, element) {


            var propertyName = $(element).attr('bel:refID'),
                value = $(element).text(),
                ns = graph.namespaceByPrefix(propertyName);

            //console.log("processing annotation " + propertyName + " : " + value);
            if (ns) {
                var valueTerm = graph.findOrCreateTerm(value, ns),
                    propertyTerm = graph.termByNameAndNamespace(propertyName, graph.belNS);
                if (!propertyTerm) {
                    console.log("failed to find propertyTerm for " + propertyName + " in " + graph.belNS);
                } else {

                    context.annotations.push({property: propertyTerm, value: valueTerm});
                }

            } else {
                console.log("did not find namespace for " + propertyName);
            }
        });
        $(annotationGroup).children('bel\\:citation').each(function (index, element) {
            context.citation = exports.processXBELCitation(graph, element);
        });
        $(annotationGroup).children('bel\\:evidence').each(function (index, element) {
            context.support = exports.processXBELEvidence(graph, element, context.citation);
        });
    }

    exports.processXBELStatement = function (graph, statement, context) {
        //console.log("processing statement with context = " + context);

        var s, o;


        $(statement).children('bel\\:subject').each(function (index, nodeElement) {
            s = exports.processXBELNodeElement(graph, nodeElement);
        });
        $(statement).children('bel\\:object').each(function (index, nodeElement) {
            o = exports.processXBELNodeElement(graph, nodeElement);
        });

        // find or create the object node
        // for now, a relationship as an object will return false
        // and we will only create the subject node, and skip the edge


        // find or create the predicate
        var relationshipName = $(statement).attr('bel:relationship');
        if (relationshipName) {
            p = graph.findOrCreateTerm(relationshipName, graph.belNS);
        }

        // create the edge if we have a subject, predicate, and object
        // (because this is a BEL document, not a model, each statement creates a unique edge)
        if (s && p && o) {
            var edge = new exports.Edge(s, p, o);

            // if there is a citation, add the edge and vice versa
            if (context.citation) {
                context.citation.addEdge(edge);
                edge.citation = context.citation;
            }

            // if there is a support, add the edge
            if (context.support) {
                context.support.addEdge(edge);
                edge.support = context.support;
            }

            // for each annotation, add it to the edge
            $.each(context.annotations, function (index, pair) {
                //console.log("adding annotation to edge : " + pair.property.identifier() + " = " + pair.value.identifier());
                edge.properties[pair.property.identifier()] = pair.value;
            });

            graph.addEdge(edge);

        } else {
            var sname = s ? s.name : "unknown",
                pname = p ? p.name : "unknown",
                oname = o ? o.name : "unknown";
            //console.log("skipping edge creation for " + sname + ", " + pname + ", " + oname);
        }
    }

    exports.processXBELNodeElement = function (graph, nodeElement) {
        if ($(nodeElement).children('bel\\:statement').length > 0) return false;
        var termElement = $(nodeElement).children().filter(":first");
        var term = exports.processXBELTermElement(graph, termElement);
        return graph.findOrCreateNodeByTerm(term, term.identifier());
    }

    exports.processXBELTermElement = function (graph, termElement) {
        // find or create the term function
        var functionName = $(termElement).attr('bel:function');
        if (!functionName) throw new Error("no function name found for " + termElement);

        var fn = graph.findOrCreateTerm(functionName, graph.belNS),
            parameters = [];

        $(termElement).children('bel\\:parameter').each(function (index, child) {
            var nsPrefix = $(child).attr('bel:ns');
            if (nsPrefix) {
                // child is a basic term
                name = $(child).text(),
                    ns = graph.namespaceByPrefix(nsPrefix),
                    term = graph.findOrCreateTerm(name, ns);
                parameters.push(term);
            } else {
                // child is a literal value
                parameters.push($(child).text());
            }
        });
        $(termElement).children('bel\\:term').each(function (index, child) {
            // child is a function term
            var childTerm = exports.processXBELTermElement(graph, child);
            parameters.push(childTerm);
        });

        return graph.findOrCreateFunctionTerm(fn, parameters)
    }

    exports.processXBELCitation = function (graph, citationElement) {
        var title, bibliographicCitation, authorGroups, authorGroup,
            citationType, referenceIdentifier;
        // Get the type from the attribute
        citationType = $(citationElement).attr('bel:type');

        // Get the reference identifier, if any
        //var referenceElements = citationElement.getElementsByTagName('bel\\:reference');
        //if (referenceElements) referenceIdentifier = referenceElements[0].textContent;

        referenceIdentifier = $(citationElement).children('bel\\:reference').filter('first').text();
        // Get the bibliographic citation, if any

        // Get the title
        //var nameElements = citationElement.getElementsByTagName('bel\\:name');
        //if (nameElements) title = nameElements[0].textContent;
        title = $(citationElement).children('bel\\:name').filter('first').text();

        // TODO - "find or create"
        var citation = new exports.Citation(citationType, referenceIdentifier, bibliographicCitation, title);

        graph.addCitation(citation);

        // process the authors, if listed
        /*
         var authorGroups = citationElement.getElementsByTagName('bel\\:authorGroup');
         if (authorGroups && authorGroups.length > 0) {
         $.each(authorGroups[0].getElementsByTagName('bel\\:author'), function (index, authorElement) {
         citation.addContributor(authorElement.textContent);
         });
         }
         */

        var authorGroup = $(citationElement).children('bel\\:authorGroup').filter('first');
        if (authorGroup) {
            $(authorGroup).children('bel\\:author').each(function (index, author) {
                citation.addContributor(authorElement.textContent);
            });
        }

        return citation;

    }

    exports.processXBELEvidence = function (graph, evidenceElement, citation) {

        var text = $(evidenceElement).text();
        // TODO - "find or create"

        var support = new exports.Support(text);


        if (citation) {
            //console.log("citation = " + citation.id + " for support");
            support.citation = citation;
        } else {
            //console.log("citation = " + citation + " for support");
        }

        graph.addSupport(support);

        return support;
    }


})(typeof exports === 'undefined' ? this['jdex'] = {} : exports);


/*
 ------------------------------------
 RDF -> JDEx
 ------------------------------------
 */

/*
 exports.createGraphFromRDF = function (data){
 var graph = new exports.Graph();

 // The data elements in the schema are sections and
 // attributes.
 // The semantics of a section are controlled by its 'name'
 // property, essentially its type.

 $(data).find('"rdf\\:rdf"').each(function(){
 // The namespaces are held in the attributes of the RDF element
 //graph.nsMap = $(this).xmlns();

 $(this).find('"rdf\\:description"').each(function(){

 // for each description element, find or create the subject node
 // based either on the about or nodeID attributes
 var subjectIdentifier, subjectNode;

 if (subjectIdentifier = $(this).attr('rdf:about')){

 // rdf:about identifies a node corresponding to an external resource by its uri
 subjectNode = graph.findOrCreateNodeByIdentifier(subjectIdentifier);
 subjectNode.rdfURI = "<" + subjectIdentifier + ">";
 subjectNode.label = subjectIdentifier;

 } else if (subjectIdentifier = $(this).attr('rdf:nodeID')){

 // rdf:nodeId identifies a blank node in the graph
 subjectNode = graph.findOrCreateNodeByIdentifier(subjectIdentifier);
 subjectNode.rdfNodeId = "_:" + subjectIdentifier;
 subjectNode.label = subjectIdentifier;
 }

 // If we have successfully found / created the subject node,
 // we can then find the predicate and the object node
 if (subjectNode){
 $(this).find('*').each(function(){
 var tagName = $(this)[0].tagName;
 if (tagName == "rdf:type"){
 // treat type specially
 if (objectIdentifier = $(this).attr('rdf:resource')){
 subjectNode.type = objectIdentifier;
 }
 } else {
 var predicate = graph.findOrCreateTerm(tagName);
 var literalValue = $(this).text();
 var objectNode, objectIdentifier;
 if (literalValue){

 // if the element has a value, that is a literal value.
 // We assign it to the node as a literalValue
 subjectNode.properties[tagName] = literalValue;

 } else {
 if (objectIdentifier = $(this).attr('rdf:nodeID')){

 // if the element has an rdf:nodeId attribute,
 // that identifies a blank node in the graph
 objectNode = graph.findOrCreateNodeByIdentifier(objectIdentifier);
 objectNode.properties['rdfNodeId'] = "_:" + objectIdentifier;
 objectNode.properties['label'] = objectIdentifier;

 } else if (objectIdentifier = $(this).attr('rdf:resource')){

 // if the element has an rdf:resource attribute,
 // that identifies an graph node by an external resource
 objectNode = graph.findOrCreateNodeByIdentifier(objectIdentifier);
 objectNode.properties['rdfURI'] = "<" + objectIdentifier + ">";
 objectNode.properties['label']  = objectIdentifier;
 }
 // Now we can find or create the graph edge
 if (subjectNode && predicate && objectNode){
 graph.findOrCreateEdge(subjectNode, predicate, objectNode);
 }
 }
 }

 });

 }

 });

 });

 return graph;

 }

 */
