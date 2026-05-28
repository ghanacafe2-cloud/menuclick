// Gestión de Inventario - Kiosco El Cholo
const DEFAULT_USERNAME = "ghanacafe2-cloud"; 
const DEFAULT_REPO = "menuclick";

const RUTA_A_ARCHIVO = {
    '/api/inventario': 'productos.json'
};

let inventario = [];
let editandoCodigo = null; // Guardar código del producto que se está editando

// --- UTILERÍAS DE NAVEGACIÓN Y COLAPSO ---
function toggleFormCollapse() {
    const body = document.getElementById('collapsible-card');
    if (body) {
        body.classList.toggle('collapsed');
    }
}

function expandirFormulario() {
    const body = document.getElementById('collapsible-card');
    if (body) {
        body.classList.remove('collapsed');
    }
}

function colapsarFormulario() {
    const body = document.getElementById('collapsible-card');
    if (body) {
        body.classList.add('collapsed');
    }
}

// --- APIS DE PERSISTENCIA HYBRID (GitHub / LocalStorage) ---
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

async function apiGet(ruta, fallbackKey) {
    const fileName = RUTA_A_ARCHIVO[ruta];
    
    const token = localStorage.getItem('github_token');
    if (token && fileName) {
        const dataGithub = await leerDesdeGitHub(fileName);
        if (dataGithub !== null) {
            localStorage.setItem(fallbackKey, JSON.stringify(dataGithub));
            return dataGithub;
        }
    }

    try {
        const response = await fetch('./productos.json');
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem(fallbackKey, JSON.stringify(data));
            return data;
        }
    } catch (e) {}

    return JSON.parse(localStorage.getItem(fallbackKey)) || [];
}

async function apiPost(ruta, data, fallbackKey) {
    localStorage.setItem(fallbackKey, JSON.stringify(data));
    
    const fileName = RUTA_A_ARCHIVO[ruta];
    let githubOk = false;

    const token = localStorage.getItem('github_token');
    if (token && fileName) {
        githubOk = await guardarEnGitHub(fileName, data, `Actualización de productos - Inventario`);
    }

    return githubOk;
}

// --- RENDERIZADO Y FILTRADO ---
function renderTablaProductos(lista) {
    const tbody = document.querySelector('#tabla-productos tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; color: var(--text-secondary); font-style: italic;">
                    No se encontraron productos en el inventario.
                </td>
            </tr>
        `;
        return;
    }

    // Ordenar alfabéticamente
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre));

    lista.forEach((p) => {
        const isLowStock = p.stock !== undefined && p.stock <= 3 && p.tipo !== "variable";
        const trClass = isLowStock ? 'status-low' : '';
        const stockDisplay = p.tipo === 'variable' ? 'N/A' : (p.stock || 0);

        const tr = document.createElement('tr');
        if (trClass) tr.className = trClass;

        tr.innerHTML = `
            <td><strong>${p.id}</strong></td>
            <td>${p.nombre}</td>
            <td>$${p.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
            <td>${stockDisplay}</td>
            <td style="text-align: center; display: flex; gap: 8px; justify-content: center;">
                <button class="btn btn-edit btn-icon-only" onclick="editarProducto('${p.id}')" title="Editar producto">✏️</button>
                <button class="btn btn-danger btn-icon-only" onclick="eliminarProducto('${p.id}')" title="Eliminar producto">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filtrarProductos() {
    const query = document.getElementById('search-box').value.trim().toLowerCase();
    
    if (!query) {
        renderTablaProductos(inventario);
        return;
    }

    const filtrados = inventario.filter(p => 
        p.nombre.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
    );

    renderTablaProductos(filtrados);
}

// --- CARGAR / GUARDAR / EDITAR / ELIMINAR ---
async function guardarProducto() {
    const idInput = document.getElementById('admin-codigo');
    const nomInput = document.getElementById('admin-nombre');
    const preInput = document.getElementById('admin-precio');
    const stkInput = document.getElementById('admin-stock');
    const tipInput = document.getElementById('admin-tipo');

    const id = idInput.value.trim().toUpperCase();
    const nom = nomInput.value.trim();
    const pre = parseFloat(preInput.value);
    const stk = parseInt(stkInput.value) || 0;
    const tip = tipInput.value;

    if (!id || !nom || isNaN(pre)) {
        alert("⚠️ Faltan completar datos obligatorios (Código, Nombre y Precio).");
        return;
    }

    if (pre < 0 || stk < 0) {
        alert("⚠️ Valores inválidos. El precio y el stock no pueden ser negativos.");
        return;
    }

    // Si estamos editando y el código cambió, o si es un nuevo producto con código repetido
    const idxExistente = inventario.findIndex(p => p.id === id);
    
    // Si editábamos un código y lo cambiamos en el input, removemos el anterior
    if (editandoCodigo && editandoCodigo !== id) {
        const idxViejo = inventario.findIndex(p => p.id === editandoCodigo);
        if (idxViejo > -1) {
            inventario.splice(idxViejo, 1);
        }
    }

    const producto = { id, nombre: nom, precio: pre, tipo: tip, stock: stk };

    if (idxExistente > -1 && (!editandoCodigo || editandoCodigo === id)) {
        inventario[idxExistente] = producto;
    } else {
        inventario.push(producto);
    }

    // Guardar base de datos
    await apiPost('/api/inventario', inventario, 'inventario');
    
    cancelarEdicion();
    renderTablaProductos(inventario);
    filtrarProductos(); // Por si había algún filtro activo
    beepSuccess();
}

function editarProducto(codigo) {
    const p = inventario.find(item => item.id === codigo);
    if (!p) return;

    editandoCodigo = p.id;
    document.getElementById('admin-codigo').value = p.id;
    document.getElementById('admin-nombre').value = p.nombre;
    document.getElementById('admin-precio').value = p.precio;
    document.getElementById('admin-stock').value = p.stock || 0;
    document.getElementById('admin-tipo').value = p.tipo;

    document.getElementById('form-title').innerText = "✏️ EDITAR PRODUCTO";
    document.getElementById('btn-guardar').innerText = "💾 GUARDAR CAMBIOS";
    document.getElementById('btn-cancelar-edit').style.display = "inline-flex";

    expandirFormulario();
    document.getElementById('admin-nombre').focus();
}

function cancelarEdicion() {
    editandoCodigo = null;
    document.getElementById('admin-codigo').value = '';
    document.getElementById('admin-nombre').value = '';
    document.getElementById('admin-precio').value = '';
    document.getElementById('admin-stock').value = '';
    document.getElementById('admin-tipo').value = 'fijo';

    document.getElementById('form-title').innerText = "NUEVO PRODUCTO / EDITAR EXISTENTE";
    document.getElementById('btn-guardar').innerText = "💾 GUARDAR EN EL INVENTARIO";
    document.getElementById('btn-cancelar-edit').style.display = "none";
    
    colapsarFormulario();
}

async function eliminarProducto(codigo) {
    const p = inventario.find(item => item.id === codigo);
    if (!p) return;

    if (confirm(`¿Está seguro de eliminar "${p.nombre}" del inventario?\nEsta acción es irreversible.`)) {
        inventario = inventario.filter(item => item.id !== codigo);
        await apiPost('/api/inventario', inventario, 'inventario');
        renderTablaProductos(inventario);
        filtrarProductos();
    }
}

// Escucha rápida al escribir código
const adminCodigo = document.getElementById('admin-codigo');
if (adminCodigo) {
    adminCodigo.addEventListener('input', () => {
        const val = adminCodigo.value.trim().toUpperCase();
        if (val === '' || editandoCodigo) return; // No auto-cargar si ya editamos
        
        const p = inventario.find(item => item.id.toUpperCase() === val);
        if (p) {
            editarProducto(p.id);
        }
    });
}

// --- CÁMARA ESCÁNER ---
let html5QrCode;

function toggleEscaner() {
    const readerDiv = document.getElementById('reader');
    if (!readerDiv) return;
    
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            readerDiv.style.display = 'none';
            console.log("Cámara apagada");
        });
        return;
    }

    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    readerDiv.style.display = 'block';

    const config = { fps: 15, qrbox: { width: 260, height: 160 } };

    html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
            const inputCod = document.getElementById('admin-codigo');
            if (inputCod) {
                inputCod.value = decodedText.toUpperCase();
                const event = new Event('input', { bubbles: true });
                inputCod.dispatchEvent(event);
            }
            beepSuccess();
            
            html5QrCode.stop().then(() => {
                readerDiv.style.display = 'none';
                const inputNom = document.getElementById('admin-nombre');
                if (inputNom) inputNom.focus();
            });
        },
        (errorMessage) => { }
    ).catch(err => {
        alert("⚠️ No se pudo iniciar la cámara: " + err);
        readerDiv.style.display = 'none';
    });
}

function beepSuccess() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(900, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) { }
}

// --- INICIALIZACIÓN ---
async function inicializarInventario() {
    inventario = await apiGet('/api/inventario', 'inventario');
    renderTablaProductos(inventario);
}

inicializarInventario();
