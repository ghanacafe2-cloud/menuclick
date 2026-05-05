// Variable global para el inventario
let productosDB = [];
let carrito = [];
let totalVenta = 0;

// 1. Cargar los productos desde el JSON al arrancar
async function cargarProductos() {
    try {
        const respuesta = await fetch('productos.json');
        productosDB = await respuesta.json();
        console.log("Inventario cargado con éxito");
    } catch (error) {
        console.error("Error cargando el JSON:", error);
        alert("No se pudo cargar productos.json. Asegurate de que el archivo esté en el repo.");
    }
}

// 2. Escuchar a la "pistolita" (Input de código)
const inputCodigo = document.getElementById('codigo');
inputCodigo.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const codigoLeido = inputCodigo.value.trim().toUpperCase();
        if (codigoLeido !== "") {
            procesarEscaneo(codigoLeido);
        }
        inputCodigo.value = ''; // Limpia el campo para el siguiente escaneo
    }
});

// 3. Buscar el producto y manejar la lógica
function procesarEscaneo(codigo) {
    const producto = productosDB.find(p => p.id === codigo);

    if (producto) {
        if (producto.tipo === "variable") {
            // Lógica para Pan/Fiambre: pide el precio al usuario
            const precioManual = parseFloat(prompt(`Ingrese el precio para ${producto.nombre}:`));
            if (!isNaN(precioManual) && precioManual > 0) {
                agregarAlCarrito(producto.nombre, precioManual);
            }
        } else {
            // Producto con precio fijo
            agregarAlCarrito(producto.nombre, producto.precio);
        }
    } else {
        alert(`El código ${codigo} no está registrado.`);
    }
}

// 4. Actualizar el carrito
function agregarAlCarrito(nombre, precio) {
    carrito.push({ nombre, precio });
    renderizarCarrito();
}

function renderizarCarrito() {
    const lista = document.getElementById('lista-productos');
    const displayTotal = document.getElementById('total-display');
    
    lista.innerHTML = ''; // Limpiar lista visual
    totalVenta = 0;

    carrito.forEach((item, index) => {
        totalVenta += item.precio;
        const fila = document.createElement('div');
        fila.className = 'producto-fila';
        fila.innerHTML = `
            <span><strong>${item.nombre}</strong></span>
            <span>$${item.precio.toFixed(2)}</span>
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

// 5. Finalizar Venta y Cierre
function finalizarVenta() {
    if (carrito.length === 0) return alert("¡El carrito está vacío!");

    const metodo = document.getElementById('metodo-pago').value;
    
    // Aquí podrías enviar esto a una base de datos o LocalStorage para el cierre de caja
    const ticket = {
        hora: new Date().toLocaleTimeString(),
        total: totalVenta,
        pago: metodo
    };

    alert(`VENTA FINALIZADA\nTotal: $${totalVenta}\nPago: ${metodo.toUpperCase()}`);
    
    // Limpiar todo para el próximo cliente
    carrito = [];
    renderizarCarrito();
    inputCodigo.focus();
}

// Arrancar la carga al abrir la página
cargarProductos();
