import bcrypt from 'bcryptjs';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../db.js';

export const authRouter = Router();

const secret = process.env.JWT_SECRET || 'dev-secret-troque-em-producao';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha precisa ter ao menos 6 caracteres'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function tokenFor(id: number) {
  return jwt.sign({ sub: id }, secret, { expiresIn: '7d' });
}

authRouter.post('/register', (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    return;
  }

  const { name, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (exists) {
    res.status(409).json({ error: 'E-mail já cadastrado' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, normalizedEmail, hash);
  const id = Number(result.lastInsertRowid);

  res.status(201).json({ token: tokenFor(id), user: { id, name, email: normalizedEmail } });
});

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos' });
    return;
  }

  const { email, password } = parsed.data;
  const user = db.prepare('SELECT id, name, email, password_hash FROM users WHERE email = ?')
    .get(email.toLowerCase()) as { id: number; name: string; email: string; password_hash: string } | undefined;

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'E-mail ou senha incorretos' });
    return;
  }

  res.json({ token: tokenFor(user.id), user: { id: user.id, name: user.name, email: user.email } });
});
