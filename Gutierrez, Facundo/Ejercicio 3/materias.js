import { body, param, validationResult } from "express-validator";
import express from "express";
import { db } from "./db.js";

const router = express.Router();

// Validaciones
const validarMateria = [
  body("nombre", "Nombre de materia debe tener entre 3 y 100 caracteres")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 }),
];

const validarID = param("id").isInt({ min: 1 });

const verificarValidaciones = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errores: errors.array() });
  }
  next();
};

// Listar materias
router.get("/", async (req, res) => {
  const [rows] = await db.execute("SELECT * FROM materias ORDER BY nombre");
  res.json({ success: true, data: rows });
});

// Obtener materia por ID
router.get("/:id", validarID, verificarValidaciones, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await db.execute("SELECT * FROM materias WHERE id = ?", [id]);

  if (rows.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Materia no encontrada" });
  }

  res.json({ success: true, data: rows[0] });
});

// Obtener todos los alumnos de una materia específica
router.get(
  "/:id/alumnos",
  validarID,
  verificarValidaciones,
  async (req, res) => {
    const id = Number(req.params.id);

    // Verificar que la materia existe
    const [materia] = await db.execute("SELECT * FROM materias WHERE id = ?", [
      id,
    ]);
    if (materia.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Materia no encontrada" });
    }

    let sql =
      "SELECT a.id, a.nombre, a.nota1, a.nota2, a.nota3, a.promedio " +
      "FROM alumnos a " +
      "WHERE a.materia_id = ? " +
      "ORDER BY a.nombre";

    const [rows] = await db.execute(sql, [id]);
    res.json({
      success: true,
      materia: materia[0],
      data: rows,
    });
  }
);

// Crear materia
router.post("/", validarMateria, verificarValidaciones, async (req, res) => {
  const { nombre } = req.body;

  const [result] = await db.execute(
    "INSERT INTO materias (nombre) VALUES (?) ",
    [nombre]
  );

  res.status(201).json({
    success: true,
    data: { id: result.insertId, nombre },
  });
});

// Actualizar materia
router.put(
  "/:id",
  [validarID, ...validarMateria],
  verificarValidaciones,
  async (req, res) => {
    const id = Number(req.params.id);
    const { nombre } = req.body;

    const [result] = await db.execute(
      "UPDATE materias SET nombre = ? WHERE id = ?",
      [nombre, id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Materia no encontrada" });
    }

    res.json({
      success: true,
      data: { id, nombre },
    });
  }
);

// Eliminar materia
router.delete("/:id", validarID, verificarValidaciones, async (req, res) => {
  const id = Number(req.params.id);

  const [result] = await db.execute("DELETE FROM materias WHERE id = ?", [id]);

  if (result.affectedRows === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Materia no encontrada" });
  }

  res.json({ success: true, message: "Materia eliminada" });
});

export default router;
