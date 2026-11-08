require('dotenv').config();

const express = require('express');
const cors = require('cors');
const talonsRouter = require('./routes/talons');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
}));

app.use(express.json());
app.use('/api', talonsRouter);

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('Unhandled server error:', err);
  res.status(500).json({
    ok: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Внутренняя ошибка сервера.'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Backend server is running on port ${PORT}`);
});
