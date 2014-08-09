/*==============================================================================*
 *                               NDEx Angular Cytoscape  Module
 *
 * Description : The module consists of services to incorporate a cytoscape.js-based
 *               visualizer in a given view
 *
 * Notes       : Based on ndex-service.js, same caveats as to potential conversion to resource...
 *
 *==============================================================================*/


//angularjs suggested function closure
(function() {
    var cytoscapeServiceApp = angular.module('cytoscapeServiceApp', []);


    cytoscapeServiceApp.factory('cytoscapeService',['ndexService', '$q', function(ndexService, $q) {
        /*
        // define and initialize factory object
        var factory = {};
        var cy;     // variable for the cytoscape instance
        var listeners = {};
        //
        // There is one cyGraph that the service maintains.
        // The content of the graph is updated by cytoscapeService methods
        // The cytoscape instance for the view expects a container named "canvas" in which to render
        //

        factory.initCyGraph = function(){
            var deferred = $q.defer();

            // elements
            var eles = [];

            $(function(){ // on dom ready

                cy = cytoscape({
                    container: $('#canvas')[0],

                    style: cytoscape.stylesheet()
                        .selector('node')
                        .css({
                            'content': 'data(name)',
                            'height': 80,
                            'width': 'mapData(weight, 1, 200, 1, 200)',
                            'text-valign': 'center',
                            'color': 'white',
                            'text-outline-width': 2,
                            'text-outline-color': '#888'
                        })
                        .selector('edge')
                        .css({
                            'target-arrow-shape': 'triangle'
                        })
                        .selector(':selected')
                        .css({
                            'background-color': 'black',
                            'line-color': 'black',
                            'target-arrow-color': 'black',
                            'source-arrow-color': 'black',
                            'text-outline-color': 'black'
                        }),

                    layout: {
                        name: 'cose',
                        padding: 10
                    },

                    elements: eles,

                    ready: function(){
                        deferred.resolve( this );

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

        factory.setNetwork = function (network){
            cy.elements = {nodes: [], edges: []};

            $.each(network.nodes, function (index, node) {
                var label = ndexService.getTermLabel(network.terms[node.represents], network);

                 //if (node.represents && network.terms && network.terms[node.represents]) {
                 //var term = network.terms[node.represents];
                 //label = term.name;
                 //}

                var cyNode = {data: {id: "n" + index, name: label}};
                cy.elements.nodes.push(cyNode);

            });

            $.each(network.edges, function (index, edge) {
                var cyEdge = {data: {source: "n" + edge.s, target: "n" + edge.o}};
                cy.elements.edges.push(cyEdge);
            });

        };



        function fire(e, args){
            var eventListeners = listeners[e];

            for( var i = 0; eventListeners && i < eventListeners.length; i++ ){
                var fn = eventListeners[i];

                fn.apply( fn, args );
            }
        }

        function listen(e, fn){
            var eventListeners = eventListeners[e] = listeners[e] || [];

            eventListeners.push(fn);
        }

        factory.initCyGraph();
 */
        // return factory object
        return factory;
    }


    ]);
}) (); //end function closure
