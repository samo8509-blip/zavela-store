<?php
/**
 * ==============================================================================
 * ZavelaStore - API REST de Productos para cPanel (MySQL con PDO)
 * Archivo: products.php
 * Ubicación recomendada en cPanel: /public_html/api/products.php o /public_html/products.php
 * ==============================================================================
 */

// 1. Headers CORS y Respuesta JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Responder a peticiones pre-flight de CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 2. Configuración de Conexión a la Base de Datos MySQL
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'zavela_store';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO(
        "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error de conexión a la base de datos MySQL en cPanel',
        'error'   => $e->getMessage()
    ]);
    exit();
}

// 3. Capturar Método HTTP y Entrada
$method = $_SERVER['REQUEST_METHOD'];
$inputJSON = file_get_contents('php://input');
$inputData = json_decode($inputJSON, true) ?: [];

// Detectar tabla activa en la base de datos
$tableName = 'productos';
try {
    $tblCheck = $pdo->query("SHOW TABLES LIKE 'productos'");
    if ($tblCheck->rowCount() === 0) {
        $tblProductsCheck = $pdo->query("SHOW TABLES LIKE 'products'");
        if ($tblProductsCheck->rowCount() > 0) {
            $tableName = 'products';
        }
    }

    // Auto-crear tabla configuraciones para tokens
    $pdo->exec("CREATE TABLE IF NOT EXISTS `configuraciones` (
        `clave` VARCHAR(64) NOT NULL PRIMARY KEY,
        `valor` LONGTEXT NULL,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Auto-migración en tabla productos: columnas de flete, dropi, imágenes y variantes
    if ($tableName === 'productos') {
        $cols = [
            'dropi_product_id' => "ALTER TABLE `productos` ADD COLUMN `dropi_product_id` VARCHAR(100) NULL AFTER `descripcion`",
            'provider'         => "ALTER TABLE `productos` ADD COLUMN `provider` VARCHAR(100) NULL DEFAULT 'derocha'",
            'supplier'         => "ALTER TABLE `productos` ADD COLUMN `supplier` VARCHAR(100) NULL DEFAULT 'DeRocha'",
            'supplier_sku'     => "ALTER TABLE `productos` ADD COLUMN `supplier_sku` VARCHAR(100) NULL",
            'categoria'        => "ALTER TABLE `productos` ADD COLUMN `categoria` VARCHAR(255) NULL",
            'category'         => "ALTER TABLE `productos` ADD COLUMN `category` VARCHAR(255) NULL",
            'category_id'      => "ALTER TABLE `productos` ADD COLUMN `category_id` VARCHAR(100) NULL",
            'supplier_cost'    => "ALTER TABLE `productos` ADD COLUMN `supplier_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'suggested_price'  => "ALTER TABLE `productos` ADD COLUMN `suggested_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'imagenes'         => "ALTER TABLE `productos` ADD COLUMN `imagenes` LONGTEXT NULL AFTER `imagen`",
            'raw_dropi_payload'=> "ALTER TABLE `productos` ADD COLUMN `raw_dropi_payload` LONGTEXT NULL",
            'variants'         => "ALTER TABLE `productos` ADD COLUMN `variants` LONGTEXT NULL",
            'variantes'        => "ALTER TABLE `productos` ADD COLUMN `variantes` LONGTEXT NULL",
            'sizes'            => "ALTER TABLE `productos` ADD COLUMN `sizes` LONGTEXT NULL",
            'shipping_cost'    => "ALTER TABLE `productos` ADD COLUMN `shipping_cost` DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'flete_envio'      => "ALTER TABLE `productos` ADD COLUMN `flete_envio` DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'flete'            => "ALTER TABLE `productos` ADD COLUMN `flete` DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'dropi_fee'        => "ALTER TABLE `productos` ADD COLUMN `dropi_fee` DECIMAL(12,2) NOT NULL DEFAULT 0.00",
            'active'           => "ALTER TABLE `productos` ADD COLUMN `active` TINYINT(1) NOT NULL DEFAULT 1",
            'status'           => "ALTER TABLE `productos` ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'active'",
            'estado'           => "ALTER TABLE `productos` ADD COLUMN `estado` VARCHAR(50) NOT NULL DEFAULT 'activo'"
        ];
        foreach ($cols as $colName => $alterSql) {
            $check = $pdo->query("SHOW COLUMNS FROM `productos` LIKE '{$colName}'");
            if ($check->rowCount() === 0) {
                $pdo->exec($alterSql);
            }
        }
    }
} catch (Exception $e) {
    $tableName = 'productos';
}

// Función auxiliar para parsear y limpiar montos monetarios o fletes (DEFAULT 0, SIN 16500)
function parseShippingCost($data) {
    $raw = $data['shippingCost'] 
        ?? $data['shipping_cost'] 
        ?? $data['flete'] 
        ?? $data['flete_envio'] 
        ?? $data['costo_envio'] 
        ?? $data['estimatedShippingCost'] 
        ?? null;

    if ($raw === null || $raw === '') {
        return 0.00;
    }

    if (is_numeric($raw)) {
        return (float)$raw;
    }

    $clean = preg_replace('/[^0-9.]/', '', (string)$raw);
    return is_numeric($clean) ? (float)$clean : 0.00;
}

// Función auxiliar para parsear tarifas de Dropi (DEFAULT 0, SIN VALORES FORZADOS)
function parseDropiFee($data) {
    $raw = $data['dropiFee'] ?? $data['dropi_fee'] ?? null;
    if ($raw === null || $raw === '') {
        return 0.00;
    }
    return is_numeric($raw) ? (float)$raw : 0.00;
}

// Helper para normalizar producto de MySQL a JSON del frontend
function formatProductOutput($row) {
    $images = [];
    $rawImagenes = $row['imagenes'] ?? $row['images'] ?? null;
    if (!empty($rawImagenes)) {
        if (is_array($rawImagenes)) {
            $images = $rawImagenes;
        } else {
            $decoded = json_decode($rawImagenes, true);
            if (is_array($decoded)) {
                $images = $decoded;
            } else if (is_string($rawImagenes)) {
                $images = array_map('trim', explode(',', $rawImagenes));
            }
        }
    }
    if (empty($images) && !empty($row['imagen'])) {
        $images = [$row['imagen']];
    }
    if (empty($images) && !empty($row['image'])) {
        $images = [$row['image']];
    }
    if (empty($images)) {
        $images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
    }
    $mainImage = $images[0];

    $title = $row['nombre'] ?? $row['title'] ?? 'Producto Zavela';
    $slug = $row['slug'] ?? '';
    if (empty($slug)) {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title), '-'));
        if (empty($slug)) $slug = (string)$row['id'];
    }

    $description = $row['descripcion'] ?? $row['description'] ?? '';
    $shortDescription = $row['short_description'] ?? $row['shortDescription'] ?? '';

    $price = (float)($row['precio'] ?? $row['price'] ?? 0);
    $costPrice = (float)($row['supplier_cost'] ?? $row['costo'] ?? $row['cost_price'] ?? 0);
    $comparePrice = (float)($row['suggested_price'] ?? $row['compare_price'] ?? ($price > 0 ? $price + 20000 : 0));
    $marginAmount = $price - $costPrice;
    $marginPercentage = $costPrice > 0 ? round(($marginAmount / $costPrice) * 100, 1) : 0;

    $stock = (int)($row['stock'] ?? $row['inventario'] ?? 0);
    $active = isset($row['active']) ? (bool)$row['active'] : (isset($row['activo']) ? (bool)$row['activo'] : true);
    $featured = isset($row['featured']) ? (bool)$row['featured'] : (isset($row['destacado']) ? (bool)$row['destacado'] : false);

    $dropiId = $row['dropi_product_id'] ?? $row['dropiProductId'] ?? $row['dropi_id'] ?? '';

    $tags = [];
    if (!empty($row['tags'])) {
        $decodedTags = is_string($row['tags']) ? json_decode($row['tags'], true) : $row['tags'];
        $tags = is_array($decodedTags) ? $decodedTags : explode(',', (string)$row['tags']);
    }

    $variants = [];
    $rawVariants = $row['variants'] ?? $row['variantes'] ?? $row['sizes'] ?? null;
    if (!empty($rawVariants)) {
        $decodedVars = is_string($rawVariants) ? json_decode($rawVariants, true) : $rawVariants;
        $variants = is_array($decodedVars) ? $decodedVars : [];
    }

    // Flete: Default 0.00 absoluto
    $shippingVal = $row['shipping_cost'] ?? $row['flete_envio'] ?? $row['flete'] ?? null;
    $shippingCost = ($shippingVal !== null && $shippingVal !== '') ? (float)$shippingVal : 0.00;
    $dropiFee = (float)($row['dropi_fee'] ?? 0.00);

    return [
        'id'                    => (string)$row['id'],
        'title'                 => $title,
        'nombre'                => $title,
        'name'                  => $title,
        'slug'                  => $slug,
        'description'           => $description,
        'descripcion'           => $description,
        'shortDescription'      => $shortDescription,
        'price'                 => $price,
        'precio'                => $price,
        'costPrice'             => $costPrice,
        'supplier_cost'         => $costPrice,
        'compareAtPrice'        => $comparePrice,
        'suggested_price'       => $comparePrice,
        'discountPercentage'    => (int)($row['discount_percentage'] ?? 0),
        'marginAmount'          => $marginAmount,
        'marginPercentage'      => $marginPercentage,
        'shippingCost'          => $shippingCost,
        'shipping_cost'         => $shippingCost,
        'flete_envio'           => $shippingCost,
        'flete'                 => $shippingCost,
        'estimatedShippingCost' => $shippingCost,
        'dropiFee'              => $dropiFee,
        'dropi_fee'             => $dropiFee,
        'stock'                 => $stock,
        'active'                => $active,
        'featured'              => $featured,
        'image'                 => $mainImage,
        'imagen'                => $mainImage,
        'images'                => $images,
        'imagenes'              => $images,
        'provider'              => $row['provider'] ?? 'derocha',
        'supplier'              => $row['supplier'] ?? 'DeRocha',
        'supplierSku'           => $row['supplier_sku'] ?? '',
        'supplier_sku'          => $row['supplier_sku'] ?? '',
        'categoryId'            => $row['category_id'] ?? 'cat-general',
        'categoryName'          => $row['categoria'] ?? $row['category'] ?? 'General',
        'categoria'             => $row['categoria'] ?? $row['category'] ?? 'General',
        'category'              => $row['categoria'] ?? $row['category'] ?? 'General',
        'dropi_product_id'      => (string)$dropiId,
        'dropiProductId'        => (string)$dropiId,
        'dropi_id'              => (string)$dropiId,
        'variants'              => $variants,
        'variantes'             => $variants,
        'createdAt'             => $row['created_at'] ?? date('c'),
        'updatedAt'             => $row['updated_at'] ?? ($row['created_at'] ?? date('c'))
    ];
}

// 4. Enrutamiento CRUD según Método HTTP
try {
    switch ($method) {
        case 'GET':
            $id = $_GET['id'] ?? null;
            $slug = $_GET['slug'] ?? null;
            $onlyActive = isset($_GET['only_active']) && ($_GET['only_active'] === 'true' || $_GET['only_active'] === '1');
            $search = $_GET['search'] ?? null;

            if ($id || $slug) {
                $checkField = $id ? "id = :query" : "(id = :query OR slug = :query)";
                $sql = "SELECT * FROM {$tableName} WHERE {$checkField} LIMIT 1";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([':query' => $id ?: $slug]);
                $product = $stmt->fetch();

                if (!$product) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Producto no encontrado en MySQL']);
                    exit();
                }

                echo json_encode([
                    'success' => true,
                    'data'    => formatProductOutput($product)
                ]);
                exit();
            }

            $whereClauses = [];
            $params = [];

            if ($onlyActive) {
                $whereClauses[] = "active = 1";
            }
            if ($search) {
                $whereClauses[] = "(nombre LIKE :search OR descripcion LIKE :search OR dropi_product_id LIKE :search)";
                $params[':search'] = "%{$search}%";
            }

            $sql = "SELECT * FROM {$tableName}";
            if (!empty($whereClauses)) {
                $sql .= " WHERE " . implode(' AND ', $whereClauses);
            }
            $sql .= " ORDER BY created_at DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();

            $products = array_map('formatProductOutput', $rows);

            echo json_encode([
                'success' => true,
                'count'   => count($products),
                'data'    => $products
            ]);
            break;

        case 'POST':
            $data = $inputData;
            $action = $data['action'] ?? ($_GET['action'] ?? null);

            // ==============================================================================
            // ACCIÓN: Descuento Seguro de Inventario (Checkout Seguro)
            // REGLA DE SEGURIDAD EXTREMA: Modifica ÚNICAMENTE la columna stock.
            // PROHIBIDO actualizar nombre, imagen, precio, descripción ni ninguna otra columna.
            // ==============================================================================
            if ($action === 'decrement_stock' || $action === 'deduct_stock' || $action === 'descontar_inventario') {
                $id = $data['id'] ?? ($data['id_producto'] ?? ($data['productId'] ?? ($_GET['id'] ?? null)));
                $cantidad = isset($data['cantidad']) ? (int)$data['cantidad'] : (isset($data['quantity']) ? (int)$data['quantity'] : 1);

                if (!$id || $cantidad <= 0) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'ID de producto y cantidad válidos son requeridos']);
                    exit();
                }

                // CONSULTA SEGURA: Resta la cantidad al stock asegurando no ser menor a 0
                $sql = "UPDATE {$tableName} SET stock = GREATEST(0, stock - :cantidad), updated_at = NOW() WHERE id = :id_producto";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':cantidad'    => $cantidad,
                    ':id_producto' => (string)$id
                ]);

                echo json_encode([
                    'success'      => true,
                    'message'      => 'Inventario descontado exitosamente sin alterar datos del producto',
                    'id_producto'  => (string)$id,
                    'descontado'   => $cantidad
                ]);
                exit();
            }

            $id = $_GET['id'] ?? ($data['id'] ?? null);

            if (!$id) {
                $id = 'prod-' . round(microtime(true) * 1000);
            }

            $title = trim($data['nombre'] ?? $data['title'] ?? $data['name'] ?? 'Nuevo Producto');
            $slug = $data['slug'] ?? '';
            if (empty($slug)) {
                $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title), '-'));
                if (empty($slug)) $slug = $id;
            }

            $description = $data['descripcion'] ?? $data['description'] ?? '';
            $price = (float)($data['precio'] ?? $data['price'] ?? 0);
            $stock = (int)($data['stock'] ?? $data['inventario'] ?? 0);
            $supplierCost = (float)($data['supplier_cost'] ?? $data['costPrice'] ?? $data['costo'] ?? 0);
            $suggestedPrice = (float)($data['suggested_price'] ?? $data['compareAtPrice'] ?? $data['compare_price'] ?? 0);
            
            // Flete y Tarifa Dropi: 0 por defecto
            $flete = parseShippingCost($data);
            $dropiFee = parseDropiFee($data);

            $provider = $data['provider'] ?? 'derocha';
            $supplier = $data['supplier'] ?? ($provider === 'dropi' ? 'Dropi Colombia' : 'DeRocha');
            $dropiId = $data['dropi_product_id'] ?? $data['dropiProductId'] ?? null;
            if (empty($dropiId)) {
                $dropiId = null;
            }

            $categoria = $data['categoria'] ?? $data['categoryName'] ?? $data['category'] ?? 'General';
            $category = $categoria;
            $categoryId = $data['category_id'] ?? $data['categoryId'] ?? 'cat-general';

            $active = isset($data['active']) ? ($data['active'] ? 1 : 0) : 1;
            $status = $active ? 'active' : 'inactive';
            $estado = $active ? 'activo' : 'inactivo';

            $imagesList = [];
            if (!empty($data['images']) && is_array($data['images'])) {
                $imagesList = $data['images'];
            } else if (!empty($data['imagenes'])) {
                $imagesList = is_array($data['imagenes']) ? $data['imagenes'] : json_decode($data['imagenes'], true);
            }
            $mainImage = !empty($imagesList) ? $imagesList[0] : ($data['imagen'] ?? $data['image'] ?? '');
            $imagesJson = json_encode($imagesList ?: [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $variantsList = [];
            if (!empty($data['variants']) && is_array($data['variants'])) {
                $variantsList = $data['variants'];
            } else if (!empty($data['variantes']) && is_array($data['variantes'])) {
                $variantsList = $data['variantes'];
            }
            $variantsJson = json_encode($variantsList ?: [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $sql = "INSERT INTO {$tableName} (
                id, nombre, precio, stock, descripcion, imagen, shipping_cost, flete_envio, flete, dropi_fee,
                dropi_product_id, provider, supplier, supplier_sku, categoria, category, category_id,
                supplier_cost, suggested_price, imagenes, variants, variantes, sizes, active, status, estado,
                created_at, updated_at
            ) VALUES (
                :id, :nombre, :precio, :stock, :descripcion, :imagen, :shipping_cost, :flete_envio, :flete, :dropi_fee,
                :dropi_product_id, :provider, :supplier, :supplier_sku, :categoria, :category, :category_id,
                :supplier_cost, :suggested_price, :imagenes, :variants, :variantes, :sizes, :active, :status, :estado,
                NOW(), NOW()
            ) ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                precio = VALUES(precio),
                stock = VALUES(stock),
                descripcion = VALUES(descripcion),
                imagen = VALUES(imagen),
                shipping_cost = VALUES(shipping_cost),
                flete_envio = VALUES(flete_envio),
                flete = VALUES(flete),
                dropi_fee = VALUES(dropi_fee),
                dropi_product_id = VALUES(dropi_product_id),
                provider = VALUES(provider),
                supplier = VALUES(supplier),
                supplier_sku = VALUES(supplier_sku),
                categoria = VALUES(categoria),
                category = VALUES(category),
                category_id = VALUES(category_id),
                supplier_cost = VALUES(supplier_cost),
                suggested_price = VALUES(suggested_price),
                imagenes = VALUES(imagenes),
                variants = VALUES(variants),
                variantes = VALUES(variantes),
                sizes = VALUES(sizes),
                active = VALUES(active),
                status = VALUES(status),
                estado = VALUES(estado),
                updated_at = NOW()";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id'               => $id,
                ':nombre'           => $title,
                ':precio'           => $price,
                ':stock'            => $stock,
                ':descripcion'      => $description,
                ':imagen'           => $mainImage,
                ':shipping_cost'    => $flete,
                ':flete_envio'      => $flete,
                ':flete'            => $flete,
                ':dropi_fee'        => $dropiFee,
                ':dropi_product_id' => $dropiId,
                ':provider'         => $provider,
                ':supplier'         => $supplier,
                ':supplier_sku'     => $supplierSku,
                ':categoria'        => $categoria,
                ':category'         => $category,
                ':category_id'      => $categoryId,
                ':supplier_cost'    => $supplierCost,
                ':suggested_price'  => $suggestedPrice,
                ':imagenes'         => $imagesJson,
                ':variants'         => $variantsJson,
                ':variantes'        => $variantsJson,
                ':sizes'            => $variantsJson,
                ':active'           => $active,
                ':status'           => $status,
                ':estado'           => $estado
            ]);

            $fetchStmt = $pdo->prepare("SELECT * FROM {$tableName} WHERE id = :id LIMIT 1");
            $fetchStmt->execute([':id' => $id]);
            $savedRow = $fetchStmt->fetch();

            header('Content-Type: application/json');
            echo json_encode([
                'success'       => true,
                'message'       => 'Producto guardado',
                'shipping_cost' => $flete,
                'flete_envio'   => $flete,
                'dropi_fee'     => $dropiFee,
                'data'          => formatProductOutput($savedRow)
            ]);
            exit;

        case 'PUT':
            $data = $inputData;
            $id = $_GET['id'] ?? ($data['id'] ?? null);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de producto requerido']);
                exit();
            }

            $title = trim($data['nombre'] ?? $data['title'] ?? $data['name'] ?? 'Producto');
            $price = (float)($data['precio'] ?? $data['price'] ?? 0);
            $stock = (int)($data['stock'] ?? $data['inventario'] ?? 0);
            $description = $data['descripcion'] ?? $data['description'] ?? '';
            $supplierCost = (float)($data['supplier_cost'] ?? $data['costPrice'] ?? $data['costo'] ?? 0);
            $suggestedPrice = (float)($data['suggested_price'] ?? $data['compareAtPrice'] ?? $data['compare_price'] ?? 0);
            
            $flete = parseShippingCost($data);
            $dropiFee = parseDropiFee($data);

            $provider = $data['provider'] ?? 'derocha';
            $supplier = $data['supplier'] ?? ($provider === 'dropi' ? 'Dropi Colombia' : 'DeRocha');
            $dropiId = $data['dropi_product_id'] ?? $data['dropiProductId'] ?? null;
            if (empty($dropiId)) {
                $dropiId = null;
            }

            $categoria = $data['categoria'] ?? $data['categoryName'] ?? $data['category'] ?? 'General';
            $category = $categoria;
            $categoryId = $data['category_id'] ?? $data['categoryId'] ?? 'cat-general';

            $active = isset($data['active']) ? ($data['active'] ? 1 : 0) : 1;
            $status = $active ? 'active' : 'inactive';
            $estado = $active ? 'activo' : 'inactivo';

            $imagesList = [];
            if (!empty($data['images']) && is_array($data['images'])) {
                $imagesList = $data['images'];
            } else if (!empty($data['imagenes'])) {
                $imagesList = is_array($data['imagenes']) ? $data['imagenes'] : json_decode($data['imagenes'], true);
            }
            $mainImage = !empty($imagesList) ? $imagesList[0] : ($data['imagen'] ?? $data['image'] ?? '');
            $imagesJson = json_encode($imagesList ?: [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $variantsList = [];
            if (!empty($data['variants']) && is_array($data['variants'])) {
                $variantsList = $data['variants'];
            } else if (!empty($data['variantes']) && is_array($data['variantes'])) {
                $variantsList = $data['variantes'];
            }
            $variantsJson = json_encode($variantsList ?: [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $sql = "UPDATE {$tableName} SET 
                nombre = :nombre,
                precio = :precio,
                stock = :stock,
                descripcion = :descripcion,
                imagen = :imagen,
                shipping_cost = :shipping_cost,
                flete_envio = :flete_envio,
                flete = :flete,
                dropi_fee = :dropi_fee,
                dropi_product_id = :dropi_product_id,
                provider = :provider,
                supplier = :supplier,
                supplier_sku = :supplier_sku,
                categoria = :categoria,
                category = :category,
                category_id = :category_id,
                supplier_cost = :supplier_cost,
                suggested_price = :suggested_price,
                imagenes = :imagenes,
                variants = :variants,
                variantes = :variantes,
                sizes = :sizes,
                active = :active,
                status = :status,
                estado = :estado,
                updated_at = NOW()
            WHERE id = :id OR slug = :id";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':id'               => $id,
                ':nombre'           => $title,
                ':precio'           => $price,
                ':stock'            => $stock,
                ':descripcion'      => $description,
                ':imagen'           => $mainImage,
                ':shipping_cost'    => $flete,
                ':flete_envio'      => $flete,
                ':flete'            => $flete,
                ':dropi_fee'        => $dropiFee,
                ':dropi_product_id' => $dropiId,
                ':provider'         => $provider,
                ':supplier'         => $supplier,
                ':supplier_sku'     => $supplierSku,
                ':categoria'        => $categoria,
                ':category'         => $category,
                ':category_id'      => $categoryId,
                ':supplier_cost'    => $supplierCost,
                ':suggested_price'  => $suggestedPrice,
                ':imagenes'         => $imagesJson,
                ':variants'         => $variantsJson,
                ':variantes'        => $variantsJson,
                ':sizes'            => $variantsJson,
                ':active'           => $active,
                ':status'           => $status,
                ':estado'           => $estado
            ]);

            $fetchStmt = $pdo->prepare("SELECT * FROM {$tableName} WHERE id = :id OR slug = :id LIMIT 1");
            $fetchStmt->execute([':id' => $id]);
            $updatedRow = $fetchStmt->fetch();

            header('Content-Type: application/json');
            echo json_encode([
                'success'       => true,
                'message'       => 'Producto guardado',
                'shipping_cost' => $flete,
                'flete_envio'   => $flete,
                'dropi_fee'     => $dropiFee,
                'product'       => formatProductOutput($updatedRow),
                'data'          => formatProductOutput($updatedRow)
            ]);
            exit;

        case 'PATCH':
            $data = $inputData;
            $id = $_GET['id'] ?? ($data['id'] ?? ($data['id_producto'] ?? null));
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de producto requerido']);
                exit();
            }

            $cantidad = isset($data['cantidad']) ? (int)$data['cantidad'] : (isset($data['quantity']) ? (int)$data['quantity'] : (isset($data['decrement']) ? (int)$data['decrement'] : null));

            if ($cantidad !== null && $cantidad > 0) {
                // Descuento seguro de inventario (REGLA DE SEGURIDAD EXTREMA: Solo modifica la columna stock)
                $sql = "UPDATE {$tableName} SET stock = GREATEST(0, stock - :cantidad), updated_at = NOW() WHERE id = :id_producto";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':cantidad'    => $cantidad,
                    ':id_producto' => (string)$id
                ]);

                echo json_encode([
                    'success'     => true,
                    'message'     => 'Stock descontado correctamente sin tocar otros campos',
                    'id_producto' => (string)$id,
                    'descontado'  => $cantidad
                ]);
                exit();
            } else if (isset($data['stock'])) {
                $newStock = max(0, (int)$data['stock']);
                $sql = "UPDATE {$tableName} SET stock = :stock, updated_at = NOW() WHERE id = :id_producto";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':stock'       => $newStock,
                    ':id_producto' => (string)$id
                ]);
                echo json_encode([
                    'success'      => true,
                    'message'      => 'Stock actualizado correctamente',
                    'id_producto'  => (string)$id,
                    'nuevo_stock'  => $newStock
                ]);
                exit();
            }
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? ($inputData['id'] ?? null);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de producto requerido']);
                exit();
            }

            $stmt = $pdo->prepare("DELETE FROM {$tableName} WHERE id = :id");
            $stmt->execute([':id' => $id]);

            echo json_encode(['success' => true, 'message' => "Producto eliminado permanentemente"]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ]);
}
