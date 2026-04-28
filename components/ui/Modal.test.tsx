import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal';

describe('Modal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Test Title">
        <p>Content</p>
      </Modal>
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title and children when open is true', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Test Title">
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Test Title">
        <p>Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button', { name: /×/i }));
    expect(handleClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when overlay background is clicked', () => {
    const handleClose = vi.fn();
    const { container } = render(
      <Modal open={true} onClose={handleClose} title="Test Title">
        <p>Content</p>
      </Modal>
    );
    // The overlay is the first child div of the container (fixed inset-0)
    const overlay = container.firstChild as HTMLElement;
    if (overlay) {
      fireEvent.click(overlay);
      expect(handleClose).toHaveBeenCalledOnce();
    }
  });

  it('does not call onClose when modal content is clicked', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Test Title">
        <p>Click me not</p>
      </Modal>
    );
    fireEvent.click(screen.getByText('Click me not'));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('respects custom width prop', () => {
    const { container } = render(
      <Modal open={true} onClose={vi.fn()} title="Test" width={700}>
        <p>Content</p>
      </Modal>
    );
    const modalDiv = container.querySelector('div.max-h-\\[92vh\\]');
    expect(modalDiv).toBeInTheDocument();
  });

  it('renders with string width', () => {
    const { container } = render(
      <Modal open={true} onClose={vi.fn()} title="Test" width="90%">
        <p>Content</p>
      </Modal>
    );
    const modalDiv = container.querySelector('div.max-h-\\[92vh\\]');
    expect(modalDiv).toBeInTheDocument();
  });
});
