// ==========================================
// Service Worker Registration (PWA)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered successfully:', registration);
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });
}

// ==========================================
// Global Variables
// ==========================================
const POLE_RADIUS = 10;
const POLE_COLOR = '#000000';
const TRANSFORMER_WIDTH = 40;
const TRANSFORMER_HEIGHT = 30;
const TRANSFORMER_COLOR = '#0066ff';
const HIGHLIGHT_STROKE = '#ff0000';
const HIGHLIGHT_STROKE_WIDTH = 2;
const CONNECTION_LINE_WIDTH = 3;
const CONNECTION_LINE_COLOR = '#000000';

let objects = [];
let objectIdCounter = 0;
let poleCounter = null; // Global pole counter
let currentTool = null;
let connections = [];
let connectionIdCounter = 0;
let selectedObject = null;

// History/Undo-Redo
let history = [];
let historyStep = -1;

// ==========================================
// Initialize Konva Stage
// ==========================================
// Set drag distance to prevent accidental drags on mobile
Konva.dragDistance = 10; // Require 10px movement before drag starts

const container = document.getElementById('container');
const toolbarHeight = 75; // Approximate height for bottom toolbar
const stageWidth = window.innerWidth;
const stageHeight = window.innerHeight - toolbarHeight;

const stage = new Konva.Stage({
    container: 'container',
    width: stageWidth,
    height: stageHeight,
    bgcolor: '#e8e8e8',
    draggable: true, // Enable infinite canvas dragging
    listening: true // Ensure stage listens to events
});

// ==========================================
// Zoom & Pan Logic
// ==========================================
const scaleBy = 1.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;
const INITIAL_SCALE = 1;

function getDistance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function getCenter(p1, p2) {
    return {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
    };
}

let lastCenter = null;
let lastDist = 0;

// Multi-touch zoom (pinch) handling
stage.on('touchmove', function (e) {
    e.evt.preventDefault();
    var touch1 = e.evt.touches[0];
    var touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
        // if the stage was under Konva's drag&drop
        // we need to stop it, and implement our own pan logic with 2 pointers
        if (stage.isDragging()) {
            stage.stopDrag();
        }

        var p1 = {
            x: touch1.clientX,
            y: touch1.clientY,
        };
        var p2 = {
            x: touch2.clientX,
            y: touch2.clientY,
        };

        if (!lastCenter) {
            lastCenter = getCenter(p1, p2);
            return;
        }
        var newCenter = getCenter(p1, p2);

        var dist = getDistance(p1, p2);

        if (!lastDist) {
            lastDist = dist;
        }

        // local coordinates of center point
        var pointTo = {
            x: (newCenter.x - stage.x()) / stage.scaleX(),
            y: (newCenter.y - stage.y()) / stage.scaleX(),
        };

        var newScale = stage.scaleX() * (dist / lastDist);

        // Clamp scale
        newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

        stage.scale({ x: newScale, y: newScale });

        // calculate new position of the stage
        var dx = newCenter.x - lastCenter.x;
        var dy = newCenter.y - lastCenter.y;

        var newPos = {
            x: newCenter.x - pointTo.x * newScale + dx,
            y: newCenter.y - pointTo.y * newScale + dy,
        };

        stage.position(newPos);

        lastDist = dist;
        lastCenter = newCenter;
    }
});

stage.on('touchend', function () {
    lastDist = 0;
    lastCenter = null;
});

// Wheel Zoom
stage.on('wheel', (e) => {
    e.evt.preventDefault();

    var oldScale = stage.scaleX();
    var pointer = stage.getPointerPosition();

    var mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
    };

    var newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    // Clamp scale
    newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

    stage.scale({ x: newScale, y: newScale });

    var newPos = {
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
});

// Cursor changes for Panning
stage.on('draggableChange', () => {
    if (stage.draggable()) {
        stage.container().style.cursor = 'grab';
    } else {
        stage.container().style.cursor = 'default';
    }
});

stage.on('dragstart', (e) => {
    if (e.target === stage) {
        stage.container().style.cursor = 'grabbing';
    }
});

stage.on('dragend', (e) => {
    if (e.target === stage) {
        stage.container().style.cursor = 'grab';
    }
});

// Zoom Buttons
document.getElementById('zoomInBtn').addEventListener('click', () => {
    const oldScale = stage.scaleX();
    let newScale = oldScale * scaleBy;
    newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    applyZoom(newScale);
});

document.getElementById('zoomOutBtn').addEventListener('click', () => {
    const oldScale = stage.scaleX();
    let newScale = oldScale / scaleBy;
    newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    applyZoom(newScale);
});

document.getElementById('fitViewBtn').addEventListener('click', () => {
    stage.position({ x: 0, y: 0 });
    stage.scale({ x: INITIAL_SCALE, y: INITIAL_SCALE });
});

function applyZoom(newScale) {
    // Zoom to center of screen
    const center = {
        x: stage.width() / 2,
        y: stage.height() / 2,
    };

    const oldScale = stage.scaleX();

    const centerPointTo = {
        x: (center.x - stage.x()) / oldScale,
        y: (center.y - stage.y()) / oldScale,
    };

    stage.scale({ x: newScale, y: newScale });

    const newPos = {
        x: center.x - centerPointTo.x * newScale,
        y: center.y - centerPointTo.y * newScale,
    };
    stage.position(newPos);
}

// Enable touch scrolling prevention
stage.container().style.touchAction = 'none';

// Create a new layer
const layer = new Konva.Layer();
stage.add(layer);
layer.draw();

// ==========================================
// Toolbar Button Handlers
// ==========================================
const panBtn = document.getElementById('panBtn');
const addPoleBtn = document.getElementById('addPoleBtn');
const addTransformerBtn = document.getElementById('addTransformerBtn');
const connectModeBtn = document.getElementById('connectModeBtn');
const deleteBtn = document.getElementById('deleteBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const newPageBtn = document.getElementById('newPageBtn');

// Pan Button Handler
panBtn.addEventListener('click', () => {
    if (currentTool === 'pan') {
        currentTool = null;
        panBtn.classList.remove('active');
        stage.container().style.cursor = 'default';
        stage.draggable(true); // Always draggable by default as per requirement
    } else {
        currentTool = 'pan';
        panBtn.classList.add('active');
        addPoleBtn.classList.remove('active');
        addTransformerBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
        deleteBtn.classList.remove('active');
        clearSelection();
        stage.container().style.cursor = 'grab';
        stage.draggable(true);
    }
});

addPoleBtn.addEventListener('click', () => {
    if (currentTool === 'pole') {
        currentTool = null;
        addPoleBtn.classList.remove('active');
    } else {
        currentTool = 'pole';
        addPoleBtn.classList.add('active');
        panBtn.classList.remove('active');
        addTransformerBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
        deleteBtn.classList.remove('active');
        clearSelection();
    }
});

addTransformerBtn.addEventListener('click', () => {
    if (currentTool === 'transformer') {
        currentTool = null;
        addTransformerBtn.classList.remove('active');
    } else {
        currentTool = 'transformer';
        addTransformerBtn.classList.add('active');
        panBtn.classList.remove('active');
        addPoleBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
        deleteBtn.classList.remove('active');
        clearSelection();
    }
});

connectModeBtn.addEventListener('click', () => {
    console.log('Connect button clicked, current tool:', currentTool);
    if (currentTool === 'connect') {
        currentTool = null;
        connectModeBtn.classList.remove('active');
        console.log('Connect mode deactivated');
    } else {
        currentTool = 'connect';
        connectModeBtn.classList.add('active');
        panBtn.classList.remove('active');
        addPoleBtn.classList.remove('active');
        addTransformerBtn.classList.remove('active');
        deleteBtn.classList.remove('active');
        clearSelection();
        console.log('Connect mode activated');
    }
});

deleteBtn.addEventListener('click', () => {
    console.log('Delete button clicked, current tool:', currentTool);
    if (currentTool === 'delete') {
        currentTool = null;
        deleteBtn.classList.remove('active');
        console.log('Delete mode deactivated');
    } else {
        currentTool = 'delete';
        deleteBtn.classList.add('active');
        panBtn.classList.remove('active');
        addPoleBtn.classList.remove('active');
        addTransformerBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
        clearSelection();
        console.log('Delete mode activated');
    }
});

undoBtn.addEventListener('click', () => {
    undo();
});

redoBtn.addEventListener('click', () => {
    redo();
});

saveBtn.addEventListener('click', () => {
    saveToLocalStorage();
});

loadBtn.addEventListener('click', () => {
    loadFromLocalStorage();
});

newPageBtn.addEventListener('click', () => {
    newPage();
});

// Initialize button states
updateHistoryButtons();

// ==========================================
// History/Undo-Redo Functions
// ==========================================
function saveHistory() {
    // Remove any future history if we're not at the end
    if (historyStep < history.length - 1) {
        history = history.slice(0, historyStep + 1);
    }

    // Create state object with deep copies
    const state = {
        objects: JSON.parse(JSON.stringify(objects)),
        connections: connections.map(conn => ({
            id: conn.id,
            from: conn.from,
            to: conn.to
        })),
        objectIdCounter: objectIdCounter,
        connectionIdCounter: connectionIdCounter
    };

    // Add state to history
    history.push(state);
    historyStep++;

    // Update button states
    updateHistoryButtons();
}

function loadState(state) {
    // Clean up current state
    layer.destroyChildren(); // Completely clear layer

    // Reset arrays
    const stateObjects = JSON.parse(JSON.stringify(state.objects));
    objects = []; // Start fresh
    objectIdCounter = state.objectIdCounter;
    connectionIdCounter = state.connectionIdCounter;
    connections = []; // Start fresh
    selectedObject = null;
    poleCounter = null; // Reset pole counter

    // Find max pole number to initialize counter
    let maxPoleNum = 0;
    stateObjects.forEach(obj => {
        if (obj.type === 'pole' && obj.poleNumber) {
            if (obj.poleNumber > maxPoleNum) {
                maxPoleNum = obj.poleNumber;
            }
        }
    });
    if (maxPoleNum > 0) {
        poleCounter = maxPoleNum + 1;
    }

    // Recreate all objects on canvas
    stateObjects.forEach(obj => {
        if (obj.type === 'pole') {
            recreatePole(obj);
        } else if (obj.type === 'transformer') {
            recreateTransformer(obj);
        }
    });

    // Recreate all connections
    state.connections.forEach(connData => {
        recreateConnection(connData);
    });

    layer.draw();
}

function undo() {
    if (historyStep > 0) {
        historyStep--;
        loadState(history[historyStep]);
        clearSelection();
        updateHistoryButtons();
    }
}

function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        loadState(history[historyStep]);
        clearSelection();
        updateHistoryButtons();
    }
}

function updateHistoryButtons() {
    undoBtn.disabled = historyStep <= 0;
    redoBtn.disabled = historyStep >= history.length - 1;
}

// ==========================================
// LocalStorage Functions for Save/Load
// ==========================================
const STORAGE_KEY = 'electrical_surveys';

function saveToLocalStorage() {
    // Prompt user for survey name
    const surveyName = prompt('Enter survey name:');
    if (!surveyName || surveyName.trim() === '') {
        alert('Survey name cannot be empty.');
        return;
    }

    // Get current surveys from localStorage
    let surveys = [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        surveys = JSON.parse(stored);
    }

    // Create new survey object
    const survey = {
        id: Date.now(),
        name: surveyName.trim(),
        date: new Date().toLocaleString(),
        objects: JSON.parse(JSON.stringify(objects)),
        connections: connections.map(conn => ({
            id: conn.id,
            from: conn.from,
            to: conn.to
        }))
    };

    // Add survey to list
    surveys.push(survey);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
    alert(`Survey "${surveyName}" saved successfully!`);
}

function loadFromLocalStorage() {
    // Get surveys from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        alert('No saved surveys found.');
        return;
    }

    const surveys = JSON.parse(stored);
    if (surveys.length === 0) {
        alert('No saved surveys found.');
        return;
    }

    // Create list of survey options
    let options = surveys.map((survey, index) =>
        `${index + 1}. ${survey.name} (${survey.date})`
    ).join('\n');

    const selectedIndex = prompt(`Select a survey to load:\n\n${options}\n\nEnter number (1-${surveys.length}):`, '1');

    if (selectedIndex === null) return; // User canceled

    const index = parseInt(selectedIndex) - 1;
    if (isNaN(index) || index < 0 || index >= surveys.length) {
        alert('Invalid selection.');
        return;
    }

    const survey = surveys[index];

    // Clear canvas
    clearCanvas();

    // Reset arrays
    objects = [];
    connections = [];
    selectedObject = null;

    // Update counters based on survey data
    objectIdCounter = Math.max(...survey.objects.map(o => o.id), -1) + 1;

    // Initialize pole counter from loaded data
    poleCounter = null;
    let maxPoleNum = 0;
    survey.objects.forEach(obj => {
        if (obj.type === 'pole' && obj.poleNumber) {
            if (obj.poleNumber > maxPoleNum) maxPoleNum = obj.poleNumber;
        }
    });
    if (maxPoleNum > 0) poleCounter = maxPoleNum + 1;

    let maxConnId = -1;
    survey.connections.forEach(conn => {
        if (conn.id > maxConnId) maxConnId = conn.id;
    });
    connectionIdCounter = maxConnId + 1;

    // Recreate all objects on canvas
    survey.objects.forEach(obj => {
        if (obj.type === 'pole') {
            recreatePole(obj);
        } else if (obj.type === 'transformer') {
            recreateTransformer(obj);
        }
    });

    // Recreate all connections
    survey.connections.forEach(connData => {
        recreateConnection(connData);
    });

    layer.draw();

    // Reset history
    history = [];
    historyStep = -1;
    saveHistory();
    updateHistoryButtons();

    alert(`Survey "${survey.name}" loaded successfully!`);
    currentTool = null;
}

function newPage() {
    if (!confirm('Clear all objects and start a new survey?')) {
        return;
    }

    clearCanvas();

    // Reset arrays and counters
    objects = [];
    objectIdCounter = 0;
    poleCounter = null; // Reset pole counter
    connections = [];
    connectionIdCounter = 0;
    selectedObject = null;
    currentTool = null;

    // Deactivate all tool buttons
    panBtn.classList.remove('active');
    addPoleBtn.classList.remove('active');
    addTransformerBtn.classList.remove('active');
    connectModeBtn.classList.remove('active');
    deleteBtn.classList.remove('active');

    // Reset history
    history = [];
    historyStep = -1;
    saveHistory();
    updateHistoryButtons();

    layer.draw();
}

function clearCanvas() {
    // Remove all shapes from canvas
    layer.destroyChildren();

    // Reset UI state
    clearSelection();
    layer.draw();
}

// ==========================================
// Create Pole Function
// ==========================================
// ==========================================
// Create Pole Function
// ==========================================
function createPole(x, y) {
    // Initialize pole counter if first pole
    if (poleCounter === null) {
        const input = prompt("Enter starting pole number:", "1");
        if (input === null) return; // Cancelled
        poleCounter = parseInt(input);
        if (isNaN(poleCounter)) poleCounter = 1;
    }

    const currentPoleNum = poleCounter++;

    // Create pole object
    const pole = {
        id: objectIdCounter++,
        x: x,
        y: y,
        type: 'pole',
        poleNumber: currentPoleNum
    };

    // Add to objects array
    objects.push(pole);

    // Create Group
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true,
        id: `pole-${pole.id}`
    });

    // Create Konva circle
    const circle = new Konva.Circle({
        x: 0,
        y: 0,
        radius: POLE_RADIUS,
        fill: POLE_COLOR,
        listening: true, // receive events
        hitStrokeWidth: 20
    });

    // Create Text for Pole Number
    const text = new Konva.Text({
        x: 12,
        y: -10,
        text: currentPoleNum.toString(),
        fontSize: 14,
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold'
    });

    group.add(circle);
    group.add(text);

    // Update pole coordinates on drag
    group.on('dragmove', () => {
        pole.x = group.x();
        pole.y = group.y();
        updateConnectionLines(pole.id);
    });

    // Add group to layer
    layer.add(group);
    layer.draw();

    saveHistory();
    return pole;
}

// ==========================================
// Recreate Pole Function (for undo/redo)
// ==========================================
// ==========================================
// Recreate Pole Function (for undo/redo)
// ==========================================
function recreatePole(poleData) {
    // Add to objects array
    objects.push(poleData);

    // Create Group
    const group = new Konva.Group({
        x: poleData.x,
        y: poleData.y,
        draggable: true,
        id: `pole-${poleData.id}`
    });

    // Create Konva circle
    const circle = new Konva.Circle({
        x: 0,
        y: 0,
        radius: POLE_RADIUS,
        fill: POLE_COLOR,
        listening: true,
        hitStrokeWidth: 20
    });

    // Create Text for Pole Number
    const text = new Konva.Text({
        x: 12,
        y: -10,
        text: (poleData.poleNumber || "").toString(),
        fontSize: 14,
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold'
    });

    group.add(circle);
    group.add(text);

    // Update pole coordinates on drag
    group.on('dragmove', () => {
        poleData.x = group.x();
        poleData.y = group.y();
        updateConnectionLines(poleData.id);
    });

    // Add group to layer
    layer.add(group);

    return group;
}

// ==========================================
// Create Transformer Function
// ==========================================
function createTransformer(x, y) {
    // Create transformer object
    const transformer = {
        id: objectIdCounter++,
        x: x,
        y: y,
        type: 'transformer'
    };

    // Add to objects array
    objects.push(transformer);

    // Create Konva rectangle
    const rect = new Konva.Rect({
        x: x - TRANSFORMER_WIDTH / 2,
        y: y - TRANSFORMER_HEIGHT / 2,
        width: TRANSFORMER_WIDTH,
        height: TRANSFORMER_HEIGHT,
        fill: TRANSFORMER_COLOR,
        draggable: true,
        id: `transformer-${transformer.id}`,
        listening: true
    });

    // Update transformer coordinates on drag
    rect.on('dragmove', () => {
        transformer.x = rect.x() + TRANSFORMER_WIDTH / 2;
        transformer.y = rect.y() + TRANSFORMER_HEIGHT / 2;
        updateConnectionLines(transformer.id);
    });

    // Add rectangle to layer
    layer.add(rect);
    layer.draw();

    saveHistory();
    return transformer;
}

// ==========================================
// Recreate Transformer Function (for undo/redo)
// ==========================================
function recreateTransformer(transformerData) {
    // Add to objects array
    objects.push(transformerData);

    // Create Konva rectangle
    const rect = new Konva.Rect({
        x: transformerData.x - TRANSFORMER_WIDTH / 2,
        y: transformerData.y - TRANSFORMER_HEIGHT / 2,
        width: TRANSFORMER_WIDTH,
        height: TRANSFORMER_HEIGHT,
        fill: TRANSFORMER_COLOR,
        draggable: true,
        id: `transformer-${transformerData.id}`,
        listening: true
    });

    // Update transformer coordinates on drag
    rect.on('dragmove', () => {
        transformerData.x = rect.x() + TRANSFORMER_WIDTH / 2;
        transformerData.y = rect.y() + TRANSFORMER_HEIGHT / 2;
        updateConnectionLines(transformerData.id);
    });

    // Add rectangle to layer
    layer.add(rect);

    return rect;
}

// ==========================================
// Helper Functions for Connect Mode
// ==========================================
function highlightObject(shape) {
    // If shape is a Group (Pole), find the circle inside
    if (shape instanceof Konva.Group) {
        const circle = shape.findOne('Circle');
        if (circle) {
            circle.stroke(HIGHLIGHT_STROKE);
            circle.strokeWidth(HIGHLIGHT_STROKE_WIDTH);
        }
    } else {
        shape.stroke(HIGHLIGHT_STROKE);
        shape.strokeWidth(HIGHLIGHT_STROKE_WIDTH);
    }
    layer.draw();
}

function unhighlightObject(shape) {
    if (shape instanceof Konva.Group) {
        const circle = shape.findOne('Circle');
        if (circle) {
            circle.stroke(null);
            circle.strokeWidth(0);
        }
    } else {
        shape.stroke(null);
        shape.strokeWidth(0);
    }
    layer.draw();
}

function clearSelection() {
    if (selectedObject) {
        const shapeId = selectedObject.type === 'pole'
            ? `pole-${selectedObject.id}`
            : `transformer-${selectedObject.id}`;
        const shape = layer.findOne('#' + shapeId);
        if (shape) {
            unhighlightObject(shape);
        }
    }
    selectedObject = null;
}

function getObjectById(id) {
    return objects.find(obj => obj.id === id);
}

function getShapeById(id, type) {
    const shapeId = type === 'pole' ? `pole-${id}` : `transformer-${id}`;
    return layer.findOne('#' + shapeId);
}

function getObjectCenterFromShape(shape) {
    if (shape instanceof Konva.Group) { // Pole Group
        return { x: shape.x(), y: shape.y() };
    }
    if (shape instanceof Konva.Circle) {
        return { x: shape.x(), y: shape.y() };
    } else if (shape instanceof Konva.Rect) {
        return {
            x: shape.x() + shape.width() / 2,
            y: shape.y() + shape.height() / 2
        };
    }
    return { x: 0, y: 0 };
}

function drawConnection(fromObjId, toObjId) {
    const fromObj = getObjectById(fromObjId);
    const toObj = getObjectById(toObjId);

    if (!fromObj || !toObj) return null;

    const fromShape = getShapeById(fromObj.id, fromObj.type);
    const toShape = getShapeById(toObj.id, toObj.type);

    if (!fromShape || !toShape) return null;

    const fromCenter = getObjectCenterFromShape(fromShape);
    const toCenter = getObjectCenterFromShape(toShape);

    // Create connection object
    const connection = {
        id: connectionIdCounter++,
        from: fromObjId,
        to: toObjId
    };

    // Create Konva line
    const line = new Konva.Line({
        points: [fromCenter.x, fromCenter.y, toCenter.x, toCenter.y],
        stroke: CONNECTION_LINE_COLOR,
        strokeWidth: CONNECTION_LINE_WIDTH,
        lineCap: 'round',
        lineJoin: 'round',
        id: `line-${connection.id}`,
        listening: true,
        hitStrokeWidth: 20 // Much larger touch target for thin lines
    });

    connection.line = line;
    connections.push(connection);

    // Add line to layer and move it to the back
    layer.add(line);
    line.moveToBottom();
    layer.draw();

    saveHistory();
    return connection;
}

// ==========================================
// Recreate Connection Function (for undo/redo)
// ==========================================
function recreateConnection(connData) {
    const fromObj = getObjectById(connData.from);
    const toObj = getObjectById(connData.to);

    if (!fromObj || !toObj) return null;

    const fromShape = getShapeById(fromObj.id, fromObj.type);
    const toShape = getShapeById(toObj.id, toObj.type);

    if (!fromShape || !toShape) return null;

    const fromCenter = getObjectCenterFromShape(fromShape);
    const toCenter = getObjectCenterFromShape(toShape);

    // Create Konva line
    const line = new Konva.Line({
        points: [fromCenter.x, fromCenter.y, toCenter.x, toCenter.y],
        stroke: CONNECTION_LINE_COLOR,
        strokeWidth: CONNECTION_LINE_WIDTH,
        lineCap: 'round',
        lineJoin: 'round',
        id: `line-${connData.id}`,
        listening: true,
        hitStrokeWidth: 20 // Much larger touch target for thin lines
    });

    // Create connection object
    const connection = {
        id: connData.id,
        from: connData.from,
        to: connData.to,
        line: line
    };

    connections.push(connection);

    // Add line to layer and move it to the back
    layer.add(line);
    line.moveToBottom();

    return connection;
}

function updateConnectionLines(objectId) {
    // Find all connections involving this object
    connections.forEach(conn => {
        if (conn.from === objectId || conn.to === objectId) {
            const fromObj = getObjectById(conn.from);
            const toObj = getObjectById(conn.to);

            if (fromObj && toObj) {
                const fromShape = getShapeById(fromObj.id, fromObj.type);
                const toShape = getShapeById(toObj.id, toObj.type);

                if (fromShape && toShape) {
                    const fromCenter = getObjectCenterFromShape(fromShape);
                    const toCenter = getObjectCenterFromShape(toShape);

                    conn.line.points([fromCenter.x, fromCenter.y, toCenter.x, toCenter.y]);
                }
            }
        }
    });
    layer.draw();
}

// ==========================================
// Delete Functions
// ==========================================
function deleteObject(objectId) {
    // Remove object from objects array
    objects = objects.filter(obj => obj.id !== objectId);

    // Find and remove the shape from canvas
    // Try to find as pole first, then as transformer
    let shape = layer.findOne(`#pole-${objectId}`);
    if (!shape) {
        shape = layer.findOne(`#transformer-${objectId}`);
    }
    if (shape) {
        shape.remove();
    }

    // Find and remove all connections involving this object
    const connectionsToDelete = connections.filter(conn =>
        conn.from === objectId || conn.to === objectId
    );

    connectionsToDelete.forEach(conn => {
        if (conn.line) {
            conn.line.remove();
        }
    });

    // Remove connections from array
    connections = connections.filter(conn =>
        conn.from !== objectId && conn.to !== objectId
    );

    layer.draw();
    saveHistory();
}

function deleteConnection(connectionId) {
    // Find the connection
    const connection = connections.find(conn => conn.id === connectionId);
    if (!connection) return;

    // Remove the line from canvas
    if (connection.line) {
        connection.line.remove();
    }

    // Remove from connections array
    connections = connections.filter(conn => conn.id !== connectionId);

    layer.draw();
    saveHistory();
}

// ==========================================
// Canvas Click/Tap Handler for Object Placement
// ==========================================
// Use 'tap' event instead of 'click' for better mobile support
// 'tap' works on both mobile (touch) and desktop (click)
stage.on('tap click', (e) => {
    console.log('Tap/Click event triggered:', {
        currentTool: currentTool,
        targetType: e.target.getClassName ? e.target.getClassName() : 'unknown',
        targetId: e.target.id ? e.target.id() : 'no-id',
        isStage: e.target === stage
    });

    // If no tool is active, do nothing
    if (!currentTool) return;

    // If pan tool is active, ignore clicks (only drag allowed)
    if (currentTool === 'pan') return;

    // Handle placement modes
    if (currentTool === 'pole' || currentTool === 'transformer') {
        // Ignore clicks on shapes
        if (e.target !== stage) return;

        // Get click position
        const pointer = stage.getPointerPosition();

        // Transform pointer to stage local coordinates
        // This is crucial for Zoom/Pan to work correctly
        const transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        const pos = transform.point(pointer);

        console.log('Click on stage:', { pointer, stagePos: stage.position(), scale: stage.scaleX(), result: pos });

        // Create appropriate object based on active tool
        if (currentTool === 'pole') {
            createPole(pos.x, pos.y);
        } else if (currentTool === 'transformer') {
            createTransformer(pos.x, pos.y);
        }
    }

    // Handle connect mode
    if (currentTool === 'connect') {
        console.log('Connect mode active');
        // Check if clicked on a shape
        if (e.target === stage) {
            console.log('Clicked on stage, ignoring');
            return;
        }

        const clickedShape = e.target;
        let clickedObject = null;

        // Determine which object was clicked
        // Note: For groups, e.target is the child (Circle/Text). 
        // We must check the parent group's ID or the target's ID if not grouped.

        let targetId = clickedShape.id();
        let targetGroup = clickedShape.getParent();

        // If clicked child of a group (like text or circle), get group ID
        if (targetGroup instanceof Konva.Group && targetGroup.id().startsWith('pole-')) {
            targetId = targetGroup.id();
            // Important: Update clickedShape to be the Group so highlighting works on the Group logic
            // However, our highlight logic expects the Group now.
            // Let's pass the Group to the rest of the logic
            // Re-assign clickedShape to the Group
            // But 'clickedShape' is a const from event? No, e.target.
            // We can't reassign e.target but we can use a variable.
        }

        for (let obj of objects) {
            const shapeId = obj.type === 'pole' ? `pole-${obj.id}` : `transformer-${obj.id}`;
            if (targetId === shapeId) {
                clickedObject = obj;
                break;
            }
        }

        console.log('Clicked object:', clickedObject);

        if (!clickedObject) return;

        // If no object is selected, select this one
        if (!selectedObject) {
            console.log('Selecting first object');
            selectedObject = clickedObject;
            if (targetGroup instanceof Konva.Group && targetGroup.id().startsWith('pole-')) {
                highlightObject(targetGroup);
            } else {
                highlightObject(clickedShape);
            }
        } else if (selectedObject.id === clickedObject.id) {
            // If clicking same object, deselect it
            console.log('Deselecting object');
            clearSelection();
        } else {
            // If an object was selected, create connection
            console.log('Creating connection');
            drawConnection(selectedObject.id, clickedObject.id);
            clearSelection();
        }
    }

    // Handle delete mode
    if (currentTool === 'delete') {
        console.log('Delete mode active');
        // Check if clicked on canvas background
        if (e.target === stage) {
            console.log('Clicked on stage, ignoring');
            return;
        }

        const clickedElement = e.target;
        let elementId = clickedElement.id();

        // Handle Pole Groups
        const parentGroup = clickedElement.getParent();
        if (parentGroup instanceof Konva.Group && parentGroup.id().startsWith('pole-')) {
            elementId = parentGroup.id();
        }

        console.log('Clicked element ID:', elementId);

        // Check if clicking a connection line
        if (elementId && elementId.startsWith('line-')) {
            // Extract connection ID from line ID (format: line-{connectionId})
            const connectionId = parseInt(elementId.split('-')[1]);
            console.log('Deleting connection:', connectionId);
            deleteConnection(connectionId);
        } else {
            // It's an object (pole or transformer) - delete it
            // Use getObjectById logic or simply check prefix
            let idToDelete = null;

            if (elementId.startsWith('pole-')) {
                idToDelete = parseInt(elementId.split('-')[1]);
            } else if (elementId.startsWith('transformer-')) {
                idToDelete = parseInt(elementId.split('-')[1]);
            }

            if (idToDelete !== null && !isNaN(idToDelete)) {
                console.log('Deleting object:', idToDelete);
                deleteObject(idToDelete);
            }
        }
    }
});

// ==========================================
// Touch Support for Dragging
// ==========================================
stage.on('touchmove', () => {
    stage.batchDraw();
});

// ==========================================
// Window Resize Handler
// ==========================================
window.addEventListener('resize', () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight - toolbarHeight;
    stage.width(newWidth);
    stage.height(newHeight);
    layer.draw();
});