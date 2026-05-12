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

// --- GESTIÓN DE GASTOS ---
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

function limpiarHistorialGastos() {
    alert("Los gastos se limpian automáticamente al presionar 'Cerrar Caja'.");
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

    localStorage.setItem('inventario', JSON.stringify(inventario));
    await subirAGithub(inventario);
    actualizarTodo();
    limpiarFormulario();
}

function eliminarProducto(index) {
    if (confirm("¿Borrar?")) { inventario.splice(index, 1); localStorage.setItem('inventario', JSON.stringify(inventario)); subirAGithub(inventario); actualizarTodo(); }
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

// --- CIERRE ---
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

// --- ACTUALIZAR PANTALLA ---
function actualizarTodo() {
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

    const tbodyFiado = document.querySelector('#tabla-fiados tbody');
    tbodyFiado.innerHTML = '';
    fiados.forEach((f, i) => {
        tbodyFiado.innerHTML += `<tr><td>${f.cliente}</td><td style="color:#ff5252">$${f.monto}</td><td><button onclick="cobrarFiado(${i})" style="background:#4caf50; border:none; color:white; border-radius:4px; cursor:pointer; padding: 5px;">PAGÓ</button></td></tr>`;
    });

    const tbodyHist = document.getElementById('cuerpo-historial');
    tbodyHist.innerHTML = '';
    const h = JSON.parse(localStorage.getItem('historial_cierres')) || [];
    [...h].reverse().slice(0, 5).forEach(c => {
        tbodyHist.innerHTML += `<tr><td>${c.fecha}</td><td>$${c.efectivo}</td><td>$${c.otros}</td><td>$${c.total}</td></tr>`;
    });

    // LLAMADA CLAVE PARA QUE SE VEAN LOS GASTOS
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

// Al cargar por primera vez
validarToken();
actualizarTodo();
