import { useState } from 'react';
import { saveGenreChange } from '../firebase/genreUpdates';
import { useAuth } from '../hooks/useAuth';
import { useBooks } from '../hooks/useBooks';
import { useGenres } from '../hooks/useGenres';
import { useGoals } from '../hooks/useGoals';
import {
  GENRE_ERRORS,
  addGenre,
  genreUsage,
  normalizeGenre,
  removeGenre,
  renameGenre,
  unlistedGenres,
  validateGenreName,
} from '../lib/genres';
import Dialog from './Dialog';

const SAVE_FAILED = 'השמירה נכשלה. נסה שוב.';

// "בספר אחד" / "ב‑3 ספרים"
function inCount(n, one, many) {
  return n === 1 ? `ב${one}` : `ב‑${n} ${many}`;
}

function usagePhrase({ bookIds, goalIds }) {
  const parts = [];
  if (bookIds.length) parts.push(inCount(bookIds.length, 'ספר אחד', 'ספרים'));
  if (goalIds.length) parts.push(inCount(goalIds.length, 'יעד אחד', 'יעדים'));
  return parts.join(' ו');
}

function applyEverywhereLabel({ bookIds, goalIds }) {
  if (bookIds.length && goalIds.length) return 'שנה גם בספרים וביעדים';
  return bookIds.length ? 'שנה גם בספרים' : 'שנה גם ביעדים';
}

// Settings card: the genre list (alphabetical) with add, rename and delete.
// Renaming or deleting a genre that books or goals use asks each time whether to change them too.
export default function GenreManager() {
  const uid = useAuth().user?.uid;
  const genresState = useGenres();
  const booksState = useBooks();
  const goalsState = useGoals();
  const list = genresState.list;
  const books = booksState.data;
  const goals = goalsState.data;

  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [error, setError] = useState('');
  // { kind: 'rename', genre, name, error, ask: null | { usage, plan } } or { kind: 'delete', genre, usage }
  const [dialog, setDialog] = useState(null);

  const loading = genresState.loading || booksState.loading || goalsState.loading;
  const unlisted = unlistedGenres(list, books);

  async function save(change) {
    setError('');
    try {
      await saveGenreChange(uid, change);
      return true;
    } catch {
      setError(SAVE_FAILED);
      return false;
    }
  }

  async function handleAdd(event) {
    event.preventDefault();
    const message = validateGenreName(list, newName);
    if (message) {
      setAddError(message);
      return;
    }
    setAddError('');
    if (await save({ list: addGenre(list, newName) })) setNewName('');
  }

  function startRename(genre) {
    setDialog({ kind: 'rename', genre, name: genre, error: '', ask: null });
  }

  async function continueRename() {
    const { genre, name } = dialog;
    // A name already in the list is allowed here: the two genres merge.
    if (!normalizeGenre(name)) {
      setDialog({ ...dialog, error: GENRE_ERRORS.EMPTY });
      return;
    }
    if (normalizeGenre(name) === genre) {
      setDialog(null);
      return;
    }
    const plan = renameGenre(list, genre, name);
    const usage = genreUsage(genre, books, goals);
    if (usage.bookIds.length || usage.goalIds.length) {
      setDialog({ ...dialog, error: '', ask: { usage, plan } });
      return;
    }
    setDialog(null);
    await save({ list: plan.list });
  }

  async function finishRename(everywhere) {
    const { usage, plan } = dialog.ask;
    setDialog(null);
    await save(
      everywhere
        ? { list: plan.list, bookIds: usage.bookIds, goalIds: usage.goalIds, genre: plan.to }
        : { list: plan.list },
    );
  }

  function startDelete(genre) {
    setDialog({ kind: 'delete', genre, usage: genreUsage(genre, books, goals) });
  }

  async function finishDelete(fromBooks) {
    const { genre, usage } = dialog;
    setDialog(null);
    await save(
      fromBooks
        ? { list: removeGenre(list, genre), bookIds: usage.bookIds, genre: null }
        : { list: removeGenre(list, genre) },
    );
  }

  const closeDialog = () => setDialog(null);

  return (
    <div className="card genre-manager">
      <h3 className="card-title">ז'אנרים</h3>
      <p className="muted">ההצעות בטופס הספר וביעדים. אפשר תמיד להקליד גם ז'אנר אחר.</p>

      <form className="genre-add" onSubmit={handleAdd} noValidate>
        <input
          type="text"
          aria-label="ז'אנר חדש"
          placeholder="ז'אנר חדש"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          aria-invalid={Boolean(addError)}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-secondary" disabled={loading}>
          הוסף
        </button>
      </form>
      {addError && <p className="error-text">{addError}</p>}
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="muted" role="status">
          טוען…
        </p>
      ) : (
        <ul className="genre-list" aria-label="רשימת הז'אנרים">
          {list.map((genre) => {
            const count = genreUsage(genre, books).bookIds.length;
            return (
              <li key={genre} className="genre-item">
                <span className="genre-name">{genre}</span>
                {count > 0 && (
                  <span className="muted genre-count">{count === 1 ? 'ספר אחד' : `${count} ספרים`}</span>
                )}
                <span className="genre-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    aria-label={`שנה שם: ${genre}`}
                    onClick={() => startRename(genre)}
                  >
                    שנה שם
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    aria-label={`מחק: ${genre}`}
                    onClick={() => startDelete(genre)}
                  >
                    מחק
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && unlisted.length > 0 && (
        <>
          <h4 className="genre-subtitle">ז'אנרים בספרים שאינם ברשימה</h4>
          <ul className="genre-list" aria-label="ז'אנרים שאינם ברשימה">
            {unlisted.map((genre) => (
              <li key={genre} className="genre-item">
                <span className="genre-name">{genre}</span>
                <span className="genre-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    aria-label={`הוסף לרשימה: ${genre}`}
                    onClick={() => save({ list: addGenre(list, genre) })}
                  >
                    הוסף לרשימה
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {dialog?.kind === 'rename' && (
        <Dialog open title="שינוי שם ז'אנר" onClose={closeDialog}>
          {dialog.ask ? (
            <>
              <p>{`הז'אנר "${dialog.genre}" מופיע ${usagePhrase(dialog.ask.usage)}. לשנות גם בהם?`}</p>
              {dialog.ask.plan.merged && (
                <p className="muted">{`"${dialog.ask.plan.to}" כבר ברשימה, ולכן שני הז'אנרים יאוחדו.`}</p>
              )}
              <div className="dialog-actions">
                <button type="button" className="btn btn-primary" onClick={() => finishRename(true)}>
                  {applyEverywhereLabel(dialog.ask.usage)}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => finishRename(false)}>
                  רק ברשימה
                </button>
                <button type="button" className="btn btn-ghost" onClick={closeDialog}>
                  ביטול
                </button>
              </div>
            </>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                continueRename();
              }}
              noValidate
            >
              <label className="field">
                <span className="field-label">שם חדש</span>
                <input
                  type="text"
                  value={dialog.name}
                  onChange={(event) => setDialog({ ...dialog, name: event.target.value, error: '' })}
                  aria-invalid={Boolean(dialog.error)}
                  autoComplete="off"
                  autoFocus
                />
                {dialog.error && <span className="error-text">{dialog.error}</span>}
              </label>
              <div className="dialog-actions">
                <button type="submit" className="btn btn-primary">
                  המשך
                </button>
                <button type="button" className="btn btn-ghost" onClick={closeDialog}>
                  ביטול
                </button>
              </div>
            </form>
          )}
        </Dialog>
      )}

      {dialog?.kind === 'delete' && (
        <Dialog open title="מחיקת ז'אנר" onClose={closeDialog}>
          {dialog.usage.bookIds.length > 0 ? (
            <p>{`הז'אנר "${dialog.genre}" מופיע ${usagePhrase({ ...dialog.usage, goalIds: [] })}. להסיר אותו גם מהספרים?`}</p>
          ) : (
            <p>{`למחוק את "${dialog.genre}" מהרשימה?`}</p>
          )}
          {dialog.usage.goalIds.length > 0 && (
            <p className="muted">
              {`יש ${dialog.usage.goalIds.length === 1 ? 'יעד אחד' : `${dialog.usage.goalIds.length} יעדים`} לז'אנר הזה. היעדים לא ימחקו, אבל אם הז'אנר יוסר מהספרים הם יפסיקו להתקדם.`}
            </p>
          )}
          <div className="dialog-actions">
            {dialog.usage.bookIds.length > 0 ? (
              <>
                <button type="button" className="btn btn-danger" onClick={() => finishDelete(true)}>
                  הסר גם מהספרים
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => finishDelete(false)}>
                  מחק רק מהרשימה
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-danger" onClick={() => finishDelete(false)}>
                מחק
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={closeDialog}>
              ביטול
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
