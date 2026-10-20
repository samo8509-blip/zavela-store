<?php
/**
 * ==============================================================================
 * ZavelaStore - Controlador Seguro de Creación de Pedidos y Descuento de Inventario
 * Archivo: createOrder.php
 * Ubicación recomendada en cPanel: /public_html/api/createOrder.php
 * ==============================================================================
 * 
 * REGLA DE SEGURIDAD EXTREMA:
 * Al procesar un pedido, este archivo TIENE PROHIBIDO actualizar o sobrescribir
 * columnas como nombre, precio, imagen, descripción o categoría.
 * ÚNICAMENTE resta la cantidad comprada a la columna `stock`.
 */

// 1. Headers CORS y Respuesta JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 2. Conexión a la Base de Datos MySQL con PDO
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
        'message' => 'Error de conexión MySQL en cPanel',
        'error'   => $e->getMessage()
    ]);
    exit();
}

// 3. Capturar payload de la compra
$inputJSON = file_get_contents('php://input');
$orderData = json_decode($inputJSON, true) ?: [];

// Detectar tabla activa ('productos' o 'products')
$tableName = 'productos';
try {
    $tblCheck = $pdo->query("SHOW TABLES LIKE 'productos'");
    if ($tblCheck->rowCount() === 0) {
        $tableName = 'products';
    }
} catch (Exception $e) {
    $tableName = 'productos';
}

$items = $orderData['items'] ?? ($orderData['productos'] ?? []);
if (empty($items) || !is_array($items)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'El pedido no contiene productos para procesar']);
    exit();
}

$updatedProducts = [];

$pdo->beginTransaction();
try {
    // ==============================================================================
    // CONSULTA SQL DE DESCUENTO SEGURO DE INVENTARIO
    // ------------------------------------------------------------------------------
    // CORRECTO: UPDATE productos SET stock = GREATEST(0, stock - :cantidad) WHERE id = :id_producto
    // TOTALMENTE PROHIBIDO: Actualizar campos como nombre, precio, imagen, categoria.
    // ==============================================================================
    $sqlDeduct = "UPDATE {$tableName} SET stock = GREATEST(0, stock - :cantidad), updated_at = NOW() WHERE id = :id_producto";
    $stmtDeduct = $pdo->prepare($sqlDeduct);

    foreach ($items as $item) {
        // Obtener el ID original y completo del producto tal como reside en la base de datos
        // (sin alteraciones ni recortes de prefijos que puedan corromper la relación)
        $productId = $item['id'] ?? ($item['productId'] ?? ($item['id_producto'] ?? null));
        $quantity = isset($item['quantity']) ? (int)$item['quantity'] : (isset($item['cantidad']) ? (int)$item['cantidad'] : 1);

        if (!$productId || $quantity <= 0) {
            continue;
        }

        // Ejecutar el descuento de inventario seguro
        $stmtDeduct->execute([
            ':cantidad'    => $quantity,
            ':id_producto' => (string)$productId
        ]);

        $updatedProducts[] = [
            'id_producto' => (string)$productId,
            'cantidad_descontada' => $quantity
        ];
    }

    $pdo->commit();

    echo json_encode([
        'success'                 => true,
        'message'                 => 'Inventario actualizado con éxito sin alterar metadatos del producto',
        'productos_actualizados' => $updatedProducts
    ]);
} catch (Exception $e) {
    $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar el descuento de inventario en MySQL',
        'error'   => $e->getMessage()
    ]);
}
