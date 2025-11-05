import { getDatabase, ref, set, get, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
// --- ¡NUEVA IMPORTACIÓN! ---
// Importamos la función para construir la URL desde el archivo de constantes del juego.
import { getFirebaseStorageUrl } from './constantes.js';
// --- Caché de Imágenes ---
export const imageCache = {};

// --- Estado de Definiciones (Exportado) ---
export let localGroundTypes = {};
export let localEntityTypes = {}; 
export let localPortalTypes = {};
export let localBlockTypes = {}; 

// --- Símbolo de Inicio (Constante) ---
export const START_POS_SYMBOL = '🏁';

// --- Dependencias (Inyectadas desde main.js) ---
let db;
let showNotification;
let showLoading;
let hideLoading;
let onDefinitionsUpdated; 
let getMapIdList; 
let getCurrentMapId; 
let _redrawCallback = () => {};

// --- Elementos del DOM (Editor de Definiciones) ---
let tabBtnGround, tabBtnEntity, tabBtnPortal, tabBtnBlock; 
let tabContentGround, tabContentEntity, tabContentPortal, tabContentBlock; 
let defLlistGround, defLlistEntity, defLlistPortal, defLlistBlock; 
let addNewGroundBtn, addNewEntityBtn, addNewPortalBtn, addNewBlockBtn; 

// --- Elementos del DOM (Modal de Definiciones) ---
let definitionModal, definitionModalTitle, definitionForm, defTypeInput;
let defOriginalIdInput, defIdInput, defPassableInput, defImgSrcInput;
let defGroundFields, defColorInput, defCommonFields, defSymbolInput;
let defBaseWidthInput, defBaseHeightInput;
// --- ¡NUEVO! ---
let defRenderStyleInput; 
// ---
let defBlockFields, defImgSrcTopInput, defImgSrcLeftInput, defImgSrcRightInput, defHeightInput;
let definitionError, closeDefinitionBtn, saveDefinitionBtn;
let defInteractionsContainer, defInteractionsList, addInteractionBtn;
let interactionModal, interactionModalTitle, interactionForm, interactionIndexInput;
let interactionLabelInput, interactionActionTypeInput, interactionDialogGroup, interactionDialogTextInput;
let interactionReplaceGroup, interactionReplaceIdInput, interactionWaitGroup, interactionWaitDurationInput;
let interactionPortalGroup, interactionError, closeInteractionBtn, saveInteractionBtn;
let currentEditingInteractionsList = [];
let currentEditingInteractionIndex = -1;

// --- Elementos del DOM (Modal de Portal Instancia) ---
let portalModal, destMapSelect, destXInput, destZInput;
let savePortalBtn, closePortalBtn, portalCoordsTitle, portalError;
let currentEditingPortal = null;

// --- Elementos del DOM (Modal de NPC Instancia) ---
let npcModal, npcCoordsTitle, npcInstanceMovementInput, npcInstanceRouteGroup;
let npcInstanceRouteInput; 
let npcError, closeNpcBtn, saveNpcBtn;
let currentEditingNpc = null;

// --- Estado de Edición de Ruta ---
let editRouteBtn, stopRouteEditBtn;
export let isRouteEditing = false;
let currentRouteEditCoords = { x: 0, z: 0 };


/**
 * Inicializa el módulo de Entidades.
 */
export function initEntityModule(dbDep, notifyFn, loadingShowFn, loadingHideFn, updatedCallback) {
    db = dbDep;
    showNotification = notifyFn;
    showLoading = loadingShowFn;
    hideLoading = loadingHideFn;
    onDefinitionsUpdated = updatedCallback; 

    // ... (Obtención de DOM) ...
    tabBtnGround = document.getElementById('tab-btn-ground');
    tabBtnEntity = document.getElementById('tab-btn-entity');
    tabBtnPortal = document.getElementById('tab-btn-portal');
    tabBtnBlock = document.getElementById('tab-btn-block'); 
    tabContentGround = document.getElementById('tab-content-ground');
    tabContentEntity = document.getElementById('tab-content-entity');
    tabContentPortal = document.getElementById('tab-content-portal');
    tabContentBlock = document.getElementById('tab-content-block'); 
    defLlistGround = document.getElementById('def-list-ground');
    defLlistEntity = document.getElementById('def-list-entity');
    defLlistPortal = document.getElementById('def-list-portal');
    defLlistBlock = document.getElementById('def-list-block'); 
    addNewGroundBtn = document.getElementById('add-new-ground-btn');
    addNewEntityBtn = document.getElementById('add-new-entity-btn');
    addNewPortalBtn = document.getElementById('add-new-portal-btn');
    addNewBlockBtn = document.getElementById('add-new-block-btn'); 
    definitionModal = document.getElementById('definition-modal');
    definitionModalTitle = document.getElementById('definition-modal-title');
    definitionForm = document.getElementById('definition-form');
    defTypeInput = document.getElementById('def-type');
    defOriginalIdInput = document.getElementById('def-original-id');
    defIdInput = document.getElementById('def-id');
    defPassableInput = document.getElementById('def-passable');
    defImgSrcInput = document.getElementById('def-imgSrc');
    defGroundFields = document.getElementById('def-ground-fields');
    defColorInput = document.getElementById('def-color');
    defCommonFields = document.getElementById('def-common-fields');
    defSymbolInput = document.getElementById('def-symbol');
    defBaseWidthInput = document.getElementById('def-baseWidth');
    defBaseHeightInput = document.getElementById('def-baseHeight');
    // --- ¡NUEVO! ---
    defRenderStyleInput = document.getElementById('def-render-style');
    // ---
    definitionError = document.getElementById('definition-error');
    closeDefinitionBtn = document.getElementById('close-definition-button');
    saveDefinitionBtn = document.getElementById('save-definition-button');
    defBlockFields = document.getElementById('def-block-fields');
    defHeightInput = document.getElementById('def-height'); 
    defImgSrcTopInput = document.getElementById('def-imgSrcTop');
    defImgSrcLeftInput = document.getElementById('def-imgSrcLeft');
    defImgSrcRightInput = document.getElementById('def-imgSrcRight');
    defInteractionsContainer = document.getElementById('def-interactions-container');
    defInteractionsList = document.getElementById('def-interactions-list');
    addInteractionBtn = document.getElementById('add-interaction-btn');
    interactionModal = document.getElementById('interaction-modal');
    interactionModalTitle = document.getElementById('interaction-modal-title');
    interactionForm = document.getElementById('interaction-form');
    interactionIndexInput = document.getElementById('interaction-index');
    interactionLabelInput = document.getElementById('interaction-label');
    interactionActionTypeInput = document.getElementById('interaction-action-type');
    interactionDialogGroup = document.getElementById('interaction-dialog-group');
    interactionDialogTextInput = document.getElementById('interaction-dialogText');
    interactionReplaceGroup = document.getElementById('interaction-replace-group');
    interactionReplaceIdInput = document.getElementById('interaction-replaceId');
    interactionWaitGroup = document.getElementById('interaction-wait-group');
    interactionWaitDurationInput = document.getElementById('interaction-wait-duration');
    interactionPortalGroup = document.getElementById('interaction-portal-group');
    interactionError = document.getElementById('interaction-error');
    closeInteractionBtn = document.getElementById('close-interaction-button');
    saveInteractionBtn = document.getElementById('save-interaction-button');
    portalModal = document.getElementById('portal-modal');
    destMapSelect = document.getElementById('portal-dest-map');
    destXInput = document.getElementById('portal-dest-x');
    destZInput = document.getElementById('portal-dest-z');
    savePortalBtn = document.getElementById('save-portal-button');
    closePortalBtn = document.getElementById('close-portal-button');
    portalCoordsTitle = document.getElementById('portal-coords');
    portalError = document.getElementById('portal-error');
    npcModal = document.getElementById('npc-modal');
    npcCoordsTitle = document.getElementById('npc-coords');
    npcInstanceMovementInput = document.getElementById('npc-instance-movement');
    npcInstanceRouteGroup = document.getElementById('npc-instance-route-group');
    npcInstanceRouteInput = document.getElementById('npc-instance-route');
    npcError = document.getElementById('npc-error');
    closeNpcBtn = document.getElementById('close-npc-button');
    saveNpcBtn = document.getElementById('save-npc-button');
    editRouteBtn = document.getElementById('edit-route-btn');
    stopRouteEditBtn = document.getElementById('stop-route-edit-btn');
    
    // ... (Asignación de Listeners - Sin cambios) ...
    const tabs = [tabBtnGround, tabBtnBlock, tabBtnPortal, tabBtnEntity]; 
    const tabContents = [tabContentGround, tabContentBlock, tabContentPortal, tabContentEntity]; 
    function switchTab(tabToActivate) {
        tabs.forEach((tab, index) => {
            if (tab === tabToActivate) {
                tab.classList.remove('inactive');
                tab.classList.add('active');
                if (tabContents[index]) tabContents[index].style.display = 'block';
            } else {
                tab.classList.remove('active');
                tab.classList.add('inactive');
                if (tabContents[index]) tabContents[index].style.display = 'none';
            }
        });
    }
    tabs.forEach(tab => {
        if (tab) tab.onclick = () => switchTab(tab);
    });
    if (tabs[0]) switchTab(tabBtnGround); 
    if (addNewGroundBtn) addNewGroundBtn.onclick = () => openDefinitionModal('ground');
    if (addNewBlockBtn) addNewBlockBtn.onclick = () => openDefinitionModal('block'); 
    if (addNewPortalBtn) addNewPortalBtn.onclick = () => openDefinitionModal('portal');
    if (addNewEntityBtn) addNewEntityBtn.onclick = () => openDefinitionModal('entity'); 
    if (saveDefinitionBtn) saveDefinitionBtn.addEventListener('click', saveDefinition);
    if (closeDefinitionBtn) closeDefinitionBtn.addEventListener('click', closeDefinitionModal);
    if (addInteractionBtn) addInteractionBtn.addEventListener('click', () => openInteractionModal(-1));
    if (closeInteractionBtn) closeInteractionBtn.addEventListener('click', closeInteractionModal);
    if (saveInteractionBtn) saveInteractionBtn.addEventListener('click', saveInteraction);
    if (interactionActionTypeInput) interactionActionTypeInput.addEventListener('change', toggleInteractionModalFields);
    if (savePortalBtn) savePortalBtn.addEventListener('click', savePortalDest);
    if (closePortalBtn) closePortalBtn.addEventListener('click', closePortalModal);
    if (saveNpcBtn) saveNpcBtn.addEventListener('click', saveNpcInstance);
    if (closeNpcBtn) closeNpcBtn.addEventListener('click', closeNpcModal);
    if (npcInstanceMovementInput) npcInstanceMovementInput.addEventListener('change', toggleNpcInstanceFields);
    if(editRouteBtn) editRouteBtn.addEventListener('click', startRouteEditing);
    if(stopRouteEditBtn) stopRouteEditBtn.addEventListener('click', stopRouteEditing);
}


export function setRedrawCallback(redrawFn) {
    _redrawCallback = redrawFn;
}

export function initInstanceModalDependencies(getMapIdListFn, getCurrentMapIdFn) {
    getMapIdList = getMapIdListFn;
    getCurrentMapId = getCurrentMapIdFn;
}

// --- GESTIÓN DE PRECARGA DE IMÁGENES ---

export function preloadImage(src) {
    if (!src) {
        return; 
    }
    const storageUrl = getFirebaseStorageUrl(src);
    if (!storageUrl) {
        return;
    }
    if (imageCache[storageUrl]) {
        return;
    }
    const img = new Image();
    img.onload = () => {
        console.log(`(Editor) Imagen cargada: ${storageUrl}`);
        if (_redrawCallback) {
            _redrawCallback(); 
        }
    };
    img.onerror = () => {
        console.warn(`(Editor) Error al cargar la imagen: ${storageUrl}`);
        imageCache[storageUrl] = null; 
    };
    img.crossOrigin = "anonymous";
    img.src = storageUrl;
    imageCache[storageUrl] = img; 
}


// --- GESTIÓN DE DEFINICIONES (DATOS) ---

export async function loadDefinitions() {
    return new Promise((resolve, reject) => {
        const defsRef = ref(db, 'moba-demo-definitions');
        onValue(defsRef, (snapshot) => {
            const data = snapshot.val() || {};
            localGroundTypes = data.groundTypes || {};
            localBlockTypes = data.blockTypes || {}; 
            localPortalTypes = data.portalTypes || {};
            localEntityTypes = { 
                ...(data.elementTypes || {}), 
                ...(data.npcTypes || {}),      
                ...(data.entityTypes || {})    
            }; 
            if (!localGroundTypes['void']) {
                localGroundTypes['void'] = { id: 'void', color: '#111111', passable: false, imgSrcTop: null };
            }
            if (!localEntityTypes['none']) {
                localEntityTypes['none'] = { id: 'none', symbol: '❌', passable: true, drawType: 'none' };
            }
            if (!localPortalTypes['portal_default']) {
                localPortalTypes['portal_default'] = {
                    id: 'portal_default',
                    symbol: '🌀',
                    passable: true
                };
            }
            const allDefs = [ ...Object.values(localGroundTypes), ...Object.values(localEntityTypes), ...Object.values(localPortalTypes), ...Object.values(localBlockTypes) ];
            
            allDefs.forEach(def => {
                if (def.imgSrc) preloadImage(def.imgSrc);
                if (def.imgSrcTop) preloadImage(def.imgSrcTop);
                if (def.imgSrcLeft) preloadImage(def.imgSrcLeft);
                if (def.imgSrcRight) preloadImage(def.imgSrcRight);
            });
            console.log("Definiciones cargadas:", { localGroundTypes, localEntityTypes, localPortalTypes, localBlockTypes });
            resolve({ 
                groundTypes: localGroundTypes, 
                entityTypes: localEntityTypes,
                portalTypes: localPortalTypes, 
                blockTypes: localBlockTypes 
            });
        }, (error) => {
            console.error("Error al cargar definiciones: ", error);
            showNotification("Error al cargar definiciones.", true);
            reject(error);
        });
    });
}


async function saveDefinition() {
    const type = defTypeInput.value;
    const newId = defIdInput.value.trim().replace(/[\.\#\$\[\]\/]/g, '_'); 
    const originalId = defOriginalIdInput.value;
    if (!newId) {
        definitionError.textContent = "El ID es obligatorio.";
        definitionError.classList.remove('hidden');
        return;
    }
    if (newId !== originalId) {
        const allDefs = { ...localGroundTypes, ...localEntityTypes, ...localPortalTypes, ...localBlockTypes }; 
        if (allDefs[newId]) {
            definitionError.textContent = "Ese ID ya existe en alguna categoría. Elige otro.";
            definitionError.classList.remove('hidden');
            return;
        }
    }
    showLoading();
    let definitionData = {
        id: newId,
        passable: defPassableInput.value === 'true',
        imgSrc: defImgSrcInput.value.trim() || null,
        symbol: defSymbolInput.value.trim() || null,
        baseWidth: parseInt(defBaseWidthInput.value, 10) || null,
        baseHeight: parseInt(defBaseHeightInput.value, 10) || null,
        interactions: currentEditingInteractionsList || [] 
    };
    let dbPath = 'moba-demo-definitions/';
    
    if (type === 'ground') {
        definitionData.color = defColorInput.value;
        definitionData.imgSrc = null; 
        definitionData.imgSrcTop = defImgSrcTopInput.value.trim() || null;
        definitionData.imgSrcLeft = defImgSrcLeftInput.value.trim() || null;
        definitionData.imgSrcRight = defImgSrcRightInput.value.trim() || null;
        definitionData.symbol = null;
        definitionData.baseWidth = null;
        definitionData.baseHeight = null;
        definitionData.interactions = []; 
        dbPath += 'groundTypes';
        
    } else if (type === 'entity') {
        definitionData.drawType = (definitionData.imgSrc) ? 'sprite' : 'none'; 
        // --- ¡NUEVO! ---
        definitionData.renderStyle = defRenderStyleInput.value || 'cross';
        // ---
        dbPath += 'entityTypes'; 
        
    } else if (type === 'portal') {
        definitionData.drawType = 'portal';
        dbPath += 'portalTypes';
        
    } else if (type === 'block') { 
        definitionData.passable = false; 
        definitionData.imgSrc = null; 
        definitionData.baseWidth = null;
        definitionData.baseHeight = null;
        definitionData.drawType = 'block';
        definitionData.height = parseFloat(defHeightInput.value) || 1.0; 
        definitionData.imgSrcTop = defImgSrcTopInput.value.trim() || null;
        definitionData.imgSrcLeft = defImgSrcLeftInput.value.trim() || null;
        definitionData.imgSrcRight = defImgSrcRightInput.value.trim() || null;
        dbPath += 'blockTypes';
    }
    
    try {
        const newDefRef = ref(db, `${dbPath}/${newId}`);
        await set(newDefRef, definitionData);
        if (originalId && newId !== originalId) {
            const oldDefRef = ref(db, `${dbPath}/${originalId}`); 
            await remove(oldDefRef);
            showNotification(`Definición renombrada a '${newId}'!`);
        } else if (originalId && newId === originalId) {
            showNotification(`Definición '${newId}' guardada!`);
            // Limpiar definiciones antiguas (si existen)
            if (type === 'entity') {
                const oldNpcRef = ref(db, `moba-demo-definitions/npcTypes/${originalId}`);
                await remove(oldNpcRef); 
                const oldElemRef = ref(db, `moba-demo-definitions/elementTypes/${originalId}`);
                await remove(oldElemRef); 
            }
        } else {
            showNotification(`Definición '${newId}' guardada!`);
        }
        closeDefinitionModal();
        onDefinitionsUpdated(); 
    } catch (error) {
        console.error("Error guardando definición: ", error);
        showNotification("Error al guardar la definición.", true);
    } finally {
        hideLoading();
    }
}

async function deleteDefinition(type, id) {
    if (id === 'void' || id === 'none' || id === 'portal_default') {
        showNotification("No se puede borrar esta definición base.", true);
        return;
    }
    showNotification(`Borrando '${id}'...`, false);
    let dbPath = 'moba-demo-definitions/';
    if (type === 'ground') dbPath += 'groundTypes';
    else if (type === 'entity') dbPath += 'entityTypes'; 
    else if (type === 'portal') dbPath += 'portalTypes';
    else if (type === 'block') dbPath += 'blockTypes'; 
    showLoading();
    try {
        const defRef = ref(db, `${dbPath}/${id}`);
        await remove(defRef);
        // Limpiar también de las rutas antiguas por si acaso
        if (type === 'entity') {
             const oldNpcRef = ref(db, `moba-demo-definitions/npcTypes/${id}`);
             await remove(oldNpcRef); 
             const oldElemRef = ref(db, `moba-demo-definitions/elementTypes/${id}`);
             await remove(oldElemRef); 
        }
        showNotification(`Definición '${id}' borrada.`);
        onDefinitionsUpdated(); 
    } catch (error) {
        console.error("Error borrando definición: ", error);
        showNotification(`Error al borrar '${id}'.`, true);
    } finally {
        hideLoading();
    }
}


// --- GESTIÓN DE UI (DEFINICIONES) ---

export function updateDefinitionListUI(type, data, container) {
    if (!container) return;
    container.innerHTML = '';
    const keys = Object.keys(data).sort();
    if (keys.length === 0) {
        container.innerHTML = `<p class="text-gray-400">No hay definiciones.</p>`;
        return;
    }
    keys.forEach(key => {
        const def = data[key];
        const item = document.createElement('div');
        item.className = 'def-item flex justify-between items-center bg-gray-600 p-3 rounded-lg shadow-sm mb-2';
        const name = document.createElement('span');
        name.className = 'def-item-name font-medium text-gray-200 truncate';
        name.textContent = def.symbol ? `${def.id} (${def.symbol})` : def.id;
        name.title = def.id;
        const buttons = document.createElement('div');
        buttons.className = 'def-item-buttons flex gap-2';
        const editBtn = document.createElement('button');
        editBtn.className = 'def-item-button-edit px-3 py-1 bg-yellow-500 text-black text-sm rounded-md hover:bg-yellow-600 transition-colors';
        editBtn.textContent = 'Editar';
        editBtn.onclick = () => openDefinitionModal(type, def);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'def-item-button-delete px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors';
        deleteBtn.textContent = 'Borrar';
        deleteBtn.onclick = () => deleteDefinition(type, def.id);
        if (def.id === 'void' || def.id === 'none' || def.id === 'portal_default') {
            deleteBtn.disabled = true;
            deleteBtn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        buttons.appendChild(editBtn);
        buttons.appendChild(deleteBtn);
        item.appendChild(name);
        item.appendChild(buttons);
        container.appendChild(item);
    });
}


function openDefinitionModal(type, def = null) {
    definitionForm.reset();
    definitionError.classList.add('hidden');
    defTypeInput.value = type;
    currentEditingInteractionsList = []; 
    
    // Ocultar todos los campos específicos
    defGroundFields.style.display = 'none';
    defCommonFields.style.display = 'none';
    defBlockFields.style.display = 'none'; 
    defInteractionsContainer.style.display = 'none'; 
    // --- ¡NUEVO! ---
    if (defRenderStyleInput) defRenderStyleInput.parentElement.style.display = 'none';
    // ---
    
    // Selectores para campos comunes
    const commonImgSrcEl = document.querySelector('label[for="def-imgSrc"]');
    const commonSymbolEl = document.querySelector('label[for="def-symbol"]');
    const commonPassableEl = document.querySelector('label[for="def-passable"]');
    const commonWidthHeightEl = defBaseWidthInput ? defBaseWidthInput.parentElement.parentElement : null;
    const commonImgSrc = commonImgSrcEl ? commonImgSrcEl.parentElement.parentElement : null; // Ir al div padre
    const commonSymbol = commonSymbolEl ? commonSymbolEl.parentElement : null;
    const commonPassable = commonPassableEl ? commonPassableEl.parentElement : null;
    const commonWidthHeight = commonWidthHeightEl;
    
    defPassableInput.disabled = false;
    
    // Cargar datos si es edición
    if (def) {
        definitionModalTitle.textContent = `Editar Definición (${type})`;
        defOriginalIdInput.value = def.id;
        defIdInput.value = def.id;
        defIdInput.readOnly = (def.id === 'void' || def.id === 'none' || def.id === 'portal_default'); 
        defPassableInput.value = def.passable ? 'true' : 'false';
        defImgSrcInput.value = def.imgSrc || '';
        defSymbolInput.value = def.symbol || '';
        defBaseWidthInput.value = def.baseWidth || '';
        defBaseHeightInput.value = def.baseHeight || '';
        // --- ¡NUEVO! ---
        if (defRenderStyleInput) {
            defRenderStyleInput.value = def.renderStyle || 'cross'; // 'cross' por defecto
        }
        // ---
        currentEditingInteractionsList = def.interactions ? JSON.parse(JSON.stringify(def.interactions)) : [];
    } else {
        // Defaults si es nuevo
        definitionModalTitle.textContent = `Crear Nuevo (${type})`;
        defOriginalIdInput.value = '';
        defIdInput.readOnly = false;
        // --- ¡NUEVO! ---
        if (defRenderStyleInput) {
            defRenderStyleInput.value = 'cross'; // 'cross' por defecto
        }
        // ---
    }
    
    // Mostrar campos por tipo
    if (type === 'ground') {
        if (defGroundFields) defGroundFields.style.display = 'block'; 
        if (defBlockFields) defBlockFields.style.display = 'block';
        if (commonPassable) commonPassable.style.display = 'block';
        if (commonImgSrc) commonImgSrc.style.display = 'none';
        if (commonSymbol) commonSymbol.style.display = 'none';
        if (commonWidthHeight) commonWidthHeight.style.display = 'none';
        if (def) {
            defColorInput.value = def.color || '#ffffff'; 
            defImgSrcTopInput.value = def.imgSrcTop || '';
            defImgSrcLeftInput.value = def.imgSrcLeft || '';
            defImgSrcRightInput.value = def.imgSrcRight || '';
        }
    } else if (type === 'entity') {
        if (defCommonFields) defCommonFields.style.display = 'block';
        if (defInteractionsContainer) defInteractionsContainer.style.display = 'block';
        if (commonPassable) commonPassable.style.display = 'block';
        if (commonImgSrc) commonImgSrc.style.display = 'block';
        if (commonSymbol) commonSymbol.style.display = 'block';
        if (commonWidthHeight) commonWidthHeight.style.display = 'block';
        // --- ¡NUEVO! ---
        if (defRenderStyleInput) defRenderStyleInput.parentElement.style.display = 'block';
        // ---
        if (defGroundFields) defGroundFields.style.display = 'none';
        if (defBlockFields) defBlockFields.style.display = 'none';
    } else if (type === 'portal') {
        if (defCommonFields) defCommonFields.style.display = 'block';
        if (defInteractionsContainer) defInteractionsContainer.style.display = 'block';
        if (commonPassable) commonPassable.style.display = 'block';
        if (commonImgSrc) commonImgSrc.style.display = 'block';
        if (commonSymbol) commonSymbol.style.display = 'block';
        if (commonWidthHeight) commonWidthHeight.style.display = 'block';
        if (defGroundFields) defGroundFields.style.display = 'none';
        if (defBlockFields) defBlockFields.style.display = 'none';
    } else if (type === 'block') { 
        if (defCommonFields) defCommonFields.style.display = 'block';
        if (defBlockFields) defBlockFields.style.display = 'block'; 
        if (defInteractionsContainer) defInteractionsContainer.style.display = 'block';
        if (commonPassable) commonPassable.style.display = 'block';
        defPassableInput.value = 'false'; 
        defPassableInput.disabled = true;
        if (commonImgSrc) commonImgSrc.style.display = 'none';
        if (commonWidthHeight) commonWidthHeight.style.display = 'none';
        if (defGroundFields) defGroundFields.style.display = 'none';
        if (def) {
            defSymbolInput.value = def.symbol || '🧱';
            defHeightInput.value = def.height || '1.0'; 
            defImgSrcTopInput.value = def.imgSrcTop || '';
            defImgSrcLeftInput.value = def.imgSrcLeft || '';
            defImgSrcRightInput.value = def.imgSrcRight || '';
        } else {
            defHeightInput.value = '1.0'; 
        }
    }
    renderInteractionsList(); 
    definitionModal.style.display = 'flex';
}

function closeDefinitionModal() {
    definitionModal.style.display = 'none';
}

// --- Gestión del Modal de Interacción ---

function renderInteractionsList() {
    if (!defInteractionsList) return; 
    defInteractionsList.innerHTML = '';
    if (currentEditingInteractionsList.length === 0) {
        defInteractionsList.innerHTML = '<p class="text-gray-500 text-sm italic">No hay interacciones definidas.</p>';
        return;
    }
    currentEditingInteractionsList.forEach((interaction, index) => {
        const item = document.createElement('div');
        item.className = 'def-item flex justify-between items-center bg-gray-100 p-2 rounded-lg shadow-sm';
        const name = document.createElement('span');
        name.className = 'font-medium text-gray-700';
        name.textContent = `${interaction.label} (${interaction.actionType})`;
        const buttons = document.createElement('div');
        buttons.className = 'flex gap-2';
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'px-3 py-1 bg-yellow-500 text-black text-sm rounded-md hover:bg-yellow-600 transition-colors';
        editBtn.textContent = 'Editar';
        editBtn.onclick = () => openInteractionModal(index);
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors';
        deleteBtn.textContent = 'Borrar';
        deleteBtn.onclick = () => deleteInteraction(index);
        buttons.appendChild(editBtn);
        buttons.appendChild(deleteBtn);
        item.appendChild(name);
        item.appendChild(buttons);
        defInteractionsList.appendChild(item);
    });
}

function openInteractionModal(index) {
    interactionForm.reset();
    interactionError.classList.add('hidden');
    currentEditingInteractionIndex = index;
    if (index === -1) {
        interactionModalTitle.textContent = "Añadir Interacción";
    } else {
        interactionModalTitle.textContent = "Editar Interacción";
        const interaction = currentEditingInteractionsList[index];
        interactionLabelInput.value = interaction.label;
        interactionActionTypeInput.value = interaction.actionType;
        interactionDialogTextInput.value = interaction.dialogText || '';
        interactionReplaceIdInput.value = interaction.replaceId || '';
        interactionWaitDurationInput.value = interaction.duration || '';
    }
    toggleInteractionModalFields();
    interactionModal.style.display = 'flex';
}

function closeInteractionModal() {
    interactionModal.style.display = 'none';
}

function toggleInteractionModalFields() {
    const actionType = interactionActionTypeInput.value;
    if (interactionDialogGroup) interactionDialogGroup.style.display = (actionType === 'dialog') ? 'block' : 'none';
    if (interactionPortalGroup) interactionPortalGroup.style.display = (actionType === 'portal_teleport') ? 'block' : 'none';
    const showReplace = (actionType === 'collect_replace' || actionType === 'replace_self' || actionType === 'wait_replace');
    if (interactionReplaceGroup) interactionReplaceGroup.style.display = showReplace ? 'block' : 'none';
    const showWait = (actionType === 'wait_replace');
    if (interactionWaitGroup) interactionWaitGroup.style.display = showWait ? 'block' : 'none';
}

function saveInteraction() {
    const label = interactionLabelInput.value.trim();
    if (!label) {
        interactionError.textContent = "La etiqueta es obligatoria.";
        interactionError.classList.remove('hidden');
        return;
    }
    const interaction = {
        label: label,
        actionType: interactionActionTypeInput.value,
        dialogText: interactionDialogTextInput.value.trim() || null,
        replaceId: interactionReplaceIdInput.value.trim() || null,
        duration: parseInt(interactionWaitDurationInput.value, 10) || 0
    };
    if (currentEditingInteractionIndex === -1) {
        currentEditingInteractionsList.push(interaction);
    } else {
        currentEditingInteractionsList[currentEditingInteractionIndex] = interaction;
    }
    renderInteractionsList();
    closeInteractionModal();
}

function deleteInteraction(index) {
    currentEditingInteractionsList.splice(index, 1);
    renderInteractionsList();
}


// --- GESTIÓN DE UI (HERRAMIENTAS) ---

function createToolButton(container, def, type, selectToolCallback) {
    const btn = document.createElement('button');
    btn.className = 'tool-button'; 
    btn.onclick = () => selectToolCallback(btn, type, def.id);
    btn.dataset.toolType = type;
    btn.dataset.toolId = def.id;
    btn.title = def.id; 

    const imgContainer = document.createElement('div');
    imgContainer.className = 'tool-button-img-container';

    let fileName = def.imgSrc;
    if (type === 'ground' || type === 'block') {
        fileName = def.imgSrcTop;
    }

    const storageUrl = fileName ? getFirebaseStorageUrl(fileName) : null;
    const imgFromCache = storageUrl ? imageCache[storageUrl] : null;

    if (imgFromCache && imgFromCache.complete) {
        const img = document.createElement('img');
        img.src = imgFromCache.src; 
        img.className = 'tool-button-img';
        img.alt = def.id;
        imgContainer.appendChild(img);
    } else {
        imgContainer.classList.add('fallback');
        if (type === 'ground') {
            imgContainer.style.backgroundColor = def.color || '#FF00FF';
        } else {
            imgContainer.textContent = def.symbol || '?';
        }
    }
    
    const label = document.createElement('span');
    label.className = 'tool-button-label';
    label.textContent = def.id;

    btn.appendChild(imgContainer);
    btn.appendChild(label);
    container.appendChild(btn);
    return btn;
}

export function populateTools(containers, selectToolCallback) {
    const { groundToolsContainer, entityToolsContainer, portalToolsContainer, blockToolsContainer } = containers; 
    
    if (groundToolsContainer) {
        groundToolsContainer.innerHTML = '';
        const groundKeys = Object.keys(localGroundTypes).sort((a, b) => (a === 'void' ? -1 : b === 'void' ? 1 : a.localeCompare(b)));
        for (const key of groundKeys) {
            createToolButton(groundToolsContainer, localGroundTypes[key], 'ground', selectToolCallback);
        }
    }
    
    if (entityToolsContainer) {
        entityToolsContainer.innerHTML = '';
        const entityKeys = Object.keys(localEntityTypes).sort((a, b) => (a === 'none' ? -1 : b === 'none' ? 1 : a.localeCompare(b)));
        for (const key of entityKeys) {
            createToolButton(entityToolsContainer, localEntityTypes[key], 'entity', selectToolCallback);
        }
        createToolButton(entityToolsContainer, { id: 'Pos. Inicial', symbol: START_POS_SYMBOL }, 'start_pos', selectToolCallback);
    }
    
    if (portalToolsContainer) {
        portalToolsContainer.innerHTML = '';
        const portalKeys = Object.keys(localPortalTypes).sort();
        for (const key of portalKeys) {
            createToolButton(portalToolsContainer, localPortalTypes[key], 'portal', selectToolCallback);
        }
    }

    if (blockToolsContainer) {
        blockToolsContainer.innerHTML = '';
        const blockKeys = Object.keys(localBlockTypes).sort();
        for (const key of blockKeys) {
            createToolButton(blockToolsContainer, localBlockTypes[key], 'block', selectToolCallback);
        }
    }
}

// --- GESTIÓN DE UI (MODALES DE INSTANCIA) ---

export function openPortalModal(portalObject, x, z) {
    currentEditingPortal = portalObject; 
    portalCoordsTitle.textContent = `Editar Portal en (X:${x}, Z:${z})`;
    const mapIdList = getMapIdList();
    const currentMapId = getCurrentMapId();
    destMapSelect.innerHTML = '<option value="">-- Selecciona un mapa --</option>'; 
    const currentMapOption = document.createElement('option');
    currentMapOption.value = currentMapId;
    currentMapOption.textContent = `${currentMapId} (Este Mapa)`;
    destMapSelect.appendChild(currentMapOption);
    mapIdList.forEach(mapId => {
        if (mapId !== currentMapId) {
            const option = document.createElement('option');
            option.value = mapId;
            option.textContent = mapId;
            destMapSelect.appendChild(option);
        }
    });
    destMapSelect.value = portalObject.destMap ?? '';
    destXInput.value = portalObject.destX ?? '';
    destZInput.value = portalObject.destZ ?? ''; 
    portalError.classList.add('hidden');
    portalModal.style.display = 'flex';
}
function closePortalModal() {
    portalModal.style.display = 'none';
    currentEditingPortal = null;
}
function savePortalDest() {
    if (!currentEditingPortal) return;
    const destMap = destMapSelect.value;
    const destX = parseInt(destXInput.value, 10);
    const destZ = parseInt(destZInput.value, 10);
    if (!destMap) {
        portalError.textContent = `Debes seleccionar un mapa de destino.`;
        portalError.classList.remove('hidden');
        return;
    }
    if (isNaN(destX) || isNaN(destZ) || destX < 0 || destZ < 0) {
        portalError.textContent = `Las coordenadas X y Z deben ser números positivos.`;
        portalError.classList.remove('hidden');
        return;
    }
    currentEditingPortal.destMap = destMap;
    currentEditingPortal.destX = destX;
    currentEditingPortal.destZ = destZ;
    closePortalModal();
    onDefinitionsUpdated();
}

export function openNpcModal(npcObject, x, z) {
    currentEditingNpc = npcObject;
    currentRouteEditCoords = { x, z }; 
    npcCoordsTitle.textContent = `Editar Entidad en (X:${x}, Z:${z})`;
    npcInstanceMovementInput.value = npcObject.movement || 'still';
    npcInstanceRouteInput.value = JSON.stringify(npcObject.route || []);
    toggleNpcInstanceFields(); 
    npcError.classList.add('hidden');
    npcModal.style.display = 'flex';
}
function closeNpcModal() {
    npcModal.style.display = 'none';
    currentEditingNpc = null;
}
function saveNpcInstance() {
    if (!currentEditingNpc) return;
    const movement = npcInstanceMovementInput.value;
    let route = [];
    if (movement === 'route') {
        try {
            route = JSON.parse(npcInstanceRouteInput.value || '[]'); 
            if (!Array.isArray(route)) {
                throw new Error("La ruta debe ser un array.");
            }
        } catch (e) {
            npcError.textContent = `Error en el formato JSON de la ruta: ${e.message}`;
            npcError.classList.remove('hidden');
            return;
        }
    }
    currentEditingNpc.movement = movement;
    currentEditingNpc.route = route;
    closeNpcModal();
    onDefinitionsUpdated(); 
}
function toggleNpcInstanceFields() {
    if (npcInstanceMovementInput && npcInstanceRouteGroup) {
        const movement = npcInstanceMovementInput.value;
        if (movement === 'route') {
            npcInstanceRouteGroup.style.display = 'block';
        } else {
            npcInstanceRouteGroup.style.display = 'none';
        }
    }
}


// --- Edición de Ruta (Sin cambios) ---

function startRouteEditing() {
    if (!currentEditingNpc) return;
    isRouteEditing = true;
    closeNpcModal();
    if (stopRouteEditBtn) stopRouteEditBtn.style.display = 'block';
    showNotification("Modo Edición de Ruta: Haz clic en el mapa para añadir puntos. Pulsa 'Terminar' para guardar.", false);
    onDefinitionsUpdated(); 
}

function stopRouteEditing() {
    isRouteEditing = false;
    if (stopRouteEditBtn) stopRouteEditBtn.style.display = 'none';
    onDefinitionsUpdated(); 
    if (currentEditingNpc) {
        openNpcModal(currentEditingNpc, currentRouteEditCoords.x, currentRouteEditCoords.z);
    }
}

export function addWaypointToCurrentNpc(x, z) {
    if (!isRouteEditing || !currentEditingNpc) return;
    if (!Array.isArray(currentEditingNpc.route)) {
        currentEditingNpc.route = [];
    }
    currentEditingNpc.route.push([x, z]);
    if (npcInstanceRouteInput) npcInstanceRouteInput.value = JSON.stringify(currentEditingNpc.route);
    onDefinitionsUpdated(); 
}

export function getCurrentNpcRoute() {
    return isRouteEditing ? (currentEditingNpc.route || []) : null;
}