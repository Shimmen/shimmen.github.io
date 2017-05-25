
var canvas;
var app;

var time = 0.0;

function onSetup(_canvas) {
	canvas = _canvas;
	app = PicoGL.createApp(canvas);
}

function onResize(width, height) {
	app.resize(width, height);
}

function onRender() {

	time += 1.0 / 60.0; // approx...
	var r = 0.75 + (0.25 * Math.sin(time));
	app.clearColor(r, 0.75, 0.70, 1);

	app.clear();
}
