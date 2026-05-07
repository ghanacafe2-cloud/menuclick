// El cerebro del Mostrador - Kiosco El Cholo
let productosDB = [];
let carrito = [];
let totalVenta = 0;

// 1. CARGA DE DATOS
function cargarInventario() {
    const datosLocales = localStorage.getItem('inventario');
    if (datosLocales) {
        productosDB = JSON.parse(datosLocales);
        console.log("Inventario cargado.");
    } else {
        // Datos por defecto si el local está vacío
        productosDB = [
            { id: "PAN", nombre: "Pan Francés (kg)", precio: 0, tipo: "variable", stock: 999 },
            { id: "7790070411730", nombre: "Yerba Mate", precio: 2500, tipo: "fijo", stock: 10 }
        ];
    }
}

// 2. ESCUCHA DE LA PISTOLITA (Corregido)
const inputCodigo = document.getElementById('codigo');
if (inputCodigo) {
    inputCodigo.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const codigoLeido = inputCodigo.value.trim().toUpperCase();
            if (codigoLeido !== "") {
                procesarEscaneo(codigoLeido);
            }
            inputCodigo.value = ''; 
        }
    });
}

// 3. LÓGICA DE ESCANEO
function procesarEscaneo(codigo) {
    const producto = productosDB.find(p => p.id === codigo);

    if (producto) {
        if (producto.tipo === "variable") {
            const precioManual = parseFloat(prompt(`Precio para ${producto.nombre}:`));
            if (!isNaN(precioManual) && precioManual > 0) {
                agregarAlCarrito(producto.nombre, precioManual);
            }
        } else {
            agregarAlCarrito(producto.nombre, producto.precio);
        }
    } else {
        alert(`Código ${codigo} no encontrado. Cargalo en el Admin.`);
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
            <span>$${item.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            <button class="btn-eliminar" onclick="quitarItem(${index})">❌</button>
        `;
        lista.appendChild(fila);
    });

    displayTotal.innerText = `$${totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
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
        vueltoDisplay.innerText = `$${vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        vueltoDisplay.style.color = "green";
    }
}

// 6. FINALIZAR VENTA (Corregida la llave que rompía todo)
function finalizarVenta() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const metodo = document.getElementById('metodo-pago').value;

    // --- LÓGICA DE DESCUENTO DE STOCK ---
    carrito.forEach(itemVendido => {
        const productoEnDB = productosDB.find(p => p.nombre === itemVendido.nombre);
        if (productoEnDB && productoEnDB.stock > 0) {
            productoEnDB.stock -= 1;
        }
    });
    
    // Guardar inventario con menos stock
    localStorage.setItem('inventario', JSON.stringify(productosDB));

    // Guardar la venta en el historial para el Admin
    const ventasHistoricas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    ventasHistoricas.push({
        total: totalVenta,
        metodo: metodo,
        fecha: new Date().toISOString()
    });
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventasHistoricas));

    alert(`✅ VENTA GUARDADA\nTotal: $${totalVenta.toLocaleString('es-AR')}`);

    // Limpiar para el próximo cliente
    carrito = [];
    const inputPaga = document.getElementById('paga-con');
    if (inputPaga) inputPaga.value = '';
    renderizarCarrito();
    
    if(inputCodigo) inputCodigo.focus();
}

// 7. FOCO INTELIGENTE
window.onclick = function(e) {
    const elementosLibres = ['BUTTON', 'INPUT', 'SELECT', 'OPTION', 'TEXTAREA'];
    if (!elementosLibres.includes(e.target.tagName)) {
        if (inputCodigo) inputCodigo.focus();
    }
};
function enviarAFiado() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const cliente = prompt("¿A quién le anotamos este fiado?");
    if (!cliente) return; // Si cancela, no hace nada

    // 1. Traemos los fiados actuales del Admin
    let fiados = JSON.parse(localStorage.getItem('fiados')) || [];

    // 2. Buscamos si el cliente ya debe algo
    const index = fiados.findIndex(f => f.cliente.toUpperCase() === cliente.toUpperCase());
    
    if (index > -1) {
        fiados[index].monto += totalVenta; // Suma a lo que ya debía
    } else {
        fiados.push({ cliente: cliente, monto: totalVenta }); // Cliente nuevo
    }

    // 3. Guardamos y descontamos stock (porque la mercadería se va)
    localStorage.setItem('fiados', JSON.stringify(fiados));
    
    carrito.forEach(itemVendido => {
        const productoEnDB = productosDB.find(p => p.nombre === itemVendido.nombre);
        if (productoEnDB && productoEnDB.stock > 0) productoEnDB.stock -= 1;
    });
    localStorage.setItem('inventario', JSON.stringify(productosDB));

    alert(`📝 Anotado en la cuenta de ${cliente}\nTotal nuevo fiado: $${totalVenta.toLocaleString('es-AR')}`);

    // 4. Limpiamos el mostrador
    carrito = [];
    renderizarCarrito();
}
// Iniciar
cargarInventario();
