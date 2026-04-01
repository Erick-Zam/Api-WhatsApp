import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface LoginFormProps {
    loading: boolean;
    loginEmail: string;
    loginPassword: string;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onOAuth: (provider: 'google' | 'github') => void;
    onSwitchToRegister: () => void;
}

export default function LoginForm({
    loading,
    loginEmail,
    loginPassword,
    onSubmit,
    onEmailChange,
    onPasswordChange,
    onOAuth,
    onSwitchToRegister,
}: LoginFormProps) {
    return (
        <>
            <form onSubmit={onSubmit} className="space-y-4">
                <Input
                    type="email"
                    label="Work email"
                    value={loginEmail}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="team@company.com"
                    required
                />
                <Input
                    type="password"
                    label="Password"
                    value={loginPassword}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    placeholder="Your password"
                    required
                />
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-zinc-950 hover:brightness-110">
                    {loading ? 'Signing in...' : 'Sign in'}
                </Button>
            </form>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs uppercase tracking-wide text-zinc-500">
                <span className="h-px bg-zinc-800" />
                Or continue with
                <span className="h-px bg-zinc-800" />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => onOAuth('google')} variant="secondary" className="border border-zinc-700 bg-transparent text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900">
                    Google
                </Button>
                <Button onClick={() => onOAuth('github')} variant="secondary" className="border border-zinc-700 bg-transparent text-zinc-200 hover:border-zinc-500 hover:bg-zinc-900">
                    GitHub
                </Button>
            </div>

            <p className="mt-6 text-center text-sm text-zinc-400">
                New here?{' '}
                <button onClick={onSwitchToRegister} className="font-semibold text-cyan-300 hover:text-cyan-200" type="button">
                    Create account
                </button>
            </p>
        </>
    );
}
