// ==================================================
// ### LÓGICA DE ACCIÓN DE MOVIMIENTO (MOVE-ACTION.JS) ###
// ==================================================

import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { inverseProject } from './camera.js';
// ¡NUEVA IMPORTACIÓN! (Aunque no se usa directamente, es bueno saber que existe)
import * as Elements from './elements.js';

// Variables locales del módulo
let _myPlayerId;
let _db;
// ¡NUEVO! Función de callback para chequear colisiones
let _collisionChecker = (x, z) => false; // Por defecto, no permite moverse

/**
 * Establece las dependencias (myPlayerId, db).
 */
export function setMoveActionDependencies(myPlayerId, db) {
    _myPlayerId = myPlayerId;
    _db = db;
}

/**
 * ¡NUEVO! Establece la función que se usará para chequear colisiones.
 * Esta función es pasada desde main.js
 * @param {function} checkerFunc - Una función que recibe (worldX, worldZ) y devuelve boolean.
 */
export function setCollisionChecker(checkerFunc) {
    _collisionChecker = checkerFunc;
}

/**
 * Configura el listener de clic/toque para mover
 */
export function setupClickMove2_5D(canvas) {
    
    const handleMove = (event) => {
        if (!_myPlayerId || !_db || !canvas || !_collisionChecker) return;
        if (event.target !== canvas) return;
        
        event.preventDefault(); 

        let screenX, screenY;
        if (event.touches && event.touches.length > 0) {
            screenX = event.touches[0].clientX;
            screenY = event.touches[0].clientY;
        } else {
            screenX = event.clientX;
            screenY = event.clientY;
        }

        // Convertir clic de pantalla a coordenadas del mundo
        const worldCoords = inverseProject(screenX, screenY);

        // --- ¡NUEVO! CHEQUEO DE COLISIÓN ---
        // Usamos la función que nos pasó main.js
        if (!_collisionChecker(worldCoords.x, worldCoords.z)) {
            console.warn("Movimiento bloqueado: Casilla no transitable en", worldCoords);
            // Opcional: mostrar un efecto visual de "bloqueo"
            showBlockedClick(screenX, screenY);
            return; // ¡No actualiza Firebase!
        }
        // --- FIN DE CHEQUEO ---


        // Actualizar la posición de nuestro jugador en Firebase
        const myPlayerRef = ref(_db, `moba-demo-players-3d/${_myPlayerId}`);
        update(myPlayerRef, {
            x: worldCoords.x,
            z: worldCoords.z
        });
    };

    canvas.addEventListener('touchstart', handleMove, { passive: false });
    canvas.addEventListener('click', handleMove);
}

/**
 * Muestra un pequeño indicador visual de "X" donde el usuario hizo clic
 * en una zona bloqueada.
 */
function showBlockedClick(screenX, screenY) {
    let indicator = document.createElement('div');
    indicator.textContent = '❌';
    indicator.style.position = 'absolute';
    indicator.style.left = `${screenX - 12}px`;
    indicator.style.top = `${screenY - 12}px`;
    indicator.style.fontSize = '24px';
    indicator.style.pointerEvents = 'none'; // No debe interferir con clics
    indicator.style.zIndex = '100';
    indicator.style.transition = 'opacity 0.5s, transform 0.5s';
    indicator.style.opacity = '1';
    indicator.style.transform = 'scale(1)';
    
    document.body.appendChild(indicator);

    setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transform = 'scale(1.5)';
    }, 100); // Inicia el desvanecimiento rápido

    setTimeout(() => {
        document.body.removeChild(indicator);
    }, 600); // Elimina del DOM
}
