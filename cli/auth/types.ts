import type { Request } from 'express';

export interface JwtPayload {
  sub: string;
  username: string;
  role: 'admin' | 'viewer';
  iat: number;
  exp: number;
}

export interface AuthedRequest extends Request {
  user: JwtPayload;
}
