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
        // Ejemplos por si recién empezás
        productosDB = [
            { id: "PAN", nombre: "Pan Francés (kg)", precio: 0, tipo: "variable" },
            { id: "7790070411730", nombre: "Yerba Mate", precio: 2500, tipo: "fijo" }
        ];
    }
}

// 2. ESCUCHA DE LA PISTOLITA
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
    
    // IMPORTANTE: Recalcular vuelto cuando cambia el carrito
    calcularVuelto(); 
}

function quitarItem(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

// 5. CALCULADORA DE VUELTO (NUEVA)
function calcularVuelto() {
    const pagaCon = parseFloat(document.getElementById('paga-con').value) || 0;
    const vueltoDisplay = document.getElementById('vuelto-display');
    
    if (pagaCon === 0) {
        vueltoDisplay.innerText = "$0,00";
        vueltoDisplay.style.color = "#2e7d32";
        return;
    }

    const vuelto = pagaCon - totalVenta;

    if (vuelto < 0) {
        vueltoDisplay.innerText = "Falta dinero";
        vueltoDisplay.style.color = "red";
    } else {
        vueltoDisplay.innerText = `$${vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        vueltoDisplay.style.color = "#2e7d32";
    }
}

// 6. FINALIZAR VENTA
function finalizarVenta() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const metodo = document.getElementById('metodo-pago').value;
    
    const ventasHistoricas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    const nuevaVenta = {
        fecha: new Date().toLocaleString(),
        total: totalVenta,
        metodo: metodo,
        items: [...carrito]
    };
    
    ventasHistoricas.push(nuevaVenta);
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventasHistoricas));

    alert(`✅ VENTA EXITOSA\nTotal: $${totalVenta.toLocaleString('es-AR')}\nPago: ${metodo.toUpperCase()}`);
    
    // Reiniciar para el próximo cliente
    carrito = [];
    document.getElementById('paga-con').value = ''; // Limpiar calculadora
    renderizarCarrito();
    if(inputCodigo) inputCodigo.focus();
}

// Asegurar que el foco siempre vuelva a la pistolita
window.onclick = function() {
    if(inputCodigo) inputCodigo.focus();
};

// Iniciar
cargarInventario();
