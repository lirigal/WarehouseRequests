import React, { useState } from "react";
import { dotNetSourceCode } from "../data/dotNetSourceCode";
import { Language } from "../types";
import { 
  Terminal, 
  Copy, 
  Check, 
  FileCode, 
  Sparkles, 
  Database, 
  Key, 
  Activity, 
  Sliders, 
  Workflow, 
  Search, 
  Info, 
  Eye, 
  ListMinus, 
  BookOpen, 
  Share2,
  Lock,
  Calendar,
  Layers,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
const dbDiagramImg = "/src/assets/images/database_diagram_1781446380620.jpg";

interface ArchitectHubProps {
  currentLanguage: Language;
}

interface ColumnDef {
  name: string;
  type: string;
  key?: "PK" | "FK" | "PK_FK" | "UQ";
  nullable?: boolean;
  defaultValue?: string;
  desc: string;
  descHe: string;
}

interface IndexDef {
  name: string;
  columns: string[];
  isUnique: boolean;
  desc: string;
  descHe: string;
}

interface ProcDef {
  name: string;
  desc: string;
  descHe: string;
}

interface DBTable {
  id: string;
  name: string;
  nameHe: string;
  desc: string;
  descHe: string;
  layer: "setup" | "mapping" | "operational";
  columns: ColumnDef[];
  indexes: IndexDef[];
  procs: ProcDef[];
}

export const ArchitectHub: React.FC<ArchitectHubProps> = ({ currentLanguage }) => {
  const isRtl = currentLanguage === "HE";
  
  // Navigation tabs: 'erd' (Interactive Diagram), 'blueprint' (Full Screen HQ Image), 'code' (.NET code files)
  const [activeTab, setActiveTab] = useState<"erd" | "blueprint" | "code">("erd");
  const [selectedFilename, setSelectedFilename] = useState<string>(dotNetSourceCode[0].filename);
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  
  // Diagram interactive state
  const [selectedTableId, setSelectedTableId] = useState<string>("AttributeTypes");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hoveredRelation, setHoveredRelation] = useState<string | null>(null);

  // Database Schematic Data representing real SQL definitions
  const tablesData: DBTable[] = [
    {
      id: "AttributeTypes",
      name: "AttributeTypes",
      nameHe: "סוגי מאפייני פריטים",
      desc: "Stores the master classifications of attributes (e.g., Size [מידה], Color [צבע]).",
      descHe: "קטלוג אב הבסיסי למיפוי קטגוריות של מאפיינים פיזיים (כגון מידה, צבע, יצרן, דגם).",
      layer: "setup",
      columns: [
        { name: "AttributeTypeId", type: "INT IDENTITY(1,1)", key: "PK", nullable: false, desc: "Primary key clustered.", descHe: "מפתח ראשי רץ של סוג המאפיין." },
        { name: "TypeNameEn", type: "NVARCHAR(100)", key: "UQ", nullable: false, desc: "Unique english designation.", descHe: "שם מאפיין ייחודי באנגלית (למשל Size)." },
        { name: "TypeNameHe", type: "NVARCHAR(100)", key: "UQ", nullable: false, desc: "Unique hebrew designation.", descHe: "שם מאפיין ייחודי בעברית (למשל מידה)." },
        { name: "IsActive", type: "BIT", nullable: false, defaultValue: "1", desc: "Flag for active configurations.", descHe: "סטטוס פעיל/לא פעיל במערכת." },
        { name: "IsDeleted", type: "BIT", nullable: false, defaultValue: "0", desc: "Soft-delete state preservation.", descHe: "מצב מחיקה לוגית של הרשומה." },
        { name: "CreatedDate", type: "DATETIME", nullable: false, defaultValue: "GETDATE()", desc: "Automatic registration timestamp.", descHe: "תאריך ושעת יצירת הרשומה פיסית." },
        { name: "CreatedBy", type: "NVARCHAR(100)", nullable: false, desc: "Logging author for ERP tracking.", descHe: "שם המשתמש או מערכת הקצה שיצרו המאפיין." }
      ],
      indexes: [
        { name: "PK_AttributeTypes", columns: ["AttributeTypeId"], isUnique: true, desc: "Clustered index for fast primary key fetches.", descHe: "אינדקס מקובץ לחיפוש מהיר לפי מפתח ראשי." },
        { name: "IX_AttributeTypes_Active_Deleted", columns: ["IsActive", "IsDeleted"], isUnique: false, desc: "Nonclustered lookup covering active metadata layouts.", descHe: "אינדקס לא מקובץ לסינון מהיר של סוגים פעילים ולא מחוקים." }
      ],
      procs: [
        { name: "sp_GetItemAttributesForSelection", desc: "Retrieves active attribute types mapped to SKU.", descHe: "שיקוף הסוגים הפעילים המקושרים לפריט בתהליך הבקשה." },
        { name: "sp_SaveItemAttributeConfig", desc: "Transactional mapping and compliance audit logger.", descHe: "הרצת טרנזקציה לרישום והתאמת קוד המאפיין לפריט." }
      ]
    },
    {
      id: "AttributeValues",
      name: "AttributeValues",
      nameHe: "ערכי מאפייני פריטים",
      desc: "Stores the predefined allowed options for each attribute type (e.g. Red, Blue for Color).",
      descHe: "רשימת הערכים האפשריים תחת סוגי המאפיינים (כגון אדום, ירוק כערכים עבור צבע).",
      layer: "setup",
      columns: [
        { name: "AttributeValueId", type: "INT IDENTITY(1,1)", key: "PK", nullable: false, desc: "Internal key.", descHe: "מזהה רשומה פנימי ייחודי." },
        { name: "AttributeTypeId", type: "INT", key: "FK", nullable: false, desc: "References AttributeTypes.", descHe: "מזהה סוג המאפיין אליו שייך ערך זה." },
        { name: "ValueNameEn", type: "NVARCHAR(100)", nullable: false, desc: "English label for display (e.g. Medium).", descHe: "ערך תצוגה באנגלית (למשל: White)." },
        { name: "ValueNameHe", type: "NVARCHAR(100)", nullable: false, desc: "Hebrew label for RTL pages (e.g. בינוני).", descHe: "ערך תצוגה בעברית (למשל: לבן)." },
        { name: "IsActive", type: "BIT", nullable: false, defaultValue: "1", desc: "Operational selector status.", descHe: "סטטוס פעילות הערך במערכת." },
        { name: "IsDeleted", type: "BIT", nullable: false, defaultValue: "0", desc: "Avoids database cascades issues.", descHe: "סימון מחיקה שקטה לשימור היסטוריית בקשות." },
        { name: "CreatedDate", type: "DATETIME", nullable: false, defaultValue: "GETDATE()", desc: "Date of creation.", descHe: "תאריך ושעת הוספת הערך." },
        { name: "CreatedBy", type: "NVARCHAR(100)", nullable: false, desc: "Created user identity.", descHe: "זיהוי רושם הערך." }
      ],
      indexes: [
        { name: "PK_AttributeValues", columns: ["AttributeValueId"], isUnique: true, desc: "Clustered primary.", descHe: "מפתח ראשי מקובץ." },
        { name: "FK_AttributeValues_AttributeTypes", columns: ["AttributeTypeId"], isUnique: false, desc: "Speeds up join operations between type master and value tables.", descHe: "מפתח זר המשפר זמני הצלבת נתונים מול קבצי אב." },
        { name: "IX_AttributeValues_TypeId_Active", columns: ["AttributeTypeId", "IsActive", "IsDeleted"], isUnique: false, desc: "Optimizes UI dynamic selection lists.", descHe: "אינדקס אופטימיזציה לדילוג מהיר בשליפת ערכים פעילים לפי סוג." }
      ],
      procs: [
        { name: "sp_GetItemAttributesForSelection", desc: "Loads dynamic values corresponding to SKU configuration.", descHe: "שליפת ערכים מותרים שהוגדרו ספציפית לפריט." }
      ]
    },
    {
      id: "ItemAttributeMapping",
      name: "ItemAttributeMapping",
      nameHe: "מיפוי מאפיינים לפריטים",
      desc: "Assigns which physical attribute categories are required for a particular SKU.",
      descHe: "טבלת הצלבה המגדירה אילו מאפיינים נדרשים באופן חובה או רשות עבור מק\"ט מסוים.",
      layer: "mapping",
      columns: [
        { name: "SKU", type: "NVARCHAR(50)", key: "PK", nullable: false, desc: "Unique item SKU (imported from Excel ledger).", descHe: "מק\"ט של הפריט (קישור לוגי לקטלוג הפריטים המרכזי)." },
        { name: "AttributeTypeId", type: "INT", key: "PK_FK", nullable: false, desc: "References AttributeTypes.", descHe: "מזהה סוג המאפיין שממופה למק\"ט." },
        { name: "IsMandatory", type: "BIT", nullable: false, defaultValue: "0", desc: "Enforces input validation in AddRequest.aspx.", descHe: "קובע האם בחירת מאפיין זה חובה בעת פתיחת בקשה." },
        { name: "CreatedDate", type: "DATETIME", nullable: false, defaultValue: "GETDATE()", desc: "Mapping registration.", descHe: "תאריך יצירת הצימוד." },
        { name: "CreatedBy", type: "NVARCHAR(100)", nullable: false, desc: "Architect operator.", descHe: "שם המשתמש שהגדיר הצימוד." }
      ],
      indexes: [
        { name: "PK_ItemAttributeMapping", columns: ["SKU", "AttributeTypeId"], isUnique: true, desc: "Clustered composite primary key.", descHe: "מפתח ראשי מורכב מקובץ השומר על יחידות שורת המיפוי." }
      ],
      procs: [
        { name: "sp_GetItemAttributesForSelection", desc: "Core lookup for AddRequest.aspx forms validator.", descHe: "שאילתת זיהוי הכללים לפריט בעת טעינת טופס הזמנה." },
        { name: "sp_SaveItemAttributeConfig", desc: "Saves mapping, updates configuration and logs transaction.", descHe: "עדכון והקצאת מאפיין למק\"ט פריט עם שמירה מאובטחת." }
      ]
    },
    {
      id: "ItemAttributeAllowedValues",
      name: "ItemAttributeAllowedValues",
      nameHe: "ערכי מאפיינים מותרים לפריט",
      desc: "Restricts the wide list of AttributeValues to a specific subset allowed for a particular SKU.",
      descHe: "צמצום הערכים האפשריים לערכים ספציפיים המורשים לאותו מק\"ט מוגדר.",
      layer: "mapping",
      columns: [
        { name: "SKU", type: "NVARCHAR(50)", key: "PK_FK", nullable: false, desc: "Part of composite PK mapping to ItemAttributeMapping.", descHe: "מק\"ט חלק ממפתח הצימוד." },
        { name: "AttributeTypeId", type: "INT", key: "PK_FK", nullable: false, desc: "Maps to ItemAttributeMapping.", descHe: "סוג המאפיין כחלק ממפתח הצימוד." },
        { name: "AttributeValueId", type: "INT", key: "PK_FK", nullable: false, desc: "Allowed attribute value identity key.", descHe: "ערך המאפיין המותר ספציפית לפריט זה." }
      ],
      indexes: [
        { name: "PK_ItemAttributeAllowedValues", columns: ["SKU", "AttributeTypeId", "AttributeValueId"], isUnique: true, desc: "Clustered Composite PK.", descHe: "מפתח ראשי מורכב המונע כפילויות ערכים לפריט." },
        { name: "FK_ItemAttributeAllowedValues_Mapping", columns: ["SKU", "AttributeTypeId"], isUnique: false, desc: "Binds value filters to physical structural map.", descHe: "מפתח זר המבטיח תאימות מול טבלת המיפוי הכללית." }
      ],
      procs: [
        { name: "sp_GetItemAttributesForSelection", desc: "Retrieves selected permitted items attributes list.", descHe: "בניית רשימת הבחירה המוגבלת בטופס הדינמי." }
      ]
    },
    {
      id: "RequestAttributes",
      name: "RequestAttributes",
      nameHe: "פרטי מאפייני בקשה",
      desc: "Appends selected physical values to the specific lines of checkout requests.",
      descHe: "שמירת הבחירה המדויקת של המאפיין (צבע/מידה) עבור שורת דרישת המלאי בפועל.",
      layer: "operational",
      columns: [
        { name: "RequestLineId", type: "INT", key: "PK", nullable: false, desc: "Connects directly to main Requests table.", descHe: "מזהה ייחודי של שורת הדרישה (חיבור לטבלת בקשות ראשית)." },
        { name: "SKU", type: "NVARCHAR(50)", nullable: false, desc: "Requested item SKU.", descHe: "מק\"ט הדרישה." },
        { name: "AttributeTypeId", type: "INT", key: "FK", nullable: false, desc: "Selected attribute type.", descHe: "סוג המאפיין שנבחר." },
        { name: "AttributeValueId", type: "INT", key: "FK", nullable: false, desc: "Selected attribute value.", descHe: "ערך המאפיין שנבחר על ידי המשתמש (למשל: XL)." },
        { name: "SelectedValueTextHe", type: "NVARCHAR(100)", nullable: false, desc: "Denormalized Hebrew name for archival persistence.", descHe: "תיאור הערך בעברית לגיבוי והקפאת תצוגת היסטוריה (Denormalized)." },
        { name: "SelectedValueTextEn", type: "NVARCHAR(100)", nullable: false, desc: "Denormalized English name for archival persistence.", descHe: "תיאור הערך באנגלית לשרידות נתונים." }
      ],
      indexes: [
        { name: "PK_RequestAttributes", columns: ["RequestLineId"], isUnique: true, desc: "Clustered PK linked directly.", descHe: "מפתח ראשי מקובץ לטבלת הרחבת שורת בקשה." }
      ],
      procs: [
        { name: "CreateRequestWithAttributes", desc: "Atomic transactional stored proc generating requests and attributes.", descHe: "פרוצדורה טרנזקטיבית המייצרת בקשת משיכה במלאי יחד עם רישום מאפייניה פיסית שורה-אחר-שורה בבסיס הנתונים." }
      ]
    },
    {
      id: "FinancialRateCache",
      name: "FinancialRateCache",
      nameHe: "מטמון שערי מטבע חוץ",
      desc: "Optimized ledger caching exchange rates locally to bypass latency and prevent external API failures.",
      descHe: "טבלת מטמון מקומית לשמירת שערי חליפין רשמיים של בנק ישראל לביצוע חישובים פיננסיים מהירים וללא תלות ברשת חיצונית.",
      layer: "operational",
      columns: [
        { name: "CacheId", type: "INT IDENTITY(1,1)", key: "PK", nullable: false, desc: "Clustered identity key.", descHe: "מזהה רשומה פנימי ייחודי רץ." },
        { name: "RateDate", type: "DATE", key: "UQ", nullable: false, desc: "Date of the recorded exchange rate.", descHe: "תאריך השער היציג הפיננסי." },
        { name: "CurrencyCode", type: "VARCHAR(10)", key: "UQ", nullable: false, desc: "ISO code (e.g., USD, EUR, GBP).", descHe: "קוד המטבע הבינלאומי (למשל: USD)." },
        { name: "CurrencyNameHe", type: "NVARCHAR(100)", nullable: false, desc: "Currency name in Hebrew.", descHe: "שם המטבע הרשמי בעברית (למשל: דולר ארה\"ב)." },
        { name: "CurrencyNameEn", type: "VARCHAR(100)", nullable: false, desc: "Currency name in English.", descHe: "שם המטבע באנגלית." },
        { name: "Unit", type: "INT", nullable: false, defaultValue: "1", desc: "Multiplier unit for rates conversion.", descHe: "יחידת המטבע (בדרך כלל 1, או 100 עבור ין למשל)." },
        { name: "ExchangeRate", type: "DECIMAL(18,6)", nullable: false, desc: "Exchange rate value compared against ILS.", descHe: "השער היציג בפועל מול השקל (החל מ-6 ספרות לאחר הנקודה לתאימות פיננסית פדרלית)." },
        { name: "LastTrend", type: "DECIMAL(12,6)", nullable: false, defaultValue: "0.0", desc: "Daily difference compared to trailing rate.", descHe: "ההפרש היומי בתנודתיות השער." },
        { name: "TrendPercent", type: "DECIMAL(12,4)", nullable: false, defaultValue: "0.0", desc: "Daily percentage movement.", descHe: "אחוז התנודתיות היומית." },
        { name: "FetchedAt", type: "DATETIME", nullable: false, defaultValue: "GETDATE()", desc: "Timestamp when rate was fetched from BOI.", descHe: "זמן עדכון מדויק של הרשומה במערכת." }
      ],
      indexes: [
        { name: "PK_FinancialRateCache", columns: ["CacheId"], isUnique: true, desc: "Clustered unique.", descHe: "מפתח ראשי מקובץ." },
        { name: "UQ_RateDate_Currency", columns: ["RateDate", "CurrencyCode"], isUnique: true, desc: "Ensures unique single entry per day per currency.", descHe: "מפתח ייחודי המונע כפילות של מטבע לאותו יום." },
        { name: "IX_FinancialRateCache_Date", columns: ["RateDate"], isUnique: false, desc: "Accelerates daily transactional joins and charts rendering.", descHe: "אינדקס ייעודי המאיץ שליפה לצורך המרת שערי מטבע בדו\"חות כספיים במערכת." }
      ],
      procs: [
        { name: "sp_GetFinancialRatesByDate", desc: "Extract cached currency trends for custom date.", descHe: "שליפת שערי חליפין לתאריך יעד עם מיון מובנה לפי פופולריות." },
        { name: "sp_UpsertFinancialRate", desc: "High concurrency upsert logic protecting rate indexes against deadlocks.", descHe: "מנגנון Upsert טרנזקטיבי חכם (MERGE) לעדכון/הוספה של שערי חליפין בתנאי עומס גבוהים." }
      ]
    },
    {
      id: "AuditLog",
      name: "AuditLog",
      nameHe: "יומן מעקב ביקורת (Auditing)",
      desc: "Detailed historical ledger for strict regulatory compliance, tracking all inserts, deletions and edits.",
      descHe: "יומן רגולטורי לביקורת ואבטחת מידע, המתעד כל שינוי, החלפת מאפיינים, מחיקה או יצירה בממשקים.",
      layer: "operational",
      columns: [
        { name: "AuditLogId", type: "BIGINT IDENTITY(1,1)", key: "PK", nullable: false, desc: "Unique auto identity.", descHe: "מזהה רשומה ענק ייחודי רץ." },
        { name: "UserId", type: "NVARCHAR(100)", nullable: false, desc: "Operator credentials identity.", descHe: "שם המשתמש המבצע." },
        { name: "ActionType", type: "NVARCHAR(50)", nullable: false, desc: "Operation action (CREATE, UPDATE, Soft-DELETE).", descHe: "סוג הפעולה (למשל: UPDATE, Soft-DELETE)." },
        { name: "TableName", type: "NVARCHAR(100)", nullable: false, desc: "Affected SQL Table.", descHe: "שם הטבלה המושפעת." },
        { name: "OldValue", type: "NVARCHAR(MAX)", nullable: true, desc: "JSON serialization of fields before state mutation.", descHe: "צילום הערכים הישנים לפני השינוי כסיראליזציית JSON." },
        { name: "NewValue", type: "NVARCHAR(MAX)", nullable: true, desc: "JSON serialization of fields after state mutation.", descHe: "צילום הערכים החדשים לאחר השינוי." },
        { name: "ActionDate", type: "DATETIME", nullable: false, defaultValue: "GETDATE()", desc: "Auditing timestamp.", descHe: "תאריך ושעת הפעולה המדויקת." },
        { name: "IPAddress", type: "NVARCHAR(50)", nullable: true, desc: "Network security IP tracer.", descHe: "כתובת ה-IP של תחנת העבודה המבצעת." }
      ],
      indexes: [
        { name: "PK_AuditLog", columns: ["AuditLogId"], isUnique: true, desc: "Clustered Primary Key sorted DESC.", descHe: "מפתח ראשי מקובץ בסדר יורד לשליפת רישומים אחרונים במהירות שיא." },
        { name: "IX_AuditLog_ActionDate", columns: ["ActionDate"], isUnique: false, desc: "Speeds up compliance range auditing reports.", descHe: "אינדקס אופטימיזציה לסינון מדוייק של טווחי זמנים עבור בקשות מנהל מערכת." }
      ],
      procs: []
    }
  ];

  const handleCopy = (filename: string, code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedStates({ ...copiedStates, [filename]: true });
      setTimeout(() => {
        setCopiedStates((prev) => ({ ...prev, [filename]: false }));
      }, 3000);
    });
  };

  const activeFile = dotNetSourceCode.find((f) => f.filename === selectedFilename) || dotNetSourceCode[0];
  const selectedTable = tablesData.find((t) => t.id === selectedTableId) || tablesData[0];

  // Filtering based on search query
  const filteredTables = tablesData.filter((t) => {
    const term = searchQuery.toLowerCase();
    const matchesName = t.name.toLowerCase().includes(term) || t.nameHe.toLowerCase().includes(term);
    const matchesCol = t.columns.some(c => c.name.toLowerCase().includes(term) || c.desc.toLowerCase().includes(term));
    return matchesName || matchesCol;
  });

  const getLayerColor = (layer: "setup" | "mapping" | "operational") => {
    switch (layer) {
      case "setup": return { border: "border-sky-500", bg: "bg-sky-500/10", text: "text-sky-400", bgBadge: "bg-sky-500/10 text-sky-400 border border-sky-400/20" };
      case "mapping": return { border: "border-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-400", bgBadge: "bg-emerald-500/10 text-emerald-400 border border-emerald-400/20" };
      case "operational": return { border: "border-purple-500", bg: "bg-purple-500/10", text: "text-purple-400", bgBadge: "bg-purple-500/10 text-purple-400 border border-purple-400/20" };
    }
  };

  const t = {
    title: isRtl ? "ארגז הכלים של הארכיטקט - מודל בסיס הנתונים ומקור השרת" : "Architect System Integration & Database Portal",
    desc: isRtl 
      ? "ניתוח מקיף של סכימת הנתונים, קשרי גומלין בין טבלאות מפתח, פרוצדורות שמורות של SQL Server, וקוד המקור בשרות המרכזי."
      : "Browsable enterprise repository containing visual ER diagrams, relational SQL Server map structures, indexing and .NET BLL classes.",
    tabErd: isRtl ? "📊 מודל קשרי ישויות (Interactive ERD)" : "📊 Interactive ERD Model",
    tabBlueprint: isRtl ? "🗺️ תצלום דיאגרמה - BluePrint" : "🗺️ Visual Schema Blueprint",
    tabCode: isRtl ? "💻 ארכיון קוד שרת (.NET Code Treasury)" : "💻 .NET Core Code Library",
    searchPlaceholder: isRtl ? "חפש טבלה או עמודה בסכימה..." : "Search tables, index or columns...",
    indexesTitle: isRtl ? "אינדקסים ומפתחות ייחודיים (Indexes & Keys)" : "Indexes & Unique Constraints",
    procsTitle: isRtl ? "פרוצדורות שמורות קשורות (Linked Stored Procedures)" : "Linked Stored Procedures",
    layerSetup: isRtl ? "שכבת הגדרות אב (Setup)" : "Setup Tables",
    layerMapping: isRtl ? "שכבת מיפויים לצימוד לפריט (Mapping)" : "SKU Mapping Ledger",
    layerOperational: isRtl ? "שכבת בקשות ולוגים (Transactions)" : "Transactions & Audit",
    tableDetails: isRtl ? "פרטי הטבלה שנבחרה" : "Selected Table Matrix",
    copyLabel: isRtl ? "העתק קוד מקור" : "Copy Code Source",
    copiedFeedback: isRtl ? "הועתק בהצלחה!" : "Copied!",
    colName: isRtl ? "שם העמודה" : "Column Name",
    colType: isRtl ? "טיפוס ועזר" : "Type & Meta",
    colDesc: isRtl ? "הגדרת השדה ותפקידו בארגון" : "Description & Constraints",
    relationsHint: isRtl ? "שימוש ידידותי בקשרי גומלין: לחץ על טבלה כלשהי במפה כדי לחשוף את מבנה הנתונים המלא שלה מימין." : "Interactive Schema Navigation: Click on any table node to display its structural dictionary below, including stored procedures.",
    viewFileHe: isRtl ? "קובץ קוד שרת:" : "Server Source Code:",
    bluePrintZoomTip: isRtl ? "תצלום אדריכלות המערכת שנוצר על ידי מודל ה-AI ומותאם לשרתי SQL Server מקומיים." : "High-fidelity database blueprint generated natively for modern SQL Server enterprise architectures.",
  };

  return (
    <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl shadow-2xl overflow-hidden mb-8">
      
      {/* Title Header with Tech Vibe */}
      <div className="bg-slate-950 p-5 sm:p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-right">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-amber-500 rounded-xl flex items-center justify-center font-bold text-xl border border-amber-400 text-slate-950 shadow-md transform rotate-1 shrink-0">
            📊
          </div>
          <div>
            <h2 className="text-sm sm:text-base uppercase font-black tracking-wider text-amber-500 flex items-center gap-2 leading-none">
              <Terminal className="h-4.5 w-4.5 text-amber-500" />
              {t.title}
            </h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-sans">{t.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-wider text-emerald-400 font-mono">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>SQL Server Live Comp</span>
        </div>
      </div>

      {/* Modern Navigation Menu */}
      <div className="bg-slate-900 border-b border-slate-850 p-2 flex flex-wrap gap-1.5 justify-start">
        <button
          onClick={() => setActiveTab("erd")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer select-none border ${
            activeTab === "erd"
              ? "bg-amber-500 border-amber-400 text-slate-950 font-black shadow-lg"
              : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
        >
          {t.tabErd}
        </button>
        <button
          onClick={() => setActiveTab("blueprint")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer select-none border ${
            activeTab === "blueprint"
              ? "bg-amber-500 border-amber-400 text-slate-950 font-black shadow-lg"
              : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
        >
          {t.tabBlueprint}
        </button>
        <button
          onClick={() => setActiveTab("code")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer select-none border ${
            activeTab === "code"
              ? "bg-amber-500 border-amber-400 text-slate-950 font-black shadow-lg"
              : "bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-850"
          }`}
        >
          {t.tabCode}
        </button>
      </div>

      {/* WORKSPACE AREA */}
      <div>
        
        {/* ====================================
            TAB 1: INTERACTIVE ERD DIAGRAM
            ==================================== */}
        {activeTab === "erd" && (
          <div className="p-4 sm:p-6" dir={isRtl ? "rtl" : "ltr"}>
            
            {/* Quick search & Hint */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div className="flex items-center gap-2 bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-1.5 w-full md:w-80">
                <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="bg-transparent border-0 outline-hidden text-slate-200 text-xs w-full focus:ring-0 placeholder-slate-500"
                />
              </div>
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Info className="h-4 w-4 text-sky-400 shrink-0" />
                <span>{t.relationsHint}</span>
              </div>
            </div>

            {/* Visual Node-Flow Schema Area */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* ERD Nodes Canvas Map (8-Spans) */}
              <div className="xl:col-span-8 bg-slate-950/45 p-6 rounded-xl border border-slate-850 min-h-[500px] flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-2 left-2 text-[9px] text-slate-600 font-mono tracking-wide uppercase select-none">
                  SQL Schema Relational Connectors Layer
                </div>

                {/* Nodes Stack */}
                <div className="space-y-8">
                  
                  {/* Setup Master Layer */}
                  <div>
                    <h4 className="text-[10px] tracking-widest font-extrabold uppercase text-slate-500 mb-3 border-b border-slate-900 pb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500"></span>
                      {t.layerSetup}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredTables.filter(t => t.layer === "setup").map((tbl) => {
                        const isSelected = selectedTableId === tbl.id;
                        const cardStyles = getLayerColor(tbl.layer);
                        return (
                          <div
                            id={`node_${tbl.id}`}
                            key={tbl.id}
                            onClick={() => setSelectedTableId(tbl.id)}
                            onMouseEnter={() => setHoveredRelation(tbl.id)}
                            onMouseLeave={() => setHoveredRelation(null)}
                            className={`p-3.5 rounded-xl border transition duration-200 cursor-pointer select-none flex flex-col justify-between ${
                              isSelected
                                ? `bg-slate-900 border-2 ${cardStyles.border} shadow-lg shadow-sky-500/5`
                                : "bg-slate-950/30 border-slate-850 hover:border-slate-750 hover:bg-slate-900/10"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-extrabold font-mono ${cardStyles.bgBadge}`}>
                                  {tbl.layer.toUpperCase()}
                                </span>
                                <span className="text-[10.5px] text-slate-500 font-mono font-bold">
                                  {tbl.columns.length} Fields
                                </span>
                              </div>
                              <h3 className="text-xs font-mono font-extrabold text-white flex items-center gap-1.5">
                                <Database className="h-3.5 w-3.5 text-sky-400" />
                                {tbl.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                                {isRtl ? tbl.descHe : tbl.desc}
                              </p>
                            </div>

                            {/* Column previews indicators */}
                            <div className="mt-3.5 flex items-center gap-1 flex-wrap border-t border-slate-900 pt-2 text-[9.5px]">
                              {tbl.columns.filter(c => c.key).map(col => (
                                <span key={col.name} className="inline-flex items-center gap-0.5 bg-slate-900 border border-slate-800 text-amber-400 font-mono px-1 py-0.2 rounded">
                                  <Key className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                  {col.name} {col.key === "FK" ? "🧩" : col.key === "UQ" ? "💎" : "🔑"}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mapping / Connection Layer */}
                  <div>
                    <h4 className="text-[10px] tracking-widest font-extrabold uppercase text-slate-500 mb-3 border-b border-slate-900 pb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      {t.layerMapping}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {filteredTables.filter(t => t.layer === "mapping").map((tbl) => {
                        const isSelected = selectedTableId === tbl.id;
                        const cardStyles = getLayerColor(tbl.layer);
                        return (
                          <div
                            id={`node_${tbl.id}`}
                            key={tbl.id}
                            onClick={() => setSelectedTableId(tbl.id)}
                            onMouseEnter={() => setHoveredRelation(tbl.id)}
                            onMouseLeave={() => setHoveredRelation(null)}
                            className={`p-3.5 rounded-xl border transition duration-200 cursor-pointer select-none flex flex-col justify-between ${
                              isSelected
                                ? `bg-slate-900 border-2 ${cardStyles.border} shadow-lg shadow-emerald-500/5`
                                : "bg-slate-950/30 border-slate-850 hover:border-slate-750 hover:bg-slate-900/10"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-extrabold font-mono ${cardStyles.bgBadge}`}>
                                  {tbl.layer.toUpperCase()}
                                </span>
                                <span className="text-[10.5px] text-slate-500 font-mono font-bold">
                                  {tbl.columns.length} Fields
                                </span>
                              </div>
                              <h3 className="text-xs font-mono font-extrabold text-white flex items-center gap-1.5">
                                <Workflow className="h-3.5 w-3.5 text-emerald-400" />
                                {tbl.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                                {isRtl ? tbl.descHe : tbl.desc}
                              </p>
                            </div>

                            {/* Column previews indicators */}
                            <div className="mt-3.5 flex items-center gap-1 flex-wrap border-t border-slate-900 pt-2 text-[9.5px]">
                              {tbl.columns.filter(c => c.key).map(col => (
                                <span key={col.name} className="inline-flex items-center gap-0.5 bg-slate-900 border border-slate-800 text-amber-400 font-mono px-1 py-0.2 rounded font-bold">
                                  <Key className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                                  {col.name} {col.key === "PK_FK" ? "🧬" : "🔑"}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Operational / History Layer */}
                  <div>
                    <h4 className="text-[10px] tracking-widest font-extrabold uppercase text-slate-500 mb-3 border-b border-slate-900 pb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                      {t.layerOperational}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {filteredTables.filter(t => t.layer === "operational").map((tbl) => {
                        const isSelected = selectedTableId === tbl.id;
                        const cardStyles = getLayerColor(tbl.layer);
                        return (
                          <div
                            id={`node_${tbl.id}`}
                            key={tbl.id}
                            onClick={() => setSelectedTableId(tbl.id)}
                            onMouseEnter={() => setHoveredRelation(tbl.id)}
                            onMouseLeave={() => setHoveredRelation(null)}
                            className={`p-3.5 rounded-xl border transition duration-200 cursor-pointer select-none flex flex-col justify-between ${
                              isSelected
                                ? `bg-slate-900 border-2 ${cardStyles.border} shadow-lg shadow-purple-500/5`
                                : "bg-slate-950/30 border-slate-850 hover:border-slate-750 hover:bg-slate-900/10"
                            }`}
                          >
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-extrabold font-mono ${cardStyles.bgBadge}`}>
                                  {tbl.layer.toUpperCase()}
                                </span>
                                <span className="text-[10.5px] text-slate-500 font-mono font-bold">
                                  {tbl.columns.length} Fields
                                </span>
                              </div>
                              <h3 className="text-xs font-mono font-extrabold text-white flex items-center gap-1.5 truncate">
                                <Activity className="h-3.5 w-3.5 text-purple-400" />
                                {tbl.name}
                              </h3>
                              <p className="text-[11px] text-slate-400 mt-1 leading-normal line-clamp-2">
                                {isRtl ? tbl.descHe : tbl.desc}
                              </p>
                            </div>

                            {/* Column previews indicators */}
                            <div className="mt-3.5 flex items-center gap-1 flex-wrap border-t border-slate-900 pt-2 text-[9.5px]">
                              {tbl.columns.filter(c => c.key).map(col => (
                                <span key={col.name} className="inline-flex items-center gap-0.5 bg-slate-900 border border-slate-800 text-amber-500 font-mono px-1 py-0.2 rounded font-bold">
                                  <Key className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                  {col.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Relational connections status map in bottom row */}
                <div className="mt-8 bg-slate-900/85 border border-slate-850/80 p-3.5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="text-xs text-slate-300">
                    <span className="font-bold text-amber-400 block sm:inline mr-1">Database Links Active: </span>
                    <span className="font-mono bg-slate-950 px-1.5 py-0.5 rounded text-[10.5px] text-slate-400 border border-slate-850">
                      AttributeTypes.AttributeTypeId ──(1:N)──➔ AttributeValues.AttributeTypeId
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Dialect: T-SQL MS SQL Server 2012+
                  </div>
                </div>

              </div>

              {/* Table Data Dictionary & Sub-entities Panel (4-Spans) */}
              <div className="xl:col-span-4 space-y-4">
                
                {/* Dictionary Panel */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <ListMinus className="h-4.5 w-4.5 text-amber-500" />
                      <h3 className="text-sm font-black text-amber-400">
                        {t.tableDetails}
                      </h3>
                    </div>
                    <span className="font-mono text-[10.5px] font-bold bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                      {selectedTable.name}
                    </span>
                  </div>

                  {/* Summary */}
                  <div className="mb-4 text-xs bg-slate-900/70 p-3 rounded-lg border border-slate-850/60 leading-relaxed text-slate-300">
                    <p className="font-bold text-white mb-1">
                      {isRtl ? selectedTable.nameHe : selectedTable.name}
                    </p>
                    {isRtl ? selectedTable.descHe : selectedTable.desc}
                  </div>

                  {/* Structure Table */}
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1 border border-slate-900 rounded-lg">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-400 text-[10px] uppercase tracking-wider font-extrabold border-b border-slate-850">
                          <th className="py-2.5 px-3">{t.colName}</th>
                          <th className="py-2.5 px-3">{t.colType}</th>
                          <th className="py-2.5 px-3">{t.colDesc}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {selectedTable.columns.map((col) => (
                          <tr key={col.name} className="hover:bg-slate-900/30 transition">
                            <td className="py-2 px-3 font-mono text-[11px] text-white flex items-center gap-1">
                              {col.key && (
                                <span className={`text-[9px] font-bold px-1 rounded-sm ${
                                  col.key === "PK" ? "bg-amber-400/20 text-amber-400" :
                                  col.key === "FK" ? "bg-sky-400/20 text-sky-400" :
                                  col.key === "PK_FK" ? "bg-emerald-400/20 text-emerald-400" :
                                  "bg-indigo-400/20 text-indigo-400"
                                }`}>
                                  {col.key}
                                </span>
                              )}
                              <span>{col.name}</span>
                            </td>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-400">
                              <span className="text-slate-300">{col.type}</span>
                              {col.nullable ? " NULL" : " NOT NULL"}
                              {col.defaultValue && <span className="text-[9px] block text-emerald-500">DF: {col.defaultValue}</span>}
                            </td>
                            <td className="py-2 px-3 text-[10.5px] text-slate-400 leading-normal font-sans">
                              {isRtl ? col.descHe : col.desc}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Indexes & Keys Panel */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-md text-right">
                  <div className="flex items-center gap-2 border-b border-slate-850 pb-2 mb-3">
                    <Key className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {t.indexesTitle}
                    </h3>
                  </div>
                  {selectedTable.indexes.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No custom indexes mapped for this table.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedTable.indexes.map((idx) => (
                        <div key={idx.name} className="bg-slate-900/40 border border-slate-850 p-2.5 rounded-lg">
                          <div className="flex justify-between items-center flex-wrap gap-1.5">
                            <span className="font-mono text-xs font-extrabold text-emerald-400">{idx.name}</span>
                            <span className={`text-[9.5px] px-1 py-0.2 rounded font-mono ${
                              idx.isUnique ? "bg-amber-400/15 text-amber-400 border border-amber-400/20" : "bg-slate-800 text-slate-400"
                            }`}>
                              {idx.isUnique ? "UNIQUE" : "INDEX"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-1 font-semibold">
                            Cols: ({idx.columns.join(", ")})
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1 leading-normal font-sans">
                            {isRtl ? idx.descHe : idx.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Stored Procedures Panel */}
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-md text-right">
                  <div className="flex items-center gap-2 border-b border-slate-850 pb-2 mb-3">
                    <Workflow className="h-4 w-4 text-sky-500" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {t.procsTitle}
                    </h3>
                  </div>
                  {selectedTable.procs.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No specific standalone procedures bounded for this entity.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedTable.procs.map((pr) => (
                        <div key={pr.name} className="bg-slate-900/40 p-2 border border-slate-850 rounded text-right">
                          <span className="font-mono text-xs font-extrabold text-sky-400 block mb-0.5">{pr.name}</span>
                          <span className="text-[11px] text-slate-400 leading-relaxed font-sans block">
                            {isRtl ? pr.descHe : pr.desc}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ====================================
            TAB 2: BLUEPRINT HQ GRAPHIC IMAGE VIEW
            ==================================== */}
        {activeTab === "blueprint" && (
          <div className="p-4 sm:p-6 text-center" dir={isRtl ? "rtl" : "ltr"}>
            <div className="max-w-4xl mx-auto">
              <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-850 text-right">
                <div>
                  <h3 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    {isRtl ? "תצלום אדריכלות המערכת" : "Enterprise SQL Blueprint High-Resolution Graph"}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    {t.bluePrintZoomTip}
                  </p>
                </div>
                <div className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 py-1 px-2.5 rounded font-mono uppercase font-bold tracking-wider select-none shrink-0">
                  SQL Server 2012+ Compliant Structure
                </div>
              </div>

              {/* Blueprint Frame */}
              <div className="bg-slate-950 rounded-2xl border border-slate-850 p-5 shadow-inner overflow-hidden flex justify-center items-center relative group">
                <div className="absolute top-3 right-3 bg-slate-900/80 border border-slate-800 text-[9.5px] px-2 py-1 rounded text-slate-400 font-mono select-none">
                  Model Output Ledger
                </div>
                
                {/* Visual Image Rendering conforming to markdown parameters */}
                <img 
                  src={dbDiagramImg} 
                  alt="Enterprise Storage Database SQL Map" 
                  referrerPolicy="no-referrer"
                  className="max-h-[600px] max-w-full rounded-lg border border-slate-800 shadow-2xl transition-transform duration-300 hover:scale-102 cursor-zoom-in"
                />
              </div>

              {/* Footnote */}
              <div className="mt-4 text--slate-500 font-mono text-[10px] text-slate-500">
                Generated automatically for Enterprise Storage Ledger and imported attributes databases.
              </div>
            </div>
          </div>
        )}

        {/* ====================================
            TAB 3: SERVER ASP.NET / SQL SOURCE treasury
            ==================================== */}
        {activeTab === "code" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
            
            {/* Sidebar file selector (3 Span) */}
            <div className="lg:col-span-3 bg-slate-950/70 border-b lg:border-b-0 lg:border-r border-slate-800/80 p-4 text-right">
              <h3 className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-3 block">
                {isRtl ? "קטלוג קבצי השרת:" : "Server Code Directory:"}
              </h3>
              <div className="space-y-1">
                {dotNetSourceCode.map((file) => {
                  const isSelected = file.filename === selectedFilename;
                  return (
                    <button
                      key={file.filename}
                      onClick={() => setSelectedFilename(file.filename)}
                      className={`w-full text-right px-3 py-2.5 rounded text-xs font-mono transition flex justify-between items-center cursor-pointer select-none leading-tight border ${
                        isSelected
                          ? "bg-slate-800 border-slate-700 text-amber-400 font-bold"
                          : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
                      }`}
                    >
                      <span className="truncate">{file.filename}</span>
                      <FileCode className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-amber-400" : "text-slate-600"}`} />
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 border-t border-slate-800/80 pt-4 hidden lg:block text-slate-500 text-[10px] leading-relaxed">
                <span className="font-extrabold text-slate-400 block mb-1">{isRtl ? "הערת אבטחה ורגולציה:" : "Arch. Compliance Note:"}</span>
                {isRtl 
                  ? "כל קבצי ה-SQL והמחלקה של C# משתמשים בפרמטריזציה מלאה של שאילתות למניעת התקפות הזרקה והרצה זדונית."
                  : "Designed specifically for seamless compatibility within existing Windows Server AD and Merkava ERP layers."}
              </div>
            </div>

            {/* Content Viewer (9 Span) */}
            <div className="lg:col-span-9 flex flex-col bg-slate-900">
              
              {/* File metadata title block */}
              <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-right">
                <div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"></span>
                    <h4 className="text-xs font-mono text-slate-300 font-bold">
                      {activeFile.filename}
                    </h4>
                  </div>
                  <h5 className="text-sm font-bold text-white mt-1">
                    {isRtl ? activeFile.titleHe : activeFile.titleEn}
                  </h5>
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    {isRtl ? activeFile.descriptionHe : activeFile.descriptionEn}
                  </p>
                </div>

                {/* Copy Button */}
                <button
                  onClick={() => handleCopy(activeFile.filename, activeFile.code)}
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs py-1.5 px-3.5 rounded border border-slate-700 hover:border-slate-650 transition cursor-pointer select-none font-medium shrink-0 shadow-sm"
                >
                  {copiedStates[activeFile.filename] ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="text-emerald-400 font-bold">{t.copiedFeedback}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>{t.copyLabel}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Actual Code Sheet Container */}
              <div className="relative flex-1 block overflow-auto max-h-[500px]">
                <pre className="p-5 font-mono text-xs text-slate-300 bg-slate-950/20 leading-relaxed overflow-x-auto select-text select-all whitespace-pre text-left">
                  {activeFile.code}
                </pre>
              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
};
