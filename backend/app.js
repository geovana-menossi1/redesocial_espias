const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

app.post('/cadastro-publicacao', authenticateUser, (req, res) => {
  const { conteudo } = req.body;
  if (conteudo.trim() !== '') {
    const tipo_post = req.body.tipo_post || 'texto';
    const data_hora_post = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    const usuarios_id_usuarios = req.session.user.id_usuarios;
    if (usuarios_id_usuarios) {
      const sql = 'INSERT INTO postagens (conteudo_post, tipo_post, data_hora_post, usuarios_id_usuarios) VALUES (?, ?, ?, ?)';
      db.query(sql, [conteudo, tipo_post, data_hora_post, usuarios_id_usuarios], (err, result) => {
        if (err) {
          console.error('Erro ao cadastrar publicação:', err);
          res.status(500).json({ success: false, message: 'Erro ao cadastrar publicação.' });
        } else {
          console.log('Publicação cadastrada com sucesso:', result);
          res.status(200).json({ success: true, message: 'Publicação cadastrada com sucesso.' });
        }
      });
    } else {
      res.status(500).json({ success: false, message: 'ID do usuário não encontrado na sessão.' });
    }
  } else {
    res.status(400).json({ success: false, message: 'O conteúdo da publicação não pode estar vazio.' });
  }
});

app.post('/excluir-conta', authenticateUser, (req, res) => {
  const { userId } = req.session.user;

  const sql = 'DELETE FROM usuarios WHERE id_usuarios = ?';

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('Erro ao excluir conta do usuário:', err);
      res.status(500).send('Erro ao excluir conta do usuário');
    } else {
      console.log('Conta do usuário excluída com sucesso');
      // Aqui você pode limpar a sessão e redirecionar para uma página de confirmação ou logout
      req.session.destroy();
      res.redirect('/login');
    }
  });
});


app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});
app.get('/editar', authenticateUser, (req, res) => {
  const userId = req.session.user.id_usuarios;
  const sql = `SELECT perfil_usuario.*, usuarios.nome_usuario 
               FROM perfil_usuario 
               INNER JOIN usuarios ON perfil_usuario.usuario_id = usuarios.id_usuarios 
               WHERE perfil_usuario.usuario_id = ?`;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
      res.status(500).send('Erro ao buscar perfil do usuário');
    } else {
      if (result.length > 0) {
        res.render('editar', { perfil: result[0] });
      } else {
        res.status(404).send('Perfil do usuário não encontrado');
      }
    }
  });
});

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/editar-perfil', authenticateUser, upload.single('foto_perfil'), (req, res) => {
  console.log(req.body);
  console.log(req.file);
  const { userId } = req.session.user;
  const { nome, biografia } = req.body;
  const fotoPerfil = req.file ? req.file.path : null;

  const sql = `
    UPDATE perfil_usuario 
    INNER JOIN usuarios ON perfil_usuario.usuario_id = usuarios.id_usuarios 
    SET usuarios.nome_usuario = ?, perfil_usuario.biografia = ?, perfil_usuario.foto_perfil = ?
    WHERE perfil_usuario.usuario_id = ?`;

  db.query(sql, [nome, biografia, fotoPerfil, userId], (err, result) => {
    if (err) {
      console.error('Erro ao editar perfil do usuário:', err);
      res.status(500).send('Erro ao editar perfil do usuário');
    } else {
      console.log('Resultado da consulta:', result);
      if (result.affectedRows > 0) {
        console.log('Perfil do usuário editado com sucesso');
        res.redirect('/perfil');
      } else {
        console.log('Nenhuma alteração realizada no perfil do usuário');
        res.status(500).send('Nenhuma alteração realizada no perfil do usuário');
      }
    }
  });
  
  console.log('SQL:', sql);
  console.log('Parâmetros:', [nome, biografia, fotoPerfil, userId]);
});

app.post('/excluir-usuario', authenticateUser, (req, res) => {
  const userId = req.session.user.id_usuarios;

  const sqlDeletePerfil = 'DELETE FROM perfil_usuario WHERE usuario_id = ?';
  const sqlDeleteUsuario = 'DELETE FROM usuarios WHERE id_usuarios = ?';

  db.query(sqlDeletePerfil, [userId], (errPerfil, resultPerfil) => {
    if (errPerfil) {
      console.error('Erro ao excluir perfil do usuário:', errPerfil);
      res.status(500).send('Erro ao excluir perfil do usuário');
      return;
    }
    
    db.query(sqlDeleteUsuario, [userId], (errUsuario, resultUsuario) => {
      if (errUsuario) {
        console.error('Erro ao excluir usuário:', errUsuario);
        res.status(500).send('Erro ao excluir usuário');
        return;
      }
      req.session.destroy();
      res.redirect('/login');
    });
  });
});

app.get("/", authenticateUser, (req, res) => {
  res.sendFile(path.resolve('../frontend/home.html'));
});

app.get("/home", authenticateUser, (req, res) => {
  const userId = req.session.user.id_usuarios; 
  const sql = 'SELECT postagens.*, usuarios.nome_usuario FROM postagens INNER JOIN usuarios ON postagens.usuarios_id_usuarios = usuarios.id_usuarios';

  db.query(sql, (err, result) => {
    if (err) {
      res.status(500).send('Erro ao buscar postagens');
    } else {
      res.render('inicio', { postagens: result, userId: userId });
    }
  });
});

app.get('/perfil', authenticateUser, (req, res) => {
  const userId = req.session.user.id_usuarios; 
  const sql = `SELECT perfil_usuario.*, usuarios.nome_usuario 
               FROM perfil_usuario 
               INNER JOIN usuarios ON perfil_usuario.usuario_id = usuarios.id_usuarios 
               WHERE perfil_usuario.usuario_id = ?`;

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
      res.status(500).send('Erro ao buscar perfil do usuário');
    } else {
      if (result.length > 0) {
        res.render('perfil', { perfil: result[0] });
      } else {
        res.status(404).send('Perfil do usuário não encontrado');
      }
    }
  });
});

app.get("/notificacoes", authenticateUser, (req, res) => {
  res.sendFile(path.resolve('../frontend/notificacoes.html'));
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
});
