const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path =  require('path');

const app = express();
const port = 3000;

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

app.use(bodyParser.json());

app.get('/usuarios', (req, res) => {
  const sql = 'SELECT * FROM usuarios';
  db.query(sql, (err, result) => {
    if (err) {
      res.status(500).send('Erro ao buscar usuários');
    } else {
      res.send(result);
    }
  });
});

app.get('/postagens', (req, res) => {
    const sql = 'SELECT * FROM postagens';
    db.query(sql, (err, result) => {
      if (err) {
        res.status(500).send('Erro ao buscar usuários');
      } else {
        res.send(result);
      }
    });
  });

app.post('/usuarios', (req, res) => {
  const { nome_usuario, email_usuario, data_nasc_usuario, genero_usuario } = req.body;
  const sql = 'INSERT INTO usuarios (nome_usuario, email_usuario, data_nasc_usuario, genero_usuario) VALUES (?, ?, ?, ?)';
  db.query(sql, [nome_usuario, email_usuario, data_nasc_usuario, genero_usuario], (err, result) => {
    if (err) {
      res.status(500).send('Erro ao criar usuário');
    } else {
      res.send('Usuário criado com sucesso');
    }
  });
});

app.put('/usuarios/:id', (req, res) => {
  const { nome_usuario, email_usuario, data_nasc_usuario, genero_usuario } = req.body;
  const id = req.params.id;
  const sql = 'UPDATE usuarios SET nome_usuario=?, email_usuario=?, data_nasc_usuario=?, genero_usuario=? WHERE id_usuarios=?';
  db.query(sql, [nome_usuario, email_usuario, data_nasc_usuario, genero_usuario, id], (err, result) => {
    if (err) {
      res.status(500).send('Erro ao atualizar usuário');
    } else {
      res.send('Usuário atualizado com sucesso');
    }
  });
});

app.delete('/usuarios/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM usuarios WHERE id_usuarios=?';
  db.query(sql, id, (err, result) => {
    if (err) {
      res.status(500).send('Erro ao excluir usuário');
    } else {
      res.send('Usuário excluído com sucesso');
    }
  });
});
app.get("/", (req, res) => {
  res.setHeader("Access-Control-Allow-Origin","*")
  res.sendFile(path.resolve('../frontend/login.html'));
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
