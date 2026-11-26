import { Router } from 'express';
import { pool } from '../mysqlPool.ts';
import { db } from '../db.ts';

/**
 * Páginas legales públicas (HTML simple, sin JavaScript): términos, privacidad (Habeas Data), garantías y retracto,
 * cookies y un formulario para ejercer derechos sobre los datos personales.
 * Texto base preparado con la normativa colombiana (Ley 1581 de 2012, Decreto 1377 de 2013, Ley 1480 de 2011).
 * Debe ser revisado por un abogado antes de darse por definitivo.
 */

const router = Router();

const UPDATED = '26 de noviembre de 2026';
const PLACEHOLDER_NIT = '901.784.321-4'; // valor de ejemplo que trae el sistema: no se publica como dato real

const esc = (s: any) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

interface Company { name: string; nit: string; email: string; phone: string; whatsapp: string; address: string }

function company(): Company {
  const s: any = db.getSettings() || {};
  const f = s.footerSettings || {};
  const realNit = f.nit && String(f.nit).trim() && String(f.nit).trim() !== PLACEHOLDER_NIT ? String(f.nit).trim() : '';
  const realName = realNit && f.companyName ? String(f.companyName).trim() : 'Zavela Store';
  return {
    name: realName,
    nit: realNit,
    email: String(s.contactEmail || 'contacto@zavelastore.com.co'),
    phone: String(s.contactPhone || '+57 313 359 5427'),
    whatsapp: String(s.whatsappNumber || '573133595427').replace(/\D/g, ''),
    address: 'Cartagena, Bolívar, Colombia'
  };
}

const NAV = [
  ['/terminos-y-condiciones', 'Términos y condiciones'],
  ['/politica-de-privacidad', 'Política de privacidad'],
  ['/politica-de-garantias', 'Garantías, cambios y retracto'],
  ['/politica-de-cookies', 'Política de cookies'],
  ['/derechos-datos', 'Tus derechos sobre tus datos']
];

function page(title: string, active: string, body: string, c: Company): string {
  const nav = NAV.map(([href, label]) => `<a href="${href}"${href === active ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | Zavela Store Colombia</title>
<meta name="robots" content="index,follow">
<style>
:root{color-scheme:light}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#1f2933;background:#f7f7f8;line-height:1.65;font-size:16px}
a{color:#4c1d95}
.skip{position:absolute;left:-999px;top:0;background:#111;color:#fff;padding:10px 14px;z-index:10}
.skip:focus{left:8px;top:8px}
header{background:#fff;border-bottom:1px solid #e5e7eb}
.bar{max-width:880px;margin:0 auto;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.brand{font-weight:900;letter-spacing:.08em;color:#111;text-decoration:none}
.back{font-weight:700;text-decoration:none;background:#111;color:#fff;padding:8px 14px;border-radius:999px;font-size:14px}
nav.legal{max-width:880px;margin:0 auto;padding:10px 18px;display:flex;gap:6px 14px;flex-wrap:wrap;font-size:14px}
nav.legal a{color:#374151}
nav.legal a[aria-current]{color:#111;font-weight:800;text-decoration:none}
main{max-width:880px;margin:0 auto;padding:22px 18px 40px}
article{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:26px 24px}
h1{font-size:28px;line-height:1.2;margin:0 0 6px;color:#111}
h2{font-size:19px;margin:28px 0 8px;color:#111}
p,li{margin:8px 0}
ul{padding-left:22px}
.muted{color:#4b5563;font-size:14px}
table{border-collapse:collapse;width:100%;font-size:14px;margin:10px 0}
th,td{border:1px solid #d1d5db;padding:8px 10px;text-align:left;vertical-align:top}
th{background:#f3f4f6}
form label{display:block;font-weight:700;margin:14px 0 4px}
form input,form select,form textarea{width:100%;padding:11px 12px;border:1px solid #6b7280;border-radius:10px;font:inherit;background:#fff}
form button{margin-top:18px;background:#111;color:#fff;border:0;border-radius:999px;padding:13px 22px;font-weight:800;font-size:16px;cursor:pointer}
.hp{position:absolute;left:-5000px}
footer{max-width:880px;margin:0 auto;padding:0 18px 40px;font-size:14px;color:#4b5563}
:focus-visible{outline:3px solid #4c1d95;outline-offset:2px}
</style></head><body>
<a class="skip" href="#contenido">Saltar al contenido</a>
<header><div class="bar"><a class="brand" href="/">ZAVELA STORE</a><a class="back" href="/">Volver a la tienda</a></div>
<nav class="legal" aria-label="Información legal">${nav}</nav></header>
<main id="contenido"><article>${body}</article></main>
<footer><p>${esc(c.name)}${c.nit ? ` · NIT ${esc(c.nit)}` : ''} · ${esc(c.address)} · <a href="mailto:${esc(c.email)}">${esc(c.email)}</a> · WhatsApp <a href="https://wa.me/${esc(c.whatsapp)}">${esc(c.phone)}</a></p></footer>
</body></html>`;
}

function responsable(c: Company): string {
  return `<strong>${esc(c.name)}</strong>${c.nit ? `, NIT ${esc(c.nit)}` : ''}, con domicilio en ${esc(c.address)}, sitio web https://zavelastore.com.co, correo electrónico <a href="mailto:${esc(c.email)}">${esc(c.email)}</a> y línea de atención WhatsApp ${esc(c.phone)}`;
}

function terms(c: Company): string {
  return `<h1>Términos y condiciones</h1><p class="muted">Última actualización: ${UPDATED}</p>
<h2 id="vendedor">1. Quién vende</h2>
<p>Los productos de este sitio son ofrecidos por ${responsable(c)} (en adelante, «Zavela Store»). Al hacer un pedido aceptas estos términos, la <a href="/politica-de-privacidad">política de privacidad</a> y la política de <a href="/politica-de-garantias">garantías, cambios y retracto</a>.</p>
<h2 id="mayores">2. Quién puede comprar</h2>
<p>Los pedidos son para personas mayores de 18 años con capacidad legal para contratar. Algunos productos de la sección +18 solo se muestran tras confirmar la mayoría de edad. Zavela Store no recolecta intencionalmente datos de menores de edad.</p>
<h2 id="precios">3. Precios e información de los productos</h2>
<p>Los precios están expresados en pesos colombianos (COP). Las fotos y descripciones son referenciales; las características principales se indican en cada ficha de producto. Cuando un producto aparece con un precio anterior tachado, ese es el precio real al que se vendió inmediatamente antes de la promoción, y se indica el nombre de la campaña y, cuando aplica, su fecha de fin.</p>
<h2 id="compra">4. Cómo se hace un pedido</h2>
<p>El pedido se hace desde el carrito, completando tus datos de entrega. Recibirás la confirmación y el número de guía para el seguimiento. Zavela Store puede comunicarse contigo por WhatsApp o teléfono para confirmar datos de entrega. Si un producto se agota o hay un error evidente de precio, te avisaremos y podrás elegir otro producto o cancelar el pedido sin costo.</p>
<h2 id="pago">5. Medios de pago</h2>
<ul><li><strong>Pago contra entrega:</strong> pagas en efectivo al recibir el pedido, sin recargo por esta modalidad.</li>
<li><strong>Pago en línea:</strong> a través de la pasarela ePayco. Zavela Store no recibe ni almacena los datos de tu tarjeta.</li></ul>
<h2 id="envios">6. Envíos y entrega</h2>
<p>Enviamos a todo el territorio nacional con transportadoras aliadas (Servientrega, Coordinadora, Interrapidísimo, Envía y TCC). El envío se muestra antes de confirmar el pedido; hoy es gratis a nivel nacional. Los pedidos se alistan en 24 horas hábiles; la entrega suele tomar de 1 a 2 días hábiles en ciudades principales y de 2 a 4 días hábiles en el resto del país. Son tiempos estimados y pueden variar por la transportadora o por situaciones de orden público o clima.</p>
<h2 id="retracto">7. Retracto, cambios y garantía</h2>
<p>Tienes derecho de retracto, garantía legal y garantía comercial, según lo explicado en la política de <a href="/politica-de-garantias">garantías, cambios y retracto</a>.</p>
<h2 id="pqr">8. Peticiones, quejas y reclamos</h2>
<p>Puedes escribirnos a <a href="mailto:${esc(c.email)}">${esc(c.email)}</a> o por WhatsApp al ${esc(c.phone)}. Respondemos en un máximo de 15 días hábiles. Si no quedas conforme, puedes acudir a la Superintendencia de Industria y Comercio (SIC): www.sic.gov.co, línea gratuita 018000 910165.</p>
<h2 id="propiedad">9. Propiedad intelectual</h2>
<p>Las marcas, logos, textos y diseños de este sitio pertenecen a sus titulares. No se pueden copiar ni usar sin autorización. Las imágenes de productos se muestran con fines informativos para la venta.</p>
<h2 id="datos">10. Datos personales y cookies</h2>
<p>El tratamiento de tus datos se explica en la <a href="/politica-de-privacidad">política de privacidad</a> y el uso de cookies en la <a href="/politica-de-cookies">política de cookies</a>.</p>
<h2 id="ley">11. Ley aplicable</h2>
<p>Estos términos se rigen por las leyes de la República de Colombia, en especial la Ley 1480 de 2011 (Estatuto del Consumidor) y la Ley 1581 de 2012.</p>`;
}

function privacy(c: Company): string {
  return `<h1>Política de privacidad y tratamiento de datos personales</h1><p class="muted">Última actualización: ${UPDATED}</p>
<p>Esta política cumple la Ley Estatutaria 1581 de 2012 (Habeas Data), el Decreto 1377 de 2013 y demás normas que los modifiquen.</p>
<h2 id="responsable">1. Responsable del tratamiento</h2>
<p>${responsable(c)}.</p>
<h2 id="datos">2. Qué datos recolectamos</h2>
<ul><li><strong>Para tu pedido:</strong> nombre, teléfono, correo electrónico, departamento, ciudad, dirección de entrega y los productos que compras.</li>
<li><strong>Si creas una cuenta:</strong> los datos anteriores y tu historial de pedidos.</li>
<li><strong>Si nos escribes:</strong> el contenido de tus mensajes por WhatsApp, correo o el chat del sitio (asistente de atención con inteligencia artificial).</li>
<li><strong>Datos técnicos:</strong> dispositivo, navegador y páginas visitadas, y, solo si aceptas las cookies de publicidad y medición, identificadores del píxel de TikTok.</li></ul>
<p>No solicitamos datos sensibles ni datos de menores de edad. Si crees que un menor nos entregó datos, escríbenos y los eliminamos.</p>
<h2 id="finalidades">3. Para qué los usamos</h2>
<ul><li>Procesar, confirmar, despachar y entregar tu pedido, y atender garantías, cambios y retractos.</li>
<li>Comunicarnos contigo sobre tu pedido (estado, guía, confirmación de datos).</li>
<li>Cumplir obligaciones legales, contables y tributarias.</li>
<li>Responder tus peticiones, quejas y reclamos.</li>
<li>Solo si lo autorizas: enviarte ofertas y novedades, y medir y mejorar nuestra publicidad. Puedes retirar esta autorización cuando quieras.</li></ul>
<h2 id="autorizacion">4. Autorización</h2>
<p>Al marcar la casilla de autorización al comprar o crear tu cuenta, nos autorizas de manera previa, expresa e informada a tratar tus datos para las finalidades de esta política. Guardamos la prueba de tu autorización.</p>
<h2 id="terceros">5. Con quién los compartimos</h2>
<table><thead><tr><th>Quién</th><th>Para qué</th></tr></thead><tbody>
<tr><td>Transportadoras (Servientrega, Coordinadora, Interrapidísimo, Envía, TCC)</td><td>Entregar tu pedido</td></tr>
<tr><td>Proveedores y plataforma logística (Dropi, DeRocha)</td><td>Alistar y despachar el producto</td></tr>
<tr><td>ePayco</td><td>Procesar pagos en línea (ellos tratan tus datos de pago)</td></tr>
<tr><td>Proveedor del asistente de atención (WAI, Artechclick)</td><td>Responder tus mensajes en el chat</td></tr>
<tr><td>TikTok (solo con tu consentimiento de cookies)</td><td>Medir y mejorar la publicidad</td></tr>
<tr><td>Autoridades</td><td>Cuando la ley lo exija</td></tr></tbody></table>
<p>Algunos de estos proveedores pueden estar fuera de Colombia, por lo que tus datos pueden transferirse o transmitirse al exterior. Exigimos a nuestros proveedores medidas de seguridad adecuadas. No vendemos tus datos.</p>
<h2 id="derechos">6. Tus derechos</h2>
<p>Como titular puedes: conocer, actualizar y rectificar tus datos; pedir prueba de la autorización; ser informado del uso que se les da; presentar quejas ante la Superintendencia de Industria y Comercio (SIC); revocar la autorización y pedir la supresión de tus datos cuando no exista un deber legal o contractual de conservarlos; y acceder gratis a tus datos.</p>
<h2 id="procedimiento">7. Cómo ejercer tus derechos</h2>
<p>Usa el formulario de <a href="/derechos-datos">tus derechos sobre tus datos</a> o escribe a <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>. Responderemos las consultas en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles, contados desde el día siguiente a su recepción. Si necesitamos más tiempo te lo informaremos con los motivos. Para tu seguridad podemos pedirte confirmar tu identidad.</p>
<h2 id="conservacion">8. Cuánto tiempo los conservamos</h2>
<p>Mientras exista tu relación con nosotros y durante el tiempo que exijan las normas comerciales, contables y tributarias. Después los suprimimos o anonimizamos.</p>
<h2 id="seguridad">9. Seguridad</h2>
<p>Aplicamos medidas técnicas y administrativas razonables para proteger tus datos, como acceso restringido con credenciales y conexión cifrada (HTTPS).</p>
<h2 id="cambios">10. Cambios</h2>
<p>Si cambiamos esta política publicaremos la nueva versión en esta página con su fecha.</p>`;
}

function returns(c: Company): string {
  return `<h1>Garantías, cambios, devoluciones y retracto</h1><p class="muted">Última actualización: ${UPDATED}</p>
<h2 id="retracto">1. Derecho de retracto (compras a distancia)</h2>
<p>Si compraste por este sitio, puedes retractarte de la compra dentro de los <strong>5 días hábiles siguientes a la entrega</strong> del producto, sin necesidad de explicar el motivo, según el artículo 47 de la Ley 1480 de 2011. Para ejercerlo, escríbenos con tu número de pedido. El producto debe devolverse en las mismas condiciones en que se recibió, sin uso y con sus empaques y accesorios. Los costos de transporte y devolución están a cargo del consumidor. Te devolvemos el dinero en máximo 30 días calendario desde que ejerces el derecho.</p>
<p>El retracto no aplica en los casos que la ley exceptúa, por ejemplo productos confeccionados o personalizados a tu medida, bienes que por su naturaleza no puedan ser devueltos o puedan deteriorarse con rapidez, y artículos de higiene personal o íntimos una vez abiertos o usados.</p>
<h2 id="garantia">2. Garantía</h2>
<p>Todos los productos tienen la <strong>garantía legal</strong> de la Ley 1480 de 2011: respondemos por la calidad, idoneidad y seguridad del producto. Además ofrecemos una <strong>garantía comercial de 30 días calendario</strong> desde la entrega por defectos de fabricación. Si el producto presenta una falla de fábrica, lo cambiamos por uno igual, lo reparamos o te devolvemos el dinero, según corresponda. La garantía no cubre daños por mal uso, golpes, humedad o manipulación indebida.</p>
<h2 id="como">3. Cómo pedir un cambio, garantía o devolución</h2>
<ol><li>Escríbenos por WhatsApp al ${esc(c.phone)} o a <a href="mailto:${esc(c.email)}">${esc(c.email)}</a> con tu número de pedido, una descripción y fotos o video del problema.</li>
<li>Te confirmamos la solución y, si hay que devolver el producto, te enviamos las instrucciones.</li>
<li>Al recibir y revisar el producto, hacemos el cambio o la devolución del dinero.</li></ol>
<p>Los reembolsos de pedidos pagados contra entrega se hacen por transferencia bancaria. Los de pagos en línea se devuelven por el mismo medio de pago.</p>
<h2 id="entrega">4. Si el pedido llega con daños o equivocado</h2>
<p>Revisa el paquete al recibirlo y avísanos el mismo día si llegó dañado, incompleto o diferente a lo pedido. Lo cambiamos sin costo para ti.</p>
<h2 id="preguntas-frecuentes">5. Preguntas frecuentes</h2>
<p><strong>¿Cuánto cuesta el envío?</strong> Hoy el envío es gratis a nivel nacional.</p>
<p><strong>¿Puedo pagar cuando me llegue?</strong> Sí, con pago contra entrega en efectivo.</p>
<p><strong>¿Cómo sigo mi pedido?</strong> Con tu número de guía en la opción «Rastrear mi pedido» de la tienda.</p>
<p><strong>¿A quién reclamo si no estoy conforme?</strong> A nosotros primero; y también puedes acudir a la SIC (www.sic.gov.co, 018000 910165).</p>`;
}

function cookies(c: Company): string {
  return `<h1>Política de cookies</h1><p class="muted">Última actualización: ${UPDATED}</p>
<p>Las cookies y el almacenamiento local son pequeños archivos o datos que tu navegador guarda. Aquí explicamos cuáles usa este sitio. Tú decides sobre las no esenciales en el aviso que aparece al entrar; puedes cambiar tu elección cuando quieras con el botón «Preferencias de cookies» al final de la tienda.</p>
<table><thead><tr><th>Tipo</th><th>Qué hace</th><th>Quién</th><th>¿Requiere tu permiso?</th></tr></thead><tbody>
<tr><td>Esenciales</td><td>Mantener tu carrito, tu sesión si inicias cuenta, la verificación de mayoría de edad y tu elección de cookies</td><td>Zavela Store</td><td>No</td></tr>
<tr><td>Funcionales</td><td>Chat de atención con asistente de IA y pasarela de pago en línea</td><td>WAI (Artechclick) y ePayco</td><td>No, son necesarias para el servicio que pides</td></tr>
<tr><td>Publicidad y medición</td><td>Medir visitas y compras para mejorar la publicidad (píxel de TikTok)</td><td>TikTok</td><td><strong>Sí.</strong> No se cargan hasta que aceptes</td></tr></tbody></table>
<p>Si eliges «Solo esenciales», no cargamos el píxel de TikTok. También puedes borrar o bloquear cookies desde la configuración de tu navegador; algunas partes del sitio podrían dejar de funcionar.</p>
<p>Más información sobre cómo tratamos tus datos en la <a href="/politica-de-privacidad">política de privacidad</a>. Dudas: <a href="mailto:${esc(c.email)}">${esc(c.email)}</a>.</p>`;
}

function rights(c: Company, sent?: { ok: boolean; id?: string; msg?: string }): string {
  const banner = sent
    ? `<p role="status" style="padding:12px 14px;border-radius:10px;background:${sent.ok ? '#ecfdf5' : '#fef2f2'};border:1px solid ${sent.ok ? '#10b981' : '#ef4444'}"><strong>${sent.ok ? 'Recibimos tu solicitud.' : 'No pudimos enviarla.'}</strong> ${esc(sent.ok ? `Tu número de radicado es ${sent.id}. Te responderemos en los plazos de la ley.` : sent.msg)}</p>`
    : '';
  return `<h1>Tus derechos sobre tus datos personales</h1>
<p>Usa este formulario para conocer, actualizar, rectificar o pedir la supresión de tus datos, o para revocar la autorización que nos diste. También puedes retirar tu suscripción a ofertas. Las consultas se responden en máximo 10 días hábiles y los reclamos en máximo 15 días hábiles. Más detalles en la <a href="/politica-de-privacidad#derechos">política de privacidad</a>.</p>
${banner}
<form method="post" action="/derechos-datos">
<label for="tipo">¿Qué quieres hacer?</label>
<select id="tipo" name="tipo" required>
<option value="consulta">Conocer qué datos tienen sobre mí</option>
<option value="actualizacion">Actualizar o corregir mis datos</option>
<option value="supresion">Eliminar mis datos</option>
<option value="revocatoria">Revocar mi autorización</option>
<option value="baja_ofertas">Dejar de recibir ofertas y mensajes</option>
<option value="reclamo">Presentar un reclamo</option>
</select>
<label for="nombre">Nombre completo</label><input id="nombre" name="nombre" required minlength="3" maxlength="80" autocomplete="name">
<label for="email">Correo electrónico</label><input id="email" name="email" type="email" maxlength="120" autocomplete="email">
<label for="telefono">Teléfono o WhatsApp con el que compraste</label><input id="telefono" name="telefono" maxlength="30" autocomplete="tel">
<label for="detalle">Cuéntanos tu solicitud</label><textarea id="detalle" name="detalle" rows="5" maxlength="2000"></textarea>
<div class="hp" aria-hidden="true"><label>No llenar<input name="website" tabindex="-1" autocomplete="off"></label></div>
<p class="muted">Indica al menos un correo o un teléfono para poder responderte. Podemos pedirte confirmar tu identidad antes de entregar o borrar datos.</p>
<button type="submit">Enviar solicitud</button></form>`;
}

// ───────── Páginas ─────────
const send = (res: any, html: string) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(html);
};

router.get(['/terminos-y-condiciones', '/terminos-y-condiciones/'], (_req, res) => { const c = company(); send(res, page('Términos y condiciones', '/terminos-y-condiciones', terms(c), c)); });
router.get(['/politica-de-privacidad', '/politica-de-privacidad/'], (_req, res) => { const c = company(); send(res, page('Política de privacidad', '/politica-de-privacidad', privacy(c), c)); });
router.get(['/politica-de-garantias', '/politica-de-garantias/', '/politica-de-reembolso', '/politica-de-devoluciones'], (_req, res) => { const c = company(); send(res, page('Garantías, cambios y retracto', '/politica-de-garantias', returns(c), c)); });
router.get(['/politica-de-cookies', '/politica-de-cookies/'], (_req, res) => { const c = company(); send(res, page('Política de cookies', '/politica-de-cookies', cookies(c), c)); });
router.get(['/derechos-datos', '/derechos-datos/'], (_req, res) => { const c = company(); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.send(page('Tus derechos sobre tus datos', '/derechos-datos', rights(c), c)); });

// ───────── Solicitudes de derechos sobre datos ─────────
const REQ_KEY = 'privacy_requests';
const TYPES = ['consulta', 'actualizacion', 'supresion', 'revocatoria', 'baja_ofertas', 'reclamo'];
const hits = new Map<string, number[]>();

async function readRequests(): Promise<any[]> {
  try {
    const [rows]: any = await pool.query('SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1', [REQ_KEY]);
    if (Array.isArray(rows) && rows[0]?.valor) { const l = JSON.parse(rows[0].valor); return Array.isArray(l) ? l : []; }
  } catch { /* sin datos */ }
  return [];
}

export async function listPrivacyRequests(): Promise<any[]> { return readRequests(); }

export async function updatePrivacyRequest(id: string, patch: { status?: string; note?: string }): Promise<boolean> {
  const list = await readRequests();
  const i = list.findIndex(r => String(r.id) === String(id));
  if (i < 0) return false;
  if (patch.status && ['recibida', 'en_proceso', 'resuelta'].includes(patch.status)) list[i].status = patch.status;
  if (typeof patch.note === 'string') list[i].note = patch.note.slice(0, 1000);
  if (list[i].status === 'resuelta' && !list[i].resolvedAt) list[i].resolvedAt = new Date().toISOString();
  await pool.query(
    `INSERT INTO configuraciones (clave, valor, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()`,
    [REQ_KEY, JSON.stringify(list)]
  );
  return true;
}

async function saveRequest(b: any, ip: string): Promise<{ ok: boolean; id?: string; msg?: string }> {
  if (String(b.website || '').trim()) return { ok: true, id: 'SD-0000' }; // trampa para bots: se ignora en silencio
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  if (recent.length >= 5) return { ok: false, msg: 'Enviaste varias solicitudes seguidas. Intenta de nuevo en una hora o escríbenos por WhatsApp.' };
  const tipo = TYPES.includes(String(b.tipo)) ? String(b.tipo) : 'consulta';
  const nombre = String(b.nombre || '').trim().slice(0, 80);
  const email = String(b.email || '').trim().slice(0, 120);
  const telefono = String(b.telefono || '').trim().slice(0, 30);
  const detalle = String(b.detalle || '').trim().slice(0, 2000);
  if (nombre.length < 3) return { ok: false, msg: 'Escribe tu nombre completo.' };
  if (!email && !telefono) return { ok: false, msg: 'Indica un correo o un teléfono para poder responderte.' };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, msg: 'El correo no parece válido.' };
  recent.push(now); hits.set(ip, recent);
  const list = await readRequests();
  const id = `SD-${new Date().getFullYear()}-${String(list.length + 1).padStart(4, '0')}`;
  list.unshift({ id, createdAt: new Date().toISOString(), tipo, nombre, email, telefono, detalle, status: 'recibida' });
  await pool.query(
    `INSERT INTO configuraciones (clave, valor, updated_at) VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE valor = VALUES(valor), updated_at = NOW()`,
    [REQ_KEY, JSON.stringify(list.slice(0, 500))]
  );
  try { db.addLog({ type: 'SECURITY', action: 'Solicitud de datos personales', details: `${id}: ${tipo}`, status: 'success' } as any); } catch { /* opcional */ }
  return { ok: true, id };
}

router.post('/derechos-datos', async (req, res) => {
  const c = company();
  try {
    const r = await saveRequest(req.body || {}, String(req.ip || ''));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(r.ok ? 200 : 400).send(page('Tus derechos sobre tus datos', '/derechos-datos', rights(c, r), c));
  } catch {
    res.status(500).send(page('Tus derechos sobre tus datos', '/derechos-datos', rights(c, { ok: false, msg: `No pudimos registrar tu solicitud. Escríbenos a ${c.email}.` }), c));
  }
});

router.post('/api/privacy/request', async (req, res) => {
  try {
    const b = req.body || {};
    const r = await saveRequest({ tipo: b.tipo, nombre: b.nombre || b.name, email: b.email, telefono: b.telefono || b.phone, detalle: b.detalle || b.message, website: b.website }, String(req.ip || ''));
    res.status(r.ok ? 201 : 400).json({ success: r.ok, id: r.id, message: r.msg });
  } catch {
    res.status(500).json({ success: false, message: 'No se pudo registrar la solicitud.' });
  }
});

export default router;
