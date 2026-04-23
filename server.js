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
    (nombre_usuario, contrasena, nombre_completo, edad, genero, alcaldia, actividad)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [
    usuario,
    contrasena,
    nombre_completo,
    edad,
    genero,
    alcaldia,
    actividad
  ], (err, result) => {
    if (err) {
      console.error("ERROR:", err);
      return res.status(500).json(err);
    }

    res.json({ success: true });
  });
});

// GET /tienda/:id_usuario - trae todos los items con si el usuario ya los tiene
app.get('/tienda/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  const sql = `
    SELECT 
      t.id_item,
      t.nombre_item,
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


// GET /monedas/:id_usuario - consulta monedas del usuario
app.get('/monedas/:id_usuario', (req, res) => {
  const { id_usuario } = req.params;

  db.query(
    'SELECT monedas FROM Usuario WHERE id_usuario = ?',
    [id_usuario],
    (err, result) => {
      if (err) return res.status(500).json(err);
      if (result.length === 0) return res.json({ success: false, message: "Usuario no encontrado" });
      res.json({ success: true, monedas: result[0].monedas });
    }
  );
});


// POST /comprar - descuenta monedas y registra la compra
app.post('/comprar', (req, res) => {
  const { id_usuario, id_item } = req.body;

  // 1. Verificar que no lo haya comprado ya
  db.query(
    'SELECT * FROM InventarioUsuario WHERE id_usuario = ? AND id_item = ?',
    [id_usuario, id_item],
    (err, yaComprado) => {
      if (err) return res.status(500).json(err);
      if (yaComprado.length > 0)
        return res.json({ success: false, message: "Ya tienes este item" });

      // 2. Obtener precio del item y monedas del usuario
      db.query(
        'SELECT precio FROM Tienda WHERE id_item = ?',
        [id_item],
        (err, itemResult) => {
          if (err) return res.status(500).json(err);
          if (itemResult.length === 0)
            return res.json({ success: false, message: "Item no encontrado" });

          const precio = itemResult[0].precio;

          db.query(
            'SELECT monedas FROM Usuario WHERE id_usuario = ?',
            [id_usuario],
            (err, userResult) => {
              if (err) return res.status(500).json(err);

              const monedas = userResult[0].monedas;

              // 3. Verificar monedas suficientes
              if (monedas < precio)
                return res.json({ success: false, message: "Monedas insuficientes" });

              // 4. Descontar monedas
              db.query(
                'UPDATE Usuario SET monedas = monedas - ? WHERE id_usuario = ?',
                [precio, id_usuario],
                (err) => {
                  if (err) return res.status(500).json(err);

                  // 5. Agregar al inventario
                  db.query(
                    'INSERT INTO InventarioUsuario (id_usuario, id_item) VALUES (?, ?)',
                    [id_usuario, id_item],
                    (err) => {
                      if (err) return res.status(500).json(err);

                      // 6. Registrar transacción
                      db.query(
                        'INSERT INTO Transacciones (id_usuario, id_item, monedas_gastadas) VALUES (?, ?, ?)',
                        [id_usuario, id_item, precio],
                        (err) => {
                          if (err) return res.status(500).json(err);

                          res.json({ 
                            success: true, 
                            message: "Compra exitosa",
                            monedas_restantes: monedas - precio
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
    }
  );
});


// SERVER
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});