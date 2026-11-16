import React, { useState, useMemo } from 'react';
import { X, Upload, Loader2, CheckCircle2, AlertTriangle, ShieldCheck, RotateCcw, Tag } from 'lucide-react';
import { Product } from '../../types/index.ts';
import { formatCOP } from '../../utils/formatters.ts';
import { saveCpanelProduct } from '../../services/cpanelProducts.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onDone: () => void;
}

type Mode = 'apply' | 'restore';

interface Row {
  title: string;
  oldPrice: number; // columna "Precio actual"
  newPrice: number; // columna "Precio Black Friday"
  product?: Product;
  problem?: string;
}

const norm = (s: string) =>
  String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

const num = (v: string) => {
  const n = Number(String(v || '').replace(/[^\d-]/g, ''));
  return isNaN(n) ? 0 : n;
};

function splitLine(line: string, d: string): string[] {
  const out: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q;
    } else if (ch === d && !q) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim());
}

function parseCsv(text: string): { title: string; oldPrice: number; newPrice: number }[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const d = [';', '\t', ','].reduce((best, c) => (lines[0].split(c).length > lines[0].split(best).length ? c : best), ';');
  const head = splitLine(lines[0], d).map(norm);
  const iTitle = head.findIndex(h => h.startsWith('producto'));
  const iOld = head.findIndex(h => h.startsWith('precio actual'));
  const iNew = head.findIndex(h => h.startsWith('precio black'));
  if (iTitle < 0 || iOld < 0 || iNew < 0) return [];
  return lines.slice(1).map(l => {
    const c = splitLine(l, d);
    return { title: c[iTitle] || '', oldPrice: num(c[iOld]), newPrice: num(c[iNew]) };
  }).filter(r => r.title);
}

export const BulkPriceUploadModal: React.FC<Props> = ({ isOpen, onClose, products, onDone }) => {
  const [mode, setMode] = useState<Mode>('apply');
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<{ title: string; oldPrice: number; newPrice: number }[] | null>(null);
  const [fileError, setFileError] = useState('');
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ ok: number; fail: string[] } | null>(null);

  const rows: Row[] = useMemo(() => {
    if (!parsed) return [];
    const used = new Set<string>();
    return parsed.map(r => {
      // En "restaurar" el precio que hay hoy en la tienda es el de Black Friday.
      const currentExpected = mode === 'apply' ? r.oldPrice : r.newPrice;
      const target = mode === 'apply' ? r.newPrice : r.oldPrice;
      const sameTitle = products.filter(p => norm(p.title || (p as any).nombre) === norm(r.title) && !used.has(String(p.id)));
      let product = sameTitle.find(p => Number(p.price) === currentExpected);
      if (!product && sameTitle.length === 1) product = sameTitle[0];
      let problem: string | undefined;
      if (!product) problem = 'No se encontró en la tienda';
      else if (!target || target <= 0) problem = 'Precio inválido';
      else if (Number(product.price) === target) problem = 'Sin cambio';
      else if (mode === 'apply' && Number(product.price) !== r.oldPrice)
        problem = `El precio actual en la tienda (${formatCOP(Number(product.price))}) no coincide con el del archivo`;
      if (product) used.add(String(product.id));
      return { title: r.title, oldPrice: r.oldPrice, newPrice: r.newPrice, product, problem };
    });
  }, [parsed, products, mode]);

  const ready = rows.filter(r => !r.problem);
  const skipped = rows.filter(r => r.problem);

  if (!isOpen) return null;

  const onFile = async (f: File | undefined) => {
    setResult(null);
    setFileError('');
    setParsed(null);
    if (!f) return;
    setFileName(f.name);
    const data = parseCsv(await f.text());
    if (!data.length) {
      setFileError('No pude leer el archivo. Debe ser CSV con las columnas "Producto", "Precio actual" y "Precio Black Friday".');
      return;
    }
    setParsed(data);
  };

  const run = async () => {
    if (!ready.length || running) return;
    setRunning(true);
    setProgress(0);
    setResult(null);
    try {
      if (mode === 'apply') {
        const b = await fetch('/api/backups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ origen: 'pre-black-friday' })
        });
        const bj = await b.json().catch(() => ({}));
        if (!b.ok || bj.success === false) throw new Error('No se pudo crear el respaldo previo. No se cambió ningún precio.');
      }
      const fail: string[] = [];
      let ok = 0;
      let done = 0;
      const queue = [...ready];
      const worker = async () => {
        while (queue.length) {
          const r = queue.shift()!;
          const p = r.product!;
          const price = mode === 'apply' ? r.newPrice : r.oldPrice;
          try {
            await saveCpanelProduct({
              ...p,
              price,
              precio: price,
              compareAtPrice: mode === 'apply' ? Number(p.price) : 0,
              suggested_price: mode === 'apply' ? Number(p.price) : 0
            } as any);
            ok++;
          } catch {
            fail.push(r.title);
          }
          done++;
          setProgress(done);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
      setResult({ ok, fail });
      onDone();
    } catch (e: any) {
      setFileError(e?.message || 'Error al aplicar los precios.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-start justify-between p-5 border-b border-slate-200">
          <div>
            <h3 className="font-black text-slate-900 flex items-center gap-2"><Tag className="w-5 h-5 text-amber-500" />Cargar precios (Black Friday)</h3>
            <p className="text-xs text-slate-500 mt-1">Sube el archivo CSV con las columnas Producto, Precio actual y Precio Black Friday.</p>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('apply')} className={`flex-1 px-3 py-2 rounded-xl text-xs font-black border ${mode === 'apply' ? 'bg-slate-900 text-amber-400 border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>Aplicar precios Black Friday</button>
            <button type="button" onClick={() => setMode('restore')} className={`flex-1 px-3 py-2 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 ${mode === 'restore' ? 'bg-slate-900 text-amber-400 border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}><RotateCcw className="w-3.5 h-3.5" />Restaurar precios normales</button>
          </div>

          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
            {mode === 'apply'
              ? 'Cada producto pasa a su precio Black Friday y su precio anterior queda como precio tachado (es el precio real al que se vendía). Antes de cambiar nada se crea un respaldo del catálogo.'
              : 'Cada producto vuelve a su "Precio actual" del archivo y se quita el precio tachado. Usa el mismo archivo con el que aplicaste la campaña.'}
          </p>

          <label htmlFor="bf-file" className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-4 text-sm font-bold text-slate-600 cursor-pointer hover:border-amber-400">
            <Upload className="w-4 h-4" />{fileName || 'Elegir archivo CSV'}
            <input id="bf-file" type="file" accept=".csv,text/csv" className="hidden" onChange={e => onFile(e.target.files?.[0])} />
          </label>

          {fileError && <div className="flex gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3"><AlertTriangle className="w-4 h-4 shrink-0" />{fileError}</div>}

          {parsed && (
            <>
              <div className="flex flex-wrap gap-2 text-xs font-bold">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800">{ready.length} se van a cambiar</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">{skipped.length} se omiten</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr><th className="text-left p-2">Producto</th><th className="text-right p-2">Hoy</th><th className="text-right p-2">Quedará</th><th className="text-left p-2">Estado</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="p-2 max-w-[260px] truncate" title={r.title}>{r.title}</td>
                        <td className="p-2 text-right tabular-nums">{r.product ? formatCOP(Number(r.product.price)) : '-'}</td>
                        <td className="p-2 text-right tabular-nums font-bold">{formatCOP(mode === 'apply' ? r.newPrice : r.oldPrice)}</td>
                        <td className={`p-2 ${r.problem ? 'text-amber-700' : 'text-emerald-700'}`}>{r.problem || 'Listo'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {running && <div className="text-xs font-bold text-slate-700 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Guardando {progress} de {ready.length}...</div>}
          {result && (
            <div className={`text-xs rounded-xl p-3 border ${result.fail.length ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
              <div className="font-black flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />{result.ok} productos actualizados.</div>
              {result.fail.length > 0 && <div className="mt-1">No se pudieron guardar {result.fail.length}: {result.fail.join(', ')}</div>}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" />{mode === 'apply' ? 'Respaldo automático antes de aplicar' : 'Se actualiza producto por producto'}</span>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-black bg-slate-100 text-slate-700">Cerrar</button>
            <button type="button" disabled={!ready.length || running} onClick={run} className="px-4 py-2 rounded-xl text-xs font-black bg-amber-500 text-slate-900 disabled:opacity-40">
              {mode === 'apply' ? `Aplicar ${ready.length} precios` : `Restaurar ${ready.length} precios`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
