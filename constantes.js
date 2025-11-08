// --- Constantes de Storage ---

// Tu bucket de Firebase Storage.
const STORAGE_BUCKET_ID = "enraya-51670.firebasestorage.app";

// URL base de la API de Firebase Storage
const STORAGE_BUCKET_URL = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET_ID}/o/`;

// Carpetas de Storage
const IMAGE_FOLDER = 'recursos';
const MODEL_FOLDER = 'modelos'; // ¡NUEVO!

/**
 * Construye la URL pública de un archivo de IMAGEN en Firebase Storage.
 * Asume que todos los archivos están en la carpeta definida en IMAGE_FOLDER.
 * @param {string} fileName - El nombre del archivo (ej: "tree_01.png")
 * @returns {string|null} - La URL completa para acceder al archivo, o null si no hay nombre.
 */
export function getFirebaseStorageUrl(fileName) {
    if (!fileName) {
        return null;
    }
    
    // Codifica el nombre de la carpeta y el archivo para la URL
    // 'recursos/tree_01.png' se convierte en 'recursos%2Ftree_01.png'
    const encodedPath = encodeURIComponent(`${IMAGE_FOLDER}/${fileName}`);
    
    // Devuelve la URL pública completa
    return `${STORAGE_BUCKET_URL}${encodedPath}?alt=media`;
}

/**
 * ¡NUEVO!
 * Construye la URL pública de un archivo de MODELO 3D en Firebase Storage.
 * Asume que todos los archivos están en la carpeta definida en MODEL_FOLDER.
 * @param {string} fileName - El nombre del archivo (ej: "tank.glb")
 * @returns {string|null} - La URL completa para acceder al archivo, o null si no hay nombre.
 */
export function getFirebaseModelUrl(fileName) {
    if (!fileName) {
        return null;
    }
    
    // Codifica el nombre de la carpeta y el archivo para la URL
    // 'modelos/tank.glb' se convierte en 'modelos%2Ftank.glb'
    const encodedPath = encodeURIComponent(`${MODEL_FOLDER}/${fileName}`);
    
    // Devuelve la URL pública completa
    return `${STORAGE_BUCKET_URL}${encodedPath}?alt=media`;
}