import cors from 'cors';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { tasksRouter } from './routes/tasks.js';

export const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'taskflow-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
