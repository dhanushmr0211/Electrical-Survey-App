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

    // Automatically reload the page when a new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New Service Worker activated. Reloading page...');
        window.location.reload();
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
const SWITCH_SIZE = 20;
const SWITCH_COLOR = '#000000';

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
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 5.0;
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
// Multi-touch zoom (pinch) handling
stage.on('touchmove', function (e) {
    var touch1 = e.evt.touches[0];
    var touch2 = e.evt.touches[1];

    if (touch1 && touch2) {
        e.evt.preventDefault(); // Prevent browser zoom only when pinching

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
        // Calculate pointTo based on old scale/pos
        var pointTo = {
            x: (newCenter.x - stage.x()) / stage.scaleX(),
            y: (newCenter.y - stage.y()) / stage.scaleX(),
        };

        var scale = stage.scaleX() * (dist / lastDist);

        // Clamp scale
        // Smooth clamping: if outside bounds, apply resistance or hard clamp? 
        // Hard clamp for stability.
        scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));

        stage.scale({ x: scale, y: scale });

        // calculate new position of the stage
        var dx = newCenter.x - lastCenter.x;
        var dy = newCenter.y - lastCenter.y;

        var newPos = {
            x: newCenter.x - pointTo.x * scale + dx,
            y: newCenter.y - pointTo.y * scale + dy,
        };

        stage.position(newPos);

        // Update last values for next frame
        lastDist = dist;
        lastCenter = newCenter;
    }
});

stage.on('touchend', function () {
    lastDist = 0;
    lastCenter = null;
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
const addSwitchBtn = document.getElementById('addSwitchBtn');
const addTransformerBtn = document.getElementById('addTransformerBtn');
const textModeBtn = document.getElementById('textModeBtn');
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
        textModeBtn.classList.remove('active');
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
        textModeBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
        deleteBtn.classList.remove('active');
        clearSelection();
    }
});

addSwitchBtn.addEventListener('click', () => {
    // This is an instant action, not a tool mode
    createSwitchAdjacentToLastPole();
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
        textModeBtn.classList.remove('active');
        connectModeBtn.classList.remove('active');
        deleteBtn.classList.remove('active');
        clearSelection();
    }
});

textModeBtn.addEventListener('click', () => {
    if (currentTool === 'text') {
        currentTool = null;
        textModeBtn.classList.remove('active');
    } else {
        currentTool = 'text';
        textModeBtn.classList.add('active');
        panBtn.classList.remove('active');
        addPoleBtn.classList.remove('active');
        addTransformerBtn.classList.remove('active');
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
        textModeBtn.classList.remove('active');
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
        textModeBtn.classList.remove('active');
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
        } else if (obj.type === 'switch') {
            recreateSwitch(obj);
        } else if (obj.type === 'text') {
            recreateText(obj);
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

    // Create a custom modal for loading/deleting
    showLoadDialog(surveys);
}

function showLoadDialog(surveys) {
    // Remove existing dialog if any
    const existing = document.getElementById('loadDialog');
    if (existing) document.body.removeChild(existing);

    const dialog = document.createElement('div');
    dialog.id = 'loadDialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = 'white';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
    dialog.style.zIndex = '2000';
    dialog.style.maxHeight = '80vh';
    dialog.style.overflowY = 'auto';
    dialog.style.width = '300px';
    dialog.style.fontFamily = 'Arial, sans-serif';

    const title = document.createElement('h3');
    title.textContent = 'Saved Surveys';
    title.style.marginTop = '0';
    title.style.borderBottom = '1px solid #eee';
    title.style.paddingBottom = '10px';
    dialog.appendChild(title);

    const list = document.createElement('div');
    surveys.forEach((survey, index) => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.padding = '10px 0';
        item.style.borderBottom = '1px solid #f0f0f0';

        const info = document.createElement('div');
        info.innerHTML = `<strong>${survey.name}</strong><br><span style="font-size:12px;color:#666">${survey.date}</span>`;

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '5px';

        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.style.padding = '5px 10px';
        loadBtn.style.cursor = 'pointer';
        loadBtn.style.backgroundColor = '#4CAF50'; // Green
        loadBtn.style.color = 'white';
        loadBtn.style.border = 'none';
        loadBtn.style.borderRadius = '3px';
        loadBtn.onclick = () => {
            loadSurvey(survey);
            document.body.removeChild(dialog);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '✕'; // Cross icon
        deleteBtn.title = "Delete Survey";
        deleteBtn.style.padding = '5px 10px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.backgroundColor = '#f44336'; // Red
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '3px';
        deleteBtn.onclick = () => {
            if (confirm(`Are you sure you want to delete "${survey.name}"?`)) {
                deleteSurvey(survey.id);
                document.body.removeChild(dialog);
                // Reload dialog to show updated list
                setTimeout(loadFromLocalStorage, 100);
            }
        };

        actions.appendChild(loadBtn);
        actions.appendChild(deleteBtn);

        item.appendChild(info);
        item.appendChild(actions);
        list.appendChild(item);
    });

    if (surveys.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#666">No saved surveys.</p>';
    }

    dialog.appendChild(list);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.marginTop = '15px';
    closeBtn.style.padding = '8px 15px';
    closeBtn.style.width = '100%';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.backgroundColor = '#ddd';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '3px';
    closeBtn.onclick = () => document.body.removeChild(dialog);
    dialog.appendChild(closeBtn);

    document.body.appendChild(dialog);
}

function deleteSurvey(id) {
    let surveys = [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        surveys = JSON.parse(stored);
    }

    const initialLength = surveys.length;
    surveys = surveys.filter(s => s.id !== id);

    if (surveys.length < initialLength) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
        // alert('Survey deleted.'); // feedback optional, UI refresh handles it
    }
}

function loadSurvey(survey) {
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
    textModeBtn.classList.remove('active');
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
        y: -14, // Moved up from -10 to -14 (approx 4px / ~0.1cm)
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
        y: -14, // Moved up from -10 to -14 (approx 4px / ~0.1cm)
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
// Switch (SR) Functions
// ==========================================
function createSwitchAdjacentToLastPole() {
    // Find the latest pole
    let lastPole = null;
    // Iterate backwards to find last added pole
    for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i].type === 'pole') {
            lastPole = objects[i];
            break;
        }
    }

    let x, y;
    if (lastPole) {
        // Place adjacent to the last pole (e.g., to the right)
        x = lastPole.x + 30; // 30px offset
        y = lastPole.y;
    } else {
        // Default to center if no poles
        const center = getCenter({ x: 0, y: 0 }, { x: stage.width(), y: stage.height() });
        // Adjust for stage transform
        const transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        const pos = transform.point(center);
        x = pos.x;
        y = pos.y;
    }

    createSwitch(x, y);
}

function createSwitch(x, y) {
    const switchObj = {
        id: objectIdCounter++,
        x: x,
        y: y,
        type: 'switch'
    };

    objects.push(switchObj);

    // Create Switch Shape (Group)
    const group = new Konva.Group({
        x: x,
        y: y,
        draggable: true,
        id: `switch-${switchObj.id}`
    });

    // Draw a switch symbol: a box with "SR" text or a schematic symbol
    // Requirement said: "logo of switch"
    // Let's make a small rectangle with a diagonal line to look like a switch

    // Main body (tiny connection box)
    const box = new Konva.Rect({
        x: -10,
        y: -10,
        width: 20,
        height: 20,
        fill: 'white',
        stroke: 'black',
        strokeWidth: 2
    });

    // Switch lever (open state)
    const lever = new Konva.Line({
        points: [-5, 5, 10, -10],
        stroke: 'black',
        strokeWidth: 2,
        lineCap: 'round'
    });

    // Label "SR"
    const text = new Konva.Text({
        x: -10,
        y: 12,
        text: 'SR',
        fontSize: 10,
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold',
        align: 'center',
        width: 20
    });

    group.add(box);
    group.add(lever);
    group.add(text);

    group.on('dragmove', () => {
        switchObj.x = group.x();
        switchObj.y = group.y();
        updateConnectionLines(switchObj.id);
    });

    layer.add(group);
    layer.draw();
    saveHistory();
    return group;
}

function recreateSwitch(switchData) {
    objects.push(switchData);

    const group = new Konva.Group({
        x: switchData.x,
        y: switchData.y,
        draggable: true,
        id: `switch-${switchData.id}`
    });

    const box = new Konva.Rect({
        x: -10,
        y: -10,
        width: 20,
        height: 20,
        fill: 'white',
        stroke: 'black',
        strokeWidth: 2
    });

    const lever = new Konva.Line({
        points: [-5, 5, 10, -10],
        stroke: 'black',
        strokeWidth: 2,
        lineCap: 'round'
    });

    const text = new Konva.Text({
        x: -10,
        y: 12,
        text: 'SR',
        fontSize: 10,
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold',
        align: 'center',
        width: 20
    });

    group.add(box);
    group.add(lever);
    group.add(text);

    group.on('dragmove', () => {
        switchData.x = group.x();
        switchData.y = group.y();
        updateConnectionLines(switchData.id);
    });

    layer.add(group);
    return group;
}

// ==========================================
// Text Tool Functions
// ==========================================
function createText(x, y, content) {
    // Create text object
    const textObj = {
        id: objectIdCounter++,
        x: x,
        y: y,
        type: 'text',
        content: content
    };

    objects.push(textObj);

    // Create Konva Text
    const textNode = new Konva.Text({
        x: x,
        y: y,
        text: content,
        fontSize: 16,
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold',
        draggable: true,
        id: `text-${textObj.id}`
    });

    textNode.on('dragmove', () => {
        textObj.x = textNode.x();
        textObj.y = textNode.y();
    });

    // Add transform event to update font size or scale
    textNode.on('transform', () => {
        // Reset scale and update font size properly
        const scaleX = textNode.scaleX();
        textNode.scaleX(1);
        textNode.scaleY(1);
        textNode.fontSize(textNode.fontSize() * scaleX);
        textObj.content = textNode.text(); // ensure content is up to date though transform doesn't change it
        // textObj store fontSize update? 
        // We simplified the objects array structure, maybe we should add properties like fontSize if we want persistence.
        // For now, let's just allow visual resizing.
    });

    // Add double-click/double-tap to edit
    textNode.on('dblclick dbltap', () => {
        editText(textObj, textNode);
    });

    // Add click to select/resize
    textNode.on('click tap', (e) => {
        // Prevent stage click processing
        e.cancelBubble = true;
        selectTextForResizing(textNode);
    });

    layer.add(textNode);
    layer.draw();
    saveHistory();
    return textNode;
}

// Global transformer for resizing
let resizeTransformer = new Konva.Transformer({
    nodes: [],
    enabledAnchors: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
    boundBoxFunc: function (oldBox, newBox) {
        newBox.width = Math.max(30, newBox.width);
        return newBox;
    },
});
layer.add(resizeTransformer);

function selectTextForResizing(textNode) {
    if (currentTool === 'delete') return; // Don't select if deleting
    resizeTransformer.nodes([textNode]);
    layer.draw();
}

function clearResizeSelection() {
    resizeTransformer.nodes([]);
    layer.draw();
}

function recreateText(textData) {
    objects.push(textData);

    const textNode = new Konva.Text({
        x: textData.x,
        y: textData.y,
        text: textData.content,
        fontSize: 16, // defaulting to 16 if not saved, ideally we should save fontSize
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold',
        draggable: true,
        id: `text-${textData.id}`
    });

    textNode.on('dragmove', () => {
        textData.x = textNode.x();
        textData.y = textNode.y();
    });

    textNode.on('transform', () => {
        const scaleX = textNode.scaleX();
        textNode.scaleX(1);
        textNode.scaleY(1);
        textNode.fontSize(textNode.fontSize() * scaleX);
    });

    // Add double-click/double-tap to edit
    textNode.on('dblclick dbltap', () => {
        editText(textData, textNode);
    });

    // Add click to select/resize
    textNode.on('click tap', (e) => {
        e.cancelBubble = true;
        selectTextForResizing(textNode);
    });

    layer.add(textNode);
    return textNode;
}

function editText(textObj, textNode) {
    // Hide text node and transformer while editing
    textNode.hide();
    resizeTransformer.nodes([]); // Deselect
    layer.draw();

    // Create textarea over the canvas
    const textPosition = textNode.absolutePosition();
    const areaPosition = {
        x: stage.container().getBoundingClientRect().left + textPosition.x,
        y: stage.container().getBoundingClientRect().top + textPosition.y,
    };

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    textarea.value = textObj.content;
    textarea.style.position = 'absolute';
    textarea.style.top = areaPosition.y + 'px';
    textarea.style.left = areaPosition.x + 'px';
    textarea.style.width = textNode.width() - textNode.padding() * 2 + 'px';
    textarea.style.height = textNode.height() - textNode.padding() * 2 + 5 + 'px';
    textarea.style.fontSize = textNode.fontSize() + 'px';
    textarea.style.border = 'none';
    textarea.style.padding = '0px';
    textarea.style.margin = '0px';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = textNode.lineHeight();
    textarea.style.fontFamily = textNode.fontFamily();
    textarea.style.transformOrigin = 'left top';
    textarea.style.textAlign = textNode.align();
    textarea.style.color = textNode.fill();
    textarea.style.fontWeight = 'bold';
    textarea.style.zIndex = '1000'; // Ensure it's on top

    rotation = textNode.rotation();
    var transform = '';
    if (rotation) {
        transform += 'rotateZ(' + rotation + 'deg)';
    }

    var px = 0;
    // also we need to slightly move textarea on firefox
    // because it jumps a bit
    var isFirefox =
        navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
    if (isFirefox) {
        px += 2 + Math.round(textNode.fontSize() / 20);
    }
    transform += 'translateY(-' + px + 'px)';

    textarea.style.transform = transform;

    // reset height
    textarea.style.height = 'auto';
    // after browsers resized it we can set actual value
    textarea.style.height = textarea.scrollHeight + 3 + 'px';

    textarea.focus();

    function removeTextarea() {
        if (!document.body.contains(textarea)) return;

        textarea.parentNode.removeChild(textarea);
        window.removeEventListener('click', handleOutsideClick);
        textNode.show();
        layer.draw();
    }

    function updateText() {
        textNode.text(textarea.value);
        textObj.content = textarea.value;
        saveHistory(); // Save state after edit
        layer.draw();
    }

    textarea.addEventListener('keydown', function (e) {
        // Shift+Enter for new line is default behavior of textarea, so we just check for Enter without Shift to submit?
        // User asked: "when i type enter while texting then it should got to the next line"
        // So Enter DOES NOT SUBMIT. Enter creates new line.
        // We submit by clicking outside.

        // Auto resize height
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });

    function handleOutsideClick(e) {
        if (e.target !== textarea) {
            updateText();
            removeTextarea();
        }
    }

    setTimeout(() => {
        window.addEventListener('click', handleOutsideClick);
    });
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
    let shape = layer.findOne(`#pole-${objectId}`);
    if (!shape) shape = layer.findOne(`#transformer-${objectId}`);
    if (!shape) shape = layer.findOne(`#switch-${objectId}`);
    if (!shape) shape = layer.findOne(`#text-${objectId}`);

    if (shape) {
        shape.remove();
    }

    // Find and remove all connections involving this object
    // Texts usually don't have connections in this app logic, but safety check
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
    if (currentTool === 'pan') {
        // Also possibly clear selection if clicking outside
        return;
    }

    // If clicking stage (background), clear resize selection
    if (e.target === stage) {
        clearResizeSelection();
    }

    // Handle placement modes
    if (currentTool === 'pole' || currentTool === 'transformer' || currentTool === 'text') {
        // Ignore clicks on shapes
        if (currentTool !== 'text' && e.target !== stage) return;

        // For text, we might want to allow editing if clicking existing text, but for now mostly placement
        if (currentTool === 'text' && e.target !== stage) return;

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
        } else if (currentTool === 'text') {
            // Check if clicking existing text is handled by dblclick
            // If we click empty space, create new text

            // Create textarea for new input
            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);

            textarea.style.position = 'absolute';
            textarea.style.top = `${pointer.y + container.offsetTop}px`;
            textarea.style.left = `${pointer.x + container.offsetLeft}px`;
            textarea.style.zIndex = '1000';
            textarea.style.fontWeight = 'bold';
            textarea.placeholder = 'Type text...';
            textarea.style.background = 'transparent'; // match style
            // textarea.style.border = '1px solid #ccc'; // minimal border to see it

            textarea.focus();

            function finishCreation() {
                if (!document.body.contains(textarea)) return;

                const val = textarea.value;
                if (val && val.trim() !== '') {
                    createText(pos.x, pos.y, val);
                }
                document.body.removeChild(textarea);
                window.removeEventListener('mousedown', handleOutside);
            }

            function handleOutside(e) {
                if (e.target !== textarea) {
                    finishCreation();
                }
            }

            // Wait a tick so the current click doesn't trigger handleOutside
            setTimeout(() => {
                window.addEventListener('mousedown', handleOutside);
            });

            textarea.addEventListener('keydown', function (e) {
                // Enter allows new line
                if (e.key === 'Escape') {
                    document.body.removeChild(textarea);
                    window.removeEventListener('mousedown', handleOutside);
                }
            });
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
        if (targetGroup instanceof Konva.Group) {
            const groupId = targetGroup.id();
            if (groupId.startsWith('pole-') || groupId.startsWith('switch-')) {
                targetId = groupId;
            }
        }

        for (let obj of objects) {
            const shapeId = obj.type === 'pole' ? `pole-${obj.id}` :
                obj.type === 'switch' ? `switch-${obj.id}` :
                    `transformer-${obj.id}`;
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
            if (targetGroup instanceof Konva.Group) {
                const groupId = targetGroup.id();
                if (groupId.startsWith('pole-') || groupId.startsWith('switch-')) {
                    highlightObject(targetGroup);
                } else {
                    highlightObject(clickedShape);
                }
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
            } else if (elementId.startsWith('switch-')) {
                idToDelete = parseInt(elementId.split('-')[1]);
            } else if (elementId.startsWith('text-')) {
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