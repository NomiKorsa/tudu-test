const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /tasks?filter=all|active|completed&page=1&limit=5
router.get('/', (req, res) => {
  let { filter = 'all', page = 1, limit = 5 } = req.query;

  // Валидация и приведение к числам
  page = parseInt(page, 10);
  limit = parseInt(limit, 10);
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 5;
  if (limit > 100) limit = 100; // защита от слишком больших лимитов

  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM tasks';
  const params = [];

  if (filter === 'active') {
    sql += ' WHERE completed = ?';
    params.push(0);
  } else if (filter === 'completed') {
    sql += ' WHERE completed = ?';
    params.push(1);
  }

  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// POST /tasks – создать задачу
router.post('/', (req, res) => {
  const { text, completed = false } = req.body;

  // Проверка длины текста (защита от DoS)
  if (!text || typeof text !== 'string' || text.length > 1000) {
    return res.status(400).json({ error: 'Invalid task text (max 1000 chars)' });
  }

  const completedInt = completed ? 1 : 0;

  const sql = 'INSERT INTO tasks (text, completed) VALUES (?, ?)';
  db.run(sql, [text, completedInt], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ status: 'ok', id: this.lastID });
  });
});

// PATCH /tasks/:id – обновить задачу
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  // Получаем текущую задачу (параметризовано)
  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, task) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const newText = req.body.text !== undefined ? req.body.text : task.text;
    const newCompleted = req.body.completed !== undefined ? (req.body.completed ? 1 : 0) : task.completed;

    // Проверка длины текста
    if (typeof newText !== 'string' || newText.length > 1000) {
      return res.status(400).json({ error: 'Text too long (max 1000 chars)' });
    }

    const sql = 'UPDATE tasks SET text = ?, completed = ? WHERE id = ?';
    db.run(sql, [newText, newCompleted, id], function(err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ status: 'ok' });
    });
  });
});

// DELETE /tasks/completed – удалить все выполненные
router.delete('/completed', (req, res) => {
  const sql = 'DELETE FROM tasks WHERE completed = 1';
  db.run(sql, [], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ status: 'ok', deleted: this.changes });
  });
});

// DELETE /tasks/:id – удалить одну задачу
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  const sql = 'DELETE FROM tasks WHERE id = ?';
  db.run(sql, [id], function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ status: 'ok' });
  });
});



module.exports = router;