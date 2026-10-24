import { useState } from 'react';
import { coverSource } from '../lib/bookModel';

// Shows the uploaded cover, else the Google Books cover, else a placeholder with the first letter.
export default function BookCover({ book, size = 'md' }) {
  const src = coverSource(book);
  const [failedSrc, setFailedSrc] = useState(null);

  if (src && src !== failedSrc) {
    return (
      <img
        className={`book-cover book-cover-${size}`}
        src={src}
        alt={book?.title ? `כריכת ${book.title}` : 'כריכה'}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
      />
    );
  }

  return (
    <div className={`book-cover book-cover-${size} book-cover-placeholder`} aria-hidden="true">
      {book?.title?.trim()?.charAt(0) ?? '📖'}
    </div>
  );
}
