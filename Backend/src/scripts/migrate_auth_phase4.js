import pool from '../db.js';

const migrate = async () => {
    console.log('Starting Phase 4 auth migration...');

    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS oauth_accounts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
                provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'github', 'microsoft', 'whatsapp')),
                provider_user_id VARCHAR(255) NOT NULL,
                provider_email VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(provider, provider_user_id),
                UNIQUE(user_id, provider)
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS mfa_settings (
                user_id UUID PRIMARY KEY REFERENCES api_users(id) ON DELETE CASCADE,
                secret_encrypted TEXT,
                is_enabled BOOLEAN DEFAULT FALSE,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await pool.query('CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider);');

        console.log('Phase 4 auth migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Phase 4 auth migration failed:', error);
        process.exit(1);
    }
};

migrate();
