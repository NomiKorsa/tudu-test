const express = require('express');
const path = require('path');
const tasksRouter = require('./routes/tasks');

const app = express();
const PORT = 3000;

// Мидлвар для разбора JSON (обязательно для API)
app.use(express.json());

// Разрешаем CORS (любой источник)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Логирование всех входящих запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Подключаем маршруты задач
app.use('/tasks', tasksRouter);

// Раздаём статические файлы фронтенда (из папки public)
app.use(express.static(path.join(__dirname, '../public')));

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});