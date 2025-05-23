import { envVars } from '@/config/env.ts';
import type { User } from '@sirena/database';
import jwt from 'jsonwebtoken';

type Verify<T> = [null, T] | [jwt.TokenExpiredError | jwt.JsonWebTokenError | jwt.NotBeforeError, null];

export const verify = <T>(token: string, secret: string): T => <T>jwt.verify(token, secret);

export const signAuthCookie = (userId: User['id'], date: Date) =>
  jwt.sign({ id: userId }, envVars.AUTH_TOKEN_SECRET_KEY, {
    expiresIn: date.getTime() - new Date().getTime(),
  });

export const signRefreshCookie = (userId: User['id'], date: Date) =>
  jwt.sign({ id: userId }, envVars.REFRESH_TOKEN_SECRET_KEY, {
    expiresIn: date.getTime() - new Date().getTime(),
  });

export const getJwtExpirationDate = (timestamp: string) =>
  new Date(new Date().getTime() + Number.parseInt(timestamp, 10) * 1000);
