const PIN_ADMIN = "1234";

const acceso = prompt("Ingrese PIN administrador");

if (acceso !== PIN_ADMIN) {

    alert("Acceso denegado");

    window.location.href = "index.html";

}
const USERNAME = "ghanacafe2-cloud"; 
const REPO = "menuclick";
const FILE_PATH = "productos.json";

let inventario = JSON.parse(localStorage.getItem('inventario')) || [];
let fiados = JSON.parse(localStorage.getItem('fiados')) || [];

// --- NUBE ---
function guardarToken() { 
    localStorage.setItem('github_token', document.getElementById('gh-token').value.trim()); 
    validarToken(); 
}

async function validarToken() {
    const token = localStorage.getItem('github_token');
    if (token && document.getElementById('gh-token')) document.getElementById('gh-token').value = token;
    if (!token) return;
    try {
        const res = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${token}` } });
        document.getElementById('token-status').innerText = res.ok ? "✅" : "❌";
    } catch (e) { }
}

async function subirAGithub(data) {
    const token = localStorage.getItem('github_token');
    if (!token) return;
    try {
        const resInfo = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`, {
            headers: { Authorization: `token ${token}` }
        });
        let sha = resInfo.ok ? (await resInfo.json()).sha : undefined;
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`, {
            method: 'PUT',
            headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Update", content, sha })
        });
    } catch (e) { }
}

// --- GESTIÓN DE GASTOS (PAGOS) ---
function registrarGasto() {
    const det = document.getElementById('gasto-detalle').value.trim();
    const mon = parseFloat(document.getElementById('gasto-monto').value);
    
    if (!det || isNaN(mon)) return alert("Completá detalle y monto del pago");
    
    if (confirm(`¿Confirmas el pago de $${mon} por: ${det}?`)) {
        let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
        
        const nuevoGasto = { 
            total: -mon, 
            metodo: 'efectivo', 
            fecha: new Date().toLocaleString(), 
            detalle: `GASTO: ${det}` 
        };
        
        ventas.push(nuevoGasto);
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));
        
        document.getElementById('gasto-detalle').value = '';
        document.getElementById('gasto-monto').value = '';
        
        actualizarTodo();
    }
}

function dibujarTablaGastos() {
    const tbodyGastos = document.getElementById('cuerpo-gastos');
    if (!tbodyGastos) return;
    
    tbodyGastos.innerHTML = '';
    const v = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    
    v.forEach((x, index) => {
        if (x.total < 0) {
            tbodyGastos.innerHTML += `
                <tr>
                    <td>${x.fecha.split(', ')[1] || x.fecha}</td> 
                    <td>${x.detalle}</td>
                    <td style="color: #ff5252; font-weight: bold;">-$${Math.abs(x.total).toLocaleString()}</td>
                    <td><button class="btn-danger" onclick="borrarGastoIndividual(${index})">🗑️</button></td>
                </tr>
            `;
        }
    });
}

function borrarGastoIndividual(indexVentaOriginal) {
    if (confirm("¿Borrar este registro de pago?")) {
        let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
        ventas.splice(indexVentaOriginal, 1);
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));
        actualizarTodo();
    }
}

function limpiarSoloGastos() {
    let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    if (ventas.length === 0) return alert("No hay nada para limpiar.");

    if (confirm("¿Querés borrar visualmente los pagos de la lista? \n\n⚠️ OJO: Esto no afecta el total de la caja.")) {
        const ventasLimpias = ventas.filter(item => item.total >= 0);
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventasLimpias));
        actualizarTodo();
        alert("Lista de pagos despejada.");
    }
}
function eliminarProducto(index) {

    const token =
        localStorage.getItem('github_token');

    if (!token) {

        alert("⚠️ Falta token GitHub");

        return false;
    }

    try {

        // 1. Obtener SHA actual
        const response = await fetch(
            'https://api.github.com/repos/ghanacafe2-cloud/menuclick/contents/productos.json',
            {
                headers: {
                    Authorization: `token ${token}`
                }
            }
        );

        const data = await response.json();

        // 2. Convertir JSON a Base64
        const contenido =
            btoa(
                unescape(
                    encodeURIComponent(
                        JSON.stringify(productosDB, null, 2)
                    )
                )
            );

        // 3. Subir archivo
        const update = await fetch(
            'https://api.github.com/repos/ghanacafe2-cloud/menuclick/contents/productos.json',
            {
                method: 'PUT',

                headers: {
                    Authorization: `token ${token}`,
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    message: 'Actualización automática inventario',

                    content: contenido,

                    sha: data.sha

                })

            }
        );

        if (update.ok) {

            console.log("✅ Inventario sincronizado");

            return true;

        } else {

            console.error(await update.json());

            alert("❌ Error subiendo inventario");

            return false;
        }

    } catch (error) {

        console.error(error);

        alert("❌ Error GitHub");

        return false;
    }
}
// --- PRODUCTOS ---
async function guardarProducto() {
    const id = document.getElementById('admin-codigo').value.trim().toUpperCase();
    const nom = document.getElementById('admin-nombre').value.trim();
    const pre = parseFloat(document.getElementById('admin-precio').value);
    const stk = parseInt(document.getElementById('admin-stock').value) || 0;
    const tip = document.getElementById('admin-tipo').value;
    if (!id || !nom || isNaN(pre)) return alert("Faltan datos");

    const idx = inventario.findIndex(p => p.id === id);
    if (idx > -1) inventario[idx] = { id, nombre: nom, precio: pre, tipo: tip, stock: stk };
    else inventario.push({ id, nombre: nom, precio: pre, tipo: tip, stock: stk });

  localStorage.setItem(
   'inventario',
   JSON.stringify(productosDB)
);

subirInventarioAGitHub();

function eliminarProducto(index) {
    if (confirm("¿Borrar?")) { 
        inventario.splice(index, 1); 
        localStorage.setItem('inventario', JSON.stringify(inventario)); 
        subirAGithub(inventario); 
        actualizarTodo(); 
    }
}

// --- FIADOS ---
function agregarFiado() {
    const cli = document.getElementById('fiado-cliente').value.trim();
    const mon = parseFloat(document.getElementById('fiado-monto').value);
    if (!cli || isNaN(mon)) return;
    const idx = fiados.findIndex(f => f.cliente.toUpperCase() === cli.toUpperCase());
    if (idx > -1) fiados[idx].monto += mon;
    else fiados.push({ cliente: cli, monto: mon });
    localStorage.setItem('fiados', JSON.stringify(fiados));
    document.getElementById('fiado-cliente').value = '';
    document.getElementById('fiado-monto').value = '';
    actualizarTodo();
}

function cobrarFiado(index) {
    const f = fiados[index];
    const modo = prompt(`Cobrar $${f.monto} a ${f.cliente}\n1: Efectivo\n2: Tarjeta\n3: QR`);
    let met = modo === "1" ? "efectivo" : modo === "2" ? "debito" : modo === "3" ? "qr" : null;
    if (met) {
        let v = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
        v.push({ total: f.monto, metodo: met, fecha: new Date().toLocaleString(), detalle: `COBRO FIADO: ${f.cliente}` });
        localStorage.setItem('ventas_realizadas', JSON.stringify(v));
        fiados.splice(index, 1);
        localStorage.setItem('fiados', JSON.stringify(fiados));
        actualizarTodo();
    }
}

// --- CIERRE DE CAJA ---
function borrarVentas() {
    const v = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    if (v.length === 0) return alert("No hay ventas");
    if (confirm("¿Cerrar la caja y guardar en historial?")) {
        let e = 0, t = 0, q = 0;
        v.forEach(x => { 
            if(x.metodo==='efectivo') e+=x.total; 
            else if(x.metodo==='debito') t+=x.total; 
            else q+=x.total; 
        });
        let h = JSON.parse(localStorage.getItem('historial_cierres')) || [];
        h.push({ fecha: new Date().toLocaleDateString(), efectivo: e, otros: t+q, total: e+t+q });
        localStorage.setItem('historial_cierres', JSON.stringify(h));
        localStorage.removeItem('ventas_realizadas');
        actualizarTodo();
    }
}

// --- BORRAR HISTORIAL ---
function borrarCierreHistorial(index) {
    if (confirm("¿Estás seguro de borrar este cierre del historial? No se puede deshacer.")) {
        let h = JSON.parse(localStorage.getItem('historial_cierres')) || [];
        h.splice(index, 1); 
        localStorage.setItem('historial_cierres', JSON.stringify(h));
        actualizarTodo(); 
    }
}

// --- ACTUALIZAR PANTALLA ---
function actualizarTodo() {
    // 1. Totales de caja
    const v = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    let e=0, t=0, q=0;
    v.forEach(x => { 
        if(x.metodo==='efectivo') e+=x.total; 
        else if(x.metodo==='debito') t+=x.total; 
        else q+=x.total; 
    });
    
    document.getElementById('total-efectivo').innerText = `$${e.toLocaleString()}`;
    document.getElementById('total-debito').innerText = `$${t.toLocaleString()}`;
    document.getElementById('total-qr').innerText = `$${q.toLocaleString()}`;
    document.getElementById('total-general').innerText = `$${(e+t+q).toLocaleString()}`;

    // 2. Tabla Productos e Inventario
    const tbodyProd = document.querySelector('#tabla-productos tbody');
    tbodyProd.innerHTML = '';
    const reposicion = [];
    inventario.forEach((p, i) => {
        if (p.stock <= 3) reposicion.push(p.nombre);
        tbodyProd.innerHTML += `<tr><td>${p.id}</td><td>${p.nombre}</td><td>$${p.precio}</td><td class="${p.stock<=3?'status-low':''}">${p.stock}</td><td><button class="btn-danger" onclick="eliminarProducto(${i})">🗑️</button></td></tr>`;
    });

    const alerta = document.getElementById('alerta-reposicion');
    const lista = document.getElementById('lista-reposicion');
    if (reposicion.length > 0) { 
        alerta.style.display = 'block'; 
        lista.innerHTML = reposicion.map(x => `<li>${x}</li>`).join(''); 
    } else {
        alerta.style.display = 'none';
    }

    // 3. Tabla Fiados
    const tbodyFiado = document.querySelector('#tabla-fiados tbody');
    tbodyFiado.innerHTML = '';
    fiados.forEach((f, i) => {
        tbodyFiado.innerHTML += `<tr><td>${f.cliente}</td><td style="color:#ff5252">$${f.monto}</td><td><button onclick="cobrarFiado(${i})" style="background:#4caf50; border:none; color:white; border-radius:4px; cursor:pointer; padding: 5px;">PAGÓ</button></td></tr>`;
    });

    // 4. Tabla Historial de Cierres (con botón de borrar)
    const tbodyHist = document.getElementById('cuerpo-historial');
    tbodyHist.innerHTML = '';
    const h = JSON.parse(localStorage.getItem('historial_cierres')) || [];
    [...h].reverse().forEach((c, index) => {
        const realIndex = h.length - 1 - index;
        tbodyHist.innerHTML += `
            <tr>
                <td>${c.fecha}</td>
                <td>$${c.efectivo.toLocaleString()}</td>
                <td>$${c.otros.toLocaleString()}</td>
                <td>$${c.total.toLocaleString()}</td>
                <td><button class="btn-danger" onclick="borrarCierreHistorial(${realIndex})">🗑️</button></td>
            </tr>`;
    });

    // 5. Tabla de Gastos/Pagos
    dibujarTablaGastos(); 
}

function limpiarFormulario() { 
    document.getElementById('admin-codigo').value = ''; 
    document.getElementById('admin-nombre').value = ''; 
    document.getElementById('admin-precio').value = ''; 
    document.getElementById('admin-stock').value = ''; 
    document.getElementById('admin-codigo').focus(); 
}

function anularUltimaVentaAdmin() {
    let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    if (ventas.length === 0) return alert("No hay movimientos para anular.");

    const ultima = ventas[ventas.length - 1];
    if (confirm(`¿Anular el último movimiento: "${ultima.detalle || 'Venta'}" de $${ultima.total}?`)) {
        ventas.pop();
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));
        actualizarTodo();
        alert("Movimiento anulado.");
    }
}
// --- FUNCIÓN DE ESCÁNER CON CÁMARA ---
let html5QrCode;

function toggleEscaner() {
    const readerDiv = document.getElementById('reader');
    
    // Si ya está prendido, lo apagamos
    if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
            readerDiv.style.display = 'none';
            console.log("Escáner detenido");
        });
        return;
    }

    // Si no está creado, lo creamos
    if (!html5QrCode) {
        html5QrCode = new Html5Qrcode("reader");
    }

    readerDiv.style.display = 'block';

    const config = { fps: 10, qrbox: { width: 250, height: 150 } };

    html5QrCode.start(
        { facingMode: "environment" }, // Usa la cámara de atrás
        config,
        (decodedText) => {
            // Cuando detecta un código:
            document.getElementById('admin-codigo').value = decodedText.toUpperCase();
            beep(); // Sonidito de éxito
            html5QrCode.stop().then(() => {
                readerDiv.style.display = 'none';
                document.getElementById('admin-nombre').focus(); // Salta al nombre
            });
        },
        (errorMessage) => { /* Silencio para no llenar la consola de errores */ }
    ).catch(err => alert("Error al abrir cámara: " + err));
}

// Un ruidito para saber que escaneó
function beep() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    oscillator.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}
// Inicialización
validarToken();
actualizarTodo();
// --- SUBIR INVENTARIO A GITHUB ---
async function subirInventarioAGitHub() {

    const token =
        localStorage.getItem('github_token');

    if (!token) {

        alert("⚠️ Falta token GitHub");

        return false;
    }

    try {

        // Obtener SHA actual
        const response = await fetch(
            `https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`,
            {
                headers: {
                    Authorization: `token ${token}`
                }
            }
        );

        const data = await response.json();

        // Convertir JSON a Base64
        const contenido =
            btoa(
                unescape(
                    encodeURIComponent(
                        JSON.stringify(inventario, null, 2)
                    )
                )
            );

        // Subir archivo
        const update = await fetch(
            `https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`,
            {
                method: 'PUT',

                headers: {
                    Authorization: `token ${token}`,
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    message: 'Actualización automática inventario',

                    content: contenido,

                    sha: data.sha

                })

            }
        );

        if (update.ok) {

            console.log("✅ Inventario sincronizado");

            return true;

        } else {

            console.error(await update.json());

            alert("❌ Error subiendo inventario");

            return false;
        }

    } catch (error) {

        console.error(error);

        alert("❌ Error GitHub");

        return false;
    }
}

// --- GUARDAR PRODUCTO ---
async function guardarProducto() {

    const id =
        document.getElementById('admin-codigo')
        .value.trim()
        .toUpperCase();

    const nom =
        document.getElementById('admin-nombre')
        .value.trim();

    const pre =
        parseFloat(
            document.getElementById('admin-precio').value
        );

    const stk =
        parseInt(
            document.getElementById('admin-stock').value
        ) || 0;

    const tip =
        document.getElementById('admin-tipo').value;

    if (!id || !nom || isNaN(pre)) {

        return alert("Faltan datos");

    }

    // Validaciones
    if (pre < 0 || stk < 0) {

        return alert("⚠️ Valores inválidos");

    }

    // Buscar existente
    const idx =
        inventario.findIndex(p => p.id === id);

    const producto = {

        id,
        nombre: nom,
        precio: pre,
        tipo: tip,
        stock: stk

    };

    if (idx > -1) {

        inventario[idx] = producto;

    } else {

        inventario.push(producto);

    }

    // Guardar local
    localStorage.setItem(
        'inventario',
        JSON.stringify(inventario)
    );

    // Subir nube
    await subirInventarioAGitHub();

    // Actualizar pantalla
    actualizarTodo();

    // Limpiar formulario
    limpiarFormulario();

    alert("✅ Producto guardado");

}

// --- ELIMINAR PRODUCTO ---
function eliminarProducto(index) {

    if (!confirm("¿Borrar producto?")) return;

    inventario.splice(index, 1);

    localStorage.setItem(
        'inventario',
        JSON.stringify(inventario)
    );

    subirInventarioAGitHub();

    actualizarTodo();

}
