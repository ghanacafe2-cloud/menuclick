let inventario = JSON.parse(localStorage.getItem('inventario')) || [];

function actualizarTabla() {
    const tbody = document.querySelector('#tabla-productos tbody');
    tbody.innerHTML = '';

    inventario.forEach((prod, index) => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${prod.id}</td>
            <td>${prod.nombre}</td>
            <td>$${prod.precio}</td>
            <td><button class="btn-delete" onclick="eliminarProducto(${index})">Borrar</button></td>
        `;
        tbody.appendChild(fila);
    });
}

function guardarProducto() {
    const id = document.getElementById('admin-codigo').value.trim().toUpperCase();
    const nombre = document.getElementById('admin-nombre').value.trim();
    const precio = parseFloat(document.getElementById('admin-precio').value);
    const tipo = document.getElementById('admin-tipo').value;

    if (!id || !nombre) return alert("Completá código y nombre");

    const indexExistente = inventario.findIndex(p => p.id === id);

    if (indexExistente > -1) {
        inventario[indexExistente] = { id, nombre, precio, tipo };
    } else {
        inventario.push({ id, nombre, precio, tipo });
    }

    localStorage.setItem('inventario', JSON.stringify(inventario));
    alert("Producto guardado con éxito");
    
    // Limpiar campos
    document.getElementById('admin-codigo').value = '';
    document.getElementById('admin-nombre').value = '';
    document.getElementById('admin-precio').value = '';
    document.getElementById('admin-codigo').focus();
    
    actualizarTabla();
}

function eliminarProducto(index) {
    if (confirm("¿Seguro querés borrar este producto?")) {
        inventario.splice(index, 1);
        localStorage.setItem('inventario', JSON.stringify(inventario));
        actualizarTabla();
    }
}

// Cargar tabla al iniciar
actualizarTabla();
