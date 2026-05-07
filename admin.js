const USERNAME = "ghanacafe2-cloud"; // CAMBIÁ ESTO POR TU NOMBRE DE USUARIO
const REPO = "menuclick";
const BRANCH = "main";
const FILE_PATH = "productos.json";

let inventario = JSON.parse(localStorage.getItem('inventario')) || [];

// --- GESTIÓN DE TOKEN ---
function guardarToken() {
    const t = document.getElementById('gh-token').value.trim();
    localStorage.setItem('github_token', t);
    validarToken();
}

function borrarToken() {
    localStorage.removeItem('github_token');
    location.reload();
}

async function validarToken() {
    const token = localStorage.getItem('github_token');
    const status = document.getElementById('token-status');
    if (token && document.getElementById('gh-token')) {
        document.getElementById('gh-token').value = token;
    }
    if (!token) { status.innerText = "❌ Sin Token"; return; }
    
    try {
        const res = await fetch('https://api.github.com/user', { 
            headers: { Authorization: `token ${token}` } 
        });
        if (res.ok) { 
            const data = await res.json();
            status.innerText = `✅ Conectado como: ${data.login}`; 
            status.style.color = "green"; 
        } else { 
            status.innerText = "⚠️ Token inválido"; 
            status.style.color = "red"; 
        }
    } catch (e) { status.innerText = "Error de conexión"; }
}

// --- FUNCIÓN PARA SUBIR A GITHUB ---
async function subirAGithub(data) {
    const token = localStorage.getItem('github_token');
    if (!token) return console.log("No hay token, solo local.");

    try {
        const resInfo = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`, {
            headers: { Authorization: `token ${token}` }
        });
        let sha = undefined;
        if (resInfo.ok) { const json = await resInfo.json(); sha = json.sha; }

        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const res = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`, {
            method: 'PUT',
            headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Update inventario via Admin", content, sha, branch: BRANCH })
        });

        if (res.ok) console.log("Sincronizado con GitHub.");
    } catch (e) { console.error("Error al subir:", e); }
}

// --- GUARDAR PRODUCTO ---
async function guardarProducto() {
    const id = document.getElementById('admin-codigo').value.trim().toUpperCase();
    const nombre = document.getElementById('admin-nombre').value.trim();
    const precio = parseFloat(document.getElementById('admin-precio').value);
    const tipo = document.getElementById('admin-tipo').value;

    if (!id || !nombre || isNaN(precio)) return alert("Faltan datos o el precio es inválido");

    const index = inventario.findIndex(p => p.id === id);
    if (index > -1) inventario[index] = { id, nombre, precio, tipo };
    else inventario.push({ id, nombre, precio, tipo });

    localStorage.setItem('inventario', JSON.stringify(inventario));
    
    const btn = document.getElementById('btn-guardar');
    if(btn) btn.innerText = "⏳ SUBIENDO...";

    await subirAGithub(inventario);

    if(btn) btn.innerText = "💾 GUARDAR EN LISTA";
    
    actualizarTodo();
    limpiarFormulario();
}

// --- ACTUALIZAR TABLA Y REPORTE (CORREGIDO) ---
function actualizarTodo() {
    // 1. REPORTE DE VENTAS
    const ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    let efec = 0, tarj = 0, qr = 0;
    
    ventas.forEach(v => {
        if (v.metodo === 'efectivo') efec += v.total;
        if (v.metodo === 'debito') tarj += v.total;
        if (v.metodo === 'qr') qr += v.total;
    });

    if(document.getElementById('total-efectivo')) document.getElementById('total-efectivo').innerText = `$${efec.toLocaleString('es-AR')}`;
    if(document.getElementById('total-debito')) document.getElementById('total-debito').innerText = `$${tarj.toLocaleString('es-AR')}`;
    if(document.getElementById('total-qr')) document.getElementById('total-qr').innerText = `$${qr.toLocaleString('es-AR')}`;
    if(document.getElementById('total-general')) document.getElementById('total-general').innerText = `$${(efec + tarj + qr).toLocaleString('es-AR')}`;

    // 2. TABLA DE PRODUCTOS
    const tbody = document.querySelector('#tabla-productos tbody');
    if(tbody) {
        tbody.innerHTML = '';
        inventario.forEach((prod, index) => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${prod.id}</td>
                <td>${prod.nombre}</td>
                <td>$${prod.precio.toLocaleString('es-AR')}</td>
                <td><button class="btn-danger" onclick="eliminarProducto(${index})">Borrar</button></td>
            `;
            tbody.appendChild(fila);
        });
    }
}

function eliminarProducto(index) {
    if (confirm("¿Borrar este producto?")) {
        inventario.splice(index, 1);
        localStorage.setItem('inventario', JSON.stringify(inventario));
        subirAGithub(inventario);
        actualizarTodo();
    }
}

function limpiarFormulario() {
    document.getElementById('admin-codigo').value = '';
    document.getElementById('admin-nombre').value = '';
    document.getElementById('admin-precio').value = '';
    document.getElementById('admin-codigo').focus();
}

function borrarVentas() {
    if (confirm("¿Reiniciar la caja a cero?")) {
        localStorage.removeItem('ventas_realizadas');
        actualizarTodo();
    }
}

// Iniciar
validarToken();
actualizarTodo();
