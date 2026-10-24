import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './screens/Login';
import Shelf from './screens/Shelf';
import WantToRead from './screens/WantToRead';
import Goals from './screens/Goals';
import Stats from './screens/Stats';
import Settings from './screens/Settings';
import NewBook from './screens/NewBook';
import BookPage from './screens/BookPage';
import EditBook from './screens/EditBook';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen" role="status">
        טוען…
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Shelf />} />
        <Route path="want" element={<WantToRead />} />
        <Route path="goals" element={<Goals />} />
        <Route path="stats" element={<Stats />} />
        <Route path="settings" element={<Settings />} />
        <Route path="new" element={<NewBook />} />
        <Route path="book/:id" element={<BookPage />} />
        <Route path="book/:id/edit" element={<EditBook />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
