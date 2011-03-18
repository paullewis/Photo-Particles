/**
 * Copyright (C) 2011 by Paul Lewis
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 * Basically, go nuts and have fun. I'm just not responsible
 * if it all goes rather pear shaped :)
 */
var AEROTWIST = AEROTWIST || {};
AEROTWIST.PhotoParticles = new function()
{
	// internal vars
	var camera,
		scene,
		renderer,
		mode,
		image,
		canvas,
		context,
		redCentre,
		greenCentre,
		blueCentre,
		colors,
		particleSystem,
		particles		= [],
		orbitValue		= 0,
		holdAtOrigin	= false,
		orbitCamera		= false,
		bounceParticles	= false,
		$container 		= $('#container'),
		$gui			= $('#gui'),
		
	// constants
		ORBIT_RATE		= 0.01,
		ATTRACT			= 0,
		REPEL			= 1,
		WIDTH			= $container.width() - 15,
		HEIGHT			= $container.height() - 15,
		DENSITY			= 7,
		NEAR			= 1,
		FAR				= 10000,
		CENTRE_MASS		= 5,
		AGGRESSION		= 20,
		DEPTH			= Math.max(WIDTH, HEIGHT);
	
	/**
	 * Initializes the experiment and kicks
	 * everything off. Yay!
	 */
	this.init = function()
	{
		// set to attract mode
		mode						= ATTRACT;
		
		// set up the canvas, camera and scene
		canvas						= document.createElement('canvas');
		canvas.width				= 600;
		canvas.height				= 600;
		
		// the canvas is only used to analyse our pic
		context						= canvas.getContext('2d');
		camera 						= new THREE.Camera(45, WIDTH / HEIGHT, NEAR, FAR);
	    scene 						= new THREE.Scene();
	    renderer 					= new THREE.WebGLRenderer();

	    // position the camera
	    camera.position.y			= camera.target.position.y = -HEIGHT * .5;
	    
	    // start the renderer
	    renderer.setSize(WIDTH, HEIGHT);
	    $container.append(renderer.domElement);
	    
	    // add lights
		addLights();
		
		// add the rgb centres
		addCentres();
		
	    // add listeners
	    addEventListeners();

	    // start rendering, which will
	    // do nothing until the image is dropped
	    update();
	};
	
	/**
	 * Sets up the event listeners for DnD, the GUI
	 * and window resize
	 */
	function addEventListeners()
	{
		// container DnD event
		var container = $container[0];
		container.addEventListener('dragover', cancel, false);
		container.addEventListener('dragenter', cancel, false);
		container.addEventListener('dragexit', cancel, false);
		container.addEventListener('drop', dropFile, false);
		
		// gui events
		$("#hold-particles-on").click(callbacks.holdAtOriginOn);
		$("#hold-particles-off").click(callbacks.holdAtOriginOff);
		$("#hold-particles-off").trigger('click');
		
		$("#camera-orbit-on").click(callbacks.orbitCameraOn);
		$("#camera-orbit-off").click(callbacks.orbitCameraOff);
		$("#camera-orbit-on").trigger('click');
		
		$("#mode-attract").click(callbacks.modeAttract);
		$("#mode-repel").click(callbacks.modeRepel);
		$("#mode-attract").trigger('click');
		
		$("#bounce-particles-on").click(callbacks.bounceParticlesOn);
		$("#bounce-particles-off").click(callbacks.bounceParticlesOff);
		$("#bounce-particles-off").trigger('click');
		
		$("#density-low").click(callbacks.densityLow);
		$("#density-medium").click(callbacks.densityMedium);
		$("#density-high").click(callbacks.densityHigh);
		$("#density-low").trigger('click');
		
		// window event
		$(window).resize(callbacks.windowResize);
	}
	
	/**
	 * Handles when a file is dropped by
	 * the user onto the container
	 */
	function dropFile(event)
	{
		// stop the browser doing
		// it's normal thing of going
		// to the item
		event.stopPropagation();
		event.preventDefault();
		
		// query what was dropped
		var files = event.dataTransfer.files;
		
		// if we have something
		if(files.length) {
			handleFile(files[0]);
		}
		
		return false;
	}
	
	/**
	 * Handles the uploaded file
	 */
	function handleFile(file)
	{
		var fileReader 			= new FileReader();
		fileReader.onloadend	= fileUploaded;
		fileReader.readAsDataURL(file);
	}
	
	/**
	 * File upload handled
	 */
	function fileUploaded(event)
	{
		// remove any particles
		// if our image already
		// has some
		if(image) {
			removeParticles();
		}
		
		// check it's an image
		if(event.target.result.match(/^data:image/))
		{
		    $container.addClass('live');
		    $gui.addClass('live');
		    
			// create a new image
			image 		= document.createElement('img');
			image.src 	= event.target.result;
			
			// give the browser chance to
			// create the image object
			setTimeout(function(){
				
				// split the image
				addParticles();
				
			}, 100);
		}
		else
		{
			// time to whinge
			alert("Umm, images only? ... Yeah");
		}
	}
	
	/**
	 * Simple handler function for 
	 * the events we don't care about
	 */
	function cancel(event)
	{
		if(event.preventDefault)
			event.preventDefault();
		
		return false;
	}
	
	/**
	 * Adds some basic lighting to the
	 * scene. Only applies to the centres
	 */
	function addLights()
	{
		// point
		pointLight = new THREE.PointLight( 0xFFFFFF );
		pointLight.position.x = 300;
		pointLight.position.y = 300;
		pointLight.position.z = 600;
		scene.addLight( pointLight );
		
		// directional
		directionalLight = new THREE.DirectionalLight( 0xFFFFFF );
		directionalLight.position.x = -.5;
		directionalLight.position.y = -1;
		directionalLight.position.z = -.5;
		directionalLight.position.normalize();
		directionalLight.intensity = .6;
		scene.addLight( directionalLight );
	}
	
	/**
	 * Adds the R, G and B centres to the screen.
	 * We add a couple of optimisations here in
	 * terms of the centres and values that we
	 * can cache.
	 */
	function addCentres()
	{
		// set up the material
		var redMaterial						= new THREE.MeshLambertMaterial({color: 0xCC0000}),
			greenMaterial					= new THREE.MeshLambertMaterial({color: 0x00CC00}),
			BlueMaterial					= new THREE.MeshLambertMaterial({color: 0x0000CC});
		
		// red
		redCentre 							= new THREE.Mesh( new Sphere( 20, 5, 5 ), redMaterial);
		redCentre.position.y 				= -120;
		redCentre.position.z 				= -160;
		redCentre.mass 						= CENTRE_MASS;
		redCentre.boundRadiusSquared		= redCentre.boundRadius * redCentre.boundRadius;
		
		// green
		greenCentre 						= new THREE.Mesh( new Sphere( 20, 5, 5 ), greenMaterial);
		greenCentre.position.z 				= 160;
		greenCentre.position.y				= -240;
		greenCentre.position.x				= -160;
		greenCentre.mass 					= CENTRE_MASS;
		greenCentre.boundRadiusSquared		= greenCentre.boundRadius * greenCentre.boundRadius;
		
		// blue
		blueCentre 							= new THREE.Mesh( new Sphere( 20, 5, 5 ), BlueMaterial);
		blueCentre.position.z 				= 160;
		blueCentre.position.y				= -240;
		blueCentre.position.x				= 160;
		blueCentre.mass 					= CENTRE_MASS;
		blueCentre.boundRadiusSquared		= blueCentre.boundRadius * blueCentre.boundRadius;
		
		scene.addChild(redCentre);
		scene.addChild(greenCentre);
		scene.addChild(blueCentre);
	}
	
	/**
	 * Kills off the particles, wipes the
	 * canvas clean and does a bit of gc
	 */
	function removeParticles()
	{
		scene.removeChild(particleSystem);
		particleSystem = null;
		context.clearRect(0,0,600,600);
	}
	
	/**
	 * Adds the particles to the scene
	 * based on the image that has been
	 * last uploaded
	 */
	function addParticles()
	{
		// draw in the image, and make sure it fits the canvas size :)
		var ratio			= 1 / Math.max(image.width/600, image.height/600);
		var scaledWidth		= image.width * ratio;
		var scaledHeight	= image.height * ratio;
		context.drawImage(image,
							0,0,image.width,image.height,
							(600 - scaledWidth) * .5, (600 - scaledHeight) *.5, scaledWidth, scaledHeight);
		
		// now set up the particle material
		var material 	= new THREE.ParticleBasicMaterial( { blending: THREE.BillboardBlending, map: ImageUtils.loadTexture("images/particle.png"), size: DENSITY * 1.5, opacity: 1, vertexColors:true, sizeAttenuation:true } );
		var geometry	= new THREE.Geometry();
		var pixels		= context.getImageData(0,0,WIDTH,HEIGHT);
		var step		= DENSITY * 4;
		var x = 0, y = 0;
		
		// go through the image pixels
	    for(x = 0; x < WIDTH * 4; x+= step)
	    {
	    	for(y = HEIGHT; y >= 0 ; y -= DENSITY)
	    	{
	    		var p = ((y * WIDTH * 4) + x);
	    		
	    		// grab the actual data from the
	    		// pixel, ignoring any transparent ones
	    		if(pixels.data[p+3] > 0)
			    {
			    	var pixelCol	= (pixels.data[p] << 16) + (pixels.data[p+1] << 8) + pixels.data[p+2];
			    	var color 		= new THREE.Color(pixelCol);
			    	var vector 		= new THREE.Vector3(-300 + x/4, -y, 0);
			    	
			    	// push on the particle
			    	geometry.vertices.push(new THREE.Vertex(vector));
			    	geometry.colors.push(color);
			    }
	    	}
	    }
	    
	    // now create a new system
	    particleSystem 	= new THREE.ParticleSystem(geometry, material);
	    particleSystem.sortParticles = true;
	    
	    // grab a couple of cacheable vals
	    particles		= particleSystem.geometry.vertices;
		colors			= particleSystem.geometry.colors;
		
		// add some additional vars to the
		// particles to ensure we can do physics
		// and so on
		var ps = particles.length;
		while(ps--)
		{
			var particle 		= particles[ps];
			particle.velocity	= new THREE.Vector3();
			particle.mass		= 5;
			particle.origPos	= particle.position.clone();
		}
		
		// gc and add
		pixels = null;
		scene.addObject(particleSystem);
	}
	
	/**
	 * Updates the velocity and position
	 * of the particles in the view
	 */
	function update()
	{
		var ps = particles.length;	
		while(ps--)
		{
			var particle 		= particles[ps];
			
			// if we are holding at the origin
			// values, tween the particles back
			// to where they should be
			if(holdAtOrigin)
			{
				particle.velocity 	= new THREE.Vector3();
				particle.position.x += (particle.origPos.x - particle.position.x) * .2;
				particle.position.y += (particle.origPos.y - particle.position.y) * .2;
				particle.position.z += (particle.origPos.z - particle.position.z) * .2;
			}
			else
			{
				// get the particles colour and put
				// it into an array
				var col				= colors[ps];
				var colArray		= [col.r, col.g, col.b];
	
				// go through each component colour
				for(var i = 0; i < colArray.length; i++)
				{
					// only analyse it if actually
					// has some of this colour
					if(colArray[i] > 0)
					{
						// get the target based on where it
						// is in the array
						var target			= i == 0 ? redCentre :
											  i == 1 ? greenCentre : 
											  blueCentre;
						
						// get the distance of the particle to the centre in question
						// and add on the resultant acceleration
						var dist			= particle.position.distanceToSquared(target.position),
							force			= ((particle.mass * target.mass) / dist) * colArray[i] * AGGRESSION,
							acceleration	= (new THREE.Vector3())
												.sub(target.position,particle.position)
												.normalize()
												.multiplyScalar(force);
						
						// if we are attracting we add
						// the velocity
						if(mode == ATTRACT)
						{
							// note we only need to check the 
							// squared radius for the collision :)
							if(dist > target.boundRadiusSquared) {
								particle.velocity.addSelf(acceleration);
							}
							else if (bounceParticles) {
								// bounce, bounce, bounce
								particle.velocity.negate();
							}
							else {
								// stop dead
								particle.velocity = new THREE.Vector3();
							}
						}
						else {
							// push it away
							particle.velocity.subSelf(acceleration);
						}
						
						particle.position.addSelf(particle.velocity);
					}
				}
			}
		}
		
		// if we are panning the camera round
		// do that now
		if(orbitCamera)
		{
			camera.position.x = Math.sin(orbitValue) * DEPTH;
			camera.position.y = Math.sin(orbitValue) * 100;
			camera.position.z = Math.cos(orbitValue) * DEPTH;
			orbitValue += ORBIT_RATE;
		}
		
		// set up a request for a render
		requestAnimationFrame(render);
	}
	
	/**
	 * Renders the current state
	 */
	function render()
	{
		// only render if we have
		// an active image
		if(image) {
			renderer.render( scene, camera );
		}
		
		// set up the next frame
		update();
	}
	
	/**
	 * Our internal callbacks object - a neat
	 * and tidy way to organise the various
	 * callbacks in operation.
	 * 
	 * Note: this could do with some optimising
	 * because of the repetition.
	 */
	callbacks = {
		holdAtOriginOn: function() {
			holdAtOrigin = true;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			return false;
		},
		holdAtOriginOff: function() {
			holdAtOrigin = false;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			return false;
		},
		orbitCameraOn: function() {
			orbitCamera = true;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			return false;
		},
		orbitCameraOff: function() {
			orbitCamera = false;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			return false;
		},
		modeAttract: function() {
			mode = ATTRACT;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			return false;
		},
		modeRepel: function() {
			mode = REPEL;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			return false;
		},
		bounceParticlesOn: function() {
			bounceParticles = true;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			return false;
		},
		bounceParticlesOff: function() {
			bounceParticles = false;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			return false;
		},
		densityLow: function() {
			DENSITY = 7;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			
			if(image) {
				removeParticles();
				addParticles();
			}
			return false;
		},
		densityMedium: function() {
			DENSITY = 5;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			if(image) {
				removeParticles();
				addParticles();
			}
			return false;
		},
		densityHigh: function() {
			DENSITY = 3;
			$(this).removeClass('disabled');
			$(this).siblings('a').addClass('disabled');
			if(image) {
				removeParticles();
				addParticles();
			}
			return false;
		},
		windowResize: function() {
			
			WIDTH			= $container.width() - 15,
			HEIGHT			= $container.height() - 15,
			camera.aspect 	= WIDTH / HEIGHT,
			renderer.setSize(WIDTH, HEIGHT);
			
			camera.updateProjectionMatrix();
		}
	};
};

// Split photos to particles...?
$(document).ready(function(){
	
	// Go!
	AEROTWIST.PhotoParticles.init();

});