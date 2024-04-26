const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;

app.use(session({
  secret: 'suaChaveSecreta',
  resave: false,
  saveUninitialized: true
}));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: 'espias'
});

db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log('Conectado ao banco de dados MySQL');
});

const authenticateUser = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else if (req.path === '/') {
    next(); 
  } else {
    res.redirect('/');
  }
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../frontend'));

app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/usuarios', authenticateUser, (req, res) => {
  const sql = 'SELECT * FROM usuarios';
  db.query(sql, (err, result) => {
    if (err) {
      res.status(500).send('Erro ao buscar usuários');
    } else {
      res.send(result);
    }
  });
});

app.get('/postagens', authenticateUser, (req, res) => {
  const sql = 'SELECT * FROM postagens';
  db.query(sql, (err, result) => {
    if (err) {
      res.status(500).send('Erro ao buscar postagens');
    } else {
      res.send(result);
    }
  });
});

app.post('/cadastro', (req, res) => {
  const { txtnome, txtemail, dtnasc, txtgenero, txtsenha } = req.body;
  const sql = `INSERT INTO usuarios (nome_usuario, email_usuario, data_nasc_usuario, genero_usuario, senha_usuario) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [txtnome, txtemail, dtnasc, txtgenero, txtsenha], (err, result) => {
    if (err) {
      console.error('Erro ao criar usuário:', err);
      res.status(500).send('Erro ao criar usuário');
    } else {
      console.log('Usuário criado com sucesso');
      res.redirect('/login');
    }
  });
});

app.post('/entrar', async (req, res) => {
  const { txtemail, txtsenha } = req.body;
  const sql = 'SELECT * FROM usuarios WHERE email_usuario = ? AND senha_usuario = ?';

  try {
    db.query(sql, [txtemail, txtsenha], (err, result) => {
      if (err) {
        console.error('Erro ao verificar o login:', err);
        res.redirect('/error');
      } else if (result.length === 0) {
        res.redirect('/error');
      } else {
        req.session.user = result[0];
        res.redirect('/home');
      }
    });
  } catch (error) {
    console.error('Erro ao verificar o login:', error);
    res.redirect('/error');
  }
});


app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get("/", authenticateUser, (req, res) => {
  res.sendFile(path.resolve('../frontend/home.html'));
});

app.get("/home", authenticateUser, (req, res) => {
  const sql = 'SELECT * FROM postagens';
  db.query(sql, (err, result) => {
    if (err) {
      res.status(500).send('Erro ao buscar postagens');
    } else {
      res.render('inicio', { postagens: result });
    }
  });
});

app.get("/notificacoes", authenticateUser, (req, res) => {
  res.sendFile(path.resolve('../frontend/notificacoes.html'));
});

app.get("/perfil", authenticateUser, (req, res) => {
  res.sendFile(path.resolve('../frontend/perfil.html'));
});

app.get("/editar", authenticateUser, (req, res) => {
  res.sendFile(path.resolve('../frontend/editar.html'));
});

app.get("/login", (req, res) => {
  const { success, error } = req.query;
  res.sendFile(path.resolve('../frontend/login.html'));
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log(path.join(__dirname, '../frontend'));
});