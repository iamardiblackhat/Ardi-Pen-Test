import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Shield } from 'lucide-react';
import { Button } from '@workspace/ardi-ds/components/ui/button';
import { Input } from '@workspace/ardi-ds/components/ui/input';
import { Label } from '@workspace/ardi-ds/components/ui/label';
import { useRegister } from '@workspace/api-client-react';
import { auth } from '@/lib/auth';
import { useToast } from '@workspace/ardi-ds/hooks/use-toast';
import { backendError } from '@/lib/api-error';

export default function Register() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [password, setPassword] = useState('');
  const registerMutation = useRegister();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate(
      { data: { name, email, orgName, password } },
      {
        onSuccess: (response) => {
          auth.setToken(response.token);
          toast({ title: 'Account created', description: `Welcome to Ardi, ${response.user.name}` });
          setLocation('/onboarding');
        },
        onError: (err: unknown) => {
          toast({ title: 'Registration failed', description: backendError(err, 'Please try again.'), variant: 'destructive' });
        },
      }
    );
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-background text-foreground relative overflow-hidden px-4 py-8">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.16),transparent_65%)]" />
      <div className="absolute inset-0 grid-pattern opacity-30 [mask-image:radial-gradient(ellipse_50%_50%_at_50%_40%,black,transparent)]" />
      <div className="relative w-full max-w-md p-8 bg-card/80 border border-border rounded-2xl backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent rounded-t-2xl" />
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl border border-primary/40 bg-primary/10 mb-4">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
          <p className="text-muted-foreground text-sm mt-2 font-mono">Start securing your infrastructure today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Jane Smith"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              data-testid="input-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              type="text"
              placeholder="Acme Security Corp"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              data-testid="input-org-name"
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
            disabled={registerMutation.isPending}
            data-testid="button-register"
          >
            {registerMutation.isPending ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
