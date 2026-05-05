// Simulamos la base de datos (después la podés pasar a un productos.json aparte)
let productosDB = [
    { id: "7790070411730", nombre: "Yerba Mate 500g", precio: 2500, tipo: "fijo" },
    { id: "7791234567890", nombre: "Alfajor Triple", precio: 900, tipo: "fijo" },
    { id: "PAN", nombre: "Pan Francés (kg)", precio: 0, tipo: "variable" },
    { id: "JAMON", nombre: "Jamón Cocido (100g)", precio: 0, tipo: "variable" }
];

let carrito = [];
let totalVenta = 0;

const inputCodigo = document.getElementById('codigo');
const listaProductos = document.getElementById('lista-productos');
const displayTotal = document.getElementById('total-display');

// Escuchar cuando la pistolita manda el código (Enter)
inputCodigo.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const codigoLeido = inputCodigo.value.trim().toUpperCase();
        buscarProducto(codigoLeido);
        inputCodigo.value = ''; // Limpia para el próximo escaneo
    }
});

function buscarProducto(codigo) {
    const producto = productosDB.find(p => p.id === codigo);

    if (producto) {
        if (producto.tipo === "variable") {
            // Si es pan o fiambre, pedimos el precio manualmente
            const precioManual = parseFloat(prompt(`Ingrese el precio para ${producto.nombre}:`));
            if (!isNaN(precioManual) && precioManual > 0) {
                agregarAlCarrito(producto.nombre, precioManual);
            }
        } else {
            agregarAlCarrito(producto.nombre, producto.precio);
        }
    } else {
        alert("Producto no encontrado. ¡Cargalo en el Admin!");
    }
}

function agregarAlCarrito(nombre, precio) {
    carrito.push({ nombre, precio });
    actualizarInterfaz();
}

function actualizarInterfaz() {
    listaProductos.innerHTML = ''; // Limpiamos la lista
    totalVenta = 0;

    carrito.forEach((item, index) => {
        totalVenta += item.precio;
        const fila = document.createElement('div');
        fila.className = 'producto-fila';
        fila.innerHTML = `
            <span>${item.nombre}</span>
            <span>$${item.precio.toLocaleString('es-AR')}</span>
            <button onclick="eliminarDelCarrito(${index})" style="background:red; color:white; border:none; border-radius:3px; cursor:pointer;">X</button>
        `;
        listaProductos.appendChild(fila);
    });

    displayTotal.innerText = `$${totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
}

function eliminarDelCarrito(index) {
    carrito.splice(index, 1);
    actualizarInterfaz();
}

function finalizarVenta() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const metodo = document.getElementById('metodo-pago').value;
    
    // Aquí podrías guardar la venta en un historial para el Cierre de Caja
    const ventaRealizada = {
        fecha: new Date().toLocaleString(),
        total: totalVenta,
        metodo: metodo,
        items: carrito
    };

    console.log("Venta Registrada:", ventaRealizada);
    alert(`¡Venta Exitosa!\nTotal: $${totalVenta}\nMedio: ${metodo.toUpperCase()}`);
    
    // Resetear todo
    carrito = [];
    actualizarInterfaz();
    inputCodigo.focus();
}
