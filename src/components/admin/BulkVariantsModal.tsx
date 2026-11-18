import React, { useMemo, useState } from 'react';
import { X, ClipboardPaste, Wand2, Upload, Plus, AlertTriangle, Download } from 'lucide-react';
import { ProductVariant } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  existing: ProductVariant[];
  basePrice: number;
  /** Costo operativo base por unidad (proveedor + flete + comisión) para avisar de margen bajo. */
  operatingCost: number;
  onApply: (variants: ProductVariant[]) => void;
}

interface Draft {
  key: string;
  color: string;
  size: string;
  dropiId: string;
  price?: number; // undefined = usar el predeterminado
  stock?: number; // undefined = usar el predeterminado
  dropiStock?: number;
  dropiSuggested?: number;
  dropiCost?: number;
  include: boolean;
}

const norm = (s: string) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const toNum = (v: any) => {
  const s = String(v ?? '').replace(/[^\d]/g, '');
  return s ? Number(s) : 0;
};

const TEMPLATE_HEAD = 'Color;Talla;Precio de venta;Stock;ID Dropi';

/** Lee una tabla copiada de Dropi: Id, Descripción (Color: X Talla: Y), Existencia, Precio proveedor, Precio sugerido. */
function parseDropi(text: string): Draft[] {
  const flat = text.replace(/\s+/g, ' ').trim();
  const re = /(\d{5,10}) (.+?) (\d{1,6}) \$ ?([\d.,]+) \$ ?([\d.,]+)/g;
  const out: Draft[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat))) {
    const desc = m[2];
    const c = desc.match(/Color:\s*(.*?)(?=\s+Talla:|$)/i);
    const t = desc.match(/Talla:\s*(.*)$/i);
    const color = (c ? c[1] : desc.replace(/Talla:.*$/i, '')).trim();
    out.push({
      key: `d-${m[1]}-${out.length}`,
      color: color || 'Único',
      size: (t ? t[1] : '').trim() || 'Única',
      dropiId: m[1],
      dropiStock: Number(m[3]),
      dropiCost: toNum(m[4]),
      dropiSuggested: toNum(m[5]),
      include: true
    });
  }
  return out;
}

/** Lee filas "Color;Talla;Precio;Stock;ID Dropi" separadas por ; , o tabulador (pegadas desde Excel/Sheets o de un CSV). */
function parseSheet(text: string): Draft[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const d = ['\t', ';', ','].reduce((b, c) => (lines[0].split(c).length > lines[0].split(b).length ? c : b), '\t');
  const rows = lines.map(l => l.split(d).map(x => x.trim().replace(/^"|"$/g, '')));
  let idx = { color: 0, size: 1, price: 2, stock: 3, id: 4 };
  const head = rows[0].map(norm);
  let start = 0;
  if (head.some(h => h.startsWith('color'))) {
    start = 1;
    const f = (p: string) => head.findIndex(h => h.startsWith(p));
    idx = { color: f('color'), size: f('talla'), price: f('precio'), stock: f('stock'), id: f('id') };
  }
  return rows.slice(start).filter(r => (r[idx.color] || '').trim()).map((r, i) => ({
    key: `s-${i}-${Date.now()}`,
    color: r[idx.color].trim(),
    size: (idx.size >= 0 && r[idx.size]) || 'Única',
    dropiId: (idx.id >= 0 && r[idx.id]) || '',
    price: idx.price >= 0 && r[idx.price] ? toNum(r[idx.price]) || undefined : undefined,
    stock: idx.stock >= 0 && r[idx.stock] !== undefined && r[idx.stock] !== '' ? toNum(r[idx.stock]) : undefined,
    include: true
  }));
}

/** "35-40" -> 35,36,37,38,39,40 ; "S, M, L" -> S,M,L ; mezcla permitida: "34, 36-38". */
function expandSizes(text: string): string[] {
  const out: string[] = [];
  text.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).forEach(tok => {
    const r = tok.match(/^(\d+)\s*[-–a]\s*(\d+)$/i);
    if (r && Number(r[2]) >= Number(r[1]) && Number(r[2]) - Number(r[1]) < 100) {
      for (let n = Number(r[1]); n <= Number(r[2]); n++) out.push(String(n));
    } else out.push(tok);
  });
  return Array.from(new Set(out));
}

const variantName = (color: string, size: string) => (size && size !== 'Única' ? `${color} / ${size}` : color);

export const BulkVariantsModal: React.FC<Props> = ({ isOpen, onClose, existing, basePrice, operatingCost, onApply }) => {
  const [tab, setTab] = useState<'paste' | 'combo'>('paste');
  const [pasteText, setPasteText] = useState('');
  const [colors, setColors] = useState('');
  const [sizes, setSizes] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [priceMode, setPriceMode] = useState<'fijo' | 'sugerido'>('fijo');
  const [defaultPrice, setDefaultPrice] = useState<string>(String(basePrice || ''));
  const [stockMode, setStockMode] = useState<'fijo' | 'dropi'>('fijo');
  const [defaultStock, setDefaultStock] = useState<string>('20');
  const [msg, setMsg] = useState('');

  const hasDropiData = drafts.some(d => d.dropiSuggested);

  const eff = (d: Draft) => {
    const price = d.price ?? (priceMode === 'sugerido' && d.dropiSuggested ? d.dropiSuggested : toNum(defaultPrice));
    const stock = d.stock ?? (stockMode === 'dropi' && d.dropiStock !== undefined ? d.dropiStock : toNum(defaultStock));
    return { price, stock };
  };

  const status = (d: Draft): 'nueva' | 'actualiza' => {
    const n = norm(variantName(d.color, d.size));
    const hit = existing.find(v =>
      (d.dropiId && String(v.dropi_variation_id ?? v.dropiVariationId ?? '') === d.dropiId) || norm(v.name) === n
    );
    return hit ? 'actualiza' : 'nueva';
  };

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts(prev => prev.map(d => (d.key === key ? { ...d, ...patch } : d)));

  const readPaste = (text: string) => {
    setMsg('');
    const dropi = parseDropi(text);
    const list = dropi.length ? dropi : parseSheet(text);
    if (!list.length) {
      setDrafts([]);
      setMsg('No pude leer variantes de ese texto. Pega la tabla de Dropi tal como sale, o las columnas: Color, Talla, Precio de venta, Stock, ID Dropi.');
      return;
    }
    if (dropi.length) setPriceMode('fijo');
    setDrafts(list);
  };

  const buildCombo = () => {
    setMsg('');
    const cs = colors.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    const ss = expandSizes(sizes);
    if (!cs.length) { setMsg('Escribe al menos un color o nombre.'); return; }
    const sizeList = ss.length ? ss : ['Única'];
    if (cs.length * sizeList.length > 300) { setMsg('Son demasiadas combinaciones (máximo 300).'); return; }
    const list: Draft[] = [];
    cs.forEach(c => sizeList.forEach(s => list.push({ key: `c-${c}-${s}`, color: c, size: s, dropiId: '', include: true })));
    setDrafts(list);
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    const text = await f.text();
    setPasteText(text);
    readPaste(text);
  };

  const downloadTemplate = () => {
    const csv = '﻿' + TEMPLATE_HEAD + '\nNegro;35;120000;20;2219544\nVerde;36;120000;20;2219551\nBeige;37;;;\n';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'plantilla-variantes-zavela.csv';
    a.click();
  };

  const selected = useMemo(() => drafts.filter(d => d.include), [drafts]);

  if (!isOpen) return null;

  const apply = () => {
    const list = [...existing];
    let n = 0;
    selected.forEach((d, i) => {
      const { price, stock } = eff(d);
      const name = variantName(d.color, d.size);
      const at = list.findIndex(v =>
        (d.dropiId && String(v.dropi_variation_id ?? v.dropiVariationId ?? '') === d.dropiId) || norm(v.name) === norm(name)
      );
      const base: ProductVariant = {
        id: at >= 0 ? list[at].id : `var-${Date.now()}-${i}`,
        name, color: d.color, size: d.size, talla: d.size,
        price, stock,
        dropi_variation_id: d.dropiId || (at >= 0 ? list[at].dropi_variation_id : undefined),
        sku: at >= 0 ? list[at].sku : undefined
      };
      if (at >= 0) list[at] = { ...list[at], ...base }; else list.push(base);
      n++;
    });
    onApply(list);
    setDrafts([]); setPasteText(''); setColors(''); setSizes('');
    onClose();
  };

  const lowMargin = (price: number) => operatingCost > 0 && price > 0 && price - operatingCost < 10000;

  return (
    <div className="fixed inset-0 z-[300] bg-slate-900/60 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-black text-slate-900">Agregar variantes en lote</h3>
            <p className="text-xs text-slate-500">Se agregan al formulario; no se guardan hasta que pulses "Guardar Cambios".</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex gap-2">
            {([['paste', 'Pegar desde Dropi o Excel', ClipboardPaste], ['combo', 'Generar combinaciones', Wand2]] as const).map(([id, label, Icon]) => (
              <button key={id} type="button" onClick={() => { setTab(id); setDrafts([]); setMsg(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold cursor-pointer border ${tab === id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {tab === 'paste' ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-600">
                En Dropi selecciona la tabla de variantes (desde "Id" hasta la última fila), cópiala y pégala aquí. También sirven las columnas de la plantilla: <b>Color, Talla, Precio de venta, Stock, ID Dropi</b>.
              </p>
              <textarea value={pasteText} onChange={e => setPasteText(e.target.value)} rows={6}
                placeholder="Pega aquí la tabla..." className="w-full border border-slate-200 rounded-xl p-3 text-xs font-mono" />
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => readPaste(pasteText)} className="px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-bold cursor-pointer">Leer variantes</button>
                <label className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" /> Cargar CSV
                  <input type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
                </label>
                <button type="button" onClick={downloadTemplate} className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Plantilla
                </button>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Colores o nombres (separados por coma)</label>
                <textarea value={colors} onChange={e => setColors(e.target.value)} rows={3} placeholder="Negro, Verde, Beige"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tallas (rangos permitidos: 35-40, S, M, L)</label>
                <textarea value={sizes} onChange={e => setSizes(e.target.value)} rows={3} placeholder="35-40"
                  className="w-full border border-slate-200 rounded-xl p-3 text-xs" />
              </div>
              <div className="sm:col-span-2">
                <button type="button" onClick={buildCombo} className="px-4 py-2 rounded-full bg-indigo-600 text-white text-xs font-bold cursor-pointer">Generar combinaciones</button>
              </div>
            </div>
          )}

          {msg && <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{msg}</div>}

          {drafts.length > 0 && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">Precio de venta por defecto</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input value={defaultPrice} onChange={e => setDefaultPrice(e.target.value)} inputMode="numeric"
                      className="w-32 border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                    {hasDropiData && (
                      <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={priceMode === 'sugerido'} onChange={e => setPriceMode(e.target.checked ? 'sugerido' : 'fijo')} />
                        usar precio sugerido de Dropi
                      </label>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-700">Stock por defecto</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input value={defaultStock} onChange={e => setDefaultStock(e.target.value)} inputMode="numeric"
                      className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-xs" />
                    {hasDropiData && (
                      <label className="text-[11px] text-slate-600 flex items-center gap-1 cursor-pointer">
                        <input type="checkbox" checked={stockMode === 'dropi'} onChange={e => setStockMode(e.target.checked ? 'dropi' : 'fijo')} />
                        usar existencia de Dropi
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="max-h-[38vh] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="p-2 w-8"><input type="checkbox" checked={selected.length === drafts.length}
                          onChange={e => setDrafts(p => p.map(d => ({ ...d, include: e.target.checked })))} /></th>
                        <th className="p-2 text-left">Color</th><th className="p-2 text-left">Talla</th>
                        <th className="p-2 text-left">ID Dropi</th><th className="p-2 text-left">Precio</th>
                        <th className="p-2 text-left">Stock</th><th className="p-2 text-left">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map(d => {
                        const e = eff(d);
                        const st = status(d);
                        return (
                          <tr key={d.key} className={`border-t border-slate-100 ${d.include ? '' : 'opacity-40'}`}>
                            <td className="p-2"><input type="checkbox" checked={d.include} onChange={ev => update(d.key, { include: ev.target.checked })} /></td>
                            <td className="p-2"><input value={d.color} onChange={ev => update(d.key, { color: ev.target.value })} className="w-24 border border-slate-200 rounded px-1.5 py-1" /></td>
                            <td className="p-2"><input value={d.size} onChange={ev => update(d.key, { size: ev.target.value })} className="w-16 border border-slate-200 rounded px-1.5 py-1" /></td>
                            <td className="p-2"><input value={d.dropiId} onChange={ev => update(d.key, { dropiId: ev.target.value })} placeholder="opcional" className="w-24 border border-slate-200 rounded px-1.5 py-1" /></td>
                            <td className="p-2">
                              <input value={e.price} onChange={ev => update(d.key, { price: toNum(ev.target.value) })} inputMode="numeric" className="w-24 border border-slate-200 rounded px-1.5 py-1" />
                              {lowMargin(e.price) && <div className="text-[10px] text-amber-700 mt-0.5">Margen bajo ({formatCOP(e.price - operatingCost)})</div>}
                            </td>
                            <td className="p-2"><input value={e.stock} onChange={ev => update(d.key, { stock: toNum(ev.target.value) })} inputMode="numeric" className="w-16 border border-slate-200 rounded px-1.5 py-1" /></td>
                            <td className="p-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${st === 'nueva' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                {st === 'nueva' ? 'Nueva' : 'Actualiza'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            {selected.length ? `${selected.length} variante${selected.length === 1 ? '' : 's'} listas · ${selected.filter(d => status(d) === 'nueva').length} nuevas` : 'Aún no hay variantes leídas'}
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer">Cancelar</button>
            <button type="button" onClick={apply} disabled={!selected.length}
              className="px-5 py-2 rounded-full bg-indigo-600 disabled:bg-slate-300 text-white text-xs font-bold cursor-pointer flex items-center gap-1.5">
              <Plus className="w-4 h-4" /> Agregar al producto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
