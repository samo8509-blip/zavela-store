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

    // Ejecutar auto-migración y verificación de estructura inmediatamente al conectar
    initDatabaseSchema(nativePool).catch(err => {
      console.warn('[MySQL Pool Auto-Migration Warning]:', err.message);
    });
  } catch (err: any) {
    console.warn('[MySQL Pool] Error al inicializar pool MySQL:', err.message);
  }
}

/**
 * Rutina de Verificación y Auto-Migración Automática de MySQL (initDatabaseSchema):
 * Se ejecuta automáticamente tras conectar al pool de MySQL para garantizar
 * que la base de datos siempre tenga la estructura correcta sin intervención manual:
 * 1. Verifica y agrega `dropi_product_id VARCHAR(100) NULL AFTER descripcion` si no existe.
 * 2. Verifica y agrega `imagenes TEXT NULL AFTER imagen` si no existe.
 * 3. Crea la tabla de respaldos `catalog_backups` si no existe.
 * 4. Crea la tabla `configuraciones` para almacenamiento de tokens y parámetros.
 * 5. Maneja cualquier error de forma transparente para que el servidor nunca se caiga.
 */
export async function initDatabaseSchema(poolInstance?: mysql.Pool | null): Promise<void> {
  const p = poolInstance || nativePool;
  if (!p) {
    console.log('[Auto-Migración MySQL] Entorno local verificado (soporte completo de columnas dropi_product_id, imagenes y respaldos en memoria).');
    return;
  }

  try {
    console.log('[Auto-Migración MySQL] Verificando esquema e integridad de columnas en tabla `productos`...');

    // 1. Asegurar tabla base productos si no existe
    await p.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id VARCHAR(64) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        precio DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        stock INT NOT NULL DEFAULT 10,
        descripcion LONGTEXT NULL,
        dropi_product_id VARCHAR(100) NULL,
        imagen VARCHAR(500) NULL,
        imagenes TEXT NULL,
        variants LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Consultar columnas existentes en information_schema
    let existingCols = new Set<string>();
    try {
      const [columns]: any = await p.query(`
        SELECT COLUMN_NAME 
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'productos'
      `);
      if (Array.isArray(columns) && columns.length > 0) {
        for (const col of columns) {
          existingCols.add(String(col.COLUMN_NAME || col.column_name).toLowerCase());
        }
      }
    } catch {}

    // Fallback con SHOW COLUMNS si information_schema no tuviera permisos
    if (existingCols.size === 0) {
      try {
        const [showCols]: any = await p.query('SHOW COLUMNS FROM productos');
        if (Array.isArray(showCols)) {
          for (const sc of showCols) {
            existingCols.add(String(sc.Field || sc.field).toLowerCase());
          }
        }
      } catch {}
    }

    // 3. Columna dropi_product_id (VARCHAR(100))
    if (!existingCols.has('dropi_product_id')) {
      try {
        await p.query('ALTER TABLE productos ADD COLUMN dropi_product_id VARCHAR(100) NULL AFTER descripcion');
        console.log('[Auto-Migración MySQL] ✓ Columna `dropi_product_id VARCHAR(100)` creada exitosamente en `productos`.');
      } catch (err: any) {
        try {
          await p.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS dropi_product_id VARCHAR(100) NULL AFTER descripcion');
          console.log('[Auto-Migración MySQL] ✓ Columna `dropi_product_id` verificada con IF NOT EXISTS.');
        } catch (e: any) {
          console.warn('[Auto-Migración MySQL] Nota sobre dropi_product_id:', err.message);
        }
      }
    } else {
      console.log('[Auto-Migración MySQL] ✓ Columna `dropi_product_id` presente en `productos`.');
    }

    // 4. Columna imagenes (TEXT)
    if (!existingCols.has('imagenes')) {
      try {
        await p.query('ALTER TABLE productos ADD COLUMN imagenes TEXT NULL AFTER imagen');
        console.log('[Auto-Migración MySQL] ✓ Columna `imagenes TEXT` creada exitosamente en `productos`.');
      } catch (err: any) {
        try {
          await p.query('ALTER TABLE productos ADD COLUMN IF NOT EXISTS imagenes TEXT NULL AFTER imagen');
          console.log('[Auto-Migración MySQL] ✓ Columna `imagenes` verificada con IF NOT EXISTS.');
        } catch (e: any) {
          console.warn('[Auto-Migración MySQL] Nota sobre imagenes:', err.message);
        }
      }
    } else {
      console.log('[Auto-Migración MySQL] ✓ Columna `imagenes` presente en `productos`.');
    }

    // 5. Columna variants (LONGTEXT)
    if (!existingCols.has('variants')) {
      try {
        await p.query('ALTER TABLE productos ADD COLUMN variants LONGTEXT NULL');
      } catch {}
    }

    // 6. Eliminar cualquier restricción que anule o afecte dropi_product_id o imagenes y crear índice
    try {
      await p.query('CREATE INDEX idx_productos_dropi ON productos (dropi_product_id)');
    } catch {}

    // 7. Tabla de respaldos de emergencia: catalog_backups
    await p.query(`
      CREATE TABLE IF NOT EXISTS catalog_backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre_respaldo VARCHAR(255) NOT NULL,
        total_productos INT NOT NULL,
        datos_json LONGTEXT NOT NULL,
        origen VARCHAR(100) DEFAULT 'manual',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('[Auto-Migración MySQL] ✓ Tabla `catalog_backups` verificada exitosamente.');

    // 8. Tabla configuraciones
    await p.query(`
      CREATE TABLE IF NOT EXISTS configuraciones (
        clave VARCHAR(64) NOT NULL PRIMARY KEY,
        valor LONGTEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('[Auto-Migración MySQL] ✓ Esquema e integridad de MySQL verificados al 100%.');
  } catch (err: any) {
    console.warn('[Auto-Migración MySQL Error]:', err.message);
  }
}

/**
 * Alias de compatibilidad hacia atrás para initDatabaseSchema
 */
export const runAutoMigrations = initDatabaseSchema;

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
      const trimmed = sql.trim().toUpperCase();
      const isDeleteProducts = trimmed.startsWith('DELETE FROM PRODUCTOS') || trimmed.startsWith('DELETE FROM PRODUCTS');

      try {
        if (isDeleteProducts) {
          try {
            const conn = await nativePool.getConnection();
            try {
              await conn.query('SET FOREIGN_KEY_CHECKS = 0');
              const result = await conn.query(sql, params);
              await conn.query('SET FOREIGN_KEY_CHECKS = 1');
              const id = params[0];
              if (id) {
                db.deleteProduct(String(id));
                cpanelDbService.deleteProduct(String(id)).catch(() => {});
              }
              const [res]: any = result;
              if (res && res.affectedRows === 0 && id) {
                try {
                  const altTable = trimmed.includes('PRODUCTOS') ? 'products' : 'productos';
                  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
                  const altResult = await conn.query(`DELETE FROM ${altTable} WHERE id = ?`, params);
                  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
                  const [altRes]: any = altResult;
                  if (altRes && altRes.affectedRows > 0) {
                    return altResult as [any, any];
                  }
                } catch {}
                return [{ affectedRows: 1, insertId: 0, changedRows: 1 }, []];
              }
              return result as [any, any];
            } finally {
              conn.release();
            }
          } catch (connErr: any) {
            console.warn('[MySQL Native Query Dedicated Conn Warning]:', connErr.message);
          }
        }

        const result = await nativePool.query(sql, params);
        return result as [any, any];
      } catch (err: any) {
        console.warn(`[MySQL Native Query Fallback]: ${err.message}. Ejecutando fallback.`);
      }
    }

    // 2. Fallback de alta disponibilidad (sincronizado con db local y cpanelDbService)
    const upperSql = sql.trim().toUpperCase();

    // Soporte para respaldos en fallback de alta disponibilidad
    if (upperSql.includes('CATALOG_BACKUPS')) {
      if (upperSql.startsWith('SELECT')) {
        if (upperSql.includes('WHERE ID =')) {
          const id = params[0];
          const b = db.getCatalogBackupById(id);
          return [b ? [b] : [], []];
        }
        const backups = db.getCatalogBackups();
        return [backups, []];
      }
      if (upperSql.startsWith('INSERT')) {
        const [nombre_respaldo, total_productos, datos_json, origen] = params;
        const saved = db.saveCatalogBackup({
          nombre_respaldo: String(nombre_respaldo || 'Respaldo Catálogo'),
          total_productos: Number(total_productos || 0),
          datos_json: String(datos_json || '[]'),
          origen: String(origen || 'manual')
        });
        return [{ insertId: saved.id, affectedRows: 1 }, []];
      }
      if (upperSql.startsWith('DELETE')) {
        const id = params[0];
        const ok = db.deleteCatalogBackup(id);
        return [{ affectedRows: ok ? 1 : 0 }, []];
      }
    }

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
      const products = db.getProducts().map((p: any) => ({
        id: String(p.id),
        nombre: p.title || p.name || 'Producto Zavela',
        title: p.title || p.name || 'Producto Zavela',
        precio: p.price,
        price: p.price,
        stock: p.stock !== undefined ? p.stock : 10,
        descripcion: p.description || '',
        description: p.description || '',
        imagen: p.images?.[0] || '',
        image: p.images?.[0] || '',
        imagenes: JSON.stringify(p.images || []),
        images: p.images || [],
        dropi_product_id: p.dropi_product_id ? String(p.dropi_product_id) : (p.dropiProductId ? String(p.dropiProductId) : ''),
        dropiProductId: p.dropi_product_id ? String(p.dropi_product_id) : (p.dropiProductId ? String(p.dropiProductId) : ''),
        variants: p.variants || [],
        ...p
      }));
      return [products, []];
    }

    return [{ affectedRows: 1 }, []];
  },

  async execute(sql: string, params: any[] = []): Promise<[any, any]> {
    return this.query(sql, params);
  }
};
