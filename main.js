// ==================================================
// ### SCRIPT PRINCIPAL (MAIN.JS) ###
// ==================================================

// 1. Importaciones de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, onValue, onDisconnect, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// 2. Importaciones de la lógica del juego
import { project, updateCameraPosition, updateZoom, ZOOM_STEP, currentZoom } from './camera.js';
import { setupClickMove2_5D, setMoveActionDependencies, setCollisionChecker } from './move-action.js';
// ¡IMPORTACIÓN DE ELEMENTOS (sin cambios)!
import * as Elements from './elements.js';

// 3. Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAfK_AOq-Pc2bzgXEzIEZ1ESWvnhMJUvwI",
  authDomain: "enraya-51670.firebaseapp.com",
  databaseURL: "https://enraya-51670-default-rtdb.europe-west1.firebasedatabase.app", // ¡CORREGIDO!
  projectId: "enraya-51670",
  storageBucket: "enraya-51670.firebasestorage.app",
  messagingSenderId: "103343380727",
  appId: "1:103343380727:web:b2fa02aee03c9506915bf2",
  measurementId: "G-2G31LLJY1T"
};

// 4. Variables globales del juego y Firebase
let app;
let auth;
let db;
let myPlayerId;

// Estado del jugador
let playersRef;
let playersState = {}; 
let interpolatedPlayersState = {}; 
const MOVEMENT_SPEED = 0.05; 

// Variables de Mapa
let mapRef;
let currentMapData = null; // Almacenará los datos del mapa (ancho, alto, tiles)
let currentMapId = "map_001"; // Mapa que cargaremos por defecto

// Variables de Canvas 2D
let canvas, ctx;
let infoBar;
        
// Variables del jugador
const playerSize = 1.0; 
const playerImg = new Image();
let playerImgLoaded = true;
const playerImgWidth = 250; 
const playerImgHeight = 250; 
const playerTextureURL = 'samurai.png'; 

// 5. Función principal (onload)
window.onload = () => {
    infoBar = document.getElementById('info-bar');
    initCanvas();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    playerImg.onload = () => { playerImgLoaded = true; };
    playerImg.onerror = () => {
        console.error("No se pudo cargar la textura del jugador. Se usará un bloque de color.");
        playerImgLoaded = false; 
    }
    playerImg.crossOrigin = "anonymous";
    playerImg.src = playerTextureURL;

    initializeFirebase();

    // Listeners de Zoom (sin cambios)
    const zoomInButton = document.getElementById('zoom-in');
    const zoomOutButton = document.getElementById('zoom-out');
    const handleZoomIn = (e) => { e.preventDefault(); updateZoom(ZOOM_STEP); };
    const handleZoomOut = (e) => { e.preventDefault(); updateZoom(1 / ZOOM_STEP); };
    zoomInButton.addEventListener('touchstart', handleZoomIn, { passive: false });
    zoomInButton.addEventListener('click', handleZoomIn);
    zoomOutButton.addEventListener('touchstart', handleZoomOut, { passive: false });
    zoomOutButton.addEventListener('click', handleZoomOut);
};

// 6. Ajustar el tamaño del canvas (sin cambios)
function resizeCanvas() {
    if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
}

// 7. Inicializar el canvas 2D (sin cambios)
function initCanvas() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    setupClickMove2_5D(canvas);
}

// 8. Inicializar Firebase y autenticación
async function initializeFirebase() {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getDatabase(app);
        
        // Referencia a los jugadores (sin cambios)
        playersRef = ref(db, 'moba-demo-players-3d'); 
        
        // Referencia al mapa (sin cambios)
        mapRef = ref(db, `moba-demo-maps/${currentMapId}`);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                myPlayerId = user.uid;
                
                // Pasamos las dependencias al módulo move-action
                setMoveActionDependencies(myPlayerId, db);
                // Pasamos la función de chequeo de colisiones
                setCollisionChecker(isPositionPassable);

                infoBar.innerHTML = `Conectado. <br> <strong>Tu UserID:</strong> ${myPlayerId.substring(0, 6)}<br><strong>Instrucciones:</strong> Toca para moverte.`;
                
                // Iniciar el juego
                setupGame(myPlayerId);
            } else {
                signInAnonymously(auth).catch((error) => {
                    console.error("Error al iniciar sesión anónimamente:", error);
                    infoBar.textContent = "Error al conectar con Firebase Auth.";
                });
            }
        });

    } catch (error) {
        console.error("Error al inicializar Firebase:", error);
        infoBar.textContent = "Error al inicializar Firebase. Revisa la consola.";
    }
}

// 9. Configurar el jugador en la base de datos
function setupGame(playerId) {
    const myPlayerRef = ref(db, `moba-demo-players-3d/${playerId}`);
    
    // Posición inicial (ahora en el centro del mapa)
    const initialPos = { x: 10.5, z: 10.5 };
    
    // Comprobar si el jugador ya existe
    onValue(myPlayerRef, (snapshot) => {
        if (!snapshot.exists()) {
            // Solo establecer posición inicial si es nuevo
            set(myPlayerRef, {
                id: playerId,
                x: initialPos.x,
                z: initialPos.z,
            });
        }
    }, { onlyOnce: true }); // Solo comprueba esto una vez

    onDisconnect(myPlayerRef).remove();

    // Empezar a escuchar cambios
    listenForPlayers();
    listenForMapChanges(); 
    
    // Iniciar el bucle de renderizado
    gameLoop(); 
}

// 10. Escuchar todos los cambios en el nodo 'players' (sin cambios)
function listenForPlayers() {
    onValue(playersRef, (snapshot) => {
        playersState = snapshot.val() || {};
        // Sincronizar estados interpolados
        for (const id in playersState) {
            if (!interpolatedPlayersState[id]) {
                interpolatedPlayersState[id] = { ...playersState[id] };
            }
        }
        for (const id in interpolatedPlayersState) {
            if (!playersState[id]) {
                delete interpolatedPlayersState[id];
            }
        }
    });
}

// 11. Escuchar cambios en el mapa (sin cambios)
function listenForMapChanges() {
    onValue(mapRef, (snapshot) => {
        const data = snapshot.val();
        if (data && data.tiles) {
            // Des-aplanar el array de tiles para un acceso más fácil (ej: grid[z][x])
            data.tileGrid = [];
            for (let z = 0; z < data.height; z++) {
                const row = [];
                for (let x = 0; x < data.width; x++) {
                    row.push(data.tiles[z * data.width + x]);
                }
                data.tileGrid.push(row);
            }
            currentMapData = data;
            console.log("Datos del mapa cargados y procesados.", currentMapData);
        } else {
            console.warn("No se encontraron datos del mapa o el formato es incorrecto.");
            currentMapData = null; // Asegurarse de que no hay mapa
        }
    });
}

// 12. Bucle principal del juego (renderiza en el canvas)
function gameLoop() {
    requestAnimationFrame(gameLoop); 

    if (!ctx) return; 

    updateCameraPosition(myPlayerId, interpolatedPlayersState, canvas, playerSize);
    updatePlayerPositions();

    // Limpiar el canvas
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- REFACTORIZACIÓN DEL RENDERIZADO ---
    
    // 1. Dibujar el suelo
    drawGround();

    // 2. Crear una lista de todas las "cosas" a dibujar (jugadores, elementos)
    let renderables = [];

    // Añadir elementos del mapa (árboles, rocas)
    if (currentMapData && currentMapData.tileGrid) {
        for (let z = 0; z < currentMapData.height; z++) {
            for (let x = 0; x < currentMapData.width; x++) {
                const tile = currentMapData.tileGrid[z][x];
                if (tile && tile.e !== 'none' && Elements.ELEMENT_TYPES[tile.e]) {
                    renderables.push({
                        type: 'element',
                        x: x + 0.5, // Centrar en la casilla
                        z: z + 0.5, // Centrar en la casilla
                        y: 0,
                        definition: Elements.ELEMENT_TYPES[tile.e]
                    });
                }
            }
        }
    }
    
    // Añadir jugadores
    for (const player of Object.values(interpolatedPlayersState)) {
        renderables.push({
            type: 'player',
            y: playerSize, // Altura del jugador
            ...player // Incluye id, x, z
        });
    }

    // 3. Ordenar la lista por "profundidad" (eje Y isométrico)
    // Los objetos con menor (x+z) se dibujan primero (más al fondo)
    renderables.sort((a, b) => (a.x + a.z) - (b.x + b.z));

    // 4. Dibujar todo en orden
    for (const item of renderables) {
        // Proyectar la posición base (pies)
        const screenPos = project(item.x, item.y, item.z);

        if (item.type === 'player') {
            drawPlayer(item, screenPos);
        } else if (item.type === 'element') {
            // La función de dibujo del elemento usa la posición proyectada
            item.definition.draw(ctx, item.x, item.y, item.z, currentZoom, screenPos);
        }
    }
}

// 13. Función para interpolar posiciones (sin cambios)
function updatePlayerPositions() {
    for (const id in playersState) {
        const targetPlayerData = playersState[id]; 
        const playerMesh = interpolatedPlayersState[id]; 
        if (!playerMesh) continue; 
        const targetX = targetPlayerData.x;
        const targetZ = targetPlayerData.z;
        const dx = targetX - playerMesh.x;
        const dz = targetZ - playerMesh.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < MOVEMENT_SPEED) {
            playerMesh.x = targetX;
            playerMesh.z = targetZ;
        } else {
            const normX = dx / distance;
            const normZ = dz / distance;
            playerMesh.x += normX * MOVEMENT_SPEED;
            playerMesh.z += normZ * MOVEMENT_SPEED;
        }
    }
}

/**
 * Dibuja el suelo texturizado basado en los datos del mapa.
 * (¡MODIFICADO!)
 */
function drawGround() {
    if (!currentMapData || !currentMapData.tileGrid) {
        // Fallback: dibujar la rejilla antigua si no hay mapa
        drawGroundGrid();
        return;
    }
    
    // Iterar sobre el mapa y dibujar cada casilla
    for (let z = 0; z < currentMapData.height; z++) {
        for (let x = 0; x < currentMapData.width; x++) {
            const tile = currentMapData.tileGrid[z][x];
            
            // Obtener la definición completa del suelo
            const groundDef = (tile && Elements.GROUND_TYPES[tile.g]) 
                              ? Elements.GROUND_TYPES[tile.g] 
                              : Elements.GROUND_TYPES['void']; // Fallback a 'void'
            
            // Dibujar la casilla usando la nueva función
            // Le pasamos la definición completa y el zoom
            Elements.drawGroundTile(ctx, project, x, z, groundDef, currentZoom);
            
            // Ya no dibujamos el borde, la textura se encarga
        }
    }
}

/**
 * Dibuja una rejilla isométrica (FALLBACK si no hay mapa).
 * (Sin cambios)
 */
function drawGroundGrid() {
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5; 
    const gridSize = 20;
    for (let i = -gridSize; i <= gridSize; i++) {
        let p1 = project(i, 0, -gridSize);
        let p2 = project(i, 0, gridSize);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        let p3 = project(-gridSize, 0, i);
        let p4 = project(gridSize, 0, i);
        ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.stroke();
    }
    ctx.globalAlpha = 1.0; 
}


/**
 * Dibuja un jugador específico en la pantalla.
 * (Sin cambios)
 * @param {object} player - El objeto del jugador (con x, y, z, id).
 * @param {object} screenPos - La posición ya proyectada (pies del jugador).
 */
function drawPlayer(player, screenPos) {
    const scaledImgWidth = playerImgWidth * currentZoom;
    const scaledImgHeight = playerImgHeight * currentZoom;
    const fallbackWidth = 16 * currentZoom;
    const fallbackHeight = 32 * currentZoom;

    if (playerImgLoaded) {
        ctx.drawImage(
            playerImg,
            screenPos.x - scaledImgWidth / 2, // Centrar
            screenPos.y - scaledImgHeight,    // Alinear pies
            scaledImgWidth,
            scaledImgHeight
        );
    } else {
        // Fallback
        ctx.fillStyle = (player.id === myPlayerId) ? '#00FFFF' : '#FF0000';
        ctx.fillRect(
            screenPos.x - fallbackWidth / 2,
            screenPos.y - fallbackHeight,
            fallbackWidth, 
            fallbackHeight
        );
    }

    // Dibujar el nombre/ID
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.font = `${12 * currentZoom}px Inter`;
    ctx.fillText(
        player.id.substring(0, 6), 
        screenPos.x, 
        screenPos.y - scaledImgHeight - (5 * currentZoom)
    );
}

/**
 * Función de colisión.
 * (Sin cambios)
 * @param {number} worldX 
 * @param {number} worldZ 
 * @returns {boolean}
 */
function isPositionPassable(worldX, worldZ) {
    if (!currentMapData || !currentMapData.tileGrid) return false; // No te muevas si el mapa no ha cargado

    const tileX = Math.floor(worldX);
    const tileZ = Math.floor(worldZ);

    // Comprobar límites del mapa
    if (tileX < 0 || tileX >= currentMapData.width || tileZ < 0 || tileZ >= currentMapData.height) {
        return false;
    }

    // Obtener la casilla
    const tile = currentMapData.tileGrid[tileZ][tileX];
    if (!tile) return false; // Casilla inválida

    // Obtener definiciones
    const groundDef = Elements.GROUND_TYPES[tile.g];
    const elementDef = Elements.ELEMENT_TYPES[tile.e];

    if (!groundDef || !elementDef) return false; // Definición desconocida

    // Es transitable SOLO si AMBOS, el suelo y el elemento, lo son
    return groundDef.passable && elementDef.passable;
}
