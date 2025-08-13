// --- ESTADO DEL JUGADOR ---
const playerState = {
    name: 'Stractos',
    energia: 98,
    energiaMax: 500,
    oro: 15,
    currentLocation: 'bosque',
    avatarSvg: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#d1d5db"/><circle cx="50" cy="40" r="15" fill="#4b5563"/><path d="M30 70 a 20 20 0 0 0 40 0" fill="#4b5563"/></svg>',
    inventory: [
        { itemId: 'log', quantity: 1 },
        { itemId: 'potion', quantity: 1 },
        { itemId: 'gem', quantity: 1 },
        { itemId: 'diamond', quantity: 1 }
    ]
};

// --- ELEMENTOS DEL DOM ---
const doc = document;
const energyDisplay = doc.getElementById('energyDisplay');
const goldDisplay = doc.getElementById('goldDisplay');
const locationImageContainer = doc.querySelector('.location-image-container');
const locationDescription = doc.querySelector('.location-description');
const choicesContainer = doc.querySelector('.choices-container');
const actionsContainer = doc.querySelector('.actions-container');
const feedbackOverlay = doc.getElementById('feedbackOverlay');

// Menu
const openMenuBtn = doc.getElementById('openMenuBtn');
const closeMenuBtn = doc.getElementById('closeMenuBtn');
const menuOverlay = doc.getElementById('menuOverlay');
const playerName = doc.getElementById('playerName');
const playerEnergy = doc.getElementById('playerEnergy');
const playerGold = doc.getElementById('playerGold');
const playerAvatar = doc.querySelector('.player-avatar');
const inventoryGrid = doc.querySelector('.inventory-grid');


// --- FUNCIONES DE RENDERIZADO ---

function renderLocation(locationKey) {
    const location = gameData.locations[locationKey];
    if (!location) return;

    playerState.currentLocation = locationKey;

    // Renderizar escena principal
    locationImageContainer.innerHTML = location.svg;
    locationDescription.textContent = location.description;

    // Renderizar botones de acción
    actionsContainer.innerHTML = '';
    location.actions.forEach(action => {
        const button = doc.createElement('button');
        button.textContent = action.text;
        button.className = `action-button ${action.class || ''}`; // Añadido || '' para seguridad
        button.onclick = () => executeAction(action);
        actionsContainer.appendChild(button);
    });

    // Renderizar opciones de viaje
    choicesContainer.innerHTML = '';
    location.choices.forEach(choiceKey => {
        const choiceLocation = gameData.locations[choiceKey];
        const div = doc.createElement('div');
        div.className = 'choice-image-container';
        div.innerHTML = choiceLocation.svg;
        div.onclick = () => renderLocation(choiceKey);
        choicesContainer.appendChild(div);
    });
}

function renderUI() {
    // Stats principales
    energyDisplay.textContent = `Energía: ${playerState.energia}`;
    goldDisplay.textContent = `Oro: ${playerState.oro}`;

    // Stats del menú
    playerName.textContent = playerState.name;
    playerEnergy.textContent = `Energía: ${playerState.energia}/${playerState.energiaMax}`;
    playerGold.textContent = `Oro: ${playerState.oro}`;
    playerAvatar.innerHTML = playerState.avatarSvg;

    // Inventario
    inventoryGrid.innerHTML = '';
    playerState.inventory.forEach(item => {
        if (item.quantity > 0) {
            const itemData = gameData.items[item.itemId];
            const slot = doc.createElement('div');
            slot.className = 'inventory-slot';
            slot.innerHTML = itemData.svg;

            // --- Lógica de cantidad actualizada para un look minimalista ---
            if (item.quantity > 1) {
                const quantity = doc.createElement('span');
                quantity.className = 'item-quantity';
                quantity.textContent = item.quantity; // Solo el número
                slot.appendChild(quantity);
            }
            inventoryGrid.appendChild(slot);
        }
    });
}

// --- LÓGICA DEL JUEGO ---

function executeAction(action) {
    // Comprobar costes
    if (action.cost) {
        if (action.cost.energia && playerState.energia < action.cost.energia) {
            showNotification("No tienes suficiente energía.");
            return;
        }
        if (action.cost.oro && playerState.oro < action.cost.oro) {
            showNotification("No tienes suficiente oro.");
            return;
        }
         if (action.reward && action.reward.sellItemId) { // Comprobación añadida
            const itemToSell = playerState.inventory.find(i => i.itemId === action.reward.sellItemId);
            if (!itemToSell || itemToSell.quantity < action.reward.quantity) {
                 showNotification(`No tienes suficiente ${gameData.items[action.reward.sellItemId].name}.`);
                 return;
            }
        }
    }
    
    // Pagar costes
    if (action.cost) {
        if (action.cost.energia) playerState.energia -= action.cost.energia;
        if (action.cost.oro) playerState.oro -= action.cost.oro;
    }

    // Recibir recompensas
    if (action.reward) {
        if (action.reward.energia) {
             playerState.energia = Math.min(playerState.energiaMax, playerState.energia + action.reward.energia);
        }
        if(action.reward.itemId) {
            const itemInInventory = playerState.inventory.find(i => i.itemId === action.reward.itemId);
            if (itemInInventory) {
                itemInInventory.quantity += action.reward.quantity;
            } else {
                playerState.inventory.push({ itemId: action.reward.itemId, quantity: action.reward.quantity });
            }
        }
        if(action.reward.oro) {
            playerState.oro += action.reward.oro;
        }
        if (action.reward.sellItemId) {
            const itemToSell = playerState.inventory.find(i => i.itemId === action.reward.sellItemId);
            itemToSell.quantity -= action.reward.quantity;
        }
    }

    // Efecto visual y actualización
    playActionFeedback();
    renderUI();
}

function playActionFeedback() {
    // Una animación más sutil
    feedbackOverlay.classList.add('fading');
    feedbackOverlay.addEventListener('animationend', function handleFadeEnd() {
        feedbackOverlay.classList.remove('fading');
    }, { once: true });
}

function showNotification(message) {
    // Se mantiene el alert por simplicidad, pero el estilo general ha cambiado.
    console.log("Notificación:", message);
    alert(message);
}

// --- INICIALIZACIÓN ---
openMenuBtn.addEventListener('click', () => {
    renderUI(); // Asegura que el menú esté actualizado al abrir
    menuOverlay.classList.add('visible');
});
closeMenuBtn.addEventListener('click', () => menuOverlay.classList.remove('visible'));
menuOverlay.addEventListener('click', (event) => {
    if (event.target === menuOverlay) menuOverlay.classList.remove('visible');
});

// Asegurarse de que el script se ejecuta después de que el DOM esté listo.
doc.addEventListener('DOMContentLoaded', () => {
    renderLocation(playerState.currentLocation);
    renderUI();
});