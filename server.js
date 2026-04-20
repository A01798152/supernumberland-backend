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


// 🔐 LOGIN
app.post('/login', (req, res) => {
  const { usuario, contrasena } = req.body;

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

    if (user.contrasena !== contrasena) {
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

  });
});


// 🎮 PREGUNTAS
app.get('/preguntas/:nivel', (req, res) => {
  const nivel = req.params.nivel;

  const sql = `
    SELECT p.id_pregunta, p.enunciado, r.id_respuesta, r.respuesta_texto, r.es_correcta
    FROM Preguntas p
    JOIN Respuestas r ON p.id_pregunta = r.id_pregunta
    WHERE p.id_nivel = ?
  `;

  db.query(sql, [nivel], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.json(result);
  });
});


// 🔥 REGISTER (CORREGIDO)
app.post('/register', (req, res) => {

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

  const sql = `
    INSERT INTO Usuario 
    (nombre_usuario, contrasena, nombre_completo, edad, genero, actividad, alcaldia)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    usuario,
    contrasena,
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

    console.log("✅ Usuario insertado correctamente");

    res.json({ success: true });
  });
});


// 🚀 SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});