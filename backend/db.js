const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'supernumberland-db.c4wm7o9edpvc.us-east-1.rds.amazonaws.com',
  user: 'admin',
  password: 'supernumberland6767',
  database: 'videojuego_matematico'
});

connection.connect(err => {
  if (err) {
    console.error('Error conectando a AWS:', err);
    return;
  }
  console.log('Conectado a AWS RDS 🚀');
});

module.exports = connection;