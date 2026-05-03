import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './useAuthStore';
import type { User } from '@/lib/types';

describe('useAuthStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.setState({
      user: null,
      role: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('has correct initial state', () => {
    const { user, role, isAuthenticated, isLoading } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(role).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isLoading).toBe(false); // Reset in beforeEach
  });

  const makeUser = (name: string, email: string): User => ({
    id: 'user-1',
    name,
    email,
    avatar: name.split(' ').map((n) => n[0]).join('').toUpperCase(),
    role: 'user',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  });

  it('login sets user, role, and isAuthenticated to true', () => {
    const mockUser = makeUser('John Doe', 'john@example.com');

    useAuthStore.getState().login(mockUser, 'user');

    const { user, role, isAuthenticated } = useAuthStore.getState();
    expect(user).toEqual(mockUser);
    expect(role).toBe('user');
    expect(isAuthenticated).toBe(true);
  });

  it('login with admin role sets role to admin', () => {
    const adminUser = makeUser('Admin', 'admin@fixasn.id');

    useAuthStore.getState().login(adminUser, 'admin');

    const { role, isAuthenticated } = useAuthStore.getState();
    expect(role).toBe('admin');
    expect(isAuthenticated).toBe(true);
  });

  it('logout resets user, role, and isAuthenticated', () => {
    const mockUser = makeUser('John Doe', 'john@example.com');

    useAuthStore.getState().login(mockUser, 'user');
    useAuthStore.getState().logout();

    const { user, role, isAuthenticated } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(role).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('multiple login calls overwrite previous state', () => {
    const user1 = makeUser('User 1', 'u1@test.com');
    const user2 = makeUser('User 2', 'u2@test.com');

    useAuthStore.getState().login(user1, 'user');
    expect(useAuthStore.getState().user).toEqual(user1);

    useAuthStore.getState().login(user2, 'admin');
    expect(useAuthStore.getState().user).toEqual(user2);
    expect(useAuthStore.getState().role).toBe('admin');
  });

  it('setUser sets user, role, and marks loading as false', () => {
    const mockUser = makeUser('Test User', 'test@example.com');

    useAuthStore.getState().setUser(mockUser, 'user');

    const { user, role, isAuthenticated, isLoading } = useAuthStore.getState();
    expect(user).toEqual(mockUser);
    expect(role).toBe('user');
    expect(isAuthenticated).toBe(true);
    expect(isLoading).toBe(false);
  });

  it('setLoading updates loading state', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
