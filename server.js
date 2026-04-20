const bcrypt = require('bcrypt');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const db = require('./db');


// 🔥 TEST
app.get('/test', (req, res) => {
  res.json({ mensaje: "API funcionando 🚀" });
});


// 🔥 USUARIOS
app.get('/usuarios', (req, res) => {
  db.query('SELECT * FROM Usuario', (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
});


// 🔐 LOGIN (CON BCRYPT)
app.post('/login', async (req, res) => {
  const { usuario, contrasena } = req.body;

  console.log("🔐 LOGIN REQUEST:");
  console.log("Usuario:", usuario);
  console.log("Password:", "[" + contrasena + "]");

  const sql = `
    SELECT * FROM Usuario 
    WHERE nombre_usuario = ?
  `;

  db.query(sql, [usuario], async (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    if (result.length === 0) {
      console.log("❌ Usuario no encontrado");
      return res.json({ success: false, message: "Usuario no encontrado" });
    }

    const user = result[0];

    console.log("📦 HASH EN BD:", user.contrasena);

    try {
      const passwordCorrecta = await bcrypt.compare(contrasena, user.contrasena);

      console.log("🧪 RESULTADO BCRYPT:", passwordCorrecta);

      if (!passwordCorrecta) {
        return res.json({ success: false, message: "Contraseña incorrecta" });
      }

      console.log("✅ Login correcto");

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

    } catch (error) {
      console.error("❌ ERROR BCRYPT:", error);
      res.status(500).json({ success: false });
    }
  });
});


// 🔥 REGISTER (CORREGIDO)
app.post('/register', async (req, res) => {

  console.log("🔥 DATOS RECIBIDOS:", req.body);

  const {
    usuario,
    contrasena,
    nombre_completo,
    edad,
    genero,
    actividad,
    alcaldia
  } = req.body;

  try {
    // 🔐 ENCRIPTAR CONTRASEÑA
    const hashedPassword = await bcrypt.hash(contrasena.trim(), 10);

    const sql = `
      INSERT INTO Usuario 
      (nombre_usuario, contrasena, nombre_completo, edad, genero, actividad, alcaldia)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [
      usuario,
      hashedPassword, // 👈 AQUÍ CAMBIA
      nombre_completo,
      edad,
      genero,
      actividad,
      alcaldia
    ], (err, result) => {

      if (err) {
        console.error("❌ ERROR INSERT:", err);
        return res.status(500).json({ success: false });
      }

      console.log("✅ Usuario insertado con contraseña encriptada");

      res.json({ success: true });
    });

  } catch (error) {
    console.error("❌ ERROR HASH:", error);
    res.status(500).json({ success: false });
  }
});


// 🚀 SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
