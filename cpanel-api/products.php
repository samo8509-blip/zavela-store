<?php
/**
 * ==============================================================================
 * ZavelaStore - API REST de Productos para cPanel (MySQL con PDO)
 * Archivo: products.php
 * Ubicación recomendada en cPanel: /public_html/api/products.php
 * ==============================================================================
 */

// 1. Headers CORS y Respuesta JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
            'imagenes'         => "ALTER TABLE `productos` ADD COLUMN `imagenes` TEXT NULL AFTER `imagen`",
            'variants'         => "ALTER TABLE `productos` ADD COLUMN `variants` LONGTEXT NULL",
            'shipping_cost'    => "ALTER TABLE `productos` ADD COLUMN `shipping_cost` DECIMAL(12,2) NOT NULL DEFAULT 16500.00",
            'flete_envio'      => "ALTER TABLE `productos` ADD COLUMN `flete_envio` DECIMAL(12,2) NOT NULL DEFAULT 16500.00",
            'flete'            => "ALTER TABLE `productos` ADD COLUMN `flete` DECIMAL(12,2) NOT NULL DEFAULT 16500.00"
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

// Función auxiliar para parsear y limpiar montos monetarios o fletes
function parseShippingCost($data) {
    $raw = $data['shippingCost'] 
        ?? $data['shipping_cost'] 
        ?? $data['flete'] 
        ?? $data['flete_envio'] 
        ?? $data['costo_envio'] 
        ?? $data['estimatedShippingCost'] 
        ?? null;

    if ($raw === null || $raw === '') {
        return 16500.00;
    }

    if (is_numeric($raw)) {
        return (float)$raw;
    }

    $clean = preg_replace('/[^0-9.]/', '', (string)$raw);
    return is_numeric($clean) ? (float)$clean : 16500.00;
}

// Helper para normalizar producto de MySQL a JSON del frontend
function formatProductOutput($row) {
    $images = [];
    $rawImagenes = $row['imagenes'] ?? $row['images'] ?? null;
    if (!empty(\$rawImagenes)) {
        if (is_array(\$rawImagenes)) {
            $images =$rawImagenes;
        } else {
            $decoded = json_decode($rawImagenes, true);
            if (is_array(\$decoded)) {
                $images =$decoded;
            } else if (is_string(\$rawImagenes)) {
                $images = array_map('trim', explode(',',$rawImagenes));
            }
        }
    }
    if (empty($images) && !empty($row['imagen'])) {
        $images = [$row['imagen']];
    }
    if (empty($images) && !empty($row['image'])) {
        $images = [$row['image']];
    }
    if (empty($images)) {$images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'];
    }
    $mainImage =$images[0];

    \$title = $row['nombre'] ?? $row['title'] ?? 'Producto Zavela';
    $slug =$row['slug'] ?? '';
    if (empty(\$slug)) {
        $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-',$title), '-'));
        if (empty(\$slug)) $slug = (string)$row['id'];
    }

    $description =$row['descripcion'] ?? $row['description'] ?? '';$shortDescription = $row['short_description'] ?? $row['shortDescription'] ?? '';

    \$price = (float)($row['precio'] ?? $row['price'] ?? 0);
    $costPrice = (float)($row['costo'] ?? $row['cost_price'] ?? $row['supplier_cost'] ?? 0);
    $comparePrice = (float)($row['compare_price'] ?? $row['suggested_price'] ?? ($price > 0 ? $price + 20000 : 0));$marginAmount = $price -$costPrice;
    $marginPercentage =$costPrice > 0 ? round(($marginAmount / $costPrice) * 100, 1) : 0;

    \$stock = (int)($row['stock'] ?? $row['inventario'] ?? 0);
    $active = isset($row['active']) ? (bool)$row['active'] : (isset($row['activo']) ? (bool)$row['activo'] : true);$featured = isset($row['featured']) ? (bool)$row['featured'] : (isset($row['destacado']) ? (bool)$row['destacado'] : false);

    $dropiId =$row['dropi_product_id'] ?? $row['dropiProductId'] ?? $row['dropi_id'] ?? '';

    \$tags = [];
    if (!empty(\$row['tags'])) {
        $decodedTags = is_string($row['tags']) ? json_decode($row['tags'], true) :$row['tags'];
        $tags = is_array($decodedTags) ? $decodedTags : explode(',', (string)$row['tags']);
    }

    \$variants = [];
    if (!empty($row['variants'])) {$decodedVars = is_string($row['variants']) ? json_decode($row['variants'], true) : $row['variants'];$variants = is_array($decodedVars) ?$decodedVars : [];
    }

    // Priorizar valores reales de base de datos
    $shippingVal =$row['shipping_cost'] ?? $row['flete_envio'] ?? $row['flete'] ?? null;
    $shippingCost = ($shippingVal !== null && $shippingVal !== '') ? (float)$shippingVal : 16500.00;

    return [
        'id'                    => (string)\$row['id'],
        'title'                 => \$title,
        'nombre'                => \$title,
        'name'                  => \$title,
        'slug'                  => \$slug,
        'description'           => \$description,
        'descripcion'           => \$description,
        'shortDescription'      => \$shortDescription,
        'price'                 => \$price,
        'precio'                => \$price,
        'costPrice'             => \$costPrice,
        'supplier_cost'         => \$costPrice,
        'compareAtPrice'        => \$comparePrice,
        'suggested_price'       => \$comparePrice,
        'discountPercentage'    => (int)($row['discount_percentage'] ?? 0),
        'marginAmount'          =>$marginAmount,
        'marginPercentage'      => \$marginPercentage,
        'shippingCost'          => \$shippingCost,
        'shipping_cost'         => \$shippingCost,
        'flete_envio'           => \$shippingCost,
        'flete'                 => \$shippingCost,
        'estimatedShippingCost' => \$shippingCost,
        'stock'                 => \$stock,
        'active'                => \$active,
        'featured'              => \$featured,
        'image'                 => \$mainImage,
        'imagen'                => \$mainImage,
        'images'                => \$images,
        'imagenes'              => \$images,
        'warrantyInfo'          => \$row['warranty_info'] ?? '30 días de garantía oficial Zavela Store.',
        'tags'                  => \$tags,
        'categoryId'            => \$row['category_id'] ?? 'cat-general',
        'categoryName'          => \$row['category_name'] ?? 'General',
        'warehouseCity'         => \$row['warehouse_city'] ?? 'Bogotá D.C.',
        'brand'                 => \$row['brand'] ?? 'Zavela Store',
        'dropi_product_id'      => (string)\$dropiId,
        'dropiProductId'        => (string)\$dropiId,
        'dropi_id'              => (string)\$dropiId,
        'variants'              => \$variants,
        'weightKg'              => (float)($row['weight_kg'] ?? 0.5),
        'createdAt'             =>$row['created_at'] ?? date('c'),
        'updatedAt'             => $row['updated_at'] ?? ($row['created_at'] ?? date('c'))
    ];
}

// 4. Enrutamiento CRUD según Método HTTP
try {
    switch (\$method) {
        case 'GET':
            $id =$_GET['id'] ?? null;
            $slug =$_GET['slug'] ?? null;
            $onlyActive = isset($_GET['only_active']) && ($_GET['only_active'] === 'true' ||$_GET['only_active'] === '1');
            $search =$_GET['search'] ?? null;

            if (\$id || $slug) {$checkField = $id ? "id = :query" : ($tableName === 'productos' ? "(id = :query OR nombre = :query)" : "(id = :query OR slug = :query)");
                \$sql = "SELECT * FROM {$tableName} WHERE {$checkField} LIMIT 1";
                $stmt =$pdo->prepare($sql);$stmt->execute([':query' => $id ?: $slug]);
                $product =$stmt->fetch();

                if (!\$product) {
                    http_response_code(404);
                    echo json_encode(['success' => false, 'message' => 'Producto no encontrado en MySQL']);
                    exit();
                }

                echo json_encode([
                    'success' => true,
                    'data'    => formatProductOutput(\$product)
                ]);
                exit();
            }

            $whereClauses = [];$params = [];

            if (\$onlyActive && $tableName === 'products') {$whereClauses[] = "active = 1";
            }
            if (\$search) {
                if ($tableName === 'productos') {$whereClauses[] = "(nombre LIKE :search OR descripcion LIKE :search OR dropi_product_id LIKE :search)";
                } else {
                    \$whereClauses[] = "(title LIKE :search OR description LIKE :search OR slug LIKE :search OR tags LIKE :search OR dropi_id LIKE :search)";
                }
                $params[':search'] = "%{$search}%";
            }

            $sql = "SELECT * FROM {$tableName}";
            if (!empty(\$whereClauses)) {
                $sql .= " WHERE " . implode(' AND ', $whereClauses);
            }
            \$sql .= " ORDER BY created_at DESC";

            \$stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows =$stmt->fetchAll();

            $products = array_map('formatProductOutput',$rows);

            echo json_encode([
                'success' => true,
                'count'   => count(\$products),
                'data'    => \$products
            ]);
            break;

        case 'POST':
            $data =$inputData;
            \$id = $_GET['id'] ?? ($data['id'] ?? null);

            if (!$id) {$id = 'prod-' . round(microtime(true) * 1000);
            }

            $title = trim($data['nombre'] ?? $data['title'] ?? $data['name'] ?? 'Nuevo Producto');
            $slug = trim($data['slug'] ?? '');
            if (empty(\$slug)) {
                $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-',$title), '-'));
                if (empty(\$slug)) $slug =$id;
            }

            \$description = $data['descripcion'] ?? $data['description'] ?? '';
            $price = (float)($data['precio'] ?? $data['price'] ?? 0);$stock = (int)($data['stock'] ?? $data['inventario'] ?? 10);
            $flete = parseShippingCost($data);

            \$imagesList = [];
            if (!empty($data['images']) && is_array($data['images'])) {
                $imagesList =$data['images'];
            } else if (!empty(\$data['imagenes'])) {
                $imagesList = is_array($data['imagenes']) ? $data['imagenes'] : json_decode($data['imagenes'], true);
            }
            \$mainImage = !empty($imagesList) ?$imagesList[0] : ($data['imagen'] ?? $data['image'] ?? '');
            $imagesJson = json_encode($imagesList, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $dropiId =$data['dropi_product_id'] ?? $data['dropiProductId'] ?? $data['dropi_id'] ?? null;

            if ($tableName === 'productos') {$sql = "INSERT INTO productos (
                    id, nombre, precio, stock, descripcion, imagen, imagenes, shipping_cost, flete_envio, flete, dropi_product_id, created_at
                ) VALUES (
                    :id, :nombre, :precio, :stock, :descripcion, :imagen, :imagenes, :shipping_cost, :flete_envio, :flete, :dropi_product_id, NOW()
                ) ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    precio = VALUES(precio),
                    stock = VALUES(stock),
                    descripcion = VALUES(descripcion),
                    imagen = VALUES(imagen),
                    imagenes = VALUES(imagenes),
                    shipping_cost = VALUES(shipping_cost),
                    flete_envio = VALUES(flete_envio),
                    flete = VALUES(flete),
                    dropi_product_id = COALESCE(NULLIF(VALUES(dropi_product_id), ''), dropi_product_id)";

                $stmt =$pdo->prepare($sql);$stmt->execute([
                    ':id'               => \$id,
                    ':nombre'           => \$title,
                    ':precio'           => \$price,
                    ':stock'            => \$stock,
                    ':descripcion'      => \$description,
                    ':imagen'           => \$mainImage,
                    ':imagenes'         => \$imagesJson,
                    ':shipping_cost'    => \$flete,
                    ':flete_envio'      => \$flete,
                    ':flete'            => \$flete,
                    ':dropi_product_id' => \$dropiId
                ]);
            }

            \$fetchStmt = $pdo->prepare("SELECT * FROM {$tableName} WHERE id = :id LIMIT 1");
            $fetchStmt->execute([':id' =>$id]);
            $savedRow =$fetchStmt->fetch();

            echo json_encode([
                'success'       => true,
                'message'       => 'Producto guardado',
                'shipping_cost' => \$flete,
                'data'          => formatProductOutput(\$savedRow)
            ]);
            exit;

        case 'PUT':
            $data =$inputData;
            \$id = $_GET['id'] ?? ($data['id'] ?? null);
            if (!\$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de producto requerido']);
                exit();
            }

            $flete = parseShippingCost($data);

            if ($tableName === 'productos') {$fields = [
                    "shipping_cost = :flete",
                    "flete_envio = :flete",
                    "flete = :flete"
                ];
                \$params = [
                    ':id'    => \$id,
                    ':flete' => \$flete
                ];

                if (isset($data['nombre']) || isset($data['title']) || isset($data['name'])) {$fields[] = "nombre = :nombre";
                    $params[':nombre'] =$data['nombre'] ?? $data['title'] ?? $data['name'];
                }
                if (isset(\$data['precio']) || isset($data['price'])) {$fields[] = "precio = :precio";
                    \$params[':precio'] = (float)($data['precio'] ?? $data['price']);
                }
                if (isset(\$data['stock']) || isset($data['inventario'])) {$fields[] = "stock = :stock";
                    \$params[':stock'] = (int)($data['stock'] ?? $data['inventario']);
                }
                if (isset(\$data['descripcion']) || isset($data['description'])) {$fields[] = "descripcion = :descripcion";
                    \$params[':descripcion'] = $data['descripcion'] ?? $data['description'];
                }
                if (isset($data['dropi_product_id']) || isset($data['dropiProductId']) || isset($data['dropi_id'])) {$fields[] = "dropi_product_id = :dropi_product_id";
                    $params[':dropi_product_id'] =$data['dropi_product_id'] ?? $data['dropiProductId'] ?? $data['dropi_id'];
                }

                \$fields[] = "updated_at = NOW()";
                \$sql = "UPDATE productos SET " . implode(', ', \$fields) . " WHERE id = :id OR slug = :id";
                \$stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            } else {
                \$fieldsToUpdate = [
                    "shipping_cost = :flete",
                    "flete_envio = :flete"
                ];
                \$params = [
                    ':id'    => \$id,
                    ':flete' => \$flete
                ];

                \$fieldsToUpdate[] = "updated_at = NOW()";
                \$sql = "UPDATE products SET " . implode(', ', \$fieldsToUpdate) . " WHERE id = :id OR slug = :id";
                \$stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }

            \$fetchStmt = $pdo->prepare("SELECT * FROM {$tableName} WHERE id = :id OR slug = :id LIMIT 1");
            $fetchStmt->execute([':id' =>$id]);
            $updatedRow =$fetchStmt->fetch();

            echo json_encode([
                'success'       => true,
                'message'       => 'Producto actualizado correctamente',
                'shipping_cost' => \$flete,
                'flete_envio'   => \$flete,
                'product'       => formatProductOutput(\$updatedRow),
                'data'          => formatProductOutput(\$updatedRow)
            ]);
            exit;

        case 'DELETE':
            \$id = $_GET['id'] ?? ($inputData['id'] ?? null);
            if (!\$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de producto requerido']);
                exit();
            }

            $stmt =$pdo->prepare("DELETE FROM {\$tableName} WHERE id = :id");
            $stmt->execute([':id' =>$id]);

            echo json_encode(['success' => true, 'message' => "Producto eliminado permanentemente"]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Método no permitido']);
            break;
    }
} catch (Exception \$e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error en la operación de MySQL en cPanel',
        'error'   => \$e->getMessage()
    ]);
}
