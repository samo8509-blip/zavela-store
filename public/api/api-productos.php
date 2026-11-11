<?php
/**
 * ==============================================================================
 * ZavelaStore - API / Webhook de Consulta de Productos para Bots de WhatsApp (WAI)
 * Archivo: api-productos.php
 * Ubicación: /public_html/api-productos.php o /public_html/api/api-productos.php
 * 
 * Permite a bots externos (WAI, ManyChat, Kommo, Typebot) consultar el precio real,
 * stock y URL oficial de compra directamente desde MySQL para evitar alucinaciones.
 * ==============================================================================
 */

// 1. Headers CORS y Respuesta Estricta JSON
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

// Responder a pre-flight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

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
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (Exception $e) {
    // Si la conexión falla (por ejemplo en entorno de pruebas sin MySQL local)
    $pdo = null;
}

// 3. Captura del Parámetro de Búsqueda (Soporta GET, POST form-urlencoded y POST JSON)
$raw_input = file_get_contents('php://input');
$body_json = json_decode($raw_input, true) ?: [];

$search_query = '';

// Buscar en GET
if (!empty($_GET['producto'])) {
    $search_query = $_GET['producto'];
} elseif (!empty($_GET['q'])) {
    $search_query = $_GET['q'];
} elseif (!empty($_GET['nombre'])) {
    $search_query = $_GET['nombre'];
} elseif (!empty($_GET['search'])) {
    $search_query = $_GET['search'];
} elseif (!empty($_GET['query'])) {
    $search_query = $_GET['query'];
}
// Buscar en POST body (JSON o Form)
elseif (!empty($body_json['producto'])) {
    $search_query = $body_json['producto'];
} elseif (!empty($body_json['q'])) {
    $search_query = $body_json['q'];
} elseif (!empty($body_json['nombre'])) {
    $search_query = $body_json['nombre'];
} elseif (!empty($body_json['query'])) {
    $search_query = $body_json['query'];
} elseif (!empty($body_json['search'])) {
    $search_query = $body_json['search'];
} elseif (!empty($body_json['message'])) {
    $search_query = $body_json['message'];
} elseif (!empty($body_json['text'])) {
    $search_query = $body_json['text'];
} elseif (!empty($_POST['producto'])) {
    $search_query = $_POST['producto'];
} elseif (!empty($_POST['q'])) {
    $search_query = $_POST['q'];
} elseif (!empty($_POST['nombre'])) {
    $search_query = $_POST['nombre'];
}

$search_query = trim((string)$search_query);

// Configuración de URLs oficiales de la tienda
$baseUrl = 'https://zavelastore.com.co';
$whatsappPhone = '573008784427';

// 4. Si no se envía parámetro, devolver guía de uso en JSON
if ($search_query === '') {
    echo json_encode([
        'encontrado'         => false,
        'error'              => 'Parámetro de búsqueda requerido.',
        'instruccion'        => 'Envía el parámetro por GET (?producto=nombre) o POST JSON {"producto": "nombre"}',
        'nombre'             => '',
        'precio'             => 0,
        'precio_formateado'  => '$0 COP',
        'estado'             => 'no_especificado',
        'disponible'         => false,
        'stock'              => 0,
        'url'                => "{$baseUrl}/catalogo",
        'url_compra'         => "{$baseUrl}/catalogo",
        'imagen'             => "{$baseUrl}/images/logo-zavela.jpg",
        'mensaje'            => 'Por favor indícanos el nombre del producto que deseas consultar para darte el precio oficial y enlace directo.',
        'tienda'             => 'Zavela Store Colombia'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit();
}

// 5. Búsqueda en MySQL
$product = null;

if ($pdo !== null) {
    try {
        // Detectar si la tabla se llama 'productos' o 'products'
        $tableName = 'productos';
        $tblCheck = $pdo->query("SHOW TABLES LIKE 'productos'");
        if ($tblCheck->rowCount() === 0) {
            $tableName = 'products';
        }

        // 5.1. Búsqueda exacta por ID o Slug
        $stmtExact = $pdo->prepare("
            SELECT * FROM {$tableName} 
            WHERE (id = ? OR slug = ? OR dropi_product_id = ?) 
              AND active = 1 
              AND LOWER(nombre) NOT LIKE '%asesor%' 
              AND LOWER(nombre) NOT LIKE '%admin%' 
              AND LOWER(nombre) NOT LIKE '%prueba%' 
            LIMIT 1
        ");
        $stmtExact->execute([$search_query, $search_query, $search_query]);
        $product = $stmtExact->fetch();

        // 5.2. Si no es ID exacto, buscar por similitud de nombre
        if (!$product) {
            // Dividir las palabras clave del usuario (ej: "perfume good girl" -> ['perfume', 'good', 'girl'])
            $words = preg_split('/\s+/', mb_strtolower($search_query, 'UTF-8'));
            // Filtrar conectores y artículos irrelevantes
            $stopWords = ['el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'para', 'y', 'en', 'con', 'por', 'a', 'al', 'que', 'me', 'interesa', 'quiero', 'precio', 'costo', 'tienen', 'venden', 'comprar'];
            $keywords = array_values(array_filter($words, function($w) use ($stopWords) {
                return mb_strlen($w, 'UTF-8') >= 2 && !in_array($w, $stopWords);
            }));

            if (!empty($keywords)) {
                $conditions = [];
                $params = [];
                foreach ($keywords as $kw) {
                    $conditions[] = "(LOWER(nombre) LIKE ? OR LOWER(descripcion) LIKE ?)";
                    $params[] = '%' . $kw . '%';
                    $params[] = '%' . $kw . '%';
                }

                $whereSql = implode(' AND ', $conditions);

                $sql = "
                    SELECT *, 
                           (CASE WHEN LOWER(nombre) LIKE ? THEN 10 ELSE 0 END +
                            CASE WHEN stock > 0 THEN 5 ELSE 0 END) AS score
                    FROM {$tableName}
                    WHERE {$whereSql}
                      AND active = 1
                      AND LOWER(nombre) NOT LIKE '%asesor%'
                      AND LOWER(nombre) NOT LIKE '%admin%'
                      AND LOWER(nombre) NOT LIKE '%prueba%'
                      AND LOWER(nombre) NOT LIKE '%dummy%'
                    ORDER BY score DESC, stock DESC, created_at DESC
                    LIMIT 1
                ";

                $searchParamFull = '%' . mb_strtolower($search_query, 'UTF-8') . '%';
                $fullParams = array_merge([$searchParamFull], $params);

                $stmtKeyword = $pdo->prepare($sql);
                $stmtKeyword->execute($fullParams);
                $product = $stmtKeyword->fetch();
            }

            // 5.3. Si aún no encuentra, probar coincidencia parcial simple
            if (!$product) {
                $stmtLike = $pdo->prepare("
                    SELECT * FROM {$tableName}
                    WHERE (LOWER(nombre) LIKE ? OR LOWER(categoria) LIKE ?)
                      AND active = 1
                      AND LOWER(nombre) NOT LIKE '%asesor%'
                      AND LOWER(nombre) NOT LIKE '%admin%'
                    ORDER BY stock DESC, created_at DESC
                    LIMIT 1
                ");
                $likeParam = '%' . mb_strtolower($search_query, 'UTF-8') . '%';
                $stmtLike->execute([$likeParam, $likeParam]);
                $product = $stmtLike->fetch();
            }
        }
    } catch (Exception $eSql) {
        $product = null;
    }
}

// 6. Construir Respuesta JSON Estricta
if ($product) {
    $productId = (string)$product['id'];
    $productName = (string)($product['nombre'] ?? $product['title'] ?? 'Producto Zavela');
    $rawPrice = $product['precio'] ?? $product['price'] ?? 0;

    // Limpieza numérica estricta de precio en COP
    $cleanPriceStr = preg_replace('/[^\d]/', '', (string)$rawPrice);
    $priceNumber = (int)$cleanPriceStr;

    $stock = isset($product['stock']) ? (int)$product['stock'] : 1;
    $isAvailable = ($stock > 0 && (int)($product['active'] ?? 1) === 1);
    $estado = $isAvailable ? 'disponible' : 'agotado';

    $formattedPrice = '$' . number_format($priceNumber, 0, ',', '.') . ' COP';
    
    // URL canónica del producto usando su ID (requisito específico)
    $urlCompra = "{$baseUrl}/producto/{$productId}";

    // Imagen
    $image = $product['imagen'] ?? $product['image'] ?? "{$baseUrl}/images/logo-zavela.jpg";
    if (empty($image) && !empty($product['imagenes'])) {
        $decodedImgs = json_decode($product['imagenes'], true);
        if (is_array($decodedImgs) && !empty($decodedImgs[0])) {
            $image = $decodedImgs[0];
        }
    }

    // Descripción corta
    $rawDesc = strip_tags((string)($product['descripcion'] ?? $product['description'] ?? ''));
    $cleanDesc = preg_replace('/\s+/', ' ', trim($rawDesc));
    if (mb_strlen($cleanDesc, 'UTF-8') > 160) {
        $cleanDesc = mb_substr($cleanDesc, 0, 157, 'UTF-8') . '...';
    }

    // Mensaje formateado listo para enviar al cliente por WhatsApp
    $mensajeBot = "✅ *{$productName}*\n\n" .
                  "💰 *Precio oficial:* {$formattedPrice}\n" .
                  "📦 *Estado:* " . ($isAvailable ? "Disponible para despacho inmediato" : "Temporalmente agotado") . "\n" .
                  "🚚 *Envío:* Gratis a nivel nacional con Pago Contra Entrega (pagas en efectivo al recibir)\n\n" .
                  "👉 *Haz tu pedido o consulta fotos aquí:*\n{$urlCompra}";

    $response = [
        'encontrado'          => true,
        'id'                  => $productId,
        'nombre'              => $productName,
        'precio'              => $priceNumber,
        'precio_formateado'   => $formattedPrice,
        'estado'              => $estado,
        'disponible'          => $isAvailable,
        'stock'               => $stock,
        'url'                 => $urlCompra,
        'url_compra'          => $urlCompra,
        'categoria'           => (string)($product['categoria'] ?? $product['category'] ?? 'General'),
        'descripcion'         => $cleanDesc,
        'imagen'              => $image,
        'mensaje'             => $mensajeBot,
        'metodos_pago'        => 'Pago Contra Entrega en efectivo, ePayco, Tarjeta',
        'garantia'            => 'Garantía directa de tienda Zavela Store Colombia'
    ];
} else {
    // Si no se encontró el producto en la base de datos
    $mensajeNoEncontrado = "No encontramos un producto exacto con el nombre \"{$search_query}\" en nuestra base de datos oficial.\n\n" .
                           "👉 Puedes explorar nuestro catálogo completo con precios actualizados y pago contra entrega aquí:\n" .
                           "{$baseUrl}/catalogo";

    $response = [
        'encontrado'          => false,
        'termino_buscado'     => $search_query,
        'id'                  => '',
        'nombre'              => '',
        'precio'              => 0,
        'precio_formateado'   => '$0 COP',
        'estado'              => 'agotado',
        'disponible'          => false,
        'stock'               => 0,
        'url'                 => "{$baseUrl}/catalogo",
        'url_compra'          => "{$baseUrl}/catalogo",
        'imagen'              => "{$baseUrl}/images/logo-zavela.jpg",
        'mensaje'             => $mensajeNoEncontrado,
        'sugerencia'          => 'Visita https://zavelastore.com.co/catalogo para ver todos los artículos disponibles'
    ];
}

// 7. Retorno estricto en JSON
echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
exit();
