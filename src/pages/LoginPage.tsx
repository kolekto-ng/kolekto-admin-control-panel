
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo, hardcode admin credentials
      if (email === 'admin@kolekto.com' && password === 'admin123') {
        toast({
          title: 'Login successful',
          description: 'Welcome to Kolekto Admin Dashboard',
        });
        navigate('/');
      } else {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred during login. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <img 
            src="/lovable-uploads/6fdf0a9f-1402-4c43-b9bf-be38c3e2d490.png" 
            alt="Kolekto Logo" 
            className="h-12" 
          />
        </div>

        <div className="bg-white p-8 rounded-lg shadow-md border">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Login</h1>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@kolekto.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-kolekto-orange hover:bg-kolekto-orange/90" 
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground mt-4">
              <p>For demo use: admin@kolekto.com / admin123</p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
