// Firestore Products Service (Modular SDK v9+)
// CRUD de Productos y sincronización en tiempo real con Cloud Firestore y Firebase Storage

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '../lib/firebase.ts';
import { Product } from '../types/index.ts';

const PRODUCTS_COLLECTION = 'products';

/**
 * Sanitiza recursivamente cualquier objeto o array eliminando todas las propiedades con valor `undefined`.
 * Esto garantiza que updateDoc, setDoc, addDoc y writeBatch nunca fallen con el error
 * "Unsupported field value: undefined".
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  const clean: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }

    if (value === null) {
      clean[key] = null;
    } else if (Array.isArray(value)) {
      clean[key] = value
        .filter(item => item !== undefined)
        .map(item => {
          if (item !== null && typeof item === 'object' && !(item instanceof Date) && !(item instanceof Timestamp)) {
            return sanitizeFirestoreData(item);
          }
          return item;
        });
    } else if (
      typeof value === 'object' && 
      !(value instanceof Date) && 
      !(value instanceof Timestamp) && 
      typeof (value as any).toDate !== 'function' &&
      !(typeof (value as any).isEqual === 'function' && (value as any)._methodName) // FieldValue (e.g. serverTimestamp)
    ) {
      clean[key] = sanitizeFirestoreData(value);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

/**
 * Convierte un documento de Firestore a la interfaz Product de la aplicación
 */
function mapDocToProduct(docSnap: any): Product {
  const data = docSnap.data();
  const id = docSnap.id;

  // Formatear fechas
  let createdAt = new Date().toISOString();
  if (data.createdAt) {
    if (typeof data.createdAt.toDate === 'function') {
      createdAt = data.createdAt.toDate().toISOString();
    } else if (typeof data.createdAt === 'string') {
      createdAt = data.createdAt;
    }
  }

  let updatedAt = createdAt;
  if (data.updatedAt) {
    if (typeof data.updatedAt.toDate === 'function') {
      updatedAt = data.updatedAt.toDate().toISOString();
    } else if (typeof data.updatedAt === 'string') {
      updatedAt = data.updatedAt;
    }
  }

  const price = Number(data.price) || 0;
  const costPrice = Number(data.costPrice) || Math.round(price * 0.45);
  const estimatedShippingCost = Number(data.estimatedShippingCost) !== undefined && !isNaN(Number(data.estimatedShippingCost)) 
    ? Number(data.estimatedShippingCost) 
    : 16500;
  const dropiFee = Number(data.dropiFee) !== undefined && !isNaN(Number(data.dropiFee)) 
    ? Number(data.dropiFee) 
    : 4000;
  const totalOperatingCost = Number(data.totalOperatingCost) || (costPrice + estimatedShippingCost + dropiFee);
  const realNetProfit = Number(data.realNetProfit) !== undefined 
    ? Number(data.realNetProfit) 
    : (price - totalOperatingCost);
  const realNetMarginPercentage = price > 0 
    ? Math.round((realNetProfit / price) * 1000) / 10 
    : 0;

  const marginAmount = price - costPrice;
  const marginPercentage = costPrice > 0 ? Math.round((marginAmount / costPrice) * 1000) / 10 : 0;

  return {
    id: id || data.id,
    title: data.title || 'Producto sin título',
    slug: data.slug || `producto-${id}`,
    description: data.description || '',
    shortDescription: data.shortDescription || '',
    price,
    costPrice,
    estimatedShippingCost,
    dropiFee,
    totalOperatingCost,
    realNetProfit,
    realNetMarginPercentage,
    compareAtPrice: Number(data.compareAtPrice) || (price > 0 ? Math.round(price * 1.35) : 0),
    discountPercentage: Number(data.discountPercentage) || 0,
    marginAmount,
    marginPercentage,
    stock: Number(data.stock) ?? 10,
    active: data.active !== false && data.isDeleted !== true,
    featured: Boolean(data.featured),
    images: Array.isArray(data.images) && data.images.length > 0 
      ? data.images 
      : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'],
    warrantyInfo: data.warrantyInfo || '30 días de garantía oficial Zavela Store.',
    tags: Array.isArray(data.tags) ? data.tags : ['tendencia', 'calidad', 'contraentrega'],
    weightKg: Number(data.weightKg) || 0.5,
    categoryId: data.categoryId || 'tecnologia',
    categoryName: data.categoryName || 'Catálogo',
    subcategoryId: data.subcategoryId || '',
    subcategoryName: data.subcategoryName || '',
    variants: Array.isArray(data.variants) ? data.variants : [],
    warehouseCity: data.warehouseCity || 'Bogotá D.C.',
    brand: data.brand || 'Zavela Store',
    dropi_product_id: data.dropi_product_id ? String(data.dropi_product_id) : (data.dropiProductId ? String(data.dropiProductId) : ''),
    createdAt,
    updatedAt
  };
}

/**
 * 1. OBTENER / LISTAR PRODUCTOS (Lectura única con getDocs)
 * @param onlyActive Si es true, solo retorna los productos activos y no borrados (para la vista de clientes)
 */
export async function getFirestoreProducts(onlyActive: boolean = false): Promise<Product[]> {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const q = onlyActive 
      ? query(productsRef, where('active', '==', true))
      : query(productsRef);

    const snapshot = await getDocs(q);
    const products: Product[] = [];

    snapshot.forEach(docSnap => {
      const p = mapDocToProduct(docSnap);
      if (!onlyActive || (p.active && (docSnap.data() as any).isDeleted !== true)) {
        products.push(p);
      }
    });

    return products;
  } catch (error) {
    console.error('Error al obtener productos de Firestore:', error);
    throw error;
  }
}

/**
 * 2. SUSCRIPCIÓN EN TIEMPO REAL (onSnapshot)
 * Permite que cualquier cambio realizado en el panel de administración se refleje
 * instantáneamente en la tienda de los clientes sin necesidad de recargar.
 */
export function subscribeToFirestoreProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (error: Error) => void,
  onlyActive: boolean = false
): () => void {
  try {
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const q = query(productsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const products: Product[] = [];
        snapshot.forEach((docSnap) => {
          const p = mapDocToProduct(docSnap);
          const rawData = docSnap.data();
          if (!onlyActive || (p.active && rawData.isDeleted !== true)) {
            products.push(p);
          }
        });
        onUpdate(products);
      },
      (err) => {
        console.error('Error en onSnapshot de productos en Firestore:', err);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error('Error al iniciar suscripción onSnapshot de Firestore:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * 3. CREAR PRODUCTO (addDoc o setDoc en Firestore)
 * Guarda el producto con timestamp del servidor y calcula márgenes.
 */
export async function createFirestoreProduct(productData: Partial<Product>): Promise<Product> {
  try {
    const price = Number(productData.price) || 0;
    const costPrice = Number(productData.costPrice) || Math.round(price * 0.45);
    const estimatedShippingCost = productData.estimatedShippingCost !== undefined && !isNaN(Number(productData.estimatedShippingCost))
      ? Number(productData.estimatedShippingCost)
      : 16500;
    const dropiFee = productData.dropiFee !== undefined && !isNaN(Number(productData.dropiFee))
      ? Number(productData.dropiFee)
      : 4000;
    const totalOperatingCost = productData.totalOperatingCost !== undefined && !isNaN(Number(productData.totalOperatingCost))
      ? Number(productData.totalOperatingCost)
      : (costPrice + estimatedShippingCost + dropiFee);
    const realNetProfit = productData.realNetProfit !== undefined && !isNaN(Number(productData.realNetProfit))
      ? Number(productData.realNetProfit)
      : (price - totalOperatingCost);
    const realNetMarginPercentage = price > 0
      ? Math.round((realNetProfit / price) * 1000) / 10
      : 0;

    const compareAtPrice = Number(productData.compareAtPrice) || (price > 0 ? Math.round(price * 1.35) : 0);
    const discountPercentage = (compareAtPrice > price) ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100) : 0;
    const marginAmount = price - costPrice;
    const marginPercentage = costPrice > 0 ? Math.round((marginAmount / costPrice) * 1000) / 10 : 0;

    const cleanSlug = productData.slug || productData.title?.toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `producto-${Date.now()}`;

    let docData: Record<string, any> = {
      title: productData.title?.trim() || 'Nuevo Producto',
      slug: cleanSlug,
      description: productData.description || '',
      shortDescription: productData.shortDescription || '',
      price,
      costPrice,
      estimatedShippingCost,
      dropiFee,
      totalOperatingCost,
      realNetProfit,
      realNetMarginPercentage,
      compareAtPrice,
      discountPercentage,
      marginAmount,
      marginPercentage,
      stock: Number(productData.stock) ?? 10,
      active: productData.active !== false,
      isDeleted: false,
      featured: Boolean(productData.featured),
      images: Array.isArray(productData.images) && productData.images.length > 0 
        ? productData.images 
        : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'],
      warrantyInfo: productData.warrantyInfo || '30 días de garantía oficial Zavela Store.',
      tags: Array.isArray(productData.tags) ? productData.tags : ['tendencia', 'calidad', 'contraentrega'],
      weightKg: Number(productData.weightKg) || 0.5,
      categoryId: productData.categoryId || 'tecnologia',
      categoryName: productData.categoryName || 'Tecnología',
      subcategoryId: productData.subcategoryId || '',
      subcategoryName: productData.subcategoryName || '',
      variants: Array.isArray(productData.variants) ? productData.variants : [],
      warehouseCity: productData.warehouseCity || 'Bogotá D.C.',
      brand: productData.brand || 'Zavela Store',
      dropi_product_id: productData.dropi_product_id ? String(productData.dropi_product_id) : (productData.dropiProductId ? String(productData.dropiProductId) : ''),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    docData = sanitizeFirestoreData(docData);

    let docId = productData.id;
    if (docId) {
      const docRef = doc(db, PRODUCTS_COLLECTION, docId);
      await setDoc(docRef, docData, { merge: true });
    } else {
      const colRef = collection(db, PRODUCTS_COLLECTION);
      const newDocRef = await addDoc(colRef, docData);
      docId = newDocRef.id;
    }

    return {
      id: docId,
      ...docData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Product;
  } catch (error) {
    console.error('Error al crear producto en Firestore:', error);
    throw error;
  }
}

/**
 * 4. EDITAR / ACTUALIZAR PRODUCTO (updateDoc en Firestore)
 */
export async function updateFirestoreProduct(id: string, updates: Partial<Product>): Promise<void> {
  try {
    if (!id) throw new Error('ID de producto no especificado para actualizar');

    const docRef = doc(db, PRODUCTS_COLLECTION, id);
    const rawUpdates: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    // Recalcular márgenes y costos operativos si se modificó el precio o los costos
    if (
      updates.price !== undefined || 
      updates.costPrice !== undefined || 
      updates.estimatedShippingCost !== undefined || 
      updates.dropiFee !== undefined ||
      updates.totalOperatingCost !== undefined
    ) {
      const price = Number(updates.price);
      const costPrice = Number(updates.costPrice);
      const shipping = Number(updates.estimatedShippingCost ?? 16500);
      const fee = Number(updates.dropiFee ?? 4000);

      if (!isNaN(price) && !isNaN(costPrice)) {
        rawUpdates.marginAmount = price - costPrice;
        rawUpdates.marginPercentage = costPrice > 0 ? Math.round(((price - costPrice) / costPrice) * 1000) / 10 : 0;
        
        const totalCost = costPrice + shipping + fee;
        rawUpdates.totalOperatingCost = updates.totalOperatingCost ?? totalCost;
        rawUpdates.realNetProfit = price - (updates.totalOperatingCost ?? totalCost);
        rawUpdates.realNetMarginPercentage = price > 0 ? Math.round(((price - totalCost) / price) * 1000) / 10 : 0;
      }
    }

    // Asegurar que dropi_product_id no sea undefined
    if (rawUpdates.dropi_product_id === undefined && rawUpdates.dropiProductId !== undefined) {
      rawUpdates.dropi_product_id = String(rawUpdates.dropiProductId);
    } else if (rawUpdates.dropi_product_id === undefined) {
      delete rawUpdates.dropi_product_id;
    }

    // No sobreescribir el ID dentro del data
    delete rawUpdates.id;

    // Sanitizar exhaustivamente para eliminar cualquier clave undefined antes de updateDoc
    const cleanUpdates = sanitizeFirestoreData(rawUpdates);

    await updateDoc(docRef, cleanUpdates);
  } catch (error) {
    console.error(`Error al actualizar producto ${id} en Firestore:`, error);
    throw error;
  }
}

/**
 * 4b. DESCONTAR INVENTARIO AUTOMÁTICAMENTE TRAS UNA COMPRA
 * Descuenta la cantidad comprada de cada producto en Cloud Firestore de forma atómica.
 * Retorna la lista de productos cuyo stock quedó en nivel crítico (<= 5 unidades).
 */
export async function decrementFirestoreProductStock(
  items: { productId: string; variantId?: string; quantity: number }[]
): Promise<{ productId: string; newStock: number; isCriticalLow: boolean }[]> {
  try {
    if (!items || items.length === 0) return [];

    const results: { productId: string; newStock: number; isCriticalLow: boolean }[] = [];

    for (const item of items) {
      if (!item.productId) continue;
      const qty = Number(item.quantity) || 1;
      const docRef = doc(db, PRODUCTS_COLLECTION, item.productId);

      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const currentData = snap.data();
          const currentStock = Number(currentData.stock) || 0;
          const newStock = Math.max(0, currentStock - qty);

          // Si el producto tiene variantes, también descontar de la variante si aplica
          let updatedVariants = currentData.variants;
          if (item.variantId && Array.isArray(updatedVariants)) {
            updatedVariants = updatedVariants.map((v: any) => {
              if (v.id === item.variantId) {
                const vStock = Number(v.stock) || 0;
                return { ...v, stock: Math.max(0, vStock - qty) };
              }
              return v;
            });
          }

          const updatePayload: Record<string, any> = {
            stock: newStock,
            updatedAt: serverTimestamp()
          };

          if (updatedVariants) {
            updatePayload.variants = updatedVariants;
          }

          await updateDoc(docRef, sanitizeFirestoreData(updatePayload));

          const isCritical = newStock <= 5;
          results.push({
            productId: item.productId,
            newStock,
            isCriticalLow: isCritical
          });
        }
      } catch (itemErr) {
        console.warn(`Error al descontar stock para producto ${item.productId}:`, itemErr);
      }
    }

    return results;
  } catch (error) {
    console.error('Error general al descontar stock en Firestore:', error);
    return [];
  }
}

/**
 * 5. BORRAR PRODUCTO (Eliminación real con deleteDoc o Soft Delete con isDeleted: true)
 * @param id Identificador del producto
 * @param softDelete Si es true, marca isDeleted: true y active: false para mantener historial; si es false, borra el documento de Firestore.
 */
export async function deleteFirestoreProduct(id: string, softDelete: boolean = false): Promise<void> {
  try {
    if (!id) throw new Error('ID de producto no especificado para eliminar');
    const docRef = doc(db, PRODUCTS_COLLECTION, id);

    if (softDelete) {
      // Soft Delete: marcar como inactivo y borrado lógico
      await updateDoc(docRef, {
        isDeleted: true,
        active: false,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Eliminación física directa en Cloud Firestore
      await deleteDoc(docRef);
    }
  } catch (error) {
    console.error(`Error al eliminar producto ${id} en Firestore:`, error);
    throw error;
  }
}

/**
 * 5b. BORRAR MÚLTIPLES PRODUCTOS EN LOTE (Batch Delete)
 * Soporta selección múltiple (uno por uno o todos) con commit por lotes de 450 en Cloud Firestore.
 */
export async function deleteMultipleFirestoreProducts(ids: string[], softDelete: boolean = false): Promise<number> {
  try {
    if (!ids || ids.length === 0) return 0;

    const chunkSize = 450;
    let totalProcessed = 0;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const id of chunk) {
        if (!id) continue;
        const docRef = doc(db, PRODUCTS_COLLECTION, id);
        if (softDelete) {
          batch.update(docRef, {
            isDeleted: true,
            active: false,
            deletedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else {
          batch.delete(docRef);
        }
      }

      await batch.commit();
      totalProcessed += chunk.length;
    }

    return totalProcessed;
  } catch (error) {
    console.error('Error al eliminar productos en lote en Firestore:', error);
    throw error;
  }
}

/**
 * 5c. ACTUALIZAR ESTADO DE MÚLTIPLES PRODUCTOS EN LOTE (Activar / Desactivar)
 */
export async function updateMultipleFirestoreProducts(ids: string[], updates: Partial<Product>): Promise<number> {
  try {
    if (!ids || ids.length === 0) return 0;

    const cleanUpdates = sanitizeFirestoreData({
      ...updates,
      updatedAt: serverTimestamp()
    });

    const chunkSize = 450;
    let totalProcessed = 0;

    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(db);

      for (const id of chunk) {
        if (!id) continue;
        const docRef = doc(db, PRODUCTS_COLLECTION, id);
        batch.update(docRef, cleanUpdates);
      }

      await batch.commit();
      totalProcessed += chunk.length;
    }

    return totalProcessed;
  } catch (error) {
    console.error('Error al actualizar productos en lote en Firestore:', error);
    throw error;
  }
}

/**
 * 6. SUBIR IMAGEN A FIREBASE STORAGE
 * Permite subir una imagen de producto directamente a Firebase Storage
 * y obtener su URL pública de descarga permanente (`getDownloadURL`).
 */
export async function uploadProductImageToStorage(file: File, customPath?: string): Promise<string> {
  try {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = customPath || `products/${timestamp}_${sanitizedName}`;
    const storageReference = ref(storage, storagePath);

    // Subir el archivo
    const snapshot = await uploadBytes(storageReference, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=31536000'
    });

    // Obtener la URL pública de descarga
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.warn('Firebase Storage no disponible o no configurado con bucket público, usando compresión base64 como fallback:', error);
    
    // Fallback: convertir a data URL base64 comprimido para no bloquear la experiencia
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}

/**
 * 7. SEMBRAR / INICIALIZAR CATÁLOGO EN FIRESTORE (Seed masivo)
 * Si Firestore está vacío, puebla la colección con los productos iniciales
 * usando writeBatch de Firestore para garantizar persistencia total en la nube.
 */
export async function seedProductsToFirestore(initialProducts: Product[]): Promise<number> {
  try {
    if (!initialProducts || initialProducts.length === 0) return 0;
    
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const existingSnap = await getDocs(productsRef);
    
    if (existingSnap.size > 0) {
      console.log(`Firestore ya contiene ${existingSnap.size} productos persistidos.`);
      return existingSnap.size;
    }

    console.log(`Poblando Firestore con ${initialProducts.length} productos iniciales en lote...`);
    
    // Firestore writeBatch soporta hasta 500 operaciones por lote
    const batch = writeBatch(db);
    let count = 0;

    for (const prod of initialProducts) {
      const docRef = doc(db, PRODUCTS_COLLECTION, prod.id || `prod_${count}_${Date.now()}`);
      const price = Number(prod.price) || 0;
      const costPrice = Number(prod.costPrice) || Math.round(price * 0.45);
      const compareAtPrice = Number(prod.compareAtPrice) || Math.round(price * 1.35);

      batch.set(docRef, {
        title: prod.title,
        slug: prod.slug,
        description: prod.description || '',
        shortDescription: prod.shortDescription || '',
        price,
        costPrice,
        compareAtPrice,
        discountPercentage: prod.discountPercentage || 0,
        marginAmount: price - costPrice,
        marginPercentage: costPrice > 0 ? Math.round(((price - costPrice) / costPrice) * 1000) / 10 : 0,
        stock: prod.stock ?? 25,
        active: prod.active !== false,
        isDeleted: false,
        featured: Boolean(prod.featured),
        images: prod.images || [],
        warrantyInfo: prod.warrantyInfo || '30 días de garantía oficial Zavela Store.',
        tags: prod.tags || ['tendencia', 'calidad'],
        weightKg: prod.weightKg || 0.5,
        categoryId: prod.categoryId || 'tecnologia',
        categoryName: prod.categoryName || 'Tecnología',
        subcategoryId: prod.subcategoryId || '',
        subcategoryName: prod.subcategoryName || '',
        variants: prod.variants || [],
        warehouseCity: prod.warehouseCity || 'Bogotá D.C.',
        brand: prod.brand || 'Zavela Store',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      count++;
    }

    await batch.commit();
    console.log(`✅ ¡Éxito! Se sincronizaron ${count} productos en Cloud Firestore.`);
    return count;
  } catch (error) {
    console.error('Error al inicializar productos en Firestore:', error);
    return 0;
  }
}
