import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { bookDoc } from './books';
import { db } from './config';
import { goalsCollection } from './goals';
import { localWrite } from './localWrite';
import { genresDoc } from './settings';

// Firestore allows up to 500 writes per batch; leave room for the list document.
export const GENRE_BATCH_LIMIT = 400;

// Saves the genre list and sets `genre` on the given books and goals (null removes it from
// books). The list goes in the first batch, so the list and the first books change together.
// Resolves once the writes are in the local cache (see localWrite), so it also works offline.
export async function saveGenreChange(uid, { list, bookIds = [], goalIds = [], genre }) {
  const updatedAt = serverTimestamp();
  const writes = [
    (batch) => batch.set(genresDoc(uid), { list, updatedAt }),
    ...bookIds.map((id) => (batch) => batch.update(bookDoc(uid, id), { genre, updatedAt })),
    ...goalIds.map(
      (id) => (batch) => batch.update(doc(goalsCollection(uid), id), { genre, updatedAt }),
    ),
  ];
  for (let i = 0; i < writes.length; i += GENRE_BATCH_LIMIT) {
    const batch = writeBatch(db);
    writes.slice(i, i + GENRE_BATCH_LIMIT).forEach((write) => write(batch));
    localWrite(batch.commit());
  }
}
