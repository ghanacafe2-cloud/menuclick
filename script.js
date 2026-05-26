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

// 1. CARGA DE DATOS INTELIGENTE (Prioriza API del servidor Python, luego local estático, luego localStorage)
async function cargarInventario() {
    try {
        console.log("🔄 Intentando cargar inventario desde API server.py...");
        const response = await fetch('/api/inventario');
        if (!response.ok) throw new Error("API de inventario no disponible");
        productosDB = await response.json();
        console.log("✅ Inventario cargado desde API de server.py (productos.json en disco)");
    } catch (errorApi) {
        console.warn("⚠️ Falló API de server.py, intentando archivo estático...", errorApi.message);
        try {
            const response = await fetch('./productos.json');
            if (!response.ok) throw new Error("Archivo local estático no disponible");
            productosDB = await response.json();
            console.log("✅ Inventario cargado desde productos.json estático");
        } catch (errorLocal) {
            console.warn("⚠️ Falló carga estática, usando caché de localStorage...", errorLocal.message);
            const datosLocales = localStorage.getItem('inventario');
            if (datosLocales) {
                productosDB = JSON.parse(datosLocales);
                console.log("📦 Inventario cargado desde caché local");
            } else {
                productosDB = [];
                console.error("❌ Base de datos vacía.");
            }
        }
    }

    if (productosDB.length > 0) {
        localStorage.setItem('inventario', JSON.stringify(productosDB));
    }
}

async function cargarFiados() {
    try {
        const res = await fetch('/api/fiados');
        if (res.ok) {
            fiados = await res.json();
            localStorage.setItem('fiados', JSON.stringify(fiados));
        }
    } catch (e) {
        console.warn("No se pudo cargar fiados desde API, usando local cache", e);
        fiados = JSON.parse(localStorage.getItem('fiados')) || [];
    }
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

        if (producto.tipo === "variable") {
            reproducirSonido('scanner');
            const precioManual = parseFloat(prompt(`Precio para ${producto.nombre}:`));
            if (!isNaN(precioManual) && precioManual > 0 && precioManual < 10000000) {
                agregarAlCarrito(producto.id, producto.nombre, precioManual, cantidadAAgregar);
            } else {
                reproducirSonido('alerta');
            }
        } else {
            reproducirSonido('scanner');
            agregarAlCarrito(producto.id, producto.nombre, producto.precio, cantidadAAgregar);
        }
        
        // Reset a 1
        if (cantInput) cantInput.value = 1;
    } else {
        reproducirSonido('alerta');
        alert(`Código o producto "${codigo}" no encontrado en el inventario.`);
    }
}

// 4. MANEJO DEL CARRITO Y CANTIDADES MANUALES
function agregarAlCarrito(id, nombre, precio, cantidad = 1) {
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
            subtotal: precio * cantidad
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

        fila.innerHTML = `
            <div class="prod-info">
                <strong>${item.nombre}</strong>
                <br>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 6px;">
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

    contenedor.innerHTML = filtrados.map(p => `
        <div class="sugerencia-item" onclick="seleccionarSugerencia('${p.id}')">
            <span class="sugerencia-name">${p.nombre}</span>
            <span class="sugerencia-price">$${p.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
        </div>
    `).join('');
    
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

// 6. FINALIZAR VENTA (PERSISTENCIA DIRECTA EN ARCHIVOS JSON DEL SERVIDOR PYTHON)
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

    // Guardar Inventario actualizado en caché
    localStorage.setItem('inventario', JSON.stringify(productosDB));

    // Obtener historial de ventas de la API para añadir la nueva
    let ventasHistoricas = [];
    try {
        const res = await fetch('/api/ventas');
        if (res.ok) {
            ventasHistoricas = await res.json();
        }
    } catch (e) {
        console.warn("No se pudo conectar a la API de ventas, usando caché local", e);
        ventasHistoricas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    }

    ventasHistoricas.push({
        total: totalVenta,
        metodo: metodo,
        fecha: new Date().toLocaleString(),
        productos: [...carrito]
    });
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventasHistoricas));

    // GUARDAR EN DISCO (API de Python)
    try {
        // Guardar ventas del día en ventas.json
        await fetch('/api/ventas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ventasHistoricas)
        });
        console.log("💾 Ventas guardadas en ventas.json");

        // Guardar inventario en productos.json
        await fetch('/api/inventario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productosDB)
        });
        console.log("💾 Inventario actualizado en productos.json");
    } catch (errorApiWrite) {
        console.error("❌ Error guardando datos en servidor local:", errorApiWrite);
        alert("⚠️ Advertencia: No se pudo guardar la venta en el disco duro (servidor inactivo). Guardado temporalmente en navegador.");
    }

    // Intentar subir a GitHub si está configurado
    intentarSubirInventarioSilencioso();

    reproducirSonido('exito');
    alert(`✅ VENTA FINALIZADA CON ÉXITO\nTotal cobrado: $${totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

    carrito = [];
    document.getElementById('paga-con').value = '';
    renderizarCarrito();
    
    setTimeout(() => {
        if (inputCodigo) inputCodigo.focus();
    }, 50);
}

// Sincronización silenciosa con GitHub en segundo plano si hay token
async function intentarSubirInventarioSilencioso() {
    const token = localStorage.getItem('github_token');
    if (!token) return;

    const USERNAME = "ghanacafe2-cloud";
    const REPO = "menuclick";
    const FILE_PATH = "productos.json";

    try {
        const resInfo = await fetch(
            `https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`,
            { headers: { Authorization: `token ${token}` } }
        );
        if (!resInfo.ok) return;
        const info = await resInfo.json();
        const contenido = btoa(unescape(encodeURIComponent(JSON.stringify(productosDB, null, 2))));
        
        await fetch(
            `https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: 'Descuento de stock por venta',
                    content: contenido,
                    sha: info.sha
                })
            }
        );
        console.log("☁️ Sincronización con GitHub exitosa.");
    } catch (e) {
        console.warn("⚠️ Error en segundo plano subiendo a GitHub", e);
    }
}

// 7. ANULAR VENTA (CORREGIDA PARA TRABAJAR CON API)
async function anularUltimaVenta() {
    let ventas = [];
    try {
        const res = await fetch('/api/ventas');
        if (res.ok) ventas = await res.json();
    } catch (e) {
        ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    }

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
            localStorage.setItem('inventario', JSON.stringify(productosDB));
        }

        ventas.pop(); 
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));

        // Actualizar en el disco duro (API)
        try {
            await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ventas)
            });
            await fetch('/api/inventario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productosDB)
            });
        } catch (e) {
            console.warn("Error guardando anulación en el servidor", e);
        }

        intentarSubirInventarioSilencioso();
        reproducirSonido('exito');
        alert("Venta anulada correctamente.");
        renderizarCarrito();
    }
}

// 8. FIADOS Y EXTRAS (CON API)
async function enviarAFiado() {
    if (carrito.length === 0) {
        reproducirSonido('alerta');
        alert("El carrito está vacío");
        return;
    }
    const cliente = prompt("¿Nombre del cliente a quien se le fía?");
    if (!cliente || cliente.trim() === "") return;

    try {
        const res = await fetch('/api/fiados');
        if (res.ok) fiados = await res.json();
    } catch (e) {
        fiados = JSON.parse(localStorage.getItem('fiados')) || [];
    }

    const idx = fiados.findIndex(f => f.cliente.toUpperCase() === cliente.toUpperCase().trim());
    
    if (idx > -1) {
        fiados[idx].monto += totalVenta;
    } else {
        fiados.push({ cliente: cliente.trim(), monto: totalVenta });
    }

    localStorage.setItem('fiados', JSON.stringify(fiados));
    
    // Descontar stock
    carrito.forEach(item => {
        const enDB = productosDB.find(p => p.id === item.id);
        if (enDB && enDB.tipo !== "variable") {
            if (enDB.stock >= item.cantidad) {
                enDB.stock -= item.cantidad;
            }
        }
    });

    localStorage.setItem('inventario', JSON.stringify(productosDB));

    // GUARDAR EN DISCO (API de Python)
    try {
        await fetch('/api/fiados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fiados)
        });
        await fetch('/api/inventario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productosDB)
        });
    } catch (e) {
        console.warn("No se pudo guardar fiados en el servidor local", e);
    }

    intentarSubirInventarioSilencioso();
    reproducirSonido('exito');
    alert(`Anotado en fiados para: ${cliente}.\nMonto: $${totalVenta.toLocaleString('es-AR')}`);
    
    carrito = [];
    renderizarCarrito();
}

function cancelarCarrito() {
    if (carrito.length > 0) {
        if (confirm("¿Seguro que desea vaciar el carrito?")) {
            carrito = [];
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
    await cargarInventario();
    await cargarFiados();
    renderizarCarrito();
}

inicializarMostrador();
