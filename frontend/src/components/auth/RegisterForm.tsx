import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface RegisterFormProps {
    loading: boolean;
    registerUsername: string;
    registerEmail: string;
    registerPassword: string;
    registerPasswordConfirm: string;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onUsernameChange: (value: string) => void;
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onPasswordConfirmChange: (value: string) => void;
    onOAuth: (provider: 'google' | 'github' | 'microsoft') => void;
    onSwitchToLogin: () => void;
}

export default function RegisterForm({
    loading,
    registerUsername,
    registerEmail,
    registerPassword,
    registerPasswordConfirm,
    onSubmit,
    onUsernameChange,
    onEmailChange,
    onPasswordChange,
    onPasswordConfirmChange,
    onOAuth,
    onSwitchToLogin,
}: RegisterFormProps) {
    return (
        <>
            <form onSubmit={onSubmit} className="space-y-4">
                <Input
                    type="text"
                    label="Workspace name"
                    value={registerUsername}
                    onChange={(e) => onUsernameChange(e.target.value)}
                    placeholder="Acme Team"
                    required
                />
                <Input
                    type="email"
                    label="Email"
                    value={registerEmail}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="owner@company.com"
                    required
                />
                <Input
                    type="password"
                    label="Password"
                    value={registerPassword}
                    onChange={(e) => onPasswordChange(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                />
                <Input
                    type="password"
                    label="Confirm password"
                    value={registerPasswordConfirm}
                    onChange={(e) => onPasswordConfirmChange(e.target.value)}
                    placeholder="Repeat your password"
                    required
                />
                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-zinc-950 hover:brightness-110">
                    {loading ? 'Creating account...' : 'Create account'}
                </Button>
            </form>

            <div className="theme-text-soft my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs uppercase tracking-wide">
                <span className="h-px bg-[color:color-mix(in_srgb,var(--border-soft)_80%,transparent)]" />
                Or register with
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
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} className="font-semibold text-[color:var(--accent-strong)] hover:text-[color:var(--accent)]" type="button">
                    Sign in
                </button>
            </p>
        </>
    );
}
