<?php
/**
 * ==============================================================================
 * Zavela Store Colombia - Sitemap XML Dinámico en PHP (MySQL cPanel)
 * Archivo: sitemap.php
 * Ubicación: /public_html/sitemap.php
 * ==============================================================================
 */

header('Content-Type: application/xml; charset=utf-8');

$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'zavela_store';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';

$products = [];

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

    $stmt = $pdo->query("SELECT id, slug, updated_at, created_at FROM productos WHERE active = 1 AND LOWER(nombre) NOT LIKE '%prueba%' AND LOWER(nombre) NOT LIKE '%asesor%' ORDER BY created_at DESC");
    $products = $stmt->fetchAll();
} catch (Exception $e) {
    $products = [];
}

$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
$nowIso = date('c');

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc><?= $baseUrl ?>/</loc>
    <lastmod><?= $nowIso ?></lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc><?= $baseUrl ?>/catalogo</loc>
    <lastmod><?= $nowIso ?></lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc><?= $baseUrl ?>/rastreo</loc>
    <lastmod><?= $nowIso ?></lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc><?= $baseUrl ?>/quienes-somos</loc>
    <lastmod><?= $nowIso ?></lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <?php foreach ($products as $p): 
    $slug = !empty($p['slug']) ? $p['slug'] : $p['id'];
    $date = !empty($p['updated_at']) ? date('c', strtotime($p['updated_at'])) : (!empty($p['created_at']) ? date('c', strtotime($p['created_at'])) : $nowIso);
  ?>
  <url>
    <loc><?= $baseUrl ?>/producto/<?= htmlspecialchars($slug) ?></loc>
    <lastmod><?= $date ?></lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <?php endforeach; ?>
</urlset>
