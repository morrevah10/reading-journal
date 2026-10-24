import { Link } from 'react-router-dom';
import BookCover from './BookCover';
import StarRating from './StarRating';

export default function TopRatedList({ books }) {
  return (
    <section className="card" aria-labelledby="top-rated-title">
      <h3 id="top-rated-title" className="card-title">
        הדירוג הגבוה ביותר
      </h3>
      {books.length === 0 ? (
        <p className="muted">אין ספרים מדורגים בטווח הזה.</p>
      ) : (
        <ol className="top-rated">
          {books.map((book) => (
            <li key={book.id}>
              <Link to={`/book/${book.id}`} className="top-rated-item">
                <BookCover book={book} size="sm" />
                <span className="top-rated-text">
                  <span className="top-rated-title">{book.title}</span>
                  {book.author && <span className="muted">{book.author}</span>}
                  <StarRating value={book.rating} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
