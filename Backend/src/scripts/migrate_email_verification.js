import pool from '../db.js';

const migrate = async () => {
    console.log('Starting email verification migration...');

    try {
        // Add email_verified column to api_users
        await pool.query(`
            ALTER TABLE api_users 
            ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
        `);

        // Create email_verification table for pending verifications
        await pool.query(`
            CREATE TABLE IF NOT EXISTS email_verification (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
                email VARCHAR(255) NOT NULL,
                verification_token VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP + INTERVAL '24 hours'
            );
        `);

        await pool.query('CREATE INDEX IF NOT EXISTS idx_email_verification_user_id ON email_verification(user_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_email_verification_token ON email_verification(verification_token);');

        // Backfill existing users as email_verified=TRUE
        await pool.query(`UPDATE api_users SET email_verified=TRUE WHERE email_verified IS FALSE;`);

        console.log('Email verification migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Email verification migration failed:', error);
        process.exit(1);
    }
};

migrate();
