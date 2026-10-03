import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  HelpCircle, 
  Save, 
  Plus, 
  Trash2, 
  Check, 
  Sparkles,
  BookOpen
} from 'lucide-react';
import { StoreSettings } from '../../types/index.ts';

interface AdminLegalPoliciesProps {
  settings: StoreSettings;
  onSaveSettings: (settings: Partial<StoreSettings>) => Promise<void>;
}

export const AdminLegalPolicies: React.FC<AdminLegalPoliciesProps> = ({
  settings,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'returns' | 'faq'>('terms');

  const [terms, setTerms] = useState(
    settings.legalPolicies?.termsAndConditions || 
    `TÉRMINOS Y CONDICIONES DEL SERVICIO - ZAVELA STORE COLOMBIA

1. CONDICIONES GENERALES
Al realizar un pedido en Zavela Store, el cliente acepta expresamente las condiciones de compra y entrega vigentes en el territorio colombiano.

2. PAGO CONTRA ENTREGA
El servicio de Pago Contra Entrega permite pagar el valor exacto de la orden en efectivo en el momento en que la transportadora aliada (Servientrega, Coordinadora, Envía o Inter Rapidísimo) realiza la entrega física en la dirección suministrada por el comprador.

3. DESPACHOS Y TIEMPOS DE ENTREGA
Los pedidos se procesan y alistan en un plazo de 24 horas hábiles. Los tiempos de entrega habituales son de 1 a 2 días hábiles para Bogotá D.C. y principales capitales, y de 2 a 4 días hábiles para municipios del territorio nacional.

4. DERECHO DE RETRACTO Y GARANTÍAS
Todos los productos comercializados en Zavela Store cuentan con una garantía de 30 días calendario por defectos de fabricación, conforme a lo establecido en la Ley 1480 de 2011 (Estatuto del Consumidor en Colombia).`
  );

  const [privacy, setPrivacy] = useState(
    settings.legalPolicies?.privacyPolicy || 
    `POLÍTICA DE TRATAMIENTO DE DATOS PERSONALES - ZAVELA STORE

Conforme a la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia, Zavela Store informa que los datos personales suministrados (nombre, teléfono, dirección y departamento) son utilizados exclusivamente para la gestión logística de entrega de los pedidos y contacto posventa.`
  );

  const [returns, setReturns] = useState(
    settings.legalPolicies?.shippingAndReturns || 
    `POLÍTICA DE ENVÍOS, CAMBIOS Y GARANTÍAS - ZAVELA STORE

1. COBERTURA NACIONAL
Despachamos a todos los municipios y ciudades principales de Colombia con transportadoras oficiales.

2. GARANTÍA DE SATISFACCIÓN DE 30 DÍAS
Si tu producto presenta alguna anomalía técnica o defecto de fábrica, tramitamos el cambio inmediato o reposición sin costo adicional para el cliente.`
  );

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        legalPolicies: {
          ...settings.legalPolicies,
          termsAndConditions: terms,
          privacyPolicy: privacy,
          shippingAndReturns: returns
        }
      });
      alert('Políticas legales y CMS guardadas correctamente.');
    } catch (err: any) {
      alert('Error al guardar políticas.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold font-mono">
            GRUPO 7: CMS & LEGAL
          </span>
          <h2 className="text-base font-black text-slate-900 tracking-tight mt-1">
            Políticas Legales, Términos y Garantías
          </h2>
          <p className="text-xs text-slate-500">
            Administra el contenido legal, política de privacidad y condiciones de despacho contra entrega.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          {isSaving ? 'Guardando...' : 'Guardar Políticas'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'terms' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Términos y Condiciones
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'privacy' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Tratamiento de Datos (Privacidad)
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'returns' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Envíos, Cambios y Garantía 30 Días
        </button>
      </div>

      {/* Content Editor */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        {activeTab === 'terms' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Texto de Términos y Condiciones de Uso
              </label>
              <span className="text-[11px] text-slate-400">Visible en el Footer y Checkout</span>
            </div>
            <textarea
              rows={16}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden leading-relaxed text-slate-800"
            />
          </div>
        )}

        {activeTab === 'privacy' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Política de Tratamiento y Privacidad de Datos Personales (Colombia)
              </label>
            </div>
            <textarea
              rows={16}
              value={privacy}
              onChange={(e) => setPrivacy(e.target.value)}
              className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden leading-relaxed text-slate-800"
            />
          </div>
        )}

        {activeTab === 'returns' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800">
                Políticas de Despacho, Garantía 30 Días y Devoluciones
              </label>
            </div>
            <textarea
              rows={16}
              value={returns}
              onChange={(e) => setReturns(e.target.value)}
              className="w-full p-4 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:border-cyan-500 outline-hidden leading-relaxed text-slate-800"
            />
          </div>
        )}
      </div>

    </div>
  );
};
