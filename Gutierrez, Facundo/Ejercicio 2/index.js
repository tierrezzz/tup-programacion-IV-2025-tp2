import express from "express";
import  {conectarDB} from "./db.js";
import tareasRouter from "./tareas.js"

conectarDB();

const app = express();
const port = 3000;


// para interpretar body como json
app.use(express.json());


app.get("/", (req, res) => {
  // Respuesta con String
  res.send("Hola mundo!");
});

app.use("/tareas", tareasRouter);

app.listen(port, () => {
  console.log(`La aplicacion esta funcionando ${port}`);
});