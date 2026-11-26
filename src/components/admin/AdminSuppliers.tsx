import React, { useEffect, useMemo, useState } from 'react';
import { Truck, Check } from 'lucide-react';

interface P { id: string; title: string; supplier: string; provider: string }
type Map = Record<string, { id?: string; name?: string }>;

const input = 'w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900';

/**
 * En Dropi un pedido solo admite productos de un mismo proveedor y se despacha con un solo flete.
 * Aquí se indica de qué proveedor es cada producto, para que el carrito agrupe y cobre el envío por paquete.
 */
export const AdminSuppliers: React.FC = () => {
  const [products, setProducts] = useState<P[]>([]);
  const [map, setMap] = useState<Map>({});
  const [q, setQ] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [bulkId, setBulkId] = useState('');
  const [bulkName, setBulkName] = useState('');
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/product-suppliers').then(r => r.json()).then(j => { if (j.success) { setProducts(j.products || []); setMap(j.map || {}); } }).catch(() => setMsg('No se pudo cargar la lista.'));
  }, []);

  const rows = useMemo(() => products.filter(p => {
    if (onlyMissing && (map[p.id]?.id || map[p.id]?.name)) return false;
    return !q.trim() || p.title.toLowerCase().includes(q.toLowerCase());
  }), [products, map, q, onlyMissing]);

  const missing = products.filter(p => !(map[p.id]?.id || map[p.id]?.name)).length;
  const known = useMemo(() => Array.from(new Set(Object.values(map).map(v => v.name).filter(Boolean))) as string[], [map]);

  const setField = (pid: string, k: 'id' | 'name', v: string) => setMap(m => ({ ...m, [pid]: { ...m[pid], [k]: v } }));
  const applyBulk = () => {
    const ids = Object.keys(picked).filter(k => picked[k]);
    if (!ids.length || (!bulkId.trim() && !bulkName.trim())) return;
    setMap(m => { const n = { ...m }; ids.forEach(id => { n[id] = { id: bulkId.trim(), name: bulkName.trim() }; }); return n; });
    setPicked({});
  };
  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const r = await fetch('/api/admin/product-suppliers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ map }) });
      const j = await r.json();
      setMsg(j.success ? `Guardado: ${j.saved} productos con proveedor.` : 'No se pudo guardar.');
    } catch { setMsg('No se pudo guardar.'); }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2"><Truck className="w-5 h-5" /> Proveedores de Dropi</h2>
          <p className="text-xs text-slate-600 max-w-2xl">
            Dropi solo deja agrupar en un pedido los productos de un mismo proveedor, con un solo flete. Anota aquí el proveedor de cada producto
            (nombre y número, como aparece en Dropi: la URL <code>/provider/54262/…</code> trae el número). Productos del mismo proveedor salen en un paquete;
            de proveedores distintos, en paquetes separados. Mientras un producto no tenga proveedor, se agrupa con los demás sin definir.
          </p>
        </div>
        <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
          <Check className="w-4 h-4" /> {saving ? 'Guardando…' : 'Guardar proveedores'}
        </button>
      </div>
      {msg && <p className="text-xs font-bold text-emerald-700" role="status">{msg}</p>}

      <div className="flex flex-wrap items-end gap-2 bg-white border border-slate-200 rounded-2xl p-3">
        <div className="flex-1 min-w-[180px]">
          <label className="text-[11px] font-bold text-slate-600">Buscar producto</label>
          <input className={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Nombre del producto" />
        </div>
        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 pb-1.5">
          <input type="checkbox" checked={onlyMissing} onChange={e => setOnlyMissing(e.target.checked)} /> Solo sin proveedor ({missing})
        </label>
        <div className="flex items-end gap-2 flex-wrap border-l border-slate-200 pl-3">
          <div><label className="text-[11px] font-bold text-slate-600">N.º proveedor</label><input className={input + ' w-24'} value={bulkId} onChange={e => setBulkId(e.target.value)} placeholder="54262" /></div>
          <div><label className="text-[11px] font-bold text-slate-600">Nombre</label><input className={input + ' w-44'} list="suppliers-known" value={bulkName} onChange={e => setBulkName(e.target.value)} placeholder="Stockeado Andrey" /></div>
          <button onClick={applyBulk} className="px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold cursor-pointer">Asignar a los marcados</button>
        </div>
        <datalist id="suppliers-known">{known.map(k => <option key={k} value={k} />)}</datalist>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left text-slate-600 border-b border-slate-200">
            <th className="p-2 w-8"><input type="checkbox" aria-label="Marcar todos" onChange={e => setPicked(e.target.checked ? Object.fromEntries(rows.map(r => [r.id, true])) : {})} /></th>
            <th className="p-2">Producto</th><th className="p-2 w-28">N.º proveedor</th><th className="p-2 w-56">Nombre del proveedor</th>
          </tr></thead>
          <tbody>
            {rows.map(p => (
              <tr key={p.id} className="border-b border-slate-100">
                <td className="p-2"><input type="checkbox" checked={!!picked[p.id]} onChange={e => setPicked(s => ({ ...s, [p.id]: e.target.checked }))} aria-label={`Marcar ${p.title}`} /></td>
                <td className="p-2 font-semibold text-slate-800">{p.title}</td>
                <td className="p-2"><input className={input} value={map[p.id]?.id || ''} onChange={e => setField(p.id, 'id', e.target.value)} aria-label={`Número de proveedor de ${p.title}`} /></td>
                <td className="p-2"><input className={input} list="suppliers-known" value={map[p.id]?.name || ''} onChange={e => setField(p.id, 'name', e.target.value)} aria-label={`Proveedor de ${p.title}`} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="p-4 text-slate-500">No hay productos con ese filtro.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};
