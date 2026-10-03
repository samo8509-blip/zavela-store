import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  Share2,
  BookOpen,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Phone,
  ShoppingBag,
  CheckCircle,
  Truck,
  ShieldCheck,
  Star,
  Layers,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
  Check,
  RefreshCw
} from 'lucide-react';
import { Product } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import jsPDF from 'jspdf';

interface ProductCatalogMagazineModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
}

// In-memory cache for converted base64 images
const imageBase64Cache = new Map<string, string>();

/**
 * Loads an image reliably as JPEG base64 data URL.
 * Falls back to proxy or canvas placeholder so it NEVER fails.
 */
async function loadSafeImageBase64(url: string, title: string = 'Zavela Store'): Promise<string> {
  if (!url) return createPlaceholderImage(title);
  if (url.startsWith('data:image/')) return url;
  if (imageBase64Cache.has(url)) {
    return imageBase64Cache.get(url)!;
  }

  // 1. Try Backend Proxy first (guarantees CORS bypass)
  try {
    const proxyUrl = `/api/products/proxy-image?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      imageBase64Cache.set(url, base64);
      return base64;
    }
  } catch {
    // Continue to next method
  }

  // 2. Try Direct Image load with HTML Canvas
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timeout = setTimeout(() => {
        img.src = '';
        reject(new Error('Image timeout'));
      }, 4000);

      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = Math.min(img.naturalWidth || 500, 800);
          canvas.height = Math.min(img.naturalHeight || 500, 800);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl);
          } else {
            reject(new Error('Canvas error'));
          }
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image'));
      };
      img.src = url;
    });

    imageBase64Cache.set(url, base64);
    return base64;
  } catch {
    // 3. Fallback: Return nice canvas placeholder
    const placeholder = createPlaceholderImage(title);
    imageBase64Cache.set(url, placeholder);
    return placeholder;
  }
}

/**
 * Creates an elegant vector-styled canvas placeholder when an image fails to load.
 */
function createPlaceholderImage(title: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Dark luxury gradient
    const grad = ctx.createLinearGradient(0, 0, 400, 400);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 400, 400);

    // Gold frame
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 368, 368);

    // Text
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 22px serif';
    ctx.textAlign = 'center';
    ctx.fillText('ZAVELA STORE', 200, 160);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    const shortTitle = title.length > 25 ? title.substring(0, 25) + '...' : title;
    ctx.fillText(shortTitle, 200, 210);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px sans-serif';
    ctx.fillText('Colección Exclusiva 2026', 200, 245);

    return canvas.toDataURL('image/jpeg', 0.85);
  }
  return '';
}

export const ProductCatalogMagazineModal: React.FC<ProductCatalogMagazineModalProps> = ({
  isOpen,
  onClose,
  products
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [layoutMode, setLayoutMode] = useState<'4_per_page' | '2_per_page'>('4_per_page');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('3001234567');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [generatedPdfBlobUrl, setGeneratedPdfBlobUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(0);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (generatedPdfBlobUrl) {
        URL.revokeObjectURL(generatedPdfBlobUrl);
      }
    };
  }, [generatedPdfBlobUrl]);

  if (!isOpen) return null;

  const activeProducts = products.filter(p => (p.active ?? true) && p.images && p.images.length > 0);
  const filteredProducts = selectedCategory === 'all'
    ? activeProducts
    : activeProducts.filter(p => p.categoryId === selectedCategory);

  const itemsPerPage = layoutMode === '4_per_page' ? 4 : 2;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const pages = [];
  for (let i = 0; i < filteredProducts.length; i += itemsPerPage) {
    pages.push(filteredProducts.slice(i, i + itemsPerPage));
  }

  // Extract categories
  const categoriesMap = new Map<string, string>();
  activeProducts.forEach(p => {
    if (p.categoryId && p.categoryName) {
      categoriesMap.set(p.categoryId, p.categoryName);
    }
  });

  /**
   * Generates a 100% native vector PDF using jsPDF.
   * This is fast, does not crash on CSS or iframes, and produces clean high-res vector output!
   */
  const handleGenerateAndDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setErrorMessage(null);
    setPdfProgress('Iniciando generador editorial de alta resolución...');

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = 210;
      const pageHeight = 297;

      // ==========================================
      // PAGE 1: LUXURY MAGAZINE COVER (PORTADA)
      // ==========================================
      setPdfProgress('Diseñando portada de revista de lujo...');

      // Dark Luxury Navy/Slate Background
      pdf.setFillColor(15, 23, 42); // #0f172a
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top Gold Accent Bar
      pdf.setFillColor(245, 158, 11); // #f59e0b
      pdf.rect(0, 0, pageWidth, 4, 'F');

      // Header Tag
      pdf.setFillColor(30, 41, 59);
      pdf.roundedRect(pageWidth / 2 - 55, 16, 110, 8, 3, 3, 'F');
      pdf.setTextColor(245, 158, 11);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.text('REVISTA DIGITAL OFICIAL • COLECCIÓN 2026', pageWidth / 2, 21.5, { align: 'center' });

      // Title & Slogan
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('times', 'bold');
      pdf.setFontSize(32);
      pdf.text('ZAVELA STORE', pageWidth / 2, 38, { align: 'center' });

      pdf.setTextColor(244, 63, 94); // #f43f5e
      pdf.setFont('times', 'italic');
      pdf.setFontSize(11);
      pdf.text('MODA, BELLEZA Y VANGUARDIA EN COLOMBIA', pageWidth / 2, 45, { align: 'center' });

      // Gold Divider line
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.5);
      pdf.line(pageWidth / 2 - 25, 49, pageWidth / 2 + 25, 49);

      // Featured 4-Product Grid on Cover
      const coverItems = activeProducts.slice(0, 4);
      const gridStartY = 58;
      const cardW = 86;
      const cardH = 82;
      const marginX = 14;
      const gapX = 10;
      const gapY = 8;

      for (let i = 0; i < coverItems.length; i++) {
        const prod = coverItems[i];
        const col = i % 2;
        const row = Math.floor(i / 2);
        const cardX = marginX + col * (cardW + gapX);
        const cardY = gridStartY + row * (cardH + gapY);

        // Card Container
        pdf.setFillColor(30, 41, 59);
        pdf.setDrawColor(51, 65, 85);
        pdf.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'FD');

        // Product Image
        if (prod.images && prod.images[0]) {
          try {
            const base64 = await loadSafeImageBase64(prod.images[0], prod.title);
            if (base64) {
              pdf.addImage(base64, 'JPEG', cardX + 3, cardY + 3, cardW - 6, 52, undefined, 'FAST');
            }
          } catch {
            // Image fallback handled safely
          }
        }

        // Product Category Badge
        pdf.setFillColor(244, 63, 94);
        pdf.roundedRect(cardX + 4, cardY + 58, 30, 4.5, 1.5, 1.5, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6);
        pdf.text((prod.categoryName || 'Colección').toUpperCase().substring(0, 16), cardX + 19, cardY + 61, { align: 'center' });

        // Product Title
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        const splitTitle = pdf.splitTextToSize(prod.title, cardW - 8);
        pdf.text(splitTitle[0] || prod.title, cardX + 4, cardY + 68);

        // Price
        pdf.setTextColor(52, 211, 153); // #34d399
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.text(formatCOP(prod.price), cardX + 4, cardY + 77);

        // COD Badge
        pdf.setTextColor(148, 163, 184);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.text('Pago Contra Entrega', cardX + cardW - 4, cardY + 77, { align: 'right' });
      }

      // Guarantees Strip
      const bannerY = 240;
      pdf.setFillColor(2, 6, 23); // #020617
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(marginX, bannerY, pageWidth - marginX * 2, 34, 4, 4, 'FD');

      // 3 Benefits
      const colW = (pageWidth - marginX * 2) / 3;

      // 1. Pago Contra Entrega
      pdf.setTextColor(245, 158, 11);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('PAGO CONTRA ENTREGA', marginX + colW * 0.5, bannerY + 9, { align: 'center' });
      pdf.setTextColor(203, 213, 225);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.text('Pagas en efectivo al', marginX + colW * 0.5, bannerY + 16, { align: 'center' });
      pdf.text('recibir en tu puerta', marginX + colW * 0.5, bannerY + 21, { align: 'center' });
      pdf.text('en toda Colombia.', marginX + colW * 0.5, bannerY + 26, { align: 'center' });

      // 2. Garantía
      pdf.setTextColor(52, 211, 153);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('GARANTÍA 100%', marginX + colW * 1.5, bannerY + 9, { align: 'center' });
      pdf.setTextColor(203, 213, 225);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.text('Productos nuevos de', marginX + colW * 1.5, bannerY + 16, { align: 'center' });
      pdf.text('calidad garantizada', marginX + colW * 1.5, bannerY + 21, { align: 'center' });
      pdf.text('y soporte directo.', marginX + colW * 1.5, bannerY + 26, { align: 'center' });

      // 3. WhatsApp
      pdf.setTextColor(244, 63, 94);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8);
      pdf.text('PEDIDOS POR WHATSAPP', marginX + colW * 2.5, bannerY + 9, { align: 'center' });
      pdf.setTextColor(203, 213, 225);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6.5);
      pdf.text(`+57 ${whatsappNumber}`, marginX + colW * 2.5, bannerY + 16, { align: 'center' });
      pdf.text('Atención inmediata', marginX + colW * 2.5, bannerY + 21, { align: 'center' });
      pdf.text('todos los días.', marginX + colW * 2.5, bannerY + 26, { align: 'center' });

      // Cover Footer
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.5);
      pdf.text('www.zavelastore.co', marginX, 286);
      pdf.text('Edición Exclusiva 2026 • Envíos a toda Colombia', pageWidth / 2, 286, { align: 'center' });
      pdf.text('Pág. 1', pageWidth - marginX, 286, { align: 'right' });

      // ==========================================
      // PAGES 2...N: PRODUCT CATALOG PAGES
      // ==========================================
      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        setPdfProgress(`Generando página de productos ${pIdx + 2} de ${pages.length + 1}...`);
        pdf.addPage('a4', 'portrait');

        const currentGroup = pages[pIdx];

        // Page Header
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Header Strip
        pdf.setFillColor(15, 23, 42); // #0f172a
        pdf.rect(0, 0, pageWidth, 20, 'F');

        pdf.setFillColor(244, 63, 94); // #f43f5e
        pdf.rect(0, 19, pageWidth, 1.5, 'F');

        pdf.setTextColor(245, 158, 11);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('ZAVELA STORE • CATÁLOGO EDITORIAL', 14, 11);

        pdf.setTextColor(255, 255, 255);
        pdf.setFont('times', 'bold');
        pdf.setFontSize(12);
        const catHeaderTitle = selectedCategory === 'all'
          ? (currentGroup[0]?.categoryName ? `COLECCIÓN • ${currentGroup[0].categoryName.toUpperCase()}` : 'CATÁLOGO DE PRODUCTOS')
          : (currentGroup[0]?.categoryName || 'CATÁLOGO').toUpperCase();
        pdf.text(catHeaderTitle, 14, 16.5);

        // Page counter pill
        pdf.setFillColor(30, 41, 59);
        pdf.roundedRect(pageWidth - 40, 6, 26, 7, 2, 2, 'F');
        pdf.setTextColor(245, 158, 11);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.text(`Pág. ${pIdx + 2} de ${pages.length + 1}`, pageWidth - 27, 10.8, { align: 'center' });

        // Content Layout: 4 products (2x2) or 2 products (1x2)
        if (layoutMode === '4_per_page') {
          const itemW = 88;
          const itemH = 118;
          const startY = 26;
          const posX = 12;
          const gapGridX = 10;
          const gapGridY = 8;

          for (let i = 0; i < currentGroup.length; i++) {
            const prod = currentGroup[i];
            const col = i % 2;
            const row = Math.floor(i / 2);
            const boxX = posX + col * (itemW + gapGridX);
            const boxY = startY + row * (itemH + gapGridY);

            const regularPrice = Math.round(prod.price * 1.35);
            const discountPct = Math.round(((regularPrice - prod.price) / regularPrice) * 100);

            // Card background & border
            pdf.setFillColor(248, 250, 252); // #f8fafc
            pdf.setDrawColor(226, 232, 240); // #e2e8f0
            pdf.setLineWidth(0.4);
            pdf.roundedRect(boxX, boxY, itemW, itemH, 4, 4, 'FD');

            // Product Image (High quality)
            if (prod.images && prod.images[0]) {
              try {
                const base64 = await loadSafeImageBase64(prod.images[0], prod.title);
                if (base64) {
                  pdf.addImage(base64, 'JPEG', boxX + 4, boxY + 4, itemW - 8, 62, undefined, 'FAST');
                }
              } catch {
                // Fallback handled
              }
            }

            // Discount Badge
            pdf.setFillColor(225, 29, 72); // #e11d48
            pdf.roundedRect(boxX + 5, boxY + 6, 24, 5.5, 1.5, 1.5, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6.5);
            pdf.text(`-${discountPct}% OFERTA`, boxX + 17, boxY + 9.8, { align: 'center' });

            // Category & Ref Tag
            pdf.setTextColor(100, 116, 139);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(6.5);
            pdf.text(`Ref: ${prod.sku || `ZV-${prod.id.slice(0, 6).toUpperCase()}`}`, boxX + 4, boxY + 71);

            pdf.setTextColor(16, 185, 129); // #10b981
            pdf.text('En Stock', boxX + itemW - 4, boxY + 71, { align: 'right' });

            // Title
            pdf.setTextColor(15, 23, 42);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9.5);
            const titleLines = pdf.splitTextToSize(prod.title, itemW - 8);
            pdf.text(titleLines.slice(0, 2), boxX + 4, boxY + 77);

            // Description Snippet
            if (prod.description) {
              pdf.setTextColor(71, 85, 105);
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(6.8);
              const cleanDesc = prod.description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ');
              const descLines = pdf.splitTextToSize(cleanDesc, itemW - 8);
              pdf.text(descLines.slice(0, 2), boxX + 4, boxY + 88);
            }

            // Bottom Price Bar
            pdf.setFillColor(241, 245, 249);
            pdf.roundedRect(boxX + 4, boxY + 98, itemW - 8, 15, 2.5, 2.5, 'F');

            // Regular price
            pdf.setTextColor(148, 163, 184);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(6.5);
            pdf.text(`Antes: ${formatCOP(regularPrice)}`, boxX + 7, boxY + 104);

            // Offer Price
            pdf.setTextColor(190, 18, 60); // #be123c
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.text(formatCOP(prod.price), boxX + 7, boxY + 110.5);

            // Contra Entrega Tag
            pdf.setFillColor(15, 23, 42);
            pdf.roundedRect(boxX + itemW - 32, boxY + 101, 25, 8, 1.5, 1.5, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(5.5);
            pdf.text('PAGO AL RECIBIR', boxX + itemW - 19.5, boxY + 105.8, { align: 'center' });
          }
        } else {
          // 2 Products per page (Large Editorial Mode)
          const itemW = 186;
          const itemH = 118;
          const startY = 28;
          const posX = 12;
          const gapGridY = 12;

          for (let i = 0; i < currentGroup.length; i++) {
            const prod = currentGroup[i];
            const boxX = posX;
            const boxY = startY + i * (itemH + gapGridY);

            const regularPrice = Math.round(prod.price * 1.35);
            const discountPct = Math.round(((regularPrice - prod.price) / regularPrice) * 100);

            // Card background & border
            pdf.setFillColor(248, 250, 252);
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.4);
            pdf.roundedRect(boxX, boxY, itemW, itemH, 4, 4, 'FD');

            // Product Image (Large Left side)
            if (prod.images && prod.images[0]) {
              try {
                const base64 = await loadSafeImageBase64(prod.images[0], prod.title);
                if (base64) {
                  pdf.addImage(base64, 'JPEG', boxX + 6, boxY + 6, 96, 106, undefined, 'FAST');
                }
              } catch {
                // Fallback handled
              }
            }

            // Right side details
            const rightX = boxX + 108;
            const rightW = itemW - 114;

            // Discount Badge
            pdf.setFillColor(225, 29, 72);
            pdf.roundedRect(rightX, boxY + 8, 26, 6, 1.5, 1.5, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.text(`-${discountPct}% OFERTA`, rightX + 13, boxY + 12, { align: 'center' });

            // Category & Ref Tag
            pdf.setTextColor(100, 116, 139);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            pdf.text(`Ref: ${prod.sku || `ZV-${prod.id.slice(0, 6).toUpperCase()}`}`, rightX, boxY + 21);

            // Title
            pdf.setTextColor(15, 23, 42);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(13);
            const titleLines = pdf.splitTextToSize(prod.title, rightW);
            pdf.text(titleLines.slice(0, 2), rightX, boxY + 30);

            // Description
            if (prod.description) {
              pdf.setTextColor(71, 85, 105);
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(8.5);
              const cleanDesc = prod.description.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ');
              const descLines = pdf.splitTextToSize(cleanDesc, rightW);
              pdf.text(descLines.slice(0, 4), rightX, boxY + 45);
            }

            // Price Box
            pdf.setFillColor(241, 245, 249);
            pdf.roundedRect(rightX, boxY + 84, rightW, 26, 3, 3, 'F');

            pdf.setTextColor(148, 163, 184);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.text(`Precio Regular: ${formatCOP(regularPrice)}`, rightX + 6, boxY + 92);

            pdf.setTextColor(190, 18, 60);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text(formatCOP(prod.price), rightX + 6, boxY + 102);

            pdf.setTextColor(15, 23, 42);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7.5);
            pdf.text('✓ Pago Contra Entrega en Colombia', rightX + 6, boxY + 107.5);
          }
        }

        // Page Footer
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(14, 282, pageWidth - 14, 282);

        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        pdf.text(`Pedidos WhatsApp: +57 ${whatsappNumber} • www.zavelastore.co`, 14, 288);
        pdf.text('Envíos Nacionales con Servientrega, Coordinadora, Interrapidísimo', pageWidth / 2, 288, { align: 'center' });
        pdf.text(`Página ${pIdx + 2}`, pageWidth - 14, 288, { align: 'right' });
      }

      setPdfProgress('Guardando y descargando archivo PDF...');

      const filename = `Revista_Catalogo_ZavelaStore_2026.pdf`;
      const pdfBlob = pdf.output('blob');
      const blobUrl = URL.createObjectURL(pdfBlob);
      setGeneratedPdfBlobUrl(blobUrl);

      // Trigger automatic download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        try {
          document.body.removeChild(a);
        } catch {}
      }, 3000);

      try {
        pdf.save(filename);
      } catch {}

      setPdfProgress('');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      setErrorMessage(`Error al generar el PDF: ${err.message || 'Intenta nuevamente'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  /**
   * Opens a clean printable pop-out window with HTML styling.
   * This bypasses iframe sandbox print restrictions completely!
   */
  const handlePrintablePopout = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback: generate and download PDF directly
      handleGenerateAndDownloadPdf();
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Revista Catálogo Zavela Store 2026</title>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Plus Jakarta Sans', sans-serif; background: #f8fafc; color: #0f172a; }
          .page {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm;
            margin: 10mm auto;
            background: #ffffff;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            page-break-after: always;
            break-after: page;
            position: relative;
          }
          .cover {
            background: #0f172a;
            color: #ffffff;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .cover h1 { font-family: 'Playfair Display', serif; font-size: 38px; color: #ffffff; text-align: center; }
          .cover .slogan { color: #f43f5e; text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-top: 4px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 20px; }
          .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; color: #0f172a; display: flex; flex-direction: column; justify-content: space-between; }
          .card img { width: 100%; height: 160px; object-fit: cover; border-radius: 8px; margin-bottom: 8px; }
          .card h3 { font-size: 13px; font-weight: 800; line-height: 1.3; }
          .card .price { font-size: 16px; font-weight: 900; color: #be123c; margin-top: 6px; }
          .badge { background: #e11d48; color: #fff; font-size: 10px; font-weight: 800; padding: 2px 8px; border-radius: 999px; display: inline-block; }
          .footer { font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 20px; display: flex; justify-content: space-between; }
          @media print {
            body { background: transparent; }
            .page { margin: 0; box-shadow: none; width: 100%; min-height: 100vh; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="padding: 16px; background: #0f172a; color: #fff; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 24px; background: #f43f5e; color: #fff; font-weight: bold; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">
            🖨️ IMPRIMIR / GUARDAR COMO PDF
          </button>
        </div>

        <!-- Portada -->
        <div class="page cover">
          <div style="text-align: center;">
            <div style="background: #1e293b; color: #f59e0b; padding: 6px 16px; border-radius: 999px; display: inline-block; font-size: 11px; font-weight: bold;">
              REVISTA CATÁLOGO 2026 • ZAVELA STORE
            </div>
            <h1 style="margin-top: 16px;">ZAVELA STORE</h1>
            <div class="slogan">Moda, Belleza y Vanguardia en Colombia</div>
          </div>

          <div class="grid">
            ${activeProducts.slice(0, 4).map(p => `
              <div class="card" style="background: #1e293b; color: #ffffff; border-color: #334155;">
                <img src="${p.images[0]}" />
                <div>
                  <span class="badge" style="background: #f43f5e;">${(p.categoryName || 'Colección').toUpperCase()}</span>
                  <h3 style="color: #fff; margin-top: 4px;">${p.title}</h3>
                </div>
                <div class="price" style="color: #34d399;">${formatCOP(p.price)}</div>
              </div>
            `).join('')}
          </div>

          <div style="background: #020617; border: 1px solid #f59e0b; padding: 14px; border-radius: 12px; text-align: center;">
            <div style="color: #f59e0b; font-weight: bold; font-size: 12px;">PAGO CONTRA ENTREGA EN TODA COLOMBIA</div>
            <div style="font-size: 11px; color: #cbd5e1; margin-top: 4px;">Pedidos por WhatsApp: +57 ${whatsappNumber} • www.zavelastore.co</div>
          </div>
        </div>

        <!-- Páginas de productos -->
        ${pages.map((group, idx) => `
          <div class="page">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 8px;">
              <div>
                <div style="font-size: 10px; font-weight: 800; color: #f43f5e; text-transform: uppercase;">Zavela Store • Catálogo 2026</div>
                <h2 style="font-size: 18px; font-weight: 900;">${selectedCategory === 'all' ? 'Colección de Temporada' : (group[0]?.categoryName || 'Catálogo')}</h2>
              </div>
              <div style="font-weight: bold; font-size: 12px; color: #64748b;">Pág. ${idx + 2} de ${pages.length + 1}</div>
            </div>

            <div class="grid">
              ${group.map(p => `
                <div class="card">
                  <div style="position: relative;">
                    <img src="${p.images[0]}" />
                    <span class="badge" style="position: absolute; top: 8px; left: 8px;">OFERTA</span>
                  </div>
                  <div>
                    <div style="font-size: 10px; color: #64748b; font-weight: bold;">Ref: ${p.sku || `ZV-${p.id.slice(0, 6).toUpperCase()}`}</div>
                    <h3 style="margin-top: 4px;">${p.title}</h3>
                  </div>
                  <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                    <div class="price">${formatCOP(p.price)}</div>
                    <div style="font-size: 9px; font-weight: bold; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px;">Contra Entrega</div>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="footer">
              <div>Pedidos WhatsApp: +57 ${whatsappNumber}</div>
              <div>www.zavelastore.co</div>
              <div>Pág. ${idx + 2}</div>
            </div>
          </div>
        `).join('')}

      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🛍️ *¡Hola! Te comparto el Catálogo Oficial 2026 de Zavela Store* ✨\n\n` +
      `👗 Descubre nuestras últimas colecciones de moda, belleza y novedades con *PAGO CONTRA ENTREGA* en toda Colombia 🇨🇴.\n\n` +
      `📲 Pide tus productos favoritos respondiendo a este mensaje. ¡Envíos 100% garantizados!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      
      <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-150">
        
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-950 to-amber-950 text-white p-4 sm:p-5 flex items-center justify-between gap-4 shrink-0 border-b border-rose-900/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-rose-500/20">
              <BookOpen className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-mono text-[10px] font-black uppercase tracking-wider border border-amber-400/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                  <span>Revista Digital Tipo Yanbal / Ésika</span>
                </span>
                <span className="text-[11px] text-rose-200/80 font-serif italic">Lookbook Colección 2026</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight font-serif">
                Catálogo Editorial de Productos Zavela Store
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          
          {/* Filters & Layout Selector */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 shadow-xs">
              <Filter className="w-3.5 h-3.5 text-rose-600" />
              <span className="font-bold text-slate-600">Categoría:</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setGeneratedPdfBlobUrl(null);
                }}
                className="bg-transparent font-bold text-slate-800 outline-hidden cursor-pointer"
              >
                <option value="all">Todas ({activeProducts.length} productos)</option>
                {Array.from(categoriesMap.entries()).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name} ({activeProducts.filter(p => p.categoryId === id).length})
                  </option>
                ))}
              </select>
            </div>

            {/* Layout Mode */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setLayoutMode('4_per_page');
                  setGeneratedPdfBlobUrl(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  layoutMode === '4_per_page'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                4 por página (Catálogo)
              </button>
              <button
                type="button"
                onClick={() => {
                  setLayoutMode('2_per_page');
                  setGeneratedPdfBlobUrl(null);
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  layoutMode === '2_per_page'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                2 por página (Editorial Grande)
              </button>
            </div>

          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2">
            
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors shadow-xs cursor-pointer"
              title="Compartir enlace de catálogo por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handlePrintablePopout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold transition-colors shadow-xs cursor-pointer"
              title="Abrir vista de impresión y guardar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / PDF</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateAndDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black transition-all shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generando PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Descargar Revista PDF</span>
                </>
              )}
            </button>

          </div>

        </div>

        {/* Progress Alert if generating */}
        {pdfProgress && (
          <div className="p-3 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs flex items-center justify-center gap-2 font-bold animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            <span>{pdfProgress}</span>
          </div>
        )}

        {/* Success / Ready Banner if PDF is created */}
        {generatedPdfBlobUrl && !isGeneratingPdf && (
          <div className="p-3.5 bg-emerald-50 border-b border-emerald-200 text-emerald-950 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-black text-emerald-900">¡Tu Revista PDF fue generada con éxito!</span>
                <p className="text-[11px] text-emerald-800">Puedes descargar el archivo directamente o abrirlo en una nueva pestaña:</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={generatedPdfBlobUrl}
                download="Revista_Catalogo_ZavelaStore_2026.pdf"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar PDF</span>
              </a>

              <a
                href={generatedPdfBlobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en Pestaña Nueva</span>
              </a>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs flex items-center justify-between gap-2 font-bold">
            <span>{errorMessage}</span>
            <button
              onClick={handlePrintablePopout}
              className="px-3 py-1 bg-rose-700 text-white rounded-lg hover:bg-rose-800 text-[11px]"
            >
              Abrir Vista Imprimible
            </button>
          </div>
        )}

        {/* Magazine Visual Interactive Preview */}
        <div className="p-4 sm:p-8 bg-slate-100 overflow-y-auto grow flex flex-col items-center">
          
          <div className="w-full max-w-[794px] space-y-8">
            
            {/* PORTADA DE REVISTA / COVER PAGE (Página 0) */}
            <div className="bg-slate-900 text-white shadow-xl rounded-2xl overflow-hidden border border-slate-800 min-h-[900px] flex flex-col justify-between relative p-6 sm:p-12">
              
              <div className="text-center space-y-3 pt-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800 text-amber-300 font-mono text-xs font-black tracking-widest uppercase border border-amber-400/30">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>CATÁLOGO OFICIAL • EDICIÓN EXCLUSIVA 2026</span>
                </div>
                
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight font-serif text-white pt-2">
                  ZAVELA STORE
                </h1>
                <p className="text-sm sm:text-base font-serif italic text-rose-400 tracking-widest uppercase font-bold">
                  Moda, Belleza y Vanguardia en Colombia
                </p>
                <div className="w-24 h-0.5 bg-gradient-to-r from-amber-400 via-rose-500 to-amber-400 mx-auto" />
              </div>

              {/* Cover Grid */}
              <div className="grid grid-cols-2 gap-4 my-6">
                {activeProducts.slice(0, 4).map((p, idx) => (
                  <div key={idx} className="relative rounded-2xl overflow-hidden shadow-md aspect-4/3 bg-slate-800 group border border-slate-700">
                    <img
                      src={p.images[0]}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex flex-col justify-end p-3 text-white">
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">{p.categoryName || 'Colección'}</span>
                      <span className="text-xs font-black truncate">{p.title}</span>
                      <span className="text-sm font-black font-mono text-emerald-400">{formatCOP(p.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cover Guarantees */}
              <div className="bg-slate-950/80 text-white p-5 rounded-2xl shadow-xl space-y-4 border border-amber-400/30">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="space-y-1">
                    <Truck className="w-5 h-5 text-amber-400 mx-auto" />
                    <div className="text-xs font-black uppercase text-amber-300">Pago Contra Entrega</div>
                    <p className="text-[10px] text-slate-300">Pagas en efectivo al recibir tu pedido en tu casa.</p>
                  </div>
                  <div className="space-y-1">
                    <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto" />
                    <div className="text-xs font-black uppercase text-emerald-300">Garantía 100%</div>
                    <p className="text-[10px] text-slate-300">Productos verificados y de la más alta calidad.</p>
                  </div>
                  <div className="space-y-1">
                    <Phone className="w-5 h-5 text-rose-400 mx-auto" />
                    <div className="text-xs font-black uppercase text-rose-300">Asesoría WhatsApp</div>
                    <p className="text-[10px] text-slate-300">+57 {whatsappNumber}</p>
                  </div>
                </div>
              </div>

              {/* Cover Footer */}
              <div className="pt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800">
                <span className="font-serif italic">www.zavelastore.co</span>
                <span className="font-bold">Colombia • Envíos Nacionales</span>
                <span className="font-mono font-bold">Pág. 1</span>
              </div>

            </div>

            {/* PÁGINAS DE CONTENIDO EDITORIAL DE PRODUCTOS */}
            {pages.map((pageGroup, pageIndex) => (
              <div
                key={pageIndex}
                className="bg-white shadow-xl rounded-2xl overflow-hidden border border-slate-200 min-h-[900px] flex flex-col justify-between p-6 sm:p-10 relative text-slate-900"
              >
                
                {/* Page Header */}
                <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 mb-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 font-mono">
                      ZAVELA STORE • REVISTA DE TENDENCIAS
                    </span>
                    <h2 className="text-xl font-black font-serif text-slate-950">
                      {selectedCategory === 'all' ? 'Colección de Temporada' : (pageGroup[0]?.categoryName || 'Catálogo')}
                    </h2>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-amber-400/20 text-amber-900 border border-amber-400/40 rounded-full text-[10px] font-black uppercase font-mono">
                      Página {pageIndex + 2} de {totalPages + 1}
                    </span>
                  </div>
                </div>

                {/* Products Grid for this page */}
                <div className={`grow grid ${layoutMode === '4_per_page' ? 'grid-cols-1 sm:grid-cols-2 gap-6' : 'grid-cols-1 gap-8'}`}>
                  {pageGroup.map((prod) => {
                    const regularPrice = Math.round(prod.price * 1.35);
                    const discount = Math.round(((regularPrice - prod.price) / regularPrice) * 100);

                    return (
                      <div
                        key={prod.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow relative"
                      >
                        {/* Discount Ribbon */}
                        <div className="absolute top-6 left-6 z-10 bg-gradient-to-r from-rose-600 to-rose-700 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md uppercase tracking-wider">
                          -{discount}% OFERTA
                        </div>

                        {/* Image Container */}
                        <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-slate-50 mb-3 border border-slate-100">
                          <img
                            src={prod.images[0]}
                            alt={prod.title}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Product Information */}
                        <div className="space-y-2 grow flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono font-bold">
                              <span>Ref: {prod.sku || `ZV-${prod.id.slice(0, 6).toUpperCase()}`}</span>
                              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold">
                                {prod.stock > 0 ? `${prod.stock} disponibles` : 'Disponible'}
                              </span>
                            </div>

                            <h3 className="text-base font-black text-slate-900 font-serif line-clamp-1 pt-1">
                              {prod.title}
                            </h3>

                            {prod.description && (
                              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-0.5">
                                {prod.description.replace(/<[^>]*>?/gm, '')}
                              </p>
                            )}
                          </div>

                          {/* Price Box */}
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 p-2.5 rounded-xl">
                            <div>
                              <div className="text-[10px] text-slate-400 line-through font-bold">
                                Precio Regular: {formatCOP(regularPrice)}
                              </div>
                              <div className="text-lg font-black text-rose-700 font-mono">
                                {formatCOP(prod.price)}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-800 bg-white border border-slate-200 px-2 py-1 rounded-lg shadow-2xs">
                                <Truck className="w-3 h-3 text-cyan-600" />
                                <span>Contra Entrega</span>
                              </span>
                            </div>
                          </div>

                        </div>

                      </div>
                    );
                  })}
                </div>

                {/* Page Footer */}
                <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 mt-6">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold text-slate-700">Pedidos WhatsApp: +57 {whatsappNumber}</span>
                  </div>
                  <div className="font-serif italic">
                    Zavela Store • Catálogo Yanbal/Ésika Style
                  </div>
                  <div className="font-mono font-bold">
                    Pág. {pageIndex + 2}
                  </div>
                </div>

              </div>
            ))}

          </div>

        </div>

        {/* Bottom Navigation & Close */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 shrink-0">
          <div className="text-xs text-slate-600 font-medium">
            Mostrando <strong>{filteredProducts.length}</strong> productos en <strong>{totalPages + 1}</strong> páginas de revista.
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleGenerateAndDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-rose-600/20 cursor-pointer disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Procesando Revista...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF Oficial</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
