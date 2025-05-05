
import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Loader2 } from 'lucide-react';

export const AdminLayout = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      // In a real app, this would check session storage, cookies, or an API
      const fakeAuthDelay = setTimeout(() => {
        const isLoggedIn = localStorage.getItem('kolekto-admin-auth') === 'true';
        setIsAuthenticated(isLoggedIn);
        
        if (!isLoggedIn) {
          navigate('/login');
        }
      }, 500);
      
      return () => clearTimeout(fakeAuthDelay);
    };
    
    checkAuth();
  }, [navigate]);

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-kolekto-orange mb-2" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
