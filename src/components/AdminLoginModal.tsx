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
import { getFirestoreSettings } from '../services/firestoreSettings.ts';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onAdvisorSuccess?: (advisor: Advisor) => void;
  defaultRole?: 'admin' | 'advisor';
}

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
    try { sessionStorage.removeItem('zavela_admin_token'); localStorage.removeItem('zavela_admin_token'); } catch {}
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
    try { sessionStorage.removeItem('zavela_advisor_token'); localStorage.removeItem('zavela_advisor_token'); } catch {}
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [mode, setMode] = useState<'login' | 'forgot' | 'reset'>('login');
  const [resetToken, setResetToken] = useState('');
  const [email, setEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [info, setInfo] = useState<string | null>(null);

  // Guarantee fields remain 100% blank upon opening with no browser autofill
  useEffect(() => {
    if (isOpen) {
      setRole(defaultRole);
      setUsername('');
      setPassword('');
      setIsReadOnly(true);
      setError(null);
      setInfo(null);
      setShowPassword(false);
      setMode('login');
      try {
        const t = new URLSearchParams(window.location.search).get('reset');
        if (t) { setResetToken(t); setRole('advisor'); setMode('reset'); }
      } catch {}
    }
  }, [isOpen, defaultRole]);

  const submitForgot = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setInfo(null); setIsLoading(true);
    try {
      const r = await fetch('/api/admin/advisors/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const j = await r.json().catch(() => ({}));
      setInfo(j.message || 'Si el correo está registrado, te enviamos un enlace.');
    } catch { setError('No se pudo conectar. Intenta de nuevo.'); }
    setIsLoading(false);
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setInfo(null); setIsLoading(true);
    try {
      const r = await fetch('/api/admin/advisors/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: resetToken, password: newPass }) });
      const j = await r.json().catch(() => ({}));
      if (j.success) {
        setInfo(j.message); setNewPass(''); setResetToken('');
        try { const u = new URL(window.location.href); u.searchParams.delete('reset'); window.history.replaceState({}, '', u.toString()); } catch {}
        setMode('login');
      } else setError(j.message || 'No se pudo cambiar la clave.');
    } catch { setError('No se pudo conectar. Intenta de nuevo.'); }
    setIsLoading(false);
  };

  const handleRoleChange = (newRole: 'admin' | 'advisor') => {
    setRole(newRole);
    setError(null);
    setUsername('');
    setPassword('');
    setIsReadOnly(true);
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
        // Autenticación oficial contra MySQL cPanel (tabla `usuarios_admin` y credenciales de respaldo env)
        const response = await fetch('/api/auth/admin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: cleanUser,
            password: cleanPass
          })
        });

        const data = await response.json().catch(() => null);

        if (response.ok && data?.success && data?.authenticated) {
          setAdminAuthenticated(rememberMe);
          if (data.token) {
            try {
              localStorage.setItem('zavela_admin_token', data.token);
              sessionStorage.setItem('zavela_admin_token', data.token);
            } catch {}
          }
          if (data.user) {
            try {
              localStorage.setItem('zavela_admin_user', JSON.stringify(data.user));
              sessionStorage.setItem('zavela_admin_user', JSON.stringify(data.user));
            } catch {}
          }
          setIsLoading(false);
          onSuccess();
        } else {
          setIsLoading(false);
          setError(data?.message || 'Usuario o contraseña de Master Admin incorrectos. Verifica tus credenciales.');
        }
      } else {
        // Validate Advisor credentials against backend
        const res = await fetch('/api/admin/advisors/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUser, password: cleanPass })
        });
        const json = await res.json().catch(() => null);

        if (!json) {
          setIsLoading(false);
          setError(`El servidor no respondió bien (código ${res.status}). Espera unos segundos e intenta de nuevo.`);
          return;
        }

        if (json.success && json.data) {
          const advisor: Advisor = json.data;
          if (json.token) {
            try {
              localStorage.setItem('zavela_advisor_token', json.token);
              sessionStorage.setItem('zavela_advisor_token', json.token);
            } catch {}
          }
          setAdvisorAuthenticated(advisor, rememberMe);
          setIsLoading(false);
          if (onAdvisorSuccess) {
            onAdvisorSuccess(advisor);
          } else {
            onSuccess();
          }
        } else {
          setIsLoading(false);
          setError(json.message || `No se pudo ingresar (código ${res.status}).`);
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

        {mode === 'login' ? (
        <>
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
            <span>Asesor / Contabilidad</span>
          </button>
        </div>

        {info && mode === 'login' && <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-300 text-xs">{info}</div>}
        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-600/60 text-rose-300 text-xs flex items-start gap-2.5 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Hidden dummy fields to prevent aggressive browser password autofill */}
          <input type="text" name="admin_fake_username_dummy" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="off" />
          <input type="password" name="admin_fake_password_dummy" className="hidden" tabIndex={-1} aria-hidden="true" autoComplete="off" />
          
          {/* Username Field */}
          <div>
            <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider font-mono">
              {role === 'admin' ? 'Usuario de Administrador' : 'Correo (asesor o contabilidad)'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="admin-login-username"
                name="admin_login_username_field"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === 'admin' ? 'Ingresa tu usuario...' : 'Ingresa tu correo...'}
                required
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                readOnly={isReadOnly}
                onFocus={() => setIsReadOnly(false)}
                onClick={() => setIsReadOnly(false)}
                data-lpignore="true"
                className="w-full pl-10 pr-4 py-2.5 bg-[#0E1838] border border-[#2A3A60] focus:border-[#48CAE4] focus:ring-2 focus:ring-[#48CAE4]/20 rounded-xl text-sm text-white placeholder:text-slate-500 outline-hidden transition-all"
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
                id="admin-login-password"
                name="admin_login_password_field"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña..."
                required
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                readOnly={isReadOnly}
                onFocus={() => setIsReadOnly(false)}
                onClick={() => setIsReadOnly(false)}
                data-lpignore="true"
                className="w-full pl-10 pr-11 py-2.5 bg-[#0E1838] border border-[#2A3A60] focus:border-[#48CAE4] focus:ring-2 focus:ring-[#48CAE4]/20 rounded-xl text-sm text-white placeholder:text-slate-500 outline-hidden transition-all"
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

            {role === 'advisor' ? (
              <button type="button" onClick={() => { setMode('forgot'); setError(null); setInfo(null); }} className="text-[11px] text-[#48CAE4] hover:text-white underline cursor-pointer">¿Olvidaste tu clave?</button>
            ) : role === 'admin' ? (
              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                <Terminal className="w-3 h-3 text-[#48CAE4]" />
                <span>Acceso Seguro Master</span>
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
        </>
        ) : (
          <form onSubmit={mode === 'forgot' ? submitForgot : submitReset} className="space-y-4">
            {error && <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/60 text-rose-300 text-xs">{error}</div>}
            {info && <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/60 text-emerald-300 text-xs">{info}</div>}
            <p className="text-xs text-slate-300">
              {mode === 'forgot' ? 'Escribe el correo con el que te registraron y te enviaremos un enlace para crear una clave nueva.' : 'Crea tu clave nueva (mínimo 6 caracteres).'}
            </p>
            {mode === 'forgot' ? (
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com"
                className="w-full px-4 py-2.5 bg-[#0E1838] border border-[#2A3A60] focus:border-[#48CAE4] rounded-xl text-sm text-white placeholder:text-slate-500 outline-hidden" />
            ) : (
              <input type="password" required minLength={6} value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Clave nueva" autoComplete="new-password"
                className="w-full px-4 py-2.5 bg-[#0E1838] border border-[#2A3A60] focus:border-[#48CAE4] rounded-xl text-sm text-white placeholder:text-slate-500 outline-hidden" />
            )}
            <button type="submit" disabled={isLoading} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF5A36] to-[#FF3366] text-white font-black text-sm uppercase tracking-wider disabled:opacity-50 cursor-pointer">
              {isLoading ? 'Enviando...' : mode === 'forgot' ? 'Enviar enlace' : 'Guardar clave nueva'}
            </button>
            <button type="button" onClick={() => { setMode('login'); setError(null); setInfo(null); }} className="w-full text-xs text-slate-300 hover:text-white underline cursor-pointer">Volver a iniciar sesión</button>
          </form>
        )}

        {/* Security badge at bottom */}
        <div className="mt-6 pt-4 border-t border-[#243356] flex items-center justify-center gap-2 text-[10px] font-mono text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sistema Seguro • Zavela Store Colombia</span>
        </div>
      </div>
    </div>
  );
};
