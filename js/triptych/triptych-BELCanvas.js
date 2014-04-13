Triptych.BEL3DCanvasVisualizer = function(){
	this.displayValueBars = true;
};

Triptych.BEL3DCanvasVisualizer.prototype = new Triptych.CanvasVisualizer();

Triptych.BEL3DCanvasVisualizer.prototype.constructor = Triptych.BEL3DCanvasVisualizer;

//-------------------------------------------------------
//
// Displayers
//
//-------------------------------------------------------

Triptych.BEL3DCanvasNodeDisplayer = function(){
	this.plainMaterialName = "grayNodeMaterial";
};

Triptych.BEL3DCanvasNodeDisplayer.prototype = new Triptych.ParticleNodeDisplayer();

Triptych.BEL3DCanvasNodeDisplayer.prototype.constructor = Triptych.BEL3DCanvasNodeDisplayer;

Triptych.BEL3DCanvasNodeDisplayer.prototype.updateMain = function(node){
	if (!node.displayList.main){
		node.displayList.main = this.makeMain(node);
		this.visualizer.addElement(node.displayList.main, node, 'main');
	} 
	if (!node.displayList.particle){
			node.displayList.particle = this.makeParticle(node);
			this.visualizer.addElement(node.displayList.particle, node, 'particle');
	}
	if (!node.displayList.valueBar){
		node.displayList.valueBar = this.visualizer.makeValueBar(this.visualizer.resources[this.plainMaterialName]);
		this.visualizer.addElement(node.displayList.valueBar, node, 'valueBar');
	}
	var val = 0;
	if (node.perturbationStep != null && node.perturbationStep <= this.visualizer.timeLoop.step && node.values && node.values.length > 1){
		
		var firstIndex = this.visualizer.timeLoop.step;
		var delta;
		if (firstIndex == node.values.length -1){
			delta = node.values[0] - node.values[firstIndex];
		} else {
			delta = node.values[firstIndex + 1] - node.values[firstIndex];
		}
		val = node.values[firstIndex] + delta * this.visualizer.timeLoop.stepFraction;
		if (val > 0){		
			node.displayList.particle.material = this.visualizer.resources.redNodeMaterial;
		} else {
			node.displayList.particle.material = this.visualizer.resources.greenNodeMaterial;
		}		
	} else if (node.selected || node.perturbationStep != null){ 
		this.select(node);
	} else if (node.highlighted){
		this.highlight(node);
	} else {
		this.plain(node);
	}
	if (this.visualizer.displayValueBars && val && val != 0){
		node.displayList.valueBar.visible = true;
		node.displayList.valueBar.position.copy(node.position);
		var scale = Math.abs(val);
		node.displayList.valueBar.scale.z = scale;
		var barLength = scale * this.visualizer.edgeReferenceLength;
		if (val > 0){
			node.displayList.valueBar.position.z = node.position.z +  14;
			node.displayList.valueBar.material = this.visualizer.resources.redMeshMaterial;
		} else {
			node.displayList.valueBar.position.z = node.position.z - (14 + barLength);
			node.displayList.valueBar.material = this.visualizer.resources.greenMeshMaterial;
		}
	} else {
		node.displayList.valueBar.visible = false;
	}		
	node.displayList.main.position.copy(node.position);
	node.displayList.particle.position.copy(node.position);
};

Triptych.BEL3DCanvasNodeDisplayer.prototype.updateLabel = function(node){
	if (this.visualizer.showLabels == true || node.selected || node.highlighted || node.perturbationStep != null){
		if (!node.displayList.label) {
			node.displayList.label = this.makeLabel(node);
			this.visualizer.addElement(node.displayList.label, node, 'label');
		}
		
		// 1. start by adding a scaled clone of the camera up
		// 2. add a vector from that position to the camera
		var pos = node.displayList.label.position;
		pos.copy(node.position);
		pos.addSelf(this.visualizer.camera.up.clone().multiplyScalar(20));
		var vectorToCamera = this.visualizer.camera.position.clone().subSelf( pos );
		
		pos.addSelf(vectorToCamera.normalize().multiplyScalar(20));
		
		node.displayList.label.visible = true;
		
	} else if (node.displayList.label){
		node.displayList.label.visible = false;
	}
};

Triptych.BEL3DCanvasNodeDisplayer.prototype.stopAnimation = function(node){
	node.valueIndex = 0;
};


//------------------------------------------
// Causal Edge

Triptych.BEL3DCanvasCausalEdgeDisplayer = function(){
	this.plainMaterialName = "grayMeshMaterial";
	this.selectMaterialName = "purpleMeshMaterial";
	this.highlightMaterialName = "defaultHighlightedMeshMaterial";
	
	this.edgeGeometryName = "thinArrowGeometry";
};

Triptych.BEL3DCanvasCausalEdgeDisplayer.prototype = new Triptych.ShapeEdgeDisplayer();

Triptych.BEL3DCanvasCausalEdgeDisplayer.prototype.constructor = Triptych.BEL3DCanvasCausalEdgeDisplayer;


Triptych.BEL3DCanvasCausalEdgeDisplayer.prototype.updateAnimation = function(edge){
	if (edge.animated && edge.from.perturbationStep != null){
		if (edge.from.perturbationStep <= this.visualizer.timeLoop.step){
			this.select(edge);
		} else {
			this.plain(edge);
		}
		if (edge.from.perturbationStep == this.visualizer.timeLoop.step){
			if (!edge.displayList.slider){
				edge.displayList.slider = this.visualizer.makeSlider(edge, this.visualizer.resources.yellowNodeMaterial);
				this.visualizer.addElement(edge.displayList.slider, edge, 'slider');
			}
			this.animate(edge);

		} else {
			this.stopAnimation(edge);
		}
	} else {
		this.stopAnimation(edge);
	}
};

// Animate by advancing slider based on main timeloop fraction
Triptych.BEL3DCanvasCausalEdgeDisplayer.prototype.animate = function(edge){
	edge.displayList.slider.visible = true;
	
	var fraction = this.visualizer.timeLoop.stepFraction;
	var v = edge.getVector();
	edge.displayList.slider.position = edge.from.position.clone().addSelf(v.multiplyScalar(fraction));	
};

Triptych.BEL3DCanvasCausalEdgeDisplayer.prototype.stopAnimation = function(edge){
	if (edge.displayList.slider) edge.displayList.slider.visible = false;
	
};

Triptych.InverseBEL3DCanvasCausalEdgeDisplayer = function(){
	this.plainMaterialName = "grayMeshMaterial";
	this.selectMaterialName = "defaultSelectedMeshMaterial";
	this.highlightMaterialName = "defaultHighlightedMeshMaterial";
	
	this.edgeGeometryName = "tArrowGeometry";
};

Triptych.InverseBEL3DCanvasCausalEdgeDisplayer.prototype = new Triptych.BEL3DCanvasCausalEdgeDisplayer();

Triptych.InverseBEL3DCanvasCausalEdgeDisplayer.prototype.constructor = Triptych.InverseBEL3DCanvasCausalEdgeDisplayer;


//------------------------------------------
// Non-Causal Edge

Triptych.BEL3DCanvasNonCausalEdgeDisplayer = function(){
	this.plainMaterialName = "grayLineMaterial";
	this.selectMaterialName = "defaultLineSelectedMaterial";
	this.highlightMaterialName = "defaultLineHighlightedMaterial";
};

Triptych.BEL3DCanvasNonCausalEdgeDisplayer.prototype = new Triptych.LineEdgeDisplayer();

Triptych.BEL3DCanvasNonCausalEdgeDisplayer.prototype.constructor = Triptych.BEL3DCanvasNonCausalEdgeDisplayer;

//-------------------------------------------------------
//
// Init the displayers, associate them with node and relationship types
//
//-------------------------------------------------------

Triptych.BEL3DCanvasVisualizer.prototype.initDefaultDisplayers = function(){
	this.defaultNodeDisplayer = new Triptych.BEL3DCanvasNodeDisplayer();
	this.defaultNodeDisplayer.visualizer = this;
	this.defaultEdgeDisplayer = new Triptych.BEL3DCanvasNonCausalEdgeDisplayer();
	this.defaultEdgeDisplayer.visualizer = this;
	
};

Triptych.BEL3DCanvasVisualizer.prototype.initDisplayers = function(){
	
	this.addEdgeDisplayer("increases", new Triptych.BEL3DCanvasCausalEdgeDisplayer());
	this.addEdgeDisplayer("decreases", new Triptych.InverseBEL3DCanvasCausalEdgeDisplayer());
	this.addEdgeDisplayer("directlyIncreases", new Triptych.BEL3DCanvasCausalEdgeDisplayer());
	this.addEdgeDisplayer("geneProduct", new Triptych.BEL3DCanvasCausalEdgeDisplayer());
	this.addEdgeDisplayer("actsIn", new Triptych.BEL3DCanvasCausalEdgeDisplayer());
	this.addEdgeDisplayer("directlyDecreases", new Triptych.InverseBEL3DCanvasCausalEdgeDisplayer());
	
	this.addEdgeDisplayer("INCREASES", new Triptych.BEL3DCanvasCausalEdgeDisplayer());
	this.addEdgeDisplayer("DECREASES", new Triptych.InverseBEL3DCanvasCausalEdgeDisplayer());
	this.addEdgeDisplayer("DIRECTLY_INCREASES", new Triptych.BEL3DCanvasCausalEdgeDisplayer());
	this.addEdgeDisplayer("DIRECTLY_DECREASES", new Triptych.InverseBEL3DCanvasCausalEdgeDisplayer());
	
};

//-------------------------------------------------------
//
// Resources
//
//-------------------------------------------------------


Triptych.BEL3DCanvasVisualizer.prototype.initResources = function(){

	this.resources.blueMeshMaterial = new THREE.MeshBasicMaterial( { color: 0x00ffff } ) ;
	this.resources.greenMeshMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } ) ;
	this.resources.redMeshMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000 } ) ;
	this.resources.grayMeshMaterial = new THREE.MeshBasicMaterial( { color: 0xAAAAAA } ) ;
	this.resources.purpleMeshMaterial = new THREE.MeshBasicMaterial( { color: 0xff00ff } ) ;

	this.resources.blueNodeMaterial = this.makeCircleParticleMaterial(100, '#00ffff');
	this.resources.greenNodeMaterial = this.makeCircleParticleMaterial(100, '#00ff00');
	this.resources.redNodeMaterial = this.makeCircleParticleMaterial(100, '#ff0000');
	this.resources.yellowNodeMaterial = this.makeCircleParticleMaterial(100, '#ffff00');

	this.resources.grayNodeMaterial = this.makeCircleParticleMaterial(100, '#AAAAAA');
	this.resources.purpleNodeMaterial = this.makeCircleParticleMaterial(100, '#FF00FF');

	this.resources.connectorLineMaterial = new THREE.LineBasicMaterial( { color: 0xFFFFFF, opacity: 0.5 } );
	this.resources.grayLineMaterial = new THREE.LineBasicMaterial( { color: 0xAAAAAA } );

	
	this.resources.smallParticleMaterial = this.makeCircleParticleMaterial(6, '#FFFFFF');
	this.resources.bigParticleMaterial = this.makeCircleParticleMaterial(12, '#FFFFFF');
	
	this.resources.thinArrowGeometry = new Triptych.ThinArrowGeometry(this.edgeReferenceLength);

	this.resources.tArrowGeometry = new Triptych.ThinArrowGeometry(this.edgeReferenceLength);

	this.resources.barGeometry = new Triptych.BarGeometry(this.edgeReferenceLength);

};

//-------------------------------------------------------
//
// Utilities
//
//-------------------------------------------------------


Triptych.BEL3DCanvasVisualizer.prototype.makeSlider = function(edge, material){
	var particle = new THREE.Particle( material );
	particle.scale.set(0.15, 0.15);
	particle.visible = true;
	return particle;
};


Triptych.BEL3DCanvasVisualizer.prototype.makeValueBar = function(material){
	return this.makeShape( this.resources.barGeometry, material);
}