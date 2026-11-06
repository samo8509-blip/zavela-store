<?php
/**
 * ==============================================================================
 * ZavelaStore - Webhook de Integración para Wavy (Wai) WhatsApp Business API
 * Archivo: wavy-webhook.php
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

// 2. Handshake / Verificación GET desde Wavy o explorador
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

// 3. Procesamiento de Eventos POST
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

// 4. Lógica de respuesta automatizada de Zavela Store
$reply_text = '';

if (empty($message) && empty($phone)) {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'status' => 'IGNORED_NO_PAYLOAD',
        'message' => 'No incoming message detected'
    ]);
    exit();
}

if (preg_match('/^(hola|buenas|buenos dias|buenas tardes|buenas noches|inicio|menu|hi|hello)/i', $msg_lower)) {
    $reply_text = "¡Hola! 👋 Te damos la bienvenida a *{$store_name}*.\n\nSoy *Sofía*, tu asesora de ventas. ¿En qué te puedo ayudar hoy?\n\n1️⃣ Ver catálogo y promociones activas\n2️⃣ Información sobre *Pago Contra Entrega* (Pagas al recibir en casa)\n3️⃣ Estado de un pedido o guía de despacho\n4️⃣ Atención con un asesor humano\n\n_Escríbeme el nombre del producto que buscas o tu duda y te respondo de inmediato._ 🛍️✨";
} elseif (str_contains($msg_lower, 'contra entrega') || str_contains($msg_lower, 'envio') || str_contains($msg_lower, 'flete') || str_contains($msg_lower, 'pago') || str_contains($msg_lower, 'domicilio')) {
    $reply_text = "🚚 *¡En {$store_name} tu compra es 100% segura!* 🇨🇴\n\n✅ *Envío Gratis y Pago Contra Entrega* a toda Colombia.\n✅ El despacho tarda entre 2 y 5 días hábiles con Servientrega, Coordinadora o Envía.\n✅ Pagas en efectivo directamente al transportador cuando tengas el producto en mano.\n\n¿Qué producto te gustaría pedir? Dime el nombre o referencia para gestionarlo. 📦";
} elseif (str_contains($msg_lower, 'guia') || str_contains($msg_lower, 'pedido') || str_contains($msg_lower, 'rastreo') || str_contains($msg_lower, 'despacho') || str_contains($msg_lower, 'estado')) {
    $reply_text = "📦 *Rastreo de Despachos Zavela Store*\n\nPara consultar el estado de tu pedido, por favor facilítame:\n\n• Tu *Nombre Completo*\n• Número de *Cédula* o *Celular registrado*\n• Producto adquirido\n\nUn asesor revisará de inmediato la guía en nuestra base de datos. 🚚💨";
} else {
    $reply_text = "¡Gracias por contactar a *{$store_name}*! 🌟\n\nOfrecemos productos de calidad con *Pago Contra Entrega en toda Colombia*.\n\nPuedes explorar nuestra tienda completa en:\n👉 {$store_url}\n\nSi deseas hacer un pedido de una vez, envíame tu nombre, dirección y ciudad para apartarlo en bodega. ¡Con gusto te atiendo! 😊";
}

// 5. Payload de respuesta estructurado para Wavy (Wai)
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
