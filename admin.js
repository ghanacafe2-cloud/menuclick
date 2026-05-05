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
function mostrarReporte() {
    const ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    let efec = 0, deb = 0, qr = 0;

    ventas.forEach(v => {
        if (v.metodo === 'efectivo') efec += v.total;
        if (v.metodo === 'debito') deb += v.total;
        if (v.metodo === 'qr') qr += v.total;
    });

    document.getElementById('total-efectivo').innerText = `$${efec.toLocaleString('es-AR')}`;
    document.getElementById('total-debito').innerText = `$${deb.toLocaleString('es-AR')}`;
    document.getElementById('total-qr').innerText = `$${qr.toLocaleString('es-AR')}`;
    document.getElementById('total-general').innerText = `$${(efec + deb + qr).toLocaleString('es-AR')}`;
}

function borrarVentas() {
    if (confirm("¿Estás seguro de que querés borrar el historial de hoy? Esto reinicia la caja a cero.")) {
        localStorage.setItem('ventas_realizadas', JSON.stringify([]));
        mostrarReporte();
    }
}

// Llamá a mostrarReporte() al final de tu admin.js para que cargue apenas abrís
mostrarReporte();
// Cargar tabla al iniciar
actualizarTabla();
function actualizarReporte() {
    // Buscamos las ventas guardadas por el mostrador
    const ventas = JSON.parse(localStorage.getItem('ventas_realizadas')) || [];
    let efec = 0, tarj = 0, qr = 0;
    let totalAcumulado = 0;
    let conteoProductos = {};

    ventas.forEach(venta => {
        totalAcumulado += venta.total;
        
        // OJO: Los nombres deben ser EXACTOS a como vienen del index.html
        if (venta.metodo === 'efectivo') efec += venta.total;
        if (venta.metodo === 'debito') tarj += venta.total;
        if (venta.metodo === 'qr') qr += venta.total;

        venta.items.forEach(item => {
            conteoProductos[item.nombre] = (conteoProductos[item.nombre] || 0) + 1;
        });
    });

    // Inyectamos los datos en el HTML del Admin
    if(document.getElementById('total-efectivo')) document.getElementById('total-efectivo').innerText = `$${efec.toLocaleString('es-AR')}`;
    if(document.getElementById('total-debito')) document.getElementById('total-debito').innerText = `$${tarj.toLocaleString('es-AR')}`;
    if(document.getElementById('total-qr')) document.getElementById('total-qr').innerText = `$${qr.toLocaleString('es-AR')}`;
    if(document.getElementById('total-general')) document.getElementById('total-general').innerText = `$${totalAcumulado.toLocaleString('es-AR')}`;

    const listaPopulares = document.getElementById('lista-populares');
    if(listaPopulares) {
        const populares = Object.entries(conteoProductos).sort((a, b) => b[1] - a[1]).slice(0, 3);
        listaPopulares.innerHTML = populares.length > 0 
            ? populares.map(p => `<li>✅ ${p[0]}: ${p[1]} unidades</li>`).join('')
            : "<li>Sin ventas hoy</li>";
    }
}

// Asegurate de llamar a la función al final del archivo
actualizarReporte();
