import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { saveGenreChange } from '../firebase/genreUpdates';
import { renderWithAuth, testUser } from '../test/renderWithAuth';
import GenreManager from './GenreManager';

const fixtures = vi.hoisted(() => ({ genres: null, books: [], goals: [] }));

vi.mock('../firebase/settings', () => ({
  subscribeGenres: vi.fn((uid, onData) => {
    onData(fixtures.genres);
    return () => {};
  }),
}));

vi.mock('../firebase/books', () => ({
  subscribeBooks: vi.fn((uid, onData) => {
    onData(fixtures.books);
    return () => {};
  }),
}));

vi.mock('../firebase/goals', () => ({
  subscribeGoals: vi.fn((uid, onData) => {
    onData(fixtures.goals);
    return () => {};
  }),
}));

vi.mock('../firebase/genreUpdates', () => ({
  saveGenreChange: vi.fn(async () => {}),
}));

const LIST = ['מדע בדיוני', 'מתח', 'רומן'];

beforeEach(() => {
  fixtures.genres = LIST;
  fixtures.books = [
    { id: 'b1', title: 'Dune', genre: 'מדע בדיוני' },
    { id: 'b2', title: 'Foundation', genre: 'מדע בדיוני' },
    { id: 'b3', title: 'נעלמת', genre: 'מותחן פסיכולוגי' },
  ];
  fixtures.goals = [{ id: 'g1', type: 'genre', genre: 'מדע בדיוני' }];
});

const genreList = () => screen.getByRole('list', { name: "רשימת הז'אנרים" });
const dialog = () => screen.getByRole('dialog');

describe('GenreManager — the list', () => {
  it('shows the saved list alphabetically, with book counts', () => {
    fixtures.genres = ['רומן', 'מתח', 'מדע בדיוני'];
    renderWithAuth(<GenreManager />);
    const items = within(genreList()).getAllByRole('listitem');
    expect(items.map((item) => item.querySelector('.genre-name').textContent)).toEqual(LIST);
    expect(items[0]).toHaveTextContent('2 ספרים');
  });

  it('starts from the default genres', () => {
    fixtures.genres = null;
    renderWithAuth(<GenreManager />);
    expect(within(genreList()).getAllByRole('listitem')).toHaveLength(14);
  });

  it('offers to add genres used in books that are not in the list', async () => {
    renderWithAuth(<GenreManager />);
    const unlisted = screen.getByRole('list', { name: "ז'אנרים שאינם ברשימה" });
    expect(unlisted).toHaveTextContent('מותחן פסיכולוגי');
    await userEvent.click(within(unlisted).getByRole('button', { name: 'הוסף לרשימה: מותחן פסיכולוגי' }));
    expect(saveGenreChange).toHaveBeenCalledWith(testUser.uid, {
      list: ['מדע בדיוני', 'מותחן פסיכולוגי', 'מתח', 'רומן'],
    });
  });
});

describe('GenreManager — add', () => {
  it('adds a genre in alphabetical order and clears the field', async () => {
    renderWithAuth(<GenreManager />);
    const input = screen.getByRole('textbox', { name: "ז'אנר חדש" });
    await userEvent.type(input, ' אגדות ');
    await userEvent.click(screen.getByRole('button', { name: 'הוסף' }));
    expect(saveGenreChange).toHaveBeenCalledWith(testUser.uid, { list: ['אגדות', ...LIST] });
    expect(input).toHaveValue('');
  });

  it('refuses an empty name or one already in the list', async () => {
    renderWithAuth(<GenreManager />);
    await userEvent.click(screen.getByRole('button', { name: 'הוסף' }));
    expect(screen.getByText("יש להזין שם ז'אנר")).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: "ז'אנר חדש" }), 'מתח');
    await userEvent.click(screen.getByRole('button', { name: 'הוסף' }));
    expect(screen.getByText("הז'אנר כבר קיים ברשימה")).toBeInTheDocument();
    expect(saveGenreChange).not.toHaveBeenCalled();
  });

  it('reports a failed save', async () => {
    saveGenreChange.mockRejectedValueOnce(new Error('denied'));
    renderWithAuth(<GenreManager />);
    await userEvent.type(screen.getByRole('textbox', { name: "ז'אנר חדש" }), 'שירה');
    await userEvent.click(screen.getByRole('button', { name: 'הוסף' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('השמירה נכשלה');
  });
});

describe('GenreManager — rename', () => {
  async function rename(genre, name) {
    await userEvent.click(screen.getByRole('button', { name: `שנה שם: ${genre}` }));
    const input = within(dialog()).getByRole('textbox', { name: 'שם חדש' });
    await userEvent.clear(input);
    await userEvent.type(input, name);
    await userEvent.click(within(dialog()).getByRole('button', { name: 'המשך' }));
  }

  it('renames an unused genre without asking', async () => {
    renderWithAuth(<GenreManager />);
    await rename('מתח', 'מותחן');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(saveGenreChange).toHaveBeenCalledWith(testUser.uid, { list: ['מדע בדיוני', 'מותחן', 'רומן'] });
  });

  it('asks whether to rename in books and goals too, and does', async () => {
    renderWithAuth(<GenreManager />);
    await rename('מדע בדיוני', 'מד"ב');
    expect(dialog()).toHaveTextContent('הז\'אנר "מדע בדיוני" מופיע ב‑2 ספרים וביעד אחד. לשנות גם בהם?');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'שנה גם בספרים וביעדים' }));
    expect(saveGenreChange).toHaveBeenCalledWith(testUser.uid, {
      list: ['מד"ב', 'מתח', 'רומן'],
      bookIds: ['b1', 'b2'],
      goalIds: ['g1'],
      genre: 'מד"ב',
    });
  });

  it('can rename only in the list', async () => {
    renderWithAuth(<GenreManager />);
    await rename('מדע בדיוני', 'מד"ב');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'רק ברשימה' }));
    expect(saveGenreChange).toHaveBeenCalledWith(testUser.uid, { list: ['מד"ב', 'מתח', 'רומן'] });
  });

  it('says when two genres will be merged', async () => {
    fixtures.goals = [];
    renderWithAuth(<GenreManager />);
    await rename('מדע בדיוני', 'רומן');
    expect(dialog()).toHaveTextContent('"רומן" כבר ברשימה, ולכן שני הז\'אנרים יאוחדו.');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'שנה גם בספרים' }));
    expect(saveGenreChange).toHaveBeenCalledWith(testUser.uid, {
      list: ['מתח', 'רומן'],
      bookIds: ['b1', 'b2'],
      goalIds: [],
      genre: 'רומן',
    });
  });

  it('refuses an empty new name, and cancels without saving', async () => {
    renderWithAuth(<GenreManager />);
    await userEvent.click(screen.getByRole('button', { name: 'שנה שם: מתח' }));
    await userEvent.clear(within(dialog()).getByRole('textbox', { name: 'שם חדש' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'המשך' }));
    expect(within(dialog()).getByText("יש להזין שם ז'אנר")).toBeInTheDocument();
    await userEvent.click(within(dialog()).getByRole('button', { name: 'ביטול' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(saveGenreChange).not.toHaveBeenCalled();
  });
});

describe('GenreManager — delete', () => {
  it('asks whether to remove a used genre from the books too, warning about goals', async () => {
    renderWithAuth(<GenreManager />);
    await userEvent.click(screen.getByRole('button', { name: 'מחק: מדע בדיוני' }));
    expect(dialog()).toHaveTextContent('מופיע ב‑2 ספרים. להסיר אותו גם מהספרים?');
    expect(dialog()).toHaveTextContent("יש יעד אחד לז'אנר הזה");
    await userEvent.click(within(dialog()).getByRole('button', { name: 'הסר גם מהספרים' }));
    expect(saveGenreChange).toHaveBeenCalledWith(testUser.uid, {
      list: ['מתח', 'רומן'],
      bookIds: ['b1', 'b2'],
      genre: null,
    });
  });

  it('can delete only from the list', async () => {
    renderWithAuth(<GenreManager />);
    await userEvent.click(screen.getByRole('button', { name: 'מחק: מדע בדיוני' }));
    await userEvent.click(within(dialog()).getByRole('button', { name: 'מחק רק מהרשימה' }));
    expect(saveGenreChange).toHaveBeenCalledWith(testUser.uid, { list: ['מתח', 'רומן'] });
  });

  it('confirms deleting an unused genre', async () => {
    renderWithAuth(<GenreManager />);
    await userEvent.click(screen.getByRole('button', { name: 'מחק: מתח' }));
    expect(dialog()).toHaveTextContent('למחוק את "מתח" מהרשימה?');
    await userEvent.click(within(dialog()).getByRole('button', { name: 'מחק' }));
    expect(saveGenreChange).toHaveBeenCalledWith(testUser.uid, { list: ['מדע בדיוני', 'רומן'] });
  });
});
