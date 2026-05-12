const USERNAME = "ghanacafe2-cloud"; 
const REPO = "menuclick";
const FILE_PATH = "productos.json";

let inventario = JSON.parse(localStorage.getItem('inventario')) || [];
let fiados = JSON.parse(localStorage.getItem('fiados')) || [];

// --- FUNCIONES DE GASTOS ---
function registrarGasto() {
    const det = document.getElementById('gasto-detalle').value.trim();
    const mon = parseFloat(document.getElementById('gasto-monto').value);
    
    if (!det || isNaN(mon)) return alert("Poné detalle y monto");
    
    if (confirm(`¿Pagar $${mon} por ${det}?`)) {
        let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
        ventas.push({ 
            total: -mon, 
            metodo: 'efectivo', 
            fecha: new Date().toLocaleString(), 
            detalle: `GASTO: ${det}` 
        });
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));
        document.getElementById('gasto-detalle').value = '';
        document.getElementById('gasto-monto').value = '';
        actualizarTodo();
    }
}

function borrarGastoIndividual(idx) {
    if (confirm("¿Borrar este registro?")) {
        let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
        ventas.splice(idx, 1);
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));
        actualizarTodo();
    }
}

// --- ACTUALIZACIÓN DE PANTALLA ---
function actualizarTodo() {
    const ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    let efec = 0, otros = 0;

    // Totales y Tabla de Gastos
    const cuerpoGastos = document.getElementById('cuerpo-gastos');
    cuerpoGastos.innerHTML = '';

    ventas.forEach((v, index) => {
        if (v.metodo === 'efectivo') efec += v.total;
        else otros += v.total;

        if (v.total < 0) {
            cuerpoGastos.innerHTML += `
                <tr>
                    <td>${v.fecha.split(', ')[1] || v.fecha}</td>
                    <td>${v.detalle}</td>
                    <td style="color:#ff5252">-$${Math.abs(v.total)}</td>
                    <td><button class="btn-danger" onclick="borrarGastoIndividual(${index})">🗑️</button></td>
                </tr>`;
        }
    });

    document.getElementById('total-efectivo').innerText = `$${efec.toLocaleString()}`;
    document.getElementById('total-otros').innerText = `$${otros.toLocaleString()}`;
    document.getElementById('total-general').innerText = `$${(efec + otros).toLocaleString()}`;

    // Inventario y Alerta Reposición
    const tbodyProd = document.querySelector('#tabla-productos tbody');
    const listaRep = document.getElementById('lista-reposicion');
    const alertaRep = document.getElementById('alerta-reposicion');
    tbodyProd.innerHTML = '';
    listaRep.innerHTML = '';
    let faltantes = 0;

    inventario.forEach((p, i) => {
        if (p.stock <= 3) {
            faltantes++;
            listaRep.innerHTML += `<li>${p.nombre} (Quedan: ${p.stock})</li>`;
        }
        tbodyProd.innerHTML += `<tr>
            <td>${p.id}</td>
            <td>${p.nombre}</td>
            <td>$${p.precio}</td>
            <td class="${p.stock <= 3 ? 'status-low' : ''}">${p.stock}</td>
            <td><button class="btn-danger" onclick="eliminarProducto(${i})">🗑️</button></td>
        </tr>`;
    });
    alertaRep.style.display = faltantes > 0 ? 'block' : 'none';

    // Fiados
    const tbodyFiados = document.getElementById('tabla-fiados-body');
    tbodyFiados.innerHTML = '';
    fiados.forEach((f, i) => {
        tbodyFiados.innerHTML += `<tr>
            <td>${f.cliente}</td>
            <td style="color:#ff5252">$${f.monto}</td>
            <td><button onclick="cobrarFiado(${i})" style="background:#4caf50; border:none; color:white; padding:5px; border-radius:4px; cursor:pointer;">PAGÓ</button></td>
        </tr>`;
    });

    // Historial Cierres
    const histBody = document.getElementById('cuerpo-historial');
    histBody.innerHTML = '';
    const h = JSON.parse(localStorage.getItem('historial_cierres')) || [];
    h.reverse().slice(0, 5).forEach(c => {
        histBody.innerHTML += `<tr><td>${c.fecha}</td><td>$${c.efectivo}</td><td>$${c.otros}</td><td>$${c.total}</td></tr>`;
    });
}

// --- OTRAS FUNCIONES (Resumidas para que funcionen directo) ---
function guardarProducto() {
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
    actualizarTodo();
}

function eliminarProducto(i) { if (confirm("¿Borrar?")) { inventario.splice(i, 1); localStorage.setItem('inventario', JSON.stringify(inventario)); actualizarTodo(); } }

function agregarFiado() {
    const cli = document.getElementById('fiado-cliente').value.trim();
    const mon = parseFloat(document.getElementById('fiado-monto').value);
    if (!cli || isNaN(mon)) return;
    const idx = fiados.findIndex(f => f.cliente.toUpperCase() === cli.toUpperCase());
    if (idx > -1) fiados[idx].monto += mon;
    else fiados.push({ cliente: cli, monto: mon });
    localStorage.setItem('fiados', JSON.stringify(fiados));
    actualizarTodo();
}

function cobrarFiado(i) {
    const f = fiados[i];
    const met = prompt(`¿Cómo paga ${f.cliente}? \n1: Efectivo\n2: Otros`) === "1" ? "efectivo" : "otros";
    let v = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    v.push({ total: f.monto, metodo: met, fecha: new Date().toLocaleString(), detalle: `COBRO FIADO: ${f.cliente}` });
    localStorage.setItem('ventas_realizadas', JSON.stringify(v));
    fiados.splice(i, 1);
    localStorage.setItem('fiados', JSON.stringify(fiados));
    actualizarTodo();
}

function borrarVentas() {
    const v = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    if (v.length === 0) return alert("No hay movimientos");
    if (confirm("¿Cerrar caja?")) {
        let e = 0, o = 0;
        v.forEach(x => { if(x.metodo==='efectivo') e+=x.total; else o+=x.total; });
        let h = JSON.parse(localStorage.getItem('historial_cierres')) || [];
        h.push({ fecha: new Date().toLocaleDateString(), efectivo: e, otros: o, total: e+o });
        localStorage.setItem('historial_cierres', JSON.stringify(h));
        localStorage.removeItem('ventas_realizadas');
        actualizarTodo();
    }
}

actualizarTodo();
