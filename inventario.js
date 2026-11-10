// Gestión de Inventario - Kiosco El Cholo

let inventario = [];
let editandoCodigo = null; // Guardar código del producto que se está editando
let fotoActualBase64 = ""; // Almacenar imagen optimizada en base64
let mediaStreamFoto = null; // Stream de video para captura de cámara

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

// --- PERSISTENCIA ---
// Las funciones de comunicación con GitHub y persistencia se han movido a api.js

// --- RENDERIZADO Y FILTRADO ---
function renderTablaProductos(lista) {
    const tbody = document.querySelector('#tabla-productos tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--text-secondary); font-style: italic;">
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

        const fotoHtml = p.imagen 
            ? `<img src="${p.imagen}" class="tabla-thumb" alt="${p.nombre}">` 
            : `<div class="tabla-thumb-placeholder">📦</div>`;

        tr.innerHTML = `
            <td style="text-align: center; width: 60px;">${fotoHtml}</td>
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

    const productoAnterior = idxExistente > -1 ? inventario[idxExistente] : {};
    const producto = { 
        id, 
        nombre: nom, 
        precio: pre, 
        tipo: tip, 
        stock: stk,
        categoria: productoAnterior.categoria || 'Varios 🍽️',
        descripcion: productoAnterior.descripcion || '',
        imagen: fotoActualBase64 || productoAnterior.imagen || ''
    };

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

    // Cargar foto si existe
    if (p.imagen) {
        establecerFotoPreview(p.imagen);
    } else {
        quitarFotoProducto(false);
    }

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

    quitarFotoProducto(true);
    cerrarCamaraFoto();

    document.getElementById('form-title').innerText = "NUEVO PRODUCTO / EDITAR EXISTENTE";
    document.getElementById('btn-guardar').innerText = "💾 GUARDAR EN EL INVENTARIO";
    document.getElementById('btn-cancelar-edit').style.display = "none";
    
    colapsarFormulario();
}

// --- GESTIÓN DE FOTO DE PRODUCTO (CARTA DIGITAL) ---

// Redimensionar y comprimir imagen en cliente para ahorrar almacenamiento y acelerar sincronización
function optimizarImagen(sourceElement, maxWidth = 360, maxHeight = 360, quality = 0.75) {
    const canvas = document.createElement('canvas');
    let width = sourceElement.width || sourceElement.videoWidth;
    let height = sourceElement.height || sourceElement.videoHeight;

    if (!width || !height) return null;

    if (width > height) {
        if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
        }
    } else {
        if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
        }
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sourceElement, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
}

function establecerFotoPreview(base64Data) {
    fotoActualBase64 = base64Data;
    const img = document.getElementById('img-preview');
    const ph = document.getElementById('placeholder-foto');
    const btnDel = document.getElementById('btn-eliminar-foto');

    if (img && ph && btnDel) {
        img.src = base64Data;
        img.style.display = 'block';
        ph.style.display = 'none';
        btnDel.style.display = 'inline-flex';
    }
}

function procesarArchivoFoto(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert("⚠️ Por favor seleccioná un archivo de imagen válido (JPG, PNG, WebP).");
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const tempImg = new Image();
        tempImg.onload = () => {
            const comprimida = optimizarImagen(tempImg, 360, 360, 0.75);
            if (comprimida) {
                establecerFotoPreview(comprimida);
            }
        };
        tempImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
    // Limpiar input file para permitir seleccionar la misma foto nuevamente si se desea
    document.getElementById('input-subir-foto').value = '';
}

async function iniciarCamaraFoto() {
    const box = document.getElementById('camara-captura-box');
    const video = document.getElementById('video-camara-foto');
    if (!box || !video) return;

    try {
        if (mediaStreamFoto) {
            mediaStreamFoto.getTracks().forEach(t => t.stop());
        }

        mediaStreamFoto = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } }
        });

        video.srcObject = mediaStreamFoto;
        box.style.display = 'block';
    } catch (e) {
        console.error("Error abriendo cámara de fotos:", e);
        alert("⚠️ No se pudo acceder a la cámara para tomar fotos. Verificá los permisos del navegador.");
    }
}

function capturarFotoCamara() {
    const video = document.getElementById('video-camara-foto');
    if (!video || !mediaStreamFoto) return;

    const base64 = optimizarImagen(video, 360, 360, 0.78);
    if (base64) {
        establecerFotoPreview(base64);
        beepSuccess();
    }
    cerrarCamaraFoto();
}

function cerrarCamaraFoto() {
    const box = document.getElementById('camara-captura-box');
    if (box) box.style.display = 'none';

    if (mediaStreamFoto) {
        mediaStreamFoto.getTracks().forEach(t => t.stop());
        mediaStreamFoto = null;
    }
}

function quitarFotoProducto(resetSilencioso = false) {
    fotoActualBase64 = "";
    const img = document.getElementById('img-preview');
    const ph = document.getElementById('placeholder-foto');
    const btnDel = document.getElementById('btn-eliminar-foto');

    if (img && ph && btnDel) {
        img.src = "";
        img.style.display = 'none';
        ph.style.display = 'block';
        btnDel.style.display = 'none';
    }

    if (!resetSilencioso && editandoCodigo) {
        // Si estamos editando un producto y el usuario presiona "Quitar Foto", marcar en memoria que se quitó
        const idx = inventario.findIndex(p => p.id === editandoCodigo);
        if (idx > -1) {
            delete inventario[idx].imagen;
        }
    }
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

// Escuchar evento de base de datos sincronizada para recargar la UI
window.addEventListener('db_sincronizada', async () => {
    console.log("🔔 Sincronización offline completada. Recargando inventario...");
    await inicializarInventario();
});
