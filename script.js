// El cerebro del Mostrador - Kiosco El Cholo
let productosDB = [];
let carrito = [];
let totalVenta = 0;

// 1. CARGA DE DATOS
function cargarInventario() {
    const datosLocales = localStorage.getItem('inventario');
    if (datosLocales) {
        productosDB = JSON.parse(datosLocales);
    } else {
        productosDB = [
            { id: "PAN", nombre: "Pan Francés (kg)", precio: 0, tipo: "variable", stock: 999 },
            { id: "7790070411730", nombre: "Yerba Mate", precio: 2500, tipo: "fijo", stock: 10 }
        ];
    }
}

// 2. ESCUCHA DE LA PISTOLITA Y BÚSQUEDA MANUAL
const inputCodigo = document.getElementById('codigo');
if (inputCodigo) {
    inputCodigo.addEventListener('input', (e) => {
        const valor = inputCodigo.value.trim().toUpperCase();
        const exacto = productosDB.find(p => p.id === valor);
        
        if (exacto && valor.length >= 8) {
            procesarEscaneo(valor);
            inputCodigo.value = '';
            document.getElementById('lista-sugerencias').innerHTML = '';
        } else {
            mostrarSugerencias(valor);
        }
    });

    inputCodigo.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const valor = inputCodigo.value.trim().toUpperCase();
            if(valor !== "") {
                procesarEscaneo(valor);
                inputCodigo.value = '';
                document.getElementById('lista-sugerencias').innerHTML = '';
            }
        }
    });
}

// 3. LÓGICA DE ESCANEO
function procesarEscaneo(codigo) {
    const producto = productosDB.find(p => p.id === codigo);
    if (producto) {
        if (producto.stock <= 0) {
            alert(`⚠️ ¡SIN STOCK! El producto "${producto.nombre}" no tiene unidades.`);
            return;
        }
        if (producto.tipo === "variable") {
            const precioManual = parseFloat(prompt(`Precio para ${producto.nombre}:`));
            if (!isNaN(precioManual) && precioManual > 0) {
                agregarAlCarrito(producto.nombre, precioManual);
            }
        } else {
            agregarAlCarrito(producto.nombre, producto.precio);
        }
    } else {
        alert(`Código ${codigo} no encontrado.`);
    }
}

// 4. MANEJO DEL CARRITO
function agregarAlCarrito(nombre, precio) {
    carrito.push({ nombre, precio });
    renderizarCarrito();
}

function renderizarCarrito() {
    const lista = document.getElementById('lista-productos');
    const displayTotal = document.getElementById('total-display');
    if (!lista || !displayTotal) return;

    lista.innerHTML = ''; 
    totalVenta = 0;

    carrito.forEach((item, index) => {
        totalVenta += item.precio;
        const fila = document.createElement('div');
        fila.className = 'producto-fila';
        fila.innerHTML = `
            <span><strong>${item.nombre}</strong></span>
            <span>$${item.precio.toLocaleString('es-AR')}</span>
            <button class="btn-eliminar" onclick="quitarItem(${index})">❌</button>
        `;
        lista.appendChild(fila);
    });

    displayTotal.innerText = `$${totalVenta.toLocaleString('es-AR')}`;
    calcularVuelto(); 
}

function quitarItem(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

// 5. CALCULADORA DE VUELTO
function calcularVuelto() {
    const pagaConInput = document.getElementById('paga-con');
    const vueltoDisplay = document.getElementById('vuelto-display');
    if (!pagaConInput || !vueltoDisplay) return;

    const pagaCon = parseFloat(pagaConInput.value) || 0;
    const vuelto = pagaCon - totalVenta;

    if (pagaCon === 0) {
        vueltoDisplay.innerText = "$0,00";
        vueltoDisplay.style.color = "black";
    } else if (vuelto < 0) {
        vueltoDisplay.innerText = "Falta dinero";
        vueltoDisplay.style.color = "red";
    } else {
        vueltoDisplay.innerText = `$${vuelto.toLocaleString('es-AR')}`;
        vueltoDisplay.style.color = "green";
    }
}

// 6. FINALIZAR VENTA (CORREGIDA)
function finalizarVenta() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const metodo = document.getElementById('metodo-pago').value;

    // Descontar Stock
    carrito.forEach(itemVendido => {
        const enDB = productosDB.find(p => p.nombre === itemVendido.nombre);
        if (enDB && enDB.stock > 0) {
            enDB.stock -= 1;
        }
    });
    
    // Guardar Inventario actualizado
    localStorage.setItem('inventario', JSON.stringify(productosDB));

    // Guardar Venta en Historial con el detalle de productos para poder anular luego
    const ventasHistoricas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    ventasHistoricas.push({
        total: totalVenta,
        metodo: metodo,
        fecha: new Date().toLocaleString(),
        productos: [...carrito] // <--- Importante para el stock
    });
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventasHistoricas));

    alert(`✅ VENTA GUARDADA`);

    carrito = [];
    document.getElementById('paga-con').value = '';
    renderizarCarrito();
    inputCodigo.focus();
}

// 7. ANULAR VENTA (CORREGIDA)
function anularUltimaVenta() {
    let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    if (ventas.length === 0) return alert("No hay ventas para anular.");

    const ultima = ventas[ventas.length - 1];
    
    if (confirm(`¿Anular venta de $${ultima.total}? Se devolverá el stock.`)) {
        // Devolver stock
        if (ultima.productos) {
            ultima.productos.forEach(prod => {
                const enDB = productosDB.find(p => p.nombre === prod.nombre);
                if (enDB) enDB.stock += 1;
            });
            localStorage.setItem('inventario', JSON.stringify(productosDB));
        }

        ventas.pop(); 
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));
        alert("Venta anulada correctamente.");
        renderizarCarrito();
    }
}

// 8. FIADOS Y EXTRAS
function enviarAFiado() {
    if (carrito.length === 0) return alert("El carrito está vacío");
    const cliente = prompt("¿Nombre del cliente?");
    if (!cliente) return;

    let fiados = JSON.parse(localStorage.getItem('fiados')) || [];
    const idx = fiados.findIndex(f => f.cliente.toUpperCase() === cliente.toUpperCase());
    
    if (idx > -1) fiados[idx].monto += totalVenta;
    else fiados.push({ cliente: cliente, monto: totalVenta });

    localStorage.setItem('fiados', JSON.stringify(fiados));
    
    // Descontar stock también en fiados
    carrito.forEach(item => {
        const enDB = productosDB.find(p => p.nombre === item.nombre);
        if (enDB) enDB.stock -= 1;
    });
    localStorage.setItem('inventario', JSON.stringify(productosDB));

    alert("Anotado en fiados.");
    carrito = [];
    renderizarCarrito();
}

function mostrarSugerencias(busqueda) {
    const contenedor = document.getElementById('lista-sugerencias');
    if (!contenedor) return;
    if (busqueda.length < 2) { contenedor.innerHTML = ''; return; }

    const filtrados = productosDB.filter(p => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase())
    ).slice(0, 5);

    contenedor.innerHTML = filtrados.map(p => `
        <div class="sugerencia-item" onclick="procesarEscaneo('${p.id}'); document.getElementById('codigo').value=''; document.getElementById('lista-sugerencias').innerHTML=''">
            <span>${p.nombre}</span>
            <b>$${p.precio}</b>
        </div>
    `).join('');
}

function cancelarCarrito() {
    if (carrito.length > 0 && confirm("¿Vaciar carrito?")) {
        carrito = [];
        renderizarCarrito();
    }
}

// Foco automático
window.onclick = function(e) {
    if (!['BUTTON', 'INPUT', 'SELECT'].includes(e.target.tagName)) {
        inputCodigo.focus();
    }
};

cargarInventario();
