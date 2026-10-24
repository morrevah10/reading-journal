import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarRating from './StarRating';

describe('StarRating', () => {
  it('selects a rating', async () => {
    const onChange = vi.fn();
    render(<StarRating value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '3 כוכבים' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('clears the rating when the selected star is tapped again', async () => {
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);
    expect(screen.getByRole('button', { name: '3 כוכבים' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: '3 כוכבים' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('renders read-only stars with an accessible label', () => {
    render(<StarRating value={4} />);
    expect(screen.getByRole('img', { name: 'דירוג 4 מתוך 5' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders nothing read-only without a rating', () => {
    const { container } = render(<StarRating value={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
