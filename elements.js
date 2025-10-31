// ==================================================
// ### DEFINICIONES DE ELEMENTOS (ELEMENTS.JS) ###
// ==================================================
// Este archivo centraliza las propiedades de todo
// lo que puede existir en un mapa.

// ¡IMPORTACIÓN CORREGIDA! Necesitamos las constantes de la cámara.
import { BASE_ISO_TILE_W_HALF, BASE_ISO_TILE_H_HALF } from './camera.js';

// --- Carga de Imágenes de Elementos (Árboles/Rocas) ---

// Define las dimensiones base de tus sprites (ajústalas al tamaño de tus PNG)
const TREE_BASE_WIDTH = 700;
const TREE_BASE_HEIGHT = 700;
const ROCK_BASE_WIDTH = 128;
const ROCK_BASE_HEIGHT = 128;

// Cargar imagen del árbol
const treeImg = new Image();
let treeImgLoaded = false;
treeImg.onload = () => { treeImgLoaded = true; };
treeImg.onerror = () => { console.error("No se pudo cargar tree_01.png"); };
treeImg.src = 'tree_01.png';

// Cargar imagen de la roca
const rockImg = new Image();
let rockImgLoaded = false;
rockImg.onload = () => { rockImgLoaded = true; };
rockImg.onerror = () => { console.error("No se pudo cargar rock_01.png"); };
rockImg.src = 'rock_01.png';


// --- Tipos de Suelo (Sin cambios en la estructura) ---
export const GROUND_TYPES = {
    'void': {
        id: 'void',
        color: '#111', // Fallback
        passable: false,
        img: null,
    },
    'grass': {
        id: 'grass',
        color: '#3a7d44', // Fallback
        passable: true,
        img: null,
    },
    'dirt': {
        id: 'dirt',
        color: '#8b5a2b', // Fallback
        passable: true,
        img: null,
    },
    'path': {
        id: 'path',
        color: '#bdae93', // Fallback
        passable: true,
        img: null,
    },
    'water': {
        id: 'water',
        color: '#4a90e2', // Fallback
        passable: false,
        img: null,
    }
};

// --- Carga de Imágenes de Suelo (Sin cambios) ---
const groundGrassImg = new Image();
const groundDirtImg = new Image();
const groundPathImg = new Image();
const groundWaterImg = new Image();
const groundVoidImg = new Image();

let groundImgsLoaded = 0;
const totalGroundImgs = 5;
const onGroundImgLoad = () => { 
    groundImgsLoaded++;
    if (groundImgsLoaded === totalGroundImgs) {
        console.log("Todas las texturas de suelo cargadas.");
    }
};

groundGrassImg.onload = onGroundImgLoad;
groundGrassImg.src = 'ground_grass.png'; // Asume que esta es una textura RECTANGULAR de hierba
GROUND_TYPES['grass'].img = groundGrassImg;

groundDirtImg.onload = onGroundImgLoad;
groundDirtImg.src = 'ground_dirt.png'; // Asume que esta es una textura RECTANGULAR de tierra
GROUND_TYPES['dirt'].img = groundDirtImg;

groundPathImg.onload = onGroundImgLoad;
groundPathImg.src = 'ground_path.png'; // Asume que esta es una textura RECTANGULAR de camino
GROUND_TYPES['path'].img = groundPathImg;

groundWaterImg.onload = onGroundImgLoad;
groundWaterImg.src = 'ground_water.png';
GROUND_TYPES['water'].img = groundWaterImg;

groundVoidImg.onload = onGroundImgLoad;
groundVoidImg.src = 'ground_void.png';
GROUND_TYPES['void'].img = groundVoidImg;


// --- Tipos de Elementos Estáticos (Sin cambios) ---
export const ELEMENT_TYPES = {
    'none': {
        id: 'none',
        passable: true,
        draw: (ctx, x, y, z, zoom, projectedPos) => { /* No dibuja nada */ }
    },
    'tree_1': {
        id: 'tree_1',
        passable: false,
        draw: (ctx, x, y, z, zoom, projectedPos) => {
            
            const scaledWidth = TREE_BASE_WIDTH * zoom;
            const scaledHeight = TREE_BASE_HEIGHT * zoom;

            if (treeImgLoaded) {
                ctx.drawImage(
                    treeImg,
                    projectedPos.x - scaledWidth / 2, 
                    projectedPos.y - scaledHeight,
                    scaledWidth,
                    scaledHeight
                );
            } else {
                // Fallback
                const size = 16 * zoom;
                const height = 40 * zoom;
                ctx.fillStyle = '#6b4f2f';
                ctx.fillRect(projectedPos.x - size / 4, projectedPos.y - height / 2, size / 2, height / 2);
                ctx.fillStyle = '#2a5d34';
                ctx.beginPath();
                ctx.arc(projectedPos.x, projectedPos.y - height / 2 - size / 1.5, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    },
    'rock_1': {
        id: 'rock_1',
        passable: false,
        draw: (ctx, x, y, z, zoom, projectedPos) => {
            
            const scaledWidth = ROCK_BASE_WIDTH * zoom;
            const scaledHeight = ROCK_BASE_HEIGHT * zoom;

            if (rockImgLoaded) {
                ctx.drawImage(
                    rockImg,
                    projectedPos.x - scaledWidth / 2, 
                    projectedPos.y - scaledHeight,
                    scaledWidth,
                    scaledHeight
                );
            } else {
                // Fallback
                const size = 12 * zoom;
                ctx.fillStyle = '#888'; 
                ctx.beginPath();
                ctx.arc(projectedPos.x, projectedPos.y - size / 2, size / 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
};

/**
 * Dibuja un polígono isométrico para una casilla de suelo.
 * (¡MODIFICADO PARA USAR TRANSFORMACIÓN DE TEXTURA!)
 * @param {CanvasRenderingContext2D} ctx
 * @param {function} project - La función de proyección
 * @param {number} x - Coordenada X del mundo
 * @param {number} z - Coordenada Z del mundo
 * @param {object} groundDef - La definición del suelo (de GROUND_TYPES)
 * @param {number} zoom - El nivel de zoom actual
 */
export function drawGroundTile(ctx, project, x, z, groundDef, zoom) {
    
    // Calcula el tamaño del tile con zoom
    const tileW = BASE_ISO_TILE_W_HALF * zoom;
    const tileH = BASE_ISO_TILE_H_HALF * zoom;

    // Calcula la esquina SUPERIOR (p1) de la casilla
    const p1 = project(x, 0, z);

    if (groundDef.img && groundDef.img.complete && groundDef.img.naturalWidth > 0) {
        
        // --- ¡AQUÍ ESTÁ LA MAGIA! ---
        // Definimos la matriz de transformación
        
        // Vector 1: (1,0) del canvas -> (tileW, tileH) en pantalla
        const a = tileW;  
        const b = tileH;
        // Vector 2: (0,1) del canvas -> (-tileW, tileH) en pantalla
        const c = -tileW; 
        const d = tileH;
        // Origen de traslación: (p1.x, p1.y)
        const e = p1.x;   
        const f = p1.y;

        ctx.save();
        // Aplicar la transformación que sesga el contexto
        ctx.setTransform(a, b, c, d, e, f);
        
        // Dibujar la imagen rectangular (de hierba, tierra, etc.)
        // en el origen (0,0) del *espacio transformado*.
        // Se dibujará como un rombo que empieza en p1.
        // Usamos 1,1 como tamaño porque la transformación ya incluye la escala.
        ctx.drawImage(groundDef.img, 0, 0, 1, 1);
        
        // Restaurar el contexto a la normalidad (sin sesgo)
        ctx.restore();

    } else {
        // --- Fallback: Dibujar el color sólido (si la imagen falla o no existe) ---
        const p2 = project(x + 1, 0, z);
        const p3 = project(x + 1, 0, z + 1);
        const p4 = project(x, 0, z + 1);

        ctx.fillStyle = groundDef.color;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
    }
}

