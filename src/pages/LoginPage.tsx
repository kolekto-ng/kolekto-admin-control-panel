import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore, consumeSessionRedirectReason } from '@/stores/authStore';

// Resolve the current Supabase project identity for the diagnostics panel.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
const projectRef = supabaseUrl.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] || "unknown";
const KNOWN_ENVIRONMENTS: Record<string, string> = {
  busfgcmbndleljklrcbd: "production",
  lpeeckqsltxohppheucz: "test",
};
const environment = KNOWN_ENVIRONMENTS[projectRef] ?? "unknown";
const apiUrl = (import.meta.env.VITE_API_URL as string) || "(not set)";

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const { signIn, loading, user, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  // Consume the redirect reason exactly once on mount so re-renders don't
  // flash it again after the user dismisses it.
  useEffect(() => {
    const message = consumeSessionRedirectReason();
    if (message) setRedirectMessage(message);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedirectMessage(null); // clear any previous session banner on new attempt

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: 'Login failed',
        description: error.message || 'Invalid email or password',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Login successful',
        description: 'Welcome to Kolekto Admin Dashboard',
      });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-center mb-8">
          <img
            src="/lovable-uploads/6fdf0a9f-1402-4c43-b9bf-be38c3e2d490.png"
            alt="Kolekto Logo"
            className="h-12"
          />
        </div>

        {/* Session / environment mismatch banner */}
        {redirectMessage && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-md p-4">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
            <span>{redirectMessage}</span>
          </div>
        )}

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
          </form>
        </div>

        {/* Startup diagnostics — helps catch environment cross-wiring fast */}
        <details className="text-xs text-muted-foreground">
          <summary className="flex items-center gap-1.5 cursor-pointer select-none text-gray-400 hover:text-gray-600">
            <Info className="h-3.5 w-3.5" />
            Environment diagnostics
          </summary>
          <div className="mt-2 bg-white border rounded-md p-3 font-mono space-y-1 text-[11px]">
            <div><span className="text-gray-400">Environment:</span> <span className={environment === "production" ? "text-red-600 font-semibold" : "text-blue-600"}>{environment}</span></div>
            <div><span className="text-gray-400">Project ref:</span> {projectRef}</div>
            <div><span className="text-gray-400">Supabase URL:</span> {supabaseUrl || "—"}</div>
            <div><span className="text-gray-400">Backend API:</span> {apiUrl}</div>
            <div><span className="text-gray-400">Vite mode:</span> {import.meta.env.MODE}</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default LoginPage;
