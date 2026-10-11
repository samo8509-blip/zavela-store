/**
 * Utility for client-side image compression and conversion
 * Converts uploaded files (JPG, PNG, WebP, SVG, GIF) into optimized web-friendly DataURLs
 */
export const compressImageFile = async (
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.85
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No se proporcionó ningún archivo.'));
    }

    if (!file.type || !file.type.startsWith('image/')) {
      // If unrecognized type, read directly
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsDataURL(file);
      return;
    }

    // Keep SVGs and GIFs as raw to preserve transparency and animation
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Error al leer el archivo.'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawResult = e.target?.result as string;
      if (!rawResult) {
        return resolve('');
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width || 800;
          let height = img.height || 800;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            return resolve(rawResult);
          }

          // For PNGs with potential alpha, use PNG or WebP, or preserve transparency
          const isPng = file.type === 'image/png';
          if (!isPng) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
          }

          ctx.drawImage(img, 0, 0, width, height);

          const outputFormat = isPng ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(outputFormat, quality);
          resolve(dataUrl);
        } catch {
          resolve(rawResult);
        }
      };

      img.onerror = () => {
        resolve(rawResult);
      };

      img.src = rawResult;
    };

    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsDataURL(file);
  });
};

/**
 * Extract clean, normalized array of image URLs from any product representation
 * (handling product.images, product.imagenes, JSON strings, single image fields, variants)
 */
export const extractProductImages = (product: any): string[] => {
  if (!product) {
    return ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];
  }

  const rawCandidates: any[] = [];

  const addCandidate = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(v => addCandidate(v));
      return;
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            parsed.forEach(p => addCandidate(p));
            return;
          }
        } catch {}
      }
      if (trimmed.includes(',') && !trimmed.startsWith('data:image/')) {
        trimmed.split(',').forEach(part => addCandidate(part));
        return;
      }
      rawCandidates.push(trimmed);
    }
  };

  // 1. Check images
  addCandidate(product.images);

  // 2. Check imagenes
  addCandidate(product.imagenes);

  // 3. Check single image fields
  addCandidate(product.image);
  addCandidate(product.imagen);
  addCandidate(product.photo);
  addCandidate(product.foto);

  // 4. Check variants images
  if (Array.isArray(product.variants)) {
    product.variants.forEach((v: any) => {
      if (v) {
        addCandidate(v.image);
        addCandidate(v.imagen);
        addCandidate(v.foto);
        addCandidate(v.photo);
      }
    });
  }

  // Deduplicate and filter valid image links
  const validImages: string[] = [];
  const seen = new Set<string>();

  for (const item of rawCandidates) {
    if (typeof item === 'string') {
      let cleanUrl = item.trim();
      if ((cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) || (cleanUrl.startsWith("'") && cleanUrl.endsWith("'"))) {
        cleanUrl = cleanUrl.slice(1, -1).trim();
      }
      if (!cleanUrl) continue;

      const isHttp = cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://');
      const isDataUri = cleanUrl.startsWith('data:image/');
      const isRelative = cleanUrl.startsWith('/') && (
        cleanUrl.includes('.jpg') || cleanUrl.includes('.jpeg') || cleanUrl.includes('.png') || cleanUrl.includes('.webp') || cleanUrl.includes('.svg')
      );

      if ((isHttp || isDataUri || isRelative) && !seen.has(cleanUrl)) {
        seen.add(cleanUrl);
        validImages.push(cleanUrl);
      }
    }
  }

  if (validImages.length > 0) {
    return validImages;
  }

  return ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];
};

