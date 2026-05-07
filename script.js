// El cerebro del Mostrador - Kiosco El Cholo
let productosDB = [];
let carrito = [];
let totalVenta = 0;

// 1. CARGA DE DATOS: Trae lo que guardaste en el Admin
function cargarInventario() {
    const datosLocales = localStorage.getItem('inventario');
    if (datosLocales) {
        productosDB = JSON.parse(datosLocales);
        console.log("Inventario cargado.");
    } else {
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

// 6. FINALIZAR VENTA (Aquí estaba el error, ahora está completa)
function finalizarVenta() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const metodo = document.getElementById('metodo-pago').value;
    
    // Guardamos con el nombre exacto que lee el Admin
    const ventasHistoricas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    
    const nuevaVenta = {
        fecha: new Date().toLocaleString(),
        total: totalVenta,
        metodo: metodo,
        items: [...carrito]
    };

    ventasHistoricas.push(nuevaVenta);
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventasHistoricas));

    alert(`✅ VENTA GUARDADA\nTotal: $${totalVenta.toLocaleString('es-AR')}`);

    // Limpiamos todo para el próximo cliente
    carrito = [];
    const inputPaga = document.getElementById('paga-con');
    if (inputPaga) inputPaga.value = '';
    renderizarCarrito();
    
    if(inputCodigo) inputCodigo.focus();
}

// 7. FOCO INTELIGENTE (No molesta cuando querés clickear botones)
window.onclick = function(e) {
    const elementosLibres = ['BUTTON', 'INPUT', 'SELECT', 'OPTION', 'TEXTAREA'];
    if (!elementosLibres.includes(e.target.tagName)) {
        if (inputCodigo) inputCodigo.focus();
    }
};

// Iniciar
cargarInventario();
