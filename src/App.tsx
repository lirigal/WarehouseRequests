import { useState, useEffect, useRef } from "react";
import { memoryStore } from "./lib/memoryStore";
import { 
  WarehouseItem, 
  AttributeType, 
  AttributeValue,
  ItemAttributeMapping, 
  WarehouseRequest, 
  AuditLogEntry, 
  Language, 
  AccessRole,
  AppUser,
  NipukRecord,
  ItemPictureUrl
} from "./types";
import { 
  initialWarehouseItems, 
  initialAttributeTypes, 
  initialItemAttributeMappings, 
  initialRequests, 
  initialAuditLogs,
  getProductImageUrl
} from "./data/mockItems";
import { ClearImageCache } from "./lib/imageService";
import { dbService } from "./services/dbService";
// @ts-ignore
import rawItemsCsv from "./data/items.csv?raw";
// @ts-ignore
import rawAttributesCsv from "./data/attributes.csv?raw";
// @ts-ignore
import rawItemAttributesMappingCsv from "./data/itemattributesmapping.csv?raw";
// @ts-ignore
import rawItemAttributeAllowedValuesCsv from "./data/itemattributeallowedvalues.csv?raw";
import { EnterpriseLayout } from "./components/EnterpriseLayout";
import { AttributesManagement } from "./components/AttributesManagement";
import { ItemMappingForm } from "./components/ItemMappingForm";
import { RequestForm } from "./components/RequestForm";
import { ArchitectHub } from "./components/ArchitectHub";
import { CatalogManagementForm } from "./components/CatalogManagementForm";
import { FinancialDataViewer } from "./components/FinancialDataViewer";
import { AuthScreen } from "./components/AuthScreen";
import { UserManagement } from "./components/UserManagement";
import { DispatchManagement } from "./components/DispatchManagement";
import { AdminDataExporter } from "./components/AdminDataExporter";
import { CSVImportManager } from "./components/CSVImportManager";
import { ProjectDocumentation } from "./components/ProjectDocumentation";
import { ClipboardList, Settings, Layers, History, Award, BookOpen, AlertCircle, FileSpreadsheet, Globe, Users, Truck, Database, Upload, FileText } from "lucide-react";

const SEED_USERS: AppUser[] = [
  {
    userId: "usr-111111111",
    teudatZehut: "111111111",
    firstName: "סבטלנה",
    lastName: "צ'רניצקי",
    jobTitle: "מנהל מחסן מורשה",
    phone: "0529876543",
    email: "svetlana.chr@agri.gov.il",
    passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f", // "password123"
    role: "ADMIN",
    isActive: true,
    createdDate: "2026-05-31T09:20:00Z",
    lastLoginDate: ""
  },
  {
    userId: "usr-123456789",
    teudatZehut: "123456789",
    firstName: "מירי",
    lastName: "יוספוב",
    jobTitle: 'טל"ת',
    phone: "0501234567",
    email: "miri.y@agri.gov.il",
    passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f", // "password123"
    role: "MANAGER",
    isActive: true,
    createdDate: "2026-05-31T09:00:00Z",
    lastLoginDate: ""
  },
  {
    userId: "usr-cohen",
    teudatZehut: "987654321",
    firstName: "משה",
    lastName: "כהן",
    jobTitle: "חוקר",
    phone: "0547654321",
    email: "dr.cohen@agri.gov.il",
    passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f", // "password123"
    role: "STAFF",
    isActive: true,
    createdDate: "2026-05-31T09:10:00Z",
    lastLoginDate: ""
  },
  {
    userId: "usr-222222222",
    teudatZehut: "222222222",
    firstName: "אלה",
    lastName: "וורדי",
    jobTitle: "מהנדסת",
    phone: "05411111111",
    email: "ela.v.@agri.gov.il",
    passwordHash: "ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f", // "password123"
    role: "STAFF",
    isActive: true,
    createdDate: "2026-06-01T07:30:00Z",
    lastLoginDate: ""
  }
];

export default function App() {
  // Global States
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const saved = memoryStore.getItem("agri_language");
    return (saved === "HE" || saved === "EN") ? saved : "HE";
  });

  // Load Users directly from Supabase only
  const [users, setUsers] = useState<AppUser[]>([]);

  // Current session user state
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    const saved = memoryStore.getItem("agri_current_user");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (parsed.teudatZehut === "111111111") {
            return {
              ...parsed,
              firstName: "סבטלנה",
              lastName: "צ'רניצקי",
              email: "svetlana.chr@agri.gov.il",
              role: "ADMIN"
            };
          }
          if (parsed.teudatZehut === "123456789") {
            return {
              ...parsed,
              firstName: "מירי",
              lastName: "יוספוב",
              email: "miri.y@agri.gov.il",
              role: "MANAGER"
            };
          }
          if (parsed.teudatZehut === "222222222") {
            return {
              ...parsed,
              firstName: "אלה",
              lastName: "וורדי",
              email: "ela.v.@agri.gov.il",
              phone: "05411111111",
              jobTitle: "מהנדסת",
              role: "STAFF"
            };
          }
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  // Derive access role automatically from currentUser profile
  const currentRole: AccessRole = currentUser ? currentUser.role : "STAFF";
  
// Parse items.csv dynamically on start
function parseItemsCsv(csvText: string): WarehouseItem[] {
  if (!csvText) return initialWarehouseItems;
  const lines = csvText.split(/\r?\n/);
  const items: WarehouseItem[] = [];
  
  // Headers: Parit,Teur_parit,Quantity,price_parit,Size,Shelf_Number,Teur_order,CategoryID,Related,ExpDate,incomeQuantity,DateStartStatistic
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line, handling potential quoted fields
    const parts: string[] = [];
    let insideQuote = false;
    let currentPart = "";
    
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        parts.push(currentPart);
        currentPart = "";
      } else {
        currentPart += char;
      }
    }
    parts.push(currentPart);
    
    const sku = parts[0] ? parts[0].trim() : "";
    if (!sku) continue;
    
    const teurParit = parts[1] ? parts[1].trim() : "";
    const quantity = parts[2] ? parts[2].trim() : "";
    const priceParit = parts[3] ? parts[3].trim() : "";
    const size = parts[4] ? parts[4].trim() : "";
    const shelfNumber = parts[5] ? parts[5].trim() : "";
    const teurOrder = parts[6] ? parts[6].trim() : "";
    
    // Find pre-defined mapping in initialWarehouseItems for robust category, unit, translations
    const existing = initialWarehouseItems.find(item => item.sku === sku);
    
    const stock = Number(quantity);
    const price = Number(priceParit);
    
    items.push({
      sku,
      nameHe: teurParit || (existing ? existing.nameHe : sku),
      nameEn: existing ? existing.nameEn : (teurOrder || sku),
      stock: isNaN(stock) ? 0 : stock,
      price: isNaN(price) ? 0 : price,
      shelf: shelfNumber || (existing ? existing.shelf : ""),
      categoryHe: existing ? existing.categoryHe : "ציוד כללי",
      categoryEn: existing ? existing.categoryEn : "General Supplies",
      unitHe: size || (existing ? existing.unitHe : "יחידה"),
      unitEn: existing ? existing.unitEn : "Unit"
    });
  }
  
  return items.length > 0 ? items : initialWarehouseItems;
}

function parseAttributesCsv(csvText: string): AttributeType[] {
  if (!csvText) return [];
  const lines = csvText.split(/\r?\n/);
  
  const headerLine = lines[0] ? lines[0].toLowerCase() : "";
  const cols = headerLine.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
  const typeHeIdx = cols.findIndex(c => c.includes("typenamehe") || c.includes("type_namehe") || c.includes("attribute_namehe") || c.includes("attributetype_namehe"));
  const typeEnIdx = cols.findIndex(c => c.includes("typenameen") || c.includes("type_nameen") || c.includes("attribute_nameen") || c.includes("attributetype_nameen"));
  const typeActiveIdx = cols.findIndex(c => c.includes("typeisactive") || c.includes("type_isactive") || c.includes("attribute_isactive") || c.includes("attributetype_isactive"));
  const valHeIdx = cols.findIndex(c => c.includes("value_he") || c.includes("valuehe") || c.includes("val_he") || c.includes("value_namehe") || c.includes("valhe"));
  const valEnIdx = cols.findIndex(c => c.includes("value_en") || c.includes("valueen") || c.includes("val_en") || c.includes("value_nameen") || c.includes("valen"));
  const valActiveIdx = cols.findIndex(c => c.includes("val_isactive") || c.includes("value_isactive") || c.includes("valactive") || c.includes("value_isactive") || c.includes("valueisactive"));

  const typeMap = new Map<string, { nameHe: string; nameEn: string; isActive: boolean; values: { valueHe: string; valueEn: string; isActive: boolean }[] }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts: string[] = [];
    let insideQuote = false;
    let currentPart = "";
    
    for (let charIndex = 0; charIndex < line.length; charIndex++) {
      const char = line[charIndex];
      if (char === '"') {
        if (insideQuote && charIndex + 1 < line.length && line[charIndex + 1] === '"') {
          currentPart += '"';
          charIndex++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        parts.push(currentPart);
        currentPart = "";
      } else {
        currentPart += char;
      }
    }
    parts.push(currentPart);

    const typeNameHe = parts[typeHeIdx !== -1 ? typeHeIdx : 0]?.trim();
    if (!typeNameHe) continue;

    const typeNameEn = parts[typeEnIdx !== -1 ? typeEnIdx : 1]?.trim() || typeNameHe;
    const typeActiveStr = parts[typeActiveIdx !== -1 ? typeActiveIdx : 2]?.trim().toUpperCase();
    const typeActive = typeActiveStr !== "FALSE";

    const valHe = parts[valHeIdx !== -1 ? valHeIdx : 3]?.trim() || "";
    const valEn = parts[valEnIdx !== -1 ? valEnIdx : 4]?.trim() || valHe;
    const valActiveStr = parts[valActiveIdx !== -1 ? valActiveIdx : 5]?.trim().toUpperCase();
    const valActive = valActiveStr !== "FALSE";

    const key = typeNameHe.toLowerCase();
    if (!typeMap.has(key)) {
      typeMap.set(key, {
        nameHe: typeNameHe,
        nameEn: typeNameEn,
        isActive: typeActive,
        values: []
      });
    }

    if (valHe) {
      const entry = typeMap.get(key)!;
      const valueExists = entry.values.some(v => v.valueHe.toLowerCase() === valHe.toLowerCase());
      if (!valueExists) {
        entry.values.push({
          valueHe: valHe,
          valueEn: valEn,
          isActive: valActive
        });
      }
    }
  }

  const result: AttributeType[] = [];
  typeMap.forEach((typeData) => {
    const cleanNameEn = typeData.nameEn.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase().replace(/_+/g, "_");
    const cleanNameHe = typeData.nameHe.replace(/[^\u0590-\u05FFa-zA-Z0-9]/g, "_").toLowerCase().replace(/_+/g, "_");
    const cleanId = `attr_imported_${cleanNameEn}_${cleanNameHe}`.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
    const typeId = cleanId;
    
    result.push({
      id: typeId,
      nameHe: typeData.nameHe,
      nameEn: typeData.nameEn,
      isActive: typeData.isActive,
      isDeleted: false,
      values: typeData.values.map((v, valIdx) => ({
        id: `val_${typeId}_${valIdx}`,
        typeId,
        valueHe: v.valueHe,
        valueEn: v.valueEn,
        isActive: v.isActive,
        isDeleted: false
      }))
    });
  });

  return result;
}

function parseInitialMappings(
  mappingCsvText: string,
  allowedValuesCsvText: string,
  attributeTypes: AttributeType[],
  warehouseItems: WarehouseItem[]
): ItemAttributeMapping[] {
  if (!mappingCsvText) return [];

  // 1. Parse itemattributesmapping.csv
  const mappingLines = mappingCsvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (mappingLines.length < 2) return [];

  const mappingHeader = mappingLines[0].toLowerCase();
  const mappingCols = mappingHeader.split(",").map(c => c.trim());
  const mSkuIdx = mappingCols.indexOf("sku");
  const mTypeIdIdx = mappingCols.findIndex(c => c.includes("attributetypeid") || c.includes("typeid"));
  const mIsMandatoryIdx = mappingCols.indexOf("ismandatory");

  // Keep a map of mappings: key = sku_typeId
  const mappingsMap = new Map<string, ItemAttributeMapping>();

  for (let i = 1; i < mappingLines.length; i++) {
    const line = mappingLines[i];
    const parts = line.split(",").map(p => p.trim().replace(/^["']|["']$/g, ""));
    const rawSku = parts[mSkuIdx !== -1 ? mSkuIdx : 0];
    const rawTypeId = parts[mTypeIdIdx !== -1 ? mTypeIdIdx : 1];
    const rawIsMandatory = parts[mIsMandatoryIdx !== -1 ? mIsMandatoryIdx : 2];

    if (!rawSku || !rawTypeId) continue;

    // Resolve Type
    let targetType: AttributeType | undefined;
    const typeIntIndex = parseInt(rawTypeId, 10);
    if (!isNaN(typeIntIndex) && typeIntIndex > 0 && typeIntIndex <= attributeTypes.length) {
      targetType = attributeTypes[typeIntIndex - 1];
    } else {
      // Find by ID match
      targetType = attributeTypes.find(t => t.id.toLowerCase() === rawTypeId.toLowerCase());
    }

    if (!targetType) continue;

    // Standardize SKU length/format by matching warehouseItems if possible
    const matchedItem = warehouseItems.find(item => item.sku.trim() === rawSku.trim() || parseInt(item.sku, 10) === parseInt(rawSku, 10));
    const finalSku = matchedItem ? matchedItem.sku : rawSku;

    const isMandatory = rawIsMandatory.toUpperCase() === "TRUE";

    const key = `${finalSku}_${targetType.id}`;
    mappingsMap.set(key, {
      itemId: finalSku,
      typeId: targetType.id,
      isMandatory: isMandatory,
      allowedValueIds: []
    });
  }

  // 2. Parse itemattributeallowedvalues.csv
  if (allowedValuesCsvText) {
    const allowedLines = allowedValuesCsvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (allowedLines.length >= 2) {
      const allowedHeader = allowedLines[0].toLowerCase();
      const allowedCols = allowedHeader.split(",").map(c => c.trim());
      const aSkuIdx = allowedCols.indexOf("sku");
      const aTypeIdIdx = allowedCols.findIndex(c => c.includes("attributetypeid") || c.includes("typeid"));
      const aValueIdIdx = allowedCols.findIndex(c => c.includes("attributevalueid") || c.includes("valueid"));

      for (let i = 1; i < allowedLines.length; i++) {
        const line = allowedLines[i];
        const parts = line.split(",").map(p => p.trim().replace(/^["']|["']$/g, ""));
        const rawSku = parts[aSkuIdx !== -1 ? aSkuIdx : 0];
        const rawTypeId = parts[aTypeIdIdx !== -1 ? aTypeIdIdx : 1];
        const rawValueId = parts[aValueIdIdx !== -1 ? aValueIdIdx : 2];

        if (!rawSku || !rawTypeId || !rawValueId) continue;

        // Resolve Type
        let targetType: AttributeType | undefined;
        const typeIntIndex = parseInt(rawTypeId, 10);
        if (!isNaN(typeIntIndex) && typeIntIndex > 0 && typeIntIndex <= attributeTypes.length) {
          targetType = attributeTypes[typeIntIndex - 1];
        } else {
          targetType = attributeTypes.find(t => t.id.toLowerCase() === rawTypeId.toLowerCase());
        }

        if (!targetType) continue;

        const matchedItem = warehouseItems.find(item => item.sku.trim() === rawSku.trim() || parseInt(item.sku, 10) === parseInt(rawSku, 10));
        const finalSku = matchedItem ? matchedItem.sku : rawSku;

        const key = `${finalSku}_${targetType.id}`;
        const mapping = mappingsMap.get(key);

        if (mapping) {
          // Resolve standard attribute value ID using global counter or direct match
          let matchedValId: string | null = null;
          let globalCounter = 1;

          // Sequential index resolution mirroring CSVImportManager rules
          attributeTypes.forEach((t) => {
            t.values.forEach((v) => {
              if (t.id === targetType!.id && globalCounter === parseInt(rawValueId, 10)) {
                if (v.isActive && !v.isDeleted) {
                  matchedValId = v.id;
                }
              }
              globalCounter++;
            });
          });

          // Fallback if not found by index
          if (!matchedValId) {
            const activeValues = targetType.values.filter(v => v.isActive && !v.isDeleted);
            const directMatch = activeValues.find(v => v.id.toLowerCase() === rawValueId.toLowerCase());
            if (directMatch) {
              matchedValId = directMatch.id;
            }
          }

          if (matchedValId && !mapping.allowedValueIds.includes(matchedValId)) {
            mapping.allowedValueIds.push(matchedValId);
          }
        }
      }
    }
  }

  return Array.from(mappingsMap.values());
}

  // Database mock tables
  const [warehouseItems, setWarehouseItems] = useState<WarehouseItem[]>([]);
  const [itemPictureUrls, setItemPictureUrls] = useState<ItemPictureUrl[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeType[]>([]);
  const [itemMappings, setItemMappings] = useState<ItemAttributeMapping[]>([]);
  const [activeRequests, setActiveRequests] = useState<WarehouseRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [nipukRecords, setNipukRecords] = useState<NipukRecord[]>([]);

  // Excel sync tracker states
  const [excelImportCount, setExcelImportCount] = useState<number>(0);
  const [lastImportTime, setLastImportTime] = useState<string | null>(null);

  // Active Menu Tab state
  const [activeTab, setActiveTab] = useState<"REQUEST_SHEET" | "CATALOG" | "MAPPING" | "ATTRIBS" | "ARCHITECT_SPEC" | "FINANCIAL_DATA" | "USER_MANAGEMENT" | "DISPATCH" | "NIPUK_LOG" | "EXPORT_DATA" | "CSV_IMPORT" | "DOCS">(() => {
    const saved = memoryStore.getItem("agri_active_tab");
    const allowed = ["REQUEST_SHEET", "CATALOG", "MAPPING", "ATTRIBS", "ARCHITECT_SPEC", "FINANCIAL_DATA", "USER_MANAGEMENT", "DISPATCH", "NIPUK_LOG", "EXPORT_DATA", "CSV_IMPORT", "DOCS"];
    return allowed.includes(saved || "") ? (saved as any) : "REQUEST_SHEET";
  });

  const [defaultMappingSku, setDefaultMappingSku] = useState<string | null>(null);

  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const initialLoadDoneRef = useRef(false);

  // Async cloud database sync initialization
  const initializeDatabase = async () => {
    try {
      console.log("🔄 Initializing cloud database connections...");
      setDbError(null);
      setIsInitialLoading(true);

      // Load users
      let cloudUsers = [];
      try {
        cloudUsers = await dbService.users.getAll(SEED_USERS);
      } catch (err) {
        console.error("Failed to load users from Supabase:", err);
        cloudUsers = SEED_USERS;
      }

      // Load main collections with individual try/catch blocks for resilience
      let cloudItems: WarehouseItem[] = [];
      try {
        cloudItems = await dbService.items.getAll([]);
      } catch (err) {
        console.error("Failed to load warehouse items from Supabase:", err);
      }

      let cloudImages: ItemPictureUrl[] = [];
      try {
        cloudImages = await dbService.images.getAll([]);
      } catch (err) {
        console.error("Failed to load item picture URLs from Supabase:", err);
      }

      let cloudAttribs: AttributeType[] = [];
      try {
        cloudAttribs = await dbService.attributes.getAll([]);
      } catch (err) {
        console.error("Failed to load attribute types from Supabase:", err);
      }

      let cloudMappings: ItemAttributeMapping[] = [];
      try {
        cloudMappings = await dbService.mappings.getAll([]);
      } catch (err) {
        console.error("Failed to load item mappings from Supabase:", err);
      }

      let cloudRequests: WarehouseRequest[] = [];
      try {
        cloudRequests = await dbService.requests.getAll([]);
      } catch (err) {
        console.error("Failed to load warehouse requests from Supabase:", err);
      }

      let cloudAudit: AuditLogEntry[] = [];
      try {
        cloudAudit = await dbService.auditLogs.getAll([]);
      } catch (err) {
        console.error("Failed to load audit logs from Supabase:", err);
      }

      let cloudNipuk: NipukRecord[] = [];
      try {
        cloudNipuk = await dbService.nipukRecords.getAll([]);
      } catch (err) {
        console.error("Failed to load nipuk records from Supabase:", err);
      }

      // Auto-Seed if database is completely empty:
      if (cloudItems.length === 0) {
        console.log("Seeding Supabase with initial CSV catalog data...");
        const csvBaseItems = parseItemsCsv(rawItemsCsv);
        await dbService.items.saveAll(csvBaseItems);
        cloudItems = csvBaseItems;
      }
      if (cloudImages.length === 0) {
        console.log("Seeding Supabase with initial product images...");
        const seedUrls: ItemPictureUrl[] = [];
        cloudItems.forEach((item, index) => {
          const generatedUrl = getProductImageUrl(item.sku, item.nameEn, item.categoryEn);
          seedUrls.push({
            id: `pic-init-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            sku: item.sku,
            imageUrl: generatedUrl,
            imageSource: "Unsplash Pre-defined",
            isPrimary: true,
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
            createdBy: "system@agri.gov.il",
            updatedBy: "system@agri.gov.il",
            isActive: true
          });
        });
        await dbService.images.saveAll(seedUrls);
        cloudImages = seedUrls;
      }
      if (cloudAttribs.length === 0) {
        console.log("Seeding Supabase with initial attribute types...");
        const csvBaseAttributes = parseAttributesCsv(rawAttributesCsv);
        const seedAttribs = csvBaseAttributes.length > 0 ? csvBaseAttributes : initialAttributeTypes;
        await dbService.attributes.saveAll(seedAttribs);
        cloudAttribs = seedAttribs;
      }
      if (cloudMappings.length === 0) {
        console.log("Seeding Supabase with initial item attribute mappings...");
        const csvBaseAttributes = parseAttributesCsv(rawAttributesCsv);
        const initialMappings = parseInitialMappings(
          rawItemAttributesMappingCsv,
          rawItemAttributeAllowedValuesCsv,
          csvBaseAttributes.length > 0 ? csvBaseAttributes : initialAttributeTypes,
          cloudItems
        );
        if (initialMappings.length > 0) {
          await dbService.mappings.saveAll(initialMappings);
          cloudMappings = initialMappings;
        }
      }

      setUsers(cloudUsers);
      setWarehouseItems(cloudItems);
      setItemPictureUrls(cloudImages);
      setAttributeTypes(cloudAttribs);
      setItemMappings(cloudMappings);
      setActiveRequests(cloudRequests);
      setAuditLogs(cloudAudit);
      setNipukRecords(cloudNipuk);
      console.log("✅ Database initialized successfully!");
    } catch (err: any) {
      console.error("❌ Database initialization failed:", err);
      setDbError(err?.message || "Critical error: Failed to establish connection to Supabase database.");
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    initializeDatabase();
  }, []);

  // Delay setting initialLoadDoneRef.current to true to bypass initial load state-settling phase
  useEffect(() => {
    if (!isInitialLoading) {
      const timer = setTimeout(() => {
        initialLoadDoneRef.current = true;
        console.log("⚡ Database syncing active");
      }, 500);
      return () => clearTimeout(timer);
    } else {
      initialLoadDoneRef.current = false;
    }
  }, [isInitialLoading]);

  // memoryStore persistence
  useEffect(() => {
    memoryStore.setItem("agri_language", currentLanguage);
  }, [currentLanguage]);

  // Keep users updated in Supabase (No local storage cache)
  useEffect(() => {
    if (initialLoadDoneRef.current && users.length > 0) {
      dbService.users.saveAll(users).catch(err => {
        console.error("Error saving users to database:", err);
      });
    }
  }, [users]);

  // Keep current user session saved
  useEffect(() => {
    if (currentUser) {
      memoryStore.setItem("agri_current_user", JSON.stringify(currentUser));
    } else {
      memoryStore.removeItem("agri_current_user");
    }
  }, [currentUser]);

  useEffect(() => {
    memoryStore.setItem("agri_active_tab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      dbService.nipukRecords.saveAll(nipukRecords).catch(err => console.error(err));
    }
  }, [nipukRecords]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      dbService.items.saveAll(warehouseItems).catch(err => console.error(err));
    }
  }, [warehouseItems]);

  useEffect(() => {
    ClearImageCache();
    if (initialLoadDoneRef.current) {
      dbService.images.saveAll(itemPictureUrls).catch(err => console.error(err));
    }
  }, [itemPictureUrls]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      dbService.attributes.saveAll(attributeTypes).catch(err => console.error(err));
    }
  }, [attributeTypes]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      dbService.mappings.saveAll(itemMappings).catch(err => console.error(err));
    }
  }, [itemMappings]);

  useEffect(() => {
    if (initialLoadDoneRef.current) {
      dbService.requests.saveAll(activeRequests).catch(err => console.error(err));
    }
  }, [activeRequests]);

  // Force redirection off restricted tabs for STAFF users
  useEffect(() => {
    if (currentUser && currentUser.role === "STAFF") {
      if (activeTab === "MAPPING" || activeTab === "ATTRIBS" || activeTab === "USER_MANAGEMENT" || activeTab === "DISPATCH" || activeTab === "NIPUK_LOG" || activeTab === "EXPORT_DATA" || activeTab === "CSV_IMPORT" || activeTab === "DOCS") {
        setActiveTab("REQUEST_SHEET");
      }
    }
  }, [currentUser, activeTab]);

  const isRtl = currentLanguage === "HE";

  // LOG ACTION Utility Helper
  const logDatabaseAction = (
    actionType: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN",
    tableName: string,
    oldValue: string,
    newValue: string
  ) => {
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}`,
      userId: currentUser ? currentUser.email : "guest@agri.gov.il",
      userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "Guest User",
      actionType,
      tableName,
      oldValue,
      newValue,
      actionDate: new Date().toISOString()
    };
    setAuditLogs((prev) => [newEntry, ...prev]);
    
    // Save to cloud directly and individually for high reliability
    dbService.auditLogs.create(newEntry).catch(err => {
      console.error("Failed to save audit log to Supabase:", err);
    });
  };

  // User Registration Callback
  const handleRegisterUser = async (newUser: AppUser): Promise<string | null> => {
    const exists = users.some(u => u.teudatZehut === newUser.teudatZehut);
    if (exists) {
      return isRtl 
        ? "שגיאה: מספר תעודת זהות כבר קיים במערכת" 
        : "Error: Teudat Zehut number already registered.";
    }

    setUsers((prev) => [...prev, newUser]);

    logDatabaseAction(
      "CREATE",
      "Users",
      "",
      `Registered user profile: ${newUser.firstName} ${newUser.lastName} (${newUser.jobTitle}, ID: ${newUser.teudatZehut})`
    );

    return null;
  };

  // User Login Callback
  const handleLoginUser = async (tz: string, passwordHash: string): Promise<{ success: boolean; error?: string }> => {
    const user = users.find(u => u.teudatZehut === tz);
    if (!user) {
      return { success: false, error: isRtl ? "משתמש לא נמצא במערכת" : "User profile not found." };
    }

    if (user.passwordHash !== passwordHash) {
      return { success: false, error: isRtl ? "סיסמה לא נכונה" : "Incorrect password." };
    }

    if (!user.isActive) {
      return { success: false, error: isRtl ? "משתמש זה מושבת כעת" : "User profile is inactive." };
    }

    const updatedUser = {
      ...user,
      lastLoginDate: new Date().toISOString()
    };

    setUsers(prev => prev.map(u => u.teudatZehut === tz ? updatedUser : u));
    setCurrentUser(updatedUser);
    if (updatedUser.role === "STAFF") {
      setActiveTab("REQUEST_SHEET");
    }

    logDatabaseAction(
      "UPDATE",
      "Users",
      `Last login: ${user.lastLoginDate || "NEVER"}`,
      `User ${user.firstName} ${user.lastName} successfully logged in.`
    );

    return { success: true };
  };

  // User Logout Callback
  const handleLogoutUser = () => {
    if (currentUser) {
      logDatabaseAction(
        "UPDATE",
        "Users",
        `LoggedIn: ${currentUser.firstName} ${currentUser.lastName}`,
        `User logged out cleanly.`
      );
    }
    setCurrentUser(null);
  };

  // Administrative updates on users and permissions
  const handleUpdateUserObj = (updatedUser: AppUser) => {
    setUsers((prev) => prev.map((u) => u.userId === updatedUser.userId ? updatedUser : u));
    if (currentUser && currentUser.userId === updatedUser.userId) {
      setCurrentUser(updatedUser);
    }
    logDatabaseAction(
      "UPDATE",
      "Users",
      JSON.stringify(users.find((u) => u.userId === updatedUser.userId) || ""),
      `Admin updated user profile: ${updatedUser.firstName} ${updatedUser.lastName} (Role: ${updatedUser.role}, Status: ${updatedUser.isActive ? "ACTIVE" : "BLOCKED"})`
    );
  };

  const handleAddUserObj = (newUserObj: AppUser): string | null => {
    const exists = users.some((u) => u.teudatZehut === newUserObj.teudatZehut);
    if (exists) {
      return isRtl 
        ? "שגיאה: מספר תעודת זהות כבר קיים במערכת." 
        : "Error: Teudat Zehut number already registered.";
    }
    setUsers((prev) => [...prev, newUserObj]);
    logDatabaseAction(
      "CREATE",
      "Users",
      "",
      `Admin enrolled new employee profile: ${newUserObj.firstName} ${newUserObj.lastName} as ${newUserObj.role}`
    );
    return null;
  };

  // Secure Item Image Management callbacks (ADMIN / MANAGER only, enforcing server-like auth rule)
  const handleAddPictureUrl = (sku: string, url: string, isPrimary: boolean, source: string = "Manual Input") => {
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER")) {
      throw new Error(isRtl ? "שגיאה: גישה נדחתה. רק מנהל או אדמין רשאי לעדכן נתוני תמונות." : "Access denied: Only ADMIN or MANAGER can modify image records.");
    }
    const cleanSku = sku.trim();
    setItemPictureUrls((prev) => {
      const updated = [...prev];
      if (isPrimary) {
        // Enforce: only one primary active image can exist per SKU
        updated.forEach((p) => {
          if (p.sku === cleanSku) p.isPrimary = false;
        });
      }
      updated.push({
        id: `pic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        sku: cleanSku,
        imageUrl: url.trim(),
        imageSource: source,
        isPrimary: isPrimary,
        createdDate: new Date().toISOString(),
        updatedDate: new Date().toISOString(),
        createdBy: currentUser.email,
        updatedBy: currentUser.email,
        isActive: true,
      });
      return updated;
    });

    logDatabaseAction(
      "CREATE",
      "itempictureurls",
      "",
      `Added image record for SKU ${cleanSku}. URL: ${url.trim()} (Primary: ${isPrimary})`
    );
  };

  const handleUpdatePictureUrl = (id: string, url: string, isPrimary: boolean, isActive: boolean) => {
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER")) {
      throw new Error(isRtl ? "שגיאה: גישה נדחתה. רק מנהל או אדמין רשאי לעדכן נתוני תמונות." : "Access denied: Only ADMIN or MANAGER can modify image records.");
    }
    
    setItemPictureUrls((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      const sku = target.sku;

      return prev.map((p) => {
        let isPrim = p.isPrimary;
        if (p.id === id) {
          isPrim = isPrimary;
        } else if (isPrimary && p.sku === sku) {
          isPrim = false;
        }

        if (p.id === id) {
          return {
            ...p,
            imageUrl: url.trim(),
            isPrimary: !isActive ? false : isPrimary, // primary can't be active if row is inactive
            isActive: isActive,
            updatedDate: new Date().toISOString(),
            updatedBy: currentUser.email,
          };
        }
        return {
          ...p,
          isPrimary: isPrim,
        };
      });
    });

    logDatabaseAction(
      "UPDATE",
      "itempictureurls",
      `ID: ${id}`,
      `Updated image record. URL: ${url.trim()} (Primary: ${isPrimary}, Active: ${isActive})`
    );
  };

  const handleDeletePictureUrl = (id: string) => {
    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER")) {
      throw new Error(isRtl ? "שגיאה: גישה נדחתה. רק מנהל או אדמין רשאי לעדכן נתוני תמונות." : "Access denied: Only ADMIN or MANAGER can modify image records.");
    }
    
    setItemPictureUrls((prev) => prev.filter((p) => p.id !== id));

    logDatabaseAction(
      "DELETE",
      "itempictureurls",
      `ID: ${id}`,
      "Deleted image record from database."
    );
  };

  // 1. Simulating Daily Live Excel Upload without overriding attributes metadata mapping
  const handleImportExcel = () => {
    // Modify slightly stock quantity / prices to represent incoming real ERP data feed
    setWarehouseItems((prevItems) => {
      return prevItems.map((item) => {
        // slightly fluctuate stock levels and prices logically
        const stockDiff = Math.floor(Math.random() * 20) - 5;
        const newStock = Math.max(2, item.stock + stockDiff);
        const priceFluc = parseFloat((item.price * (1 + (Math.random() * 0.04 - 0.02))).toFixed(2));
        return {
          ...item,
          stock: newStock,
          price: priceFluc
        };
      });
    });

    setExcelImportCount((c) => c + 1);
    const dateFormatted = new Date().toLocaleTimeString(isRtl ? "he-IL" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    setLastImportTime(dateFormatted);

    // Write audit logger entry
    logDatabaseAction(
      "UPDATE",
      "Items",
      "Daily cron triggers excel sync job",
      `Refreshed pricing/stock for physical items. SKU mapping preserved. Mappings count: ${itemMappings.length}`
    );
  };

  // 2. Add Attribute Type method (Active Directory Admin only, unique name validator)
  const handleAddAttributeType = (nameHe: string, nameEn: string): { error: string | null; newId: string | null } => {
    // Unique name validation checks
    const exists = attributeTypes.some(
      (t) => (!t.isDeleted) && (t.nameHe.toLowerCase() === nameHe.toLowerCase() || t.nameEn.toLowerCase() === nameEn.toLowerCase())
    );

    if (exists) {
      const errorMsg = isRtl 
        ? "שגיאת ולידציה: שם מאפיין זה (עברי או אנגלי) כבר קיים במערכת." 
        : "Validation Error: This attribute name (Hebrew or English) already exists.";
      return { error: errorMsg, newId: null };
    }

    const newType: AttributeType = {
      id: `attr_${Date.now()}_${Math.floor(Math.random() * 10000000)}_${Math.random().toString(36).substring(2, 7)}`,
      nameHe,
      nameEn,
      isActive: true,
      isDeleted: false,
      values: []
    };

    setAttributeTypes((prev) => [...prev, newType]);
    logDatabaseAction("CREATE", "AttributeTypes", "", `Created Type ID: ${newType.id} ('${nameHe}' / '${nameEn}')`);
    return { error: null, newId: newType.id };
  };

  const handleToggleTypeActive = (typeId: string) => {
    setAttributeTypes((prev) =>
      prev.map((t) => (t.id === typeId ? { ...t, isActive: !t.isActive } : t))
    );
  };

  const handleDeleteType = (typeId: string) => {
    const target = attributeTypes.find((t) => t.id === typeId);
    if (!target) return;

    // Soft delete implementation: set isDeleted=true
    setAttributeTypes((prev) =>
      prev.map((t) => (t.id === typeId ? { ...t, isDeleted: true } : t))
    );

    // Cascading clean up mappings for deleted types
    setItemMappings((prev) => prev.filter((m) => m.typeId !== typeId));

    logDatabaseAction(
      "DELETE",
      "AttributeTypes",
      `Type ID: ${typeId} ('${target.nameHe}') active mapping deleted`,
      "Soft deleted attribute type and cleared active mapping dependencies for all SKUs."
    );
  };

  // 3. Add Attribute Value (Uniqueness per Type, Active Values only selectable)
  const handleAddAttributeValue = (typeId: string, valHe: string, valEn: string): string | null => {
    const targetType = attributeTypes.find((t) => t.id === typeId);
    if (!targetType) return "Category not found";

    // Uniqueness validation within same category type
    const exists = targetType.values.some(
      (v) => !v.isDeleted && (v.valueHe.toLowerCase() === valHe.toLowerCase() || v.valueEn.toLowerCase() === valEn.toLowerCase())
    );

    if (exists) {
      return isRtl 
        ? "שגיאה: ערך מאפיין זה כבר קיים בקטגוריה זו." 
        : "Error: This variant value already exists in this categories type.";
    }

    const newValue: AttributeValue = {
      id: `val_${Date.now()}_${Math.floor(Math.random() * 10000000)}_${Math.random().toString(36).substring(2, 7)}`,
      typeId,
      valueHe: valHe,
      valueEn: valEn,
      isActive: true,
      isDeleted: false
    };

    setAttributeTypes((prev) =>
      prev.map((t) => {
        if (t.id === typeId) {
          return {
            ...t,
            values: [...t.values, newValue]
          };
        }
        return t;
      })
    );

    logDatabaseAction(
      "CREATE",
      "AttributeValues",
      "",
      `Added value '${valHe}' / '${valEn}' to Type: ${targetType.nameHe} (${typeId})`
    );

    return null;
  };

  const handleToggleValueActive = (valId: string) => {
    setAttributeTypes((prev) =>
      prev.map((t) => ({
        ...t,
        values: t.values.map((v) => (v.id === valId ? { ...v, isActive: !v.isActive } : v))
      }))
    );
  };

  const handleDeleteValue = (valId: string) => {
    const isMapped = itemMappings.some((m) => m.allowedValueIds.includes(valId));
    if (isMapped) {
      alert(isRtl 
        ? "שגיאה: לא ניתן למחוק ערך זה מכיוון שהוא משויך לפריט בקטלוג." 
        : "Error: Cannot delete this value because it is associated with a catalog item."
      );
      return;
    }

    setAttributeTypes((prev) =>
      prev.map((t) => ({
        ...t,
        values: t.values.map((v) => (v.id === valId ? { ...v, isDeleted: true } : v))
      }))
    );
    logDatabaseAction("DELETE", "AttributeValues", `Value ID: ${valId}`, "Soft deleted attribute variant value.");
  };

  // 4. Save/Assign items mapping (Checkbox, Select All, Mandatory flags, Validate)
  const handleSaveItemMapping = (
    sku: string,
    typeId: string,
    isMandatory: boolean,
    allowedValueIds: string[]
  ): string | null => {
    const existingMatch = itemMappings.some((m) => m.itemId === sku && m.typeId === typeId);
    let oldValStr = "";

    // If no values are selected, we treat it as disconnecting/deleting the mapping completely.
    if (allowedValueIds.length === 0) {
      if (existingMatch) {
        const itemMappingToRemoved = itemMappings.find((m) => m.itemId === sku && m.typeId === typeId);
        oldValStr = JSON.stringify(itemMappingToRemoved);
        setItemMappings((prev) => prev.filter((m) => !(m.itemId === sku && m.typeId === typeId)));

        const targetItemName = warehouseItems.find((i) => i.sku === sku)?.nameHe || sku;
        const targetTypeName = attributeTypes.find((t) => t.id === typeId)?.nameHe || typeId;
        logDatabaseAction(
          "DELETE",
          "ItemAttributeMapping",
          oldValStr,
          `Disconnected/Deleted mapping of SKU: ${sku} (${targetItemName}) from Type: ${typeId} (No values selected)`
        );
      }
      return null;
    }

    if (existingMatch) {
      oldValStr = JSON.stringify(itemMappings.find((m) => m.itemId === sku && m.typeId === typeId));
      setItemMappings((prev) =>
        prev.map((m) =>
          m.itemId === sku && m.typeId === typeId
            ? { ...m, isMandatory, allowedValueIds }
            : m
        )
      );
    } else {
      const newMapping: ItemAttributeMapping = {
        itemId: sku,
        typeId,
        isMandatory,
        allowedValueIds
      };
      setItemMappings((prev) => [...prev, newMapping]);
    }

    const targetItemName = warehouseItems.find((i) => i.sku === sku)?.nameHe || sku;
    const targetTypeName = attributeTypes.find((t) => t.id === typeId)?.nameHe || typeId;

    logDatabaseAction(
      "ASSIGN",
      "ItemAttributeMapping",
      oldValStr,
      `Mapped SKU: ${sku} (${targetItemName}) to Type: ${targetTypeName}. IsMandatory: ${isMandatory}, Allowed Value IDs: [${allowedValueIds.join(", ")}]`
    );

    return null;
  };

  const handleDeleteItemMapping = (sku: string, typeId: string) => {
    const existing = itemMappings.find((m) => m.itemId === sku && m.typeId === typeId);
    if (!existing) return;
    const oldValStr = JSON.stringify(existing);
    setItemMappings((prev) => prev.filter((m) => !(m.itemId === sku && m.typeId === typeId)));

    const targetItemName = warehouseItems.find((i) => i.sku === sku)?.nameHe || sku;
    const targetTypeName = attributeTypes.find((t) => t.id === typeId)?.nameHe || typeId;

    logDatabaseAction(
      "DELETE",
      "ItemAttributeMapping",
      oldValStr,
      `Force disconnected full mapping or SKU: ${sku} (${targetItemName}) from Type: ${typeId}`
    );
  };

  // 5. Create Request dynamic fulfillment selection handling
  const handleCreateRequest = (
    sku: string,
    quantity: number,
    selectedAttributeValueId: string
  ): { error?: string; request?: WarehouseRequest } => {
    const item = warehouseItems.find((i) => i.sku === sku);
    if (!item) return { error: "Item Sku not found" };

    // Stock verification
    if (item.stock < quantity) {
      return {
        error: isRtl 
          ? `חריגת כמות: המלאי הנתון במחסן הוא ${item.stock} יחידות בלבד.` 
          : `Insufficient stock: There are only ${item.stock} pieces available in the warehouse.`
      };
    }

    // Retrieve selected attribute texts
    let attributeTypeId = "";
    let attributeTypeNameHe = "";
    let attributeTypeNameEn = "";
    let attributeValueId = "";
    let attributeValueNameHe = "";
    let attributeValueNameEn = "";

    if (selectedAttributeValueId) {
      const ids = selectedAttributeValueId.split(",").map(id => id.trim()).filter(Boolean);
      const selectedTypes: string[] = [];
      const selectedTypeNamesHe: string[] = [];
      const selectedTypeNamesEn: string[] = [];
      const selectedValIds: string[] = [];
      const selectedValNamesHe: string[] = [];
      const selectedValNamesEn: string[] = [];

      for (const id of ids) {
        for (const type of attributeTypes) {
          const foundVal = type.values.find((v) => v.id === id);
          if (foundVal) {
            selectedTypes.push(type.id);
            selectedTypeNamesHe.push(type.nameHe);
            selectedTypeNamesEn.push(type.nameEn);
            selectedValIds.push(foundVal.id);
            selectedValNamesHe.push(foundVal.valueHe);
            selectedValNamesEn.push(foundVal.valueEn);
            break;
          }
        }
      }

      attributeTypeId = selectedTypes.join(", ");
      attributeTypeNameHe = selectedTypeNamesHe.join(", ");
      attributeTypeNameEn = selectedTypeNamesEn.join(", ");
      attributeValueId = selectedValIds.join(", ");
      attributeValueNameHe = selectedValNamesHe.join(", ");
      attributeValueNameEn = selectedValNamesEn.join(", ");
    }

    const newRequest: WarehouseRequest = {
      requestId: `WR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      sku,
      itemNameHe: item.nameHe,
      itemNameEn: item.nameEn,
      quantityRequested: quantity,
      attributeTypeId,
      attributeTypeNameHe,
      attributeTypeNameEn,
      attributeValueId,
      attributeValueNameHe,
      attributeValueNameEn,
      requestDate: new Date().toISOString(),
      requestedBy: currentUser ? currentUser.email : "guest@agri.gov.il",
      statusHe: "ממתין לניפוק מהיר",
      statusEn: "Pending Warehouse Dispatch"
    };

    // Deduct stock values logically
    setWarehouseItems((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, stock: i.stock - quantity } : i))
    );

    // Save request
    setActiveRequests((prev) => [newRequest, ...prev]);

    logDatabaseAction(
      "CREATE",
      "WarehouseRequests",
      "",
      `Submitted Checkout Request ID: ${newRequest.requestId} for SKU ${sku} (${quantity} units)` +
      (attributeValueNameHe ? ` with specified Variant: ${attributeValueNameHe}` : "")
    );

    return { request: newRequest };
  };

  // Add a NIPUK record with custom audits
  const handleAddNipukRecord = (record: NipukRecord) => {
    setNipukRecords((prev) => [record, ...prev]);

    logDatabaseAction(
      "CREATE",
      "NipukRecords",
      "",
      `Created NIPUK Record ${record.nipukId}: Customer ${record.customerName}, Dispatched by ${record.workerName} (${record.workerRole})`
    );
  };

  // Delete a NIPUK record with custom audits
  const handleDeleteNipukRecord = (nipukId: string) => {
    const record = nipukRecords.find(r => r.nipukId === nipukId);
    setNipukRecords((prev) => prev.filter((r) => r.nipukId !== nipukId));

    logDatabaseAction(
      "DELETE",
      "NipukRecords",
      JSON.stringify(record || ""),
      `Deleted NIPUK Record ${nipukId} by Administrator/Manager: ${currentUser?.firstName} ${currentUser?.lastName}`
    );
  };

  // Handle order dispatch from warehouse ("Nipuk")
  const handleDispatchExecute = (
    requestId: string,
    workerEmail: string,
    workerName: string,
    collectorName: string,
    dispatchDate: string
  ) => {
    setActiveRequests((prev) =>
      prev.map((req) =>
        req.requestId === requestId
          ? {
              ...req,
              statusHe: "בוצע - נופק וסופק בהצלחה",
              statusEn: "Dispatched Successfully",
              dispatchedByWorker: workerName,
              collectorName: collectorName,
              dispatchDate: dispatchDate
            }
          : req
      )
    );

    // Save actual log entry for audit log trail
    const reqObj = activeRequests.find((r) => r.requestId === requestId);
    const itemName = reqObj ? reqObj.itemNameHe : "";

    logDatabaseAction(
      "UPDATE",
      "WarehouseRequests",
      JSON.stringify(reqObj || ""),
      `Dispatched Request ID: ${requestId} for SKU ${reqObj?.sku} (${itemName}). Collector: ${collectorName}, Dispatched by: ${workerName} at ${dispatchDate}`
    );
  };

  // Localized tabs styling labels
  const tabs = {
    requestTab: isRtl ? "טופס הזמנה ודרישות" : "New Request Form",
    catalogTab: isRtl ? "קטלוג פריטים" : "Item Catalog",
    financialTab: isRtl ? "נתונים פיננסיים (BOI)" : "Financial Data (BOI)",
    mappingTab: isRtl ? "שיוך מאפיינים למק\"ט" : "Edit Item Mappings",
    attribsTab: isRtl ? "ניהול סוגי מאפיינים" : "Attribute Types",
    specsTab: isRtl ? "ארגז קוד .NET וארכיטקטורה" : "C# & SQL Source Code"
  };

  if (dbError) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white font-sans p-6" id="db-error-container">
        <div className="bg-red-500/10 border border-red-500/30 p-6 rounded-lg max-w-md text-center" id="db-error-box">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold mb-2 text-red-400 tracking-tight" id="db-error-title">
            {isRtl ? "שגיאה בחיבור לבסיס הנתונים" : "Database Connection Failure"}
          </h2>
          <p className="text-sm text-gray-400 mb-6" id="db-error-desc">
            {dbError}
          </p>
          <button
            onClick={() => {
              setIsInitialLoading(true);
              initializeDatabase();
            }}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded transition cursor-pointer select-none"
            id="db-retry-button"
          >
            {isRtl ? "נסה שוב" : "Retry Connection"}
          </button>
        </div>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center text-white font-sans p-6" id="db-loading-container">
        <div className="w-16 h-16 border-4 border-[#2563EB] border-t-transparent border-r-transparent rounded-full animate-spin mb-6" id="db-loading-spinner"></div>
        <h2 className="text-xl font-bold mb-2 tracking-tight" id="db-loading-title">
          {isRtl ? "מנער מערכות ומסנכרן בסיס נתונים..." : "Initializing Database Synchronization..."}
        </h2>
        <p className="text-sm text-gray-400 max-w-sm text-center" id="db-loading-desc">
          {isRtl 
            ? "מתחבר לשרת וסונכרן נתוני מלאי, הרשאות משתמשים ויומן ניפוקים." 
            : "Establishing secure connection. Synchronizing stock levels, attributes configuration, and dispatch logs."}
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthScreen
        currentLanguage={currentLanguage}
        setLanguage={setCurrentLanguage}
        users={users}
        onRegister={handleRegisterUser}
        onLogin={handleLoginUser}
      />
    );
  }

  return (
    <EnterpriseLayout
      currentLanguage={currentLanguage}
      currentRole={currentRole}
      setLanguage={setCurrentLanguage}
      onImportExcel={handleImportExcel}
      excelImportCount={excelImportCount}
      lastImportTime={lastImportTime}
      currentUser={currentUser}
      onLogout={handleLogoutUser}
    >
      
      {/* Primary tab switcher bar */}
      <div className="flex flex-wrap bg-[#1F2937] text-gray-350 rounded border border-gray-700 overflow-hidden mb-6 gap-y-0.5">
        
        {/* Tab 1: Submit Request Sheet (AddRequest.aspx) */}
        <button
          onClick={() => setActiveTab("REQUEST_SHEET")}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer ${
            activeTab === "REQUEST_SHEET"
              ? "bg-[#2563EB] text-white"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          <ClipboardList className="h-4 w-4 shrink-0" />
          {tabs.requestTab}
        </button>

        {/* Tab 1.6: Financial Exchange Rates (FinancialData.aspx simulation) */}
        <button
          onClick={() => setActiveTab("FINANCIAL_DATA")}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
            activeTab === "FINANCIAL_DATA"
              ? "bg-[#2563EB] text-white"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          <Globe className="h-4 w-4 shrink-0 text-emerald-400" />
          <span className={activeTab === "FINANCIAL_DATA" ? "text-white" : "text-emerald-300"}>
            {tabs.financialTab}
          </span>
        </button>

        {/* Tab 1.5: Item Catalog (Catalog management and daily uploads) */}
        <button
          onClick={() => setActiveTab("CATALOG")}
          className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
            activeTab === "CATALOG"
              ? "bg-[#2563EB] text-white"
              : "text-gray-300 hover:bg-gray-800"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          {tabs.catalogTab}
        </button>

        {/* Tab 1.8: Order Dispatch controls (WarehouseDispatch.aspx) */}
        {currentRole !== "STAFF" && (
          <button
            onClick={() => setActiveTab("DISPATCH")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
              activeTab === "DISPATCH"
                ? "bg-[#2563EB] text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Truck className="h-4 w-4 shrink-0 text-amber-400" />
            <span className={activeTab === "DISPATCH" ? "text-white" : "text-amber-300"}>
              {isRtl ? "ניפוק הזמנות (מחסן)" : "Dispatch Orders"}
            </span>
          </button>
        )}

        {/* Tab 1.9: Nipuk Log registry summary */}
        {currentRole !== "STAFF" && (
          <button
            onClick={() => setActiveTab("NIPUK_LOG")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
              activeTab === "NIPUK_LOG"
                ? "bg-[#2563EB] text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <ClipboardList className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className={activeTab === "NIPUK_LOG" ? "text-white" : "text-emerald-300"}>
              {isRtl ? "יומן ניפוקים" : "NIPUK Log"}
            </span>
          </button>
        )}

        {/* Tab 2: Item mapping screen - Edit Item Map */}
        {currentRole !== "STAFF" && (
          <button
            onClick={() => setActiveTab("MAPPING")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
              activeTab === "MAPPING"
                ? "bg-[#2563EB] text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {tabs.mappingTab}
          </button>
        )}

        {/* Tab 3: Core attributes types setup (ItemAttributes.aspx) */}
        {currentRole !== "STAFF" && (
          <button
            onClick={() => setActiveTab("ATTRIBS")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
              activeTab === "ATTRIBS"
                ? "bg-[#2563EB] text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            {tabs.attribsTab}
          </button>
        )}

        {/* Tab 4: Direct Admin Users Controls (Active Directory setup) */}
        {currentRole === "ADMIN" && (
          <button
            onClick={() => setActiveTab("USER_MANAGEMENT")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
              activeTab === "USER_MANAGEMENT"
                ? "bg-slate-700 text-white"
                : "text-rose-300 hover:bg-gray-800"
            }`}
          >
            <Users className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{isRtl ? "ניהול משתמשים והרשאות" : "Users & Permissions"}</span>
          </button>
        )}

        {/* Tab 4.5: Admin Database CSV Exporter */}
        {currentRole === "ADMIN" && (
          <button
            onClick={() => setActiveTab("EXPORT_DATA")}
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
              activeTab === "EXPORT_DATA"
                ? "bg-amber-600 text-white"
                : "text-amber-300 hover:bg-gray-800"
            }`}
          >
            <Database className="h-4 w-4 shrink-0 text-amber-400" />
            <span>{isRtl ? "ייצוא נתוני DB (CSV)" : "DB CSV Exporter"}</span>
          </button>
        )}

        {/* Tab 4.6: Admin/Manager Database CSV Importer */}
        {(currentRole === "ADMIN" || currentRole === "MANAGER") && (
          <button
            onClick={() => setActiveTab("CSV_IMPORT")}
            id="csv-import-tab-btn"
            className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
              activeTab === "CSV_IMPORT"
                ? "bg-blue-600 text-white"
                : "text-blue-300 hover:bg-gray-800"
            }`}
          >
            <Upload className="h-4 w-4 shrink-0 text-blue-400" />
            <span>{isRtl ? "ייבוא נתוני מאפיינים (CSV)" : "CSV Attribute Import"}</span>
          </button>
        )}

        {/* Tab 5: Technical Source Code Directory (C#/SQL) */}
        <div className="grow flex justify-end items-center">
          {currentRole !== "STAFF" && (
            <button
              onClick={() => setActiveTab("DOCS")}
              id="project-documentation-tab-btn"
              className={`flex items-center gap-2 py-3 px-5 text-xs font-bold transition select-none cursor-pointer border-l border-gray-700/80 ${
                activeTab === "DOCS"
                  ? "bg-[#2563EB] text-white"
                  : "text-gray-300 hover:bg-gray-800"
              }`}
            >
              <FileText className="h-4 w-4 shrink-0 text-blue-400" />
              <span>{isRtl ? "תיעוד המערכת" : "Project Documentation"}</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab("ARCHITECT_SPEC")}
            className={`flex items-center gap-2 py-3 px-6 text-xs font-extrabold transition select-none cursor-pointer border-l border-gray-700/80 ${
              activeTab === "ARCHITECT_SPEC"
                ? "bg-amber-500 text-slate-950"
                : "bg-slate-950 text-amber-500 hover:bg-gray-900"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            {tabs.specsTab}
          </button>
        </div>

      </div>

      {/* Render matching views based on selected Tab */}
      <div className="transition-all duration-300">
        
        {activeTab === "REQUEST_SHEET" && (
          <RequestForm
            currentLanguage={currentLanguage}
            currentUserEmail={currentUser ? currentUser.email : "guest@agri.gov.il"}
            currentUserRole={currentUser ? currentUser.role : "STAFF"}
            warehouseItems={warehouseItems}
            attributeTypes={attributeTypes}
            itemMappings={itemMappings}
            activeRequests={activeRequests}
            onCreateRequest={handleCreateRequest}
            itemPictureUrls={itemPictureUrls}
          />
        )}

        {activeTab === "FINANCIAL_DATA" && (
          <FinancialDataViewer
            currentLanguage={currentLanguage}
            currentRole={currentRole}
            currentUser={currentUser}
          />
        )}

        {activeTab === "CATALOG" && (
          <CatalogManagementForm
            currentLanguage={currentLanguage}
            currentRole={currentRole}
            warehouseItems={warehouseItems}
            setWarehouseItems={setWarehouseItems}
            attributeTypes={attributeTypes}
            itemMappings={itemMappings}
            itemPictureUrls={itemPictureUrls}
            onAddPictureUrl={handleAddPictureUrl}
            onUpdatePictureUrl={handleUpdatePictureUrl}
            onDeletePictureUrl={handleDeletePictureUrl}
            onSkuClick={(sku) => {
              setDefaultMappingSku(sku);
              setActiveTab("MAPPING");
            }}
            currentUser={currentUser}
          />
        )}

        {activeTab === "DISPATCH" && currentUser && (
          <DispatchManagement
            currentLanguage={currentLanguage}
            currentUser={currentUser}
            activeRequests={activeRequests}
            nipukRecords={nipukRecords}
            onAddNipukRecord={handleAddNipukRecord}
            onDeleteNipukRecord={handleDeleteNipukRecord}
            onDispatchRequestUpdate={handleDispatchExecute}
            mode="form"
            users={users}
            warehouseItems={warehouseItems}
            itemPictureUrls={itemPictureUrls}
          />
        )}

        {activeTab === "NIPUK_LOG" && currentUser && (
          <DispatchManagement
            currentLanguage={currentLanguage}
            currentUser={currentUser}
            activeRequests={activeRequests}
            nipukRecords={nipukRecords}
            onAddNipukRecord={handleAddNipukRecord}
            onDeleteNipukRecord={handleDeleteNipukRecord}
            onDispatchRequestUpdate={handleDispatchExecute}
            mode="log"
            users={users}
            warehouseItems={warehouseItems}
            itemPictureUrls={itemPictureUrls}
          />
        )}

        {activeTab === "MAPPING" && currentRole !== "STAFF" && (
          <ItemMappingForm
             currentLanguage={currentLanguage}
             currentRole={currentRole}
             warehouseItems={warehouseItems}
             attributeTypes={attributeTypes}
             itemMappings={itemMappings}
             saveItemMapping={handleSaveItemMapping}
             deleteItemMapping={handleDeleteItemMapping}
             setWarehouseItems={setWarehouseItems}
             defaultSelectedSku={defaultMappingSku}
             itemPictureUrls={itemPictureUrls}
          />
        )}

        {activeTab === "ATTRIBS" && currentRole !== "STAFF" && (
          <AttributesManagement
            currentLanguage={currentLanguage}
            currentRole={currentRole}
            attributeTypes={attributeTypes}
            itemMappings={itemMappings}
            addAttributeType={handleAddAttributeType}
            toggleTypeActive={handleToggleTypeActive}
            deleteType={handleDeleteType}
            selectedTypeId={attributeTypes.length > 0 ? attributeTypes[0].id : null} // initial selected fallback
            setSelectedTypeId={() => {}} // Controlled selection handled locally in AttributesManagement
            addAttributeValue={handleAddAttributeValue}
            toggleValueActive={handleToggleValueActive}
            deleteValue={handleDeleteValue}
            setAttributeTypes={setAttributeTypes}
            currentUser={currentUser}
          />
        )}

        {activeTab === "DOCS" && (
          <ProjectDocumentation
            currentLanguage={currentLanguage}
            currentRole={currentRole}
          />
        )}

        {activeTab === "ARCHITECT_SPEC" && (
          <ArchitectHub
            currentLanguage={currentLanguage}
          />
        )}

        {activeTab === "USER_MANAGEMENT" && currentUser && currentUser.role === "ADMIN" && (
          <UserManagement
            currentLanguage={currentLanguage}
            users={users}
            onUpdateUser={handleUpdateUserObj}
            onAddUser={handleAddUserObj}
            currentUser={currentUser}
          />
        )}

        {activeTab === "EXPORT_DATA" && currentUser && currentUser.role === "ADMIN" && (
          <AdminDataExporter
            currentLanguage={currentLanguage}
            attributeTypes={attributeTypes}
            itemMappings={itemMappings}
            activeRequests={activeRequests}
            auditLogs={auditLogs}
            warehouseItems={warehouseItems}
            itemPictureUrls={itemPictureUrls}
            users={users}
            nipukRecords={nipukRecords}
            currentUser={currentUser}
            onRefreshDatabase={initializeDatabase}
          />
        )}

        {activeTab === "CSV_IMPORT" && currentUser && (currentUser.role === "ADMIN" || currentUser.role === "MANAGER") && (
          <CSVImportManager
            currentLanguage={currentLanguage}
            currentUser={currentUser}
            warehouseItems={warehouseItems}
            attributeTypes={attributeTypes}
            itemMappings={itemMappings}
            setItemMappings={setItemMappings}
            logDatabaseAction={logDatabaseAction}
            setWarehouseItems={setWarehouseItems}
            itemPictureUrls={itemPictureUrls}
            setItemPictureUrls={setItemPictureUrls}
            activeRequests={activeRequests}
            auditLogs={auditLogs}
            users={users}
            nipukRecords={nipukRecords}
            addAttributeType={handleAddAttributeType}
            toggleTypeActive={handleToggleTypeActive}
            deleteType={handleDeleteType}
            addAttributeValue={handleAddAttributeValue}
            toggleValueActive={handleToggleValueActive}
            deleteValue={handleDeleteValue}
            setAttributeTypes={setAttributeTypes}
          />
        )}

      </div>

    </EnterpriseLayout>
  );
}
