// El cerebro del Mostrador - Kiosco El Cholo
let productosDB = [];
let carrito = [];
let totalVenta = 0;
let ultimoEscaneo = "";
let timeoutEscaneo = null;

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

// 1. CARGA DE DATOS INTELIGENTE (Prioriza archivo local, luego GitHub, luego caché local)
async function cargarInventario() {
    try {
        // Intento 1: Archivo local (productos.json en la misma carpeta)
        console.log("🔄 Intentando cargar productos.json local...");
        const response = await fetch('./productos.json');
        if (!response.ok) throw new Error("Archivo local no disponible o bloqueado por CORS");
        productosDB = await response.json();
        console.log("✅ Inventario cargado localmente desde productos.json");
    } catch (errorLocal) {
        console.warn("⚠️ Falló carga de productos.json local, intentando GitHub...", errorLocal.message);
        try {
            // Intento 2: Nube GitHub
            const response = await fetch(
                'https://raw.githubusercontent.com/ghanacafe2-cloud/menuclick/main/productos.json'
            );
            if (!response.ok) throw new Error("Error en respuesta de GitHub");
            productosDB = await response.json();
            console.log("✅ Inventario cargado desde GitHub");
        } catch (errorGithub) {
            console.warn("⚠️ Falló carga desde GitHub, usando caché de localStorage...", errorGithub.message);
            // Intento 3: Cache local
            const datosLocales = localStorage.getItem('inventario');
            if (datosLocales) {
                productosDB = JSON.parse(datosLocales);
                console.log("📦 Inventario restaurado desde caché local");
            } else {
                productosDB = [];
                console.error("❌ No se encontraron productos. Base de datos vacía.");
            }
        }
    }

    // Siempre guardar en cache local si logramos cargar algo
    if (productosDB.length > 0) {
        localStorage.setItem('inventario', JSON.stringify(productosDB));
    }
}

// 2. ESCUCHA DE LA PISTOLITA Y BÚSQUEDA MANUAL
const inputCodigo = document.getElementById('codigo');
if (inputCodigo) {
    // Escucha en tiempo real para búsqueda manual y auto-sugerencias
    inputCodigo.addEventListener('input', () => {
        clearTimeout(timeoutEscaneo);
        
        timeoutEscaneo = setTimeout(() => {
            const valor = inputCodigo.value.trim().toUpperCase();
            if (!valor) {
                ocultarSugerencias();
                return;
            }

            // Si es un código exacto de barras escaneado (normalmente largo)
            const exacto = productosDB.find(p => p.id.toUpperCase() === valor);
            if (exacto) {
                procesarEscaneo(valor);
                inputCodigo.value = '';
                ocultarSugerencias();
            } else {
                // Si no es un código exacto, mostrar sugerencias
                mostrarSugerencias(valor);
            }
        }, 100);
    });

    // Escucha de ENTER (común en lectoras al terminar de escribir el código)
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
            // Producto de precio variable (pan, fiambrería, etc.)
            reproducirSonido('scanner');
            const precioManual = parseFloat(prompt(`Precio para ${producto.nombre}:`));
            if (!isNaN(precioManual) && precioManual > 0 && precioManual < 10000000) {
                agregarAlCarrito(producto.id, producto.nombre, precioManual);
            } else {
                reproducirSonido('alerta');
            }
        } else {
            // Producto de precio fijo
            reproducirSonido('scanner');
            agregarAlCarrito(producto.id, producto.nombre, producto.precio);
        }
    } else {
        reproducirSonido('alerta');
        alert(`Código o producto "${codigo}" no encontrado en el inventario.`);
    }
}

// 4. MANEJO DEL CARRITO
function agregarAlCarrito(id, nombre, precio) {
    const existente = carrito.find(item => item.id === id);

    if (existente) {
        // Validar si hay stock disponible para agregar una unidad más
        const enDB = productosDB.find(p => p.id === id);
        if (enDB && enDB.tipo !== "variable" && enDB.stock <= existente.cantidad) {
            reproducirSonido('alerta');
            alert(`⚠️ No hay más stock disponible para "${nombre}" (Unidades en stock: ${enDB.stock}).`);
            return;
        }
        existente.cantidad += 1;
        existente.subtotal = existente.cantidad * existente.precio;
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
                <small>
                    ${item.cantidad} x $${item.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </small>
            </div>

            <div class="prod-subtotal">
                $${item.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </div>

            <button class="btn-eliminar" onclick="quitarItem(${index})">
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

// 6. FINALIZAR VENTA (CORREGIDA CON ACTUALIZACIÓN DE LOCALSTORAGE Y GITHUB)
function finalizarVenta() {
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
        if (enDB.tipo === "variable") continue; // Ignorar precio variable

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

    // Guardar Venta en Historial
    const ventasHistoricas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    ventasHistoricas.push({
        total: totalVenta,
        metodo: metodo,
        fecha: new Date().toLocaleString(),
        productos: [...carrito] // Detalle necesario para anulaciones
    });
    localStorage.setItem('ventas_realizadas', JSON.stringify(ventasHistoricas));

    // Intentar sincronizar con GitHub si el token existe en admin.js (comparten localStorage)
    intentarSubirInventarioSilencioso();

    reproducirSonido('exito');
    alert(`✅ VENTA FINALIZADA CON ÉXITO\nTotal cobrado: $${totalVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`);

    carrito = [];
    document.getElementById('paga-con').value = '';
    renderizarCarrito();
    
    // Enfocar nuevamente para agilizar escaneo
    setTimeout(() => {
        if (inputCodigo) inputCodigo.focus();
    }, 50);
}

// Sincronización silenciosa con GitHub en segundo plano si hay token
async function intentarSubirInventarioSilencioso() {
    const token = localStorage.getItem('github_token');
    if (!token) return; // Si no hay token de nube, trabaja de forma puramente local.

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
        console.log("☁️ Sincronización con GitHub exitosa en segundo plano.");
    } catch (e) {
        console.warn("⚠️ No se pudo sincronizar stock en la nube (sin conexión o error API)", e);
    }
}

// 7. ANULAR VENTA (CORREGIDA)
function anularUltimaVenta() {
    let ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    if (ventas.length === 0) {
        reproducirSonido('alerta');
        alert("No hay ventas para anular.");
        return;
    }

    const ultima = ventas[ventas.length - 1];
    
    if (confirm(`¿Anular venta de $${ultima.total.toLocaleString('es-AR')} realizada el ${ultima.fecha}? Se devolverá el stock.`)) {
        // Devolver stock
        if (ultima.productos) {
            ultima.productos.forEach(prod => {
                const enDB = productosDB.find(p => p.id === prod.id);
                if (enDB && enDB.tipo !== "variable") {
                    enDB.stock += prod.cantidad;
                }
            });
            localStorage.setItem('inventario', JSON.stringify(productosDB));
            intentarSubirInventarioSilencioso();
        }

        ventas.pop(); 
        localStorage.setItem('ventas_realizadas', JSON.stringify(ventas));
        reproducirSonido('exito');
        alert("Venta anulada correctamente.");
        renderizarCarrito();
    }
}

// 8. FIADOS Y EXTRAS
function enviarAFiado() {
    if (carrito.length === 0) {
        reproducirSonido('alerta');
        alert("El carrito está vacío");
        return;
    }
    const cliente = prompt("¿Nombre del cliente a quien se le fía?");
    if (!cliente || cliente.trim() === "") return;

    let fiados = JSON.parse(localStorage.getItem('fiados')) || [];
    const idx = fiados.findIndex(f => f.cliente.toUpperCase() === cliente.toUpperCase().trim());
    
    if (idx > -1) {
        fiados[idx].monto += totalVenta;
    } else {
        fiados.push({ cliente: cliente.trim(), monto: totalVenta });
    }

    localStorage.setItem('fiados', JSON.stringify(fiados));
    
    // Descontar stock REAL en fiados
    carrito.forEach(item => {
        const enDB = productosDB.find(p => p.id === item.id);
        if (enDB && enDB.tipo !== "variable") {
            if (enDB.stock >= item.cantidad) {
                enDB.stock -= item.cantidad;
            }
        }
    });

    localStorage.setItem('inventario', JSON.stringify(productosDB));
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

// Foco automático continuo en el mostrador (para escaneos rápidos)
window.onclick = function(e) {
    if (inputCodigo && !['BUTTON', 'INPUT', 'SELECT', 'OPTION'].includes(e.target.tagName) && !e.target.closest('.sugerencia-item')) {
        inputCodigo.focus();
    }
};

// Cargar la base de datos al inicio
cargarInventario().then(() => {
    renderizarCarrito();
});
