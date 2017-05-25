
var canvas;
var gl;

function onSetup(_canvas) {
	canvas = _canvas;
	gl = canvas.getContext('webgl2');
}

function onResize() {
	gl.viewport(0, 0, canvas.width, canvas.height);
}

function onRender() {
	gl.clearColor(0.57, 0.75, 0.70, 1);
	gl.clear(gl.COLOR_BUFFER_BIT);
}
