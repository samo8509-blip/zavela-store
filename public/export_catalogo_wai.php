<?php
/**
 * ==============================================================================
 * Zavela Store Colombia - Exportador de Catálogo para Base de Conocimientos IA
 * Archivo: export_catalogo_wai.php
 * Ubicación sugerida en cPanel: /public_html/export_catalogo_wai.php
 * 
 * Genera y descarga un archivo plano .txt ultraligero sin HTML, listo para ser
 * inyectado como contexto en agentes de IA (WAI, WhatsApp bots, ChatGPT, etc.).
 * ==============================================================================
 */

// 1. Configuración de Base de Datos y Parámetros
$db_host = 'localhost';
$db_name = 'mi_base_de_datos'; // Reemplazar con el nombre de tu base de datos en cPanel
$db_user = 'mi_usuario';       // Reemplazar con tu usuario de MySQL en cPanel
$db_pass = 'mi_password';      // Reemplazar con tu contraseña de MySQL

$base_url = 'https://zavelastore.com.co';

/**
 * Función optimizada para generar un slug limpio a partir del nombre del producto
 * en caso de que la columna slug esté vacía o no exista en la base de datos.
 */
function generarSlug($texto) {
    // Transliterar caracteres acentuados a caracteres ASCII básicos si iconv está disponible
    if (function_exists('iconv')) {
        $textoTranslit = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texto);
        if ($textoTranslit !== false) {
            $texto = $textoTranslit;
        }
    }

    // Convertir a minúsculas
    $slug = strtolower(trim($texto));

    // Reemplazar cualquier carácter no alfanumérico por un guion
    $slug = preg_replace('/[^a-z0-9]+/i', '-', $slug);

    // Eliminar guiones consecutivos o en los extremos
    $slug = trim(preg_replace('/-+/', '-', $slug), '-');

    return !empty($slug) ? $slug : 'producto';
}

// 2. Conexión a MySQL mediante PDO
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
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: text/plain; charset=utf-8');
    echo "Error de conexión a la base de datos: " . $e->getMessage();
    exit();
}

// 3. Consulta de Productos
try {
    // Detectar si la columna 'active' existe para priorizar productos activos
    $hasActiveCol = false;
    try {
        $colCheck = $pdo->query("SHOW COLUMNS FROM productos LIKE 'active'");
        $hasActiveCol = ($colCheck && $colCheck->rowCount() > 0);
    } catch (Exception $eCol) {
        $hasActiveCol = false;
    }

    $sql = "SELECT * FROM productos";
    if ($hasActiveCol) {
        $sql .= " WHERE active = 1";
    }
    $sql .= " ORDER BY id ASC";

    $stmt = $pdo->query($sql);
} catch (PDOException $e) {
    header('HTTP/1.1 500 Internal Server Error');
    header('Content-Type: text/plain; charset=utf-8');
    echo "Error al consultar la tabla productos: " . $e->getMessage();
    exit();
}

// 4. Headers para forzar la descarga directa del archivo catalogo_wai.txt
header('Content-Type: text/plain; charset=utf-8');
header('Content-Disposition: attachment; filename="catalogo_wai.txt"');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

// Abrir el buffer de salida de PHP para transmisión eficiente sin sobrecargar memoria
$salida = fopen('php://output', 'w');

// 5. Recorrer resultados e imprimir en el formato exacto requerido
while ($producto = $stmt->fetch()) {
    // Nombre del producto
    $nombreRaw = $producto['nombre'] ?? $producto['title'] ?? 'Producto Zavela';
    $nombre = trim(preg_replace('/\s+/', ' ', strip_tags((string)$nombreRaw)));

    // Omitir registros de pruebas o perfiles no comerciales
    $nombreLower = mb_strtolower($nombre, 'UTF-8');
    if (str_contains($nombreLower, 'asesor') || str_contains($nombreLower, 'admin') || str_contains($nombreLower, 'dummy')) {
        continue;
    }

    // Precio en COP formateado con puntos de miles (ej: 89500 -> 89.500)
    $precioRaw = $producto['precio'] ?? $producto['price'] ?? 0;
    $precioLimpio = (float)preg_replace('/[^\d.]/', '', (string)$precioRaw);
    $precioFormateado = number_format($precioLimpio, 0, ',', '.');

    // Slug: utilizar el de la base de datos si existe, o generarlo con preg_replace
    $slugExistente = isset($producto['slug']) ? trim((string)$producto['slug']) : '';
    if (!empty($slugExistente)) {
        $slug = $slugExistente;
    } elseif (!empty($producto['id']) && preg_match('/^prod-\d+$/', (string)$producto['id'])) {
        // Si el identificador oficial es tipo prod-1793405803457
        $slug = trim((string)$producto['id']);
    } else {
        $slug = generarSlug($nombre);
    }

    // Línea de salida en formato estricto:
    // [Nombre del producto] | Precio: $[Precio formateado con puntos] COP | Enlace: https://zavelastore.com.co/producto/[slug]
    $linea = "{$nombre} | Precio: \${$precioFormateado} COP | Enlace: {$base_url}/producto/{$slug}\n";
    fwrite($salida, $linea);
}

fclose($salida);
exit();
