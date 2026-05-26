// Panel de Administración - Kiosco El Cholo
const PIN_ADMIN = "1234";

// Control de acceso seguro
const acceso = prompt("Ingrese PIN de administrador para acceder a este panel:");
if (acceso !== PIN_ADMIN) {
    alert("❌ Acceso denegado. Código PIN incorrecto.");
    window.location.href = "index.html";
}

// Configuración de sincronización de GitHub (Opcional)
const USERNAME = "ghanacafe2-cloud"; 
const REPO = "menuclick";
const FILE_PATH = "productos.json";

let inventario = [];
let fiados = [];
let ventas = [];
let historialCierres = [];

// --- GESTIÓN DE TOKEN DE GITHUB ---
function guardarToken() { 
    const input = document.getElementById('gh-token');
    if (input) {
        localStorage.setItem('github_token', input.value.trim()); 
        validarToken(); 
    }
}

async function validarToken() {
    const token = localStorage.getItem('github_token');
    const ghInput = document.getElementById('gh-token');
    if (token && ghInput) ghInput.value = token;
    
    const statusSpan = document.getElementById('token-status');
    if (!statusSpan) return;

    if (!token) {
        statusSpan.innerText = "❌ (Sin configurar)";
        statusSpan.style.color = "var(--text-secondary)";
        return;
    }
    
    try {
        const res = await fetch('https://api.github.com/user', { 
            headers: { Authorization: `token ${token}` } 
        });
        if (res.ok) {
            statusSpan.innerText = "✅ (Conectado)";
            statusSpan.style.color = "var(--success)";
        } else {
            statusSpan.innerText = "❌ (Token inválido)";
            statusSpan.style.color = "var(--danger)";
        }
    } catch (e) {
        statusSpan.innerText = "⚠️ (Error de conexión)";
        statusSpan.style.color = "var(--warning)";
    }
}

// Subir inventario actualizado a GitHub (Opcional, en segundo plano)
async function subirInventarioAGitHub() {
    const token = localStorage.getItem('github_token');
    if (!token) return false;
    
    try {
        const response = await fetch(
            `https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`,
            { headers: { Authorization: `token ${token}` } }
        );
        
        let sha;
        if (response.ok) {
            const data = await response.json();
            sha = data.sha;
        }
        
        const jsonString = JSON.stringify(inventario, null, 2);
        const contenido = btoa(unescape(encodeURIComponent(jsonString)));
        
        const update = await fetch(
            `https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: "Actualización automática de inventario - Panel Admin",
                    content: contenido,
                    sha: sha
                })
            }
        );
        
        if (update.ok) {
            console.log("☁️ Sincronizado exitosamente con GitHub.");
            return true;
        }
        return false;
    } catch (error) {
        console.error("❌ Error de red sincronizando GitHub:", error);
        return false;
    }
}

// --- APIS DE PERSISTENCIA LOCAL ---
async function apiGet(ruta, fallbackKey) {
    try {
        const res = await fetch(ruta);
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(fallbackKey, JSON.stringify(data));
            return data;
        }
    } catch (e) {
        console.warn(`No se pudo leer de la API ${ruta}, usando caché local`, e);
    }
    return JSON.parse(localStorage.getItem(fallbackKey)) || [];
}

async function apiPost(ruta, data, fallbackKey) {
    localStorage.setItem(fallbackKey, JSON.stringify(data));
    try {
        const res = await fetch(ruta, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.ok;
    } catch (e) {
        console.error(`Error guardando en API ${ruta}`, e);
        return false;
    }
}

// --- GESTIÓN DE GASTOS / EGRESOS ---
async function registrarGasto() {
    const det = document.getElementById('gasto-detalle').value.trim();
    const mon = parseFloat(document.getElementById('gasto-monto').value);
    
    if (!det || isNaN(mon) || mon <= 0) {
        alert("⚠️ Por favor, complete el detalle y el monto del pago correctamente.");
        return;
    }
    
    if (confirm(`¿Confirmas el registro del pago de $${mon.toLocaleString('es-AR')} por: "${det}"?`)) {
        // Cargar ventas actuales
        ventas = await apiGet('/api/ventas', 'ventas_realizadas');
        
        const nuevoGasto = { 
            total: -mon, // Monto negativo representa salida de caja
            metodo: 'efectivo', 
            fecha: new Date().toLocaleString(), 
            detalle: `GASTO: ${det}` 
        };
        
        ventas.push(nuevoGasto);
        
        // Guardar ventas
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        
        document.getElementById('gasto-detalle').value = '';
        document.getElementById('gasto-monto').value = '';
        
        actualizarTodo();
        beepSuccess();
    }
}

function dibujarTablaGastos() {
    const tbodyGastos = document.getElementById('cuerpo-gastos');
    if (!tbodyGastos) return;
    
    tbodyGastos.innerHTML = '';
    
    ventas.forEach((x, index) => {
        if (x.total < 0) {
            const time = x.fecha.split(', ')[1] || x.fecha;
            tbodyGastos.innerHTML += `
                <tr>
                    <td>${time}</td> 
                    <td>${x.detalle}</td>
                    <td style="color: var(--danger); font-weight: bold;">-$${Math.abs(x.total).toLocaleString('es-AR')}</td>
                    <td>
                        <button class="btn btn-danger btn-icon-only" onclick="borrarGastoIndividual(${index})" title="Eliminar registro">🗑️</button>
                    </td>
                </tr>
            `;
        }
    });
}

async function borrarGastoIndividual(indexVentaOriginal) {
    if (confirm("¿Borrar este registro de salida de caja?")) {
        ventas.splice(indexVentaOriginal, 1);
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        actualizarTodo();
    }
}

async function limpiarSoloGastos() {
    if (ventas.length === 0) return alert("No hay movimientos registrados.");

    if (confirm("¿Querés limpiar visualmente los registros de pagos de la lista?\n\n⚠️ NOTA: Esto limpia el listado para iniciar un nuevo turno, pero no altera el saldo neto en efectivo actual.")) {
        const ventasLimpias = ventas.filter(item => item.total >= 0);
        ventas = ventasLimpias;
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        actualizarTodo();
        alert("Lista de egresos despejada.");
    }
}

// --- GESTIÓN DE PRODUCTOS ---
async function guardarProducto() {
    const id = document.getElementById('admin-codigo').value.trim().toUpperCase();
    const nom = document.getElementById('admin-nombre').value.trim();
    const pre = parseFloat(document.getElementById('admin-precio').value);
    const stk = parseInt(document.getElementById('admin-stock').value) || 0;
    const tip = document.getElementById('admin-tipo').value;

    if (!id || !nom || isNaN(pre)) {
        alert("⚠️ Faltan completar datos obligatorios (Código, Nombre y Precio).");
        return;
    }

    if (pre < 0 || stk < 0) {
        alert("⚠️ Valores inválidos. El precio y el stock no pueden ser negativos.");
        return;
    }

    const idx = inventario.findIndex(p => p.id === id);
    const producto = { id, nombre: nom, precio: pre, tipo: tip, stock: stk };

    if (idx > -1) {
        inventario[idx] = producto;
    } else {
        inventario.push(producto);
    }

    // Guardar en disco (API)
    await apiPost('/api/inventario', inventario, 'inventario');
    actualizarTodo();
    limpiarFormulario();
    beepSuccess();

    // Sincronizar en la nube en segundo plano si hay token
    subirInventarioAGitHub();
}

async function eliminarProducto(index) {
    if (confirm(`¿Está seguro de eliminar "${inventario[index].nombre}" del inventario?\nEsto es permanente.`)) { 
        inventario.splice(index, 1); 
        await apiPost('/api/inventario', inventario, 'inventario');
        actualizarTodo(); 
        subirInventarioAGitHub(); 
    }
}

function limpiarFormulario() { 
    document.getElementById('admin-codigo').value = ''; 
    document.getElementById('admin-nombre').value = ''; 
    document.getElementById('admin-precio').value = ''; 
    document.getElementById('admin-stock').value = ''; 
    document.getElementById('admin-tipo').value = 'fijo';
    document.getElementById('btn-guardar').innerText = '💾 GUARDAR EN EL INVENTARIO';
    document.getElementById('admin-codigo').focus(); 
}

const adminCodigo = document.getElementById('admin-codigo');
if (adminCodigo) {
    adminCodigo.addEventListener('input', () => {
        const val = adminCodigo.value.trim().toUpperCase();
        if (val === '') return;
        const p = inventario.find(item => item.id.toUpperCase() === val);
        if (p) {
            document.getElementById('admin-nombre').value = p.nombre;
            document.getElementById('admin-precio').value = p.precio;
            document.getElementById('admin-stock').value = p.stock;
            document.getElementById('admin-tipo').value = p.tipo;
            document.getElementById('btn-guardar').innerText = '💾 ACTUALIZAR EN INVENTARIO';
        } else {
            document.getElementById('admin-nombre').value = ''; 
            document.getElementById('admin-precio').value = ''; 
            document.getElementById('admin-stock').value = ''; 
            document.getElementById('admin-tipo').value = 'fijo';
            document.getElementById('btn-guardar').innerText = '💾 GUARDAR EN EL INVENTARIO';
        }
    });
}

// --- LIBRETA DE FIADOS ---
async function agregarFiado() {
    const cli = document.getElementById('fiado-cliente').value.trim();
    const mon = parseFloat(document.getElementById('fiado-monto').value);
    
    if (!cli || isNaN(mon) || mon <= 0) {
        alert("⚠️ Ingrese un nombre de cliente y un monto válido.");
        return;
    }
    
    const idx = fiados.findIndex(f => f.cliente.toUpperCase() === cli.toUpperCase());
    if (idx > -1) {
        fiados[idx].monto += mon;
    } else {
        fiados.push({ cliente: cli, monto: mon });
    }
    
    await apiPost('/api/fiados', fiados, 'fiados');
    document.getElementById('fiado-cliente').value = '';
    document.getElementById('fiado-monto').value = '';
    actualizarTodo();
    beepSuccess();
}

async function cobrarFiado(index) {
    const f = fiados[index];
    const modo = prompt(`Cobrar deuda de $${f.monto.toLocaleString('es-AR')} a "${f.cliente}":\n\n1: Cobrar con EFECTIVO\n2: Cobrar con TARJETA\n3: Cobrar con QR / MercadoPago\n\nIngrese el número correspondiente:`);
    
    let met = modo === "1" ? "efectivo" : modo === "2" ? "debito" : modo === "3" ? "qr" : null;
    if (met) {
        // Cargar ventas actualizadas de la API
        ventas = await apiGet('/api/ventas', 'ventas_realizadas');
        
        ventas.push({ 
            total: f.monto, 
            metodo: met, 
            fecha: new Date().toLocaleString(), 
            detalle: `COBRO FIADO: ${f.cliente}` 
        });
        
        fiados.splice(index, 1);
        
        // Guardar ambos en la API
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        await apiPost('/api/fiados', fiados, 'fiados');
        
        actualizarTodo();
        beepSuccess();
        alert(`✅ Deuda saldada. Registrado en caja de ${met.toUpperCase()}.`);
    } else if (modo !== null) {
        alert("❌ Opción inválida.");
    }
}

// --- CIERRE DE CAJA ---
async function borrarVentas() {
    if (ventas.length === 0) return alert("No hay movimientos de caja cargados en el turno de hoy.");
    
    let e = 0, t = 0, q = 0;
    ventas.forEach(x => { 
        if (x.metodo === 'efectivo') e += x.total; 
        else if (x.metodo === 'debito') t += x.total; 
        else q += x.total; 
    });
    
    const general = e + t + q;
    
    if (confirm(`¿CERRAR CAJA DE HOY?\n\nResumen Financiero:\n--------------------------\n💵 Efectivo Neto: $${e.toLocaleString('es-AR')}\n💳 Tarjetas/Débito: $${t.toLocaleString('es-AR')}\n📱 QR/MercadoPago: $${q.toLocaleString('es-AR')}\n--------------------------\n💰 TOTAL GENERAL: $${general.toLocaleString('es-AR')}\n\nLos datos se archivarán permanentemente en el historial de cierres y la caja de hoy se restablecerá a cero.`)) {
        // Cargar historial actual de la API
        historialCierres = await apiGet('/api/historial-cierres', 'historial_cierres');
        
        historialCierres.push({ 
            fecha: new Date().toLocaleString(), 
            efectivo: e, 
            otros: t + q, 
            total: general 
        });
        
        // Limpiar ventas
        ventas = [];
        
        // Guardar ambos en la API
        await apiPost('/api/historial-cierres', historialCierres, 'historial_cierres');
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        
        actualizarTodo();
        beepSuccess();
        alert("✅ Caja del día guardada en el historial y reiniciada.");
    }
}

async function borrarCierreHistorial(index) {
    if (confirm("⚠️ ¿Estás seguro de borrar este cierre del historial?\nEsta acción es irreversible.")) {
        historialCierres.splice(index, 1); 
        await apiPost('/api/historial-cierres', historialCierres, 'historial_cierres');
        actualizarTodo(); 
    }
}

async function anularUltimaVentaAdmin() {
    if (ventas.length === 0) return alert("No hay movimientos para anular.");

    const ultima = ventas[ventas.length - 1];
    
    if (confirm(`¿Anular el último movimiento registrado?\nDetalle: "${ultima.detalle || 'Venta general'}"\nMonto: $${ultima.total.toLocaleString('es-AR')}`)) {
        
        // Devolver stock si era una venta general con productos detallados
        if (ultima.total > 0 && ultima.productos) {
            ultima.productos.forEach(prod => {
                const enDB = inventario.find(p => p.id === prod.id);
                if (enDB && enDB.tipo !== "variable") {
                    enDB.stock += prod.cantidad;
                }
            });
            await apiPost('/api/inventario', inventario, 'inventario');
            subirInventarioAGitHub();
        }

        ventas.pop();
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        actualizarTodo();
        alert("✅ Movimiento anulado correctamente. Stock devuelto (si corresponde).");
    }
}

// --- ACTUALIZAR TODO (Dibujar Tablas e Indicadores) ---
function actualizarTodo() {
    // 1. Totales de caja diaria
    let e = 0, t = 0, q = 0;
    ventas.forEach(x => { 
        if (x.metodo === 'efectivo') e += x.total; 
        else if (x.metodo === 'debito') t += x.total; 
        else q += x.total; 
    });
    
    document.getElementById('total-efectivo').innerText = `$${e.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    document.getElementById('total-debito').innerText = `$${t.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    document.getElementById('total-qr').innerText = `$${q.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    document.getElementById('total-general').innerText = `$${(e + t + q).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

    // 2. Tabla Productos de Inventario e Alerta de Reposición
    const tbodyProd = document.querySelector('#tabla-productos tbody');
    if (tbodyProd) {
        tbodyProd.innerHTML = '';
        const reposicion = [];
        
        // Ordenar productos alfabéticamente por nombre
        inventario.sort((a, b) => a.nombre.localeCompare(b.nombre));

        inventario.forEach((p, i) => {
            if (p.stock !== undefined && p.stock <= 3 && p.tipo !== "variable") {
                reposicion.push(p.nombre);
            }
            
            const trClass = (p.stock !== undefined && p.stock <= 3 && p.tipo !== "variable") ? 'status-low' : '';
            const stockDisplay = p.tipo === 'variable' ? 'N/A' : (p.stock || 0);

            tbodyProd.innerHTML += `
                <tr class="${trClass}">
                    <td><strong>${p.id}</strong></td>
                    <td>${p.nombre}</td>
                    <td>$${p.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>${stockDisplay}</td>
                    <td>
                        <button class="btn btn-danger btn-icon-only" onclick="eliminarProducto(${i})" title="Eliminar producto">🗑️</button>
                    </td>
                </tr>`;
        });

        // Mostrar Alerta de Reposición
        const alerta = document.getElementById('alerta-reposicion');
        const lista = document.getElementById('lista-reposicion');
        if (alerta && lista) {
            if (reposicion.length > 0) { 
                alerta.style.display = 'block'; 
                lista.innerHTML = reposicion.map(x => `<li><strong>${x}</strong> - Quedan 3 unidades o menos.</li>`).join(''); 
            } else {
                alerta.style.display = 'none';
            }
        }
    }

    // 3. Tabla de Fiados
    const tbodyFiado = document.querySelector('#tabla-fiados tbody');
    if (tbodyFiado) {
        tbodyFiado.innerHTML = '';
        
        // Ordenar fiados por nombre
        fiados.sort((a, b) => a.cliente.localeCompare(b.cliente));
        
        fiados.forEach((f, i) => {
            tbodyFiado.innerHTML += `
                <tr>
                    <td><strong>${f.cliente}</strong></td>
                    <td style="color: var(--danger); font-weight: bold;">$${f.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>
                        <button class="btn btn-success" style="padding: 6px 12px; font-size: 0.85rem;" onclick="cobrarFiado(${i})">
                            💸 PAGÓ
                        </button>
                    </td>
                </tr>`;
        });
    }

    // 4. Tabla Historial de Cierres
    const tbodyHist = document.getElementById('cuerpo-historial');
    if (tbodyHist) {
        tbodyHist.innerHTML = '';
        [...historialCierres].reverse().forEach((c, index) => {
            const realIndex = historialCierres.length - 1 - index;
            tbodyHist.innerHTML += `
                <tr>
                    <td>${c.fecha}</td>
                    <td>$${c.efectivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>$${c.otros.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td style="font-weight: 700; color: var(--success);">$${c.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>
                        <button class="btn btn-danger btn-icon-only" onclick="borrarCierreHistorial(${realIndex})" title="Borrar del historial">🗑️</button>
                    </td>
                </tr>`;
        });
    }

    // 5. Tabla de Gastos
    dibujarTablaGastos(); 
}

// --- CÁMARA ESCÁNER EN LA WEB ---
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

// Carga e inicialización inteligente en Admin comunicándose con server.py
async function inicializarAdmin() {
    // Cargar todos los datos desde el servidor API
    inventario = await apiGet('/api/inventario', 'inventario');
    fiados = await apiGet('/api/fiados', 'fiados');
    ventas = await apiGet('/api/ventas', 'ventas_realizadas');
    historialCierres = await apiGet('/api/historial-cierres', 'historial_cierres');
    
    validarToken();
    actualizarTodo();
}

inicializarAdmin();
