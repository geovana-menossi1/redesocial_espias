const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

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
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use(express.static(path.join(__dirname, '../frontend')));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); 
  }
});
const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed!'), false);
    }
  }
});

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
app.get('/comentarios/:id_postagem', (req, res) => {
  const postagemId = req.params.id_postagem;

  const query = `
      SELECT comentarios.conteudo AS comentario, usuarios.nome AS nome_usuario
      FROM comentarios
      INNER JOIN usuarios ON comentarios.usuario_id = usuarios.id
      WHERE comentarios.postagem_id = ?;
  `;
  connection.query(query, [postagemId], (error, results, fields) => {
      if (error) {
          console.error('Erro ao obter os comentários:', error);
          res.status(500).send('Erro interno do servidor');
          return;
      }
      console.log(results); // Vamos adicionar este console.log aqui
      res.render('inicio', { comentarios: results, userId: userId });
  });
});
app.post('/cadastro', upload.single('foto'), (req, res) => {
  const { txtnome, txtemail, dtnasc, txtgenero, txtsenha, txtbio } = req.body;
  const foto = req.file ? req.file.path : null; 

  const sql = `INSERT INTO usuarios (nome_usuario, email_usuario, data_nasc_usuario, genero_usuario, senha_usuario, foto_usuario, bio_usuario) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  db.query(sql, [txtnome, txtemail, dtnasc, txtgenero, txtsenha, foto, txtbio], (err, result) => {
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
              res.status(500).send('Erro ao verificar o login. Por favor, tente novamente mais tarde.');
          } else if (result.length === 0) {
              res.status(401).send('Você não possui cadastro ou os administradores não o aceitaram ainda. Por favor, volte mais tarde.');
          } else {
              const user = result[0];
              if (user.nivel_usuario === '1') {
                  req.session.user = user;
                  res.redirect('/home');
              } else {
                  res.status(403).send('Você não possui cadastro ou os administradores não o aceitaram ainda. Por favor, volte mais tarde.');
              }
          }
      });
  } catch (error) {
      console.error('Erro ao verificar o login:', error);
      res.status(500).send('Você não possui cadastro ou os administradores não o aceitaram ainda. Por favor, volte mais tarde.');
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
  const userId = req.session.user.id_usuarios;

  const sql = 'DELETE FROM usuarios WHERE id_usuarios = ?';

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('Erro ao excluir conta do usuário:', err);
      res.status(500).send('Erro ao excluir conta do usuário');
    } else {
      console.log('Conta do usuário excluída com sucesso');
      req.session.destroy();
      res.redirect('/login');
    }
  });
});


app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
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
  const sql = 'SELECT * FROM usuarios WHERE id_usuarios = ?';

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('Erro ao buscar perfil do usuário:', err);
      res.status(500).send('Erro ao buscar perfil do usuário');
    } else {
      if (result.length > 0) {
        console.log('Dados do perfil:', result[0]);
        res.render('perfil', { perfil: result[0] });
      } else {
        res.status(404).send('Perfil do usuário não encontrado');
      }
    }
  });
});
app.post('/comentarios', authenticateUser, (req, res) => {
  const userId = req.session.user.id_usuarios;
  const postagemId = req.body.postagem_id;
  const txtcomentario = req.body.txtcomentario;
  const sql = 'INSERT INTO comentarios (usuario_id, postagem_id, conteudo_comentario, data_hora_comentario) VALUES (?, ?, ?, NOW())';
  db.query(sql, [userId, postagemId, txtcomentario], (error, results) => {
      if (error) {
          console.error('Erro ao inserir comentário:', error);
          res.status(500).json({ error: 'Erro ao inserir comentário' });
      } else {
        res.redirect('/home');
      }
  });
});
app.get("/notificacoes", authenticateUser, (req, res) => {
  res.sendFile(path.resolve('../frontend/notificacoes.html'));
});

app.get("/editar", authenticateUser, (req, res) => {
  const usuario = req.session.user; // Aqui está a correção
  res.render('editar', { usuario }); 
});
app.post("/editar-perfil", authenticateUser, (req, res) => {
  const userId = req.session.user.id_usuarios;
  const { txtnome, txtemail, dtnasc, txtgenero, txtsenha, txtbio } = req.body;

  const sql = `
    UPDATE usuarios 
    SET nome_usuario = ?, 
        email_usuario = ?, 
        data_nasc_usuario = ?, 
        genero_usuario = ?, 
        senha_usuario = ?, 
        bio_usuario = ?
    WHERE id_usuarios = ?
  `;
  db.query(sql, [txtnome, txtemail, dtnasc, txtgenero, txtsenha, txtbio, userId], (err, result) => {
    if (err) {
      console.error('Erro ao atualizar perfil do usuário:', err);
      res.status(500).send('Erro ao atualizar perfil do usuário');
    } else {
      console.log('Perfil do usuário atualizado com sucesso');
      req.session.user.nome_usuario = txtnome;
      req.session.user.email_usuario = txtemail;
      req.session.user.data_nasc_usuario = dtnasc;
      req.session.user.genero_usuario = txtgenero;
      req.session.user.bio_usuario = txtbio;
      
      res.redirect('/perfil');
    }
  });
});

app.get("/login", (req, res) => {
  const { success, error } = req.query;
  res.sendFile(path.resolve('../frontend/login.html'));
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
