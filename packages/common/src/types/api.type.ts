import type { ErrorKind } from '../constants/apiErrors.constant.js';

export type Cause = Record<string, unknown> & {
  kind?: ErrorKind;
};
