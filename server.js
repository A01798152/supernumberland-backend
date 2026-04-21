const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = require('./db');


// TEST
app.get('/test', (req, res) => {
  res.json({ mensaje: "API funcionando 🚀" });
});


// LOGIN
app.post('/login', (req, res) => {
  let { usuario, contrasena } = req.body;

  usuario = usuario.trim();
  contrasena = contrasena.trim();

  const sql = `
    SELECT * FROM Usuario 
    WHERE nombre_usuario = ?
  `;

  db.query(sql, [usuario], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      return res.json({ success: false, message: "Usuario no encontrado" });
    }

    const user = result[0];

    // COMPARACIÓN DIRECTA
    if (user.contrasena !== contrasena) {
      return res.json({ success: false, message: "Contraseña incorrecta" });
    }

    res.json({
      success: true,
      user: {
        id: user.id_usuario,
        usuario: user.nombre_usuario,
        nombre: user.nombre_completo,
        edad: user.edad,
        genero: user.genero
      }
    });
  });
});


// REGISTER
app.post('/register', (req, res) => {
  let { usuario, contrasena, nombre_completo, edad, genero } = req.body;

  usuario = usuario.trim();
  contrasena = contrasena.trim();

  const sql = `
    INSERT INTO Usuario (nombre_usuario, contrasena, nombre_completo, edad, genero)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [usuario, contrasena, nombre_completo, edad, genero], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    res.json({ success: true });
  });
});


// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});