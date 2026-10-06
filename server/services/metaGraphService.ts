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

export class MetaGraphService {
  private readonly apiBase = 'https://graph.facebook.com/v26.0';

  /**
   * Obtiene la configuración de conexión con Facebook almacenada
   */
  public getFacebookConfig() {
    const settings = db.getSocialMarketingSettings();
    const fbConn = settings?.connections?.facebook;
    return {
      connected: Boolean(fbConn?.connected && fbConn?.pageId && fbConn?.accessToken),
      pageId: fbConn?.pageId || '',
      accessToken: fbConn?.accessToken || '',
      accountName: fbConn?.accountName || 'Zavela Store Colombia',
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

    if (!pageId || !accessToken) {
      return {
        success: false,
        message: 'No se ha configurado el Page ID o el Page Access Token permanente de Facebook. Ve a Configurar Facebook en el panel.',
        technicalDetails: 'Faltan credenciales de Facebook en settings.connections.facebook (pageId o accessToken).'
      };
    }

    const caption = options?.customCaption || this.formatProductCaption(product);

    // Seleccionar URL de imagen válida
    const rawImage = Array.isArray(product.images) && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';

    const hasValidHttpImage = typeof rawImage === 'string' && (rawImage.startsWith('http://') || rawImage.startsWith('https://'));

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
        // Fallback: Publicación en el Muro (POST /{PAGE_ID}/feed)
        const feedEndpoint = `${this.apiBase}/${encodeURIComponent(pageId)}/feed`;
        const slugOrId = product.slug || product.id;
        const link = `https://zavelastore.com.co/producto/${slugOrId}`;

        const params = new URLSearchParams();
        params.append('message', caption);
        params.append('link', link);
        params.append('access_token', accessToken);

        response = await fetch(feedEndpoint, {
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
        if (metaError.code === 190) {
          troubleshooting = 'El Token de Acceso de Página ha expirado o no es válido. Debes generar un Page Access Token permanente (System User o Extended Page Token) en Meta Developers.';
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
          message: `Error de Facebook Meta Graph API (${metaError.code}): ${metaError.message}`,
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
      // 1. Consultar metadatos de la página con timeout de 4 segundos
      const pageEndpoint = `${this.apiBase}/${encodeURIComponent(pageId.trim())}?fields=id,name,category,link,verification_status,picture{url}&access_token=${encodeURIComponent(accessToken.trim())}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const pageRes = await fetch(pageEndpoint, {
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));

      const pageData = await pageRes.json();

      if (pageData?.error) {
        let hint = '';
        if (pageData.error.code === 190) {
          if (String(pageData.error.message).includes('decrypted')) {
            hint = 'El token ingresado no pudo ser descifrado por Meta. Copia el token completo de inicio a fin desde Meta Developers (sin omitir caracteres).';
          } else {
            hint = 'Token expirado o inválido (Error 190). Por favor genera un nuevo Page Access Token permanente en Meta Developers o Meta Business Suite.';
          }
        } else if (pageData.error.code === 100) {
          hint = 'El Page ID no existe o el token no tiene acceso a esta página.';
        } else if (pageData.error.code === 200 || pageData.error.code === 10) {
          hint = 'Permisos insuficientes. El token debe incluir los permisos pages_manage_posts y pages_read_engagement.';
        }

        return {
          connected: false,
          validToken: false,
          message: `Error de validación Meta Graph API: ${pageData.error.message}`,
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
      const isAbort = err.name === 'AbortError' || String(err.message).includes('aborted');
      return {
        connected: false,
        validToken: false,
        message: isAbort ? 'Tiempo de espera agotado al conectar con Meta Graph API (más de 4s).' : `No se pudo conectar a los servidores de Meta Graph API: ${err.message}`,
        error: isAbort ? 'Los servidores de Facebook tardaron demasiado en responder. La configuración se guardará de todas formas.' : err.message
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
