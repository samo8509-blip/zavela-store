/**
 * Description Parser for Zavela Store
 * Extracts 3-4 clean visual bullet highlights from raw/dense product descriptions,
 * stripping HTML and dense noise, while keeping the full text for <details> / <summary> accordions.
 */

export interface ParsedDescription {
  leadSentence: string;
  keyBullets: string[];
  fullCleanDescription: string;
}

export function parseProductDescription(
  rawDescription?: string,
  productTitle?: string,
  categoryName?: string
): ParsedDescription {
  if (!rawDescription || !rawDescription.trim()) {
    return {
      leadSentence: 'Producto de alta calidad seleccionado para Zavela Store Colombia con despacho prioritario.',
      keyBullets: [
        'Pago seguro contra entrega: cancelas en efectivo al cartero al recibir en tu puerta.',
        'Despacho express asegurado a nivel nacional desde bodegas colombianas.',
        'Inspección y control de calidad 1:1 antes de salir a reparto.',
        'Garantía directa de 30 días y soporte personalizado por WhatsApp.'
      ],
      fullCleanDescription: 'Producto original con garantía oficial de Zavela Store. Embalaje protegido y despacho contra entrega en toda Colombia.'
    };
  }

  // 1. Remove HTML tags and normalize line breaks
  let cleaned = rawDescription
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  // 2. Extract potential bullets or points
  const rawLines = cleaned
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const candidateBullets: string[] = [];

  for (const line of rawLines) {
    // Check if line looks like a bullet or feature
    const cleanLine = line
      .replace(/^[\*\-\•\✔\✅\–\—\>]\s*/, '')
      .replace(/^\d+[\.\)\-]\s*/, '')
      .trim();

    if (cleanLine.length >= 10 && cleanLine.length <= 160) {
      // Exclude generic low-value warnings/disclaimers
      const lower = cleanLine.toLowerCase();
      if (
        !lower.startsWith('color sujeto a') &&
        !lower.startsWith('fotos referenciales') &&
        !lower.startsWith('imágenes de referencia') &&
        !lower.startsWith('garantía por defecto') &&
        !lower.includes('política de devolución')
      ) {
        candidateBullets.push(cleanLine);
      }
    }
  }

  // If candidate bullets are still < 3, split by periods / sentences
  if (candidateBullets.length < 3) {
    const sentences = cleaned
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim().replace(/^[\*\-\•\✔\✅]\s*/, ''))
      .filter(s => s.length >= 15 && s.length <= 150);

    for (const s of sentences) {
      if (!candidateBullets.includes(s) && candidateBullets.length < 4) {
        candidateBullets.push(s);
      }
    }
  }

  // Select top 3 or 4 bullets
  let finalBullets = candidateBullets.slice(0, 4);

  // Fallbacks if description was very short or devoid of clear points
  const fallbackPoints = [
    'Materiales de alta durabilidad y diseño optimizado para máxima resistencia.',
    'Pago 100% contra entrega: revisas tu paquete y pagas en efectivo en casa.',
    'Envío rápido con seguimiento por transportadoras oficiales (Servientrega, Coordinadora, Envía, Interrapidísimo).',
    'Garantía directa de satisfacción con atención continua vía WhatsApp.'
  ];

  let fallbackIdx = 0;
  while (finalBullets.length < 3 && fallbackIdx < fallbackPoints.length) {
    finalBullets.push(fallbackPoints[fallbackIdx]);
    fallbackIdx++;
  }

  // Extract a brief lead sentence
  let leadSentence = '';
  const firstSentence = cleaned.split(/(?<=[.!?])\s+/)[0]?.trim();
  if (firstSentence && firstSentence.length >= 15 && firstSentence.length <= 140) {
    leadSentence = firstSentence;
  } else {
    leadSentence = `${productTitle || 'Este producto'} cuenta con respaldo oficial, garantía de 30 días y despacho contra entrega en toda Colombia.`;
  }

  return {
    leadSentence,
    keyBullets: finalBullets,
    fullCleanDescription: cleaned
  };
}
