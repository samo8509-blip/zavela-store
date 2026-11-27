<?php
/**
 * Candado para las escrituras de la API de cPanel (borrar, crear y editar).
 *
 * Cómo activarlo (una sola vez):
 *   1. En Render agrega la variable CPANEL_API_KEY con una clave larga y secreta (mínimo 32 caracteres).
 *   2. En cPanel crea, junto a estos archivos, un archivo llamado zavela_key.php con:
 *        <?php define('ZAVELA_API_KEY', 'LA_MISMA_CLAVE_DE_RENDER');
 *   3. Sube este archivo y los .php que lo usan.
 *
 * Mientras zavela_key.php no exista, NO se bloquea nada (así no se rompe la tienda al subir los archivos).
 * Las lecturas (GET) y el checkout público siguen funcionando igual.
 */
if (is_file(__DIR__ . '/zavela_key.php')) { require_once __DIR__ . '/zavela_key.php'; }

function zavela_require_key(): void {
    $secret = defined('ZAVELA_API_KEY') ? (string) ZAVELA_API_KEY : (string) (getenv('ZAVELA_API_KEY') ?: '');
    if ($secret === '') { return; } // sin clave configurada: modo compatible
    $given = (string) ($_SERVER['HTTP_X_API_KEY'] ?? '');
    if ($given === '' || !hash_equals($secret, $given)) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'message' => 'No autorizado']);
        exit();
    }
}
