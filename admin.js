const USERNAME = "TU_USUARIO_GITHUB"; // CAMBIÁ ESTO
const REPO = "ghanacafe2-cloud";
const BRANCH = "main";
const FILE_PATH = "productos.json";

let inventario = JSON.parse(localStorage.getItem('inventario')) || [];

// --- GESTIÓN DE TOKEN ---
function guardarToken() {
    const t = document.getElementById('gh-token').value.trim();
    localStorage.setItem('github_token', t);
    validarToken();
}
function borrarToken() {
    localStorage.removeItem('github_token');
    location.reload();
}
async function validarToken() {
    const token = localStorage.getItem('github_token');
    const status = document.getElementById('token-status');
    if (!token) { status.innerText = "❌ Sin Token"; return; }
    
    try {
        const res = await fetch('https://api.github.com/user', { headers: { Authorization: `token ${token}` } });
        if (res.ok) { status.innerText = "✅ Conectado a GitHub"; status.style.color = "green"; }
        else { status.innerText = "⚠️ Token inválido"; status.style.color = "red"; }
    } catch (e) { status.innerText = "Error de conexión"; }
}

// --- FUNCIÓN MÁGICA PARA SUBIR A GITHUB ---
async function subirAGithub(data) {
    const token = localStorage.getItem('github_token');
    if (!token) return console.log("No hay token, solo se guarda local.");

    try {
        // 1. Obtener el SHA del archivo actual (necesario para actualizar)
        const resInfo = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`, {
            headers: { Authorization: `token ${token}` }
        });
        let sha = undefined;
        if (resInfo.ok) { const json = await resInfo.json(); sha = json.sha; }

        // 2. Subir el nuevo contenido
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const res = await fetch(`https://api.github.com/repos/${USERNAME}/${REPO}/contents/${FILE_PATH}`, {
            method: 'PUT',
            headers: { Authorization: `token ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: "Update inventario via Admin", content, sha, branch: BRANCH })
        });

        if (res.ok) alert("✅ Sincronizado con GitHub con éxito!");
    } catch (e) { console.error("Error al subir:", e); }
}

// --- GUARDAR PRODUCTO (LOCAL + NUBE) ---
async function guardarProducto() {
    const id = document.getElementById('admin-codigo').value.trim().toUpperCase();
    const nombre = document.getElementById('admin-nombre').value.trim();
    const precio = parseFloat(document.getElementById('admin-precio').value);
    const tipo = document.getElementById('admin-tipo').value;

    if (!id || !nombre) return alert("Faltan datos");

    const index = inventario.findIndex(p => p.id === id);
    if (index > -1) inventario[index] = { id, nombre, precio, tipo };
    else inventario.push({ id, nombre, precio, tipo });

    // Guardamos en PC
    localStorage.setItem('inventario', JSON.stringify(inventario));
    
    // Subimos a la nube
    await subirAGithub(inventario);

    actualizarTodo();
    limpiarFormulario();
}

// ... (Mantené tus funciones de eliminarProducto y actualizarTodo de antes)

validarToken();
