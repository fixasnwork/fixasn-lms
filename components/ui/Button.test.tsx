import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders children correctly', () => {
    render(<Button>Click Me</Button>);
    expect(screen.getByRole('button', { name: 'Click Me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked and not disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Click Me' }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick} disabled>Click Me</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Click Me' }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with different variants', () => {
    const variants = ['primary', 'gold', 'outline', 'danger', 'success', 'ghost', 'white'] as const;
    variants.forEach((variant) => {
      const { container } = render(<Button variant={variant}>Test</Button>);
      expect(container.querySelector('button')).toBeInTheDocument();
    });
  });

  it('renders with different sizes', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    sizes.forEach((size) => {
      const { container } = render(<Button size={size}>Test</Button>);
      expect(container.querySelector('button')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<Button className="custom-class">Test</Button>);
    expect(container.querySelector('button')?.className).toContain('custom-class');
  });

  it('applies custom style', () => {
    const { container } = render(<Button style={{ color: 'red' }}>Test</Button>);
    expect(container.querySelector('button')?.style.color).toBe('red');
  });

  it('has disabled attribute when disabled prop is true', () => {
    const { container } = render(<Button disabled>Disabled</Button>);
    expect(container.querySelector('button')?.disabled).toBe(true);
  });
});
