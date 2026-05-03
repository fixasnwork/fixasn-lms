import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuthContext {
  ip: string | null;
}

export const authContext = new AsyncLocalStorage<AuthContext>();

export function getAuthContext(): AuthContext | undefined {
  return authContext.getStore();
}
