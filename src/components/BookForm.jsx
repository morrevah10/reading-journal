import { useId } from 'react';
import { DEFAULT_GENRES } from '../lib/genres';
import CoverPicker from './CoverPicker';

// Controlled form for book details, shared by New Book and Edit Book.
// `value` holds raw input values; `onChange(patch)` merges changes; `errors` maps field → message.
// `autoCover` ({ result }) asks the cover picker to find a cover for a chosen search result.
export default function BookForm({ value, onChange, errors = {}, autoCover = null }) {
  const genresId = useId();
  const field = (name) => ({
    value: value[name] ?? '',
    onChange: (event) => onChange({ [name]: event.target.value }),
  });

  return (
    <div className="book-form">
      <CoverPicker
        title={value.title}
        author={value.author}
        coverUrl={value.coverUrl}
        coverData={value.coverData}
        onChange={onChange}
        autoSource={autoCover}
      />

      <label className="field">
        <span className="field-label">שם הספר *</span>
        <input
          type="text"
          {...field('title')}
          aria-invalid={Boolean(errors.title)}
          autoComplete="off"
        />
        {errors.title && <span className="error-text">{errors.title}</span>}
      </label>

      <label className="field">
        <span className="field-label">סופר</span>
        <input type="text" {...field('author')} autoComplete="off" />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field-label">ז'אנר</span>
          <input type="text" list={genresId} {...field('genre')} autoComplete="off" />
          <datalist id={genresId}>
            {DEFAULT_GENRES.map((genre) => (
              <option key={genre} value={genre} />
            ))}
          </datalist>
        </label>

        <label className="field field-narrow">
          <span className="field-label">עמודים</span>
          <input type="number" inputMode="numeric" min="1" {...field('pages')} />
        </label>
      </div>

      <label className="field">
        <span className="field-label">על מה הספר</span>
        <textarea rows={4} {...field('summary')} />
      </label>
    </div>
  );
}
