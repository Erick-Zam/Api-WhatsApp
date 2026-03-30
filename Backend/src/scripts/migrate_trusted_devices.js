import pool from '../db.js';

const migrate = async () => {
    console.log('Starting trusted devices migration...');

    try {
        // Create trusted_devices table for MFA device tracking
        await pool.query(`
            CREATE TABLE IF NOT EXISTS trusted_devices (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES api_users(id) ON DELETE CASCADE,
                device_fingerprint VARCHAR(255) NOT NULL,
                device_name VARCHAR(255),
                trusted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, device_fingerprint)
            );
        `);

        await pool.query('CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);');
        await pool.query('CREATE INDEX IF NOT EXISTS idx_trusted_devices_fingerprint ON trusted_devices(device_fingerprint);');

        console.log('Trusted devices migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Trusted devices migration failed:', error);
        process.exit(1);
    }
};

migrate();
