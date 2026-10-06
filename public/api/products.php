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

// Helper para normalizar producto de MySQL a JSON del frontend
function formatProductOutput($row) {
    $images = [];
    if (!empty($row['images'])) {
        $decoded = json_decode($row['images'], true);
        $images = is_array($decoded) ? $decoded : explode(',', $row['images']);
    }

    $tags = [];
    if (!empty($row['tags'])) {
        $decoded = json_decode($row['tags'], true);
        $tags = is_array($decoded) ? $decoded : explode(',', $row['tags']);
    }

    $variants = [];
    if (!empty($row['variants'])) {
        $decoded = json_decode($row['variants'], true);
        $variants = is_array($decoded) ? $decoded : [];
    }

    $price = (float)($row['price'] ?? 0);
    $costPrice = (float)($row['cost_price'] ?? 0);
    $comparePrice = (float)($row['compare_price'] ?? 0);
    $marginAmount = $price - $costPrice;
    $marginPercentage = $costPrice > 0 ? round(($marginAmount / $costPrice) * 100, 1) : 0;

    return [
        'id'                 => (string)$row['id'],
        'title'              => $row['title'] ?? '',
        'slug'               => $row['slug'] ?? '',
        'description'        => $row['description'] ?? '',
        'shortDescription'   => $row['short_description'] ?? '',
        'price'              => $price,
        'costPrice'          => $costPrice,
        'compareAtPrice'     => $comparePrice,
        'discountPercentage' => (int)($row['discount_percentage'] ?? 0),
        'marginAmount'       => $marginAmount,
        'marginPercentage'   => $marginPercentage,
        'stock'              => (int)($row['stock'] ?? 0),
        'active'             => (bool)$row['active'],
        'featured'           => (bool)$row['featured'],
        'images'             => $images,
        'warrantyInfo'       => $row['warranty_info'] ?? '30 días de garantía oficial.',
        'tags'               => $tags,
        'categoryId'         => $row['category_id'] ?? 'cat-general',
        'categoryName'       => $row['category_name'] ?? 'General',
        'warehouseCity'      => $row['warehouse_city'] ?? 'Bogotá D.C.',
        'brand'              => $row['brand'] ?? 'Zavela Store',
        'dropi_product_id'   => $row['dropi_id'] ?? '',
        'variants'           => $variants,
        'weightKg'           => (float)($row['weight_kg'] ?? 0.5),
        'createdAt'          => $row['created_at'] ?? date('c'),
        'updatedAt'          => $row['updated_at'] ?? date('c')
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
                $sql = "SELECT * FROM products WHERE " . ($id ? "id = :query" : "slug = :query") . " LIMIT 1";
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

            if ($onlyActive) {
                $whereClauses[] = "active = 1";
            }
            if ($category) {
                $whereClauses[] = "(category_id = :category OR category_name LIKE :category_like)";
                $params[':category'] = $category;
                $params[':category_like'] = "%{$category}%";
            }
            if ($search) {
                $whereClauses[] = "(title LIKE :search OR description LIKE :search OR slug LIKE :search OR tags LIKE :search OR dropi_id LIKE :search)";
                $params[':search'] = "%{$search}%";
            }

            $sql = "SELECT * FROM products";
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

            // Si es acción en lote enviada a este archivo
            if (isset($_GET['action']) && $_GET['action'] === 'batch_status') {
                $ids = $data['ids'] ?? [];
                $status = isset($data['active']) ? (int)$data['active'] : 1;
                if (!empty($ids) && is_array($ids)) {
                    $inQuery = implode(',', array_fill(0, count($ids), '?'));
                    $stmt = $pdo->prepare("UPDATE products SET active = ?, updated_at = NOW() WHERE id IN ($inQuery)");
                    $stmt->execute(array_merge([$status], $ids));
                    echo json_encode([
                        'success' => true,
                        'message' => 'Estado actualizado en lote en MySQL',
                        'affected' => $stmt->rowCount()
                    ]);
                    exit();
                }
            }

            if (!$id) {
                $id = 'prod-' . round(microtime(true) * 1000);
            }

            $title = trim($data['title'] ?? $data['nombre'] ?? 'Nuevo Producto');
            $slug = trim($data['slug'] ?? '');
            if (empty($slug)) {
                $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $title), '-'));
                if (empty($slug)) $slug = $id;
            }

            $description = $data['description'] ?? $data['descripcion'] ?? '';
            $shortDescription = $data['shortDescription'] ?? $data['corta_descripcion'] ?? '';
            $price = (float)($data['price'] ?? $data['precio'] ?? 0);
            $costPrice = (float)($data['costPrice'] ?? $data['costo'] ?? 0);
            $comparePrice = (float)($data['compareAtPrice'] ?? $data['compare_price'] ?? 0);
            $discountPercentage = (int)($data['discountPercentage'] ?? ($comparePrice > $price && $comparePrice > 0 ? round((($comparePrice - $price) / $comparePrice) * 100) : 0));
            $stock = (int)($data['stock'] ?? $data['inventario'] ?? 10);
            $active = isset($data['active']) ? ($data['active'] ? 1 : 0) : (isset($data['activo']) ? ($data['activo'] ? 1 : 0) : 1);
            $featured = isset($data['featured']) ? ($data['featured'] ? 1 : 0) : (isset($data['destacado']) ? ($data['destacado'] ? 1 : 0) : 0);

            $images = $data['images'] ?? (isset($data['imagen']) ? [$data['imagen']] : []);
            $imagesJson = is_array($images) ? json_encode($images, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : '[]';

            $warrantyInfo = $data['warrantyInfo'] ?? '30 días de garantía oficial Zavela Store.';
            $tags = $data['tags'] ?? ['tendencia', 'calidad'];
            $tagsJson = is_array($tags) ? json_encode($tags, JSON_UNESCAPED_UNICODE) : '[]';

            $categoryId = $data['categoryId'] ?? 'cat-general';
            $categoryName = $data['categoryName'] ?? $data['categoria'] ?? 'General';
            $warehouseCity = $data['warehouseCity'] ?? 'Bogotá D.C.';
            $brand = $data['brand'] ?? 'Zavela Store';
            $dropiId = $data['dropi_product_id'] ?? $data['dropi_id'] ?? null;
            $variants = $data['variants'] ?? [];
            $variantsJson = is_array($variants) ? json_encode($variants, JSON_UNESCAPED_UNICODE) : '[]';
            $weightKg = (float)($data['weightKg'] ?? 0.5);

            // Upsert (INSERT ... ON DUPLICATE KEY UPDATE)
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

            // Leer producto recién guardado
            $fetchStmt = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
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

            // Actualización dinámica de campos recibidos
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
                'warrantyInfo'       => 'warranty_info',
                'categoryId'         => 'category_id',
                'categoryName'       => 'category_name',
                'warehouseCity'      => 'warehouse_city',
                'brand'              => 'brand',
                'dropi_product_id'   => 'dropi_id',
                'weightKg'           => 'weight_kg'
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
            if (isset($inputData['tags']) && is_array($inputData['tags'])) {
                $fieldsToUpdate[] = "tags = :tags";
                $params[':tags'] = json_encode($inputData['tags'], JSON_UNESCAPED_UNICODE);
            }
            if (isset($inputData['variants']) && is_array($inputData['variants'])) {
                $fieldsToUpdate[] = "variants = :variants";
                $params[':variants'] = json_encode($inputData['variants'], JSON_UNESCAPED_UNICODE);
            }

            if (!empty($fieldsToUpdate)) {
                $fieldsToUpdate[] = "updated_at = NOW()";
                $sql = "UPDATE products SET " . implode(', ', $fieldsToUpdate) . " WHERE id = :id";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }

            $fetchStmt = $pdo->prepare("SELECT * FROM products WHERE id = :id LIMIT 1");
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

            $stmt = $pdo->prepare("DELETE FROM products WHERE id = :id");
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
