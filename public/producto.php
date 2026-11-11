<?php
/**
 * ==============================================================================
 * Zavela Store Colombia - Página de Producto Individual SSR en PHP
 * Archivo: producto.php
 * Ubicación: /public_html/producto.php
 * ==============================================================================
 */

header('Content-Type: text/html; charset=utf-8');

// ==============================================================================
// 1. EXTRACCIÓN ROBUSTA Y MULTI-CAPA DEL ID DEL PRODUCTO
// ==============================================================================
$productId = '';

// Prioridad 1: Parámetro GET explícito ('id' o 'slug')
if (!empty($_GET['id'])) {
    $productId = trim($_GET['id']);
} elseif (!empty($_GET['slug'])) {
    $productId = trim($_GET['slug']);
}

// Prioridad 2: PATH_INFO (activado por Apache / LiteSpeed cuando se accede a /producto/prod-...)
if (empty($productId) && !empty($_SERVER['PATH_INFO'])) {
    $pathParts = explode('/', trim($_SERVER['PATH_INFO'], '/'));
    $candidate = end($pathParts);
    if (!empty($candidate)) {
        $productId = trim($candidate);
    }
}

// Prioridad 3: ORIG_PATH_INFO (en entornos PHP CGI / FastCGI)
if (empty($productId) && !empty($_SERVER['ORIG_PATH_INFO'])) {
    $pathParts = explode('/', trim($_SERVER['ORIG_PATH_INFO'], '/'));
    $candidate = end($pathParts);
    if (!empty($candidate)) {
        $productId = trim($candidate);
    }
}

// Prioridad 4: Análisis directo de REQUEST_URI (Fallback universal infalible)
if (empty($productId) && !empty($_SERVER['REQUEST_URI'])) {
    $parsedPath = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if ($parsedPath && preg_match('#/producto/([^/?#]+)#i', $parsedPath, $matches)) {
        $productId = trim($matches[1]);
    }
}

// Limpiar y decodificar el ID extraído
$productId = trim(urldecode($productId));
// Quitar sufijos residuales como .php
$productId = preg_replace('/\.php$/i', '', $productId);

if (!$productId) {
    header("Location: /catalogo");
    exit();
}

$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'zavela_store';
$db_user = getenv('DB_USER') ?: 'root';
$db_pass = getenv('DB_PASS') ?: '';

$product = null;
$related = [];

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

    // ==============================================================================
    // 2. CONSULTA SQL LIMPIA Y SEGURA A MYSQL
    // Prioridad 1: Búsqueda directa por id (clave primaria 'id' en MySQL)
    // ==============================================================================
    $stmt = $pdo->prepare("SELECT * FROM productos WHERE id = ? LIMIT 1");
    $stmt->execute([$productId]);
    $product = $stmt->fetch();

    // Prioridad 2: Fallback por dropi_product_id si no coincidió por id
    if (!$product) {
        try {
            $stmtDropi = $pdo->prepare("SELECT * FROM productos WHERE dropi_product_id = ? LIMIT 1");
            $stmtDropi->execute([$productId]);
            $product = $stmtDropi->fetch();
        } catch (Exception $eDropi) {}
    }

    // Prioridad 3: Fallback por slug si la columna existe en la tabla de cPanel
    if (!$product) {
        try {
            $stmtSlug = $pdo->prepare("SELECT * FROM productos WHERE slug = ? LIMIT 1");
            $stmtSlug->execute([$productId]);
            $product = $stmtSlug->fetch();
        } catch (Exception $eSlug) {}
    }

    // Prioridad 4: Fallback en tabla alternativa 'products' (si cPanel usa products en inglés)
    if (!$product) {
        try {
            $stmtAlt = $pdo->prepare("SELECT * FROM products WHERE id = ? LIMIT 1");
            $stmtAlt->execute([$productId]);
            $product = $stmtAlt->fetch();
        } catch (Exception $eAlt) {}
    }

    if ($product) {
        $cat = $product['categoria'] ?? $product['category'] ?? 'General';
        $pId = $product['id'];
        try {
            $relStmt = $pdo->prepare("SELECT * FROM productos WHERE (categoria = ? OR category = ?) AND id != ? LIMIT 4");
            $relStmt->execute([$cat, $cat, $pId]);
            $related = $relStmt->fetchAll();
        } catch (Exception $eRel) {
            $related = [];
        }
    }

    // Consulta de categorías activas para el Header Dropdown
    $navCategories = [];
    try {
        $catStmt = $pdo->query("SELECT id, name, slug FROM categorias WHERE active = 1 AND LOWER(name) NOT LIKE '%asesor%' AND LOWER(name) NOT LIKE '%admin%' AND LOWER(name) NOT LIKE '%sexshop%' ORDER BY name ASC");
        $navCategories = $catStmt->fetchAll();
    } catch (Exception $eCat) {
        $navCategories = [];
    }

    if (empty($navCategories)) {
        try {
            $catStmt = $pdo->query("SELECT DISTINCT categoria as name, LOWER(categoria) as slug FROM productos WHERE active = 1 AND categoria IS NOT NULL AND categoria != '' AND LOWER(categoria) NOT LIKE '%asesor%' AND LOWER(categoria) NOT LIKE '%admin%'");
            $navCategories = $catStmt->fetchAll();
        } catch (Exception $eCat2) {
            $navCategories = [
                ['name' => 'Perfumería & Fragancias', 'slug' => 'perfumeria-fragancias'],
                ['name' => 'Hogar y Cocina', 'slug' => 'hogar-cocina'],
                ['name' => 'Tecnología y Gadgets', 'slug' => 'tecnologia'],
                ['name' => 'Belleza y Cuidado Personal', 'slug' => 'belleza-cuidado'],
                ['name' => 'Artículos Navideños', 'slug' => 'navidad-diciembre']
            ];
        }
    }
} catch (Exception $e) {
    $product = null;
    $navCategories = [
        ['name' => 'Perfumería & Fragancias', 'slug' => 'perfumeria-fragancias'],
        ['name' => 'Hogar y Cocina', 'slug' => 'hogar-cocina'],
        ['name' => 'Tecnología y Gadgets', 'slug' => 'tecnologia'],
        ['name' => 'Belleza y Cuidado Personal', 'slug' => 'belleza-cuidado'],
        ['name' => 'Artículos Navideños', 'slug' => 'navidad-diciembre']
    ];
}

$baseUrl = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://$_SERVER[HTTP_HOST]";
$whatsappNum = '573008784427';

function formatCOP($val) {
    return '$' . number_format((float)$val, 0, ',', '.') . ' COP';
}

function cleanMeta($str, $max = 160) {
    $clean = strip_tags($str);
    $clean = preg_replace('/\s+/', ' ', trim($clean));
    if (mb_strlen($clean) <= $max) return $clean;
    return mb_substr($clean, 0, $max - 3) . '...';
}

if (!$product) {
    http_response_code(404);
    echo "<!DOCTYPE html><html lang='es'><head><meta charset='utf-8'><title>Producto No Encontrado | Zavela Store</title><style>body{font-family:sans-serif;text-align:center;padding:4rem;background:#f8fafc;color:#0f172a;}</style></head><body><h1>Producto no encontrado</h1><p>El producto solicitado no está disponible.</p><a href='/catalogo' style='display:inline-block;padding:0.75rem 1.5rem;background:#4f46e5;color:white;text-decoration:none;border-radius:8px;'>Ir al Catálogo</a></body></html>";
    exit();
}

$title = $product['nombre'] ?? $product['title'] ?? 'Producto Zavela';
$price = (float)($product['precio'] ?? $product['price'] ?? 0);
$desc = $product['descripcion'] ?? $product['description'] ?? '';
$cat = $product['categoria'] ?? $product['category'] ?? 'General';
$img = !empty($product['imagen']) ? $product['imagen'] : (!empty($product['image']) ? $product['image'] : "$baseUrl/images/logo-zavela.jpg");
$canonical = "$baseUrl/producto/" . (!empty($product['id']) ? $product['id'] : (!empty($product['slug']) ? $product['slug'] : $productId));
$cleanDesc = cleanMeta($desc, 155);

$waMsg = urlencode("¡Hola Zavela Store! Quiero pedir con Pago Contra Entrega el producto:\n\n• *{$title}*\n• *Precio:* " . formatCOP($price) . "\n\nPor favor indícame cómo formalizar mi despacho.");
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($title) ?> | Zavela Store Colombia - Pago Contra Entrega</title>
  <meta name="description" content="<?= htmlspecialchars($cleanDesc) ?>">
  <link rel="canonical" href="<?= $canonical ?>">

  <!-- OpenGraph -->
  <meta property="og:type" content="product">
  <meta property="og:title" content="<?= htmlspecialchars($title) ?> | Zavela Store Colombia">
  <meta property="og:description" content="<?= htmlspecialchars($cleanDesc) ?>">
  <meta property="og:url" content="<?= $canonical ?>">
  <meta property="og:image" content="<?= htmlspecialchars($img) ?>">
  <meta property="product:price:amount" content="<?= $price ?>">
  <meta property="product:price:currency" content="COP">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="<?= htmlspecialchars($title) ?> | Zavela Store Colombia">
  <meta name="twitter:description" content="<?= htmlspecialchars($cleanDesc) ?>">
  <meta name="twitter:image" content="<?= htmlspecialchars($img) ?>">

  <!-- Schema.org Product JSON-LD -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": <?= json_encode($title) ?>,
    "image": [<?= json_encode($img) ?>],
    "description": <?= json_encode($cleanDesc) ?>,
    "sku": <?= json_encode((string)$product['id']) ?>,
    "brand": { "@type": "Brand", "name": "Zavela Store" },
    "offers": {
      "@type": "Offer",
      "url": <?= json_encode($canonical) ?>,
      "priceCurrency": "COP",
      "price": <?= $price ?>,
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": "Zavela Store Colombia" }
    }
  }
  </script>

  <style>
    :root { --primary: #4f46e5; --whatsapp: #16a34a; --bg: #f8fafc; --text: #0f172a; --border: #e2e8f0; --radius: 12px; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    a { color: inherit; text-decoration: none; }
    .trust-bar { background: #0f172a; color: #e2e8f0; padding: 0.5rem 1rem; font-size: 0.8rem; text-align: center; font-weight: 600; display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
    .site-header { background: white; border-bottom: 1px solid var(--border); padding: 0.85rem 1.25rem; position: sticky; top: 0; z-index: 50; }
    .header-inner { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; position: relative; }
    .brand { font-weight: 800; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; text-decoration: none; color: #0f172a; }
    .badge-brand { background: linear-gradient(135deg, #0284c7, #0369a1); color: white; padding: 0.2rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 800; }
    
    /* Navigation & Pure CSS Dropdown */
    .nav-links { display: flex; align-items: center; gap: 1.5rem; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .nav-link { color: #334155; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.5rem 0; }
    .nav-link:hover, .nav-link.active { color: #0284c7; }
    .nav-link-hot { color: #ff5a36; }
    .nav-link-hot:hover { color: #e02656; }
    .hot-badge { background: #ef4444; color: white; font-size: 0.6rem; padding: 0.1rem 0.35rem; border-radius: 9999px; }
    .nav-dropdown-wrapper { position: relative; display: inline-block; padding: 0.25rem 0; }
    .pure-css-dropdown { display: none; position: absolute; top: 100%; left: -100px; width: 750px; max-width: 90vw; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); padding: 1.5rem; z-index: 100; text-transform: none; letter-spacing: normal; }
    .nav-dropdown-wrapper:hover .pure-css-dropdown, .nav-dropdown-wrapper:focus-within .pure-css-dropdown, .pure-css-dropdown:hover { display: block; }
    .dropdown-mega-layout { display: flex; gap: 1.5rem; }
    .dropdown-categories-col { flex: 1; }
    .dropdown-heading { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; color: #0f172a; padding-bottom: 0.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; gap: 0.4rem; }
    .dropdown-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.65rem; }
    .dropdown-cat-card { display: flex; align-items: center; gap: 0.65rem; padding: 0.6rem 0.8rem; border: 1px solid #f1f5f9; border-radius: 10px; text-decoration: none; background: white; min-height: 52px; }
    .dropdown-cat-card:hover { border-color: #bae6fd; background: #f0f9ff; }
    .cat-card-info { flex: 1; min-width: 0; overflow: visible; }
    .cat-card-title { font-size: 0.82rem; font-weight: 700; color: #1e293b; display: block; white-space: normal; word-wrap: break-word; overflow-wrap: break-word; word-break: normal; text-overflow: clip; overflow: visible; line-height: 1.25; }
    .cat-card-count { font-size: 0.7rem; color: #64748b; display: block; margin-top: 0.15rem; }
    .dropdown-promo-col { width: 240px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0369a1 100%); color: white; border-radius: 14px; padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; }
    .promo-badge { color: #34d399; font-size: 0.65rem; font-weight: 800; }
    .promo-title { font-size: 0.95rem; font-weight: 800; margin: 0.4rem 0; line-height: 1.25; }
    .promo-desc { font-size: 0.75rem; color: #cbd5e1; line-height: 1.4; margin-bottom: 1rem; }
    .promo-btn { display: block; text-align: center; background: #10b981; color: white; padding: 0.55rem 0.85rem; border-radius: 8px; font-size: 0.78rem; font-weight: 800; text-decoration: none; }
    @media (max-width: 860px) { .pure-css-dropdown { width: 300px; left: -30px; } .dropdown-mega-layout { flex-direction: column; } .dropdown-promo-col { width: 100%; } .dropdown-grid { grid-template-columns: 1fr; } }

    .container { max-width: 1100px; margin: 2rem auto; padding: 0 1.25rem; }
    .product-layout { display: grid; grid-template-columns: 1fr; gap: 2.5rem; }
    @media (min-width: 768px) { .product-layout { grid-template-columns: 1fr 1.2fr; } }
    .img-box { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 1rem; }
    .prod-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; }
    .details { background: white; border: 1px solid var(--border); border-radius: var(--radius); padding: 2rem; }
    .cat-tag { color: #0ea5e9; font-weight: 700; font-size: 0.8rem; text-transform: uppercase; }
    .prod-title { font-size: 1.8rem; font-weight: 800; margin: 0.5rem 0 1rem; line-height: 1.25; }
    .price-box { background: #f8fafc; border: 1px solid var(--border); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 1.8rem; font-weight: 900; }
    .guarantee-box { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 0.9rem; }
    .btn-wa { display: block; text-align: center; background: var(--whatsapp); color: white; padding: 1rem; border-radius: 8px; font-weight: 700; font-size: 1.05rem; }
    .btn-spa { display: block; text-align: center; background: #e0e7ff; color: var(--primary); padding: 0.85rem; border-radius: 8px; font-weight: 700; margin-top: 0.75rem; }
    .desc-body { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border); white-space: pre-line; color: #334155; }
  </style>
</head>
<body>
  <div class="trust-bar">
    <span>🇨🇴 Envíos a toda Colombia</span>
    <span>💵 Pago Contra Entrega en Efectivo</span>
    <span>🛡️ Garantía Directa</span>
  </div>

  <header class="site-header">
    <div class="header-inner">
      <a href="/" class="brand"><span class="badge-brand">ZAVELA</span> Store Colombia</a>
      <nav class="nav-links">
        <a href="/" class="nav-link">Inicio</a>

        <!-- Dropdown de Catálogo mediante CSS puro (SEO & Sin JavaScript) -->
        <div class="nav-dropdown-wrapper">
          <a href="/catalogo" class="nav-link active" aria-haspopup="true">
            <span>Catálogo</span>
            <span>▼</span>
          </a>

          <div class="pure-css-dropdown" role="menu">
            <div class="dropdown-mega-layout">
              <div class="dropdown-categories-col">
                <div class="dropdown-heading">
                  <span>📦</span>
                  <span>Nuestras Categorías</span>
                </div>
                <div class="dropdown-grid">
                  <?php foreach ($navCategories as $nc): 
                    $ncSlug = !empty($nc['slug']) ? $nc['slug'] : $nc['name'];
                    $ncName = preg_replace('/[\x{1F300}-\x{1F9FF}]/u', '', $nc['name']);
                  ?>
                    <a href="/catalogo?categoria=<?= urlencode($ncSlug) ?>" class="dropdown-cat-card">
                      <span>🛍️</span>
                      <div class="cat-card-info">
                        <span class="cat-card-title"><?= htmlspecialchars(trim($ncName)) ?></span>
                        <span class="cat-card-count">Ver colección</span>
                      </div>
                    </a>
                  <?php endforeach; ?>
                </div>
              </div>

              <div class="dropdown-promo-col">
                <div>
                  <div class="promo-badge">🛡️ PAGO CONTRA ENTREGA</div>
                  <h3 class="promo-title">Compra segura a nivel nacional</h3>
                  <p class="promo-desc">Revisa tus productos en casa antes de pagar en efectivo al domiciliario.</p>
                </div>
                <a href="/catalogo" class="promo-btn">Ver Todo el Catálogo →</a>
              </div>
            </div>
          </div>
        </div>

        <a href="/catalogo?ofertas=1" class="nav-link nav-link-hot">🔥 Ofertas <span class="hot-badge">HOT</span></a>
        <a href="/rastreo" class="nav-link">Rastreo</a>
        <a href="/quienes-somos" class="nav-link">Quiénes Somos</a>
      </nav>
    </div>
  </header>

  <main class="container">
    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 1.5rem;">
      <a href="/">Inicio</a> &gt; <a href="/catalogo">Catálogo</a> &gt; <span><?= htmlspecialchars($title) ?></span>
    </div>

    <div class="product-layout">
      <div class="img-box">
        <img src="<?= htmlspecialchars($img) ?>" alt="<?= htmlspecialchars($title) ?>" class="prod-img">
      </div>
      <div class="details">
        <span class="cat-tag"><?= htmlspecialchars($cat) ?></span>
        <h1 class="prod-title"><?= htmlspecialchars($title) ?></h1>
        
        <div class="price-box"><?= formatCOP($price) ?></div>

        <div class="guarantee-box">
          <strong>🚚 Despacho con Pago Contra Entrega:</strong>
          Pagas en efectivo únicamente cuando el transportador llegue a la puerta de tu casa. Envíos de 2 a 5 días hábiles a nivel nacional.
        </div>

        <a href="https://wa.me/<?= $whatsappNum ?>?text=<?= $waMsg ?>" target="_blank" class="btn-wa">
          💬 Pedir por WhatsApp (Contra Entrega)
        </a>
        <a href="/?producto=<?= urlencode(!empty($product['slug']) ? $product['slug'] : $product['id']) ?>" class="btn-spa">
          🛍️ Comprar en Tienda Interactiva
        </a>

        <div class="desc-body">
          <h2 style="font-size: 1.2rem; font-weight: 700; margin-bottom: 0.75rem; color: #0f172a;">Descripción</h2>
          <?= nl2br(htmlspecialchars($desc ?: 'Producto oficial en Zavela Store Colombia con garantía y pago contra entrega.')) ?>
        </div>
      </div>
    </div>
  </main>
</body>
</html>
