'use strict';

////////////////////////////////////////////////////
// ------------------  Data  ---------------------//
////////////////////////////////////////////////////

var app;

var spawnPattern = 'dots';
var requestReset = false;

var mousePosition = vec2.create();
var simulationBoxSize = vec2.fromValues(0.6, 0.65);

var particleCount = 200000;
var heatLutTexture;

var paused = true;
var numBlurPasses = 0;

////////////////////////////////////////////////////

var offscreenFramebuffer1, offscreenFramebuffer2;

// For resetting particles (feedbackToB is required to fix ANGLE bug, see note below)
var positionsA, velocitiesA, feedbackToB;

var particleDrawCallA, particleDrawCallB;
var nextParticleDrawCall;

var blurDrawCallH, blurDrawCallV;
var blitDrawCall;

////////////////////////////////////////////////////
// ------------------  Setup  --------------------//
////////////////////////////////////////////////////

function onSetup(canvas) {
	app = PicoGL.createApp(canvas)
	.clearColor(0, 0, 0, 1);

	setupScene();

	document.addEventListener('keydown', onKeydown);
	canvas.addEventListener('mousemove', onMouseMoveInCanvas);
	canvas.addEventListener('mouseleave', onMouseLeaveCanvas);

	document.getElementById('reset-uniform-btn').addEventListener('click', function() {
		spawnPattern = 'uniform';
		resetParticles();
	});
	document.getElementById('reset-dot-btn').addEventListener('click', function() {
		spawnPattern = 'dot';
		resetParticles();
	});
	document.getElementById('reset-dots-btn').addEventListener('click', function() {
		spawnPattern = 'dots';
		resetParticles();
	});
}

function onResize(width, height) {
	app.resize(width, height);
	offscreenFramebuffer1.resize(width, height);
	offscreenFramebuffer2.resize(width, height);
}

////////////////////////////////////////////////////

var KEY_0 = 48;
var KEY_9 = 57;
var KEY_P = 80;
var KEY_R = 82;

function onKeydown(e) {
	if (e.keyCode >= KEY_0 && e.keyCode <= KEY_9) {
		var selected = e.keyCode - KEY_0;
		numBlurPasses = (selected * selected);
	}

	if (e.keyCode == KEY_P) {
		paused = !paused;
	}

	if (e.keyCode == KEY_R) {
		resetParticles();
	}
}

function onMouseMoveInCanvas(e) {
	// update mouse position
	var rect = app.canvas.getBoundingClientRect();
	var x = e.clientX - rect.left;
	var y = e.clientY - rect.top;
	mousePosition[0] = 2.0 * (x / app.canvas.width) - 1.0;
	mousePosition[1] = 2.0 * (1.0 - y / app.canvas.height) - 1.0;
	paused = false;
}

function onMouseLeaveCanvas(e) {
	paused = true;
}

////////////////////////////////////////////////////

function setupScene() {

	//
	// Load textures
	//
	var heatLutImage = new Image();
	heatLutImage.onload = function() { heatLutTexture = app.createTexture2D(heatLutImage); }
	heatLutImage.src = 'blackbody_gradient.png';

	//
	// Create frame buffers
	//

	offscreenFramebuffer1 = app.createFramebuffer()
	.colorTarget(0);

	offscreenFramebuffer2 = app.createFramebuffer()
	.colorTarget(0);

	//
	// Create particle draw calls
	//

	var particleShader = makeShader('particles-vs', 'particles-fs', ['tf_position', 'tf_velocity']);

	var elementCount = particleCount * 3;
	positionsA = app.createVertexBuffer(PicoGL.FLOAT, 3, elementCount);
	velocitiesA = app.createVertexBuffer(PicoGL.FLOAT, 3, elementCount);
	var positionsB = app.createVertexBuffer(PicoGL.FLOAT, 3, elementCount);
	var velocitiesB = app.createVertexBuffer(PicoGL.FLOAT, 3, elementCount);

	var vertexArrayA = app.createVertexArray()
	.vertexAttributeBuffer(0, positionsA)
	.vertexAttributeBuffer(1, velocitiesA);

	var vertexArrayB = app.createVertexArray()
	.vertexAttributeBuffer(0, positionsB)
	.vertexAttributeBuffer(1, velocitiesB);

	feedbackToB = app.createTransformFeedback()
	.feedbackBuffer(0, positionsB)
	.feedbackBuffer(1, velocitiesB);

	var feedbackToA = app.createTransformFeedback()
	.feedbackBuffer(0, positionsA)
	.feedbackBuffer(1, velocitiesA);

	particleDrawCallA = app.createDrawCall(particleShader, vertexArrayA, PicoGL.POINTS)
	.transformFeedback(feedbackToB);

	particleDrawCallB = app.createDrawCall(particleShader, vertexArrayB, PicoGL.POINTS)
	.transformFeedback(feedbackToA);

	resetParticles();

	//
	// Create blur draw call
	//

	var quadPositions = app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array([
		-1, -1,
		+1, -1,
		+1, +1,

		-1, -1,
		+1, +1,
		-1, +1
	]));

	var quadVertexArray = app.createVertexArray()
	.vertexAttributeBuffer(0, quadPositions);

	var blurShaderH = makeShader('quad-vs', 'blur-h-fs');
	blurDrawCallH = app.createDrawCall(blurShaderH, quadVertexArray);

	var blurShaderV = makeShader('quad-vs', 'blur-v-fs');
	blurDrawCallV = app.createDrawCall(blurShaderV, quadVertexArray);

	//
	// Create blit draw call
	//

	var blitShader = makeShader('quad-vs', 'blit-fs');
	blitDrawCall = app.createDrawCall(blitShader, quadVertexArray);

}

function resetParticles() {
	var elementCount = particleCount * 3;
	var positions = new Float32Array(elementCount);

	for (var particleIndex = 0; particleIndex < particleCount; particleIndex++) {
		var i = particleIndex * 3;
		switch (spawnPattern) {

			case 'dot':
				positions[i + 0] = randomInRange(0.45, 0.50);
				positions[i + 1] = randomInRange(0.25, 0.33);
				positions[i + 2] = randomInRange(-0.25, 0.25);
				break;

			case 'dots':
				var x = particleIndex / particleCount;
				if (x <= 1.0 / 3.0) {
					positions[i + 0] = randomInRange(0.28, 0.33);
					positions[i + 1] = randomInRange(0.32, 0.40);
					positions[i + 2] = randomInRange(-0.25, 0.25);
				} else if (x <= 2.0 / 3.0) {
					positions[i + 0] = randomInRange(-0.35, -0.30);
					positions[i + 1] = randomInRange(0.45, 0.53);
					positions[i + 2] = randomInRange(-0.50, -0.25);
				} else {
					positions[i + 0] = randomInRange(-0.1, -0.05);
					positions[i + 1] = randomInRange(-0.75, -0.67);
					positions[i + 2] = randomInRange(-0.25, 0.25);
				}
				break;

			case 'uniform':
			default:
				positions[i + 0] = randomInRange(-simulationBoxSize[0], simulationBoxSize[0]);
				positions[i + 1] = randomInRange(-simulationBoxSize[1], simulationBoxSize[1]);
				positions[i + 2] = randomInRange(-1, 1);
				break;

		}
	}

	positionsA.data(positions);
	velocitiesA.data(new Float32Array(elementCount)); // zero array

	// NOTE/BUG: This is due to the ANGLE bug documented in PicoGL here:
	// https://github.com/tsherif/picogl.js/blob/master/src/transform-feedback.js#L38
	// And indirectly due to a bug in PicoGL, since it doesn't rebind if only the data
	// has changed. Here I invalidate the currently bound transform feedback to that
	// PicoGL rebinds the buffers, which is the fix for the ANGLE bug.
	feedbackToB.appState.transformFeedback = -1;

	// Set next particle draw call to perform
	nextParticleDrawCall = particleDrawCallA;
}

function makeShader(vsName, fsName, transformFeedbackVaryings = []) {
	if (fsName === undefined) fsName = vsName;
	var vertElem = document.getElementById(vsName);
	var fragElem = document.getElementById(fsName);
	if (!vertElem) alert('Can\'t find vertex shader with name "' + vsName + '"!');
	if (!fragElem) alert('Can\'t find fragment shader with name "' + fsName + '"!');
	if (vertElem && fragElem) {
		var vertSource = vertElem.innerHTML.trim();
		var fragSource = fragElem.innerHTML.trim();
		return app.createProgram(vertSource, fragSource, transformFeedbackVaryings);
	}
}

function randomInRange(min, max) {
	return Math.random() * (max - min) + min;
}

////////////////////////////////////////////////////
// ------------------  Render  -------------------//
////////////////////////////////////////////////////

function onRender() {
	// Wait until image is loaded
	if (heatLutTexture === undefined) {
		app.defaultDrawFramebuffer().clear();
		return;
	}

	app.drawFramebuffer(offscreenFramebuffer1).clear();
	app.blend().blendFunc(PicoGL.ONE, PicoGL.ONE_MINUS_SRC_ALPHA); // (premultiplied alpha)

	nextParticleDrawCall
	.uniform('u_mouse_position', mousePosition)
	.uniform('u_simulation_paused', paused)
	.uniform('u_sim_box_size', simulationBoxSize)
	.texture('u_heat_lut', heatLutTexture)
	.draw();

	// Switch what draw call to perform next frame
	nextParticleDrawCall = (nextParticleDrawCall === particleDrawCallA) ? particleDrawCallB : particleDrawCallA;

	if (numBlurPasses > 0) {
		// Perform blur passes if specified

		app.noBlend();
		blurDrawCallH.texture('u_texture', offscreenFramebuffer1.colorTextures[0]);
		blurDrawCallV.texture('u_texture', offscreenFramebuffer2.colorTextures[0]);

		for (var i = 0; i < numBlurPasses - 1; i++) {
			app.drawFramebuffer(offscreenFramebuffer2);
			blurDrawCallH.draw();
			app.drawFramebuffer(offscreenFramebuffer1);
			blurDrawCallV.draw();
		}

		app.drawFramebuffer(offscreenFramebuffer2);
		blurDrawCallH.draw();
		app.defaultDrawFramebuffer();
		blurDrawCallV.draw();

	} else {
		// If no blur passes should be made, simply blit to the canvas
		app.noBlend();
		app.defaultDrawFramebuffer();
		blitDrawCall
		.texture('u_texture', offscreenFramebuffer1.colorTextures[0])
		.draw();

		//
		// TODO:
		//  Is seems as it would be better to simply draw directly to the canvas / main framebuffer,
		//  however in practice there was a massive penalty to doing that (>150% slower). So for now
		//  I'm doing it like this...
		//
	}
}
