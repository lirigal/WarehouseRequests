import React, { useState, useMemo, useEffect, useRef } from "react";
import { memoryStore } from "../lib/memoryStore";
import { 
  AttributeType, 
  ItemAttributeMapping, 
  WarehouseItem, 
  Language,
  AppUser,
  AccessRole,
  ItemPictureUrl,
  WarehouseRequest,
  AuditLogEntry,
  NipukRecord
} from "../types";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRightLeft, 
  Download, 
  Play, 
  RefreshCw, 
  User,
  Shield,
  Database,
  Clock,
  FileSpreadsheet,
  FileDown,
  Trash2,
  Sliders,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Info
} from "lucide-react";

// Robust parsing utility designed to safely handle escaped quotes, commas, standard linebreaks, and Hebrew/UTF-8 strings.
const parseCSV = (text: string): string[][] => {
  const result: string[][] = [];
  if (!text || text.trim() === "") return result;
  
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.trim() === "") continue;
    
    const row: string[] = [];
    let insideQuote = false;
    let currentCell = "";
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        // Look ahead for double quote as escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          currentCell += '"';
          i++; // Skip next quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    result.push(row);
  }
  return result;
};

// Interface for database column definition to map against
interface DbField {
  name: string;
  labelHe: string;
  labelEn: string;
  isMandatory: boolean;
  type: "text" | "number" | "boolean";
}

// Previous transaction log schema definition
interface CSVImportLog {
  logId: string;
  userId: string;
  userName: string;
  userRole: AccessRole;
  tableName: "itemattributesmapping" | "itemattributeallowedvalues" | "items";
  fileName: string;
  importMode: "APPEND" | "UPDATE";
  totalRows: number;
  successCount: number;
  failureCount: number;
  timestamp: string;
  durationMs: number;
}

interface CSVImportManagerProps {
  currentLanguage: Language;
  currentUser: AppUser;
  warehouseItems: WarehouseItem[];
  attributeTypes: AttributeType[];
  itemMappings: ItemAttributeMapping[];
  setItemMappings: React.Dispatch<React.SetStateAction<ItemAttributeMapping[]>>;
  logDatabaseAction: (
    actionType: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN",
    tableName: string,
    oldValue: string,
    newValue: string
  ) => void;
  setWarehouseItems?: React.Dispatch<React.SetStateAction<WarehouseItem[]>>;
  itemPictureUrls?: ItemPictureUrl[];
  setItemPictureUrls?: React.Dispatch<React.SetStateAction<ItemPictureUrl[]>>;
  activeRequests?: WarehouseRequest[];
  auditLogs?: AuditLogEntry[];
  users?: AppUser[];
  nipukRecords?: NipukRecord[];
  addAttributeType?: (nameHe: string, nameEn: string, inputType: string, isDeleted?: boolean) => void;
  toggleTypeActive?: (typeId: string) => void;
  deleteType?: (typeId: string) => void;
  addAttributeValue?: (typeId: string, valueHe: string, valueEn: string) => void;
  toggleValueActive?: (valId: string) => void;
  deleteValue?: (valId: string) => void;
  setAttributeTypes?: (types: AttributeType[]) => void;
}

export const CSVImportManager: React.FC<CSVImportManagerProps> = ({
  currentLanguage,
  currentUser,
  warehouseItems,
  attributeTypes,
  itemMappings,
  setItemMappings,
  logDatabaseAction,
  setWarehouseItems,
  itemPictureUrls = [],
  setItemPictureUrls,
  activeRequests = [],
  auditLogs = [],
  users = [],
  nipukRecords = [],
  addAttributeType = () => {},
  toggleTypeActive = () => {},
  deleteType = () => {},
  addAttributeValue = () => {},
  toggleValueActive = () => {},
  deleteValue = () => {},
  setAttributeTypes = () => {}
}) => {
  const isRtl = currentLanguage === "HE";
  const isAuthorized = currentUser.role === "ADMIN" || currentUser.role === "MANAGER";

  // Target Database Selection: itemattributesmapping, itemattributeallowedvalues or items
  const [selectedTable, setSelectedTable] = useState<"itemattributesmapping" | "itemattributeallowedvalues" | "items">("itemattributesmapping");

  // Encoding options for Hebrew and other non-utf8 CSVs
  const [encoding, setEncoding] = useState<string>("auto");
  const [detectedEncoding, setDetectedEncoding] = useState<string>("UTF-8");

  // File Upload State
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [csvRawData, setCsvRawData] = useState<string[][]>([]); // Holds headers and grid rows
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column Mapping State
  // Map Key: dbFieldName, Value: csvHeaderName
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});

  // Active validation, execution progress, and results reports
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; desc: string; val: string; correction: string }>>([]);
  const [isValidated, setIsValidated] = useState<boolean>(false);
  const [validationPassed, setValidationPassed] = useState<boolean>(false);

  // Import Execution Settings & Progress Animation
  const [importMode, setImportMode] = useState<"APPEND" | "UPDATE">("APPEND");
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [progressStats, setProgressStats] = useState({
    total: 0,
    processed: 0,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    durationMs: 0
  });

  // Post Import Summary Screen
  const [importSummary, setImportSummary] = useState<any | null>(null);

  // Database Action Logs Persistence (persistent on local storage)
  const [importLogs, setImportLogs] = useState<CSVImportLog[]>(() => {
    const saved = memoryStore.getItem("volcani_csv_import_logs");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    memoryStore.setItem("volcani_csv_import_logs", JSON.stringify(importLogs));
  }, [importLogs]);

  // Pagination State for Historical Import Registry
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    try {
      const userKey = `volcani_csv_import_logs_rows_per_page_${currentUser?.id || "guest"}`;
      const saved = memoryStore.getItem(userKey);
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

  // Restore rows-per-page preference when operator user changes
  useEffect(() => {
    try {
      const userKey = `volcani_csv_import_logs_rows_per_page_${currentUser?.id || "guest"}`;
      const saved = memoryStore.getItem(userKey);
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

  // Persist Rows per Page preference on selection change
  useEffect(() => {
    try {
      const userKey = `volcani_csv_import_logs_rows_per_page_${currentUser?.id || "guest"}`;
      memoryStore.setItem(userKey, String(rowsPerPage));
    } catch (e) {}
  }, [rowsPerPage, currentUser]);

  // Reset page position to 1 when a new transaction log is recorded
  useEffect(() => {
    setCurrentPage(1);
  }, [importLogs.length]);

  // Clean form state completely
  const resetFormState = () => {
    setUploadedFile(null);
    setCsvRawData([]);
    setFileError(null);
    setColumnMappings({});
    setValidationErrors([]);
    setIsValidated(false);
    setValidationPassed(false);
    setImportSummary(null);
    setProgressPercent(0);
    setEncoding("auto");
    setDetectedEncoding("UTF-8");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Change destination table triggers clean-slate reload
  useEffect(() => {
    resetFormState();
  }, [selectedTable]);

  // Translate labels helper
  const t = {
    screenTitle: isRtl ? "ייבוא נתוני מאפיינים מקובץ CSV" : "CSV Attribute Data Import",
    selectDestination: isRtl ? "שלב 1: בחירת טבלת יעד לייבוא" : "Step 1: Select Destination Table",
    mappingDesc: isRtl ? "טבלת שיוכי המאפיינים לפריטים (SKU, AttributeTypeId, IsMandatory)" : "Item Attributes Mapping configuration",
    valuesDesc: isRtl ? "טבלת הערכים המותרים הספציפיים לפריט (SKU, AttributeTypeId, AttributeValueId)" : "Specific Attribute values allowed per core items",
    uploadTitle: isRtl ? "שלב 2: העלאת קובץ CSV לניתוח" : "Step 2: Upload CSV File",
    dragDropLabel: isRtl ? "גרור והשלך קובץ CSV כאן, או לחץ לבחירת קובץ" : "Drag & drop CSV file here, or click to browse",
    maxSizeLabel: isRtl ? "תומך בקבצי .csv בנפח של עד 20MB. קידוד UTF-8 מומלץ לעברית." : "Supports .csv files up to 20MB. UTF-8 encoding recommended.",
    selectedFile: isRtl ? "קובץ שנבחר:" : "Selected file:",
    replaceFile: isRtl ? "החלף קובץ" : "Replace file",
    previewTitle: isRtl ? "שלב 3: תצוגה מקדימה של נתוני הקובץ (עד 20 שורות ראשונות)" : "Step 3: CSV Data Preview (First 20 rows)",
    columnMappingTitle: isRtl ? "שלב 4: מיפוי עמודות הקובץ לשדות מסד הנתונים" : "Step 4: Column Mapping Options",
    dbFieldCol: isRtl ? "שדה מסד הנתונים" : "Database Field",
    csvHeaderCol: isRtl ? "עמודה תואמת בקובץ ה-CSV" : "Mapped CSV Column",
    notMapped: isRtl ? "-- בחר עמודה --" : "-- Select Column --",
    requiredAsterisk: " *",
    runValidationBtn: isRtl ? "הרצת בדיקת תקינות וסימולציה טרנזקציונלית" : "Validate Data & Dry-Run Simulator",
    validationResults: isRtl ? "שלב 5: דוח בדיקת תקינות מסד נתונים" : "Step 5: Database Validation & Dry-Run Report",
    validationPassedMsg: isRtl ? "בדיקת התקינות עברה בהצלחה מלאה! הנתונים תקינים ומוכנים לייבוא." : "Validation checks passed perfectly! Highly compliant for database transaction and commit.",
    validationFailedMsg: isRtl ? "נמצאו שגיאות בדיקה במסמך שהועלה. הטרנזקציה בוטלה ובוצע Rollback למניעת פגיעה באיכות הנתונים." : "Validation failures encountered. The transaction was rolled back to maintain perfect system parameters.",
    errOriginalRow: isRtl ? "שורה מקורית" : "Row",
    errDesc: isRtl ? "תיאור השגיאה" : "Error Description",
    errVal: isRtl ? "ערך שגוי" : "Invalid Value",
    errCorrection: isRtl ? "תיקון מוצע" : "Suggested Correction",
    downloadReportBtn: isRtl ? "הורד דוח שגיאות מפורט (CSV)" : "Download Full Error Report (CSV)",
    importModeTitle: isRtl ? "שלב 6: בחירת אופן הייבוא והרצה" : "Step 6: Select Import Mode & Execute",
    modeAppend: isRtl ? "הוסף רשומות חדשות בלבד (Skip pre-existing)" : "Append New Records Only (Skip pre-existing)",
    modeUpdate: isRtl ? "עדכן רשומות קיימות (Overwrite metrics or attach items)" : "Update Existing Records (Merge values & update metrics)",
    appendDesc: isRtl ? "מצב הוספה: מוסיף רשומות חדשות בלבד לקטלוג. רשומות קיימות נשארות ללא שינוי." : "Append mode: Inserts new combinations, preserving pre-existing database metrics.",
    updateDesc: isRtl ? "מצב עדכון: מעדכן ערכים ברשומות קיימות (כמו דגלי חובה) ומוסיף את הרשומות החסרות." : "Update mode: Overwrites matching metrics or links new allowed values into existing mappings.",
    confirmExecute: isRtl ? "בצע ייבוא סופי והתחייב לטרנזקציה (Commit)" : "Execute Import & Commit Transaction",
    progressTitle: isRtl ? "טרנזקציית ייבוא פעילה..." : "Database transaction committing...",
    summaryHeader: isRtl ? "סיכום תהליך הייבוא המוצלח" : "Import Summary Receipt",
    totalRowsProcessed: isRtl ? "סך הכל שורות בקובץ" : "Total CSV Rows",
    successImported: isRtl ? "שויכו ונוספו בהצלחה" : "Successfully Imported",
    successUpdated: isRtl ? "רשומות שעודכנו" : "Updated records",
    skippedRecords: isRtl ? "רשומות שדולגו (כבר קיימות)" : "Skipped (Already exists)",
    errorsEncountered: isRtl ? "רשומות שנכשלו" : "Failed rows",
    execDuration: isRtl ? "משך זמן הריצה" : "Execution Duration",
    committedAt: isRtl ? "זמן חתימת הטרנזקציה" : "Committed Timestamp",
    resetForm: isRtl ? "ייבא קובץ חדש" : "Import Another File",
    unauthorizedTitle: isRtl ? "גישה מוגבלת למנהלים" : "Administrative Access Restricted",
    unauthorizedDesc: isRtl ? "רק משתמשים בעלי הרשאות מנהל (ADMIN / MANAGER) מורשים לגשת למודול זה ולבצע שינויי קטלוג גלובליים." : "Only system users mapped with ADMIN or MANAGER clearance are authorized to perform global catalog data imports.",
    logsHeader: isRtl ? "יומן רישום היסטורי של פעולות ייבוא קבצים" : "Recent CSV Import Transactions Log"
  };

  // Define database fields based on selected destination table
  const dbFields: DbField[] = useMemo(() => {
    if (selectedTable === "itemattributesmapping") {
      return [
        { name: "SKU", labelHe: 'מק"ט פריט (SKU)', labelEn: "Item SKU", isMandatory: true, type: "text" },
        { name: "AttributeTypeId", labelHe: "מזהה סוג מאפיין (AttributeTypeId)", labelEn: "Attribute Type ID", isMandatory: true, type: "text" },
        { name: "IsMandatory", labelHe: "שדה חובה (IsMandatory - 0 או 1)", labelEn: "Is Mandatory (true/false/1/0)", isMandatory: false, type: "boolean" }
      ];
    } else if (selectedTable === "itemattributeallowedvalues") {
      return [
        { name: "SKU", labelHe: 'מק"ט פריט (SKU)', labelEn: "Item SKU", isMandatory: true, type: "text" },
        { name: "AttributeTypeId", labelHe: "מזהה סוג מאפיין (AttributeTypeId)", labelEn: "Attribute Type ID", isMandatory: true, type: "text" },
        { name: "AttributeValueId", labelHe: "מזהה ערך מאפיין (AttributeValueId)", labelEn: "Attribute Value ID", isMandatory: true, type: "text" }
      ];
    } else {
      // items table selection
      return [
        { name: "SKU", labelHe: 'מק"ט פריט (SKU)', labelEn: "Item SKU", isMandatory: true, type: "text" },
        { name: "NameHe", labelHe: "שם בעברית (NameHe)", labelEn: "Hebrew Name", isMandatory: true, type: "text" },
        { name: "NameEn", labelHe: "שם באנגלית (NameEn)", labelEn: "English Name", isMandatory: true, type: "text" },
        { name: "Stock", labelHe: "כמות במלאי (Stock)", labelEn: "Stock Level", isMandatory: false, type: "number" },
        { name: "Price", labelHe: "מחיר ליחידה (Price)", labelEn: "Price per Unit", isMandatory: false, type: "number" },
        { name: "Shelf", labelHe: "מיקום מדף (Shelf)", labelEn: "Shelf e.g. A-1-3", isMandatory: false, type: "text" },
        { name: "CategoryHe", labelHe: "קטגוריה בעברית (CategoryHe)", labelEn: "Hebrew Category", isMandatory: false, type: "text" },
        { name: "CategoryEn", labelHe: "קטגוריה באנגלית (CategoryEn)", labelEn: "English Category", isMandatory: false, type: "text" },
        { name: "UnitHe", labelHe: "יחידת מידה עברית (UnitHe)", labelEn: "Hebrew Measurement Unit", isMandatory: false, type: "text" },
        { name: "UnitEn", labelHe: "יחידת מידה אנגלית (UnitEn)", labelEn: "English Measurement Unit", isMandatory: false, type: "text" },
        { name: "ImageUrl", labelHe: "כתובת קישור לתמונה (ImageUrl)", labelEn: "Image URL", isMandatory: false, type: "text" }
      ];
    }
  }, [selectedTable]);

  // Headers list block from CSV raw data
  const csvHeaders = useMemo(() => {
    return csvRawData.length > 0 ? csvRawData[0] : [];
  }, [csvRawData]);

  // Data preview rows (ignoring header line)
  const csvPreviewRows = useMemo(() => {
    return csvRawData.slice(1, 21);
  }, [csvRawData]);

  // Auto-mapping heuristics logic when CSV file is loaded
  useEffect(() => {
    if (csvHeaders.length === 0) return;

    const initialMaps: Record<string, string> = {};
    dbFields.forEach((field) => {
      const fn = field.name.toLowerCase();
      
      // Look for best match in csv headers
      let matchedHeader = "";
      for (const h of csvHeaders) {
        const val = h.trim().toLowerCase().replace(/^\uFEFF/, "");
        
        if (selectedTable === "items") {
          if (fn === "sku") {
            if (val === "parit" || val === "sku" || val.includes("מק\"ט") || val.includes("מקט") || val === "id" || val.includes("פריט") || val.includes("קוד")) {
              matchedHeader = h;
              break;
            }
          } else if (fn === "namehe") {
            if (val === "teur_order" || val.includes("teur_order") || val.includes("namehe") || val.includes("name_he") || val.includes("שם בעברית") || val.includes("תיאור") || val.includes("חומר") || val.includes("teur") || val.includes("name") || val.includes("desc") || val.includes("תיאור") || val.includes("פריט")) {
              matchedHeader = h;
              break;
            }
          } else if (fn === "nameen") {
            if (val.includes("nameen") || val.includes("name_en") || val.includes("english") || val.includes("שם באנגלית")) {
              matchedHeader = h;
              break;
            }
          } else if (fn === "stock") {
            if (val.includes("incomequantity") || val === "quantity" || val === "qty" || val === "stock" || val.includes("כמות") || val.includes("מלאי")) {
              matchedHeader = h;
              break;
            }
          } else if (fn === "price") {
            if (val.includes("price") || val.includes("cost") || val.includes("מחיר")) {
              matchedHeader = h;
              break;
            }
          } else if (fn === "shelf") {
            if (val.includes("shelf") || val.includes("מדף") || val.includes("מיקום")) {
              matchedHeader = h;
              break;
            }
          } else if (fn === "categoryhe") {
            if (val.includes("categoryid") || val.includes("categoryhe") || val.includes("category_he") || val.includes("קטגוריה") || val.includes("סוג")) {
              matchedHeader = h;
              break;
            }
          } else if (fn === "categoryen") {
            if (val.includes("categoryen") || val.includes("category_en")) {
              matchedHeader = h;
              break;
            }
          } else if (fn === "imageurl") {
            if (val.includes("imageurl") || val.includes("image_url") || val.includes("image") || val.includes("url") || val.includes("תמונה") || val.includes("קישור")) {
              matchedHeader = h;
              break;
            }
          }
        } else {
          // Non-items mappings (itemattributesmapping or itemattributeallowedvalues)
          const normalizedFieldName = field.name.toLowerCase().replace(/[^a-z0-9]/g, "");
          const normalizedHeader = val.replace(/[^a-z0-9]/g, "");
          if (
            normalizedHeader === normalizedFieldName ||
            normalizedHeader.includes(normalizedFieldName) ||
            normalizedFieldName.includes(normalizedHeader)
          ) {
            matchedHeader = h;
            break;
          }
        }
      }

      // Fallback to simple matching if no robust match found
      if (!matchedHeader) {
        const normalizedFieldName = field.name.toLowerCase().replace(/[^a-z0-9]/g, "");
        const fallbackMatch = csvHeaders.find((header) => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, "");
          return (
            normalizedHeader === normalizedFieldName ||
            normalizedHeader.includes(normalizedFieldName) ||
            normalizedFieldName.includes(normalizedHeader)
          );
        });
        if (fallbackMatch) matchedHeader = fallbackMatch;
      }

      initialMaps[field.name] = matchedHeader || "";
    });

    setColumnMappings(initialMaps);
  }, [csvHeaders, dbFields, selectedTable]);

  // Auto-run validation for "items" when data changes to reduce clicks, mimicking Extended Catalog page
  useEffect(() => {
    if (selectedTable === "items" && csvRawData.length >= 2 && Object.keys(columnMappings).length > 0) {
      const timer = setTimeout(() => {
        runValidation();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [csvRawData, selectedTable, columnMappings]);

  // Handle Drag & Drop events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Safe file loader function
  const loadFileContent = (file: File, enc: string = "auto") => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError(isRtl ? "שגיאה: הקובץ שנבחר אינו קובץ CSV תקין." : "Error: Selected file is not a valid CSV text document.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setFileError(isRtl ? "שגיאה: נפח הקובץ חורג מהמגבלה המותרת של 20MB." : "Error: CSV File size exceeds the defined 20MB limit.");
      return;
    }

    setUploadedFile(file);
    setFileError(null);

    const onDecodedText = (decodedText: string, finalEnc: string) => {
      try {
        if (!decodedText || decodedText.trim() === "") {
          setFileError(isRtl ? "שגיאה: קובץ ה-CSV ריק מתוכן." : "Error: The uploaded CSV file has empty text contents.");
          return;
        }

        setDetectedEncoding(finalEnc);

        const parsed = parseCSV(decodedText);
        if (parsed.length === 0 || parsed[0].length === 0) {
          setFileError(isRtl ? "שגיאה: לא נטענו עמודות תקינות מהקובץ." : "Error: Failed to extract structural columns from the document.");
          return;
        }

        setCsvRawData(parsed);
      } catch (err) {
        setFileError(isRtl ? "קרסה שגיאה בקריאת הקובץ. ודא קידוד תקין." : "An error occurred reading this CSV. Please check encoding.");
      }
    };

    if (enc !== "auto") {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onDecodedText(text, enc);
      };
      reader.readAsText(file, enc);
    } else {
      // EXACT SAME DETECTION MECHANISM AS IN THE CATALOG SCREEN
      const readerUtf8 = new FileReader();
      readerUtf8.onload = (event) => {
        const textUtf8 = event.target?.result as string;
        const hasReplacementChars = textUtf8.includes("\uFFFD");
        const hasHebrewRange = /[\u0590-\u05FF]/.test(textUtf8);
        const hasHighLatinRange = /[à-ÿ]/.test(textUtf8);

        if (hasReplacementChars || (!hasHebrewRange && hasHighLatinRange)) {
          const readerWin = new FileReader();
          readerWin.onload = (evWin) => {
            const textWin = evWin.target?.result as string;
            onDecodedText(textWin, "windows-1255");
          };
          readerWin.readAsText(file, "windows-1255");
        } else {
          onDecodedText(textUtf8, "UTF-8");
        }
      };
      readerUtf8.readAsText(file, "utf-8");
    }
  };

  const handleEncodingChange = (newEnc: string) => {
    setEncoding(newEnc);
    if (uploadedFile) {
      loadFileContent(uploadedFile, newEnc);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      loadFileContent(e.dataTransfer.files[0], encoding);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      loadFileContent(e.target.files[0], encoding);
    }
  };

  const handleMappingChange = (dbFieldName: string, csvHeaderName: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [dbFieldName]: csvHeaderName
    }));
    // Clear validation state to force user to re-run
    setIsValidated(false);
    setValidationErrors([]);
  };

  // Helper resolvers to translate SKU and Attribute IDs from strings or names to indices safely
  const resolveSkuExists = (skuStr: string): boolean => {
    const rawSku = skuStr.trim().toLowerCase();
    return warehouseItems.some(item => item.sku.trim().toLowerCase() === rawSku);
  };

  // Custom multi-layer resolver for AttributeType
  const resolveAttributeType = (typeInput: string): AttributeType | null => {
    const term = typeInput.trim().toLowerCase();
    if (!term) return null;

    // A. Match by string type.id (like "type-0" or custom uuid)
    const matchId = attributeTypes.find(t => t.id.toLowerCase() === term && !t.isDeleted);
    if (matchId) return matchId;

    // B. Match by 1-based integer index map (matching AdminDataExporter)
    const intIndex = parseInt(term, 10);
    if (!isNaN(intIndex) && intIndex > 0 && intIndex <= attributeTypes.length) {
      const sortedTypes = [...attributeTypes]; // Keep chronological sequence
      const matched = sortedTypes[intIndex - 1];
      if (matched && !matched.isDeleted) return matched;
    }

    // C. Match by exact or partial Hebrew/English names
    const matchName = attributeTypes.find(t => {
      const matchHe = t.nameHe.trim().toLowerCase() === term;
      const matchEn = t.nameEn.trim().toLowerCase() === term;
      return (matchHe || matchHe) && !t.isDeleted;
    });
    if (matchName) return matchName;

    return null;
  };

  // Resolver for AttributeValue ID
  const resolveAttributeValue = (valueInput: string, matchedType: AttributeType): string | null => {
    const term = valueInput.trim().toLowerCase();
    if (!term) return null;

    // Find active values for type
    const activeValues = matchedType.values.filter(v => v.isActive && !v.isDeleted);

    // A. Match by exact value.id
    const matchId = activeValues.find(v => v.id.toLowerCase() === term);
    if (matchId) return matchId.id;

    // B. Match by index mapping mimicking valueIdMap counter
    // Build a sequence list of values spanning all categories
    let globalCounter = 1;
    let foundGlobalId: string | null = null;
    attributeTypes.forEach((t) => {
      t.values.forEach((v) => {
        if (t.id === matchedType.id && globalCounter === parseInt(term, 10)) {
          if (v.isActive && !v.isDeleted) {
            foundGlobalId = v.id;
          }
        }
        globalCounter++;
      });
    });
    if (foundGlobalId) return foundGlobalId;

    // C. Match by value He/En descriptions
    const matchDesc = activeValues.find(v => {
      return v.valueHe.trim().toLowerCase() === term || v.valueEn.trim().toLowerCase() === term;
    });
    if (matchDesc) return matchDesc.id;

    return null;
  };

  // RUN DRY-RUN TRANSACTION VALIDATION SIMULATION
  const runValidation = () => {
    if (csvRawData.length < 2) return;

    // Verify all mandatory database ports are mapped (For items, SKU mapping is sufficient)
    const missingFields = dbFields.filter(f => {
      if (selectedTable === "items") {
        return f.name === "SKU" && !columnMappings[f.name];
      }
      return f.isMandatory && !columnMappings[f.name];
    });
    if (missingFields.length > 0) {
      const missingNames = missingFields.map(f => isRtl ? f.labelHe : f.labelEn).join(", ");
      alert((isRtl ? "שגיאה: השדות המנדטוריים הבאים אינם ממופים: " : "Error: Please map all mandatory fields: ") + missingNames);
      return;
    }

    const errors: Array<{ row: number; desc: string; val: string; correction: string }> = [];
    const seenCompositeKeys = new Set<string>();

    const rows = csvRawData.slice(1); // Rows block
    
    rows.forEach((rowCells, idx) => {
      const originalRowNo = idx + 2; // +1 for 0-indexed, +1 for headers line
      
      // Extract cell indexes based on mappings
      const getVal = (fieldName: string): string => {
        const header = columnMappings[fieldName];
        if (!header) return "";
        const colIdx = csvHeaders.indexOf(header);
        if (colIdx === -1) return "";
        return rowCells[colIdx] || "";
      };

      const sku = getVal("SKU").trim();

      // Validate core required row structure cells
      if (!sku) {
        errors.push({
          row: originalRowNo,
          desc: isRtl ? 'מק"ט פריט חסר או ריק.' : "Catalog Item SKU value is empty.",
          val: "",
          correction: isRtl ? 'יש להזין מק"ט חוקי של מוצר.' : "Enter a valid product SKU."
        });
        return; // Skip complex validations for empty record rows
      }

      if (selectedTable === "items") {
        // Missing names are gracefully replaced with fallbacks during import to mimic the extended catalog screen, hence not failing validation.

        // Check for duplicates inside the CSV
        if (seenCompositeKeys.has(sku.toLowerCase())) {
          errors.push({
            row: originalRowNo,
            desc: isRtl ? `מק"ט כפול '${sku}' בקובץ ה-CSV.` : `Duplicate SKU '${sku}' in CSV file.`,
            val: sku,
            correction: isRtl ? "הסר את השורה הכפולה מקובץ הסימונין." : "Ensure unique constraints on imports."
          });
        } else {
          seenCompositeKeys.add(sku.toLowerCase());
        }

        // Check stock is a number if provided
        const stockRaw = getVal("Stock").trim();
        if (stockRaw && isNaN(Number(stockRaw))) {
          errors.push({
            row: originalRowNo,
            desc: isRtl ? `כמות במלאי '${stockRaw}' אינה מספר חוקי.` : `Stock value '${stockRaw}' is not a valid number.`,
            val: stockRaw,
            correction: isRtl ? "הזן מספר שלם עבור כמות המלאי." : "Update to a valid integer."
          });
        }

        // Check price is a number if provided
        const priceRaw = getVal("Price").trim();
        if (priceRaw && isNaN(Number(priceRaw))) {
          errors.push({
            row: originalRowNo,
            desc: isRtl ? `מחיר ליחידה '${priceRaw}' אינו מספר חוקי.` : `Price value '${priceRaw}' is not a valid number.`,
            val: priceRaw,
            correction: isRtl ? "הזן מספר עבור מחיר היחידה." : "Update to a valid price number."
          });
        }

      } else {
        const typeInput = getVal("AttributeTypeId").trim();

        if (!typeInput) {
          errors.push({
            row: originalRowNo,
            desc: isRtl ? "מזהה סוג המאפיין חסר או ריק." : "Attribute Type ID is empty.",
            val: "",
            correction: isRtl ? "יש לשייך מזהה סוג מאפיין חוקי או את שם המאפיין." : "Coordinate with a valid Type numbering sequence."
          });
          return;
        }

        // Referential validation: Item existence
        const skuNorm = sku.toUpperCase();
        const matchedItem = warehouseItems.find(i => i.sku.toUpperCase() === skuNorm);
        if (!matchedItem) {
          errors.push({
            row: originalRowNo,
            desc: isRtl ? `המק"ט שצוין '${sku}' לא נמצא בקטלוג המלאי.` : `Item SKU '${sku}' does not exist in the warehouse inventory catalog.`,
            val: sku,
            correction: isRtl ? 'הזן מק"ט מוצר שקיים במחיצת קטלוג הפריטים.' : "Adjust mapping with a legitimate catalog item ID."
          });
        }

        // Referential validation: Attribute Type existence
        const matchedType = resolveAttributeType(typeInput);
        if (!matchedType) {
          errors.push({
            row: originalRowNo,
            desc: isRtl ? `סוג מאפיין '${typeInput}' לא רשום או נמחק במערכת.` : `Attribute Type '${typeInput}' does not exist or has been deleted.`,
            val: typeInput,
            correction: isRtl ? "רשום שם סוג מאפיין חוקי או קוד ממופה." : "Map to an existing active attribute category (e.g. Size, Color)."
          });
        }

        // Handle table-specific checks
        if (selectedTable === "itemattributesmapping") {
          // Compose duplicate keys check
          if (matchedItem && matchedType) {
            const compKey = `${matchedItem.sku}||${matchedType.id}`;
            if (seenCompositeKeys.has(compKey)) {
              errors.push({
                row: originalRowNo,
                desc: isRtl ? "רשומה כפולה בקובץ ה-CSV עבור מאפיין לפריט זה." : "Duplicate record detected in the CSV file for this SKU and Attribute Type composite block.",
                val: `SKU: ${sku}, Type: ${typeInput}`,
                correction: isRtl ? "הסר את השורה הכפולה מקובץ הסימונין." : "Ensure unique constraints on imports."
              });
            } else {
              seenCompositeKeys.add(compKey);
            }
          }

          // Validate IsMandatory parser format if present
          const isMandatoryRaw = getVal("IsMandatory").trim();
          if (isMandatoryRaw) {
            const normBool = isMandatoryRaw.toLowerCase();
            const validBools = ["1", "0", "true", "false", "y", "n", "yes", "no", "כן", "לא"];
            if (!validBools.includes(normBool)) {
              errors.push({
                row: originalRowNo,
                desc: isRtl ? `ערך שגוי עבור דגל מאפיין חובה '${isMandatoryRaw}' (יש להזין 0 / 1 / true / false).` : `Invalid boolean value '${isMandatoryRaw}' for IsMandatory.`,
                val: isMandatoryRaw,
                correction: isRtl ? "שנה ל-1 עבור שדה חובה, או ל-0 עבור לא חובה." : "Update to numeric index binary 1 (true) or 0 (false)."
              });
            }
          }

        } else {
          // Table selected: itemattributeallowedvalues
          const valueInput = getVal("AttributeValueId").trim();
          
          if (!valueInput) {
            errors.push({
              row: originalRowNo,
              desc: isRtl ? "קוד מזהה ערך המאפיין (AttributeValueId) חסר." : "Attribute Value ID value is dry/empty.",
              val: "",
              correction: isRtl ? "ספק ערך מותר מוגדר מראש עבור מאפיין זה." : "Provide pre-formed value identifier (e.g., Red, Small)."
            });
          } else if (matchedType) {
            // Check if attribute value matches values in matchedType
            const matchedValId = resolveAttributeValue(valueInput, matchedType);
            if (!matchedValId) {
              errors.push({
                row: originalRowNo,
                desc: isRtl ? `ערך המאפיין המבוקש '${valueInput}' לא מוגדר תחת המאפיין '${matchedType.nameHe}'.` : `Specified Attribute Value '${valueInput}' does not reside or has been soft-deleted under type '${matchedType.nameEn}'.`,
                val: valueInput,
                correction: isRtl ? `שנה לערך חוקי המקושר לקטגוריה (כגון: ${matchedType.values.filter(v=>!v.isDeleted).slice(0,3).map(v=>v.valueHe).join(", ")}).` : `Verify correct value ID bounds.`
              });
            } else if (matchedItem) {
              // Referential constraint check: ItemAttributeMapping (SKU, AttributeTypeId) MUST exist in mappings
              const hasExistingMapping = itemMappings.some(m => m.itemId.toUpperCase() === matchedItem.sku.toUpperCase() && m.typeId === matchedType.id);
              if (!hasExistingMapping) {
                errors.push({
                  row: originalRowNo,
                  desc: isRtl ? `חריגת מפתח זר: לא מוגדר שיוך מאפיין לפריט ${sku} וסוג מאפיין '${matchedType.nameHe}'.` : `Foreign Key Constraint Violation: No base Item-Attribute mapping currently established for SKU ${sku} and Type '${matchedType.nameEn}'.`,
                  val: `SKU: ${sku}, Type: ${matchedType.nameHe}`,
                  correction: isRtl ? "ייבא קודם שיוך בטבלת 'itemattributesmapping' לפני הזנת ערכים ספציפיים." : "First establish the primary category mapping link before binding select values."
                });
              } else {
                const compKey = `${matchedItem.sku}||${matchedType.id}||${matchedValId}`;
                if (seenCompositeKeys.has(compKey)) {
                  errors.push({
                    row: originalRowNo,
                    desc: isRtl ? "קישור ערך מורשה כפול לפריט זה בקובץ ה-CSV." : "Duplicate composite Allowed Value link in CSV.",
                    val: `Value: ${valueInput}`,
                    correction: isRtl ? "הסר את השורה הכפולה מקובץ הסימונין." : "Unify values array duplicate listings."
                  });
                } else {
                  seenCompositeKeys.add(compKey);
                }
              }
            }
          }
        }
      }
    });

    setValidationErrors(errors);
    setIsValidated(true);
    setValidationPassed(errors.length === 0);

    if (errors.length > 0) {
      // Transaction was rolled back!
      logDatabaseAction(
        "ASSIGN",
        "ImportDiagnosticSimulator",
        "CSV_DryRun",
        `Simulated transaction aborted. CSV file '${uploadedFile?.name}' failed dry-run checks with ${errors.length} referential schema violations. Partial database intact.`
      );
    }
  };

  // Helper parser for IsMandatory column cell
  const parseIsMandatoryValue = (raw: string): boolean => {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) return true; // Default to true if mapping exists
    if (["1", "true", "y", "yes", "כן"].includes(trimmed)) return true;
    return false;
  };

  // EXECUTE TRANSACTIONAL DB IMPORT & STATE MUTATION
  const executeImportTransaction = () => {
    if (!validationPassed || csvRawData.length < 2) return;

    setIsImporting(true);
    setProgressPercent(10);
    
    // Track execution timing metrics
    const startTime = Date.now();
    let stats = {
      total: csvRawData.length - 1,
      processed: 0,
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      durationMs: 0
    };

    setProgressStats(stats);

    // Run database import loop
    // In React context, this atomic layout is updated inside the state
    // We clone current itemMappings/warehouseItems to manipulate locally, protecting state until final commit
    let workingItemMappings = [...itemMappings];
    let workingWarehouseItems = [...warehouseItems];
    let workingPictureUrls = [...itemPictureUrls];

    const rows = csvRawData.slice(1);

    // Chunks simulator interval loop to trigger pleasant loading
    let index = 0;
    const batchSize = Math.max(1, Math.floor(rows.length / 5)); // split into 5 animated batches

    const commitBatchInterval = setInterval(() => {
      const isLastBatch = index + batchSize >= rows.length;
      const currentBatchEnd = Math.min(rows.length, index + batchSize);

      for (let i = index; i < currentBatchEnd; i++) {
        const rowCells = rows[i];

        const getVal = (fieldName: string): string => {
          const header = columnMappings[fieldName];
          if (!header) return "";
          const colIdx = csvHeaders.indexOf(header);
          if (colIdx === -1) return "";
          return rowCells[colIdx] || "";
        };

        const skuRaw = getVal("SKU").trim();

        if (selectedTable === "items") {
          const sku = skuRaw;
          const existingItem = workingWarehouseItems.find(item => item.sku.toUpperCase() === sku.toUpperCase());
          
          let nameHe = getVal("NameHe").trim();
          if (!nameHe) {
            nameHe = existingItem?.nameHe || `פריט קטלוג ${sku.slice(-6)}`;
          }
          let nameEn = getVal("NameEn").trim();
          if (!nameEn) {
            nameEn = existingItem?.nameEn || `Catalog Item ${sku.slice(-6)}`;
          }

          const stock = getVal("Stock").trim() ? Number(getVal("Stock").trim()) : 0;
          const price = getVal("Price").trim() ? Number(getVal("Price").trim()) : 0;
          const shelf = getVal("Shelf").trim() || "-";
          
          const rawCatHe = getVal("CategoryHe").trim();
          const rawCatEn = getVal("CategoryEn").trim();
          let categoryHe = rawCatHe || "-";
          let categoryEn = rawCatEn || "-";
          
          if (categoryHe === "1" || categoryHe === "32") {
            categoryHe = "ציוד מילוט והשקיה";
            categoryEn = "Water & Irrigation Gear";
          } else if (categoryHe === "3" || categoryHe === "24") {
            categoryHe = "חומרים כימיים ומעבדה";
            categoryEn = "Chemicals & Lab Supplies";
          } else if (categoryHe === "11" || categoryHe === "13") {
            categoryHe = "ציוד משרדי ונייר";
            categoryEn = "Office Supplies & Paper";
          } else if (existingItem) {
            categoryHe = rawCatHe !== "" ? rawCatHe : existingItem.categoryHe;
            categoryEn = rawCatEn !== "" ? rawCatEn : existingItem.categoryEn;
          } else {
            categoryHe = rawCatHe !== "" ? rawCatHe : "ציוד טכני וחלקי חילוף";
            categoryEn = rawCatEn !== "" ? rawCatEn : "Technical Gear & Batteries";
          }

          const unitHe = getVal("UnitHe").trim() || (existingItem?.unitHe || "יחידה");
          const unitEn = getVal("UnitEn").trim() || (existingItem?.unitEn || "Unit");

          const existingIdx = workingWarehouseItems.findIndex(item => item.sku.toUpperCase() === sku.toUpperCase());

          if (importMode === "APPEND") {
            if (existingIdx > -1) {
              // Skip existing SKU in append mode
              stats.skipped++;
            } else {
              workingWarehouseItems.push({
                sku,
                nameHe,
                nameEn,
                stock,
                price,
                shelf,
                categoryHe,
                categoryEn,
                unitHe,
                unitEn
              });
              stats.imported++;
            }
          } else {
            // Update Mode
            if (existingIdx > -1) {
              workingWarehouseItems[existingIdx] = {
                ...workingWarehouseItems[existingIdx],
                nameHe: nameHe,
                nameEn: nameEn,
                stock: getVal("Stock").trim() ? stock : workingWarehouseItems[existingIdx].stock,
                price: getVal("Price").trim() ? price : workingWarehouseItems[existingIdx].price,
                shelf: getVal("Shelf").trim() ? shelf : workingWarehouseItems[existingIdx].shelf,
                categoryHe: categoryHe,
                categoryEn: categoryEn,
                unitHe: unitHe,
                unitEn: unitEn
              };
              stats.updated++;
            } else {
              workingWarehouseItems.push({
                sku,
                nameHe,
                nameEn,
                stock,
                price,
                shelf,
                categoryHe,
                categoryEn,
                unitHe,
                unitEn
              });
              stats.imported++;
            }
          }

          // Decoupled Image URL Integration
          const csvImageUrl = getVal("ImageUrl").trim();
          if (csvImageUrl) {
            // Check if this image URL already exists for the SKU
            const alreadyExists = workingPictureUrls.some(
              (p) => p.sku === sku && p.imageUrl.trim() === csvImageUrl
            );
            if (!alreadyExists) {
              const hasExistingPrimaryPic = workingPictureUrls.some(
                (p) => p.sku === sku && p.isPrimary && p.isActive
              );
              workingPictureUrls.push({
                id: `pic-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
                sku: sku,
                imageUrl: csvImageUrl,
                imageSource: "CSV Catalog Import",
                isPrimary: !hasExistingPrimaryPic, // If there isn't a primary image, make this primary
                createdDate: new Date().toISOString(),
                updatedDate: new Date().toISOString(),
                createdBy: currentUser.email || "system@volcani.agri.gov.il",
                updatedBy: currentUser.email || "system@volcani.agri.gov.il",
                isActive: true
              });
            }
          }
        } else {
          const typeInput = getVal("AttributeTypeId").trim();

          // Resolve absolute keys (guaranteed valid due to preceding dry-run validations)
          const matchedItem = warehouseItems.find(item => item.sku.toUpperCase() === skuRaw.toUpperCase())!;
          const matchedType = resolveAttributeType(typeInput)!;
          const sku = matchedItem.sku; // standardized case
          const typeId = matchedType.id;

          if (selectedTable === "itemattributesmapping") {
            const isMandatory = parseIsMandatoryValue(getVal("IsMandatory"));
            
            const existingIdx = workingItemMappings.findIndex(m => m.itemId === sku && m.typeId === typeId);

            if (importMode === "APPEND") {
              if (existingIdx > -1) {
                // Skip existing combination
                stats.skipped++;
              } else {
                // Append new mapping
                workingItemMappings.push({
                  itemId: sku,
                  typeId: typeId,
                  isMandatory: isMandatory,
                  allowedValueIds: []
                });
                stats.imported++;
              }
            } else {
              // Update Mode
              if (existingIdx > -1) {
                // Overwrite IsMandatory but preserve allowed values
                workingItemMappings[existingIdx] = {
                  ...workingItemMappings[existingIdx],
                  isMandatory
                };
                stats.updated++;
              } else {
                // Add missing row mapping
                workingItemMappings.push({
                  itemId: sku,
                  typeId: typeId,
                  isMandatory,
                  allowedValueIds: []
                });
                stats.imported++;
              }
            }

          } else {
            // Table: itemattributeallowedvalues
            const valueInput = getVal("AttributeValueId").trim();
            const matchedValId = resolveAttributeValue(valueInput, matchedType)!;

            const mappingIdx = workingItemMappings.findIndex(m => m.itemId === sku && m.typeId === typeId);

            if (mappingIdx > -1) {
              const allowedList = workingItemMappings[mappingIdx].allowedValueIds;
              const isAlreadyLinked = allowedList.includes(matchedValId);

              if (importMode === "APPEND") {
                if (isAlreadyLinked) {
                  stats.skipped++;
                } else {
                  // Link value ID
                  workingItemMappings[mappingIdx] = {
                    ...workingItemMappings[mappingIdx],
                    allowedValueIds: [...allowedList, matchedValId]
                  };
                  stats.imported++;
                }
              } else {
                // Update mode: link if missing or refresh link
                if (isAlreadyLinked) {
                  stats.updated++; // already mapped
                } else {
                  workingItemMappings[mappingIdx] = {
                    ...workingItemMappings[mappingIdx],
                    allowedValueIds: [...allowedList, matchedValId]
                  };
                  stats.imported++;
                }
              }
            }
          }
        }

        stats.processed++;
      }

      index += batchSize;
      const currentPercent = Math.min(95, Math.floor((stats.processed / stats.total) * 90) + 10);
      setProgressPercent(currentPercent);
      setProgressStats({ ...stats });

      if (isLastBatch) {
        clearInterval(commitBatchInterval);

        // COMMIT THE TRANSACTION TO REACT STATE WITH PERSISTENCE!
        if (selectedTable === "items") {
          if (setWarehouseItems) {
            setWarehouseItems(workingWarehouseItems);
            memoryStore.setItem("volcani_stock", JSON.stringify(workingWarehouseItems));
          }
          if (setItemPictureUrls) {
            setItemPictureUrls(workingPictureUrls);
            memoryStore.setItem("volcani_item_picture_urls", JSON.stringify(workingPictureUrls));
          }
        } else {
          setItemMappings(workingItemMappings);
        }

        const finalDurationMs = Date.now() - startTime;
        stats.durationMs = finalDurationMs;

        // Persist to log file list
        const newLogEntry: CSVImportLog = {
          logId: `import-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          userId: currentUser.teudatZehut,
          userName: `${currentUser.firstName} ${currentUser.lastName}`,
          userRole: currentUser.role,
          tableName: selectedTable,
          fileName: uploadedFile?.name || "unnamed.csv",
          importMode,
          totalRows: stats.total,
          successCount: stats.imported + stats.updated,
          failureCount: stats.failed,
          timestamp: new Date().toISOString(),
          durationMs: finalDurationMs
        };

        setImportLogs((prev) => [newLogEntry, ...prev]);

        // Trigger action log audit entry
        logDatabaseAction(
          "ASSIGN",
          selectedTable === "items" ? "WarehouseItems" : (selectedTable === "itemattributesmapping" ? "ItemAttributeMapping" : "ItemAttributeAllowedValues"),
          `Import Mode: ${importMode}, Existing State Maps: ${selectedTable === "items" ? warehouseItems.length : itemMappings.length}`,
          `COMMITTED CSV IMPORT. File: ${uploadedFile?.name}. Total input rows: ${stats.total}. Imported: ${stats.imported}, Updated: ${stats.updated}, Skipped: ${stats.skipped}. Duration: ${finalDurationMs}ms.`
        );

        // Transition views
        setProgressPercent(100);
        setTimeout(() => {
          setIsImporting(false);
          setImportSummary({
            ...stats,
            durationMs: finalDurationMs,
            timestamp: new Date().toISOString()
          });
        }, 300);
      }
    }, 150);
  };

  // Compile and trigger client download of the error diagnostic ledger sheet
  const handleDownloadErrorReport = () => {
    if (validationErrors.length === 0) return;

    const headers = isRtl
      ? 'מספר שורה בקובץ המקורי,תיאור השגיאה,ערך לא תקין שנפלט,תיקון או הצעה לתיקון'
      : "Original Row,Error Description,Invalid Value Found,Suggested Correction Advice";

    const rows = validationErrors.map((err) => {
      const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
      return `${err.row},${escape(err.desc)},${escape(err.val)},${escape(err.correction)}`;
    });

    // Write UTF-8 Byte Order Mark (BOM) to guarantee perfect Hebrew rendering inside Excel
    const csvBlobContent = "\uFEFF" + [headers, ...rows].join("\n");
    const blob = new Blob([csvBlobContent], { type: "text/csv;charset=utf-8;" });
    const blobUrl = URL.createObjectURL(blob);
    
    const clickLink = document.createElement("a");
    clickLink.setAttribute("href", blobUrl);
    clickLink.setAttribute("download", `import_errors_${selectedTable}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(clickLink);
    clickLink.click();
    document.body.removeChild(clickLink);
  };

  // Restrict screen for STAFF users completely
  if (!isAuthorized) {
    return (
      <div id="unauthorized-import-banner" className="bg-white border border-[#EF4444]/20 rounded-xl p-8 max-w-4xl mx-auto shadow-sm my-12 animate-fadeIn text-center">
        <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-2">{t.unauthorizedTitle}</h2>
        <p className="text-slate-650 text-sm max-w-md mx-auto leading-relaxed">{t.unauthorizedDesc}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="csv-import-module-layout" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Title Header with Icon badge */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white rounded-xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
            <Database className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight">{t.screenTitle}</h1>
            <p className="text-slate-400 text-xs mt-1">
              {isRtl 
                ? "ממשק מנהל לטעינת נתונים טרנזקציונלית ואימות קטלוגים" 
                : "Administrative CSV processor with exact referential schema checks"}
            </p>
          </div>
        </div>
        
        {/* Active user badge */}
        <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs font-semibold">
          <User className="h-4 w-4 text-slate-400 shrink-0" />
          <span>{currentUser.firstName} {currentUser.lastName} ({currentUser.role})</span>
        </div>
      </div>

      {importSummary ? (
        /* ==================== POST-IMPORT SUMMARY SCREEN ==================== */
        <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-sm animate-fadeIn text-center space-y-6 max-w-2xl mx-auto my-6" id="import-complete-summary">
          <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100 shadow-sm animate-pulse">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-extrabold text-slate-900">{t.summaryHeader}</h2>
            <p className="text-slate-500 text-xs">
              {isRtl 
                ? `מסד הנתונים עודכן בהצלחה תחת טבלה ${selectedTable}` 
                : `Destination table ${selectedTable} was successfully integrated.`}
            </p>
          </div>

          {/* Table Metrics receipt */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50/70 border border-slate-200 rounded-lg p-4 text-right">
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">{t.totalRowsProcessed}</span>
              <span className="text-lg font-bold text-slate-850 font-mono">{importSummary.total}</span>
            </div>
            <div>
              <span className="text-[11px] text-emerald-600 block font-bold">{t.successImported}</span>
              <span className="text-lg font-extrabold text-emerald-600 font-mono">+{importSummary.imported}</span>
            </div>
            <div>
              <span className="text-[11px] text-blue-600 block font-bold">{t.successUpdated}</span>
              <span className="text-lg font-extrabold text-blue-600 font-mono">+{importSummary.updated}</span>
            </div>
            <div className="border-t border-slate-205 md:border-none pt-2 md:pt-0">
              <span className="text-[11px] text-slate-500 block font-medium">{t.skippedRecords}</span>
              <span className="text-lg font-bold text-slate-500 font-mono">{importSummary.skipped}</span>
            </div>
            <div className="border-t border-slate-205 md:border-none pt-2 md:pt-0">
              <span className="text-[11px] text-slate-500 block font-medium">{t.execDuration}</span>
              <span className="text-base font-bold text-slate-800 font-mono">
                {importSummary.durationMs}ms
              </span>
            </div>
            <div className="border-t border-slate-205 md:border-none pt-2 md:pt-0">
              <span className="text-[11px] text-slate-500 block font-medium">{t.committedAt}</span>
              <span className="text-[10px] font-bold text-slate-800 font-mono">
                {new Date(importSummary.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={resetFormState}
              className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg transition duration-150 shadow-sm cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{t.resetForm}</span>
            </button>
          </div>
        </div>
      ) : isImporting ? (
        /* ==================== ACTIVE IMPORTING PROGRESS SCREEN ==================== */
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm animate-fadeIn text-center space-y-6 max-w-xl mx-auto my-12" id="import-progress-hud">
          <div className="mx-auto w-12 h-12 text-blue-600 animate-spin">
            <RefreshCw className="h-10 w-10" />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900">{t.progressTitle}</h2>
            <p className="text-slate-500 text-xs">
              {isRtl 
                ? "מעבד ובודק שורות מול מסד הנתונים הטרנזקציונלי..." 
                : "Executing transactional state updates inside system modules..."}
            </p>
          </div>

          {/* Progress bar container */}
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
            <div 
              className="bg-blue-600 h-full transition-all duration-150 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-xs font-mono font-medium text-slate-500 px-1">
            <span>{progressPercent}%</span>
            <span>
              {progressStats.processed} / {progressStats.total} {isRtl ? "שורות" : "lines"}
            </span>
          </div>

          {/* Live stat tags */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <span className="text-[10px] text-emerald-600 font-bold block">{isRtl ? "ייבוא" : "Imported"}</span>
              <span className="font-extrabold text-emerald-600 font-mono">+{progressStats.imported}</span>
            </div>
            <div>
              <span className="text-[10px] text-blue-600 font-bold block">{isRtl ? "עדכון" : "Updated"}</span>
              <span className="font-extrabold text-blue-600 font-mono">+{progressStats.updated}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? "דילוג" : "Skipped"}</span>
              <span className="font-extrabold text-slate-500 font-mono">{progressStats.skipped}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== ACTIVE IMPORT SETUP STEPS ==================== */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT CHOP: Setup Steps Forms (Span 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* SECTION 1: Import Target Selection */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs" id="step-1-target-selection">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-150 text-slate-700 text-[11px] font-mono font-extrabold rounded-full flex items-center justify-center">1</span>
                {t.selectDestination}
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Option card A: itemattributesmapping */}
                <button
                  type="button"
                  onClick={() => setSelectedTable("itemattributesmapping")}
                  className={`p-4 rounded-xl border text-right transition cursor-pointer select-none flex flex-col justify-between h-28 hover:scale-[1.01] ${
                    selectedTable === "itemattributesmapping"
                      ? "bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-xs font-bold text-slate-900 font-mono">itemattributesmapping</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedTable === "itemattributesmapping" ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300"
                    }`}>
                      {selectedTable === "itemattributesmapping" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-tight block mt-3 select-none">
                    {t.mappingDesc}
                  </p>
                </button>

                {/* Option card B: itemattributeallowedvalues */}
                <button
                  type="button"
                  onClick={() => setSelectedTable("itemattributeallowedvalues")}
                  className={`p-4 rounded-xl border text-right transition cursor-pointer select-none flex flex-col justify-between h-28 hover:scale-[1.01] ${
                    selectedTable === "itemattributeallowedvalues"
                      ? "bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-xs font-bold text-slate-900 font-mono">itemattributeallowedvalues</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedTable === "itemattributeallowedvalues" ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300"
                    }`}>
                      {selectedTable === "itemattributeallowedvalues" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-tight block mt-3 select-none">
                    {t.valuesDesc}
                  </p>
                </button>

                {/* Option card C: items */}
                <button
                  type="button"
                  onClick={() => setSelectedTable("items")}
                  className={`p-4 rounded-xl border text-right transition cursor-pointer select-none flex flex-col justify-between h-28 hover:scale-[1.01] ${
                    selectedTable === "items"
                      ? "bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex justify-between items-start w-full">
                    <span className="text-xs font-bold text-slate-900 font-mono">items</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      selectedTable === "items" ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300"
                    }`}>
                      {selectedTable === "items" && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-tight block mt-3 select-none">
                    {isRtl ? 'ייבוא פריטי קטלוג מלאי (SKU, NameHe, NameEn, Stock, Price, Shelf)' : 'Import warehouse core items catalog and general properties.'}
                  </p>
                </button>

              </div>
            </div>

            {/* SECTION 2: CSV File Upload */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs" id="step-2-file-upload">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <span className="w-5 h-5 bg-slate-150 text-slate-700 text-[11px] font-mono font-extrabold rounded-full flex items-center justify-center">2</span>
                {t.uploadTitle}
              </h2>

              {!uploadedFile ? (
                /* Drag Drop active state */
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                    dragActive 
                      ? "border-blue-500 bg-blue-50/20 scale-[1.01]" 
                      : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
                  }`}
                  id="csv-drag-drop-zone"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-500 shadow-3xs">
                    <Upload className="h-6 w-6 stroke-[1.5]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-850">{t.dragDropLabel}</p>
                    <span className="text-[10px] text-slate-450 block mt-1">{t.maxSizeLabel}</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* File Loaded status indicator */}
                  <div className="border border-blue-200 bg-blue-50/20 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-600 border border-blue-200">
                        <FileSpreadsheet className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block select-none uppercase tracking-wider">{t.selectedFile}</span>
                        <p className="text-xs font-bold text-slate-800 font-mono mt-0.5">{uploadedFile.name}</p>
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {(uploadedFile.size / 1024).toFixed(1)} KB | {csvRawData.length} {isRtl ? "שורות" : "rows"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={resetFormState}
                      className="text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 px-4 py-1.5 rounded border border-slate-300 transition select-none cursor-pointer"
                    >
                      {t.replaceFile}
                    </button>
                  </div>

                  {/* Manual file encoding selector override */}
                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                        {isRtl ? "ניהול קידוד קובץ ה-CSV" : "CSV File Encoding Settings"}
                      </span>
                      <p className="text-[10px] text-slate-450 leading-normal">
                        {isRtl 
                          ? `מערכת מנסה לפענח אוטומטית. זוהה בפועל: ${detectedEncoding === "windows-1255" ? "Windows-1255 He (Excel)" : detectedEncoding}` 
                          : `System performs auto-detection. Applied: ${detectedEncoding}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEncodingChange("auto")}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition select-none cursor-pointer ${
                          encoding === "auto"
                            ? "bg-blue-650 text-white border-blue-650 shadow-3xs"
                            : "bg-white text-slate-650 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isRtl ? "זיהוי אוטומטי (מומלץ)" : "Auto-detect"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEncodingChange("UTF-8")}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition select-none cursor-pointer ${
                          encoding === "UTF-8"
                            ? "bg-blue-650 text-white border-blue-650 shadow-3xs"
                            : "bg-white text-slate-650 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        UTF-8
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEncodingChange("windows-1255")}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition select-none cursor-pointer ${
                          encoding === "windows-1255"
                            ? "bg-blue-650 text-white border-blue-650 shadow-3xs"
                            : "bg-white text-slate-650 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {isRtl ? "קידוד עברי (Excel CSV / Windows-1255)" : "Hebrew (Excel / Windows-1255)"}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {fileError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-3xs">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}
            </div>

            {/* SECTION 3: CSV Preview (display first 20 rows) */}
            {csvRawData.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs animate-fadeIn" id="step-3-csv-preview">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-150 text-slate-700 text-[11px] font-mono font-extrabold rounded-full flex items-center justify-center">3</span>
                  {t.previewTitle}
                </h2>

                {/* CSV Grid with independent horizontal scrolling and no page overflow */}
                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-3xs">
                  <div className="overflow-x-auto w-full max-w-full">
                    <table className="w-full text-xs font-medium border-collapse text-right min-w-[500px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 text-slate-450 text-[10px] text-center w-12 border-l border-slate-200 font-mono">Row</th>
                          {csvHeaders.map((header, idx) => (
                            <th key={idx} className="px-3 py-2 text-[10px] font-mono border-l border-slate-200 last:border-l-0 text-slate-705">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 bg-white">
                        {csvPreviewRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-slate-50 font-medium">
                            <td className="px-3 py-1.5 text-center text-slate-400 font-mono border-l border-slate-150 bg-slate-50/50">
                              {rowIdx + 2}
                            </td>
                            {csvHeaders.map((_, colIdx) => (
                              <td key={colIdx} className="px-3 py-1.5 font-mono text-slate-650 border-l border-slate-150 last:border-l-0 truncate max-w-xs unicode-bidi">
                                {row[colIdx] || <span className="text-slate-350 italic">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedTable === "items" && (
                  <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                    <button
                      type="button"
                      onClick={runValidation}
                      className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-6 rounded-lg transition duration-150 shadow-sm cursor-pointer min-h-[38px]"
                    >
                      <ArrowRightLeft className="h-4 w-4 text-sky-400" />
                      <span>{isRtl ? "הרץ בדיקת תקינות והמשך" : "Perform Dry-Run Validation & Proceed"}</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 4: Column Mapping */}
            {csvRawData.length > 0 && selectedTable !== "items" && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs animate-fadeIn" id="step-4-column-mapping">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-150 text-slate-700 text-[11px] font-mono font-extrabold rounded-full flex items-center justify-center">4</span>
                  {t.columnMappingTitle}
                </h2>

                <div className="space-y-4">
                  {dbFields.map((field) => {
                    const isMapped = !!columnMappings[field.name];
                    return (
                      <div 
                        key={field.name} 
                        className={`p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition ${
                          isMapped 
                            ? "bg-slate-50/50 border-slate-200" 
                            : field.isMandatory 
                              ? "bg-rose-50/20 border-rose-150" 
                              : "bg-white border-slate-200"
                        }`}
                      >
                        {/* Field DB identification */}
                        <div>
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                            <span>{isRtl ? field.labelHe : field.labelEn}</span>
                            {field.isMandatory && (
                              <span className="text-red-500 font-bold" title="מנדטורי לחלוטין">
                                {t.requiredAsterisk}
                              </span>
                            )}
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                            Type: {field.type} | SQL Column: <code className="font-bold text-[#2563EB]">{field.name}</code>
                          </span>
                        </div>

                        {/* Mapped select selector */}
                        <div className="w-full md:w-64">
                          <select
                            value={columnMappings[field.name] || ""}
                            onChange={(e) => handleMappingChange(field.name, e.target.value)}
                            className={`w-full text-xs font-medium bg-white rounded border p-2 focus:ring-2 focus:ring-blue-500/10 focus:border-[#2563EB] outline-none ${
                              isMapped ? "border-slate-350 text-slate-800" : "border-rose-300 text-rose-800 font-semibold"
                            }`}
                          >
                            <option value="">{t.notMapped}</option>
                            {csvHeaders.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dry Run simulation validation buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={runValidation}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-6 rounded-lg transition duration-150 shadow-sm cursor-pointer min-h-[38px]"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-sky-400" />
                    <span>{t.runValidationBtn}</span>
                  </button>
                </div>
              </div>
            )}

            {/* SECTION 5: Dry-Run Diagnostics Report */}
            {isValidated && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs animate-fadeIn space-y-4" id="step-5-validation-results">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-150 text-slate-700 text-[11px] font-mono font-extrabold rounded-full flex items-center justify-center">5</span>
                  {t.validationResults}
                </h2>

                {validationPassed ? (
                  /* Compliant Dry run pass */
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold">{t.validationPassedMsg}</p>
                      <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">
                        {isRtl 
                          ? "אימוץ קטלוג: כל פריטי המק\"ט וסוגי המאפיינים מאומתים במלואם." 
                          : "Referential values: all composite keys successfully bound."}
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Failed dry run transaction. Rollbacked completely. */
                  <div className="space-y-4">
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
                      <XCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold">{t.validationFailedMsg}</p>
                        <span className="text-[10px] text-rose-500 block mt-1 font-semibold">
                          {isRtl 
                            ? `שגיאות סכמה שדווחו: ${validationErrors.length} רשומות אינן תואמות. טעינה מוגנת.` 
                            : `Referential violations reported: ${validationErrors.length} rows conflict with constraints.`}
                        </span>
                      </div>
                    </div>

                    {/* Download report button panel */}
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 gap-4">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {isRtl ? "מומלץ להוריד את הדוח ולתקן את המקור לפני העלאה מחדש." : "Export the error ledger to adjust matching offsets."}
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadErrorReport}
                        className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 px-4 rounded transition cursor-pointer select-none"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>{t.downloadReportBtn}</span>
                      </button>
                    </div>

                    {/* Quick diagnostic inline logs grid (up to 5 fails) */}
                    <div className="border border-slate-150 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      <table className="w-full text-xs font-medium border-collapse text-right">
                        <thead className="bg-slate-100 text-slate-500 font-bold border-b border-gray-150">
                          <tr>
                            <th className="px-3 py-1.5 text-center w-16">{t.errOriginalRow}</th>
                            <th className="px-3 py-1.5">{t.errDesc}</th>
                            <th className="px-3 py-1.5 w-24">{t.errVal}</th>
                            <th className="px-3 py-1.5 h-8">{t.errCorrection}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {validationErrors.slice(0, 10).map((err, idx) => (
                            <tr key={idx} className="hover:bg-rose-50/20 font-medium">
                              <td className="px-3 py-1.5 text-center text-slate-400 font-mono bg-slate-50/50 border-l border-slate-150">
                                {err.row}
                              </td>
                              <td className="px-3 py-1.5 text-slate-700 font-semibold text-[11px]">{err.desc}</td>
                              <td className="px-3 py-1.5 text-rose-700 font-mono truncate max-w-xs">{err.val || <span className="text-slate-350 italic">EMPTY</span>}</td>
                              <td className="px-3 py-1.5 text-slate-500 text-[11px]">{err.correction}</td>
                            </tr>
                          ))}
                          {validationErrors.length > 10 && (
                            <tr>
                              <td colSpan={4} className="px-3 py-2 text-center text-slate-400 text-[10px] bg-slate-50">
                                {isRtl 
                                  ? `ועוד ${validationErrors.length - 10} שגיאות נוספות. הורד את הדוח המלא לצפייה בכולן.` 
                                  : `And ${validationErrors.length - 10} more rows are invalid. Export detailed report.`}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 6: Select Import Mode & Execute Commit */}
            {isValidated && validationPassed && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs animate-fadeIn space-y-4 font-sans" id="step-6-commit-controls">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 mb-2 flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-150 text-slate-700 text-[11px] font-mono font-extrabold rounded-full flex items-center justify-center">6</span>
                  {t.importModeTitle}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Mode Selector Option A: APPEND */}
                  <button
                    type="button"
                    onClick={() => setImportMode("APPEND")}
                    className={`p-4 rounded-xl border text-right transition cursor-pointer select-none flex flex-col h-24 justify-between hover:scale-[1.01] ${
                      importMode === "APPEND"
                        ? "bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold text-slate-900">{t.modeAppend}</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        importMode === "APPEND" ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300"
                      }`}>
                        {importMode === "APPEND" && <Check className="h-2 w-2 stroke-[3]" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-2 select-none">
                      {t.appendDesc}
                    </span>
                  </button>

                  {/* Mode Selector Option B: UPDATE */}
                  <button
                    type="button"
                    onClick={() => setImportMode("UPDATE")}
                    className={`p-4 rounded-xl border text-right transition cursor-pointer select-none flex flex-col h-24 justify-between hover:scale-[1.01] ${
                      importMode === "UPDATE"
                        ? "bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="text-xs font-bold text-slate-900">{t.modeUpdate}</span>
                      <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                        importMode === "UPDATE" ? "border-blue-500 bg-blue-500 text-white" : "border-gray-300"
                      }`}>
                        {importMode === "UPDATE" && <Check className="h-2 w-2 stroke-[3]" />}
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-500 block leading-tight mt-2 select-none">
                      {t.updateDesc}
                    </span>
                  </button>
                </div>

                {/* Final Trigger Execute button */}
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="button"
                    onClick={executeImportTransaction}
                    className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-extrabold text-sm py-3 px-8 rounded-xl transition duration-155 shadow-md cursor-pointer select-none min-h-[46px]"
                  >
                    <Play className="h-4 w-4 fill-white text-white shrink-0" />
                    <span>{t.confirmExecute}</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT CHOP: Informational sidebar column (Span 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Guide Info Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-4">
              <h3 className="text-xs uppercase font-extrabold tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-blue-400 shrink-0" />
                <span>{isRtl ? "מדריך טעינת קטלוג קובץ" : "CSV Structure Cheat Sheet"}</span>
              </h3>
              
              <div className="text-xs space-y-3 leading-relaxed text-slate-300">
                <p>
                  {isRtl 
                    ? "על מנת למנוע כשל טרנזקציה מלא בקובץ ה-CSV המיועד, ודא שהקובץ מבוסס על מפתחים חוקיים לפי הכללים:" 
                    : "To guarantee smooth database transactional integrations, structure rows according to rules:"}
                </p>

                <blockquote className="border-r-2 border-blue-500/50 pr-3 my-2 text-slate-400 bg-slate-850/50 p-2.5 rounded">
                  <span className="font-extrabold block text-white text-[11px] mb-1">
                    {selectedTable}
                  </span>
                  {selectedTable === "itemattributesmapping" ? (
                    <ul className="list-disc list-inside space-y-1 text-[10px]">
                      <li><strong className="text-white font-mono">SKU:</strong> {isRtl ? "מק\"ט קיים בקטלוג פריטי מחסן" : "Existing inventory identifier SKU"}</li>
                      <li><strong className="text-white font-mono">AttributeTypeId:</strong> {isRtl ? "מזהה מספר סריאלי או שם סוג מאפיין" : "Category integer index (1, 2) or Name"}</li>
                      <li><strong className="text-white font-mono">IsMandatory:</strong> {isRtl ? "ערך בוליאני 1/0, כן/לא" : "Boolean binary flag 1/0"}</li>
                    </ul>
                  ) : selectedTable === "itemattributeallowedvalues" ? (
                    <ul className="list-disc list-inside space-y-1 text-[10px]">
                      <li><strong className="text-white font-mono">SKU:</strong> {isRtl ? "מק\"ט מחסן משויך קיים" : "Existing SKU catalog ID"}</li>
                      <li><strong className="text-white font-mono">AttributeTypeId:</strong> {isRtl ? "מזהה משויך המוגדר כבר לפריט" : "Pre-defined base mapping type ID"}</li>
                      <li><strong className="text-white font-mono">AttributeValueId:</strong> {isRtl ? "מזהה מספר סריאלי או תיאור הערך המורשה" : "Pre-assigned global value description"}</li>
                    </ul>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-[10px]">
                      <li><strong className="text-white font-mono">SKU:</strong> {isRtl ? "מק\"ט ייחודי לפריט החדש/קיים" : "Unique identifier SKU catalog ID"}</li>
                      <li><strong className="text-white font-mono">NameHe / NameEn:</strong> {isRtl ? "שם פריט בעברית ובאנגלית" : "He/En names of item"}</li>
                      <li><strong className="text-white font-mono">Stock / Price:</strong> {isRtl ? "כמות במלאי ומחיר ליחידה" : "Inventory quantity & Price multiplier"}</li>
                    </ul>
                  )}
                </blockquote>

                <div className="flex bg-slate-850/60 p-3 rounded-lg text-[11px] text-slate-400 gap-2 items-start border border-slate-800">
                  <Info className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                  <p>
                    {isRtl 
                      ? "בדיקת המפתח הזר מופעלת קודם, ומבטיחה שאף ערך יתום (Orphaned Record) לא יוזרם למערכת." 
                      : "Foreign Keys are actively checked during validation to forbid orphaned values."}
                  </p>
                </div>
              </div>
            </div>

            {/* Existing Database Metrics counters */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-2xs space-y-4">
              <h3 className="text-xs uppercase font-extrabold text-slate-500 tracking-wider">
                {isRtl ? "מצב הנתונים הנוכחי במסד" : "Active Database Metrics"}
              </h3>

              <div className="space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs text-slate-600 border-b border-slate-100 pb-1.5">
                  <span className="font-semibold text-slate-500">{isRtl ? "סך הכל פריטים בקטלוג" : "Warehouse Stock items"}</span>
                  <span className="font-bold text-slate-800">{warehouseItems.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600 border-b border-slate-100 pb-1.5">
                  <span className="font-semibold text-slate-500">{isRtl ? "סיווגי מאפיינים מוגדרים" : "Registered Attribute categories"}</span>
                  <span className="font-bold text-slate-800">{attributeTypes.length}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600 pb-0.5">
                  <span className="font-semibold text-slate-500">{isRtl ? "שיוכי מאפיינים פעילים" : "Assigned Item mappings"}</span>
                  <span className="font-bold text-slate-800">{itemMappings.length}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* HISTORICAL REGISTRY OF RECENT TRANSACTION LOGS */}
      <div className="bg-white border border-slate-205 rounded-xl p-5 shadow-2xs space-y-4" id="historical-import-ledger">
        <div className="border-b border-slate-100 pb-3 flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-xs uppercase font-extrabold text-slate-800 tracking-wider flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{t.logsHeader}</span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono font-medium">Compliance Trail audit list</span>
        </div>

        {importLogs.length === 0 ? (
          <div className="py-6 text-center text-slate-400 italic text-xs">
            {isRtl ? "טרם בוצעו פעולות ייבוא קבצים בסבב הנוכחי." : "No file import logs available."}
          </div>
        ) : (() => {
          const totalLogItems = importLogs.length;
          const totalLogPages = Math.ceil(totalLogItems / rowsPerPage) || 1;
          const safeCurrentLogPage = Math.min(Math.max(currentPage, 1), totalLogPages);
          const indexOfLastLog = safeCurrentLogPage * rowsPerPage;
          const indexOfFirstLog = indexOfLastLog - rowsPerPage;
          const paginatedImportLogs = importLogs.slice(indexOfFirstLog, indexOfLastLog);
          
          const fromLogVal = totalLogItems === 0 ? 0 : indexOfFirstLog + 1;
          const toLogVal = Math.min(indexOfLastLog, totalLogItems);

          return (
            <div className="space-y-3">
              <div className="overflow-x-auto w-full max-w-full rounded-lg border border-slate-150">
                <table className="w-full text-xs font-semibold text-slate-700 text-right min-w-[700px]">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 text-center w-12 font-mono">#</th>
                      <th className="px-3 py-2">{isRtl ? "משתמש מבצע" : "Operator"}</th>
                      <th className="px-3 py-2">{isRtl ? "טבלת יעד" : "Table Name"}</th>
                      <th className="px-3 py-2 font-mono">{isRtl ? "שם קובץ" : "File Name"}</th>
                      <th className="px-3 py-2 text-center">{isRtl ? "מצב" : "Mode"}</th>
                      <th className="px-3 py-2 text-center font-mono">{isRtl ? "שורות" : "Rows"}</th>
                      <th className="px-3 py-2 text-center font-mono text-emerald-600">{isRtl ? "הצלחות" : "Success"}</th>
                      <th className="px-3 py-2 font-mono">{isRtl ? "זמן ריצה" : "Duration"}</th>
                      <th className="px-3 py-2">{isRtl ? "תאריך ושעה" : "Timestamp"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {paginatedImportLogs.map((log, index) => {
                      const globalIndex = indexOfFirstLog + index + 1;
                      return (
                        <tr key={log.logId} className="hover:bg-slate-50 last:border-b-0 font-medium">
                          <td className="px-3 py-2 text-center text-slate-400 font-mono bg-slate-50/20 border-l border-slate-150">
                            {globalIndex}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{log.userName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">ID: {log.userId} | {log.userRole}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-mono text-[11px] text-slate-650">{log.tableName}</td>
                          <td className="px-3 py-2 font-mono text-[11px] text-[#2563EB] max-w-xs truncate" title={log.fileName}>
                            {log.fileName}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              log.importMode === "APPEND" ? "bg-blue-50 text-[#2563EB] border border-blue-200" : "bg-purple-50 text-purple-700 border border-purple-200"
                            }`}>
                              {log.importMode}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono">{log.totalRows}</td>
                          <td className="px-3 py-2 text-center font-mono font-bold text-emerald-600">
                            {log.successCount}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500">{log.durationMs}ms</td>
                          <td className="px-3 py-2 text-slate-500 text-[10px] font-mono">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Data Exporter / Import Logs Pagination Controls */}
              <div 
                className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-slate-700 select-none font-sans"
                style={{ direction: isRtl ? "rtl" : "ltr" }}
                id="historical-logs-pagination"
              >
                {/* Rows Per Page choosing presets to default 10 */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-slate-500 font-semibold text-[11px]">
                    {isRtl ? "שורות לעמוד:" : "Rows per page:"}
                  </span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500/35 focus:border-blue-500 cursor-pointer shadow-sm font-mono"
                    id="logs-rows-per-page-select"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Statistics block showing mapped items: Showing 1-10 of 42 dataset rows */}
                <div className="font-semibold text-slate-600 text-center text-[11px]" id="logs-row-metrics">
                  {isRtl ? (
                    <span>
                      מציג <span className="font-mono text-blue-600 font-bold">{fromLogVal}-{toLogVal}</span> מתוך{" "}
                      <span className="font-mono text-slate-900 font-bold">{totalLogItems}</span> שורות יומן
                    </span>
                  ) : (
                    <span>
                      Showing <span className="font-mono text-blue-600 font-bold">{fromLogVal}-{toLogVal}</span> of{" "}
                      <span className="font-mono text-slate-900 font-bold">{totalLogItems}</span> dataset rows
                    </span>
                  )}
                </div>

                {/* Interactive Controls (Chevron SVGs) */}
                <div className="flex items-center gap-1 shrink-0 font-sans" id="logs-navigation-buttons">
                  {/* First Page */}
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentLogPage === 1}
                    className="p-1 rounded border border-slate-200 bg-white text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-slate-50"
                    title={isRtl ? "לעמוד הראשון" : "First Page"}
                    id="logs-nav-first"
                  >
                    {isRtl ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
                  </button>

                  {/* Prev Page */}
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={safeCurrentLogPage === 1}
                    className="p-1 rounded border border-slate-200 bg-white text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-slate-50"
                    title={isRtl ? "לעמוד הקודם" : "Previous Page"}
                    id="logs-nav-prev"
                  >
                    {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                  </button>

                  {/* Numeric page badges */}
                  <div className="flex items-center gap-0.5" id="logs-page-badges">
                    {Array.from({ length: totalLogPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return page === 1 || page === totalLogPages || Math.abs(page - safeCurrentLogPage) <= 1;
                      })
                      .map((page, idx, arr) => {
                        const elements = [];
                        if (idx > 0 && page - arr[idx - 1] > 1) {
                          elements.push(
                            <span key={`ellipse-logs-${page}`} className="px-0.5 text-slate-400 font-bold font-mono text-[11px]">
                              ...
                            </span>
                          );
                        }
                        elements.push(
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-6 h-6 flex items-center justify-center rounded border text-xxs font-mono font-bold transition select-none cursor-pointer ${
                              safeCurrentLogPage === page
                                ? "bg-blue-600 text-white border-blue-600 shadow-sm font-bold"
                                : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900"
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
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalLogPages))}
                    disabled={safeCurrentLogPage === totalLogPages}
                    className="p-1 rounded border border-slate-200 bg-white text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-slate-50"
                    title={isRtl ? "לעמוד הבא" : "Next Page"}
                    id="logs-nav-next"
                  >
                    {isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => setCurrentPage(totalLogPages)}
                    disabled={safeCurrentLogPage === totalLogPages}
                    className="p-1 rounded border border-slate-200 bg-white text-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-slate-50"
                    title={isRtl ? "לעמוד האחרון" : "Last Page"}
                    id="logs-nav-last"
                  >
                    {isRtl ? <ChevronsLeft className="h-3.5 w-3.5" /> : <ChevronsRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

            </div>
          );
        })()}
      </div>
    </div>
  );
};
