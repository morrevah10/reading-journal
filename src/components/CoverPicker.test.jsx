import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { compressImageFile } from '../lib/coverImage';
import CoverPicker from './CoverPicker';

vi.mock('../lib/coverImage', () => ({
  compressImageFile: vi.fn(),
}));

describe('CoverPicker', () => {
  it('compresses an uploaded image into coverData', async () => {
    compressImageFile.mockResolvedValue('data:image/webp;base64,AAA');
    const onChange = vi.fn();
    render(<CoverPicker title="Dune" coverUrl={null} coverData={null} onChange={onChange} />);
    const file = new File(['x'], 'cover.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByTestId('cover-file-input'), file);
    expect(compressImageFile).toHaveBeenCalledWith(file);
    expect(onChange).toHaveBeenCalledWith({ coverData: 'data:image/webp;base64,AAA' });
  });

  it('shows an error when compression fails', async () => {
    compressImageFile.mockRejectedValue(new Error('התמונה גדולה מדי גם אחרי דחיסה'));
    render(<CoverPicker title="Dune" onChange={vi.fn()} />);
    await userEvent.upload(
      screen.getByTestId('cover-file-input'),
      new File(['x'], 'c.jpg', { type: 'image/jpeg' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('גדולה מדי');
  });

  it('prefers the uploaded cover in the preview and can remove it', async () => {
    const onChange = vi.fn();
    render(
      <CoverPicker
        title="Dune"
        coverUrl="https://google/cover.jpg"
        coverData="data:image/webp;base64,AAA"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole('img')).toHaveAttribute('src', 'data:image/webp;base64,AAA');
    await userEvent.click(screen.getByRole('button', { name: 'הסר תמונה שהועלתה' }));
    expect(onChange).toHaveBeenCalledWith({ coverData: null });
  });
});
