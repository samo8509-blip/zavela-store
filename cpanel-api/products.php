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
$db_name = getenv('DB_NAME') ?: 'zavela_store'; // Cambiar por el nombre en cPanel (ej. user_zavela)
$db_user = getenv('DB_USER') ?: 'root';         // Cambiar por tu usuario MySQL cPanel
$db_pass = getenv('DB_PASS') ?: '';             // Cambiar por tu contraseña de MySQL

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

// Detectar tabla activa en la base de datos (prioriza tabla 'productos' de cPanel)
$tableName = 'productos';
try {
    $tblCheck = $pdo->query("SHOW TABLES LIKE 'productos'");
    if ($tblCheck->rowCount() === 0) {
        $tblProductsCheck = $pdo->query("SHOW TABLES LIKE 'products'");
        if ($tblProductsCheck->rowCount() > 0) {
            $tableName = 'products';
        }
    }

    // Auto-crear tabla configuraciones para el token de Meta Facebook
    $pdo->exec("CREATE TABLE IF NOT EXISTS `configuraciones` (
        `clave` VARCHAR(64) NOT NULL PRIMARY KEY,
        `valor` LONGTEXT NULL,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
} catch (Exception $e) {
    $tableName = 'productos';
}

// Soporte para endpoints de configuración (action=config o action=facebook_config)
$action = $_GET['action'] ?? ($inputData['action'] ?? '');
if ($action === 'config' || $action === 'facebook_config') {
    if ($action === 'facebook_config') {
        if ($method === 'GET') {
            $stmt = $pdo->prepare("SELECT valor FROM configuraciones WHERE clave = 'meta_facebook_config' LIMIT 1");
            $stmt->execute();
            $row = $stmt->fetch();
            $cfg = $row ? json_decode($row['valor'], true) : null;
            echo json_encode(['success' => true, 'data' => $cfg]);
            exit();
        } else if ($method === 'POST') {
            $json = json_encode($inputData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            $stmt = $pdo->prepare("INSERT INTO configuraciones (clave, valor) VALUES ('meta_facebook_config', :val) ON DUPLICATE KEY UPDATE valor = VALUES(valor)");
            $stmt->execute([':val' => $json]);
            if (!empty($inputData['accessToken'])) {
                $stmt2 = $pdo->prepare("INSERT INTO configuraciones (clave, valor) VALUES ('facebook_access_token', :tok) ON DUPLICATE KEY UPDATE valor = VALUES(valor)");
                $stmt2->execute([':tok' => $inputData['accessToken']]);
            }
            if (!empty($inputData['pageId'])) {
                $stmt3 = $pdo->prepare("INSERT INTO configuraciones (clave, valor) VALUES ('facebook_page_id', :pid) ON DUPLICATE KEY UPDATE valor = VALUES(valor)");
                $stmt3->execute([':pid' => $inputData['pageId']]);
            }
            echo json_encode(['success' => true, 'message' => 'Configuración de Facebook guardada en MySQL']);
            exit();
        }
    } else {
        if ($method === 'GET') {
            $clave = $_GET['clave'] ?? '';
            $stmt = $pdo->prepare("SELECT valor FROM configuraciones WHERE clave = :clave LIMIT 1");
            $stmt->execute([':clave' => $clave]);
            $row = $stmt->fetch();
            echo json_encode(['success' => true, 'valor' => $row ? $row['valor'] : null]);
            exit();
        } else if ($method === 'POST') {
            $clave = $inputData['clave'] ?? '';
            $valor = $inputData['valor'] ?? '';
            if (!empty($clave)) {
                $stmt = $pdo->prepare("INSERT INTO configuraciones (clave, valor) VALUES (:clave, :valor) ON DUPLICATE KEY UPDATE valor = VALUES(valor)");
                $stmt->execute([':clave' => $clave, ':valor' => $valor]);
            }
            echo json_encode(['success' => true, 'message' => 'Configuración guardada en MySQL']);
            exit();
        }
    }
}

// Helper para normalizar producto de MySQL a JSON del frontend
function formatProductOutput($row) {
    // Parsear galería de imágenes (soporta columna imagenes, images, imagen)
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
    $costPrice = (float)($row['costo'] ?? $row['cost_price'] ?? 0);
    $comparePrice = (float)($row['compare_price'] ?? ($price > 0 ? $price + 20000 : 0));
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
    if (!empty($row['variants'])) {
        $decodedVars = is_string($row['variants']) ? json_decode($row['variants'], true) : $row['variants'];
        $variants = is_array($decodedVars) ? $decodedVars : [];
    }

    return [
        'id'                 => (string)$row['id'],
        'title'              => $title,
        'nombre'             => $title,
        'name'               => $title,
        'slug'               => $slug,
        'description'        => $description,
        'descripcion'        => $description,
        'shortDescription'   => $shortDescription,
        'price'              => $price,
        'precio'             => $price,
        'costPrice'          => $costPrice,
        'compareAtPrice'     => $comparePrice,
        'discountPercentage' => (int)($row['discount_percentage'] ?? 0),
        'marginAmount'       => $marginAmount,
        'marginPercentage'   => $marginPercentage,
        'stock'              => $stock,
        'active'             => $active,
        'featured'           => $featured,
        'image'              => $mainImage,
        'imagen'             => $mainImage,
        'images'             => $images,
        'imagenes'           => $images,
        'warrantyInfo'       => $row['warranty_info'] ?? '30 días de garantía oficial Zavela Store.',
        'tags'               => $tags,
        'categoryId'         => $row['category_id'] ?? 'cat-general',
        'categoryName'       => $row['category_name'] ?? 'General',
        'warehouseCity'      => $row['warehouse_city'] ?? 'Bogotá D.C.',
        'brand'              => $row['brand'] ?? 'Zavela Store',
        'dropi_product_id'   => (string)$dropiId,
        'dropiProductId'     => (string)$dropiId,
        'dropi_id'           => (string)$dropiId,
        'variants'           => $variants,
        'weightKg'           => (float)($row['weight_kg'] ?? 0.5),
        'createdAt'          => $row['created_at'] ?? date('c'),
        'updatedAt'          => $row['updated_at'] ?? ($row['created_at'] ?? date('c'))
    ];
}

// 4. Enrutamiento CRUD según Método HTTP
try {
    switch ($method) {
        // =====================================================================
        // GET: Listar todos los productos o consultar uno específico por ?id=
        // =====================================================================
        case 'GET':
            $id = $_GET['id'] ?? null;
            $slug = $_GET['slug'] ?? null;
            $onlyActive = isset($_GET['only_active']) && ($_GET['only_active'] === 'true' || $_GET['only_active'] === '1');
            $category = $_GET['category'] ?? null;
            $search = $_GET['search'] ?? null;

            if ($id || $slug) {
                $checkField = $id ? "id = :query" : ($tableName === 'productos' ? "(id = :query OR nombre = :query)" : "(id = :query OR slug = :query)");
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

            // Listado con filtros
            $whereClauses = [];
            $params = [];

            if ($onlyActive && $tableName === 'products') {
                $whereClauses[] = "active = 1";
            }
            if ($search) {
                if ($tableName === 'productos') {
                    $whereClauses[] = "(nombre LIKE :search OR descripcion LIKE :search OR dropi_product_id LIKE :search)";
                } else {
                    $whereClauses[] = "(title LIKE :search OR description LIKE :search OR slug LIKE :search OR tags LIKE :search OR dropi_id LIKE :search)";
                }
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

        // =====================================================================
        // POST: Crear nuevo producto o Actualizar si ya incluye ?id= o id en el body
        // =====================================================================
        case 'POST':
            $data = $inputData;
            $id = $_GET['id'] ?? ($data['id'] ?? null);

            if (!$id) {
                $id = 'prod-' . round(microtime(true) * 1000);
            }

            $title = trim($data['nombre'] ?? $data['title'] ?? $data['name'] ?? 'Nuevo Producto');
            $slug = trim($data['slug'] ?? '');
            if (empty($slug)) {
                $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title), '-'));
                if (empty($slug)) $slug = $id;
            }

            $description = $data['descripcion'] ?? $data['description'] ?? '';
            $shortDescription = $data['short_description'] ?? $data['shortDescription'] ?? '';
            $price = (float)($data['precio'] ?? $data['price'] ?? 0);
            $costPrice = (float)($data['costo'] ?? $data['costPrice'] ?? 0);
            $comparePrice = (float)($data['compare_price'] ?? $data['compareAtPrice'] ?? 0);
            $discountPercentage = (int)($data['discountPercentage'] ?? ($comparePrice > $price && $comparePrice > 0 ? round((($comparePrice - $price) / comparePrice) * 100) : 0));
            $stock = (int)($data['stock'] ?? $data['inventario'] ?? 10);
            $active = isset($data['active']) ? ($data['active'] ? 1 : 0) : (isset($data['activo']) ? ($data['activo'] ? 1 : 0) : 1);
            $featured = isset($data['featured']) ? ($data['featured'] ? 1 : 0) : (isset($data['destacado']) ? ($data['destacado'] ? 1 : 0) : 0);

            // Imágenes y galería
            $imagesList = [];
            if (!empty($data['images']) && is_array($data['images'])) {
                $imagesList = $data['images'];
            } else if (!empty($data['imagenes'])) {
                if (is_array($data['imagenes'])) {
                    $imagesList = $data['imagenes'];
                } else if (is_string($data['imagenes'])) {
                    $decoded = json_decode($data['imagenes'], true);
                    $imagesList = is_array($decoded) ? $decoded : array_map('trim', explode(',', $data['imagenes']));
                }
            }
            if (empty($imagesList) && !empty($data['imagen'])) {
                $imagesList = [$data['imagen']];
            }
            if (empty($imagesList) && !empty($data['image'])) {
                $imagesList = [$data['image']];
            }
            $mainImage = !empty($imagesList) ? $imagesList[0] : ($data['imagen'] ?? $data['image'] ?? '');
            $imagesJson = json_encode($imagesList, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

            $dropiId = $data['dropi_product_id'] ?? $data['dropiProductId'] ?? $data['dropi_id'] ?? null;

            if ($tableName === 'productos') {
                // Guardado específico en la tabla 'productos' (MySQL cPanel)
                $sql = "INSERT INTO productos (
                    id, nombre, precio, stock, descripcion, imagen, imagenes, dropi_product_id, created_at
                ) VALUES (
                    :id, :nombre, :precio, :stock, :descripcion, :imagen, :imagenes, :dropi_product_id, NOW()
                ) ON DUPLICATE KEY UPDATE
                    nombre = VALUES(nombre),
                    precio = VALUES(precio),
                    stock = VALUES(stock),
                    descripcion = VALUES(descripcion),
                    imagen = VALUES(imagen),
                    imagenes = VALUES(imagenes),
                    dropi_product_id = VALUES(dropi_product_id)";

                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':id'               => $id,
                    ':nombre'           => $title,
                    ':precio'           => $price,
                    ':stock'            => $stock,
                    ':descripcion'      => $description,
                    ':imagen'           => $mainImage,
                    ':imagenes'         => $imagesJson,
                    ':dropi_product_id' => $dropiId
                ]);
            } else {
                // Guardado en tabla extendida 'products'
                $warrantyInfo = $data['warrantyInfo'] ?? '30 días de garantía oficial Zavela Store.';
                $tags = $data['tags'] ?? ['tendencia', 'calidad'];
                $tagsJson = is_array($tags) ? json_encode($tags, JSON_UNESCAPED_UNICODE) : '[]';
                $categoryId = $data['categoryId'] ?? 'cat-general';
                $categoryName = $data['categoryName'] ?? $data['categoria'] ?? 'General';
                $warehouseCity = $data['warehouseCity'] ?? 'Bogotá D.C.';
                $brand = $data['brand'] ?? 'Zavela Store';
                $variants = $data['variants'] ?? [];
                $variantsJson = is_array($variants) ? json_encode($variants, JSON_UNESCAPED_UNICODE) : '[]';
                $weightKg = (float)($data['weightKg'] ?? 0.5);

                $sql = "INSERT INTO products (
                    id, title, slug, description, short_description, price, cost_price, compare_price,
                    discount_percentage, stock, active, featured, images, warranty_info, tags,
                    category_id, category_name, warehouse_city, brand, dropi_id, variants, weight_kg, updated_at
                ) VALUES (
                    :id, :title, :slug, :description, :short_description, :price, :cost_price, :compare_price,
                    :discount_percentage, :stock, :active, :featured, :images, :warranty_info, :tags,
                    :category_id, :category_name, :warehouse_city, :brand, :dropi_id, :variants, :weight_kg, NOW()
                ) ON DUPLICATE KEY UPDATE
                    title = VALUES(title),
                    slug = VALUES(slug),
                    description = VALUES(description),
                    short_description = VALUES(short_description),
                    price = VALUES(price),
                    cost_price = VALUES(cost_price),
                    compare_price = VALUES(compare_price),
                    discount_percentage = VALUES(discount_percentage),
                    stock = VALUES(stock),
                    active = VALUES(active),
                    featured = VALUES(featured),
                    images = VALUES(images),
                    warranty_info = VALUES(warranty_info),
                    tags = VALUES(tags),
                    category_id = VALUES(category_id),
                    category_name = VALUES(category_name),
                    warehouse_city = VALUES(warehouse_city),
                    brand = VALUES(brand),
                    dropi_id = VALUES(dropi_id),
                    variants = VALUES(variants),
                    weight_kg = VALUES(weight_kg),
                    updated_at = NOW()";

                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':id'                  => $id,
                    ':title'               => $title,
                    ':slug'                => $slug,
                    ':description'         => $description,
                    ':short_description'   => $shortDescription,
                    ':price'               => $price,
                    ':cost_price'          => $costPrice,
                    ':compare_price'       => $comparePrice,
                    ':discount_percentage' => $discountPercentage,
                    ':stock'               => $stock,
                    ':active'              => $active,
                    ':featured'            => $featured,
                    ':images'              => $imagesJson,
                    ':warranty_info'       => $warrantyInfo,
                    ':tags'                => $tagsJson,
                    ':category_id'         => $categoryId,
                    ':category_name'       => $categoryName,
                    ':warehouse_city'      => $warehouseCity,
                    ':brand'               => $brand,
                    ':dropi_id'            => $dropiId,
                    ':variants'            => $variantsJson,
                    ':weight_kg'           => $weightKg
                ]);
            }

            // Leer producto recién guardado
            $fetchStmt = $pdo->prepare("SELECT * FROM {$tableName} WHERE id = :id LIMIT 1");
            $fetchStmt->execute([':id' => $id]);
            $savedRow = $fetchStmt->fetch();

            echo json_encode([
                'success' => true,
                'message' => 'Producto guardado exitosamente en MySQL (cPanel)',
                'data'    => formatProductOutput($savedRow)
            ]);
            break;

        // =====================================================================
        // PUT: Actualización de producto por ?id=
        // =====================================================================
        case 'PUT':
            $id = $_GET['id'] ?? ($inputData['id'] ?? null);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de producto requerido']);
                exit();
            }

            if ($tableName === 'productos') {
                $fields = [];
                $params = [':id' => $id];

                if (isset($inputData['nombre']) || isset($inputData['title'])) {
                    $fields[] = "nombre = :nombre";
                    $params[':nombre'] = $inputData['nombre'] ?? $inputData['title'];
                }
                if (isset($inputData['precio']) || isset($inputData['price'])) {
                    $fields[] = "precio = :precio";
                    $params[':precio'] = (float)($inputData['precio'] ?? $inputData['price']);
                }
                if (isset($inputData['stock']) || isset($inputData['inventario'])) {
                    $fields[] = "stock = :stock";
                    $params[':stock'] = (int)($inputData['stock'] ?? $inputData['inventario']);
                }
                if (isset($inputData['descripcion']) || isset($inputData['description'])) {
                    $fields[] = "descripcion = :descripcion";
                    $params[':descripcion'] = $inputData['descripcion'] ?? $inputData['description'];
                }
                if (isset($inputData['dropi_product_id']) || isset($inputData['dropiProductId']) || isset($inputData['dropi_id'])) {
                    $fields[] = "dropi_product_id = :dropi_product_id";
                    $params[':dropi_product_id'] = $inputData['dropi_product_id'] ?? $inputData['dropiProductId'] ?? $inputData['dropi_id'];
                }
                if (isset($inputData['images']) || isset($inputData['imagenes'])) {
                    $raw = $inputData['images'] ?? $inputData['imagenes'];
                    $arr = is_array($raw) ? $raw : json_decode($raw, true);
                    if (is_array($arr) && !empty($arr)) {
                        $fields[] = "imagen = :imagen";
                        $params[':imagen'] = $arr[0];
                        $fields[] = "imagenes = :imagenes";
                        $params[':imagenes'] = json_encode($arr, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                    }
                } else if (isset($inputData['imagen']) || isset($inputData['image'])) {
                    $img = $inputData['imagen'] ?? $inputData['image'];
                    $fields[] = "imagen = :imagen";
                    $params[':imagen'] = $img;
                }

                if (!empty($fields)) {
                    $sql = "UPDATE productos SET " . implode(', ', $fields) . " WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                }
            } else {
                $fieldsToUpdate = [];
                $params = [':id' => $id];

                $mapping = [
                    'title'              => 'title',
                    'slug'               => 'slug',
                    'description'        => 'description',
                    'shortDescription'   => 'short_description',
                    'price'              => 'price',
                    'costPrice'          => 'cost_price',
                    'compareAtPrice'     => 'compare_price',
                    'discountPercentage' => 'discount_percentage',
                    'stock'              => 'stock',
                    'active'             => 'active',
                    'featured'           => 'featured',
                    'dropi_product_id'   => 'dropi_id'
                ];

                foreach ($mapping as $jsonKey => $dbCol) {
                    if (array_key_exists($jsonKey, $inputData)) {
                        $val = $inputData[$jsonKey];
                        if ($dbCol === 'active' || $dbCol === 'featured') {
                            $val = $val ? 1 : 0;
                        }
                        $fieldsToUpdate[] = "{$dbCol} = :{$dbCol}";
                        $params[":{$dbCol}"] = $val;
                    }
                }

                if (isset($inputData['images']) && is_array($inputData['images'])) {
                    $fieldsToUpdate[] = "images = :images";
                    $params[':images'] = json_encode($inputData['images'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                }

                if (!empty($fieldsToUpdate)) {
                    $fieldsToUpdate[] = "updated_at = NOW()";
                    $sql = "UPDATE products SET " . implode(', ', $fieldsToUpdate) . " WHERE id = :id";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute($params);
                }
            }

            $fetchStmt = $pdo->prepare("SELECT * FROM {$tableName} WHERE id = :id LIMIT 1");
            $fetchStmt->execute([':id' => $id]);
            $updatedRow = $fetchStmt->fetch();

            if (!$updatedRow) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'Producto no encontrado']);
                exit();
            }

            echo json_encode([
                'success' => true,
                'message' => 'Producto actualizado en MySQL (cPanel)',
                'data'    => formatProductOutput($updatedRow)
            ]);
            break;

        // =====================================================================
        // DELETE: Eliminar producto por ?id=
        // =====================================================================
        case 'DELETE':
            $id = $_GET['id'] ?? ($inputData['id'] ?? null);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'ID de producto requerido']);
                exit();
            }

            $stmt = $pdo->prepare("DELETE FROM {$tableName} WHERE id = :id");
            $stmt->execute([':id' => $id]);

            if ($stmt->rowCount() === 0) {
                http_response_code(404);
                echo json_encode(['success' => false, 'message' => 'El producto no existía en la base de datos']);
                exit();
            }

            echo json_encode([
                'success' => true,
                'message' => "Producto con ID '{$id}' eliminado permanentemente de MySQL (cPanel)"
            ]);
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
        'message' => 'Error en la operación de MySQL en cPanel',
        'error'   => $e->getMessage()
    ]);
}
