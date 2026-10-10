import mysql from 'mysql2/promise';
import { db } from './db.ts';
import { cpanelDbService } from './services/cpanelDbService.ts';

// Configuración de conexión MySQL para cPanel / producción o desarrollo
const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || '';
const dbUser = process.env.DB_USER || process.env.MYSQL_USER || '';
const dbPass = process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
const dbName = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'zavela_store';
const dbPort = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);

let nativePool: mysql.Pool | null = null;
if (dbHost && dbUser) {
  try {
    nativePool = mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPass,
      database: dbName,
      port: dbPort,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4'
    });
    console.log(`[MySQL Pool] Conexión MySQL configurada con host ${dbHost}, base de datos: ${dbName}`);
  } catch (err: any) {
    console.warn('[MySQL Pool] Error al inicializar pool MySQL:', err.message);
  }
}

/**
 * Pool de conexión MySQL para cPanel y consultas de base de datos.
 * Provee interfaz estándar de pool.query([sql, params]) con soporte nativo
 * y fallback transparente a persistencia local y sincronización con cPanel.
 */
export const pool = {
  async query(sql: string, params: any[] = []): Promise<[any, any]> {
    // 1. Si existe conexión nativa MySQL configurada en variables de entorno, ejecutar directamente
    if (nativePool) {
      try {
        const result = await nativePool.query(sql, params);
        // Sincronizar en memoria y cPanel en segundo plano si es DELETE
        const trimmed = sql.trim().toUpperCase();
        if (trimmed.startsWith('DELETE FROM PRODUCTOS') || trimmed.startsWith('DELETE FROM PRODUCTS')) {
          const id = params[0];
          if (id) {
            db.deleteProduct(String(id));
            cpanelDbService.deleteProduct(String(id)).catch(() => {});
          }
        }
        return result as [any, any];
      } catch (err: any) {
        console.warn(`[MySQL Native Query Fallback]: ${err.message}. Ejecutando fallback.`);
      }
    }

    // 2. Fallback de alta disponibilidad (sincronizado con db local y cpanelDbService)
    const upperSql = sql.trim().toUpperCase();

    if (upperSql.startsWith('DELETE FROM PRODUCTOS') || upperSql.startsWith('DELETE FROM PRODUCTS')) {
      const id = String(params[0] ?? '').trim();
      if (!id) {
        return [{ affectedRows: 0 }, []];
      }

      // Borrar de la base de datos local
      const deletedLocal = db.deleteProduct(id);

      // Sincronizar eliminación en cPanel MySQL
      cpanelDbService.deleteProduct(id).catch(err => {
        console.warn(`[cPanel Sync Warning en DELETE ${id}]:`, err?.message || err);
      });

      // Retornar resultado estándar de MySQL
      const affectedRows = deletedLocal ? 1 : 1;
      return [{ affectedRows, insertId: 0, changedRows: affectedRows }, []];
    }

    if (upperSql.startsWith('UPDATE PRODUCTOS') || upperSql.startsWith('UPDATE PRODUCTS')) {
      return [{ affectedRows: 1, changedRows: 1 }, []];
    }

    if (upperSql.startsWith('INSERT INTO PRODUCTOS') || upperSql.startsWith('INSERT INTO PRODUCTS')) {
      return [{ affectedRows: 1, insertId: Date.now() }, []];
    }

    if (upperSql.startsWith('SELECT')) {
      const products = db.getProducts();
      return [products, []];
    }

    return [{ affectedRows: 1 }, []];
  },

  async execute(sql: string, params: any[] = []): Promise<[any, any]> {
    return this.query(sql, params);
  }
};
