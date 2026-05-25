// El cerebro del Mostrador - Kiosco El Cholo
let productosDB = [];
let carrito = [];
let totalVenta = 0;
let ultimoEscaneo = "";
let timeoutEscaneo = null;

// 1. CARGA DE DATOS
async function cargarInventario() {

    try {

        const response = await fetch(
            'https://raw.githubusercontent.com/ghanacafe2-cloud/menuclick/main/productos.json'
        );

        productosDB = await response.json();

        // Guardar cache local
        localStorage.setItem(
            'inventario',
            JSON.stringify(productosDB)
        );

        console.log("✅ Inventario cargado desde GitHub");

    } catch (error) {

        console.error("⚠️ Error cargando nube");

        // Backup local
        const datosLocales =
            localStorage.getItem('inventario');

        if (datosLocales) {

            productosDB = JSON.parse(datosLocales);

            console.log("📦 Inventario cargado local");

        } else {

            productosDB = [];

        }

    }

}

// 2. ESCUCHA DE LA PISTOLITA Y BÚSQUEDA MANUAL
const inputCodigo = document.getElementById('codigo');
if (inputCodigo) {
  inputCodigo.addEventListener('input', () => {

    clearTimeout(timeoutEscaneo);

    timeoutEscaneo = setTimeout(() => {

        const valor =
            inputCodigo.value.trim().toUpperCase();

        if (!valor) return;

        // Evitar doble lectura
        if (valor === ultimoEscaneo) return;

        ultimoEscaneo = valor;

        const exacto = productosDB.find(
            p => p.id === valor
        );

        if (exacto) {

            procesarEscaneo(valor);

            inputCodigo.value = '';

            document.getElementById(
                'lista-sugerencias'
            ).innerHTML = '';

            setTimeout(() => {
                ultimoEscaneo = "";
            }, 500);

        } else {

            mostrarSugerencias(valor);

        }

    }, 80);

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
   const producto = productosDB.find(p =>
    p.id.toUpperCase() === codigo.toUpperCase() ||
    p.nombre.toUpperCase() === codigo.toUpperCase()
);
    if (producto) {
       if (
    producto.tipo !== "variable" &&
    producto.stock <= 0
) {
            alert(`⚠️ ¡SIN STOCK! El producto "${producto.nombre}" no tiene unidades.`);
            return;
        }
        if (producto.tipo === "variable") {
            const precioManual = parseFloat(prompt(`Precio para ${producto.nombre}:`));
           if (
    !isNaN(precioManual) &&
    precioManual > 0 &&
    precioManual < 10000000
) {
              agregarAlCarrito(
    producto.id,
    producto.nombre,
    precioManual
);
            }
        } else {
         agregarAlCarrito(
    producto.id,
    producto.nombre,
    producto.precio
);
        }
    } else {
        alert(`Código ${codigo} no encontrado.`);
    }
}

// 4. MANEJO DEL CARRITO
function agregarAlCarrito(id, nombre, precio) {

    // Buscar si ya existe el producto
    const existente = carrito.find(item => item.id === id);

    if (existente) {

        existente.cantidad += 1;

        existente.subtotal =
            existente.cantidad * existente.precio;

    } else {

        carrito.push({
            id: id,
            nombre: nombre,
            precio: precio,
            cantidad: 1,
            subtotal: precio
        });

    }

    renderizarCarrito();
}

function renderizarCarrito() {

    const lista = document.getElementById('lista-productos');
    const displayTotal = document.getElementById('total-display');

    if (!lista || !displayTotal) return;

    lista.innerHTML = '';

    totalVenta = 0;

    // Si no hay productos
    if (carrito.length === 0) {

        lista.innerHTML = `
            <p style="color: gray; text-align: center; margin-top: 40px; font-style: italic;">
                Esperando productos...
            </p>
        `;

    }

    carrito.forEach((item, index) => {

        totalVenta += item.subtotal;

        const fila = document.createElement('div');

        fila.className = 'producto-fila';

        fila.innerHTML = `
            <span style="flex:2">
                <strong>${item.nombre}</strong>
                <br>
                <small>
                    ${item.cantidad} x $${item.precio.toLocaleString('es-AR')}
                </small>
            </span>

            <span style="font-weight:bold;">
                $${item.subtotal.toLocaleString('es-AR')}
            </span>

            <button class="btn-eliminar"
                onclick="quitarItem(${index})">
                ❌
            </button>
        `;

        lista.appendChild(fila);

    });

    displayTotal.innerText =
        `$${totalVenta.toLocaleString('es-AR')}`;

    calcularVuelto();
}

function quitarItem(index) {

    if (carrito[index].cantidad > 1) {

        carrito[index].cantidad -= 1;

        carrito[index].subtotal =
            carrito[index].cantidad *
            carrito[index].precio;

    } else {

        carrito.splice(index, 1);

    }

    renderizarCarrito();
}
function calcularVuelto() {
    const pagaConInput = document.getElementById('paga-con');
    const vueltoDisplay = document.getElementById('vuelto-display');
    if (!pagaConInput || !vueltoDisplay) return;

    const pagaCon = parseFloat(pagaConInput.value) || 0;
    if (pagaCon < 0) {
    vueltoDisplay.innerText = "Monto inválido";
    vueltoDisplay.style.color = "red";
    return;
}
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

   // Descontar stock REAL
// VALIDAR STOCK ANTES DE DESCONTAR
for (const itemVendido of carrito) {

    const enDB = productosDB.find(
        p => p.id === itemVendido.id
    );

    if (!enDB) continue;

    // Ignorar productos variables
    if (enDB.tipo === "variable") continue;

    // Validar stock
    if (enDB.stock < itemVendido.cantidad) {

        alert(`⚠️ Stock insuficiente para ${enDB.nombre}`);

        return;
    }
}

// DESCONTAR STOCK
for (const itemVendido of carrito) {

    const enDB = productosDB.find(
        p => p.id === itemVendido.id
    );

    if (!enDB) continue;

    if (enDB.tipo !== "variable") {

        enDB.stock -= itemVendido.cantidad;

    }
}
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
                const enDB = productosDB.find(
    p => p.id === prod.id
);

if (enDB) {

    // Solo devolver stock si NO es variable
    if (enDB.tipo !== "variable") {

        enDB.stock += prod.cantidad;

    }

}
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
    
    // Descontar stock REAL en fiados
carrito.forEach(item => {

    const enDB = productosDB.find(
        p => p.id === item.id
    );

    if (enDB) {

        // No descontar variables
        if (enDB.tipo !== "variable") {

            if (enDB.stock >= item.cantidad) {

                enDB.stock -= item.cantidad;

            }

        }

    }

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
           <b>$${p.precio.toLocaleString('es-AR')}</b>
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
