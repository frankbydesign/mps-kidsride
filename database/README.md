# Database Migrations

This folder contains all SQL migration files for the MPS KidsRide project. Migrations are numbered sequentially and should be run in order.

## Migration Files

- `001_initial_schema.sql` - Base database schema with core tables
- `002_volunteer_approval.sql` - Adds volunteer approval workflow
- `003_fix_approval_bugs.sql` - Fixes approval-related bugs
- `004_superseded_status.sql` - Adds superseded status functionality

## Running Migrations

### New Supabase Project Setup

1. Create a new Supabase project or access your existing project
2. Navigate to the SQL Editor in your Supabase dashboard
3. Run each migration file **in numerical order** (001, 002, 003, 004)
4. Copy and paste the contents of each file into the SQL Editor
5. Execute each migration and verify it completes successfully before proceeding to the next

### Important Notes

⚠️ **WARNING**: Each migration should only be run **once** on a given database. Running migrations multiple times may cause errors or data corruption.

- Migrations build on each other and must be run in sequence
- Do not skip migrations - they depend on previous schema changes
- If a migration fails, investigate and fix the issue before proceeding
- Keep track of which migrations have been applied to your database

## Development Workflow

When making database schema changes:

1. Create a new migration file with the next sequential number
2. Use descriptive names (e.g., `005_add_user_preferences.sql`)
3. Test the migration on a development database first
4. Document any breaking changes or required data migrations
5. Update this README with the new migration details

## Rollback

These migrations do not include automatic rollback scripts. If you need to undo a migration:

1. Manually write the inverse SQL operations
2. Test thoroughly on a development database
3. Consider creating a new migration instead of modifying existing ones
