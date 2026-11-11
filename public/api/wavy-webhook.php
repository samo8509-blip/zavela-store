<?php
/**
 * ==============================================================================
 * ZavelaStore - Webhook de Integración para Wavy (Wai) WhatsApp Business API
 * Archivo: wavy-webhook.php
 * Ubicación: /public_html/wavy-webhook.php o /public_html/api/wavy-webhook.php
 * 
 * Intercepta y ejecuta llamadas a funciones (tool calls) en segundo plano
 * evitando que se muestren objetos JSON al cliente en el chat de WhatsApp.
 * ==============================================================================
 */

// 1. Headers CORS y JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$store_name = 'Zavela Store Colombia';
$store_url = 'https://zavelastore.com.co';

// 2. Conexión a Base de Datos MySQL (cPanel)
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'zavela_store';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';

$pdo = null;
try {
    $pdo = new PDO(
        "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",
        $db_user,
        $db_pass,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (Exception $e) {
    $pdo = null;
}

/**
 * Función que ejecuta la herramienta buscar_productos en MySQL
 * y devuelve ÚNICAMENTE texto natural para WhatsApp (cero JSON).
 */
function executeBuscarProductosPhp($pdo, $query, $store_name, $store_url) {
    $query = trim((string)$query);
    if (empty($query)) {
        return "Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.";
    }

    $products = [];
    if ($pdo !== null) {
        try {
            $tableName = 'productos';
            $tblCheck = $pdo->query("SHOW TABLES LIKE 'productos'");
            if ($tblCheck->rowCount() === 0) {
                $tableName = 'products';
            }

            // Separar palabras clave
            $words = preg_split('/\s+/', mb_strtolower($query, 'UTF-8'));
            $stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'para', 'y', 'en', 'con', 'por', 'a', 'al', 'que', 'me', 'interesa', 'quiero', 'precio', 'tienen', 'venden', 'comprar'];
            $keywords = array_values(array_filter($words, function($w) use ($stopWords) {
                return mb_strlen($w, 'UTF-8') >= 2 && !in_array($w, $stopWords);
            }));

            if (!empty($keywords)) {
                $conditions = [];
                $params = [];
                foreach ($keywords as $kw) {
                    $conditions[] = "(LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ? OR LOWER(categoria) LIKE ?)";
                    $params[] = '%' . $kw . '%';
                    $params[] = '%' . $kw . '%';
                    $params[] = '%' . $kw . '%';
                }
                $whereSql = implode(' AND ', $conditions);

                $sql = "SELECT * FROM {$tableName} WHERE ({$whereSql}) AND active = 1 AND LOWER(nombre) NOT LIKE '%asesor%' AND LOWER(nombre) NOT LIKE '%admin%' AND LOWER(nombre) NOT LIKE '%prueba%' LIMIT 3";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
                $products = $stmt->fetchAll();
            }

            // Si no encontró por keywords compuestas, probar coincidencia parcial simple
            if (empty($products)) {
                $likeParam = '%' . mb_strtolower($query, 'UTF-8') . '%';
                $stmtLike = $pdo->prepare("SELECT * FROM {$tableName} WHERE (LOWER(nombre) LIKE ? OR LOWER(categoria) LIKE ?) AND active = 1 AND LOWER(nombre) NOT LIKE '%asesor%' AND LOWER(nombre) NOT LIKE '%admin%' LIMIT 3");
                $stmtLike->execute([$likeParam, $likeParam]);
                $products = $stmtLike->fetchAll();
            }
        } catch (Exception $eSql) {
            $products = [];
        }
    }

    if (!empty($products)) {
        if (count($products) === 1) {
            $p = $products[0];
            $id = $p['id'];
            $title = $p['nombre'] ?? $p['title'] ?? 'Producto Zavela';
            $price = (float)($p['precio'] ?? $p['price'] ?? 0);
            $formattedPrice = '$' . number_format($price, 0, ',', '.') . ' COP';
            $link = "{$store_url}/producto/{$id}";

            return "¡Con mucho gusto! Te confirmo la disponibilidad en nuestro inventario en vivo de Zavela Store:\n\n" .
                   "🛍️ *{$title}*\n" .
                   "💰 *Precio oficial:* {$formattedPrice}\n" .
                   "📦 *Disponibilidad:* Disponible para despacho inmediato\n" .
                   "🚚 *Envío Nacional con Pago Contra Entrega:* Pagas en efectivo al transportador al recibir en tu domicilio (2 a 5 días hábiles).\n" .
                   "🔗 *Ver fotos y detalles:* {$link}\n\n" .
                   "¿Deseas que preparemos tu despacho hoy mismo? Por favor compárteme tu Nombre completo, Teléfono, Dirección y Ciudad para apartarlo en bodega. 📦✨";
        } else {
            $text = "¡Con mucho gusto! Te comparto las opciones confirmadas en nuestro inventario en vivo de Zavela Store:\n\n";
            $i = 1;
            foreach ($products as $p) {
                $id = $p['id'];
                $title = $p['nombre'] ?? $p['title'] ?? 'Producto Zavela';
                $price = (float)($p['precio'] ?? $p['price'] ?? 0);
                $formattedPrice = '$' . number_format($price, 0, ',', '.') . ' COP';
                $link = "{$store_url}/producto/{$id}";
                $text .= "{$i}️⃣ *{$title}*\n💰 Precio: *{$formattedPrice}*\n🔗 Ficha: {$link}\n\n";
                $i++;
            }
            $text .= "🚚 *Todos los pedidos cuentan con Envío Nacional y Pago Contra Entrega en efectivo.*\n\n" .
                     "¿Cuál de estas alternativas te gustaría ordenar? Indícame tu ciudad y con gusto te tomo el pedido. 😊";
            return $text;
        }
    }

    return "Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.\n\n" .
           "En este momento no encontré una coincidencia exacta para \"{$query}\" en nuestra bodega principal, pero puedes consultar todo nuestro catálogo oficial con Pago Contra Entrega aquí:\n" .
           "👉 {$store_url}/catalogo\n\n" .
           "¿Deseas consultar sobre otra categoría o producto? Con gusto te asesoro. 🛍️";
}

// 3. Handshake / Verificación GET desde Wavy o explorador
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $challenge = $_GET['challenge'] ?? $_GET['hub_challenge'] ?? $_GET['echo'] ?? null;
    if ($challenge !== null) {
        header('Content-Type: text/plain; charset=utf-8');
        echo $challenge;
        exit();
    }

    echo json_encode([
        'status' => 'online',
        'service' => 'Wavy (Wai) WhatsApp Webhook - Zavela Store PHP',
        'timestamp' => date('c'),
        'endpoint' => '/api/wavy-webhook.php'
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

// 4. Procesamiento de Eventos POST
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true) ?: [];

// Extracción flexible de teléfono y mensaje
$raw_phone = $data['phone'] ?? $data['from'] ?? $data['sender'] ?? $data['contact']['phone'] ?? $data['customer']['phone'] ?? '';
$raw_message = $data['message'] ?? $data['text'] ?? $data['body'] ?? $data['content'] ?? $data['msg'] ?? '';

// Normalizar número telefónico
$phone = preg_replace('/\D/', '', (string)$raw_phone);
if (strlen($phone) === 10 && str_starts_with($phone, '3')) {
    $phone = '57' . $phone;
}

$message = trim((string)$raw_message);
$msg_lower = mb_strtolower($message, 'UTF-8');

if (empty($message) && empty($phone)) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'status' => 'IGNORED_NO_PAYLOAD',
        'message' => 'No incoming message detected'
    ]);
    exit();
}

$reply_text = '';

// ==============================================================================
// 5. INTERCEPCIÓN DE FUNCTION CALLING / TOOL CALLS (buscar_productos)
// Si el mensaje contiene un objeto JSON de llamada a herramienta, se intercepta
// y ejecuta en segundo plano SIN mostrar el JSON al cliente de WhatsApp.
// ==============================================================================
$is_tool_call = false;
$extracted_query = '';

if (preg_match('/(?:tool|function)["\']?\s*:\s*["\']?buscar_productos/i', $message) ||
    preg_match('/\{[\s\S]*?buscar_productos[\s\S]*?\}/i', $message)) {
    
    $is_tool_call = true;
    
    // Intento 1: Regex sobre query: valor o "query": "valor"
    if (preg_match('/(?:query|producto|q|search|termino)\s*[:=]\s*["\']?([^"\'\}\n\r]+)["\']?/i', $message, $m)) {
        $extracted_query = trim($m[1]);
    }
    
    // Intento 2: JSON decode
    if (empty($extracted_query)) {
        $cleanJson = preg_replace('/^[^{]*/', '', $message);
        $cleanJson = preg_replace('/[^}]*$/', '', $cleanJson);
        $decoded = json_decode($cleanJson, true);
        if ($decoded && !empty($decoded['query'])) {
            $extracted_query = trim($decoded['query']);
        } elseif ($decoded && !empty($decoded['producto'])) {
            $extracted_query = trim($decoded['producto']);
        }
    }
    
    // Intento 3: Captura flexible
    if (empty($extracted_query)) {
        if (preg_match('/query\s*:\s*([^\}\n]+)/i', $message, $m2)) {
            $extracted_query = trim(str_replace(['"', "'"], '', $m2[1]));
        }
    }

    if (empty($extracted_query)) {
        $extracted_query = preg_replace('/[{}":,]|tool|buscar_productos|query/i', '', $message);
        $extracted_query = trim($extracted_query);
    }

    $reply_text = executeBuscarProductosPhp($pdo, $extracted_query ?: $message, $store_name, $store_url);
}

// Si no fue una llamada a tool explícita, procesar intenciones conversacionales
if (!$is_tool_call) {
    if (preg_match('/^(hola|buenas|buenos dias|buenas tardes|buenas noches|inicio|menu|hi|hello)/i', $msg_lower)) {
        $reply_text = "¡Hola! 👋 Te damos la bienvenida a *{$store_name}*.\n\nSoy *Elizabeth*, tu Asesora Ejecutiva. ¿En qué te puedo colaborar hoy?\n\n1️⃣ Ver catálogo y consultar disponibilidad en vivo\n2️⃣ Información sobre *Pago Contra Entrega* (Pagas al recibir en casa)\n3️⃣ Estado de un pedido o guía de despacho\n4️⃣ Atención con un asesor humano\n\n_Escríbeme el nombre del producto que buscas y con gusto te confirmo inventario y precio._ 🛍️✨";
    } elseif (str_contains($msg_lower, 'contra entrega') || str_contains($msg_lower, 'envio') || str_contains($msg_lower, 'flete') || str_contains($msg_lower, 'pago') || str_contains($msg_lower, 'domicilio')) {
        $reply_text = "🚚 *¡En {$store_name} tu compra es 100% segura!* 🇨🇴\n\n✅ *Envío Nacional y Pago Contra Entrega* a toda Colombia.\n✅ El despacho tarda entre 2 y 5 días hábiles con transportadoras certificadas (Servientrega, Coordinadora o Envía).\n✅ Pagas en efectivo directamente al transportador cuando tengas el producto en mano.\n\n¿Qué producto te gustaría pedir? Dime el nombre o referencia para verificar inventario en vivo. 📦";
    } elseif (str_contains($msg_lower, 'guia') || str_contains($msg_lower, 'pedido') || str_contains($msg_lower, 'rastreo') || str_contains($msg_lower, 'despacho') || str_contains($msg_lower, 'estado')) {
        $reply_text = "📦 *Rastreo de Despachos Zavela Store*\n\nPara consultar el estado de tu pedido, por favor facilítame:\n\n• Tu *Nombre Completo*\n• Número de *Cédula* o *Celular registrado*\n• Producto adquirido\n\nUn asesor revisará de inmediato la guía en nuestra base de datos en vivo. 🚚💨";
    } elseif (str_contains($msg_lower, 'si') || str_contains($msg_lower, 'sí') || str_contains($msg_lower, 'quiero') || str_contains($msg_lower, 'comprar')) {
        $reply_text = "¡Con mucho gusto! 📦 Para registrar tu pedido con Pago Contra Entrega en Colombia, por favor compárteme:\n\n👤 Nombre completo:\n📱 Teléfono de contacto:\n📍 Dirección y Barrio:\n🏙️ Ciudad y Departamento:\n\nQuedo atenta para apartar tu producto y procesarlo de inmediato. 😊";
    } else {
        // Ejecutar buscar_productos para cualquier consulta de producto o término
        $reply_text = executeBuscarProductosPhp($pdo, $message, $store_name, $store_url);
    }
}

// 6. Sanitización final obligatoria: NUNCA permitir que ningún bloque { tool: ... } salga hacia WhatsApp
$reply_text = preg_replace('/\{[\s\S]*?tool[\s\S]*?\}/i', '', $reply_text);
$reply_text = preg_replace('/```(?:json)?[\s\S]*?```/i', '', $reply_text);
$reply_text = preg_replace('/^json\s*$/im', '', $reply_text);
$reply_text = trim($reply_text);

if (empty($reply_text)) {
    $reply_text = "Permíteme verificar el sistema de inventario en vivo para confirmarte disponibilidad.";
}

// 7. Payload de respuesta estructurado para Wavy (Wai)
$response_payload = [
    'success' => true,
    'status' => 'success',
    'timestamp' => date('c'),
    'phone' => $phone ?: 'unknown',
    'reply' => [
        'recipient' => $phone,
        'type' => 'text',
        'text' => [
            'body' => $reply_text
        ]
    ],
    'response' => [
        'type' => 'text',
        'text' => $reply_text
    ],
    'messages' => [
        [
            'type' => 'text',
            'text' => $reply_text
        ]
    ],
    'message' => $reply_text
];

http_response_code(200);
echo json_encode($response_payload, JSON_UNESCAPED_UNICODE);
