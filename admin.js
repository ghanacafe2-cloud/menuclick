let inventario = JSON.parse(localStorage.getItem('inventario')) || [];

function actualizarTodo() {
    // 1. Mostrar Lista de Precios
    const tbody = document.querySelector('#tabla-productos tbody');
    tbody.innerHTML = '';
    inventario.forEach((prod, index) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${prod.id}</td>
            <td>${prod.nombre}</td>
            <td>$${prod.precio}</td>
            <td><button class="btn-danger" onclick="eliminarProducto(${index})">Borrar</button></td>
        `;
        tbody.appendChild(fila);
    });

    // 2. Calcular Reporte de Ventas
    const ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    let efec = 0, tarj = 0, qr = 0;

    ventas.forEach(v => {
        // IMPORTANTE: Estos nombres deben ser iguales a los 'value' del select en index.html
        if (v.metodo === 'efectivo') efec += v.total;
        if (v.metodo === 'debito') tarj += v.total;
        if (v.metodo === 'qr') qr += v.total;
    });

    document.getElementById('total-efectivo').innerText = `$${efec.toLocaleString('es-AR')}`;
    document.getElementById('total-debito').innerText = `$${tarj.toLocaleString('es-AR')}`;
    document.getElementById('total-qr').innerText = `$${qr.toLocaleString('es-AR')}`;
    document.getElementById('total-general').innerText = `$${(efec + tarj + qr).toLocaleString('es-AR')}`;
}

function guardarProducto() {
    const id = document.getElementById('admin-codigo').value.trim().toUpperCase();
    const nombre = document.getElementById('admin-nombre').value.trim();
    const precio = parseFloat(document.getElementById('admin-precio').value);
    const tipo = document.getElementById('admin-tipo').value;

    if (!id || !nombre) return alert("Faltan datos");

    const index = inventario.findIndex(p => p.id === id);
    if (index > -1) inventario[index] = { id, nombre, precio, tipo };
    else inventario.push({ id, nombre, precio, tipo });

    localStorage.setItem('inventario', JSON.stringify(inventario));
    actualizarTodo();
    document.getElementById('admin-codigo').value = '';
    document.getElementById('admin-nombre').value = '';
    document.getElementById('admin-precio').value = '';
    document.getElementById('admin-codigo').focus();
}

function eliminarProducto(index) {
    if (confirm("¿Borrar producto?")) {
        inventario.splice(index, 1);
        localStorage.setItem('inventario', JSON.stringify(inventario));
        actualizarTodo();
    }
}

function descargarRespaldo() {
    const ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    if (ventas.length === 0) return alert("No hay ventas para respaldar.");

    // Formateamos el texto para que sea legible en el escritorio
    let contenido = "REPORTE DE VENTAS - KIOSCO EL CHOLO\n";
    contenido += "Fecha: " + new Date().toLocaleDateString() + "\n";
    contenido += "---------------------------------------\n";
    
    ventas.forEach(v => {
        contenido += `[${v.fecha}] Total: $${v.total} - Pago: ${v.metodo}\n`;
        v.items.forEach(item => {
            contenido += `   > ${item.nombre}: $${item.precio}\n`;
        });
        contenido += "---------------------------------------\n";
    });

    // Crear el archivo para descargar
    const blob = new Blob([contenido], { type: 'text/plain' });
    const archivo = document.createElement('a');
    archivo.href = URL.createObjectURL(blob);
    archivo.download = `Cierre_Caja_${new Date().toLocaleDateString()}.txt`;
    archivo.click();
}

function borrarVentas() {
    if (confirm("¿Cholo, ya descargaste el respaldo? Si reiniciás sin bajar el archivo, perdés los datos de hoy.")) {
        descargarRespaldo(); // Forzamos la descarga antes de borrar
        localStorage.removeItem('ventas_realizadas');
        actualizarTodo();
        alert("Caja reiniciada y archivo descargado. ¡Guardalo en tu carpeta del escritorio!");
    }
}
}

actualizarTodo();
function calcularVuelto() {
    const pagaCon = parseFloat(document.getElementById('paga-con').value) || 0;
    const vuelto = pagaCon - totalVenta;
    const displayVuelto = document.getElementById('vuelto-display');
    
    if (vuelto < 0) {
        displayVuelto.innerText = "Falta dinero";
        displayVuelto.style.color = "red";
    } else {
        displayVuelto.innerText = `$${vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
        displayVuelto.style.color = "green";
    }
}
