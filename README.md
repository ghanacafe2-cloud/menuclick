# 🍽️ Don Pilo - Sistema Unificado de Carta Digital & Caja POS

Sistema web integral que combina:
1. **Carta Digital con pedidos por WhatsApp** (para clientes).
2. **Caja Registradora / POS Profesional** (para mostrador y cobro).
3. **Panel de Administración Unificado** (para cambiar los precios de la carta en tiempo real, cerrar caja, registrar gastos, ver ventas y fiados).

---

## 🚀 Estructura de la Aplicación

- **`index.html` / `carta.html`**: Carta digital de cara a los clientes. Permite filtrar por categorías (Porción 🍽️, Postres 🍮, Por Kilo, Sándwiches 🥪, etc.), ver fotos en alta definición, agregar al carrito de compras, elegir sucursal/teléfono y enviar el pedido formateado directo al WhatsApp del local.
- **`caja.html` / `indexcaja.html`**: Mostrador y Caja Registradora para el cajero o dueño. Cuenta con el botón **"📖 Carta Digital / Catálogo"** para seleccionar cualquier plato de la carta y cobrarlo al instante con el precio actualizado. Soporta cobro en Efectivo, Débito, QR/MercadoPago y Fiado, además de impresión de tickets térmicos (58mm - Gadnic IT1050).
- **`admin.html`**: **Panel de Administración Central**.
  - **🍽️ Precios de la Carta**: Tabla interactiva donde podés cambiar los precios de todos los platos en segundos (navegando con `Tab` o flechas `↓`/`↑`). Al hacer clic en **"💾 GUARDAR TODOS LOS PRECIOS"**, los nuevos precios se aplican **automáticamente tanto en la Carta Online de WhatsApp como en la Caja registradora**.
  - **💵 Caja y Cierre del Día**: Resumen de cobros por método de pago y cierre archivado.
  - **📝 Detalle de Ventas**: Transacciones del día con desglose de ítems vendidos.
  - **💸 Salidas / Gastos**: Registro de pagos a proveedores y egresos de caja.
  - **📒 Libreta de Fiados**: Cuentas corrientes de clientes con opción de agrupar deudas y marcar pagos.
  - **📂 Historial de Cierres**: Registro histórico con desglose financiero.
  - **🖨️ Impresora Térmica**: Configuración personalizada de cabecera y pie de ticket para impresora térmica de 58mm.
  - **☁️ Sincronización Nube**: Conexión automática con GitHub (Token PAT) para sincronización multi-dispositivo y modo offline.
- **`inventario.html`**: Módulo alternativo para gestión con escáner de cámara y código de barras.

---

## 🔑 Credenciales y Accesos

- **PIN del Panel Admin**: `1234`
- **Sincronización GitHub**: Repositorio `ghanacafe2-cloud/menuclick` (Token PAT pre-configurado en `api.js`).

---

## 💻 Uso Local (Opcional)

Podés abrir los archivos directamente haciendo doble clic en `index.html`, `caja.html` o `admin.html` en tu navegador favorito (Chrome, Edge, etc.).

Si deseás ejecutar el servidor local en Python:
```bash
python server.py
```
Y abrir `http://localhost:8000`.
