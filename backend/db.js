const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Подключаемся к БД (файл создастся автоматически)
const db = new sqlite3.Database(path.join(__dirname, 'tasks.db'), (err) => {
  if (err) {
    console.error('Ошибка подключения к БД:', err.message);
  } else {
    console.log('Подключено к SQLite.');
    // Создаём таблицу tasks, если её нет
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT,
        completed INTEGER DEFAULT 0
      )
    `, (err) => {
      if (err) console.error('Ошибка создания таблицы:', err.message);
      else console.log('Таблица tasks готова.');
    });
  }
});

module.exports = db;