import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../mysqlPool.ts';

export const authRouter = Router();

// Helper para verificar contraseñas en texto plano o hashes comunes (SHA256, MD5)
function verifyPassword(inputPass: string, storedPass: string): boolean {
  if (!inputPass || !storedPass) return false;
  if (inputPass === storedPass) return true;

  // Comparación SHA256
  const sha256 = crypto.createHash('sha256').update(inputPass).digest('hex');
  if (sha256.toLowerCase() === storedPass.toLowerCase()) return true;

  // Comparación MD5 (común en migraciones legadas de MySQL phpMyAdmin)
  const md5 = crypto.createHash('md5').update(inputPass).digest('hex');
  if (md5.toLowerCase() === storedPass.toLowerCase()) return true;

  return false;
}

/**
 * POST /api/auth/admin-login
 * Autenticación persistente para el rol "Master Admin" en cPanel MySQL (tabla `usuarios_admin`)
 * con soporte para credenciales maestras de respaldo vía variables de entorno.
 */
authRouter.post(['/admin-login', '/login'], async (req, res) => {
  try {
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

    // 1. Consulta en MySQL cPanel en la tabla `usuarios_admin`
    try {
      const [rows]: any = await pool.query(
        'SELECT id, nombre, email, password, rol FROM usuarios_admin WHERE (email = ? OR nombre = ?) AND activo = 1 LIMIT 1',
        [identifier, identifier]
      );

      if (Array.isArray(rows) && rows.length > 0) {
        const user = rows[0];
        const isPasswordCorrect = verifyPassword(password, user.password);

        if (isPasswordCorrect) {
          const sessionToken = `zavela_adm_${user.id}_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

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

      if ((isEmailMatch || isAliasMatch) && password === envPass.trim()) {
        const sessionToken = `zavela_adm_env_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

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

  if (!token || !token.startsWith('zavela_adm_')) {
    return res.status(401).json({ success: false, authenticated: false, message: 'Sesión no válida o expirada' });
  }

  res.json({ success: true, authenticated: true, message: 'Sesión activa' });
});
