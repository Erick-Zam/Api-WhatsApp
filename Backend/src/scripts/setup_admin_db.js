
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables for standalone execution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const setupAdminDB = async () => {
    const client = await pool.connect();
    try {
        console.log('Starting Admin DB Setup...');

        await client.query('BEGIN');

        // 1. Create Roles Table
        console.log('Creating roles table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT
            );
        `);

        // Insert default roles
        await client.query(`
            INSERT INTO roles (name, description)
            VALUES 
                ('admin', 'Administrator with full access'),
                ('general', 'Standard user with API access')
            ON CONFLICT (name) DO NOTHING;
        `);

        // 2. Update Users Table
        console.log('Updating api_users table...');

        // Check if role_id exists
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='api_users' AND column_name='role_id';
        `);

        if (res.rows.length === 0) {
            await client.query(`ALTER TABLE api_users ADD COLUMN role_id INTEGER REFERENCES roles(id);`);
        }

        // Assign 'admin' role to the first user (or all existing users if we want to be safe for now, but user said 'al unico usuario')
        // We'll assign admin to the first created user, and general to others if any.
        // Actually, user said "asignale al unico usuario el rol de admin".
        const adminRoleRes = await client.query(`SELECT id FROM roles WHERE name = 'admin'`);
        const adminRoleId = adminRoleRes.rows[0].id;

        await client.query(`
            UPDATE api_users 
            SET role_id = $1 
            WHERE role_id IS NULL;
        `, [adminRoleId]);

        // Remove old 'role' column if it exists and we want to cleanup, 
        // OR verify if we should keep it for backward compatibility. 
        // routes/auth.js uses 'role' column. We should probably migrate data if it was used, 
        // but for now we'll just switch the code to use role_id or join with roles.
        // Let's keep 'role' for now but maybe sync it? Or just ignore it.
        // Better: We will start using role_id in the code.

        // 3. Create Activity Logs Table
        console.log('Creating activity_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS activity_logs (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
                action VARCHAR(100) NOT NULL,
                details JSONB,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Create API Usage Logs Table (Extensive monitoring)
        console.log('Creating api_usage_logs table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS api_usage_logs (
                id SERIAL PRIMARY KEY,
                user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
                endpoint VARCHAR(255) NOT NULL,
                method VARCHAR(10) NOT NULL,
                status_code INTEGER,
                response_time_ms INTEGER,
                user_agent TEXT,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Index for performance on logs
        await client.query(`CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage_logs(created_at);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);`);

        await client.query('COMMIT');
        console.log('Admin DB Setup completed successfully.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error setting up Admin DB:', e);
    } finally {
        client.release();
        await pool.end();
    }
};

setupAdminDB();
