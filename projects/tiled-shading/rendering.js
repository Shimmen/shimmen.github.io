
var app;

var time = 0.0;

////////////////////////////////////////////////////
// ------------------  Data  ---------------------//
////////////////////////////////////////////////////

var sceneSize = 20.0;
var numCubes = 700;

var cubeVA;
var cubes = [];

var modelMatrixData;
var modelMatrixBuffer;

var camera = {
	viewMatrix: mat4.create(),
	projection: mat4.create(),
	viewProjection: mat4.create()
};

var forwardShader;
var forwardDrawCall;

////////////////////////////////////////////////////
// ------------------  Setup  --------------------//
////////////////////////////////////////////////////

function onSetup(canvas) {
	app = PicoGL.createApp(canvas);
	setupScene();
}

function onResize(width, height) {
	app.resize(width, height);
	// onResize will always be called before render loop,
	// so we can safely setup the camera here
	setupCamera(width / height);
}

////////////////////////////////////////////////////

function setupCamera(aspectRatio) {
	var cameraPos = vec3.fromValues(0.0, 0.0, 2.0 * sceneSize);
	mat4.lookAt(camera.viewMatrix, cameraPos, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
	mat4.perspective(camera.projection, Math.PI / 2.0, aspectRatio, 0.5, 100);
	mat4.multiply(camera.viewProjection, camera.projection, camera.viewMatrix);
}

function setupScene() {
	// Set up buffer for storing the model matrices for the instanced cubes
	modelMatrixData = new Float32Array(numCubes * 16 /* floats */);
	modelMatrixBuffer = app.createMatrixBuffer(PicoGL.FLOAT_MAT4, modelMatrixData);

	cubeVA = makeCube(); // TODO: Load model with normals etc.!

	forwardShader = makeShader('forward');
	forwardDrawCall = app.createDrawCall(forwardShader, cubeVA);

	for (var i = 0; i < numCubes; i++) {
		cubes.push({
			position: vec3.fromValues(
				randomInRange(-sceneSize * 16 / 9, sceneSize * 16 / 9),
				randomInRange(-sceneSize, sceneSize),
				randomInRange(-sceneSize, sceneSize)
			),
			rotationX: randomInRange(0.0, Math.PI * 2.0),
			rotationY: randomInRange(0.0, Math.PI * 2.0),
			rotationZ: randomInRange(0.0, Math.PI * 2.0),
			// Creates a view into the buffer so no copying has to occur
			modelMatrix: new Float32Array(modelMatrixData.buffer, i * 16 * 4, 16)
		});
	}
}

function makeCube() {
	var positions = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array([
		-1.0,  1.0, -1.0,
		-1.0, -1.0, -1.0,
		 1.0, -1.0, -1.0,
		 1.0, -1.0, -1.0,
		 1.0,  1.0, -1.0,
		-1.0,  1.0, -1.0,

		-1.0, -1.0,  1.0,
		-1.0, -1.0, -1.0,
		-1.0,  1.0, -1.0,
		-1.0,  1.0, -1.0,
		-1.0,  1.0,  1.0,
		-1.0, -1.0,  1.0,

		 1.0, -1.0, -1.0,
		 1.0, -1.0,  1.0,
		 1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0,
		 1.0,  1.0, -1.0,
		 1.0, -1.0, -1.0,

		-1.0, -1.0,  1.0,
		-1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0,
		 1.0, -1.0,  1.0,
		-1.0, -1.0,  1.0,

		-1.0,  1.0, -1.0,
		 1.0,  1.0, -1.0,
		 1.0,  1.0,  1.0,
		 1.0,  1.0,  1.0,
		-1.0,  1.0,  1.0,
		-1.0,  1.0, -1.0,

		-1.0, -1.0, -1.0,
		-1.0, -1.0,  1.0,
		 1.0, -1.0, -1.0,
		 1.0, -1.0, -1.0,
		-1.0, -1.0,  1.0,
		 1.0, -1.0,  1.0
	]));

	var vertexArray = app.createVertexArray()
	.vertexAttributeBuffer(0, positions)
	.instanceAttributeBuffer(1, modelMatrixBuffer)

	return vertexArray;
}

function makeShader(name) {
	var vertElem = document.getElementById(name + '-vs');
	var fragElem = document.getElementById(name + '-fs');
	if (vertElem && fragElem) {
		var vertSource = vertElem.innerHTML.trim();
		var fragSource = fragElem.innerHTML.trim();
		return app.createProgram(vertSource, fragSource);
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

	time += 1.0 / 60.0; // approx...
	var r = 0.75 + (0.25 * Math.sin(time));
	app.clearColor(r, 0.75, 0.70, 1);

	var rotXmatrix = mat4.create();
	var rotYmatrix = mat4.create();
	var rotZmatrix = mat4.create();

	for (var cube of cubes) {
		// Rotate cubes
		cube.rotationX += Math.random() * 0.01;
		cube.rotationY += Math.random() * 0.02;
		cube.rotationZ += Math.random() * 0.03;

		mat4.fromXRotation(rotXmatrix, cube.rotationX);
		mat4.fromYRotation(rotYmatrix, cube.rotationY);
		mat4.fromZRotation(rotZmatrix, cube.rotationZ);

		var translation = mat4.create();
		mat4.fromTranslation(translation, cube.position);

		// Update model matrix
		mat4.multiply(cube.modelMatrix, rotYmatrix, rotZmatrix);
		mat4.multiply(cube.modelMatrix, rotXmatrix, cube.modelMatrix);
		mat4.multiply(cube.modelMatrix, translation, cube.modelMatrix);
	}

	// Update model matrix instance data
	modelMatrixBuffer.data(modelMatrixData);

	// Set matrix uniforms
	forwardDrawCall.uniform('viewProjection', camera.viewProjection);

	app.drawCalls([forwardDrawCall]);
	app.clear().draw();
}
