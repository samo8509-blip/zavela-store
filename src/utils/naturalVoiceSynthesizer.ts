/**
 * Natural Voice Synthesizer & Speech Modulator for ZAVELA STORE Colombia
 * 
 * Strict Neural Female Voice Priority:
 * 1. Google español (Chrome high-quality neural female voice)
 * 2. Microsoft Sabina Online (Natural), Microsoft Dalia, Microsoft Elena Natural, Microsoft Salomé
 * 3. Paulina, Monica, Soledad, or any voice tagged 'Neural', 'Natural', or 'Online' with 'es-*'
 * 4. Explicitly excludes male voices (Pablo, Raul, Jorge, etc.) and legacy offline generic engines.
 * 
 * Calibrated Acoustic Parameters:
 * - rate: 0.93 (deliberate, warm, elegant executive cadence)
 * - pitch: 1.08 (natural, warm feminine tone without artificial highs)
 * - volume: 1.0
 * 
 * Rhythm & Cadence:
 * - Strategic punctuation micro-pauses (commas, breath points) for human-like narration.
 * - LocalStorage persistence for user manual voice preference.
 */

const STORAGE_KEY_VOICE_PREF = 'zavela_selected_assistant_voice';

// Male names to strictly filter out
const KNOWN_MALE_NAMES = [
  'pablo', 'raul', 'raúl', 'jorge', 'gonzalo', 'carlos', 'enrique', 
  'david', 'alvaro', 'álvaro', 'mateo', 'diego', 'julio', 'manuel', 
  'male', 'hombre', 'miguel', 'antonio', 'pedro', 'juan', 'hector', 'héctor', 'alberto'
];

// Helper to convert an integer up to 999 into Spanish words
function threeDigitsToWords(n: number): string {
  const units = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const twenties = ['veinte', 'veintiún', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const tens = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  if (n === 0) return '';
  if (n === 100) return 'cien';

  let result = '';
  const c = Math.floor(n / 100);
  const remainder = n % 100;

  if (c > 0) {
    result += hundreds[c] + ' ';
  }

  if (remainder >= 10 && remainder < 20) {
    result += teens[remainder - 10];
  } else if (remainder >= 20 && remainder < 30) {
    result += twenties[remainder - 20];
  } else {
    const d = Math.floor(remainder / 10);
    const u = remainder % 10;

    if (d > 0) {
      result += tens[d];
      if (u > 0) {
        result += ' y ' + units[u];
      }
    } else if (u > 0) {
      result += units[u];
    }
  }

  return result.trim();
}

/**
 * Converts a numeric amount to natural spoken words in Colombian Pesos
 */
export function numberToColombianPesosWords(amount: number, appendColombianos: boolean = true): string {
  const num = Math.round(Math.abs(amount || 0));
  const currencyLabel = appendColombianos ? 'pesos colombianos' : 'pesos';
  if (num === 0) return `cero ${currencyLabel}`;

  let words = '';
  const millions = Math.floor(num / 1000000);
  const remainderMillions = num % 1000000;
  const thousands = Math.floor(remainderMillions / 1000);
  const unitsRemainder = remainderMillions % 1000;

  if (millions > 0) {
    if (millions === 1) {
      words += 'un millón ';
    } else {
      words += threeDigitsToWords(millions) + ' millones ';
    }
  }

  if (thousands > 0) {
    if (thousands === 1) {
      words += 'mil ';
    } else {
      words += threeDigitsToWords(thousands) + ' mil ';
    }
  }

  if (unitsRemainder > 0) {
    words += threeDigitsToWords(unitsRemainder) + ' ';
  }

  words = words.trim();

  if (millions > 0 && thousands === 0 && unitsRemainder === 0) {
    return `${words} de ${currencyLabel}`;
  }

  return `${words} ${currencyLabel}`;
}

/**
 * Check if a voice is explicitly male
 */
export function isMaleVoice(voice: SpeechSynthesisVoice): boolean {
  const name = voice.name.toLowerCase();
  return KNOWN_MALE_NAMES.some(m => name.includes(m));
}

/**
 * Checks if a voice is in Spanish (es, es-CO, es-MX, es-ES, es-US, etc.)
 */
export function isSpanishVoice(voice: SpeechSynthesisVoice): boolean {
  const lang = (voice.lang || '').toLowerCase();
  const name = (voice.name || '').toLowerCase();
  return lang.startsWith('es') || lang.includes('spa') || name.includes('spanish') || name.includes('español');
}

/**
 * Retrieves all available Spanish voices in the browser, sorted by naturalness and female priority.
 */
export function getAvailableSpanishVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const voices = window.speechSynthesis.getVoices() || [];
  
  const spanishVoices = voices.filter(isSpanishVoice);
  if (spanishVoices.length === 0) return [];

  // Sort: Female & Neural first, male/legacy last
  return [...spanishVoices].sort((a, b) => {
    const scoreA = calculateVoiceScore(a);
    const scoreB = calculateVoiceScore(b);
    return scoreB - scoreA;
  });
}

/**
 * Computes priority score for a voice based on female neural specifications
 */
function calculateVoiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();

  // If clearly male, penalize heavily
  if (isMaleVoice(voice)) {
    return -100;
  }

  let score = 0;

  // 1º Priority Tier: Explicitly requested top neural female Spanish voices
  if (name.includes('google') && (name.includes('español') || name.includes('spanish'))) {
    score += 100; // Top Chrome natural female voice
  } else if (name.includes('sabina')) {
    score += 98; // Microsoft Sabina Online (Natural)
  } else if (name.includes('dalia')) {
    score += 96; // Microsoft Dalia Online (Natural)
  } else if (name.includes('elena') && (name.includes('natural') || name.includes('online'))) {
    score += 94; // Microsoft Elena Natural
  } else if (name.includes('salome') || name.includes('salomé')) {
    score += 95; // Microsoft Salome (Colombian Natural)
  } else if (name.includes('paulina')) {
    score += 90; // Paulina (Apple / Nuance)
  } else if (name.includes('monica') || name.includes('mónica')) {
    score += 88; // Monica
  } else if (name.includes('soledad')) {
    score += 88; // Soledad
  }

  // Bonus for Neural / Natural / Online indicators
  if (name.includes('natural')) score += 30;
  if (name.includes('neural')) score += 30;
  if (name.includes('online')) score += 25;

  // Regional dialect weighting (Colombian Spanish & Latin America)
  if (lang === 'es-co' || lang.includes('es_co') || name.includes('colombia')) score += 20;
  else if (lang === 'es-mx' || lang.includes('es_mx') || name.includes('mexico')) score += 15;
  else if (lang === 'es-us' || lang.includes('es_us')) score += 10;
  else if (lang.startsWith('es')) score += 5;

  // Penalize desktop legacy or robotic synth
  if (name.includes('desktop') && !name.includes('natural')) score -= 30;
  if (name.includes('espeak')) score -= 60;

  return score;
}

/**
 * Returns saved voice choice name from localStorage
 */
export function getSavedVoiceName(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_VOICE_PREF);
  } catch {
    return null;
  }
}

/**
 * Persists user voice choice
 */
export function saveUserVoiceChoice(voiceName: string): void {
  try {
    if (!voiceName) {
      localStorage.removeItem(STORAGE_KEY_VOICE_PREF);
    } else {
      localStorage.setItem(STORAGE_KEY_VOICE_PREF, voiceName);
    }
  } catch (e) {
    console.warn('Error saving voice preference:', e);
  }
}

/**
 * Filters and selects the most natural, human-like female Spanish voice.
 * Checks user manual override in localStorage first, then applies strict priority ranking.
 */
export function getBestSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const spanishVoices = voices.filter(isSpanishVoice);
  if (spanishVoices.length === 0) {
    // If no explicit Spanish voice, check fallback
    return voices[0] || null;
  }

  // 1. Check user manual override preference
  const savedName = getSavedVoiceName();
  if (savedName) {
    const foundSaved = spanishVoices.find(v => v.name === savedName);
    if (foundSaved) return foundSaved;
  }

  // 2. Strict ranking: Filter out males first
  const nonMaleSpanishVoices = spanishVoices.filter(v => !isMaleVoice(v));
  const pool = nonMaleSpanishVoices.length > 0 ? nonMaleSpanishVoices : spanishVoices;

  const scored = pool.map(voice => ({
    voice,
    score: calculateVoiceScore(voice)
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.voice || spanishVoices[0] || null;
}

/**
 * Modulates text for natural, human speech:
 * - Detects price strings ($ 145.000, COP 2.610.000) and transforms them to spoken Colombian Pesos words.
 * - Injects strategic micro-pauses (spaced ellipses and punctuation) between sentences and clauses
 *   so the voice breathes naturally with executive cadence.
 */
export function modulateTextForNaturalSpeech(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Replace complex currency patterns with full spoken Spanish words
  text = text.replace(/(?:COP\s*|\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*(?:COP|pesos\s*colombianos|pesos)?/gi, (match, numberPart) => {
    const isCurrency = match.includes('$') || match.toUpperCase().includes('COP') || match.toLowerCase().includes('pesos');
    const numericVal = parseInt(numberPart.replace(/\./g, ''), 10);

    if ((isCurrency || numericVal >= 1000) && !isNaN(numericVal)) {
      return numberToColombianPesosWords(numericVal, true);
    }
    return match;
  });

  // Strip dollar symbols and adjust terms
  text = text
    .replace(/\$/g, '')
    .replace(/\bdólares\b/gi, 'pesos colombianos')
    .replace(/\bdólar\b/gi, 'peso colombiano');

  // 2. Expand common e-commerce abbreviations to friendly phrases
  text = text
    .replace(/\bCOD\b/gi, 'Pago Contra Entrega en efectivo')
    .replace(/\bcontraentrega\b/gi, 'Pago Contra Entrega')
    .replace(/Pago Contra Entrega en efectivo en efectivo/gi, 'Pago Contra Entrega en efectivo')
    .replace(/\bAOV\b/gi, 'ticket promedio')
    .replace(/\bCOP\b/gi, 'pesos colombianos')
    .replace(/(\d+)\s*%/g, '$1 por ciento')
    .replace(/(\d+)\s*un\b/gi, '$1 unidades')
    .replace(/(\d+)\s*uds\b/gi, '$1 unidades')
    .replace(/(\d+)\s*seg\b/gi, '$1 segundos')
    .replace(/(\d+)\s*min\b/gi, '$1 minutos')
    .replace(/(\d+)\s*hrs?\b/gi, '$1 horas')
    .replace(/4\.9\s*(?:\/|\s*de\s*)5(?:\.0)?/gi, 'cuatro punto nueve de cinco estrellas')
    .replace(/5\.0\s*(?:\/|\s*de\s*)5(?:\.0)?/gi, 'cinco estrellas')
    .replace(/(\d+)\s*★/g, '$1 estrellas')
    .replace(/★/g, 'estrellas')
    .replace(/#([A-Z0-9-]+)/gi, 'código $1')
    .replace(/\bSKU\b/gi, 'código')
    .replace(/([0-9]+)\s*h\b/gi, '$1 horas')
    .replace(/(\d+)\s*k\b/gi, '$1 mil');

  // 3. Rhythm, breathing and cadence modulation
  // Add micro-pause breathing points before conjunctions, transitions and after full stops
  text = text
    // Micro-pauses between sentences
    .replace(/\.\s+/g, '... ')
    .replace(/:\s+/g, '... ')
    .replace(/;\s*/g, ', ')
    // Conversational transitions breathing
    .replace(/\s+Sin embargo,\s*/gi, '... Sin embargo, ')
    .replace(/\s+Por otro lado,\s*/gi, '... Por otro lado, ')
    .replace(/\s+En total,\s*/gi, '... En total, ')
    .replace(/\s+Además,\s*/gi, '... Además, ')
    .replace(/\s+Por lo tanto,\s*/gi, '... Por lo tanto, ')
    .replace(/\s+En consecuencia,\s*/gi, '... En consecuencia, ')
    .replace(/\s+Te sugiero\s*/gi, ', te sugiero ')
    .replace(/\s+Te recomiendo\s*/gi, ', te recomiendo ')
    // Greetings & Attention calls
    .replace(/Atención,?\s+Administrador\.?/gi, 'Atención, Administrador... ')
    .replace(/\s+¡Hola!\s*/gi, '¡Hola!... ')
    .replace(/\s+¡Hola de nuevo!\s*/gi, '¡Hola de nuevo!... ')
    .replace(/\s+¡Hay novedades!\s*/gi, '¡Hay novedades!... ');

  // Clean excess punctuation
  text = text.replace(/\.{4,}/g, '...').replace(/\s{2,}/g, ' ').trim();

  return text;
}

export interface NaturalSpeechOptions {
  voice?: SpeechSynthesisVoice | null;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onPause?: () => void;
  onResume?: () => void;
}

/**
 * Creates a calibrated SpeechSynthesisUtterance with exact human acoustic parameters:
 * - rate: 0.93 (deliberate, warm, elegant executive cadence)
 * - pitch: 1.08 (natural, warm feminine tone)
 * - volume: 1.0
 */
export function createNaturalSpeechUtterance(
  text: string, 
  options: NaturalSpeechOptions = {}
): SpeechSynthesisUtterance {
  const modulatedText = modulateTextForNaturalSpeech(text);
  const utterance = new SpeechSynthesisUtterance(modulatedText);

  const voiceToUse = options.voice || getBestSpanishVoice();
  if (voiceToUse) {
    utterance.voice = voiceToUse;
    utterance.lang = voiceToUse.lang;
  } else {
    utterance.lang = 'es-CO';
  }

  // Exact Calibrated Acoustic Parameters:
  utterance.rate = 0.93;  // Ritmo ligeramente pausado, cálido y elegante
  utterance.pitch = 1.08; // Tono femenino medio, cálido y natural
  utterance.volume = 1.0;

  if (options.onStart) utterance.onstart = options.onStart;
  if (options.onEnd) utterance.onend = options.onEnd;
  if (options.onError) utterance.onerror = options.onError;
  if (options.onPause) utterance.onpause = options.onPause;
  if (options.onResume) utterance.onresume = options.onResume;

  return utterance;
}
