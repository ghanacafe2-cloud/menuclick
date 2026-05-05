// El cerebro del Mostrador - Kiosco El Cholo
let productosDB = [];
let carrito = [];
let totalVenta = 0;

// 1. CARGA DE DATOS: Prioriza lo que cargaste en el Admin (LocalStorage)
function cargarInventario() {
    const datosLocales = localStorage.getItem('inventario');
    
    if (datosLocales) {
        productosDB = JSON.parse(datosLocales);
        console.log("Inventario cargado desde la memoria local.");
    } else {
        // Si no hay nada, cargamos unos de ejemplo para que no esté vacío
        productosDB = [
            { id: "PAN", nombre: "Pan Francés (kg)", precio: 0, tipo: "variable" },
            { id: "7790070411730", nombre: "Yerba Mate (Ejemplo)", precio: 2500, tipo: "fijo" }
        ];
        console.log("Usando productos de ejemplo.");
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
            inputCodigo.value = ''; // Limpia para el siguiente
        }
    });
}

// 3. LÓGICA DE BÚSQUEDA
function procesarEscaneo(codigo) {
    // Buscamos en la base que cargamos al inicio
    const producto = productosDB.find(p => p.id === codigo);

    if (producto) {
        if (producto.tipo === "variable") {
            // Caso Pan/Fiambre
            const precioManual = parseFloat(prompt(`Precio para ${producto.nombre}:`));
            if (!isNaN(precioManual) && precioManual > 0) {
                agregarAlCarrito(producto.nombre, precioManual);
            }
        } else {
            // Producto común
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
            <button class="btn-eliminar" onclick="quitarItem(${index})">X</button>
        `;
        lista.appendChild(fila);
    });

    displayTotal.innerText = `$${totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function quitarItem(index) {
    carrito.splice(index, 1);
    renderizarCarrito();
}

// 5. FINALIZAR VENTA Y CIERRE
function finalizarVenta() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const metodo = document.getElementById('metodo-pago').value;
    
    // GUARDAR EN HISTORIAL (Para el cierre de caja futuro)
    const ventasHistoricas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    const nuevaVenta = {
        fecha: new Date().toLocaleString(),
        total: totalVenta,
        metodo: metodo,
        items: [...carrito]
    };
    ventasHistoricas.push(nuevaVenta);
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventasHistoricas));

    alert(`VENTA EXITOSA\nTotal: $${totalVenta}\nPago: ${metodo.toUpperCase()}`);
    
    // Reiniciar
    carrito = [];
    renderizarCarrito();
    if(inputCodigo) inputCodigo.focus();
}

// Iniciar sistema
cargarInventario();
