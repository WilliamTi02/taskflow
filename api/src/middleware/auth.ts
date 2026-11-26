import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthedRequest extends Request {
  userId?: number;
}

const secret = process.env.JWT_SECRET || 'dev-secret-troque-em-producao';

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) {
    res.status(401).json({ error: 'Token ausente' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as unknown as { sub: number };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}
