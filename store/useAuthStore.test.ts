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
    });
  });

  it('has correct initial state', () => {
    const { user, role, isAuthenticated } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(role).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('login sets user, role, and isAuthenticated to true', () => {
    const mockUser: User = {
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'JD',
    };

    useAuthStore.getState().login(mockUser, 'user');

    const { user, role, isAuthenticated } = useAuthStore.getState();
    expect(user).toEqual(mockUser);
    expect(role).toBe('user');
    expect(isAuthenticated).toBe(true);
  });

  it('login with admin role sets role to admin', () => {
    const adminUser: User = {
      name: 'Admin',
      email: 'admin@fixasn.id',
      avatar: 'AD',
    };

    useAuthStore.getState().login(adminUser, 'admin');

    const { role, isAuthenticated } = useAuthStore.getState();
    expect(role).toBe('admin');
    expect(isAuthenticated).toBe(true);
  });

  it('logout resets user, role, and isAuthenticated', () => {
    const mockUser: User = {
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'JD',
    };

    useAuthStore.getState().login(mockUser, 'user');
    useAuthStore.getState().logout();

    const { user, role, isAuthenticated } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(role).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('multiple login calls overwrite previous state', () => {
    const user1: User = { name: 'User 1', email: 'u1@test.com', avatar: 'U' };
    const user2: User = { name: 'User 2', email: 'u2@test.com', avatar: 'U' };

    useAuthStore.getState().login(user1, 'user');
    expect(useAuthStore.getState().user).toEqual(user1);

    useAuthStore.getState().login(user2, 'admin');
    expect(useAuthStore.getState().user).toEqual(user2);
    expect(useAuthStore.getState().role).toBe('admin');
  });
});
