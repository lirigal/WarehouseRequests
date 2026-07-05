import React, { useState, useEffect } from "react";
import { AttributeType, AttributeValue, Language, AccessRole, ItemAttributeMapping, AppUser } from "../types";
import { 
  Layers, 
  Plus, 
  Power, 
  Trash2, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  Download, 
  Upload, 
  Search, 
  Edit, 
  Save, 
  X, 
  Maximize2, 
  Minimize2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";

interface AttributesManagementProps {
  currentLanguage: Language;
  currentRole: AccessRole;
  attributeTypes: AttributeType[];
  itemMappings?: ItemAttributeMapping[];
  addAttributeType: (nameHe: string, nameEn: string) => { error: string | null; newId: string | null }; // Returns error and new ID
  toggleTypeActive: (typeId: string) => void;
  deleteType: (typeId: string) => void;
  selectedTypeId: string | null;
  setSelectedTypeId: (id: string | null) => void;
  addAttributeValue: (typeId: string, valHe: string, valEn: string) => string | null; // Returns error if duplicate
  toggleValueActive: (valId: string) => void;
  deleteValue: (valId: string) => void;
  setAttributeTypes: (types: AttributeType[]) => void;
  currentUser?: AppUser | null;
}

export const AttributesManagement: React.FC<AttributesManagementProps> = ({
  currentLanguage,
  currentRole,
  attributeTypes,
  itemMappings = [],
  addAttributeType,
  toggleTypeActive,
  deleteType,
  selectedTypeId,
  setSelectedTypeId,
  addAttributeValue,
  toggleValueActive,
  deleteValue,
  setAttributeTypes,
  currentUser
}) => {
  const isRtl = currentLanguage === "HE";
  const isAuthorized = currentRole === "ADMIN" || currentRole === "MANAGER";

  // Pagination State for Attribute Types Master Grid
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    try {
      const userKey = `volcani_attributes_rows_per_page_${currentUser?.id || "guest"}`;
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
      const userKey = `volcani_attributes_rows_per_page_${currentUser?.id || "guest"}`;
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
      const userKey = `volcani_attributes_rows_per_page_${currentUser?.id || "guest"}`;
      localStorage.setItem(userKey, String(rowsPerPage));
    } catch (e) {}
  }, [rowsPerPage, currentUser]);

  // Grid scroll expansion state (persisted)
  const [isGridExpanded, setIsGridExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("volcani_grid_scroll_mode");
      return saved ? JSON.parse(saved) === true : false;
    } catch (e) {
      return false;
    }
  });

  const handleToggleGridMode = () => {
    setIsGridExpanded(prev => {
      const nextVal = !prev;
      try {
        localStorage.setItem("volcani_grid_scroll_mode", JSON.stringify(nextVal));
      } catch (e) {
        console.error("Failed to save grid scroll state", e);
      }
      return nextVal;
    });
  };

  // Form states
  const [newTypeNameHe, setNewTypeNameHe] = useState("");
  const [newTypeNameEn, setNewTypeNameEn] = useState("");
  const [newValHe, setNewValHe] = useState("");
  const [newValEn, setNewValEn] = useState("");

  // Search filter
  const [typeSearchTerm, setTypeSearchTerm] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [typeSearchTerm]);

  // Inline editing states
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeNameHe, setEditTypeNameHe] = useState("");
  const [editTypeNameEn, setEditTypeNameEn] = useState("");

  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editValueHe, setEditValueHe] = useState("");
  const [editValueEn, setEditValueEn] = useState("");

  // Save changes handlers
  const handleSaveTypeEdit = (typeId: string) => {
    if (!editTypeNameHe.trim()) {
      alert(isRtl ? "אנא הזן שם תקין בעברית" : "Please insert a valid Hebrew name");
      return;
    }
    const updated = attributeTypes.map(t => {
      if (t.id === typeId) {
        return {
          ...t,
          nameHe: editTypeNameHe.trim(),
          nameEn: editTypeNameEn.trim() || editTypeNameHe.trim()
        };
      }
      return t;
    });
    setAttributeTypes(updated);
    setEditingTypeId(null);
  };

  const handleSaveValueEdit = (valId: string) => {
    if (!editValueHe.trim()) {
      alert(isRtl ? "אנא הזן ערך תקין בעברית" : "Please insert a valid Hebrew value");
      return;
    }
    const updated = attributeTypes.map(t => {
      const valIndex = t.values.findIndex(v => v.id === valId);
      if (valIndex !== -1) {
        const updatedVals = t.values.map(v => {
          if (v.id === valId) {
            return {
              ...v,
              valueHe: editValueHe.trim(),
              valueEn: editValueEn.trim() || editValueHe.trim()
            };
          }
          return v;
        });
        return { ...t, values: updatedVals };
      }
      return t;
    });
    setAttributeTypes(updated);
    setEditingValueId(null);
  };

  // Error/Success feedbacks
  const [typeError, setTypeError] = useState<string | null>(null);
  const [typeSuccess, setTypeSuccess] = useState<string | null>(null);
  const [valError, setValError] = useState<string | null>(null);
  const [valSuccess, setValSuccess] = useState<string | null>(null);
  const [typeInvalidField, setTypeInvalidField] = useState<"typeHe" | "typeEn" | "bothTypes" | null>(null);
  const [valInvalidField, setValInvalidField] = useState<"valHe" | "valEn" | "bothVals" | null>(null);

  // Custom master-detail workflow states
  const [newlyCreatedTypeId, setNewlyCreatedTypeId] = useState<string | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [loadedTypeId, setLoadedTypeId] = useState<string | null>(null);
  const [displayWarning, setDisplayWarning] = useState<string | null>(null);
  const [confirmDeleteValueId, setConfirmDeleteValueId] = useState<string | null>(null);
  const [confirmDeleteTypeId, setConfirmDeleteTypeId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState<boolean>(false);

  const selectedType = attributeTypes.find((t) => t.id === loadedTypeId && !t.isDeleted);

  // Paginate Attribute Types
  const activeTypes = attributeTypes
    .filter((t) => !t.isDeleted)
    .filter((t) => {
      if (!typeSearchTerm.trim()) return true;
      const term = typeSearchTerm.toLowerCase();
      return t.nameHe.toLowerCase().includes(term) || (t.nameEn || "").toLowerCase().includes(term);
    })
    .sort((a, b) => {
      // Display the newly created record first immediately after creation
      if (newlyCreatedTypeId) {
        if (a.id === newlyCreatedTypeId) return -1;
        if (b.id === newlyCreatedTypeId) return 1;
      }
      // Sort existing records alphabetically by language-appropriate name (ascending)
      const nameA = isRtl ? a.nameHe : (a.nameEn || a.nameHe);
      const nameB = isRtl ? b.nameHe : (b.nameEn || b.nameHe);
      return nameA.localeCompare(nameB, isRtl ? "he" : "en", { sensitivity: "base" });
    });

  const totalTypesCount = activeTypes.length;
  const totalPages = Math.ceil(totalTypesCount / rowsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const indexOfLastType = safeCurrentPage * rowsPerPage;
  const indexOfFirstType = indexOfLastType - rowsPerPage;
  const paginatedTypes = activeTypes.slice(indexOfFirstType, indexOfLastType);

  const fromTypeVal = totalTypesCount === 0 ? 0 : indexOfFirstType + 1;
  const toTypeVal = Math.min(indexOfLastType, totalTypesCount);

  const handleExportCsv = () => {
    const headers = [
      "AttributeType_NameHe",
      "AttributeType_NameEn",
      "AttributeType_IsActive",
      "Value_He",
      "Value_En",
      "Value_IsActive"
    ];

    const lines = [headers.join(",")];
    
    attributeTypes.filter(t => !t.isDeleted).forEach(t => {
      const activeVals = t.values.filter(v => !v.isDeleted);
      if (activeVals.length === 0) {
        const row = [
          `"${t.nameHe.replace(/"/g, '""')}"`,
          `"${t.nameEn.replace(/"/g, '""')}"`,
          t.isActive ? "true" : "false",
          "",
          "",
          ""
        ];
        lines.push(row.join(","));
      } else {
        activeVals.forEach(v => {
          const row = [
            `"${t.nameHe.replace(/"/g, '""')}"`,
            `"${t.nameEn.replace(/"/g, '""')}"`,
            t.isActive ? "true" : "false",
            `"${v.valueHe.replace(/"/g, '""')}"`,
            `"${v.valueEn.replace(/"/g, '""')}"`,
            v.isActive ? "true" : "false"
          ];
          lines.push(row.join(","));
        });
      }
    });

    const csvContent = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `attribute_types_and_values_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = event.target?.result as ArrayBuffer;
      if (!buffer) return;

      try {
        const uint8array = new Uint8Array(buffer);
        
        // Dynamic full verification decoder
        let decodedText = "";
        try {
          // Setting { fatal: true } on the UTF-8 decoder throws an error if it contains invalid byte sequences
          // (which is typical for Hebrew Windows-1255 or other ANSI non-Unicode CSV imports from Excel).
          const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
          decodedText = utf8Decoder.decode(uint8array);
        } catch (utf8Err) {
          // Fall back gracefully to decoding Hebrew Windows-1255 encoding
          const win1255Decoder = new TextDecoder("windows-1255");
          decodedText = win1255Decoder.decode(uint8array);
        }

        const lines = decodedText.split(/\r?\n/);
        if (lines.length <= 1) {
          alert(isRtl ? "קובץ CSV ריק או לא תקין" : "CSV file is empty or invalid");
          return;
        }

        const headerRow = lines[0].toLowerCase().replace(/^\uFEFF/, "");
        const columns = headerRow.split(",").map(c => c.trim().replace(/^["']|["']$/g, ""));
        
        // Highly precise header indexing to prevent overlapping matches (e.g. active matching both type active and value active)
        const typeHeIdx = columns.findIndex(c => 
          c.includes("attributetype_namehe") || 
          c.includes("type_namehe") || 
          c.includes("typenamehe") || 
          c.includes("typename_he") || 
          c.includes("attribute_namehe") ||
          c.includes("שם מאפיין") || 
          c.includes("שם_מאפיין") || 
          c.includes("מאפיין")
        );

        const typeEnIdx = columns.findIndex(c => 
          c.includes("attributetype_nameen") || 
          c.includes("type_nameen") || 
          c.includes("typenameen") || 
          c.includes("typename_en") || 
          c.includes("attribute_nameen")
        );

        let typeActiveIdx = columns.findIndex(c => 
          (c.includes("type") || c.includes("attribute")) && 
          (c.includes("active") || c.includes("status"))
        );
        if (typeActiveIdx === -1) {
          typeActiveIdx = columns.findIndex(c => c.includes("typeactive") || c.includes("פעיל מאפיין"));
        }

        const valHeIdx = columns.findIndex(c => 
          c.includes("value_he") || 
          c.includes("valuehe") || 
          c.includes("val_he") || 
          c.includes("valhe") || 
          c.includes("valuenamehe") || 
          c.includes("ערך")
        );

        const valEnIdx = columns.findIndex(c => 
          c.includes("value_en") || 
          c.includes("valueen") || 
          c.includes("val_en") || 
          c.includes("valen") || 
          c.includes("valuenameen")
        );

        let valActiveIdx = columns.findIndex(c => 
          (c.includes("value") || c.includes("val")) && 
          (c.includes("active") || c.includes("status")) &&
          !c.includes("type") && !c.includes("attribute")
        );
        if (valActiveIdx === -1) {
          valActiveIdx = columns.findIndex(c => c.includes("valactive") || c.includes("פעיל ערך") || c.includes("valueactive"));
        }

        const getIdx = (idx: number, def: number) => idx !== -1 ? idx : def;
        
        const typeHePos = getIdx(typeHeIdx, 0);
        const typeEnPos = getIdx(typeEnIdx, 1);
        const typeActivePos = getIdx(typeActiveIdx, 2);
        const valHePos = getIdx(valHeIdx, 3);
        const valEnPos = getIdx(valEnIdx, 4);
        const valActivePos = getIdx(valActiveIdx, 5);

        const typeMap = new Map<string, { id: string; nameHe: string; nameEn: string; isActive: boolean; values: { valueHe: string; valueEn: string; isActive: boolean }[] }>();

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const parts: string[] = [];
          let insideQuote = false;
          let currentPart = "";
          for (let charIndex = 0; charIndex < line.length; charIndex++) {
            const char = line[charIndex];
            if (char === '"') {
              // Custom look-ahead to properly parse escaped double quotes (e.g. "") inside quotes
              if (insideQuote && charIndex + 1 < line.length && line[charIndex + 1] === '"') {
                currentPart += '"';
                charIndex++; // skip the next quote
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

          const typeNameHe = parts[typeHePos] ? parts[typeHePos].trim().replace(/^["']|["']$/g, "") : "";
          if (!typeNameHe) continue;

          const typeNameEn = parts[typeEnPos] ? parts[typeEnPos].trim().replace(/^["']|["']$/g, "") : typeNameHe;
          const typeActiveStr = parts[typeActivePos] ? parts[typeActivePos].trim().toLowerCase() : "true";
          const typeActive = typeActiveStr === "true" || typeActiveStr === "1" || typeActiveStr === "active" || typeActiveStr === "פעיל";

          const valHe = parts[valHePos] ? parts[valHePos].trim().replace(/^["']|["']$/g, "") : "";
          const valEn = parts[valEnPos] ? parts[valEnPos].trim().replace(/^["']|["']$/g, "") : valHe;
          const valActiveStr = parts[valActivePos] ? parts[valActivePos].trim().toLowerCase() : "true";
          const valActive = valActiveStr === "true" || valActiveStr === "1" || valActiveStr === "active" || valActiveStr === "פעיל";

          const key = typeNameHe;
          if (!typeMap.has(key)) {
            typeMap.set(key, {
              id: `attr_imported_${Math.floor(Math.random() * 1000000)}_${i}`,
              nameHe: typeNameHe,
              nameEn: typeNameEn,
              isActive: typeActive,
              values: []
            });
          }

          if (valHe) {
            typeMap.get(key)!.values.push({
              valueHe: valHe,
              valueEn: valEn,
              isActive: valActive
            });
          }
        }

        // Perform brand new deep copies of types to avoid any references mutating state directly or silently in React
        const updatedTypes = attributeTypes.map(t => ({
          ...t,
          values: t.values.map(v => ({ ...v }))
        }));

        let importedTypeCounter = 0;
        typeMap.forEach((importedType) => {
          importedTypeCounter++;
          const existingTypeIndex = updatedTypes.findIndex(t => t.nameHe.toLowerCase() === importedType.nameHe.toLowerCase() && !t.isDeleted);
          
          if (existingTypeIndex !== -1) {
            const existingType = updatedTypes[existingTypeIndex];
            existingType.isActive = importedType.isActive;
            existingType.isDeleted = false;

            importedType.values.forEach((importedVal, valIdx) => {
              const valIndex = existingType.values.findIndex(v => v.valueHe.toLowerCase() === importedVal.valueHe.toLowerCase() && !v.isDeleted);
              if (valIndex !== -1) {
                existingType.values[valIndex].isActive = importedVal.isActive;
                existingType.values[valIndex].isDeleted = false;
              } else {
                const uniqueValId = `val_${Date.now()}_${Math.floor(Math.random() * 10000000)}_${importedTypeCounter}_${valIdx}_${Math.random().toString(36).substring(2, 7)}`;
                existingType.values.push({
                  id: uniqueValId,
                  typeId: existingType.id,
                  valueHe: importedVal.valueHe,
                  valueEn: importedVal.valueEn,
                  isActive: importedVal.isActive,
                  isDeleted: false
                });
              }
            });
          } else {
            const newTypeId = `attr_${Date.now()}_${Math.floor(Math.random() * 10000000)}_${importedTypeCounter}_${Math.random().toString(36).substring(2, 7)}`;
            const newType: AttributeType = {
              id: newTypeId,
              nameHe: importedType.nameHe,
              nameEn: importedType.nameEn,
              isActive: importedType.isActive,
              isDeleted: false,
              values: importedType.values.map((v, valIdx) => ({
                id: `val_${Date.now()}_${Math.floor(Math.random() * 10000000)}_${importedTypeCounter}_val_${valIdx}_${Math.random().toString(36).substring(2, 7)}`,
                typeId: newTypeId,
                valueHe: v.valueHe,
                valueEn: v.valueEn,
                isActive: v.isActive,
                isDeleted: false
              }))
            };
            updatedTypes.push(newType);
          }
        });

        setAttributeTypes(updatedTypes);
        
        alert(isRtl 
          ? `הקובץ נטען בהצלחה! סונכרנו ${typeMap.size} סוגי מאפיינים עם הערכים שלהם.` 
          : `CSV loaded successfully! Synchronized ${typeMap.size} attribute types and values.`
        );

      } catch (err: any) {
        console.error(err);
        alert(isRtl 
          ? "שגיאה בטעינת קובץ CSV: אנא ודא שהמבנה תואם." 
          : "Error parsing CSV: please ensure the structure is correct."
        );
      }
    };

    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleCreateType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;
    setTypeError(null);
    setTypeSuccess(null);
    setTypeInvalidField(null);

    const nameHe = newTypeNameHe.trim();
    const nameEn = newTypeNameEn.trim();

    if (!nameHe) {
      setTypeError(isRtl 
        ? "שגיאת ולידציה: שם בעברית (Hebrew Name) חסר. אנא הזן שם תקין בעברית." 
        : "Validation Error: שם בעברית (Hebrew Name) is required.");
      setTypeInvalidField("typeHe");
      return;
    }

    if (!nameEn) {
      setTypeError(isRtl 
        ? "שגיאת ולידציה: Name (English) חסר. אנא הזן שם תקין באנגלית." 
        : "Validation Error: Name (English) is required.");
      setTypeInvalidField("typeEn");
      return;
    }

    // Call addAttributeType to persist the new record immediately
    const { error, newId } = addAttributeType(nameHe, nameEn);
    if (error) {
      setTypeError(error);
      const heExists = attributeTypes.some(t => !t.isDeleted && t.nameHe.toLowerCase() === nameHe.toLowerCase());
      const enExists = attributeTypes.some(t => !t.isDeleted && t.nameEn.toLowerCase() === nameEn.toLowerCase());
      if (heExists && enExists) {
        setTypeInvalidField("bothTypes");
      } else if (heExists) {
        setTypeInvalidField("typeHe");
      } else if (enExists) {
        setTypeInvalidField("typeEn");
      } else {
        setTypeInvalidField("bothTypes");
      }
    } else {
      setTypeSuccess(isRtl ? "סוג מאפיין חדש נוסף בהצלחה!" : "New Attribute Type created successfully!");
      setNewTypeNameHe("");
      setNewTypeNameEn("");
      setTypeInvalidField(null);
      
      if (newId) {
        setNewlyCreatedTypeId(newId);
        setSelectedRowId(newId);
        setLoadedTypeId(newId);
        setDisplayWarning(null);

        // Auto-focus and scroll grid to make newly created high-visibility row instantly visible
        setTimeout(() => {
          const rowElement = document.getElementById(`type_row_${newId}`);
          if (rowElement) {
            rowElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
            rowElement.focus();
          }
        }, 100);
      }
      setTimeout(() => setTypeSuccess(null), 3500);
    }
  };

  const handleCreateValue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized || !loadedTypeId) return;
    setValError(null);
    setValSuccess(null);
    setValInvalidField(null);

    const valHe = newValHe.trim();
    const valEn = newValEn.trim();

    if (!valHe) {
      setValError(isRtl 
        ? "שגיאת ולידציה: ערך בעברית (Hebrew Value) חסר. אנא הזן ערך תקין בעברית." 
        : "Validation Error: ערך בעברית (Hebrew Value) is required.");
      setValInvalidField("valHe");
      return;
    }

    if (!valEn) {
      setValError(isRtl 
        ? "שגיאת ולידציה: Value (English) חסר. אנא הזן ערך תקין באנגלית." 
        : "Validation Error: Value (English) is required.");
      setValInvalidField("valEn");
      return;
    }

    const err = addAttributeValue(loadedTypeId, valHe, valEn);
    if (err) {
      setValError(err);
      const currentValues = selectedType?.values || [];
      const heExists = currentValues.some(v => !v.isDeleted && v.valueHe.toLowerCase() === valHe.toLowerCase());
      const enExists = currentValues.some(v => !v.isDeleted && (v.valueEn || "").toLowerCase() === valEn.toLowerCase());
      if (heExists && enExists) {
        setValInvalidField("bothVals");
      } else if (heExists) {
        setValInvalidField("valHe");
      } else if (enExists) {
        setValInvalidField("valEn");
      } else {
        setValInvalidField("bothVals");
      }
    } else {
      setValSuccess(isRtl ? "ערך המאפיין נוסף בהצלחה!" : "Attribute Value added successfully!");
      setNewValHe("");
      setNewValEn("");
      setValInvalidField(null);
      setTimeout(() => setValSuccess(null), 3000);
    }
  };

  // Localized texts
  const t = {
    title: isRtl ? "ניהול הגדרות מאפיינים" : "ItemAttributes.aspx - Manage Configurations",
    desc: isRtl 
      ? "הוספה ועריכה של סוגי מאפיינים (מידה, צבע, אריזה) והערכים המותרים הבסיסיים שלהם ברמת מערכת."
      : "Define system core attribute types (size, color, weight) and configure their base values list.",
    typeHeader: isRtl ? "קטגוריות וסוגי מאפיינים" : "Core Attribute Types",
    addTypeTitle: isRtl ? "יצירת סוג מאפיין חדש:" : "Add New Attribute Type:",
    lblHeName: isRtl ? "שם מאפיין" : "Attribute Name",
    btnSubmit: isRtl ? "שמור מאפיין" : "Save Type",
    colTypeHe: isRtl ? "שם מאפיין" : "Attribute Type",
    colStatus: isRtl ? "סטטוס" : "Status",
    colActions: isRtl ? "פעולות" : "Actions",
    activeStatus: isRtl ? "פעיל" : "Active",
    inactiveStatus: isRtl ? "לא פעיל" : "Inactive",
    viewVals: isRtl ? "ערכים" : "Values",
    valuesHeader: isRtl ? "ערכים מותרים עבור:" : "Configured Values List for:",
    addValTitle: isRtl ? "הוספת ערך מאפיין חדש:" : "Add Allowed Variant Value:",
    lblValHe: isRtl ? "ערך המאפיין" : "Attribute Value Name",
    btnAddVal: isRtl ? "הוסף ערך" : "Add Value",
    unauthorizedTitleHe: "נדרשת הרשאת מנהל מערכת",
    unauthorizedTitleEn: "Warehouse Administrator Authorization Required",
    unauthorizedDescHe: "רק משתמשים המשויכים לקבוצת מנהלי המחסנים (Active Directory 'WarehouseManagers') יכולים לשנות מאפיינים ברמת השרת. תצוגה זו לקריאה בלבד.",
    unauthorizedDescEn: "Database configurations restricted to IIS active 'WarehouseManagers' user security roles. Edit operations are disabled.",
    emptyTypeHe: "אנא בחר סוג מאפיין משמאל כדי לראות ולנהל את הערכים המשויכים אליו.",
    emptyTypeEn: "Please select an Active Attribute Type from the left to manage its specific values.",
    noActiveValsHe: "טרם הוגדרו ערכים עבור קטגוריה זו. הוסף ערך חדש למעלה.",
    noActiveValsEn: "No variant values have been added to this category yet. Insert above.",
    colValId: isRtl ? "מזהה ערך" : "Val ID",
    colValueHe: isRtl ? "ערך" : "Allowed Value",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* Header banner resembling ItemAttributes.aspx style */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 shrink-0 sm:flex justify-between items-center border-b border-slate-750 text-white">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-400 shrink-0" />
            {t.title}
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1">{t.desc}</p>
        </div>
        <div className="text-xs bg-slate-800/80 border border-slate-700 font-mono py-1 px-2.5 rounded text-blue-300 mt-2 sm:mt-0 font-semibold shadow-xs">
          ASPX_PAGE_TARGET: Admin/ItemAttributes.aspx
        </div>
      </div>

      {/* Global CSV Import/Export Actions Bar */}
      <div className="bg-slate-50 border-b border-gray-200 p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="text-xs text-slate-600 font-medium font-sans">
          {isRtl 
            ? "גיבוי, ייצוא וסנכרון של הגדרות מאפיינים וערכיהם באמצעות קובץ CSV."
            : "Backup, export and synchronize attribute definitions and values via CSV."}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Export to CSV Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold shadow-xs transition duration-150 cursor-pointer select-none"
            title={isRtl ? "ייצא סוגי מאפיינים וערכים לקובץ CSV" : "Export Attribute Schema to CSV"}
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isRtl ? "ייצוא לקובץ CSV" : "Export to CSV"}</span>
          </button>
          
          {/* Import from CSV Input */}
          {isAuthorized ? (
            <label className="flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded text-xs font-bold shadow-xs transition duration-150 cursor-pointer select-none">
              <Upload className="h-3.5 w-3.5" />
              <span>{isRtl ? "טעינה מקובץ CSV" : "Load from CSV"}</span>
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCsv}
                className="hidden"
              />
            </label>
          ) : (
            <button
              disabled
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-300 text-gray-500 rounded text-xs font-bold cursor-not-allowed opacity-65"
              title={isRtl ? "רק מנהלי מערכת מורשים לטעון מאפיינים" : "Only Admins/Managers can import attributes"}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>{isRtl ? "טעינה מקובץ CSV" : "Load from CSV"}</span>
            </button>
          )}

          {/* Clear All Categories and Attribute Types Button */}
          {isAuthorized ? (
            confirmClearAll ? (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded text-xs">
                <span className="font-bold text-red-700">
                  {isRtl ? "האם למחוק הכל לצמיתות?" : "Permanently clear all?"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAttributeTypes([]);
                    setSelectedRowId(null);
                    setLoadedTypeId(null);
                    setConfirmClearAll(false);
                  }}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold cursor-pointer transition select-none"
                >
                  {isRtl ? "כן, מחק הכל" : "Yes, clear all"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="px-2 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300 rounded text-xs font-semibold cursor-pointer transition select-none"
                >
                  {isRtl ? "ביטול" : "Cancel"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-xs transition duration-150 cursor-pointer select-none"
                title={isRtl ? "מחק הכל - קטגוריות, סוגי מאפיינים והערכים שלהם" : "Permanently clear all categories, attribute types and values"}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isRtl ? "ניקוי קטגוריות ומאפיינים" : "Clear All Attributes"}</span>
              </button>
            )
          ) : (
            <button
              disabled
              type="button"
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-350 text-gray-500 rounded text-xs font-bold cursor-not-allowed opacity-65 border border-gray-300"
              title={isRtl ? "רק מנהלים מורשים למחוק את כל המאפיינים" : "Only Admins/Managers can clear categories and attribute types"}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isRtl ? "ניקוי קטגוריות ומאפיינים" : "Clear All Attributes"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Security alert if Dr. Cohen is selected */}
      {!isAuthorized && (
        <div className="bg-amber-50 border-b border-amber-200 p-4 flex gap-3 text-amber-900">
          <ShieldAlert className="h-5.5 w-5.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <h3 className="font-bold">{isRtl ? t.unauthorizedTitleHe : t.unauthorizedTitleEn}</h3>
            <p className="mt-1 text-slate-600 leading-normal">{isRtl ? t.unauthorizedDescHe : t.unauthorizedDescEn}</p>
          </div>
        </div>
      )}

      {/* Main Workspace grid splitting types and values */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-gray-150 p-4 sm:p-6 gap-6 sm:gap-0">
        
        {/* Left column (6 Span): Attribute Types */}
        <div className="lg:col-span-6 lg:pe-6">
          <div className="flex items-center justify-between mb-4 gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]"></span>
              {t.typeHeader}
            </h3>

            {/* Scroll Mode Toggle (Expand/Collapse grid) */}
            <button
              type="button"
              onClick={handleToggleGridMode}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 shadow-xs transition duration-200 cursor-pointer select-none focus:outline-hidden focus:ring-1 focus:ring-blue-500/30"
              title={isGridExpanded ? (isRtl ? "צמצם טבלה (גלילה מובנית)" : "Collapse Grid (scrollable)") : (isRtl ? "הרחב טבלה (הצג הכל)" : "Expand Grid (show all)")}
            >
              {isGridExpanded ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 text-gray-500" />
                  <span>{isRtl ? "תצוגת גלילה" : "Collapse Grid"}</span>
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 text-gray-500" />
                  <span>{isRtl ? "הצג הכל" : "Expand Grid"}</span>
                </>
              )}
            </button>
          </div>

          {/* Form to insert Type (Administrators only) */}
          {isAuthorized ? (
            <form onSubmit={handleCreateType} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="text-xs font-bold text-gray-750 mb-3">{t.addTypeTitle}</h4>
              
              {/* Error / Success feedbacks */}
              {typeError && (
                <div className="mb-3 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-650 shrink-0" />
                  <span>{typeError}</span>
                </div>
              )}
              {typeSuccess && (
                <div className="mb-3 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                  <span>{typeSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                <div className="col-span-1 md:col-span-5 text-right font-sans">
                  <div className="flex items-center justify-between mb-1 gap-1.5 flex-wrap">
                    <label className="text-[10px] font-bold text-gray-700">
                      {isRtl ? "שם בעברית (Hebrew Name)" : "שם בעברית (Hebrew Name)"}
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <span className="inline-flex items-center gap-1 text-[9px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-bold">
                      HE / Hebrew
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newTypeNameHe}
                    onChange={(e) => setNewTypeNameHe(e.target.value)}
                    className={`w-full text-xs font-bold border rounded px-2.5 py-2 bg-white outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-[#2563EB] ${
                      typeInvalidField === "typeHe" || typeInvalidField === "bothTypes"
                        ? "border-red-500 bg-red-50/10 focus:ring-red-500/20"
                        : "border-gray-350"
                    }`}
                    placeholder={isRtl ? "הקלד שם בעברית..." : "Type Hebrew name..."}
                    dir="rtl"
                  />
                </div>
                <div className="col-span-1 md:col-span-5 text-right font-sans">
                  <div className="flex items-center justify-between mb-1 gap-1.5 flex-wrap">
                    <label className="text-[10px] font-bold text-gray-700">
                      {isRtl ? "Name (English)" : "Name (English)"}
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <span className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">
                      EN / English
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newTypeNameEn}
                    onChange={(e) => setNewTypeNameEn(e.target.value)}
                    className={`w-full text-xs font-bold border rounded px-2.5 py-2 bg-white outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-[#2563EB] ${
                      typeInvalidField === "typeEn" || typeInvalidField === "bothTypes"
                        ? "border-red-500 bg-red-50/10 focus:ring-red-500/20"
                        : "border-gray-350"
                    }`}
                    placeholder={isRtl ? "הקלד שם באנגלית..." : "Type English name..."}
                    dir="ltr"
                  />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <button
                    type="submit"
                    className="w-full text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded py-2 px-3 flex items-center justify-center gap-1 transition select-none cursor-pointer min-h-[36px]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{t.btnSubmit}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : null}

          {/* Filter Bar */}
          <div className="mb-3 relative font-sans">
            <input
              type="text"
              value={typeSearchTerm}
              onChange={(e) => setTypeSearchTerm(e.target.value)}
              className="w-full text-xs font-semibold pl-8 pr-3 py-1.5 border border-gray-350 rounded bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
              placeholder={isRtl ? "סנן מאפיינים לפי שם..." : "Filter attributes by name..."}
              dir={isRtl ? "rtl" : "ltr"}
            />
            <div className={`absolute top-0 bottom-0 flex items-center px-2.5 text-gray-400 pointer-events-none ${isRtl ? "left-0" : "right-0"}`}>
              <Search className="h-3.5 w-3.5" />
            </div>
          </div>

          {/* Table list of Attribute Types with scroll / expand mode */}
          <div className={`overflow-x-auto transition-all duration-300 border border-gray-200 rounded-lg ${
            isGridExpanded 
              ? "overflow-y-visible max-h-none" 
              : "overflow-y-auto max-h-[380px]"
          }`}>
            <table className="min-w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-gray-50 z-10 shadow-xs">
                <tr className="bg-gray-50 text-gray-550 border-b border-gray-200">
                  <th className="py-2.5 px-3 text-right font-bold">{t.colTypeHe}</th>
                  <th className="py-2.5 px-3 text-center font-bold w-20">{t.colStatus}</th>
                  <th className="py-2.5 px-3 text-center font-bold w-44">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {paginatedTypes.map((type) => {
                    const isSelected = type.id === selectedRowId;
                    const isLoaded = type.id === loadedTypeId;
                    const isEditing = type.id === editingTypeId;
                    const isNewlyCreated = type.id === newlyCreatedTypeId;

                    return (
                      <tr 
                        id={`type_row_${type.id}`}
                        key={type.id}
                        tabIndex={0}
                        className={`hover:bg-blue-50/40 transition cursor-pointer select-none outline-none focus:ring-1 focus:ring-blue-500/35 ${
                          isSelected 
                            ? "bg-blue-50 font-bold text-blue-900 border-r-4 border-blue-600" 
                            : ""
                        } ${
                          isNewlyCreated
                            ? "bg-green-50/20 border-l-4 border-green-500"
                            : ""
                        }`}
                        onClick={() => {
                          if (isEditing) return; // lock selection during edit
                          setSelectedRowId(type.id);
                          setLoadedTypeId(type.id);
                          setDisplayWarning(null);
                        }}
                      >
                        <td className="py-2 px-3">
                          {isEditing ? (
                            <div className="flex flex-col gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs font-sans" onClick={(e) => e.stopPropagation()}>
                              <div>
                                <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
                                  <span className="text-[10px] font-bold text-gray-700">שם בעברית (Hebrew Name) <span className="text-red-500">*</span></span>
                                  <span className="text-[8.5px] bg-sky-50 text-sky-700 border border-sky-150 px-1 py-0 rounded font-bold">HE / Hebrew</span>
                                </div>
                                <input
                                  type="text"
                                  value={editTypeNameHe}
                                  onChange={(e) => setEditTypeNameHe(e.target.value)}
                                  className={`w-full text-xs border rounded px-2 py-1 bg-white font-bold text-slate-800 focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden ${
                                    !editTypeNameHe.trim() ? "border-red-500 bg-red-50/5" : "border-gray-350"
                                  }`}
                                  placeholder={isRtl ? "הקלד שם בעברית..." : "Type Hebrew name..."}
                                  dir="rtl"
                                />
                              </div>
                              <div>
                                <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
                                  <span className="text-[10px] font-bold text-gray-700">Name (English) <span className="text-red-500">*</span></span>
                                  <span className="text-[8.5px] bg-indigo-50 text-indigo-700 border border-indigo-150 px-1 py-0 rounded font-bold">EN / English</span>
                                </div>
                                <input
                                  type="text"
                                  value={editTypeNameEn}
                                  onChange={(e) => setEditTypeNameEn(e.target.value)}
                                  className={`w-full text-xs border rounded px-2 py-1 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden ${
                                    !editTypeNameEn.trim() ? "border-red-500 bg-red-50/5" : "border-gray-350"
                                  }`}
                                  placeholder={isRtl ? "הקלד שם באנגלית..." : "Type English name..."}
                                  dir="ltr"
                                />
                              </div>
                            </div>
                          ) : (
                            isRtl ? type.nameHe : (type.nameEn || type.nameHe)
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {isEditing ? null : (
                            <button
                              disabled={!isAuthorized}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTypeActive(type.id);
                              }}
                              className={`inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold select-none cursor-pointer ${
                                type.isActive 
                                  ? "bg-green-100 text-green-700" 
                                  : "bg-gray-200 text-gray-500"
                              } ${!isAuthorized ? "pointer-events-none opacity-80" : ""}`}
                              title={isAuthorized ? "Toggle active status" : ""}
                            >
                              <Power className="h-2.5 w-2.5" />
                              {type.isActive ? t.activeStatus : t.inactiveStatus}
                            </button>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-row">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => handleSaveTypeEdit(type.id)}
                                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded border border-transparent hover:border-green-200 transition duration-150 cursor-pointer"
                                  title={isRtl ? "שמור שינויים" : "Save changes"}
                                >
                                  <Save className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setEditingTypeId(null)}
                                  className="p-1 text-gray-500 hover:text-gray-750 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition duration-150 cursor-pointer"
                                  title={isRtl ? "ביטול" : "Cancel"}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <>
                                {/* View Values Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedRowId(type.id);
                                    setLoadedTypeId(type.id);
                                    setDisplayWarning(null);
                                  }}
                                  className={`px-2 py-1 rounded text-[11px] font-bold border transition cursor-pointer select-none shrink-0 ${
                                    isLoaded 
                                      ? "bg-[#2563EB] border-[#2563EB] text-white" 
                                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                                  }`}
                                >
                                  {t.viewVals} &raquo;
                                </button>

                                {/* Edit Button (Admins only) */}
                                {isAuthorized && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingTypeId(type.id);
                                      setEditTypeNameHe(type.nameHe);
                                      setEditTypeNameEn(type.nameEn || type.nameHe);
                                    }}
                                    className="p-1 text-blue-600 hover:text-blue-800 rounded bg-gray-100 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition cursor-pointer shrink-0"
                                    title={isRtl ? "ערוך שם מאפיין" : "Edit attribute name"}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                
                                {/* Delete Button (Admins only) */}
                                {isAuthorized && (() => {
                                  const isConfirming = confirmDeleteTypeId === type.id;
                                  if (isConfirming) {
                                    return (
                                      <div 
                                        onClick={(e) => e.stopPropagation()} 
                                        className="flex items-center gap-1 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded mr-1 shrink-0"
                                      >
                                        <span className="text-[10px] text-red-700 font-bold">{isRtl ? "מחק?" : "Sure?"}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteType(type.id);
                                            setConfirmDeleteTypeId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-red-650 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          {isRtl ? "כן" : "Yes"}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDeleteTypeId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-750 border border-gray-300 rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          {isRtl ? "לא" : "No"}
                                        </button>
                                      </div>
                                    );
                                  }
                                  return (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDeleteTypeId(type.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-650 rounded bg-gray-100 hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer shrink-0"
                                      title="Delete Item Attribute Type"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Attributes Master Grid Interactive Pagination Controls */}
          {totalTypesCount > 0 && (
            <div 
              className="bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg mt-2 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-gray-700 select-none font-sans"
              style={{ direction: isRtl ? "rtl" : "ltr" }}
            >
              {/* Rows Per Page Selector */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-gray-500 font-semibold text-[11px]">
                  {isRtl ? "שורות לעמוד:" : "Rows per page:"}
                </span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-300 rounded px-1.5 py-0.5 text-xs font-bold text-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500/35 focus:border-blue-500 cursor-pointer shadow-sm font-mono"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Statistics Details */}
              <div className="font-semibold text-gray-600 text-center text-[11px]">
                {isRtl ? (
                  <span>
                    מציג <span className="font-mono text-blue-600 font-bold">{fromTypeVal}-{toTypeVal}</span> מתוך{" "}
                    <span className="font-mono text-gray-900 font-bold">{totalTypesCount}</span> סוגי מאפיינים
                  </span>
                ) : (
                  <span>
                    Showing <span className="font-mono text-blue-600 font-bold">{fromTypeVal}-{toTypeVal}</span> of{" "}
                    <span className="font-mono text-gray-900 font-bold">{totalTypesCount}</span> attribute types
                  </span>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center gap-1 shrink-0 font-sans">
                {/* First Page */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1 rounded border border-gray-200 bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-gray-50"
                  title={isRtl ? "לעמוד הראשון" : "First Page"}
                >
                  {isRtl ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
                </button>
                
                {/* Prev Page */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1 rounded border border-gray-200 bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-gray-50"
                  title={isRtl ? "לעמוד הקודם" : "Previous Page"}
                >
                  {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </button>

                {/* Number badges */}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1;
                    })
                    .map((page, idx, arr) => {
                      const elements = [];
                      if (idx > 0 && page - arr[idx - 1] > 1) {
                        elements.push(
                          <span key={`ellipse-types-${page}`} className="px-0.5 text-gray-400 font-bold font-mono text-[11px]">
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
                              ? "bg-blue-600 text-white border-blue-600 shadow-sm font-bold"
                              : "bg-white border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-900"
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
                  className="p-1 rounded border border-gray-200 bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-gray-50"
                  title={isRtl ? "לעמוד הבא" : "Next Page"}
                >
                  {isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>

                {/* Last Page */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1 rounded border border-gray-200 bg-white text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center hover:bg-gray-50"
                  title={isRtl ? "לעמוד האחרון" : "Last Page"}
                >
                  {isRtl ? <ChevronsLeft className="h-3.5 w-3.5" /> : <ChevronsRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right column (6 Span): Selected Type's Values List */}
        <div className="lg:col-span-6 lg:ps-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 flex-wrap">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]"></span>
              <span>{t.valuesHeader}</span>
              {selectedType ? (
                <span className="text-blue-950 font-extrabold bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded text-xs select-none">
                  {isRtl ? selectedType.nameHe : selectedType.nameEn}
                </span>
              ) : (
                <span className="text-gray-400 font-medium bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-xs select-none">
                  {isRtl ? "(טרם נבחר)" : "(none)"}
                </span>
              )}
            </h3>
          </div>

          {/* Warning banner if no row is selected and user clicks "ערכים" */}
          {displayWarning && (
            <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded text-amber-950 text-xs flex items-center gap-2 animate-pulse">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 animate-bounce" />
              <span className="font-bold">{displayWarning}</span>
            </div>
          )}

          {selectedType ? (
            <div className="animate-fade-in-delayed">

              {/* Form to insert Value (Administrators only) */}
              {isAuthorized ? (
                <form onSubmit={handleCreateValue} className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                  <h4 className="text-xs font-bold text-gray-750 mb-3">{t.addValTitle}</h4>
                  
                  {/* Error / Success feedbacks */}
                  {valError && (
                    <div className="mb-3 px-3 py-1.5 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-650 shrink-0" />
                      <span>{valError}</span>
                    </div>
                  )}
                  {valSuccess && (
                    <div className="mb-3 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5 text-[#2563EB] shrink-0" />
                      <span>{valSuccess}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
                    <div className="col-span-1 md:col-span-5 text-right font-sans">
                      <div className="flex items-center justify-between mb-1 gap-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">
                          {isRtl ? "ערך בעברית (Hebrew Value)" : "ערך בעברית (Hebrew Value)"}
                          <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <span className="inline-flex items-center gap-1 text-[9px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-bold">
                          HE / Hebrew
                        </span>
                      </div>
                      <input
                        type="text"
                        value={newValHe}
                        onChange={(e) => setNewValHe(e.target.value)}
                        className={`w-full text-xs font-bold border rounded px-2.5 py-2 bg-white outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-[#2563EB] ${
                          valInvalidField === "valHe" || valInvalidField === "bothVals"
                            ? "border-red-500 bg-red-50/10 focus:ring-red-500/20"
                            : "border-gray-350"
                        }`}
                        placeholder={isRtl ? "הקלד ערך בעברית..." : "Type Hebrew value..."}
                        dir="rtl"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-5 text-right font-sans">
                      <div className="flex items-center justify-between mb-1 gap-1.5 flex-wrap">
                        <label className="text-[10px] font-bold text-gray-700">
                          {isRtl ? "Value (English)" : "Value (English)"}
                          <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <span className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded font-bold">
                          EN / English
                        </span>
                      </div>
                      <input
                        type="text"
                        value={newValEn}
                        onChange={(e) => setNewValEn(e.target.value)}
                        className={`w-full text-xs font-bold border rounded px-2.5 py-2 bg-white outline-hidden focus:ring-2 focus:ring-blue-500/10 focus:border-[#2563EB] ${
                          valInvalidField === "valEn" || valInvalidField === "bothVals"
                            ? "border-red-500 bg-red-50/10 focus:ring-red-500/20"
                            : "border-gray-350"
                        }`}
                        placeholder={isRtl ? "הקלד ערך באנגלית..." : "Type English value..."}
                        dir="ltr"
                      />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                       <button
                        type="submit"
                        className="w-full text-xs font-bold bg-[#2563EB] hover:bg-blue-700 text-white rounded py-2 px-3 flex items-center justify-center gap-1 transition select-none cursor-pointer min-h-[36px]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t.btnAddVal}</span>
                      </button>
                    </div>
                  </div>
                </form>
              ) : null}

              {/* Table list of values */}
              {selectedType.values.filter((v) => !v.isDeleted).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-gray-550 border-b border-gray-200">
                        <th className="py-2.5 px-3 text-right font-bold">{t.colValueHe}</th>
                        <th className="py-2.5 px-3 text-center font-bold w-20">{t.colStatus}</th>
                        {isAuthorized && <th className="py-2.5 px-3 text-center font-bold w-24">{t.colActions}</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 bg-white">
                      {selectedType.values
                        .filter((v) => !v.isDeleted)
                        .map((val) => {
                          const isEditingValue = editingValueId === val.id;
                          return (
                            <tr key={val.id} className="hover:bg-blue-50/20 transition">
                              <td className="py-2 px-3 font-semibold">
                                {isEditingValue ? (
                                  <div className="flex flex-col gap-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg shadow-2xs font-sans" onClick={(e) => e.stopPropagation()}>
                                    <div>
                                      <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
                                        <span className="text-[10px] font-bold text-gray-700">ערך בעברית (Hebrew Value) <span className="text-red-500">*</span></span>
                                        <span className="text-[8.5px] bg-sky-50 text-sky-700 border border-sky-150 px-1 py-0 rounded font-bold font-sans">HE / Hebrew</span>
                                      </div>
                                      <input
                                        type="text"
                                        value={editValueHe}
                                        onChange={(e) => setEditValueHe(e.target.value)}
                                        className={`w-full text-xs border rounded px-2 py-1 bg-white font-semibold text-slate-800 focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden ${
                                          !editValueHe.trim() ? "border-red-500 bg-red-50/5" : "border-gray-350"
                                        }`}
                                        placeholder={isRtl ? "ערך בעברית" : "Hebrew value"}
                                        dir="rtl"
                                      />
                                    </div>
                                    <div>
                                      <div className="flex items-center justify-between gap-1.5 mb-1 flex-wrap">
                                        <span className="text-[10px] font-bold text-gray-700 font-sans">Value (English) <span className="text-red-500">*</span></span>
                                        <span className="text-[8.5px] bg-indigo-50 text-indigo-700 border border-indigo-150 px-1 py-0 rounded font-bold font-sans font-mono">EN / English</span>
                                      </div>
                                      <input
                                        type="text"
                                        value={editValueEn}
                                        onChange={(e) => setEditValueEn(e.target.value)}
                                        className={`w-full text-xs border rounded px-2 py-1 bg-white text-slate-800 focus:ring-1 focus:ring-blue-500/20 focus:border-blue-600 outline-hidden ${
                                          !editValueEn.trim() ? "border-red-500 bg-red-50/5" : "border-gray-350"
                                        }`}
                                        placeholder={isRtl ? "ערך באנגלית" : "English value"}
                                        dir="ltr"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  isRtl ? val.valueHe : (val.valueEn || val.valueHe)
                                )}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {isEditingValue ? null : (
                                  <button
                                    disabled={!isAuthorized}
                                    onClick={() => toggleValueActive(val.id)}
                                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold select-none cursor-pointer ${
                                      val.isActive 
                                        ? "bg-green-100 text-green-700" 
                                        : "bg-gray-200 text-gray-500"
                                    } ${!isAuthorized ? "pointer-events-none opacity-80" : ""}`}
                                  >
                                    <Power className="h-2.5 w-2.5" />
                                    {val.isActive ? t.activeStatus : t.inactiveStatus}
                                  </button>
                                )}
                              </td>
                              {isAuthorized && (() => {
                                const isMapped = itemMappings.some((m) => m.allowedValueIds.includes(val.id));
                                const isConfirming = confirmDeleteValueId === val.id;

                                if (isEditingValue) {
                                  return (
                                    <td className="py-2 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => handleSaveValueEdit(val.id)}
                                          className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded border border-transparent hover:border-green-200 transition duration-150 cursor-pointer"
                                          title={isRtl ? "שמור" : "Save"}
                                        >
                                          <Save className="h-4 w-4" />
                                        </button>
                                        <button
                                          onClick={() => setEditingValueId(null)}
                                          className="p-1 text-gray-500 hover:text-gray-750 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition duration-150 cursor-pointer"
                                          title={isRtl ? "ביטול" : "Cancel"}
                                        >
                                          <X className="h-4 w-4" />
                                        </button>
                                      </div>
                                    </td>
                                  );
                                }

                                if (isConfirming) {
                                  return (
                                    <td className="py-2 px-3 text-center">
                                      <div className="flex items-center justify-center gap-1 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded inline-flex">
                                        <span className="text-[10px] text-red-700 font-bold">{isRtl ? "מחק?" : "Sure?"}</span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteValue(val.id);
                                            setConfirmDeleteValueId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-[#ed98a5] hover:bg-[#db8390] text-[#0a0909] rounded text-[10px] font-bold cursor-pointer transition-colors"
                                        >
                                          {isRtl ? "כן" : "Yes"}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDeleteValueId(null);
                                          }}
                                          className="px-1.5 py-0.5 bg-gray-200 hover:bg-gray-300 text-gray-750 border border-gray-300 rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          {isRtl ? "לא" : "No"}
                                        </button>
                                      </div>
                                    </td>
                                  );
                                }

                                return (
                                  <td className="py-2 px-3 text-center">
                                    <div className="flex items-center justify-center gap-1.5 flex-row">
                                      {/* Edit value button */}
                                      <button
                                        onClick={() => {
                                          setEditingValueId(val.id);
                                          setEditValueHe(val.valueHe);
                                          setEditValueEn(val.valueEn || val.valueHe);
                                        }}
                                        className="p-1 rounded text-blue-600 hover:text-blue-800 bg-gray-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition cursor-pointer shrink-0"
                                        title={isRtl ? "ערוך ערך" : "Edit Value"}
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>

                                      {/* Delete value button */}
                                      <button
                                        disabled={isMapped}
                                        onClick={() => {
                                          if (isMapped) {
                                            alert(isRtl 
                                              ? "שגיאה: לא ניתן למחוק ערך זה מכיוון שהוא משויך לפריט בקטלוג." 
                                              : "Error: Cannot delete this value because it is associated with a catalog item."
                                            );
                                            return;
                                          }
                                          setConfirmDeleteValueId(val.id);
                                        }}
                                        className={`p-1 rounded border border-transparent transition cursor-pointer inline-flex items-center justify-center shrink-0 ${
                                          isMapped
                                            ? "text-gray-300 bg-gray-50/50 cursor-not-allowed opacity-50"
                                            : "text-slate-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 hover:border-red-200"
                                        }`}
                                        title={
                                          isMapped
                                            ? (isRtl ? "ערך זה משויך לפריט ולא ניתן למחיקה" : "Value is mapped to an item and cannot be deleted")
                                            : (isRtl ? "הסר ערך" : "Remove variant value")
                                        }
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                );
                              })()}
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-gray-400 font-bold bg-gray-50 rounded-lg italic col-span-5">
                  {isRtl ? t.noActiveValsHe : t.noActiveValsEn}
                </div>
              )}

            </div>
          ) : (
            <div className="py-16 text-center border-2 border-dashed border-gray-250 rounded-xl bg-gray-55/50 text-gray-400 leading-normal max-w-sm mx-auto px-4 mt-6 sm:mt-0 shadow-xs">
              <Layers className="h-8 w-8 mx-auto text-blue-500 stroke-1 mb-2 shrink-0 animate-pulse" />
              <p className="text-xs sm:text-sm font-bold">{isRtl ? t.emptyTypeHe : t.emptyTypeEn}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
