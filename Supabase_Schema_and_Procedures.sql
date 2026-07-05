-- ====================================================================================
-- SYSTEM: Volcani Center Warehouse Request Management System
-- INTEGRATION: Supabase.com / PostgreSQL Database Schema & Relationships Script
-- DESIGNED FOR: PostgreSQL 14+ (Compatible with modern Supabase projects)
-- LINT REFACTOR: Standardized to lowercase snake_case for PostgreSQL best practices
-- ====================================================================================

-- ====================================================================================
-- 0. PRE-FLIGHT INITIAL SETUP
-- ====================================================================================

-- Set local search path
SET search_path TO public;

-- Enable UUID helpers just in case for primary keys extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================================
-- 1. SCHEMAS & TABLES DEFINITIONS (All inside 'public' schema)
-- ====================================================================================

-- A. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    user_id TEXT PRIMARY KEY,
    teudat_zehut VARCHAR(20) NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    job_title TEXT,
    phone TEXT,
    email TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_users_teudat_zehut ON public.users(teudat_zehut);

-- B. Warehouse Items Table
CREATE TABLE IF NOT EXISTS public.warehouse_items (
    sku VARCHAR(100) PRIMARY KEY,
    name_he TEXT NOT NULL,
    name_en TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    price NUMERIC(18,2) NOT NULL DEFAULT 0.00,
    shelf TEXT,
    category_he TEXT,
    category_en TEXT,
    unit_he TEXT,
    unit_en TEXT,
    image_url TEXT,
    image_filter TEXT
);

CREATE INDEX IF NOT EXISTS ix_warehouse_items_sku ON public.warehouse_items(sku);

-- C. Item Picture URLs Table
CREATE TABLE IF NOT EXISTS public.item_picture_urls (
    id TEXT PRIMARY KEY,
    sku VARCHAR(100) NOT NULL REFERENCES public.warehouse_items(sku) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    image_source TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,
    updated_by TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS ix_item_picture_urls_sku ON public.item_picture_urls(sku);

-- D. Attribute Types Table (Includes inline JSON values for high compatibility)
CREATE TABLE IF NOT EXISTS public.attribute_types (
    id TEXT PRIMARY KEY,
    name_he TEXT NOT NULL,
    name_en TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_deleted BOOLEAN DEFAULT FALSE,
    values JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- E. Item Attribute Mappings Table (allowed_value_ids contains whitelist JSONB array)
CREATE TABLE IF NOT EXISTS public.item_mappings (
    item_id VARCHAR(100) NOT NULL REFERENCES public.warehouse_items(sku) ON DELETE CASCADE,
    type_id TEXT NOT NULL REFERENCES public.attribute_types(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN DEFAULT FALSE,
    allowed_value_ids JSONB DEFAULT '[]'::jsonb,
    PRIMARY KEY (item_id, type_id)
);

-- F. Warehouse Requests Table
CREATE TABLE IF NOT EXISTS public.requests (
    request_id TEXT PRIMARY KEY,
    sku VARCHAR(100) NOT NULL REFERENCES public.warehouse_items(sku) ON DELETE CASCADE,
    item_name_he TEXT,
    item_name_en TEXT,
    quantity_requested INTEGER NOT NULL,
    attribute_type_id TEXT,
    attribute_type_name_he TEXT,
    attribute_type_name_en TEXT,
    attribute_value_id TEXT,
    attribute_value_name_he TEXT,
    attribute_value_name_en TEXT,
    request_date TIMESTAMPTZ DEFAULT NOW(),
    requested_by TEXT,
    status_he TEXT,
    status_en TEXT
);

CREATE INDEX IF NOT EXISTS ix_requests_sku ON public.requests(sku);
CREATE INDEX IF NOT EXISTS ix_requests_request_date ON public.requests(request_date DESC);

-- G. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT,
    action_type TEXT NOT NULL,
    table_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    action_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_action_date ON public.audit_logs(action_date DESC);

-- H. Nipuk Records Table (Dispatch Management Ledger)
CREATE TABLE IF NOT EXISTS public.nipuk_records (
    nipuk_id TEXT PRIMARY KEY,
    dispatch_date TEXT NOT NULL,
    dispatch_time TEXT NOT NULL,
    order_number TEXT,
    request_date TEXT,
    sku VARCHAR(100),
    item_name_he TEXT,
    item_name_en TEXT,
    quantity INTEGER,
    notes TEXT,
    remark TEXT,
    attribute_type_name_he TEXT,
    attribute_value_name_he TEXT,
    attribute_type_name_en TEXT,
    attribute_value_name_en TEXT,
    worker_id TEXT NOT NULL,
    worker_name TEXT NOT NULL,
    worker_role TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_id TEXT,
    customer_phone TEXT,
    created_timestamp TIMESTAMPTZ DEFAULT NOW(),
    last_update_timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_nipuk_records_timestamp ON public.nipuk_records(created_timestamp DESC);

-- I. Financial Rate Cache Table (caches daily exchange rates)
CREATE TABLE IF NOT EXISTS public.financial_rate_cache (
    cache_id INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    rate_date DATE NOT NULL,
    currency_code VARCHAR(10) NOT NULL,
    currency_name_he VARCHAR(100) NOT NULL,
    currency_name_en VARCHAR(100) NOT NULL,
    unit INT NOT NULL DEFAULT 1,
    exchange_rate DECIMAL(18, 6) NOT NULL,
    last_trend DECIMAL(12, 6) NOT NULL DEFAULT 0.0,
    trend_percent DECIMAL(12, 4) NOT NULL DEFAULT 0.0,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_rate_date_currency UNIQUE (rate_date, currency_code)
);

CREATE INDEX IF NOT EXISTS ix_financial_rate_cache_date ON public.financial_rate_cache(rate_date);

-- ====================================================================================
-- 2. HIGH-PERFORMANCE PL/pgSQL FUNCTIONS & PROCEDURES 
-- ====================================================================================

-- F1. Dynamic retrieval of attributes and mapped allowed values for a given SKU
CREATE OR REPLACE FUNCTION public.get_sku_attribute_rules(target_sku VARCHAR)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    result JSONB;
    mapped_rules JSONB;
BEGIN
    -- Gather mapping rules directly with joined types
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'sku', m.item_id,
        'type_id', m.type_id,
        'name_he', t.name_he,
        'name_en', t.name_en,
        'is_mandatory', m.is_mandatory,
        'allowed_value_ids', m.allowed_value_ids
    )), '[]'::jsonb)
    INTO mapped_rules
    FROM public.item_mappings m
    INNER JOIN public.attribute_types t ON m.type_id = t.id
    WHERE m.item_id = target_sku 
      AND t.is_active = TRUE 
      AND t.is_deleted = FALSE;

    result := jsonb_build_object(
        'sku', target_sku,
        'mapped_rules', mapped_rules
    );
    
    RETURN result;
END;
$$;


-- F2. Save/Update attribute configuration for SKU
CREATE OR REPLACE PROCEDURE public.save_item_attribute_config(
    p_sku VARCHAR,
    p_type_id TEXT,
    p_is_mandatory BOOLEAN,
    p_allowed_values_json JSONB, -- JSON array of value IDs: e.g. ["val-1", "val-2"]
    p_user_id VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Upsert mapping configurations
    INSERT INTO public.item_mappings (item_id, type_id, is_mandatory, allowed_value_ids)
    VALUES (p_sku, p_type_id, p_is_mandatory, p_allowed_values_json)
    ON CONFLICT (item_id, type_id) 
    DO UPDATE SET 
        is_mandatory = p_is_mandatory,
        allowed_value_ids = p_allowed_values_json;

    -- Append audit ledger trail update log
    INSERT INTO public.audit_logs (id, user_id, user_name, action_type, table_name, old_value, new_value)
    VALUES (
        'audit-' || uuid_generate_v4(),
        p_user_id, 
        'System Operator',
        'ASSIGN', 
        'item_mappings', 
        jsonb_build_object('item_id', p_sku, 'type_id', p_type_id)::text,
        jsonb_build_object('is_mandatory', p_is_mandatory, 'allowed_value_ids', p_allowed_values_json)::text
    );
END;
$$;


-- F3. Daily Currency lookup procedure matching the daily target date
CREATE OR REPLACE FUNCTION public.get_financial_rates_by_date(target_date DATE)
RETURNS TABLE (
    rate_date DATE,
    currency_code VARCHAR,
    currency_name_he VARCHAR,
    currency_name_en VARCHAR,
    unit INT,
    exchange_rate DECIMAL,
    last_trend DECIMAL,
    trend_percent DECIMAL,
    fetched_at TIMESTAMPTZ
) 
LANGUAGE SQL
AS $$
    SELECT 
        rate_date,
        currency_code,
        currency_name_he,
        currency_name_en,
        unit,
        exchange_rate,
        last_trend,
        trend_percent,
        fetched_at
    FROM 
        public.financial_rate_cache
    WHERE 
        rate_date = target_date
    ORDER BY 
        CASE currency_code 
            WHEN 'USD' THEN 1 
            WHEN 'EUR' THEN 2 
            WHEN 'GBP' THEN 3 
            ELSE 4 
        END, 
        currency_code ASC;
$$;


-- F4. Atomic UPSERT/MERGE currency rates parser
CREATE OR REPLACE FUNCTION public.upsert_financial_rate(
    p_rate_date DATE,
    p_currency_code VARCHAR,
    p_currency_name_he VARCHAR,
    p_currency_name_en VARCHAR,
    p_unit INT,
    p_exchange_rate DECIMAL,
    p_last_trend DECIMAL,
    p_trend_percent DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.financial_rate_cache (
        rate_date,
        currency_code,
        currency_name_he,
        currency_name_en,
        unit,
        exchange_rate,
        last_trend,
        trend_percent,
        fetched_at
    )
    VALUES (
        p_rate_date,
        p_currency_code,
        p_currency_name_he,
        p_currency_name_en,
        p_unit,
        p_exchange_rate,
        p_last_trend,
        p_trend_percent,
        NOW()
    )
    ON CONFLICT (rate_date, currency_code)
    DO UPDATE SET 
        currency_name_he = p_currency_name_he,
        currency_name_en = p_currency_name_en,
        unit = p_unit,
        exchange_rate = p_exchange_rate,
        last_trend = p_last_trend,
        trend_percent = p_trend_percent,
        fetched_at = NOW();
END;
$$;


-- F5. Administrative execution of DDL / SQL queries
CREATE OR REPLACE FUNCTION public.exec_sql(sql_query TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql_query;
END;
$$;


-- ====================================================================================
-- 3. ENABLE SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_picture_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nipuk_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_rate_cache ENABLE ROW LEVEL SECURITY;

-- 1. Create Policies for Read accessibility (Public or authenticated)
DROP POLICY IF EXISTS "Allow public read of users" ON public.users;
CREATE POLICY "Allow public read of users" ON public.users FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Allow public read of items" ON public.warehouse_items;
CREATE POLICY "Allow public read of items" ON public.warehouse_items FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Allow public read of item pictures" ON public.item_picture_urls;
CREATE POLICY "Allow public read of item pictures" ON public.item_picture_urls FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Allow public read of attribute types" ON public.attribute_types;
CREATE POLICY "Allow public read of attribute types" ON public.attribute_types FOR SELECT TO public USING (NOT is_deleted);

DROP POLICY IF EXISTS "Allow public read of item mappings" ON public.item_mappings;
CREATE POLICY "Allow public read of item mappings" ON public.item_mappings FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Allow public read of requests" ON public.requests;
CREATE POLICY "Allow public read of requests" ON public.requests FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Allow public read of audit logs" ON public.audit_logs;
CREATE POLICY "Allow public read of audit logs" ON public.audit_logs FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Allow public read of nipuk records" ON public.nipuk_records;
CREATE POLICY "Allow public read of nipuk records" ON public.nipuk_records FOR SELECT TO public USING (TRUE);

DROP POLICY IF EXISTS "Allow public read of ExchangeRates" ON public.financial_rate_cache;
CREATE POLICY "Allow public read of ExchangeRates" ON public.financial_rate_cache FOR SELECT TO public USING (TRUE);

-- 2. Create Policies for writing permission (Authenticated staff/architect editors only)
DROP POLICY IF EXISTS "Allow authenticated full write of users" ON public.users;
CREATE POLICY "Allow authenticated full write of users" ON public.users FOR ALL TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated full write of items" ON public.warehouse_items;
CREATE POLICY "Allow authenticated full write of items" ON public.warehouse_items FOR ALL TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated full write of item pictures" ON public.item_picture_urls;
CREATE POLICY "Allow authenticated full write of item pictures" ON public.item_picture_urls FOR ALL TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated full write of attribute types" ON public.attribute_types;
CREATE POLICY "Allow authenticated full write of attribute types" ON public.attribute_types FOR ALL TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated full write of item mappings" ON public.item_mappings;
CREATE POLICY "Allow authenticated full write of item mappings" ON public.item_mappings FOR ALL TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated full write of requests" ON public.requests;
CREATE POLICY "Allow authenticated full write of requests" ON public.requests FOR ALL TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated full write of audit logs" ON public.audit_logs;
CREATE POLICY "Allow authenticated full write of audit logs" ON public.audit_logs FOR ALL TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated full write of nipuk records" ON public.nipuk_records;
CREATE POLICY "Allow authenticated full write of nipuk records" ON public.nipuk_records FOR ALL TO authenticated USING (TRUE);

DROP POLICY IF EXISTS "Allow authenticated editors write of ExchangeRates" ON public.financial_rate_cache;
CREATE POLICY "Allow authenticated editors write of ExchangeRates" ON public.financial_rate_cache FOR ALL TO authenticated USING (TRUE);

-- Clear rate limits/test caches
TRUNCATE TABLE public.financial_rate_cache CASCADE;

-- ====================================================================================
-- SETUP COMPLETED SUCCESSFULLY!
-- Paste this script directly inside Supabase SQL Editor (https://supabase.com)
-- and configure your clients to query table schemas securely. 
-- ====================================================================================
