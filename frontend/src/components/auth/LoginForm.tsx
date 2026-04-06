import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface LoginFormProps {
    loading: boolean;
    loginEmail: string;
    loginPassword: string;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onOAuth: (provider: 'google' | 'github' | 'microsoft') => void;
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

            <div className="theme-text-soft grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs uppercase tracking-wide">
                <span className="h-px bg-[color:color-mix(in_srgb,var(--border-soft)_80%,transparent)]" />
                Or continue with
                <span className="h-px bg-[color:color-mix(in_srgb,var(--border-soft)_80%,transparent)]" />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
                <Button onClick={() => onOAuth('google')} variant="secondary" className="bg-transparent">
                    Google
                </Button>
                <Button onClick={() => onOAuth('github')} variant="secondary" className="bg-transparent">
                    GitHub
                </Button>
                <Button onClick={() => onOAuth('microsoft')} variant="secondary" className="bg-transparent">
                    Microsoft
                </Button>
            </div>

            <p className="theme-text-muted mt-6 text-center text-sm">
                New here?{' '}
                <button onClick={onSwitchToRegister} className="font-semibold text-[color:var(--accent-strong)] hover:text-[color:var(--accent)]" type="button">
                    Create account
                </button>
            </p>
        </>
    );
}
