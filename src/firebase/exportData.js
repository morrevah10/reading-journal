import { collection, getDoc, getDocs } from 'firebase/firestore';
import { bookDoc, booksCollection } from './books';
import { ENTRY_KINDS } from './entries';
import { goalsCollection } from './goals';
import { genresDoc } from './settings';

const withId = (snapshot) => ({ id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) });

// Reads everything for the export: books, their notes and quotes, goals and the genre list.
// Offline, getDocs answers from the local cache. `genres` is null when the list was never saved.
export async function fetchAllData(uid) {
  const [booksSnapshot, goalsSnapshot, genresSnapshot] = await Promise.all([
    getDocs(booksCollection(uid)),
    getDocs(goalsCollection(uid)),
    getDoc(genresDoc(uid)),
  ]);
  const books = booksSnapshot.docs.map(withId);

  const notes = {};
  const quotes = {};
  await Promise.all(
    books.map(async (book) => {
      const [noteDocs, quoteDocs] = await Promise.all(
        [ENTRY_KINDS.NOTES, ENTRY_KINDS.QUOTES].map((kind) =>
          getDocs(collection(bookDoc(uid, book.id), kind)),
        ),
      );
      notes[book.id] = noteDocs.docs.map(withId);
      quotes[book.id] = quoteDocs.docs.map(withId);
    }),
  );

  return {
    books,
    notes,
    quotes,
    goals: goalsSnapshot.docs.map(withId),
    genres: genresSnapshot.exists() ? (genresSnapshot.data().list ?? null) : null,
  };
}
