import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Home from '../pages/Home';

export default function HomeRoute() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pine-50">
        <p className="text-pine-600">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/searches" replace />;
  }

  return <Home />;
}
