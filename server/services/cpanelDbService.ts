import { Product, Order } from '../../src/types/index.ts';

const DEFAULT_CPANEL_API_URL = 'http://api.zavelastore.com.co/api.php';

/**
 * CpanelDbService: Servicio cliente para consumir la API PHP con base de datos MySQL en cPanel
 * Provee persistencia externa y un sistema de fallback transparente hacia la base de datos local en memoria.
 */
export class CpanelDbService {
  /**
   * Obtiene la URL base configurada para la API de cPanel.
   */
  public getApiUrl(): string {
    const url = process.env.DB_API_URL || DEFAULT_CPANEL_API_URL;
    return url.trim();
  }

  /**
   * 1. GET /api.php?action=productos
   * Carga el catálogo de productos desde la API PHP en cPanel (MySQL).
   * Si la API de cPanel no responde o genera error, retorna null de forma transparente
   * para que la aplicación continúe operando con la base de datos local.
   */
  async fetchProducts(): Promise<Product[] | null> {
    const baseUrl = this.getApiUrl();
    const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=productos`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ZavelaStore-Fullstack/1.0 (Render)'
        },
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        console.warn(`[cPanel DB Fallback] HTTP ${response.status} en ${endpoint}. Continuando con catálogo local en memoria.`);
        return null;
      }

      const text = await response.text();
      let raw: any;
      try {
        raw = JSON.parse(text);
      } catch {
        console.warn('[cPanel DB Fallback] Respuesta no es JSON válido desde cPanel. Usando datos locales.');
        return null;
      }

      const list = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.productos) ? raw.productos : null));

      if (!list) {
        console.warn('[cPanel DB Fallback] Estructura de productos no reconocida en respuesta cPanel.');
        return null;
      }

      return list.map(item => this.normalizeProduct(item));
    } catch (err: any) {
      console.warn(`[cPanel DB Fallback] Conexión no disponible con cPanel (${err?.message || err}). Catálogo local activo.`);
      return null;
    }
  }

  /**
   * 2. POST /api.php?action=productos
   * Crea o actualiza un producto en la base de datos MySQL de cPanel.
   * Envía campos tanto en inglés como en español para máxima compatibilidad con el script PHP.
   */
  async saveProduct(product: Product): Promise<any | null> {
    const baseUrl = this.getApiUrl();
    const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=productos`;

    const payload = {
      ...product,
      id: product.id,
      title: product.title,
      nombre: product.title,
      slug: product.slug,
      description: product.description,
      descripcion: product.description,
      shortDescription: product.shortDescription || '',
      price: product.price,
      precio: product.price,
      costPrice: product.costPrice || 0,
      costo: product.costPrice || 0,
      stock: product.stock,
      inventario: product.stock,
      active: product.active ? 1 : 0,
      activo: product.active ? 1 : 0,
      featured: product.featured ? 1 : 0,
      destacado: product.featured ? 1 : 0,
      images: product.images,
      imagen: product.images?.[0] || '',
      category: product.categoryName || product.categoryId || '',
      categoria: product.categoryName || product.categoryId || '',
      categoryId: product.categoryId || '',
      dropi_product_id: product.dropi_product_id || product.dropiProductId || '',
      updatedAt: product.updatedAt || new Date().toISOString()
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ZavelaStore-Fullstack/1.0 (Render)'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) {
        console.warn(`[cPanel DB Sync] HTTP ${response.status} al sincronizar producto en cPanel. Guardado local preservado.`);
        return null;
      }

      const resText = await response.text();
      try {
        return JSON.parse(resText);
      } catch {
        return { success: true, message: 'Producto recibido en cPanel' };
      }
    } catch (err: any) {
      console.warn(`[cPanel DB Sync] Error al sincronizar producto "${product.title}" con cPanel (${err?.message || err}). Persistencia local activa.`);
      return null;
    }
  }

  /**
   * 3. POST /api.php?action=pedidos
   * Registra la orden de compra junto con los datos del cliente, productos y estado en MySQL vía cPanel.
   */
  async createOrder(order: Order): Promise<any | null> {
    const baseUrl = this.getApiUrl();
    const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=pedidos`;

    const formattedAddress = [order.address, order.city, order.department].filter(Boolean).join(', ');

    const payload = {
      id: order.id,
      orderNumber: order.orderNumber,
      order_number: order.orderNumber,
      numero_pedido: order.orderNumber,
      cliente_nombre: order.customerName,
      nombre_cliente: order.customerName,
      customerName: order.customerName,
      customer_name: order.customerName,
      cliente_telefono: order.customerPhone,
      telefono: order.customerPhone,
      customerPhone: order.customerPhone,
      customer_phone: order.customerPhone,
      cliente_email: order.customerEmail,
      email: order.customerEmail,
      customerEmail: order.customerEmail,
      customer_email: order.customerEmail,
      department: order.department,
      departamento: order.department,
      city: order.city,
      ciudad: order.city,
      cliente_direccion: formattedAddress || order.address,
      direccion: formattedAddress || order.address,
      address: formattedAddress || order.address,
      additionalNotes: order.additionalNotes || '',
      notas: order.additionalNotes || '',
      subtotal: order.subtotal || 0,
      shippingCost: order.shippingCost || 0,
      costo_envio: order.shippingCost || 0,
      total: order.total || 0,
      paymentMethod: order.paymentMethod,
      metodo_pago: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
      estado: order.status === 'APROBADO_DROPI' ? 'aprobado' : (order.status || 'pendiente'),
      dropi_order_id: order.dropi_order_id || null,
      dropi_guia: order.dropi_guia || order.trackingNumber || null,
      carrier: order.carrier || 'Servientrega',
      transportadora: order.carrier || 'Servientrega',
      dane_code: order.dane_code || '',
      codigo_dane: order.dane_code || '',
      items: order.items || [],
      productos: order.items || [],
      createdAt: order.createdAt || new Date().toISOString(),
      fecha: order.createdAt || new Date().toISOString()
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ZavelaStore-Fullstack/1.0 (Render)'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) {
        console.warn(`[cPanel DB Sync] HTTP ${response.status} al registrar pedido ${order.orderNumber} en cPanel. Pedido seguro en BD local.`);
        return null;
      }

      const resText = await response.text();
      try {
        return JSON.parse(resText);
      } catch {
        return { success: true, message: 'Pedido registrado en cPanel' };
      }
    } catch (err: any) {
      console.warn(`[cPanel DB Sync] Error al enviar pedido ${order.orderNumber} a cPanel (${err?.message || err}). El pedido permanece protegido en memoria.`);
      return null;
    }
  }

  /**
   * 4. GET /api.php?action=pedidos
   * Consulta los pedidos en la base de datos MySQL en cPanel para el panel de administración.
   */
  async fetchOrders(): Promise<Order[] | null> {
    const baseUrl = this.getApiUrl();
    const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=pedidos`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ZavelaStore-Fullstack/1.0 (Render)'
        },
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        console.warn(`[cPanel DB Fallback] HTTP ${response.status} al consultar pedidos en cPanel. Mostrando pedidos locales.`);
        return null;
      }

      const text = await response.text();
      let raw: any;
      try {
        raw = JSON.parse(text);
      } catch {
        console.warn('[cPanel DB Fallback] Respuesta de pedidos no es JSON válido desde cPanel.');
        return null;
      }

      const list = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.pedidos) ? raw.pedidos : null));

      if (!list) {
        return null;
      }

      const KNOWN_TEST_ORDER_IDS = new Set(['ord_6ac3d1d6de62c', 'ord_6ac3d1d181bbb', 'ord_6ac3d1cb38ede']);

      return list
        .filter((item: any) => {
          if (!item) return false;
          const id = String(item.id || '');
          const customerName = String(item.cliente_nombre || item.customerName || item.cliente || '').trim().toLowerCase();
          const phone = String(item.cliente_telefono || item.customerPhone || '').replace(/\D/g, '');
          
          // Excluir pruebas internas, simulaciones y órdenes de prueba
          if (KNOWN_TEST_ORDER_IDS.has(id)) return false;
          if (id.startsWith('ord-sim-') || id.startsWith('ord-test-') || id.startsWith('test-')) return false;
          if (customerName === 'prueba nombre' || customerName === 'juan perez' || customerName === '') return false;
          if (customerName.includes('prueba') || customerName.includes('test')) return false;
          if (phone === '3008784427' && customerName.includes('prueba')) return false;

          return true;
        })
        .map(item => this.normalizeOrder(item));
    } catch (err: any) {
      console.warn(`[cPanel DB Fallback] Conexión no disponible para consultar pedidos en cPanel (${err?.message || err}).`);
      return null;
    }
  }

  /**
   * Normaliza los datos de producto provenientes de PHP/MySQL a la interfaz Product
   */
  private normalizeProduct(item: any): Product {
    let images: string[] = [];
    if (Array.isArray(item.images)) {
      images = item.images;
    } else if (typeof item.images === 'string') {
      try {
        const parsed = JSON.parse(item.images);
        images = Array.isArray(parsed) ? parsed : [item.images];
      } catch {
        images = item.images.includes(',') ? item.images.split(',').map((s: string) => s.trim()) : [item.images];
      }
    } else if (item.imagen) {
      images = [item.imagen];
    } else if (item.image) {
      images = [item.image];
    }

    if (images.length === 0) {
      images = ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];
    }

    const price = Number(item.price || item.precio) || 0;
    const costPrice = Number(item.costPrice || item.costo || item.cost_price) || 0;
    const title = item.title || item.nombre || 'Producto Zavela';
    const slug = item.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    return {
      id: String(item.id || `prod-${Math.random().toString(36).substring(2, 7)}`),
      title,
      slug,
      description: item.description || item.descripcion || '',
      shortDescription: item.shortDescription || item.descripcion_corta || '',
      price,
      costPrice,
      stock: Number(item.stock !== undefined ? item.stock : (item.inventario !== undefined ? item.inventario : 10)),
      active: item.active !== undefined ? Boolean(item.active) : (item.activo !== undefined ? Boolean(item.activo) : true),
      featured: Boolean(item.featured || item.destacado),
      images,
      tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === 'string' ? item.tags.split(',') : []),
      categoryId: item.categoryId || item.categoria_id || item.category || 'cat-1',
      categoryName: item.categoryName || item.categoria || 'Catálogo',
      dropi_product_id: item.dropi_product_id || item.dropiProductId || item.dropi_id,
      createdAt: item.createdAt || item.fecha_creacion || new Date().toISOString(),
      updatedAt: item.updatedAt || item.fecha_actualizacion || new Date().toISOString()
    };
  }

  /**
   * Normaliza los datos de pedido provenientes de PHP/MySQL a la interfaz Order
   */
  private normalizeOrder(item: any): Order {
    let items = [];
    if (Array.isArray(item.items)) {
      items = item.items;
    } else if (Array.isArray(item.productos)) {
      items = item.productos;
    } else if (typeof item.items === 'string') {
      try {
        const parsed = JSON.parse(item.items);
        items = Array.isArray(parsed) ? parsed : [];
      } catch {
        items = [];
      }
    } else if (typeof item.productos === 'string') {
      try {
        const parsed = JSON.parse(item.productos);
        items = Array.isArray(parsed) ? parsed : [];
      } catch {
        items = [];
      }
    }

    const customerName = item.cliente_nombre || item.nombre_cliente || item.customerName || item.customer_name || item.cliente || 'Cliente';
    const total = Number(item.total || item.total_amount) || 0;
    const subtotal = Number(item.subtotal) || total;
    const shippingCost = Number(item.shippingCost || item.costo_envio) || 0;
    const rawStatus = (item.status || item.estado || '').toLowerCase();
    let status: any = 'PENDIENTE_REVISION';
    if (rawStatus === 'aprobado' || rawStatus === 'aprobado_dropi') {
      status = 'APROBADO_DROPI';
    } else if (rawStatus === 'entregado' || rawStatus === 'completado') {
      status = 'ENTREGADO';
    } else if (rawStatus === 'cancelado') {
      status = 'CANCELADO';
    } else if (item.status) {
      status = item.status;
    }

    return {
      id: String(item.id || `ord-${Date.now()}`),
      orderNumber: item.orderNumber || item.order_number || item.numero_pedido || (item.id ? `ZV-${String(item.id).slice(-4).toUpperCase()}` : `NV-${Math.floor(1000 + Math.random() * 9000)}`),
      customerName,
      customerPhone: item.cliente_telefono || item.customerPhone || item.customer_phone || item.telefono || '',
      customerEmail: item.cliente_email || item.customerEmail || item.customer_email || item.email || '',
      department: item.cliente_departamento || item.department || item.departamento || 'Cundinamarca',
      city: item.cliente_ciudad || item.city || item.ciudad || 'Bogotá D.C.',
      address: item.cliente_direccion || item.address || item.direccion || '',
      additionalNotes: item.additionalNotes || item.notas || '',
      subtotal,
      shippingCost,
      total,
      paymentMethod: item.paymentMethod || item.metodo_pago || 'contra_entrega',
      paymentStatus: item.paymentStatus || (item.paymentMethod === 'contra_entrega' ? 'CASH_ON_DELIVERY' : 'APPROVED'),
      status,
      dropi_order_id: item.dropi_order_id || item.dropiOrderId || undefined,
      dropi_guia: item.dropi_guia || item.guia || item.trackingNumber || undefined,
      trackingNumber: item.trackingNumber || item.dropi_guia || item.guia || undefined,
      carrier: item.carrier || item.transportadora || 'Servientrega',
      dane_code: item.dane_code || item.codigo_dane || '',
      items,
      createdAt: item.createdAt || item.fecha || item.created_at || new Date().toISOString(),
      updatedAt: item.updatedAt || item.fecha_actualizacion || item.created_at || new Date().toISOString()
    };
  }

  /**
   * 5. POST /api.php?action=clientes
   * Guarda un nuevo cliente registrado en MySQL vía cPanel.
   */
  async createCustomer(customer: {
    name?: string;
    nombre?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    phone?: string;
    telefono?: string;
    address?: string;
    direccion?: string;
    city?: string;
    ciudad?: string;
    department?: string;
    departamento?: string;
  }): Promise<any | null> {
    const baseUrl = this.getApiUrl();
    const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=clientes`;

    const fullName = customer.nombre || customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Cliente Zavela';
    const phone = customer.telefono || customer.phone || '';
    const address = customer.direccion || customer.address || '';
    const city = customer.ciudad || customer.city || '';
    const department = customer.departamento || customer.department || '';

    const payload = {
      nombre: fullName,
      name: fullName,
      email: customer.email,
      telefono: phone,
      phone: phone,
      direccion: address,
      address: address,
      ciudad: city,
      city: city,
      departamento: department,
      department: department
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ZavelaStore-Fullstack/1.0 (Render)'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) {
        console.warn(`[cPanel Customer Sync] HTTP ${response.status} al registrar cliente en cPanel.`);
        return null;
      }

      const resText = await response.text();
      try {
        return JSON.parse(resText);
      } catch {
        return { status: 'ok', message: 'Cliente guardado con éxito' };
      }
    } catch (err: any) {
      console.warn(`[cPanel Customer Sync] Error al enviar cliente a cPanel (${err?.message || err}).`);
      return null;
    }
  }

  /**
   * 6. GET /api.php?action=clientes
   * Consulta los clientes registrados en MySQL cPanel.
   */
  async fetchCustomers(): Promise<any[] | null> {
    const baseUrl = this.getApiUrl();
    const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=clientes`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ZavelaStore-Fullstack/1.0 (Render)'
        },
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        console.warn(`[cPanel Customers Fallback] HTTP ${response.status} al consultar clientes en cPanel.`);
        return null;
      }

      const text = await response.text();
      let raw: any;
      try {
        raw = JSON.parse(text);
      } catch {
        return null;
      }

      const list = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.clientes) ? raw.clientes : null));

      if (!list) return null;

      const KNOWN_TEST_CUSTOMER_IDS = new Set(['usr_6ac3d5c3ab451', 'usr_6ac3d5127c43c']);

      return list
        .filter((item: any) => {
          if (!item) return false;
          const id = String(item.id || '');
          const email = String(item.email || '').trim().toLowerCase();
          const name = String(item.nombre || item.name || '').trim().toLowerCase();
          const phone = String(item.telefono || item.phone || '').replace(/\D/g, '');

          // Excluir clientes registrados por pruebas internas
          if (KNOWN_TEST_CUSTOMER_IDS.has(id)) return false;
          if (email === 'valentina@gmail.com' || email === 'carlos@gmail.com') return false;
          if (name.includes('prueba') || name.includes('test')) return false;
          if (email.includes('test') || email.includes('@zavelastore.co')) return false;
          if (phone === '3119876543' && name.includes('valentina')) return false;
          if (phone === '3001234567' && name.includes('carlos')) return false;

          return true;
        })
        .map(item => this.normalizeCustomer(item));
    } catch (err: any) {
      console.warn(`[cPanel Customers Fallback] Conexión no disponible para clientes en cPanel (${err?.message || err}).`);
      return null;
    }
  }

  /**
   * Normaliza los datos de cliente provenientes de cPanel a la estructura estándar
   */
  private normalizeCustomer(item: any): any {
    const name = item.nombre || item.name || 'Cliente Zavela';
    const nameParts = String(name).trim().split(' ');
    const firstName = nameParts[0] || name;
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      id: String(item.id || `cust-${Date.now()}`),
      name,
      nombre: name,
      firstName,
      lastName,
      email: item.email || '',
      phone: item.telefono || item.phone || '',
      telefono: item.telefono || item.phone || '',
      address: item.direccion || item.address || '',
      direccion: item.direccion || item.address || '',
      city: item.ciudad || item.city || '',
      ciudad: item.ciudad || item.city || '',
      department: item.departamento || item.department || '',
      departamento: item.departamento || item.department || '',
      createdAt: item.created_at || item.createdAt || item.fecha || new Date().toISOString(),
      created_at: item.created_at || item.createdAt || item.fecha || new Date().toISOString()
    };
  }

  /**
   * 7. GET /api.php?action=asesores
   * Consulta la lista de asesores registrados en MySQL cPanel.
   */
  async fetchAdvisors(): Promise<any[] | null> {
    const baseUrl = this.getApiUrl();
    const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=asesores`;

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ZavelaStore-Fullstack/1.0 (Render)'
        },
        signal: AbortSignal.timeout(3500)
      });

      if (!response.ok) {
        console.warn(`[cPanel Advisors Fallback] HTTP ${response.status} al consultar asesores en cPanel.`);
        return null;
      }

      const text = await response.text();
      let raw: any;
      try {
        raw = JSON.parse(text);
      } catch {
        return null;
      }

      const list = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.asesores) ? raw.asesores : null));

      if (!list) return null;

      return list.map(item => this.normalizeAdvisor(item));
    } catch (err: any) {
      console.warn(`[cPanel Advisors Fallback] Conexión no disponible para asesores en cPanel (${err?.message || err}).`);
      return null;
    }
  }

  /**
   * 8. POST /api.php?action=asesores
   * Registra o actualiza un asesor en MySQL cPanel.
   */
  async saveAdvisor(advisor: {
    id?: string;
    nombre?: string;
    name?: string;
    telefono?: string;
    phone?: string;
    whatsapp?: string;
    rol?: string;
    role?: string;
    activo?: boolean | number;
    status?: string;
  }): Promise<any | null> {
    const baseUrl = this.getApiUrl();
    const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=asesores`;

    const nombre = advisor.nombre || advisor.name || 'Asesor Zavela';
    const telefono = advisor.telefono || advisor.whatsapp || advisor.phone || '';
    const rol = advisor.rol || advisor.role || 'Asesor de Ventas';
    const activo = advisor.activo !== undefined 
      ? (advisor.activo ? 1 : 0) 
      : (advisor.status === 'inactive' ? 0 : 1);

    const payload: any = {
      nombre,
      name: nombre,
      telefono,
      whatsapp: telefono,
      phone: telefono,
      rol,
      role: rol,
      activo
    };

    if (advisor.id) {
      payload.id = advisor.id;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'ZavelaStore-Fullstack/1.0 (Render)'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) {
        console.warn(`[cPanel Advisor Save] HTTP ${response.status} al guardar asesor en cPanel.`);
        return null;
      }

      const resText = await response.text();
      try {
        return JSON.parse(resText);
      } catch {
        return { status: 'ok', message: 'Asesor guardado con éxito' };
      }
    } catch (err: any) {
      console.warn(`[cPanel Advisor Save] Error al guardar asesor en cPanel (${err?.message || err}).`);
      return null;
    }
  }

  /**
   * 9. DELETE /api.php?action=asesores&id=...
   * Elimina un asesor en MySQL cPanel.
   */
  async deleteAdvisor(id: string): Promise<any | null> {
    const baseUrl = this.getApiUrl();
    const endpoint = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}action=asesores&id=${encodeURIComponent(id)}`;

    try {
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ZavelaStore-Fullstack/1.0 (Render)'
        },
        signal: AbortSignal.timeout(4000)
      });

      if (!response.ok) {
        console.warn(`[cPanel Advisor Delete] HTTP ${response.status} al eliminar asesor en cPanel.`);
        return null;
      }

      const resText = await response.text();
      try {
        return JSON.parse(resText);
      } catch {
        return { status: 'ok', message: 'Asesor eliminado' };
      }
    } catch (err: any) {
      console.warn(`[cPanel Advisor Delete] Error al eliminar asesor en cPanel (${err?.message || err}).`);
      return null;
    }
  }

  /**
   * Normaliza los datos de un asesor proveniente de cPanel MySQL
   */
  private normalizeAdvisor(item: any): any {
    const nombre = item.nombre || item.name || 'Asesor Zavela';
    const telefono = item.telefono || item.whatsapp || item.phone || '';
    const rol = item.rol || item.role || 'Asesor de Ventas';
    const activo = item.activo !== undefined ? Boolean(Number(item.activo)) : true;

    return {
      id: String(item.id || `ase-${Date.now()}`),
      name: nombre,
      nombre,
      phone: telefono,
      telefono,
      whatsapp: telefono,
      role: rol,
      rol,
      status: activo ? 'active' : 'inactive',
      activo: activo ? 1 : 0,
      channel: 'WhatsApp Directo',
      createdAt: item.created_at || item.createdAt || new Date().toISOString(),
      created_at: item.created_at || item.createdAt || new Date().toISOString()
    };
  }
}

export const cpanelDbService = new CpanelDbService();
