import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  LogIn,
  UserPlus,
  KeyRound,
  FileText
} from 'lucide-react';
import { 
  CustomerUser, 
  loginCustomer, 
  registerCustomer, 
  evaluatePasswordStrength 
} from '../utils/customerAuthManager.ts';
import { COLOMBIA_DEPARTMENTS } from '../data/colombiaGeo.ts';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: CustomerUser, message: string) => void;
  initialTab?: 'login' | 'register';
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'login'
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(initialTab);

  // Sync initialTab when opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialTab]);

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regDepartment, setRegDepartment] = useState('Bogotá D.C.');
  const [regCity, setRegCity] = useState('Bogotá D.C.');
  const [regAddress, setRegAddress] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [acceptHabeasData, setAcceptHabeasData] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password evaluation for registration
  const passwordStrength = evaluatePasswordStrength(regPassword);

  if (!isOpen) return null;

  const currentDept = COLOMBIA_DEPARTMENTS.find(d => d.name === regDepartment) || COLOMBIA_DEPARTMENTS[0];

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg('Por favor ingresa tu correo electrónico y tu contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginCustomer(loginEmail, loginPassword);
      if (res.success && res.user) {
        setSuccessMsg(`¡Bienvenido de nuevo, ${res.user.firstName || res.user.name}!`);
        setTimeout(() => {
          onSuccess(res.user!, `¡Bienvenido de nuevo, ${res.user!.firstName || res.user!.name}!`);
          onClose();
        }, 600);
      } else {
        setErrorMsg(res.error || 'Credenciales inválidas. Por favor verifica tus datos.');
      }
    } catch {
      setErrorMsg('Ocurrió un error inesperado al procesar el ingreso. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setLoginEmail('carlos.mendoza@gmail.com');
    setLoginPassword('Zavela2026!');
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await loginCustomer('carlos.mendoza@gmail.com', 'Zavela2026!');
      if (res.success && res.user) {
        setSuccessMsg('¡Ingreso como cliente verificado Carlos Mendoza!');
        setTimeout(() => {
          onSuccess(res.user!, '¡Bienvenido Carlos Mendoza!');
          onClose();
        }, 500);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!regName.trim()) {
      setErrorMsg('Por favor ingresa tu nombre completo.');
      return;
    }

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    const cleanPhone = regPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 7) {
      setErrorMsg('Por favor ingresa un teléfono o número de WhatsApp válido.');
      return;
    }

    if (!regCity.trim()) {
      setErrorMsg('Por favor selecciona o ingresa tu ciudad de entrega.');
      return;
    }

    if (!regAddress.trim()) {
      setErrorMsg('Por favor escribe tu dirección exacta de entrega.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!acceptHabeasData) {
      setErrorMsg('Debes aceptar la autorización de tratamiento de datos personales para continuar.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerCustomer({
        name: regName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        department: regDepartment,
        city: regCity.trim(),
        address: regAddress.trim(),
        password: regPassword,
        acceptTerms: true
      });

      if (res.success && res.user) {
        setSuccessMsg(`¡Cuenta creada con éxito! Bienvenido a Zavela Store, ${res.user.firstName}.`);
        setTimeout(() => {
          onSuccess(res.user!, `¡Cuenta creada exitosamente! Bienvenido, ${res.user!.firstName}.`);
          onClose();
        }, 700);
      } else {
        setErrorMsg(res.error || 'No se pudo crear la cuenta. Verifica los datos ingresados.');
      }
    } catch {
      setErrorMsg('Ocurrió un error al registrar la cuenta. Por favor intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col my-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-slate-950 via-[#0B1528] to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight flex items-center gap-2">
                <span>Mi Cuenta Zavela</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono border border-emerald-500/30">
                  Segura
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Accede a tus pedidos, guías de envío y compras en 1 clic
              </p>
            </div>
          </div>

          <button 
            id="close-customer-auth-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1.5">
          <button
            id="tab-login-btn"
            type="button"
            onClick={() => {
              setActiveTab('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <LogIn className={`w-4 h-4 ${activeTab === 'login' ? 'text-sky-600' : 'text-slate-400'}`} />
            <span>Iniciar Sesión</span>
          </button>

          <button
            id="tab-register-btn"
            type="button"
            onClick={() => {
              setActiveTab('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <UserPlus className={`w-4 h-4 ${activeTab === 'register' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {/* Error / Success Notifications */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="font-semibold">{successMsg}</p>
          </div>
        )}

        {/* TAB 1: INICIAR SESIÓN */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  id="customer-login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  required
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => alert('Para restablecer tu contraseña o verificar tus pedidos, puedes contactar a nuestro asesor oficial de WhatsApp.')}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <input
                  id="customer-login-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Tu contraseña personal"
                  required
                  className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-300 focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showLoginPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              id="customer-login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-500 hover:to-blue-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Iniciando sesión...' : 'Entrar a mi cuenta'}</span>
            </button>

            {/* Quick Demo Access Helper */}
            <div className="pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="text-xs text-slate-500 hover:text-sky-600 font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>¿Quieres probar rápido? <strong>Ingresar como cliente demo (Carlos Mendoza)</strong></span>
              </button>

              <p className="text-xs text-slate-500 text-center">
                ¿Aún no tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-sky-600 font-bold hover:underline cursor-pointer"
                >
                  Crear una cuenta gratis
                </button>
              </p>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTRARME / CREAR CUENTA */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-6 space-y-3.5 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Nombre y Apellido *
              </label>
              <div className="relative">
                <input
                  id="customer-reg-name"
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico *
                </label>
                <div className="relative">
                  <input
                    id="customer-reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="laura@ejemplo.com"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <input
                    id="customer-reg-phone"
                    type="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="310 123 4567"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            {/* Ubicación de Entrega */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Departamento *
                </label>
                <select
                  id="customer-reg-dept"
                  value={regDepartment}
                  onChange={(e) => {
                    const nextDept = e.target.value;
                    setRegDepartment(nextDept);
                    const found = COLOMBIA_DEPARTMENTS.find(d => d.name === nextDept);
                    if (found && found.cities.length > 0) {
                      setRegCity(found.cities[0]);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-300 focus:border-emerald-500 outline-none transition-all"
                >
                  {COLOMBIA_DEPARTMENTS.map(d => (
                    <option key={d.name} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Ciudad o Municipio *
                </label>
                <select
                  id="customer-reg-city"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-300 focus:border-emerald-500 outline-none transition-all"
                >
                  {currentDept.cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Dirección Exacta de Entrega *
              </label>
              <div className="relative">
                <input
                  id="customer-reg-address"
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Ej: Calle 45 # 23-10, Apto 302, Barrio Chapinero"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Esta dirección se precargará automáticamente en el checkout con pago contra entrega.
              </p>
            </div>

            {/* Contraseña con evaluador de seguridad */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Crear Contraseña *
              </label>
              <div className="relative">
                <input
                  id="customer-reg-password"
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full pl-9 pr-10 py-2 text-xs bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400 rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Indicador de seguridad */}
              {regPassword.length > 0 && (
                <div className="mt-2 space-y-1 animate-fadeIn">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Nivel de seguridad:</span>
                    <span className={`font-bold ${
                      passwordStrength.score >= 60 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`} 
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Casilla de verificación Habeas Data */}
            <div className="pt-2">
              <label className="flex items-start gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={acceptHabeasData}
                  onChange={(e) => setAcceptHabeasData(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                />
                <span className="text-[11px] text-slate-600 leading-tight">
                  Autorizo el tratamiento de mis datos personales de forma segura y confidencial para la gestión de mis compras y envíos contra entrega, conforme a la política de privacidad y Habeas Data.
                </span>
              </label>
            </div>

            <button
              id="customer-register-submit-btn"
              type="submit"
              disabled={isLoading || !acceptHabeasData}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-extrabold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isLoading ? 'Creando cuenta...' : 'Registrarme y Activar Cuenta'}</span>
            </button>

            <p className="text-xs text-slate-500 text-center pt-1">
              ¿Ya tienes una cuenta registrada?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-sky-600 font-bold hover:underline cursor-pointer"
              >
                Inicia sesión aquí
              </button>
            </p>
          </form>
        )}

        {/* Modal Footer Trust Badges */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold text-slate-700">Cifrado SSL 256 bits</span>
          </div>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600">Privacidad y Habeas Data Garantizada</span>
        </div>
      </div>
    </div>
  );
};
