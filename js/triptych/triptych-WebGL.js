
Triptych.WebGLVisualizer = function(){
	
	this.showLabels = true;
	this.showEdgeLabels = true;
	this.nodeDisplayers = {};
	this.edgeDisplayers = {};
	this.timeLoop = {};

};

Triptych.WebGLVisualizer.prototype = new Triptych.Visualizer();

Triptych.WebGLVisualizer.prototype.constructor = Triptych.WebGLVisualizer;

//--------------------------------------
//
// Displayers
//
//--------------------------------------

// get node displayer
Triptych.WebGLVisualizer.prototype.getNodeDisplayer = function(node){
	var displayer = this.nodeDisplayers[node.type];
	return displayer || this.defaultNodeDisplayer;
};

// add node displayer
Triptych.WebGLVisualizer.prototype.addNodeDisplayer = function(type, displayer){
	displayer.visualizer = this;
	this.nodeDisplayers[type] = displayer;
};

// get edge displayer
Triptych.WebGLVisualizer.prototype.getEdgeDisplayer = function(edge){
	var displayer = this.edgeDisplayers[edge.relationship.type];
	return displayer || this.defaultEdgeDisplayer;
};

// add edge displayer
Triptych.WebGLVisualizer.prototype.addEdgeDisplayer = function(type, displayer){
	displayer.visualizer = this;
	this.edgeDisplayers[type] = displayer;
};

//--------------------------------------
//
// Basic WebGL Node Displayer
//
//--------------------------------------

Triptych.WebGLNodeDisplayer = function(){
	this.plainMaterialName = "defaultSurfaceMaterial";
	this.selectMaterialName = "defaultSurfaceSelectedMaterial";
	this.highlightMaterialName = "defaultSurfaceHighlightedMaterial";
};

Triptych.WebGLNodeDisplayer.prototype = {

	constructor : Triptych.WebGLNodeDisplayer,
	
	update : function(node){
		this.updateMain(node);
		this.updateLabel(node);
		this.updateAnimation(node);
	},
	
	updateMain : function(node){
		if (!node.displayList.main){
			node.displayList.main = this.makeMain(node);
			this.visualizer.addElement(node.displayList.main, node, 'main');
		} 
		if (node.selected){
			this.select(node);
		} else if (node.highlighted){
			this.highlight(node);
		} else {
			this.plain(node);
		}	
		node.displayList.main.position.copy(node.position);
	},
	
	updateLabel : function(node){
		if (this.visualizer.showLabels == true && node.label){
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
		}
	},
	
	updateAnimation : function(node){
		if (node.animated){
			this.animate(node);
		} else {
			this.stopAnimation(node);
		}
	},
	
	makeMain : function(node){
		var geometry = new THREE.SphereGeometry( 1, 0.32, 0.16 );
		return this.visualizer.makeMesh(node.position, this.visualizer.resources[this.plainMaterialName], geometry, 10);
	},
	
	makeLabel : function(node){
 		 return this.visualizer.makeTextSprite(node.label, 36, "white");
	},
	
	highlight : function(node){
		node.displayList.main.material = this.visualizer.resources[this.highlightMaterialName];
	},
	
	select : function(node){
		node.displayList.main.material = this.visualizer.resources[this.selectMaterialName];
	},
	
	plain : function(node){
		node.displayList.main.material = this.visualizer.resources[this.plainMaterialName];
	},
	
	animate : function(node){
		
	},
	
	stopAnimation : function(node){
		
	}
	
};

//--------------------------------------
//
// Basic WebGL Sprite Node Displayer
//
//--------------------------------------

Triptych.SpriteNodeDisplayer = function(){
	this.plainMapName = "defaultSpriteMap";
	this.selectMapName = "defaultSpriteMap";
	this.highlightMapName = "defaultSpriteMap";
};

Triptych.SpriteNodeDisplayer.prototype = new Triptych.WebGLNodeDisplayer();

Triptych.SpriteNodeDisplayer.prototype.constructor = Triptych.SpriteNodeDisplayer;

Triptych.SpriteNodeDisplayer.prototype.updateMain = function(node){
		if (!node.displayList.main){
			node.displayList.main = this.makeMain(node);
			this.visualizer.addElement(node.displayList.main, node, 'main');
			
			// 
			// The "main" is required for intercepting mouse events
			// but it is not visible
			//
			node.displayList.main.visible = false;
		} 
		if (!node.displayList.sprite){
			node.displayList.sprite = this.makeSprite(node);
			this.visualizer.addElement(node.displayList.sprite, node, 'sprite');
		}
		if (node.selected){
			this.select(node);
		} else if (node.highlighted){
			this.highlight(node);
		} else {
			this.plain(node);
		}
				
		node.displayList.main.position.copy(node.position);
		node.displayList.sprite.position.copy(node.position);
};


Triptych.SpriteNodeDisplayer.prototype.makeSprite = function(node){
	var map = this.visualizer.resources[this.plainMapName];
	var sprite = new THREE.Sprite( { map: map, useScreenCoordinates: false, color: 0xffffff} );
	sprite.scale.x = sprite.scale.y = 0.1;
	return sprite;
};

Triptych.SpriteNodeDisplayer.prototype.highlight = function(node){
		node.displayList.sprite.map = this.visualizer.resources[this.highlightMapName];
};
	
Triptych.SpriteNodeDisplayer.prototype.select = function(node){
		node.displayList.sprite.map = this.visualizer.resources[this.selectMapName];
};

Triptych.SpriteNodeDisplayer.prototype.plain = function(node){
		node.displayList.sprite.map = this.visualizer.resources[this.plainMapName];
};



//--------------------------------------
//
// EdgeDisplayers
//
//--------------------------------------

Triptych.WebGLEdgeDisplayer = function(){
	this.plainMaterialName = "defaultLineMaterial";
	this.selectMaterialName = "defaultLineSelectedMaterial";
	this.highlightMaterialName = "defaultLineHighlightedMaterial";
};

Triptych.WebGLEdgeDisplayer.prototype = new Triptych.EdgeDisplayer();

Triptych.WebGLEdgeDisplayer.prototype = {

	constructor : Triptych.WebGLEdgeDisplayer,

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
		var geometry = edge.displayList.main.geometry;
		var fromV3 = geometry.vertices[0];
		var toV3 = geometry.vertices[1];
		fromV3.copy(edge.from.position);
		toV3.copy(edge.to.position);
		geometry.verticesNeedUpdate = true;
	},
	
	updateLabel : function(edge){
		if (this.visualizer.showEdgeLabels == true){
			if (!edge.displayList.label) {
				edge.displayList.label = this.makeLabel(edge);
				this.visualizer.addElement(edge.displayList.label, edge, 'label');
			}
			var v = edge.getVector();
			edge.displayList.label.position = edge.from.position.clone().add(v.multiplyScalar(0.5));
			edge.displayList.label.matrix.lookAt( this.visualizer.camera.position, edge.displayList.label.position, this.visualizer.camera.up );
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
		return this.visualizer.makeTextSprite(edge.relationship.type, 28, "yellow", null);
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

//--------------------------------------
//
// Object Intersection
//
//--------------------------------------

Triptych.WebGLVisualizer.prototype.findIntersectedObjects = function(mouse){
	var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
	this.projector.unprojectVector( vector, this.camera );

	var ray = new THREE.Ray( this.camera.position, vector.sub( this.camera.position ).normalize() );

	this.intersectedObjects = ray.intersectObjects( this.scene.children );
};

Triptych.WebGLVisualizer.prototype.findClosestIntersectedElement = function(mouse){
	this.findIntersectedObjects(mouse);
	for (var i = 0; i < this.intersectedObjects.length; i++){
		var intersected = this.intersectedObjects[i];
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


//--------------------------------------
//
// Init method (required for all visualizers)
//
//--------------------------------------


Triptych.WebGLVisualizer.prototype.init = function(width, height, camera){
	this.renderer = new THREE.WebGLRenderer( { antialias: true } );
	this.renderer.setSize( width, height);
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

Triptych.WebGLVisualizer.prototype.initDefaultDisplayers = function(){
	this.defaultNodeDisplayer = new Triptych.WebGLNodeDisplayer();
	this.defaultNodeDisplayer.visualizer = this;
	this.defaultEdgeDisplayer = new Triptych.WebGLEdgeDisplayer();
	this.defaultEdgeDisplayer.visualizer = this;
	
};

Triptych.WebGLVisualizer.prototype.initDisplayers = function(){
	
};

//--------------------------------------
//
// TimeLoops
//
//--------------------------------------

Triptych.WebGLVisualizer.prototype.initTimeLoops = function(){
	this.timeLoop.start = Date.now();
	this.timeLoop.stepFraction = 0;
	this.timeLoop.cycleFraction = 0;
	this.timeLoop.stepTime = 1000;  // milliseconds
	this.timeLoop.numberOfSteps = 1;
	this.timeLoop.step = 0;
	
};

// (required for all visualizers)
Triptych.WebGLVisualizer.prototype.updateTimeLoops = function(){

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

Triptych.WebGLVisualizer.prototype.initLights = function(){
	var pointLight = new THREE.PointLight( 0xFFFFFF );
	pointLight.position.set(10, 50, 500);
	this.scene.add(pointLight);
	
	this.cameraLight = new THREE.PointLight( 0xFFFFFF );
	this.cameraLight.position.copy(this.camera.position); 
	this.scene.add(this.cameraLight);
};

// (required for all visualizers)
Triptych.WebGLVisualizer.prototype.updateLights = function(graph){

	if (this.cameraLight) this.cameraLight.position.copy(this.camera.position);
	
};

//--------------------------------------
//
// Node Updating - (required for all visualizers)
//
//--------------------------------------

Triptych.WebGLVisualizer.prototype.updateNode = function(node){
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

Triptych.WebGLVisualizer.prototype.updateEdge = function(edge){
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

Triptych.WebGLVisualizer.prototype.initDefaultResources = function(node){
	this.resources.defaultLineMaterial = new THREE.LineBasicMaterial( { color: 0xff0000, opacity: 1.0 } );
	this.resources.defaultLineSelectedMaterial = new THREE.LineBasicMaterial( { color: 0xffff00, opacity: 1.0 } );
	this.resources.defaultLineHighlightedMaterial = new THREE.LineBasicMaterial( { color: 0x00ffff, opacity: 1.0 } );
	this.resources.defaultSurfaceMaterial = new THREE.MeshPhongMaterial( { color: 0xff3333,  specular:0xbbaa99, shininess:50, shading: THREE.SmoothShading } );
	this.resources.defaultSurfaceSelectedMaterial = new THREE.MeshPhongMaterial( { color: 0xffff00, specular:0xbbaa99, shininess:50, shading: THREE.SmoothShading  } );
	this.resources.defaultSurfaceHighlightedMaterial = new THREE.MeshPhongMaterial( { color: 0x00ffff, specular:0xbbaa99, shininess:50, shading: THREE.SmoothShading } );

};

Triptych.WebGLVisualizer.prototype.initResources = function(){
};


//--------------------------------------
//
// Graphics Utilities
//
//--------------------------------------

Triptych.WebGLVisualizer.prototype.makeLine = function (v1, v2, lineMaterial){

	var lineGeometry = new THREE.Geometry();
	lineGeometry.dynamic = true;
	lineGeometry.vertices.push( v1.clone()  );
	lineGeometry.vertices.push( v2.clone()  );
	return new THREE.Line( lineGeometry, lineMaterial );
	
};

Triptych.WebGLVisualizer.prototype.makeMesh = function (position, material, geometry, scale){

	var mesh = new THREE.Mesh( geometry, material );
	mesh.position.copy(position);
	mesh.scale.x = mesh.scale.y = mesh.scale.z = scale;
	return mesh;
	
};

Triptych.WebGLVisualizer.prototype.getPowerOfTwo = function (value, pow) {
	var pow = pow || 1;
	while(pow<value) {
		pow *= 2;
	}
	return pow;
};


Triptych.WebGLVisualizer.prototype.makeTextSprite = function (text, size, color, backGroundColor, backgroundMargin) {
	if(!backgroundMargin) backgroundMargin = 50;

	var canvas = document.createElement("canvas");

	var context = canvas.getContext("2d");
	context.font = size + "pt Arial";

	var textWidth = context.measureText(text).width;
	
	var dimension = Math.max(textWidth + backgroundMargin, size + backgroundMargin);

	canvas.width = dimension;
	canvas.height = dimension;
	context = canvas.getContext("2d");
	context.font = size + "pt Arial";
/*
	if(backGroundColor) {
		context.fillStyle = backGroundColor;
		context.fillRect(
						canvas.width / 2 - textWidth / 2 - backgroundMargin / 2, 
						canvas.height / 2 - size / 2 - +backgroundMargin / 2, 
						textWidth + backgroundMargin, 
						size + backgroundMargin);
	}
*/
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillStyle = color;
	context.fillText(text, canvas.width / 2, canvas.height / 2);


	var texture = new THREE.Texture(canvas);
	texture.needsUpdate = true;

	var sprite = new THREE.Sprite( { map: texture, useScreenCoordinates: false, color: 0xffffff} );
	sprite.scale.set(0.15, 0.15);

	return sprite;
};

Triptych.WebGLVisualizer.prototype.scaleAndRotateEdge = function(edge, object, useMidpoint){
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




