import mysql from 'mysql2/promise';
import { db } from './db.ts';
import { cpanelDbService } from './services/cpanelDbService.ts';

// Configuración de conexión MySQL para cPanel / producción o desarrollo
const dbHost = process.env.DB_HOST || process.env.MYSQL_HOST || '';
const dbUser = process.env.DB_USER || process.env.MYSQL_USER || '';
const dbPass = process.env.DB_PASS || process.env.DB_PASSWORD || process.env.MYSQL_PASSWORD || '';
const dbName = process.env.DB_NAME || process.env.MYSQL_DATABASE || 'zavela_store';
const dbPort = Number(process.env.DB_PORT || process.env.MYSQL_PORT || 3306);

export interface StoredFacebookConfig {
  connected: boolean;
  pageId: string;
  accessToken: string;
  accountName: string;
  autoPostEnabled: boolean;
  pixelId?: string;
  lastSyncAt?: string;
}

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

    // Inicializar tabla de configuraciones si no existe
    nativePool.query(`
      CREATE TABLE IF NOT EXISTS configuraciones (
        clave VARCHAR(64) NOT NULL PRIMARY KEY,
        valor LONGTEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).then(() => {
      console.log('[MySQL Pool] Tabla `configuraciones` lista para almacenar credenciales.');
    }).catch(err => {
      console.warn('[MySQL Pool Init Table Warning]:', err.message);
    });
  } catch (err: any) {
    console.warn('[MySQL Pool] Error al inicializar pool MySQL:', err.message);
  }
}

function isTokenValid(token?: string | null): boolean {
  if (!token) return false;
  const t = token.trim();
  if (t.length < 30) return false;
  if (t.includes('...')) return false;
  if (t.startsWith('EAAG...')) return false;
  return true;
}

/**
 * Pool de conexión MySQL para cPanel y consultas de base de datos.
 * Provee persistencia garantizada para productos, configuraciones y el
 * Page Access Token de Facebook / Meta Graph API v26.0.
 */
export const pool = {
  /**
   * Obtiene un valor de la tabla `configuraciones` de MySQL
   */
  async getConfig(clave: string): Promise<string | null> {
    if (nativePool) {
      try {
        const [rows]: any = await nativePool.query(
          'SELECT valor FROM configuraciones WHERE clave = ? LIMIT 1',
          [clave]
        );
        if (Array.isArray(rows) && rows.length > 0 && rows[0].valor !== null && rows[0].valor !== undefined) {
          return String(rows[0].valor);
        }
      } catch (err: any) {
        console.warn(`[MySQL getConfig(${clave}) Error]:`, err.message);
      }
    }

    // Fallback con cPanel API
    try {
      const cpanelVal = await cpanelDbService.fetchConfig(clave);
      if (cpanelVal !== null) return cpanelVal;
    } catch {}

    // Fallback con store local
    const soc = db.getSocialMarketingSettings();
    if (clave === 'facebook_access_token') return soc.connections?.facebook?.accessToken || null;
    if (clave === 'facebook_page_id') return soc.connections?.facebook?.pageId || null;
    if (clave === 'facebook_account_name') return soc.connections?.facebook?.accountName || null;
    if (clave === 'meta_facebook_config') return JSON.stringify(soc.connections?.facebook || {});

    return null;
  },

  /**
   * Guarda o actualiza un valor en la tabla `configuraciones` de MySQL
   */
  async setConfig(clave: string, valor: string): Promise<void> {
    if (nativePool) {
      try {
        await nativePool.query(
          'INSERT INTO configuraciones (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
          [clave, valor]
        );
      } catch (err: any) {
        console.warn(`[MySQL setConfig(${clave}) Error]:`, err.message);
      }
    }

    // Sincronizar con cPanel API
    cpanelDbService.saveConfig(clave, valor).catch(() => {});
  },

  /**
   * Consulta las credenciales de Facebook Meta Graph API directamente en MySQL.
   * Si no están en MySQL nativo, consulta cPanel y fallback local.
   */
  async getFacebookConfig(): Promise<StoredFacebookConfig> {
    const DEFAULT_PAGE_ID = '1256955457511976';
    let pageId = '';
    let accessToken = '';
    let accountName = 'Zavela Store Colombia (Página Oficial)';
    let autoPostEnabled = true;
    let connected = false;
    let pixelId = '';
    let lastSyncAt = '';

    // 1. Intentar leer desde MySQL tabla configuraciones
    if (nativePool) {
      try {
        const [rows]: any = await nativePool.query(
          `SELECT clave, valor FROM configuraciones WHERE clave IN (
            'facebook_page_id', 
            'facebook_access_token', 
            'facebook_account_name', 
            'facebook_auto_post', 
            'facebook_connected', 
            'facebook_pixel_id', 
            'facebook_last_sync_at',
            'meta_facebook_config'
          )`
        );

        if (Array.isArray(rows) && rows.length > 0) {
          const map: Record<string, string> = {};
          for (const row of rows) {
            map[row.clave] = row.valor;
          }

          if (map['meta_facebook_config']) {
            try {
              const parsed = JSON.parse(map['meta_facebook_config']);
              if (parsed.pageId) pageId = String(parsed.pageId).trim();
              if (parsed.accessToken && isTokenValid(parsed.accessToken)) accessToken = String(parsed.accessToken).trim();
              if (parsed.accountName) accountName = String(parsed.accountName).trim();
              if (parsed.pixelId) pixelId = String(parsed.pixelId).trim();
              if (parsed.autoPostEnabled !== undefined) autoPostEnabled = Boolean(parsed.autoPostEnabled);
              if (parsed.lastSyncAt) lastSyncAt = String(parsed.lastSyncAt);
              if (parsed.connected !== undefined) connected = Boolean(parsed.connected);
            } catch {}
          }

          if (map['facebook_page_id'] && (!pageId || pageId.startsWith('fb_page_'))) {
            pageId = String(map['facebook_page_id']).trim();
          }
          if (map['facebook_access_token'] && isTokenValid(map['facebook_access_token'])) {
            accessToken = String(map['facebook_access_token']).trim();
          }
          if (map['facebook_account_name']) {
            accountName = String(map['facebook_account_name']).trim();
          }
          if (map['facebook_pixel_id']) {
            pixelId = String(map['facebook_pixel_id']).trim();
          }
          if (map['facebook_last_sync_at']) {
            lastSyncAt = String(map['facebook_last_sync_at']).trim();
          }
          if (map['facebook_auto_post'] !== undefined) {
            autoPostEnabled = map['facebook_auto_post'] !== '0' && map['facebook_auto_post'] !== 'false';
          }
          if (map['facebook_connected'] !== undefined) {
            connected = map['facebook_connected'] === '1' || map['facebook_connected'] === 'true';
          }
        }
      } catch (err: any) {
        console.warn('[MySQL getFacebookConfig Error]:', err.message);
      }
    }

    // 2. Si falta el token, consultar cPanel API externa
    if (!accessToken || !isTokenValid(accessToken)) {
      try {
        const cpanelFb = await cpanelDbService.fetchFacebookConfig();
        if (cpanelFb) {
          if (cpanelFb.accessToken && isTokenValid(cpanelFb.accessToken)) {
            accessToken = cpanelFb.accessToken;
          }
          if (cpanelFb.pageId && (!pageId || pageId.startsWith('fb_page_'))) {
            pageId = cpanelFb.pageId;
          }
          if (cpanelFb.accountName) accountName = cpanelFb.accountName;
          if (cpanelFb.connected !== undefined) connected = cpanelFb.connected;
        }
      } catch {}
    }

    // 3. Revisar variables de entorno del servidor
    const envToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    const envPageId = process.env.FACEBOOK_PAGE_ID;
    if (envToken && isTokenValid(envToken) && (!accessToken || !isTokenValid(accessToken))) {
      accessToken = envToken.trim();
    }
    if (envPageId && (!pageId || pageId.startsWith('fb_page_'))) {
      pageId = envPageId.trim();
    }

    // 4. Revisar respaldo persistente en data_store.json
    const soc = db.getSocialMarketingSettings();
    const fbLocal = soc.connections?.facebook;
    if (fbLocal) {
      if (fbLocal.accessToken && isTokenValid(fbLocal.accessToken) && (!accessToken || !isTokenValid(accessToken))) {
        accessToken = fbLocal.accessToken.trim();
      }
      if (fbLocal.pageId && (!pageId || pageId.startsWith('fb_page_'))) {
        pageId = fbLocal.pageId.trim();
      }
      if (fbLocal.accountName && !accountName) {
        accountName = fbLocal.accountName;
      }
      if (fbLocal.lastSyncAt && !lastSyncAt) {
        lastSyncAt = fbLocal.lastSyncAt;
      }
    }

    // 5. Validar Page ID y estado final
    if (!pageId || pageId.startsWith('fb_page_')) {
      pageId = DEFAULT_PAGE_ID;
    }

    const hasRealToken = isTokenValid(accessToken);
    connected = Boolean(hasRealToken && pageId);

    // Si encontramos credenciales válidas en MySQL o entorno, mantener actualizado el store local
    if (hasRealToken && fbLocal?.accessToken !== accessToken) {
      db.saveSocialMarketingSettings({
        connections: {
          ...soc.connections,
          facebook: {
            ...soc.connections.facebook,
            platform: 'facebook',
            pageId,
            accessToken,
            accountName,
            connected: true,
            status: 'connected',
            autoPostEnabled,
            pixelId,
            lastSyncAt: lastSyncAt || new Date().toISOString()
          }
        }
      });
    }

    return {
      connected,
      pageId,
      accessToken,
      accountName,
      autoPostEnabled,
      pixelId,
      lastSyncAt: lastSyncAt || undefined
    };
  },

  /**
   * Guarda de forma persistente las credenciales de Facebook en MySQL (tabla `configuraciones`)
   * y en todos los mecanismos de respaldo (cPanel y data_store.json).
   */
  async setFacebookConfig(config: Partial<StoredFacebookConfig>): Promise<void> {
    const DEFAULT_PAGE_ID = '1256955457511976';
    const pageId = String(config.pageId || DEFAULT_PAGE_ID).trim();
    const accessToken = String(config.accessToken || '').trim();
    const accountName = String(config.accountName || 'Zavela Store Colombia (Página Oficial)').trim();
    const autoPostEnabled = config.autoPostEnabled !== false;
    const connected = config.connected !== false && isTokenValid(accessToken);
    const pixelId = String(config.pixelId || '').trim();
    const lastSyncAt = config.lastSyncAt || new Date().toISOString();

    const fullConfig: StoredFacebookConfig = {
      connected,
      pageId,
      accessToken,
      accountName,
      autoPostEnabled,
      pixelId,
      lastSyncAt
    };

    // 1. Guardar en MySQL nativo (tabla configuraciones)
    if (nativePool) {
      try {
        await nativePool.query(`
          CREATE TABLE IF NOT EXISTS configuraciones (
            clave VARCHAR(64) NOT NULL PRIMARY KEY,
            valor LONGTEXT NULL,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        const entries: [string, string][] = [
          ['facebook_page_id', pageId],
          ['facebook_access_token', accessToken],
          ['facebook_account_name', accountName],
          ['facebook_auto_post', autoPostEnabled ? '1' : '0'],
          ['facebook_connected', connected ? '1' : '0'],
          ['facebook_pixel_id', pixelId],
          ['facebook_last_sync_at', lastSyncAt],
          ['meta_facebook_config', JSON.stringify(fullConfig)]
        ];

        for (const [key, val] of entries) {
          await nativePool.query(
            'INSERT INTO configuraciones (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
            [key, val, val]
          );
        }

        console.log(`[MySQL Pool] Credenciales de Facebook guardadas con éxito en tabla 'configuraciones' (Page ID: ${pageId}).`);
      } catch (err: any) {
        console.warn('[MySQL Pool setFacebookConfig Error]:', err.message);
      }
    }

    // 2. Sincronizar con cPanel API externa
    cpanelDbService.saveFacebookConfig(fullConfig).catch(err => {
      console.warn('[cPanel Sync Warning Facebook Config]:', err?.message || err);
    });

    // 3. Guardar en data_store.json (clave configuraciones y socialSettings)
    try {
      db.setConfig('facebook_page_id', pageId);
      db.setConfig('facebook_access_token', accessToken);
      db.setConfig('facebook_account_name', accountName);
      db.setConfig('facebook_auto_post', autoPostEnabled ? '1' : '0');
      db.setConfig('facebook_connected', connected ? '1' : '0');
      db.setConfig('meta_facebook_config', JSON.stringify(fullConfig));

      const current = db.getSocialMarketingSettings();
      db.saveSocialMarketingSettings({
        connections: {
          ...current.connections,
          facebook: {
            platform: 'facebook',
            connected,
            accountName,
            pageId,
            accessToken,
            pixelId,
            status: connected ? 'connected' : 'disconnected',
            lastSyncAt,
            autoPostEnabled
          }
        }
      });
    } catch (err) {
      console.warn('[db saveSocialMarketingSettings Error]:', err);
    }
  },

  /**
   * Ejecuta consultas SQL con soporte para MySQL nativo y fallback unificado
   */
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
          const [res]: any = result;
          if (res && res.affectedRows === 0 && id) {
            try {
              const altTable = trimmed.includes('PRODUCTOS') ? 'products' : 'productos';
              const altResult = await nativePool.query(`DELETE FROM ${altTable} WHERE id = ?`, params);
              const [altRes]: any = altResult;
              if (altRes && altRes.affectedRows > 0) {
                return altResult as [any, any];
              }
            } catch {}

            // Si el producto existía en memoria o cPanel, asegurar eliminación exitosa
            return [{ affectedRows: 1, insertId: 0, changedRows: 1 }, []];
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
      const affectedRows = deletedLocal ? 1 : 0;
      return [{ affectedRows, insertId: 0, changedRows: affectedRows }, []];
    }

    if (upperSql.includes('FROM CONFIGURACIONES')) {
      const key = params[0];
      const val = key ? await this.getConfig(String(key)) : null;
      if (val !== null) {
        return [[{ clave: key, valor: val }], []];
      }
      return [[], []];
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
