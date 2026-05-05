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

function borrarVentas() {
    if (confirm("¿Reiniciar la caja a cero?")) {
        localStorage.removeItem('ventas_realizadas');
        actualizarTodo();
    }
}

actualizarTodo();
