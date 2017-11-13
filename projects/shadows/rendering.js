'use strict';

////////////////////////////////////////////////////
// ------------------  Data  ---------------------//
////////////////////////////////////////////////////

var app;

var camera = {
	pos: vec3.fromValues(9.0, 4.0, 9.0),
	targetPoint: vec3.fromValues(2.0, 4.0, 0.0),
	viewFromWorld: mat4.create(),
	projectionFromView: mat4.create(),
	viewFromProjection: mat4.create()
};

////////////////////////////////////////////////////

var cameraUniformBuffer;
var lightUniformBuffer

var light = {
	pos: vec4.fromValues(0.0, 5.0, 10.0, 0 /* unused */),
	targetPoint: vec4.fromValues(0.0, 2.0, 0.0, 0 /* unused */),
	lightFromWorld: mat4.create(),
	projectionFromLight: mat4.create(),
	lightFromProjection: mat4.create(),
	cutoff: 30.0 /* degrees */ / (Math.PI / 180.0)
}

var zeroRotation = quat.create();
var quarterTurnX = quat.rotateX(quat.create(), quat.create(), Math.PI / 2.0);

var buddhaDrawCall;
var buddhaTransforms = [
	mat4.fromRotationTranslationScale(mat4.create(), zeroRotation, vec3.fromValues(-2, 0, -1), vec3.fromValues(0.7, 0.7, 0.7)),
	mat4.fromRotationTranslationScale(mat4.create(), zeroRotation, vec3.fromValues(+1, 0, +4), vec3.fromValues(0.2, 0.2, 0.2))
]

var panelDrawCall;
var panelTransforms = [
	mat4.create(), /* floor */
	mat4.fromRotationTranslation(mat4.create(), quarterTurnX, vec3.fromValues(0, 2, -5)) /* back wall */
];

////////////////////////////////////////////////////
// ------------------  Setup  --------------------//
////////////////////////////////////////////////////

function onSetup(canvas) {

	app = PicoGL.createApp(canvas)
	.clearColor(0, 0, 0, 1)
	.depthTest()
	.cullBackfaces();

	var mainShader = makeShader('main-vs', 'main-fs');

	cameraUniformBuffer = app.createUniformBuffer([
		PicoGL.FLOAT_MAT4, /* u_view_from_world */
		PicoGL.FLOAT_MAT4, /* u_projection_from_view */
		PicoGL.FLOAT_MAT4  /* u_view_from_projection */
	]);
	updateCamera();

	lightUniformBuffer = app.createUniformBuffer([
		PicoGL.FLOAT_VEC4, /* u_light_position */
		PicoGL.FLOAT_VEC4, /* u_light_direction */
		PicoGL.FLOAT_MAT4, /* u_light_from_world */
		PicoGL.FLOAT_MAT4, /* u_projection_from_light */
		PicoGL.FLOAT_MAT4, /* u_light_from_projection */
		PicoGL.FLOAT       /* u_light_cutoff */
	]);
	updateLight();

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

		buddhaDrawCall = app.createDrawCall(mainShader, buddhaVertexArray);
		buddhaDrawCall.uniformBlock('CameraUniforms', cameraUniformBuffer);
		buddhaDrawCall.uniformBlock('LightUniforms', lightUniformBuffer);
	});

	{
		var panelPositions = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array([
			-10, 0, -10,
			-10, 0, +10,
			+10, 0, +10,
			+10, 0, -10
		]));
		var panelNormals = app.createVertexBuffer(PicoGL.FLOAT, 3, new Float32Array([
			0, 1, 0,
			0, 1, 0,
			0, 1, 0,
			0, 1, 0
		]));
		var panelIndices = app.createIndexBuffer(PicoGL.UNSIGNED_SHORT, 3, new Uint16Array([0, 1, 2, 0, 2, 3]));
		var panelVertexArray = app.createVertexArray()
		.vertexAttributeBuffer(0, panelPositions)
		.vertexAttributeBuffer(1, panelNormals)
		.indexBuffer(panelIndices);

		panelDrawCall = app.createDrawCall(mainShader, panelVertexArray);
		panelDrawCall.uniformBlock('CameraUniforms', cameraUniformBuffer);
		panelDrawCall.uniformBlock('LightUniforms', lightUniformBuffer);
	}

	// (fst = full-screen triangle)
	/*
	var fstPositions = app.createVertexBuffer(PicoGL.FLOAT, 2, new Float32Array([-1, -1, +3, -1, -1, +3]));
	var fstVertexArray = app.createVertexArray()
	.vertexAttributeBuffer(0, fstPositions);
	*/

}

function onResize(width, height) {
	app.resize(width, height);
	// TODO: Resize buffers!

	updateCamera();
}

////////////////////////////////////////////////////

function updateCamera() {
	var aspectRatio = app.width / app.height;
	var fovy = Math.PI / 3.0;

	mat4.lookAt(camera.viewFromWorld, camera.pos, camera.targetPoint, vec3.fromValues(0, 1, 0));
	mat4.perspective(camera.projectionFromView, fovy, aspectRatio, 0.1, 1000.0);
	mat4.invert(camera.viewFromProjection, camera.projectionFromView);

	cameraUniformBuffer
	.set(0, camera.viewFromWorld)
	.set(1, camera.projectionFromView)
	.set(2, camera.viewFromProjection)
	.update();
}

function updateLight() {
	var lightDirection = vec4.create();
	vec4.subtract(lightDirection, light.targetPoint, light.pos);
	vec4.normalize(lightDirection, lightDirection);

	mat4.lookAt(light.lightFromWorld, light.pos, light.targetPoint, vec3.fromValues(0, 1, 0));
	mat4.perspective(light.projectionFromLight, light.cutoff, 1.0, 0.1, 1000.0);
	mat4.invert(light.lightFromProjection, light.projectionFromLight);

	lightUniformBuffer
	.set(0, light.pos)
	.set(1, lightDirection)
	.set(2, light.lightFromWorld)
	.set(3, light.lightFromProjection)
	.set(4, light.projectionFromLight)
	.set(5, light.cutoff)
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

////////////////////////////////////////////////////
// ------------------  Render  -------------------//
////////////////////////////////////////////////////

function onRender() {

	// Wait until the scene is loaded in properly
	if (!buddhaDrawCall) {
		app.defaultDrawFramebuffer().clear();
		return;
	}

	// Render scene from light


	// TODO: Process shadow map stuff!

	// Render scene onto screen
	app.defaultDrawFramebuffer().clear();
	renderScene();
}

function renderScene() {

	for (var i = 0; i < buddhaTransforms.length; i++) {
		buddhaDrawCall
		.uniform('u_world_from_local', buddhaTransforms[i])
		.uniform('u_color', vec3.fromValues(0.60, 0.58, 0.55))
		.draw();
	}

	for (var i = 0; i < panelTransforms.length; i++) {
		panelDrawCall
		.uniform('u_world_from_local', panelTransforms[i])
		.uniform('u_color', vec3.fromValues(0.9, 0.9, 0.8))
		.draw();
	}

}
