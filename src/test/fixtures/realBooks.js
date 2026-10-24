// Real books, shaped like the documents the app saves, for tests across features
// (export, genre changes, stats, goal progress). Titles, authors, pages and ISBNs follow the
// Google Books and National Library records; reading dates and ratings are made up.

// Stands in for a Firestore Timestamp.
export const timestamp = (iso) => ({ toDate: () => new Date(iso) });

const COVER_DATA = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';

const book = (id, fields) => ({
  id,
  author: null,
  genre: null,
  pages: null,
  isbn: null,
  coverUrl: null,
  coverData: null,
  status: 'finished',
  startDate: null,
  endDate: null,
  summary: null,
  rating: null,
  review: null,
  abandonReason: null,
  tags: [],
  createdAt: timestamp('2026-01-01T08:00:00Z'),
  updatedAt: timestamp('2026-01-01T08:00:00Z'),
  ...fields,
});

export const REAL_BOOKS = [
  book('oz-love', {
    title: 'סיפור על אהבה וחושך',
    author: 'עמוס עוז',
    genre: 'רומן',
    pages: 593,
    isbn: '9650710744',
    coverData: COVER_DATA,
    coverUrl: 'https://www.keter-books.co.il/Media/Uploads/sippuralll(2).jpg',
    startDate: '2026-01-03',
    endDate: '2026-02-10',
    rating: 5,
    review: 'ספר שנשאר איתי הרבה זמן.',
    createdAt: timestamp('2026-01-03T19:00:00Z'),
  }),
  book('dune', {
    title: 'Dune',
    author: 'Frank Herbert',
    genre: 'מדע בדיוני',
    pages: 896,
    isbn: '9780441013593',
    coverUrl: 'https://books.google.com/books/content?id=B1hSG45JCX4C&printsec=frontcover&img=1&zoom=1',
    startDate: '2026-02-12',
    endDate: '2026-03-20',
    rating: 4,
    createdAt: timestamp('2026-02-12T20:00:00Z'),
  }),
  book('foundation', {
    title: 'Foundation',
    author: 'Isaac Asimov',
    genre: 'מדע בדיוני',
    pages: 255,
    isbn: '9780553293357',
    startDate: '2026-03-22',
    endDate: '2026-04-02',
    rating: 4,
    createdAt: timestamp('2026-03-22T18:30:00Z'),
  }),
  book('sapiens', {
    title: 'קיצור תולדות האנושות',
    author: 'יובל נח הררי',
    genre: 'היסטוריה',
    pages: 456,
    startDate: '2026-04-05',
    endDate: '2026-05-30',
    rating: 3,
    createdAt: timestamp('2026-04-05T07:15:00Z'),
  }),
  book('harry-potter', {
    title: 'הארי פוטר ואבן החכמים',
    author: "ג'יי קיי רולינג",
    genre: 'פנטזיה',
    pages: 334,
    coverData: COVER_DATA,
    startDate: '2026-06-01',
    endDate: '2026-06-09',
    rating: 5,
    createdAt: timestamp('2026-06-01T17:00:00Z'),
  }),
  book('gone-girl', {
    // A genre typed freely, not in the list.
    title: 'נעלמת',
    author: 'גיליאן פלין',
    genre: 'מותחן פסיכולוגי',
    pages: 480,
    startDate: '2026-06-15',
    endDate: '2026-07-01',
    rating: 4,
    createdAt: timestamp('2026-06-15T21:00:00Z'),
  }),
  book('my-michael', {
    // Abandoned: counted separately, never in goals.
    title: 'מיכאל שלי',
    author: 'עמוס עוז',
    genre: 'רומן',
    pages: 287,
    status: 'abandoned',
    startDate: '2026-07-05',
    endDate: '2026-07-12',
    abandonReason: 'לא הגיע לי עכשיו.',
    createdAt: timestamp('2026-07-05T20:00:00Z'),
  }),
  book('1984', {
    // A reread in progress: the review is kept, end date and rating were cleared.
    title: '1984',
    author: "ג'ורג' אורוול",
    genre: 'מדע בדיוני',
    pages: 328,
    status: 'reading',
    startDate: '2026-10-10',
    review: 'מפחיד כמה שהוא רלוונטי.',
    createdAt: timestamp('2025-05-01T10:00:00Z'),
  }),
  book('midnight-library', {
    // Want to read: no genre yet.
    title: 'The Midnight Library',
    author: 'Matt Haig',
    pages: 288,
    status: 'want',
    createdAt: timestamp('2026-09-01T12:00:00Z'),
  }),
];

export const REAL_NOTES = {
  'oz-love': [
    { id: 'n1', text: 'הפרק על הספרייה של הסבא.', createdAt: timestamp('2026-01-10T21:00:00Z') },
    { id: 'n2', text: 'הקשר בין הבית לבין ירושלים.', createdAt: timestamp('2026-01-20T21:00:00Z') },
  ],
  dune: [{ id: 'n3', text: 'מערכת האקולוגיה של אראקיס.', createdAt: timestamp('2026-02-20T21:00:00Z') }],
};

export const REAL_QUOTES = {
  dune: [
    { id: 'q1', text: 'I must not fear. Fear is the mind-killer.', page: 8, createdAt: timestamp('2026-02-13T21:00:00Z') },
  ],
};

export const REAL_GOALS = [
  {
    id: 'yearly-books__2026',
    name: 'יעד שנתי',
    type: 'books',
    target: 24,
    genre: null,
    period: 'yearly',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    recurring: true,
    seriesId: 'yearly-books',
    createdAt: timestamp('2026-01-01T08:00:00Z'),
  },
  {
    id: 'scifi-2026',
    name: 'מדע בדיוני השנה',
    type: 'genre',
    target: 4,
    genre: 'מדע בדיוני',
    period: 'custom',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    recurring: false,
    seriesId: null,
    createdAt: timestamp('2026-01-02T08:00:00Z'),
  },
];
