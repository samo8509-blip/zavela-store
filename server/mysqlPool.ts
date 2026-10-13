import mysql from 'mysql2/promise';
import { db } from './db.ts';
import { cpanelDbService } from './services/cpanelDbService.ts';
import { dropiBackupService } from './services/dropiBackupService.ts';

// Configuración estricta de conexión MySQL para cPanel / Render usando variables de entorno
const dbHost = (process.env.DB_HOST || process.env.MYSQL_HOST || '').trim();
const dbUser = (process.env.DB_USER || process.env.MYSQL_USER || '').trim();
const dbPass = (process.env.DB_PASSWORD || process.env.DB_PASS || process.env.MYSQL_PASSWORD || '').trim();
const dbName = (process.env.DB_NAME || process.env.MYSQL_DATABASE || '').trim();
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

export let nativePool: mysql.Pool | null = null;

if (dbHost && dbUser && dbName) {
  try {
    nativePool = mysql.createPool({
      host: dbHost,
      user: dbUser,
      password: dbPass,
      database: dbName,
      port: dbPort,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      charset: 'utf8mb4'
    });
    console.log(`[MySQL cPanel] Pool de conexiones establecido con éxito en ${dbHost}:${dbPort}/${dbName}`);

    // Ejecutar inicialización y verificación estricta de esquema
    initDatabaseSchema(nativePool).catch(err => {
      console.error('[MySQL cPanel Error Inicialización Esquema]:', err.message);
    });
  } catch (err: any) {
    console.error('[MySQL ERROR CRÍTICO] Falló la creación del pool MySQL:', err.message);
    nativePool = null;
  }
} else {
  console.error('[MySQL ERROR CRÍTICO] Variables de conexión DB_HOST, DB_USER o DB_NAME no configuradas. No se cargarán datos mock.');
}

/**
 * Rutina estricta de verificación de esquema e integridad en MySQL (cPanel).
 * Garantiza columnas críticas para Dropi, imágenes y flete, SIN reinserción de seeders.
 */
export async function initDatabaseSchema(poolInstance?: mysql.Pool | null): Promise<void> {
  const p = poolInstance || nativePool;
  if (!p) {
    console.error('[MySQL ERROR CRÍTICO] initDatabaseSchema omitido: no hay conexión activa a MySQL.');
    return;
  }

  try {
    console.log('[MySQL cPanel] Verificando esquema de tablas `products`, `productos` y `advisors`...');

    // 1. Tabla `products` (esquema principal con soporte completo Dropi)
    await p.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) NOT NULL,
        title VARCHAR(255) NULL,
        name VARCHAR(255) NULL,
        slug VARCHAR(255) NULL,
        price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        supplier_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        suggested_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        stock INT NOT NULL DEFAULT 10,
        description LONGTEXT NULL,
        dropi_product_id VARCHAR(100) NULL DEFAULT NULL,
        provider VARCHAR(100) NULL DEFAULT 'dropi',
        supplier VARCHAR(100) NULL DEFAULT 'dropi',
        supplier_sku VARCHAR(100) NULL DEFAULT NULL,
        images LONGTEXT NULL,
        raw_dropi_payload LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_products_dropi (dropi_product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 2. Tabla `productos` (esquema en español compatible con scripts php legados)
    await p.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id VARCHAR(64) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        precio DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        supplier_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        suggested_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        stock INT NOT NULL DEFAULT 10,
        descripcion LONGTEXT NULL,
        dropi_product_id VARCHAR(100) NULL DEFAULT NULL,
        provider VARCHAR(100) NULL DEFAULT 'dropi',
        supplier VARCHAR(100) NULL DEFAULT 'dropi',
        supplier_sku VARCHAR(100) NULL DEFAULT NULL,
        imagen VARCHAR(500) NULL,
        imagenes LONGTEXT NULL,
        raw_dropi_payload LONGTEXT NULL,
        variants LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_productos_dropi (dropi_product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 3. Verificación y adición de columnas críticas si ya existían las tablas
    const ensureColumn = async (table: string, colName: string, colDef: string) => {
      try {
        const [rows]: any = await p.query(`
          SELECT COLUMN_NAME 
          FROM information_schema.COLUMNS 
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
        `, [table, colName]);
        if (!Array.isArray(rows) || rows.length === 0) {
          await p.query(`ALTER TABLE ${table} ADD COLUMN ${colName} ${colDef}`);
          console.log(`[MySQL cPanel] ✓ Columna ${colName} agregada a la tabla \`${table}\`.`);
        }
      } catch (err: any) {
        console.warn(`[MySQL cPanel Columna ${table}.${colName}]:`, err.message);
      }
    };

    await ensureColumn('products', 'dropi_product_id', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('products', 'provider', "VARCHAR(100) NULL DEFAULT 'dropi'");
    await ensureColumn('products', 'supplier', "VARCHAR(100) NULL DEFAULT 'dropi'");
    await ensureColumn('products', 'supplier_sku', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('products', 'supplier_cost', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('products', 'suggested_price', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('products', 'images', 'LONGTEXT NULL');
    await ensureColumn('products', 'raw_dropi_payload', 'LONGTEXT NULL');

    await ensureColumn('productos', 'dropi_product_id', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('productos', 'provider', "VARCHAR(100) NULL DEFAULT 'dropi'");
    await ensureColumn('productos', 'supplier', "VARCHAR(100) NULL DEFAULT 'dropi'");
    await ensureColumn('productos', 'supplier_sku', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('productos', 'supplier_cost', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('productos', 'suggested_price', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('productos', 'imagenes', 'LONGTEXT NULL');
    await ensureColumn('productos', 'raw_dropi_payload', 'LONGTEXT NULL');

    // 4. Tabla `advisors` (y `asesores`): NO SOBREESCRIBIR ni insertar asesores automáticos si ya existe
    await p.query(`
      CREATE TABLE IF NOT EXISTS advisors (
        id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NULL,
        role VARCHAR(50) DEFAULT 'advisor',
        seller_code VARCHAR(50) NULL,
        username VARCHAR(100) NULL,
        password VARCHAR(255) NULL,
        email VARCHAR(150) NULL,
        channel VARCHAR(100) NULL,
        commission_rate DECIMAL(5,2) DEFAULT 10.00,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5. Tabla de configuraciones
    await p.query(`
      CREATE TABLE IF NOT EXISTS configuraciones (
        clave VARCHAR(64) NOT NULL PRIMARY KEY,
        valor LONGTEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 6. Tabla de pedidos
    await p.query(`
      CREATE TABLE IF NOT EXISTS pedidos (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        order_number VARCHAR(64) NOT NULL,
        cliente_nombre VARCHAR(255) NULL,
        cliente_telefono VARCHAR(50) NULL,
        cliente_email VARCHAR(100) NULL,
        departamento VARCHAR(100) NULL,
        ciudad VARCHAR(100) NULL,
        direccion TEXT NULL,
        total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        metodo_pago VARCHAR(50) DEFAULT 'contra_entrega',
        estado VARCHAR(50) DEFAULT 'PENDIENTE_REVISION',
        payment_status VARCHAR(50) DEFAULT 'PENDING',
        epayco_ref_pay VARCHAR(100) NULL,
        epayco_transaction_id VARCHAR(100) NULL,
        items LONGTEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 7. Sincronizar respaldos de IDs Dropi desde dropi_backup.json sin sobreescribir datos reales
    const dropiMap = dropiBackupService.getBackupMap();
    if (Object.keys(dropiMap).length > 0) {
      for (const [prodId, dId] of Object.entries(dropiMap)) {
        if (!dId) continue;
        try {
          await p.query(
            'UPDATE products SET dropi_product_id = ? WHERE id = ? AND (dropi_product_id IS NULL OR dropi_product_id = "")',
            [dId, prodId]
          );
          await p.query(
            'UPDATE productos SET dropi_product_id = ? WHERE id = ? AND (dropi_product_id IS NULL OR dropi_product_id = "")',
            [dId, prodId]
          );
        } catch {}
      }
    }

    console.log('[MySQL cPanel] ✓ Esquema e integridad verificados sin inserción de seeders.');
  } catch (err: any) {
    console.error('[MySQL ERROR CRÍTICO initDatabaseSchema]:', err.message);
  }
}

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
 * Cliente unificado de consultas MySQL con persistencia estricta en base de datos física cPanel
 */
export const pool = {
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
        console.error(`[MySQL cPanel getConfig(${clave}) Error]:`, err.message);
      }
    }

    try {
      const cpanelVal = await cpanelDbService.fetchConfig(clave);
      if (cpanelVal !== null) return cpanelVal;
    } catch {}

    const soc = db.getSocialMarketingSettings();
    if (clave === 'facebook_access_token') return soc.connections?.facebook?.accessToken || null;
    if (clave === 'facebook_page_id') return soc.connections?.facebook?.pageId || null;
    if (clave === 'facebook_account_name') return soc.connections?.facebook?.accountName || null;
    if (clave === 'meta_facebook_config') return JSON.stringify(soc.connections?.facebook || {});

    return null;
  },

  async setConfig(clave: string, valor: string): Promise<void> {
    if (nativePool) {
      try {
        await nativePool.query(
          'INSERT INTO configuraciones (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',
          [clave, valor]
        );
      } catch (err: any) {
        console.error(`[MySQL cPanel setConfig(${clave}) Error]:`, err.message);
      }
    }

    cpanelDbService.saveConfig(clave, valor).catch(() => {});
  },

  async getFacebookConfig(): Promise<StoredFacebookConfig> {
    const DEFAULT_PAGE_ID = '1256955457511976';
    let pageId = '';
    let accessToken = '';
    let accountName = 'Zavela Store Colombia (Página Oficial)';
    let autoPostEnabled = true;
    let connected = false;
    let pixelId = '';
    let lastSyncAt = '';

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
        console.error('[MySQL cPanel getFacebookConfig Error]:', err.message);
      }
    }

    if (!accessToken || !isTokenValid(accessToken)) {
      try {
        const cpanelFb = await cpanelDbService.fetchFacebookConfig();
        if (cpanelFb) {
          if (cpanelFb.accessToken && isTokenValid(cpanelFb.accessToken)) accessToken = cpanelFb.accessToken;
          if (cpanelFb.pageId && (!pageId || pageId.startsWith('fb_page_'))) pageId = cpanelFb.pageId;
          if (cpanelFb.accountName) accountName = cpanelFb.accountName;
          if (cpanelFb.connected !== undefined) connected = cpanelFb.connected;
        }
      } catch {}
    }

    const envToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_ACCESS_TOKEN;
    const envPageId = process.env.FACEBOOK_PAGE_ID;
    if (envToken && isTokenValid(envToken) && (!accessToken || !isTokenValid(accessToken))) {
      accessToken = envToken.trim();
    }
    if (envPageId && (!pageId || pageId.startsWith('fb_page_'))) {
      pageId = envPageId.trim();
    }

    if (!pageId || pageId.startsWith('fb_page_')) {
      pageId = DEFAULT_PAGE_ID;
    }

    connected = Boolean(isTokenValid(accessToken) && pageId);

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

    if (nativePool) {
      try {
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
      } catch (err: any) {
        console.error('[MySQL cPanel setFacebookConfig Error]:', err.message);
      }
    }

    cpanelDbService.saveFacebookConfig(fullConfig).catch(() => {});
  },

  /**
   * Ejecución estricta de consultas SQL.
   * Sin datos mock de prueba ni reemplazos ficticios en caso de desconexión.
   */
  async query(sql: string, params: any[] = []): Promise<[any, any]> {
    if (nativePool) {
      try {
        const result = await nativePool.query(sql, params);

        const upper = sql.trim().toUpperCase();
        if (upper.startsWith('SELECT') && Array.isArray((result as any)[0])) {
          const dropiMap = dropiBackupService.getBackupMap();
          for (const row of (result as any)[0]) {
            const rId = String(row.id || (row as any).productId || '');
            if (!row.dropi_product_id && dropiMap[rId]) {
              row.dropi_product_id = dropiMap[rId];
              row.dropiProductId = dropiMap[rId];
            } else if (row.dropi_product_id) {
              row.dropiProductId = String(row.dropi_product_id);
              dropiBackupService.saveDropiId(rId, String(row.dropi_product_id));
            }
          }
        }

        return result as [any, any];
      } catch (err: any) {
        console.error('[MySQL cPanel Query Error]:', err.message, '| SQL:', sql);
        throw err;
      }
    }

    console.error('[MySQL ERROR CRÍTICO] nativePool no disponible para ejecutar:', sql);
    // Retornar resultado seguro vacío sin inyectar productos o usuarios ficticios
    return [[], []];
  },

  async execute(sql: string, params: any[] = []): Promise<[any, any]> {
    return this.query(sql, params);
  }
};
