const express = require('express');
const db = require('../db');
const router = express.Router();

// GET /tasks?filter=all|active|completed&page=1&limit=5
router.get('/', (req, res) => {
  const { filter = 'all', page = 1, limit = 5 } = req.query;
  const offset = (page - 1) * limit;

  let whereClause = '';
  if (filter === 'active') whereClause = 'WHERE completed = 0';
  else if (filter === 'completed') whereClause = 'WHERE completed = 1';

  // ⚠️ Уязвимость SQL injection – строки конкатенируются напрямую
  const sql = `SELECT * FROM tasks ${whereClause} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;

  db.all(sql, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// POST /tasks – создать задачу (mass assignment)
router.post('/', (req, res) => {
  const { text, completed = false } = req.body;

  // ⚠️ Нет никакой валидации
  const completedInt = completed ? 1 : 0;

  // ⚠️ Уязвимость SQL injection
  const sql = `INSERT INTO tasks (text, completed) VALUES ('${text}', ${completedInt})`;

  db.run(sql, function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ status: 'ok', message: 'Задача добавлена', id: this.lastID });
  });
});

// PATCH /tasks/:id – обновить задачу
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { text, completed } = req.body;

  // Сначала получаем текущую задачу
  db.get(`SELECT * FROM tasks WHERE id = ${id}`, (err, task) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!task) return res.status(404).json({ error: 'Задача не найдена' });

    const newText = text !== undefined ? text : task.text;
    const newCompleted = completed !== undefined ? (completed ? 1 : 0) : task.completed;

    // ⚠️ Уязвимость SQL injection
    const sql = `UPDATE tasks SET text = '${newText}', completed = ${newCompleted} WHERE id = ${id}`;

    db.run(sql, function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ status: 'ok', message: 'Задача обновлена' });
    });
  });
});

// DELETE /tasks/completed – удалить все выполненные
router.delete('/completed', (req, res) => {
  console.log('➡️ DELETE /tasks/completed запрос получен');
  const sql = 'DELETE FROM tasks WHERE completed = 1';

  db.run(sql, function(err) {
    if (err) {
      console.error('❌ Ошибка SQL:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`✅ Удалено строк: ${this.changes}`);
    res.json({
      status: 'ok',
      message: 'Все выполненные задачи удалены',
      deleted: this.changes
    });
  });
});

// DELETE /tasks/:id – удалить одну задачу
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
    // ⚠️ Уязвимость SQL injection
  const sql = `DELETE FROM tasks WHERE id = ${id}`;
  db.run(sql, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ status: 'ok', message: 'Задача удалена' });
  });
});


module.exports = router;