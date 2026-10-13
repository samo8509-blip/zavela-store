import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const BACKUP_FILE = path.join(DATA_DIR, 'dropi_backup.json');

/**
 * Servicio de Respaldo Local Permanente para IDs de Dropi
 * Exclusivamente mapea productId -> dropi_product_id de productos existentes.
 * NUNCA inserta productos falsos de prueba ni restaura productos que hayan sido eliminados.
 */
class DropiBackupService {
  private ensureDirectory(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch (err: any) {
      console.warn('[DropiBackupService] Error creando directorio server/data:', err.message);
    }
  }

  /**
   * Obtiene el mapa de respaldos { [productId]: dropiProductId }
   */
  public getBackupMap(): Record<string, string> {
    this.ensureDirectory();
    try {
      if (fs.existsSync(BACKUP_FILE)) {
        const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, string>;
        }
      }
    } catch (err: any) {
      console.warn('[DropiBackupService] Error leyendo dropi_backup.json:', err.message);
    }
    return {};
  }

  /**
   * Guarda o actualiza un ID de Dropi para un producto específico
   */
  public saveDropiId(productId: string, dropiProductId: string): void {
    if (!productId || typeof productId !== 'string') return;
    const cleanDropiId = String(dropiProductId || '').trim();
    if (!cleanDropiId) return;

    this.ensureDirectory();
    try {
      const map = this.getBackupMap();
      map[productId.trim()] = cleanDropiId;
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(map, null, 2), 'utf-8');
    } catch (err: any) {
      console.error('[DropiBackupService] Error guardando dropi_backup.json:', err.message);
    }
  }

  /**
   * Elimina definitivamente el ID de Dropi de un producto eliminado.
   * Garantiza que el producto jamás sea restaurado o re-vinculado tras reiniciar el servidor.
   */
  public removeDropiId(productId: string): void {
    if (!productId || typeof productId !== 'string') return;
    this.ensureDirectory();
    try {
      const map = this.getBackupMap();
      const pId = productId.trim();
      if (map[pId]) {
        delete map[pId];
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(map, null, 2), 'utf-8');
        console.log(`[DropiBackupService] ✓ Respaldo Dropi purgado para producto eliminado: ${pId}`);
      }
    } catch (err: any) {
      console.error('[DropiBackupService] Error purgando dropi_backup.json:', err.message);
    }
  }

  /**
   * Guarda múltiples IDs de Dropi en lote
   */
  public saveBulk(entries: Record<string, string>): void {
    if (!entries || typeof entries !== 'object') return;
    this.ensureDirectory();
    try {
      const map = this.getBackupMap();
      let changed = false;
      for (const [pId, dId] of Object.entries(entries)) {
        const clean = String(dId || '').trim();
        if (clean && map[pId] !== clean) {
          map[pId] = clean;
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(BACKUP_FILE, JSON.stringify(map, null, 2), 'utf-8');
      }
    } catch (err: any) {
      console.error('[DropiBackupService] Error en guardado en lote:', err.message);
    }
  }

  /**
   * Sincronización pasiva: NUNCA inserta productos de prueba si la lista está vacía.
   * Solo asigna el código dropi_product_id a productos ya existentes físicamente en la BD.
   */
  public restoreProducts(products: any[]): number {
    // Si la lista está vacía o nula, NUNCA inyecta productos falsos de prueba
    if (!Array.isArray(products) || products.length === 0) return 0;
    const map = this.getBackupMap();
    if (Object.keys(map).length === 0) return 0;

    let restoredCount = 0;
    for (const p of products) {
      if (!p || typeof p !== 'object') continue;
      const id = String(p.id || (p as any).productId || '').trim();
      const currentDropi = p.dropi_product_id ? String(p.dropi_product_id).trim() : (p.dropiProductId ? String(p.dropiProductId).trim() : '');

      if (!currentDropi && map[id]) {
        p.dropi_product_id = map[id];
        p.dropiProductId = map[id];
        restoredCount++;
      }
    }
    return restoredCount;
  }
}

export const dropiBackupService = new DropiBackupService();
