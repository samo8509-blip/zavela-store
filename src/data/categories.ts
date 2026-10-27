import { Request, Response } from 'express';
import pool from '../config/db'; // Asegúrate de que esta sea la ruta a tu pool de MySQL2
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// OBTENER TODAS LAS CATEGORÍAS (GET)
export const getCategories = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM categorias ORDER BY `order` ASC');
    
    // Parseo seguro de la columna JSON a formato nativo
    const categories = rows.map(cat => ({
      ...cat,
      active: Boolean(cat.active), // Convierte 1/0 de MySQL a true/false
      subcategories: typeof cat.subcategories === 'string' 
        ? JSON.parse(cat.subcategories || '[]') 
        : (cat.subcategories || [])
    }));

    return res.status(200).json(categories);
  } catch (error) {
    console.error('[Categorías GET] Error interno:', error);
    return res.status(500).json({ error: 'Error del servidor al cargar las categorías.' });
  }
};

// CREAR O ACTUALIZAR CATEGORÍA (POST / PUT)
export const saveCategory = async (req: Request, res: Response) => {
  try {
    const { id, name, slug, active, icon, description, order, subcategories } = req.body;
    
    // 1. Validación de seguridad obligatoria
    if (!id || !name || !slug) {
      return res.status(400).json({ error: 'Faltan campos obligatorios (id, name, slug).' });
    }

    // 2. Blindaje del campo subcategories (garantiza que siempre sea un array válido)
    const safeSubcategories = Array.isArray(subcategories) ? subcategories : [];
    const subcategoriesJson = JSON.stringify(safeSubcategories);

    const query = `
      INSERT INTO categorias (id, name, slug, active, icon, description, \`order\`, subcategories) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        slug = VALUES(slug),
        active = VALUES(active),
        icon = VALUES(icon),
        description = VALUES(description),
        \`order\` = VALUES(\`order\`),
        subcategories = VALUES(subcategories)
    `;

    const [result] = await pool.query<ResultSetHeader>(query, [
      id, 
      name, 
      slug, 
      active ? 1 : 0, 
      icon || 'Folder', 
      description || '', 
      order || 0, 
      subcategoriesJson
    ]);

    return res.status(200).json({ 
      success: true, 
      message: 'Categoría guardada correctamente.',
      affectedRows: result.affectedRows 
    });
  } catch (error) {
    console.error('[Categorías POST/PUT] Error interno:', error);
    return res.status(500).json({ error: 'Fallo crítico al guardar la categoría en la base de datos.' });
  }
};

// BORRADO MÚLTIPLE O INDIVIDUAL (DELETE)
export const deleteCategories = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    const singleId = req.params.id;

    // 1. Consolidar los IDs en un solo array seguro
    let idsToDelete: string[] = [];
    if (Array.isArray(ids) && ids.length > 0) {
      idsToDelete = ids;
    } else if (singleId) {
      idsToDelete = [singleId];
    }

    // 2. Validar que realmente hay algo que borrar
    if (idsToDelete.length === 0) {
      return res.status(400).json({ error: 'No se enviaron IDs válidos para eliminar.' });
    }

    // 3. Generar la consulta SQL dinámica de forma segura contra Inyección SQL
    const placeholders = idsToDelete.map(() => '?').join(',');
    const query = `DELETE FROM categorias WHERE id IN (${placeholders})`;

    const [result] = await pool.query<ResultSetHeader>(query, idsToDelete);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Ninguna categoría coincidió con los IDs proporcionados.' });
    }

    return res.status(200).json({ 
      success: true, 
      message: `Se eliminaron ${result.affectedRows} categorías correctamente.` 
    });
  } catch (error) {
    console.error('[Categorías DELETE] Error interno:', error);
    return res.status(500).json({ error: 'Fallo al procesar la eliminación múltiple.' });
  }
};
