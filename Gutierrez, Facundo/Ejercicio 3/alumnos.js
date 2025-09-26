import { body, param, query, validationResult } from "express-validator";
import express from "express";
import { db } from "./db.js";

const router = express.Router();

// Validaciones
const validarAlumno = [
  body("nombre", "Nombre debe tener entre 3 y 100 caracteres")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 }),
  body("materia_id", "ID de materia debe ser un numero entero positivo").isInt({
    min: 1,
  }),
  body("nota1", "Nota 1 debe ser un numero entre 0 y 10").isFloat({
    min: 0,
    max: 10,
  }),
  body("nota2", "Nota 2 debe ser un numero entre 0 y 10").isFloat({
    min: 0,
    max: 10,
  }),
  body("nota3", "Nota 3 debe ser un numero entre 0 y 10").isFloat({
    min: 0,
    max: 10,
  }),
];

const validarID = param("id").isInt({ min: 1 });

const validarFiltros = [
  query("materia_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("materia_id debe ser un numero entero positivo"),
  query("promedio_min")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("promedio_min debe ser entre 0 y 10"),
  query("promedio_max")
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage("promedio_max debe ser entre 0 y 10"),
];

const verificarValidaciones = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errores: errors.array() });
  }
  next();
};

// Crear alumno
router.post("/", validarAlumno, verificarValidaciones, async (req, res) => {
  const { nombre, materia_id, nota1, nota2, nota3 } = req.body;

  // Verificar que existe la materia
  const [materia] = await db.execute("SELECT id FROM materias WHERE id = ?", [
    materia_id,
  ]);
  if (materia.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "La materia no existe" });
  }
  // Verificar si ya existe un alumno con ese nombre en esa materia
  const [existe] = await db.execute(
    "SELECT * FROM alumnos WHERE nombre = ? AND materia_id = ?",
    [nombre, materia_id]
  );
  if (existe.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Ya existe otro alumno con ese nombre en esa materia",
    });
  }

  const [result] = await db.execute(
    "INSERT INTO alumnos (nombre, materia_id, nota1, nota2, nota3) VALUES (?, ?, ?, ?, ?)",
    [nombre, materia_id, nota1, nota2, nota3]
  );

  const promedio = ((nota1 + nota2 + nota3) / 3).toFixed(2);

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId,
      nombre,
      materia_id,
      nota1,
      nota2,
      nota3,
      promedio: parseFloat(promedio),
    },
  });
});

// Listar alumnos con filtros
router.get("/", validarFiltros, verificarValidaciones, async (req, res) => {
  let sql = `
    SELECT a.*, m.nombre as materia
    FROM alumnos a 
    INNER JOIN materias m ON a.materia_id = m.id
    WHERE 1=1
  `;
  const params = [];

  if (req.query.materia_id) {
    sql += " AND a.materia_id = ?";
    params.push(req.query.materia_id);
  }

  if (req.query.promedio_min) {
    sql += " AND a.promedio >= ?";
    params.push(req.query.promedio_min);
  }

  if (req.query.promedio_max) {
    sql += " AND a.promedio <= ?";
    params.push(req.query.promedio_max);
  }

  sql += " ORDER BY a.nombre, m.nombre";

  const [rows] = await db.execute(sql, params);
  res.json({ success: true, data: rows });
});

// Obtener alumno por ID
router.get("/:id", validarID, verificarValidaciones, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await db.execute(
    `
      SELECT a.*, m.nombre as materia
      FROM alumnos a 
      INNER JOIN materias m ON a.materia_id = m.id
      WHERE a.id = ?
    `,
    [id]
  );

  if (rows.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Alumno no encontrado" });
  }

  res.json({ success: true, data: rows[0] });
});

// Actualizar alumno
router.put(
  "/:id",
  [validarID, ...validarAlumno],
  verificarValidaciones,
  async (req, res) => {
    const id = Number(req.params.id);
    const { nombre, materia_id, nota1, nota2, nota3 } = req.body;

    // Verificar que existe la materia
    const [materia] = await db.execute("SELECT id FROM materias WHERE id = ?", [
      materia_id,
    ]);
    if (materia.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "La materia no existe" });
    }

    // Verificar si ya existe otro alumno con ese nombre en esa materia (excluyendo el actual)
    const [existe] = await db.execute(
      "SELECT * FROM alumnos WHERE nombre = ? AND materia_id = ? AND id != ?",
      [nombre, materia_id, id]
    );
    if (existe.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Ya existe otro alumno con ese nombre en esa materia",
      });
    }

    const [result] = await db.execute(
      "UPDATE alumnos SET nombre = ?, materia_id = ?, nota1 = ?, nota2 = ?, nota3 = ? WHERE id = ?",
      [nombre, materia_id, nota1, nota2, nota3, id]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Alumno no encontrado" });
    }

    const promedio = ((nota1 + nota2 + nota3) / 3).toFixed(2);

    res.json({
      success: true,
      data: {
        id,
        nombre,
        materia_id,
        nota1,
        nota2,
        nota3,
        promedio: parseFloat(promedio),
      },
    });
  }
);

// Eliminar alumno
router.delete("/:id", validarID, verificarValidaciones, async (req, res) => {
  const id = Number(req.params.id);

  const [result] = await db.execute("DELETE FROM alumnos WHERE id = ?", [id]);

  if (result.affectedRows === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Alumno no encontrado" });
  }

  res.json({ success: true, message: "Alumno eliminado" });
});

export default router;
