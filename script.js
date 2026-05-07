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
    // 1. Obtenemos lo que el cliente te dio
    const pagaConInput = document.getElementById('paga-con');
    const vueltoDisplay = document.getElementById('vuelto-display');
    
    if (!pagaConInput || !vueltoDisplay) return;

    const pagaCon = parseFloat(pagaConInput.value) || 0;

    // 2. Calculamos la resta
    const vuelto = pagaCon - totalVenta;

    // 3. Mostramos el resultado
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
    
    // IMPORTANTE: El nombre tiene que ser 'ventas_realizadas'
    const ventasHistoricas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    
    const nuevaVenta = {
        fecha: new Date().toLocaleString(),
        total: totalVenta, // Asegurate que esta variable global exista
        metodo: metodo,
        items: [...carrito]
    };

    ventasHistoricas.push(nuevaVenta);
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventasHistoricas));

    alert(`✅ VENTA GUARDADA\nTotal: $${totalVenta.toLocaleString('es-AR')}`);

    // Limpiamos todo
    carrito = [];
    document.getElementById('paga-con').value = '';
    renderizarCarrito();
    if(document.getElementById('codigo')) document.getElementById('codigo').focus();
}
    
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
function actualizarReporte() {
    // EL MISMO NOMBRE: 'ventas_realizadas'
    const ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    let efec = 0, deb = 0, qr = 0;

    ventas.forEach(v => {
        if (v.metodo === 'efectivo') efec += v.total;
        if (v.metodo === 'debito') deb += v.total;
        if (v.metodo === 'qr') qr += v.total;
    });

    // Actualizamos los cuadraditos del Admin
    if(document.getElementById('total-efectivo')) document.getElementById('total-efectivo').innerText = `$${efec.toLocaleString('es-AR')}`;
    if(document.getElementById('total-debito')) document.getElementById('total-debito').innerText = `$${deb.toLocaleString('es-AR')}`;
    if(document.getElementById('total-qr')) document.getElementById('total-qr').innerText = `$${qr.toLocaleString('es-AR')}`;
}

// Iniciar
cargarInventario();
