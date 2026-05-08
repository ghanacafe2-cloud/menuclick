const USERNAME = "ghanacafe2-cloud"; 
const REPO = "menuclick";
const FILE_PATH = "productos.json";

let inventario = JSON.parse(localStorage.getItem('inventario')) || [];
let fiados = JSON.parse(localStorage.getItem('fiados')) || [];

// --- TOKEN Y NUBE ---
function guardarToken() {
    localStorage.setItem('github_token', document.getElementById('gh-token').value.trim());
    validarToken();
}

async function validarToken() {
    const token = localStorage.getItem('github_token');
    const status = document.getElementById('token-status');
    if (token && document.getElementById('gh-token')) document.getElementById('gh-token').value = token;
    if (!token) return status.innerText = "Sin conectar";
    try {
        const res = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${token}` } });
        status.innerText = res.ok ? "✅ Conectado" : "❌ Error Token";
    } catch (e) { status.innerText = "Error conexión"; }
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
            body: JSON.stringify({ message: "Update Inventario", content, sha })
        });
    } catch (e) { console.error("Error nube:", e); }
}

// --- PRODUCTOS ---
async function guardarProducto() {
    const id = document.getElementById('admin-codigo').value.trim().toUpperCase();
    const nombre = document.getElementById('admin-nombre').value.trim();
    const precio = parseFloat(document.getElementById('admin-precio').value);
    const stock = parseInt(document.getElementById('admin-stock').value) || 0;
    const tipo = document.getElementById('admin-tipo').value;

    if (!id || !nombre || isNaN(precio)) return alert("Completá Código, Nombre y Precio");

    const index = inventario.findIndex(p => p.id === id);
    if (index > -1) inventario[index] = { id, nombre, precio, tipo, stock };
    else inventario.push({ id, nombre, precio, tipo, stock });

    localStorage.setItem('inventario', JSON.stringify(inventario));
    document.getElementById('btn-guardar').innerText = "⏳ SUBIENDO...";
    await subirAGithub(inventario);
    document.getElementById('btn-guardar').innerText = "💾 GUARDAR EN INVENTARIO";
    actualizarTodo();
    limpiarFormulario();
}

function eliminarProducto(index) {
    if (confirm("¿Borrar producto?")) {
        inventario.splice(index, 1);
        localStorage.setItem('inventario', JSON.stringify(inventario));
        subirAGithub(inventario);
        actualizarTodo();
    }
}

// --- FIADOS ---
function agregarFiado() {
    const cliente = document.getElementById('fiado-cliente').value.trim();
    const monto = parseFloat(document.getElementById('fiado-monto').value);
    if (!cliente || isNaN(monto)) return;
    const index = fiados.findIndex(f => f.cliente.toUpperCase() === cliente.toUpperCase());
    if (index > -1) fiados[index].monto += monto;
    else fiados.push({ cliente, monto });
    localStorage.setItem('fiados', JSON.stringify(fiados));
    document.getElementById('fiado-cliente').value = '';
    document.getElementById('fiado-monto').value = '';
    actualizarTodo();
}

function cobrarFiado(index) {
    const f = fiados[index];
    const modo = prompt(`Cobrar $${f.monto} a ${f.cliente}\n1: Efectivo\n2: Tarjeta\n3: QR`);
    let metodo = modo === "1" ? "efectivo" : modo === "2" ? "debito" : modo === "3" ? "qr" : null;
    
    if (metodo) {
        let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
        ventas.push({ total: f.monto, metodo: metodo, fecha: new Date().toISOString(), detalle: `COBRO FIADO: ${f.cliente}` });
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));
        fiados.splice(index, 1);
        localStorage.setItem('fiados', JSON.stringify(fiados));
        actualizarTodo();
    }
}

// --- CIERRE DE CAJA ---
function borrarVentas() {
    const ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    if (ventas.length === 0) return alert("No hay ventas");
    if (confirm("¿Cerrar caja? Los totales irán al historial.")) {
        let e = 0, t = 0, q = 0;
        ventas.forEach(v => {
            if (v.metodo === 'efectivo') e += v.total;
            else if (v.metodo === 'debito') t += v.total;
            else q += v.total;
        });
        let historial = JSON.parse(localStorage.getItem('historial_cierres')) || [];
        historial.push({ fecha: new Date().toLocaleDateString(), efectivo: e, otros: t + q, total: e + t + q });
        localStorage.setItem('historial_cierres', JSON.stringify(historial));
        localStorage.removeItem('ventas_realizadas');
        actualizarTodo();
    }
}

// --- ACTUALIZAR PANTALLA ---
function actualizarTodo() {
    // 1. Totales del día
    const ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    let e = 0, t = 0, q = 0;
    ventas.forEach(v => {
        if (v.metodo === 'efectivo') e += v.total;
        else if (v.metodo === 'debito') t += v.total;
        else q += v.total;
    });
    document.getElementById('total-efectivo').innerText = `$${e.toLocaleString('es-AR')}`;
    document.getElementById('total-debito').innerText = `$${t.toLocaleString('es-AR')}`;
    document.getElementById('total-qr').innerText = `$${q.toLocaleString('es-AR')}`;
    document.getElementById('total-general').innerText = `$${(e+t+q).toLocaleString('es-AR')}`;

    // 2. Tabla Inventario
    const tbodyProd = document.querySelector('#tabla-productos tbody');
    tbodyProd.innerHTML = '';
    inventario.forEach((p, i) => {
        const clase = p.stock <= 3 ? 'status-low' : '';
        tbodyProd.innerHTML += `<tr><td>${p.id}</td><td>${p.nombre}</td><td>$${p.precio}</td><td class="${clase}">${p.stock} un.</td><td><button class="btn-danger" onclick="eliminarProducto(${i})">🗑️</button></td></tr>`;
    });

    // 3. Tabla Fiados
    const tbodyFiado = document.querySelector('#tabla-fiados tbody');
    tbodyFiado.innerHTML = '';
    fiados.forEach((f, i) => {
        tbodyFiado.innerHTML += `<tr><td><b>${f.cliente}</b></td><td style="color:#ff5252">$${f.monto}</td><td><button onclick="cobrarFiado(${i})" style="background:#4caf50; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">PAGÓ</button></td></tr>`;
    });

    // 4. Historial
    const tbodyHist = document.getElementById('cuerpo-historial');
    tbodyHist.innerHTML = '';
    const hist = JSON.parse(localStorage.getItem('historial_cierres')) || [];
    hist.reverse().slice(0, 10).forEach(c => {
        tbodyHist.innerHTML += `<tr><td>${c.fecha}</td><td>$${c.efectivo}</td><td>$${c.otros}</td><td style="color:#fbc02d">$${c.total}</td></tr>`;
    });
}

function limpiarFormulario() {
    document.getElementById('admin-codigo').value = '';
    document.getElementById('admin-nombre').value = '';
    document.getElementById('admin-precio').value = '';
    document.getElementById('admin-stock').value = '';
    document.getElementById('admin-codigo').focus();
}

validarToken();
actualizarTodo();
