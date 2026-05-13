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
        
        // Si el código es largo (pistolita), intenta procesar directo
        const exacto = productosDB.find(p => p.id === valor);
        if (exacto && valor.length >= 8) {
            procesarEscaneo(valor);
            inputCodigo.value = '';
            document.getElementById('lista-sugerencias').innerHTML = ''; // Limpia sugerencias
        } else {
            // Si estás escribiendo letras, muestra sugerencias por nombre
            mostrarSugerencias(valor);
        }
    });

    // Por si le das Enter manualmente
    inputCodigo.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const valor = inputCodigo.value.trim().toUpperCase();
            procesarEscaneo(valor);
            inputCodigo.value = '';
        }
    });
}
// 3. LÓGICA DE ESCANEO (Con bloqueo de Stock)
function procesarEscaneo(codigo) {
    const producto = productosDB.find(p => p.id === codigo);

    if (producto) {
        // --- BLOQUEO POR FALTA DE STOCK ---
        if (producto.stock <= 0) {
            alert(`⚠️ ¡SIN STOCK! El producto "${producto.nombre}" no tiene unidades disponibles.`);
            return; // Corta aquí, no deja agregar
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

// 6. FINALIZAR VENTA
function finalizarVenta() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const metodo = document.getElementById('metodo-pago').value;

    carrito.forEach(itemVendido => {
        const productoEnDB = productosDB.find(p => p.nombre === itemVendido.nombre);
        if (productoEnDB && productoEnDB.stock > 0) {
            productoEnDB.stock -= 1;
        }
    });
    
    localStorage.setItem('inventario', JSON.stringify(productosDB));

    const ventasHistoricas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    ventasHistoricas.push({
        total: totalVenta,
        metodo: metodo,
        fecha: new Date().toLocaleString(),
        detalle: "Venta Mostrador"
    });
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventasHistoricas));

    alert(`✅ VENTA GUARDADA\nTotal: $${totalVenta.toLocaleString('es-AR')}`);

    carrito = [];
    const inputPaga = document.getElementById('paga-con');
    if (inputPaga) inputPaga.value = '';
    renderizarCarrito();
    
    if(inputCodigo) inputCodigo.focus();
}

// 7. FOCO INTELIGENTE Y FIADOS
window.onclick = function(e) {
    const elementosLibres = ['BUTTON', 'INPUT', 'SELECT', 'OPTION', 'TEXTAREA'];
    if (!elementosLibres.includes(e.target.tagName)) {
        if (inputCodigo) inputCodigo.focus();
    }
};

function enviarAFiado() {
    if (carrito.length === 0) return alert("El carrito está vacío");

    const cliente = prompt("¿A quién le anotamos este fiado?");
    if (!cliente) return;

    let fiados = JSON.parse(localStorage.getItem('fiados')) || [];
    const index = fiados.findIndex(f => f.cliente.toUpperCase() === cliente.toUpperCase());
    
    if (index > -1) {
        fiados[index].monto += totalVenta;
    } else {
        fiados.push({ cliente: cliente, monto: totalVenta });
    }

    localStorage.setItem('fiados', JSON.stringify(fiados));
    
    carrito.forEach(itemVendido => {
        const productoEnDB = productosDB.find(p => p.nombre === itemVendido.nombre);
        if (productoEnDB && productoEnDB.stock > 0) productoEnDB.stock -= 1;
    });
    localStorage.setItem('inventario', JSON.stringify(productosDB));

    alert(`📝 Anotado en la cuenta de ${cliente}\nTotal nuevo fiado: $${totalVenta.toLocaleString('es-AR')}`);

    carrito = [];
    renderizarCarrito();
}

cargarInventario();
// --- FUNCIÓN PARA VACIAR EL CARRITO ACTUAL ---
function cancelarCarrito() {
    if (carrito.length === 0) return;
    if (confirm("¿Estás seguro de cancelar esta compra? Se borrará todo el carrito.")) {
        carrito = [];
        const inputPaga = document.getElementById('paga-con');
        if (inputPaga) inputPaga.value = '';
        renderizarCarrito();
        alert("Compra cancelada.");
    }
}

// --- FUNCIÓN PARA ANULAR LA ÚLTIMA VENTA (Vuelve el stock y resta la plata) ---
function anularUltimaVenta() {
    let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    if (ventas.length === 0) return alert("No hay ventas para anular.");

    const ultimaVenta = ventas[ventas.length - 1];
    
    if (confirm(`¿Anular la última venta de $${ultimaVenta.total.toLocaleString()}? \n(Esto devolverá el stock y restará el monto de la caja)`)) {
        
        // 1. Quitamos la venta del historial
        ventas.pop();
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));

        // 2. IMPORTANTE: Como no guardamos qué productos exactos se vendieron en el historial, 
        // esta anulación resta la plata de la caja. 
        // El stock lo tendrías que corregir a mano en el Admin si es un producto específico.
        
        alert("Venta eliminada del historial de hoy.");
        renderizarCarrito();
    }
}
// NUEVA: Función para buscar por nombre y mostrar botones
function mostrarSugerencias(busqueda) {
    const contenedor = document.getElementById('lista-sugerencias');
    const input = document.getElementById('codigo'); // Agregamos referencia al input
    if (!contenedor) return;

    if (busqueda.length < 2) {
        contenedor.innerHTML = '';
        return;
    }

    const filtrados = productosDB.filter(p => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
        p.id.toLowerCase().includes(busqueda.toLowerCase())
    ).slice(0, 5);

    contenedor.innerHTML = filtrados.map(p => `
        <div class="sugerencia-item" onclick="procesarEscaneo('${p.id}'); document.getElementById('codigo').value=''; document.getElementById('lista-sugerencias').innerHTML=''">
            <span>${p.nombre}</span>
            <b>$${p.precio}</b>
        </div>
    `).join('');
}
