
var app = (function() {

// private functions here.

function createPixelCanvas(width, height) {
	var canvas = document.createElement("canvas");
	canvas.setAttribute("width", width);
	canvas.setAttribute("height", height);
	var context = canvas.getContext('2d');
	var image = context.createImageData(width, height);
	return {
		canvas:canvas,
		context:context,
		image:image,
		width:width,
		height:height,
	}
}

function initPixelCanvas(canvas, width, height) {
	var context = canvas.getContext('2d');
	var image = context.createImageData(width, height);
	return {
		canvas:canvas,
		context:context,
		image:image,
		width:width,
		height:height,
	}
}

function prepDrawLines(pixelCanvas, r, g, b, a) {
	var d = pixelCanvas.image.data;
	function setPixel(x, y) {
		//console.log("setPixel("+x+","+y+")");
		if(x >= pixelCanvas.image.width || x < 0) throw "width: "+x;
		if(y >= pixelCanvas.image.height || y < 0) throw "height: "+y;
		var i = (y*pixelCanvas.image.width + x)*4;
		d[i+0] = r;
		d[i+1] = g;
		d[i+2] = b;
		d[i+3] = a;
	}
	function plotLine(x0, y0, x1, y1)
	{
		//console.log("plotLine("+x0+","+y0+","+x1+","+y1+")");
		x0 = Math.round(x0);
		y0 = Math.round(y0);
		x1 = Math.round(x1);
		y1 = Math.round(y1);
		// The following part copied from http://members.chello.at/easyfilter/bresenham.html
		var dx =  Math.abs(x1-x0), sx = x0<x1 ? 1 : -1;
		var dy = -Math.abs(y1-y0), sy = y0<y1 ? 1 : -1;
		var err = dx+dy, e2;                                   /* error value e_xy */
		var count = 0;

		for(;;) {                                                          /* loop */
			count = count + 1;
			if(count > 1000) {
				throw "plotLine infinite loop";
			}
			setPixel(x0,y0);
			if (x0 == x1 && y0 == y1) break;
			e2 = 2*err;
			if (e2 >= dy) { err += dy; x0 += sx; }                        /* x step */
			if (e2 <= dx) { err += dx; y0 += sy; }                        /* y step */
		}
	}
	function finish() {
		pixelCanvas.context.putImageData(pixelCanvas.image, 0, 0);
	}
	return {plotLine:plotLine, finish:finish};
}

function drawLine(pixelCanvas, x0, y0, x1, y1, r, g, b, a) {
	var p = prepDrawLines(pixelCanvas, r, g, b, a);
	p.plotLine(x0, y0, x1, y1);
	p.finish();
}

var sRequestCount = 0;

function sparkRequest(urlPart, win) {
	sRequestCount = sRequestCount + 1;
	var rid = sRequestCount;
	var url = "https://data.sparkfun.com/" + urlPart;
	console.log(url);
	var xhr = new XMLHttpRequest();
	xhr.ontimeout = function () {
		console.error("The request for " + url + " timed out.");
	};
	xhr.onload = function() {
		console.log("state: "+xhr.readyState+", status: "+xhr.status+" "+xhr.statusText+" "+xhr.responseText.length);
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				win(JSON.parse(xhr.responseText));
			} else {
				console.error(xhr.statusText);
			}
		}
	};
	xhr.onerror = function (e) {
		console.error(url+": "+xhr.status+" "+xhr.statusText+" "+xhr.responseText.toString());
		/*for(i in xhr) {
			console.log(i+": "+xhr[i]);
		}*/
	};
	xhr.open("GET", url, true);
	xhr.timeout = 10000;
	xhr.send(null);
	return url;
}

document.addEventListener('deviceready', onDeviceReady, false)

var columnName = 'humidity';
var streamId = 'dZ4EVmE8yGCRGx5XRX1W';
var samplesPerDay = 6912;

function onDeviceReady() {
	console.log("onDeviceReady");
	// add DOM elements for this dataSource.
	var dataContainer = document.getElementById('data-container');
	function handler(d, columnName) {
		console.log("count: "+d.length);

		var currentTime = Date.parse(d[0].timestamp);
		var timeSpan = 24*60*60*1000;	// one day.
		//var timeSpan = 60*60*1000;	// one hour.
		var yesterday = currentTime - timeSpan;
		//console.log("td.clientWidth: "+td.clientWidth);
		//var pc = createPixelCanvas(td.clientWidth, 150);
		//td.appendChild(pc.canvas);
		var pc = createPixelCanvas(300, 150);
		//var pc = initPixelCanvas(document.getElementById('myCanvas'), 300, 150);
		//console.log(JSON.stringify(d, null, '\t'));
		var actualMax = 0;
		var actualMin = d[0][columnName];
		for(var i in d) {
			var value = parseFloat(d[i][columnName]);
			//console.log(i+": "+value+", max: "+actualMax);
			if(value > actualMax) {
				actualMax = value;
			}
			if(value < actualMin) {
				actualMin = value;
			}
		}
		console.log("Actual max: "+actualMax);
		console.log("Actual min: "+actualMin);

		var yMax = actualMax*1.1;
		var yMin = actualMin*0.9;
		var ySpan = yMax - yMin;

		console.log("w: "+pc.width+", h: "+pc.height);

		function plotDataPoint(i) {
			var dataPoint = parseFloat(d[i][columnName]);
			var time = Date.parse(d[i].timestamp);
			//console.log("dp: "+dataPoint+". time: "+time);

			var p = {
				x: ((time - yesterday) * pc.width) / timeSpan - 1,
				y: pc.height - (((dataPoint - yMin) * pc.height) / ySpan),
			};
			//console.log(i+": t,v: "+time+", "+dataPoint+" x,y: "+p.x+", "+p.y);
			return p;
		}

		var prev = plotDataPoint(0);
		console.log(d.length+" points, initial x,y: "+prev.x+", "+prev.y);
		var i=1;
		var drawer = prepDrawLines(pc, 255,0,0, 255);
		var lastTimestamp;
		while(i<d.length) {
			var p = plotDataPoint(i);
			//console.log(i+": x,y: "+p.x+", "+p.y);
			if(p.x < 0 || p.y < 0) {
				break;
			}
			lastTimestamp = d[i].timestamp;
			drawer.plotLine(prev.x, prev.y, p.x, p.y);
			prev = p;
			i += 1;
		}
		console.log("final x,y: "+prev.x+", "+prev.y);
		drawer.finish();

		// Axis text & canvas container.
		{
			var divText = document.createElement("div");
			divText.innerHTML = columnName;
			dataContainer.appendChild(divText);

			var table = document.createElement("table");

			{
				var upper = document.createElement("tr");

				var max = document.createElement("td");
				max.setAttribute("style", "vertical-align: top;");
				max.innerHTML = yMax.toPrecision(4);
				upper.appendChild(max);

				var canvasTd = document.createElement("td");
				canvasTd.setAttribute("rowspan", "2");
				canvasTd.setAttribute("colspan", "2");
				canvasTd.appendChild(pc.canvas);
				upper.appendChild(canvasTd);

				table.appendChild(upper);
			}
			{
				var mid = document.createElement("tr");

				var min = document.createElement("td");
				min.setAttribute("style", "vertical-align: bottom;");
				min.innerHTML = yMin.toPrecision(4);
				mid.appendChild(min);

				table.appendChild(mid);
			}

			{
				var bottom = document.createElement("tr");

				var spacer = document.createElement("td");
				bottom.appendChild(spacer);

				var start = document.createElement("td");
				start.innerHTML = lastTimestamp;
				bottom.appendChild(start);

				var end = document.createElement("td");
				end.innerHTML = d[0].timestamp;
				bottom.appendChild(end);

				table.appendChild(bottom);
			}

			dataContainer.appendChild(table);
		}
	}

	// sometimes, a single request doesn't get through. let's push another one.
	setTimeout(function() {
		var url = sparkRequest("output/"+streamId+".json?limit=300&sample="+Math.round(samplesPerDay/300), function(d) {
			setTimeout(function() {handler(d, columnName)}, 1);
			setTimeout(function() {console.log("foobar");handler(d, 'tempf')}, 100);
		});
		var divText = document.createElement("div");
		divText.innerHTML = url+"<br/>";
		dataContainer.appendChild(divText);
	}, 100);
}

function testDrawing() {
	var dataContainer = document.getElementById('data-container');
	var pc = createPixelCanvas(300, 150);
	//var pc = initPixelCanvas(document.getElementById('myCanvas'), 300, 150);
	dataContainer.appendChild(pc.canvas);
	// aliased.
	drawLine(pc, 0,0, 100,50, 255,0,0,255);

	// anti-aliased.
	pc.context.strokeStyle = '#f00';
	pc.context.beginPath();
	pc.context.moveTo(20, 0);
	pc.context.lineTo(120, 100);
	pc.context.stroke();

	console.log("testDrawing complete.");
}
//testDrawing();

function onLogResponse(canvas, d) {
}

// public functions here.
return {
	foobar: function() {
	},
};})();
