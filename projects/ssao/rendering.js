'use strict';

////////////////////////////////////////////////////
// ------------------  Data  ---------------------//
////////////////////////////////////////////////////

var app;

var mouse = {
	lastX: undefined,
	lastY: undefined,
	dx: 0.0,
	dy: 0.0
};

var camera = {
	pos: vec3.fromValues(0.0, 6.0, -8.0),
	targetPoint: vec3.fromValues(0.0, 5.0, 0.0),
	viewFromWorld: mat4.create(),
	projectionFromView: mat4.create(),
	viewFromProjection: mat4.create()
};

////////////////////////////////////////////////////

var cameraUniformBuffer;

var mainShader;
var gBuffer;

var ssaoShader;
var ssaoNoiseTextureSize = 4;
var ssaoNoiseTexture;
var ssaoDrawCall;

var ssaoRadius = 0.8;
var ssaoKernelSize = 16;
var ssaoKernel = new Float32Array(ssaoKernelSize * 3);

var buddha = {
	drawCall: undefined,
	worldFromLocal: mat4.create(),
	currentRotation: Math.PI
};

////////////////////////////////////////////////////
// ------------------  Setup  --------------------//
////////////////////////////////////////////////////

function onSetup(canvas) {

	setupListeners();

	app = PicoGL.createApp(canvas)
	.clearColor(0, 0, 0, 1)
	.depthTest()
	.cullBackfaces();

	mainShader = makeShader('main-vs', 'main-fs');
	ssaoShader = makeShader('ssao-vs', 'ssao-fs');

	cameraUniformBuffer = app.createUniformBuffer([
		PicoGL.FLOAT_MAT4, /* u_view_from_world */
		PicoGL.FLOAT_MAT4, /* u_projection_from_view */
		PicoGL.FLOAT_MAT4  /* u_view_from_projection */
	]);
	updateCamera();

	OBJ.downloadMeshes({
		'buddha': 'buddha.obj'
	}, function(meshes) {

		var positions = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array(meshes.buddha.vertices));
		var normals   = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array(meshes.buddha.vertexNormals));
		let indices   = app.createIndexBuffer(PicoGL.UNSIGNED_SHORT, 3, new Uint16Array(meshes.buddha.indices));

		var buddhaVertexArray = app.createVertexArray()
		.vertexAttributeBuffer(0, positions)
		.vertexAttributeBuffer(1, normals)
		.indexBuffer(indices);

		buddha.drawCall = app.createDrawCall(mainShader, buddhaVertexArray);
		buddha.drawCall.uniformBlock('CameraUniforms', cameraUniformBuffer);
	});

	var fstPositions = app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array([-1, -1, +3, -1, -1, +3]));
	var fstVertexArray = app.createVertexArray()
	.vertexAttributeBuffer(0, fstPositions);
	ssaoDrawCall = app.createDrawCall(ssaoShader, fstVertexArray);
	ssaoDrawCall.uniformBlock('CameraUniforms', cameraUniformBuffer);

	gBuffer = app.createFramebuffer(app.width, app.height)
	.colorTarget(0)
	.colorTarget(1)
	.depthTarget();

	// Generate noise texture (for SSAO)
	{
		var size = ssaoNoiseTextureSize;
		var noiseData = new Uint8Array(size * size * 3);

		for (var i = 0; i < size * size; i++) {

			var x = Math.random() * 2.0 - 1.0;
			var y = Math.random() * 2.0 - 1.0;
			var len = Math.sqrt(x*x + y*y);

			noiseData[3 * i + 0] = (x / len * 0.5 + 0.5) * 256.0;
			noiseData[3 * i + 1] = (y / len * 0.5 + 0.5) * 256.0;
			noiseData[3 * i + 2] = 0.0;
		}

		ssaoNoiseTexture = app.createTexture2D(noiseData, size, size, {
			format: PicoGL.RGB, internalFormat: PicoGL.RGB8,
			minFilter: PicoGL.NEAREST, magFilter: PicoGL.NEAREST // TODO: should bilinear be used?
		});

		ssaoDrawCall.texture('u_ssao_noise_texture', ssaoNoiseTexture);
	}

	// Generate SSAO kernel
	{
		for (var i = 0; i < ssaoKernelSize; i++) {

			var x = Math.random() * 2.0 - 1.0;
			var y = Math.random() * 2.0 - 1.0;
			var z = Math.random();

			var len = Math.sqrt(x*x + y*y + z*z);

			var scale = i / ssaoKernelSize;
			scale = lerp(0.1, 1.0, scale * scale);

			ssaoKernel[3 * i + 0] = x / len * scale;
			ssaoKernel[3 * i + 1] = y / len * scale;
			ssaoKernel[3 * i + 2] = z / len * scale;
		}

		ssaoDrawCall.uniform('u_ssao_kernel_size', ssaoKernelSize);
		ssaoDrawCall.uniform('u_ssao_kernel[0]', ssaoKernel);
		ssaoDrawCall.uniform('u_ssao_radius', ssaoRadius);
	}

	// Set up mouse-drag listener TODO: Fix!
/*
	canvas.onmousedown = function() {
		document.onmousemove = function(e) {

			mouse.dx = (mouse.lastX !== undefined) ? mouse.lastX - e.screenX : 0.0;
			mouse.dy = (mouse.lastY !== undefined) ? mouse.lastY - e.screenY : 0.0;

			if (mouse.dx !== 0.0 || mouse.dy !== 0.0) {
				var toCamera = vec3.create();
				vec3.subtract(toCamera, camera.targetPoint, camera.pos);

				var rot = quat.create();
				quat.fromEuler(rot, 0, mouse.dx * 0.5, -mouse.dy * 0.5);
				vec3.transformQuat(toCamera, toCamera, rot);

				camera.pos = vec3.add(camera.pos, camera.targetPoint, toCamera);
				mat4.lookAt(viewFromWorldMatrix, camera.pos, camera.targetPoint, vec3.fromValues(0, 1, 0));
			}

			mouse.lastX = e.screenX;
			mouse.lastY = e.screenY;

			//console.log('Mouse moved (' + mouse.dx + ', ' + mouse.dy + ')');
			// console.log(mouse.dx + " - " + mouse.dy);
		}
		document.onmouseup = function(e){
			document.onmousemove = function(){};
			mouse.lastX = undefined;
			mouse.lastY = undefined;
			mouse.dx = 0.0;
			mouse.dy = 0.0;
		}
	}
*/
}

function onResize(width, height) {
	app.resize(width, height);
	gBuffer.resize(width, height);

	updateCamera();

	var scaleX = width / ssaoNoiseTextureSize;
	var scaleY = height / ssaoNoiseTextureSize;
	var scale = new Float32Array([scaleX, scaleY]);
	ssaoDrawCall.uniform('u_ssao_noise_scale', scale);
}

////////////////////////////////////////////////////

function setupListeners() {

	var slider = document.getElementById('kernelRadiusSlider');
	var sliderLabel = document.getElementById('kernelRadiusLabel');

	function setLabelText(value) {
		var rounded = value.toFixed(2);
		sliderLabel.innerHTML = '(' + rounded + 'm)';
	}

	slider.value = ssaoRadius;
	setLabelText(ssaoRadius);

	slider.addEventListener('input', function(e) {
		ssaoRadius = e.target.valueAsNumber;
		setLabelText(ssaoRadius);
		if (ssaoDrawCall) {
			ssaoDrawCall.uniform('u_ssao_radius', ssaoRadius);
		}
	})

}

function updateCamera() {
	var aspectRatio = app.width / app.height;
	var fovy = Math.PI / 2.0;

	mat4.lookAt(camera.viewFromWorld, camera.pos, camera.targetPoint, vec3.fromValues(0, 1, 0));
	mat4.perspective(camera.projectionFromView, fovy, aspectRatio, 0.1, 1000.0);
	mat4.invert(camera.viewFromProjection, camera.projectionFromView);

	cameraUniformBuffer
	.set(0, camera.viewFromWorld)
	.set(1, camera.projectionFromView)
	.set(2, camera.viewFromProjection)
	.update();
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

function lerp(a, b, f) {
	return a + (b - a) * f;
}

////////////////////////////////////////////////////
// ------------------  Render  -------------------//
////////////////////////////////////////////////////

function onRender() {

	// Wait until the scene is loaded in properly
	if (!buddha.drawCall) {
		app.defaultDrawFramebuffer().clear();
		return;
	}

	buddha.currentRotation += 0.007;
	mat4.fromRotation(buddha.worldFromLocal, buddha.currentRotation, vec3.fromValues(0, 1, 0));

	// Render scene
	app.drawFramebuffer(gBuffer).clear();
	{
		buddha.drawCall
		.uniform('u_world_from_local', buddha.worldFromLocal)
		.draw();
	}

	// Perform SSAO pass
	app.defaultDrawFramebuffer();
	{
		ssaoDrawCall
		.texture('u_normal_depth_texture', gBuffer.colorTextures[1])
		.draw();
	}

}
