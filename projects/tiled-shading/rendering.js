
var app;

var cpuTimeElem, gpuTimeElem;
var lastTime = new Date().getTime();

////////////////////////////////////////////////////
// ------------------  Data  ---------------------//
////////////////////////////////////////////////////

var renderMode = 'forward';

var sceneSize = 20.0;
var numCubes = 400;
var numLights = 200;

var cubeVA;
var cubes = [];

var lights = [];
var lightRadius = 6.0;

var modelMatrixData;
var modelMatrixBuffer;

var camera = {
	aspectRatio: 16.0 / 9.0,
	fovY: Math.PI / 2.0,
	position: vec3.create(),
	viewMatrix: mat4.create(),
	projection: mat4.create(),
	viewProjection: mat4.create()
};

var ambientShader;
var ambientDrawCall;

///////////////////// Forward //////////////////////

var forwardShader;
var forwardDrawCall;

///////////////// Forward one-pass /////////////////

var forwardOnePassShader;
var forwardOnePassDrawCall;

var lightsUniformBuffer;

/////////////////// Tiled shading //////////////////

var tiledShader;
var tiledDrawCall;

var gridColumns = 1;
var gridRows = 1;

var lightGrid = [];

// For every grid cell a list of affecting lights
for (var i = 0; i < gridRows * gridColumns; i++) {
	lightGrid[i] = [];
}

// For sending to the GPU (unlike lightGrid which is for CPU calculations)
var lightGridUniform = new Int32Array(2 * gridColumns * gridRows);

////////////////////////////////////////////////////
// ------------------  Setup  --------------------//
////////////////////////////////////////////////////

function onSetup(canvas) {
	app = PicoGL.createApp(canvas);
	setupScene();

	// Save DOM references
	cpuTimeElem = document.getElementById('cpu-time-display');
	gpuTimeElem = document.getElementById('gpu-time-display');
}

function onResize(width, height) {
	app.resize(width, height);
	// onResize will always be called before render loop,
	// so we can safely setup the camera here
	setupCamera(width / height);
}

////////////////////////////////////////////////////

function renderModeChanged(selected) {
	renderMode = selected.value;
}

function updateFrameTimeLabel(timeMs) {
	if (app.timerReady()) {
		cpuTimeElem.innerHTML = 'CPU time: ' + app.cpuTime.toFixed(3) + ' ms';
		if (app.gpuTime > 0) {
			gpuTimeElem.innerHTML = 'GPU time: ' + app.gpuTime.toFixed(3) + ' ms';
		} else {
			gpuTimeElem.innerHTML = 'GPU time: not available!';
		}
	}
}

////////////////////////////////////////////////////

function setupCamera(aspectRatio) {
	camera.position = vec3.fromValues(0.0, 0.0, sceneSize + 10.0);
	mat4.lookAt(camera.viewMatrix, camera.position, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
	mat4.perspective(camera.projection, camera.fovY, aspectRatio, 0.5, 100);
	mat4.multiply(camera.viewProjection, camera.projection, camera.viewMatrix);
	camera.aspectRatio = aspectRatio;
}

function setupScene() {
	// Setup shaders
	ambientShader = makeShader('ambient');
	forwardShader = makeShader('forward');
	forwardOnePassShader = makeShader('forward-one-pass');
	tiledShader = makeShader('tiled');

	// Set up buffer for storing the model matrices for the instanced cubes
	modelMatrixData = new Float32Array(numCubes * 16 /* floats */);
	modelMatrixBuffer = app.createMatrixBuffer(PicoGL.FLOAT_MAT4, modelMatrixData);

	// Setup cubes
	for (var i = 0; i < numCubes; i++) {
		cubes.push({
			position: randomPositionInScene(),
			rotationX: randomAngle(),
			rotationY: randomAngle(),
			rotationZ: randomAngle(),
			// Creates a view into the buffer so no copying has to occur
			modelMatrix: new Float32Array(modelMatrixData.buffer, i * 16 * 4, 16)
		});
	}

	// Setup lights
	for (var i = 0; i < numLights; i++) {
		lights.push({
			position: randomPositionInScene(),
			color: randomColor()
		});
	}

	OBJ.downloadMeshes({
		'cube': '../assets/cube.obj'
	}, function(meshes) {

		let positions = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array(meshes.cube.vertices));
		let normals = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array(meshes.cube.vertexNormals));
		let indices = app.createIndexBuffer(PicoGL.UNSIGNED_SHORT, 3, new Uint16Array(meshes.cube.indices));

		// Create vertex array
		cubeVA = app.createVertexArray()
		.vertexAttributeBuffer(0, positions)
		.vertexAttributeBuffer(1, normals)
		.instanceAttributeBuffer(2, modelMatrixBuffer)
		.indexBuffer(indices);

		// Create draw calls
		ambientDrawCall = app.createDrawCall(ambientShader, cubeVA);
		forwardDrawCall = app.createDrawCall(forwardShader, cubeVA);
		forwardOnePassDrawCall = app.createDrawCall(forwardOnePassShader, cubeVA);
		tiledDrawCall = app.createDrawCall(tiledShader, cubeVA);

		//
		// Setup initial/constant uniforms
		//

		// Set up the light uniform buffer
		var lightsLayout = new Array(1002);
		for (var i = 0; i < 1000; ++i) { lightsLayout[i] = PicoGL.FLOAT_VEC4; }
		lightsLayout[1000] = PicoGL.INT;
		lightsLayout[1001] = PicoGL.FLOAT;
		lightsUniformBuffer = app.createUniformBuffer(lightsLayout);

		for (var i = 0; i < numLights; i++) { lightsUniformBuffer.set(i, lights[i].position); }
		for (var i = 0; i < numLights; i++) { lightsUniformBuffer.set(500 + i, lights[i].color); }
		lightsUniformBuffer.set(1000, numLights);
		lightsUniformBuffer.set(1001, lightRadius);
		lightsUniformBuffer.update();

		// Default forward
		forwardDrawCall.uniform('lightRadius', lightRadius);

		// One pass forward
		forwardOnePassDrawCall.uniformBlock('LightsBlock', lightsUniformBuffer);

		// Tiled shading
		tiledDrawCall.uniformBlock('LightsBlock', lightsUniformBuffer);

	});

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
function randomAngle() {
	return randomInRange(0.0, Math.PI * 2.0);
}
function randomPositionInScene() {
	return vec3.fromValues(
		randomInRange(-sceneSize, sceneSize),
		randomInRange(-sceneSize, sceneSize),
		randomInRange(-sceneSize, sceneSize)
	);
}
function randomColor() {
	return vec3.fromValues(Math.random(), Math.random(), Math.random());
}

////////////////////////////////////////////////////
// ------------------  Render  -------------------//
////////////////////////////////////////////////////

function onRender() {

	// Update timer
	var currentTime = new Date().getTime();
	var deltaMs = currentTime - lastTime;
	var delta = deltaMs / 1000.0;
	lastTime = currentTime;

	updateFrameTimeLabel();

	app.clearColor(0, 0, 0, 1).clear();

	// Wait until model is fully loaded
	if (!cubeVA) {
		return;
	}

	// Rotate camera around scene
	vec3.rotateY(camera.position, camera.position, vec3.fromValues(0, 0, 0), delta / 10.0);
	mat4.lookAt(camera.viewMatrix, camera.position, vec3.fromValues(0, 0, 0), vec3.fromValues(0, 1, 0));
	mat4.multiply(camera.viewProjection, camera.projection, camera.viewMatrix);

	var rotXmatrix = mat4.create();
	var rotYmatrix = mat4.create();
	var rotZmatrix = mat4.create();

	for (var cube of cubes) {
		// Rotate cubes
		cube.rotationX += Math.random() * 0.5 * delta;
		cube.rotationY += Math.random() * 1.0 * delta;
		cube.rotationZ += Math.random() * 2.0 * delta;

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

	// Only time the part of rendering that is unique for the different modes
	app.timerStart();

	switch (renderMode) {
		case 'forward':
		{
			app.depthTest().depthFunc(PicoGL.LEQUAL);
			ambientDrawCall.uniform('viewProjection', camera.viewProjection);
			app.drawCalls([ambientDrawCall]);
			app.noBlend().draw();

			forwardDrawCall.uniform('viewProjection', camera.viewProjection);
			app.drawCalls([forwardDrawCall]);
			app.blend().blendFunc(PicoGL.ONE, PicoGL.ONE);

			for (var light of lights) {
				forwardDrawCall.uniform('lightPos', light.position);
				forwardDrawCall.uniform('lightColor', light.color);
				app.draw();
			}
		}
		break;

		case 'forward-one-pass':
		{
			app.depthTest().depthFunc(PicoGL.LEQUAL);
			ambientDrawCall.uniform('viewProjection', camera.viewProjection);
			app.drawCalls([ambientDrawCall]);
			app.noBlend().draw();

			forwardOnePassDrawCall.uniform('viewProjection', camera.viewProjection);
			app.drawCalls([forwardOnePassDrawCall]);
			app.blend().blendFunc(PicoGL.ONE, PicoGL.ONE);
			app.depthFunc(PicoGL.EQUAL); // ambient acts as z-prepass
			app.draw();
		}
		break;

		case 'tiled-shading':
		{
			// Group lights into the light grid cells (assuming that the scene nor camera
			// is static this has to be done every frame)

			// Empty the light grid
			for (var i = 0; i < gridRows * gridColumns; i++) {
				lightGrid[i] = [];
			}

			var lightIndexListLength = 0; // TODO: Needed?
			for (var lightIndex = 0; lightIndex < lights.length; lightIndex++) {
				var light = lights[lightIndex];

				var pos = light.position;
				var p = vec4.fromValues(pos[0], pos[1], pos[2], 1.0);
				vec4.transformMat4(p, p, camera.viewProjection);
				vec4.scale(p, p, 1.0 / p[3]); // perspective divide

				// grid-space from now on: x:[0, gridColumns) y:[0, gridRows)
				var gridX = (p[0] * 0.5 + 0.5) * gridColumns;
				var gridY = (p[1] * 0.5 + 0.5) * gridRows;

				// NOTE: Only works with precision if the sphere is at the absolute center of the screen!
				function computeProjectedRadius(fovy, d, r) {
					return 1.0 / Math.tan(fovy) * r / Math.sqrt(d * d - r * r);
				}

				var distance = vec3.distance(camera.position, light.position);
				var projectedRadius = computeProjectedRadius(camera.fovY, distance, lightRadius);

				// Calculate grid space radius and account for the warping from the projection if the
				// light is not at the center of the screen by adding 1/2 of a grid cell to the radius.
				// This is required since the computeProjectedRadius function only works if the sphere
				// is at the absolute center of the screen.
				var gridSpaceRadiusX = projectedRadius * gridColumns + 0.5;
				var gridSpaceRadiusY = projectedRadius * gridRows + 0.5;

				for (var yy = -gridSpaceRadiusY; yy <= gridSpaceRadiusY; yy += 1.0) {
					for (var xx = -gridSpaceRadiusX; xx <= gridSpaceRadiusX; xx += 1.0) {

						// TODO: Now we are effectively selecting all cells in a square but in many cases this will
						// include some corner cells that aren't actually covered by the light. For optimal efficiency
						// of the technique we need to not include these.

						var x = Math.floor(gridX + xx);
						var y = Math.floor(gridY + yy);

						if (x >= 0 && x < gridColumns && y >= 0 && y < gridRows) {
							var index = y * gridColumns + x;
							lightGrid[index].push(lightIndex);
							lightIndexListLength += 1; // TODO: Needed?
						}
					}
				}
			}

			// TODO: Create GPU buffers for the lightGrid and upload it as:
			// light grid - array of vec2(index, length) into the light grid indices list
			// light grid indices - essentially what the lightGrid JS 2D array is now but flattened

			var currentIndex = 0;
			var lightGridIndices = [];

			for (var i = 0; i < lightGrid.length; i++) {

				// Push the light indices to the full light grid index list
				Array.prototype.push.apply(lightGridIndices, lightGrid[i]);

				var lightsForGridCell = lightGrid[i].length;

				lightGridUniform[2 * i + 0] = currentIndex;
				lightGridUniform[2 * i + 1] = lightsForGridCell;

				currentIndex += lightsForGridCell;
			}

			var lightGridIndexTexture = app.createTexture2D(new Int16Array(lightGridIndices), lightGridIndices.length, 1, {
				type: PicoGL.SHORT,
				format: PicoGL.RED_INTEGER,
				internalFormat: PicoGL.R16I,
				minFilter: PicoGL.NEAREST,
				magFilter: PicoGL.NEAREST
			});

			tiledDrawCall.uniform('lightGrid[0]', lightGridUniform);
			tiledDrawCall.texture('lightGridIndicesTex', lightGridIndexTexture);

			// Draw z-prepass and ambient
			app.depthTest().depthFunc(PicoGL.LEQUAL);
			ambientDrawCall.uniform('viewProjection', camera.viewProjection);
			app.drawCalls([ambientDrawCall]);
			app.noBlend().draw();

			tiledDrawCall.uniform('viewProjection', camera.viewProjection);
			app.drawCalls([tiledDrawCall]);
			app.blend().blendFunc(PicoGL.ONE, PicoGL.ONE);
			app.depthFunc(PicoGL.EQUAL); // ambient acts as z-prepass
			app.draw();
		}
		break;
	}

	app.timerEnd();
}
