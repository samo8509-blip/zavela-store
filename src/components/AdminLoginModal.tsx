import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Terminal,
  ShoppingBag,
  Users
} from 'lucide-react';
import { ZavelaLogo } from './ZavelaLogo.tsx';
import { Advisor } from '../types/index.ts';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAdvisorSuccess?: (advisor: Advisor) => void;
  defaultRole?: 'admin' | 'advisor';
}

export const ADMIN_USERNAME = 'Sergio Martinez';
export const ADMIN_PASSWORD = '@Seramo1985';
export const AUTH_STORAGE_KEY = 'zavela_admin_session';
export const ADVISOR_STORAGE_KEY = 'zavela_advisor_session';

export const checkIsAdminAuthenticated = (): boolean => {
  try {
    const sessionAuth = sessionStorage.getItem(AUTH_STORAGE_KEY);
    const localAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    return sessionAuth === 'authenticated' || localAuth === 'authenticated';
  } catch {
    return false;
  }
};

export const setAdminAuthenticated = (remember: boolean) => {
  try {
    sessionStorage.setItem(AUTH_STORAGE_KEY, 'authenticated');
    if (remember) {
      localStorage.setItem(AUTH_STORAGE_KEY, 'authenticated');
    }
  } catch (e) {
    console.error(e);
  }
};

export const clearAdminAuthentication = () => {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
};

// Advisor Session Helpers
export const getStoredAdvisor = (): Advisor | null => {
  try {
    const data = localStorage.getItem(ADVISOR_STORAGE_KEY) || sessionStorage.getItem(ADVISOR_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setAdvisorAuthenticated = (advisor: Advisor, remember: boolean = true) => {
  try {
    const raw = JSON.stringify(advisor);
    sessionStorage.setItem(ADVISOR_STORAGE_KEY, raw);
    if (remember) {
      localStorage.setItem(ADVISOR_STORAGE_KEY, raw);
    }
  } catch (e) {
    console.error(e);
  }
};

export const clearAdvisorAuthentication = () => {
  try {
    sessionStorage.removeItem(ADVISOR_STORAGE_KEY);
    localStorage.removeItem(ADVISOR_STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
};

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onAdvisorSuccess,
  defaultRole = 'admin'
}) => {
  const [role, setRole] = useState<'admin' | 'advisor'>(defaultRole);
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setRole(defaultRole);
      if (defaultRole === 'admin') {
        setUsername(ADMIN_USERNAME);
        setPassword(ADMIN_PASSWORD);
      } else {
        setUsername('juan');
        setPassword('juan123');
      }
      setError(null);
      setShowPassword(false);
    }
  }, [isOpen, defaultRole]);

  const handleRoleChange = (newRole: 'admin' | 'advisor') => {
    setRole(newRole);
    setError(null);
    if (newRole === 'admin') {
      setUsername(ADMIN_USERNAME);
      setPassword(ADMIN_PASSWORD);
    } else {
      setUsername('juan');
      setPassword('juan123');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setError('Por favor ingresa tu usuario y contraseña.');
      return;
    }

    setIsLoading(true);

    try {
      if (role === 'admin') {
        // Validate Master Admin credentials
        const isUserValid = cleanUser.toLowerCase() === ADMIN_USERNAME.toLowerCase();
        const isPassValid = cleanPass === ADMIN_PASSWORD;

        if (isUserValid && isPassValid) {
          setAdminAuthenticated(rememberMe);
          setIsLoading(false);
          onSuccess();
        } else {
          setIsLoading(false);
          setError('Usuario o contraseña de Administrador incorrectos. Verifica tus datos.');
        }
      } else {
        // Validate Advisor credentials against backend
        const res = await fetch('/api/admin/advisors/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password: cleanPass })
        });
        const json = await res.json();

        if (json.success && json.data) {
          const advisor: Advisor = json.data;
          setAdvisorAuthenticated(advisor, rememberMe);
          setIsLoading(false);
          if (onAdvisorSuccess) {
            onAdvisorSuccess(advisor);
          } else {
            onSuccess();
          }
        } else {
          setIsLoading(false);
          setError(json.message || 'Usuario o contraseña de asesor incorrectos.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setIsLoading(false);
      setError('Error de conexión con el servidor. Intenta de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md bg-[#1C2541] border border-[#2A3A60] rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.95)] text-white overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[#48CAE4]/20 to-[#FF5A36]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-[#FF5A36]/20 to-[#48CAE4]/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-300 hover:text-white p-1.5 rounded-full hover:bg-[#141F3D] transition-colors cursor-pointer border border-transparent hover:border-[#2A3A60]"
          title="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3 mb-5">
          <div className="flex items-center justify-center p-2 rounded-2xl bg-[#0E1838] border border-[#2A3A60] shadow-[0_0_25px_rgba(72,202,228,0.2)]">
            <ZavelaLogo size="lg" variant="icon-only" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Ingreso al Sistema
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xs">
              Selecciona tu tipo de perfil para acceder a <strong className="text-[#48CAE4]">Zavela Store</strong>.
            </p>
          </div>
        </div>

        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#0A1128] rounded-2xl border border-[#2A3A60] mb-5">
          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              role === 'admin'
                ? 'bg-gradient-to-r from-[#FF5A36] to-[#FF3366] text-white font-black shadow-[0_0_15px_rgba(255,90,54,0.35)]'
                : 'text-slate-300 hover:text-white hover:bg-[#141F3D]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Master Admin</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('advisor')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              role === 'advisor'
                ? 'bg-gradient-to-r from-[#FF5A36] to-[#FF3366] text-white font-black shadow-[0_0_15px_rgba(255,90,54,0.35)]'
                : 'text-slate-300 hover:text-white hover:bg-[#141F3D]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Asesor de Ventas</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-600/60 text-rose-300 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider font-mono">
              {role === 'admin' ? 'Usuario de Administrador' : 'Usuario o ID del Asesor'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === 'admin' ? 'Sergio Martinez' : 'Ej. juan o AS-001'}
                autoFocus
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#0E1838] border border-[#2A3A60] focus:border-[#48CAE4] focus:ring-2 focus:ring-[#48CAE4]/20 rounded-xl text-sm text-white placeholder:text-slate-400 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
                Contraseña
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full pl-10 pr-11 py-2.5 bg-[#0E1838] border border-[#2A3A60] focus:border-[#48CAE4] focus:ring-2 focus:ring-[#48CAE4]/20 rounded-xl text-sm text-white placeholder:text-slate-400 outline-hidden transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Credential Helpers for easy test */}
          {role === 'advisor' && (
            <div className="bg-[#0A1128] p-2.5 rounded-xl border border-[#2A3A60] text-[11px] text-slate-300 space-y-1">
              <span className="text-[10px] font-mono text-[#48CAE4] font-bold block uppercase">
                ⚡ Accesos de Asesores de prueba:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => { setUsername('juan'); setPassword('juan123'); }}
                  className="px-2 py-0.5 rounded-md bg-[#141F3D] hover:bg-[#FF5A36] hover:text-white text-[#48CAE4] border border-[#2A3A60] text-[10px] font-mono font-bold cursor-pointer transition-colors"
                >
                  Juan (juan / juan123)
                </button>
                <button
                  type="button"
                  onClick={() => { setUsername('valentina'); setPassword('valentina123'); }}
                  className="px-2 py-0.5 rounded-md bg-[#141F3D] hover:bg-[#FF5A36] hover:text-white text-[#48CAE4] border border-[#2A3A60] text-[10px] font-mono font-bold cursor-pointer transition-colors"
                >
                  Valentina (valentina / valentina123)
                </button>
              </div>
            </div>
          )}

          {/* Remember Session & Shortcut Info */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center gap-2 text-slate-300 hover:text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-sm bg-[#0E1838] border-[#2A3A60] text-[#FF5A36] focus:ring-[#FF5A36] focus:ring-offset-0"
              />
              <span>Recordar sesión</span>
            </label>

            {role === 'admin' ? (
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-[#48CAE4]" />
                Atajo: <strong className="text-[#48CAE4]">↑ ↓ ↑ ↑ 1985</strong>
              </span>
            ) : (
              <span className="text-[10px] font-mono text-emerald-400">
                Acceso Asesor Activo
              </span>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#FF5A36] to-[#FF3366] hover:from-[#FF4520] hover:to-[#FF1F58] text-white font-black text-sm uppercase tracking-wider shadow-[0_0_24px_rgba(255,90,54,0.45)] hover:shadow-[0_0_32px_rgba(255,90,54,0.65)] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>{role === 'admin' ? 'Ingresar a Administración Master' : 'Ingresar al Portal de Asesor'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security badge at bottom */}
        <div className="mt-6 pt-4 border-t border-[#243356] flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sistema Unificado Sergio Martínez • Zavela Store</span>
        </div>
      </div>
    </div>
  );
};
