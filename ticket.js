// ticket.js - Soporte de impresión de tickets térmicos para formato 58mm (Gadnic IT1050)

// 1. Obtener y guardar configuración del ticket
function obtenerDatosTicket() {
    return {
        nombre: localStorage.getItem('pos_ticket_nombre') || 'KIOSCO EL CHOLO',
        subtitulo: localStorage.getItem('pos_ticket_subtitulo') || 'Punto de Venta Profesional',
        direccion: localStorage.getItem('pos_ticket_direccion') || '',
        telefono: localStorage.getItem('pos_ticket_telefono') || '',
        mensaje: localStorage.getItem('pos_ticket_mensaje') || '¡Muchas gracias por su compra!\nVuelva pronto'
    };
}

function guardarDatosTicket(datos) {
    if (datos.nombre !== undefined) localStorage.setItem('pos_ticket_nombre', datos.nombre);
    if (datos.subtitulo !== undefined) localStorage.setItem('pos_ticket_subtitulo', datos.subtitulo);
    if (datos.direccion !== undefined) localStorage.setItem('pos_ticket_direccion', datos.direccion);
    if (datos.telefono !== undefined) localStorage.setItem('pos_ticket_telefono', datos.telefono);
    if (datos.mensaje !== undefined) localStorage.setItem('pos_ticket_mensaje', datos.mensaje);
}

// 2. Formateo de moneda
function formatearDineroTicket(monto) {
    const valor = parseFloat(monto) || 0;
    return '$' + valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 3. Generar HTML para el rollo térmico de 58mm (ancho imprimible ~48mm / 384 dots)
function generarHTMLTicket(venta) {
    const config = obtenerDatosTicket();
    const idTicket = venta.id || ('TK-' + Math.floor(Math.random() * 900000 + 100000));
    const fecha = venta.fecha || new Date().toLocaleString('es-AR');
    
    const metodos = {
        'efectivo': 'Efectivo',
        'debito': 'Débito / Tarjeta',
        'qr': 'Mercado Pago / QR'
    };
    const metodoNombre = metodos[venta.metodo] || (venta.metodo ? venta.metodo.toUpperCase() : 'Efectivo');
    const total = parseFloat(venta.total) || 0;
    const pagaCon = parseFloat(venta.pagaCon) || 0;
    const vuelto = parseFloat(venta.vuelto) || (pagaCon > total ? (pagaCon - total) : 0);

    // Formatear renglones de productos
    let itemsHTML = '';
    if (venta.productos && venta.productos.length > 0) {
        venta.productos.forEach(p => {
            const cant = p.cantidad || 1;
            const precio = parseFloat(p.precio) || 0;
            const subtotal = p.subtotal !== undefined ? parseFloat(p.subtotal) : (cant * precio);
            itemsHTML += `
                <div class="item-row">
                    <div class="item-desc">${p.nombre}</div>
                    <div class="item-calc">
                        <span>${cant} x ${formatearDineroTicket(precio)}</span>
                        <span class="item-sub">${formatearDineroTicket(subtotal)}</span>
                    </div>
                </div>
            `;
        });
    } else {
        itemsHTML = `
            <div class="item-row">
                <div class="item-desc">${venta.detalle || 'Venta General'}</div>
                <div class="item-calc">
                    <span>1 x ${formatearDineroTicket(total)}</span>
                    <span class="item-sub">${formatearDineroTicket(total)}</span>
                </div>
            </div>
        `;
    }

    // Datos de pago
    let bloquePago = `
        <div class="row-flex">
            <span>Medio de Pago:</span>
            <span><strong>${metodoNombre}</strong></span>
        </div>
    `;

    if (pagaCon > 0) {
        bloquePago += `
            <div class="row-flex">
                <span>Paga con:</span>
                <span>${formatearDineroTicket(pagaCon)}</span>
            </div>
            <div class="row-flex">
                <span>Vuelto:</span>
                <span><strong>${formatearDineroTicket(vuelto)}</strong></span>
            </div>
        `;
    }

    const mensajeLineas = config.mensaje.split('\n').filter(Boolean).join('<br>');

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Ticket ${idTicket}</title>
    <style>
        @page {
            size: 58mm auto;
            margin: 0mm;
        }
        @media print {
            html, body {
                width: 48mm !important;
                margin: 0 auto !important;
                padding: 0 !important;
            }
        }
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            width: 48mm;
            max-width: 48mm;
            margin: 0 auto;
            padding: 3mm 1mm 12mm 1mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            font-weight: 600;
            line-height: 1.25;
            color: #000;
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: 700; }
        
        .header-title {
            font-size: 14px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }
        .header-sub {
            font-size: 10px;
            font-weight: normal;
            margin-bottom: 2px;
        }
        .dashed-line {
            border-top: 1px dashed #000;
            margin: 4px 0;
        }
        .double-line {
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            height: 3px;
            margin: 5px 0;
        }
        .row-flex {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            margin: 2px 0;
        }
        .table-headers {
            display: flex;
            justify-content: space-between;
            font-size: 9.5px;
            font-weight: 700;
            margin: 3px 0;
        }
        .item-row {
            margin: 3px 0 4px 0;
        }
        .item-desc {
            font-size: 10.5px;
            font-weight: 700;
            word-break: break-word;
        }
        .item-calc {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            padding-left: 6px;
        }
        .item-sub {
            font-weight: 700;
        }
        .total-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            font-weight: 800;
            margin: 4px 0;
        }
        .footer-text {
            margin-top: 6px;
            font-size: 10px;
            text-align: center;
            line-height: 1.3;
        }
        .legal-notice {
            font-size: 8px;
            text-align: center;
            margin-top: 4px;
            text-transform: uppercase;
            font-weight: normal;
        }
        .spacer-feed {
            height: 14px;
        }
    </style>
</head>
<body>
    <div class="center">
        <div class="header-title">${config.nombre}</div>
        ${config.subtitulo ? `<div class="header-sub">${config.subtitulo}</div>` : ''}
        ${config.direccion ? `<div class="header-sub">${config.direccion}</div>` : ''}
        ${config.telefono ? `<div class="header-sub">Tel: ${config.telefono}</div>` : ''}
    </div>

    <div class="double-line"></div>

    <div class="row-flex">
        <span>Fecha:</span>
        <span>${fecha}</span>
    </div>
    <div class="row-flex">
        <span>Ticket:</span>
        <span>#${idTicket}</span>
    </div>

    <div class="dashed-line"></div>

    <div class="table-headers">
        <span>DESCRIPCIÓN</span>
        <span>SUBTOTAL</span>
    </div>

    <div class="dashed-line"></div>

    <div class="items-body">
        ${itemsHTML}
    </div>

    <div class="dashed-line"></div>

    <div class="total-container">
        <span>TOTAL:</span>
        <span>${formatearDineroTicket(total)}</span>
    </div>

    <div class="dashed-line"></div>

    ${bloquePago}

    <div class="double-line"></div>

    <div class="footer-text">
        ${mensajeLineas}
    </div>

    <div class="legal-notice">
        *** NO VÁLIDO COMO FACTURA ***
    </div>

    <div class="spacer-feed"></div>
</body>
</html>`;
}

// 4. Función principal de impresión (utiliza un iframe oculto para no alterar la pantalla)
function imprimirTicket(venta) {
    if (!venta) {
        console.warn("imprimirTicket: No se recibieron datos de venta.");
        return;
    }

    let iframe = document.getElementById('ticket-print-frame');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'ticket-print-frame';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.style.zIndex = '-1000';
        document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(generarHTMLTicket(venta));
    doc.close();

    // Pequeño retardo para asegurar que el navegador cargue los estilos
    setTimeout(() => {
        try {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        } catch (e) {
            console.error("Error al disparar la impresión del ticket:", e);
        }
    }, 200);
}

// 5. Imprimir Ticket de Prueba para la Gadnic IT1050
function imprimirTicketPrueba() {
    const ventaPrueba = {
        id: 'TEST-1050',
        fecha: new Date().toLocaleString('es-AR'),
        metodo: 'efectivo',
        total: 4200,
        pagaCon: 5000,
        vuelto: 800,
        productos: [
            { nombre: 'Gaseosa Cola 500ml', cantidad: 1, precio: 1800, subtotal: 1800 },
            { nombre: 'Alfajor Triple Chocolate', cantidad: 2, precio: 1200, subtotal: 2400 }
        ]
    };

    imprimirTicket(ventaPrueba);
}

// 6. Reimprimir Último Ticket
async function reimprimirUltimoTicket() {
    // Primero buscar en localStorage
    const ultimaVentaGuardada = localStorage.getItem('pos_ultima_venta');
    if (ultimaVentaGuardada) {
        try {
            const v = JSON.parse(ultimaVentaGuardada);
            imprimirTicket(v);
            return;
        } catch (e) {}
    }

    // Si no está en localStorage, intentar recuperar del historial API
    try {
        if (typeof apiGet === 'function') {
            const historial = await apiGet('/api/ventas', 'ventas_realizadas');
            const ventasValidas = historial.filter(v => v.total > 0);
            if (ventasValidas.length > 0) {
                const ultima = ventasValidas[ventasValidas.length - 1];
                imprimirTicket(ultima);
                return;
            }
        }
    } catch (e) {
        console.error("Error buscando historial para reimpresión:", e);
    }

    alert("No se encontró ninguna venta reciente para reimprimir.");
}

// 7. Configuración de Auto-impresión
function toggleAutoImprimir(activo) {
    localStorage.setItem('pos_auto_imprimir_ticket', activo ? 'true' : 'false');
}

function inicializarEstadoAutoImprimir() {
    const check = document.getElementById('check-imprimir-ticket');
    if (!check) return;
    const guardado = localStorage.getItem('pos_auto_imprimir_ticket');
    if (guardado !== null) {
        check.checked = (guardado === 'true');
    } else {
        check.checked = true; // Habilitado por defecto para probar de inmediato
    }
}

// Inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        inicializarEstadoAutoImprimir();
    });
}

