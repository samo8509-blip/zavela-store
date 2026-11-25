import React, { useState } from 'react';
import { Megaphone, Save, Check } from 'lucide-react';
import { StoreSettings, Category, HomePromoSettings, DEFAULT_HOME_PROMO } from '../../types/index.ts';

interface Props {
  settings: StoreSettings;
  categories?: Category[];
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

const COLOR_OPTS: { id: HomePromoSettings['band']['color']; name: string; hex: string }[] = [
  { id: 'temporada', name: 'Color de la temporada (automático)', hex: '#5433eb' },
  { id: 'coral', name: 'Coral', hex: '#ff5a4f' },
  { id: 'violeta', name: 'Violeta', hex: '#5433eb' },
  { id: 'verde', name: 'Verde Navidad', hex: '#0f3d2e' },
  { id: 'amarillo', name: 'Amarillo', hex: '#ffd23f' }
];

const input = 'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-hidden focus:border-violet-500';
const label = 'block text-xs font-bold text-slate-600 mb-1';

export const AdminHomePromo: React.FC<Props> = ({ settings, categories = [], onSaveSettings }) => {
  const [band, setBand] = useState<HomePromoSettings['band']>({ ...DEFAULT_HOME_PROMO.band, ...(settings.homePromo?.band || {}) });
  const [shelf, setShelf] = useState<HomePromoSettings['shelf']>({ ...DEFAULT_HOME_PROMO.shelf, ...(settings.homePromo?.shelf || {}) });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const previewTitle = String(band.title || '').replace(/\{n\}/g, String(Math.round(Number(band.maxDiscount) || 0)));
  const colorHex = COLOR_OPTS.find(c => c.id === band.color)?.hex || '#ff5a4f';
  const darkInk = band.color === 'amarillo';
  const isSeason = band.color === 'temporada';

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const pct = Math.min(90, Math.max(1, Math.round(Number(band.maxDiscount) || 0)));
      await onSaveSettings({ homePromo: { band: { ...band, maxDiscount: pct }, shelf } });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch {
      /* el contenedor ya muestra el aviso de error */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center"><Megaphone className="w-5 h-5" /></div>
        <div>
          <h2 className="text-lg font-black text-slate-900">Inicio comercial</h2>
          <p className="text-xs text-slate-600">Franja de oferta y estante de temporada que aparecen en la página de inicio.</p>
        </div>
      </div>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900">1. Franja de oferta</h3>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={band.enabled} onChange={e => setBand({ ...band, enabled: e.target.checked })} />
            {band.enabled ? 'Activa' : 'Desactivada'}
          </label>
        </div>

        <div className="rounded-3xl px-5 py-4 flex items-center justify-between gap-3" style={{ background: isSeason ? 'var(--shop-violet)' : colorHex, color: darkInk ? '#000' : '#fff', opacity: band.enabled ? 1 : 0.4 }}>
          <div className="min-w-0">
            <div className="text-[11px] font-bold tracking-wider">{band.eyebrow}</div>
            <div className="text-xl font-semibold leading-tight">{previewTitle}</div>
          </div>
          <span className="rounded-full px-4 py-2 text-xs font-bold shrink-0" style={{ background: darkInk ? '#000' : '#fff', color: darkInk ? '#fff' : '#000' }}>{band.buttonText}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={label}>Descuento máximo (hasta %)</label>
            <input type="number" min={1} max={90} className={input} value={band.maxDiscount} onChange={e => setBand({ ...band, maxDiscount: Number(e.target.value) })} />
          </div>
          <div>
            <label className={label}>Se muestra hasta (opcional)</label>
            <input type="date" className={input} value={band.endsAt || ''} onChange={e => setBand({ ...band, endsAt: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Texto pequeño de arriba</label>
            <input type="text" className={input} value={band.eyebrow} onChange={e => setBand({ ...band, eyebrow: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Título (escribe {'{n}'} donde va el porcentaje)</label>
            <input type="text" className={input} value={band.title} onChange={e => setBand({ ...band, title: e.target.value })} />
          </div>
          <div>
            <label className={label}>Texto del botón</label>
            <input type="text" className={input} value={band.buttonText} onChange={e => setBand({ ...band, buttonText: e.target.value })} />
          </div>
          <div>
            <label className={label}>Color</label>
            <div className="flex gap-2">
              {COLOR_OPTS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setBand({ ...band, color: c.id })}
                  title={c.name}
                  aria-label={c.name}
                  className={`w-9 h-9 rounded-full border-2 cursor-pointer ${band.color === c.id ? 'border-slate-900' : 'border-transparent'}`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900">2. Estante de temporada</h3>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
            <input type="checkbox" checked={shelf.enabled} onChange={e => setShelf({ ...shelf, enabled: e.target.checked })} />
            {shelf.enabled ? 'Activo' : 'Desactivado'}
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={label}>Título del estante</label>
            <input type="text" className={input} value={shelf.title} onChange={e => setShelf({ ...shelf, title: e.target.value })} />
          </div>
          <div>
            <label className={label}>Qué productos muestra</label>
            <select className={input} value={shelf.source} onChange={e => setShelf({ ...shelf, source: e.target.value as HomePromoSettings['shelf']['source'] })}>
              <option value="offers">Los de mayor descuento</option>
              <option value="featured">Los destacados</option>
              <option value="category">Una categoría</option>
            </select>
          </div>
          <div>
            <label className={label}>Cantidad</label>
            <select className={input} value={shelf.count} onChange={e => setShelf({ ...shelf, count: Number(e.target.value) === 8 ? 8 : 4 })}>
              <option value={4}>4 productos</option>
              <option value={8}>8 productos</option>
            </select>
          </div>
          {shelf.source === 'category' && (
            <div className="sm:col-span-2">
              <label className={label}>Categoría</label>
              <select className={input} value={shelf.categoryId || ''} onChange={e => setShelf({ ...shelf, categoryId: e.target.value })}>
                <option value="">Elige una categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{(c.name || '').replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}</option>)}
              </select>
            </div>
          )}
        </div>
        <p className="text-[11px] text-slate-500">Si hay menos de 2 productos que cumplan, el estante usa los destacados; si tampoco hay, se oculta solo.</p>
      </section>

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold cursor-pointer disabled:opacity-60">
          <Save className="w-4 h-4" />{saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
        {saved && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"><Check className="w-4 h-4" />Guardado. Ya se ve en la tienda.</span>}
      </div>
    </div>
  );
};
