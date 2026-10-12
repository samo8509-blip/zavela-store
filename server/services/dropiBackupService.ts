import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const BACKUP_FILE = path.join(DATA_DIR, 'dropi_backup.json');

/**
 * Servicio de Respaldo Local Permanente para IDs de Dropi
 * Garantiza que ante reinicios de servidor, nuevos despliegues o base de datos en blanco,
 * los IDs de Dropi (dropi_product_id) asignados a cada producto nunca se pierdan.
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
   * Obtiene el mapa completo de respaldos { [productId]: dropiProductId }
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
    if (!cleanDropiId) return; // No sobreescribir con valor vacío

    this.ensureDirectory();
    try {
      const map = this.getBackupMap();
      map[productId.trim()] = cleanDropiId;
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(map, null, 2), 'utf-8');
      console.log(`[DropiBackupService] ✓ Respaldo Dropi guardado: ${productId} -> ${cleanDropiId}`);
    } catch (err: any) {
      console.error('[DropiBackupService] Error guardando dropi_backup.json:', err.message);
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
        console.log(`[DropiBackupService] ✓ Respaldo en lote guardado con ${Object.keys(map).length} productos.`);
      }
    } catch (err: any) {
      console.error('[DropiBackupService] Error en guardado en lote:', err.message);
    }
  }

  /**
   * Restaura automáticamente los IDs de Dropi en una lista de productos
   * si algún producto los tiene vacíos o indefinidos.
   */
  public restoreProducts(products: any[]): number {
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

    if (restoredCount > 0) {
      console.log(`[DropiBackupService] ✓ Restaurados ${restoredCount} códigos Dropi desde respaldo dropi_backup.json`);
    }
    return restoredCount;
  }
}

export const dropiBackupService = new DropiBackupService();
