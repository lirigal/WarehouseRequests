import React, { useState, useEffect, useRef } from "react";
import { WarehouseItem, AttributeType, ItemAttributeMapping, Language, AccessRole, ItemPictureUrl } from "../types";
import { GetItemPrimaryImageBySku } from "../lib/imageService";
import { Settings, ShieldCheck, CheckSquare, Square, Save, HelpCircle, Check, AlertCircle, Search, Trash2, X } from "lucide-react";
import { initialWarehouseItems } from "../data/mockItems";

interface ItemMappingFormProps {
  currentLanguage: Language;
  currentRole: AccessRole;
  warehouseItems: WarehouseItem[];
  attributeTypes: AttributeType[];
  itemMappings: ItemAttributeMapping[];
  saveItemMapping: (
    sku: string,
    typeId: string,
    isMandatory: boolean,
    allowedValueIds: string[]
  ) => string | null; // Returns error if validation fails
  deleteItemMapping?: (sku: string, typeId: string) => void;
  setWarehouseItems?: React.Dispatch<React.SetStateAction<WarehouseItem[]>>;
  defaultSelectedSku?: string | null;
  itemPictureUrls?: ItemPictureUrl[];
}

export const ItemMappingForm: React.FC<ItemMappingFormProps> = ({
  currentLanguage,
  currentRole,
  warehouseItems,
  attributeTypes,
  itemMappings,
  saveItemMapping,
  deleteItemMapping,
  setWarehouseItems,
  defaultSelectedSku,
  itemPictureUrls = []
}) => {
  const isRtl = currentLanguage === "HE";
  const isAuthorized = currentRole === "ADMIN" || currentRole === "MANAGER";

  // SKU dedicated search state with persistence
  const [skuSearchTerm, setSkuSearchTerm] = useState<string>(() => {
    return localStorage.getItem("agri_item_mapping_sku_search") || "";
  });

  useEffect(() => {
    localStorage.setItem("agri_item_mapping_sku_search", skuSearchTerm);
  }, [skuSearchTerm]);

  // Selection states with LocalStorage persistence to keep choices on reload
  const [selectedSku, setSelectedSku] = useState<string>(() => {
    const saved = localStorage.getItem("agri_item_mapping_selected_sku");
    if (saved && warehouseItems.some(i => i.sku === saved)) {
      return saved;
    }
    if (defaultSelectedSku && warehouseItems.some(i => i.sku === defaultSelectedSku)) {
      return defaultSelectedSku;
    }
    return warehouseItems[0]?.sku || "";
  });

  const [activeTypeId, setActiveTypeId] = useState<string>(() => {
    return localStorage.getItem("agri_item_mapping_active_type_id") || "";
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const [attrSearchTerm, setAttrSearchTerm] = useState<string>(() => {
    return localStorage.getItem("agri_item_mapping_attribute_search") || "";
  });

  useEffect(() => {
    localStorage.setItem("agri_item_mapping_attribute_search", attrSearchTerm);
  }, [attrSearchTerm]);

  useEffect(() => {
    localStorage.setItem("agri_item_mapping_selected_sku", selectedSku);
  }, [selectedSku]);

  useEffect(() => {
    localStorage.setItem("agri_item_mapping_active_type_id", activeTypeId);
  }, [activeTypeId]);

  // Map settings states
  const [isMandatory, setIsMandatory] = useState<boolean>(true);
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  
  // Feedback states
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Companion inline confirmations
  const [pendingDeleteTypeId, setPendingDeleteTypeId] = useState<string | null>(null);
  const [pendingFormDelete, setPendingFormDelete] = useState<boolean>(false);

  // Filter items in catalog selection supporting full SKU search and partial/contains matches
  const filteredItems = warehouseItems.filter((item) => {
    // 1. Filter by SKU search term
    const skuTerm = skuSearchTerm.toLowerCase().trim();
    if (skuTerm) {
      if (!item.sku.toLowerCase().includes(skuTerm)) {
        return false;
      }
    }

    // 2. Filter by Search Term (Quick search)
    const term = searchTerm.toLowerCase().trim();
    if (term) {
      return (
        item.sku.toLowerCase().includes(term) ||
        item.nameHe.toLowerCase().includes(term) ||
        item.nameEn.toLowerCase().includes(term)
      );
    }

    return true;
  });

  const selectedItem = warehouseItems.find((i) => i.sku === selectedSku);

  // Synchronize on defaultSelectedSku changes from parent
  useEffect(() => {
    if (defaultSelectedSku && warehouseItems.some((i) => i.sku === defaultSelectedSku)) {
      setSelectedSku(defaultSelectedSku);
    }
  }, [defaultSelectedSku, warehouseItems]);

  // Automatically select SKU if there's exactly 1 item in the filtered list
  useEffect(() => {
    if (filteredItems.length === 1 && filteredItems[0].sku !== selectedSku) {
      setSelectedSku(filteredItems[0].sku);
    }
  }, [filteredItems.length, filteredItems[0]?.sku, selectedSku]);

  // Smart selection: Automatically select the first assigned attribute type, or matching search type
  useEffect(() => {
    const termStr = attrSearchTerm.toLowerCase().trim();
    
    const filtered = [...attributeTypes]
      .filter((t) => t.isActive && !t.isDeleted)
      .filter((type) => {
        if (!termStr) return true;
        const typeName = isRtl ? type.nameHe : (type.nameEn || type.nameHe);
        return typeName.toLowerCase().includes(termStr);
      })
      .sort((a, b) => {
        const nameA = isRtl ? a.nameHe : (a.nameEn || a.nameHe);
        const nameB = isRtl ? b.nameHe : (b.nameEn || b.nameHe);
        return nameA.localeCompare(nameB, isRtl ? "he" : "en", { sensitivity: "base" });
      });

    if (termStr !== "") {
      if (filtered.length > 0) {
        // Scenario 3: Filtering matches. Automatically select the first matching attribute
        setActiveTypeId(filtered[0].id);
      } else {
        // Scenario 5: Filtering returns zero results
        setActiveTypeId("");
      }
    } else {
      // No search parameter context active (termStr is empty)
      // Resolve the list of assigned attributes for this SKU
      const assigned = itemMappings.filter(
        (m) => m.itemId === selectedSku && 
        attributeTypes.some((t) => t.id === m.typeId && t.isActive && !t.isDeleted)
      );

      if (assigned.length > 0) {
        // Scenario 1: SKU has one or more assigned attributes
        const savedActiveId = localStorage.getItem("agri_item_mapping_active_type_id");
        const isSavedAssigned = assigned.some((m) => m.typeId === savedActiveId);
        
        if (savedActiveId && isSavedAssigned) {
          setActiveTypeId(savedActiveId);
        } else {
          setActiveTypeId(assigned[0].typeId);
        }
      } else {
        // Scenario 2: SKU has no assigned attributes
        setActiveTypeId("");
      }
    }
  }, [selectedSku, attrSearchTerm, attributeTypes, itemMappings, isRtl]);

  // Load existing configuration for this SKU & AttributeType
  useEffect(() => {
    setErrorFeedback(null);
    setSuccessFeedback(null);
    setPendingDeleteTypeId(null);
    setPendingFormDelete(false);
    
    if (!selectedSku || !activeTypeId) return;

    const existing = itemMappings.find(
      (m) => m.itemId === selectedSku && m.typeId === activeTypeId
    );

    if (existing) {
      setIsMandatory(existing.isMandatory);
      setSelectedValues(existing.allowedValueIds);
    } else {
      setIsMandatory(true);
      setSelectedValues([]);
    }
  }, [selectedSku, activeTypeId, itemMappings]);

  const currentType = attributeTypes.find((t) => t.id === activeTypeId);
  const assignedMappings = itemMappings.filter(
    (m) => m.itemId === selectedSku && 
    attributeTypes.some((t) => t.id === m.typeId && t.isActive && !t.isDeleted)
  );
  const typeValues = currentType ? currentType.values.filter((v) => v.isActive && !v.isDeleted) : [];

  // Scoped filtered types list for unified Step 1 & Step 2 rendering
  const termStrSc = attrSearchTerm.toLowerCase().trim();
  const filteredTypes = [...attributeTypes]
    .filter((t) => t.isActive && !t.isDeleted)
    .filter((type) => {
      if (!termStrSc) return true;
      const typeName = isRtl ? type.nameHe : (type.nameEn || type.nameHe);
      return typeName.toLowerCase().includes(termStrSc);
    })
    .sort((a, b) => {
      const nameA = isRtl ? a.nameHe : (a.nameEn || a.nameHe);
      const nameB = isRtl ? b.nameHe : (b.nameEn || b.nameHe);
      return nameA.localeCompare(nameB, isRtl ? "he" : "en", { sensitivity: "base" });
    });

  const handleToggleValue = (valId: string) => {
    if (!isAuthorized) return;
    if (selectedValues.includes(valId)) {
      setSelectedValues(selectedValues.filter((id) => id !== valId));
    } else {
      setSelectedValues([...selectedValues, valId]);
    }
  };

  const handleSelectAll = () => {
    if (!isAuthorized) return;
    setSelectedValues(typeValues.map((v) => v.id));
  };

  const handleClearAll = () => {
    if (!isAuthorized) return;
    setSelectedValues([]);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;
    setErrorFeedback(null);
    setSuccessFeedback(null);

    if (!selectedSku || !activeTypeId) return;

    // Trigger mapping save
    const err = saveItemMapping(selectedSku, activeTypeId, isMandatory, selectedValues);
    if (err) {
      setErrorFeedback(err);
    } else {
      setSuccessFeedback(
        isRtl 
          ? "קונפיגורציית המאפיינים נשמרה בהצלחה עבור המק\"ט הנבחר!" 
          : "Item attributes configuration updated successfully!"
      );
      setTimeout(() => setSuccessFeedback(null), 3500);
    }
  };

  // Localized texts
  const t = {
    title: isRtl ? "מסך עריכת פריט מורחב - הגדרת שיוך מאפיינים" : "Extended Item Edit Screen - Attribute Mappings",
    desc: isRtl 
      ? "שיוך מאפיינים למק\"ט פיזי. הגדרת חובת בחירה, וסינון ערכים מורשים ספציפיים לכל פריט אב."
      : "Link core attribute types to physical item SKUs. Configure item-level mandatory settings and values list.",
    selectItem: isRtl ? "בחר פריט מתוך הקטלוג היומי:" : "Select Local Catalog Item:",
    itemSpecs: isRtl ? "פרטי פריט מסונכרנים:" : "ERP Synced Item Details:",
    stockLabel: isRtl ? "מלאי פעיל מחסן: " : "Available Stock: ",
    priceLabel: isRtl ? "מחיר יחידה: " : "Unit price: ",
    shelfLabel: isRtl ? "מיקום מדף: " : "Shelf locator: ",
    categoryLabel: isRtl ? "קטגוריה: " : "Category: ",
    selectAttrType: isRtl ? "שלב א': בחר סוג מאפיין מוגדר" : "Step 1: Choose Attribute Type",
    mappingFormHeader: isRtl ? "שלב ב': הגדרת חוקים וערכים מותרים לפריט" : "Step 2: Rule Mapping & Allowed Variants",
    chkMandatory: isRtl ? "בחירת מאפיין זה היא חובה בעת בקשת ניפוק (Required)" : "Require attribute selection during warehouse request",
    selectValuesLabel: isRtl ? "סמן את הערכים המותרים לפריט זה:" : "Check allowable values for this item template:",
    btnSelectAll: isRtl ? "בחר הכל (Select All)" : "Select All Active",
    btnClearAll: isRtl ? "נקה הכל" : "Clear Checked",
    btnSave: isRtl ? "שמור הגדרות פריט" : "Apply Mapping Settings",
    mappedSummary: isRtl ? "הגדרות פעילות למק\"ט זה:" : "Current Active SKU configs:",
    noMappings: isRtl ? "טרם שויכו מאפיינים למק\"ט זה." : "No attribute types are mapped to this SKU yet.",
    isMandatoryLabel: isRtl ? "חובה" : "Mandatory",
    isOptionalLabel: isRtl ? "רשות" : "Optional"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 shrink-0 sm:flex justify-between items-center border-b border-slate-750 text-white">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-400 shrink-0" />
            {t.title}
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1">{t.desc}</p>
        </div>
        <div className="text-xs bg-slate-800/80 border border-slate-700 font-mono py-1 px-2.5 rounded text-blue-300 mt-2 sm:mt-0 font-semibold shadow-xs">
          ASPX_CONTROL: Admin/EditItemMapping.aspx
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Span (4): Item selection & physical details box */}
        <div className="lg:col-span-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          
          {/* DEDICATED SKU SEARCH FILTER */}
          <div className="mb-4 text-right" id="sku-search-filter-container">
            <label className="block text-xs font-bold text-[#1F2937] mb-1.5 flex items-center justify-between">
              <span>{isRtl ? "חיפוש לפי מק\"ט" : "Search by SKU"}</span>
              <span className="text-[10px] text-gray-400 font-mono font-medium">Full Contains Filter</span>
            </label>
            <div className="relative">
              <input
                id="sku-search-input"
                type="text"
                placeholder={isRtl ? "הקלד מק\"ט מלא או חלק ממנו..." : "Enter full or partial SKU..."}
                value={skuSearchTerm}
                onChange={(e) => {
                  setSkuSearchTerm(e.target.value);
                  setIsDropdownExpanded(true);
                }}
                className={`w-full text-xs font-medium bg-white border border-gray-300 rounded py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none ${
                  isRtl ? 'pl-8 pr-10 text-right' : 'pl-10 pr-8 text-left'
                }`}
              />
              <div className={`absolute top-2.5 ${isRtl ? 'right-2.5' : 'left-2.5'} text-slate-400 pointer-events-none`}>
                <Search className="h-3.5 w-3.5" />
              </div>
              {skuSearchTerm && (
                <button
                  type="button"
                  id="clear-sku-search-btn"
                  onClick={() => setSkuSearchTerm("")}
                  className={`absolute top-2 ${isRtl ? 'left-2.5' : 'right-2.5'} p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-650 transition cursor-pointer select-none`}
                  title={isRtl ? "נקה סינון מק\"ט" : "Clear SKU search"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="mb-4 text-right">
            <label className="block text-xs font-bold text-[#1F2937] mb-1.5">{t.selectItem}</label>
            
            {/* Quick search filter */}
            <div className="relative mb-2">
              <input
                type="text"
                placeholder={isRtl ? "חיפוש מהיר לפי מק\"ט, שם או קטגוריה..." : "Quick template search..."}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setIsDropdownExpanded(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIsDropdownExpanded(true);
                    if (filteredItems.length > 0) {
                      const isAlreadySelected = filteredItems.some((item) => item.sku === selectedSku);
                      if (!isAlreadySelected) {
                        setSelectedSku(filteredItems[0].sku);
                      }
                      setTimeout(() => {
                        selectRef.current?.focus();
                      }, 10);
                    }
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (filteredItems.length > 0) {
                      const isAlreadySelected = filteredItems.some((item) => item.sku === selectedSku);
                      if (!isAlreadySelected) {
                        setSelectedSku(filteredItems[0].sku);
                      }
                      setIsDropdownExpanded(false);
                      setSearchTerm("");
                    }
                  }
                }}
                className={`w-full text-xs bg-white border border-gray-300 rounded py-1.5 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none ${
                  isRtl ? 'pl-8 pr-3 text-right' : 'pl-3 pr-8 text-left'
                }`}
              />
              <div className={`absolute top-2.5 ${isRtl ? 'left-2.5' : 'right-2.5'} text-slate-400 pointer-events-none`}>
                <Search className="h-3.5 w-3.5" />
              </div>
            </div>

            <select
              ref={selectRef}
              value={selectedSku}
              onChange={(e) => {
                setSelectedSku(e.target.value);
              }}
              onClick={() => {
                setIsDropdownExpanded(false);
                setSearchTerm("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setIsDropdownExpanded(false);
                  setSearchTerm("");
                  selectRef.current?.blur();
                }
              }}
              className="w-full text-xs font-bold bg-white border border-gray-300 rounded px-2.5 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] cursor-pointer"
              size={isDropdownExpanded && searchTerm.trim() && filteredItems.length > 1 ? Math.min(8, filteredItems.length) : undefined}
            >
              {filteredItems.map((item) => (
                <option key={item.sku} value={item.sku}>
                  {item.sku} - {isRtl ? item.nameHe : item.nameEn}
                </option>
              ))}
              {filteredItems.length === 0 && (
                <option value="" disabled>
                  {isRtl ? "-- לא נמצאו פריטים תואמים --" : "-- No items matched query --"}
                </option>
              )}
            </select>

            {filteredItems.length === 0 && (
              <div id="no-items-matching-sku-warning" className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded text-rose-700 text-xs font-bold text-center animate-fadeIn shadow-2xs">
                {isRtl 
                  ? "לא נמצאו פריטים התואמים למק\"ט שהוזן." 
                  : "No items matching the entered SKU were found."}
              </div>
            )}
          </div>

          {selectedItem && (
            <div className="bg-white border border-gray-200 rounded p-4 text-xs space-y-2.5 shadow-sm">
              <h4 className="font-extrabold text-[#2563EB] border-b border-gray-150 pb-1.5 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 tracking-tight text-[#2563EB]" />
                {t.itemSpecs}
              </h4>
              <p>
                <strong>{isRtl ? "מק\"ט:" : "SKU:"}</strong> <span className="font-mono text-gray-650 font-semibold">{selectedItem.sku}</span>
              </p>
              <p>
                <strong>{t.categoryLabel}</strong> {isRtl ? selectedItem.categoryHe : selectedItem.categoryEn}
              </p>
              <p>
                <strong>{t.stockLabel}</strong>{" "}
                <span className="font-bold font-mono px-2 py-0.5 bg-gray-100 rounded text-gray-700">
                  {selectedItem.stock} {isRtl ? selectedItem.unitHe : selectedItem.unitEn}
                </span>
              </p>
              <p>
                <strong>{t.priceLabel}</strong>{" "}
                <span className="font-bold underline text-gray-900 font-mono">₪{selectedItem.price.toFixed(2)}</span>
              </p>
              <p>
                <strong>{t.shelfLabel}</strong>{" "}
                <span className="font-semibold text-gray-700 font-mono">מדף {selectedItem.shelf}</span>
              </p>

              {/* Saved Item Image */}
              {(() => {
                const resolvedImg = GetItemPrimaryImageBySku(selectedItem.sku, itemPictureUrls, isRtl);
                return (
                  <div className="mt-3 border-t border-gray-150 pt-2.5">
                    <div className="w-full aspect-[4/3] rounded-lg bg-slate-50 overflow-hidden relative border border-gray-200">
                      <img
                        src={resolvedImg}
                        alt={isRtl ? selectedItem.nameHe : selectedItem.nameEn}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                        style={{ filter: selectedItem.imageFilter }}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="w-full mt-1.5 flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span className="truncate">{isRtl ? "תמונת פריט שמורה מהמלאי" : "Saved Item Image preview"}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Active mappings list for selected item */}
          <div className="mt-5 pt-4 border-t border-gray-200 text-xs text-right">
            <h4 className="font-extrabold text-[#1F2937] text-[13px] mb-3">{t.mappedSummary}</h4>
            {itemMappings.filter((m) => m.itemId === selectedSku).length > 0 ? (
              <div className="space-y-3.5 text-right">
                {itemMappings
                  .filter((m) => m.itemId === selectedSku)
                  .map((mapping) => {
                    const type = attributeTypes.find((t) => t.id === mapping.typeId);
                    if (!type) return null;
                    const isSelected = activeTypeId === mapping.typeId;
                    return (
                      <div
                        key={mapping.typeId}
                        onClick={() => setActiveTypeId(mapping.typeId)}
                        className={`p-3.5 rounded-lg border text-right transition-all duration-200 cursor-pointer select-none flex flex-col gap-2 ${
                          isSelected
                            ? "bg-blue-50 border-[#2563EB] ring-2 ring-blue-600/15 shadow-md -translate-x-1"
                            : "bg-white border-gray-200 hover:bg-slate-50 hover:border-gray-300 hover:shadow-2xs"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-3 w-full">
                          <div className="text-right">
                            {/* Prominent attribute name: Font size 16px, bold, elegant leading */}
                            <h5 className={`text-[16px] font-bold leading-normal tracking-tight transition-colors ${
                              isSelected ? "text-blue-950 font-black" : "text-gray-900 font-bold"
                            }`}>
                              {isRtl ? type.nameHe : type.nameEn}
                            </h5>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isAuthorized && deleteItemMapping && (() => {
                              const isPending = pendingDeleteTypeId === mapping.typeId;
                              return (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!isPending) {
                                      setPendingDeleteTypeId(mapping.typeId);
                                      // Auto reset if the user doesn't confirm in 4 seconds
                                      setTimeout(() => {
                                        setPendingDeleteTypeId((prev) => prev === mapping.typeId ? null : prev);
                                      }, 4000);
                                    } else {
                                      deleteItemMapping(selectedSku, mapping.typeId);
                                      setPendingDeleteTypeId(null);
                                      setSuccessFeedback(isRtl ? "השיוך נמחק ונותק בהצלחה!" : "Mapping disconnected successfully!");
                                      setTimeout(() => setSuccessFeedback(null), 3000);
                                    }
                                  }}
                                  className={`p-1.5 flex items-center gap-1 text-[10px] font-extrabold rounded-md border transition-all duration-200 cursor-pointer shrink-0 ${
                                    isPending
                                      ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse px-2"
                                      : "bg-slate-50 border-gray-200 text-red-650 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                  }`}
                                  title={isPending ? (isRtl ? "לחץ שוב לאישור מחיקה" : "Click again to confirm delete") : (isRtl ? "ניתוק קשר מלא ומחיקה" : "Full Delete & Disconnect")}
                                >
                                  {isPending ? (
                                    <>
                                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                      <span>{isRtl ? "בטוח?" : "Sure?"}</span>
                                    </>
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5 text-red-600 shrink-0" />
                                  )}
                                </button>
                              );
                            })()}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                              mapping.isMandatory
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-gray-100 text-gray-650 border-gray-200"
                            }`}>
                              {mapping.isMandatory ? t.isMandatoryLabel : t.isOptionalLabel}
                            </span>
                          </div>
                        </div>

                        {/* Allowed values rendering as elegant chips/pills, completely avoiding the textbox design */}
                        {(() => {
                          const mappedVals = type.values
                            .filter((v) => mapping.allowedValueIds.includes(v.id))
                            .map((v) => isRtl ? v.valueHe : v.valueEn);
                          if (mappedVals.length === 0) return null;
                          return (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {mappedVals.map((valStr, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-colors border shadow-3xs ${
                                    isSelected
                                      ? "bg-white text-blue-900 border-blue-200"
                                      : "bg-blue-50/70 text-slate-700 border-slate-150/80"
                                  }`}
                                >
                                  {valStr}
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-gray-400 italic text-[11px]">{t.noMappings}</p>
            )}
          </div>
        </div>

        {/* Right Span (8): Active attribute mapping details form */}
        <div className="lg:col-span-8">
          
          {/* STEP 1: Select Attribute Type */}
          <div className="mb-4 text-right">
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">{t.selectAttrType}</label>
            
            {/* Attribute Type Search Filter Box */}
            <div className="relative mb-3 max-w-md" id="attr-type-search-box-container">
              <label className="sr-only">{isRtl ? "חיפוש סוג מאפיין" : "Attribute Type Search"}</label>
              <input
                id="attr-type-search-input"
                type="text"
                placeholder={isRtl ? "הקלד שם לסינון..." : "Type a name to filter..."}
                value={attrSearchTerm}
                onChange={(e) => setAttrSearchTerm(e.target.value)}
                className={`w-full text-xs font-medium bg-white border border-gray-300 rounded-lg py-2 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none ${
                  isRtl ? 'pl-8 pr-10 text-right' : 'pl-10 pr-8 text-left'
                }`}
              />
              <div className={`absolute top-2.5 ${isRtl ? 'right-3' : 'left-3'} text-slate-400 pointer-events-none`}>
                <Search className="h-4 w-4" />
              </div>
              {attrSearchTerm.trim() && (
                <button
                  type="button"
                  id="clear-attr-search-btn"
                  onClick={() => setAttrSearchTerm("")}
                  className={`absolute top-2 ${isRtl ? 'left-2.5' : 'right-2.5'} p-0.5 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-650 transition cursor-pointer select-none`}
                  title={isRtl ? "נקה סינון פריט" : "Clear attribute search"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 justify-start">
              {filteredTypes.length === 0 ? (
                <div id="no-attr-results-message" className="py-3 px-4 bg-slate-55 border border-slate-200 rounded-lg text-slate-400 italic text-xs w-full text-right shadow-3xs">
                  {isRtl
                    ? "לא נמצאו סוגי מאפיינים התואמים לחיפוש."
                    : "No matching attribute types were found."}
                </div>
              ) : (
                filteredTypes.map((type) => {
                  const isMapped = itemMappings.some(
                    (m) => m.itemId === selectedSku && m.typeId === type.id
                  );
                  const isActive = type.id === activeTypeId;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      id={`attr-type-btn-${type.id}`}
                      onClick={() => setActiveTypeId(type.id)}
                      className={`px-3 py-1.5 rounded text-xs transition duration-155 relative cursor-pointer select-none border font-bold ${
                        isActive
                          ? "bg-[#2563EB] text-white border-blue-750 ring-2 ring-blue-500/30 shadow-md scale-[1.04]"
                          : "bg-white border-gray-300 text-gray-700 hover:bg-blue-50/50 hover:text-[#2563EB] hover:border-blue-300 hover:scale-[1.02]"
                      }`}
                    >
                      {isRtl ? type.nameHe : type.nameEn}
                      {isMapped && (
                        <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white animate-pulse"></span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* STEP 2: Value Selection and Checkboxes with Validation */}
          {filteredTypes.length === 0 ? (
            <div id="allowed-values-search-empty-banner" className="border border-dashed border-gray-300 bg-gray-50/40 rounded-lg p-6 text-center animate-fadeIn text-xs mt-4">
              <p className="text-gray-500 font-bold block mb-1">
                {isRtl ? "לא נמצאו מאפיינים התואמים לחיפוש." : "No matching attributes were found."}
              </p>
              <span className="text-[10px] text-gray-400">
                {isRtl ? "נסה להזין ערך חיפוש אחר או נקה את שדה הסינון" : "Try entering a different keyword or clearing the filter"}
              </span>
            </div>
          ) : assignedMappings.length === 0 && !activeTypeId ? (
            <div id="no-assigned-attributes-banner" className="border border-dashed border-gray-300 bg-gray-50/40 rounded-lg p-6 text-center animate-fadeIn text-xs mt-4">
              <p className="text-gray-500 font-bold block mb-1">
                {isRtl ? "לפריט זה עדיין לא הוגדרו מאפיינים." : "No attributes have been assigned to this item yet."}
              </p>
            </div>
          ) : currentType ? (
            <form onSubmit={handleSave} className="border border-gray-200 rounded-lg p-4 sm:p-5 mt-4">
              <h3 className="text-xs uppercase font-extrabold text-gray-800 tracking-wider mb-4 pb-2 border-b border-gray-150 text-right">
                {t.mappingFormHeader} {currentType ? ` - ${isRtl ? currentType.nameHe : (currentType.nameEn || currentType.nameHe)}` : ""}
              </h3>

              {/* Error Feedbacks */}
              {errorFeedback && (
                <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 text-red-650 shrink-0" />
                  <span>{errorFeedback}</span>
                </div>
              )}
              {successFeedback && (
                <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-[#2563EB] shrink-0" />
                  <span>{successFeedback}</span>
                </div>
              )}

              {/* Mandatory Checklist Switch */}
              <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200 flex items-center justify-between text-xs font-semibold text-gray-700">
                <span className="flex items-center gap-1.5">
                  <HelpCircle className="h-4.5 w-4.5 text-blue-600" />
                  {t.chkMandatory}
                </span>
                <input
                  type="checkbox"
                  disabled={!isAuthorized}
                  checked={isMandatory}
                  onChange={(e) => setIsMandatory(e.target.checked)}
                  className="h-4 w-4 text-[#2563EB] focus:ring-blue-500 rounded border-gray-300 accent-blue-600 cursor-pointer"
                />
              </div>

              {/* allowed values checkbox list */}
              <div className="mb-4 text-right">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-700" id="allowed-values-sub-label">
                    {isRtl 
                      ? `הערכים המותרים עבור: ${currentType ? currentType.nameHe : ""}` 
                      : `Allowed values for: ${currentType ? (currentType.nameEn || currentType.nameHe) : ""}`}
                  </label>
                  
                  {isAuthorized && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-[10px] text-[#2563EB] hover:underline border-none p-0 cursor-pointer font-bold"
                      >
                        {t.btnSelectAll}
                      </button>
                      <span className="text-gray-300 text-[10px]">|</span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[10px] text-gray-500 hover:underline border-none p-0 cursor-pointer font-bold"
                      >
                        {t.btnClearAll}
                      </button>
                    </div>
                  )}
                </div>

                {typeValues.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {typeValues.map((val) => {
                      const isChecked = selectedValues.includes(val.id);
                      return (
                        <div
                          key={val.id}
                          onClick={() => handleToggleValue(val.id)}
                          className={`p-3 rounded border text-xs flex items-center gap-2 select-none transition ${
                            isChecked
                              ? "bg-blue-50/70 border-blue-200 text-blue-900 font-bold shadow-[inset_0_1px_2px_0_rgba(37,99,235,0.06)]"
                              : "bg-white border-gray-200 text-slate-600 hover:bg-gray-50 hover:border-gray-300"
                          } ${isAuthorized ? "cursor-pointer" : "pointer-events-none opacity-80"}`}
                        >
                          {isChecked ? (
                            <CheckSquare className="h-4 w-4 text-[#2563EB] shrink-0" />
                          ) : (
                            <Square className="h-4 w-4 text-gray-350 shrink-0" />
                          )}
                          <span className="truncate">
                            {isRtl ? val.valueHe : val.valueEn}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-xs py-4 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                    אין ערכים מוגדרים פעילים לסוג מאפיין זה.
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              {isAuthorized && (() => {
                const isCurrentMapped = itemMappings.some(
                  (m) => m.itemId === selectedSku && m.typeId === activeTypeId
                );
                return (
                  <div className="flex flex-wrap items-center justify-between pt-2 gap-2 border-t border-gray-150 mt-3">
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-6 rounded transition duration-150 select-none cursor-pointer shadow-sm min-h-[38px]"
                    >
                      <Save className="h-4 w-4" />
                      {t.btnSave}
                    </button>

                    {isCurrentMapped && deleteItemMapping && (() => {
                      const isPending = pendingFormDelete;
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            if (!isPending) {
                              setPendingFormDelete(true);
                              // Auto reset if user doesn't confirm in 4 seconds
                              setTimeout(() => {
                                setPendingFormDelete(false);
                              }, 4000);
                            } else {
                              deleteItemMapping(selectedSku, activeTypeId);
                              setPendingFormDelete(false);
                              setSuccessFeedback(isRtl ? "נותק קשר של מק\"ט - מאפיין בהצלחה!" : "SKU-attribute disconnected successfully!");
                              setTimeout(() => setSuccessFeedback(null), 3500);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 font-bold text-xs py-2 px-4 rounded transition-all duration-200 select-none cursor-pointer shadow-sm min-h-[38px] ${
                            isPending
                              ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                              : "bg-red-600 hover:bg-red-700 text-white"
                          }`}
                        >
                          {isPending ? (
                            <>
                              <AlertCircle className="h-4 w-4 shrink-0 text-white" />
                              <span>{isRtl ? "לחץ שוב לאישור למחיקה סופית!" : "Click again to confirm delete!"}</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              <span>{isRtl ? "ניתוק קשר מלא ומחיקה" : "Full Delete & Disconnect"}</span>
                            </>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                );
              })()}

            </form>
          ) : null}

        </div>

      </div>
    </div>
  );
};
