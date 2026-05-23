import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import AdminSidebar from './AdminSidebar';

const pushMock = vi.fn();
const logoutMock = vi.fn();
const signOutMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/dashboard',
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('next-auth/react', () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock('@/store/useAuthStore', () => ({
  useAuthStore: () => ({ logout: logoutMock }),
}));

vi.mock('@/store/useAppStore', () => ({
  useAppStore: (selector: (state: { logoConfig: unknown }) => unknown) =>
    selector({ logoConfig: {} }),
}));

vi.mock('@/components/ui', () => ({
  Logo: () => <div>Logo</div>,
}));

describe('AdminSidebar', () => {
  beforeEach(() => {
    pushMock.mockReset();
    logoutMock.mockReset();
    signOutMock.mockReset();
  });

  it('shows mobile more menu and closes after selecting a menu item', () => {
    render(<AdminSidebar />);

    expect(screen.queryByTestId('admin-more-menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('admin-more-toggle'));

    const moreMenu = screen.getByTestId('admin-more-menu');
    expect(moreMenu).toBeInTheDocument();

    fireEvent.click(within(moreMenu).getByRole('button', { name: /Pengaturan/i }));

    expect(pushMock).toHaveBeenCalledWith('/admin/settings');
    expect(screen.queryByTestId('admin-more-menu')).not.toBeInTheDocument();
  });

  it('keeps logout reachable from mobile more menu', () => {
    render(<AdminSidebar />);

    fireEvent.click(screen.getByTestId('admin-more-toggle'));
    const moreMenu = screen.getByTestId('admin-more-menu');
    fireEvent.click(within(moreMenu).getByRole('button', { name: /Keluar/i }));

    expect(logoutMock).toHaveBeenCalledOnce();
    expect(signOutMock).toHaveBeenCalledOnce();
  });
});
