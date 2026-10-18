-- ==============================================================================
-- ZavelaStore - Estructura de Tablas MySQL para cPanel
-- Base de datos: zavela_store (o la asignada en cPanel: cpaneluser_zavela)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS `productos` (
  `id` VARCHAR(50) NOT NULL,
  `nombre` VARCHAR(255) NULL,
  `precio` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `stock` INT NOT NULL DEFAULT 0,
  `descripcion` TEXT NULL,
  `imagen` TEXT NULL,
  `shipping_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `flete_envio` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `flete` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `dropi_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `dropi_product_id` VARCHAR(100) NULL DEFAULT NULL,
  `provider` VARCHAR(100) NULL DEFAULT 'derocha',
  `supplier` VARCHAR(100) NULL DEFAULT 'DeRocha',
  `supplier_sku` VARCHAR(100) NULL DEFAULT NULL,
  `categoria` VARCHAR(255) NULL,
  `category` VARCHAR(255) NULL,
  `category_id` VARCHAR(100) NULL,
  `supplier_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `suggested_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `imagenes` LONGTEXT NULL,
  `raw_dropi_payload` LONGTEXT NULL,
  `variants` LONGTEXT NULL,
  `variantes` LONGTEXT NULL,
  `sizes` LONGTEXT NULL,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `status` VARCHAR(50) NOT NULL DEFAULT 'active',
  `estado` VARCHAR(50) NOT NULL DEFAULT 'activo',
  PRIMARY KEY (`id`),
  KEY `idx_productos_dropi` (`dropi_product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `products` LIKE `productos`;

-- Tabla de configuraciones del sistema (Tokens de Meta Facebook, Fanpage ID, ajustes)
CREATE TABLE IF NOT EXISTS `configuraciones` (
  `clave` VARCHAR(64) NOT NULL,
  `valor` LONGTEXT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
