// El cerebro del Mostrador - Kiosco El Cholo
let productosDB = [];
let carrito = [];
let totalVenta = 0;
let ultimoEscaneo = "";
let timeoutEscaneo = null;
let fiados = [];

// --- SISTEMA DE AUDIO (Efectos de sonido táctiles) ---
function reproducirSonido(tipo) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (tipo === 'scanner') {
            // Sonido corto de escaneo (Beep de supermercado)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, audioCtx.currentTime); // Tono agudo y limpio
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.08);
        } else if (tipo === 'exito') {
            // Chime de éxito (Venta finalizada)
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc1.type = 'triangle';
            osc1.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
            osc1.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.16); // C6

            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc1.start();
            osc2.start();
            osc1.stop(audioCtx.currentTime + 0.4);
            osc2.stop(audioCtx.currentTime + 0.4);
        } else if (tipo === 'alerta') {
            // Sonido de error/alerta (Tono grave doble)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Tono grave
            osc.frequency.setValueAtTime(180, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        }
    } catch (e) {
        console.warn("AudioContext no iniciado aún por políticas del navegador.", e);
    }
}

// --- CONFIGURACIÓN DE SINCRONIZACIÓN DE GITHUB ---
// Las variables y funciones de comunicación con GitHub y persistencia se han movido a api.js

// 1. CARGA DE DATOS INTELIGENTE
async function cargarInventario() {
    productosDB = await apiGet('/api/inventario', 'inventario');
}

async function cargarFiados() {
    fiados = await apiGet('/api/fiados', 'fiados');
}

// 2. ESCUCHA DE LA PISTOLITA Y BÚSQUEDA MANUAL
const inputCodigo = document.getElementById('codigo');
if (inputCodigo) {
    inputCodigo.addEventListener('input', () => {
        clearTimeout(timeoutEscaneo);
        
        timeoutEscaneo = setTimeout(() => {
            const valor = inputCodigo.value.trim().toUpperCase();
            if (!valor) {
                ocultarSugerencias();
                return;
            }

            const exacto = productosDB.find(p => p.id.toUpperCase() === valor);
            if (exacto) {
                procesarEscaneo(valor);
                inputCodigo.value = '';
                ocultarSugerencias();
            } else {
                mostrarSugerencias(valor);
            }
        }, 100);
    });

    inputCodigo.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const valor = inputCodigo.value.trim().toUpperCase();
            if (valor !== "") {
                procesarEscaneo(valor);
                inputCodigo.value = '';
                ocultarSugerencias();
            }
        }
    });
}

// 3. LÓGICA DE ESCANEO
function procesarEscaneo(codigo) {
    const cantInput = document.getElementById('cantidad-agregar');
    const cantidadAAgregar = cantInput ? (parseInt(cantInput.value) || 1) : 1;

    const producto = productosDB.find(p =>
        p.id.toUpperCase() === codigo.toUpperCase() ||
        p.nombre.toUpperCase() === codigo.toUpperCase()
    );

    if (producto) {
        // Validar Stock
        if (producto.tipo !== "variable" && (producto.stock === undefined || producto.stock <= 0)) {
            reproducirSonido('alerta');
            alert(`⚠️ ¡SIN STOCK! El producto "${producto.nombre}" no tiene unidades disponibles.`);
            return;
        }

        let precioFinal = parseFloat(String(producto.precio).replace(/[^\d.]/g, '')) || 0;
        if (producto.tipo === "variable") {
            reproducirSonido('scanner');
            const precioManual = parseFloat(prompt(`Precio para ${producto.nombre} (precio base por kg: $${precioFinal.toLocaleString('es-AR')}):`));
            if (!isNaN(precioManual) && precioManual > 0 && precioManual < 10000000) {
                precioFinal = precioManual;
                agregarAlCarrito(producto.id, producto.nombre, precioFinal, cantidadAAgregar, producto.imagen);
                mostrarBannerProductoFichado(producto, cantidadAAgregar, precioFinal);
            } else {
                reproducirSonido('alerta');
                return;
            }
        } else {
            reproducirSonido('scanner');
            agregarAlCarrito(producto.id, producto.nombre, precioFinal, cantidadAAgregar, producto.imagen);
            mostrarBannerProductoFichado(producto, cantidadAAgregar, precioFinal);
        }
        
        // Reset a 1
        if (cantInput) cantInput.value = 1;
    } else {
        reproducirSonido('alerta');
        alert(`Código o producto "${codigo}" no encontrado en el inventario.`);
    }
}

// Visualización cuando se fiche el producto en caja
function mostrarBannerProductoFichado(producto, cantidad, precio) {
    const banner = document.getElementById('banner-ultimo-fichado');
    const imgBox = document.getElementById('fichado-img-box');
    const nomEl = document.getElementById('fichado-nombre');
    const codEl = document.getElementById('fichado-codigo');
    const preEl = document.getElementById('fichado-precio');
    const cantEl = document.getElementById('fichado-cant');

    if (!banner || !imgBox || !nomEl || !codEl || !preEl || !cantEl) return;

    if (producto.imagen) {
        imgBox.innerHTML = `<img src="${producto.imagen}" alt="${producto.nombre}">`;
    } else {
        imgBox.innerHTML = `<span style="font-size: 1.6rem;">🛍️</span>`;
    }

    nomEl.innerText = producto.nombre;
    codEl.innerText = `Cód: ${producto.id}`;
    preEl.innerText = `$${precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    cantEl.innerText = `x ${cantidad} un`;

    banner.style.display = 'flex';

    // Reiniciar animación para destacar visualmente cada fichada
    banner.style.animation = 'none';
    banner.offsetHeight; // Forzar reflow
    banner.style.animation = 'fichadoFlash 0.35s ease-out';
}

// 4. MANEJO DEL CARRITO Y CANTIDADES MANUALES
function agregarAlCarrito(id, nombre, precio, cantidad = 1, imagen = null) {
    const existente = carrito.find(item => item.id === id);

    if (existente) {
        const enDB = productosDB.find(p => p.id === id);
        if (enDB && enDB.tipo !== "variable" && enDB.stock < (existente.cantidad + cantidad)) {
            reproducirSonido('alerta');
            alert(`⚠️ No hay suficiente stock para agregar ${cantidad} unidades de "${nombre}" (Stock disponible: ${enDB.stock}, En carrito: ${existente.cantidad}).`);
            return;
        }
        existente.cantidad += cantidad;
        existente.subtotal = existente.cantidad * existente.precio;
        if (!existente.imagen && imagen) existente.imagen = imagen;
    } else {
        const enDB = productosDB.find(p => p.id === id);
        if (enDB && enDB.tipo !== "variable" && enDB.stock < cantidad) {
            reproducirSonido('alerta');
            alert(`⚠️ No hay suficiente stock para "${nombre}" (Stock disponible: ${enDB.stock}, Solicitado: ${cantidad}).`);
            return;
        }
        carrito.push({
            id: id,
            nombre: nombre,
            precio: precio,
            cantidad: cantidad,
            subtotal: precio * cantidad,
            imagen: imagen || (enDB ? enDB.imagen : null)
        });
    }

    renderizarCarrito();
}

function actualizarCantidad(index, nuevaCantidad) {
    const qty = parseInt(nuevaCantidad);
    if (isNaN(qty) || qty <= 0) {
        quitarItemCompleto(index);
        return;
    }

    const item = carrito[index];
    const enDB = productosDB.find(p => p.id === item.id);

    if (enDB && enDB.tipo !== "variable") {
        if (enDB.stock === undefined || enDB.stock < qty) {
            reproducirSonido('alerta');
            alert(`⚠️ Stock insuficiente para "${item.nombre}". Stock disponible: ${enDB.stock || 0}`);
            const maxVal = Math.max(1, enDB.stock || 1);
            item.cantidad = maxVal;
            item.subtotal = item.cantidad * item.precio;
            renderizarCarrito();
            return;
        }
    }

    item.cantidad = qty;
    item.subtotal = item.cantidad * item.precio;
    renderizarCarrito();
}

function renderizarCarrito() {
    const lista = document.getElementById('lista-productos');
    const displayTotal = document.getElementById('total-display');

    if (!lista || !displayTotal) return;

    lista.innerHTML = '';
    totalVenta = 0;

    if (carrito.length === 0) {
        lista.innerHTML = `
            <p style="color: var(--text-secondary); text-align: center; margin-top: 60px; font-style: italic; font-size: 1.1rem;">
                Esperando lectura de código o entrada de producto...
            </p>
        `;
        displayTotal.innerText = "$0,00";
        calcularVuelto();
        return;
    }

    carrito.forEach((item, index) => {
        totalVenta += item.subtotal;

        const fila = document.createElement('div');
        fila.className = 'producto-fila';

        const fotoHtml = item.imagen 
            ? `<img src="${item.imagen}" alt="${item.nombre}">` 
            : `<div class="prod-thumb-placeholder">🛍️</div>`;

        fila.innerHTML = `
            <div class="prod-thumb">
                ${fotoHtml}
            </div>
            <div class="prod-info">
                <strong>${item.nombre}</strong>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                    <input type="number" min="1" class="qty-input" value="${item.cantidad}" 
                        onchange="actualizarCantidad(${index}, this.value)" 
                        style="width: 65px; padding: 5px 8px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); border-radius: 8px; text-align: center; font-weight: 700; font-size: 1rem; outline: none;">
                    <span style="color: var(--text-secondary); font-size: 0.95rem;">
                        x $${item.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            <div class="prod-subtotal">
                $${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>

            <button class="btn-eliminar" onclick="quitarItemCompleto(${index})" title="Quitar producto">
                ❌
            </button>
        `;

        lista.appendChild(fila);
    });

    displayTotal.innerText = `$${totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    calcularVuelto();
}

function quitarItem(index) {
    if (carrito[index].cantidad > 1) {
        carrito[index].cantidad -= 1;
        carrito[index].subtotal = carrito[index].cantidad * carrito[index].precio;
    } else {
        carrito.splice(index, 1);
    }
    reproducirSonido('scanner');
    renderizarCarrito();
}

function quitarItemCompleto(index) {
    carrito.splice(index, 1);
    reproducirSonido('scanner');
    renderizarCarrito();
}

function calcularVuelto() {
    const pagaConInput = document.getElementById('paga-con');
    const vueltoDisplay = document.getElementById('vuelto-display');
    if (!pagaConInput || !vueltoDisplay) return;

    const pagaCon = parseFloat(pagaConInput.value) || 0;
    if (pagaCon < 0) {
        vueltoDisplay.innerText = "Monto inválido";
        vueltoDisplay.style.color = "var(--danger)";
        return;
    }

    const vuelto = pagaCon - totalVenta;

    if (pagaCon === 0) {
        vueltoDisplay.innerText = "$0,00";
        vueltoDisplay.style.color = "var(--text-primary)";
    } else if (vuelto < 0) {
        vueltoDisplay.innerText = "Falta dinero";
        vueltoDisplay.style.color = "var(--danger)";
    } else {
        vueltoDisplay.innerText = `$${vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        vueltoDisplay.style.color = "var(--success)";
    }
}

// 5. SUGERENCIAS DE BÚSQUEDA MANUAL
function mostrarSugerencias(busqueda) {
    const contenedor = document.getElementById('lista-sugerencias');
    if (!contenedor) return;

    if (busqueda.length < 2) {
        ocultarSugerencias();
        return;
    }

    const filtrados = productosDB.filter(p => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.id.toLowerCase().includes(busqueda.toLowerCase())
    ).slice(0, 5);

    if (filtrados.length === 0) {
        ocultarSugerencias();
        return;
    }

    contenedor.innerHTML = filtrados.map(p => {
        const thumbHtml = p.imagen 
            ? `<img src="${p.imagen}" alt="${p.nombre}">` 
            : `<span style="font-size: 1.1rem;">🛍️</span>`;
        return `
            <div class="sugerencia-item" onclick="seleccionarSugerencia('${p.id}')">
                <div class="sugerencia-thumb">${thumbHtml}</div>
                <span class="sugerencia-name">${p.nombre}</span>
                <span class="sugerencia-price">$${p.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
        `;
    }).join('');
    
    contenedor.classList.add('active');
}

function seleccionarSugerencia(id) {
    procesarEscaneo(id);
    const input = document.getElementById('codigo');
    if (input) {
        input.value = '';
        input.focus();
    }
    ocultarSugerencias();
}

function ocultarSugerencias() {
    const contenedor = document.getElementById('lista-sugerencias');
    if (contenedor) {
        contenedor.innerHTML = '';
        contenedor.classList.remove('active');
    }
}

// 6. FINALIZAR VENTA (PERSISTENCIA HYBRID EN DISCO/GITHUB)
async function finalizarVenta() {
    if (carrito.length === 0) {
        reproducirSonido('alerta');
        alert("El carrito está vacío");
        return;
    }

    const metodo = document.getElementById('metodo-pago').value;

    // 1. VALIDAR STOCK DE TODOS LOS PRODUCTOS EN EL CARRITO
    for (const itemVendido of carrito) {
        const enDB = productosDB.find(p => p.id === itemVendido.id);
        if (!enDB) continue;
        if (enDB.tipo === "variable") continue;

        if (enDB.stock === undefined || enDB.stock < itemVendido.cantidad) {
            reproducirSonido('alerta');
            alert(`⚠️ Stock insuficiente para "${enDB.nombre}". Disponible: ${enDB.stock || 0}, Solicitado: ${itemVendido.cantidad}`);
            return;
        }
    }

    // 2. DESCONTAR STOCK REAL
    for (const itemVendido of carrito) {
        const enDB = productosDB.find(p => p.id === itemVendido.id);
        if (!enDB) continue;
        if (enDB.tipo !== "variable") {
            enDB.stock -= itemVendido.cantidad;
        }
    }

    // 3. REGISTRAR VENTA
    const pagaConInput = document.getElementById('paga-con');
    const pagaCon = pagaConInput ? (parseFloat(pagaConInput.value) || 0) : 0;
    const vuelto = pagaCon > totalVenta ? (pagaCon - totalVenta) : 0;
    const fechaActual = new Date().toLocaleString('es-AR');
    const idNuevaVenta = generarIDUnico('v');

    const nuevaVenta = {
        id: idNuevaVenta,
        total: totalVenta,
        metodo: metodo,
        fecha: fechaActual,
        productos: [...carrito],
        pagaCon: pagaCon > 0 ? pagaCon : undefined,
        vuelto: pagaCon > 0 ? vuelto : undefined
    };

    // Obtener historial de ventas de la API
    let ventasHistoricas = await apiGet('/api/ventas', 'ventas_realizadas');
    ventasHistoricas.push(nuevaVenta);

    // Guardar ventas e inventario actualizado
    const okVentas = await apiPost('/api/ventas', ventasHistoricas, 'ventas_realizadas');
    const okInventario = await apiPost('/api/inventario', productosDB, 'inventario');

    if (okVentas && okInventario) {
        console.log("💾 Ventas e inventario actualizados correctamente.");
    } else {
        console.warn("⚠️ Error subiendo datos a GitHub. Guardado en memoria local.");
    }

    // Guardar última venta en memoria para reimpresión instantánea
    localStorage.setItem('pos_ultima_venta', JSON.stringify(nuevaVenta));

    reproducirSonido('exito');

    // Imprimir ticket automáticamente si la opción está tildada
    const checkImprimir = document.getElementById('check-imprimir-ticket');
    const autoImprimir = checkImprimir ? checkImprimir.checked : true;
    if (autoImprimir && typeof imprimirTicket === 'function') {
        imprimirTicket(nuevaVenta);
    }

    mostrarNotificacionExito(`✅ Cobro exitoso: $${totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

    carrito = [];
    if (pagaConInput) pagaConInput.value = '';
    const vueltoDisplay = document.getElementById('vuelto-display');
    if (vueltoDisplay) vueltoDisplay.innerText = '$0,00';
    const bannerFichado = document.getElementById('banner-ultimo-fichado');
    if (bannerFichado) bannerFichado.style.display = 'none';
    renderizarCarrito();
    
    setTimeout(() => {
        if (inputCodigo) inputCodigo.focus();
    }, 50);
}

// Notificación no intrusiva para no trabar el diálogo de impresión
function mostrarNotificacionExito(mensaje) {
    const toast = document.getElementById('toast-notificacion');
    if (toast) {
        toast.innerHTML = mensaje;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    } else {
        alert(mensaje);
    }
}

// Sincronización silenciosa (Mantenida por compatibilidad pero no hace falta llamada extra)
async function intentarSubirInventarioSilencioso() {
    return true;
}

// 7. ANULAR VENTA (CORREGIDA PARA TRABAJAR CON API/GITHUB)
async function anularUltimaVenta() {
    let ventas = await apiGet('/api/ventas', 'ventas_realizadas');

    if (ventas.length === 0) {
        reproducirSonido('alerta');
        alert("No hay ventas para anular.");
        return;
    }

    const ultima = ventas[ventas.length - 1];
    
    if (confirm(`¿Anular venta de $${ultima.total.toLocaleString('es-AR')} realizada el ${ultima.fecha}? Se devolverá el stock.`)) {
        if (ultima.productos) {
            ultima.productos.forEach(prod => {
                const enDB = productosDB.find(p => p.id === prod.id);
                if (enDB && enDB.tipo !== "variable") {
                    enDB.stock += prod.cantidad;
                }
            });
        }

        ventas.pop(); 

        // Actualizar datos
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        await apiPost('/api/inventario', productosDB, 'inventario');

        reproducirSonido('exito');
        alert("Venta anulada correctamente.");
        renderizarCarrito();
    }
}

// 8. FIADOS Y EXTRAS (CON API/GITHUB)
async function enviarAFiado() {
    if (carrito.length === 0) {
        reproducirSonido('alerta');
        alert("El carrito está vacío");
        return;
    }
    const cliente = prompt("¿Nombre del cliente a quien se le fía?");
    if (!cliente || cliente.trim() === "") return;

    fiados = await apiGet('/api/fiados', 'fiados');

    const idx = fiados.findIndex(f => f.cliente.toUpperCase() === cliente.toUpperCase().trim());
    
    if (idx > -1) {
        fiados[idx].monto += totalVenta;
    } else {
        fiados.push({ cliente: cliente.trim(), monto: totalVenta });
    }

    // Descontar stock
    carrito.forEach(item => {
        const enDB = productosDB.find(p => p.id === item.id);
        if (enDB && enDB.tipo !== "variable") {
            if (enDB.stock >= item.cantidad) {
                enDB.stock -= item.cantidad;
            }
        }
    });

    // Guardar fiados e inventario
    await apiPost('/api/fiados', fiados, 'fiados');
    await apiPost('/api/inventario', productosDB, 'inventario');

    reproducirSonido('exito');
    alert(`Anotado en fiados para: ${cliente}.\nMonto: $${totalVenta.toLocaleString('es-AR')}`);
    
    carrito = [];
    const bannerFichado = document.getElementById('banner-ultimo-fichado');
    if (bannerFichado) bannerFichado.style.display = 'none';
    renderizarCarrito();
}

function cancelarCarrito() {
    if (carrito.length > 0) {
        if (confirm("¿Seguro que desea vaciar el carrito?")) {
            carrito = [];
            const bannerFichado = document.getElementById('banner-ultimo-fichado');
            if (bannerFichado) bannerFichado.style.display = 'none';
            reproducirSonido('scanner');
            renderizarCarrito();
        }
    }
}

// Foco automático continuo en el mostrador
window.onclick = function(e) {
    if (inputCodigo && !['BUTTON', 'INPUT', 'SELECT', 'OPTION'].includes(e.target.tagName) && !e.target.closest('.sugerencia-item') && !e.target.closest('.qty-input')) {
        inputCodigo.focus();
    }
};

// Cargar la base de datos al inicio
async function inicializarMostrador() {
    console.log("DEBUG: typeof apiGet =", typeof apiGet);
    console.log("DEBUG: window.apiGet =", typeof window.apiGet);
    console.log("DEBUG: window.apiPost =", typeof window.apiPost);
    await cargarInventario();
    await cargarFiados();
    renderizarCarrito();
}

inicializarMostrador();

// Escuchar evento de base de datos sincronizada para recargar la UI
window.addEventListener('db_sincronizada', async () => {
    console.log("🔔 Sincronización offline completada. Recargando mostrador...");
    await inicializarMostrador();
});
