import express from "express";
import { conectarDB } from "./db.js";
import alumnosRouter from "./alumnos.js";
import materiasRouter from "./materias.js";

conectarDB();

const app = express();
const port = 3000;

// para interpretar body como json
app.use(express.json());

app.get("/", (req, res) => {
  // Respuesta con String
  res.send("Hola mundo!");
});

app.use("/alumnos", alumnosRouter);
app.use("/materias", materiasRouter);

app.listen(port, () => {
  console.log(`La aplicacion esta funcionando ${port}`);
});
