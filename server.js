const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const db = require('./db');


// TEST
app.get('/test', (req, res) => {
  res.json({ mensaje: "API funcionando" });
});


// LOGIN
app.post('/login', (req, res) => {
  let { usuario, contrasena } = req.body;

  usuario = usuario.trim();
  contrasena = contrasena.trim();

  const sql = `SELECT * FROM Usuario WHERE nombre_usuario = ?`;

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

    // ✅ Actualizar última sesión
    db.query('UPDATE Usuario SET ultima_sesion = NOW() WHERE id_usuario = ?', [user.id_usuario]);

    res.json({
      success: true,
      user: {
        id: user.id_usuario,
        usuario: user.nombre_usuario,
        nombre: user.nombre_completo,
        edad: user.edad,
        genero: user.genero,
        alcaldia: user.alcaldia,
        actividad: user.actividad
      }
    });
  });
});


// REGISTER
app.post('/register', (req, res) => {
  let { usuario, contrasena, nombre_completo, edad, genero, alcaldia, actividad } = req.body;

  usuario = usuario.trim();
  contrasena = contrasena.trim();
  nombre_completo = nombre_completo?.trim() || "";
  alcaldia = alcaldia?.trim() || "";
  actividad = actividad?.trim() || "";

  const sql = `
    INSERT INTO Usuario 
    (nombre_usuario, contrasena, nombre_completo, edad, genero, alcaldia, actividad, personaje_seleccionado, fondo_seleccionado)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 7)
  `;

  db.query(sql, [usuario, contrasena, nombre_completo, edad, genero, alcaldia, actividad], (err, result) => {
    if (err) {
      console.error("ERROR:", err);
      return res.status(500).json(err);
    }
    res.json({ success: true });
  });
});


// GET /tienda/:id_usuario
app.get('/tienda/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const sql = `
    SELECT 
      t.id_item,
      t.nombre_item AS nombre,
      t.descripcion,
      t.precio,
      t.tipo,
      CASE WHEN i.id_item IS NOT NULL THEN 1 ELSE 0 END AS comprado
    FROM Tienda t
    LEFT JOIN InventarioUsuario i 
      ON t.id_item = i.id_item AND i.id_usuario = ?
    WHERE t.disponibilidad = 1
  `;

  db.query(sql, [id_usuario], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, items: result });
  });
});


// GET /monedas/:id_usuario
app.get('/monedas/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  db.query('SELECT monedas FROM Usuario WHERE id_usuario = ?', [id_usuario], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.json({ success: false, message: "Usuario no encontrado" });
    res.json({ success: true, monedas: result[0].monedas });
  });
});


// POST /comprar
app.post('/comprar', (req, res) => {
  const { id_usuario, id_item } = req.body;

  db.query('SELECT * FROM InventarioUsuario WHERE id_usuario = ? AND id_item = ?', [id_usuario, id_item], (err, yaComprado) => {
    if (err) return res.status(500).json(err);
    if (yaComprado.length > 0)
      return res.json({ success: false, message: "Ya tienes este item" });

    db.query('SELECT precio FROM Tienda WHERE id_item = ?', [id_item], (err, itemResult) => {
      if (err) return res.status(500).json(err);
      if (itemResult.length === 0)
        return res.json({ success: false, message: "Item no encontrado" });

      const precio = itemResult[0].precio;

      db.query('SELECT monedas FROM Usuario WHERE id_usuario = ?', [id_usuario], (err, userResult) => {
        if (err) return res.status(500).json(err);

        const monedas = userResult[0].monedas;

        if (monedas < precio)
          return res.json({ success: false, message: "Monedas insuficientes" });

        db.query('UPDATE Usuario SET monedas = monedas - ? WHERE id_usuario = ?', [precio, id_usuario], (err) => {
          if (err) return res.status(500).json(err);

          db.query('INSERT INTO InventarioUsuario (id_usuario, id_item) VALUES (?, ?)', [id_usuario, id_item], (err) => {
            if (err) return res.status(500).json(err);

            db.query('INSERT INTO Transacciones (id_usuario, id_item, monedas_gastadas) VALUES (?, ?, ?)', [id_usuario, id_item, precio], (err) => {
              if (err) return res.status(500).json(err);
              res.json({ success: true, message: "Compra exitosa", monedas_restantes: monedas - precio });
            });
          });
        });
      });
    });
  });
});


// GET /seleccion/:id_usuario
app.get('/seleccion/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;
  db.query('SELECT personaje_seleccionado, fondo_seleccionado FROM Usuario WHERE id_usuario = ?', [id_usuario], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.json({ success: false });
    res.json({ success: true, ...result[0] });
  });
});


// POST /seleccion
app.post('/seleccion', (req, res) => {
  const { id_usuario, tipo, id_item } = req.body;
  const campo = tipo === 'personaje' ? 'personaje_seleccionado' : 'fondo_seleccionado';

  db.query(`UPDATE Usuario SET ${campo} = ? WHERE id_usuario = ?`, [id_item, id_usuario], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true });
  });
});


// GET /perfil/:id_usuario
app.get('/perfil/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  db.query('SELECT nombre_usuario, nombre_completo, edad, genero, alcaldia, actividad FROM Usuario WHERE id_usuario = ?', [id_usuario], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.json({ success: false });
    res.json({ success: true, ...result[0] });
  });
});


// POST /sumar-monedas
app.post('/sumar-monedas', (req, res) => {
  const { id_usuario, cantidad } = req.body;

  db.query('UPDATE Usuario SET monedas = monedas + ? WHERE id_usuario = ?', [cantidad, id_usuario], (err) => {
    if (err) return res.status(500).json(err);

    db.query('SELECT monedas FROM Usuario WHERE id_usuario = ?', [id_usuario], (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true, monedas: result[0].monedas });
    });
  });
});


// GET /logros/:id_usuario
app.get('/logros/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const sql = `
    SELECT 
      l.id_logro,
      l.nombre,
      l.descripcion,
      l.icono,
      IF(lu.id IS NOT NULL, 1, 0) AS desbloqueado,
      IFNULL(lu.reclamado, 0) AS reclamado,
      lu.fecha_obtenido
    FROM Logros l
    LEFT JOIN LogrosUsuario lu 
      ON l.id_logro = lu.id_logro AND lu.id_usuario = ?
    ORDER BY l.id_logro
  `;

  db.query(sql, [id_usuario], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, logros: result });
  });
});


// POST /logros/desbloquear
app.post('/logros/desbloquear', (req, res) => {
  const { id_usuario, id_logro } = req.body;

  db.query('SELECT id FROM LogrosUsuario WHERE id_usuario = ? AND id_logro = ?', [id_usuario, id_logro], (err, existe) => {
    if (err) return res.status(500).json(err);
    if (existe.length > 0)
      return res.json({ success: false, message: 'Logro ya desbloqueado' });

    db.query('INSERT INTO LogrosUsuario (id_usuario, id_logro) VALUES (?, ?)', [id_usuario, id_logro], (err) => {
      if (err) return res.status(500).json(err);
      res.json({ success: true, message: 'Logro desbloqueado' });
    });
  });
});


// POST /logros/reclamar
app.post('/logros/reclamar', (req, res) => {
  const { id_usuario, id_logro } = req.body;

  db.query('UPDATE LogrosUsuario SET reclamado = 1 WHERE id_usuario = ? AND id_logro = ?', [id_usuario, id_logro], (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});


// POST /progreso/guardar
app.post('/progreso/guardar', (req, res) => {
  const { id_usuario, id_nivel, tipo, estrellas } = req.body;

  db.query(
    `INSERT INTO Progreso (id_usuario, id_nivel, completado, tipo, estrellas) 
     VALUES (?, ?, 1, ?, ?)
     ON DUPLICATE KEY UPDATE 
     completado = 1,
     estrellas = GREATEST(estrellas, ?)`,
    [id_usuario, id_nivel, tipo, estrellas || 0, estrellas || 0],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, affectedRows: result.affectedRows });
    }
  );
});


// GET /progreso/:id_usuario
app.get('/progreso/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  db.query(
    `SELECT tipo, COUNT(*) as completados 
     FROM Progreso 
     WHERE id_usuario = ? AND completado = 1 
     GROUP BY tipo`,
    [id_usuario],
    (err, niveles) => {
      if (err) return res.status(500).json(err);

      db.query('SELECT COUNT(*) as comprados FROM InventarioUsuario WHERE id_usuario = ?', [id_usuario], (err, tienda) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true, niveles: niveles, items_comprados: tienda[0].comprados });
      });
    }
  );
});


// GET /estrellas/:id_usuario/:tipo
app.get('/estrellas/:id_usuario/:tipo', (req, res) => {
  const { id_usuario, tipo } = req.params;

  db.query(
    'SELECT id_nivel, estrellas FROM Progreso WHERE id_usuario = ? AND tipo = ? AND completado = 1',
    [id_usuario, tipo],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json({ success: true, niveles: result });
    }
  );
});


// GET /temas-desbloqueados/:id_usuario
app.get('/temas-desbloqueados/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  db.query(
    `SELECT tipo, COUNT(*) as niveles_3_estrellas
     FROM Progreso
     WHERE id_usuario = ? AND estrellas = 3 AND completado = 1
     GROUP BY tipo`,
    [id_usuario],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      let sumaCompleta = false;
      let restaCompleta = false;
      let multiCompleta = false;

      result.forEach(r => {
        if (r.tipo === 'suma' && r.niveles_3_estrellas >= 10) sumaCompleta = true;
        if (r.tipo === 'resta' && r.niveles_3_estrellas >= 10) restaCompleta = true;
        if (r.tipo === 'multiplicacion' && r.niveles_3_estrellas >= 10) multiCompleta = true;
      });

      res.json({
        success: true,
        desbloquear_multiplicacion: sumaCompleta && restaCompleta,
        desbloquear_division: multiCompleta
      });
    }
  );
});


// ✅ GET /dashboard — datos para el panel administrativo
app.get('/dashboard', (req, res) => {
  // Todos los usuarios
  db.query(
    `SELECT id_usuario, nombre_usuario, nombre_completo, edad, genero, 
            alcaldia, monedas, ultima_sesion, actividad 
     FROM Usuario ORDER BY monedas DESC`,
    (err, usuarios) => {
      if (err) return res.status(500).json(err);

      // Progreso por tema por usuario
      db.query(
        `SELECT id_usuario, tipo, 
                COUNT(*) as niveles_completados,
                ROUND(AVG(estrellas), 1) as promedio_estrellas,
                SUM(CASE WHEN estrellas = 3 THEN 1 ELSE 0 END) as niveles_perfectos
         FROM Progreso 
         WHERE completado = 1 
         GROUP BY id_usuario, tipo`,
        (err, progreso) => {
          if (err) return res.status(500).json(err);

          // Logros por usuario
          db.query(
            `SELECT id_usuario, COUNT(*) as logros_desbloqueados 
             FROM LogrosUsuario 
             GROUP BY id_usuario`,
            (err, logros) => {
              if (err) return res.status(500).json(err);

              // Stats globales
              db.query(
                `SELECT 
                   COUNT(DISTINCT id_usuario) as total_alumnos,
                   ROUND(AVG(estrellas), 1) as promedio_estrellas_global
                 FROM Progreso WHERE completado = 1`,
                (err, stats) => {
                  if (err) return res.status(500).json(err);

                  // Top 5 por estrellas
                  db.query(
                    `SELECT u.nombre_usuario, u.nombre_completo,
                            ROUND(AVG(p.estrellas), 1) AS avg_estrellas,
                            COUNT(p.id_progreso) as niveles_completados
                     FROM Usuario u
                     JOIN Progreso p ON u.id_usuario = p.id_usuario
                     WHERE p.completado = 1
                     GROUP BY u.id_usuario
                     ORDER BY avg_estrellas DESC
                     LIMIT 5`,
                    (err, top5) => {
                      if (err) return res.status(500).json(err);

                      res.json({
                        success: true,
                        usuarios,
                        progreso,
                        logros,
                        stats: stats[0],
                        top5
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});


// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});