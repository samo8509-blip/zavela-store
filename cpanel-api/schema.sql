-- ==============================================================================
-- ZavelaStore - Estructura de Tablas MySQL para cPanel
-- Base de datos: zavela_store (o la asignada en cPanel: cpaneluser_zavela)
-- ==============================================================================

-- 1. Tabla nativa de productos en cPanel MySQL (utilizada directamente por ZavelaStore)
CREATE TABLE IF NOT EXISTS `productos` (
  `id` VARCHAR(64) NOT NULL,
  `nombre` VARCHAR(255) NOT NULL,
  `precio` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 10,
  `descripcion` LONGTEXT NULL,
  `imagen` VARCHAR(500) NULL COMMENT 'Foto de portada principal',
  `imagenes` LONGTEXT NULL COMMENT 'JSON o texto con el array de URLs de la galería completa',
  `dropi_product_id` VARCHAR(64) NULL DEFAULT NULL COMMENT 'Código numérico o string del ID de Dropi',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_productos_dropi` (`dropi_product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla extendida products (para compatibilidad internacional o campos avanzados)
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL,
  `description` LONGTEXT NULL,
  `short_description` TEXT NULL,
  `price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `cost_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `compare_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_percentage` INT NOT NULL DEFAULT 0,
  `stock` INT NOT NULL DEFAULT 10,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `featured` TINYINT(1) NOT NULL DEFAULT 0,
  `images` LONGTEXT NULL COMMENT 'JSON array de URLs de imágenes',
  `warranty_info` VARCHAR(255) NULL DEFAULT '30 días de garantía oficial Zavela Store.',
  `tags` TEXT NULL COMMENT 'JSON array o lista separada por comas',
  `category_id` VARCHAR(64) NULL DEFAULT 'cat-general',
  `category_name` VARCHAR(128) NULL DEFAULT 'General',
  `warehouse_city` VARCHAR(128) NULL DEFAULT 'Bogotá D.C.',
  `brand` VARCHAR(128) NULL DEFAULT 'Zavela Store',
  `dropi_id` VARCHAR(64) NULL DEFAULT NULL,
  `variants` LONGTEXT NULL COMMENT 'JSON array con variantes de color/talla/estilo',
  `weight_kg` DECIMAL(6,2) NOT NULL DEFAULT 0.50,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_product_slug` (`slug`),
  KEY `idx_product_active` (`active`),
  KEY `idx_product_category` (`category_id`),
  KEY `idx_product_dropi` (`dropi_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- Tabla de Logs / Auditoría opcional para publicaciones y sincronizaciones
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `product_sync_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` VARCHAR(64) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `target` VARCHAR(64) NOT NULL DEFAULT 'facebook',
  `status` VARCHAR(32) NOT NULL DEFAULT 'success',
  `details` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_log_product` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- 4. Tabla de configuraciones del sistema (Tokens de Meta Facebook, Fanpage ID, ajustes)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS `configuraciones` (
  `clave` VARCHAR(64) NOT NULL,
  `valor` LONGTEXT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
