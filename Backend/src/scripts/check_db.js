
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const checkDB = async () => {
    try {
        const client = await pool.connect();
        console.log('Connected to DB');

        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);

        console.log('Tables found:', tables.rows.map(r => r.table_name));

        const users = await client.query('SELECT count(*) FROM api_users');
        console.log('Users count:', users.rows[0].count);

        const roles = await client.query('SELECT count(*) FROM roles');
        console.log('Roles count:', roles.rows[0].count);

        client.release();
    } catch (err) {
        console.error('DB Check Failed:', err);
    } finally {
        pool.end();
    }
};

checkDB();
