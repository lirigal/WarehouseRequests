import React, { useState, useEffect, useRef } from "react";
import { WarehouseItem, AttributeType, ItemAttributeMapping, Language, WarehouseRequest, ItemPictureUrl } from "../types";
import { GetItemPrimaryImageBySku } from "../lib/imageService";
import { FileText, Loader2, HelpCircle, CheckCircle, AlertTriangle, ArrowLeftRight, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface RequestFormProps {
  currentLanguage: Language;
  currentUserEmail: string;
  currentUserRole?: string;
  warehouseItems: WarehouseItem[];
  attributeTypes: AttributeType[];
  itemMappings: ItemAttributeMapping[];
  activeRequests: WarehouseRequest[];
  onCreateRequest: (
    sku: string,
    quantity: number,
    selectedAttributeValueId: string
  ) => { error?: string; request?: WarehouseRequest };
  itemPictureUrls?: ItemPictureUrl[];
}

const formatDateToParts = (dateStr: string) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return { date: `${dd}/${mm}/${yyyy}`, time: `${hh}:${min}` };
};

export const RequestForm: React.FC<RequestFormProps> = ({
  currentLanguage,
  currentUserEmail,
  currentUserRole = "STAFF",
  warehouseItems,
  attributeTypes,
  itemMappings,
  activeRequests,
  onCreateRequest,
  itemPictureUrls = []
}) => {
  const isRtl = currentLanguage === "HE";

  // Filter active requests strictly by the currently logged-in user's email (regardless of role)
  const myRequests = activeRequests.filter((req) => {
    return req.requestedBy ? req.requestedBy.toLowerCase().trim() === currentUserEmail.toLowerCase().trim() : false;
  });

  // Sort only the current user's requests / authorized requests by creation date descending (newest first)
  const sortedMyRequests = [...myRequests].sort((a, b) => {
    return new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime();
  });

  // Status choice filter state with localStorage persistence
  const [statusFilter, setStatusFilter] = React.useState<string>(() => {
    try {
      const saved = localStorage.getItem("requestsStatusFilter");
      if (saved && ["all", "pending", "issued"].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn("localStorage is disabled or inaccessible:", e);
    }
    return "all"; // default is display all
  });

  const handleStatusFilterChange = (newFilter: string) => {
    setStatusFilter(newFilter);
    setCurrentPage(1); // reset to page 1 to avoid pagination index problems
    try {
      localStorage.setItem("requestsStatusFilter", newFilter);
    } catch (e) {
      console.warn("Failed to store requestsStatusFilter:", e);
    }
  };

  // Filter sortedMyRequests based on the active status selection
  const filteredMyRequests = sortedMyRequests.filter((req) => {
    if (statusFilter === "all") return true;

    const isIssued = req.statusHe.includes("נופק") || 
                     req.statusHe.includes("בוצע") || 
                     (req.statusEn && (
                       req.statusEn.toLowerCase().includes("dispatched") || 
                       req.statusEn.toLowerCase().includes("delivered")
                     )) || 
                     req.requestId === "WR-2026-6402";

    if (statusFilter === "issued") {
      return isIssued;
    } else if (statusFilter === "pending") {
      return !isIssued;
    }
    return true;
  });

  // Pagination states & storage persistence
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const userKey = `volcani_requests_page_size_${currentUserEmail || "guest"}`;
      const saved = localStorage.getItem(userKey) || localStorage.getItem("requestsPageSize");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([5, 10, 20, 30, 50].includes(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("localStorage is disabled or inaccessible:", e);
    }
    return 10; // default page size
  });

  const [currentPage, setCurrentPage] = useState<number>(1);

  // Automatically restore page size when user changes
  useEffect(() => {
    try {
      const userKey = `volcani_requests_page_size_${currentUserEmail || "guest"}`;
      const saved = localStorage.getItem(userKey) || localStorage.getItem("requestsPageSize");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if ([5, 10, 20, 30, 50].includes(parsed)) {
          setPageSize(parsed);
          setCurrentPage(1);
          return;
        }
      }
    } catch (e) {}
    setPageSize(10);
    setCurrentPage(1);
  }, [currentUserEmail]);

  // Reset page to 1 when pageSize or active requests change
  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, activeRequests.length]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    try {
      const userKey = `volcani_requests_page_size_${currentUserEmail || "guest"}`;
      localStorage.setItem(userKey, String(newSize));
      localStorage.setItem("requestsPageSize", String(newSize));
    } catch (e) {
      console.warn("Failed to store requestsPageSize:", e);
    }
  };

  const totalRequests = filteredMyRequests.length;
  const totalPages = Math.ceil(totalRequests / pageSize) || 1;
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRequests = filteredMyRequests.slice(startIndex, startIndex + pageSize);

  const lblPageSize = isRtl ? "שורות לעמוד:" : "Rows per page:";
  const lblPageOf = (curr: number, totalPagesVal: number) => 
    isRtl ? `עמוד ${curr} מתוך ${totalPagesVal}` : `Page ${curr} of ${totalPagesVal}`;
  const lblShowingRange = (fromValue: number, toValue: number, totalValue: number) => 
    isRtl ? `מציג ${fromValue}-${toValue} מתוך ${totalValue}` : `Showing ${fromValue}-${toValue} of ${totalValue}`;

  const from = totalRequests === 0 ? 0 : startIndex + 1;
  const to = Math.min(startIndex + pageSize, totalRequests);

  // Form states
  const [selectedSku, setSelectedSku] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedValIds, setSelectedValIds] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isDropdownExpanded, setIsDropdownExpanded] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const [currentPictureIndex, setCurrentPictureIndex] = useState(0);

  // Simulated AJAX Loader state
  const [isAjaxLoading, setIsAjaxLoading] = useState(false);
  const [ajaxCompleted, setAjaxCompleted] = useState(false);

  // Success / error feedbacks
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const selectedItemForForm = warehouseItems.find((item) => item.sku === selectedSku);

  const handleQuantityChange = (valStr: string) => {
    let val = parseInt(valStr);
    if (isNaN(val)) {
      setQuantity(1);
      return;
    }
    if (selectedItemForForm && val > selectedItemForForm.stock) {
      val = selectedItemForForm.stock;
    }
    if (val < 1) {
      val = 1;
    }
    setQuantity(val);
  };

  // Trigger simulated ajax loader when selected item SKUs are updated
  useEffect(() => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setSelectedValIds({});
    setCurrentPictureIndex(0);

    if (!selectedSku) {
      setAjaxCompleted(false);
      return;
    }

    setIsAjaxLoading(true);
    setAjaxCompleted(false);

    // Simulate 350ms network delay to fetch matching mappings (Web Forms asynchronous AJAX simulation)
    const timer = setTimeout(() => {
      setIsAjaxLoading(false);
      setAjaxCompleted(true);
    }, 450);

    return () => clearTimeout(timer);
  }, [selectedSku]);

  // Filter core items
  const filteredItems = warehouseItems.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    const visibleSku = item.sku.slice(-7);
    return (
      visibleSku.toLowerCase().includes(term) ||
      item.nameHe.toLowerCase().includes(term) ||
      item.nameEn.toLowerCase().includes(term)
    );
  });

  // Automatically select SKU if there's exactly 1 item in the filtered list
  useEffect(() => {
    if (filteredItems.length === 1 && filteredItems[0].sku !== selectedSku) {
      setSelectedSku(filteredItems[0].sku);
    }
  }, [filteredItems.length, filteredItems[0]?.sku, selectedSku]);

  // Find all mapped configurations
  const linkedMappings = itemMappings.filter((m) => m.itemId === selectedSku);
  const mappedAttributes = linkedMappings.map((mapping) => {
    const type = attributeTypes.find((t) => t.id === mapping.typeId && t.isActive && !t.isDeleted);
    const allowedValues = type
      ? type.values.filter((v) => v.isActive && !v.isDeleted && mapping.allowedValueIds.includes(v.id))
      : [];
    return {
      mapping,
      type,
      allowedValues,
    };
  }).filter((item) => item.type !== undefined && item.allowedValues.length > 0);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!selectedSku) {
      setSubmitError(isRtl ? "אנא בחר פריט מבוקש" : "Please select a required item");
      return;
    }

    if (quantity < 1) {
      setSubmitError(isRtl ? "כמות הניפוק המינימלית היא פריט אחד" : "Quantity requested must be at least 1");
      return;
    }

    if (selectedItemForForm && quantity > selectedItemForForm.stock) {
      setSubmitError(
        isRtl 
          ? `חריגת כמות: המלאי הנתון במחסן הוא ${selectedItemForForm.stock} יחידות בלבד.` 
          : `Insufficient stock: There are only ${selectedItemForForm.stock} pieces available in the warehouse.`
      );
      return;
    }

    // Mandatory attribute verification for all mapped attributes
    for (const { mapping, type } of mappedAttributes) {
      if (!type) continue;
      const currentValId = selectedValIds[type.id] || "";
      if (mapping.isMandatory && !currentValId) {
        const attrLabel = isRtl ? type.nameHe : type.nameEn;
        setSubmitError(
          isRtl 
            ? `שגיאת ולידציה: חובה לבחור '${attrLabel}' עבור פריט זה!` 
            : `Validation Error: Choosing '${attrLabel}' is mandatory for this item!`
        );
        return;
      }
    }

    // Join selected values into a comma-separated list of IDs for the backend to parse
    const joinedValueIds = Object.values(selectedValIds).filter(Boolean).join(",");

    // Process request
    const response = onCreateRequest(selectedSku, quantity, joinedValueIds);
    if (response.error) {
      setSubmitError(response.error);
    } else if (response.request) {
      setSubmitSuccess(
        isRtl 
          ? `דרישת הניפוק נוצרה ונקלטה בהצלחה! מזהה: ${response.request.requestId}` 
          : `Warehouse Request submitted successfully! ID: ${response.request.requestId}`
      );
      // Reset form variables
      setSelectedSku("");
      setQuantity(1);
      setSelectedValIds({});
      setAjaxCompleted(false);

      // Auto dismiss success toast
      setTimeout(() => setSubmitSuccess(null), 5000);
    }
  };

  // Localized string variables
  const t = {
    titleHe: "הגשת דרישת ניפוק פריט מהמחסן",
    titleEn: "AddRequest.aspx - Submit Outbound Warehouse Request",
    descHe: "הגשת בקשה חדשה לניפוק מהמחסן הראשי במכון וולקני. שדה המאפיינים ייטען אסינכרונית ודינמית על בסיס הגדרות המק\"ט.",
    descEn: "Select item, input quantity, and fill mapped dynamic attributes to check out items from central inventory catalog.",
    lblSelect: isRtl ? "איתור וחיפוש פריט:" : "Search/Select Catalog Item:",
    lblPrompt: isRtl ? "--- בחר פריט מהרשימה ---" : "--- Select item from list ---",
    lblQuantity: isRtl ? "כמות מבוקשת:" : "Requested Quantity:",
    btnSubmit: isRtl ? "שלח דרישה לאישור" : "Submit Request",
    ajaxLoadingHe: "טוען מאפייני פריט מאובטחים...",
    ajaxLoadingEn: "Loading required attributes via AJAX...",
    valIsRequired: isRtl ? " (חובה)" : " (Required)",
    lastRequests: isRtl ? "דרישות אחרונות שנקלטו במערכת" : "Recent submitted requests",
    colReqId: isRtl ? "מס' דרישה" : "Req ID",
    colItem: isRtl ? "שם פריט ומק\"ט" : "Sku & Description",
    colQty: isRtl ? "כמות" : "Qty",
    colAttr: isRtl ? "מאפיין שנבחר" : "Selected Variant",
    colDate: isRtl ? "תאריך" : "Submitted Date",
    colRequester: isRtl ? "מגיש הבקשה" : "Requested By",
    colStatus: isRtl ? "סטטוס בקשה" : "Approval status"
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 shrink-0 sm:flex justify-between items-center border-b border-slate-750 text-white">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400 shrink-0" />
            {isRtl ? t.titleHe : t.titleEn}
          </h2>
          <p className="text-xs text-slate-300 font-medium mt-1">{isRtl ? t.descHe : t.descEn}</p>
        </div>
        <div className="text-xs bg-slate-800/80 border border-slate-700 font-mono py-1 px-2.5 rounded text-blue-300 mt-2 sm:mt-0 font-semibold shadow-xs">
          ASPX_TARGET: AddRequest.aspx
        </div>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form panel Column (3 Span) */}
        <form onSubmit={handleFormSubmit} className="lg:col-span-3 bg-gray-50 border border-gray-200 rounded-xl p-4 sm:p-5">
          
          {/* Error and success Alerts */}
          {submitError && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-1.5 leading-normal">
              <AlertTriangle className="h-4 w-4 text-red-650 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}
          {submitSuccess && (
            <div className="mb-4 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-blue-800 text-xs flex items-center gap-1.5 leading-normal">
              <CheckCircle className="h-4 w-4 text-[#2563EB] shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {/* Sku Selection */}
          <div className="mb-4 text-right">
            <label className="block text-[11px] font-extrabold tracking-wider text-slate-500 uppercase mb-1">{t.lblSelect}</label>
            
            {/* Live Search Input Box */}
            <div className="relative mb-1.5">
              <input
                type="text"
                placeholder={isRtl ? "חיפוש מהיר פריט מהרשימה..." : "Quick filter list..."}
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
                className={`w-full text-[11px] bg-white border border-gray-300 rounded py-1 px-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none h-8 ${
                  isRtl ? "pl-7 pr-2.5 text-right" : "pl-2.5 pr-7 text-left"
                }`}
              />
              <div className={`absolute top-2.5 ${isRtl ? 'left-2' : 'right-2'} text-slate-400 pointer-events-none`}>
                <Search className="h-3 w-3" />
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
              className={`w-full text-[11px] font-bold bg-white border border-gray-300 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] cursor-pointer ${
                isDropdownExpanded && searchTerm.trim() && filteredItems.length > 1 ? "h-auto py-1 shadow-md max-h-[220px]" : "h-8"
              }`}
              size={isDropdownExpanded && searchTerm.trim() && filteredItems.length > 1 ? Math.min(10, filteredItems.length + 1) : undefined}
            >
              <option value="">{t.lblPrompt}</option>
              {filteredItems.map((item) => {
                const linked = itemMappings.filter((m) => m.itemId === item.sku);
                const types = linked.map((m) => {
                  const type = attributeTypes.find((t) => t.id === m.typeId && t.isActive && !t.isDeleted);
                  return type ? (isRtl ? type.nameHe : type.nameEn) : null;
                }).filter((val): val is string => val !== null);
                
                const attrSuffix = types.length > 0 ? ` [${types.join(", ")}]` : "";
                
                return (
                  <option key={item.sku} value={item.sku}>
                    {item.sku.slice(-7)} - {isRtl ? item.nameHe : item.nameEn}{attrSuffix} (₪{item.price.toFixed(2)})
                  </option>
                );
              })}
              {filteredItems.length === 0 && (
                <option value="" disabled>
                  {isRtl ? "-- לא נמצאו פריטים תואמים --" : "-- No items matched query --"}
                </option>
              )}
            </select>
          </div>

          {/* Selected Item Image display with Multiple Picture Carousel Support */}
          {selectedSku && (
            (() => {
              const selectedItem = warehouseItems.find((item) => item.sku === selectedSku);
              
              // Filter active pictures for this SKU
              const skuPics = itemPictureUrls.filter(
                (pic) => pic.sku.trim() === selectedSku.trim() && pic.isActive
              );

              // Sort to make sure primary picture is first
              const sortedPics = [...skuPics].sort((a, b) => {
                if (a.isPrimary && !b.isPrimary) return -1;
                if (!a.isPrimary && b.isPrimary) return 1;
                return 0;
              });

              // Construct the image array. Fall back to primary image lookup if no specific pictures are in database
              const imageUrls = sortedPics.length > 0
                ? sortedPics.map((p) => p.imageUrl)
                : [GetItemPrimaryImageBySku(selectedSku, itemPictureUrls, isRtl)];

              const safeIndex = currentPictureIndex < imageUrls.length ? currentPictureIndex : 0;
              const activeImgUrl = imageUrls[safeIndex];
              const hasMultiplePics = imageUrls.length > 1;

              const handlePrev = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentPictureIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
              };

              const handleNext = (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentPictureIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1));
              };

              return (
                <div className="mb-4 bg-white p-3 rounded-lg border border-gray-200 shadow-xs flex flex-col items-center justify-center animate-fade-in relative group overflow-hidden text-right select-none">
                  <div className="w-full aspect-[4/3] rounded-lg bg-slate-50 overflow-hidden relative border border-gray-200 flex items-center justify-center">
                    
                    {/* The image itself – object-contain prevents distortion while ensuring 100% visibility */}
                    <img
                      key={activeImgUrl}
                      src={activeImgUrl}
                      alt={selectedItem ? (isRtl ? selectedItem.nameHe : selectedItem.nameEn) : selectedSku}
                      className="w-full h-full object-contain animate-fade-in transition-all duration-300"
                      style={{ filter: selectedItem?.imageFilter }}
                      referrerPolicy="no-referrer"
                    />

                    {/* Navigation Controls: Centered Vertically */}
                    {hasMultiplePics && (
                      <>
                        {/* Previous Image (◀ Left side arrow) */}
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full p-2.5 transition-all duration-200 shadow-md z-15 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none flex items-center justify-center"
                          title={isRtl ? "תמונה קודמת" : "Previous Image"}
                        >
                          <ChevronLeft className="h-4 w-4 shrink-0 stroke-[2.5]" />
                        </button>

                        {/* Next Image (▶ Right side arrow) */}
                        <button
                          type="button"
                          onClick={handleNext}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/75 text-white rounded-full p-2.5 transition-all duration-200 shadow-md z-15 hover:scale-105 active:scale-95 cursor-pointer focus:outline-none flex items-center justify-center"
                          title={isRtl ? "תמונה הבאה" : "Next Image"}
                        >
                          <ChevronRight className="h-4 w-4 shrink-0 stroke-[2.5]" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Caption & Picture Count Indicator */}
                  <div className="w-full pt-2.5 flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-2 truncate">
                      <span className="truncate">{isRtl ? "תמונת פריט שמורה מהמלאי" : "Saved Item Image preview"}</span>
                      {hasMultiplePics && (
                        <span className="bg-blue-50 text-blue-750 px-1.5 py-0.5 rounded-full text-[9px] font-mono leading-none border border-blue-100 flex items-center justify-center shrink-0">
                          {safeIndex + 1} / {imageUrls.length}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-slate-400 font-normal">
                      {selectedItem?.shelf && `${isRtl ? "מדף" : "Shelf"}: ${selectedItem.shelf}`}
                    </span>
                  </div>
                </div>
              );
            })()
          )}

          {/* Simulated Async AJAX Attributes Panel */}
          {selectedSku && isAjaxLoading && (
            <div className="mb-4 p-3 bg-white border border-gray-200 border-dashed rounded text-center text-xs text-gray-550 font-medium flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#2563EB] shrink-0" />
              <span>{isRtl ? t.ajaxLoadingHe : t.ajaxLoadingEn}</span>
            </div>
          )}

          {/* Render Attribute Dropdown dynamically on load complete */}
          {selectedSku && ajaxCompleted && mappedAttributes.length > 0 && (
            <div className="space-y-4 mb-4">
              {mappedAttributes.map(({ mapping, type, allowedValues }) => {
                if (!type) return null;
                const typeId = type.id;
                const currentValId = selectedValIds[typeId] || "";

                return (
                  <div key={typeId} className="text-right p-3 bg-blue-50/40 border border-blue-150 rounded-lg animate-fade-in">
                    <label className="block text-xs font-bold text-gray-800 mb-1.5">
                      {isRtl ? type.nameHe : type.nameEn}
                      {mapping.isMandatory && (
                        <span className="text-red-550 font-extrabold">{t.valIsRequired}</span>
                      )}
                      :
                    </label>

                    <select
                      value={currentValId}
                      onChange={(e) => {
                        setSelectedValIds((prev) => ({
                          ...prev,
                          [typeId]: e.target.value
                        }));
                      }}
                      className="w-full text-xs bg-white border border-gray-300 rounded px-2 py-1.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] cursor-pointer"
                      required={mapping.isMandatory}
                    >
                      <option value="">
                        {isRtl 
                          ? `-- בחר ${type.nameHe} --` 
                          : `-- Choose ${type.nameEn} --`
                        }
                      </option>
                      {allowedValues.map((v) => (
                        <option key={v.id} value={v.id}>
                          {isRtl ? v.valueHe : v.valueEn}
                        </option>
                      ))}
                    </select>

                    {mapping.isMandatory && !currentValId && (
                      <span className="text-[10px] text-red-550 font-bold mt-1 block">
                        * {isRtl ? "בחירה חובה" : "Attribute choice is required"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Quantity Selector */}
          <div className="mb-4 text-right justify-between flex items-center">
            <div className="grow text-right">
              <label className="block text-xs font-bold text-[#1F2937] mb-1.5">{t.lblQuantity}</label>
              <input
                type="number"
                min="1"
                max={selectedItemForForm ? selectedItemForForm.stock : undefined}
                value={quantity}
                onChange={(e) => handleQuantityChange(e.target.value)}
                className="w-24 font-mono font-bold text-center border border-gray-300 rounded px-2 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]"
              />
              {selectedSku && selectedSku.length > 0 && (
                <span className="text-[11px] text-gray-500 font-medium mr-2 ml-2">
                  {isRtl ? "יחידות הזמנה פעילות" : "active pieces requested"}
                </span>
              )}
              {selectedItemForForm && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-850 text-[11px] font-semibold flex items-center gap-1.5 leading-normal">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-600 animate-pulse shrink-0"></span>
                  <span>
                    {isRtl 
                      ? `מלאי מרבי זמין במחסן: ${selectedItemForForm.stock} יחידות` 
                      : `Maximum stock limit available: ${selectedItemForForm.stock} units`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Live Pricing Summary block */}
          {selectedSku && (
            (() => {
              const selectedItem = warehouseItems.find((item) => item.sku === selectedSku);
              if (!selectedItem) return null;
              return (
                <div className="mb-4 p-3.5 bg-blue-50/50 border border-blue-200 rounded-lg animate-fade-in text-xs text-right">
                  <div className="flex justify-between items-center font-sans mb-1.5 text-slate-750">
                    <span className="font-semibold text-slate-500">
                      {isRtl ? "מחיר פריט (ליחידה):" : "Item Price (per unit):"}
                    </span>
                    <span className="font-mono font-bold text-slate-800">₪{selectedItem.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center font-sans border-t border-blue-105 pt-2 mt-1.5">
                    <span className="font-bold text-slate-700">
                      {isRtl ? "מחיר כולל עבור ההזמנה:" : "Total Price for Order:"}
                    </span>
                    <span className="font-mono text-sm font-black text-blue-700">
                      ₪{(selectedItem.price * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()
          )}

          {/* Form Submit wrapper */}
          <div className="text-left pt-2 border-t border-gray-200 mt-4">
            <button
              type="submit"
              className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs py-2 px-6 rounded transition select-none cursor-pointer shadow-sm flex items-center justify-center gap-1.5 min-h-[38px] w-full sm:w-auto"
            >
              <ArrowLeftRight className="h-4 w-4 shrink-0" />
              {t.btnSubmit}
            </button>
          </div>

        </form>

        {/* Requests history panel (9 Span) */}
        <div className="lg:col-span-9">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 select-none" style={{ direction: isRtl ? "rtl" : "ltr" }}>
            <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB]"></span>
              {t.lastRequests}
            </h3>
            
            {/* Elegant Status Filter Segmented Controls */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0 items-center self-start sm:self-auto shadow-2xs font-sans">
              <button
                type="button"
                onClick={() => handleStatusFilterChange("all")}
                className={`px-3 py-1 text-[11px] sm:text-xs font-bold rounded-md transition duration-150 cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-white text-[#2563EB] shadow-sm font-extrabold border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {isRtl ? "הכול" : "All"}
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange("pending")}
                className={`px-3 py-1 text-[11px] sm:text-xs font-bold rounded-md transition duration-150 cursor-pointer ${
                  statusFilter === "pending"
                    ? "bg-white text-[#2563EB] shadow-sm font-extrabold border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {isRtl ? "ממתין לניפוק" : "Pending Issue"}
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilterChange("issued")}
                className={`px-3 py-1 text-[11px] sm:text-xs font-bold rounded-md transition duration-150 cursor-pointer ${
                  statusFilter === "issued"
                    ? "bg-white text-[#2563EB] shadow-sm font-extrabold border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {isRtl ? "נופק" : "Issued"}
              </button>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border border-gray-250 rounded-xl overflow-x-auto shadow-sm">
            <table className="min-w-full text-xs text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-550 font-bold border-b border-gray-200">
                  <th className="py-2.5 px-2 font-bold text-right w-24 whitespace-nowrap">{t.colReqId}</th>
                  <th className="py-2.5 px-2 font-bold text-right">{t.colItem}</th>
                  <th className="py-2.5 px-2 font-bold text-center w-14">{t.colQty}</th>
                  <th className="py-2.5 px-2 font-bold text-left w-20">{isRtl ? "מחיר פריט" : "Item Price"}</th>
                  <th className="py-2.5 px-2 font-bold text-left w-24">{isRtl ? "מחיר כולל" : "Total Price"}</th>
                  <th className="py-2.5 px-2 font-bold text-right">{t.colAttr}</th>
                  <th className="py-2.5 px-2 font-bold text-right w-24">{t.colDate}</th>
                  <th className="py-2.5 px-2 font-bold text-right">{t.colRequester}</th>
                  <th className="py-2.5 px-2 font-bold text-center w-30">{t.colStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 bg-white">
                {paginatedRequests.map((req) => {
                  const isIssued = req.statusHe.includes("נופק") || 
                                   req.statusHe.includes("בוצע") || 
                                   (req.statusEn && (
                                     req.statusEn.toLowerCase().includes("dispatched") || 
                                     req.statusEn.toLowerCase().includes("delivered")
                                   )) || 
                                   req.requestId === "WR-2026-6402";
                  const { date: reqD, time: reqT } = formatDateToParts(req.requestDate);
                  
                  // Calculate item price and total price dynamically from catalog
                  const matchingItem = warehouseItems.find((wi) => wi.sku === req.sku);
                  const itemPrice = matchingItem ? matchingItem.price : 0;
                  const totalPrice = itemPrice * req.quantityRequested;

                  return (
                    <tr 
                      key={req.requestId} 
                      className={`transition ${
                        isIssued 
                          ? "issued-order-disabled text-black border-r-4 border-r-gray-400 pointer-events-none" 
                          : "hover:bg-blue-50/30 bg-white"
                      }`}
                      style={isIssued ? { cursor: "not-allowed" } : undefined}
                    >
                      <td className={`py-2.5 px-2 font-mono font-bold ${isIssued ? "text-black" : "text-gray-500"}`}>{req.requestId}</td>
                      <td className="py-2.5 px-2 leading-tight font-sans">
                        <div className="flex items-center gap-2.5">
                          {(() => {
                            const finalImg = GetItemPrimaryImageBySku(req.sku, itemPictureUrls, isRtl);
                            return (
                              <div className="w-10 h-10 rounded border border-gray-250 overflow-hidden shrink-0 bg-gray-50">
                                <img
                                  src={finalImg}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  style={{ filter: matchingItem?.imageFilter }}
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            );
                          })()}
                          <div>
                            <div className={`font-bold ${isIssued ? "text-black" : "text-gray-900"}`}>{isRtl ? req.itemNameHe : req.itemNameEn}</div>
                            <div className={`font-mono text-[10px] ${isIssued ? "text-black font-semibold" : "text-gray-400"}`}>{isRtl ? 'מק"ט:' : 'SKU:'} {req.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`py-2.5 px-2 text-center font-bold font-mono ${isIssued ? "text-black font-extrabold" : "text-gray-905"}`}>{req.quantityRequested}</td>
                      
                      <td className={`py-2.5 px-2 font-mono text-left font-semibold ${isIssued ? "text-slate-600" : "text-slate-700"}`}>
                        ₪{itemPrice.toFixed(2)}
                      </td>
                      <td className={`py-2.5 px-2 font-mono text-left font-bold ${isIssued ? "text-slate-750" : "text-blue-700"}`}>
                        ₪{totalPrice.toFixed(2)}
                      </td>

                      <td className="py-2.5 px-2">
                        {req.attributeValueId ? (
                          <div className="flex flex-col font-sans">
                            <span className={`font-extrabold ${isIssued ? "text-black" : "text-[#2563EB]"}`}>{isRtl ? req.attributeValueNameHe : req.attributeValueNameEn}</span>
                            <span className={`text-[10px] font-medium ${isIssued ? "text-black font-semibold" : "text-gray-450"}`}>({isRtl ? req.attributeTypeNameHe : req.attributeTypeNameEn})</span>
                          </div>
                        ) : null}
                      </td>
                      <td className={`py-2.5 px-2 font-mono text-[11px] leading-tight ${isIssued ? "text-black font-bold" : "text-gray-400"}`}>
                        <div className="font-bold">{reqD}</div>
                        <div className={`text-[10px] ${isIssued ? "text-black font-medium" : "text-gray-400"}`}>{reqT}</div>
                      </td>
                      <td className="py-2.5 px-2 text-gray-850 font-medium leading-tight text-right">
                        <div className={`font-bold ${isIssued ? "text-black" : "text-gray-900"}`}>
                          {req.requestedBy === "svetlana@volcani.agri.gov.il"
                            ? (isRtl ? "סבטלנה (מנהלת)" : "Svetlana (Manager)")
                            : req.requestedBy === "dr.cohen@volcani.agri.gov.il"
                            ? (isRtl ? 'ד"ר כהן (חוקר)' : "Dr. Cohen (Staff)")
                            : req.requestedBy === "sarah.levy@volcani.agri.gov.il"
                            ? (isRtl ? "שרה לוי (חוקרת)" : "Sarah Levy (Staff)")
                            : req.requestedBy ? req.requestedBy.split("@")[0] : ""}
                        </div>
                        <div className={`text-[10px] font-mono ${isIssued ? "text-black font-semibold" : "text-gray-400"}`}>{req.requestedBy}</div>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${
                          isIssued 
                            ? "bg-slate-200 text-black border border-slate-400 font-extrabold cursor-not-allowed" 
                            : "bg-amber-100 text-amber-850 border border-amber-200"
                        }`}>
                          {isRtl ? req.statusHe : req.statusEn}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredMyRequests.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 px-4 text-center text-slate-400 italic font-medium">
                      {sortedMyRequests.length === 0 
                        ? (isRtl ? "לא נמצאו דרישות קודמות עבור המשתמש הנוכחי." : "No previous requests found for the current user.")
                        : (isRtl ? "לא נמצאו דרישות התואמות לסינון הנבחר." : "No requests found matching the current filter selection.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based View */}
          <div className="md:hidden space-y-3">
            {paginatedRequests.map((req) => {
              const isIssued = req.statusHe.includes("נופק") || 
                               req.statusHe.includes("בוצע") || 
                               (req.statusEn && (
                                 req.statusEn.toLowerCase().includes("dispatched") || 
                                 req.statusEn.toLowerCase().includes("delivered")
                               )) || 
                               req.requestId === "WR-2026-6402";
              const { date: reqD, time: reqT } = formatDateToParts(req.requestDate);

              // Calculate item price and total price dynamically from catalog
              const matchingItem = warehouseItems.find((wi) => wi.sku === req.sku);
              const itemPrice = matchingItem ? matchingItem.price : 0;
              const totalPrice = itemPrice * req.quantityRequested;

              return (
                <div 
                  key={req.requestId} 
                  className={`border rounded-xl p-4 shadow-sm space-y-3 transition ${
                    isIssued 
                      ? "issued-order-disabled border-gray-300 cursor-not-allowed pointer-events-none text-black" 
                      : "bg-white border-gray-250 hover:border-slate-300"
                  }`}
                  style={isIssued ? { cursor: "not-allowed" } : undefined}
                >
                  <div className="flex justify-between items-center bg-gray-50 -mx-4 -mt-4 px-4 py-2 rounded-t-xl border-b border-gray-100">
                    <span className={`font-mono text-xs font-black ${isIssued ? "text-black" : "text-gray-500"}`}>{req.requestId}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      isIssued 
                        ? "bg-slate-250 text-black border border-slate-400 font-extrabold" 
                        : "bg-amber-100 text-amber-850 border border-amber-200"
                    }`}>
                      {isRtl ? req.statusHe : req.statusEn}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {(() => {
                      const finalImg = GetItemPrimaryImageBySku(req.sku, itemPictureUrls, isRtl);
                      return (
                        <div className="w-12 h-12 rounded-lg border border-gray-200 overflow-hidden shrink-0 bg-slate-50">
                          <img
                            src={finalImg}
                            alt=""
                            className="w-full h-full object-cover"
                            style={{ filter: matchingItem?.imageFilter }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      );
                    })()}
                    <div>
                      <h4 className={`font-black text-sm leading-snug ${isIssued ? "text-black" : "text-gray-900"}`}>
                        {isRtl ? req.itemNameHe : req.itemNameEn}
                      </h4>
                      <p className={`font-mono text-[10px] mt-0.5 ${isIssued ? "text-black font-semibold" : "text-gray-400"}`}>{isRtl ? 'מק"ט:' : 'SKU:'} {req.sku}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-y border-dashed border-gray-100 py-2.5">
                    <div className="text-right">
                      <span className={`block text-[10px] ${isIssued ? "text-black font-bold" : "text-gray-400"}`}>{t.colQty}</span>
                      <strong className={`font-mono font-black ${isIssued ? "text-black" : "text-gray-900"}`}>{req.quantityRequested} יחידות</strong>
                    </div>
                    <div className="text-right">
                      <span className={`block text-[10px] ${isIssued ? "text-black font-bold" : "text-gray-400"}`}>{t.colAttr}</span>
                      {req.attributeValueId ? (
                        <div className="flex flex-col">
                          <strong className={`leading-tight ${isIssued ? "text-black" : "text-[#2563EB]"}`}>{isRtl ? req.attributeValueNameHe : req.attributeValueNameEn}</strong>
                          <span className={`text-[9px] ${isIssued ? "text-black font-semibold" : "text-gray-450"}`}>({isRtl ? req.attributeTypeNameHe : req.attributeTypeNameEn})</span>
                        </div>
                      ) : null}
                    </div>
                    
                    <div className="text-right border-t border-gray-50 pt-1.5">
                      <span className={`block text-[10px] ${isIssued ? "text-black font-bold" : "text-gray-400"}`}>{isRtl ? "מחיר פריט" : "Item Price"}</span>
                      <strong className={`font-mono font-bold ${isIssued ? "text-black text-xs" : "text-slate-700"}`}>₪{itemPrice.toFixed(2)}</strong>
                    </div>
                    <div className="text-right border-t border-gray-50 pt-1.5">
                      <span className={`block text-[10px] ${isIssued ? "text-black font-bold" : "text-gray-400"}`}>{isRtl ? "מחיר כולל" : "Total Price"}</span>
                      <strong className={`font-mono font-bold ${isIssued ? "text-black text-xs" : "text-blue-700"}`}>₪{totalPrice.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium">
                    <div className="text-right">
                      <span className={`font-mono text-[10px] block ${isIssued ? "text-black font-bold" : ""}`}>
                        {reqD} {reqT}
                      </span>
                    </div>
                    <div className="text-right">
                      <strong className={`font-bold block ${isIssued ? "text-black" : "text-gray-700"}`}>
                        {req.requestedBy === "svetlana@volcani.agri.gov.il"
                          ? (isRtl ? "סבטלנה (מנהלת)" : "Svetlana (Manager)")
                          : req.requestedBy === "dr.cohen@volcani.agri.gov.il"
                          ? (isRtl ? 'ד"ר כהן (חוקר)' : "Dr. Cohen (Staff)")
                          : req.requestedBy === "sarah.levy@volcani.agri.gov.il"
                          ? (isRtl ? "שרה לוי (חוקרת)" : "Sarah Levy (Staff)")
                          : req.requestedBy ? req.requestedBy.split("@")[0] : ""}
                      </strong>
                      <span className={`font-mono text-[8px] block leading-none mt-0.5 ${isIssued ? "text-black font-semibold" : "text-gray-400"}`}>{req.requestedBy}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredMyRequests.length === 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center text-slate-400 italic text-xs font-medium">
                {sortedMyRequests.length === 0 
                  ? (isRtl ? "לא נמצאו דרישות קודמות עבור המשתמש הנוכחי." : "No previous requests found for the current user.")
                  : (isRtl ? "לא נמצאו דרישות התואמות לסינון הנבחר." : "No requests found matching the current filter selection.")}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalRequests > 0 && (
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-650 font-sans">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="font-semibold">{lblPageSize}</span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans cursor-pointer text-gray-800"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-gray-300 font-medium mx-1">|</span>
                <span className="font-mono text-gray-500 font-medium">
                  {lblShowingRange(from, to, totalRequests)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-1 px-1.5 rounded border border-gray-250 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white text-gray-700 transition"
                  title={isRtl ? "לעמוד הראשון" : "First Page"}
                >
                  {isRtl ? <ChevronsRight className="h-4 w-4 shrink-0" /> : <ChevronsLeft className="h-4 w-4 shrink-0" />}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1 px-2.5 rounded border border-gray-250 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white text-gray-700 font-bold flex items-center gap-1 transition"
                >
                  {isRtl ? <ChevronRight className="h-4 w-4 shrink-0" /> : <ChevronLeft className="h-4 w-4 shrink-0" />}
                  <span>{isRtl ? "הקודם" : "Prev"}</span>
                </button>

                <span className="px-3 py-1 font-bold bg-white border border-gray-250 rounded text-slate-800 font-sans min-w-[85px] text-center shadow-xs">
                  {lblPageOf(safeCurrentPage, totalPages)}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1 px-2.5 rounded border border-gray-250 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white text-gray-700 font-bold flex items-center gap-1 transition"
                >
                  <span>{isRtl ? "הבא" : "Next"}</span>
                  {isRtl ? <ChevronLeft className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1 px-1.5 rounded border border-gray-250 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white text-gray-700 transition"
                  title={isRtl ? "לעמוד האחרון" : "Last Page"}
                >
                  {isRtl ? <ChevronsLeft className="h-4 w-4 shrink-0" /> : <ChevronsRight className="h-4 w-4 shrink-0" />}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
