import React, { useState } from 'react';
import { 
  Terminal, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Code
} from 'lucide-react';
import { SystemLog } from '../../types/index.ts';
import { formatDate } from '../../utils/formatters.ts';

interface AdminLogsProps {
  logs: SystemLog[];
  onRefresh: () => void;
}

export const AdminLogs: React.FC<AdminLogsProps> = ({ logs, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase()) ||
    l.orderId?.toLowerCase().includes(search.toLowerCase()) ||
    l.type?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por acción, tipo, pedido o detalle..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white rounded-xl border border-slate-300 focus:border-indigo-500 outline-hidden"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <button
          onClick={onRefresh}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar Logs</span>
        </button>
      </div>

      {/* Logs List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            No hay registros de actividad aún.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;

            return (
              <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                <div 
                  className="flex items-start justify-between gap-3 cursor-pointer"
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  <div className="flex items-start gap-2.5">
                    {log.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : log.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{log.action}</span>
                        {log.orderId && (
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-sm">
                            {log.orderId}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          [{log.type}]
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 text-[11px]">{log.details}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-slate-400 text-[11px]">{formatDate(log.createdAt)}</span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Payload Viewer */}
                {isExpanded && log.payload && (
                  <div className="mt-3 pt-3 border-t border-slate-100 animate-in fade-in duration-150">
                    <span className="font-bold text-slate-700 text-[10px] uppercase tracking-wider block mb-1">
                      Payload / Detalles JSON:
                    </span>
                    <pre className="bg-slate-900 text-slate-200 p-3 rounded-xl font-mono text-[11px] overflow-x-auto">
                      {JSON.stringify(log.payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
