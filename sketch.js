const gravity = .25;
const colors = ['red', 'orange', 'yellow', 'lime', 'cyan', 'magenta', 'white'];
const width = 1900;
const height = 1080;

let endColor;
let houses;
const jsonPath = "cvAlain.json";
let jsonObject;

let rootElement;
let pointsForVoronoi;

let cvInitialized = false;
let jsonFound;

function setup() {
	font = loadFont('assets/SourceSansPro-Regular.otf');

	pixelDensity(1);
	voronoiCanvas = createCanvas(windowWidth-10, windowHeight-10);
	voronoiCanvas.parent("voronoiCanvas");
	endColor = color(64, 0);

	// Set text characteristics
    textFont(font);

	xCenter = ((windowWidth - 40) / 2) + 20;
	yCenter = ((windowWidth - 40) / 2) + 20;
	
	rootElement = new Element(20, 20, windowWidth-20, windowHeight-20, xCenter, yCenter, 0, 1, "No-Content-Yet", -1)
	fetchJson(jsonPath);
}

function windowResized() {
	resizeCanvas(windowWidth-10, windowHeight-10);
}

function renderInHtmlNoFiltering() {
	divForHtml = select('#Rendered_view');

	divForHtml.html("Hello world from p5js");
}

// Fetch the JSON file
function fetchJson(jsonPath){
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
  .catch(error => {
	console.error(`Error fetching or parsing JSON file: ${error}`);
  });
}
// Function to recursively traverse the JSON object and store objects in partitions based on depth
function traverseJson(obj, depth, currentElement) {

	console.log("Depth is "+depth);
	// key value
	// Object -> go deeper
	// Other -> Store as content
	if (!Array.isArray(obj))
	{
		nbInElement = 0;

		for (let key in obj) {
	  		if (obj.hasOwnProperty(key)) { // Needed ?
				// The boundaries can only be computed on the way back!
				oneNewElement = new Element(0, 0, 0, 0, 0, 0, depth, nbInElement, "", currentElement)

				nbInElement++;

				if (typeof obj[key] === 'object')
				{
					currentElement.addChildren(oneNewElement);
					traverseJson(obj[key], depth + 1, oneNewElement);
				}
				else
				{
					// Local content, keep it
					oneNewElement.content = obj[key];
					currentElement.addElement(oneNewElement);
				}
		}
	  }
	}
	// array
	else
	{
		for (let item in obj) {
			
			// The boundaries can only be computed on the way back!
			oneNewElement = new Element(0, 0, 0, 0, 0, 0, depth, nbInElement, "", currentElement)

			nbInElement++;

			if (typeof item === 'object' || Array.isArray(item))
			{
				traverseJson(item, depth + 1, oneNewElement);
			}
			else
			{
				// Local content, keep it
				oneNewElement.content = item;
			}
	  }
	}
	// We are back, calculate the boundaries
	
	console.log("Nb elements: " + currentElement.nbOfElements +" nb children: " + currentElement.nbOfChildren);
	if (currentElement.parent != -1)
	{
		console.log("I am " + currentElement.parent.nbInParent + " in my parent segment");
	}
	
	// Call doSomething() when the full JSON browsing is finished
	if (depth === 0) {
		// Finished, calculate the boundaries
		// Element in columns aside children in columns too

		pointsForVoronoi = doTheInitialDistribution(currentElement, windowWidth-40, windowHeight-40);

		renderInHtmlNoFiltering();

		//console.log("Sites 0: " + pointsForVoronoi);
		makeHouses(pointsForVoronoi);

		cvInitialized = true;
	}
}

function doTheInitialDistribution(rootElement, width, height) {
  let allPoints = []; // Array to store all points
  console.log("0")
  // Function to distribute objects on plane for a given depth level
  const distributeObjectsForLevel = (level, element) => {
    if (element.length === 0) return;

    // Call the distributeObjectsOnPlane method with current xInit and yInit
    const distributedObjects = distributeObjectsOnPlane(element, xMin, yMin, width, height);
    // Log the depth level and the distributed objects
    //console.log(`Depth: ${level}, Objects: ${JSON.stringify(distributedObjects)}`);

    // Update xInit and yInit for next level
    xInit = distributedObjects[distributedObjects.length - 1].x + 50; // Set xInit to the last x-coordinate + 50
    yInit = distributedObjects[distributedObjects.length - 1].y + 50; // Set yInit to the last y-coordinate + 50

    // Add the distributed objects to the allPoints array
    allPoints = allPoints.concat(distributedObjects);
  };

  // Iterate through the partition object and call distributeObjectsForLevel for each depth level
  /*for (let level in partitions) {
    if (partitions.hasOwnProperty(level)) {
      distributeObjectsForLevel(level, partitions);
    }
  }
  */
  //console.log(`All points: ${JSON.stringify(allPoints)}`);

  return allPoints; // Return the full list of points
}

function distributeObjectsOnPlane(element, xSize, ySize, width, height) {
	const numObjects = partition.length;
	const gridSize = Math.ceil(Math.sqrt(numObjects)); // Grid size is the square root of number of objects rounded up
	const cellWidth = xSize / gridSize;
	const cellHeight = ySize / gridSize;
	const result = [];

	//console.log(`Num objects: ${numObjects}, partitions: ${partition}`);

	for (let i = 0; i < numObjects; i++) {
	  const obj = partition[i];
	  const row = Math.floor(i / gridSize);
	  const col = i % gridSize;
	  const xPos = col * cellWidth;
	  const yPos = row * cellHeight;
	  
	  // Use xPos and yPos as the coordinates to place the object on the plane
	  //console.log(`Object: ${obj.key}: ${obj.value}`);
	  //console.log(`Position: x=${xPos}, y=${yPos}`);
	  // Alternatively, you can use xPos and yPos to dynamically create elements on the plane using DOM manipulation or other rendering techniques.

	  obj.x = xPos;
	  obj.y = yPos;

	  strokeWeight(1);
	  stroke(153);
		push();
	  text(obj.key, xPos, yPos);
	  pop();
	  // Store the coordinates as an object in the result array
	  result.push({ x: xPos, y: yPos });
	}

	return result;
}

function makeHouses(sites) {
  var voronoi = new Voronoi();
  var bbox = {xl: 20, xr: windowWidth - 20 , yt: 20, yb: windowHeight - 20}; // xl is x-left, xr is x-right, yt is y-top, and yb is y-bottom
  //var sites = [ {x: 200, y: 200}, {x: 50, y: 250}, {x: 400, y: 100}, {x: 200, y: 100}, {x: 300, y: 50} /* , ... */ ];

  //console.log("Sites: " + sites);
// a 'vertex' is an object exhibiting 'x' and 'y' properties. The
// Voronoi object will add a unique 'voronoiId' property to all
// sites. The 'voronoiId' can be used as a key to lookup the associated cell
// in diagram.cells.

  var diagram = voronoi.compute(sites, bbox);

  edges = diagram.edges;
  nEdges = edges.length;

  if (nEdges) {
	let edge;
    
    stroke("red");
		//ctx.beginPath();
	while (nEdges--) {
          
		edge = edges[nEdges];

        print(edge.va +" , "+edge.vb);
          
        line(edge.va.x, edge.va.y, edge.vb.x, edge.vb.y);
	}
			//ctx.stroke();
  }
		// how many sites do we have?
		sites = sites;
		nSites = sites.length;
		if (!nSites) {return;}
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
			rect(site.x-2/3,site.y-2/3,2,2);
		}
		//ctx.fill();
}

function mousePressed() {
	// Check which element is selected and zoom in (out with left click?)
}

function draw() {
	//background(64);
  if (cvInitialized)
  {
	makeHouses(pointsForVoronoi);
  }
}

class Element {
	constructor(xMin, yMin, xMax, yMax, xCenter, yCenter, depth, nbInParent, content, parent) {
		this.xMin = xMin;
		this.yMin = yMin;
		this.xMax = xMax;
		this.yMax = yMax;
		this.xCenter = xCenter;
		this.yCenter = yCenter;
		this.depth = depth;
		this.nbInParent = nbInParent;
		this.content = content;
		this.parent = parent;

		this.elements = []; // Only for a JSON object or an array
		this.children = []; // Only for a JSON object 
	}

	addElement(oneElement)
	{
		this.elements.push(oneElement);
	}

	addChildren(oneChildren)
	{
		this.children.push(oneChildren);
	}

	nbOfElements()
	{
		return this.elements.length;
	}

	nbOfChildren()
	{
		return this.children.length;
	}

	draw() {
		// Draw the current text

	}
}
