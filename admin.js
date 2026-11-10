// Panel de Administración Unificado - Don Pilo & POS
const PIN_ADMIN = "1234";

// Control de acceso seguro (con persistencia en sesión)
if (!sessionStorage.getItem('admin_authenticated')) {
    const acceso = prompt("Ingrese PIN de administrador para acceder a este panel (Por defecto: 1234):");
    if (acceso !== PIN_ADMIN) {
        alert("❌ Acceso denegado. Código PIN incorrecto.");
        window.location.href = "caja.html";
    } else {
        sessionStorage.setItem('admin_authenticated', 'true');
    }
}

let inventario = [];
let fiados = [];
let ventas = [];
let historialCierres = [];

// --- GESTIÓN DE CONFIGURACIÓN DE GITHUB ---
function guardarConfiguracionGitHub() {
    const userEl = document.getElementById('gh-username');
    const repoEl = document.getElementById('gh-repo');
    const tokenEl = document.getElementById('gh-token');

    if (userEl) localStorage.setItem('github_username', userEl.value.trim());
    if (repoEl) localStorage.setItem('github_repo', repoEl.value.trim());
    if (tokenEl) localStorage.setItem('github_token', tokenEl.value.trim());

    validarToken();
    cargarConfiguracionTicketAdmin();
}

// GuardarToken antiguo para compatibilidad por si se llama desde algún lado
function guardarToken() {
    guardarConfiguracionGitHub();
}

async function validarToken() {
    const token = localStorage.getItem('github_token');
    const username = localStorage.getItem('github_username') || "ghanacafe2-cloud";
    const repo = localStorage.getItem('github_repo') || "menuclick";

    const ghUserEl = document.getElementById('gh-username');
    const ghRepoEl = document.getElementById('gh-repo');
    const ghTokenEl = document.getElementById('gh-token');

    if (ghUserEl && !ghUserEl.value) ghUserEl.value = localStorage.getItem('github_username') || "";
    if (ghRepoEl && !ghRepoEl.value) ghRepoEl.value = localStorage.getItem('github_repo') || "";
    if (ghTokenEl && !ghTokenEl.value) ghTokenEl.value = token || "";

    const statusSpan = document.getElementById('token-status');
    if (!statusSpan) return;

    if (!token) {
        statusSpan.innerText = "❌ (Sin configurar)";
        statusSpan.style.color = "var(--text-secondary)";
        return;
    }

    try {
        const res = await fetch(`https://api.github.com/repos/${username}/${repo}`, {
            headers: { Authorization: `token ${token}` }
        });
        if (res.ok) {
            statusSpan.innerText = "✅ (Conectado)";
            statusSpan.style.color = "var(--success)";
        } else {
            statusSpan.innerText = "❌ (Repo/Token inválido)";
            statusSpan.style.color = "var(--danger)";
        }
    } catch (e) {
        statusSpan.innerText = "⚠️ (Conexión lenta/error)";
        statusSpan.style.color = "var(--warning)";
    }
}

// --- FUNCIONES API ---
// Las variables y funciones de comunicación con GitHub y persistencia se han movido a api.js


// --- GESTIÓN DE GASTOS / EGRESOS ---
async function registrarGasto() {
    const det = document.getElementById('gasto-detalle').value.trim();
    const mon = parseFloat(document.getElementById('gasto-monto').value);

    if (!det || isNaN(mon) || mon <= 0) {
        alert("⚠️ Por favor, complete el detalle y el monto del pago correctamente.");
        return;
    }

    if (confirm(`¿Confirmas el registro del pago de $${mon.toLocaleString('es-AR')} por: "${det}"?`)) {
        // Cargar ventas actuales
        ventas = await apiGet('/api/ventas', 'ventas_realizadas');

        const nuevoGasto = {
            id: generarIDUnico('v'),
            total: -mon, // Monto negativo representa salida de caja
            metodo: 'efectivo',
            fecha: new Date().toLocaleString(),
            detalle: `GASTO: ${det}`
        };

        ventas.push(nuevoGasto);

        // Guardar ventas
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');

        document.getElementById('gasto-detalle').value = '';
        document.getElementById('gasto-monto').value = '';

        actualizarTodo();
        beepSuccess();
    }
}

function dibujarTablaGastos() {
    const tbodyGastos = document.getElementById('cuerpo-gastos');
    if (!tbodyGastos) return;

    tbodyGastos.innerHTML = '';

    ventas.forEach((x, index) => {
        if (x.total < 0) {
            const time = x.fecha.split(', ')[1] || x.fecha;
            tbodyGastos.innerHTML += `
                <tr>
                    <td>${time}</td> 
                    <td>${x.detalle}</td>
                    <td style="color: var(--danger); font-weight: bold;">-$${Math.abs(x.total).toLocaleString('es-AR')}</td>
                    <td>
                        <button class="btn btn-danger btn-icon-only" onclick="borrarGastoIndividual(${index})" title="Eliminar registro">🗑️</button>
                    </td>
                </tr>
            `;
        }
    });
}

async function borrarGastoIndividual(indexVentaOriginal) {
    if (confirm("¿Borrar este registro de salida de caja?")) {
        ventas.splice(indexVentaOriginal, 1);
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        actualizarTodo();
    }
}

async function limpiarSoloGastos() {
    if (ventas.length === 0) return alert("No hay movimientos registrados.");

    if (confirm("¿Querés limpiar visualmente los registros de pagos de la lista?\n\n⚠️ NOTA: Esto limpia el listado para iniciar un nuevo turno, pero no altera el saldo neto en efectivo actual.")) {
        const ventasLimpias = ventas.filter(item => item.total >= 0);
        ventas = ventasLimpias;
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        actualizarTodo();
        alert("Lista de egresos despejada.");
    }
}

// Las funciones de gestión de productos y cámara se movieron a inventario.js

// --- LIBRETA DE FIADOS ---
async function agregarFiado() {
    const cli = document.getElementById('fiado-cliente').value.trim();
    const mon = parseFloat(document.getElementById('fiado-monto').value);

    if (!cli || isNaN(mon) || mon <= 0) {
        alert("⚠️ Ingrese un nombre de cliente y un monto válido.");
        return;
    }

    const idx = fiados.findIndex(f => f.cliente.toUpperCase() === cli.toUpperCase());
    if (idx > -1) {
        fiados[idx].monto += mon;
    } else {
        fiados.push({ cliente: cli, monto: mon });
    }

    await apiPost('/api/fiados', fiados, 'fiados');
    document.getElementById('fiado-cliente').value = '';
    document.getElementById('fiado-monto').value = '';
    actualizarTodo();
    beepSuccess();
}

async function cobrarFiadoPorCliente(clienteNombre) {
    const norm = clienteNombre.trim().toUpperCase();
    const deudasCliente = fiados.filter(f => f.cliente.trim().toUpperCase() === norm);
    if (deudasCliente.length === 0) return;

    const montoTotal = deudasCliente.reduce((acc, f) => acc + f.monto, 0);
    const nombreVisible = deudasCliente[0].cliente.trim();

    const modo = prompt(`Cobrar deuda total de $${montoTotal.toLocaleString('es-AR')} a "${nombreVisible}"${deudasCliente.length > 1 ? ` (${deudasCliente.length} fiados agrupados)` : ''}:\n\n1: Cobrar con EFECTIVO\n2: Cobrar con TARJETA\n3: Cobrar con QR / MercadoPago\n\nIngrese el número correspondiente:`);

    let met = modo === "1" ? "efectivo" : modo === "2" ? "debito" : modo === "3" ? "qr" : null;
    if (met) {
        ventas = await apiGet('/api/ventas', 'ventas_realizadas');

        ventas.push({
            id: generarIDUnico('v'),
            total: montoTotal,
            metodo: met,
            fecha: new Date().toLocaleString(),
            detalle: `COBRO FIADO: ${nombreVisible}${deudasCliente.length > 1 ? ` (${deudasCliente.length} agrupados)` : ''}`
        });

        // Eliminar de fiados todos los registros de este cliente
        fiados = fiados.filter(f => f.cliente.trim().toUpperCase() !== norm);

        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        await apiPost('/api/fiados', fiados, 'fiados');

        actualizarTodo();
        beepSuccess();
        alert(`✅ Deuda saldada ($${montoTotal.toLocaleString('es-AR')}). Registrado en caja de ${met.toUpperCase()}.`);
    } else if (modo !== null) {
        alert("❌ Opción inválida.");
    }
}

async function cobrarFiado(index) {
    if (typeof index === 'number' && fiados[index]) {
        return cobrarFiadoPorCliente(fiados[index].cliente);
    } else if (typeof index === 'string') {
        return cobrarFiadoPorCliente(index);
    }
}

async function unificarFiadosDuplicados() {
    if (fiados.length === 0) {
        alert("ℹ️ No hay fiados registrados para agrupar.");
        return;
    }

    const mapa = {};
    let huboDuplicadosExactos = false;
    fiados.forEach(f => {
        const k = f.cliente.trim().toUpperCase();
        if (!mapa[k]) {
            mapa[k] = { cliente: f.cliente.trim(), monto: 0, count: 0 };
        } else {
            huboDuplicadosExactos = true;
        }
        mapa[k].monto += f.monto;
        mapa[k].count += 1;
    });

    const op = confirm("¿Deseas agrupar y consolidar las deudas de clientes en la base de datos?\n\nAceptar = Consolidar automáticamente registros del mismo nombre.\nCancelar = Unificar manualmente dos nombres similares (ej: 'Tato' y 'Tato M').");

    if (op) {
        const fiadosUnificados = Object.values(mapa).map(g => ({
            cliente: g.cliente,
            monto: g.monto
        }));
        if (huboDuplicadosExactos || fiadosUnificados.length !== fiados.length) {
            fiados = fiadosUnificados;
            await apiPost('/api/fiados', fiados, 'fiados');
            actualizarTodo();
            beepSuccess();
            alert(`✅ Fiados agrupados y consolidados con éxito. Ahora hay ${fiados.length} clientes en la libreta.`);
        } else {
            alert("✅ Todos los clientes de la libreta ya tienen nombres exactos únicos. Si deseas fusionar variaciones de nombre (ej: 'Juan' y 'Juan Perez'), presioná Cancelar en el botón de unificar para hacerlo manualmente.");
        }
    } else {
        if (fiados.length < 2) {
            alert("⚠️ Se necesitan al menos 2 clientes registrados para unificar manualmente.");
            return;
        }
        const listaNombres = [...new Set(fiados.map(f => f.cliente.trim()))].sort();
        const origen = prompt(`🤝 UNIFICAR CLIENTES SIMILARES (Paso 1 de 2)\n\nEscribí el nombre del cliente secundario que querés trasladar/fusionar:\n\nClientes disponibles:\n• ${listaNombres.join('\n• ')}`);
        if (!origen) return;
        
        const normOrigen = origen.trim().toUpperCase();
        const existeOrigen = fiados.some(f => f.cliente.trim().toUpperCase() === normOrigen);
        if (!existeOrigen) {
            alert(`❌ No se encontró ningún cliente con el nombre "${origen}".`);
            return;
        }

        const destino = prompt(`🤝 UNIFICAR CLIENTES SIMILARES (Paso 2 de 2)\n\n¿A qué cliente principal querés sumarle la deuda de "${origen.trim()}"?\n\nEscribí el nombre principal:`);
        if (!destino) return;
        
        const normDestino = destino.trim().toUpperCase();
        if (normOrigen === normDestino) {
            alert("⚠️ El cliente de origen y destino no pueden ser el mismo.");
            return;
        }

        let montoTraslado = 0;
        fiados = fiados.filter(f => {
            if (f.cliente.trim().toUpperCase() === normOrigen) {
                montoTraslado += f.monto;
                return false;
            }
            return true;
        });

        const idxDest = fiados.findIndex(f => f.cliente.trim().toUpperCase() === normDestino);
        if (idxDest > -1) {
            fiados[idxDest].monto += montoTraslado;
        } else {
            fiados.push({ cliente: destino.trim(), monto: montoTraslado });
        }

        await apiPost('/api/fiados', fiados, 'fiados');
        actualizarTodo();
        beepSuccess();
        alert(`✅ Deuda de "${origen.trim()}" ($${montoTraslado.toLocaleString('es-AR')}) fusionada exitosamente con "${destino.trim()}".`);
    }
}

// --- CIERRE DE CAJA ---
async function borrarVentas() {
    if (ventas.length === 0) return alert("No hay movimientos de caja cargados en el turno de hoy.");

    let e = 0, t = 0, q = 0;
    const ventasSolo = ventas.filter(v => v.total > 0);
    const gastosSolo = ventas.filter(v => v.total < 0);

    ventas.forEach(x => {
        if (x.metodo === 'efectivo') e += x.total;
        else if (x.metodo === 'debito') t += x.total;
        else q += x.total;
    });

    const general = e + t + q;
    const totalGastos = gastosSolo.reduce((acc, g) => acc + Math.abs(g.total), 0);
    const totalFiados = fiados.reduce((acc, f) => acc + f.monto, 0);

    if (confirm(`¿CERRAR CAJA DE HOY?\n\n📊 Resumen Financiero:\n--------------------------\n💵 Efectivo Neto: $${e.toLocaleString('es-AR')}\n💳 Tarjetas/Débito: $${t.toLocaleString('es-AR')}\n📱 QR/MercadoPago: $${q.toLocaleString('es-AR')}\n➖ Gastos/Pagos: $${totalGastos.toLocaleString('es-AR')}\n--------------------------\n💰 TOTAL GENERAL: $${general.toLocaleString('es-AR')}\n🧾 Ventas realizadas: ${ventasSolo.length}\n📝 Fiados pendientes: ${fiados.length} clientes ($${totalFiados.toLocaleString('es-AR')})\n\nSe guardará el detalle completo en historial_cierres.json`)) {

        // Cargar historial actual de la API
        historialCierres = await apiGet('/api/historial-cierres', 'historial_cierres');

        // --- CIERRE COMPLETO CON DETALLE ---
        const cierreCompleto = {
            id: generarIDUnico('c'),
            // Resumen del dia
            fecha: new Date().toLocaleString(),
            efectivo: e,
            otros: t + q,
            total: general,
            total_gastos: totalGastos,
            cantidad_ventas: ventasSolo.length,

            // Detalle de cada venta/movimiento del dia
            ventas_del_dia: ventas.map(v => ({
                fecha: v.fecha || '',
                total: v.total,
                metodo: v.metodo || 'efectivo',
                detalle: v.detalle || 'Venta',
                productos: v.productos || []
            })),

            // Snapshot de fiados activos al momento del cierre
            fiados_al_cierre: fiados.map(f => ({
                cliente: f.cliente,
                deuda: f.monto
            })),
            total_fiados_pendientes: totalFiados
        };

        historialCierres.push(cierreCompleto);

        // Limpiar ventas del dia
        ventas = [];

        // Guardar historial completo (con detalle) + ventas vacias + fiados en disco (JSON)
        const okHistorial = await apiPost('/api/historial-cierres', historialCierres, 'historial_cierres');
        const okVentas = await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        await apiPost('/api/fiados', fiados, 'fiados');

        actualizarTodo();
        beepSuccess();

        if (okHistorial && okVentas) {
            alert(`✅ Caja cerrada y guardada correctamente en historial_cierres.json\n\n📁 Se guardaron:\n• ${cierreCompleto.cantidad_ventas} ventas del dia\n• ${gastosSolo.length} egresos/gastos\n• ${fiados.length} fiados pendientes al cierre\n\n💰 Total del dia: $${general.toLocaleString('es-AR')}`);
        } else {
            alert(`⚠️ Cierre guardado en memoria del navegador.\nAsegurate de que el servidor server.py este corriendo para guardar en los archivos JSON.`);
        }
    }
}

async function borrarCierreHistorial(index) {
    if (confirm("⚠️ ¿Estás seguro de borrar este cierre del historial?\nEsta acción es irreversible.")) {
        historialCierres.splice(index, 1);
        await apiPost('/api/historial-cierres', historialCierres, 'historial_cierres');
        actualizarTodo();
    }
}

async function anularUltimaVentaAdmin() {
    if (ventas.length === 0) return alert("No hay movimientos para anular.");

    const ultima = ventas[ventas.length - 1];

    if (confirm(`¿Anular el último movimiento registrado?\nDetalle: "${ultima.detalle || 'Venta general'}"\nMonto: $${ultima.total.toLocaleString('es-AR')}`)) {

        // Devolver stock si era una venta general con productos detallados
        if (ultima.total > 0 && ultima.productos) {
            ultima.productos.forEach(prod => {
                const enDB = inventario.find(p => p.id === prod.id);
                if (enDB && enDB.tipo !== "variable") {
                    enDB.stock += prod.cantidad;
                }
            });
            await apiPost('/api/inventario', inventario, 'inventario');
            subirInventarioAGitHub();
        }

        ventas.pop();
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        actualizarTodo();
        alert("✅ Movimiento anulado correctamente. Stock devuelto (si corresponde).");
    }
}

// --- BÚSQUEDA Y RENDERIZADO DE FIADOS AGRUPADOS ---
function renderizarTablaFiados() {
    const tbodyFiado = document.querySelector('#tabla-fiados tbody');
    if (!tbodyFiado) return;

    // 1. Agrupar si tiene varios fiados una misma persona (mismo nombre normalizado)
    const mapaAgrupado = {};
    fiados.forEach((f, idxOriginal) => {
        const key = f.cliente.trim().toUpperCase();
        if (!mapaAgrupado[key]) {
            mapaAgrupado[key] = {
                clienteMuestra: f.cliente.trim(),
                montoTotal: 0,
                cantidad: 0,
                indices: []
            };
        }
        mapaAgrupado[key].montoTotal += f.monto;
        mapaAgrupado[key].cantidad += 1;
        mapaAgrupado[key].indices.push(idxOriginal);
    });

    let grupos = Object.values(mapaAgrupado).sort((a, b) => a.clienteMuestra.localeCompare(b.clienteMuestra));

    // 3. Filtrar por búsqueda de texto
    const query = (document.getElementById('buscar-fiado-texto')?.value || '').trim().toLowerCase();
    if (query) {
        grupos = grupos.filter(g => g.clienteMuestra.toLowerCase().includes(query));
    }

    tbodyFiado.innerHTML = '';

    if (grupos.length === 0) {
        tbodyFiado.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 24px;">
                    ${fiados.length === 0 ? 'No hay fiados pendientes registrados.' : 'No se encontraron clientes con el filtro/búsqueda actual.'}
                </td>
            </tr>`;
        return;
    }

    grupos.forEach(grupo => {
        const nombreEscape = grupo.clienteMuestra.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        tbodyFiado.innerHTML += `
            <tr>
                <td>
                    <strong>${grupo.clienteMuestra}</strong>
                    ${grupo.cantidad > 1 ? `<span class="badge badge-debito" style="margin-left: 8px; font-size: 0.75rem;" title="Esta persona tiene ${grupo.cantidad} registros que se muestran agrupados">📦 ${grupo.cantidad} fiados agrupados</span>` : ''}
                </td>
                <td style="color: var(--danger); font-weight: bold;">$${grupo.montoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                <td>
                    <button class="btn btn-success" style="padding: 6px 12px; font-size: 0.85rem;" onclick="cobrarFiadoPorCliente('${nombreEscape}')">
                        💸 PAGÓ
                    </button>
                </td>
            </tr>`;
    });
}

// --- ACTUALIZAR TODO (Dibujar Tablas e Indicadores) ---
function actualizarTodo() {
    // 1. Totales de caja diaria
    let e = 0, t = 0, q = 0;
    ventas.forEach(x => {
        if (x.metodo === 'efectivo') e += x.total;
        else if (x.metodo === 'debito') t += x.total;
        else q += x.total;
    });

    document.getElementById('total-efectivo').innerText = `$${e.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    document.getElementById('total-debito').innerText = `$${t.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    document.getElementById('total-qr').innerText = `$${q.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
    document.getElementById('total-general').innerText = `$${(e + t + q).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

    // 2. Alerta de Reposición (Stock <= 3)
    const reposicion = [];
    inventario.forEach((p) => {
        if (p.stock !== undefined && p.stock <= 3 && p.tipo !== "variable") {
            reposicion.push(p.nombre);
        }
    });

    const alerta = document.getElementById('alerta-reposicion');
    const lista = document.getElementById('lista-reposicion');
    if (alerta && lista) {
        if (reposicion.length > 0) {
            alerta.style.display = 'block';
            lista.innerHTML = reposicion.map(x => `<li><strong>${x}</strong> - Quedan 3 unidades o menos.</li>`).join('');
        } else {
            alerta.style.display = 'none';
        }
    }

    // 3. Tabla de Fiados
    renderizarTablaFiados();

    // 4. Tabla Historial de Cierres
    const tbodyHist = document.getElementById('cuerpo-historial');
    if (tbodyHist) {
        tbodyHist.innerHTML = '';
        [...historialCierres].reverse().forEach((c, index) => {
            const realIndex = historialCierres.length - 1 - index;
            
            const totalGastosDia = c.total_gastos || 0;
            const gastosDia = c.ventas_del_dia ? c.ventas_del_dia.filter(v => v.total < 0) : [];
            const estaExpandido = !!cierresExpandidos[realIndex];

            tbodyHist.innerHTML += `
                <tr class="fila-venta-cabecera" onclick="toggleDetalleCierre(${realIndex})">
                    <td>
                        <strong>${c.fecha.split(', ')[0] || c.fecha}</strong> <span style="font-size: 0.8rem; color: var(--text-secondary);">${c.fecha.split(', ')[1] || ''}</span>
                        <span style="font-size: 0.8rem; color: var(--accent-primary); margin-left: 8px; display: block; margin-top: 4px;">
                            ${estaExpandido ? '▲ Ocultar egresos' : '▼ Ver egresos'}
                        </span>
                    </td>
                    <td>$${c.efectivo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>$${c.otros.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td style="color: var(--danger); font-weight: bold;">
                        ${totalGastosDia > 0 ? `-$${totalGastosDia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '$0,00'}
                    </td>
                    <td style="font-weight: 700; color: var(--success);">$${c.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                    <td>
                        <button class="btn btn-danger btn-icon-only" onclick="event.stopPropagation(); borrarCierreHistorial(${realIndex})" title="Borrar del historial">🗑️</button>
                    </td>
                </tr>`;
            
            if (estaExpandido) {
                let filasGastos = '';
                if (gastosDia.length > 0) {
                    gastosDia.forEach(g => {
                        const time = g.fecha ? (g.fecha.split(', ')[1] || g.fecha) : 'Sin hora';
                        // El detalle usualmente es "GASTO: Coca-cola", limpiamos "GASTO: " si es necesario o lo mostramos directo
                        const concepto = g.detalle ? g.detalle.replace('GASTO: ', '') : 'Retiro / Gasto';
                        filasGastos += `
                            <li>
                                <span>💸 <strong>${concepto}</strong> (${time})</span>
                                <span style="color: var(--danger); font-weight: 600;">-$${Math.abs(g.total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                            </li>
                        `;
                    });
                } else {
                    filasGastos = `<li><span style="color: var(--text-secondary); font-style: italic;">Sin gastos registrados en este turno.</span></li>`;
                }

                tbodyHist.innerHTML += `
                    <tr class="fila-detalle-productos">
                        <td colspan="6">
                            <ul class="lista-productos-vendidos" style="border-left: 3px solid var(--danger);">
                                <li style="border-bottom: 1px dashed var(--border-color); font-weight: bold; color: var(--warning); padding-bottom: 6px; margin-bottom: 6px;">
                                    <span>DETALLE DE EGRESOS (SALIDAS DE CAJA)</span>
                                    <span>Total: -$${totalGastosDia.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                                </li>
                                ${filasGastos}
                            </ul>
                        </td>
                    </tr>`;
            }
        });
    }

    // 5. Tabla de Gastos
    dibujarTablaGastos();

    // 6. Tabla de Ventas Detalle
    dibujarTablaVentasDetalle();

    // 7. Tabla de la Carta Digital & Precios Unificados
    renderizarCategoriasAdmin();
    renderizarTablaCartaAdmin();
}

let ventasDetalleExpandidas = {}; // Objeto para controlar qué filas están expandidas

function dibujarTablaVentasDetalle() {
    const tbody = document.getElementById('cuerpo-ventas-detalle');
    if (!tbody) return;

    tbody.innerHTML = '';

    // Solo mostrar las ventas reales (total > 0)
    // Las ordenamos de más reciente a más antigua
    const ventasFiltradas = ventas.map((v, index) => ({ ...v, originalIndex: index }))
        .filter(v => v.total > 0)
        .reverse();

    if (ventasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">No hay ventas registradas el día de hoy.</td></tr>`;
        return;
    }

    ventasFiltradas.forEach(v => {
        const time = v.fecha ? (v.fecha.split(', ')[1] || v.fecha) : 'Sin hora';

        // Crear el listado resumido de productos para la cabecera
        let resumenProductos = "";
        if (v.productos && v.productos.length > 0) {
            resumenProductos = v.productos.map(p => `${p.cantidad}x ${p.nombre}`).join(', ');
            if (resumenProductos.length > 60) {
                resumenProductos = resumenProductos.substring(0, 57) + "...";
            }
        } else {
            resumenProductos = v.detalle || "Venta general";
        }

        // Determinar badge del método de pago
        let badgeClass = "badge-efectivo";
        let metodoPago = "Efectivo";
        if (v.metodo === "debito") {
            badgeClass = "badge-debito";
            metodoPago = "Tarjeta";
        } else if (v.metodo === "qr") {
            badgeClass = "badge-qr";
            metodoPago = "QR / MP";
        }

        const key = `venta-${v.originalIndex}`;
        const estaExpandido = !!ventasDetalleExpandidas[key];

        tbody.innerHTML += `
            <tr class="fila-venta-cabecera" onclick="toggleDetalleVenta('${key}')">
                <td>${time}</td>
                <td>
                    <span style="font-weight: 500;">${resumenProductos}</span>
                    <span style="font-size: 0.8rem; color: var(--accent-primary); margin-left: 8px;">
                        ${estaExpandido ? '▲ Ocultar' : '▼ Ver detalle'}
                    </span>
                </td>
                <td><span class="badge ${badgeClass}">${metodoPago}</span></td>
                <td style="font-weight: bold; color: var(--success);">$${v.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                <td>
                    <button class="btn btn-danger btn-icon-only" onclick="event.stopPropagation(); imprimirTicketDesdeAdmin(${v.originalIndex})" title="Imprimir ticket de esta venta" style="margin-right: 4px;">🖨️</button><button class="btn btn-danger btn-icon-only" onclick="event.stopPropagation(); anularVentaEspecifica(${v.originalIndex})" title="Anular esta venta">🗑️</button>
                </td>
            </tr>
        `;

        if (estaExpandido) {
            let filasProductos = '';
            if (v.productos && v.productos.length > 0) {
                v.productos.forEach(p => {
                    const subtotal = p.precio * p.cantidad;
                    filasProductos += `
                        <li>
                            <span>📦 <strong>${p.nombre}</strong> (x${p.cantidad})</span>
                            <span>$${p.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })} c/u | Total: <strong>$${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong></span>
                        </li>
                    `;
                });
            } else {
                filasProductos = `<li><span>Venta sin desglose de productos individuales (Monto total: $${v.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })})</span></li>`;
            }

            tbody.innerHTML += `
                <tr class="fila-detalle-productos">
                    <td colspan="5">
                        <ul class="lista-productos-vendidos">
                            ${filasProductos}
                        </ul>
                    </td>
                </tr>
            `;
        }
    });
}

function toggleDetalleVenta(key) {
    ventasDetalleExpandidas[key] = !ventasDetalleExpandidas[key];
    dibujarTablaVentasDetalle();
}

let cierresExpandidos = {}; // Objeto para controlar qué cierres archivados están expandidos

function toggleDetalleCierre(index) {
    cierresExpandidos[index] = !cierresExpandidos[index];
    actualizarTodo();
}

async function anularVentaEspecifica(index) {
    const venta = ventas[index];
    if (!venta) return;

    let detalleVenta = "";
    if (venta.productos && venta.productos.length > 0) {
        detalleVenta = venta.productos.map(p => `${p.cantidad}x ${p.nombre}`).join('\n');
    } else {
        detalleVenta = venta.detalle || "Venta general";
    }

    if (confirm(`⚠️ ¿Confirmás la ANULACIÓN de esta venta?\n\n• Importe: $${venta.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}\n• Método: ${venta.metodo.toUpperCase()}\n• Hora: ${venta.fecha.split(', ')[1] || venta.fecha}\n\nProductos:\n${detalleVenta}\n\nSe devolverá el stock al inventario.`)) {
        // Devolver stock si tiene productos
        if (venta.productos) {
            venta.productos.forEach(prod => {
                const enDB = inventario.find(p => p.id === prod.id);
                if (enDB && enDB.tipo !== "variable") {
                    enDB.stock += prod.cantidad;
                }
            });
            await apiPost('/api/inventario', inventario, 'inventario');
            subirInventarioAGitHub();
        }

        // Remover de la lista
        ventas.splice(index, 1);
        await apiPost('/api/ventas', ventas, 'ventas_realizadas');
        actualizarTodo();
        beepSuccess();
        alert("✅ Venta anulada exitosamente y stock retornado.");
    }
}


function beepSuccess() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(900, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) { }
}

// Impresión y configuración de tickets en Admin (Gadnic IT1050)
function imprimirTicketDesdeAdmin(indexVentaOriginal) {
    const v = ventas[indexVentaOriginal];
    if (v && typeof imprimirTicket === 'function') {
        imprimirTicket(v);
    } else {
        alert("No se pudo cargar la venta para imprimir ticket.");
    }
}

function cargarConfiguracionTicketAdmin() {
    if (typeof obtenerDatosTicket !== 'function') return;
    const config = obtenerDatosTicket();
    const inputNombre = document.getElementById('ticket-nombre');
    const inputSub = document.getElementById('ticket-subtitulo');
    const inputDir = document.getElementById('ticket-direccion');
    const inputTel = document.getElementById('ticket-telefono');
    const inputMsg = document.getElementById('ticket-mensaje');

    if (inputNombre) inputNombre.value = config.nombre || '';
    if (inputSub) inputSub.value = config.subtitulo || '';
    if (inputDir) inputDir.value = config.direccion || '';
    if (inputTel) inputTel.value = config.telefono || '';
    if (inputMsg) inputMsg.value = config.mensaje || '';
}

function guardarConfiguracionTicketAdmin() {
    if (typeof guardarDatosTicket !== 'function') return;
    const inputNombre = document.getElementById('ticket-nombre');
    const inputSub = document.getElementById('ticket-subtitulo');
    const inputDir = document.getElementById('ticket-direccion');
    const inputTel = document.getElementById('ticket-telefono');
    const inputMsg = document.getElementById('ticket-mensaje');

    guardarDatosTicket({
        nombre: inputNombre ? inputNombre.value.trim() : '',
        subtitulo: inputSub ? inputSub.value.trim() : '',
        direccion: inputDir ? inputDir.value.trim() : '',
        telefono: inputTel ? inputTel.value.trim() : '',
        mensaje: inputMsg ? inputMsg.value.trim() : ''
    });

    const status = document.getElementById('ticket-config-status');
    if (status) {
        status.innerText = "✅ Guardado";
        status.style.color = "var(--success)";
        setTimeout(() => {
            if (status) status.innerText = "";
        }, 3000);
    }
}

// ==========================================================
// --- GESTIÓN UNIFICADA DE PRECIOS Y PLATOS DE LA CARTA ---
// ==========================================================

let categoriaActivaAdmin = 'TODAS';

function showToast(msg, variant = 'ok', timeout = 3500) {
    let div = document.getElementById('toast-admin');
    if (!div) {
        div = document.createElement('div');
        div.id = 'toast-admin';
        div.className = 'toast-admin';
        document.body.appendChild(div);
    }
    div.className = 'toast-admin show ' + (variant === 'err' ? 'toast-err' : variant === 'info' ? 'toast-info' : 'toast-ok');
    div.innerHTML = (variant === 'err' ? '✖ ' : variant === 'info' ? 'ℹ ' : '✔ ') + msg;
    clearTimeout(div._timer);
    div._timer = setTimeout(() => {
        div.classList.remove('show');
    }, timeout);
}

function renderizarCategoriasAdmin() {
    const cont = document.getElementById('categorias-carta-admin');
    if (!cont) return;
    const categoriasUnicas = ['TODAS', ...new Set(inventario.map(p => p.categoria).filter(Boolean))];
    cont.innerHTML = categoriasUnicas.map(cat => `
        <button type="button" class="filtro-categoria-chip ${categoriaActivaAdmin === cat ? 'active' : ''}" onclick="filtrarCategoriaCartaAdmin('${cat}')">
            ${cat}
        </button>
    `).join('');
}

function filtrarCategoriaCartaAdmin(cat) {
    categoriaActivaAdmin = cat;
    renderizarCategoriasAdmin();
    renderizarTablaCartaAdmin();
}

function renderizarTablaCartaAdmin() {
    const tbody = document.getElementById('tbody-carta-admin');
    if (!tbody) return;
    tbody.innerHTML = '';

    const query = (document.getElementById('buscar-carta-admin')?.value || '').trim().toLowerCase();

    let filtrados = inventario.filter(p => {
        const coincideCat = categoriaActivaAdmin === 'TODAS' || p.categoria === categoriaActivaAdmin;
        const coincideTexto = !query ||
            (p.nombre && p.nombre.toLowerCase().includes(query)) ||
            (p.id && p.id.toLowerCase().includes(query)) ||
            (p.categoria && p.categoria.toLowerCase().includes(query)) ||
            (p.descripcion && p.descripcion.toLowerCase().includes(query));
        return coincideCat && coincideTexto;
    });

    const contadorEl = document.getElementById('contador-platos-carta');
    if (contadorEl) {
        contadorEl.innerText = `${filtrados.length} platos/productos en lista (Total: ${inventario.length})`;
    }

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 36px 12px; font-style: italic;">No se encontraron platos ni productos con el filtro aplicado.</td></tr>`;
        return;
    }

    // Ordenar alfabéticamente por nombre
    filtrados.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    filtrados.forEach((p) => {
        const precioNum = parseFloat(String(p.precio).replace(/[^\d.]/g, '')) || 0;
        const fotoSrc = p.imagen || '';
        const imgHtml = fotoSrc 
            ? `<img src="${fotoSrc}" class="foto-mini-carta" alt="${p.nombre}" onerror="this.onerror=null; this.src='img/Captura de pantalla 2025-10-30 213537.png';">`
            : `<div class="foto-placeholder-mini">🍽️</div>`;

        const tr = document.createElement('tr');
        tr.dataset.rowId = p.id;
        tr.innerHTML = `
            <td style="text-align: center; width: 70px;">
                <div style="position: relative; display: inline-block;">
                    ${imgHtml}
                    <label class="btn-cambiar-foto" title="Cambiar foto del plato">
                        📷
                        <input type="file" accept="image/*" style="display: none;" onchange="cambiarFotoPlatoFila(this, '${p.id}')">
                    </label>
                </div>
            </td>
            <td style="width: 100px;">
                <span class="badge badge-debito" style="font-family: monospace; font-size: 0.8rem;">${p.id}</span>
            </td>
            <td>
                <input type="text" class="input-tabla-admin input-nombre-plato" value="${p.nombre || ''}" onchange="actualizarDatoPlato('${p.id}', 'nombre', this.value)" placeholder="Nombre del plato" style="font-weight: 600; width: 100%;">
            </td>
            <td style="width: 160px;">
                <input type="text" class="input-tabla-admin" value="${p.categoria || ''}" onchange="actualizarDatoPlato('${p.id}', 'categoria', this.value)" placeholder="Categoría (ej: Porción 🍽️)">
            </td>
            <td>
                <input type="text" class="input-tabla-admin" value="${p.descripcion || ''}" onchange="actualizarDatoPlato('${p.id}', 'descripcion', this.value)" placeholder="Descripción / ingredientes" style="font-size: 0.85rem; color: var(--text-secondary); width: 100%;">
            </td>
            <td style="width: 170px;">
                <div class="precio-input-wrapper">
                    <span class="precio-signo">$</span>
                    <input type="number" step="any" min="0" class="precio-input-admin" data-id="${p.id}" value="${precioNum}" oninput="actualizarPrecioEnMemoria('${p.id}', this.value)" placeholder="0">
                </div>
            </td>
            <td style="width: 90px; text-align: center;">
                <button class="btn btn-danger btn-icon-only" onclick="eliminarPlatoCarta('${p.id}')" title="Eliminar plato de la carta y de la caja">🗑️</button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    configurarNavegacionTecladoPrecios();
}

function actualizarPrecioEnMemoria(id, nuevoPrecioStr) {
    const idx = inventario.findIndex(p => p.id === id);
    if (idx !== -1) {
        const num = parseFloat(nuevoPrecioStr);
        inventario[idx].precio = isNaN(num) ? 0 : num;
    }
}

function actualizarDatoPlato(id, campo, valor) {
    const idx = inventario.findIndex(p => p.id === id);
    if (idx !== -1) {
        inventario[idx][campo] = valor.trim();
    }
}

function configurarNavegacionTecladoPrecios() {
    const inputs = Array.from(document.querySelectorAll('.precio-input-admin'));
    inputs.forEach((input, index) => {
        input.onkeydown = (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    if (index > 0) {
                        inputs[index - 1].focus();
                        inputs[index - 1].select();
                    }
                } else {
                    if (index < inputs.length - 1) {
                        inputs[index + 1].focus();
                        inputs[index + 1].select();
                    }
                }
            } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault();
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                    inputs[index + 1].select();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (index > 0) {
                    inputs[index - 1].focus();
                    inputs[index - 1].select();
                }
            }
        };
    });
}

async function guardarTodosLosPreciosCarta() {
    try {
        const btnGuardar = document.getElementById('btn-guardar-todos-carta');
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.innerText = '⏳ Guardando y Sincronizando...';
        }

        // Recolectar valores actuales de la pantalla por si hubo ediciones sin 'change'
        const inputsPrecios = document.querySelectorAll('.precio-input-admin');
        inputsPrecios.forEach(inp => {
            const id = inp.dataset.id;
            const val = parseFloat(inp.value) || 0;
            const idx = inventario.findIndex(p => p.id === id);
            if (idx !== -1) {
                inventario[idx].precio = val;
            }
        });

        // Guardar en almacenamiento local
        localStorage.setItem('inventario', JSON.stringify(inventario));

        // Subir a la API y GitHub
        const ok = await apiPost('/api/inventario', inventario, 'inventario');

        beepSuccess();
        showToast(`✅ ¡Precios guardados con éxito! Actualizados al instante en la Carta Online y en la Caja.`, 'ok', 4000);

        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = '💾 GUARDAR TODOS LOS PRECIOS';
        }

        renderizarTablaCartaAdmin();
    } catch (err) {
        console.error("Error al guardar precios:", err);
        showToast(`⚠️ Error al guardar: ${err.message || err}`, 'err', 5000);
        const btnGuardar = document.getElementById('btn-guardar-todos-carta');
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = '💾 GUARDAR TODOS LOS PRECIOS';
        }
    }
}

async function cambiarFotoPlatoFila(fileInput, prodId) {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const idx = inventario.findIndex(p => p.id === prodId);
    if (idx === -1) return;

    showToast(`Cargando foto para ${inventario[idx].nombre}... ⏳`, 'info', 2500);

    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result;
        inventario[idx].imagen = base64;
        renderizarTablaCartaAdmin();
        showToast(`Foto asignada. Presioná 'Guardar Todos los Precios' para confirmar.`, 'ok', 3500);
    };
    reader.readAsDataURL(file);
}

function abrirModalNuevoPlato() {
    const f = document.getElementById('form-nuevo-plato');
    if (!f) return;
    f.style.display = 'block';
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('nuevo-plato-nombre').focus();
}

function cerrarModalNuevoPlato() {
    const f = document.getElementById('form-nuevo-plato');
    if (f) f.style.display = 'none';
    document.getElementById('nuevo-plato-nombre').value = '';
    document.getElementById('nuevo-plato-precio').value = '';
    document.getElementById('nuevo-plato-categoria').value = '';
    document.getElementById('nuevo-plato-desc').value = '';
    document.getElementById('nuevo-plato-imagen').value = '';
}

async function guardarNuevoPlato() {
    const nom = document.getElementById('nuevo-plato-nombre').value.trim();
    const pre = parseFloat(document.getElementById('nuevo-plato-precio').value) || 0;
    const cat = document.getElementById('nuevo-plato-categoria').value.trim() || 'Varios 🍽️';
    const desc = document.getElementById('nuevo-plato-desc').value.trim();
    const img = document.getElementById('nuevo-plato-imagen').value.trim();
    const tipo = document.getElementById('nuevo-plato-tipo').value || 'fijo';

    if (!nom || pre <= 0) {
        alert("⚠️ Por favor ingrese al menos el Nombre del plato y un Precio válido mayor a 0.");
        return;
    }

    // Generar nuevo ID secuencial prodXXXX
    let max = 0;
    inventario.forEach(p => {
        const m = String(p.id).match(/(\d+)$/);
        if (m) {
            const num = parseInt(m[1], 10);
            if (num > max) max = num;
        }
    });
    const nuevoId = 'prod' + String(max + 1).padStart(4, '0');

    const nuevo = {
        id: nuevoId,
        nombre: nom,
        descripcion: desc,
        precio: pre,
        categoria: cat,
        imagen: img || 'img/Captura de pantalla 2025-10-30 213537.png',
        tipo: tipo,
        stock: tipo === 'variable' ? 100 : 999
    };

    inventario.push(nuevo);
    await apiPost('/api/inventario', inventario, 'inventario');

    cerrarModalNuevoPlato();
    actualizarTodo();
    beepSuccess();
    showToast(`✅ Plato "${nom}" agregado a la Carta y a la Caja (${nuevoId}).`, 'ok', 3500);
}

async function eliminarPlatoCarta(id) {
    const idx = inventario.findIndex(p => p.id === id);
    if (idx === -1) return;

    const nombre = inventario[idx].nombre;
    if (confirm(`¿Estás seguro de eliminar "${nombre}" de la Carta y de la Caja?`)) {
        inventario.splice(idx, 1);
        await apiPost('/api/inventario', inventario, 'inventario');
        actualizarTodo();
        beepSuccess();
        showToast(`🗑️ "${nombre}" eliminado.`, 'info', 2500);
    }
}

// Carga e inicialización inteligente en Admin comunicándose con server.py
async function inicializarAdmin() {
    // Cargar todos los datos desde el servidor API
    inventario = await apiGet('/api/inventario', 'inventario');
    fiados = await apiGet('/api/fiados', 'fiados');
    ventas = await apiGet('/api/ventas', 'ventas_realizadas');
    historialCierres = await apiGet('/api/historial-cierres', 'historial_cierres');

    validarToken();
    cargarConfiguracionTicketAdmin();
    actualizarTodo();
}

inicializarAdmin();

// Escuchar evento de base de datos sincronizada para recargar la UI
window.addEventListener('db_sincronizada', async () => {
    console.log("🔔 Sincronización offline completada. Recargando datos de administración...");
    await inicializarAdmin();
});
