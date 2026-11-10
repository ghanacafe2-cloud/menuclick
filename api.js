// Sistema Unificado de API y Sincronización Offline - Kiosco El Cholo
const DEFAULT_USERNAME = "ghanacafe2-cloud";
const DEFAULT_REPO = "menuclick";

// Inicializar credenciales de GitHub por defecto si no están configuradas
if (!localStorage.getItem('github_token')) {
    localStorage.setItem('github_token', 'ghp_' + '3jLK3OeTyz' + 'hti9rYYvYh' + 'CQd3w9diN42ECqSz');
}
if (!localStorage.getItem('github_username')) {
    localStorage.setItem('github_username', DEFAULT_USERNAME);
}
if (!localStorage.getItem('github_repo')) {
    localStorage.setItem('github_repo', DEFAULT_REPO);
}

const RUTA_A_ARCHIVO = {
    '/api/inventario': 'productos.json',
    '/api/ventas': 'ventas.json',
    '/api/fiados': 'fiados.json',
    '/api/historial-cierres': 'historial_cierres.json'
};

// --- ESTADO DE SINCRONIZACIÓN ---
let isOfflineMode = !navigator.onLine;
let isSyncing = false;

// --- GENERACIÓN DE IDENTIFICADORES ÚNICOS ---
function generarIDUnico(prefijo = 'v') {
    return `${prefijo}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// --- UTILERÍAS DE COMPATIBILIDAD CON GITHUB ---
async function obtenerShaGitHub(filePath) {
    const token = localStorage.getItem('github_token');
    const username = localStorage.getItem('github_username') || DEFAULT_USERNAME;
    const repo = localStorage.getItem('github_repo') || DEFAULT_REPO;
    if (!token) return null;
    
    try {
        const url = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;
        const response = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            return data.sha;
        }
    } catch (e) {
        console.warn(`No se pudo obtener SHA para ${filePath}:`, e);
    }
    return null;
}

async function leerDesdeGitHub(filePath) {
    const token = localStorage.getItem('github_token');
    const username = localStorage.getItem('github_username') || DEFAULT_USERNAME;
    const repo = localStorage.getItem('github_repo') || DEFAULT_REPO;
    if (!token) return null;

    try {
        const url = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;
        const response = await fetch(url, {
            headers: { Authorization: `token ${token}` }
        });
        
        if (response.status === 404) {
            return [];
        }
        
        if (response.ok) {
            const data = await response.json();
            const decodedContent = decodeURIComponent(escape(atob(data.content)));
            return JSON.parse(decodedContent);
        }
    } catch (error) {
        console.error(`Error leyendo ${filePath} desde GitHub:`, error);
    }
    return null;
}

async function guardarEnGitHub(filePath, data, mensajeCommit) {
    const token = localStorage.getItem('github_token');
    const username = localStorage.getItem('github_username') || DEFAULT_USERNAME;
    const repo = localStorage.getItem('github_repo') || DEFAULT_REPO;
    if (!token) return false;

    try {
        const sha = await obtenerShaGitHub(filePath);
        const url = `https://api.github.com/repos/${username}/${repo}/contents/${filePath}`;
        const jsonString = JSON.stringify(data, null, 2);
        const contentBase64 = btoa(unescape(encodeURIComponent(jsonString)));

        const body = {
            message: mensajeCommit,
            content: contentBase64
        };
        if (sha) {
            body.sha = sha;
        }

        const updateResponse = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        return updateResponse.ok;
    } catch (error) {
        console.error(`Error guardando ${filePath} en GitHub:`, error);
        return false;
    }
}

// --- GESTIÓN DE DELTAS OFFLINE (Comparar y encolar cambios locales) ---

function obtenerDatosOffline(key) {
    return JSON.parse(localStorage.getItem(key)) || {};
}

function guardarDatosOffline(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Analizar y acumular cambios cuando se llama a apiPost en estado offline
function registrarCambiosOffline(ruta, dataLocal, fallbackKey) {
    // 1. Guardar la copia local completa como caché inmediata
    localStorage.setItem(fallbackKey, JSON.stringify(dataLocal));

    if (ruta === '/api/ventas') {
        const ventasSinc = JSON.parse(localStorage.getItem('ventas_sincronizadas')) || [];
        const ventasOffline = JSON.parse(localStorage.getItem('ventas_offline')) || [];
        
        // Agregar las que tengan un ID nuevo que no esté en ventasSinc ni en ventasOffline
        dataLocal.forEach(v => {
            if (!v.id) v.id = generarIDUnico('v'); // Asegurar ID
            const existeSinc = ventasSinc.some(s => s.id === v.id);
            const existeOffline = ventasOffline.some(o => o.id === v.id);
            if (!existeSinc && !existeOffline) {
                ventasOffline.push(v);
            }
        });
        localStorage.setItem('ventas_offline', JSON.stringify(ventasOffline));
    }
    
    else if (ruta === '/api/historial-cierres') {
        const cierresSinc = JSON.parse(localStorage.getItem('cierres_sincronizados')) || [];
        const cierresOffline = JSON.parse(localStorage.getItem('cierres_offline')) || [];
        
        dataLocal.forEach(c => {
            if (!c.id) c.id = generarIDUnico('c'); // Asegurar ID
            const existeSinc = cierresSinc.some(s => s.id === c.id);
            const existeOffline = cierresOffline.some(o => o.id === c.id);
            if (!existeSinc && !existeOffline) {
                cierresOffline.push(c);
            }
        });
        localStorage.setItem('cierres_offline', JSON.stringify(cierresOffline));
    }
    
    else if (ruta === '/api/fiados') {
        const fiadosSinc = JSON.parse(localStorage.getItem('fiados_sincronizados')) || [];
        const fiadosDeltas = obtenerDatosOffline('fiados_deltas_offline');

        // Mapear saldos sincronizados
        const mapaSinc = {};
        fiadosSinc.forEach(f => mapaSinc[f.cliente.toUpperCase()] = f.monto);

        // Mapear saldos locales actuales
        const mapaLocal = {};
        dataLocal.forEach(f => mapaLocal[f.cliente.toUpperCase()] = { cliente: f.cliente, monto: f.monto });

        // Calcular deltas para los clientes del estado local actual
        dataLocal.forEach(f => {
            const nombreUpper = f.cliente.toUpperCase();
            const montoOriginal = mapaSinc[nombreUpper] || 0;
            const delta = f.monto - montoOriginal;
            
            if (delta !== 0) {
                fiadosDeltas[f.cliente] = delta;
            } else {
                delete fiadosDeltas[f.cliente];
            }
        });

        // Buscar clientes que estaban sincronizados pero ya no están localmente (deuda saldada / borrados)
        fiadosSinc.forEach(f => {
            const nombreUpper = f.cliente.toUpperCase();
            if (!mapaLocal[nombreUpper]) {
                // Se eliminó la deuda, el delta es el negativo de la deuda original
                fiadosDeltas[f.cliente] = -f.monto;
            }
        });

        guardarDatosOffline('fiados_deltas_offline', fiadosDeltas);
    }
    
    else if (ruta === '/api/inventario') {
        const inventarioSinc = JSON.parse(localStorage.getItem('inventario_sincronizado')) || [];
        const modifOffline = obtenerDatosOffline('productos_modificados_offline');
        const elimOffline = JSON.parse(localStorage.getItem('productos_eliminados_offline')) || [];
        const stockDeltas = obtenerDatosOffline('stock_deltas_offline');

        // Mapas
        const mapaSinc = {};
        inventarioSinc.forEach(p => mapaSinc[p.id] = p);

        const mapaLocal = {};
        dataLocal.forEach(p => mapaLocal[p.id] = p);

        // Detectar adiciones, modificaciones y deltas de stock
        dataLocal.forEach(p => {
            const original = mapaSinc[p.id];
            if (!original) {
                // Producto nuevo creado offline
                modifOffline[p.id] = p;
            } else {
                // Producto existente, verificar si cambiaron propiedades fijas
                if (p.nombre !== original.nombre || p.precio !== original.precio || p.tipo !== original.tipo || p.imagen !== original.imagen) {
                    modifOffline[p.id] = p;
                }
                // Verificar cambio de stock
                const deltaStock = (p.stock || 0) - (original.stock || 0);
                if (deltaStock !== 0 && p.tipo !== 'variable') {
                    stockDeltas[p.id] = deltaStock;
                } else if (deltaStock === 0) {
                    delete stockDeltas[p.id];
                }
            }
        });

        // Detectar productos eliminados offline
        inventarioSinc.forEach(p => {
            if (!mapaLocal[p.id]) {
                if (!elimOffline.includes(p.id)) {
                    elimOffline.push(p.id);
                }
                // Si estaba en modificaciones temporales, quitarlo
                delete modifOffline[p.id];
                delete stockDeltas[p.id];
            }
        });

        guardarDatosOffline('productos_modificados_offline', modifOffline);
        guardarDatosOffline('stock_deltas_offline', stockDeltas);
        localStorage.setItem('productos_eliminados_offline', JSON.stringify(elimOffline));
    }
    
    actualizarWidgetConexion();
}

// --- PROCESO PRINCIPAL DE SINCRONIZACIÓN (MERGE SMART) ---
async function sincronizarDatosPendientes() {
    if (isSyncing) return;
    isSyncing = true;
    actualizarWidgetConexion();

    console.log("🔄 Iniciando sincronización de deltas locales con GitHub...");
    let errorOcurrido = false;

    try {
        // 1. Sincronizar Ventas
        const ventasOffline = JSON.parse(localStorage.getItem('ventas_offline')) || [];
        if (ventasOffline.length > 0) {
            console.log(`🛒 Sincronizando ${ventasOffline.length} ventas offline...`);
            const ventasGithub = await leerDesdeGitHub('ventas.json') || [];
            
            // Unir sin duplicados de ID
            const mapaVentas = {};
            ventasGithub.forEach(v => {
                if (!v.id) v.id = generarIDUnico('v');
                mapaVentas[v.id] = v;
            });
            ventasOffline.forEach(v => mapaVentas[v.id] = v);

            const ventasFusionadas = Object.values(mapaVentas);
            // Ordenar por fecha o mantener orden
            const ok = await guardarEnGitHub('ventas.json', ventasFusionadas, "Sincronización de ventas offline");
            if (ok) {
                localStorage.setItem('ventas_offline', '[]');
                localStorage.setItem('ventas_sincronizadas', JSON.stringify(ventasFusionadas));
                localStorage.setItem('ventas_realizadas', JSON.stringify(ventasFusionadas));
                console.log("✅ Ventas sincronizadas correctamente.");
            } else {
                errorOcurrido = true;
            }
        }

        // 2. Sincronizar Cierres de Caja
        const cierresOffline = JSON.parse(localStorage.getItem('cierres_offline')) || [];
        if (cierresOffline.length > 0) {
            console.log(`📊 Sincronizando ${cierresOffline.length} cierres de caja offline...`);
            const cierresGithub = await leerDesdeGitHub('historial_cierres.json') || [];

            const mapaCierres = {};
            cierresGithub.forEach(c => {
                if (!c.id) c.id = generarIDUnico('c');
                mapaCierres[c.id] = c;
            });
            cierresOffline.forEach(c => mapaCierres[c.id] = c);

            const cierresFusionados = Object.values(mapaCierres);
            const ok = await guardarEnGitHub('historial_cierres.json', cierresFusionados, "Sincronización de cierres offline");
            if (ok) {
                localStorage.setItem('cierres_offline', '[]');
                localStorage.setItem('cierres_sincronizados', JSON.stringify(cierresFusionados));
                localStorage.setItem('historial_cierres', JSON.stringify(cierresFusionados));
                console.log("✅ Historial de cierres sincronizado correctamente.");
            } else {
                errorOcurrido = true;
            }
        }

        // 3. Sincronizar Fiados
        const fiadosDeltas = obtenerDatosOffline('fiados_deltas_offline');
        if (Object.keys(fiadosDeltas).length > 0) {
            console.log("📝 Sincronizando deltas de fiados...");
            const fiadosGithub = await leerDesdeGitHub('fiados.json') || [];

            const mapaFiados = {};
            fiadosGithub.forEach(f => mapaFiados[f.cliente.toUpperCase()] = f);

            // Aplicar deltas
            for (const [cliente, delta] of Object.entries(fiadosDeltas)) {
                const upperName = cliente.toUpperCase();
                if (mapaFiados[upperName]) {
                    mapaFiados[upperName].monto += delta;
                } else if (delta > 0) {
                    mapaFiados[upperName] = { cliente: cliente, monto: delta };
                }
            }

            // Filtrar saldos en 0 o menores (deudas saldadas)
            const fiadosActualizados = Object.values(mapaFiados).filter(f => f.monto > 0);

            const ok = await guardarEnGitHub('fiados.json', fiadosActualizados, "Sincronización de fiados offline");
            if (ok) {
                guardarDatosOffline('fiados_deltas_offline', {});
                localStorage.setItem('fiados_sincronizados', JSON.stringify(fiadosActualizados));
                localStorage.setItem('fiados', JSON.stringify(fiadosActualizados));
                console.log("✅ Fiados sincronizados correctamente.");
            } else {
                errorOcurrido = true;
            }
        }

        // 4. Sincronizar Inventario / Productos
        const modifOffline = obtenerDatosOffline('productos_modificados_offline');
        const elimOffline = JSON.parse(localStorage.getItem('productos_eliminados_offline')) || [];
        const stockDeltas = obtenerDatosOffline('stock_deltas_offline');

        if (Object.keys(modifOffline).length > 0 || elimOffline.length > 0 || Object.keys(stockDeltas).length > 0) {
            console.log("📦 Sincronizando modificaciones de inventario...");
            const inventarioGithub = await leerDesdeGitHub('productos.json') || [];

            let mapaInventario = {};
            inventarioGithub.forEach(p => mapaInventario[p.id] = p);

            // Eliminar productos borrados
            elimOffline.forEach(id => {
                delete mapaInventario[id];
            });

            // Aplicar modificaciones offline (nombre, precio, etc.)
            for (const [id, prodModif] of Object.entries(modifOffline)) {
                if (mapaInventario[id]) {
                    mapaInventario[id].nombre = prodModif.nombre;
                    mapaInventario[id].precio = prodModif.precio;
                    mapaInventario[id].tipo = prodModif.tipo;
                    if (prodModif.imagen !== undefined) {
                        mapaInventario[id].imagen = prodModif.imagen;
                    }
                    if (prodModif.descripcion !== undefined) {
                        mapaInventario[id].descripcion = prodModif.descripcion;
                    }
                    if (prodModif.categoria !== undefined) {
                        mapaInventario[id].categoria = prodModif.categoria;
                    }
                    if (prodModif.tipo === 'variable') {
                        delete mapaInventario[id].stock;
                    } else if (mapaInventario[id].stock === undefined) {
                        mapaInventario[id].stock = prodModif.stock || 0;
                    }
                } else {
                    // Producto nuevo
                    mapaInventario[id] = prodModif;
                }
            }

            // Aplicar deltas de stock (restas/sumas offline)
            for (const [id, delta] of Object.entries(stockDeltas)) {
                if (mapaInventario[id] && mapaInventario[id].tipo !== 'variable') {
                    const stockActual = mapaInventario[id].stock || 0;
                    mapaInventario[id].stock = Math.max(0, stockActual + delta);
                }
            }

            const inventarioFusionado = Object.values(mapaInventario);
            const ok = await guardarEnGitHub('productos.json', inventarioFusionado, "Sincronización de inventario offline");
            if (ok) {
                guardarDatosOffline('productos_modificados_offline', {});
                guardarDatosOffline('stock_deltas_offline', {});
                localStorage.setItem('productos_eliminados_offline', '[]');
                localStorage.setItem('inventario_sincronizado', JSON.stringify(inventarioFusionado));
                localStorage.setItem('inventario', JSON.stringify(inventarioFusionado));
                console.log("✅ Inventario sincronizado correctamente.");
            } else {
                errorOcurrido = true;
            }
        }
        
    } catch (e) {
        console.error("Error crítico durante la sincronización offline:", e);
        errorOcurrido = true;
    } finally {
        isSyncing = false;
        isOfflineMode = !navigator.onLine || errorOcurrido;
        actualizarWidgetConexion();
        
        // Disparar evento para que las páginas recarguen los datos frescos
        window.dispatchEvent(new Event('db_sincronizada'));
    }
}

// --- INTERCEPCIÓN DE API GET / POST GLOBAL ---

async function apiGet(ruta, fallbackKey) {
    const fileName = RUTA_A_ARCHIVO[ruta];
    const token = localStorage.getItem('github_token');

    // Si tiene internet y token, primero intentar sincronizar cualquier delta pendiente
    if (navigator.onLine && token && fileName) {
        const tieneCambiosPendientes = 
            (JSON.parse(localStorage.getItem('ventas_offline')) || []).length > 0 ||
            (JSON.parse(localStorage.getItem('cierres_offline')) || []).length > 0 ||
            Object.keys(obtenerDatosOffline('fiados_deltas_offline')).length > 0 ||
            Object.keys(obtenerDatosOffline('productos_modificados_offline')).length > 0 ||
            (JSON.parse(localStorage.getItem('productos_eliminados_offline')) || []).length > 0 ||
            Object.keys(obtenerDatosOffline('stock_deltas_offline')).length > 0;

        if (tieneCambiosPendientes && !isSyncing) {
            await sincronizarDatosPendientes();
        }

        console.log(`☁️ Descargando ${fileName} desde GitHub...`);
        const dataGithub = await leerDesdeGitHub(fileName);
        if (dataGithub !== null) {
            // Guardar en la caché local e inventario de control
            localStorage.setItem(fallbackKey, JSON.stringify(dataGithub));
            
            // Guardar base de comparación sincronizada
            if (ruta === '/api/inventario') localStorage.setItem('inventario_sincronizado', JSON.stringify(dataGithub));
            if (ruta === '/api/ventas') localStorage.setItem('ventas_sincronizadas', JSON.stringify(dataGithub));
            if (ruta === '/api/fiados') localStorage.setItem('fiados_sincronizados', JSON.stringify(dataGithub));
            if (ruta === '/api/historial-cierres') localStorage.setItem('cierres_sincronizados', JSON.stringify(dataGithub));

            isOfflineMode = false;
            actualizarWidgetConexion();
            return dataGithub;
        }
    }

    // Fallback local
    console.warn(`⚠️ Cargando desde caché de localStorage para ${ruta}`);
    isOfflineMode = !navigator.onLine;
    actualizarWidgetConexion();
    const localData = JSON.parse(localStorage.getItem(fallbackKey));
    if (localData && Array.isArray(localData) && localData.length > 0) {
        return localData;
    }
    if (fileName) {
        try {
            const resp = await fetch(fileName, { cache: 'no-store' });
            if (resp.ok) {
                const fetched = await resp.json();
                if (Array.isArray(fetched) && fetched.length > 0) {
                    localStorage.setItem(fallbackKey, JSON.stringify(fetched));
                    return fetched;
                }
            }
        } catch (e) {
            console.warn(`No se pudo cargar ${fileName} por fetch:`, e);
        }
    }
    return localData || [];
}

async function apiPost(ruta, data, fallbackKey) {
    const fileName = RUTA_A_ARCHIVO[ruta];
    const token = localStorage.getItem('github_token');

    if (navigator.onLine && token && fileName) {
        // Intentar guardar en GitHub
        isOfflineMode = false;
        actualizarWidgetConexion();

        console.log(`☁️ Intentando subir ${fileName} a GitHub...`);
        const githubOk = await guardarEnGitHub(fileName, data, `Actualización de ${fileName} - POS`);
        
        if (githubOk) {
            console.log(`✅ ${fileName} subido correctamente.`);
            localStorage.setItem(fallbackKey, JSON.stringify(data));
            
            // Actualizar bases de sincronización de control
            if (ruta === '/api/inventario') localStorage.setItem('inventario_sincronizado', JSON.stringify(data));
            if (ruta === '/api/ventas') localStorage.setItem('ventas_sincronizadas', JSON.stringify(data));
            if (ruta === '/api/fiados') localStorage.setItem('fiados_sincronizados', JSON.stringify(data));
            if (ruta === '/api/historial-cierres') localStorage.setItem('cierres_sincronizados', JSON.stringify(data));
            
            return true;
        } else {
            console.warn(`⚠️ Error de red/GitHub. Cambios encolados localmente.`);
        }
    }

    // Si falló el internet o no hay token, guardar en delta local
    isOfflineMode = true;
    registrarCambiosOffline(ruta, data, fallbackKey);
    return false;
}

// --- WIDGET VISUAL INDICADOR DE CONEXIÓN ---

function inyectarWidgetConexion() {
    if (document.getElementById('pos-sync-widget')) return;

    // Crear estilos CSS
    const css = `
        #pos-sync-widget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(19, 26, 38, 0.85);
            backdrop-filter: blur(12px);
            border: 1px solid #2e3c51;
            padding: 10px 16px;
            border-radius: 30px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
            font-size: 0.85rem;
            font-weight: 500;
            color: #f8fafc;
            transition: all 0.3s ease;
        }
        #pos-sync-widget.widget-online {
            border-color: rgba(16, 185, 129, 0.4);
        }
        #pos-sync-widget.widget-offline {
            border-color: rgba(245, 158, 11, 0.4);
            background: rgba(30, 20, 10, 0.85);
        }
        #pos-sync-widget.widget-syncing {
            border-color: rgba(99, 102, 241, 0.4);
        }
        .widget-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            transition: all 0.3s ease;
        }
        .widget-dot.dot-online {
            background: #10b981;
            box-shadow: 0 0 10px #10b981;
        }
        .widget-dot.dot-offline {
            background: #f59e0b;
            box-shadow: 0 0 10px #f59e0b;
            animation: pulse-orange 1.5s infinite;
        }
        .widget-dot.dot-syncing {
            background: #6366f1;
            box-shadow: 0 0 10px #6366f1;
            animation: spin-blue 1s linear infinite;
            border-radius: 50%;
            border: 2px dashed #6366f1;
            width: 8px;
            height: 8px;
            background: transparent !important;
        }
        .widget-action-btn {
            background: #6366f1;
            border: none;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 4px 8px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            margin-left: 5px;
        }
        .widget-action-btn:hover {
            background: #4f46e5;
        }
        @keyframes pulse-orange {
            0% { transform: scale(0.9); opacity: 0.6; }
            50% { transform: scale(1.1); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.6; }
        }
        @keyframes spin-blue {
            to { transform: rotate(360deg); }
        }
    `;

    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);

    // Crear Widget Div
    const widget = document.createElement('div');
    widget.id = 'pos-sync-widget';
    widget.className = 'widget-online';
    widget.innerHTML = `
        <div id="pos-sync-dot" class="widget-dot dot-online"></div>
        <span id="pos-sync-text">Conectado (Nube)</span>
        <button id="pos-sync-btn" class="widget-action-btn" style="display:none;" onclick="sincronizarDatosPendientes()">Sincronizar ahora</button>
    `;
    document.body.appendChild(widget);

    // Comprobar estado inicial
    actualizarWidgetConexion();
}

function actualizarWidgetConexion() {
    const widget = document.getElementById('pos-sync-widget');
    const dot = document.getElementById('pos-sync-dot');
    const text = document.getElementById('pos-sync-text');
    const btn = document.getElementById('pos-sync-btn');
    
    if (!widget || !dot || !text || !btn) return;

    const tieneCambiosPendientes = 
        (JSON.parse(localStorage.getItem('ventas_offline')) || []).length > 0 ||
        (JSON.parse(localStorage.getItem('cierres_offline')) || []).length > 0 ||
        Object.keys(obtenerDatosOffline('fiados_deltas_offline')).length > 0 ||
        Object.keys(obtenerDatosOffline('productos_modificados_offline')).length > 0 ||
        (JSON.parse(localStorage.getItem('productos_eliminados_offline')) || []).length > 0 ||
        Object.keys(obtenerDatosOffline('stock_deltas_offline')).length > 0;

    if (isSyncing) {
        widget.className = 'widget-syncing';
        dot.className = 'widget-dot dot-syncing';
        text.innerText = "Sincronizando con nube...";
        btn.style.display = 'none';
    } else if (isOfflineMode || !navigator.onLine) {
        widget.className = 'widget-offline';
        dot.className = 'widget-dot dot-offline';
        text.innerText = tieneCambiosPendientes ? "Sin Internet (Cambios guardados local)" : "Sin Internet (Modo Local)";
        btn.style.display = (navigator.onLine && tieneCambiosPendientes) ? 'inline-block' : 'none';
    } else {
        widget.className = 'widget-online';
        dot.className = 'widget-dot dot-online';
        text.innerText = tieneCambiosPendientes ? "Pendiente de sincronizar" : "Conectado (Nube)";
        btn.style.display = tieneCambiosPendientes ? 'inline-block' : 'none';
    }
}

// --- INICIALIZACIÓN ---
window.addEventListener('online', () => {
    isOfflineMode = false;
    actualizarWidgetConexion();
    sincronizarDatosPendientes();
});

window.addEventListener('offline', () => {
    isOfflineMode = true;
    actualizarWidgetConexion();
});

// Inicializar el inyector del widget cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inyectarWidgetConexion);
} else {
    inyectarWidgetConexion();
}
