import { body, param, validationResult } from "express-validator";
import express from "express";
import { db } from "./db.js";

const router = express.Router();

// Funciones auxiliares para cálculos
const calcularPerimetro = (base, altura) => {
  return 2 * (parseFloat(base) + parseFloat(altura));
};

const calcularSuperficie = (base, altura) => {
  return parseFloat(base) * parseFloat(altura);
};

// Validaciones
const validarID = param("id").isInt({ min: 1 });

const validarRectangulo = [
  body("base", "Base invalida")
    .notEmpty()
    .isFloat({ min: 0.01 })
    .withMessage("La base debe ser un numero positivo mayor a 0"),
  body("altura", "Altura invalida")
    .notEmpty()
    .isFloat({ min: 0.01 })
    .withMessage("La altura debe ser un numero positivo mayor a 0"),
];

const verificarValidaciones = (req, res, next) => {
  const validacion = validationResult(req);
  if (!validacion.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, errores: validacion.array() });
  }
  next();
};

// GET para obtener todos los rectángulos
router.get("/", async (req, res) => {
  const sql = "SELECT * FROM rectangulos ORDER BY id ";
  const [rows] = await db.execute(sql);

  res.json({
    success: true,
    data: rows,
    total: rows.length,
  });
});

// GET para obtener detalle de rectángulo
router.get("/:id", validarID, verificarValidaciones, async (req, res) => {
  const id = Number(req.params.id);

  const [rows] = await db.execute("SELECT * FROM rectangulos WHERE id=?", [id]);

  if (rows.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Rectangulo no encontrado" });
  }

  res.json({ success: true, data: rows[0] });
});

// POST para crear rectangulo
router.post("/", validarRectangulo, verificarValidaciones, async (req, res) => {
  // extraigo del body las dimensiones del rectangulo
  const { base, altura } = req.body;

  // Calcular perimetro y superficie
  const perimetro = calcularPerimetro(base, altura);
  const superficie = calcularSuperficie(base, altura);

  const [result] = await db.execute(
    "INSERT INTO rectangulos (base, altura, perimetro, superficie) VALUES (?,?,?,?)",
    [base, altura, perimetro, superficie]
  );

  console.log(result);

  res.status(201).json({
    success: true,
    data: {
      id: result.insertId,
      base,
      altura,
      perimetro,
      superficie,
    },
  });
});

// PUT para modificar rectangulo completo
router.put(
  "/:id",
  validarID,
  validarRectangulo,
  verificarValidaciones,
  async (req, res) => {
    // obtengo el id
    const id = Number(req.params.id);

    // Verificar si existe el rectangulo
    const [existe] = await db.execute("SELECT * FROM rectangulos WHERE id=?", [
      id,
    ]);

    if (existe.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Rectangulo no encontrado",
      });
    }

    // obtengo el body
    const { base, altura } = req.body;

    // Calcular nuevos valores
    const perimetro = calcularPerimetro(base, altura);
    const superficie = calcularSuperficie(base, altura);

    await db.execute(
      "UPDATE rectangulos SET base=?, altura=?, perimetro=?, superficie=? WHERE id=?",
      [base, altura, perimetro, superficie, id]
    );

    res.json({
      success: true,
      data: { id, base, altura, perimetro, superficie },
    });
  }
);

// DELETE para eliminar un rectangulo
router.delete("/:id", validarID, verificarValidaciones, async (req, res) => {
  // validar id
  const id = Number(req.params.id);

  // Verificar si existe el rectangulo antes de eliminarlo
  const [existe] = await db.execute("SELECT * FROM rectangulos WHERE id=?", [
    id,
  ]);

  if (existe.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Rectángulo no encontrado",
    });
  }

  await db.execute("DELETE FROM rectangulos WHERE id=?", [id]);

  res.json({
    success: true,
    data: existe[0],
  });
});

export default router;
