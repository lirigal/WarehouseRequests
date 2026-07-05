import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || "";
const key = process.env.VITE_SUPABASE_ANON_KEY || "";

async function main() {
  if (!url || !key) {
    console.error("Missing credentials");
    return;
  }
  const supabase = createClient(url, key);
  
  // Let's inspect the exact column names of 'appusers' and 'warehouseitems'
  const sql = `
    DO $$
    DECLARE
      col_info text;
    BEGIN
      SELECT string_agg(table_name || '.' || column_name || ' (' || data_type || ')', ', ')
      INTO col_info
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name IN ('itempictureurls', 'attributetypes', 'itemattributemapping');
      
      RAISE EXCEPTION 'COLUMNS: %', col_info;
    END $$;
  `;
  
  const { error } = await supabase.rpc("exec_sql", { sql_query: sql });
  console.log("Columns result:", error?.message);
}

main().catch(console.error);
