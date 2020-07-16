
let canvas = document.getElementById('canvas');
if (!canvas) {
	alert('The canvas is missing! It\'s not supposed to be missing..');
	throw new Error();
}

let ctx = canvas.getContext('2d');

let errorCeiling = 1.0;
let remappingExponent = 1.0;

let actualMaxErrorLabel = document.getElementById('actualMaxError');
let actualMaxDiff = 0.0;

let imageA = document.createElement('img');
let imageB = document.createElement('img');
let loadedImages = [];

function getPixels(image) {
	let imgCanvas = document.createElement('canvas');
	imgCanvas.width = image.width;
	imgCanvas.height = image.height;
	let imgCtx = imgCanvas.getContext('2d');
	imgCtx.drawImage(image, 0, 0);
	return imgCtx.getImageData(0, 0, image.width, image.height);
}

let gradient = null;
let gradientImg = document.createElement('img');
gradientImg.addEventListener('load', function(e) {
	imageData = getPixels(gradientImg);
	// Note: it's much faster to index a typed array than image data, apparently,
	//  so since we do that quite often down below we convert it here first
	gradient = new Uint8Array(imageData.data.length / 4 * 3);
	nextIdx = 0;
	for (let i = 0; i < imageData.data.length; i += 4) {
		gradient[nextIdx++] = imageData.data[i+0];
		gradient[nextIdx++] = imageData.data[i+1];
		gradient[nextIdx++] = imageData.data[i+2];
	}
});
gradientImg.src = 'blackbody_gradient.png';

function sRGBgammaDecode(encoded) {
	return (encoded < 0.04045)
		? encoded / 12.92
		: Math.pow((encoded + 0.055) / 1.055, 2.4);
}

function luminance(r, g, b) {
	return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function calculateImageDiff(pixelsA, pixelsB) {
	let maxDiff = 0.0;
	for (let i = 0; i < pixelsA.data.length; i += 4) {

		let ra = sRGBgammaDecode(pixelsA.data[i+0] / 255.0);
		let ga = sRGBgammaDecode(pixelsA.data[i+1] / 255.0);
		let ba = sRGBgammaDecode(pixelsA.data[i+2] / 255.0);
		let lumaA = luminance(ra, ga, ba);

		let rb = sRGBgammaDecode(pixelsB.data[i+0] / 255.0);
		let gb = sRGBgammaDecode(pixelsB.data[i+1] / 255.0);
		let bb = sRGBgammaDecode(pixelsB.data[i+2] / 255.0);
		let lumaB = luminance(rb, gb, bb);

		let diff = 255.99 * Math.abs(lumaA - lumaB);
		maxDiff = Math.max(maxDiff, diff);

		diff /= errorCeiling;
		if (diff > 1.0) {
			pixelsA.data[i+0] = 0;
			pixelsA.data[i+1] = 255;
			pixelsA.data[i+2] = 0;
			continue;
		}

		console.assert(!isNaN(diff) && isFinite(diff));
		console.assert(diff >= 0.0 && diff < 1.0);
		
		diff = Math.pow(diff, remappingExponent);

		let rIdx = 3 * Math.floor(diff * (gradient.length / 3));
		pixelsA.data[i+0] = gradient[rIdx+0];
		pixelsA.data[i+1] = gradient[rIdx+1];
		pixelsA.data[i+2] = gradient[rIdx+2];
	}

	actualMaxDiff = maxDiff;
	actualMaxErrorLabel.innerHTML = actualMaxDiff.toFixed(2);
}

function drawImageDiff() {

	if (loadedImages.length === 0) {
		ctx.fillStyle = '#000000';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		return;
	}

	canvas.width = loadedImages[0].width;
	canvas.height = loadedImages[0].height;

	if (loadedImages.length === 1) {
		ctx.drawImage(loadedImages[0], 0, 0);
		return;
	}

	if (loadedImages[0].width !== loadedImages[1].width || loadedImages[0].height !== loadedImages[1].height) {
		alert('Images must be of the same size!');
		ctx.drawImage(loadedImages[0], 0, 0);
		return;
	}

	let pixelsA = getPixels(loadedImages[0]);
	let pixelsB = getPixels(loadedImages[1]);

	calculateImageDiff(pixelsA, pixelsB);
	ctx.putImageData(pixelsA, 0, 0);
}

let errorCeilingSlider = document.getElementById('errorCeilingSlider');
let errorCeilingTextbox = document.getElementById('errorCeilingTextbox');
errorCeiling = errorCeilingSlider.value;

errorCeilingSlider.addEventListener('input', function(e) {
	if (e.target.valueAsNumber !== errorCeiling) {
		errorCeiling = e.target.valueAsNumber;
		errorCeilingTextbox.value = errorCeiling.toFixed(2);
		drawImageDiff();
	}
});

errorCeilingTextbox.addEventListener('input', function(e) {
	let inputVal = parseFloat(e.target.value);
	if (!isNaN(inputVal) && inputVal !== errorCeiling) {
		errorCeiling = inputVal;
		errorCeilingSlider.value = errorCeiling;
		drawImageDiff();
	}
});

function getImageSourceFromFilePickerFile(file, callback) {
	let reader = new FileReader();
	reader.onload = function (e) {
		callback(e.target.result);
	}
	reader.readAsDataURL(file);
}

let filePickerA = document.getElementById('pickerA');
filePickerA.addEventListener('change', function(e) {
	loadedImages = loadedImages.filter(function(img) { return img !== imageA; });
	if (filePickerA.files.length === 0) {
		drawImageDiff();
		return;
	}
	getImageSourceFromFilePickerFile(filePickerA.files[0], function(src) {
		imageA.src = src;
	});
});
imageA.onload = function(e) {
	loadedImages.push(imageA);
	filePickerB.disabled = loadedImages.length === 0;
	drawImageDiff();
}

let filePickerB = document.getElementById('pickerB');
filePickerB.addEventListener('change', function(e) {
	loadedImages = loadedImages.filter(function(img) { return img !== imageB; });
	if (filePickerB.files.length === 0) {
		drawImageDiff();
		return;
	}
	getImageSourceFromFilePickerFile(filePickerB.files[0], function(src) {
		imageB.src = src;
	});
});
imageB.onload = function(e) {
	loadedImages.push(imageB);
	filePickerA.disabled = loadedImages.length === 0;
	drawImageDiff();
}

let remappingExponentTextbox = document.getElementById('remappingExponentTextbox');
remappingExponentTextbox.addEventListener('change', function(e) {
	remappingExponent = remappingExponentTextbox.valueAsNumber;
	drawImageDiff();
});

document.getElementById('fullscreen-btn').addEventListener('click', function(e) {
	let anchor = document.createElement('a');
	anchor.href = canvas.toDataURL('image/png');
	anchor.download = 'diff.png';
    anchor.click();
});

drawImageDiff();
