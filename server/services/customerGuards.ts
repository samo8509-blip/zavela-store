/**
 * El servicio de cPanel (api.php) no tiene sección de clientes: ante `?action=clientes`
 * devuelve el catálogo de productos. Estas reglas descartan cualquier registro que sea un producto.
 */
const PRODUCT_KEYS = ['precio', 'price', 'sku', 'slug', 'stock', 'images', 'imagenes', 'imagen', 'image', 'variants', 'variantes', 'title', 'titulo'];

export function looksLikeProduct(item: any): boolean {
  if (!item || typeof item !== 'object') return false;
  if (/^prod[-_]/i.test(String(item.id ?? ''))) return true;
  return PRODUCT_KEYS.some(k => Object.prototype.hasOwnProperty.call(item, k) && item[k] !== null && item[k] !== undefined && item[k] !== '');
}
