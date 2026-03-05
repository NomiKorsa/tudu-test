const express = require('express');
const path = require('path');
const tasksRouter = require('./routes/tasks');

const app = express();
const PORT = 3000;

// Мидлвар для разбора JSON (обязательно для API)
app.use(express.json({ limit: '10kb' }));

const rateLimit = require('express-rate-limit');

// Лимитер для всех маршрутов (максимум 100 запросов в минуту с одного IP)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 минута
  max: 100,            // максимум 100 запросов
  message: { error: 'Слишком много запросов, попробуйте позже.' },
  standardHeaders: true, // возвращать информацию о лимите в заголовках RateLimit-*
  legacyHeaders: false,
});

// Применяем лимитер ко всем запросам
app.use(limiter);

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

// Middleware только для /tasks
const delayMiddleware = (req, res, next) => {
  const delay = Math.floor(Math.random() * 300) + 200;
  setTimeout(next, delay);
};

// Подключаем маршруты задач
app.use('/tasks', tasksRouter);
app.use('/tasks', delayMiddleware);

// Раздаём статические файлы фронтенда (из папки public)
app.use(express.static(path.join(__dirname, '../public')));

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});

