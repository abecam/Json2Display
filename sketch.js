const gravity = .25;
const colors = ['red', 'orange', 'yellow', 'lime', 'cyan', 'magenta', 'white'];
let width = 1900;
let height = 1080;

let endColor;
let toColor;
let houses;
const jsonPath = "cvAlain.json";
let jsonObject;

let rootElement;
let pointsForVoronoi;

let cvInitialized = false;
let jsonFound;
let diagram;
let ratio;

function setup() {
	font = loadFont('assets/SourceSansPro-Regular.otf');

	pixelDensity(1);
	voronoiCanvas = createCanvas(windowWidth - 10, windowHeight - 10);
	voronoiCanvas.parent("voronoiCanvas");
	endColor = color(64, 0);
	toColor = color(255, 255, 255);

	// Set text characteristics
	textFont(font);

	xCenter = ((windowWidth - 40) / 2) + 20;
	yCenter = ((windowWidth - 40) / 2) + 20;

	ratio = windowWidth/windowHeight;
	rootElement = new Element(20, 20, windowWidth - 20, windowHeight - 20, xCenter, yCenter, 0, 1, "Root", "Root", -1)
	fetchJson(jsonPath);
}

function windowResized() {
	resizeCanvas(windowWidth - 10, windowHeight - 10);
	ratio = windowWidth/windowHeight;
}

function renderInHtmlNoFiltering(rootElement) {
	divForHtml = select('#Rendered_view');

	currentDepth = 0;

	renderOnePartOfHtml(rootElement, currentDepth);
}

function renderOnePartOfHtml(currentElement, currentDepth, usedDiv) {
	//console.log("Depth " + currentDepth);
	for (let iElements = 0; iElements < currentElement.elements.length; iElements++) {
		child = currentElement.elements[iElements];

		//console.log("element " + child.content);
		if (child.nbOfElements() + child.nbOfChildren() == 0) {
			// A leaf :)
			divForHtml.html(child.content + "<br/>", true);
		}
		else {
			divForHtml.html("<div class=\"rendered-child-level" + currentDepth + "\"><p>", true);
			renderOnePartOfHtml(child, currentDepth + 1, usedDiv)
			divForHtml.html("</p></div>", true);
		}
	}
	for (let iElements = 0; iElements < currentElement.children.length; iElements++) {
		child = currentElement.children[iElements];

		//console.log("children " + child.content);
		if (child.nbOfElements() + child.nbOfChildren() == 0) {
			// A leaf :)
			divForHtml.html(child.content + "<br/>", true);
		}
		else {
			divForHtml.html("<div class=\"rendered-element-level" + currentDepth + "\"><p>", true);
			renderOnePartOfHtml(child, currentDepth + 1, usedDiv)
			divForHtml.html("</p></div>", true);
		}
	}
}
// Fetch the JSON file
function fetchJson(jsonPath) {
	fetch(jsonPath)
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP error: ${response.status}`);
			}
			return response.json();
		})
		.then(json => {
			// Create partitions object to store objects based on depth
			//const partitions = {};
			jsonFound = json;
			// Call the traverseJson function with depth 0
			traverseJson(json, 0, rootElement);
		})
	/*.catch(error => {
	  console.error(`Error fetching or parsing JSON file: ${error}`);
	});*/
}
// Function to recursively traverse the JSON object and store objects in partitions based on depth
function traverseJson(obj, depth, currentElement) {

	console.log("Depth is " + depth);
	// key value
	// Object -> go deeper
	// Other -> Store as content
	if (!Array.isArray(obj)) {
		nbInElement = 0;

		for (let key in obj) {
			if (obj.hasOwnProperty(key)) { // Needed ?
				// The boundaries can only be computed on the way back!
				oneNewElement = new Element(0, 0, 0, 0, 0, 0, depth + 1, nbInElement, key, "Child", currentElement)

				nbInElement++;

				if (typeof obj[key] === 'object') {
					currentElement.addChildren(oneNewElement);
					traverseJson(obj[key], depth + 1, oneNewElement);
				}
				else if (Array.isArray(obj[key])) {
					currentElement.addElement(oneNewElement);
					traverseJson(obj[key], depth + 1, oneNewElement);
				}
				else {
					// Local content, keep it
					oneNewElement.content = obj[key];
					currentElement.addElement(oneNewElement);
				}
			}
		}
	}
	// array
	else {
		nbInElement = 0;

		for (let iElement = 0; iElement < obj.length; iElement++) {

			item = obj[iElement];

			// The boundaries can only be computed on the way back!
			oneNewElement = new Element(0, 0, 0, 0, 0, 0, depth + 1, nbInElement, "", "Array Element", currentElement)

			nbInElement++;

			if (typeof item === 'object') {
				currentElement.addChildren(oneNewElement);
				traverseJson(item, depth + 1, oneNewElement);
			}
			else if (Array.isArray(item)) {
				currentElement.addElement(oneNewElement);
				traverseJson(item, depth + 1, oneNewElement);
			}
			else {
				// Local content, keep it
				oneNewElement.content = item;
				currentElement.addElement(oneNewElement);
			}
		}
	}
	// We are back, calculate the boundaries

	console.log("Nb elements: " + currentElement.nbOfElements() + " nb children: " + currentElement.nbOfChildren());
	if (currentElement.parent != -1) {
		console.log("I am " + currentElement.parent.nbInParent + " in my parent segment");
	}

	// Call doSomething() when the full JSON browsing is finished
	if (depth === 0) {
		console.log("Current element " + currentElement.content); // Should always be root and only root (TODO: add test)
		// Finished, calculate the boundaries
		// Element in columns aside children in columns too

		pointsForVoronoi = doTheInitialDistribution(currentElement);

		renderInHtmlNoFiltering(currentElement);

		//console.log("Sites 0: " + pointsForVoronoi);
		//makeHouses(pointsForVoronoi);

		cvInitialized = true;
	}
}

function doTheInitialDistribution(currentRootElement) {
	let allPoints = []; // Array to store all points

	allPoints = distributeObjectsOnPlane(currentRootElement, currentRootElement.xMax - currentRootElement.xMin, currentRootElement.yMax - currentRootElement.yMin, currentRootElement.xMin, currentRootElement.yMin, null);

	//console.log(`All points: ${JSON.stringify(allPoints)}`);

	return allPoints; // Return the full list of points
}

function distributeObjectsOnPlane(element, xSize, ySize, fromX, fromY) {
	let numObjects = 0;

	for (let iElements = 0; iElements < element.elements.length; iElements++) {
		oneElement = element.elements[iElements];
		
		if (oneElement.nbOfElements() + oneElement.nbOfChildren() > 0) {
			numObjects++;
		}
	}

	for (let iElements = 0; iElements < element.children.length; iElements++) {
		oneElement = element.children[iElements];
		
		if (oneElement.nbOfElements() + oneElement.nbOfChildren() > 0) {
			numObjects++;
		}
	}
	//console.log(" AAAA: numObjects " + numObjects + " , " + element.nbOfChildren() + " : " + element.nbOfElements());

	// Try to fit to our ratio

	const gridSizeY = Math.ceil(Math.sqrt(numObjects/ratio)); // Grid size is the square root of number of objects rounded up
	const gridSizeX = Math.ceil(numObjects/gridSizeY)

	console.log(numObjects+" distributed on "+gridSizeX +", "+gridSizeY);
	const cellWidth = xSize / gridSizeX;
	const cellHeight = ySize / gridSizeY;

	let result = [];
	
	if (!element.withColor && element.depth > 0)
	{
		element.withColor = color(50+random(205),50+random(205),40+random(205))
	}
	//console.log(`Num objects: ${numObjects}, partitions: ${partition}`);

	let i = 0;

	let textToShow = "";

	for (let iElements = 0; iElements < element.elements.length; iElements++) {
		oneElement = element.elements[iElements];
		
		/*if (!oneElement.withColor)
		{
			element.withColor = color(100+random(155),100+random(155),100+random(155))
		}
*/
		if (oneElement.nbOfElements() + oneElement.nbOfChildren() == 0) {
			textToShow += oneElement.content + "\n";
		}
		else
		{
			distributeElements(i, oneElement, true);
			result = result.concat(distributeObjectsOnPlane(oneElement, oneElement.xMax - oneElement.xMin, oneElement.yMax - oneElement.yMin, oneElement.xMin, oneElement.yMin));
			i++;
		}
	}

	for (let iElements = 0; iElements < element.children.length; iElements++) {
		oneElement = element.children[iElements];
		/*
		if (!oneElement.withColor)
		{
			element.withColor = color(100+random(155),100+random(155),100+random(155))
		}
		*/
		if (oneElement.nbOfElements() + oneElement.nbOfChildren() == 0) {
			textToShow += oneElement.content + "\n";
		}
		else
		{
			distributeElements(i, oneElement, true);
			result = result.concat(distributeObjectsOnPlane(oneElement, oneElement.xMax - oneElement.xMin, oneElement.yMax - oneElement.yMin, oneElement.xMin, oneElement.yMin));
			i++;
		}
	}
	//console.log(`Full text: ${textToShow}`);

	// Show the content text in the corner (?) of the current element
	/*
	push();
	strokeWeight(1);
	stroke(0);
	text(textToShow, element.xMin + 20, element.yMin + 40);
	pop();
	*/
	return result;

	function distributeElements(i, oneElement, createANode) {
		const row = Math.floor(i / gridSizeY);
		const col = i % gridSizeX;
		const xPos = fromX + col * cellWidth;
		const yPos = fromY + row * cellHeight;

		console.log(i+" on "+row +", "+col);
		// Use xPos and yPos as the coordinates to place the object on the plane
		//console.log(`Object: ${obj.key}: ${obj.value}`);
		//console.log(" From " + fromX + " , " + fromY + " : " + col + " , " + row + " : " + i);
		//console.log(`Position: x=${xPos}, y=${yPos}`);
		// Alternatively, you can use xPos and yPos to dynamically create elements on the plane using DOM manipulation or other rendering techniques.
		oneElement.xMin = xPos;
		oneElement.yMin = yPos;

		oneElement.xMax = xPos + cellWidth;
		oneElement.yMax = yPos + cellHeight;

		oneElement.xCenter = xPos + cellWidth / 2;
		oneElement.yCenter = yPos + cellHeight / 2;
		if (oneElement.parent.withColor)
		{
			oneElement.withColor = lerpColor(oneElement.parent.withColor, toColor, 0.2);
		}
		rect(oneElement.xMin, oneElement.yMin, oneElement.xMax, oneElement.yMax);

		if (createANode) {
			
			push();
			strokeWeight(1);
			stroke(153);
			text(oneElement.key, oneElement.xMin + 20, oneElement.yMin + 20);
			pop();
			
			// Store the coordinates as an object in the result array
			result.push({ x: oneElement.xCenter, y: oneElement.yCenter });
		}
	}
}

function drawAllElements(currentElement, currentDepth) {
	drawElements(rootElement, 0, null);
}

function drawElements(currentElement, currentDepth) {
	
	if (currentElement.withColor)
	{
		stroke(currentElement.withColor);
		fill(currentElement.withColor, 100);
	}

	rect(currentElement.xMin, currentElement.yMin, currentElement.xMax, currentElement.yMax);

	//console.log("Depth " + currentDepth);
	for (let iElements = 0; iElements < currentElement.elements.length; iElements++) {
		child = currentElement.elements[iElements];

		if (child.nbOfElements() + child.nbOfChildren() == 0) {
			// A leaf :)
			push();
			stroke(0);
			noFill();
			text(child.content, child.xMin + 20, child.yMin + 40);
			pop();
		}
		else {
			drawElements(child, currentDepth + 1)
		}
	}
	for (let iElements = 0; iElements < currentElement.children.length; iElements++) {
		child = currentElement.children[iElements];

		if (child.nbOfElements() + child.nbOfChildren() == 0) {
			// A leaf :)
			push();
			stroke(0);
			noFill();
			text(child.content, child.xMin + 20, child.yMin + 40);
			pop();
		}
		else {
			push();
			stroke(0);
			noFill();
			text(child.key, child.xMin + 20, child.yMin + 40);
			pop();
			drawElements(child, currentDepth + 1)
		}
	}
}

function makeHouses(sites) {
	var voronoi = new Voronoi();
	var bbox = { xl: 20, xr: windowWidth - 20, yt: 20, yb: windowHeight - 20 }; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
	//var sites = [ {x: 200, y: 200}, {x: 50, y: 250}, {x: 400, y: 100}, {x: 200, y: 100}, {x: 300, y: 50} /* , ... */ ];

	//console.log("Sites: " + sites);
	// a 'vertex' is an object exhibiting 'x' and 'y' properties. The
	// Voronoi object will add a unique 'voronoiId' property to all
	// sites. The 'voronoiId' can be used as a key to lookup the associated cell
	// in diagram.cells.

	diagram = voronoi.compute(sites, bbox);

	edges = diagram.edges;
	nEdges = edges.length;

	if (nEdges) {
		let edge;

		stroke("red");
		//ctx.beginPath();
		while (nEdges--) {

			edge = edges[nEdges];

			print(edge.va + " , " + edge.vb);

			line(edge.va.x, edge.va.y, edge.vb.x, edge.vb.y);
		}
		//ctx.stroke();
	}
	// how many sites do we have?
	sites = sites;
	nSites = sites.length;
	if (!nSites) { return; }
	// highlight cell under mouse
	cell = diagram.cells[sites[0].voronoiId];
	// there is no guarantee a Voronoi cell will exist for any
	// particular site
	/*if (cell) {
		var halfedges = cell.halfedges,
			nHalfedges = halfedges.length;
		if (nHalfedges > 2) {
			v = halfedges[0].getStartpoint();
			ctx.beginPath();
			ctx.moveTo(v.x,v.y);
			for (var iHalfedge=0; iHalfedge<nHalfedges; iHalfedge++) {
				v = halfedges[iHalfedge].getEndpoint();
				ctx.lineTo(v.x,v.y);
				}
			ctx.fillStyle = '#faa';
			ctx.fill();
			}
		}
  */
	// draw sites
	let site;
	//ctx.beginPath();
	//ctx.fillStyle = '#44f';
	while (nSites--) {
		site = sites[nSites];
		rect(site.x - 2 / 3, site.y - 2 / 3, 2, 2);
	}
	//ctx.fill();
}

function mousePressed() {
	// Check which element is selected and zoom in (out with left click?)
}

function draw() {
	//background(64);
	if (cvInitialized) {
		//makeHouses(pointsForVoronoi);
		drawAllElements();
	}
}

class Element {
	constructor(xMin, yMin, xMax, yMax, xCenter, yCenter, depth, nbInParent, key, content, parent) {
		this.xMin = xMin;
		this.yMin = yMin;
		this.xMax = xMax;
		this.yMax = yMax;
		this.xCenter = xCenter;
		this.yCenter = yCenter;
		this.depth = depth;
		this.nbInParent = nbInParent;
		this.key = key;
		this.content = content;
		this.parent = parent;

		this.elements = []; // Only for a JSON object or an array
		this.children = []; // Only for a JSON object 
	}

	addElement(oneElement) {
		this.elements.push(oneElement);
	}

	addChildren(oneChildren) {
		this.children.push(oneChildren);
	}

	nbOfElements() {
		return this.elements.length;
	}

	nbOfChildren() {
		return this.children.length;
	}

	draw() {
		// Draw the current text

	}
}
