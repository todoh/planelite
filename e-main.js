import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, get, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// --- ¡NUEVAS IMPORTACIONES DE STORAGE! ---
import { getStorage, ref as storageRef, listAll, getDownloadURL, uploadBytes, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


// Importar el módulo de entidades
import * as Entidades from './e-entidades.js';
// Importar la caché de imágenes
import { imageCache } from './e-entidades.js';
// Importamos la función para construir la URL desde el archivo de constantes del juego.
import { getFirebaseStorageUrl } from './constantes.js';
// --- Configuración de Firebase (Variables Globales) ---
let db;
let auth;
let storage; // ¡NUEVO! Variable para Firebase Storage
let mapIdList = []; 
let currentMapId = 'map_001'; 

const firebaseConfig = {
    apiKey: "AIzaSyAfK_AOq-Pc2bzgXEzIEZ1ESWvnhMJUvwI",
    authDomain: "enraya-51670.firebaseapp.com",
    databaseURL: "https://enraya-51670-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "enraya-51670",
    storageBucket: "enraya-51670.firebasestorage.app",
    messagingSenderId: "103343380727",
    appId: "1:103343380727:web:b2fa02aee03c9506915bf2",
    measurementId: "G-2G31LLJY1T"
};

// --- Configuración del Canvas y Editor (Sin cambios) ---
const canvas = document.getElementById('editor-canvas');
const ctx = canvas.getContext('2d');
const coordsDisplay = document.getElementById('coords');
let GRID_WIDTH = 20;
let GRID_HEIGHT = 20;
let CELL_WIDTH = canvas.width / GRID_WIDTH;
let CELL_HEIGHT = canvas.height / GRID_HEIGHT;
const GRID_LINE_COLOR = "#718096";
let cameraZoom = 1;
let cameraOffset = { x: 0, y: 0 };
let isPanning = false;
let lastPanPoint = { x: 0, y: 0 };
const MAX_ZOOM = 8;
const MIN_ZOOM = 0.2;
let zoomDisplay; 
let localMapData = {
    width: 0,
    height: 0,
    tileGrid: [],
    startPosition: null
};
let currentTool = { type: 'ground', id: 'grass' };
let activeToolButton = null;
let isPainting = false;
let brushSize = 1;
let lastPaintCoords = { x: -1, z: -1 }; 
let currentPaintHeight = 1.0; 
let paintHeightInput;

// --- Elementos del DOM (Principales - Sin cambios) ---
const groundToolsContainer = document.getElementById('ground-tools');
const entityToolsContainer = document.getElementById('entity-tools');
const portalToolsContainer = document.getElementById('portal-tools');
const blockToolsContainer = document.getElementById('block-tools'); 
const saveMapButton = document.getElementById('save-map-button');
const loadMapButton = document.getElementById('load-map-button');
const newMapButton = document.getElementById('new-map-button');
const mapIdInput = document.getElementById('map-id');
const newWidthInput = document.getElementById('new-width');
const newHeightInput = document.getElementById('new-height');
const mapListContainer = document.getElementById('map-list');
const loadingIndicator = document.getElementById('loading-indicator');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
const brushSizeSelect = document.getElementById('brush-size-select');
let leftColumn, centerColumn, rightColumn;
let toggleLeftButton, toggleRightButton;
let zoomInButton, zoomOutButton;

// --- ¡NUEVO! Elementos del DOM (Gestor de Imágenes) ---
let imageManagerModal, closeImageManagerBtn, imageUploadInput, imageUploadButton, imageGallery, imageManagerError;
let currentTargetInputId = null; // Guarda el ID del input (ej: "def-imgSrc") que abrió el gestor
// ¡NUEVO!
let imgMgrTabStorage, imgMgrTabSvg, imgMgrTabModel;
let imgMgrContentStorage, imgMgrContentSvg, imgMgrContentModel;
let svgIdInput, svgDataTextarea, svgSaveButton, svgGallery;
// --- ¡NUEVO (GLTF)! ---
let modelUploadInput, modelUploadButton, modelGallery;


// --- Funciones de UI (Notificación y Carga - Sin cambios) ---

function showNotification(message, isError = false) {
    if (!notificationMessage || !notification) return;
    notificationMessage.textContent = message;
    notification.className = `fixed top-5 right-5 text-white px-6 py-3 rounded-lg shadow-lg transition-all duration-300 z-[200] ${isError ? 'bg-red-500' : 'bg-green-500'}`;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function showLoading() {
    if (loadingIndicator) loadingIndicator.style.display = 'flex';
}

function hideLoading() {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

// --- Funciones del Editor (Canvas y Herramientas) ---

function initLocalGrid(width, height) {
    localMapData.width = width;
    localMapData.height = height; 
    localMapData.startPosition = null;
    localMapData.tileGrid = [];
    GRID_WIDTH = width;
    GRID_HEIGHT = height;
    CELL_WIDTH = canvas.width / GRID_WIDTH;
    CELL_HEIGHT = canvas.height / GRID_HEIGHT;
    
    const defaultTile = { g: 'grass', e: 'none', h: 1.0 }; 

    for (let z = 0; z < height; z++) {
        const row = [];
        for (let x = 0; x < width; x++) {
            row.push({ ...defaultTile });
        }
        localMapData.tileGrid.push(row);
    }
    
    resetCamera();
    drawGrid();
}

function drawGrid() {
    // 1. Limpiar (¡sin transformación!)
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // 2. Aplicar transformación de la cámara
    ctx.save();
    ctx.translate(cameraOffset.x, cameraOffset.y);
    ctx.scale(cameraZoom, cameraZoom);

    // --- Inicio del dibujado ---
    
    ctx.font = `${Math.min(CELL_WIDTH, CELL_HEIGHT) * 0.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (!localMapData.tileGrid || localMapData.height === 0) {
         ctx.restore(); 
         return;
    }
    
    const voidDef = (Entidades.localGroundTypes && Entidades.localGroundTypes['void']) 
        ? Entidades.localGroundTypes['void'] 
        : { id: 'void', color: '#111' };

    for (let z = 0; z < localMapData.height; z++) {
        for (let x = 0; x < localMapData.width; x++) {
            const cell = localMapData.tileGrid[z][x];
            
            // --- 1. Dibujar Suelo (Imagen o Color) ---
            const groundDef = Entidades.localGroundTypes[cell.g] || voidDef;
            
            // 1. Obtener el nombre del archivo
            const groundFileName = groundDef.imgSrcTop;
            // 2. ¡MODIFICADO! Convertir a URL o usar clave SVG
            const groundStorageKey = groundFileName ? (groundFileName.startsWith('svg:') ? groundFileName : getFirebaseStorageUrl(groundFileName)) : null;
            // 3. Buscar en caché con la URL/Clave
            const groundImg = groundStorageKey ? imageCache[groundStorageKey] : null;
            
            if (groundImg && groundImg.complete && groundImg.width > 0) {
                ctx.drawImage(groundImg, x * CELL_WIDTH, z * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
            } else {
                ctx.fillStyle = groundDef.color || '#FF00FF';
                ctx.fillRect(x * CELL_WIDTH, z * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
            }
            
            // --- 2. Dibujar Rejilla ---
            ctx.strokeStyle = GRID_LINE_COLOR;
            ctx.strokeRect(x * CELL_WIDTH, z * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
            
            // --- 3. Dibujar Altura ---
            const height = cell.h || 0; 
            if (height !== 1.0) { 
                ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                ctx.fillText(height.toFixed(1), (x + 0.5) * CELL_WIDTH, (z + 0.25) * CELL_HEIGHT);
            }

            // --- 4. Dibujar Posición Inicial (Debajo de entidades) ---
             if (localMapData.startPosition && localMapData.startPosition.x === x && localMapData.startPosition.z === z) {
                ctx.fillStyle = 'black';
                ctx.fillText(Entidades.START_POS_SYMBOL, (x + 0.5) * CELL_WIDTH + 1, (z + 0.65) * CELL_HEIGHT + 1);
                ctx.fillStyle = 'white';
                ctx.fillText(Entidades.START_POS_SYMBOL, (x + 0.5) * CELL_WIDTH, (z + 0.65) * CELL_HEIGHT);
            }

            // --- 5. Dibujar Entidad/Bloque/Portal (Imagen o Símbolo) ---
            const elementId = (typeof cell.e === 'object' && cell.e !== null) ? cell.e.id : cell.e;
            
            const entityDef = Entidades.localEntityTypes[elementId]; 
            const portalDef = Entidades.localPortalTypes[elementId];
            const blockDef = Entidades.localBlockTypes[elementId]; 
            
            const def = entityDef || portalDef || blockDef;
            
            if (def && def.id !== 'none') {
                
                // --- ¡NUEVO (GLTF)! ---
                // Si es un modelo GLB, mostrar un símbolo placeholder '📦'
                if (def.renderStyle === 'gltf' && def.modelSrc) {
                    ctx.fillStyle = 'black';
                    ctx.fillText('📦', (x + 0.5) * CELL_WIDTH + 1, (z + 0.65) * CELL_HEIGHT + 1);
                    ctx.fillStyle = 'white';
                    ctx.fillText('📦', (x + 0.5) * CELL_WIDTH, (z + 0.65) * CELL_HEIGHT);
                } else {
                    // Lógica existente para Sprites (SVG o PNG)
                    const entityFileName = def.imgSrc;
                    const entityStorageKey = entityFileName ? (entityFileName.startsWith('svg:') ? entityFileName : getFirebaseStorageUrl(entityFileName)) : null;
                    const entityImg = entityStorageKey ? imageCache[entityStorageKey] : null;
    
                    if (entityImg && entityImg.complete && entityImg.width > 0) {
                        ctx.drawImage(entityImg, x * CELL_WIDTH, z * CELL_HEIGHT, CELL_WIDTH, CELL_HEIGHT);
                    } else {
                        const symbol = def.symbol || '?';
                        ctx.fillStyle = 'black';
                        ctx.fillText(symbol, (x + 0.5) * CELL_WIDTH + 1, (z + 0.65) * CELL_HEIGHT + 1);
                        ctx.fillStyle = 'white';
                        ctx.fillText(symbol, (x + 0.5) * CELL_WIDTH, (z + 0.65) * CELL_HEIGHT);
                    }
                }
            }
        }
    }

    // --- Dibujar Ruta (Sin cambios) ---
    const route = Entidades.getCurrentNpcRoute();
    if (route && route.length > 0) {
        ctx.strokeStyle = '#FFD700'; 
        ctx.lineWidth = 3 / cameraZoom; 
        ctx.setLineDash([5 / cameraZoom, 5 / cameraZoom]); 
        
        const startX = (route[0][0] + 0.5) * CELL_WIDTH;
        const startZ = (route[0][1] + 0.5) * CELL_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(startX, startZ);

        for (let i = 0; i < route.length; i++) {
            const point = route[i];
            const screenX = (point[0] + 0.5) * CELL_WIDTH;
            const screenZ = (point[1] + 0.5) * CELL_HEIGHT;
            
            if (i > 0) {
                ctx.lineTo(screenX, screenZ);
            }
        }
        ctx.stroke(); 
        
        ctx.setLineDash([]); 
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < route.length; i++) {
            const point = route[i];
            const screenX = (point[0] + 0.5) * CELL_WIDTH;
            const screenZ = (point[1] + 0.5) * CELL_HEIGHT;
            
            ctx.beginPath();
            ctx.arc(screenX, screenZ, (CELL_WIDTH * 0.2), 0, 2 * Math.PI); 
            ctx.fill();
            
            ctx.fillStyle = 'black';
            ctx.font = `${CELL_WIDTH * 0.2}px Arial`;
            ctx.fillText(i + 1, screenX, screenZ);
        }
    }
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
    
    // --- Fin del dibujado ---
    
    // 3. Restaurar estado del contexto
    ctx.restore();
}


// --- FUNCIONES DE PINTADO (Sin cambios) ---

function paintLine(x1, z1, x2, z2) {
    let dx = Math.abs(x2 - x1);
    let dz = Math.abs(z2 - z1);
    let sx = (x1 < x2) ? 1 : -1;
    let sz = (z1 < z2) ? 1 : -1;
    let err = dx - dz;
    let anyCellChanged = false; 
    while (true) {
        if (x1 >= 0 && x1 < GRID_WIDTH && z1 >= 0 && z1 < GRID_HEIGHT) {
            if (applyToolAt(x1, z1)) { 
                anyCellChanged = true;
            }
        }
        if ((x1 === x2) && (z1 === z2)) {
            break;
        }
        let e2 = 2 * err;
        if (e2 > -dz) {
            err -= dz;
            x1 += sx;
        }
        if (e2 < dx) {
            err += dx;
            z1 += sz;
        }
    }
    return anyCellChanged; 
}

function getGridCoordsFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX_canvas = (event.clientX - rect.left) * scaleX;
    const mouseY_canvas = (event.clientY - rect.top) * scaleY;
    const mouseX_world = (mouseX_canvas - cameraOffset.x) / cameraZoom;
    const mouseY_world = (mouseY_canvas - cameraOffset.y) / cameraZoom;
    const gridX = Math.floor(mouseX_world / CELL_WIDTH);
    const gridZ = Math.floor(mouseY_world / CELL_HEIGHT);
    return { gridX, gridZ };
}

function handlePaintStart(event) {
    // Botón Central (rueda) para Panear
    if (event.button === 1) { 
        isPanning = true;
        canvas.classList.add('panning');
        lastPanPoint = { x: event.clientX, y: event.clientY };
        event.preventDefault();
        return;
    }
    
    // Botón Izquierdo para Pintar
    if (event.button === 0) {
        isPainting = true;
        const { gridX, gridZ } = getGridCoordsFromEvent(event);
        if (gridX < 0 || gridX >= GRID_WIDTH || gridZ < 0 || gridZ >= GRID_HEIGHT) return;

        if (Entidades.isRouteEditing) {
            Entidades.addWaypointToCurrentNpc(gridX, gridZ);
            drawGrid(); 
            return; 
        }

        const changed = applyToolAt(gridX, gridZ);
        if (changed) {
            drawGrid();
        }
        lastPaintCoords = { x: gridX, z: gridZ };
    }
}

function handlePaintMove(event) {
    // Manejar Paneo
    if (isPanning) {
        const dx = event.clientX - lastPanPoint.x;
        const dy = event.clientY - lastPanPoint.y;
        cameraOffset.x += dx;
        cameraOffset.y += dy;
        lastPanPoint = { x: event.clientX, y: event.clientY };
        drawGrid();
        return;
    }

    // Manejar Pintado
    if (!isPainting || Entidades.isRouteEditing) {
        showCoords(event); 
        return; 
    } 

    const { gridX, gridZ } = getGridCoordsFromEvent(event);
    if (gridX < 0 || gridX >= GRID_WIDTH || gridZ < 0 || gridZ >= GRID_HEIGHT) {
         showCoords(event);
         return;
    }
    
    if (gridX !== lastPaintCoords.x || gridZ !== lastPaintCoords.z) {
        const changed = paintLine(lastPaintCoords.x, lastPaintCoords.z, gridX, gridZ);
        if (changed) { 
            drawGrid(); 
        }
        lastPaintCoords = { x: gridX, z: gridZ }; 
    }
    
    showCoords(event);
}

function handlePaintEnd(event) {
    if (isPanning) {
        isPanning = false;
        canvas.classList.remove('panning');
    }
    if (isPainting) {
        isPainting = false;
        lastPaintCoords = { x: -1, z: -1 };
    }
}

function applyToolAt(gridX, gridZ) {
    const offset = Math.floor(brushSize / 2);
    const startX = gridX - offset;
    const endX = gridX + offset;
    const startZ = gridZ - offset;
    const endZ = gridZ + offset;
    let needsRedraw = false; 

    for (let z = startZ; z <= endZ; z++) {
        for (let x = startX; x <= endX; x++) {
            if (x < 0 || x >= GRID_WIDTH || z < 0 || z >= GRID_HEIGHT) {
                continue;
            }
            const currentCell = localMapData.tileGrid[z][x];

            // 1. Comprobar clic en objeto
            if (brushSize === 1 && typeof currentCell.e === 'object' && currentCell.e !== null) {
                const id = currentCell.e.id;
                const portalDef = Entidades.localPortalTypes[id];
                const entityDef = Entidades.localEntityTypes[id]; 
                const blockDef = Entidades.localBlockTypes[id]; 

                if (portalDef && currentTool.type === 'portal') {
                    Entidades.openPortalModal(currentCell.e, x, z);
                    return true; 
                }
                if (entityDef && currentTool.type === 'entity' && currentTool.id !== 'none') {
                    Entidades.openNpcModal(currentCell.e, x, z);
                    return true; 
                }
                if (blockDef && currentTool.type === 'block') {
                    return false; 
                }
            }

            // 2. Colocar herramienta
            if (currentTool.type === 'start_pos' && brushSize > 1) {
                if (x === gridX && z === gridZ) {
                     if (!localMapData.startPosition || localMapData.startPosition.x !== x || localMapData.startPosition.z !== z) {
                        localMapData.startPosition = { x, z };
                        needsRedraw = true;
                    }
                }
                continue; 
            }
            
            let cellChanged = true;
            switch (currentTool.type) {
                case 'ground':
                    if (currentCell.g !== currentTool.id || currentCell.h !== currentPaintHeight) {
                        currentCell.g = currentTool.id;
                        currentCell.h = currentPaintHeight; 
                    } else {
                        cellChanged = false;
                    }
                    break;
                case 'entity':
                    const toolDef = Entidades.localEntityTypes[currentTool.id];
                    if (currentTool.id === 'none') {
                         if (currentCell.e !== 'none') {
                            currentCell.e = 'none'; 
                        } else {
                            cellChanged = false;
                        }
                    } else if (currentCell.e === 'none' || !currentCell.e) {
                        currentCell.e = { 
                            id: currentTool.id, 
                            movement: toolDef.movement || 'still', 
                            route: [] 
                        };
                        if (brushSize === 1) { 
                            Entidades.openNpcModal(currentCell.e, x, z);
                            return true; 
                        }
                    } else {
                        cellChanged = false;
                    }
                    break;
                case 'portal':
                    if (currentCell.e === 'none' || !currentCell.e) {
                        currentCell.e = { 
                            id: currentTool.id, 
                            destMap: null, 
                            destX: null, 
                            destZ: null 
                        };
                        if (brushSize === 1) { 
                            Entidades.openPortalModal(currentCell.e, x, z);
                            return true; 
                        }
                    } else {
                        cellChanged = false; 
                    }
                    break;
                case 'block':
                    if (currentCell.e === 'none' || !currentCell.e || (typeof currentCell.e === 'object' && !Entidades.localBlockTypes[currentCell.e.id])) {
                        currentCell.e = { 
                            id: currentTool.id
                        };
                    } else {
                        cellChanged = false;
                    }
                    break;
                case 'start_pos':
                    if (!localMapData.startPosition || localMapData.startPosition.x !== x || localMapData.startPosition.z !== z) {
                        localMapData.startPosition = { x, z };
                    } else {
                        cellChanged = false;
                    }
                    break;
                default:
                    cellChanged = false;
            }
            if (cellChanged) {
                needsRedraw = true;
            }
        }
    }
    return needsRedraw;
}

function selectTool(button, type, id) {
    currentTool = { type, id };
    if (activeToolButton) {
        activeToolButton.classList.remove('bg-blue-600', 'ring-2', 'ring-blue-300');
        activeToolButton.classList.add('bg-gray-600', 'hover:bg-gray-700');
    }
    activeToolButton = button;
    activeToolButton.classList.remove('bg-gray-600', 'hover:bg-gray-700');
    activeToolButton.classList.add('bg-blue-600', 'ring-2', 'ring-blue-300');
}

function showCoords(event) {
    const { gridX, gridZ } = getGridCoordsFromEvent(event);
    coordsDisplay.textContent = `Coordenadas: (X: ${gridX}, Z: ${gridZ})`;
}

// --- Funciones de Cámara (Zoom/Paneo - Sin cambios) ---

function adjustZoom(amount) {
    cameraZoom += amount;
    cameraZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, cameraZoom));
    zoomDisplay.textContent = `${cameraZoom.toFixed(1)}x`;
    drawGrid();
}

function resetCamera() {
    cameraZoom = 1.0;
    cameraOffset = { x: 0, y: 0 };
    if (zoomDisplay) {
         zoomDisplay.textContent = `${cameraZoom.toFixed(1)}x`;
    }
    drawGrid();
}

// --- Función para gestionar el layout de columnas (Sin cambios) ---

function updateGridSpans() {
    const leftHidden = leftColumn.classList.contains('hidden');
    const rightHidden = rightColumn.classList.contains('hidden');
    centerColumn.classList.remove('lg:col-span-2', 'lg:col-span-3', 'lg:col-span-4');
    if (!leftHidden && !rightHidden) {
        centerColumn.classList.add('lg:col-span-2');
    } else if (leftHidden && rightHidden) {
        centerColumn.classList.add('lg:col-span-4');
    } else {
        centerColumn.classList.add('lg:col-span-3');
    }
}


// --- Funciones de Gestión de Mapas (Sin cambios) ---

async function saveMap() {
    currentMapId = mapIdInput.value.trim();
    if (!currentMapId) {
        showNotification("Por favor, pon un ID al mapa.", true);
        return;
    }
    if (localMapData.width === 0) {
         showNotification("No hay mapa que guardar.", true);
        return;
    }
    showLoading();
    try {
        const tilesToSave = [];
        for (let z = 0; z < localMapData.height; z++) {
            for (let x = 0; x < localMapData.width; x++) {
                const cell = localMapData.tileGrid[z][x];
                if (cell.e === 'none') {
                     tilesToSave.push({ g: cell.g, e: 'none', h: cell.h || 1.0 });
                } else {
                    tilesToSave.push({ g: cell.g, e: cell.e, h: cell.h || 1.0 });
                }
            }
        }
        const dataToSave = {
            width: localMapData.width,
            height: localMapData.height,
            tiles: tilesToSave,
            startPosition: localMapData.startPosition
        };
        const mapRef = ref(db, `moba-demo-maps/${currentMapId}`);
        await set(mapRef, dataToSave);
        showNotification("¡Mapa guardado con éxito!");
    } catch (error) {
        console.error("Error guardando el mapa: ", error);
        showNotification("Error al guardar el mapa.", true);
    } finally {
        hideLoading();
    }
}

async function loadMap() {
    currentMapId = mapIdInput.value.trim();
    if (!currentMapId) {
        showNotification("Por favor, pon un ID de mapa.", true);
        return;
    }
    showLoading();
    try {
        const mapRef = ref(db, `moba-demo-maps/${currentMapId}`);
        const snapshot = await get(mapRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            GRID_WIDTH = data.width;
            GRID_HEIGHT = data.height;
            CELL_WIDTH = canvas.width / GRID_WIDTH;
            CELL_HEIGHT = canvas.height / GRID_HEIGHT;
            localMapData.width = data.width;
            localMapData.height = data.height;
            localMapData.startPosition = data.startPosition || null;
            localMapData.tileGrid = [];
            for (let z = 0; z < data.height; z++) {
                const row = [];
                for (let x = 0; x < data.width; x++) {
                    const tile = data.tiles[z * data.width + x] || { g: 'void', e: 'none', h: 1.0 };
                    if (tile.h === undefined) {
                        tile.h = 1.0; 
                    }
                    row.push(tile);
                }
                localMapData.tileGrid.push(row);
            }
            resetCamera(); 
            drawGrid();
            showNotification(`Mapa "${currentMapId}" cargado.`);
        } else {
            showNotification("El mapa no existe. Crea uno nuevo.", true);
            initLocalGrid(GRID_WIDTH, GRID_HEIGHT);
        }
    } catch (error) {
        console.error("Error cargando el mapa: ", error);
        showNotification("Error al cargar el mapa.", true);
    } finally {
        hideLoading();
    }
}

function createNewMap() {
    const w = parseInt(newWidthInput.value);
    const h = parseInt(newHeightInput.value);
    if (w < 5 || h < 5 || w > 100 || h > 100) {
        showNotification("Error: Tamaño debe estar entre 5 y 100.", true);
        return;
    }
    currentMapId = mapIdInput.value.trim() || `map_${Date.now()}`;
    mapIdInput.value = currentMapId;
    initLocalGrid(w, h); 
    showNotification(`Nuevo mapa '${currentMapId}' (${w}x${h}) creado. ¡No olvides guardarlo!`);
}

function loadMapList() {
    const mapsCollectionRef = ref(db, 'moba-demo-maps');
    
    onValue(mapsCollectionRef, (snapshot) => {
        mapListContainer.innerHTML = ''; 
        mapIdList = []; 
        const mapsData = snapshot.val();
        
        if (!mapsData) {
            mapListContainer.innerHTML = '<p class="text-gray-400">No hay mapas guardados.</p>';
            return;
        }
        
        const mapIds = Object.keys(mapsData);
        mapIdList = mapIds; 
        
        mapListContainer.innerHTML = `<p class="text-gray-400 text-sm mb-2">Mostrando ${mapIds.length} mapas.</p>`;

        mapIds.forEach((mapId) => {
            const mapItem = document.createElement('div');
            mapItem.className = 'map-item flex justify-between items-center bg-gray-600 p-3 rounded-lg shadow-sm mb-2';
            
            const mapName = document.createElement('span');
            mapName.className = 'map-item-name font-medium text-gray-200 truncate';
            mapName.textContent = mapId;
            mapName.title = mapId;
            mapName.style.maxWidth = '120px';
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'map-item-buttons flex gap-2';
            
            const loadButton = document.createElement('button');
            loadButton.className = 'map-item-button-load px-3 py-1 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors';
            loadButton.textContent = 'Cargar';
            loadButton.onclick = () => {
                mapIdInput.value = mapId; 
                loadMap(); 
            };
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'map-item-button-delete px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors';
            deleteButton.textContent = 'Borrar';
            deleteButton.onclick = () => deleteMap(mapId);
            
            buttonsDiv.appendChild(loadButton);
            buttonsDiv.appendChild(deleteButton);
            mapItem.appendChild(mapName);
            mapItem.appendChild(buttonsDiv);
            mapListContainer.appendChild(mapItem);
        });
        
    }, (error) => {
        console.error("Error al cargar lista de mapas: ", error);
        mapListContainer.innerHTML = '<p class="text-red-400">Error al cargar mapas.</p>';
    });
}

async function deleteMap(mapId) {
    if (mapId === "map_001") {
         showNotification("No se puede borrar el mapa por defecto 'map_001'", true);
         return;
    }
    showNotification(`Borrando "${mapId}"...`, false);

    showLoading();
    try {
        const mapRef = ref(db, `moba-demo-maps/${mapId}`); 
        await remove(mapRef);
        if (mapId === mapIdInput.value) {
            mapIdInput.value = '';
            initLocalGrid(20, 20); 
        }
        showNotification(`Mapa "${mapId}" borrado.`);
    } catch (error) {
        console.error("Error borrando el mapa: ", error);
        showNotification(`Error al borrar "${mapId}".`, true);
    } finally {
        hideLoading();
    }
}


// --- ¡NUEVO! Helper para cambiar de pestaña (MOVIDO AQUÍ) ---
function switchMgrTab(activeTab, activeContent) {
    const allTabs = [imgMgrTabStorage, imgMgrTabSvg, imgMgrTabModel];
    const allContents = [imgMgrContentStorage, imgMgrContentSvg, imgMgrContentModel];
    
    allTabs.forEach((tab, index) => {
        const content = allContents[index];
        if (!tab || !content) return;
        
        if (tab === activeTab) {
            tab.classList.add('active');
            tab.classList.remove('inactive');
            content.style.display = 'block';
        } else {
            tab.classList.add('inactive');
            tab.classList.remove('active');
            content.style.display = 'none';
        }
    });
}


/**
 * ¡MODIFICADO!
 * Abre el modal del gestor de imágenes y carga AMBAS galerías.
 * @param {string} targetInputId - El ID del input que recibirá el nombre del archivo.
 * @param {string} assetType - 'model' o null/undefined (para imagen/svg)
 */
function openImageManager(targetInputId, assetType = null) {
    currentTargetInputId = targetInputId;
    if (imageManagerModal) {
        imageManagerModal.style.display = 'flex';
        
        // ¡NUEVA LÓGICA DE PESTAÑAS!
        if (assetType === 'model') {
            switchMgrTab(imgMgrTabModel, imgMgrContentModel);
            loadModelGallery();
        } else {
            // Comportamiento por defecto (abrir en imágenes)
            switchMgrTab(imgMgrTabStorage, imgMgrContentStorage);
            loadImageGallery();
        }
        // Cargar las otras galerías en segundo plano
        Entidades.populateSvgGallery(svgGallery, handleAssetSelect);
        if (assetType !== 'model') loadModelGallery();
        if (assetType === 'model') loadImageGallery();
    }
}

/**
 * ¡MODIFICADO!
 * Cierra el modal del gestor de imágenes.
 */
function closeImageManager() {
    if (imageManagerModal) {
        imageManagerModal.style.display = 'none';
    }
    currentTargetInputId = null;
    if (imageUploadInput) {
        imageUploadInput.value = null; // Limpiar el input de archivo
    }
    // ¡NUEVO!
    if (svgIdInput) svgIdInput.value = null;
    if (svgDataTextarea) svgDataTextarea.value = null;
    // --- ¡NUEVO (GLTF)! ---
    if (modelUploadInput) modelUploadInput.value = null;
    // ---

    if(imageManagerError) {
        imageManagerError.classList.add('hidden');
    }
}

/**
 * Carga y muestra todas las imágenes de la carpeta 'recursos/' en el modal.
 */
async function loadImageGallery() {
    if (!imageGallery) return;
    imageGallery.innerHTML = '<p class="text-gray-500 col-span-full text-center">Cargando imágenes...</p>';
    
    try {
        const listRef = storageRef(storage, 'recursos');
        const res = await listAll(listRef);
        
        imageGallery.innerHTML = ''; // Limpiar
        
        if (res.items.length === 0) {
             imageGallery.innerHTML = '<p class="text-gray-500 col-span-full text-center">No hay imágenes en la carpeta /recursos.</p>';
             return;
        }

        const urlPromises = res.items.map(itemRef => getDownloadURL(itemRef));
        const urls = await Promise.all(urlPromises);

        urls.forEach((url, index) => {
            const itemRef = res.items[index];
            const fileName = itemRef.name;

            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            const img = document.createElement('img');
            img.src = url;
            img.alt = fileName;
            img.className = 'gallery-img';
            img.dataset.filename = fileName; // Guardar nombre para seleccionar
            img.title = `Seleccionar: ${fileName}`;
            
            const name = document.createElement('span');
            name.className = 'gallery-name';
            name.textContent = fileName;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'gallery-delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = `Borrar: ${fileName}`;
            deleteBtn.dataset.filename = fileName; // Guardar nombre para borrar

            item.appendChild(img);
            item.appendChild(name);
            item.appendChild(deleteBtn);
            imageGallery.appendChild(item);
        });

    } catch (error) {
        console.error("Error cargando galería de imágenes:", error);
        imageGallery.innerHTML = '<p class="text-red-500 col-span-full text-center">Error al cargar imágenes.</p>';
        showNotification("Error al cargar galería de imágenes.", true);
    }
}

/**
 * Maneja la subida de un nuevo archivo de imagen a 'recursos/'.
 */
async function handleImageUpload() {
    if (!imageUploadInput || !imageUploadInput.files || imageUploadInput.files.length === 0) {
        showNotification("Selecciona un archivo primero.", true);
        return;
    }
    
    const file = imageUploadInput.files[0];
    const fileName = file.name.replace(/[\.\#\$\[\]\/]/g, '_'); // Sanitizar nombre
    const fileRef = storageRef(storage, `recursos/${fileName}`);
    
    showLoading();
    imageManagerError.classList.add('hidden');

    try {
        await uploadBytes(fileRef, file);
        showNotification(`¡Imagen '${fileName}' subida con éxito!`);
        imageUploadInput.value = null; // Limpiar input
        loadImageGallery(); // Refrescar galería
        
        // ¡Importante! Forzar la precarga de la nueva imagen en la caché del editor
        // ¡MODIFICADO!
        Entidades.preloadAsset(fileName);

    } catch (error) {
        console.error("Error subiendo imagen:", error);
        showNotification("Error al subir la imagen.", true);
        imageManagerError.textContent = `Error: ${error.message}`;
        imageManagerError.classList.remove('hidden');
    } finally {
        hideLoading();
    }
}

/**
 * ¡NUEVO!
 * Maneja el guardado de un nuevo SVG desde el editor.
 */
async function handleSaveSvg() {
    const id = svgIdInput.value;
    const data = svgDataTextarea.value;
    
    // La lógica de guardado está en e-entidades.js
    await Entidades.saveSvgDefinition(id, data);
    
    // Limpiar inputs y refrescar galería SVG
    svgIdInput.value = '';
    svgDataTextarea.value = '';
    // onDefinitionsUpdated() (llamado desde saveSvgDefinition)
    // se encargará de refrescar todo, incluida la galería SVG.
    // Pero por si acaso, la refrescamos aquí también.
    Entidades.populateSvgGallery(svgGallery, handleAssetSelect);
}


/**
 * ¡MODIFICADO!
 * Renombrada de handleImageSelect a handleAssetSelect.
 * @param {string} assetString - El nombre del asset (ej: 'tree.png' o 'svg:tank_svg' o 'tank.glb')
 */
function handleAssetSelect(assetString) {
    if (currentTargetInputId) {
        const targetInput = document.getElementById(currentTargetInputId);
        if (targetInput) {
            targetInput.value = assetString;
        }
    }
    closeImageManager();
}

/**
 * Maneja el borrado de una imagen de 'recursos/'.
 * @param {string} fileName - El nombre del archivo a borrar.
 */
async function handleImageDelete(fileName) {
    showNotification(`Borrando '${fileName}'...`, false);
    
    const fileRef = storageRef(storage, `recursos/${fileName}`);
    
    showLoading();
    imageManagerError.classList.add('hidden');
    
    try {
        await deleteObject(fileRef);
        showNotification(`¡Imagen '${fileName}' borrada!`);
        
        // Limpiar de la caché de imágenes si existe
        // ¡MODIFICADO!
        const storageUrl = getFirebaseStorageUrl(fileName);
        if (storageUrl && imageCache[storageUrl]) {
            delete imageCache[storageUrl];
        }
        
        loadImageGallery(); // Refrescar galería
        drawGrid(); // Redibujar el canvas por si la imagen estaba en uso

    } catch (error) {
        console.error("Error borrando imagen:", error);
        showNotification("Error al borrar la imagen.", true);
        imageManagerError.textContent = `Error: ${error.message}`;
        imageManagerError.classList.remove('hidden');
    } finally {
        hideLoading();
    }
}

// --- ¡NUEVAS FUNCIONES! Gestor de Modelos ---
    
/**
 * Carga y muestra todos los modelos de la carpeta 'modelos/' en el modal.
 */
async function loadModelGallery() {
    if (!modelGallery) return;
    modelGallery.innerHTML = '<p class="text-gray-500 col-span-full text-center">Cargando modelos...</p>';
    
    try {
        const listRef = storageRef(storage, 'modelos'); // ¡Nueva carpeta!
        const res = await listAll(listRef);
        
        modelGallery.innerHTML = ''; // Limpiar
        
        if (res.items.length === 0) {
             modelGallery.innerHTML = '<p class="text-gray-500 col-span-full text-center">No hay modelos en la carpeta /modelos.</p>';
             return;
        }

        res.items.forEach(itemRef => {
            const fileName = itemRef.name;

            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            // No podemos previsualizar un GLB, así que usamos un placeholder
            const placeholder = document.createElement('div');
            placeholder.className = 'gallery-img gallery-img-placeholder'; // Re-usa estilos
            placeholder.textContent = '📦'; // Símbolo de "caja"
            placeholder.style.fontFamily = 'sans-serif';
            placeholder.style.fontSize = '3rem';
            placeholder.style.display = 'flex';
            placeholder.style.alignItems = 'center';
            placeholder.style.justifyContent = 'center';
            placeholder.style.cursor = 'pointer';
            placeholder.style.backgroundColor = '#374151'; // bg-gray-700
            placeholder.dataset.filename = fileName;
            placeholder.title = `Seleccionar: ${fileName}`;
            
            const name = document.createElement('span');
            name.className = 'gallery-name';
            name.textContent = fileName;
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'gallery-delete-btn';
            deleteBtn.textContent = '×';
            deleteBtn.title = `Borrar: ${fileName}`;
            deleteBtn.dataset.filename = fileName;

            item.appendChild(placeholder);
            item.appendChild(name);
            item.appendChild(deleteBtn);
            modelGallery.appendChild(item);
        });

    } catch (error) {
        console.error("Error cargando galería de modelos:", error);
        modelGallery.innerHTML = '<p class="text-red-500 col-span-full text-center">Error al cargar modelos.</p>';
    }
}

/**
 * Maneja la subida de un nuevo archivo de modelo a 'modelos/'.
 */
async function handleModelUpload() {
    if (!modelUploadInput || !modelUploadInput.files || modelUploadInput.files.length === 0) {
        showNotification("Selecciona un archivo .glb o .gltf primero.", true);
        return;
    }
    
    const file = modelUploadInput.files[0];
    // --- ¡MODIFICADO! ---
    if (!file.name.endsWith('.glb') && !file.name.endsWith('.gltf')) {
         showNotification("Solo se permiten archivos .glb o .gltf.", true);
         return;
    }
    // ---
    
    const fileName = file.name.replace(/[\.\#\$\[\]\/]/g, '_');
    const fileRef = storageRef(storage, `modelos/${fileName}`); // ¡Nueva carpeta!
    
    showLoading();
    imageManagerError.classList.add('hidden'); // Reusamos el notificador de error

    try {
        await uploadBytes(fileRef, file);
        showNotification(`¡Modelo '${fileName}' subido con éxito!`);
        modelUploadInput.value = null; // Limpiar input
        loadModelGallery(); // Refrescar galería

    } catch (error) {
        console.error("Error subiendo modelo:", error);
        showNotification("Error al subir el modelo.", true);
        imageManagerError.textContent = `Error: ${error.message}`;
        imageManagerError.classList.remove('hidden');
    } finally {
        hideLoading();
    }
}

/**
 * Maneja el borrado de un modelo de 'modelos/'.
 * @param {string} fileName - El nombre del archivo a borrar.
 */
async function handleModelDelete(fileName) {
    showNotification(`Borrando '${fileName}'...`, false);
    
    const fileRef = storageRef(storage, `modelos/${fileName}`); // ¡Nueva carpeta!
    
    showLoading();
    imageManagerError.classList.add('hidden');
    
    try {
        await deleteObject(fileRef);
        showNotification(`¡Modelo '${fileName}' borrado!`);
        loadModelGallery(); // Refrescar galería

    } catch (error) {
        console.error("Error borrando modelo:", error);
        showNotification("Error al borrar el modelo.", true);
        imageManagerError.textContent = `Error: ${error.message}`;
        imageManagerError.classList.remove('hidden');
    } finally {
        hideLoading();
    }
}


// --- Inicialización ---

async function refreshDefinitionsAndUI() {
    // ... (Función sin cambios) ...
    showLoading();
    try {
        // loadDefinitions ahora también inicia la precarga de imágenes
        const { groundTypes, entityTypes, portalTypes, blockTypes } = await Entidades.loadDefinitions();
        
        Entidades.updateDefinitionListUI('ground', groundTypes, document.getElementById('def-list-ground'));
        Entidades.updateDefinitionListUI('block', blockTypes, document.getElementById('def-list-block'));
        Entidades.updateDefinitionListUI('portal', portalTypes, document.getElementById('def-list-portal'));
        Entidades.updateDefinitionListUI('entity', entityTypes, document.getElementById('def-list-entity'));
        
        const containers = { 
            groundToolsContainer, 
            blockToolsContainer,
            portalToolsContainer,
            entityToolsContainer 
        };
        Entidades.populateTools(containers, selectTool);
        
        if (!activeToolButton) {
            const firstToolBtn = groundToolsContainer.querySelector('.tool-button');
            if (firstToolBtn) {
                firstToolBtn.click();
            }
        }
        
        drawGrid(); // Redibujar con las imágenes (si están listas)
        
    } catch (error) {
        console.error("Error al refrescar definiciones:", error);
        showNotification("Error al refrescar las definiciones.", true);
    } finally {
        hideLoading();
    }
}

/**
 * ¡MODIFICADO!
 * Inicializa Storage y los nuevos listeners del gestor.
 */
function initFirebase() {
    try {
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        auth = getAuth(app); 
        storage = getStorage(app); // ¡NUEVO! Inicializar Storage
        
        showNotification("Conectando...", false);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                showNotification("¡Conectado y autenticado!", false);
                
                setupEventListeners(); // Configura TODOS los listeners, incluidos los nuevos
                
                // Inyectar 'refreshDefinitionsAndUI' (que llama a drawGrid)
                Entidades.initEntityModule(db, showNotification, showLoading, hideLoading, refreshDefinitionsAndUI);
                
                // Inyectar la función de refresco COMPLETA.
                // ¡MODIFICADO!
                Entidades.setRedrawCallback(refreshDefinitionsAndUI);
                
                Entidades.initInstanceModalDependencies(() => mapIdList, () => currentMapId);

                loadMapList();
                refreshDefinitionsAndUI(); // Carga inicial de definiciones E imágenes
                
                loadMap();
                
            } else {
                showNotification("Autenticando...", false);
                signInAnonymously(auth).catch((error) => {
                    console.error("Error al iniciar sesión anónimamente:", error);
                    showNotification("Error de autenticación.", true);
                });
            }
        });

    } catch (e) {
        console.error("Error al inicializar Firebase: ", e);
        showNotification("Error crítico al conectar con Firebase.", true);
    }
}

/**
 * ¡MODIFICADO!
 * Añade los listeners para el nuevo gestor de imágenes y sus pestañas.
 */
function setupEventListeners() {
    // Eventos del canvas
    canvas.addEventListener('mousedown', handlePaintStart);
    canvas.addEventListener('mousemove', handlePaintMove);
    canvas.addEventListener('mouseup', handlePaintEnd);
    canvas.addEventListener('mouseleave', handlePaintEnd);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Controles del canvas
    paintHeightInput = document.getElementById('paint-height-input');
    paintHeightInput.addEventListener('change', (e) => {
        currentPaintHeight = parseFloat(e.target.value) || 0.0;
    });
    brushSizeSelect.addEventListener('change', (e) => {
        brushSize = parseInt(e.target.value, 10);
    });

    // Gestión de Mapas
    saveMapButton.addEventListener('click', saveMap);
    loadMapButton.addEventListener('click', loadMap);
    newMapButton.addEventListener('click', () => {
        showNotification("Creando nuevo mapa...", false);
        createNewMap();
    });
    
    // Listeners de Zoom
    zoomInButton = document.getElementById('zoom-in-button');
    zoomOutButton = document.getElementById('zoom-out-button');
    zoomDisplay = document.getElementById('zoom-display');
    zoomInButton.addEventListener('click', () => adjustZoom(0.2));
    zoomOutButton.addEventListener('click', () => adjustZoom(-0.2));
    
    // Listeners de Columnas Colapsables
    leftColumn = document.getElementById('left-column');
    centerColumn = document.getElementById('center-column');
    rightColumn = document.getElementById('right-column');
    toggleLeftButton = document.getElementById('toggle-left-column');
    toggleRightButton = document.getElementById('toggle-right-column');

    toggleLeftButton.addEventListener('click', () => {
        leftColumn.classList.toggle('hidden');
        toggleLeftButton.textContent = leftColumn.classList.contains('hidden') ? '>' : '<';
        updateGridSpans();
    });
    
    toggleRightButton.addEventListener('click', () => {
        rightColumn.classList.toggle('hidden');
        toggleRightButton.textContent = rightColumn.classList.contains('hidden') ? '<' : '>';
        updateGridSpans();
    });


    // Lógica para Pestañas de Herramientas (Columna Derecha)
    const toolTabs = [
        document.getElementById('tool-tab-ground'),
        document.getElementById('tool-tab-block'),
        document.getElementById('tool-tab-portal'),
        document.getElementById('tool-tab-entity')
    ];
    const toolTabContents = [
        document.getElementById('tool-content-ground'),
        document.getElementById('tool-content-block'),
        document.getElementById('tool-content-portal'),
        document.getElementById('tool-content-entity')
    ];

    function switchToolTab(tabToActivate) {
        toolTabs.forEach((tab, index) => {
            if (tab === tabToActivate) {
                tab.classList.remove('inactive');
                tab.classList.add('active');
                toolTabContents[index].style.display = 'block';
            } else {
                tab.classList.remove('active');
                tab.classList.add('inactive');
                toolTabContents[index].style.display = 'none';
            }
        });
    }

    toolTabs.forEach(tab => {
        if (tab) { 
            tab.onclick = () => switchToolTab(tab);
        } else {
            console.error("Error: Una pestaña de herramienta no se encontró en el DOM.");
        }
    });
    
    if (toolTabs[0]) {
        switchToolTab(toolTabs[0]); 
    }
    
    
    // --- ¡NUEVO! Listeners del Gestor de Imágenes ---
    
    // Obtener elementos del DOM
    imageManagerModal = document.getElementById('image-manager-modal');
    closeImageManagerBtn = document.getElementById('close-image-manager-btn');
    imageUploadInput = document.getElementById('image-upload-input');
    imageUploadButton = document.getElementById('image-upload-button');
    imageGallery = document.getElementById('image-gallery');
    imageManagerError = document.getElementById('image-manager-error');

    // ¡NUEVO! Elementos SVG y Pestañas
    imgMgrTabStorage = document.getElementById('img-mgr-tab-storage');
    imgMgrTabSvg = document.getElementById('img-mgr-tab-svg');
    imgMgrContentStorage = document.getElementById('img-mgr-content-storage');
    imgMgrContentSvg = document.getElementById('img-mgr-content-svg');
    svgIdInput = document.getElementById('svg-id-input');
    svgDataTextarea = document.getElementById('svg-data-textarea');
    svgSaveButton = document.getElementById('svg-save-button');
    svgGallery = document.getElementById('svg-gallery');
    
    // --- ¡NUEVO (GLTF)! ---
    imgMgrTabModel = document.getElementById('img-mgr-tab-model');
    imgMgrContentModel = document.getElementById('img-mgr-content-model');
    modelUploadInput = document.getElementById('model-upload-input');
    modelUploadButton = document.getElementById('model-upload-button');
    modelGallery = document.getElementById('model-gallery');
    // ---

    // Botones "Seleccionar" en el modal de Definición
    const selectImageBtns = document.querySelectorAll('.select-image-btn');
    selectImageBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.targetInput;
            // --- ¡NUEVO (GLTF)! ---
            const assetType = btn.dataset.assetType; // 'model' o undefined
            // ---
            if (targetId) {
                openImageManager(targetId, assetType); // ¡MODIFICADO!
            }
        });
    });

    // Controles del modal del gestor
    if (closeImageManagerBtn) {
        closeImageManagerBtn.addEventListener('click', closeImageManager);
    }
    // (Storage)
    if (imageUploadButton) {
        imageUploadButton.addEventListener('click', handleImageUpload);
    }
    // (SVG)
    if (svgSaveButton) {
        svgSaveButton.addEventListener('click', handleSaveSvg);
    }
    // --- ¡NUEVO (GLTF)! ---
    if (modelUploadButton) {
        modelUploadButton.addEventListener('click', handleModelUpload);
    }
    // ---

    // ¡NUEVO! Listeners de Pestañas del Gestor (Refactorizado)
   
    
    if (imgMgrTabStorage) {
        imgMgrTabStorage.addEventListener('click', () => switchMgrTab(imgMgrTabStorage, imgMgrContentStorage));
    }
    if (imgMgrTabSvg) {
         imgMgrTabSvg.addEventListener('click', () => {
            switchMgrTab(imgMgrTabSvg, imgMgrContentSvg);
            // Refrescar galería SVG al abrir la pestaña
            Entidades.populateSvgGallery(svgGallery, handleAssetSelect);
        });
    }
    // --- ¡NUEVO (GLTF)! ---
    if (imgMgrTabModel) {
        imgMgrTabModel.addEventListener('click', () => {
            switchMgrTab(imgMgrTabModel, imgMgrContentModel);
            // Refrescar galería de modelos
            loadModelGallery();
        });
    }
    // ---


    // Delegación de eventos en la galería (Storage)
    if (imageGallery) {
        imageGallery.addEventListener('click', (e) => {
            const target = e.target;
            
            // Clic en el botón de borrar (X)
            if (target.classList.contains('gallery-delete-btn')) {
                const filename = target.dataset.filename;
                if (filename) {
                    handleImageDelete(filename);
                }
            } 
            // Clic en una imagen (para seleccionarla)
            else if (target.classList.contains('gallery-img')) {
                const filename = target.dataset.filename;
                if (filename) {
                    handleAssetSelect(filename);
                }
            }
        });
    }
    
    // --- ¡NUEVO (GLTF)! ---
    // Delegación de eventos en la galería (Modelos)
    if (modelGallery) {
        modelGallery.addEventListener('click', (e) => {
            const target = e.target;
            
            // Clic en el botón de borrar (X)
            if (target.classList.contains('gallery-delete-btn')) {
                const filename = target.dataset.filename;
                if (filename) {
                    handleModelDelete(filename);
                }
            } 
            // Clic en el placeholder (para seleccionar)
            else if (target.classList.contains('gallery-img-placeholder')) {
                const filename = target.dataset.filename;
                if (filename) {
                    handleAssetSelect(filename);
                }
            }
        });
    }
    // ---
}

window.onload = () => {
    initFirebase(); 
    mapIdInput.value = currentMapId;
    initLocalGrid(GRID_WIDTH, GRID_HEIGHT); 
};