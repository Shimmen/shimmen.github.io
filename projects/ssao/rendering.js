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
var gBuffer;

var lightingDrawCall;

var ssao = {
	framebuffer: null,
	drawCall: null,

	noiseTextureSize: 4,
	noiseTexture: null,

	radius: 2.5,
	kernelSize: 16,
	kernel: null,

	power: 3.5
};

var buddha = {
	drawCall: null,
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

	var geometryShader = makeShader('geometry-vs', 'geometry-fs');
	var ssaoShader = makeShader('ssao-vs', 'ssao-fs');
	var lightingShader = makeShader('lighting-vs', 'lighting-fs');

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

		buddha.drawCall = app.createDrawCall(geometryShader, buddhaVertexArray);
		buddha.drawCall.uniformBlock('CameraUniforms', cameraUniformBuffer);
	});

	// (fst = full-screen triangle)
	var fstPositions = app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array([-1, -1, +3, -1, -1, +3]));
	var fstVertexArray = app.createVertexArray()
	.vertexAttributeBuffer(0, fstPositions);
	ssao.drawCall = app.createDrawCall(ssaoShader, fstVertexArray);
	ssao.drawCall.uniformBlock('CameraUniforms', cameraUniformBuffer);
	lightingDrawCall = app.createDrawCall(lightingShader, fstVertexArray);

	gBuffer = app.createFramebuffer(app.width, app.height)
	.colorTarget(0)
	.colorTarget(1)
	.depthTarget();

	ssao.framebuffer = app.createFramebuffer(app.width, app.height)
	.colorTarget(0);

	generateSsaoNoiseTexture();
	generateSsaoKernel();
}

function onResize(width, height) {
	app.resize(width, height);
	gBuffer.resize(width, height);
	ssao.framebuffer.resize(width, height);

	updateCamera();

	var scaleX = width / ssao.noiseTextureSize;
	var scaleY = height / ssao.noiseTextureSize;
	var scale = new Float32Array([scaleX, scaleY]);
	ssao.drawCall.uniform('u_ssao_noise_scale', scale);
}

////////////////////////////////////////////////////

function generateSsaoNoiseTexture() {
	var size = ssao.noiseTextureSize;
	var noiseData = new Uint8Array(size * size * 3);

	for (var i = 0; i < size * size; i++) {

		var x = Math.random() * 2.0 - 1.0;
		var y = Math.random() * 2.0 - 1.0;
		var len = Math.sqrt(x*x + y*y);

		noiseData[3 * i + 0] = (x / len * 0.5 + 0.5) * 256.0;
		noiseData[3 * i + 1] = (y / len * 0.5 + 0.5) * 256.0;
		noiseData[3 * i + 2] = 0.0;
	}

	ssao.noiseTexture = app.createTexture2D(noiseData, size, size, {
		format: PicoGL.RGB, internalFormat: PicoGL.RGB8,
		minFilter: PicoGL.NEAREST, magFilter: PicoGL.NEAREST
	});

	ssao.drawCall.texture('u_ssao_noise_texture', ssao.noiseTexture);
}

function generateSsaoKernel() {
	ssao.kernel = new Float32Array(ssao.kernelSize * 3);
	for (var i = 0; i < ssao.kernelSize; i++) {

		var x = Math.random() * 2.0 - 1.0;
		var y = Math.random() * 2.0 - 1.0;
		var z = Math.random();

		var len = Math.sqrt(x*x + y*y + z*z);

		var scale = i / ssao.kernelSize;
		scale = lerp(0.1, 1.0, scale * scale);

		ssao.kernel[3 * i + 0] = x / len * scale;
		ssao.kernel[3 * i + 1] = y / len * scale;
		ssao.kernel[3 * i + 2] = z / len * scale;
	}

	ssao.drawCall.uniform('u_ssao_kernel_size', ssao.kernelSize);
	ssao.drawCall.uniform('u_ssao_kernel[0]', ssao.kernel);
	ssao.drawCall.uniform('u_ssao_radius', ssao.radius);
	ssao.drawCall.uniform('u_ssao_power', ssao.power);
}

////////////////////////////////////////////////////

function sliderListener(sliderId, ssaoProperty, uniformName, labelId, unit) {

	function setLabelText(label, value) {
		var rounded = value.toFixed(2);
		label.innerHTML = '(' + rounded + unit + ')';
	}

	var slider = document.getElementById(sliderId);
	var sliderLabel = document.getElementById(labelId);

	slider.value = ssao[ssaoProperty];
	setLabelText(sliderLabel, ssao[ssaoProperty]);

	slider.addEventListener('input', function(e) {
		ssao[ssaoProperty] = e.target.valueAsNumber;
		setLabelText(sliderLabel, ssao[ssaoProperty]);
		if (ssao.drawCall) {
			ssao.drawCall.uniform(uniformName, ssao[ssaoProperty]);
		}
	});
}

function setupListeners() {
	sliderListener('kernelRadiusSlider', 'radius', 'u_ssao_radius', 'kernelRadiusLabel', 'm');
	sliderListener('ssaoPowerSlider', 'power', 'u_ssao_power', 'ssaoPowerLabel', '');
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

	// Render scene into g-buffer
	app.drawFramebuffer(gBuffer).clear();
	buddha.drawCall
	.uniform('u_world_from_local', buddha.worldFromLocal)
	.draw();

	var albedoTexture = gBuffer.colorTextures[0];
	var normalDepthTexture = gBuffer.colorTextures[1];

	// Perform SSAO pass
	app.drawFramebuffer(ssao.framebuffer);
	ssao.drawCall
	.texture('u_normal_depth_texture', normalDepthTexture)
	.draw();

	var occlusionTexture = ssao.framebuffer.colorTextures[0];

	// Final pass (lightning and post-process)
	app.defaultDrawFramebuffer();
	lightingDrawCall
	.texture('u_albedo', albedoTexture)
	.texture('u_normal', normalDepthTexture)
	.texture('u_occlusion', occlusionTexture)
	.uniform('u_blur_size', ssao.noiseTextureSize)
	.draw();

}
