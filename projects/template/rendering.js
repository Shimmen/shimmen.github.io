
var canvas;
var gl;

function setup(_canvas, _gl) {
	canvas = _canvas;
	gl = _gl;
}

function render() {
	gl.clearColor(0.57, 0.75, 0.70, 1);
	gl.clear(gl2.COLOR_BUFFER_BIT);
}
