const USERNAME = "ghanacafe2-cloud"; 
const REPO = "menuclick";
const FILE_PATH = "productos.json";

let inventario = JSON.parse(localStorage.getItem('inventario')) || [];
let fiados = JSON.parse(localStorage.getItem('fiados')) || [];

// --- TOKEN ---
function guardarToken() {
    localStorage.setItem('github_token', document.getElementById('gh-token').value.trim());
    validarToken();
}
function borrarToken() { localStorage.removeItem('github_token'); location.reload(); }

async function validarToken() {
    const token = localStorage.getItem('github_token');
    const status = document.getElementById('token-status');
    if (token && document.getElementById('gh-token')) document.getElementById('gh-token').value = token;
    if (!token) return status.innerText = "❌ Sin Token";
    try {
        const res = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${token}` } });
        if (res.ok) { status.innerText = "✅ Conectado"; status.style.color = "#4caf50"; }
        else status.innerText = "⚠️ Token inválido";
    } catch (e) { status.innerText = "Error conexión"; }
}

// --- SUBIR A NUBE ---
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
    } catch (e) { console.error(e); }
}

// --- PRODUCTOS ---
async function guardarProducto() {
    const id = document.getElementById('admin-codigo').value.trim().toUpperCase();
    const nombre = document.getElementById('admin-nombre').value.trim();
    const precio = parseFloat(document.getElementById('admin-precio').value);
    const stock = parseInt(document.getElementById('admin-stock').value) || 0;
    const tipo = document.getElementById('admin-tipo').value;

    if (!id || !nombre || isNaN(precio)) return alert("Faltan datos");

    const index = inventario.findIndex(p => p.id === id);
    if (index > -1) inventario[index] = { id, nombre, precio, tipo, stock };
    else inventario.push({ id, nombre, precio, tipo, stock });

    localStorage.setItem('inventario', JSON.stringify(inventario));
    
    document.getElementById('btn-guardar').innerText = "⏳ SUBIENDO...";
    await subirAGithub(inventario);
    document.getElementById('btn-guardar').innerText = "💾 GUARDAR PRODUCTO";

    actualizarTodo();
    limpiarFormulario();
}

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
    const cliente = document.getElementById('fiado-cliente').value.trim();
    const monto = parseFloat(document.getElementById('fiado-monto').value);
    if (!cliente || isNaN(monto)) return;
    const index = fiados.findIndex(f => f.cliente.toUpperCase() === cliente.toUpperCase());
    if (index > -1) fiados[index].monto += monto;
    else fiados.push({ cliente, monto });
    localStorage.setItem('fiados', JSON.stringify(fiados));
    actualizarTodo();
}

function cobrarFiado(index) {
    const deuda = fiados[index].monto;
    const cliente = fiados[index].cliente;

    // 1. Preguntamos cómo paga
    const metodo = prompt(`Cobrar $${deuda} a ${cliente}.\n¿Cómo paga?\n1: Efectivo\n2: Débito/Crédito\n3: QR/Mercado Pago`);

    let metodoTexto = "";
    if (metodo === "1") metodoTexto = "efectivo";
    else if (metodo === "2") metodoTexto = "debito";
    else if (metodo === "3") metodoTexto = "qr";
    else return; // Si pone otra cosa o cancela, no hace nada

    // 2. Cargamos las ventas del día
    let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];

    // 3. Registramos el ingreso de plata diferenciado
    ventas.push({
        total: deuda,
        metodo: metodoTexto,
        fecha: new Date().toLocaleString(),
        detalle: `COBRO FIADO: ${cliente}` // Esto sirve para saber que no fue una venta común
    });

    // 4. Guardamos y limpiamos la deuda
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));
    fiados.splice(index, 1);
    localStorage.setItem('fiados', JSON.stringify(fiados));

    alert(`✅ Cobro registrado en ${metodoTexto.toUpperCase()}`);
    actualizarTodo();
}
// --- ACTUALIZAR TODO ---
function actualizarTodo() {
    // 1. Ventas
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

    // 2. Tabla Productos
    const tbodyProd = document.querySelector('#tabla-productos tbody');
    tbodyProd.innerHTML = '';
    inventario.forEach((p, i) => {
        const clase = p.stock <= 3 ? 'status-low' : 'status-ok';
        tbodyProd.innerHTML += `<tr><td>${p.id}</td><td>${p.nombre}</td><td>$${p.precio}</td><td class="${clase}">${p.stock}</td><td><button class="btn-danger" onclick="eliminarProducto(${i})">🗑️</button></td></tr>`;
    });

    // 3. Tabla Fiados
    const tbodyFiado = document.querySelector('#tabla-fiados tbody');
    tbodyFiado.innerHTML = '';
    fiados.forEach((f, i) => {
        tbodyFiado.innerHTML += `<tr><td>${f.cliente}</td><td style="color:#ff5252">$${f.monto}</td><td><button onclick="cobrarFiado(${i})" style="background:#4caf50; border:none; color:white; padding:5px; border-radius:4px;">PAGÓ</button></td></tr>`;
    });
}

function limpiarFormulario() {
    document.getElementById('admin-codigo').value = '';
    document.getElementById('admin-nombre').value = '';
    document.getElementById('admin-precio').value = '';
    document.getElementById('admin-stock').value = '';
    document.getElementById('admin-codigo').focus();
}

function borrarVentas() {
    const ventasActuales = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    
    if (ventasActuales.length === 0) return alert("No hay ventas para cerrar.");

    if (confirm("¿Desea cerrar la caja del día? Los totales se guardarán en el historial y la pantalla se limpiará.")) {
        
        // 1. Calculamos los totales del día que estamos cerrando
        let e = 0, t = 0, q = 0;
        ventasActuales.forEach(v => {
            if (v.metodo === 'efectivo') e += v.total;
            else if (v.metodo === 'debito') t += v.total;
            else q += v.total;
        });

        // 2. Creamos el registro del día
        const cierreDelDia = {
            fecha: new Date().toLocaleDateString(),
            efectivo: e,
            tarjeta: t,
            qr: q,
            total: e + t + q
        };

        // 3. Lo metemos en el Historial Permanente
        let historial = JSON.parse(localStorage.getItem('historial_cierres')) || [];
        historial.push(cierreDelDia);
        localStorage.setItem('historial_cierres', JSON.stringify(historial));

        // 4. AHORA SÍ, limpiamos las ventas del monitor para empezar el día nuevo
        localStorage.removeItem('ventas_realizadas');
        
        alert("✅ Caja cerrada y guardada en el historial.");
        actualizarTodo();
    }
}
