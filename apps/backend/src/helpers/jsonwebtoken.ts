import { envVars } from '@/config/env';
import type { RoleEnum, User } from '@/libs/prisma';
import jwt from 'jsonwebtoken';

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

export const signAuthCookie = ({ id, roleId }: authUserParams, date: Date) =>
  jwt.sign({ id, roleId }, envVars.AUTH_TOKEN_SECRET_KEY, {
    expiresIn: date.getTime() - new Date().getTime(),
  });

export const signRefreshCookie = (userId: User['id'], date: Date) =>
  jwt.sign({ id: userId }, envVars.REFRESH_TOKEN_SECRET_KEY, {
    expiresIn: date.getTime() - new Date().getTime(),
  });

export const getJwtExpirationDate = (timestamp: string) =>
  new Date(new Date().getTime() + Number.parseInt(timestamp, 10) * 1000);
