import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Shield } from 'lucide-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { Label } from '@workspace/ardi-ds/components/ui/label';
import { useLogin } from '@workspace/api-client-react';
import { auth } from '@/lib/auth';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { backendError } from '@/lib/api-error';

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (response) => {
          auth.setToken(response.token);
          toast({ title: 'Login successful', description: `Welcome back, ${response.user.name}` });
          setLocation('/dashboard');
        },
        onError: (err: unknown) => {
          toast({ title: 'Login failed', description: backendError(err, 'Incorrect email or password.'), variant: 'destructive' });
        },
      }
    );
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.16),transparent_65%)]" />
      <div className="absolute inset-0 grid-pattern opacity-30 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_40%,black,transparent)]" />
      <div className="relative w-full max-w-md p-8 bg-card/80 border border-border rounded-2xl backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent rounded-t-2xl" />
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl border border-primary/40 bg-primary/10 mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Ardi</h1>
          <p className="text-muted-foreground text-sm mt-2 font-mono">Sign in to your security command center</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="security@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="input-password"
            />
          </div>

          <Button
            type="submit"
            className="w-full glow-primary-strong font-mono"
            disabled={loginMutation.isPending}
            data-testid="button-login"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
