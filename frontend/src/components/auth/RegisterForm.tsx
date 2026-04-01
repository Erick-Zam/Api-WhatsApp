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
    onOAuth: (provider: 'google' | 'github') => void;
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

            <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs uppercase tracking-wide text-zinc-500">
                <span className="h-px bg-zinc-800" />
                Or register with
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
                Already have an account?{' '}
                <button onClick={onSwitchToLogin} className="font-semibold text-cyan-300 hover:text-cyan-200" type="button">
                    Sign in
                </button>
            </p>
        </>
    );
}
