#!/bin/bash
# ==============================================================================
# FASE 3: Cloud Server Migration Script
# ==============================================================================
# This script connects to the PostgreSQL database and executes the clean migration
# Usage: ./deploy_fase3.sh
# 
# Requirements:
# - PostgreSQL client (psql) installed
# - Environment variables set: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}FASE 3: CLOUD MIGRATION - Clean Deploy${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: psql not found. Install PostgreSQL client first.${NC}"
    exit 1
fi

# Check environment variables
if [ -z "$PGHOST" ] || [ -z "$PGUSER" ] || [ -z "$PGDATABASE" ]; then
    echo -e "${RED}ERROR: Required environment variables not set:${NC}"
    echo -e "${RED}  - PGHOST${NC}"
    echo -e "${RED}  - PGPORT (optional, default: 5432)${NC}"
    echo -e "${RED}  - PGUSER${NC}"
    echo -e "${RED}  - PGPASSWORD${NC}"
    echo -e "${RED}  - PGDATABASE${NC}"
    exit 1
fi

PGPORT=${PGPORT:-5432}

echo -e "${GREEN}✓ Configuration:${NC}"
echo "  Host: $PGHOST"
echo "  Port: $PGPORT"
echo "  User: $PGUSER"
echo "  Database: $PGDATABASE"
echo ""

# Test connection
echo -e "${YELLOW}Testing database connection...${NC}"
if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT NOW();" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Failed to connect to database${NC}"
    exit 1
fi
echo ""

# Backup database (optional but recommended)
echo -e "${YELLOW}Creating database backup...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" > "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✓ Database backed up to: $BACKUP_FILE${NC}"
else
    echo -e "${YELLOW}⚠ Backup failed, continuing anyway...${NC}"
fi
echo ""

# Execute migration
echo -e "${YELLOW}Executing FASE 3 migration...${NC}"
echo -e "${YELLOW}  - Dropping old audit tables${NC}"
echo -e "${YELLOW}  - Creating fresh audit compliance tables${NC}"
echo -e "${YELLOW}  - Creating indexes and constraints${NC}"
echo ""

if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -f migration_fase3_clean_destructive.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Migration executed successfully${NC}"
else
    echo -e "${RED}✗ Migration failed${NC}"
    echo "Attempting to restore from backup..."
    if [ -f "$BACKUP_FILE" ]; then
        psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" < "$BACKUP_FILE"
        echo -e "${GREEN}✓ Database restored from backup${NC}"
    fi
    exit 1
fi
echo ""

# Verify migration
echo -e "${YELLOW}Verifying migration...${NC}"
TABLE_COUNT=$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('audit_events', 'data_access_logs', 'security_events', 'failed_login_attempts', 'user_role_changes', 'consent_records', 'data_deletion_logs', 'admin_actions_log', 'api_key_rotation_log', 'session_activity_log', 'compliance_reports_log');")

if [ "$TABLE_COUNT" -eq 11 ]; then
    echo -e "${GREEN}✓ All 11 audit tables created successfully${NC}"
else
    echo -e "${YELLOW}⚠ Expected 11 tables, found $TABLE_COUNT${NC}"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ FASE 3 Migration Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "1. Restart Backend service"
echo "2. Verify audit logging is working"
echo "3. Check Backend logs for any errors"
echo ""
