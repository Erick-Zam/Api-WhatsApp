import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Panel from '@/components/ui/Panel';

interface MfaFormProps {
    loading: boolean;
    mfaCode: string;
    trustDevice: boolean;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
    onCodeChange: (value: string) => void;
    onTrustDeviceChange: (value: boolean) => void;
    onBackToLogin: () => void;
}

export default function MfaForm({
    loading,
    mfaCode,
    trustDevice,
    onSubmit,
    onCodeChange,
    onTrustDeviceChange,
    onBackToLogin,
}: MfaFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <Input
                type="text"
                label="Authenticator code"
                value={mfaCode}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="123456"
                required
            />
            <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-400 to-cyan-400 text-zinc-950 hover:brightness-110">
                {loading ? 'Verifying...' : 'Verify and continue'}
            </Button>
            <Panel className="px-3 py-2">
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                    <input
                        type="checkbox"
                        checked={trustDevice}
                        onChange={(e) => onTrustDeviceChange(e.target.checked)}
                        className="h-4 w-4"
                    />
                    Trust this device for next logins
                </label>
            </Panel>
            <Button
                type="button"
                onClick={onBackToLogin}
                variant="secondary"
                className="w-full border border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900"
            >
                Back to sign in
            </Button>
        </form>
    );
}
