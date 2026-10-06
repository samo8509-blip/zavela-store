<?php
/**
 * ==============================================================================
 * ZavelaStore - API REST de Operaciones en Lote para cPanel (MySQL con PDO)
 * Archivo: products_batch.php
 * Ubicación recomendada en cPanel: /public_html/api/products_batch.php
 * ==============================================================================
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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

$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true) ?: [];

$action = $data['action'] ?? ($_GET['action'] ?? 'update_status');
$ids = $data['ids'] ?? [];

if (empty($ids) || !is_array($ids)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Lista de IDs de productos requerida'
    ]);
    exit();
}

try {
    $placeholders = implode(',', array_fill(0, count($ids), '?'));

    if ($action === 'delete') {
        $stmt = $pdo->prepare("DELETE FROM products WHERE id IN ($placeholders)");
        $stmt->execute($ids);
        $deletedCount = $stmt->rowCount();

        echo json_encode([
            'success'      => true,
            'message'      => "Se eliminaron {$deletedCount} productos de MySQL",
            'deletedCount' => $deletedCount
        ]);
        exit();
    }

    if ($action === 'update_status' || $action === 'status') {
        $status = isset($data['active']) ? ($data['active'] ? 1 : 0) : 1;
        $stmt = $pdo->prepare("UPDATE products SET active = ?, updated_at = NOW() WHERE id IN ($placeholders)");
        $stmt->execute(array_merge([$status], $ids));
        $affected = $stmt->rowCount();

        echo json_encode([
            'success'       => true,
            'message'       => "Se actualizó el estado de {$affected} productos en MySQL",
            'affectedCount' => $affected
        ]);
        exit();
    }

    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => "Acción desconocida '{$action}'"
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error al procesar lote en MySQL',
        'error'   => $e->getMessage()
    ]);
}
