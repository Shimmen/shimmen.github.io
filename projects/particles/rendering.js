"use strict";

////////////////////////////////////////////////////
// ------------------  Data  ---------------------//
////////////////////////////////////////////////////

var app;

var mousePosition = vec2.create();
var simulationBoxSize = vec2.fromValues(0.6, 0.65);

var particleCount = 200000;

var heatLutTexture;
var particleShader;

var drawCallA, drawCallB;
var nextDrawCall;

////////////////////////////////////////////////////
// ------------------  Setup  --------------------//
////////////////////////////////////////////////////

function onSetup(canvas) {
	app = PicoGL.createApp(canvas);
	setupScene();

	document.addEventListener('keydown', onKeydownEvent);
	document.getElementById('start-sim-btn').addEventListener('click', startSimulation);

	canvas.addEventListener('mousemove', mouseMovedInCanvas);
}

function onResize(width, height) {
	app.resize(width, height);
}

////////////////////////////////////////////////////

var KEY_0 = 48;
var KEY_9 = 57;

function onKeydownEvent(e) {
	if (e.keyCode >= 48 && e.keyCode <= 57) {
		var speed = (e.keyCode - 48.0) / (KEY_9 - KEY_0);
		simulationSpeed = speed;
	}
}

function startSimulation() {
	simulationSpeed = 0.5;
}

function mouseMovedInCanvas(e) {
	// update mouse position
	var rect = app.canvas.getBoundingClientRect();
	var x = e.clientX - rect.left;
	var y = e.clientY - rect.top;
	mousePosition[0] = 2.0 * (x / app.canvas.width) - 1.0;
	mousePosition[1] = 2.0 * (1.0 - y / app.canvas.height) - 1.0;
}

////////////////////////////////////////////////////

function setupScene() {

	// Load textures
	var heatLutImage = new Image();
	heatLutImage.onload = function() { heatLutTexture = app.createTexture2D(heatLutImage); }
	heatLutImage.src = 'blackbody_gradient.png';

	// Make particles with random positions and velocities
	var positions = new Float32Array(particleCount * 3);
	for (var particleIndex = 0; particleIndex < particleCount; particleIndex++) {
		var i = particleIndex * 3.0;

		positions[i + 0] = randomInRange(-simulationBoxSize[0], simulationBoxSize[0]);
		positions[i + 1] = randomInRange(-simulationBoxSize[1], simulationBoxSize[1]);
		positions[i + 2] = randomInRange(-1, 1);
	}

	particleShader = makeShader('particles', ['tf_position', 'tf_velocity']);

	var positionsA = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array(positions));
	var velocitiesA = app.createVertexBuffer(PicoGL.FLOAT, 3, positions.length);
	var positionsB = app.createVertexBuffer(PicoGL.FLOAT, 3, positions.length);
	var velocitiesB = app.createVertexBuffer(PicoGL.FLOAT, 3, positions.length);

	var vertexArrayA = app.createVertexArray()
	.vertexAttributeBuffer(0, positionsA)
	.vertexAttributeBuffer(1, velocitiesA);

	var vertexArrayB = app.createVertexArray()
	.vertexAttributeBuffer(0, positionsB)
	.vertexAttributeBuffer(1, velocitiesB);

	var feedbackToB = app.createTransformFeedback()
	.feedbackBuffer(0, positionsB)
	.feedbackBuffer(1, velocitiesB);

	var feedbackToA = app.createTransformFeedback()
	.feedbackBuffer(0, positionsA)
	.feedbackBuffer(1, velocitiesA);

	drawCallA = app.createDrawCall(particleShader, vertexArrayA, PicoGL.POINTS)
	.transformFeedback(feedbackToB);

	drawCallB = app.createDrawCall(particleShader, vertexArrayB, PicoGL.POINTS)
	.transformFeedback(feedbackToA);

	// Set next draw call to perform
	nextDrawCall = drawCallA;
}

function makeShader(name, transformFeedbackVaryings = []) {
	var vertElem = document.getElementById(name + '-vs');
	var fragElem = document.getElementById(name + '-fs');
	if (vertElem && fragElem) {
		var vertSource = vertElem.innerHTML.trim();
		var fragSource = fragElem.innerHTML.trim();
		return app.createProgram(vertSource, fragSource, transformFeedbackVaryings);
	} else {
		alert('Can\'t find shader "' + name + '"!');
	}
}

function randomInRange(min, max) {
	return Math.random() * (max - min) + min;
}

////////////////////////////////////////////////////
// ------------------  Render  -------------------//
////////////////////////////////////////////////////

function onRender() {
	app.clearColor(0, 0, 0, 1).clear();

	// Wait until image is loaded
	if (heatLutTexture === undefined) return;

	app.blend().blendFunc(PicoGL.ONE, PicoGL.ONE_MINUS_SRC_ALPHA); // (premultiplied alpha)

	nextDrawCall
	.uniform('mousePosition', mousePosition)
	.uniform('simBoxSize', simulationBoxSize)
	.texture('heatLut', heatLutTexture)
	.draw();

	// Switch what draw call to perform next frame
	nextDrawCall = (nextDrawCall === drawCallA) ? drawCallB : drawCallA;
}
