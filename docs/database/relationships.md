# Database Structure & Logic

This document explains the database design in `schema.sql`.

## Why PostgreSQL?
We chose PostgreSQL because it handles **JSONB** data efficiently. WhatsApp messages are complex JSON objects (especially Polls and Interactive messages), and storing them directly while keeping structured indexable fields is crucial.

## Tables Explained

### `api_users`
- **Purpose**: Managing access to your API.
- **Key Logic**: Every request to send a message should come from a valid user. You can expand this to rate-limit users based on their role.

### `whatsapp_sessions`
- **Purpose**: Managing multiple WhatsApp numbers/devices.
- **Scalability**: Currently, the code uses local files (`auth_info_baileys`). For production with 100+ connected numbers, you would move the session storage into the `auth_data` JSONB column here.

### `contacts`
- **Purpose**: A CRM-like list of everyone who has messaged the bot or whom the bot has messaged.
- **Key Logic**: The `jid` (Jabber ID) is the unique identifier on WhatsApp (e.g., `12345678@s.whatsapp.net`).

### `message_logs`
- **Purpose**: Audit trail and analytics.
- **Optimization**: We separate `content` (searchable text) from `raw_message` (full data). This allows you to run SQL queries like:
  ```sql
  SELECT * FROM message_logs WHERE content ILIKE '%buy%' AND timestamp > NOW() - INTERVAL '1 day';
  ```
