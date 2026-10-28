// Correos de la tienda: confirmación al cliente y aviso de nueva compra para la tienda.
// Usa Resend (https://resend.com) por HTTP, sin instalar nada.
// Variables de entorno en Vercel:
//   RESEND_API_KEY   (obligatoria) la llave de Resend
//   CORREO_DE        (opcional) remitente, ej: In Equestrian Shop <contacto@in-equestrian.com>
//   CORREO_AVISO     (opcional) a dónde llega el aviso de compra; por defecto contacto@in-equestrian.com
// Si falta RESEND_API_KEY, simplemente no se envían correos (el pedido se registra igual).

const COLOR = { fondo: '#f6f4f1', borde: '#ddd6ca', texto: '#393634', suave: '#6b5d52', negro: '#1f1f1f' };
const SITIO = 'https://www.inequestrian.com.mx';

function esc(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function dinero(valor) {
  return '$' + Number(valor || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function detalleProducto(p) {
  return [
    p.color && p.color !== 'Único' ? p.color : '',
    p.talla ? 'Talla ' + p.talla : '',
    p.grip ? 'Grip ' + p.grip : ''
  ].filter(Boolean).join(' · ');
}

function tablaProductos(productos) {
  const filas = productos.map(p => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${COLOR.borde};font-size:15px;color:${COLOR.texto}">
        <strong>${esc(p.nombre)}</strong>
        ${detalleProducto(p) ? `<br><span style="font-size:13px;color:${COLOR.suave}">${esc(detalleProducto(p))}</span>` : ''}
      </td>
      <td style="padding:12px 0 12px 12px;border-bottom:1px solid ${COLOR.borde};font-size:15px;color:${COLOR.texto};text-align:center;white-space:nowrap">× ${esc(p.cantidad || 1)}</td>
      <td style="padding:12px 0 12px 12px;border-bottom:1px solid ${COLOR.borde};font-size:15px;color:${COLOR.texto};text-align:right;white-space:nowrap">${dinero(Number(p.precio || 0) * Number(p.cantidad || 1))}</td>
    </tr>`).join('');

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${filas}</table>`;
}

function totales({ subtotal, envio, total }) {
  const linea = (nombre, valor, fuerte) => `
    <tr>
      <td style="padding:4px 0;font-size:${fuerte ? 17 : 14}px;color:${fuerte ? COLOR.negro : COLOR.suave};${fuerte ? 'font-weight:bold;' : ''}">${nombre}</td>
      <td style="padding:4px 0;font-size:${fuerte ? 17 : 14}px;color:${fuerte ? COLOR.negro : COLOR.texto};text-align:right;${fuerte ? 'font-weight:bold;' : ''}">${dinero(valor)}</td>
    </tr>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px">
    ${linea('Subtotal', subtotal)}${linea('Envío', envio)}${linea('Total', total, true)}
  </table>`;
}

function plantilla(titulo, contenido) {
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:0;background:${COLOR.fondo}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.fondo}">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${COLOR.borde}">
        <tr><td style="padding:28px 32px 0;font-family:'Times New Roman',Georgia,serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${COLOR.suave}">In Equestrian Shop</td></tr>
        <tr><td style="padding:10px 32px 0;font-family:'Times New Roman',Georgia,serif;font-size:28px;color:${COLOR.negro}">${titulo}</td></tr>
        <tr><td style="padding:18px 32px 32px;font-family:'Times New Roman',Georgia,serif;color:${COLOR.texto}">${contenido}</td></tr>
      </table>
      <p style="margin:18px 0 0;font-family:'Times New Roman',Georgia,serif;font-size:12px;color:${COLOR.suave}">In Equestrian Shop · The Point Santa Fe, CDMX · <a href="${SITIO}" style="color:${COLOR.suave}">inequestrian.com.mx</a></p>
    </td></tr>
  </table>
</body></html>`;
}

function correoCliente(pedido) {
  const nombre = (pedido.nombre || '').split(' ')[0];
  const contenido = `
    <p style="margin:0 0 18px;font-size:16px;line-height:1.6">${nombre ? esc(nombre) + ', gracias' : 'Gracias'} por tu compra. Recibimos tu pedido <strong>${esc(pedido.idEnvio)}</strong> y ya lo estamos preparando.</p>
    ${tablaProductos(pedido.productos)}
    ${totales(pedido)}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:${COLOR.suave}">Puedes ver el estatus de tu pedido en <a href="${SITIO}/cuenta" style="color:${COLOR.negro}">Mi cuenta → Pedidos</a>. Si tienes alguna duda, responde a este correo o escríbenos a contacto@in-equestrian.com.</p>`;

  return {
    asunto: 'Gracias por tu compra en In Equestrian Shop',
    html: plantilla('Gracias por tu compra', contenido)
  };
}

function bloqueCotizaciones(opciones) {
  if (!opciones || !opciones.length) {
    return `<p style="margin:22px 0 0;font-size:13px;color:${COLOR.suave}">Cotización de envío (Envia.com): no disponible para este pedido.</p>`;
  }

  const filas = opciones.slice(0, 6).map((o, i) => `
    <tr>
      <td style="padding:6px 0;border-bottom:1px solid ${COLOR.borde};font-size:14px;color:${COLOR.texto}">${i === 0 ? '<strong>' : ''}${esc(o.paqueteria)} ${esc(o.servicio)}${i === 0 ? '</strong>' : ''}${o.entrega ? `<br><span style="font-size:12px;color:${COLOR.suave}">${esc(o.entrega)}</span>` : ''}</td>
      <td style="padding:6px 0;border-bottom:1px solid ${COLOR.borde};font-size:14px;color:${COLOR.texto};text-align:right;white-space:nowrap">${i === 0 ? '<strong>' : ''}${dinero(o.precio)}${i === 0 ? '</strong>' : ''}</td>
    </tr>`).join('');

  return `<p style="margin:24px 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;color:${COLOR.suave}">Cotización de envío (Envia.com)</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">${filas}</table>`;
}

function correoTienda(pedido) {
  const d = pedido.direccion || {};
  const fila = (etiqueta, valor) => `
    <tr>
      <td style="padding:4px 12px 4px 0;font-size:14px;color:${COLOR.suave};vertical-align:top;white-space:nowrap">${etiqueta}</td>
      <td style="padding:4px 0;font-size:14px;color:${COLOR.texto}">${valor || '—'}</td>
    </tr>`;

  const direccion = [
    [d.calle, d.numero].filter(Boolean).join(' '),
    d.colonia,
    d.ciudad,
    d.estado,
    d.cp ? 'CP ' + d.cp : ''
  ].filter(Boolean).map(esc).join(', ');

  const contenido = `
    <p style="margin:0 0 18px;font-size:16px;line-height:1.6">Se registró un pedido nuevo: <strong>${esc(pedido.idEnvio)}</strong>.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
      ${fila('Nombre', esc(pedido.nombre))}
      ${fila('Correo', pedido.correo ? `<a href="mailto:${esc(pedido.correo)}" style="color:${COLOR.negro}">${esc(pedido.correo)}</a>` : '')}
      ${fila('Teléfono', esc(pedido.telefono))}
      ${fila('Dirección', direccion)}
    </table>
    ${tablaProductos(pedido.productos)}
    ${totales(pedido)}
    ${bloqueCotizaciones(pedido.cotizaciones)}
    <p style="margin:24px 0 0;font-size:13px;color:${COLOR.suave}">El pedido ya está en tu hoja de Pedidos con estatus "Aceptado".</p>`;

  return {
    asunto: `Nueva compra ${pedido.idEnvio} · ${pedido.nombre || 'cliente'} · ${dinero(pedido.total)}`,
    html: plantilla('Tienes una nueva compra', contenido)
  };
}

async function enviar({ para, asunto, html, responderA }) {
  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.CORREO_DE || 'In Equestrian Shop <contacto@in-equestrian.com>',
      to: [para],
      subject: asunto,
      html,
      ...(responderA ? { reply_to: responderA } : {})
    })
  });

  if (!respuesta.ok) {
    const detalle = await respuesta.text().catch(() => '');
    throw new Error(`Resend ${respuesta.status}: ${detalle}`);
  }
}

// Manda los dos correos de un pedido. Nunca lanza error: si falla el correo, el pedido ya quedó guardado.
async function enviarCorreosDePedido(pedido) {
  console.log('Correos: preparando envío del pedido', pedido.idEnvio, '| llave de Resend:', process.env.RESEND_API_KEY ? 'sí' : 'NO');
  if (!process.env.RESEND_API_KEY) {
    console.warn('Correos desactivados: falta RESEND_API_KEY.');
    return;
  }

  const aviso = process.env.CORREO_AVISO || 'contacto@in-equestrian.com';
  const tareas = [];

  if (pedido.correo) {
    const c = correoCliente(pedido);
    tareas.push(enviar({ para: pedido.correo, asunto: c.asunto, html: c.html, responderA: aviso }));
  }

  const t = correoTienda(pedido);
  tareas.push(enviar({ para: aviso, asunto: t.asunto, html: t.html, responderA: pedido.correo || undefined }));

  const resultados = await Promise.allSettled(tareas);
  resultados.forEach(r => {
    if (r.status === 'rejected') console.error('No se pudo enviar un correo del pedido:', r.reason && r.reason.message);
    else console.log('Correo enviado correctamente (pedido ' + pedido.idEnvio + ').');
  });
}

module.exports = { enviarCorreosDePedido, correoCliente, correoTienda };