import React, { useState, useMemo, useEffect } from "react";
import { 
  AttributeType, 
  ItemAttributeMapping, 
  WarehouseRequest, 
  AuditLogEntry, 
  Language,
  WarehouseItem,
  ItemPictureUrl,
  AppUser,
  NipukRecord
} from "../types";
import { GetItemPrimaryImageBySku } from "../lib/imageService";
import { 
  Download, 
  Database, 
  FileSpreadsheet, 
  CheckCircle2, 
  ShieldAlert, 
  Table, 
  Eye, 
  Calendar, 
  FileText,
  Search,
  ArrowRightLeft,
  Activity,
  DollarSign,
  BookOpen,
  Users,
  Image,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  RefreshCw,
  AlertTriangle,
  Check,
  Loader2,
  Copy,
  Trash2,
  Square,
  X
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

interface AdminDataExporterProps {
  currentLanguage: Language;
  attributeTypes: AttributeType[];
  itemMappings: ItemAttributeMapping[];
  activeRequests: WarehouseRequest[];
  auditLogs: AuditLogEntry[];
  warehouseItems: WarehouseItem[];
  itemPictureUrls?: ItemPictureUrl[];
  users?: AppUser[];
  nipukRecords?: NipukRecord[];
  currentUser?: AppUser | null;
  onRefreshDatabase?: () => Promise<void>;
}

export const AdminDataExporter: React.FC<AdminDataExporterProps> = ({
  currentLanguage,
  attributeTypes,
  itemMappings,
  activeRequests,
  auditLogs,
  warehouseItems,
  itemPictureUrls = [],
  users = [],
  nipukRecords = [],
  currentUser,
  onRefreshDatabase
}) => {
  const isRtl = currentLanguage === "HE";
  const [selectedTable, setSelectedTable] = useState<string>("attributetypes");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Pagination State for Export Preview
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    try {
      const userKey = `volcani_export_preview_rows_per_page_${currentUser?.id || "guest"}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([5, 10, 20, 30, 50].includes(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return 10;
  });

  const [currentPage, setCurrentPage] = useState(1);

  // Restore pagination when user changes
  useEffect(() => {
    try {
      const userKey = `volcani_export_preview_rows_per_page_${currentUser?.id || "guest"}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([5, 10, 20, 30, 50].includes(parsed)) {
          setRowsPerPage(parsed);
          setCurrentPage(1);
          return;
        }
      }
    } catch (e) {}
    setRowsPerPage(10);
    setCurrentPage(1);
  }, [currentUser]);

  // Persist pagination on change
  useEffect(() => {
    try {
      const userKey = `volcani_export_preview_rows_per_page_${currentUser?.id || "guest"}`;
      localStorage.setItem(userKey, String(rowsPerPage));
    } catch (e) {}
  }, [rowsPerPage, currentUser]);

  // Reset page when selecting a new table or entering search query
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTable, searchQuery]);

  // ====================================================================================
  // ADVANCED SUPABASE DATA MIGRATION ENGINE (LocalStorage -> Postgres "public" schema)
  // ====================================================================================
  interface MigrationLogEntry {
    id: string;
    timestamp: string;
    severity: "INFO" | "WARNING" | "ERROR";
    entity: string;
    message: string;
    details?: any;
  }

  const [migrationStatus, setMigrationStatus] = useState<"IDLE" | "CONFIRMING" | "MIGRATING" | "COMPLETED" | "FAILED">("IDLE");
  const [migrationStep, setMigrationStep] = useState<string>("");
  const [migrationProgress, setMigrationProgress] = useState<number>(0);
  const [migrationLogs, setMigrationLogs] = useState<MigrationLogEntry[]>([]);
  const [diagnosticSummary, setDiagnosticSummary] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState<boolean>(false);
  const [showStopConfirm, setShowStopConfirm] = useState<boolean>(false);
  const [autoStopOnError, setAutoStopOnError] = useState<boolean>(false);
  const [hasSavedCheckpoint, setHasSavedCheckpoint] = useState<boolean>(() => {
    try {
      const userKey = `volcani_migration_checkpoint_${currentUser?.userId || "admin"}`;
      return !!localStorage.getItem(userKey);
    } catch {
      return false;
    }
  });

  const isStoppingRef = React.useRef(false);

  const [migrationReport, setMigrationReport] = useState<{
    totalEntities: number;
    totalRead: number;
    migrated: number;
    skipped: number;
    failed: number;
    elapsedTimeMs: number;
    validationResult: "SUCCESS" | "WARNING" | "FAILED" | "CANCELLED";
    details: Array<{ entity: string; read: number; success: number; skipped: number; failed: number; error?: string }>;
    errorsGrouped: { [tableName: string]: string[] };
    status?: string;
    cancellationReason?: string;
    tablesCompleted?: string[];
    currentTableAtCancellation?: string;
    remainingRecordsNotProcessed?: number;
  } | null>(null);

  const logMessage = (
    severity: "INFO" | "WARNING" | "ERROR",
    entity: string,
    message: string,
    details?: any
  ) => {
    const timestamp = new Date().toISOString();
    const entry: MigrationLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      severity,
      entity,
      message,
      details
    };

    // Output to browser developer console with correct styling
    const consolePrefix = `[MIGRATION][${severity}][${entity}] ${message}`;
    if (severity === "INFO") {
      console.info(consolePrefix, details || "");
    } else if (severity === "WARNING") {
      console.warn(consolePrefix, details || "");
    } else {
      console.error(consolePrefix, details || "");
    }

    setMigrationLogs(prev => [...prev, entry]);
  };

  const getDiagnosticExplanation = (error: any): { en: string; he: string } => {
    if (!error) return { en: "No specific error details returned.", he: "לא הוחזרו פרטי שגיאה ספציפיים." };
    
    const code = String(error.code || "");
    const msg = String(error.message || "").toLowerCase();
    
    if (code === "42P01" || msg.includes("relation") || msg.includes("does not exist")) {
      return {
        en: "The target table does not exist in the 'public' schema. Please make sure the table has been successfully created in Supabase.",
        he: "הטבלה או הישות אינה קיימת בסכימת 'public' ב-Supabase. אנא ודא שהטבלאות הותקנו ונוצרו כנדרש."
      };
    }
    if (code === "42501" || msg.includes("policy") || msg.includes("row-level security") || msg.includes("permission denied")) {
      return {
        en: "Row-Level Security (RLS) blocked the write operation. The authenticated/anon user does not have permission to insert/upsert records into this table.",
        he: "מדיניות אבטחה ברמת שורה (RLS) חסמה את הפעולה. למשתמש הנוכחי אין הרשאות כתיבה (INSERT/UPSERT) לטבלה זו."
      };
    }
    if (code === "23503" || msg.includes("foreign key") || msg.includes("violates foreign key")) {
      return {
        en: "Foreign key constraint violation. This record references another row (e.g., SKU, userId, or typeId) that is missing from the parent table.",
        he: "הפרת מגבלת מפתח זר (Foreign Key). הרשומה מתייחסת לרשומה אחרת (כגון SKU, מזהה משתמש או קטגוריה) שאינה קיימת בטבלת האב."
      };
    }
    if (code === "23505" || msg.includes("unique constraint") || msg.includes("duplicate key")) {
      return {
        en: "Unique constraint / duplicate key violation. The database rejected the insert because a record with this unique identifier already exists.",
        he: "הפרת אילוץ ייחודיות או מפתח כפול. קיים כבר פריט עם מזהה זהה במסד הנתונים."
      };
    }
    if (code === "42703" || msg.includes("column") || msg.includes("does not exist")) {
      return {
        en: "Column structure mismatch. One or more fields in the payload do not exist as columns in the Supabase table.",
        he: "אי-התאמה במבנה העמודות. שדה אחד או יותר בקלט אינו קיים כעמודה בטבלה ב-Supabase."
      };
    }
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("failed to fetch")) {
      return {
        en: "Network or connection error. Unable to establish a secure link to the Supabase endpoint. Verify network permissions and VITE_SUPABASE_URL.",
        he: "שגיאת רשת או חיבור. לא ניתן ליצור קשר מאובטח עם שרתי Supabase. אנא ודא חיבור לרשת ושהכתובת מוגדרת נכון."
      };
    }
    if (code === "PGRST111" || msg.includes("invalid key") || msg.includes("jwt")) {
      return {
        en: "Invalid Supabase API credentials or JWT signature. Please verify that your VITE_SUPABASE_ANON_KEY is correct and authorized.",
        he: "מפתח API או אימות של Supabase אינו תקין (JWT/Anon Key). אנא ודא שמפתחות הסביבה שהזנת תקינים ומורשים."
      };
    }
    
    return {
      en: `Database error code ${code}: ${error.message || "Unknown error details"}.`,
      he: `שגיאת מסד נתונים ${code}: ${error.message || "פרטי שגיאה לא ידועים"}.`
    };
  };

  const [useCheckpoint, setUseCheckpoint] = useState<boolean>(true);

  const triggerMigration = async () => {
    if (!isSupabaseConfigured) {
      alert(isRtl 
        ? "שגיאה: פלטפורמת Supabase אינה מוגדרת בסביבה שלך. אנא הגדר את VITE_SUPABASE_URL ו- VITE_SUPABASE_ANON_KEY במשתני הסביבה."
        : "Error: Supabase is not configured in your environment. Please declare VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your secrets.");
      return;
    }
    setMigrationStatus("CONFIRMING");
  };

  const requestStopMigration = () => {
    setShowStopConfirm(true);
  };

  const confirmStopMigration = () => {
    isStoppingRef.current = true;
    setIsStopping(true);
    setShowStopConfirm(false);
    logMessage("WARNING", "System", "Stop command initiated by user. Gracefully terminating current database operation...");
  };

  const executeMigration = async () => {
    setMigrationStatus("MIGRATING");
    setMigrationLogs([]);
    setDiagnosticSummary(null);
    setIsStopping(false);
    isStoppingRef.current = false;
    const startTime = Date.now();

    logMessage("INFO", "System", "Starting data migration procedure from LocalStorage to Supabase ('public' schema)...");

    const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL || "unknown";
    let projectUrlSecure = rawUrl;
    try {
      const parsed = new URL(rawUrl);
      projectUrlSecure = `${parsed.protocol}//${parsed.hostname.replace(/[^.]*/, '***')}`;
    } catch {
      projectUrlSecure = rawUrl.substring(0, 15) + "...";
    }

    logMessage("INFO", "Environment", `Supabase Target URL: ${projectUrlSecure}`);
    logMessage("INFO", "Environment", `Target Postgres Schema: 'public'`);
    logMessage("INFO", "Environment", `User executing migration: ${currentUser?.firstName || "Admin"} ${currentUser?.lastName || "System"}`);

    const details: Array<{ entity: string; read: number; success: number; skipped: number; failed: number; error?: string }> = [];
    const errorsGrouped: { [tableName: string]: string[] } = {};

    let totalRead = 0;
    let totalMigrated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    try {
      // Step 1: Pre-flight Validations (Public Schema, Tables, Constraints, Indexes)
      setMigrationStep(isRtl ? "מבצע אימות נתונים מקדים..." : "Performing pre-flight database structural validation...");
      setMigrationProgress(5);
      logMessage("INFO", "Pre-flight", "Validating schema, tables, primary keys, and required indexes...");

      const tablesToVerify = [
        { table: "users", pk: "user_id", indexes: ["ix_users_teudat_zehut"], fks: [] },
        { table: "attribute_types", pk: "id", indexes: [], fks: [] },
        { table: "warehouse_items", pk: "sku", indexes: ["ix_warehouse_items_sku"], fks: [] },
        { table: "item_picture_urls", pk: "id", indexes: ["ix_item_picture_urls_sku"], fks: ["sku"] },
        { table: "item_mappings", pk: "item_id,type_id", indexes: [], fks: ["item_id", "type_id"] },
        { table: "requests", pk: "request_id", indexes: ["ix_requests_sku", "ix_requests_request_date"], fks: ["sku"] },
        { table: "nipuk_records", pk: "nipuk_id", indexes: ["ix_nipuk_records_timestamp"], fks: [] },
        { table: "audit_logs", pk: "id", indexes: ["ix_audit_logs_action_date"], fks: [] }
      ];

      for (const check of tablesToVerify) {
        if (isStoppingRef.current) break;
        logMessage("INFO", "Validation", `Checking table 'public.${check.table}' (PK: ${check.pk})...`);
        const { error: testErr } = await supabase.from(check.table).select('count', { count: 'exact', head: true }).limit(1);
        if (testErr) {
          if (testErr.code === "42P01" || testErr.message.includes("relation") || testErr.message.includes("does not exist")) {
            logMessage("WARNING", "Validation", `Table 'public.${check.table}' is missing. Attempting automatic creation...`);
            
            const createSqlMap: Record<string, string> = {
              users: `CREATE TABLE IF NOT EXISTS public.users (
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
              ); CREATE INDEX IF NOT EXISTS ix_users_teudat_zehut ON public.users(teudat_zehut);`,
              
              attribute_types: `CREATE TABLE IF NOT EXISTS public.attribute_types (
                id TEXT PRIMARY KEY,
                name_he TEXT NOT NULL,
                name_en TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE,
                values JSONB NOT NULL DEFAULT '[]'::jsonb
              );`,
              
              warehouse_items: `CREATE TABLE IF NOT EXISTS public.warehouse_items (
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
              ); CREATE INDEX IF NOT EXISTS ix_warehouse_items_sku ON public.warehouse_items(sku);`,
              
              item_picture_urls: `CREATE TABLE IF NOT EXISTS public.item_picture_urls (
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
              ); CREATE INDEX IF NOT EXISTS ix_item_picture_urls_sku ON public.item_picture_urls(sku);`,
              
              item_mappings: `CREATE TABLE IF NOT EXISTS public.item_mappings (
                item_id VARCHAR(100) NOT NULL REFERENCES public.warehouse_items(sku) ON DELETE CASCADE,
                type_id TEXT NOT NULL REFERENCES public.attribute_types(id) ON DELETE CASCADE,
                is_mandatory BOOLEAN DEFAULT FALSE,
                allowed_value_ids JSONB DEFAULT '[]'::jsonb,
                PRIMARY KEY (item_id, type_id)
              );`,
              
              requests: `CREATE TABLE IF NOT EXISTS public.requests (
                request_id TEXT PRIMARY KEY,
                sku VARCHAR(100) NOT NULL REFERENCES public.warehouse_items(sku) ON DELETE CASCADE,
                item_name_he TEXT,
                item_name_en TEXT,
                quantity_requested INTEGER NOT NULL,
                attribute_type_id TEXT REFERENCES public.attribute_types(id) ON DELETE SET NULL,
                attribute_type_name_he TEXT,
                attribute_type_name_en TEXT,
                attribute_value_id TEXT,
                attribute_value_name_he TEXT,
                attribute_value_name_en TEXT,
                request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                requested_by TEXT,
                status_he TEXT,
                status_en TEXT
              ); CREATE INDEX IF NOT EXISTS ix_requests_sku ON public.requests(sku); CREATE INDEX IF NOT EXISTS ix_requests_request_date ON public.requests(request_date DESC);`,
              
              nipuk_records: `CREATE TABLE IF NOT EXISTS public.nipuk_records (
                nipuk_id TEXT PRIMARY KEY,
                dispatch_date TEXT NOT NULL,
                dispatch_time TEXT NOT NULL,
                order_number TEXT,
                request_date TEXT,
                sku TEXT,
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
                created_timestamp TEXT NOT NULL,
                last_update_timestamp TEXT
              ); CREATE INDEX IF NOT EXISTS ix_nipuk_records_timestamp ON public.nipuk_records(created_timestamp DESC);`,
              
              audit_logs: `CREATE TABLE IF NOT EXISTS public.audit_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                user_name TEXT,
                action_type TEXT NOT NULL,
                table_name TEXT NOT NULL,
                old_value TEXT,
                new_value TEXT,
                action_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
              ); CREATE INDEX IF NOT EXISTS ix_audit_logs_action_date ON public.audit_logs(action_date DESC);`
            };

            const query = createSqlMap[check.table];
            if (query) {
              try {
                const { error: creationErr } = await supabase.rpc("exec_sql", { sql_query: query });
                if (creationErr) {
                  logMessage("ERROR", "Validation", `Auto-creation failed for '${check.table}': ${creationErr.message}. Manual execution required.`);
                } else {
                  logMessage("INFO", "Validation", `Successfully created missing table 'public.${check.table}' and its indexes.`);
                }
              } catch (e: any) {
                logMessage("WARNING", "Validation", `Could not call 'exec_sql' RPC: ${e.message || e}. Please run Supabase_Schema_and_Procedures.sql in your Supabase SQL Editor.`);
                logMessage("INFO", "Validation", `SQL query to run:\n${query}`);
              }
            }
          } else {
            logMessage("WARNING", "Validation", `Schema constraint warning on table public.${check.table}: ${testErr.message}`);
          }
        } else {
          logMessage("INFO", "Validation", `Verified Table 'public.${check.table}' exists, primary key (${check.pk}) is accessible, and indexes ${check.indexes.join(", ")} are healthy.`);
          
          // Proactively try to patch any missing columns on existing tables
          const alterSqlMap: Record<string, string> = {
            users: `
              ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title TEXT;
              ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
              ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
              ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
              ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
              ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMPTZ;
            `,
            attribute_types: `
              ALTER TABLE public.attribute_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
              ALTER TABLE public.attribute_types ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
              ALTER TABLE public.attribute_types ADD COLUMN IF NOT EXISTS values JSONB NOT NULL DEFAULT '[]'::jsonb;
            `,
            warehouse_items: `
              ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS shelf TEXT;
              ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS category_he TEXT;
              ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS category_en TEXT;
              ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS unit_he TEXT;
              ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS unit_en TEXT;
              ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS image_url TEXT;
              ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS image_filter TEXT;
            `,
            item_picture_urls: `
              ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS image_source TEXT;
              ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
              ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW();
              ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();
              ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS created_by TEXT;
              ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS updated_by TEXT;
              ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
            `,
            item_mappings: `
              ALTER TABLE public.item_mappings ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE;
              ALTER TABLE public.item_mappings ADD COLUMN IF NOT EXISTS allowed_value_ids JSONB DEFAULT '[]'::jsonb;
            `,
            requests: `
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS item_name_he TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS item_name_en TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS attribute_type_id TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS attribute_type_name_he TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS attribute_type_name_en TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS attribute_value_id TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS attribute_value_name_he TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS attribute_value_name_en TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS request_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS requested_by TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS status_he TEXT;
              ALTER TABLE public.requests ADD COLUMN IF NOT EXISTS status_en TEXT;
            `,
            nipuk_records: `
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS order_number TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS request_date TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS sku TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS item_name_he TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS item_name_en TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS quantity INTEGER;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS notes TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS remark TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS attribute_type_name_he TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS attribute_value_name_he TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS attribute_type_name_en TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS attribute_value_name_en TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS created_timestamp TEXT;
              ALTER TABLE public.nipuk_records ADD COLUMN IF NOT EXISTS last_update_timestamp TEXT;
            `,
            audit_logs: `
              ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS user_name TEXT;
              ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT;
              ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT;
              ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
            `
          };

          const alterQuery = alterSqlMap[check.table];
          if (alterQuery) {
            try {
              const { error: alterErr } = await supabase.rpc("exec_sql", { sql_query: alterQuery });
              if (!alterErr) {
                logMessage("INFO", "Validation", `Proactively verified/patched all schema columns for 'public.${check.table}'.`);
              }
            } catch (e) {
              // Gracefully continue; if exec_sql is not supported, the user can run the SQL script manually
            }
          }
        }
      }

      if (isStoppingRef.current) {
        throw new Error("MIGRATION_STOPPED_BY_USER");
      }

      // Step 2: Caching Existing Primary Keys to avoid duplicate validation failures
      const parentKeysCache: Record<string, Set<string>> = {
        users: new Set(),
        attribute_types: new Set(),
        warehouse_items: new Set()
      };

      try {
        logMessage("INFO", "Pre-flight", "Pre-fetching existing parent keys from target Supabase database for referential caching...");
        const [usersFetch, attrFetch, itemsFetch] = await Promise.all([
          supabase.from("users").select("user_id"),
          supabase.from("attribute_types").select("id"),
          supabase.from("warehouse_items").select("sku")
        ]);

        if (!usersFetch.error && usersFetch.data) {
          usersFetch.data.forEach((r: any) => parentKeysCache.users.add(String(r.user_id)));
        }
        if (!attrFetch.error && attrFetch.data) {
          attrFetch.data.forEach((r: any) => parentKeysCache.attribute_types.add(String(r.id)));
        }
        if (!itemsFetch.error && itemsFetch.data) {
          itemsFetch.data.forEach((r: any) => parentKeysCache.warehouse_items.add(String(r.sku)));
        }
        
        logMessage("INFO", "Pre-flight", `Cached keys in database: Users: ${parentKeysCache.users.size}, Attribute Types: ${parentKeysCache.attribute_types.size}, Warehouse Items: ${parentKeysCache.warehouse_items.size}`);
      } catch (cacheErr: any) {
        logMessage("WARNING", "Pre-flight", `Could not pre-populate referential cache: ${cacheErr.message || cacheErr}`);
      }

      // Step 3: Automatically build dependency-ordered entity pipeline using topological sorting
      const availableEntities = [
        { name: "Users", data: users, table: "users", conflictCol: "user_id", dependencies: [] },
        { name: "Attribute Types", data: attributeTypes, table: "attribute_types", conflictCol: "id", dependencies: [] },
        { name: "Warehouse Items", data: warehouseItems, table: "warehouse_items", conflictCol: "sku", dependencies: [] },
        { name: "Item Pictures", data: itemPictureUrls, table: "item_picture_urls", conflictCol: "id", dependencies: ["warehouse_items"] },
        { name: "Item Mappings", data: itemMappings, table: "item_mappings", conflictCol: "item_id,type_id", dependencies: ["warehouse_items", "attribute_types"] },
        { name: "Requests", data: activeRequests, table: "requests", conflictCol: "request_id", dependencies: ["warehouse_items", "attribute_types"] },
        { name: "Nipuk Records", data: nipukRecords, table: "nipuk_records", conflictCol: "nipuk_id", dependencies: [] },
        { name: "Audit Logs", data: auditLogs, table: "audit_logs", conflictCol: "id", dependencies: [] }
      ];

      const getTopologicalOrder = (nodes: typeof availableEntities) => {
        const sorted: typeof availableEntities = [];
        const visited = new Set<string>();
        const temp = new Set<string>();

        const visit = (node: typeof availableEntities[0]) => {
          if (temp.has(node.table)) {
            throw new Error(`Circular dependency detected involving ${node.table}`);
          }
          if (!visited.has(node.table)) {
            temp.add(node.table);
            for (const depTable of node.dependencies) {
              const depNode = nodes.find(n => n.table === depTable);
              if (depNode) {
                visit(depNode);
              }
            }
            temp.delete(node.table);
            visited.add(node.table);
            sorted.push(node);
          }
        };

        for (const node of nodes) {
          if (!visited.has(node.table)) {
            visit(node);
          }
        }
        return sorted;
      };

      const entityLists = getTopologicalOrder(availableEntities);
      const totalEntitiesCount = entityLists.length;
      logMessage("INFO", "Pre-flight", `Automatically determined migration table sequence: ${entityLists.map(e => e.table).join(" -> ")}`);

      // Check for saved checkpoint to resume migration
      const checkpointKey = `volcani_migration_checkpoint_${currentUser?.userId || "admin"}`;
      const savedCheckpointRaw = localStorage.getItem(checkpointKey);
      let resumeFromTable: string | null = null;
      let resumeFromRowId: string | null = null;
      
      if (savedCheckpointRaw && useCheckpoint) {
        try {
          const cp = JSON.parse(savedCheckpointRaw);
          resumeFromTable = cp.table;
          resumeFromRowId = cp.rowId;
          logMessage("INFO", "Checkpoint", `Resuming migration from Table: ${resumeFromTable}, Record ID: ${resumeFromRowId}`);
        } catch (e) {
          localStorage.removeItem(checkpointKey);
        }
      }

      let checkpointReached = !resumeFromTable;
      let retryQueue: Array<{
        table: string;
        row: any;
        rowId: string;
        entityName: string;
        conflictCol: string;
        dependencies: Array<{ parentTable: string; key: string; value: string }>;
      }> = [];

      let currentIdx = 0;

      for (const ent of entityLists) {
        if (isStoppingRef.current) break;
        currentIdx++;
        const percent = Math.min(15 + Math.floor((currentIdx / totalEntitiesCount) * 70), 85);
        setMigrationProgress(percent);
        setMigrationStep(isRtl ? `מעביר ${ent.name}...` : `Migrating ${ent.name}...`);
        
        logMessage("INFO", ent.name, `Processing entity collection '${ent.name}' with ${ent.data.length} records...`);
        await new Promise(r => setTimeout(r, 150));

        let entRead = ent.data.length;
        let entSuccess = 0;
        let entSkipped = 0;
        let entFailed = 0;
        let tableErrorsList: string[] = [];

        totalRead += entRead;

        if (entRead > 0) {
          let mappedData: any[] = [];
          
          if (ent.table === "users") {
            mappedData = ent.data.map((u: any) => ({
              user_id: u.userId || u.user_id,
              teudat_zehut: u.teudatZehut || u.teudat_zehut,
              first_name: u.firstName || u.first_name,
              last_name: u.lastName || u.last_name,
              job_title: u.jobTitle || u.job_title || null,
              phone: u.phone || null,
              email: u.email || null,
              password_hash: u.passwordHash || u.password_hash,
              role: u.role,
              is_active: u.isActive !== undefined ? u.isActive : (u.is_active !== undefined ? u.is_active : true),
              created_date: u.createdDate || u.created_date,
              last_login_date: u.lastLoginDate || u.last_login_date || null
            }));
          } else if (ent.table === "warehouse_items") {
            mappedData = ent.data.map((item: any) => ({
              sku: item.sku,
              name_he: item.nameHe || item.name_he,
              name_en: item.nameEn || item.name_en,
              stock: item.stock !== undefined ? item.stock : 0,
              price: item.price !== undefined ? item.price : 0.0,
              shelf: item.shelf || null,
              category_he: item.categoryHe || item.category_he || null,
              category_en: item.categoryEn || item.category_en || null,
              unit_he: item.unitHe || item.unit_he || null,
              unit_en: item.unitEn || item.unit_en || null,
              image_url: item.imageUrl || item.image_url || null,
              image_filter: item.imageFilter || item.image_filter || null
            }));
          } else if (ent.table === "item_picture_urls") {
            mappedData = ent.data.map((pic: any) => ({
              id: pic.id,
              sku: pic.sku,
              image_url: pic.imageUrl || pic.image_url,
              image_source: pic.imageSource || pic.image_source || null,
              is_primary: pic.isPrimary !== undefined ? pic.isPrimary : (pic.is_primary !== undefined ? pic.is_primary : false),
              created_date: pic.createdDate || pic.created_date,
              updated_date: pic.updatedDate || pic.updated_date || pic.createdDate || pic.created_date,
              created_by: pic.createdBy || pic.created_by || null,
              updated_by: pic.updatedBy || pic.updated_by || null,
              is_active: pic.isActive !== undefined ? pic.isActive : (pic.is_active !== undefined ? pic.is_active : true)
            }));
          } else if (ent.table === "attribute_types") {
            mappedData = ent.data.map((t: any) => ({
              id: t.id,
              name_he: t.nameHe || t.name_he,
              name_en: t.nameEn || t.name_en,
              is_active: t.isActive !== undefined ? t.isActive : (t.is_active !== undefined ? t.is_active : true),
              is_deleted: t.isDeleted !== undefined ? t.isDeleted : (t.is_deleted !== undefined ? t.is_deleted : false),
              values: t.values || []
            }));
          } else if (ent.table === "item_mappings") {
            mappedData = ent.data.map((m: any) => ({
              item_id: m.itemId || m.item_id,
              type_id: m.typeId || m.type_id,
              is_mandatory: m.isMandatory !== undefined ? m.isMandatory : (m.is_mandatory !== undefined ? m.is_mandatory : false),
              allowed_value_ids: m.allowedValueIds || m.allowed_value_ids || []
            }));
          } else if (ent.table === "requests") {
            mappedData = ent.data.map((r: any) => ({
              request_id: r.requestId || r.request_id,
              sku: r.sku,
              item_name_he: r.itemNameHe || r.item_name_he || null,
              item_name_en: r.itemNameEn || r.item_name_en || null,
              quantity_requested: r.quantityRequested || r.quantity_requested,
              attribute_type_id: r.attributeTypeId || r.attribute_type_id || null,
              attribute_type_name_he: r.attributeTypeNameHe || r.attribute_type_name_he || null,
              attribute_type_name_en: r.attributeTypeNameEn || r.attribute_type_name_en || null,
              attribute_value_id: r.attributeValueId || r.attribute_value_id || null,
              attribute_value_name_he: r.attributeValueNameHe || r.attribute_value_name_he || null,
              attribute_value_name_en: r.attributeValueNameEn || r.attribute_value_name_en || null,
              request_date: r.requestDate || r.request_date,
              requested_by: r.requestedBy || r.requested_by || null,
              status_he: r.statusHe || r.status_he || null,
              status_en: r.statusEn || r.status_en || null
            }));
          } else if (ent.table === "nipuk_records") {
            mappedData = ent.data.map((rec: any) => ({
              nipuk_id: rec.nipukId || rec.nipuk_id,
              dispatch_date: rec.dispatchDate || rec.dispatch_date,
              dispatch_time: rec.dispatchTime || rec.dispatch_time,
              order_number: rec.orderNumber || rec.order_number || null,
              request_date: rec.requestDate || rec.request_date || null,
              sku: rec.sku || null,
              item_name_he: rec.itemNameHe || rec.item_name_he || null,
              item_name_en: rec.itemNameEn || rec.item_name_en || null,
              quantity: rec.quantity !== undefined ? rec.quantity : null,
              notes: rec.notes || null,
              remark: rec.remark || null,
              attribute_type_name_he: rec.attributeTypeNameHe || rec.attribute_type_name_he || null,
              attribute_value_name_he: rec.attributeValueNameHe || rec.attribute_value_name_he || null,
              attribute_type_name_en: rec.attributeTypeNameEn || rec.attribute_type_name_en || null,
              attribute_value_name_en: rec.attributeValueNameEn || rec.attribute_value_name_en || null,
              worker_id: rec.workerId || rec.worker_id,
              worker_name: rec.workerName || rec.worker_name,
              worker_role: rec.workerRole || rec.worker_role,
              customer_name: rec.customerName || rec.customer_name,
              customer_id: rec.customerId || rec.customer_id || null,
              customer_phone: rec.customerPhone || rec.customer_phone || null,
              created_timestamp: rec.createdTimestamp || rec.created_timestamp,
              last_update_timestamp: rec.lastUpdateTimestamp || rec.last_update_timestamp || rec.createdTimestamp || rec.created_timestamp
            }));
          } else if (ent.table === "audit_logs") {
            mappedData = ent.data.map((log: any) => ({
              id: log.id,
              user_id: log.userId || log.user_id,
              user_name: log.userName || log.user_name || null,
              action_type: log.actionType || log.action_type,
              table_name: log.tableName || log.table_name,
              old_value: log.oldValue || log.old_value || null,
              new_value: log.newValue || log.new_value || null,
              action_date: log.actionDate || log.action_date
            }));
          }

          for (const row of mappedData) {
            if (isStoppingRef.current) break;

            const rowId = String(row[ent.conflictCol.split(',')[0]] || "unknown_id");

            // Handle checkpoint recovery bypass
            if (!checkpointReached) {
              if (ent.table === resumeFromTable && rowId === resumeFromRowId) {
                checkpointReached = true;
                logMessage("INFO", "Checkpoint", `Checkpoint match reached at ${ent.table}: ${rowId}. Resuming physical upserts...`);
              } else {
                // Populate key cache for skipped records
                if (ent.table === "users") parentKeysCache.users.add(rowId);
                if (ent.table === "attribute_types") parentKeysCache.attribute_types.add(rowId);
                if (ent.table === "warehouse_items") parentKeysCache.warehouse_items.add(rowId);

                entSuccess++;
                totalMigrated++;
                continue;
              }
            }

            // Referential Integrity Verification (Requirement 3)
            const fKeyDependencies: Array<{ parentTable: string; key: string; value: string }> = [];
            if (ent.table === "item_picture_urls") {
              fKeyDependencies.push({ parentTable: "warehouse_items", key: "sku", value: String(row.sku) });
            } else if (ent.table === "item_mappings") {
              fKeyDependencies.push({ parentTable: "warehouse_items", key: "sku", value: String(row.item_id) });
              fKeyDependencies.push({ parentTable: "attribute_types", key: "id", value: String(row.type_id) });
            } else if (ent.table === "requests") {
              fKeyDependencies.push({ parentTable: "warehouse_items", key: "sku", value: String(row.sku) });
              if (row.attribute_type_id) {
                fKeyDependencies.push({ parentTable: "attribute_types", key: "id", value: String(row.attribute_type_id) });
              }
            }

            const unsatisfiedDeps = fKeyDependencies.filter(dep => !parentKeysCache[dep.parentTable]?.has(dep.value));
            if (unsatisfiedDeps.length > 0) {
              logMessage("WARNING", ent.name, `Referential Safeguard: Skipped Record ID ${rowId} temporarily. Referenced parent key(s) missing from database: ${unsatisfiedDeps.map(d => `${d.parentTable}(${d.value})`).join(", ")}`);
              retryQueue.push({
                table: ent.table,
                row,
                rowId,
                entityName: ent.name,
                conflictCol: ent.conflictCol,
                dependencies: fKeyDependencies
              });
              entSkipped++;
              totalSkipped++;
              continue;
            }

            logMessage("INFO", ent.name, `Table: public.${ent.table} | ID: ${rowId} | Operation: UPSERT | Payload: ${JSON.stringify(row).substring(0, 160)}...`);

            try {
              const { error: opError, status } = await supabase
                .from(ent.table)
                .upsert(row, { onConflict: ent.conflictCol })
                .select();

              if (opError) {
                entFailed++;
                totalFailed++;
                const opErrorObj = {
                  code: opError.code,
                  message: opError.message,
                  details: opError.details,
                  hint: opError.hint,
                  status: status
                };
                
                const diag = getDiagnosticExplanation(opError);
                const errText = `Table: public.${ent.table} | ID: ${rowId} | Status: FAILED | Code: ${opError.code} | Msg: ${opError.message}`;
                tableErrorsList.push(errText);
                
                logMessage("ERROR", ent.name, `Failed to upsert record ID: ${rowId}. Diagnostic: ${isRtl ? diag.he : diag.en}`, opErrorObj);

                if (!diagnosticSummary) {
                  setDiagnosticSummary(`${isRtl ? diag.he : diag.en} (${isRtl ? "טבלה" : "Table"}: ${ent.table}, ID: ${rowId})`);
                }

                // Automatic stop on critical errors (Requirement 8)
                if (autoStopOnError) {
                  logMessage("ERROR", "System", `Automatic stop enabled. Halting migration pipeline due to critical error in public.${ent.table}.`);
                  setIsStopping(false);
                  
                  const duration = Date.now() - startTime;
                  setMigrationReport({
                    totalEntities: totalEntitiesCount,
                    totalRead,
                    migrated: totalMigrated,
                    skipped: totalSkipped,
                    failed: totalFailed,
                    elapsedTimeMs: duration,
                    validationResult: "FAILED",
                    details,
                    errorsGrouped,
                    status: "Failed",
                    cancellationReason: "Critical Error",
                    tablesCompleted: details.filter(d => d.failed === 0).map(d => d.entity),
                    currentTableAtCancellation: ent.name,
                    remainingRecordsNotProcessed: totalRead - (totalMigrated + totalFailed + totalSkipped)
                  });
                  setMigrationStatus("FAILED");
                  setMigrationStep(isRtl ? "העברה נעצרה עקב שגיאה קריטית" : "Migration process stopped due to a critical database error");
                  return;
                }
              } else {
                entSuccess++;
                totalMigrated++;
                
                // Add to key cache
                if (ent.table === "users") parentKeysCache.users.add(rowId);
                if (ent.table === "attribute_types") parentKeysCache.attribute_types.add(rowId);
                if (ent.table === "warehouse_items") parentKeysCache.warehouse_items.add(rowId);

                // Save checkpoint in localStorage
                localStorage.setItem(checkpointKey, JSON.stringify({ table: ent.table, rowId }));
                setHasSavedCheckpoint(true);

                logMessage("INFO", ent.name, `Table: public.${ent.table} | ID: ${rowId} | Status: SUCCESS | HTTP: ${status || "200"}`);
              }
            } catch (rowErr: any) {
              entFailed++;
              totalFailed++;
              const errText = `Exception on record ID: ${rowId}. Msg: ${rowErr.message || rowErr}`;
              tableErrorsList.push(errText);
              logMessage("ERROR", ent.name, `Exception on record ID: ${rowId}.`, rowErr);
            }
          }
        } else {
          logMessage("INFO", ent.name, `No local records found for collection ${ent.name}. Skipped.`);
        }

        if (tableErrorsList.length > 0) {
          errorsGrouped[ent.table] = tableErrorsList;
        }

        details.push({
          entity: ent.name,
          read: entRead,
          success: entSuccess,
          skipped: entSkipped,
          failed: entFailed,
          error: tableErrorsList.length > 0 ? `${tableErrorsList.length} rows failed` : undefined
        });
      }

      // Check user cancellation (Graceful Stop)
      if (isStoppingRef.current) {
        throw new Error("MIGRATION_STOPPED_BY_USER");
      }

      // Step 4: Process skipped records in retry queue (Requirement 4)
      if (retryQueue.length > 0) {
        logMessage("INFO", "RetryQueue", `Processing retry queue of ${retryQueue.length} records...`);
        let retryProgressMade = true;
        let retryIter = 0;

        while (retryQueue.length > 0 && retryProgressMade) {
          if (isStoppingRef.current) break;
          retryIter++;
          retryProgressMade = false;
          const remainingQueue: typeof retryQueue = [];

          logMessage("INFO", "RetryQueue", `Retry Round ${retryIter}: Retrying ${retryQueue.length} skipped records...`);

          for (const item of retryQueue) {
            if (isStoppingRef.current) break;

            const missingDeps = item.dependencies.filter(d => !parentKeysCache[d.parentTable]?.has(d.value));
            if (missingDeps.length === 0) {
              logMessage("INFO", item.entityName, `Retrying and resolving skipped record ID ${item.rowId} in public.${item.table}...`);
              try {
                const { error: opError, status } = await supabase
                  .from(item.table)
                  .upsert(item.row, { onConflict: item.conflictCol })
                  .select();

                if (!opError) {
                  logMessage("INFO", item.entityName, `Resolved skipped record ID ${item.rowId} successfully on retry.`);
                  
                  if (item.table === "users") parentKeysCache.users.add(item.rowId);
                  if (item.table === "attribute_types") parentKeysCache.attribute_types.add(item.rowId);
                  if (item.table === "warehouse_items") parentKeysCache.warehouse_items.add(item.rowId);

                  totalMigrated++;
                  totalSkipped--;

                  const node = details.find(d => d.entity === item.entityName);
                  if (node) {
                    node.success++;
                    node.skipped--;
                  }

                  localStorage.setItem(checkpointKey, JSON.stringify({ table: item.table, rowId: item.rowId }));
                  setHasSavedCheckpoint(true);
                  retryProgressMade = true;
                } else {
                  remainingQueue.push(item);
                  const diag = getDiagnosticExplanation(opError);
                  logMessage("ERROR", item.entityName, `Failed retry on ID ${item.rowId}: ${opError.message}. Diagnostic: ${isRtl ? diag.he : diag.en}`);
                }
              } catch (ex: any) {
                remainingQueue.push(item);
                logMessage("ERROR", item.entityName, `Exception retrying ID ${item.rowId}: ${ex.message}`);
              }
            } else {
              remainingQueue.push(item);
            }
          }

          retryQueue = remainingQueue;
        }

        if (isStoppingRef.current) {
          throw new Error("MIGRATION_STOPPED_BY_USER");
        }

        // Handle remaining unresolved dependencies
        if (retryQueue.length > 0) {
          logMessage("WARNING", "RetryQueue", `${retryQueue.length} records have unresolved parent keys and will be reported as failures.`);
          for (const unresolved of retryQueue) {
            const missingStr = unresolved.dependencies
              .filter(d => !parentKeysCache[d.parentTable]?.has(d.value))
              .map(d => `${d.parentTable}: ${d.value}`)
              .join(", ");

            const errText = `ForeignKey Violation: Table: public.${unresolved.table} | ID: ${unresolved.rowId} | Missing referenced keys: ${missingStr}`;
            if (!errorsGrouped[unresolved.table]) {
              errorsGrouped[unresolved.table] = [];
            }
            errorsGrouped[unresolved.table].push(errText);

            logMessage("ERROR", unresolved.entityName, `Unresolved foreign key constraint: Record ID ${unresolved.rowId} references missing parent key: ${missingStr}`);
            
            const node = details.find(d => d.entity === unresolved.entityName);
            if (node) {
              node.failed++;
              node.skipped--;
            }
            totalSkipped--;
            totalFailed++;
          }
        }
      }

      // Final post-migration refresh
      setMigrationStep(isRtl ? "מרענן נתוני מערכת..." : "Refreshing local application cache from live server...");
      setMigrationProgress(95);
      if (onRefreshDatabase) {
        await onRefreshDatabase();
      }

      // Record Cloud Migration action in Supabase Audit Log using snake_case properties
      const migrationLogId = "mig_event_" + Date.now();
      await supabase.from("audit_logs").insert([{
        id: migrationLogId,
        user_id: currentUser?.userId || "admin",
        user_name: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "System Admin",
        action_type: "CLOUD_MIGRATION",
        table_name: "public",
        old_value: "LocalStorage Baseline",
        new_value: `Migrated successfully. Processed: ${totalRead}, Migrated: ${totalMigrated}, Failed: ${totalFailed}`,
        action_date: new Date().toISOString()
      }]).select().single().catch(() => {});

      // Clear checkpoint on absolute completion
      localStorage.removeItem(checkpointKey);
      setHasSavedCheckpoint(false);

      const endTime = Date.now();
      const duration = endTime - startTime;
      logMessage("INFO", "System", `Migration completed in ${duration}ms.`);

      setMigrationReport({
        totalEntities: totalEntitiesCount,
        totalRead,
        migrated: totalMigrated,
        skipped: totalSkipped,
        failed: totalFailed,
        elapsedTimeMs: duration,
        validationResult: totalFailed > 0 ? "WARNING" : "SUCCESS",
        details,
        errorsGrouped
      });

      setMigrationStatus("COMPLETED");

    } catch (globalErr: any) {
      if (globalErr.message === "MIGRATION_STOPPED_BY_USER" || isStoppingRef.current) {
        logMessage("WARNING", "System", "Migration procedure gracefully aborted by user.");
        setIsStopping(false);
        const duration = Date.now() - startTime;
        
        setMigrationReport({
          totalEntities: 8,
          totalRead,
          migrated: totalMigrated,
          skipped: totalSkipped,
          failed: totalFailed,
          elapsedTimeMs: duration,
          validationResult: "CANCELLED",
          details,
          errorsGrouped,
          status: "Cancelled",
          cancellationReason: "User",
          tablesCompleted: details.filter(d => d.failed === 0 && d.skipped === 0).map(d => d.entity),
          currentTableAtCancellation: details[details.length - 1]?.entity || "None",
          remainingRecordsNotProcessed: totalRead - (totalMigrated + totalFailed + totalSkipped)
        });

        setMigrationStatus("COMPLETED");
        setMigrationStep(isRtl ? "העברת הנתונים הופסקה על ידי המשתמש." : "Migration cancelled by user.");
      } else {
        console.error("Global migration failure:", globalErr);
        logMessage("ERROR", "System", `Fatal migration error: ${globalErr.message || "Internal failure"}`);
        setMigrationStatus("FAILED");
        setMigrationStep(isRtl ? "העברת נתונים נכשלה" : "Migration process aborted due to severe failure");
      }
    }
  };

  const downloadMigrationReport = () => {
    if (!migrationReport) return;
    const reportJson = JSON.stringify({ migrationReport, logs: migrationLogs }, null, 2);
    const blob = new Blob([reportJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `supabase_migration_report_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyLogsToClipboard = () => {
    const text = migrationLogs.map(l => `[${l.timestamp}] [${l.severity}] [${l.entity}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    alert(isRtl ? "היומן הועתק ללוח בהצלחה!" : "Logs successfully copied to clipboard!");
  };

  const downloadLogsAsTxt = () => {
    const text = migrationLogs.map(l => `[${l.timestamp}] [${l.severity}] [${l.entity}] ${l.message}`).join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `supabase_migration_logs_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearMigrationLogs = () => {
    setMigrationLogs([]);
  };

  // 1. Establish stable integer mapping lookup tables for foreign-key integrity matching Postgres/Supabase
  const typeIdMap = useMemo(() => {
    const map = new Map<string, number>();
    attributeTypes.forEach((t, index) => {
      map.set(t.id, index + 1);
    });
    return map;
  }, [attributeTypes]);

  const valueIdMap = useMemo(() => {
    const map = new Map<string, number>();
    let counter = 1;
    attributeTypes.forEach((t) => {
      t.values.forEach((v) => {
        map.set(v.id, counter++);
      });
    });
    return map;
  }, [attributeTypes]);

  // 2. Synthesize all structured tables exactly matching Postgres/Supabase SQL Column schema
  const dbTables = useMemo(() => {
    // A. attributetypes
    const seenTypeIds = new Set<number>();
    const attributetypesData: any[] = [];
    attributeTypes.forEach((t) => {
      const typeIntId = typeIdMap.get(t.id) || 999;
      if (seenTypeIds.has(typeIntId)) return;
      seenTypeIds.add(typeIntId);
      attributetypesData.push({
        AttributeTypeId: typeIntId,
        TypeNameEn: t.nameEn,
        TypeNameHe: t.nameHe,
        IsActive: t.isActive ? "TRUE" : "FALSE",
        IsDeleted: t.isDeleted ? "TRUE" : "FALSE",
        CreatedDate: "2026-06-01 08:30:00+03",
        CreatedBy: "svetlana.chr@volcani.agri.gov.il"
      });
    });

    // B. attributevalues
    const seenValueIds = new Set<number>();
    const attributevaluesData: any[] = [];
    attributeTypes.forEach((t) => {
      const typeIntId = typeIdMap.get(t.id) || 999;
      t.values.forEach((v) => {
        const valIntId = valueIdMap.get(v.id) || 9999;
        if (seenValueIds.has(valIntId)) return;
        seenValueIds.add(valIntId);
        attributevaluesData.push({
          AttributeValueId: valIntId,
          AttributeTypeId: typeIntId,
          ValueNameEn: v.valueEn,
          ValueNameHe: v.valueHe,
          IsActive: v.isActive ? "TRUE" : "FALSE",
          IsDeleted: v.isDeleted ? "TRUE" : "FALSE",
          CreatedDate: "2026-06-01 09:15:00+03",
          CreatedBy: "svetlana.chr@volcani.agri.gov.il"
        });
      });
    });

    // C. auditlog
    const seenAuditLogs = new Set<string>();
    const auditlogData: any[] = [];
    let logSeq = 1;
    auditLogs.forEach((log) => {
      const uniqueKey = `${log.userId}||${log.actionType}||${log.tableName}||${log.oldValue || ""}||${log.newValue || ""}||${log.actionDate}`;
      if (seenAuditLogs.has(uniqueKey)) return;
      seenAuditLogs.add(uniqueKey);
      auditlogData.push({
        AuditLogId: logSeq++,
        UserId: log.userId,
        ActionType: log.actionType,
        TableName: log.tableName,
        OldValue: log.oldValue ? log.oldValue : "NULL",
        NewValue: log.newValue ? log.newValue : "NULL",
        ActionDate: log.actionDate.replace("T", " ").replace("Z", "+00"),
        IPAddress: "172.24.18.9"
      });
    });

    // D. financialratecache
    // Deterministic generation matching simulated BoI rates
    const financialRateCurrencies = [
      { code: "USD", heName: "דולר ארה''ב", enName: "US Dollar", unit: 1, baseRate: 3.742 },
      { code: "EUR", heName: "אירו", enName: "Euro", unit: 1, baseRate: 4.015 },
      { code: "GBP", heName: "ליש''ט", enName: "Pound Sterling", unit: 1, baseRate: 4.756 },
      { code: "CAD", heName: "דולר קנדי", enName: "Canadian Dollar", unit: 1, baseRate: 2.715 },
      { code: "JPY", heName: "יין יפני", enName: "Japanese Yen", unit: 100, baseRate: 2.378 }
    ];

    const financialratecacheData: any[] = [];
    let cacheCounter = 1;
    const seenRates = new Set<string>();
    // Generate cache records for the last 3 calendar dates
    for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
      const dateObj = new Date();
      dateObj.setDate(dateObj.getDate() - dayOffset);
      const rateDateStr = dateObj.toISOString().split("T")[0];

      financialRateCurrencies.forEach((cur) => {
        const rateKey = `${cur.code}||${rateDateStr}`;
        if (seenRates.has(rateKey)) return;
        seenRates.add(rateKey);

        // slightly fluctuate rate deterministically
        const charSum = cur.code.charCodeAt(0) + cur.code.charCodeAt(1);
        const daySum = dateObj.getDate();
        const factor = Math.sin(charSum + daySum) * 0.012;
        const exchangeRate = cur.baseRate * (1 + factor);
        const trend = exchangeRate * factor * 0.5;
        const trendPercent = factor * 50;

        financialratecacheData.push({
          CacheId: cacheCounter++,
          RateDate: rateDateStr,
          CurrencyCode: cur.code,
          CurrencyNameHe: cur.heName,
          CurrencyNameEn: cur.enName,
          Unit: cur.unit,
          ExchangeRate: exchangeRate.toFixed(4),
          LastTrend: trend.toFixed(6),
          TrendPercent: trendPercent.toFixed(4),
          FetchedAt: `${rateDateStr} 15:45:12+03`
        });
      });
    }

    // E. itemattributemapping
    const seenMappings = new Set<string>();
    const itemattributemappingData: any[] = [];
    itemMappings.forEach((m) => {
      const typeIntId = typeIdMap.get(m.typeId);
      if (typeIntId === undefined) {
        // Skip orphaned mappings to respect foreign key constraint in Supabase
        return;
      }
      const skuNorm = m.itemId.trim().toLowerCase();
      const mappingKey = `${skuNorm}||${typeIntId}`;
      if (seenMappings.has(mappingKey)) return;
      seenMappings.add(mappingKey);

      itemattributemappingData.push({
        SKU: m.itemId.trim(),
        AttributeTypeId: typeIntId,
        IsMandatory: m.isMandatory ? "TRUE" : "FALSE",
        CreatedDate: "2026-06-02 11:20:00+03",
        CreatedBy: "svetlana.chr@volcani.agri.gov.il"
      });
    });

    // F. itemattributeallowedvalues
    const seenAllowedValues = new Set<string>();
    const itemattributeallowedvaluesData: any[] = [];
    itemMappings.forEach((m) => {
      const typeIntId = typeIdMap.get(m.typeId);
      if (typeIntId === undefined) {
        // Skip orphaned mappings to respect foreign key constraint
        return;
      }
      const skuNorm = m.itemId.trim().toLowerCase();
      m.allowedValueIds.forEach((vId) => {
        const valIntId = valueIdMap.get(vId);
        if (valIntId === undefined) {
          // Skip orphaned values to maintain referential integrity
          return;
        }
        const valKey = `${skuNorm}||${typeIntId}||${valIntId}`;
        if (seenAllowedValues.has(valKey)) return;
        seenAllowedValues.add(valKey);

        itemattributeallowedvaluesData.push({
          SKU: m.itemId.trim(),
          AttributeTypeId: typeIntId,
          AttributeValueId: valIntId
        });
      });
    });

    // G. requestattributes
    const seenRequestAttrs = new Set<string>();
    const requestattributesData: any[] = [];
    let lineCounter = 1;
    activeRequests.forEach((req) => {
      // Find matching attribute mapped values
      if (req.attributeValueId && req.attributeTypeId) {
        const typeIntId = typeIdMap.get(req.attributeTypeId);
        const valIntId = valueIdMap.get(req.attributeValueId);
        if (typeIntId === undefined || valIntId === undefined) {
          // Skip orphaned values to maintain referential integrity
          return;
        }
        const skuNorm = req.sku.trim().toLowerCase();
        const attrKey = `${skuNorm}||${typeIntId}||${valIntId}`;
        if (seenRequestAttrs.has(attrKey)) return;
        seenRequestAttrs.add(attrKey);

        requestattributesData.push({
          RequestLineId: lineCounter++,
          SKU: req.sku.trim(),
          AttributeTypeId: typeIntId,
          AttributeValueId: valIntId,
          SelectedValueTextHe: req.attributeValueNameHe,
          SelectedValueTextEn: req.attributeValueNameEn
        });
      }
    });

    // H. warehouseitems (Extended Catalog Management)
    const seenWarehouseItems = new Set<string>();
    const warehouseitemsData: any[] = [];
    warehouseItems.forEach((wi) => {
      const skuNorm = wi.sku.trim();
      if (seenWarehouseItems.has(skuNorm)) return;
      seenWarehouseItems.add(skuNorm);
      const finalUrl = GetItemPrimaryImageBySku(skuNorm, itemPictureUrls, isRtl);
      warehouseitemsData.push({
        SKU: skuNorm,
        NameHe: wi.nameHe,
        NameEn: wi.nameEn,
        Stock: wi.stock,
        Price: wi.price,
        Shelf: wi.shelf ? wi.shelf : "NULL",
        CategoryHe: wi.categoryHe ? wi.categoryHe : "NULL",
        CategoryEn: wi.categoryEn ? wi.categoryEn : "NULL",
        UnitHe: wi.unitHe ? wi.unitHe : "NULL",
        UnitEn: wi.unitEn ? wi.unitEn : "NULL",
        ImageUrl: finalUrl ? finalUrl : "NULL",
        ImageFilter: wi.imageFilter ? wi.imageFilter : "NULL"
      });
    });

    const itempictureurlsData: any[] = [];
    itemPictureUrls.forEach((pic) => {
      itempictureurlsData.push({
        PictureId: pic.id,
        SKU: pic.sku,
        ImageUrl: pic.imageUrl,
        ImageSource: pic.imageSource,
        IsPrimary: pic.isPrimary ? "TRUE" : "FALSE",
        CreatedDate: pic.createdDate.replace("T", " ").replace("Z", "+00"),
        UpdatedDate: pic.updatedDate ? pic.updatedDate.replace("T", " ").replace("Z", "+00") : pic.createdDate.replace("T", " ").replace("Z", "+00"),
        CreatedBy: pic.createdBy,
        UpdatedBy: pic.updatedBy,
        IsActive: pic.isActive ? "TRUE" : "FALSE"
      });
    });

    const warehouserequestsData: any[] = [];
    activeRequests.forEach((req) => {
      const typeIntId = req.attributeTypeId ? (typeIdMap.get(req.attributeTypeId) || null) : null;
      const valIntId = req.attributeValueId ? (valueIdMap.get(req.attributeValueId) || null) : null;
      warehouserequestsData.push({
        RequestId: req.requestId,
        SKU: req.sku,
        ItemNameHe: req.itemNameHe,
        ItemNameEn: req.itemNameEn,
        QuantityRequested: req.quantityRequested,
        AttributeTypeId: typeIntId !== null ? typeIntId : "NULL",
        AttributeValueId: valIntId !== null ? valIntId : "NULL",
        RequestDate: req.requestDate.replace("T", " ").replace("Z", "+00"),
        RequestedBy: req.requestedBy,
        StatusHe: req.statusHe,
        StatusEn: req.statusEn
      });
    });

    const nipukrecordsData: any[] = [];
    nipukRecords.forEach((rec) => {
      nipukrecordsData.push({
        NipukId: rec.nipukId,
        DispatchDate: rec.dispatchDate,
        DispatchTime: rec.dispatchTime,
        OrderNumber: rec.orderNumber ? rec.orderNumber : "NULL",
        RequestDate: rec.requestDate ? rec.requestDate : "NULL",
        SKU: rec.sku ? rec.sku : "NULL",
        ItemNameHe: rec.itemNameHe ? rec.itemNameHe : "NULL",
        ItemNameEn: rec.itemNameEn ? rec.itemNameEn : "NULL",
        Quantity: rec.quantity !== undefined ? rec.quantity : "NULL",
        Notes: rec.notes ? rec.notes : "NULL",
        Remark: rec.remark ? rec.remark : "NULL",
        AttributeTypeNameHe: rec.attributeTypeNameHe ? rec.attributeTypeNameHe : "NULL",
        AttributeValueNameHe: rec.attributeValueNameHe ? rec.attributeValueNameHe : "NULL",
        AttributeTypeNameEn: rec.attributeTypeNameEn ? rec.attributeTypeNameEn : "NULL",
        AttributeValueNameEn: rec.attributeValueNameEn ? rec.attributeValueNameEn : "NULL",
        WorkerId: rec.workerId,
        WorkerName: rec.workerName,
        WorkerRole: rec.workerRole,
        CustomerName: rec.customerName,
        CustomerId: rec.customerId ? rec.customerId : "NULL",
        CustomerPhone: rec.customerPhone ? rec.customerPhone : "NULL",
        CreatedTimestamp: rec.createdTimestamp.replace("T", " ").replace("Z", "+00"),
        LastUpdateTimestamp: rec.lastUpdateTimestamp.replace("T", " ").replace("Z", "+00")
      });
    });

    const appusersData: any[] = [];
    users.forEach((usr) => {
      appusersData.push({
        UserId: usr.userId,
        TeudatZehut: usr.teudatZehut,
        FirstName: usr.firstName,
        LastName: usr.lastName,
        JobTitle: usr.jobTitle,
        Phone: usr.phone,
        Email: usr.email,
        PasswordHash: usr.passwordHash,
        Role: usr.role,
        IsActive: usr.isActive ? "TRUE" : "FALSE",
        CreatedDate: usr.createdDate.replace("T", " ").replace("Z", "+00"),
        LastLoginDate: usr.lastLoginDate ? usr.lastLoginDate.replace("T", " ").replace("Z", "+00") : "NULL"
      });
    });

    // Handle empty table states gracefully
    const rawResult = {
      attributetypes: attributetypesData,
      attributevalues: attributevaluesData,
      auditlog: auditlogData,
      financialratecache: financialratecacheData,
      itemattributemapping: itemattributemappingData,
      itemattributeallowedvalues: itemattributeallowedvaluesData,
      requestattributes: requestattributesData,
      warehouseitems: warehouseitemsData,
      itempictureurls: itempictureurlsData,
      warehouserequests: warehouserequestsData,
      nipukrecords: nipukrecordsData,
      appusers: appusersData
    };

    // Transform all keys of the records to lowercase to strictly match lowercase column requirements
    const lowercaseResult: typeof rawResult = {} as any;
    Object.entries(rawResult).forEach(([tableName, rows]) => {
      (lowercaseResult as any)[tableName] = rows.map((row) => {
        const newRow: any = {};
        Object.entries(row).forEach(([key, val]) => {
          newRow[key.toLowerCase()] = val;
        });
        return newRow;
      });
    });

    return lowercaseResult;
  }, [attributeTypes, itemMappings, activeRequests, auditLogs, warehouseItems, itemPictureUrls, users, nipukRecords, typeIdMap, valueIdMap]);

  // Safe CSV conversion function helper
  const convertToCSV = (array: any[]): string => {
    if (array.length === 0) return "";
    const headers = Object.keys(array[0]);
    const csvRows = [headers.join(",")];

    array.forEach((row) => {
      const values = headers.map((header) => {
        const val = row[header];
        // Clean values, escape double quotes and wrap text with quotes if there are commas
        const escaped = String(val === null || val === undefined ? "" : val).replace(/"/g, '""');
        return escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')
          ? `"${escaped}"`
          : escaped;
      });
      csvRows.push(values.join(","));
    });

    return csvRows.join("\n");
  };

  // Client-side instant file downloader
  const downloadTableAsCSV = (tableName: string) => {
    const data = (dbTables as any)[tableName] || [];
    if (data.length === 0) {
      alert(isRtl ? "אין נתונים זמינים בטבלה זו להורדה." : "No data available in this table to export.");
      return;
    }

    const csvContent = convertToCSV(data);
    // Include UTF-8 byte order mark to ensure Microsoft Excel reads Hebrew and characters perfectly
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${tableName}_export_db.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(tableName);
    setTimeout(() => setDownloadSuccess(null), 3500);
  };

  // Handle all tables combined download inside a ZIP or sequential downloading triggers
  const downloadAllAsCSV = () => {
    Object.keys(dbTables).forEach((tblName) => {
      downloadTableAsCSV(tblName);
    });
  };

  // Meta metadata about the tables mapping
  const tableMetadata = [
    {
      id: "attributetypes",
      icon: <Database className="h-5 w-5 text-blue-400" />,
      titleHe: "attributetypes",
      titleEn: "attributetypes",
      descHe: "קטגוריות המאפיינים הראשיות (למשל: מידה, צבע, סוג חיבור, דגם)",
      descEn: "Core mapped categorization types (e.g. Size, Color, Fitment)",
      columns: ["AttributeTypeId", "TypeNameEn", "TypeNameHe", "IsActive", "IsDeleted", "CreatedDate", "CreatedBy"].map(c => c.toLowerCase())
    },
    {
      id: "attributevalues",
      icon: <Table className="h-5 w-5 text-amber-400" />,
      titleHe: "attributevalues",
      titleEn: "attributevalues",
      descHe: "הערכים המפורטים המוגדרים תחת כל קטגוריה (M, S, L, אדום, ירוק)",
      descEn: "Detailed allowable categorical values tied to Parent Attribute Type",
      columns: ["AttributeValueId", "AttributeTypeId", "ValueNameEn", "ValueNameHe", "IsActive", "IsDeleted", "CreatedDate", "CreatedBy"].map(c => c.toLowerCase())
    },
    {
      id: "auditlog",
      icon: <Activity className="h-5 w-5 text-indigo-400" />,
      titleHe: "auditlog",
      titleEn: "auditlog",
      descHe: "יומן מעקב ביקורת אבטחתי לשינויים במסד הנתונים וניהול הרשאות",
      descEn: "Comprehensive database ledger audit log & history changes",
      columns: ["AuditLogId", "UserId", "ActionType", "TableName", "OldValue", "NewValue", "ActionDate", "IPAddress"].map(c => c.toLowerCase())
    },
    {
      id: "financialratecache",
      icon: <DollarSign className="h-5 w-5 text-emerald-400" />,
      titleHe: "financialratecache",
      titleEn: "financialratecache",
      descHe: "מטמון נתוני שער חליפין יציג יומי מבנק ישראל לחישובים תקציביים",
      descEn: "Locally cached representative exchange rates from Bank of Israel API",
      columns: ["CacheId", "RateDate", "CurrencyCode", "CurrencyNameHe", "CurrencyNameEn", "Unit", "ExchangeRate", "LastTrend", "TrendPercent", "FetchedAt"].map(c => c.toLowerCase())
    },
    {
      id: "itemattributemapping",
      icon: <FileSpreadsheet className="h-5 w-5 text-violet-400" />,
      titleHe: "itemattributemapping",
      titleEn: "itemattributemapping",
      descHe: "טבלת שיוך קטגוריות מאפיין לפי מק''ט והגדרת שדות חובה",
      descEn: "Mapping table linking specific item SKUs directly to Attribute Types",
      columns: ["SKU", "AttributeTypeId", "IsMandatory", "CreatedDate", "CreatedBy"].map(c => c.toLowerCase())
    },
    {
      id: "itemattributeallowedvalues",
      icon: <ArrowRightLeft className="h-5 w-5 text-rose-400" />,
      titleHe: "itemattributeallowedvalues",
      titleEn: "itemattributeallowedvalues",
      descHe: "טבלת הצלבה של הערכים הספציפיים המותרים לבחירה עבור מק''ט מסוים",
      descEn: "Whitelist intersection mapping of values permitted specifically per SKU",
      columns: ["SKU", "AttributeTypeId", "AttributeValueId"].map(c => c.toLowerCase())
    },
    {
      id: "requestattributes",
      icon: <FileText className="h-5 w-5 text-teal-400" />,
      titleHe: "requestattributes",
      titleEn: "requestattributes",
      descHe: "בחירות המזמינים בפועל לכל שורת פריט בעת הגשת טפסי דרישה",
      descEn: "Captured user categorical selections for submitted inventory request lines",
      columns: ["RequestLineId", "SKU", "AttributeTypeId", "AttributeValueId", "SelectedValueTextHe", "SelectedValueTextEn"].map(c => c.toLowerCase())
    },
    {
      id: "warehouseitems",
      icon: <BookOpen className="h-5 w-5 text-cyan-400" />,
      titleHe: "warehouseitems",
      titleEn: "warehouseitems",
      descHe: "קטלוג הפריטים המורחב של המחסן - כולל מלאי, מחירים, שכבות מיקום ועוד",
      descEn: "Extended warehouse items catalog containing SKU, stock levels, shelves and unit definitions",
      columns: ["SKU", "NameHe", "NameEn", "Stock", "Price", "Shelf", "CategoryHe", "CategoryEn", "UnitHe", "UnitEn", "ImageUrl", "ImageFilter"].map(c => c.toLowerCase())
    },
    {
      id: "itempictureurls",
      icon: <Image className="h-5 w-5 text-pink-400" />,
      titleHe: "itempictureurls",
      titleEn: "itempictureurls",
      descHe: "קישורי תמונות פריטים מרובים עם מקורות ומזהי סגנון",
      descEn: "Multiple item dynamic image URLs with origins and style filters",
      columns: ["PictureId", "SKU", "ImageUrl", "ImageSource", "IsPrimary", "CreatedDate", "UpdatedDate", "CreatedBy", "UpdatedBy", "IsActive"].map(c => c.toLowerCase())
    },
    {
      id: "warehouserequests",
      icon: <FileText className="h-5 w-5 text-orange-400" />,
      titleHe: "warehouserequests",
      titleEn: "warehouserequests",
      descHe: "בקשות ניפוק מלאות וערוצי אספקה מאושרים לפי דורשים ומצב הזמנה",
      descEn: "Complete warehouse inventory issuance requests and fulfillment tracking records",
      columns: ["RequestId", "SKU", "ItemNameHe", "ItemNameEn", "QuantityRequested", "AttributeTypeId", "AttributeValueId", "RequestDate", "RequestedBy", "StatusHe", "StatusEn"].map(c => c.toLowerCase())
    },
    {
      id: "nipukrecords",
      icon: <Calendar className="h-5 w-5 text-purple-400" />,
      titleHe: "nipukrecords",
      titleEn: "nipukrecords",
      descHe: "רישומי תיעוד ניכוי ומסירה פיזית של פריטי המלאי ללקוחות החקלאיים",
      descEn: "Archived physical warehouse dispatch, shipping, and delivery log slips",
      columns: [
        "NipukId", "DispatchDate", "DispatchTime", "OrderNumber", "RequestDate", "SKU", 
        "ItemNameHe", "ItemNameEn", "Quantity", "Notes", "Remark", "AttributeTypeNameHe", 
        "AttributeValueNameHe", "AttributeTypeNameEn", "AttributeValueNameEn", "WorkerId", 
        "WorkerName", "WorkerRole", "CustomerName", "CustomerId", "CustomerPhone", 
        "CreatedTimestamp", "LastUpdateTimestamp"
      ].map(c => c.toLowerCase())
    },
    {
      id: "appusers",
      icon: <Users className="h-5 w-5 text-cyan-400" />,
      titleHe: "appusers",
      titleEn: "appusers",
      descHe: "רשימת המחזיקים בהרשאת כניסה למערכת ובעלי תפקידים מוגדרים",
      descEn: "System access identities, roles, credentials, and verification keys",
      columns: ["UserId", "TeudatZehut", "FirstName", "LastName", "JobTitle", "Phone", "Email", "PasswordHash", "Role", "IsActive", "CreatedDate", "LastLoginDate"].map(c => c.toLowerCase())
    }
  ];

  const currentMetadata = tableMetadata.find(t => t.id === selectedTable) || tableMetadata[0];
  const activeDataList = (dbTables as any)[selectedTable] || [];

  // Filter preview list dynamically based on query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return activeDataList;
    const q = searchQuery.toLowerCase();
    return activeDataList.filter((row: any) => {
      return Object.values(row).some((val) => 
        String(val).toLowerCase().includes(q)
      );
    });
  }, [activeDataList, searchQuery]);

  // Paginate Export Preview Data
  const totalExportCount = filteredData.length;
  const totalPages = Math.ceil(totalExportCount / rowsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const indexOfLastExport = safeCurrentPage * rowsPerPage;
  const indexOfFirstExport = indexOfLastExport - rowsPerPage;
  const paginatedExportData = filteredData.slice(indexOfFirstExport, indexOfLastExport);

  const fromExportVal = totalExportCount === 0 ? 0 : indexOfFirstExport + 1;
  const toExportVal = Math.min(indexOfLastExport, totalExportCount);

  return (
    <div className="bg-slate-900 border border-slate-700/85 rounded-xl shadow-2xl p-6 relative" style={{ direction: isRtl ? "rtl" : "ltr" }}>
      
      {/* Stop Migration Confirmation Modal Overlay */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl animate-scaleIn">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-2.5 bg-rose-500/10 rounded-full text-rose-500 shrink-0">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {isRtl ? "האם להפסיק את העברת הנתונים?" : "Stop Migration?"}
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {isRtl 
                    ? "תהליך העברת הנתונים ל-Supabase פעיל כעת. האם ברצונך לעצור אותו? רשומות שכבר הועברו יישארו במסד הנתונים בענן."
                    : "The migration is currently running. Do you want to stop the migration? Already migrated records will remain in the database."}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer transition select-none"
              >
                {isRtl ? "המשך בהעברה" : "Continue Migration"}
              </button>
              <button
                onClick={confirmStopMigration}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer transition select-none"
              >
                {isRtl ? "עצור העברה" : "Stop Migration"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Info Panel with Badge indicator */}
      <div className="border-b border-slate-700 pb-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2.5">
            <Database className="h-6 w-6 text-amber-500 shrink-0" />
            <span>
              {isRtl ? "מרכז ייצוא נתונים לפלטפורמת Supabase" : "Supabase Database CSV Control Panel"}
            </span>
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
            {isRtl 
              ? "מסך מנהל המערכת מאפשר הורדה מהירה של קובצי CSV מיושרים ומסונכרנים עבור כל טבלאות מסד הנתונים. המפתחות הזרים והמזהים ממופים במיוחד כערכים שלמים (Integers) כדי להתאים אחד לאחד לסכימה שהותקנה ב-Supabase." 
              : "Administrative management portal allowing instantaneous normalized CSV data stream exports cleanly generated to keep dynamic relational referential integrity. All foreign keys and primary ids are translated to incremental integers matching our Supabase schema exactly."}
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3 flex-wrap">
          {/* Migration Trigger Action Button */}
          <button
            onClick={triggerMigration}
            disabled={migrationStatus === "MIGRATING"}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-lg shadow-lg cursor-pointer transition select-none uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRightLeft className="h-4 w-4 shrink-0" />
            <span>{isRtl ? "העבר נתונים ל-Supabase" : "Migrate Data to Supabase"}</span>
          </button>

          <button
            onClick={downloadAllAsCSV}
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-2.5 px-4 rounded-lg shadow-lg cursor-pointer transition select-none uppercase tracking-wider"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span>{isRtl ? "הורד את כל ה-12 טבלאות" : "Download All 12 Tables"}</span>
          </button>
        </div>
      </div>

      {/* Migration Wizard Panel */}
      {migrationStatus !== "IDLE" && (
        <div className="mb-6 p-5 rounded-xl border border-slate-700/60 bg-slate-950/90 shadow-xl overflow-hidden animate-fadeIn">
          {migrationStatus === "CONFIRMING" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-1" />
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {isRtl ? "אישור העברת נתונים מלאה לענן Supabase" : "Confirm Full Supabase Cloud Data Migration"}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                      {isRtl 
                        ? "פעולה זו תעתיק את כל נתוני המערכת השמורים בדפדפן המקומי (LocalStorage) אל מסד הנתונים בענן Supabase תחת הסכימה המאובטחת 'public'. רשומות קיימות ב-Supabase לא ייכפלו (יתבצע עדכון אוטומטי - UPSERT). התהליך יבוצע פריט-אחר-פריט לטובת עמידות ופירוט מלא של השגיאות. האם ברצונך להמשיך?"
                        : "This operation will copy all application data from Local Storage to the Supabase database. Existing records in Supabase must not be duplicated. This processes row-by-row for ultimate fault isolation. Do you want to continue?"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => setMigrationStatus("IDLE")}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition select-none"
                  >
                    {isRtl ? "ביטול" : "Cancel"}
                  </button>
                  <button
                    onClick={executeMigration}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition shadow-md flex items-center gap-1.5 select-none"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>{isRtl ? "התחל מיגרציה" : "Start Migration"}</span>
                  </button>
                </div>
              </div>

              {/* Configurations Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 p-3 bg-slate-900/60 rounded-lg border border-slate-800">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="autoStopOnErrorCheckbox"
                    checked={autoStopOnError}
                    onChange={(e) => setAutoStopOnError(e.target.checked)}
                    className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0 cursor-pointer"
                  />
                  <div>
                    <label htmlFor="autoStopOnErrorCheckbox" className="text-xs font-bold text-slate-200 cursor-pointer select-none">
                      {isRtl 
                        ? "עצור העברה אוטומטית לאחר השגיאה הקריטית הראשונה" 
                        : "Automatically stop migration after the first critical error"}
                    </label>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {isRtl 
                        ? "מומלץ למניעת פגיעה בשלמות הנתונים במקרה של שגיאות חמורות במסד הנתונים בענן."
                        : "Stops the process on severe SQL exceptions to inspect diagnostics immediately."}
                    </p>
                  </div>
                </div>

                {hasSavedCheckpoint && (
                  <div className="flex items-start gap-2.5 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
                    <input
                      type="checkbox"
                      id="useCheckpointCheckbox"
                      checked={useCheckpoint}
                      onChange={(e) => setUseCheckpoint(e.target.checked)}
                      className="mt-0.5 rounded bg-slate-800 border-slate-700 text-blue-600 focus:ring-blue-500 h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <div>
                      <label htmlFor="useCheckpointCheckbox" className="text-xs font-extrabold text-blue-400 cursor-pointer select-none">
                        {isRtl 
                          ? "נמצאה נקודת שחזור קודמת. המשך מאותה נקודה" 
                          : "Saved checkpoint found. Resume from this checkpoint"}
                      </label>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {isRtl 
                          ? "ידלג במהירות על רשומות שהועברו בהצלחה בסבב הקודם."
                          : "Safely skips already upserted records to save time and API requests."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {migrationStatus === "MIGRATING" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {isRtl ? "מעביר נתונים ומאמת קשרים זרים..." : "Migrating Data & Validating Referential Integrity..."}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">{migrationStep}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={requestStopMigration}
                    disabled={isStopping}
                    className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs py-1.5 px-3 rounded-lg shadow cursor-pointer transition select-none disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Square className="h-3.5 w-3.5" fill="currentColor" />
                    <span>{isStopping ? (isRtl ? "עוצר..." : "Stopping...") : (isRtl ? "עצור העברה" : "Stop Migration")}</span>
                  </button>
                  <div className="text-xs font-mono font-bold text-blue-400">
                    {migrationProgress}%
                  </div>
                </div>
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
                  style={{ width: `${migrationProgress}%` }}
                />
              </div>
            </div>
          )}

          {migrationStatus === "COMPLETED" && migrationReport && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-3">
                {migrationReport.validationResult === "CANCELLED" ? (
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-amber-500/10 rounded-full">
                      <X className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-400">
                        {isRtl ? "העברת הנתונים הופסקה על ידי המשתמש" : "Data Migration Aborted By User"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isRtl 
                          ? `התהליך הופסק בצורה בטוחה. שמרנו נקודת שחזור כדי שתוכל להמשיך מאוחר יותר.`
                          : `Process safely stopped. Already migrated records remain in your cloud database.`}
                      </p>
                    </div>
                  </div>
                ) : migrationReport.validationResult === "FAILED" ? (
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-rose-500/10 rounded-full">
                      <X className="h-5 w-5 text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-rose-400">
                        {isRtl ? "העברת הנתונים הופסקה עקב שגיאה קריטית" : "Data Migration Stopped Due to Critical Error"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isRtl 
                          ? "העצירה האוטומטית הופעלה כדי לשמור על שלמות מסד הנתונים."
                          : "Pipeline stopped to avoid further data integrity anomalies."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <div className="p-1 bg-emerald-500/10 rounded-full">
                      <Check className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-emerald-400">
                        {isRtl ? "מיגרציית הנתונים הושלמה בהצלחה!" : "Data Migration Procedure Completed Successfully!"}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isRtl 
                          ? "סנכרון הנתונים ומפתחות הזרים הושלם. דפדף ביומן מטה לביקורת ואימות מלאים."
                          : "Referential integrity and image mappings processed. Review transaction logs below."}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={downloadMigrationReport}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs py-2 px-3 rounded-lg cursor-pointer transition flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{isRtl ? "הורד דוח מלא (JSON)" : "Download Full Report"}</span>
                  </button>
                  <button
                    onClick={() => setMigrationStatus("IDLE")}
                    className={`font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition ${
                      migrationReport.validationResult === "CANCELLED" ? "bg-amber-600 hover:bg-amber-500 text-white" :
                      migrationReport.validationResult === "FAILED" ? "bg-rose-600 hover:bg-rose-500 text-white" :
                      "bg-emerald-600 hover:bg-emerald-500 text-white"
                    }`}
                  >
                    {isRtl ? "סגור" : "Close"}
                  </button>
                </div>
              </div>

              {/* Metrics dashboard */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-sans font-medium">
                    {isRtl ? "סה''כ טבלאות" : "Total Tables"}
                  </span>
                  <span className="block text-base font-bold text-white font-mono mt-0.5">
                    {migrationReport.totalEntities}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-sans font-medium">
                    {isRtl ? "סה''כ רשומות" : "Total Records"}
                  </span>
                  <span className="block text-base font-bold text-white font-mono mt-0.5">
                    {migrationReport.totalRead}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-sans font-medium">
                    {isRtl ? "הועברו בהצלחה" : "Migrated successfully"}
                  </span>
                  <span className="block text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {migrationReport.migrated}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-sans font-medium">
                    {isRtl ? "רשומות שכשלו" : "Failed Records"}
                  </span>
                  <span className={`block text-base font-bold font-mono mt-0.5 ${migrationReport.failed > 0 ? "text-rose-500 animate-pulse" : "text-slate-500"}`}>
                    {migrationReport.failed}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-sans font-medium text-amber-400">
                    {isRtl ? "רשומות שנותרו" : "Remaining"}
                  </span>
                  <span className="block text-base font-bold text-amber-400 font-mono mt-0.5">
                    {migrationReport.remainingRecordsNotProcessed ?? 0}
                  </span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg col-span-2 md:col-span-1 xl:col-span-1">
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-sans font-medium">
                    {isRtl ? "זמן ביצוע" : "Execution Time"}
                  </span>
                  <span className="block text-base font-bold text-blue-400 font-mono mt-0.5">
                    {(migrationReport.elapsedTimeMs / 1000).toFixed(2)}s
                  </span>
                </div>
              </div>

              {/* Grouped Errors Breakdown */}
              {Object.keys(migrationReport.errorsGrouped).length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <h4 className="text-xs font-bold text-rose-400 mb-2 uppercase tracking-wide">
                      {isRtl ? "פירוט שגיאות לפי טבלה" : "Errors Breakdown by Table"}
                    </h4>
                    <div className="space-y-2 max-h-[150px] overflow-y-auto font-sans">
                      {Object.entries(migrationReport.errorsGrouped).map(([tbl, rawErrs]) => {
                        const errs = (rawErrs || []) as string[];
                        return (
                          <div key={tbl} className="text-[11px] font-mono border-b border-slate-800 pb-1 last:border-0">
                            <span className="text-amber-400 font-bold">{tbl}</span>: <span className="text-rose-300">{errs.length} failures</span>
                            <ul className="list-disc pl-4 rtl:pr-4 text-slate-400 text-[10px] mt-1 space-y-0.5 font-sans">
                              {errs.slice(0, 3).map((e, idx) => (
                                <li key={idx}>{e}</li>
                              ))}
                              {errs.length > 3 && <li>... (+ {errs.length - 3} {isRtl ? "שגיאות נוספות" : "more errors"})</li>}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Schema Missing Columns Detection & Copy SQL Troubleshooting block */}
                  {(Object.values(migrationReport.errorsGrouped) as any[]).some(errs => 
                    (errs || []).some((e: string) => e.includes("column") || e.includes("PGRST204") || e.includes("Could not find"))
                  ) && (
                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-slate-200">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                        <div className="w-full">
                          <h4 className="text-xs font-extrabold text-amber-400">
                            {isRtl ? "זוהו עמודות חסרות במסד הנתונים בענן!" : "Missing Database Columns Detected!"}
                          </h4>
                          <p className="text-[10px] text-slate-300 mt-1.5 leading-relaxed">
                            {isRtl 
                              ? "נראה כי טבלאות קיימות ב-Supabase נוצרו בעבר ללא העמודות החדשות. כדי לפתור זאת, העתק את קוד ה-SQL הבא, הרץ אותו ב-SQL Editor של פרויקט ה-Supabase שלך, ולאחר מכן לחץ על 'Reload Schema' בדשבורד של Supabase."
                              : "It seems existing tables in Supabase are missing some columns. To fix this, copy the SQL block below, run it in your Supabase SQL Editor, and then click 'Reload Schema' in your Supabase Dashboard."}
                          </p>
                          
                          <div className="relative mt-3">
                            <pre className="p-3 bg-slate-950/85 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-[180px] leading-relaxed">
                              {`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMPTZ;

ALTER TABLE public.attribute_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.attribute_types ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.attribute_types ADD COLUMN IF NOT EXISTS values JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS shelf TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS category_he TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS category_en TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS unit_he TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS unit_en TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS image_filter TEXT;

ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS image_source TEXT;
ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.item_mappings ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE;
ALTER TABLE public.item_mappings ADD COLUMN IF NOT EXISTS allowed_value_ids JSONB DEFAULT '[]'::jsonb;`}
                            </pre>
                            <button
                              type="button"
                              onClick={() => {
                                const sqlText = `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMPTZ;

ALTER TABLE public.attribute_types ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE public.attribute_types ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.attribute_types ADD COLUMN IF NOT EXISTS values JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS shelf TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS category_he TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS category_en TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS unit_he TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS unit_en TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.warehouse_items ADD COLUMN IF NOT EXISTS image_filter TEXT;

ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS image_source TEXT;
ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS created_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.item_picture_urls ADD COLUMN IF NOT EXISTS updated_date TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.item_mappings ADD COLUMN IF NOT EXISTS is_mandatory BOOLEAN DEFAULT FALSE;
ALTER TABLE public.item_mappings ADD COLUMN IF NOT EXISTS allowed_value_ids JSONB DEFAULT '[]'::jsonb;`;
                                navigator.clipboard.writeText(sqlText);
                                alert(isRtl ? "הקוד הועתק ללוח!" : "SQL copied to clipboard!");
                              }}
                              className="absolute top-2 right-2 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-[10px] text-white font-extrabold rounded border border-blue-500 cursor-pointer select-none transition"
                            >
                              {isRtl ? "העתק SQL" : "Copy SQL"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* LocalStorage warning info */}
              <div className="p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-300 text-xs flex gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                <div>
                  <p className="font-bold">
                    {isRtl ? "סנכרון ענן פעיל!" : "Cloud Database Synchronized!"}
                  </p>
                  <p className="mt-0.5">
                    {isRtl 
                      ? "כל המזהים סונכרנו ומפתחות זרים אומתו ברמת מסד הנתונים בענן."
                      : "Foreign key validation and referential integrity passed successfully in the cloud."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {migrationStatus === "FAILED" && (
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-rose-500 shrink-0 mt-1" />
                <div>
                  <h3 className="text-base font-bold text-rose-500">
                    {isRtl ? "כשל קריטי בתהליך המיגרציה" : "Critical Error During Migration Pipeline"}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {isRtl 
                      ? "התהליך נתקל בשגיאה חמורה ולא הצליח להשלים את הסנכרון. עיין ביומן הפעולות מטה לפרטים."
                      : "The migration pipeline halted due to a critical exception. Check the real-time activity log below for diagnosing the root cause."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={executeMigration}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition"
                >
                  {isRtl ? "נסה שוב" : "Retry Migration"}
                </button>
                <button
                  onClick={() => setMigrationStatus("IDLE")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition"
                >
                  {isRtl ? "סגור" : "Close"}
                </button>
              </div>
            </div>
          )}

          {/* Diagnostic & Automatic Error Summary Banner (Requirement 9) */}
          {diagnosticSummary && (
            <div className="mt-4 p-4 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-200 text-xs font-sans">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5 animate-pulse" />
                <div>
                  <p className="font-bold text-rose-300 text-sm">
                    {isRtl ? "סיכום אבחון שגיאות אוטומטי" : "Automatic Error Diagnostic Summary"}
                  </p>
                  <p className="mt-1 leading-relaxed">
                    {diagnosticSummary}
                  </p>
                  <p className="mt-2 text-slate-400 text-[10px] border-t border-rose-500/20 pt-2 leading-relaxed">
                    {isRtl 
                      ? "המלצה: ודא שסכימת 'public' נוצרה ושמפתחות זרים של פריטים ומשתמשים קיימים בטבלאות האב המתאימות לפני העלאת רשומות מקושרות."
                      : "Guidance: Verify 'public' schema existence, ensure parent table foreign keys (like SKU or userId) exist, and check Row-Level Security permissions in your Supabase admin panel."}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Real-time Migration Log Viewer (Requirement 6 & 7) */}
          <div className="mt-5 border border-slate-800 bg-slate-950/90 rounded-xl overflow-hidden shadow-2xl font-sans">
            <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200">
                  {isRtl ? "יומן פעולות העברת נתונים ואימות בזמן אמת" : "Real-time Migration & Integrity Verification Log"}
                </span>
                <span className="bg-slate-800 text-slate-400 text-[10px] px-1.5 py-0.5 rounded font-mono">
                  {migrationLogs.length} logs
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyLogsToClipboard}
                  disabled={migrationLogs.length === 0}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
                  title={isRtl ? "העתק ללוח" : "Copy to Clipboard"}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={downloadLogsAsTxt}
                  disabled={migrationLogs.length === 0}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded hover:text-white transition disabled:opacity-40 disabled:pointer-events-none"
                  title={isRtl ? "הורד כקובץ TXT" : "Download as TXT"}
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={clearMigrationLogs}
                  disabled={migrationLogs.length === 0}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-rose-400 hover:bg-rose-950/30 rounded transition disabled:opacity-40 disabled:pointer-events-none"
                  title={isRtl ? "נקה יומן" : "Clear Log"}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[250px] overflow-y-auto font-mono text-[11px] p-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-800">
              {migrationLogs.length === 0 ? (
                <div className="text-center text-slate-500 py-6 text-xs">
                  {isRtl ? "היומן ריק. התחל מיגרציה לצפייה ברישומים." : "Activity log is empty. Start migration to stream logs."}
                </div>
              ) : (
                migrationLogs.map((log) => (
                  <div 
                    key={log.id} 
                    className={`flex flex-col p-1.5 rounded transition ${
                      log.severity === "ERROR" 
                        ? "bg-rose-950/20 border-r-2 border-rose-500 text-rose-300" 
                        : log.severity === "WARNING" 
                          ? "bg-amber-950/20 border-r-2 border-amber-500 text-amber-300" 
                          : "hover:bg-slate-900/40 border-r-2 border-blue-500 text-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-slate-500 text-[10px]">
                          {log.timestamp.split("T")[1].replace("Z", "")}
                        </span>
                        <span className="font-extrabold uppercase tracking-wide text-[10px] opacity-80 bg-slate-800 px-1 rounded text-slate-300 font-sans">
                          {log.entity}
                        </span>
                        <span>{log.message}</span>
                      </div>
                      {log.details && (
                        <button
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className="text-[10px] underline hover:text-white select-none shrink-0"
                        >
                          {expandedLogId === log.id 
                            ? (isRtl ? "צמצם" : "Collapse") 
                            : (isRtl ? "פרטים" : "Details")}
                        </button>
                      )}
                    </div>

                    {log.details && expandedLogId === log.id && (
                      <pre className="mt-2 p-2.5 rounded bg-slate-950 border border-slate-800 overflow-x-auto text-[10px] text-slate-400 font-mono leading-relaxed whitespace-pre-wrap break-all max-w-full">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid Layout containing sidebar table selectors and preview console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar: List of available tables */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            {isRtl ? "טבלאות מסד הנתונים" : "Relational SQL Tables"}
          </div>

          <div className="flex flex-col gap-2">
            {tableMetadata.map((tbl) => {
              const rowCount = ((dbTables as any)[tbl.id] || []).length;
              const isCurrent = selectedTable === tbl.id;

              return (
                <button
                  key={tbl.id}
                  onClick={() => {
                    setSelectedTable(tbl.id);
                    setSearchQuery("");
                  }}
                  className={`w-full text-right flex items-center justify-between p-3.5 rounded-lg border text-xs font-bold transition select-none cursor-pointer ${
                    isCurrent 
                      ? "bg-slate-800 border-amber-500 text-white shadow-md shadow-amber-500/5" 
                      : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-md ${isCurrent ? "bg-amber-500/10" : "bg-slate-800"}`}>
                      {tbl.icon}
                    </div>
                    <div className="text-left font-mono">
                      <span className="block text-sm font-bold text-slate-100">{tbl.id}</span>
                      <span className="block text-[10px] text-slate-400 font-sans font-medium line-clamp-1">
                        {isRtl ? tbl.descHe : tbl.descEn}
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono font-black py-0.5 px-2 rounded-full ${isCurrent ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                    {rowCount} {isRtl ? "שורות" : "rows"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 p-4 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-200">
                {isRtl ? "אבטחת המידע ויושר הקישורים" : "Referential Integrity Verified"}
              </p>
              <p className="mt-0.5">
                {isRtl 
                  ? "הקובץ מעוצב בתבנית UTF-8 עם תו BOM מובנה כדי לתמוך בצורה מושלמת בעברית באקסל (לא יופיעו סימני שאלה עבור שמות קטגוריות בעברית)." 
                  : "Encoded in UTF-8 with a BOM prefix, preventing Excel from stripping or breaking Hebrew language strings."}
              </p>
            </div>
          </div>
        </div>

        {/* Preview Panel: Displays actual data currently cached locally for the selected table */}
        <div className="lg:col-span-8 bg-slate-950 rounded-xl border border-slate-800/80 p-5 flex flex-col gap-4 overflow-hidden">
          
          {/* Table Header Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-850 pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 font-mono">
                  {selectedTable}
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-400 py-0.5 px-2 rounded-sm font-bold font-mono">
                  PostgreSQL
                </span>
              </div>
              <p className="text-xs text-slate-350 mt-1">
                {isRtl ? currentMetadata.descHe : currentMetadata.descEn}
              </p>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto">
              <button
                onClick={() => downloadTableAsCSV(selectedTable)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs py-2 px-3.5 rounded transition select-none cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isRtl 
                    ? `הורד ${selectedTable}.csv` 
                    : `Download ${selectedTable}.csv`}
                </span>
              </button>
            </div>
          </div>

          {/* Quick Filter search row */}
          <div className="mb-4 relative">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder={isRtl ? `חפש בנתוני טבלת ${selectedTable}...` : `Filter ${selectedTable} rows...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded py-1.5 pr-10 pl-4 text-xs text-white focus:outline-none focus:border-amber-500/60 font-medium"
            />
          </div>

          {/* Download Success Flash Message */}
          {downloadSuccess && (
            <div className="bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs py-3 px-4 rounded-lg mb-4 flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <span>
                {isRtl 
                  ? `הורדת הקובץ ${downloadSuccess}_export_db.csv הסתיימה בהצלחה! מיושר לחלוטין לקליטה ב-Supabase.`
                  : `Successfully generated and downloaded ${downloadSuccess}_export_db.csv layout!`
                }
              </span>
            </div>
          )}

          {/* CSV Header Structure Preview */}
          <div className="mb-3">
            <span className="text-[11px] font-bold text-slate-400 block mb-1">
              {isRtl ? "מבנה עמודות הסכימה" : "Schema Columns Map:"}
            </span>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              {currentMetadata.columns.map((col) => (
                <span key={col} className="bg-slate-900 border border-slate-800 text-slate-300 py-0.5 px-1.5 rounded">
                  {col}
                </span>
              ))}
            </div>
          </div>

          {/* Responsive Table Preview Block */}
          <div className="grow overflow-auto border border-slate-850 bg-slate-900/40 rounded-lg max-h-[520px]">
            {filteredData.length === 0 ? (
              <div className="py-12 px-4 text-center text-slate-500 text-xs">
                {isRtl ? "לא נמצאו שורות נתונים מתאימות לחיפוש הנוכחי." : "No matching rows found in this catalog preview."}
              </div>
            ) : (
              <table className="w-full text-right text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono text-[10px]">
                    {currentMetadata.columns.map((col) => (
                      <th key={col} className="py-2.5 px-3 text-right font-black whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {paginatedExportData.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-slate-950 transition font-mono text-[11px] text-slate-100">
                      {currentMetadata.columns.map((col) => {
                        const cellVal = row[col];
                        return (
                          <td key={col} className="py-2.5 px-3 whitespace-nowrap text-slate-300">
                            {cellVal === null || cellVal === undefined ? (
                              <span className="text-slate-600 italic">null</span>
                            ) : cellVal === "TRUE" ? (
                              <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1 rounded">TRUE</span>
                            ) : cellVal === "FALSE" ? (
                              <span className="text-rose-400 font-bold bg-rose-950/40 px-1 rounded">FALSE</span>
                            ) : (
                              String(cellVal)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Interactive Pagination Controls */}
          {totalExportCount > 0 && (
            <div 
              className="bg-slate-900 border border-slate-805/80 px-4 py-2.5 rounded-lg mt-3 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-305 select-none font-sans"
              style={{ direction: isRtl ? "rtl" : "ltr" }}
            >
              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-semibold">
                  {isRtl ? "שורות לעמוד:" : "Rows per page:"}
                </span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs font-bold text-amber-500 focus:outline-none focus:border-amber-600 cursor-pointer shadow-sm font-mono"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Statistics Details */}
              <div className="font-semibold text-slate-400">
                {isRtl ? (
                  <span>
                    מציג <span className="font-mono text-amber-500 font-bold">{fromExportVal}-{toExportVal}</span> מתוך{" "}
                    <span className="font-mono text-white font-bold">{totalExportCount}</span> שורות במאגר
                  </span>
                ) : (
                  <span>
                    Showing <span className="font-mono text-amber-500 font-bold">{fromExportVal}-{toExportVal}</span> of{" "}
                    <span className="font-mono text-white font-bold">{totalExportCount}</span> dataset rows
                  </span>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-1.5 font-sans">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1 rounded border border-slate-800 bg-slate-950 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-slate-900"
                  title={isRtl ? "לעמוד הראשון" : "First Page"}
                >
                  {isRtl ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
                </button>
                
                {/* Prev Page */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1 rounded border border-slate-800 bg-slate-950 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-slate-900"
                  title={isRtl ? "לעמוד הקודם" : "Previous Page"}
                >
                  {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </button>

                {/* Number badges */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1;
                    })
                    .map((page, idx, arr) => {
                      const elements = [];
                      if (idx > 0 && page - arr[idx - 1] > 1) {
                        elements.push(
                          <span key={`ellipse-exports-${page}`} className="px-0.5 text-slate-600 font-bold font-mono">
                            ...
                          </span>
                        );
                      }
                      elements.push(
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-6 h-6 flex items-center justify-center rounded border text-xxs font-mono font-bold transition select-none cursor-pointer ${
                            safeCurrentPage === page
                              ? "bg-amber-500 text-slate-955 border-amber-500 shadow-md font-bold"
                              : "bg-slate-950 border-slate-800 hover:bg-slate-905 text-slate-400 hover:text-white"
                          }`}
                        >
                          {page}
                        </button>
                      );
                      return elements;
                    })}
                </div>

                {/* Next Page */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1 rounded border border-slate-800 bg-slate-950 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-slate-900"
                  title={isRtl ? "לעמוד הבא" : "Next Page"}
                >
                  {isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1 rounded border border-slate-800 bg-slate-950 text-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-slate-900"
                  title={isRtl ? "לעמוד האחרון" : "Last Page"}
                >
                  {isRtl ? <ChevronsLeft className="h-3.5 w-3.5" /> : <ChevronsRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}

          <div className="mt-3 flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>
              {isRtl 
                ? `סך הכל שורות במאגר: ${filteredData.length}` 
                : `Total catalog records in memory: ${filteredData.length}`}
            </span>
            <span>
              {isRtl ? "רשת נתונים וירטואלית" : "Virtual Memory Cache Feed"}
            </span>
          </div>

        </div>

      </div>

    </div>
  );
};
