import mysql from 'mysql2/promise';
import { db } from './db.ts';
import { cpanelDbService } from './services/cpanelDbService.ts';
import { dropiBackupService } from './services/dropiBackupService.ts';
import { Product } from '../src/types/index.ts';

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
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 4000,
      charset: 'utf8mb4'
    });
    console.log(`[MySQL cPanel] Pool de conexiones establecido con éxito en ${dbHost}:${dbPort}/${dbName}`);

    // Ejecutar inicialización y verificación estricta de esquema
    initDatabaseSchema(nativePool).catch(err => {
      console.warn('[MySQL cPanel Inicialización Esquema]:', err.message);
    });
  } catch (err: any) {
    console.warn('[MySQL cPanel Falló la creación del pool MySQL]:', err.message);
    nativePool = null;
  }
} else {
  console.log('[MySQL cPanel] Modo de persistencia local activo (esperando configuración de DB_HOST, DB_USER, DB_NAME).');
}

/**
 * Rutina estricta de verificación de esquema e integridad en MySQL (cPanel).
 * Garantiza columnas críticas para Dropi, imágenes y flete, SIN reinserción de seeders.
 */
export async function initDatabaseSchema(poolInstance?: mysql.Pool | null): Promise<void> {
  const p = poolInstance || nativePool;
  if (!p) {
    console.log('[MySQL cPanel] Verificación de esquema remoto omitida: modo local activo.');
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
        shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        flete_envio DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        flete DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        dropi_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        stock INT NOT NULL DEFAULT 0,
        description LONGTEXT NULL,
        dropi_product_id VARCHAR(100) NULL DEFAULT NULL,
        provider VARCHAR(100) NULL DEFAULT 'derocha',
        supplier VARCHAR(100) NULL DEFAULT 'DeRocha',
        supplier_sku VARCHAR(100) NULL DEFAULT NULL,
        category VARCHAR(255) NULL,
        category_id VARCHAR(100) NULL,
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
        shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        flete_envio DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        flete DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        dropi_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        stock INT NOT NULL DEFAULT 0,
        descripcion LONGTEXT NULL,
        categoria VARCHAR(255) NULL,
        category VARCHAR(255) NULL,
        category_id VARCHAR(100) NULL,
        dropi_product_id VARCHAR(100) NULL DEFAULT NULL,
        provider VARCHAR(100) NULL DEFAULT 'derocha',
        supplier VARCHAR(100) NULL DEFAULT 'DeRocha',
        supplier_sku VARCHAR(100) NULL DEFAULT NULL,
        imagen VARCHAR(500) NULL,
        imagenes LONGTEXT NULL,
        raw_dropi_payload LONGTEXT NULL,
        variants LONGTEXT NULL,
        variantes LONGTEXT NULL,
        sizes LONGTEXT NULL,
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
    await ensureColumn('products', 'provider', "VARCHAR(100) NULL DEFAULT 'derocha'");
    await ensureColumn('products', 'supplier', "VARCHAR(100) NULL DEFAULT 'DeRocha'");
    await ensureColumn('products', 'supplier_sku', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('products', 'category', 'VARCHAR(255) NULL');
    await ensureColumn('products', 'category_id', 'VARCHAR(100) NULL');
    await ensureColumn('products', 'supplier_cost', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('products', 'suggested_price', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('products', 'shipping_cost', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('products', 'flete_envio', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('products', 'flete', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('products', 'dropi_fee', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('products', 'images', 'LONGTEXT NULL');
    await ensureColumn('products', 'raw_dropi_payload', 'LONGTEXT NULL');
    await ensureColumn('products', 'variants', 'LONGTEXT NULL');
    await ensureColumn('products', 'variantes', 'LONGTEXT NULL');

    await ensureColumn('productos', 'dropi_product_id', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('productos', 'provider', "VARCHAR(100) NULL DEFAULT 'derocha'");
    await ensureColumn('productos', 'supplier', "VARCHAR(100) NULL DEFAULT 'DeRocha'");
    await ensureColumn('productos', 'supplier_sku', 'VARCHAR(100) NULL DEFAULT NULL');
    await ensureColumn('productos', 'categoria', 'VARCHAR(255) NULL');
    await ensureColumn('productos', 'category', 'VARCHAR(255) NULL');
    await ensureColumn('productos', 'category_id', 'VARCHAR(100) NULL');
    await ensureColumn('productos', 'supplier_cost', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('productos', 'suggested_price', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('productos', 'shipping_cost', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('productos', 'flete_envio', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('productos', 'flete', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('productos', 'dropi_fee', 'DECIMAL(12,2) NOT NULL DEFAULT 0.00');
    await ensureColumn('productos', 'imagenes', 'LONGTEXT NULL');
    await ensureColumn('productos', 'raw_dropi_payload', 'LONGTEXT NULL');
    await ensureColumn('productos', 'variants', 'LONGTEXT NULL');
    await ensureColumn('productos', 'variantes', 'LONGTEXT NULL');
    await ensureColumn('productos', 'sizes', 'LONGTEXT NULL');
    await ensureColumn('productos', 'active', 'TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn('productos', 'status', "VARCHAR(50) NOT NULL DEFAULT 'active'");
    await ensureColumn('productos', 'estado', "VARCHAR(50) NOT NULL DEFAULT 'activo'");

    await ensureColumn('products', 'active', 'TINYINT(1) NOT NULL DEFAULT 1');
    await ensureColumn('products', 'status', "VARCHAR(50) NOT NULL DEFAULT 'active'");
    await ensureColumn('products', 'estado', "VARCHAR(50) NOT NULL DEFAULT 'activo'");
    await ensureColumn('products', 'variants', 'LONGTEXT NULL');
    await ensureColumn('products', 'variantes', 'LONGTEXT NULL');
    await ensureColumn('products', 'sizes', 'LONGTEXT NULL');

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

    // 5. Tabla de configuraciones y banners en MySQL cPanel
    await p.query(`
      CREATE TABLE IF NOT EXISTS configuraciones (
        clave VARCHAR(64) NOT NULL PRIMARY KEY,
        valor LONGTEXT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await p.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        title VARCHAR(255) NULL,
        subtitle TEXT NULL,
        badge VARCHAR(100) NULL,
        badge_text VARCHAR(100) NULL,
        notification_text VARCHAR(255) NULL,
        tagline VARCHAR(255) NULL,
        cta_text VARCHAR(100) NULL,
        cta_link VARCHAR(255) NULL,
        image_url LONGTEXT NULL,
        video_url LONGTEXT NULL,
        has_video TINYINT(1) DEFAULT 0,
        active TINYINT(1) DEFAULT 1,
        banner_order INT DEFAULT 1,
        text_color VARCHAR(50) NULL,
        discount_badge VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 5b. Tabla `categorias` dedicada en MySQL cPanel
    await p.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id VARCHAR(64) NOT NULL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        active TINYINT(1) NOT NULL DEFAULT 1,
        icon VARCHAR(64) DEFAULT 'Sparkles',
        description TEXT NULL,
        \`order\` INT NOT NULL DEFAULT 1,
        subcategories JSON NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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

    // 7. Tabla catalogo_backups (Respaldos de emergencia del catálogo en MySQL cPanel)
    await p.query(`
      CREATE TABLE IF NOT EXISTS catalogo_backups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        nombre_respaldo VARCHAR(255) NULL,
        total_productos INT NOT NULL DEFAULT 0,
        snapshot_json LONGTEXT NOT NULL,
        datos_json LONGTEXT NULL,
        origen VARCHAR(50) DEFAULT 'manual',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // 8. Tabla usuarios_admin (Autenticación Master Admin en MySQL cPanel)
    await p.query(`
      CREATE TABLE IF NOT EXISTS usuarios_admin (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        rol VARCHAR(50) DEFAULT 'master',
        activo TINYINT(1) DEFAULT 1,
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
    console.warn('[MySQL cPanel initDatabaseSchema Warning]:', err.message);
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
        console.warn('[MySQL cPanel setFacebookConfig Warning]:', err.message);
      }
    } else {
      ensureLocalConfigInitialized();
      localConfigStore.set('facebook_page_id', pageId);
      localConfigStore.set('facebook_access_token', accessToken);
      localConfigStore.set('facebook_account_name', accountName);
      localConfigStore.set('facebook_auto_post', autoPostEnabled ? '1' : '0');
      localConfigStore.set('facebook_connected', connected ? '1' : '0');
      localConfigStore.set('facebook_pixel_id', pixelId);
      localConfigStore.set('facebook_last_sync_at', lastSyncAt);
      localConfigStore.set('meta_facebook_config', JSON.stringify(fullConfig));
    }

    cpanelDbService.saveFacebookConfig(fullConfig).catch(() => {});
  },

  /**
   * Ejecución de consultas SQL con soporte para MySQL cPanel nativo
   * y fallback transparente en memoria/almacenamiento persistente local.
   */
  async query(sql: string, params: any[] = []): Promise<[any, any]> {
    if (nativePool) {
      try {
        const queryTimeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout de consulta MySQL (4000ms agotados)')), 4000);
        });
        const result = await Promise.race([
          nativePool.query(sql, params),
          queryTimeout
        ]);

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
        console.warn('[MySQL cPanel Query Warning]:', err.message, '| SQL:', sql);
        return executeFallbackQuery(sql, params);
      }
    }

    // Modo fallback seguro local cuando nativePool no está conectado
    return executeFallbackQuery(sql, params);
  },

  async execute(sql: string, params: any[] = []): Promise<[any, any]> {
    return this.query(sql, params);
  }
};

// Fallback key-value storage for MySQL tables when running locally or during disconnection
const localConfigStore = new Map<string, string>();
const localCategoriesStore = new Map<string, any>();

function ensureLocalCategoriesInitialized() {
  if (localCategoriesStore.size === 0) {
    const defaultCats = [
      { id: 'cat-amor-amistad', name: '💖 Amor y Amistad', slug: 'amor-y-amistad', active: 1, icon: 'Heart', description: 'Especial Amor y Amistad en Colombia: Joyería de pareja, rosas preservadas LED, proyectores galaxia, relojes dúo y regalos inolvidables con pago contra entrega.', order: 0, subcategories: '[]' },
      { id: 'cat-halloween', name: '🎃 Halloween & Disfraces', slug: 'halloween-disfraces', active: 1, icon: 'Ghost', description: 'Especial Halloween y Noche de Brujas: Disfraces impactantes, máscaras LED de neón, calderos de niebla RGB, proyectores de terror y disfraces para mascotas con pago contra entrega.', order: 1, subcategories: '[]' },
      { id: 'cat-navidad', name: '🎄 Artículos Navideños y Diciembre', slug: 'navidad-diciembre', active: 1, icon: 'Gift', description: 'Luces navideñas inteligentes, árboles nevados, proyectores láser 3D, guirnaldas y decoración especial para celebrar la mejor época del año con pago contra entrega.', order: 2, subcategories: '[]' },
      { id: 'cat-1', name: 'Belleza y Cuidado Personal', slug: 'belleza-cuidado', active: 1, icon: 'Sparkles', description: 'Perfumería fina de mujer y hombre, combos exclusivos de fragancias, cuidado capilar y bienestar personal con pago contra entrega.', order: 3, subcategories: '[]' },
      { id: 'cat-2', name: 'Hogar y Cocina', slug: 'hogar-cocina', active: 1, icon: 'Home', description: 'Soluciones inteligentes, electrodomésticos portátiles y decoración para el hogar.', order: 4, subcategories: '[]' },
      { id: 'cat-3', name: 'Tecnología y Gadgets', slug: 'tecnologia', active: 1, icon: 'Smartphone', description: 'Smartwatches, audio inalámbrico y accesorios de última tecnología.', order: 5, subcategories: '[]' },
      { id: 'cat-4', name: 'Salud y Fitness', slug: 'salud-fitness', active: 1, icon: 'Activity', description: 'Equipos de masaje, terapia muscular y accesorios de entrenamiento.', order: 6, subcategories: '[]' },
      { id: 'cat-5', name: 'Moda y Accesorios', slug: 'moda-accesorios', active: 1, icon: 'ShoppingBag', description: 'Bolsos, billeteras y accesorios de alta tendencia.', order: 7, subcategories: '[]' }
    ];
    for (const c of defaultCats) {
      localCategoriesStore.set(c.id, { ...c, createdAt: new Date().toISOString() });
    }
  }
}

function ensureLocalConfigInitialized() {
  if (localConfigStore.size === 0) {
    try {
      const s = db.getSettings();
      localConfigStore.set('general_settings', JSON.stringify(s));
      localConfigStore.set('hero_banners', JSON.stringify(s.heroBanners || []));
      localConfigStore.set('hero_banner_style', s.heroBannerStyle || 'modern');
    } catch {}
  }
}

function mapProductToSqlRow(p: any) {
  const images = Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []);
  const mainImage = p.image || (images.length > 0 ? images[0] : '');
  const variants = Array.isArray(p.variants) ? p.variants : [];
  return {
    id: p.id,
    title: p.title || p.name || '',
    nombre: p.title || p.name || '',
    name: p.title || p.name || '',
    slug: p.slug || p.id,
    precio: p.price ?? 0,
    price: p.price ?? 0,
    costo: p.costPrice ?? p.supplier_cost ?? 0,
    cost_price: p.costPrice ?? p.supplier_cost ?? 0,
    supplier_cost: p.costPrice ?? p.supplier_cost ?? 0,
    suggested_price: p.suggested_price ?? p.compareAtPrice ?? 0,
    compare_price: p.suggested_price ?? p.compareAtPrice ?? 0,
    shipping_cost: Number(p.shipping_cost ?? p.flete_envio ?? p.flete ?? p.estimatedShippingCost ?? 0),
    flete_envio: Number(p.flete_envio ?? p.shipping_cost ?? p.flete ?? p.estimatedShippingCost ?? 0),
    flete: Number(p.flete ?? p.shipping_cost ?? p.flete_envio ?? p.estimatedShippingCost ?? 0),
    estimatedShippingCost: Number(p.estimatedShippingCost ?? p.shipping_cost ?? p.flete_envio ?? p.flete ?? 0),
    dropi_fee: Number(p.dropi_fee ?? p.dropiFee ?? 0),
    dropiFee: Number(p.dropiFee ?? p.dropi_fee ?? 0),
    inventario: p.stock ?? 10,
    descripcion: p.description || '',
    description: p.description || '',
    categoria: p.categoryName || p.category || 'General',
    category: p.categoryName || p.category || 'General',
    category_id: p.categoryId || 'cat-general',
    dropi_product_id: p.dropi_product_id || p.dropiProductId || null,
    provider: p.provider || 'direct',
    supplier: p.supplier || 'Zavela Store',
    supplier_sku: p.supplier_sku || null,
    imagen: mainImage,
    image: mainImage,
    imagenes: JSON.stringify(images),
    images: JSON.stringify(images),
    variants: JSON.stringify(variants),
    variantes: JSON.stringify(p.variantes || variants),
    sizes: JSON.stringify(p.sizes || variants),
    active: p.active !== false ? 1 : 0,
    status: p.status || (p.active !== false ? 'active' : 'inactive'),
    estado: p.estado || (p.active !== false ? 'activo' : 'inactivo'),
    created_at: p.createdAt || new Date().toISOString(),
    updated_at: p.updatedAt || new Date().toISOString()
  };
}

function executeFallbackQuery(sql: string, params: any[] = []): [any, any] {
  const normalized = sql.trim().replace(/\s+/g, ' ');
  const upper = normalized.toUpperCase();

  // 1. SELECT configuraciones
  if (upper.includes('FROM CONFIGURACIONES')) {
    ensureLocalConfigInitialized();
    const rows: { clave: string; valor: string }[] = [];

    if (upper.includes('WHERE CLAVE IN')) {
      const match = normalized.match(/WHERE\s+clave\s+IN\s*\(([^)]+)\)/i);
      if (match && match[1]) {
        const keys = match[1].split(',').map(k => k.trim().replace(/['"]/g, ''));
        for (const k of keys) {
          if (localConfigStore.has(k)) {
            rows.push({ clave: k, valor: localConfigStore.get(k)! });
          }
        }
      }
    } else if (upper.includes('WHERE CLAVE =')) {
      const key = params[0] || '';
      if (localConfigStore.has(key)) {
        rows.push({ clave: key, valor: localConfigStore.get(key)! });
      }
    } else {
      for (const [clave, valor] of localConfigStore.entries()) {
        rows.push({ clave, valor });
      }
    }
    return [rows, []];
  }

  // 2. INSERT / UPDATE configuraciones
  if (upper.includes('INSERT INTO CONFIGURACIONES')) {
    ensureLocalConfigInitialized();
    const key = params[0];
    const val = params[1];
    if (key && typeof key === 'string') {
      localConfigStore.set(key, val);
      if (key === 'general_settings') {
        try {
          db.saveSettings(JSON.parse(val));
        } catch {}
      } else if (key === 'hero_banners') {
        try {
          db.saveSettings({ heroBanners: JSON.parse(val) });
        } catch {}
      } else if (key === 'hero_banner_style') {
        try {
          db.saveSettings({ heroBannerStyle: val });
        } catch {}
      }
    }
    return [{ affectedRows: 1, insertId: 0 }, []];
  }

  // 3. SELECT banners
  if (upper.includes('FROM BANNERS')) {
    const banners = (db.getSettings().heroBanners || []).map((b: any, idx: number) => ({
      id: b.id || `banner-${idx + 1}`,
      title: b.title || '',
      subtitle: b.subtitle || '',
      badge: b.badge || '',
      badge_text: b.badgeText || b.badge || '',
      notification_text: b.notificationText || '',
      tagline: b.tagline || '',
      cta_text: b.ctaText || 'Comprar Ahora',
      cta_link: b.ctaLink || '',
      image_url: b.imageUrl || '',
      video_url: b.videoUrl || '',
      has_video: b.hasVideo ? 1 : 0,
      active: b.active !== false ? 1 : 0,
      banner_order: b.bannerOrder || idx + 1,
      text_color: b.textColor || '',
      discount_badge: b.discountBadge || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));
    return [banners, []];
  }

  // 4. INSERT INTO banners
  if (upper.includes('INSERT INTO BANNERS')) {
    return [{ affectedRows: 1, insertId: 0 }, []];
  }

  // 4b. Consultas a la tabla categorias (MySQL cPanel)
  if (upper.includes('FROM CATEGORIAS')) {
    ensureLocalCategoriesInitialized();
    if (upper.includes('WHERE ID =')) {
      const targetId = String(params[0] || '').trim();
      const cat = localCategoriesStore.get(targetId);
      return [cat ? [cat] : [], []];
    }
    const rows = Array.from(localCategoriesStore.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
    return [rows, []];
  }

  if (upper.includes('INSERT INTO CATEGORIAS')) {
    ensureLocalCategoriesInitialized();
    const [id, name, slug, active, icon, description, order, subcategories] = params;
    const catRow = {
      id: String(id),
      name: String(name || ''),
      slug: String(slug || ''),
      active: active === 1 || active === true ? 1 : 0,
      icon: String(icon || 'Sparkles'),
      description: String(description || ''),
      order: Number(order !== undefined ? order : 1),
      subcategories: typeof subcategories === 'string' ? subcategories : JSON.stringify(subcategories || []),
      createdAt: new Date().toISOString()
    };
    localCategoriesStore.set(catRow.id, catRow);
    return [{ affectedRows: 1, insertId: 0 }, []];
  }

  if (upper.includes('UPDATE CATEGORIAS')) {
    ensureLocalCategoriesInitialized();
    const [name, slug, active, icon, description, order, subcategories, targetId] = params;
    const cleanId = String(targetId || '').trim();
    const existing = localCategoriesStore.get(cleanId);
    if (existing) {
      existing.name = String(name || existing.name);
      existing.slug = String(slug || existing.slug);
      existing.active = active === 1 || active === true ? 1 : 0;
      existing.icon = String(icon || existing.icon);
      existing.description = String(description !== undefined ? description : existing.description);
      existing.order = Number(order !== undefined ? order : existing.order);
      existing.subcategories = typeof subcategories === 'string' ? subcategories : JSON.stringify(subcategories || []);
      localCategoriesStore.set(cleanId, existing);
      return [{ affectedRows: 1 }, []];
    }
    return [{ affectedRows: 0 }, []];
  }

  if (upper.includes('DELETE FROM CATEGORIAS')) {
    ensureLocalCategoriesInitialized();
    const targetId = String(params[0] || '').trim();
    const existed = localCategoriesStore.delete(targetId);
    return [{ affectedRows: existed ? 1 : 0 }, []];
  }

  // 5. SELECT productos / products
  if (upper.includes('FROM PRODUCTOS') || upper.includes('FROM PRODUCTS')) {
    if (upper.includes('WHERE ID =')) {
      const targetId = params[0];
      const p = db.getProductById(targetId);
      if (!p) return [[], []];
      if (upper.includes('ACTIVE, STATUS, ESTADO') || upper.includes('ACTIVE')) {
        return [[{
          active: p.active !== false ? 1 : 0,
          status: p.status || (p.active !== false ? 'active' : 'inactive'),
          estado: p.estado || (p.active !== false ? 'activo' : 'inactivo')
        }], []];
      }
      return [[mapProductToSqlRow(p)], []];
    }

    const rows = db.getProducts().map(p => mapProductToSqlRow(p));
    return [rows, []];
  }

  // 6. UPDATE productos / products
  if (upper.includes('UPDATE PRODUCTOS') || upper.includes('UPDATE PRODUCTS')) {
    if (upper.includes('ACTIVE =')) {
      const newActive = params[0] === 1 || params[0] === true || params[0] === '1';
      const targetId = params[params.length - 1];
      const p = db.getProductById(targetId);
      if (p) {
        db.saveProduct({ ...p, active: newActive });
      }
      return [{ affectedRows: 1 }, []];
    }
    return [{ affectedRows: 1 }, []];
  }

  // 7. SELECT usuarios_admin
  if (upper.includes('FROM USUARIOS_ADMIN')) {
    const adminUser = {
      id: 1,
      nombre: 'Master Admin',
      email: process.env.ADMIN_EMAIL || 'admin@zavelastore.com.co',
      password: process.env.ADMIN_PASSWORD || '',
      rol: 'master',
      activo: 1
    };
    return [[adminUser], []];
  }

  // 8. SELECT catalogo_backups / catalog_backups
  if (upper.includes('FROM CATALOGO_BACKUPS') || upper.includes('FROM CATALOG_BACKUPS')) {
    const backups = db.getCatalogBackups ? db.getCatalogBackups() : [];
    return [backups, []];
  }

  // 9. DDL & administrative queries
  if (
    upper.startsWith('CREATE') || 
    upper.startsWith('ALTER') || 
    upper.startsWith('SET') || 
    upper.startsWith('DROP') ||
    upper.startsWith('DELETE FROM')
  ) {
    return [{ affectedRows: 0, insertId: 0 }, []];
  }

  return [[], []];
}

export const getPool = () => pool;
