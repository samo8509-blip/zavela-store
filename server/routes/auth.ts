import { Router } from 'express';
import { signAdminToken, verifyAdminToken } from '../middleware/apiGuard.ts';
import crypto from 'crypto';
import { pool } from '../mysqlPool.ts';
import { clientIp } from '../services/publicOrder.ts';

export const authRouter = Router();
const loginHits = new Map<string, number[]>();

// ── Contraseñas del administrador ────────────────────────────────────────────
// Formato seguro: scrypt$<sal>$<hash> (con sal propia). Las claves viejas (texto plano, MD5 o SHA-256 sin sal)
// se siguen aceptando solo para no dejarte fuera, y se convierten solas a scrypt en el primer inicio de sesión correcto.
const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const isScrypt = (v: string) => typeof v === 'string' && v.startsWith('scrypt$');
function hashAdminPassword(plain: string): string {
  const salt = crypto.randomBytes(12).toString('hex'); // 24 caracteres: cabe en columnas de 100
  return `scrypt$${salt}$${crypto.scryptSync(plain, salt, 32).toString('hex')}`;
}
function verifyPassword(inputPass: string, storedPass: string): { ok: boolean; legacy: boolean } {
  if (!inputPass || !storedPass) return { ok: false, legacy: false };
  if (isScrypt(storedPass)) {
    const [, salt, hash] = storedPass.split('$');
    if (!salt || !hash) return { ok: false, legacy: false };
    const test = crypto.scryptSync(inputPass, salt, 32).toString('hex');
    return { ok: safeEqual(test, hash.toLowerCase()), legacy: false };
  }
  const sha256 = crypto.createHash('sha256').update(inputPass).digest('hex');
  const md5 = crypto.createHash('md5').update(inputPass).digest('hex');
  const ok = safeEqual(inputPass, storedPass) || safeEqual(sha256, storedPass.toLowerCase()) || safeEqual(md5, storedPass.toLowerCase());
  return { ok, legacy: ok };
}
async function upgradeToScrypt(userId: any, plain: string) {
  try {
    // La columna puede ser corta (VARCHAR(50) en instalaciones viejas): se ensancha una vez y se guarda el hash seguro
    try { await pool.query('ALTER TABLE usuarios_admin MODIFY password VARCHAR(255) NOT NULL'); } catch {}
    await pool.query('UPDATE usuarios_admin SET password = ? WHERE id = ?', [hashAdminPassword(plain), userId]);
    console.log('[Auth] Contraseña del administrador convertida a scrypt.');
  } catch (e: any) { console.warn('[Auth] No se pudo convertir la contraseña a scrypt:', e?.message); }
}

// Freno por cuenta (además del de IP): 6 fallos en 15 minutos bloquean esa cuenta 15 minutos.
const accountFails = new Map<string, number[]>();
const FAIL_WINDOW = 15 * 60 * 1000;
const failsFor = (id: string) => (accountFails.get(id) || []).filter(t => Date.now() - t < FAIL_WINDOW);

/**
 * POST /api/auth/admin-login
 * Autenticación persistente para el rol "Master Admin" en cPanel MySQL (tabla `usuarios_admin`)
 * con soporte para credenciales maestras de respaldo vía variables de entorno.
 */
authRouter.post(['/admin-login', '/login'], async (req, res) => {
  try {
  // Freno a intentos repetidos: 10 por IP cada 10 minutos.
  const ip = clientIp(req);
  const nowTs = Date.now();
  const hits = (loginHits.get(ip) || []).filter(t => nowTs - t < 10 * 60 * 1000);
  if (hits.length >= 10) {
    return res.status(429).json({ success: false, message: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' });
  }
  hits.push(nowTs);
  loginHits.set(ip, hits);
    const body = req.body || {};
    const rawIdentifier = body.identifier || body.username || body.email;
    const rawPassword = body.password;

    if (!rawIdentifier || typeof rawIdentifier !== 'string' || !rawIdentifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Por favor ingresa tu correo electrónico o nombre de usuario de Administrador.'
      });
    }

    if (!rawPassword || typeof rawPassword !== 'string' || !rawPassword.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Por favor ingresa tu contraseña.'
      });
    }

    const identifier = rawIdentifier.trim();
    const password = rawPassword.trim();
    const acctKey = identifier.toLowerCase();
    if (failsFor(acctKey).length >= 6) {
      return res.status(429).json({ success: false, message: 'Demasiados intentos con esta cuenta. Espera 15 minutos e inténtalo de nuevo.' });
    }

    // 1. Consulta en MySQL cPanel en la tabla `usuarios_admin`
    try {
      const [rows]: any = await pool.query(
        'SELECT id, nombre, email, password, rol FROM usuarios_admin WHERE (email = ? OR nombre = ?) AND activo = 1 LIMIT 1',
        [identifier, identifier]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const user = rows[0];
        const check = verifyPassword(password, user.password);
        const isPasswordCorrect = check.ok;

        if (isPasswordCorrect) {
          accountFails.delete(identifier.toLowerCase());
          if (check.legacy) upgradeToScrypt(user.id, password);
          const sessionToken = signAdminToken({ id: user.id, email: user.email });

          return res.json({
            success: true,
            authenticated: true,
            token: sessionToken,
            user: {
              id: user.id,
              nombre: user.nombre,
              email: user.email,
              rol: user.rol || 'master'
            },
            message: 'Autenticación exitosa en cPanel MySQL'
          });
        }
      }
    } catch (dbError: any) {
      console.warn('[cPanel MySQL Auth Warning]:', dbError.message);
    }

    // 2. Soporte para credenciales maestras de respaldo mediante variables de entorno del servidor
    const envEmail = process.env.ADMIN_EMAIL;
    const envPass = process.env.ADMIN_PASSWORD;

    if (envEmail && envPass) {
      const cleanIdent = identifier.toLowerCase();
      const cleanEnvEmail = envEmail.trim().toLowerCase();
      const isEmailMatch = cleanIdent === cleanEnvEmail;
      const isAliasMatch = cleanIdent === 'admin' || cleanIdent === 'master' || cleanIdent === 'sergio martinez';

      if ((isEmailMatch || isAliasMatch) && safeEqual(password, envPass.trim())) {
        accountFails.delete(acctKey);
        const sessionToken = signAdminToken({ id: 'env', email: envEmail.trim() });

        return res.json({
          success: true,
          authenticated: true,
          token: sessionToken,
          user: {
            id: 1,
            nombre: 'Master Admin',
            email: envEmail.trim(),
            rol: 'master'
          },
          message: 'Autenticación exitosa como Master Admin (Respaldo Env)'
        });
      }
    }

    // 3. Credenciales no válidas
    accountFails.set(acctKey, [...failsFor(acctKey), Date.now()]);
    return res.status(401).json({
      success: false,
      authenticated: false,
      message: 'Credenciales inválidas. Verifica tu correo/usuario y contraseña.'
    });
  } catch (error: any) {
    console.error('[Auth Controller Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno en el servidor de autenticación. Intenta nuevamente.'
    });
  }
});

/**
 * GET /api/auth/verify
 * Verifica si un token o sesión de administrador es válido
 */
authRouter.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.query.token as string);

  if (!token || !verifyAdminToken(token)) {
    return res.status(401).json({ success: false, authenticated: false, message: 'Sesión no válida o expirada' });
  }

  res.json({ success: true, authenticated: true, message: 'Sesión activa' });
});
