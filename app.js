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
const container = document.getElementById('container');
const toolbarHeight = 75; // Approximate height for bottom toolbar
const stageWidth = window.innerWidth;
const stageHeight = window.innerHeight - toolbarHeight;

const stage = new Konva.Stage({
    container: 'container',
    width: stageWidth,
    height: stageHeight,
    bgcolor: '#e8e8e8'
});

// Create a new layer
const layer = new Konva.Layer();
stage.add(layer);
layer.draw();

// ==========================================
// Toolbar Button Handlers
// ==========================================
const addPoleBtn = document.getElementById('addPoleBtn');
const addTransformerBtn = document.getElementById('addTransformerBtn');
const connectModeBtn = document.getElementById('connectModeBtn');
const deleteBtn = document.getElementById('deleteBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const newPageBtn = document.getElementById('newPageBtn');

addPoleBtn.addEventListener('click', () => {
    if (currentTool === 'pole') {
        currentTool = null;
        addPoleBtn.classList.remove('active');
    } else {
        currentTool = 'pole';
        addPoleBtn.classList.add('active');
        addTransformerBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
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
        addPoleBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
        clearSelection();
    }
});

connectModeBtn.addEventListener('click', () => {
    if (currentTool === 'connect') {
        currentTool = null;
        connectModeBtn.classList.remove('active');
        clearSelection();
    } else {
        currentTool = 'connect';
        connectModeBtn.classList.add('active');
        addPoleBtn.classList.remove('active');
        addTransformerBtn.classList.remove('active');
        deleteBtn.classList.remove('active');
        clearSelection();
    }
});

deleteBtn.addEventListener('click', () => {
    if (currentTool === 'delete') {
        currentTool = null;
        deleteBtn.classList.remove('active');
    } else {
        currentTool = 'delete';
        deleteBtn.classList.add('active');
        addPoleBtn.classList.remove('active');
        addTransformerBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
        clearSelection();
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
    layer.removeChildren();

    // Reset arrays
    objects = JSON.parse(JSON.stringify(state.objects));
    objectIdCounter = state.objectIdCounter;
    connectionIdCounter = state.connectionIdCounter;
    connections = [];
    selectedObject = null;

    // Recreate all objects on canvas
    objects.forEach(obj => {
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
    connections = [];
    connectionIdCounter = 0;
    selectedObject = null;
    currentTool = null;

    // Deactivate all tool buttons
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
    layer.removeChildren();
    
    // Reset UI state
    clearSelection();
}

// ==========================================
// Create Pole Function
// ==========================================
function createPole(x, y) {
    // Create pole object
    const pole = {
        id: objectIdCounter++,
        x: x,
        y: y,
        type: 'pole'
    };

    // Add to objects array
    objects.push(pole);

    // Create Konva circle
    const circle = new Konva.Circle({
        x: x,
        y: y,
        radius: POLE_RADIUS,
        fill: POLE_COLOR,
        draggable: true,
        id: `pole-${pole.id}`
    });

    // Update pole coordinates on drag
    circle.on('dragmove', () => {
        pole.x = circle.x();
        pole.y = circle.y();
        updateConnectionLines(pole.id);
    });

    // Add circle to layer
    layer.add(circle);
    layer.draw();

    saveHistory();
    return pole;
}

// ==========================================
// Recreate Pole Function (for undo/redo)
// ==========================================
function recreatePole(poleData) {
    // Add to objects array
    objects.push(poleData);

    // Create Konva circle
    const circle = new Konva.Circle({
        x: poleData.x,
        y: poleData.y,
        radius: POLE_RADIUS,
        fill: POLE_COLOR,
        draggable: true,
        id: `pole-${poleData.id}`
    });

    // Update pole coordinates on drag
    circle.on('dragmove', () => {
        poleData.x = circle.x();
        poleData.y = circle.y();
        updateConnectionLines(poleData.id);
    });

    // Add circle to layer
    layer.add(circle);

    return circle;
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
        id: `transformer-${transformer.id}`
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
        id: `transformer-${transformerData.id}`
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
    shape.stroke(HIGHLIGHT_STROKE);
    shape.strokeWidth(HIGHLIGHT_STROKE_WIDTH);
    layer.draw();
}

function unhighlightObject(shape) {
    shape.stroke(null);
    shape.strokeWidth(0);
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
        id: `line-${connection.id}`
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
        id: `line-${connData.id}`
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
// Canvas Click Handler for Object Placement
// ==========================================
stage.on('click', (e) => {
    // If no tool is active, do nothing
    if (!currentTool) return;

    // Handle placement modes
    if (currentTool === 'pole' || currentTool === 'transformer') {
        // Ignore clicks on shapes
        if (e.target !== stage) return;

        // Get click position
        const pos = stage.getPointerPosition();

        // Create appropriate object based on active tool
        if (currentTool === 'pole') {
            createPole(pos.x, pos.y);
        } else if (currentTool === 'transformer') {
            createTransformer(pos.x, pos.y);
        }
    }

    // Handle connect mode
    if (currentTool === 'connect') {
        // Check if clicked on a shape
        if (e.target === stage) return;

        const clickedShape = e.target;
        let clickedObject = null;

        // Determine which object was clicked
        for (let obj of objects) {
            const shapeId = obj.type === 'pole' ? `pole-${obj.id}` : `transformer-${obj.id}`;
            if (clickedShape.id() === shapeId) {
                clickedObject = obj;
                break;
            }
        }

        if (!clickedObject) return;

        // If no object is selected, select this one
        if (!selectedObject) {
            selectedObject = clickedObject;
            highlightObject(clickedShape);
        } else if (selectedObject.id === clickedObject.id) {
            // If clicking same object, deselect it
            clearSelection();
        } else {
            // If an object was selected, create connection
            drawConnection(selectedObject.id, clickedObject.id);
            clearSelection();
        }
    }

    // Handle delete mode
    if (currentTool === 'delete') {
        // Check if clicked on canvas background
        if (e.target === stage) return;

        const clickedElement = e.target;
        const elementId = clickedElement.id();

        // Check if clicking a connection line
        if (elementId && elementId.startsWith('line-')) {
            // Extract connection ID from line ID (format: line-{connectionId})
            const connectionId = parseInt(elementId.split('-')[1]);
            deleteConnection(connectionId);
        } else {
            // It's an object (pole or transformer) - delete it
            for (let obj of objects) {
                const shapeId = obj.type === 'pole' ? `pole-${obj.id}` : `transformer-${obj.id}`;
                if (elementId === shapeId) {
                    deleteObject(obj.id);
                    break;
                }
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