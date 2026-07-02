// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '@/components/Modal';

describe('Modal (reusable, accessible)', () => {
  it('renders as a labelled dialog when open, nothing when closed', () => {
    const { rerender } = render(<Modal open={false} onClose={() => {}} label="Test"><p>Body</p></Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
    rerender(<Modal open onClose={() => {}} label="Test"><p>Body</p></Modal>);
    expect(screen.getByRole('dialog', { name: 'Test' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} label="Esc"><button>ok</button></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click but not on panel click', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal open onClose={onClose} label="Backdrop"><button>ok</button></Modal>);
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(container.querySelector('.modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('moves focus into the modal and locks body scroll while open', () => {
    const { unmount } = render(<Modal open onClose={() => {}} label="Focus"><button>first</button></Modal>);
    expect(document.activeElement).toHaveTextContent('first');
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('traps Tab focus inside the modal', () => {
    render(<Modal open onClose={() => {}} label="Trap"><button>a</button><button>b</button></Modal>);
    const [a, b] = screen.getAllByRole('button');
    b.focus();
    fireEvent.keyDown(document, { key: 'Tab' });          // from last → wraps to first
    expect(document.activeElement).toBe(a);
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true }); // from first → wraps to last
    expect(document.activeElement).toBe(b);
  });
});
