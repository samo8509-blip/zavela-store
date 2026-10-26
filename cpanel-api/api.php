<?php
/**
 * ==============================================================================
 * ZavelaStore - Controlador Central API (cPanel MySQL)
 * Archivo: api.php
 * Ubicación: /public_html/api.php o /public_html/api/api.php
 * ==============================================================================
 */

// Headers CORS requeridos
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Manejo de preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Conexión PDO a MySQL
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

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        // [INTACTO] Lógica existente de obtención de pedidos y métricas de costos
        break;

    case 'POST':
        // [INTACTO] Lógica existente de creación y actualización de pedidos
        break;

    case 'DELETE':
        // 1. Capturar el ID enviado por React (desde $_GET, o desde el JSON en php://input)
        $rawInput = file_get_contents('php://input');
        $jsonData = json_decode($rawInput, true) ?: [];

        $id = $_GET['id'] 
            ?? $_GET['orderId'] 
            ?? $jsonData['id'] 
            ?? $jsonData['orderId'] 
            ?? $jsonData['order_id'] 
            ?? null;

        if (!$id && !empty($_SERVER['PATH_INFO'])) {
            $id = trim($_SERVER['PATH_INFO'], '/');
        }

        // Si no se proporcionó ID, retornar error controlado
        if (!$id) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'ID de pedido no proporcionado para eliminación'
            ]);
            break;
        }

        try {
            // Deshabilitar temporalmente foreign keys para evitar errores si existen tablas hijas
            $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

            // 2. Ejecutar DELETE estricto en la tabla pedidos
            $stmt = $pdo->prepare("DELETE FROM pedidos WHERE id = :id");
            $stmt->execute([':id' => $id]);

            // Limpieza preventiva de items relacionados si existe tabla de detalle
            try {
                $stmtItems = $pdo->prepare("DELETE FROM pedido_items WHERE pedido_id = :id OR order_id = :id");
                $stmtItems->execute([':id' => $id]);
            } catch (Exception $eItems) {
                // Silencioso si la tabla no existe en la base de datos
            }

            $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

            // 3. Respuesta JSON estricta de éxito para React
            echo json_encode(['success' => true]);
        } catch (PDOException $e) {
            try { $pdo->exec("SET FOREIGN_KEY_CHECKS = 1"); } catch (Exception $ign) {}
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Error al eliminar pedido: ' . $e->getMessage()
            ]);
        }
        break;

    default:
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'message' => 'Método HTTP no permitido'
        ]);
        break;
}
