import jwt from 'jsonwebtoken';
import { envVars } from '../config/env.js';
import type { RoleEnum, User } from '../libs/prisma.js';

export const isJwtError = (
  error: unknown,
): error is jwt.TokenExpiredError | jwt.JsonWebTokenError | jwt.NotBeforeError => {
  return (
    error instanceof jwt.TokenExpiredError ||
    error instanceof jwt.JsonWebTokenError ||
    error instanceof jwt.NotBeforeError
  );
};

export const verify = <T>(token: string, secret: string): T => <T>jwt.verify(token, secret);

type authUserParams = { id: User['id']; roleId: RoleEnum['id'] };

export const signAuthCookie = ({ id, roleId }: authUserParams, date: Date) => {
  return jwt.sign({ id, roleId }, envVars.AUTH_TOKEN_SECRET_KEY, {
    expiresIn: Math.floor((date.getTime() - Date.now()) / 1000),
  });
};

export const signRefreshCookie = (userId: User['id'], date: Date) =>
  jwt.sign({ id: userId }, envVars.REFRESH_TOKEN_SECRET_KEY, {
    expiresIn: Math.floor((date.getTime() - Date.now()) / 1000),
  });

export const getJwtExpirationDate = (timestamp: string) => new Date(Date.now() + Number.parseInt(timestamp, 10) * 1000);
