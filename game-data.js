// --- BASE DE DATOS DEL JUEGO ---
const gameData = {
    items: {
        'log': { name: 'Tronco', svg: '<svg viewBox="0 0 100 100"><rect x="20" y="40" width="60" height="20" rx="10" fill="#8B5A2B"/><rect x="25" y="38" width="50" height="24" rx="12" fill="none" stroke="#654321" stroke-width="2"/></svg>' },
        'potion': { name: 'Poción', svg: '<svg viewBox="0 0 100 100"><path d="M30 90h40v-10h-40z M40 80h20v-30h-20z M50 20a10 10 0 0 1 0 20h-10v-10a10 10 0 0 1 10-10z" fill="#e53e3e"/><rect x="45" y="10" width="10" height="10" fill="#c53030"/></svg>' },
        'gem': { name: 'Gema', svg: '<svg viewBox="0 0 100 100"><path d="M50 10 L80 40 L50 90 L20 40 Z" fill="#805ad5"/><path d="M50 10 L80 40 L50 45 Z" fill="#6b46c1"/><path d="M20 40 L50 45 L50 90 Z" fill="#9f7aea"/></svg>' },
        'diamond': { name: 'Diamante', svg: '<svg viewBox="0 0 100 100"><path d="M50 5 L95 50 L50 95 L5 50 Z" fill="#38b2ac"/><path d="M50 5 L95 50 L50 55 Z" fill="#2c7a7b"/><path d="M5 50 L50 55 L50 95 Z" fill="#4fd1c5"/></svg>' },
        'iron': { name: 'Hierro', svg: '<svg viewBox="0 0 100 100"><path d="M20 80 C 20 60, 40 60, 50 70 S 80 80, 80 60 S 60 20, 40 30 S 20 40, 20 60 Z" fill="#a0aec0"/><path d="M30 50 C 35 45, 45 45, 50 50" fill="none" stroke="#718096" stroke-width="3"/></svg>' },
        // --- NUEVO ÍTEM ---
        'pez': { name: 'Pez', svg: '<svg viewBox="0 0 100 100"><path d="M20 50 C 40 30, 70 30, 90 50 C 70 70, 40 70, 20 50 Z" fill="#4299e1"/><path d="M85 50 L95 60 L95 40 Z" fill="#2b6cb0"/><circle cx="35" cy="48" r="3" fill="white"/><circle cx="35" cy="48" r="1.5" fill="black"/></svg>'}
    },
    locations: {
        'bosque': {
            name: 'Bosque Susurrante',
            svg: '<svg viewBox="0 0 400 400"><rect width="400" height="300" fill="#87CEEB"/><path d="M0 300 H 400 V 200 C 300 250, 100 250, 0 200 Z" fill="#228B22"/><path d="M50 220 L75 120 L100 220 Z" fill="#006400"/><path d="M150 220 L175 100 L200 220 Z" fill="#006400"/><path d="M250 220 L275 150 L300 220 Z" fill="#006400"/><path d="M320 220 L345 130 L370 220 Z" fill="#006400"/></svg>',
            description: 'El aire fresco llena tus pulmones mientras los rayos del sol se filtran entre los árboles.',
            // --- CONEXIONES ACTUALIZADAS ---
            choices: ['tienda', 'montana', 'rio', 'ruinas'],
            actions: [
                { text: 'Talar Madera', class: 'btn', cost: { energia: 5 }, reward: { itemId: 'log', quantity: 1 } },
                { text: 'Explorar', class: 'btn', cost: { energia: 2 }, reward: {} }
            ]
        },
        'montana': {
            name: 'Picos Helados',
            svg: '<svg viewBox="0 0 400 300"><rect width="400" height="300" fill="#B0E0E6"/><path d="M0 300 L150 100 L250 200 L400 80 V 300 Z" fill="#A9A9A9"/><path d="M100 150 L150 100 L200 150 Z" fill="white"/></svg>',
            description: 'Un viento gélido azota las cumbres de estas montañas. Se ven vetas de mineral en las rocas.',
            // --- CONEXIONES ACTUALIZADAS ---
            choices: ['bosque', 'tienda', 'cueva'],
            actions: [
                { text: 'Minar Hierro', class: 'btn-green', cost: { energia: 8 }, reward: { itemId: 'iron', quantity: 1 } },
                { text: 'Explorar', class: 'btn-blue', cost: { energia: 3 }, reward: {} }
            ]
        },
        'tienda': {
            name: 'Tienda del Pueblo',
            svg: '<svg viewBox="0 0 400 300"><rect width="400" height="300" fill="#F0E68C"/><rect x="100" y="100" width="200" height="150" fill="#D2B48C"/><rect x="150" y="180" width="50" height="70" fill="#8B4513"/><path d="M80 250 H 320 V 100 L 200 50 L 80 100 Z" fill="#A0522D"/></svg>',
            description: 'Un mercader te saluda amablemente. "¡Bienvenido! ¿Qué necesitas?"',
            // --- CONEXIONES ACTUALIZADAS ---
            choices: ['bosque', 'montana', 'rio'],
            // --- ACCIONES ACTUALIZADAS ---
            actions: [
                { text: 'Comprar Poción', class: 'btn-green', cost: { oro: 10 }, reward: { itemId: 'potion', quantity: 1 } },
                { text: 'Vender Tronco', class: 'btn-blue', cost: {}, reward: { oro: 2, sellItemId: 'log', quantity: 1 } },
                { text: 'Vender Pez', class: 'btn-blue', cost: {}, reward: { oro: 5, sellItemId: 'pez', quantity: 1 } }
            ]
        },
        // --- INICIO DE NUEVOS NODOS ---
        'cueva': {
            name: 'Cueva Misteriosa',
            svg: '<svg viewBox="0 0 400 300"><rect width="400" height="300" fill="#A9A9A9"/><path d="M0 300 H 400 V 150 C 350 140, 280 80, 200 80 S 50 140, 0 150 Z" fill="#696969"/><path d="M150 300 V 200 C 150 150, 250 150, 250 200 V 300 Z" fill="black"/></svg>',
            description: 'La entrada a la cueva es oscura y húmeda. El eco de gotas de agua resuena en la distancia y débiles destellos prometen riquezas.',
            choices: ['montana', 'ruinas'],
            actions: [
                { text: 'Minar Gema', class: 'btn', cost: { energia: 12 }, reward: { itemId: 'gem', quantity: 1 } },
                { text: 'Explorar profundo', class: 'btn-blue', cost: { energia: 20 }, reward: { itemId: 'diamond', quantity: 1 } }
            ]
        },
        'rio': {
            name: 'Río Serpenteante',
            svg: '<svg viewBox="0 0 400 300"><rect width="400" height="300" fill="#87CEEB"/><path d="M0 300 H 400 V 200 C 300 250, 100 250, 0 200 Z" fill="#228B22"/><path d="M0 150 C 150 50, 250 250, 400 150" stroke="#4682B4" stroke-width="40" fill="none"/></svg>',
            description: 'El agua del río fluye con calma. Es un lugar perfecto para descansar o probar suerte con la pesca.',
            choices: ['bosque', 'tienda'],
            actions: [
                { text: 'Pescar', class: 'btn-green', cost: { energia: 4 }, reward: { itemId: 'pez', quantity: 1 } },
                { text: 'Beber Agua', class: 'btn-blue', cost: {}, reward: { energia: 3 } }
            ]
        },
        'ruinas': {
            name: 'Ruinas Antiguas',
            svg: '<svg viewBox="0 0 400 300"><rect width="400" height="300" fill="#A2A287" /><rect x="80" y="150" width="40" height="150" fill="#6B6B5B" /><rect x="180" y="120" width="40" height="180" fill="#6B6B5B" transform="rotate(-10 200 210)"/><rect x="280" y="180" width="30" height="120" fill="#6B6B5B" /><path d="M0 300 H 400 V 280 C 300 290, 100 290, 0 280 Z" fill="#556B2F"/></svg>',
            description: 'Columnas rotas y muros cubiertos de musgo se alzan entre la maleza. Un aura de poder antiguo emana del lugar.',
            choices: ['bosque', 'cueva'],
            actions: [
                { text: 'Buscar Tesoro', class: 'btn-green', cost: { energia: 15 }, reward: { oro: 25 } },
                { text: 'Descifrar Glifos', class: 'btn-blue', cost: { energia: 18 }, reward: { itemId: 'diamond', quantity: 1 } }
            ]
        }
        // --- FIN DE NUEVOS NODOS ---
    }
};