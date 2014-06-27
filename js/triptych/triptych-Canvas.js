/*
   Copyright 2012 Dexter Pratt

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/


Triptych.CanvasVisualizer = function(){
	
	this.showLabels = true;
	this.showEdgeLabels = true;
	this.nodeDisplayers = {};
	this.edgeDisplayers = {};
	this.timeLoop = {};

};

Triptych.CanvasVisualizer.prototype = new Triptych.Visualizer();

Triptych.CanvasVisualizer.prototype.constructor = Triptych.CanvasVisualizer;

//--------------------------------------
//
// Displayers
//
//--------------------------------------

// get node displayer
Triptych.CanvasVisualizer.prototype.getNodeDisplayer = function(node){
	var displayer = this.nodeDisplayers[node.type];
	return displayer || this.defaultNodeDisplayer;
};

// add node displayer
Triptych.CanvasVisualizer.prototype.addNodeDisplayer = function(type, displayer){
	displayer.visualizer = this;
	this.nodeDisplayers[type] = displayer;
};

// get edge displayer
Triptych.CanvasVisualizer.prototype.getEdgeDisplayer = function(edge){
	var displayer = this.edgeDisplayers[edge.relationship.type];
	return displayer || this.defaultEdgeDisplayer;
};

// add edge displayer
Triptych.CanvasVisualizer.prototype.addEdgeDisplayer = function(type, displayer){
	displayer.visualizer = this;
	this.edgeDisplayers[type] = displayer;
};

//--------------------------------------
//
// Particle Node Displayer
//
//--------------------------------------

Triptych.ParticleNodeDisplayer = function(){
	this.plainMaterialName = "defaultNodeParticleMaterial";
	this.selectMaterialName = "defaultNodeSelectedParticleMaterial";
	this.highlightMaterialName = "defaultNodeHighlightedParticleMaterial";
	
	this.plainColor = 0xff0000;
	this.selectColor = 0xffff00;
	this.highlightColor = 0x00ffff;
	this.PI2 = Math.PI * 2;
};

Triptych.ParticleNodeDisplayer.prototype = {

	constructor : Triptych.ParticleNodeDisplayer,
	
	update : function(node){
		this.updateMain(node);
		this.updateLabel(node);
		this.updateAnimation(node);
	},
	
	updateMain : function(node){
		if (!node.displayList.main){
			node.displayList.main = this.makeMain(node);
			this.visualizer.addElement(node.displayList.main, node, 'main');
			
			// 
			// The "main" is required for intercepting mouse events
			// but it is not visible
			//
			node.displayList.main.visible = false;
		} 
		
		if (!node.displayList.particle){
			node.displayList.particle = this.makeParticle(node);
			this.visualizer.addElement(node.displayList.particle, node, 'particle');
		}
		if (node.selected){
			this.select(node);
		} else if (node.highlighted){
			this.highlight(node);
		} else {
			this.plain(node);
		}
				
		node.displayList.main.position.copy(node.position);
		node.displayList.particle.position.copy(node.position);	},
	
	updateLabel : function(node){
		if (this.visualizer.showLabels == true){
			if (!node.displayList.label) {
				node.displayList.label = this.makeLabel(node);
				this.visualizer.addElement(node.displayList.label, node, 'label');
			}
			var pos = node.displayList.label.position;
			pos.copy(node.position);
			pos.add(this.visualizer.camera.up.clone().multiplyScalar(20));
			var vectorToCamera = this.visualizer.camera.position.clone().sub( pos );
			pos.add(vectorToCamera.normalize().multiplyScalar(20));
			node.displayList.label.visible = true;
		} else if (node.displayList.label){
			node.displayList.label.visible = false;
		}
	},
	
	updateAnimation : function(node){
		if (node.animated){
			this.animate(node);
		} else {
			this.stopAnimation(node);
		}
	},
	
	makeParticle : function(node){
		var material = this.visualizer.resources[this.plainMaterialName];
		//var particle = new THREE.Particle( new THREE.ParticleCanvasMaterial( { color: this.plainColor, program: this.programFill } ) );
        var particle = new THREE.Sprite( material );
		//var particle = new THREE.Particle( material );
		particle.scale.set(0.1, 0.1);
		particle.visible = true;
		return particle;
	},
	
	programFill : function(context){
		
		context.beginPath();
		context.arc( 0, 0, 1, 0, this.PI2, true );
		context.closePath();
		context.fill();
	},

	makeMain : function(node){
		var particle = new THREE.Particle( new THREE.ParticleCanvasMaterial( { color: 0xffffff, program: this.programFill } ) );
		particle.scale.set(10, 10);
		particle.visible = true;
		return particle;
	},
	
	makeLabel : function(node){
 		 return this.visualizer.makeTextParticle(node.label, 18, "white");
	},
	
	highlight : function(node){
		node.displayList.particle.material = this.visualizer.resources[this.highlightMaterialName];
		//node.displayList.particle.material.color = this.highlightColor;
	},
	
	select : function(node){
		node.displayList.particle.material = this.visualizer.resources[this.selectMaterialName];
		//node.displayList.particle.material.color = this.selectColor;
	},
	
	plain : function(node){
		node.displayList.particle.material = this.visualizer.resources[this.plainMaterialName];
		//node.displayList.particle.material.color = this.plainColor;
	},
	
	animate : function(node){
		
	},
	
	stopAnimation : function(node){
		
	}
	
};



//--------------------------------------
//
// EdgeDisplayers
//
//--------------------------------------

Triptych.LineEdgeDisplayer = function(){
	this.plainMaterialName = "defaultLineMaterial";
	this.selectMaterialName = "defaultLineSelectedMaterial";
	this.highlightMaterialName = "defaultLineHighlightedMaterial";
};

Triptych.LineEdgeDisplayer.prototype = new Triptych.EdgeDisplayer();

Triptych.LineEdgeDisplayer.prototype = {

	constructor : Triptych.LineEdgeDisplayer,

	update : function(edge){
		this.updateMain(edge);
		this.updateLabel(edge);
		this.updateAnimation(edge);
	},
	
	updateMain : function(edge){
		if (!edge.displayList.main){
			edge.displayList.main = this.makeMain(edge);
			this.visualizer.addElement(edge.displayList.main, edge, 'main');
		} 
		if (edge.to.selected || edge.from.selected){
			this.select(edge);
		} else if (edge.to.highlighted || edge.from.highlighted){
			this.highlight(edge);
		} else {
			this.plain(edge);
		}
		this.positionMain(edge);
		
	},
	
	positionMain : function(edge){
		var fromV3 = edge.displayList.main.geometry.vertices[0];
		var toV3 = edge.displayList.main.geometry.vertices[1];
		fromV3.copy(edge.from.position);
		toV3.copy(edge.to.position);
		edge.displayList.main.geometry.__dirtyVertices = true;
	},
	
	updateLabel : function(edge){
		if (this.visualizer.showEdgeLabels == true){
			if (!edge.displayList.label) {
				edge.displayList.label = this.makeLabel(edge);
				this.visualizer.addElement(edge.displayList.label, edge, 'label');
			}
			var v = edge.getVector();
			edge.displayList.label.position = edge.from.position.clone().add(v.multiplyScalar(0.5));
		}
	},
	
	updateAnimation : function(edge){
		if (edge.animated){
			this.animate(edge);
		} else {
			this.stopAnimation(edge);
		}
	},

	makeMain : function(edge){
		return this.visualizer.makeLine( edge.from.position, edge.to.position, this.visualizer.resources[this.plainMaterialName] );
	},
	
	makeLabel : function(edge){
		return this.visualizer.makeTextParticle(edge.relationship.type, 14, "yellow", null);
	},
	
	highlight : function(edge){
		edge.displayList.main.material = this.visualizer.resources[this.highlightMaterialName];
	},
	
	select : function(edge){
		edge.displayList.main.material = this.visualizer.resources[this.selectMaterialName];
	},
	
	plain : function(edge){
		edge.displayList.main.material = this.visualizer.resources[this.plainMaterialName];
	},
		
	animate : function(edge){
		
	},
	
	stopAnimation : function(edge){
		
	}

};


Triptych.ShapeEdgeDisplayer = function(){
	this.plainMaterialName = "defaultMeshMaterial";
	this.selectMaterialName = "defaultSelectedMeshMaterial";
	this.highlightMaterialName = "defaultHighlightedMeshMaterial";
	
	this.edgeGeometryName = "defaultEdgeGeometry";
};

Triptych.ShapeEdgeDisplayer.prototype = new Triptych.LineEdgeDisplayer();

Triptych.ShapeEdgeDisplayer.prototype.constructor = Triptych.ShapeEdgeDisplayer;
	
Triptych.ShapeEdgeDisplayer.prototype.positionMain = function(edge){
	this.visualizer.scaleAndRotateEdge(edge, edge.displayList.main, false);
		//edge.displayList.main.position = edge.getMidPoint();
};

Triptych.ShapeEdgeDisplayer.prototype.makeMain = function(edge){
	return this.visualizer.makeShape( this.visualizer.resources[this.edgeGeometryName], this.visualizer.resources[this.plainMaterialName] );
};

//--------------------------------------
//
// Object Intersection
//
//--------------------------------------

Triptych.CanvasVisualizer.prototype.findIntersectedObjects = function(mouse){
	var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
	this.projector.unprojectVector( vector, this.camera );

	var ray = new THREE.Ray( this.camera.position, vector.sub( this.camera.position ).normalize() );

	this.intersectedObjects = ray.intersectObjects( this.scene.children );
	//this.intersectedObjects = ray.intersectScene( this.scene );
};

Triptych.CanvasVisualizer.prototype.findClosestIntersectedElement = function(mouse){
	this.findIntersectedObjects(mouse);
	for (var i = 0; i < this.intersectedObjects.length; i++){
		var intersected = this.intersectedObjects[i];
		//console.log("int " + intersected.object.id );
		var elementAndRole = this.getElementAndRoleByDisplayObject(intersected.object);
		if ( elementAndRole ){
			var element = elementAndRole[0];
			var role = elementAndRole[1];
			if (Triptych.Node == element.constructor) {
				this.lastIntersectedElement = this.intersectedElement;
				this.lastIntersectionRole = this.intersectionRole;
				this.intersectedElement = element;
				this.intersectionRole = role;
				return;
			}
		}
	}
	this.lastIntersectedElement = this.intersectedElement;
	this.lastIntersectionRole = this.intersectionRole;
	this.intersectedElement = null;
	this.intersectionRole = null;
};

Triptych.CanvasVisualizer.prototype.getScreenPosition = function(cameraDistance, x, y){
	var vector = new THREE.Vector3( x, y, 1 );
	this.projector.unprojectVector( vector, this.camera );

	var foo = vector.normalize().multiplyScalar(cameraDistance);
	
	var pos = this.camera.position.clone();
	pos.add(foo);
	return pos;
	//return vector.sub( this.camera.position ).normalize().multiplyScalar(cameraDistance) ;
};

Triptych.CanvasVisualizer.prototype.getScreenPosition2 = function(cameraDistance, x, y){
	var vector = new THREE.Vector3( x, y, 1 );
	this.projector.unprojectVector( vector, this.camera );
	
	

	return vector.sub( this.camera.position ).normalize().multiplyScalar(cameraDistance) ;
};

Triptych.CanvasVisualizer.prototype.getScreenPositionInFractions = function(cameraDistance, xFraction, yFraction){
	var x = xFraction * this.renderer.domElement.clientWidth;
	var y = yFraction * this.renderer.domElement.clientHeight;
	return this.getScreenPosition(cameraDistance, x, y);
};

//--------------------------------------
//
// Init method (required for all visualizers)
//
//--------------------------------------


Triptych.CanvasVisualizer.prototype.init = function(width, height, camera){
	this.renderer = new THREE.CanvasRenderer({alpha: true});
	this.renderer.setSize( width, height);
    this.renderer.setClearColor( 0xffffff, 1);
	this.projector = new THREE.Projector();
	
	this.camera = camera;	
	this.scene.add(this.camera);
	
	this.initDefaultDisplayers();
	this.initDisplayers();
	
	this.initDefaultResources();
	this.initResources();
	
	this.initTimeLoops();

	this.initLights();
	
	// What does this do?
	this.renderer.autoClear = false;
	this.scene.matrixAutoUpdate = false;

};

Triptych.CanvasVisualizer.prototype.initDefaultDisplayers = function(){
	this.defaultNodeDisplayer = new Triptych.ParticleNodeDisplayer();
	this.defaultNodeDisplayer.visualizer = this;
	this.defaultEdgeDisplayer = new Triptych.LineEdgeDisplayer();
	this.defaultEdgeDisplayer.visualizer = this;
	
};

Triptych.CanvasVisualizer.prototype.initDisplayers = function(){
	
};

//--------------------------------------
//
// TimeLoops
//
//--------------------------------------

Triptych.CanvasVisualizer.prototype.initTimeLoops = function(){
	this.timeLoop.start = Date.now();
	this.timeLoop.stepFraction = 0;
	this.timeLoop.cycleFraction = 0;
	this.timeLoop.stepTime = 1000;  // milliseconds
	this.timeLoop.numberOfSteps = 1;
	this.timeLoop.step = 0;
	
};

// (required for all visualizers)
Triptych.CanvasVisualizer.prototype.updateTimeLoops = function(){

	var elapsedTime = Date.now() - this.timeLoop.start;
	var cycle = this.timeLoop.stepTime * this.timeLoop.numberOfSteps;
	this.timeLoop.stepFraction = (elapsedTime%this.timeLoop.stepTime)/this.timeLoop.stepTime;
	this.timeLoop.cycleFraction = (elapsedTime%cycle)/cycle;
	this.timeLoop.step = Math.floor(this.timeLoop.cycleFraction * this.timeLoop.numberOfSteps);
	//console.log("step " + this.timeLoop.step + " " + this.timeLoop.stepFraction);
	
};

//--------------------------------------
//
// Lighting
//
//--------------------------------------

Triptych.CanvasVisualizer.prototype.initLights = function(){
	var pointLight = new THREE.PointLight( 0xFFFFFF );
	pointLight.position.set(10, 50, 500);
	this.scene.add(pointLight);
	
	this.cameraLight = new THREE.PointLight( 0xFFFFFF );
	this.cameraLight.position.copy(this.camera.position); 
	this.scene.add(this.cameraLight);
};

// (required for all visualizers)
Triptych.CanvasVisualizer.prototype.updateLights = function(graph){

	if (this.cameraLight) this.cameraLight.position.copy(this.camera.position);
	
};

//--------------------------------------
//
// Node Updating - (required for all visualizers)
//
//--------------------------------------

Triptych.CanvasVisualizer.prototype.updateNode = function(node){
	if (!node.displayer){
		node.displayer = this.getNodeDisplayer(node);
	}
	node.displayer.update(node);
};

//--------------------------------------
//
// Edge Updating - (required for all visualizers)
//
//--------------------------------------

Triptych.CanvasVisualizer.prototype.updateEdge = function(edge){
	if (!edge.displayer){
		edge.displayer = this.getEdgeDisplayer(edge);
	}
	edge.displayer.update(edge);
};

//--------------------------------------
//
// Resources
//
//--------------------------------------

Triptych.CanvasVisualizer.prototype.initDefaultResources = function(node){
	this.resources.defaultLineMaterial = new THREE.LineBasicMaterial( { color: 0x000000, opacity: 1.0 } );
	this.resources.defaultLineSelectedMaterial = new THREE.LineBasicMaterial( { color: 0xffff00, opacity: 1.0 } );
	this.resources.defaultLineHighlightedMaterial = new THREE.LineBasicMaterial( { color: 0x00ffff, opacity: 1.0 } );

	this.resources.defaultNodeParticleMaterial = this.makeCircleParticleMaterial(100, '#CCCCCC');
	this.resources.defaultNodeSelectedParticleMaterial = this.makeCircleParticleMaterial(100, '#ffff00');
	this.resources.defaultNodeHighlightedParticleMaterial  = this.makeCircleParticleMaterial(100, '#00ffff');
	
	this.resources.defaultMeshMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } ) ;
	this.resources.defaultSelectedMeshMaterial = new THREE.MeshBasicMaterial( { color: 0xffff00 } ) ;
	this.resources.defaultHighlightedMeshMaterial  = new THREE.MeshBasicMaterial( { color: 0x0000ff } ) ;
 /*
	this.resources.defaultEdgeGeometry  = new Triptych.ArrowGeometry(this.edgeReferenceLength) ;
	*/
};

Triptych.CanvasVisualizer.prototype.initResources = function(){
};


//--------------------------------------
//
// Graphics Utilities
//
//--------------------------------------

Triptych.CanvasVisualizer.prototype.makeLine = function (v1, v2, lineMaterial){

	var lineGeometry = new THREE.Geometry();
	lineGeometry.dynamic = true;
	lineGeometry.vertices.push( v1.clone()  );
	lineGeometry.vertices.push( v2.clone() );
	return new THREE.Line( lineGeometry, lineMaterial );
	
};


Triptych.CanvasVisualizer.prototype.getPowerOfTwo = function (value, pow) {
	var pow = pow || 1;
	while(pow<value) {
		pow *= 2;
	}
	return pow;
};


Triptych.CanvasVisualizer.prototype.makeTextParticle = function (text, size, color) {
	var backgroundMargin = 50;

	var canvas = document.createElement("canvas");

	var context = canvas.getContext("2d");
	context.font = size + "pt Arial";

	var textWidth = context.measureText(text).width;
	
	var dimension = Math.max(textWidth + backgroundMargin, size + backgroundMargin);

	canvas.width = dimension;
	canvas.height = dimension;
	context = canvas.getContext("2d");
	context.font = size + "pt Arial";
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillStyle = color;
	context.fillText(text, canvas.width / 2, canvas.height / 2);

	//var material = new THREE.ParticleBasicMaterial( { map: new THREE.Texture( canvas ), blending: THREE.AdditiveBlending } );
	var material = new THREE.ParticleBasicMaterial( { map: new THREE.Texture( canvas ) } );
	var textParticle = new THREE.Particle( material );

	textParticle.scale.set(0.5, 0.5);

	return textParticle;
};

Triptych.CanvasVisualizer.prototype.scaleAndRotateEdge = function(edge, object, useMidpoint){
	// the object is always built to be scaled in Z and rotated align with the vertices
	
	// scale object in Z
	var v = edge.getVector();
	var len = v.length();
	var scale = len / this.edgeReferenceLength;
	object.scale.z = scale;
	
	if (useMidpoint){
		object.position = edge.from.position.clone().add(v.multiplyScalar(0.5));
	} else {
		// place it at the edge "from" position
		object.position.copy(edge.from.position);
	}
	// make it look at the edge "to" position
	object.lookAt(edge.to.position);

};

Triptych.CanvasVisualizer.prototype.addBitmapParticleMaterial = function(resourceName, url){
	var texture = THREE.ImageUtils.loadTexture(url);
	if (texture){
		this.resources[resourceName] = new THREE.ParticleBasicMaterial( { map: texture} );
	}
};

Triptych.CanvasVisualizer.prototype.makeCircleParticleMaterial = function(size, color){

	var canvas = document.createElement( 'canvas' );
	canvas.width = size;
	canvas.height = size;

	var context = canvas.getContext( '2d' );
	var centerX, centerY, radius;
	
	centerX = centerY = size/2.0;
	radius = centerX * 0.9;
	context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        
	context.fillStyle = color;
	context.fill();

	//var material = new THREE.ParticleBasicMaterial( { map: new THREE.Texture( canvas ), blending: THREE.AdditiveBlending } );
	//var material = new THREE.ParticleBasicMaterial( { map: new THREE.Texture( canvas ) } );
    var material = new THREE.SpriteMaterial( {
        map: new THREE.Texture( canvas ),
        blending: THREE.AdditiveBlending
    } );
	return material;

};

Triptych.CanvasVisualizer.prototype.makeShape = function(geometry, material){
	var shape = new THREE.Mesh( geometry, material );
	shape.doubleSided = true;
	return shape;
};

/*
Triptych.ArrowGeometry = function(edgeReferenceLength){

	var zMax = edgeReferenceLength * 0.8;
	var zMin = edgeReferenceLength * 0.6;
	var zIndent = edgeReferenceLength * 0.62;
	var zBase = edgeReferenceLength * 0.2;
	
	var yHalfWidth = 10;
	var yHalfBodyWidth = 4;

	// ArrowHead
	
	this.v(   0,   0,   zMax );  // point
	this.v(   0,   1,   zIndent );
	this.v(   0,   -1,   zIndent );
	this.v(   0,   yHalfWidth,   zMin);
	this.v(   0, - yHalfWidth,   zMin );
	
	
	this.f3( 0, 2, 3 );
	this.f3( 0, 1, 4 );
	
	// Arrow body
	
	this.v(   0,   yHalfBodyWidth,   zBase );
	this.v(   0,   - yHalfBodyWidth,   zBase);
	this.v(   0,   - yHalfBodyWidth,   zIndent );
	this.v(   0,   yHalfBodyWidth,   zIndent );
	
	this.f3( 5, 6, 7 );
	this.f3( 7, 8, 5 );
	
	this.computeCentroids();
	this.computeFaceNormals();
};

Triptych.ArrowGeometry.prototype = new THREE.Geometry();

Triptych.ArrowGeometry.prototype.constructor = Triptych.ArrowGeometry;

Triptych.ArrowGeometry.prototype.v = function ( x, y, z ) {

	this.vertices.push( new THREE.Vector3( x, y, z ) ) ;

};

Triptych.ArrowGeometry.prototype.f3 = function( a, b, c ) {

	this.faces.push( new THREE.Face3( a, b, c ) );

};


Triptych.ThinArrowGeometry = function(edgeReferenceLength){

	var zMax = edgeReferenceLength * 0.95;
	var zMin = edgeReferenceLength * 0.85;
	var zIndent = edgeReferenceLength * 0.87;
	var zBase = edgeReferenceLength * 0.05;
	
	var yHalfWidth = 6;
	var yHalfBodyWidth = 2;

	// ArrowHead
	
	this.v(   0,   0,   zMax );  // point
	this.v(   0,   1,   zIndent );
	this.v(   0,   -1,   zIndent );
	this.v(   0,   yHalfWidth,   zMin);
	this.v(   0, - yHalfWidth,   zMin );
	
	
	this.f3( 0, 2, 3 );
	this.f3( 0, 1, 4 );
	
	// Arrow body
	
	this.v(   0,   yHalfBodyWidth,   zBase );
	this.v(   0,   - yHalfBodyWidth,   zBase);
	this.v(   0,   - yHalfBodyWidth,   zIndent );
	this.v(   0,   yHalfBodyWidth,   zIndent );
	
	this.f3( 5, 6, 7 );
	this.f3( 7, 8, 5 );
	
	this.computeCentroids();
	this.computeFaceNormals();
};

Triptych.ThinArrowGeometry.prototype = new THREE.Geometry();

Triptych.ThinArrowGeometry.prototype.constructor = Triptych.ArrowGeometry;

Triptych.ThinArrowGeometry.prototype.v = function ( x, y, z ) {

	this.vertices.push( new THREE.Vector3( x, y, z ) ) ;

};

Triptych.ThinArrowGeometry.prototype.f3 = function( a, b, c ) {

	this.faces.push( new THREE.Face3( a, b, c ) );

};



Triptych.TArrowGeometry = function(edgeReferenceLength){

	var zMax = edgeReferenceLength * 0.95;
	var zMin = edgeReferenceLength * 0.85;
	var zIndent = edgeReferenceLength * 0.87;
	var zBase = edgeReferenceLength * 0.05;
	
	var yHalfWidth = 6;
	var yHalfBodyWidth = 2;

	// ArrowHead
	
	this.v(   0,   yHalfWidth,   zMax );  // point
	this.v(   0,   yHalfWidth,   zMin );
	this.v(   0,   -yHalfWidth,   zMax);
	this.v(   0,   -yHalfWidth,   zMin);
	this.v(   0, - yHalfWidth,   zMin );
	
	
	this.f3( 0, 2, 3 );
	this.f3( 0, 1, 4 );
	
	// Arrow body
	
	this.v(   0,   yHalfBodyWidth,   zBase );
	this.v(   0,   - yHalfBodyWidth,   zBase);
	this.v(   0,   - yHalfBodyWidth,   zIndent );
	this.v(   0,   yHalfBodyWidth,   zIndent );
	
	this.f3( 5, 6, 7 );
	this.f3( 7, 8, 5 );
	
	this.computeCentroids();
	this.computeFaceNormals();
};

Triptych.TArrowGeometry.prototype = new THREE.Geometry();

Triptych.TArrowGeometry.prototype.constructor = Triptych.ArrowGeometry;

Triptych.TArrowGeometry.prototype.v = function ( x, y, z ) {

	this.vertices.push( new THREE.Vector3( x, y, z ) ) ;

};

Triptych.TArrowGeometry.prototype.f3 = function( a, b, c ) {

	this.faces.push( new THREE.Face3( a, b, c ) );

};


Triptych.BarGeometry = function(edgeReferenceLength){

	var zMax = edgeReferenceLength;
	var zBase = 0;
	
	var yHalfWidth = 5;


	// Bar
	
	this.v(   0,   yHalfWidth,   zMax );  // point
	this.v(   0,   yHalfWidth,   zBase );
	this.v(   0,   -yHalfWidth,   zMax);
	this.v(   0, -yHalfWidth,   zBase );
	
	this.f3( 0, 2, 3 );
	this.f3( 0, 1, 3 );
	
	this.computeCentroids();
	this.computeFaceNormals();
};

Triptych.BarGeometry.prototype = new THREE.Geometry();

Triptych.BarGeometry.prototype.constructor = Triptych.ArrowGeometry;

Triptych.BarGeometry.prototype.v = function ( x, y, z ) {

	this.vertices.push( new THREE.Vector3( x, y, z ) ) ;

};

Triptych.BarGeometry.prototype.f3 = function( a, b, c ) {

	this.faces.push( new THREE.Face3( a, b, c ) );

};

 */


