// ==========================================
// Service Worker Registration & Update Logic
// ==========================================
if ('serviceWorker' in navigator) {
    let newWorker;
    let refreshing = false;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('Service Worker registered:', registration);

                // 1. Force check immediately
                registration.update();

                // 2. Check for updates every 10 seconds (more frequent to catch issues)
                setInterval(() => {
                    registration.update();
                    // Also check if a worker is waiting (in case we missed the event)
                    if (registration.waiting) {
                        showUpdateNotification(registration);
                    }
                }, 10 * 1000);

                // 3. Handle updates found
                registration.addEventListener('updatefound', () => {
                    newWorker = registration.installing;

                    newWorker.addEventListener('statechange', () => {
                        // Has network.state changed?
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New update available and installed (waiting)
                            showUpdateNotification(registration);
                        }
                    });
                });

                // 4. Handle waiting worker (if already updated in background)
                if (registration.waiting) {
                    showUpdateNotification(registration);
                }
            })
            .catch((error) => {
                console.log('Service Worker registration failed:', error);
            });
    });

    // Reload when the new service worker takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

function showUpdateNotification(registration) {
    // Check if notification already exists to avoid duplicates
    if (document.getElementById('update-overlay')) return;

    // Create blocking overlay
    const overlay = document.createElement('div');
    overlay.id = 'update-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.95)'; // Almost fully black backdrop
    overlay.style.zIndex = '20000'; // Highest z-index to block everything
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.backdropFilter = 'blur(5px)'; // Blur effect for background

    // Notification Box
    const toast = document.createElement('div');
    toast.style.backgroundColor = '#222';
    toast.style.color = 'white';
    toast.style.padding = '30px';
    toast.style.borderRadius = '16px';
    toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
    toast.style.textAlign = 'center';
    toast.style.maxWidth = '90%';
    toast.style.width = '360px'; // Slightly wider "board"
    toast.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Icon (optional but nice)
    const icon = document.createElement('div');
    icon.innerHTML = '🚀';
    icon.style.fontSize = '40px';
    icon.style.marginBottom = '15px';

    const title = document.createElement('h3');
    title.textContent = 'Update Required';
    title.style.margin = '0 0 10px 0';
    title.style.fontSize = '20px';
    title.style.fontWeight = '600';

    const text = document.createElement('p');
    text.textContent = 'A new version of the app is available. Please update to continue.';
    text.style.margin = '0 0 25px 0';
    text.style.fontSize = '14px';
    text.style.color = '#ccc';
    text.style.lineHeight = '1.5';

    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Update Now';
    refreshBtn.style.backgroundColor = '#007bff'; // Blue for primary action
    refreshBtn.style.color = 'white';
    refreshBtn.style.border = 'none';
    refreshBtn.style.padding = '12px 24px';
    refreshBtn.style.borderRadius = '8px';
    refreshBtn.style.cursor = 'pointer';
    refreshBtn.style.fontWeight = 'bold';
    refreshBtn.style.fontSize = '16px';
    refreshBtn.style.width = '100%';
    refreshBtn.style.transition = 'background 0.2s';
    refreshBtn.style.boxShadow = '0 4px 6px rgba(0,0,0,0.2)';

    refreshBtn.onmouseover = () => { refreshBtn.style.backgroundColor = '#0056b3'; };
    refreshBtn.onmouseout = () => { refreshBtn.style.backgroundColor = '#007bff'; };

    refreshBtn.onclick = () => {
        if (registration.waiting) {
            // Send message to waiting worker to skip waiting
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            refreshBtn.disabled = true;
            refreshBtn.textContent = 'Updating...';
            refreshBtn.style.opacity = '0.7';
            refreshBtn.style.cursor = 'wait';
        } else {
            window.location.reload();
        }
    };

    toast.appendChild(icon);
    toast.appendChild(title);
    toast.appendChild(text);
    toast.appendChild(refreshBtn);

    overlay.appendChild(toast);
    document.body.appendChild(overlay);
}

function showToast(message, duration = 1800) {
    const existingToast = document.getElementById('app-toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.left = '50%';
    toast.style.bottom = '92px';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
    toast.style.color = '#fff';
    toast.style.padding = '10px 14px';
    toast.style.borderRadius = '8px';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '600';
    toast.style.zIndex = '1500';
    toast.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.2s ease';
    toast.style.pointerEvents = 'none';

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    window.setTimeout(() => {
        toast.style.opacity = '0';
        window.setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 200);
    }, duration);
}

// ==========================================
// Global Variables
// ==========================================
const POLE_RADIUS = 20;
const POLE_COLOR = '#000000';
const TRANSFORMER_WIDTH = 60;
const TRANSFORMER_HEIGHT = 45;
const TRANSFORMER_COLOR = '#0066ff';
const HIGHLIGHT_STROKE = '#ff0000';
const HIGHLIGHT_STROKE_WIDTH = 2;
const CONNECTION_LINE_WIDTH = 3;

const CONNECTION_LINE_COLOR = '#000000';
const SWITCH_SIZE = 40;
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

// Auto-Save State
let currentFileId = null;
let currentFileName = null;

// Text resize transformer (initialized later after layer creation)
let resizeTransformer = null;

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
const MIN_ZOOM = 0.05; // Allow zooming out much further to see huge surveys
const MAX_ZOOM = 10.0; // Allow zooming in closer
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

function getRelativePointerPosition(node) {
    var transform = node.getAbsoluteTransform().copy();
    // to detect relative position we need to invert transform
    transform.invert();

    // get pointer (say mouse or touch) position
    var pos = node.getStage().getPointerPosition();

    // now we can find relative point
    return transform.point(pos);
}

let lastCenter = null;
let lastDist = 0;

// Multi-touch zoom (pinch) handling
// Multi-touch zoom (pinch) handling
stage.on('touchmove', function (e) {
    var touch1 = e.evt.touches[0];
    var touch2 = e.evt.touches[1];

    // Only process if 2 fingers
    if (touch1 && touch2) {
        e.evt.preventDefault(); // Prevent browser zoom

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

        var dist = getDistance(p1, p2);
        var newCenter = getCenter(p1, p2);

        if (!lastDist) {
            lastDist = dist;
            return;
        }

        // map the center point to the local coordinates
        var pointTo = {
            x: (newCenter.x - stage.x()) / stage.scaleX(),
            y: (newCenter.y - stage.y()) / stage.scaleX(),
        };

        var scale = stage.scaleX() * (dist / lastDist);

        // Limit scale
        scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));

        stage.scale({ x: scale, y: scale });

        // Calculate new position
        var newPos = {
            x: newCenter.x - pointTo.x * scale,
            y: newCenter.y - pointTo.y * scale,
        };

        stage.position(newPos);
        stage.batchDraw(); // Smoother drawing

        lastDist = dist;
    }
});

stage.on('touchend', function () {
    lastDist = 0;
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

const exportBtn = document.getElementById('exportBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFile');
const newPageBtn = document.getElementById('newPageBtn');
const startupOverlay = document.getElementById('startupOverlay');
const startupViewBtn = document.getElementById('startupViewBtn');
const startupNewBtn = document.getElementById('startupNewBtn');
const activeFileBadge = document.getElementById('activeFileBadge');

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
    updateTextInteractionState();
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
    updateTextInteractionState();
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
    updateTextInteractionState();
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
    updateTextInteractionState();
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
    updateTextInteractionState();
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
    updateTextInteractionState();
});

undoBtn.addEventListener('click', () => {
    undo();
});

redoBtn.addEventListener('click', () => {
    redo();
});

saveBtn.addEventListener('click', () => {
    if (!currentFileId) {
        showToast('No file selected. Please create or load a file first.');
        return;
    }

    autoSave();
    showToast(`Saved "${currentFileName}" successfully.`);
});



loadBtn.addEventListener('click', () => {
    loadFromLocalStorage();
});

exportBtn.addEventListener('click', () => {
    exportFile();
});

exportPdfBtn.addEventListener('click', () => {
    exportToPdf();
});

importBtn.addEventListener('click', () => {
    importFileInput.click();
});

importFileInput.addEventListener('change', (e) => {
    importFile(e);
});

newPageBtn.addEventListener('click', () => {
    createNewFile(); // Renamed to createNewFile
});

startupViewBtn.addEventListener('click', () => {
    loadFromLocalStorage({
        fromStartup: true,
        onLoaded: () => hideStartupOverlay()
    });
});

startupNewBtn.addEventListener('click', () => {
    createNewFile();
});

// Initialize button states
updateHistoryButtons();
showStartupOverlay();
updateActiveFileBadge();
updateTextInteractionState();

function showStartupOverlay() {
    if (!startupOverlay) return;
    startupOverlay.classList.remove('hidden');
}

function hideStartupOverlay() {
    if (!startupOverlay) return;
    startupOverlay.classList.add('hidden');
}

function updateActiveFileBadge() {
    if (!activeFileBadge) return;

    if (!currentFileId || !currentFileName) {
        activeFileBadge.textContent = 'Active: Not selected';
        return;
    }

    activeFileBadge.textContent = `Active: ${currentFileName}`;
}

function updateMaxPoleBadge() {
    const maxPoleBadge = document.getElementById('maxPoleBadge');
    if (!maxPoleBadge) return;

    // Get all existing poles
    const poles = objects.filter(obj => obj.type === 'pole');
    
    if (poles.length === 0) {
        maxPoleBadge.textContent = 'Max Pole: -';
        return;
    }

    // Find the maximum pole number
    const maxPoleNum = Math.max(...poles.map(p => p.poleNumber));
    maxPoleBadge.textContent = `Max Pole: ${maxPoleNum}`;
}

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

    // Trigger Auto-Save
    autoSave();
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
        updateMaxPoleBadge();
    }
}

function redo() {
    if (historyStep < history.length - 1) {
        historyStep++;
        loadState(history[historyStep]);
        clearSelection();
        updateHistoryButtons();
        updateMaxPoleBadge();
    }
}

function updateHistoryButtons() {
    undoBtn.disabled = historyStep <= 0;
    redoBtn.disabled = historyStep >= history.length - 1;
}

// ==========================================
// LocalStorage Functions for Auto-Save
// ==========================================
const STORAGE_KEY = 'electrical_surveys';

function autoSave() {
    if (!currentFileId) return; // Don't save if no file is open (shouldn't happen ideally if we force new page)

    // Get current surveys
    let surveys = [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        surveys = JSON.parse(stored);
    }

    // Find current survey
    const index = surveys.findIndex(s => s.id === currentFileId);

    const currentState = {
        id: currentFileId,
        name: currentFileName,
        date: new Date().toLocaleString(),
        objects: JSON.parse(JSON.stringify(objects)),
        connections: connections.map(conn => ({
            id: conn.id,
            from: conn.from,
            to: conn.to
        }))
    };

    if (index !== -1) {
        // Update existing
        surveys[index] = currentState;
    } else {
        // Create new (should have been created by newPage, but safety check)
        surveys.push(currentState);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
    console.log(`Auto-saved survey: ${currentFileName}`);
}

function renameFile() {
    if (!currentFileId) {
        alert('No file selected. Please create or load a file first.');
        return;
    }

    const newName = prompt('Enter new name for file:', currentFileName);
    if (newName === null) return; // Canceled

    const trimmedName = newName.trim();
    if (trimmedName === '') {
        alert('File name cannot be empty.');
        return;
    }

    // Update global state
    currentFileName = trimmedName;
    updateActiveFileBadge();

    // Update localStorage
    let surveys = [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        surveys = JSON.parse(stored);
    }

    // Find and update survey
    const index = surveys.findIndex(s => s.id === currentFileId);
    if (index !== -1) {
        surveys[index].name = currentFileName;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));
        alert(`File renamed to "${currentFileName}" successfully.`);
    } else {
        // If getting here, something is desynced, but let's just save as new entry or warn
        // Ideally autoSave will handle it
        autoSave();
        alert(`File renamed to "${currentFileName}" (re-saved).`);
    }
}


// ==========================================
// Export/Import Functions
// ==========================================
function exportFile() {
    if (!currentFileId) {
        alert('No file selected. Please create or load a file first.');
        return;
    }

    const surveyData = {
        meta: {
            app: 'Electrical Survey App',
            version: '1.1',
            exportedAt: new Date().toISOString()
        },
        survey: {
            id: currentFileId,
            name: currentFileName,
            date: new Date().toLocaleString(),
            objects: JSON.parse(JSON.stringify(objects)),
            connections: connections.map(conn => ({
                id: conn.id,
                from: conn.from,
                to: conn.to
            }))
        }
    };

    // Prepare export
    const json = JSON.stringify(surveyData, null, 2);
    const blob = new Blob([json], { type: 'text/plain' });
    const fileName = `${currentFileName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;

    let shareFailed = false;
    try {
        if (navigator.share && navigator.canShare) {
            const file = new File([blob], fileName, { type: 'text/plain' });
            const shareData = {
                files: [file],
                title: 'Shared Survey',
                text: `Sharing survey: ${currentFileName}`
            };

            if (navigator.canShare(shareData)) {
                navigator.share(shareData).catch(err => {
                    console.error('Share failed/cancelled:', err);
                    // Only fallback if it wasn't a user cancellation? 
                    // Actually, if user cancels share sheet, we probably shouldn't force download.
                    // But "not working" might mean share sheet didn't open.
                    // Let's just log it. If it was a real error, user might want download.
                    if (err.name !== 'AbortError') {
                        downloadFile(blob, fileName);
                    }
                });
            } else {
                shareFailed = true;
            }
        } else {
            shareFailed = true;
        }
    } catch (e) {
        console.warn('Share API error:', e);
        shareFailed = true;
    }

    if (shareFailed) {
        downloadFile(blob, fileName);
    }
}

function downloadFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Relaxed extension check for mobile compatibility
    if (!file.name.endsWith('.esurvey') && !file.name.endsWith('.json')) {
        if (!confirm(`The file "${file.name}" does not have a .esurvey or .json extension. Try to load it anyway?`)) {
            return;
        }
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            // Validation
            if (!data.meta || data.meta.app !== 'Electrical Survey App' || !data.survey) {
                throw new Error('Invalid survey file structure.');
            }

            const survey = data.survey;

            // Check for duplicate ID
            const stored = localStorage.getItem(STORAGE_KEY);
            let surveys = stored ? JSON.parse(stored) : [];

            if (surveys.some(s => s.id === survey.id)) {
                if (!confirm(`A survey with ID "${survey.id}" already exists. Do you want to overwrite it?`)) {
                    // Generate new ID if user doesn't want to overwrite? Or just cancel.
                    // Let's generate new ID to be safe and avoid conflict
                    if (confirm('Create as a copy instead?')) {
                        survey.id = Date.now();
                        survey.name = survey.name + ' (Copy)';
                    } else {
                        return;
                    }
                }
            }

            // Load logic similar to loadSurvey
            // 1. Save imported survey to localStorage
            const existingIndex = surveys.findIndex(s => s.id === survey.id);
            if (existingIndex !== -1) {
                surveys[existingIndex] = survey;
            } else {
                surveys.push(survey);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(surveys));

            // 2. Load it into workspace
            loadSurvey(survey);

            // Reset file input
            event.target.value = '';

        } catch (error) {
            console.error(error);
            alert('Error loading file: ' + error.message);
        }
    };
    reader.readAsText(file);

}

function exportToPdf() {
    if (!currentFileId) {
        alert('No file selected. Please create or load a file first.');
        return;
    }

    // Show progress popup and start smooth 4-second animation
    showProgress(0);
    startProgressAnimation();

    // Start PDF generation in background
    setTimeout(() => {
        generatePdfQuietly();
    }, 100);
}

function startProgressAnimation() {
    const totalDuration = 4000; // 4 seconds
    const updateInterval = 50; // Update every 50ms for smooth animation
    const steps = totalDuration / updateInterval;
    let currentStep = 0;

    const progressStages = [
        { percent: 0, message: 'Starting' },
        { percent: 10, message: 'Starting' },
        { percent: 30, message: 'Capturing canvas' },
        { percent: 60, message: 'Generating image' },
        { percent: 80, message: 'Creating PDF' },
        { percent: 100, message: 'Saving' }
    ];

    const progressInterval = setInterval(() => {
        currentStep++;
        const progress = (currentStep / steps) * 100;
        
        // Find current stage message
        let currentMessage = 'Starting';
        for (let i = progressStages.length - 1; i >= 0; i--) {
            if (progress >= progressStages[i].percent) {
                currentMessage = progressStages[i].message;
                break;
            }
        }
        
        updateProgress(Math.min(progress, 100), currentMessage);
        
        if (currentStep >= steps) {
            clearInterval(progressInterval);
            // Hide progress after animation completes
            setTimeout(() => {
                hideProgress();
            }, 300);
        }
    }, updateInterval);
}

function generatePdfQuietly() {
    // This runs silently while the progress animation plays

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    let yPos = 20;

    // Header
    doc.setFontSize(18);
    doc.text(currentFileName || 'Electrical Survey', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Meta Data
    doc.setFontSize(10);
    doc.text(`Date: ${new Date().toLocaleString()}`, margin, yPos);

    // Counts
    const poles = objects.filter(o => o.type === 'pole').length;
    const transformers = objects.filter(o => o.type === 'transformer').length;
    const switches = objects.filter(o => o.type === 'switch').length;

    doc.text(`Poles: ${poles}   |   Transformers: ${transformers}   |   Switches: ${switches}`, pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    // Divider
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Capture Full Canvas Context
    // 1. Save current view state
    const oldScale = stage.scaleX();
    const oldPos = stage.position();

    // 2. Reset view to standard 1:1 to calculate full bounds
    stage.scale({ x: 1, y: 1 });
    stage.position({ x: 0, y: 0 });
    stage.batchDraw(); // Force update needed for getClientRect? Usually not if we don't wait for frame, but let's be safe.

    // 3. Get bounds of all objects
    // Use layer.getClientRect to correct bounding box of all content
    // We add some padding
    const padding = 50;
    const rect = layer.getClientRect({
        skipTransform: false // We reset stage, so layer transform is identity. 
    });

    // Handle empty stage
    if (rect.width === 0 || rect.height === 0) {
        rect.x = 0;
        rect.y = 0;
        rect.width = stage.width();
        rect.height = stage.height();
    } else {
        // Add padding
        rect.x -= padding;
        rect.y -= padding;
        rect.width += padding * 2;
        rect.height += padding * 2;
    }

    // 4. Generate High-Res Image of the area
    // Use PNG to handle transparency correctly (JPEG turns transparent to black)
    const dataUrl = stage.toDataURL({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        pixelRatio: 2, // High resolution
        mimeType: 'image/png'
    });

    // 5. Restore view state immediately
    stage.scale({ x: oldScale, y: oldScale });
    stage.position(oldPos);
    stage.batchDraw();

    // Calculate aspect ratio to fit in PDF
    const imgProps = doc.getImageProperties(dataUrl);
    const pdfImgWidth = pageWidth - (margin * 2);
    const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;

    // Check if image height exceeds page
    // If so, scale down
    let finalWidth = pdfImgWidth;
    let finalHeight = pdfImgHeight;

    if (yPos + finalHeight > pageHeight - margin) {
        finalHeight = pageHeight - margin - yPos - 10; // -10 for footer space
        finalWidth = (imgProps.width * finalHeight) / imgProps.height;
    }

    // Centered Image
    const xPos = (pageWidth - finalWidth) / 2;
    doc.addImage(dataUrl, 'PNG', xPos, yPos, finalWidth, finalHeight);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text("Generated by Electrical Survey App", pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Save
    const safeName = (currentFileName || 'survey').replace(/[^a-z0-9]/gi, '_');
    doc.save(`${safeName}.pdf`);
    
    // PDF generation complete (progress animation handles the timing)
}

// Progress popup functions
function showProgress(percent) {
    const overlay = document.getElementById('progressOverlay');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (overlay) {
        overlay.classList.remove('hidden');
        progressBar.style.width = percent + '%';
        progressText.textContent = 'Starting...';
        resetProgressVisual();
    }
}

function updateProgress(percent, message) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    if (progressBar && progressText) {
        progressBar.style.width = percent + '%';
        progressText.textContent = message ? `${percent}% - ${message}` : percent + '%';
        updateProgressVisual(percent);
    }
}

function resetProgressVisual() {
    const components = ['progPole', 'progTransformer', 'progSR', 'progBus'];
    const lines = ['progLine1', 'progLine2', 'progLine3'];
    
    components.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active', 'completed');
        }
    });
    
    lines.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('active');
        }
    });
}

function updateProgressVisual(percent) {
    const pole = document.getElementById('progPole');
    const line1 = document.getElementById('progLine1');
    const transformer = document.getElementById('progTransformer');
    const line2 = document.getElementById('progLine2');
    const sr = document.getElementById('progSR');
    const line3 = document.getElementById('progLine3');
    const bus = document.getElementById('progBus');
    
    // Reset all first
    [pole, transformer, sr, bus].forEach(el => {
        if (el) el.classList.remove('active', 'completed');
    });
    [line1, line2, line3].forEach(el => {
        if (el) el.classList.remove('active');
    });
    
    // Animate based on progress
    if (percent >= 10) {
        pole?.classList.add('active');
    }
    if (percent >= 30) {
        pole?.classList.remove('active');
        pole?.classList.add('completed');
        line1?.classList.add('active');
        transformer?.classList.add('active');
    }
    if (percent >= 60) {
        transformer?.classList.remove('active');
        transformer?.classList.add('completed');
        line2?.classList.add('active');
        sr?.classList.add('active');
    }
    if (percent >= 80) {
        sr?.classList.remove('active');
        sr?.classList.add('completed');
        line3?.classList.add('active');
        bus?.classList.add('active');
    }
    if (percent >= 100) {
        bus?.classList.remove('active');
        bus?.classList.add('completed');
    }
}

function hideProgress() {
    const overlay = document.getElementById('progressOverlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Replaces saveToLocalStorage
function createNewFile() {
    const surveyName = prompt('Enter new survey name:');
    if (!surveyName || surveyName.trim() === '') {
        showToast('Survey name cannot be empty.');
        return false;
    }

    // Clear canvas and state
    clearCanvas();
    objects = [];
    connections = [];
    selectedObject = null;
    objectIdCounter = 0;
    poleCounter = null;
    connectionIdCounter = 0;

    // Initialize history
    history = [];
    historyStep = -1;
    updateHistoryButtons();

    // Set globals
    currentFileId = Date.now();
    currentFileName = surveyName.trim();
    updateActiveFileBadge();
    updateMaxPoleBadge();

    // Initial Save
    autoSave();

    hideStartupOverlay();
    showToast(`Started new survey: "${currentFileName}"`);

    return true;
}

function loadFromLocalStorage(options = {}) {
    // Get surveys from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        showToast('No saved surveys found.');
        return;
    }

    const surveys = JSON.parse(stored);
    if (surveys.length === 0) {
        showToast('No saved surveys found.');
        return;
    }

    // Create a custom modal for loading/deleting
    showLoadDialog(surveys, options);
}

function showLoadDialog(surveys, options = {}) {
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
            if (typeof options.onLoaded === 'function') {
                options.onLoaded(survey);
            }
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

        const renameBtn = document.createElement('button');
        renameBtn.innerHTML = '✎'; // Pencil icon
        renameBtn.title = "Rename Survey";
        renameBtn.style.padding = '5px 10px';
        renameBtn.style.cursor = 'pointer';
        renameBtn.style.backgroundColor = '#FF9800'; // Orange
        renameBtn.style.color = 'white';
        renameBtn.style.border = 'none';
        renameBtn.style.borderRadius = '3px';
        renameBtn.onclick = () => {
            const newName = prompt('Enter new name:', survey.name);
            if (newName && newName.trim() !== '') {
                // Update survey in storage
                let allSurveys = [];
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    allSurveys = JSON.parse(stored);
                }
                const sIndex = allSurveys.findIndex(s => s.id === survey.id);
                if (sIndex !== -1) {
                    allSurveys[sIndex].name = newName.trim();
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(allSurveys));

                    // If this is the current file, update currentFileName
                    if (currentFileId === survey.id) {
                        currentFileName = newName.trim();
                        updateActiveFileBadge();
                    }

                    // Refresh dialog
                    document.body.removeChild(dialog);
                    setTimeout(loadFromLocalStorage, 100);
                }
            }
        };

        actions.appendChild(loadBtn);
        actions.appendChild(renameBtn); // Add rename button
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
    closeBtn.onclick = () => {
        document.body.removeChild(dialog);
        if (typeof options.onClose === 'function') {
            options.onClose();
        }
    };
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
        } else if (obj.type === 'switch') {
            recreateSwitch(obj);
        } else if (obj.type === 'text') {
            recreateText(obj);
        }
    });

    // Recreate all connections
    survey.connections.forEach(connData => {
        recreateConnection(connData);
    });

    // Set current file context
    currentFileId = survey.id;
    currentFileName = survey.name;
    updateActiveFileBadge();
    updateMaxPoleBadge();

    layer.draw();

    // Reset history
    history = [];
    historyStep = -1;
    saveHistory();
    updateHistoryButtons();

    hideStartupOverlay();
    showToast(`Survey "${survey.name}" loaded successfully!`);
    currentTool = null;
}

// newPage function replaced by createNewFile above


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
// Get next available pole ID (reuses deleted IDs within the current range, or continues sequentially)
function getNextAvailablePoleId() {
    // Get all existing pole numbers
    const existingPoleNumbers = objects
        .filter(obj => obj.type === 'pole')
        .map(obj => obj.poleNumber)
        .sort((a, b) => a - b);
    
    // If no poles exist, start with 1
    if (existingPoleNumbers.length === 0) {
        return 1;
    }
    
    const minPole = existingPoleNumbers[0];
    const maxPole = existingPoleNumbers[existingPoleNumbers.length - 1];
    
    // Look for gaps within the existing range (between min and max)
    for (let i = minPole; i < maxPole; i++) {
        if (!existingPoleNumbers.includes(i)) {
            return i; // Found a gap within the range, reuse it
        }
    }
    
    // No gaps within the range, continue sequentially after the max pole
    return maxPole + 1;
}

function createPole(x, y) {
    // Check if there are any existing poles
    const existingPoles = objects.filter(obj => obj.type === 'pole');
    
    // Only prompt for starting pole number if this is truly the FIRST pole
    if (existingPoles.length === 0 && poleCounter === null) {
        const input = prompt("Enter starting pole number:", "1");
        if (input === null) return; // Cancelled
        poleCounter = parseInt(input);
        if (isNaN(poleCounter)) poleCounter = 1;
    }

    // Determine pole number:
    // - If this is the first pole and user set a custom starting number, use it
    // - Otherwise, always find/reuse deleted pole numbers
    let currentPoleNum;
    
    if (existingPoles.length === 0) {
        // First pole - use the custom starting number set by user (or 1 by default)
        currentPoleNum = poleCounter;
        poleCounter++; // Increment for next pole
    } else {
        // Poles already exist - always find next available (fills gaps first, then continues)
        currentPoleNum = getNextAvailablePoleId();
    }

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
        x: 24,
        y: -28,
        text: currentPoleNum.toString(),
        fontSize: 28,
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

    group.on('dragend', () => {
        pole.x = group.x();
        pole.y = group.y();
        autoSave();
    });

    // Add group to layer
    layer.add(group);
    layer.draw();

    saveHistory();
    updateMaxPoleBadge();
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
        x: 24,
        y: -28,
        text: (poleData.poleNumber || "").toString(),
        fontSize: 28,
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

    group.on('dragend', () => {
        poleData.x = group.x();
        poleData.y = group.y();
        autoSave();
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

    rect.on('dragend', () => {
        transformer.x = rect.x() + TRANSFORMER_WIDTH / 2;
        transformer.y = rect.y() + TRANSFORMER_HEIGHT / 2;
        autoSave();
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

    rect.on('dragend', () => {
        transformerData.x = rect.x() + TRANSFORMER_WIDTH / 2;
        transformerData.y = rect.y() + TRANSFORMER_HEIGHT / 2;
        autoSave();
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
        x = lastPole.x + 60;
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
        type: 'switch',
        serialNumber: '',
        rrNumber: ''
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
        x: -SWITCH_SIZE / 2,
        y: -SWITCH_SIZE / 2,
        width: SWITCH_SIZE,
        height: SWITCH_SIZE,
        fill: 'white',
        stroke: 'black',
        strokeWidth: 2
    });

    // Switch lever (open state)
    const lever = new Konva.Line({
        points: [-10, 10, 20, -20],
        stroke: 'black',
        strokeWidth: 2,
        lineCap: 'round'
    });

    // Label "SR"
    const text = new Konva.Text({
        x: -SWITCH_SIZE / 2,
        y: 24,
        text: 'SR',
        fontSize: 20,
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold',
        align: 'center',
        width: SWITCH_SIZE
    });

    // Info text (for serial and RR numbers) - above the switch - HIDDEN BY DEFAULT
    const infoText = new Konva.Text({
        x: -120,
        y: -75,
        text: '',
        fontSize: 28,
        fontFamily: 'Arial',
        fill: '#007bff',
        align: 'center',
        width: 240,
        visible: false, // Hidden by default
        listening: true,
        perfectDrawEnabled: false
    });

    group.add(box);
    group.add(lever);
    group.add(text);
    group.add(infoText);

    // Store reference to track selection state
    group.switchData = switchObj;
    group.infoText = infoText;

    // Click/tap handler: in delete mode, delete SR; otherwise open/show details
    const handleSwitchInteraction = (e) => {
        e.cancelBubble = true; // Prevent canvas click

        if (currentTool === 'delete') {
            deleteObject(switchObj.id);
            return;
        }

        if (switchObj.serialNumber || switchObj.rrNumber) {
            // Has data: show the text
            infoText.visible(true);
            layer.draw();
        } else {
            // No data yet: open dialog immediately
            openSwitchDetailsDialog(switchObj, infoText, group, layer);
        }
    };

    group.on('click', handleSwitchInteraction);
    group.on('tap', handleSwitchInteraction);

    // Click/tap on displayed text to edit (or delete in delete mode)
    const handleSwitchInfoInteraction = (e) => {
        e.cancelBubble = true;

        if (currentTool === 'delete') {
            deleteObject(switchObj.id);
            return;
        }

        openSwitchDetailsDialog(switchObj, infoText, group, layer);
    };

    infoText.on('click', handleSwitchInfoInteraction);
    infoText.on('tap', handleSwitchInfoInteraction);

    group.on('dragmove', () => {
        switchObj.x = group.x();
        switchObj.y = group.y();
        updateConnectionLines(switchObj.id);
    });

    group.on('dragend', () => {
        switchObj.x = group.x();
        switchObj.y = group.y();
        autoSave();
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
        x: -SWITCH_SIZE / 2,
        y: -SWITCH_SIZE / 2,
        width: SWITCH_SIZE,
        height: SWITCH_SIZE,
        fill: 'white',
        stroke: 'black',
        strokeWidth: 2
    });

    const lever = new Konva.Line({
        points: [-10, 10, 20, -20],
        stroke: 'black',
        strokeWidth: 2,
        lineCap: 'round'
    });

    const text = new Konva.Text({
        x: -SWITCH_SIZE / 2,
        y: 24,
        text: 'SR',
        fontSize: 20,
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold',
        align: 'center',
        width: SWITCH_SIZE
    });

    // Info text (for serial and RR numbers) - above the switch - HIDDEN BY DEFAULT
    const infoText = new Konva.Text({
        x: -120,
        y: -75,
        text: switchData.serialNumber || switchData.rrNumber 
            ? `Serial: ${switchData.serialNumber || 'N/A'}\nRR: ${switchData.rrNumber || 'N/A'}`
            : '',
        fontSize: 28,
        fontFamily: 'Arial',
        fill: '#007bff',
        align: 'center',
        width: 240,
        visible: false, // Hidden by default
        listening: true,
        perfectDrawEnabled: false
    });

    group.add(box);
    group.add(lever);
    group.add(text);
    group.add(infoText);

    // Store reference to track selection state
    group.switchData = switchData;
    group.infoText = infoText;

    // Click/tap handler: in delete mode, delete SR; otherwise open/show details
    const handleSwitchInteraction = (e) => {
        e.cancelBubble = true;

        if (currentTool === 'delete') {
            deleteObject(switchData.id);
            return;
        }

        if (switchData.serialNumber || switchData.rrNumber) {
            // Has data: show the text
            infoText.visible(true);
            layer.draw();
        } else {
            // No data yet: open dialog immediately
            openSwitchDetailsDialog(switchData, infoText, group, layer);
        }
    };

    group.on('click', handleSwitchInteraction);
    group.on('tap', handleSwitchInteraction);

    // Click/tap on displayed text to edit (or delete in delete mode)
    const handleSwitchInfoInteraction = (e) => {
        e.cancelBubble = true;

        if (currentTool === 'delete') {
            deleteObject(switchData.id);
            return;
        }

        openSwitchDetailsDialog(switchData, infoText, group, layer);
    };

    infoText.on('click', handleSwitchInfoInteraction);
    infoText.on('tap', handleSwitchInfoInteraction);

    group.on('dragmove', () => {
        switchData.x = group.x();
        switchData.y = group.y();
        updateConnectionLines(switchData.id);
    });

    group.on('dragend', () => {
        switchData.x = group.x();
        switchData.y = group.y();
        autoSave();
    });

    layer.add(group);
    return group;
}

// Switch Details Dialog
function openSwitchDetailsDialog(switchObj, infoText, group, layer) {
    const currentSerial = switchObj.serialNumber || '';
    const currentRR = switchObj.rrNumber || '';
    
    // Create dialog HTML
    const dialogHTML = `
        <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            z-index: 3000;
            min-width: 300px;
            font-family: Arial, sans-serif;
        " id="switchDialog">
            <h3 style="margin: 0 0 20px 0; color: #333;">SR Details</h3>
            
            <div style="margin-bottom: 16px;">
                <label style="display: block; margin-bottom: 6px; color: #666; font-size: 14px;">Serial Number</label>
                <input 
                    type="text" 
                    id="serialNumberInput" 
                    value="${currentSerial}"
                    placeholder="Enter serial number"
                    style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        font-size: 14px;
                        box-sizing: border-box;
                    "
                />
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 6px; color: #666; font-size: 14px;">RR Number</label>
                <input 
                    type="text" 
                    id="rrNumberInput" 
                    value="${currentRR}"
                    placeholder="Enter RR number"
                    style="
                        width: 100%;
                        padding: 8px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        font-size: 14px;
                        box-sizing: border-box;
                    "
                />
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button id="saveSwitchBtn" style="
                    flex: 1;
                    padding: 10px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                ">Save</button>
                <button id="cancelSwitchBtn" style="
                    flex: 1;
                    padding: 10px;
                    background: #ddd;
                    color: #333;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                ">Cancel</button>
            </div>
        </div>
        <div id="switchDialogOverlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 2999;
        "></div>
    `;
    
    // Remove any existing dialog
    const existingDialog = document.getElementById('switchDialog');
    if (existingDialog) existingDialog.remove();
    const existingOverlay = document.getElementById('switchDialogOverlay');
    if (existingOverlay) existingOverlay.remove();
    
    // Add dialog to page
    document.body.insertAdjacentHTML('beforeend', dialogHTML);
    
    // Focus on first input
    document.getElementById('serialNumberInput').focus();
    
    // Save handler
    document.getElementById('saveSwitchBtn').onclick = () => {
        const serial = document.getElementById('serialNumberInput').value;
        const rr = document.getElementById('rrNumberInput').value;
        
        // Update switch object
        switchObj.serialNumber = serial;
        switchObj.rrNumber = rr;
        
        // Update info text display
        if (serial || rr) {
            infoText.text(`Serial: ${serial || 'N/A'}\nRR: ${rr || 'N/A'}`);
            infoText.visible(true); // Show text after saving
        } else {
            infoText.text('');
            infoText.visible(false); // Hide if no data
        }
        
        layer.draw();
        
        // Close dialog
        closeSwitchDialog();
        
        // Save history
        autoSave();
    };
    
    // Cancel handler - hide text when closing without saving
    document.getElementById('cancelSwitchBtn').onclick = () => {
        infoText.visible(false);
        layer.draw();
        closeSwitchDialog();
    };
    
    // Close on overlay click - hide text
    document.getElementById('switchDialogOverlay').onclick = () => {
        infoText.visible(false);
        layer.draw();
        closeSwitchDialog();
    };
}

function closeSwitchDialog() {
    const dialog = document.getElementById('switchDialog');
    const overlay = document.getElementById('switchDialogOverlay');
    if (dialog) dialog.remove();
    if (overlay) overlay.remove();
}

// Hide all switch info text globally (stored in objects array)
function hideAllSwitchInfoText() {
    // Find all switch groups and hide their info text
    const allChildren = layer.getChildren();
    allChildren.forEach(group => {
        if (group.id && group.id().startsWith('switch-')) {
            if (group.infoText) {
                group.infoText.visible(false);
            }
        }
    });
    layer.draw();
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
        content: content,
        fontSize: 35,
        width: 160
    };

    objects.push(textObj);

    // Create Konva Text
    const textNode = new Konva.Text({
        x: x,
        y: y,
        text: content,
        fontSize: textObj.fontSize,
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold',
        draggable: currentTool === 'text',
        width: textObj.width,
        id: `text-${textObj.id}`,
        listening: true,
        perfectDrawEnabled: false,
        hitStrokeWidth: 0
    });

    textNode.on('dragmove', () => {
        textObj.x = textNode.x();
        textObj.y = textNode.y();
    });

    textNode.on('dragend', () => {
        textObj.x = textNode.x();
        textObj.y = textNode.y();
        autoSave();
    });

    // Resize text box and text together
    textNode.on('transform', () => {
        const scaleX = textNode.scaleX();
        const scaleY = textNode.scaleY();

        const newWidth = Math.max(40, textNode.width() * scaleX);
        const textScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
        const newFontSize = Math.max(8, textNode.fontSize() * textScale);

        textNode.width(newWidth);
        textNode.fontSize(newFontSize);
        textNode.scaleX(1);
        textNode.scaleY(1);

        textObj.x = textNode.x();
        textObj.y = textNode.y();
        textObj.width = newWidth;
        textObj.fontSize = newFontSize;
        textObj.content = textNode.text();
    });

    textNode.on('transformend', () => {
        autoSave();
        saveHistory();
    });

    // Add double-click/double-tap to edit
    textNode.on('dblclick dbltap', () => {
        if (currentTool !== 'text') return;
        editText(textObj, textNode);
    });

    // Add click/tap to select for resizing
    textNode.on('click', (e) => {
        if (currentTool !== 'text') return;
        console.log('Text node clicked (desktop):', textObj.id);
        e.cancelBubble = true;
        selectTextForResizing(textNode);
    });

    textNode.on('tap', (e) => {
        if (currentTool !== 'text') return;
        console.log('Text node tapped (mobile):', textObj.id);
        e.cancelBubble = true;
        selectTextForResizing(textNode);
    });

    layer.add(textNode);
    layer.draw();
    saveHistory();
    return textNode;
}

// Global transformer for resizing
resizeTransformer = new Konva.Transformer({
    nodes: [],
    enabledAnchors: ['middle-left', 'middle-right'],
    anchorSize: 34,
    anchorCornerRadius: 12,
    anchorStroke: '#0f172a',
    anchorFill: '#ffffff',
    anchorStrokeWidth: 2,
    borderStroke: '#22c55e',
    borderDash: [3, 3],
    keepRatio: false,
    rotateEnabled: false,
    padding: 10,
    anchorStyleFunc: function (anchor) {
        if (anchor.hasName('middle-left')) {
            anchor.fill('#22c55e');
            anchor.stroke('#15803d');
        }

        if (anchor.hasName('middle-right')) {
            anchor.fill('#f59e0b');
            anchor.stroke('#b45309');
        }
    },
    boundBoxFunc: function (oldBox, newBox) {
        newBox.width = Math.max(30, newBox.width);
        newBox.height = Math.max(20, newBox.height);
        return newBox;
    },
});
layer.add(resizeTransformer);

function selectTextForResizing(textNode) {
    if (currentTool !== 'text') {
        console.log('selectTextForResizing blocked: not in text mode');
        return;
    }
    if (!resizeTransformer) {
        console.log('selectTextForResizing blocked: no transformer');
        return;
    }
    console.log('Selecting text for resizing:', textNode.id());
    resizeTransformer.nodes([textNode]);
    resizeTransformer.forceUpdate();
    layer.draw();
}

function clearResizeSelection() {
    if (!resizeTransformer) return;
    resizeTransformer.nodes([]);
    layer.draw();
}

function recreateText(textData) {
    objects.push(textData);

    const textNode = new Konva.Text({
        x: textData.x,
        y: textData.y,
        text: textData.content,
        fontSize: textData.fontSize || 35,
        fontFamily: 'Arial',
        fill: 'black',
        fontStyle: 'bold',
        draggable: currentTool === 'text',
        width: textData.width || 160,
        id: `text-${textData.id}`,
        listening: true,
        perfectDrawEnabled: false,
        hitStrokeWidth: 0
    });

    textNode.on('dragmove', () => {
        textData.x = textNode.x();
        textData.y = textNode.y();
    });

    textNode.on('transform', () => {
        const scaleX = textNode.scaleX();
        const scaleY = textNode.scaleY();

        const newWidth = Math.max(40, textNode.width() * scaleX);
        const textScale = Math.max(Math.abs(scaleX), Math.abs(scaleY));
        const newFontSize = Math.max(8, textNode.fontSize() * textScale);

        textNode.width(newWidth);
        textNode.fontSize(newFontSize);
        textNode.scaleX(1);
        textNode.scaleY(1);

        textData.x = textNode.x();
        textData.y = textNode.y();
        textData.width = newWidth;
        textData.fontSize = newFontSize;
    });

    textNode.on('transformend', () => {
        autoSave();
        saveHistory();
    });

    // Add double-click/double-tap to edit
    textNode.on('dblclick dbltap', () => {
        if (currentTool !== 'text') return;
        editText(textData, textNode);
    });

    // Add click/tap to select for resizing
    textNode.on('click', (e) => {
        if (currentTool !== 'text') return;
        console.log('Text node clicked (desktop):', textData.id);
        e.cancelBubble = true;
        selectTextForResizing(textNode);
    });

    textNode.on('tap', (e) => {
        if (currentTool !== 'text') return;
        console.log('Text node tapped (mobile):', textData.id);
        e.cancelBubble = true;
        selectTextForResizing(textNode);
    });

    layer.add(textNode);
    return textNode;
}

function editText(textObj, textNode) {
    if (currentTool !== 'text') return;

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

    // Adjust for stage scale
    const stageScale = stage.scaleX();

    textarea.value = textObj.content;
    textarea.style.position = 'absolute';
    textarea.style.top = areaPosition.y + 'px';
    textarea.style.left = areaPosition.x + 'px';

    // Scale dimensions and font to match zoom level
    textarea.style.width = (textNode.width() - textNode.padding() * 2) * stageScale + 'px';
    textarea.style.height = (textNode.height() - textNode.padding() * 2 + 5) * stageScale + 'px';
    textarea.style.fontSize = (textNode.fontSize() * stageScale) + 'px';
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
        textObj.width = textNode.width();
        textObj.fontSize = textNode.fontSize();
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

function updateTextInteractionState() {
    const isTextMode = currentTool === 'text';

    // Disable stage dragging in text mode so text nodes can receive clicks
    stage.draggable(!isTextMode);

    if (!isTextMode) {
        clearResizeSelection();
    }

    objects.forEach((obj) => {
        if (obj.type !== 'text') return;
        const textNode = layer.findOne(`#text-${obj.id}`);
        if (textNode) {
            textNode.draggable(isTextMode);
        }
    });

    layer.draw();
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
    updateMaxPoleBadge();
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
        // Clear all switch selections and hide their info text
        hideAllSwitchInfoText();
        return;
    }

    if (!currentFileId) {
        showStartupOverlay();
        showToast('Start with New or View first.');
        return;
    }

    // If clicking stage (background), clear resize selection and hide switch info
    if (e.target === stage) {
        clearResizeSelection();
        hideAllSwitchInfoText();
    }

    // Handle placement modes
    if (currentTool === 'pole' || currentTool === 'transformer' || currentTool === 'text') {
        // Ignore clicks on shapes for pole/transformer
        if (currentTool !== 'text' && e.target !== stage) return;

        // Get click position
        const pointer = stage.getPointerPosition();
        // Use helper function for accurate coordinates
        const pos = getRelativePointerPosition(stage);

        console.log('Click on stage:', { pointer, stagePos: stage.position(), scale: stage.scaleX(), result: pos });

        // Create appropriate object based on active tool
        if (currentTool === 'pole') {
            createPole(pos.x, pos.y);
        } else if (currentTool === 'transformer') {
            createTransformer(pos.x, pos.y);
        } else if (currentTool === 'text') {
            // Only create new text if clicking stage (blank area)
            // Clicking existing text is handled by text node events
            if (e.target !== stage) return;

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

        // Handle grouped objects (Pole/Switch)
        const parentGroup = clickedElement.getParent();
        if (parentGroup instanceof Konva.Group) {
            const groupId = parentGroup.id();
            if (groupId && (groupId.startsWith('pole-') || groupId.startsWith('switch-'))) {
                elementId = groupId;
            }
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

            if (elementId && elementId.startsWith('pole-')) {
                idToDelete = parseInt(elementId.split('-')[1]);
            } else if (elementId && elementId.startsWith('transformer-')) {
                idToDelete = parseInt(elementId.split('-')[1]);
            } else if (elementId && elementId.startsWith('switch-')) {
                idToDelete = parseInt(elementId.split('-')[1]);
            } else if (elementId && elementId.startsWith('text-')) {
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