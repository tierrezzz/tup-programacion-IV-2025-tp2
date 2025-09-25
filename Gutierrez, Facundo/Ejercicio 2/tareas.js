import { body, param, query, validationResult } from "express-validator";
import express from "express";
import { db } from "./db.js";

const router = express.Router();

// Validaciones
const validarTarea = [
  body("nombre", "Nombre invalido")
    .isString()
    .trim()
    .isLength({ min: 3, max: 100 }),
  body("completada", "Completada debe ser true o false").isBoolean(),
];

const validarID = param("id").isInt({ min: 1 });

const validarFiltro = [
  query("completada")
    .optional()
    .isBoolean()
    .withMessage("El filtro debe ser true o false"),
];

const verificarValidaciones = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errores: errors.array() });
  }
  next();
};

// Listado de tareas (con filtro ?completada=true/false)
router.get("/", validarFiltro, verificarValidaciones, async (req, res) => {
    let sql = "SELECT * FROM tareas ORDER BY id ";
    const params = [];
  
    if (req.query.completada !== undefined) {
      sql = "SELECT * FROM tareas WHERE completada = ? ORDER BY id";
      params.push(req.query.completada === "true" ? 1 : 0);
    }
  
    const [rows] = await db.execute(sql, params);
    res.json({ success: true, data: rows });
  });

// Crear tarea
router.post("/", validarTarea, verificarValidaciones, async (req, res) => {
  const { nombre, completada } = req.body;

  // Verificar si ya existe
  const [existe] = await db.execute("SELECT * FROM tareas WHERE nombre = ?", [
    nombre,
  ]);

  if (existe.length > 0) {
    return res
      .status(400)
      .json({ success: false, message: "Ya existe una tarea con ese nombre" });
  }

  const [result] = await db.execute(
    "INSERT INTO tareas (nombre, completada) VALUES (?, ?)",
    [nombre, completada ? 1 : 0]
  );

  res.status(201).json({
    success: true,
    data: { id: result.insertId, nombre, completada },
  });
});



// Detalle de una tarea por ID
router.get("/:id", validarID, verificarValidaciones, async (req, res) => {
  const id = Number(req.params.id);
  const [rows] = await db.execute("SELECT * FROM tareas WHERE id = ?", [id]);

  if (rows.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Tarea no encontrada" });
  }
  res.json({ success: true, data: rows[0] });
});

// Actualizar tarea
router.put("/:id", [validarID, ...validarTarea], verificarValidaciones, async (req, res) => {
  const id = Number(req.params.id);
  const { nombre, completada } = req.body;

  const [result] = await db.execute(
    "UPDATE tareas SET nombre = ?, completada = ? WHERE id = ?",
    [nombre, completada ? 1 : 0, id]
  );

  if (result.affectedRows === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Tarea no encontrada" });
  }

  res.json({ success: true, data: { id, nombre, completada } });
});

// Eliminar tarea
router.delete("/:id", validarID, verificarValidaciones, async (req, res) => {
  const id = Number(req.params.id);

  const [result] = await db.execute("DELETE FROM tareas WHERE id = ?", [id]);

  if (result.affectedRows === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Tarea no encontrada" });
  }

  res.json({ success: true, message: "Tarea eliminada" });
});

export default router
