# Configuración de Favicon, Logo de Correos y Despliegue en cPanel para Zavela Store

Guía paso a paso y configuración técnica para vincular el favicon oficial en la pestaña del navegador, servir el logotipo en correos automáticos desde el dominio principal `https://zavelastore.com.co`, y desplegar la compilación a través del Administrador de Archivos de cPanel.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Decisiones confirmadas a partir de tus respuestas previas:

- **Dominio Principal de Producción**: Confirmado como `https://zavelastore.com.co`. Todas las referencias en correos automáticos y metadatos OpenGraph utilizarán este dominio canónico absoluto.
- **Tratamiento del Favicon vs. Logo de Correos**:
  - **Favicon de pestaña**: Se utiliza el isotipo cuadrado oficial (ícono 'Z' con carrito y gradiente eléctrico) en formatos vectoriales SVG y PNG optimizados para visualización nítida en 16x16, 32x32 y 180x180.
  - **Logo para correos automáticos**: Se utilizará el banner horizontal completo adjunto (`logo-zavela.jpg`) ubicado en la carpeta pública accesible desde la URL pública absoluta `https://zavelastore.com.co/images/logo-zavela.jpg`.
- **Estrategia de Despliegue**: Tu tienda opera directamente en hosting cPanel (no Firebase Hosting). El flujo de terminal consistirá en generar la compilación estática optimizada de Vite (`npm run build`) para empaquetar y transferir la carpeta `dist/` al directorio `public_html` de cPanel.

---

### 1. Overview & Core Concept

- **Qué Resuelve**: Los correos electrónicos transaccionales (confirmaciones de pedido, notificaciones a clientes, comprobantes) no pueden cargar imágenes con rutas relativas (`/images/...`) porque se abren en clientes como Gmail o Outlook; requieren una URL absoluta accesible públicamente (`https://zavelastore.com.co/images/logo-zavela.jpg`). Asimismo, los navegadores necesitan etiquetas `<link rel="icon">` bien estructuradas en el `<head>` de `index.html` para evitar mostrar el ícono genérico o almacenar en caché un favicon antiguo.
- **Audiencia**: Clientes compradores de Zavela Store en Colombia y el equipo de operaciones que gestiona la tienda.
- **Valor Clave**: Identidad de marca sólida, correos profesionales sin imágenes rotas, favicon legible en navegadores móviles y de escritorio, y un procedimiento claro de actualización en cPanel.

---

### 2. User Experience & Visual Design

- **Pestaña del Navegador**: El isotipo Zavela (con su distintivo carrito estilizado en cian, azul y violeta) se renderiza nítido a 16px y 32px sin distorsión tipográfica, acompañado del título oficial: `Zavela Store Colombia | Tecnología, Hogar y Tendencias`.
- **Cabecera de Correos Automáticos**: Un banner superior limpio centrado con fondo blanco o transparente, con ancho máximo de 240px a 280px para garantizar legibilidad en dispositivos móviles.
- **Rutas de Recursos Estáticos en el Proyecto React**:
  - `/public/images/logo-zavela.jpg` $\rightarrow$ Logo completo rectangular para correos y cabeceras.
  - `/public/favicon.svg` $\rightarrow$ Isotipo vectorial nítido para navegadores modernos.
  - `/public/favicon-32x32.png` y `/public/apple-touch-icon.png` $\rightarrow$ Versiones cuadradas de respaldo.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Separación de isotipo para pestaña vs. banner completo para correos**:
  - *Enfoque*: El archivo adjunto contiene texto horizontal ("ZAVELA STORE - DESCUBRE ALGO NUEVO") que en un favicon de 16x16px se vuelve ilegible. Separamos el isotipo vectorial cuadrado para la pestaña y mantenemos el logotipo horizontal completo para los correos y metadatos sociales.
  - *Ventaja*: Máxima nitidez en la pestaña y máxima legibilidad de marca en los correos.
- **Decisión 2: Rutas absolutas para correos vs. relativas para el frontend**:
  - *Enfoque*: En `index.html` se usan rutas con versión para romper caché (`/favicon.svg?v=3`), mientras que en las plantillas PHP/HTML de correos se utiliza la URL completa `https://zavelastore.com.co/images/logo-zavela.jpg`.
- **Decisión 3: Flujo de empaquetado para cPanel**:
  - *Enfoque*: Generar el build con `npm run build`, empaquetar el contenido de `dist/` en un archivo `.zip` e implementarlo en `public_html/` de cPanel mediante el Administrador de Archivos.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    PROYECTO LOCAL REACT                     │
│  /public/images/logo-zavela.jpg                             │
│  /public/favicon.svg                                        │
│  /index.html (metadatos y links con cache-busting)          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                      npm run build
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       CARPETA /dist                         │
│  /dist/index.html                                           │
│  /dist/favicon.svg                                          │
│  /dist/images/logo-zavela.jpg                               │
│  /dist/assets/...                                           │
└──────────────────────────────┬──────────────────────────────┘
                               │
            Comprimir en dist.zip & Subir a cPanel
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    CPANEL (public_html)                     │
│                                                             │
│  ├── images/logo-zavela.jpg  ──► https://zavelastore.com.co/│
│  │                               images/logo-zavela.jpg     │
│  │                               (Para correos y Gmail)     │
│  ├── favicon.svg             ──► Favicon pestaña navegador  │
│  ├── index.html              ──► SPA React Tienda Oficial   │
│  └── api/createOrder.php     ──► Backend de órdenes         │
└─────────────────────────────────────────────────────────────┘
```

#### Paso a Paso Detallado:

1. **Ubicación de los archivos en la carpeta `public/`**:
   - Copiar la imagen adjunta a `/public/images/logo-zavela.jpg` (también disponible como `/public/logo-zavela.jpg`).
   - Mantener `/public/favicon.svg` como el isotipo cuadrado optimizado.

2. **Etiquetas exactas para `<head>` en `index.html`**:
   ```html
   <!-- Favicon oficial Zavela Store -->
   <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
   <link rel="apple-touch-icon" sizes="180x180" href="/favicon.svg?v=3" />
   
   <!-- OpenGraph y Twitter para previsualizaciones -->
   <meta property="og:image" content="https://zavelastore.com.co/images/logo-zavela.jpg" />
   <meta name="twitter:image" content="https://zavelastore.com.co/images/logo-zavela.jpg" />
   ```

3. **Etiqueta exacta para incluir en correos automáticos (HTML / PHP)**:
   ```html
   <img 
     src="https://zavelastore.com.co/images/logo-zavela.jpg" 
     alt="Zavela Store Colombia" 
     width="240" 
     style="display: block; max-width: 240px; height: auto; margin: 0 auto; border: 0;"
   />
   ```

4. **Comandos exactos de terminal y despliegue a cPanel**:
   ```bash
   # 1. Compilar la aplicación React optimizada para producción
   npm run build
   
   # 2. Comprimir el contenido compilado para subir a cPanel
   cd dist && zip -r ../deploy-zavela.zip . && cd ..
   ```
   - **En cPanel**:
     1. Ingresar a **cPanel** $\rightarrow$ **Administrador de Archivos** (File Manager).
     2. Navegar a la carpeta `public_html/`.
     3. Hacer clic en **Cargar** (Upload) y seleccionar `deploy-zavela.zip`.
     4. Seleccionar el archivo subido en cPanel y hacer clic en **Extraer** (Extract) directamente en `public_html/`.
     5. Verificar que el archivo `.htaccess` esté configurado para enrutar las rutas del frontend a `index.html`.
