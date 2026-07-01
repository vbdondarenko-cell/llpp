# LinkUp Supabase Setup Guide

## Quick Start

### 1. Create Supabase Project
1. Go to supabase.com
2. Create new project
3. Note down Project URL, anon key, service_role key

### 2. Configure Environment
Create .env.local:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

### 3. Run Migrations
Run migrations in order via SQL Editor or CLI:
```bash
supabase db push
```

### 4. Enable Extensions
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 5. Set Up Storage
Run storage configuration from docs/STORAGE.md

### 6. Create Admin User
```sql
INSERT INTO public.admin_users (user_id, role)
VALUES ('your-user-uuid', 'admin');
```

## Migration Files
| File | Description |
|------|-------------|
| 001_genesis.sql | Tables, enums, RLS policies |
| 002_seed_and_functions.sql | Seed data, indexes, triggers |
| 003_rpc_functions.sql | All RPC functions |
| 004_admin_and_realtime.sql | Admin functions, realtime config |

## Verification
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SELECT COUNT(*) FROM public.interests;
SELECT COUNT(*) FROM public.achievements;
```
