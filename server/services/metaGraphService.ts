import { Product, SocialMarketingSettings } from '../../src/types/index.ts';
import { db } from '../db.ts';

export interface MetaFacebookPublishResult {
  success: boolean;
  postId?: string;
  photoId?: string;
  permalink?: string;
  message: string;
  errorCode?: number;
  errorSubcode?: number;
  errorType?: string;
  technicalDetails?: string;
}

export interface MetaConnectionCheckResult {
  connected: boolean;
  pageId?: string;
  pageName?: string;
  category?: string;
  pictureUrl?: string;
  link?: string;
  validToken: boolean;
  permissions?: string[];
  message: string;
  error?: string;
}

export function isPlaceholderToken(token?: string | null): boolean {
  if (!token) return true;
  const t = token.trim();
  if (t.length < 30) return true;
  if (t.includes('...')) return true;
  if (t === 'EAAG...zavela_meta_token_active') return true;
  if (t.startsWith('EAAG...')) return true;
  return false;
}

export class MetaGraphService {
  private readonly apiBase = 'https://graph.facebook.com/v26.0';

  /**
   * Obtiene la configuración de conexión con Facebook almacenada
   */
  public getFacebookConfig() {
    const settings = db.getSocialMarketingSettings();
    const fbConn = settings?.connections?.facebook;
    const rawPageId = fbConn?.pageId || '';
    // Si contiene el placeholder 'fb_page_109283746192', mapear al ID real de la página 1256955457511976
    const effectivePageId = (!rawPageId || rawPageId.startsWith('fb_page_')) ? '1256955457511976' : rawPageId;
    const isRealToken = !isPlaceholderToken(fbConn?.accessToken);

    return {
      connected: Boolean(fbConn?.connected && effectivePageId && isRealToken),
      hasPlaceholderToken: isPlaceholderToken(fbConn?.accessToken),
      pageId: effectivePageId,
      accessToken: fbConn?.accessToken || '',
      accountName: fbConn?.accountName || 'Zavela Store Colombia (Página Oficial)',
      autoPostEnabled: fbConn?.autoPostEnabled !== false,
      pixelId: fbConn?.pixelId || '',
      lastSyncAt: fbConn?.lastSyncAt
    };
  }

  /**
   * Formatea el caption persuasivo de venta con los requisitos exactos del brief
   */
  public formatProductCaption(product: Product, options?: { customWhatsapp?: string; storeUrl?: string }): string {
    const storeSettings = db.getSettings();
    const whatsappNumber = options?.customWhatsapp || storeSettings?.whatsappNumber || '3133595427';
    const cleanWhatsapp = whatsappNumber.replace(/\D/g, '');
    const whatsappFormatted = cleanWhatsapp.startsWith('57') ? `+${cleanWhatsapp}` : `+57 ${cleanWhatsapp}`;

    const formattedPrice = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(product.price);

    const formattedComparePrice = product.compareAtPrice && product.compareAtPrice > product.price
      ? new Intl.NumberFormat('es-CO', {
          style: 'currency',
          currency: 'COP',
          maximumFractionDigits: 0
        }).format(product.compareAtPrice)
      : null;

    const discountText = product.discountPercentage && product.discountPercentage > 0
      ? ` (${product.discountPercentage}% OFF)`
      : '';

    // Extraer o generar 3 beneficios concisos
    const benefits: string[] = [];
    if (product.shortDescription && product.shortDescription.length > 5) {
      benefits.push(`✨ ${product.shortDescription.replace(/[•\-\*]/g, '').trim()}`);
    } else {
      benefits.push('✨ Calidad garantizada y materiales de alta durabilidad.');
    }
    benefits.push('🛡️ Garantía oficial de 30 días contra cualquier defecto.');
    benefits.push('🚚 Pago Contra Entrega: Pagas en efectivo o transferencia solo cuando recibes en tu puerta.');

    const benefitsText = benefits.slice(0, 3).join('\n');

    const slugOrId = product.slug || product.id;
    const directBuyUrl = `https://zavelastore.com.co/producto/${slugOrId}`;

    return [
      `🔥 ¡Novedad en Zavela Store! ${product.title}`,
      '',
      `💎 BENEFICIOS DESTACADOS:`,
      benefitsText,
      '',
      `💰 PRECIO ESPECIAL: ${formattedPrice} COP${discountText}`,
      formattedComparePrice ? `❌ Antes: ${formattedComparePrice} COP` : '',
      '🚚 PAGO CONTRA ENTREGA EN TODA COLOMBIA',
      '📦 Envíos rápidos y 100% seguros a la puerta de tu hogar.',
      '',
      '🛒 Pide ahora con Pago Contra Entrega en la puerta de tu casa:',
      `👉 ${directBuyUrl}`,
      '',
      `📲 Asesoría y pedidos directos por WhatsApp: ${whatsappFormatted}`,
      '',
      '#ZavelaStore #Colombia #PagoContraEntrega #Tendencias2026 #TiendaOnline #EnvioGratis #CompraSegura'
    ]
      .filter(line => line !== null && line !== undefined)
      .join('\n');
  }

  /**
   * Publica un producto directamente en la Fanpage de Facebook utilizando Meta Graph API v26.0
   */
  public async publishProductToFacebook(
    product: Product,
    options?: { customCaption?: string; pageId?: string; accessToken?: string }
  ): Promise<MetaFacebookPublishResult> {
    const config = this.getFacebookConfig();
    const pageId = options?.pageId || config.pageId;
    const accessToken = options?.accessToken || config.accessToken;

    if (!pageId || !accessToken || isPlaceholderToken(accessToken)) {
      return {
        success: false,
        errorCode: 190,
        message: 'Debes ingresar tu Page Access Token permanente de Meta for Developers.',
        technicalDetails: 'El token de Facebook actual no está configurado o es una plantilla de prueba ("EAAG..."). Haz clic en "Gestionar Conexión", pega tu Page Access Token permanente generado en Meta for Developers y presiona "Guardar Cambios".'
      };
    }

    const caption = options?.customCaption || this.formatProductCaption(product);

    // Seleccionar URL de imagen válida (soporta image, imagen y el array images)
const rawImage = 
  (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null) ||
  product.image ||
  product.imagen ||
  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';

const hasValidHttpImage = typeof rawImage === 'string' && (rawImage.startsWith('http://') || rawImage.startsWith('https://'));age.startsWith('https://'));

    try {
      console.log(`[MetaGraphService v26.0] Publicando producto "${product.title}" en página ${pageId}...`);

      let response: Response;
      let data: any;

      if (hasValidHttpImage) {
        // Método 1: Publicación con Foto (POST /{PAGE_ID}/photos)
        const photoEndpoint = `${this.apiBase}/${encodeURIComponent(pageId)}/photos`;
        
        const params = new URLSearchParams();
        params.append('url', rawImage);
        params.append('caption', caption);
        params.append('access_token', accessToken);

        response = await fetch(photoEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        });

        data = await response.json();
      } else {
      // Fallback seguro: siempre publicar en /photos para evitar el Error #200 de /feed
      const photoEndpoint = `${this.apiBase}/${encodeURIComponent(pageId)}/photos`;
      const fallbackImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';
      
      const params = new URLSearchParams();
      params.append('url', fallbackImage);
      params.append('caption', caption);
      params.append('access_token', accessToken);

      response = await fetch(photoEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      data = await response.json();
    }
      if (data && (data.id || data.post_id)) {
        const postId = String(data.post_id || data.id);
        const photoId = data.id ? String(data.id) : undefined;
        const permalink = `https://facebook.com/${postId}`;

        // Registrar en logs del sistema
        db.addLog({
          type: 'PRODUCT_UPDATE',
          action: 'Publicación en Facebook Oficial Exitosa',
          details: `Producto "${product.title}" publicado en Facebook Page (${pageId}) con ID ${postId}.`,
          status: 'success'
        });

        // Registrar en historial de publicaciones sociales
        db.publishSocialPost({
          productId: product.id,
          platforms: ['facebook'],
          copies: {
            facebook: caption
          },
          estimatedViewsBoost: 2500
        });

        // Actualizar fecha de última sincronización
        const currentSettings = db.getSocialMarketingSettings();
        if (currentSettings.connections.facebook) {
          db.saveSocialMarketingSettings({
            connections: {
              ...currentSettings.connections,
              facebook: {
                ...currentSettings.connections.facebook,
                lastSyncAt: new Date().toISOString(),
                status: 'connected'
              }
            }
          });
        }

        return {
          success: true,
          postId,
          photoId,
          permalink,
          message: `✅ Producto publicado con éxito en la página oficial de Facebook con ID ${postId}`
        };
      }

      // Si la API devolvió error de Meta
      if (data?.error) {
        const metaError = data.error;
        console.error('[MetaGraphService v26.0 Error]:', metaError);

        let troubleshooting = '';
        let displayMessage = `Error de Facebook Meta Graph API (${metaError.code}): ${metaError.message}`;

        if (metaError.code === 190 || metaError.message?.toLowerCase().includes('postcard')) {
          displayMessage = 'El Token de Facebook es inválido o ha expirado. Ve a "Gestionar Conexión" y pega tu Page Access Token permanente de Meta Developers.';
          troubleshooting = 'Token expirado o inválido (Error 190). Ve a Meta Developers > Graph API Explorer, selecciona tu Fanpage, copia el Page Access Token permanente y guárdalo en "Gestionar Conexión".';
        } else if (metaError.code === 200 || metaError.code === 10) {
          troubleshooting = 'Permisos insuficientes en Facebook. Tu Page Access Token requiere los permisos: pages_manage_posts, pages_read_engagement y pages_show_list.';
        } else if (metaError.code === 100) {
          troubleshooting = 'El Page ID proporcionado no coincide o el formato de la URL de imagen no pudo ser descargado por los servidores de Meta.';
        }

        return {
          success: false,
          errorCode: metaError.code,
          errorSubcode: metaError.error_subcode,
          errorType: metaError.type,
          message: displayMessage,
          technicalDetails: troubleshooting || metaError.message
        };
      }

      return {
        success: false,
        message: 'Respuesta inesperada de Facebook Graph API al publicar.',
        technicalDetails: JSON.stringify(data)
      };
    } catch (err: any) {
      console.error('[MetaGraphService v26.0 Exception]:', err);
      return {
        success: false,
        message: `Fallo de conexión HTTP con Meta Graph API: ${err.message}`,
        technicalDetails: err.stack || err.toString()
      };
    }
  }

  /**
   * Verifica la conexión y permisos del Page ID y Page Access Token contra Meta Graph API v26.0
   */
  public async checkConnection(pageId: string, accessToken: string): Promise<MetaConnectionCheckResult> {
    if (!pageId || !accessToken) {
      return {
        connected: false,
        validToken: false,
        message: 'Page ID y Page Access Token son requeridos para la verificación.'
      };
    }

    try {
      // 1. Consultar metadatos de la página
      const pageEndpoint = `${this.apiBase}/${encodeURIComponent(pageId)}?fields=id,name,category,link,verification_status,picture{url}&access_token=${encodeURIComponent(accessToken)}`;
      const pageRes = await fetch(pageEndpoint);
      const pageData = await pageRes.json();

      if (pageData?.error) {
        let hint = '';
        if (pageData.error.code === 190) {
          hint = 'Token expirado o inválido (Error 190). Por favor genera un nuevo Page Access Token permanente.';
        } else if (pageData.error.code === 100) {
          hint = 'El Page ID no existe o el token no tiene acceso a esta página.';
        }

        return {
          connected: false,
          validToken: false,
          message: `Error al validar con Meta Graph API: ${pageData.error.message}`,
          error: hint || pageData.error.message
        };
      }

      // 2. Extraer información de la página
      const pageName = pageData.name || 'Página de Facebook';
      const category = pageData.category || 'Comercio electrónico';
      const pictureUrl = pageData.picture?.data?.url || '';
      const link = pageData.link || `https://facebook.com/${pageId}`;

      return {
        connected: true,
        validToken: true,
        pageId: String(pageData.id || pageId),
        pageName,
        category,
        pictureUrl,
        link,
        message: `✅ Conexión establecida con éxito con la página oficial "${pageName}" (ID: ${pageId}).`
      };
    } catch (err: any) {
      return {
        connected: false,
        validToken: false,
        message: `No se pudo conectar a los servidores de Meta Graph API: ${err.message}`,
        error: err.message
      };
    }
  }

  /**
   * Publica un post de prueba para verificar permisos de escritura reales en la Fanpage
   */
  public async publishTestPost(pageId: string, accessToken: string): Promise<MetaFacebookPublishResult> {
    try {
      const feedEndpoint = `${this.apiBase}/${encodeURIComponent(pageId)}/feed`;
      const dateStr = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
      const testMessage = `🚀 [Sincronización Zavela Store Verificada]\n\nConexión oficial establecida exitosamente con Meta Graph API v26.0 (${dateStr}).\nLa sincronización de catálogo de productos, promociones y Pago Contra Entrega en Colombia está 100% activa.\n\n🌐 Tienda Oficial: https://zavelastore.com.co\n📲 Asesoría: +57 313 3595427`;

      const params = new URLSearchParams();
      params.append('message', testMessage);
      params.append('link', 'https://zavelastore.com.co');
      params.append('access_token', accessToken);

      const response = await fetch(feedEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      const data = await response.json();

      if (data && (data.id || data.post_id)) {
        const postId = String(data.post_id || data.id);
        return {
          success: true,
          postId,
          permalink: `https://facebook.com/${postId}`,
          message: `✅ Publicación de prueba exitosa en la página de Facebook con ID ${postId}`
        };
      }

      if (data?.error) {
        return {
          success: false,
          errorCode: data.error.code,
          message: `Error al publicar prueba (${data.error.code}): ${data.error.message}`,
          technicalDetails: data.error.message
        };
      }

      return {
        success: false,
        message: 'Respuesta inesperada al publicar post de prueba.'
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Excepción al conectar con Meta Graph API: ${err.message}`
      };
    }
  }
}

export const metaGraphService = new MetaGraphService();
