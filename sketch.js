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
let nbOfObjectBrowsed = 0;

let pointsForVoronoi;

let cvInitialized = false;
let jsonFound;
let diagram;
let ratio;

const typeOfViews =
{
	voronoi_edges: 'voronoi_edges',
	voronoi_filled: 'voronoi_filled',
	tree_view: 'tree_view'
};

let currentView = typeOfViews.voronoi_edges;

function setup() {
	font = loadFont('assets/SourceSansPro-Regular.otf');

	pixelDensity(1);
	voronoiCanvas = createCanvas(windowWidth - 10, windowHeight - 10);
	voronoiCanvas.parent("voronoiCanvas");
	endColor = color(64, 0);
	toColor = color(255, 255, 255);

	button = createButton('Voronoi edges with treemap');
	button.parent("voronoiCanvas");
	button2 = createButton('Voronoi filled');
	button2.parent("voronoiCanvas");
	button3 = createButton('Treemap (giving the cell center of the Voronoi partition)');
	button3.parent("voronoiCanvas");
	button.position(40, 95);
	button.mousePressed(showVoronoiEdges);

	button2.position(button.x + button.width, 95);
	button2.mousePressed(showVoronoiFilled);

	button3.position(button2.x + button2.width, 95);
	button3.mousePressed(showTreeView);

	// Set text characteristics
	textFont(font);

	xCenter = ((windowWidth - 40) / 2) + 20;
	yCenter = ((windowWidth - 40) / 2) + 20;

	ratio = windowWidth/windowHeight;
	rootElement = new Element(20, 20, windowWidth - 20, windowHeight - 20, xCenter, yCenter, 0, 1, nbOfObjectBrowsed, "Root", "Root", -1)
	fetchJson(jsonPath);
}

function showVoronoiEdges()
{
	currentView = typeOfViews.voronoi_edges;
	drawDiagram();
}

function showVoronoiFilled()
{
	currentView = typeOfViews.voronoi_filled;
	drawDiagram();
}

function showTreeView()
{
	currentView = typeOfViews.tree_view;
	drawDiagram();
}

function windowResized() {
	resizeCanvas(windowWidth - 10, windowHeight - 10);
	ratio = windowWidth/windowHeight;

	drawDiagram();
}

function renderInHtmlNoFiltering(rootElement) {
	divForHtml = select('#Rendered_view');

	currentDepth = 0;

	renderOnePartOfHtml(rootElement, currentDepth, divForHtml);
}

function renderOnePartOfHtml(currentElement, currentDepth, usedDiv) {
	const current_element_txt = `${replaceFirstDigitByName(currentElement.key)}${currentDepth}${currentElement.nbInParsing}`;
	const id_current_element = current_element_txt.replace(/\s+/g, '');

	for (let iElements = 0; iElements < currentElement.elements.length; iElements++) {
		child = currentElement.elements[iElements];

		const child_element_txt = `${replaceFirstDigitByName(child.key)}${currentDepth}${child.nbInParsing}`;
		const id_child_element = child_element_txt.replace(/\s+/g, '');

		//console.log("element " + child.content);
		if (child.nbOfElements() + child.nbOfChildren() == 0) {
			// A leaf :)
			usedDiv.html(`${child.content}<br/>`, true);
		}
		else {
			// Title, then content
			if (child.key != "no_key")	{
				usedDiv.html(`<div class=\"rendered_subtabs_${currentDepth}\" id=\"${id_child_element}_rendered_subtabheader\"><p>${child.key}</p></div>`, true)
			}
			usedDiv.html(`<div class=\"rendered_subtabcontent_${currentDepth}\" id=\"${id_child_element}_rendered_subtabcontent\">\n</div>`, true);
			const divForContent = select(`#${id_child_element}_rendered_subtabcontent`, usedDiv);
			divForContent.parent(usedDiv);
			renderOnePartOfHtml(child, currentDepth + 1, divForContent);
		}
	}
	usedDiv.html(`<ul class=\"rendered_depth${currentDepth}\" id=\"ul_rendered_depth${id_current_element}\">`, true);
	const ulBlock = select(`#ul_rendered_depth${id_current_element}`);

	for (let iElements = 0; iElements < currentElement.children.length; iElements++) {
		child = currentElement.children[iElements];

		const child_element_txt = `${replaceFirstDigitByName(child.key)}${currentDepth}${child.nbInParsing}`;
		const id_child_element = child_element_txt.replace(/\s+/g, '');

		let isButton = false; // If it is a button and it is the first one, we click on it by default.
		//console.log("children " + child.content);
		if (child.nbOfElements() + child.nbOfChildren() == 0) {
			// A leaf :)
			ulBlock.html(`<li>${child.content}</li>`, true);
		}
		else {
			if (child.key != "no_key") {
				usedDiv.html(`<div class=\"rendered_subtabs_${currentDepth}\" id=\"${id_child_element}_rendered_subtabheader\"><p>${child.key}</p></div>`, true)
			}
			usedDiv.html(`<div class=\"rendered_subtabcontent_${currentDepth}\" id=\"${id_child_element}_rendered_subtabcontent\">\n</div>`, true);
			const divForContent = select(`#${id_child_element}_rendered_subtabcontent`, usedDiv);
			divForContent.parent(usedDiv);
			renderOnePartOfHtml(child, currentDepth + 1, divForContent);
		}
	}
}

function renderInHtmlWithFiltering(rootElement) {
	divForHtml = select('#Filtered_content');

	currentDepth = 0;

	renderOnePartOfHtmlWithFilter(rootElement, currentDepth, divForHtml);
}

function renderOnePartOfHtmlWithFilter(currentElement, currentDepth, usedDiv) {
	//console.log("Depth " + currentDepth);
	// Create div element for the buttons
	const current_element_txt = `${replaceFirstDigitByName(currentElement.key)}${currentDepth}${currentElement.nbInParsing}`;
	const id_current_element = current_element_txt.replace(/\s+/g, '');

	let divForButton; // The div will be created when there is the first button and so only if there is at least one. 

	// Buttons
	let isFirstButton = true;
	let firstButtonId = "None";

	for (let iElements = 0; iElements < currentElement.elements.length; iElements++) {
		child = currentElement.elements[iElements];

		const child_element_txt = `${replaceFirstDigitByName(child.key)}${currentDepth}${child.nbInParsing}`;
		const id_child_element = child_element_txt.replace(/\s+/g, '');

		let isButton = false; // If it is a button and it is the first one, we click on it by default.
		//console.log("element " + child.content);
		if (child.nbOfElements() + child.nbOfChildren() == 0) {
			// A leaf :)
			usedDiv.html(`<div class=\"filtered_subtabcontent_${currentDepth}\">${child.content}<div/>`, true);
		}
		else {
			// Button, then content
			if (child.key != "no_key")	{
				if (isFirstButton)
				{
					usedDiv.html(`<div class=\"tab filtered_subtab_${currentDepth}\" id=\"${id_current_element}_subbutton\">\n</div>`, true);
					// Then find it to be able to use them
					divForButton = select(`#${id_current_element}_subbutton`, usedDiv);
					divForButton.parent = usedDiv;
				}
				divForButton.html(`<button class=\"${id_current_element}_subtablinks\" id=\"${id_child_element}_subtablinks\" onclick=\"openSubTabs(event, '${id_child_element}_subtabcontent', '${id_current_element}')\">${child.key}</button>`, true)
				isButton = true;
			}
			usedDiv.html(`<div class=\"${id_current_element}_subtabcontent\" id=\"${id_child_element}_subtabcontent\">\n</div>`, true);
			const divForContent = select(`#${id_child_element}_subtabcontent`, usedDiv);
			divForContent.parent(usedDiv);
			renderOnePartOfHtmlWithFilter(child, currentDepth + 1, divForContent);
			if (isFirstButton && isButton)
			{
				firstButtonId = `${id_child_element}_subtablinks`;
				isFirstButton = false;
			}
		}
	}
	usedDiv.html(`<ul class=\"filtered_depth${currentDepth}\" id=\"ul_filtered_depth${id_current_element}\">`, true);
	const ulBlock = select(`#ul_filtered_depth${id_current_element}`);
	for (let iElements = 0; iElements < currentElement.children.length; iElements++) {
		child = currentElement.children[iElements];

		const child_element_txt = `${replaceFirstDigitByName(child.key)}${currentDepth}${child.nbInParsing}`;
		const id_child_element = child_element_txt.replace(/\s+/g, '');

		let isButton = false; // If it is a button and it is the first one, we click on it by default.
		//console.log("children " + child.content);
		if (child.nbOfElements() + child.nbOfChildren() == 0) {
			// A leaf :)
			ulBlock.html(`<div class=\"filtered_subtabcontent_${currentDepth}\"><li>${child.content}</li><div/>`, true);
		}
		else {
			if (child.key != "no_key") {
				if (isFirstButton)
				{
					usedDiv.html(`<div class=\"tab filtered_subtab_${currentDepth}\" id=\"${id_current_element}_subbutton\">\n</div>`, true);
					// Then find it to be able to use them
					divForButton = select(`#${id_current_element}_subbutton`, usedDiv);
					divForButton.parent = usedDiv;
				}
				divForButton.html(`<button class=\"${id_current_element}_subtablinks\" id=\"${id_child_element}_subtablinks\" onclick=\"openSubTabs(event, '${id_child_element}_subtabcontent', '${id_current_element}')\">${child.key}</button>`, true)
				isButton = true;
			}
			usedDiv.html(`<div class=\"${id_current_element}_subtabcontent\" id=\"${id_child_element}_subtabcontent\">\n</div>`, true);
			const divForContent = select(`#${id_child_element}_subtabcontent`, usedDiv);
			divForContent.parent(usedDiv);
			renderOnePartOfHtmlWithFilter(child, currentDepth + 1, divForContent);
			if (isFirstButton && isButton)
			{
				firstButtonId = `${id_child_element}_subtablinks`;
				isFirstButton = false;
			}
			//usedDiv.html("</p>\n</div>", true);
		}
	}

	if (firstButtonId != "None")
	{
		document.getElementById(firstButtonId).click();
	}
	//usedDiv.html("</div>");
	// Content
}
const digitToName = {
	'0':'zero',
	'1':'one',
	'2':'two',
	'3':'three',
	'4':'four',
	'5':'five',
	'6':'six',
	'7':'seven',
	'8':'eight',
	'9':'nine',
	}
	
	

function replaceFirstDigitByName(aString)
{
	if (aString && aString.charAt(0) >= '0' && aString.charAt(0) <= '9')
	{
		let newFirstChar = digitToName[aString.charAt(0)];
		return newFirstChar + aString.substring(1);
	}
	return (aString);
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

			// Show the original JSon in the explanation div
			syntaxHighlight(jsonFound);
			// Call the traverseJson function with depth 0
			traverseJson(json, 0, rootElement);
		})
}
// Function to recursively traverse the JSON object and store objects in partitions based on depth
function traverseJson(obj, depth, currentElement) {

	//console.log("Depth is " + depth);
	// key value
	// Object -> go deeper
	// Other -> Store as content
	if (!Array.isArray(obj)) {
		nbInElement = 0;

		for (let key in obj) {
			if (obj.hasOwnProperty(key)) { // Needed ?
				// The boundaries can only be computed on the way back!
				oneNewElement = new Element(0, 0, 0, 0, 0, 0, depth + 1, nbInElement, nbOfObjectBrowsed++, key, "Child", currentElement)

				nbInElement++;

				if (Array.isArray(obj[key])) {
					currentElement.addChildren(oneNewElement);
					oneNewElement.type = TypeOfElement.Array;
					traverseJson(obj[key], depth + 1, oneNewElement);
				}
				else if (typeof obj[key] === 'object') {
					currentElement.addChildren(oneNewElement);
					oneNewElement.type = TypeOfElement.Object;
					traverseJson(obj[key], depth + 1, oneNewElement);
				}
				else {
					// Local content, keep it
					oneNewElement.content = obj[key];
					oneNewElement.type = TypeOfElement.Leaf;
					currentElement.addChildren(oneNewElement);
				}
			}
		}
	}
	// otherwise array or object with empty key!
	else {
		nbInElement = 0;

		for (let iElement = 0; iElement < obj.length; iElement++) {

			item = obj[iElement];

			// The boundaries can only be computed on the way back!
			oneNewElement = new Element(0, 0, 0, 0, 0, 0, depth + 1, nbInElement, nbOfObjectBrowsed++, currentElement.key+"_array"+iElement, "Array Element", currentElement)

			nbInElement++;

			if (Array.isArray(item)) {
				currentElement.addElement(oneNewElement);
				oneNewElement.key = currentElement.key+"_array"+iElement;
				oneNewElement.type = TypeOfElement.Array;
				traverseJson(item, depth + 1, oneNewElement);
			}
			else if (typeof item === 'object') {
				currentElement.addElement(oneNewElement);
				if (item.key)
				{
					oneNewElement.key = item.key;
				}
				else
				{
					oneNewElement.key = "no_key"; // So do not use in leaf!
				}
				oneNewElement.type = TypeOfElement.Object;
				traverseJson(item, depth + 1, oneNewElement);
			}
			else {
				// Local content, keep it
				oneNewElement.content = item;
				oneNewElement.type = TypeOfElement.Leaf;
				currentElement.addElement(oneNewElement);
			}
		}
	}
	
	// We are back, calculate the boundaries

	//console.log("Nb elements: " + currentElement.nbOfElements() + " nb children: " + currentElement.nbOfChildren());
	/*
	if (currentElement.parent != -1) {
		console.log("I am " + currentElement.parent.nbInParent + " in my parent segment");
	}
	*/

	// Call doSomething() when the full JSON browsing is finished
	if (depth === 0) {
		//console.log("Current element " + currentElement.content); // Should always be root and only root (TODO: add test)
		// Finished, calculate the boundaries
		// Element in columns aside children in columns too

		pointsForVoronoi = doTheInitialDistribution(currentElement);

		renderInHtmlNoFiltering(currentElement);

		renderInHtmlWithFiltering(currentElement);
		//console.log("Sites 0: " + pointsForVoronoi);

		cvInitialized = true;

		drawDiagram();
	}
}

function doTheInitialDistribution(currentRootElement) {
	let allPoints = []; // Array to store all points

	allPoints = distributeObjectsOnPlane(currentRootElement, currentRootElement.xMax - currentRootElement.xMin, currentRootElement.yMax - currentRootElement.yMin, currentRootElement.xMin, currentRootElement.yMin, null);

	//console.log(`All points: ${JSON.stringify(allPoints)}`);

	return allPoints; // Return the full list of points
}

function distributeObjectsOnPlane(element, xSize, ySize, fromX, fromY) {
	let numObjects = element.elements.length + element.children.length;
		
	//console.log(" AAAA: numObjects " + numObjects + " , " + element.nbOfChildren() + " : " + element.nbOfElements());

	// Try to fit to our ratio

	const gridSizeY = Math.ceil(Math.sqrt(numObjects/ratio)); // Grid size is the square root of number of objects rounded up
	const gridSizeX = Math.ceil(numObjects/gridSizeY)

	//console.log(numObjects+" distributed on "+gridSizeX +", "+gridSizeY);

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
		if (oneElement.type == TypeOfElement.Leaf) {
			textToShow += oneElement.content + "\n";
		}
		//else
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
		if (oneElement.type == TypeOfElement.Leaf) {
			textToShow += oneElement.content + "\n";
		}
		//else
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
		const row = Math.floor(i / gridSizeX);
		const col = i % gridSizeX;
		const xPos = fromX + col * cellWidth;
		const yPos = fromY + row * cellHeight;

		//console.log(i+" on "+row +", "+col);

		//console.log(`Object: ${obj.key}: ${obj.value}`);
		//console.log(" From " + fromX + " , " + fromY + " : " + col + " , " + row + " : " + i);
		//console.log(`Position: x=${xPos}, y=${yPos}`);

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

function drawVoronoiFilled(sites) {
	var voronoi = new Voronoi();
	var bbox = { xl: 20, xr: windowWidth - 20, yt: 20, yb: windowHeight - 20 };

	diagram = voronoi.compute(sites, bbox);

	var cells = diagram.cells, iCell = cells.length, cell, halfedges, nHalfedges, iHalfedge, v, showGrout = true, showSites = true, mustFill = true;
	while (iCell--) {
		cell = cells[iCell];
		halfedges = cell.halfedges;
		nHalfedges = halfedges.length;
		if (nHalfedges) {
			if (showGrout || mustFill) {
				v = halfedges[0].getStartpoint();
				beginShape();
				//ctx.moveTo(v.x,v.y);
				push();
				stroke(color(0, 0, 0));
				fill(color(50 + random(205), 50 + random(205), 40 + random(205)));
				const startx = v.x;
				const starty = v.y;
				translate(v.x, v.y);
				for (iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
					v = halfedges[iHalfedge].getEndpoint();
					//ctx.lineTo(v.x,v.y);
					vertex(v.x - startx, v.y - starty);
				}
				endShape(CLOSE);
				if (mustFill) {
					//ctx.fillStyle = cell.site.color.rgbToHex();
					//ctx.fill();
				}
				if (showGrout) {
					//ctx.stroke();
				}
			}
			pop();
			if (showSites) {
				//ctx.fillStyle = 'black';
				//ctx.fillRect(cell.site.x-0.5,cell.site.y-0.5,1.5,1.5);
				push();
				stroke(0, 0, 0);
				noFill();
				rect(1 + cell.site.x - 0.5, cell.site.y - 0.5, 1.5, 1.5);
				pop();
			}
		}
	}
}
function drawVoronoi(sites) {
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

		push();
		stroke("red");
		noFill();

		//ctx.beginPath();
		while (nEdges--) {

			edge = edges[nEdges];

			line(edge.va.x, edge.va.y, edge.vb.x, edge.vb.y);
		}

		pop();
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
		push();
		stroke(0, 0, 0);
		noFill();
		rect(site.x - 2 / 3, site.y - 2 / 3, 2, 2);
		pop();
	}
	//ctx.fill();
}

function mousePressed() {
	// Check which element is selected and zoom in (out with left click?)
}

function drawDiagram()
{
	if (cvInitialized) {
		if (currentView == typeOfViews.tree_view) {
			drawAllElements();
		}
		else if (currentView == typeOfViews.voronoi_filled) {
			drawVoronoiFilled(pointsForVoronoi);
		}
		else if (currentView == typeOfViews.voronoi_edges) {
		drawAllElements();
			drawVoronoi(pointsForVoronoi);
	}
	}
}

function draw() {
	//background(64);
	
}

const TypeOfElement = {
	Root: 'Root',
	Object: 'Object',
	Array: 'Array',
	Leaf: 'Leaf'
  };

class Element {
	constructor(xMin, yMin, xMax, yMax, xCenter, yCenter, depth, nbInParent, nbInParsing, key, content, parent) {
		this.xMin = xMin;
		this.yMin = yMin;
		this.xMax = xMax;
		this.yMax = yMax;
		this.xCenter = xCenter;
		this.yCenter = yCenter;
		this.depth = depth;
		this.nbInParent = nbInParent;
		this.nbInParsing = nbInParsing;
		this.key = key;
		this.content = content;
		this.parent = parent;
		this.type = TypeOfElement.Root;

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
