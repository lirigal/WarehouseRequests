import React, { useState } from "react";
import { WarehouseRequest, Language, AppUser, NipukRecord, WarehouseItem, ItemPictureUrl } from "../types";
import { GetItemPrimaryImageBySku } from "../lib/imageService";
import { 
  Truck, 
  CheckCircle, 
  Clock, 
  User, 
  ClipboardList, 
  AlertCircle, 
  Calendar, 
  ShieldAlert, 
  Trash2, 
  Search, 
  FileText, 
  Phone,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Image,
  X
} from "lucide-react";

interface DispatchManagementProps {
  currentLanguage: Language;
  currentUser: AppUser;
  activeRequests: WarehouseRequest[];
  nipukRecords: NipukRecord[];
  onAddNipukRecord: (record: NipukRecord) => void;
  onDeleteNipukRecord: (nipukId: string) => void;
  onDispatchRequestUpdate?: (requestId: string, workerName: string, collectorName: string, dispatchDate: string) => void;
  mode?: "form" | "log" | "both";
  users?: AppUser[];
  warehouseItems?: WarehouseItem[];
  itemPictureUrls?: ItemPictureUrl[];
}

export const DispatchManagement: React.FC<DispatchManagementProps> = ({
  currentLanguage,
  currentUser,
  activeRequests,
  nipukRecords,
  onAddNipukRecord,
  onDeleteNipukRecord,
  onDispatchRequestUpdate,
  mode = "both",
  users = [],
  warehouseItems = [],
  itemPictureUrls = []
}) => {
  const isRtl = currentLanguage === "HE";

  const formatDateCell = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutes}`
      };
    } catch (err) {
      return { date: "", time: "" };
    }
  };

  const formatYyyyMmDd = (dateStr: string) => {
    if (!dateStr || !dateStr.includes("-")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // 1. Role-Based Access Control
  const isAuthorized = 
    currentUser.role === "ADMIN" || 
    currentUser.role === "MANAGER" || 
    currentUser.role === "STOREKEEPER";

  // Form Field States
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  
  // Dispatch DateTime defaults to current date & time
  const [dispatchDate, setDispatchDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [dispatchTime, setDispatchTime] = useState<string>(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  });

  const [orderNumber, setOrderNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [remark, setRemark] = useState<string>("");

  // Order item details states
  const [sku, setSku] = useState<string>("");
  const [itemNameHe, setItemNameHe] = useState<string>("");
  const [itemNameEn, setItemNameEn] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);

  // Customer details
  const [customerName, setCustomerName] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");

  const [searchQuery, setSearchQuery] = useState("");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>("");
  const [previewImageFilter, setPreviewImageFilter] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination & rows per page states with account persistence
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    const userKey = `volcani_nipuk_rows_per_page_${currentUser.email || currentUser.id || "guest"}`;
    const saved = localStorage.getItem(userKey) || localStorage.getItem("volcani_nipuk_rows_per_page");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && [5, 10, 20, 30, 50].includes(parsed)) {
        return parsed;
      }
    }
    return 10;
  });

  // Pagination states for Pending Requests grid with account persistence
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingRowsPerPage, setPendingRowsPerPage] = useState<number>(() => {
    const userKey = `volcani_pending_requests_page_size_${currentUser.email || currentUser.id || "guest"}`;
    const saved = localStorage.getItem(userKey) || localStorage.getItem("volcani_pending_requests_page_size");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && [5, 10, 20, 30, 50].includes(parsed)) {
        return parsed;
      }
    }
    return 10;
  });

  // Automatically restore rowsPerPage/pendingRowsPerPage when current user changes (logging in again or shifting sessions)
  React.useEffect(() => {
    const userKey = `volcani_nipuk_rows_per_page_${currentUser.email || currentUser.id || "guest"}`;
    const saved = localStorage.getItem(userKey) || localStorage.getItem("volcani_nipuk_rows_per_page");
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && [5, 10, 20, 30, 50].includes(parsed)) {
        setRowsPerPage(parsed);
      }
    } else {
      setRowsPerPage(10);
    }

    const pendingUserKey = `volcani_pending_requests_page_size_${currentUser.email || currentUser.id || "guest"}`;
    const pendingSaved = localStorage.getItem(pendingUserKey) || localStorage.getItem("volcani_pending_requests_page_size");
    if (pendingSaved) {
      const parsed = parseInt(pendingSaved, 10);
      if (!isNaN(parsed) && [5, 10, 20, 30, 50].includes(parsed)) {
        setPendingRowsPerPage(parsed);
      }
    } else {
      setPendingRowsPerPage(10);
    }

    setCurrentPage(1);
    setPendingPage(1);
  }, [currentUser.email, currentUser.id]);

  const handleRowsPerPageChange = (size: number) => {
    setRowsPerPage(size);
    setCurrentPage(1);
    const userKey = `volcani_nipuk_rows_per_page_${currentUser.email || currentUser.id || "guest"}`;
    localStorage.setItem(userKey, String(size));
    // Also save in general for fallback
    localStorage.setItem("volcani_nipuk_rows_per_page", String(size));
  };

  const handlePendingRowsPerPageChange = (size: number) => {
    setPendingRowsPerPage(size);
    setPendingPage(1);
    const userKey = `volcani_pending_requests_page_size_${currentUser.email || currentUser.id || "guest"}`;
    localStorage.setItem(userKey, String(size));
    // Also save in general for fallback
    localStorage.setItem("volcani_pending_requests_page_size", String(size));
  };

  // Filter pending order requests (which can be linked)
  const pendingRequests = activeRequests.filter((req) => {
    const statusLower = (req.statusEn || "").toLowerCase();
    const statusHe = req.statusHe || "";
    // Display only requests that do NOT have "בוצע" (Done) / "delivered" status, but keep "נופק" (Issued) visible
    const isCompleted = statusHe.includes("בוצע") || statusLower.includes("delivered");
    return !isCompleted;
  });

  const selectedRequestObj = selectedRequestId ? activeRequests.find(r => r.requestId === selectedRequestId) : null;
  const isSelectedRequestIssued = selectedRequestObj ? (
    selectedRequestObj.statusHe.includes("נופק") || 
    selectedRequestObj.statusHe.includes("בוצע") || 
    (selectedRequestObj.statusEn && (
      selectedRequestObj.statusEn.toLowerCase().includes("dispatched") || 
      selectedRequestObj.statusEn.toLowerCase().includes("delivered")
    ))
  ) : false;

  // Helper to get matching requester details from user list or seeds
  const getRequesterDetails = (reqEmail: string) => {
    if (!reqEmail) return { name: "", phone: "", id: "" };
    const emailLower = reqEmail.toLowerCase();
    
    // Find matching user
    const mappedUser = users.find(u => {
      const uemail = (u.email || "").toLowerCase();
      return uemail === emailLower || 
             emailLower.includes(uemail) || 
             uemail.includes(emailLower);
    });

    if (mappedUser) {
      return {
        name: `${mappedUser.firstName} ${mappedUser.lastName}`,
        phone: mappedUser.phone || "",
        id: mappedUser.teudatZehut || ""
      };
    }

    // Fallbacks
    if (emailLower.includes("dr.cohen") || emailLower.includes("cohen")) {
      return {
        name: isRtl ? 'ד"ר משה כהן' : "Dr. Moshe Cohen",
        phone: "0547654321",
        id: "987654321"
      };
    } else if (emailLower.includes("sarah.levy")) {
      return {
        name: isRtl ? "שרה לוי (חוקרת)" : "Sarah Levy (Staff)",
        phone: "0547654322",
        id: "987654322"
      };
    } else if (emailLower.includes("ela.v")) {
      return {
        name: isRtl ? "אלה וורדי" : "Ela Vardi",
        phone: "05411111111",
        id: "111111111"
      };
    } else if (emailLower.includes("svetlana")) {
      return {
        name: isRtl ? "סבטלנה צ'רניצקי" : "Svetlana Chernitsky",
        phone: "0529876543",
        id: "222222222"
      };
    }

    const prefix = reqEmail.split("@")[0] || "";
    const cleanName = prefix
      .replace(/\./g, " ")
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return {
      name: cleanName,
      phone: "",
      id: ""
    };
  };

  // Handle request selection changed - auto-populate fields
  const handleRequestSelect = (reqId: string) => {
    setSelectedRequestId(reqId);
    if (reqId) {
      const found = activeRequests.find(r => r.requestId === reqId);
      if (found) {
        setOrderNumber(found.requestId);
        
        const details = getRequesterDetails(found.requestedBy || "");

        setCustomerName(details.name);
        setCustomerId(details.id);
        setCustomerPhone(details.phone);
        
        setNotes("");
        setSku(found.sku || "");
        setItemNameHe(found.itemNameHe || "");
        setItemNameEn(found.itemNameEn || "");
        setQuantity(found.quantityRequested || 1);
        setRemark("");
      }
    } else {
      setOrderNumber("");
      setCustomerName("");
      setNotes("");
      setCustomerId("");
      setCustomerPhone("");
      setSku("");
      setItemNameHe("");
      setItemNameEn("");
      setQuantity(1);
      setRemark("");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden mb-8 p-6 sm:p-12 text-center" id="dispatch_restricted">
        <div className="max-w-md mx-auto space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-650">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <h2 className="text-xl font-black text-gray-950">
            {isRtl ? "גישה חסומה - מדור מוגבל" : "Access Denied - Restricted Module"}
          </h2>
          <p className="text-xs text-gray-650 leading-relaxed">
            {isRtl 
              ? "מערכת ניפוק הזמנות (NIPUK) מיועדת לשימוש מנהלים ומנפקי מחסן מורשים בלבד (ADMIN, MANAGER, STOREKEEPER). לחשבון שלך אין את ההרשאות הנדרשות לצפייה או יצירת רשומות ניפוק."
              : "The NIPUK order dispatch engine holds absolute restriction policies. Only accounts assigned with ADMIN, MANAGER, or STOREKEEPER roles are permitted to perform pickup transactions."}
          </p>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-[11px] font-mono text-red-700">
            SEC_ERROR: 403_FORBIDDEN_USER_ROLE_RESTRICTED (Role: {currentUser.role})
          </div>
        </div>
      </div>
    );
  }

  // Handle Dispatch submit
  const handleSubmitDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isSelectedRequestIssued) {
      setErrorMsg(isRtl ? "שגיאה: דרישה זו כבר נופקה. לא ניתן לבצע פעולות עריכה או ניפוק נוספות!" : "Error: This order has already been issued. Edit/checkout actions are blocked!");
      return;
    }

    if (!customerName.trim()) {
      setErrorMsg(isRtl ? "חובה למלא את שם הלקוח / מוסר הפריטים" : "Customer name is a required field");
      return;
    }

    // Validation: כמות מנופקת can not be greater than ordered, but can be smaller
    if (selectedRequestObj && quantity > selectedRequestObj.quantityRequested) {
      setErrorMsg(isRtl 
        ? `שגיאה: הכמות המנופקת (${quantity}) לא יכולה להיות גדולה מהכמות שהוזמנה בדרישה (${selectedRequestObj.quantityRequested})!` 
        : `Error: Dispatched quantity (${quantity}) cannot be greater than the quantity requested (${selectedRequestObj.quantityRequested})!`
      );
      return;
    }

    const newNipukId = `NPK-2026-${Math.floor(100000 + Math.random() * 900000)}`;

    const newRecord: NipukRecord = {
      nipukId: newNipukId,
      dispatchDate,
      dispatchTime,
      orderNumber: orderNumber.trim() || undefined,
      requestDate: selectedRequestObj ? selectedRequestObj.requestDate : undefined,
      sku: sku.trim() || undefined,
      itemNameHe: itemNameHe.trim() || undefined,
      itemNameEn: itemNameEn.trim() || undefined,
      quantity: quantity > 0 ? quantity : undefined,
      notes: notes.trim() || undefined,
      remark: remark.trim() || undefined,
      attributeTypeNameHe: selectedRequestObj?.attributeTypeNameHe || undefined,
      attributeValueNameHe: selectedRequestObj?.attributeValueNameHe || undefined,
      attributeTypeNameEn: selectedRequestObj?.attributeTypeNameEn || undefined,
      attributeValueNameEn: selectedRequestObj?.attributeValueNameEn || undefined,
      workerId: currentUser.userId,
      workerName: `${currentUser.firstName} ${currentUser.lastName}`,
      workerRole: currentUser.role,
      customerName: customerName.trim(),
      customerId: customerId.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      createdTimestamp: new Date().toISOString(),
      lastUpdateTimestamp: new Date().toISOString()
    };

    // 1. Add NIPUK record
    onAddNipukRecord(newRecord);

    // 2. If it is linked to active order request, update request status in the main app layout
    if (selectedRequestId && onDispatchRequestUpdate) {
      onDispatchRequestUpdate(
          selectedRequestId,
          `${currentUser.firstName} ${currentUser.lastName}`,
          customerName.trim(),
          new Date(`${dispatchDate}T${dispatchTime}`).toISOString()
      );
    }

    setSuccessMsg(
      isRtl 
        ? `רשומת ניפוק פריט מהמחסן (${newNipukId}) נקלטה ונשמרה בהצלחה במערכת!`
        : `Nipuk dispatch transaction completed and validated under ID: ${newNipukId}!`
    );

    // Reset Form fields
    setSelectedRequestId("");
    setOrderNumber("");
    setNotes("");
    setRemark("");
    setCustomerName("");
    setCustomerId("");
    setCustomerPhone("");
    setSku("");
    setItemNameHe("");
    setItemNameEn("");
    setQuantity(1);

    // Set short timeout to clear success alerts
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Safe delete handler with strict warning & validation
  const handleDeleteClick = (nipukId: string) => {
    // Audit Rule 5: NIPUK records cannot be deleted by regular users
    if (currentUser.role !== "ADMIN" && currentUser.role !== "MANAGER") {
      alert(
        isRtl 
          ? "שגיאת אבטחה: אין לך הרשאות למחיקת רשומות ניפוק פריטים. מחיקה מותרת למנהל או מנהל מערכת בלבד!"
          : "Security Restriction: You do not hold sufficient privileges to delete NIPUK transaction records. Only admins and managers may remove history logs."
      );
      return;
    }

    if (confirm(isRtl ? `האם אתה בטוח שברצונך למחוק לצמיתות את רשומת הניפוק ${nipukId}?` : `Are you sure you want to permanently delete NIPUK log ${nipukId}?`)) {
      onDeleteNipukRecord(nipukId);
    }
  };

  // Filter records based on active search
  const filteredRecords = nipukRecords.filter(rec => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rec.nipukId.toLowerCase().includes(q) ||
      rec.customerName.toLowerCase().includes(q) ||
      (rec.orderNumber || "").toLowerCase().includes(q) ||
      rec.workerName.toLowerCase().includes(q) ||
      (rec.customerId || "").toLowerCase().includes(q)
    );
  });

  // Calculate pagination properties
  const totalRecordsCount = filteredRecords.length;
  const totalPages = Math.ceil(totalRecordsCount / rowsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  
  const indexOfLastItem = safeCurrentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const paginatedRecords = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);

  const fromRecord = totalRecordsCount === 0 ? 0 : indexOfFirstItem + 1;
  const toRecord = Math.min(indexOfLastItem, totalRecordsCount);

  // Pending requests pagination calculations
  const totalPending = pendingRequests.length;
  const sortedPending = [...pendingRequests].sort((a, b) => b.requestId.localeCompare(a.requestId));
  
  const totalPendingPages = Math.ceil(totalPending / pendingRowsPerPage) || 1;
  const safePendingPage = Math.min(pendingPage, totalPendingPages);
  
  const pendingStartIndex = (safePendingPage - 1) * pendingRowsPerPage;
  const paginatedPendingRequests = sortedPending.slice(pendingStartIndex, pendingStartIndex + pendingRowsPerPage);

  const pendingFrom = totalPending === 0 ? 0 : pendingStartIndex + 1;
  const pendingTo = Math.min(pendingStartIndex + pendingRowsPerPage, totalPending);

  const t = {
    formTitle: isRtl ? "טופס ניפוק פריטים חדש (NIPUK)" : "Create New Dispatch Record (NIPUK)",
    labelLinkReq: isRtl ? "קישור לדרישת ניפוק פתוחה (אופציונלי):" : "Link with Pending Order Request (Optional):",
    descLinkReq: isRtl ? "בחירה מדרישות פתוחות תמלא אוטומטית מספר הזמנה ושם מקבל" : "Selecting active pending request pre-fills order ID & name",
    optCustom: isRtl ? "-- קלט חופשי (ללא בקשה מוקדמת) --" : "-- Standalone Pickup (No prior Request) --",
    lblDate: isRtl ? "תאריך ניפוק בפועל:* " : "Dispatch Date:* ",
    lblTime: isRtl ? "שעת ניפוק:* " : "Dispatch Time:* ",
    lblOrderNumber: isRtl ? "מספר הזמנה / דרישה (אופציונלי):" : "Order / Request Reference (Optional):",
    lblNotes: isRtl ? "הערות ודגשים למשלוח:" : "Dispatch Notes / Special Remarks:",
    lblCustName: isRtl ? "שם הלקוח / אוסף ההזמנה:* " : "Customer Name (Who Picked up):* ",
    lblCustId: isRtl ? "תעודת זהות / מספר מזהה לקוח:" : "Customer ID / Passport Number:",
    lblCustPhone: isRtl ? "טלפון ארוך ליצירת קשר:" : "Customer Mobile / Phone Number:",
    workerSection: isRtl ? "פרטי עובד המחסן המנפק" : "Fulfilling Store Worker Details",
    lblWorkerIdHe: "מזהה משתמש:",
    lblWorkerIdEn: "Worker/User ID:",
    lblWorkerNameHe: "שם עובד המחסן:",
    lblWorkerNameEn: "Fulfilling Worker:",
    lblWorkerRoleHe: "תפקיד מורשה:",
    lblWorkerRoleEn: "Authorized Role:",
    btnSubmit: isRtl ? "בצע ניפוק ועדכן במלאי" : "Commit Dispatch Transaction",
    logTitle: isRtl ? "יומן ניפוקים ואספקות פריטים (NIPUK LOG)" : "Order Pickups Log & Audit Trail (NIPUK)",
    colNpkId: isRtl ? "מזהה ניפוק" : "NIPUK ID",
    colDateTime: isRtl ? "תאריך ושעה" : "Date & Time",
    colCustomer: isRtl ? "שם מקבל / לקוח" : "Customer / Recipient",
    colWorker: isRtl ? "רושם הניפוק" : "Dispatch Worker",
    colRef: isRtl ? "הזמנה מקושרת" : "Linked Order",
    actionDelete: isRtl ? "מחק רשומה" : "Delete Log",
    badgeLabel: "NIPUK"
  };

  return (
    <div className="space-y-6" id="nipuk_engine_container">
      
      {/* Page Header */}
      <div className="bg-[#1F2937] border border-gray-700/80 rounded-xl p-4 sm:p-5 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
              {t.badgeLabel}
            </span>
            <h1 className="text-lg font-bold text-white flex items-center gap-1.5">
              <Truck className="h-5 w-5 text-amber-400 shrink-0" />
              {isRtl 
                ? (mode === "log" ? "יומן ניפוקים" : "ניפוק פריט מהמחסן ") 
                : (mode === "log" ? "NIPUK Log" : "NIPUK - Warehouse Dispatch System")}
            </h1>
          </div>
          {!isRtl && (
            <p className="text-xs text-gray-300 mt-1 max-w-3xl leading-relaxed">
              {"Perform physical warehouse checkout validation. Automatically logs the logged-in storekeeper, persists customer identities, and generates robust system-wide immutable pickup registries."}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-mono text-amber-400 bg-slate-800 border border-slate-700 px-2 py-1 rounded">
            ASPX_PAGE: WarehouseDispatch.aspx
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* Creation Box */}
        {(mode === "form" || mode === "both") && (
          <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden h-fit">
          <div className="bg-slate-100 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-[#2563EB]" />
              {t.formTitle}
            </h2>
          </div>

          <form onSubmit={handleSubmitDispatch} className="p-4 sm:p-5 space-y-4">
            
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-lg text-emerald-850 text-xs flex items-start gap-2 leading-relaxed">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-250 rounded-lg text-rose-850 text-xs flex items-start gap-2 leading-relaxed">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Informative Tip */}
            <div dir="rtl" className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-right">
              <span className="text-[11px] font-black text-blue-900 block mb-1">💡 קישור לדרישת ניפוק:</span>
              <p className="text-[10px] text-blue-800 leading-normal">
                {isRtl 
                  ? "לקשר לדרישת ניפוק פתוחה, לחץ על אחת הדרישות מהרשימה 'דרישות אחרונות שנקלטו במערכת' משמאל. הפרטים יתמלאו אוטומטית!" 
                  : "To link a pending request, click any request inside the 'Recent requests received in system' panel. The form is pre-filled automatically!"}
              </p>
              {selectedRequestId && (
                <div className="mt-2 flex items-center justify-between bg-blue-105 border border-blue-200 rounded px-2 py-1 text-[11px]">
                  <span className="font-extrabold text-[#2563EB] font-mono">{selectedRequestId}</span>
                  <button 
                    type="button" 
                    onClick={() => handleRequestSelect("")}
                    className="text-red-650 hover:text-red-800 font-bold underline cursor-pointer text-[10px]"
                  >
                    {isRtl ? "נתק קישור (קלט חופשי)" : "Unlink (Free input)"}
                  </button>
                </div>
              )}
            </div>

            <hr className="border-gray-200" />

            {selectedRequestObj ? (
              <>
                {/* Date and Time selectors */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-right">
                    <label className="block text-[11px] font-bold text-red-650 mb-1">
                      <span className="flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3 text-red-650 shrink-0" />
                        <span>{t.lblDate}</span>
                      </span>
                    </label>
                    <div className="relative flex items-center w-full">
                      <input
                        type="date"
                        required
                        disabled={isSelectedRequestIssued}
                        value={dispatchDate}
                        onChange={(e) => setDispatchDate(e.target.value)}
                        className={`w-full border border-gray-300 rounded-xl pl-2.5 pr-8 py-2.5 min-h-[44px] text-xs font-mono font-bold text-center outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] date-picker-clickable ${
                          isSelectedRequestIssued ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-slate-900"
                        }`}
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <label className="block text-[11px] font-bold text-red-650 mb-1">
                      {t.lblTime}
                    </label>
                    <input
                      type="time"
                      required
                      disabled={isSelectedRequestIssued}
                      value={dispatchTime}
                      onChange={(e) => setDispatchTime(e.target.value)}
                      className={`w-full border border-gray-300 rounded-xl px-2.5 py-2.5 min-h-[44px] text-xs font-mono font-bold text-center outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] ${
                        isSelectedRequestIssued ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-slate-900"
                      }`}
                    />
                  </div>
                </div>

                {/* Notes / Remarks */}
                <div className="text-right">
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    {t.lblNotes}
                  </label>
                  <textarea
                    rows={2}
                    disabled={isSelectedRequestIssued}
                    placeholder={isRtl ? "רישום פקת, חוסרים או חתימות ידניות..." : "Special transit codes or notes..."}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`w-full border border-gray-300 rounded-xl px-2.5 py-2 text-xs text-right outline-none font-bold placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] ${
                      isSelectedRequestIssued ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-slate-900"
                    }`}
                  />
                </div>

                {/* Optional Item details: SKU & Description */}
                <div className={`border rounded-xl p-3 space-y-3 transition ${
                  isSelectedRequestIssued ? "bg-gray-50 border-gray-250 opacity-80" : "bg-slate-50 border-slate-205"
                }`}>
                  <div className="text-xs font-bold text-slate-750 border-b border-slate-200 pb-1 flex items-center gap-1 justify-start">
                    <ClipboardList className="h-3.5 w-3.5 text-slate-500" />
                    <span>{isRtl ? "פרטי הפריט (מק\"ט ותיאור)" : "Dispatched Item Details"}</span>
                  </div>

                  {/* Orderer Profile display added inside Item details section */}
                  {selectedRequestObj && (() => {
                    const details = getRequesterDetails(selectedRequestObj.requestedBy);
                    return (
                      <div className="grid grid-cols-2 gap-2 bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-right font-sans">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            {isRtl ? "המזמין:" : "Ordered By:"}
                          </span>
                          <span className="font-extrabold text-[#1E293B] text-xs">
                            {details.name || selectedRequestObj.requestedBy.split("@")[0]}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            {isRtl ? "טלפון מזמין:" : "Requester Phone:"}
                          </span>
                          <span className="font-mono font-black text-[#2563EB] text-xs">
                            {details.phone || "--"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* SKU */}
                  <div className="text-right">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      {isRtl ? "מק\"ט פריט:" : "Item SKU (Makat):"}
                    </label>
                    <input
                      type="text"
                      disabled={isSelectedRequestIssued}
                      placeholder={isRtl ? "מק\"ט פריט (למשל: 10023405)..." : "Makat SKU..."}
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      className={`w-full border rounded-xl px-2.5 py-2.5 min-h-[44px] text-xs text-right outline-none font-mono placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] ${
                        isSelectedRequestIssued ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-250" : "bg-white border-gray-200"
                      }`}
                    />
                  </div>

                  {/* Item Description (He) - changed input to h3 title */}
                  <div className="text-right font-sans w-full">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      {isRtl ? "תיאור פריט בעברית:" : "Description (He):"}
                    </label>
                    <h3 className="w-full text-xs font-bold text-gray-900 text-right py-2.5 bg-white px-3 rounded-xl border border-gray-250 min-h-[44px] flex items-center justify-start leading-normal">
                      {itemNameHe || (isRtl ? "— טרם נבחר פריט —" : "— No Item Selected —")}
                    </h3>
                  </div>

                  {/* Saved Item Picture display on NIPUK form (moved after Item Description) */}
                  {sku.trim() && (() => {
                    const matchedItem = warehouseItems.find((wi) => wi.sku.trim() === sku.trim());
                    const resolvedImg = GetItemPrimaryImageBySku(sku, itemPictureUrls, isRtl);
                    return (
                      <div className="my-2 bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col items-center justify-center animate-fade-in relative group overflow-hidden text-right font-sans">
                        <div className="w-full aspect-[4/3] rounded-lg bg-slate-50 overflow-hidden relative border border-gray-200">
                          <img
                            src={resolvedImg}
                            alt={matchedItem ? (isRtl ? matchedItem.nameHe : matchedItem.nameEn) : sku}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            style={{ filter: matchedItem?.imageFilter }}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="w-full pt-2 flex items-center justify-between text-[10px] font-bold text-slate-500 font-sans">
                          <span className="truncate">{isRtl ? "תמונת פריט שמורה מהמלאי" : "Saved Item Image preview"}</span>
                          <span className="font-mono text-slate-400 font-normal">{matchedItem.shelf && `${isRtl ? "מדף" : "Shelf"}: ${matchedItem.shelf}`}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Selected Attribute / מאפיין שנבחר */}
                  {selectedRequestObj && selectedRequestObj.attributeTypeNameHe && (
                    <div className="text-right">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                        {isRtl ? "מאפיין שנבחר:" : "Selected Attribute:"}
                      </label>
                      <div className="w-full bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-xs text-right font-extrabold text-slate-900">
                        {isRtl 
                          ? `${selectedRequestObj.attributeTypeNameHe}: ${selectedRequestObj.attributeValueNameHe || "—"}` 
                          : `${selectedRequestObj.attributeTypeNameEn}: ${selectedRequestObj.attributeValueNameEn || "—"}`}
                      </div>
                    </div>
                  )}

                  {/* Quantity (Label and value in the same row) */}
                  <div className="space-y-1.5">
                    {selectedRequestObj && (
                      <div dir="rtl" className="p-2 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center text-[10.5px] text-right">
                        <span className="text-blue-900 font-bold">
                          {isRtl ? "כמות מקורית שהוזמנה בדרישה:" : "Original quantity ordered in request:"}
                        </span>
                        <span className="font-black text-[#2563EB] font-mono text-xl md:text-2xl">
                          {selectedRequestObj.quantityRequested}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2 min-h-[44px]">
                      <label className="text-xs font-bold text-slate-700 whitespace-nowrap">
                        {isRtl ? "כמות מנופקת:" : "Quantity Dispatched:"}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={selectedRequestObj ? selectedRequestObj.quantityRequested : undefined}
                        disabled={isSelectedRequestIssued}
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className={`w-24 text-center border rounded-lg py-1 px-2.5 font-bold outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] ${
                          isSelectedRequestIssued ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-250" : "bg-white border-gray-200"
                        }`}
                      />
                    </div>

                    {/* Live Pricing Summary Block */}
                    {sku && (() => {
                      const matchItemInDispatch = warehouseItems.find((wi) => wi.sku === sku);
                      if (!matchItemInDispatch) return null;
                      const dispatchItemPrice = matchItemInDispatch.price;
                      const dispatchTotalPrice = dispatchItemPrice * quantity;
                      return (
                        <div className="mt-2.5 p-3 bg-blue-50/50 border border-blue-150 rounded-xl text-xs leading-normal text-right font-sans">
                          <div className="flex justify-between items-center mb-1.5 text-slate-750">
                            <span className="font-semibold text-slate-500">{isRtl ? "מחיר פריט:" : "Unit Price:"}</span>
                            <span className="font-mono font-bold text-slate-800">₪{dispatchItemPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center border-t border-blue-100 pt-2 mt-1.5 font-bold">
                            <span className="text-slate-800">{isRtl ? "מחיר כולל להזמנה:" : "Total Price for Order:"}</span>
                            <span className="font-mono text-sm font-black text-[#2563EB]">₪{dispatchTotalPrice.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Remark Field / הערה (Remark has been moved to last row of item card!) */}
                  <div className="text-right">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                      {isRtl ? "הערה (remark):" : "Remark (Item):"}
                    </label>
                    <input
                      type="text"
                      disabled={isSelectedRequestIssued}
                      placeholder={isRtl ? "הערה חופשית לגבי הפריט לרבות ייעוד או מצב..." : "Enter item remark..."}
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className={`w-full border rounded-xl px-2.5 py-2.5 min-h-[44px] text-xs text-right outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] ${
                        isSelectedRequestIssued ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-250" : "bg-white border-gray-200"
                      }`}
                    />
                  </div>
                </div>

                {/* Customer Details Box */}
                <div dir="rtl" className={`border rounded-xl p-3 space-y-3 transition text-right ${
                  isSelectedRequestIssued ? "bg-gray-50 border-gray-250 opacity-80" : "bg-amber-50/40 border-amber-200/60"
                }`}>
                  <div className="text-xs font-bold text-amber-900 border-b border-amber-200/50 pb-1 flex items-center gap-1 justify-start">
                    <User className="h-3.5 w-3.5 text-amber-700" />
                    <span>{isRtl ? "פרטי הלקוח המקבל" : "Customer Recipient Identity"}</span>
                  </div>

                   
                  {/* Customer Name */}
                  <div className="text-right">
                    <label className="block text-[10px] font-bold text-amber-800 mb-0.5">
                      {t.lblCustName}
                    </label>
                    <input
                      type="text"
                      required
                      disabled={isSelectedRequestIssued}
                      placeholder={isRtl ? "שם החוקר או הסייע המקבל את הפריט בפועל..." : "Exact name of recipient..."}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full border rounded-xl px-2.5 py-2.5 min-h-[44px] text-xs text-right outline-none font-extrabold text-slate-950 focus:ring-2 focus:ring-amber-500/20 ${
                        isSelectedRequestIssued ? "bg-gray-100 text-gray-400 cursor-not-allowed border-amber-100" : "bg-white border-amber-200/80"
                      }`}
                    />
                  </div>

                  {/* Customer ID */}
                  <div className="text-right">
                    <label className="block text-[10px] font-bold text-amber-800 mb-0.5">
                      {t.lblCustId}
                    </label>
                    <input
                      type="text"
                      maxLength={9}
                      disabled={isSelectedRequestIssued}
                      placeholder={isRtl ? "תעודת זהות בת 9 ספרות..." : "Israeli Identity card number..."}
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className={`w-full border rounded-xl px-2.5 py-2.5 min-h-[44px] text-xs text-right outline-none font-mono focus:ring-2 focus:ring-amber-500/20 ${
                        isSelectedRequestIssued ? "bg-gray-100 text-gray-400 cursor-not-allowed border-amber-100" : "bg-white border-amber-200/80"
                      }`}
                    />
                  </div>

                  {/* Customer Phone */}
                  <div className="text-right">
                    <label className="block text-[10px] font-bold text-amber-800 mb-0.5">
                      {t.lblCustPhone}
                    </label>
                    <input
                      type="text"
                      disabled={isSelectedRequestIssued}
                      placeholder={isRtl ? "דוגמה: 05XXXXXXXX" : "Example: 052-1234567"}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className={`w-full border rounded-xl px-2.5 py-2.5 min-h-[44px] text-xs text-right outline-none font-mono focus:ring-2 focus:ring-amber-500/20 ${
                        isSelectedRequestIssued ? "bg-gray-100 text-gray-400 cursor-not-allowed border-amber-100" : "bg-white border-amber-200/80"
                      }`}
                    />
                  </div>
                </div>

                {/* Read-only Worker Section */}
                <div dir="rtl" className="bg-[#f5f3ff]/40 bg-indigo-50/30 border border-indigo-100 rounded-xl p-3.5 text-right">
                  <div className="text-xs font-bold text-indigo-900 border-b border-indigo-150 pb-1 mb-2 flex justify-start items-center gap-1.5">
                    <User className="h-4 w-4 text-indigo-700 shrink-0" />
                    <span>{t.workerSection}</span>
                  </div>
                  <div className="text-[11px] space-y-2 text-slate-700">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400">{isRtl ? t.lblWorkerIdHe : t.lblWorkerIdEn}</span>
                      <span className="font-bold font-mono text-slate-900">{currentUser.userId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400">{isRtl ? t.lblWorkerNameHe : t.lblWorkerNameEn}</span>
                      <span className="text-slate-900 font-extrabold">{currentUser.firstName} {currentUser.lastName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-400">{isRtl ? t.lblWorkerRoleHe : t.lblWorkerRoleEn}</span>
                      <span className="text-indigo-750 font-black tracking-wide text-[9.5px] bg-[#e0e7ff] border border-indigo-200 px-2 py-0.5 rounded font-mono uppercase">
                        {currentUser.role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Creation Submit Button */}
                <button
                  type="submit"
                  disabled={isSelectedRequestIssued}
                  className={`w-full font-bold text-xs py-3 rounded-xl transition min-h-[44px] shadow-sm flex items-center justify-center gap-2 select-none ${
                    isSelectedRequestIssued 
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-90 border border-gray-300" 
                      : "bg-[#2563EB] hover:bg-blue-600 text-white cursor-pointer"
                  }`}
                >
                  <Truck className={`h-4.5 w-4.5 shrink-0 ${isSelectedRequestIssued ? "text-gray-400" : ""}`} />
                  {isSelectedRequestIssued ? (isRtl ? "הדרישה המקושרת כבר נופקה (קריאה בלבד)" : "Linked request already issued (Read-only mode)") : t.btnSubmit}
                </button>
              </>
            ) : (
              <div dir="rtl" className="text-center py-10 px-4 border-2 border-dashed border-slate-205 rounded-xl bg-slate-50/50 my-6 font-sans">
                <div className="mx-auto w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mb-3 block shadow-sm">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <h3 className="text-xs font-bold text-slate-750 mb-1">לא נבחרה דרישת ניפוק</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                  אנא בחר שורה מתוך טבלת <strong>"דרישות אחרונות שנקלטו במערכת"</strong> משמאל כדי לבצע את הניפוק.
                </p>
              </div>
            )}

          </form>
        </div>
        )}

        {(mode === "log" || mode === "both") && (
          <div className={`${mode === "log" ? "lg:col-span-10" : "lg:col-span-7"} bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-w-0`} id="nipuk_log_main_container">
            {/* Desktop Table-Based Log View */}
            <div className="hidden md:block overflow-x-auto w-full">
              <table className="min-w-full text-xs text-right border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50 text-slate-550 border-b border-gray-200 font-bold">
                  <th className="py-2.5 px-3 font-bold text-right w-[22%] whitespace-nowrap">{isRtl ? t.colNpkId : "Issue ID"}</th>
                  <th className="py-2.5 px-3 font-bold text-right w-[21%] whitespace-nowrap">{isRtl ? "פרטי הניפוק" : "Dispatch Details"}</th>
                  <th className="py-2.5 px-3 font-bold text-right w-[13%] whitespace-nowrap">{isRtl ? t.colRef : "Linked Request"}</th>
                  <th className="py-2.5 px-3 font-bold text-right w-[13%] whitespace-nowrap">{isRtl ? "תאריך ושעה" : "Date & Time"}</th>
                  <th className="py-2.5 px-3 font-bold text-right w-[18%] whitespace-nowrap">{isRtl ? t.colCustomer : "Customer"}</th>
                  <th className="py-2.5 px-3 font-bold text-right w-[13%] whitespace-nowrap">{isRtl ? t.colWorker : "Dispatcher"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150">
                {paginatedRecords.map((rec) => {
                  const orderDateValue = rec.requestDate || (rec.orderNumber ? activeRequests.find(r => r.requestId === rec.orderNumber)?.requestDate : undefined);
                  const linkedRequest = rec.orderNumber ? activeRequests.find(r => r.requestId === rec.orderNumber) : null;
                  const details = rec.orderNumber ? getRequesterDetails(linkedRequest?.requestedBy || "") : null;
                  const matchItem = warehouseItems.find((wi) => wi.sku === rec.sku);
                  const specItemName = isRtl
                    ? (matchItem?.nameHe || rec.itemNameHe || "")
                    : (matchItem?.nameEn || rec.itemNameEn || "");
                  const imageUrl = GetItemPrimaryImageBySku(rec.sku, itemPictureUrls, isRtl);
                  const imageFilter = matchItem?.imageFilter || "";

                  const cleanNotes = rec.notes ? rec.notes.replace("ניפוק עבור בקשה ", "").replace("Dispatch for Order ", "").trim() : "";

                  return (
                    <tr key={rec.nipukId} className="hover:bg-slate-50/85 transition align-top">
                      
                      {/* Column 1: מזהה ניפוק (and Picture directly below) */}
                      <td className="py-4 px-3 leading-snug w-[22%] text-right font-sans">
                        <div className="mb-1.5">
                          <span className="font-mono font-black text-amber-900 bg-amber-100/80 border border-amber-300 px-3 py-1 rounded shadow-sm hover:bg-amber-200 transition inline-block text-[14px]">
                            {rec.nipukId}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mb-3">
                          TS: {new Date(rec.createdTimestamp).toLocaleTimeString(isRtl ? "he-IL" : "en-US", { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        
                        {/* Moved Item Picture directly below block */}
                        <div className="mt-2 flex justify-center w-full">
                          {imageUrl ? (
                            <div 
                              onClick={() => {
                                setPreviewImageUrl(imageUrl);
                                setPreviewImageTitle(specItemName);
                                setPreviewImageFilter(imageFilter);
                              }}
                              className="w-full max-w-[150px] aspect-square rounded-xl overflow-hidden border border-gray-250 bg-slate-50 cursor-zoom-in transition transform hover:scale-[1.04] shadow-sm relative group"
                              title={isRtl ? `${specItemName} (לחץ להגדלה)` : `${specItemName} (Click to enlarge)`}
                            >
                              <img 
                                src={imageUrl} 
                                alt={specItemName}
                                loading="lazy"
                                className="w-full h-full object-cover"
                                style={{ filter: imageFilter }}
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/15 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <Search className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="w-full max-w-[150px] aspect-square rounded-xl border border-dashed border-gray-250 bg-slate-50 flex items-center justify-center text-slate-350 cursor-not-allowed"
                              title={isRtl ? `${specItemName} (אין תמונה לפריט)` : `${specItemName} (No image for item)`}
                            >
                              <Image className="h-5 w-5 shrink-0 opacity-35 text-slate-400" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Column 3: פרטי הניפוק (Larger Font Size) */}
                      <td className="py-4 px-3 leading-normal w-[21%] font-sans text-right" dir="rtl">
                        {rec.sku && (
                          <div className="mb-2 text-right">
                            <span className="bg-[#f8fafc] border border-slate-205 text-slate-800 font-mono text-[11px] px-2 py-0.5 rounded font-black tracking-wide select-all">
                              {rec.sku}
                            </span>
                          </div>
                        )}
                        {(rec.itemNameHe || rec.itemNameEn) && (
                          <div className="text-[14px] font-black text-slate-900 leading-snug">
                            {isRtl ? rec.itemNameHe : rec.itemNameEn}
                          </div>
                        )}

                        {/* Attribute Type & Value (Larger) */}
                        {(() => {
                          const attrType = rec.attributeTypeNameHe || linkedRequest?.attributeTypeNameHe;
                          const attrVal = rec.attributeValueNameHe || linkedRequest?.attributeValueNameHe;
                          const attrTypeEn = rec.attributeTypeNameEn || linkedRequest?.attributeTypeNameEn;
                          const attrValEn = rec.attributeValueNameEn || linkedRequest?.attributeValueNameEn;
                          if (!attrType) return null;
                          return (
                            <div className="mt-2 text-right text-[12px] leading-tight">
                              <span className="text-slate-400 font-bold inline-block ml-1">{isRtl ? "מאפיין:" : "Attr:"}</span>
                              <span className="font-extrabold text-[#2563EB] bg-blue-50 border border-blue-100 rounded px-2 py-0.5 text-[11px]">
                                {isRtl ? `${attrType}: ${attrVal || "—"}` : `${attrTypeEn}: ${attrValEn || "—"}`}
                              </span>
                            </div>
                          );
                        })()}

                        {rec.quantity && (
                          <div className="mt-2 flex items-center justify-end gap-1.5">
                            <span className="text-[12px] text-slate-405 font-bold">{isRtl ? "כמות מנופקת:" : "Dispatched Qty:"}</span>
                            <span className="font-black text-[#2563EB] bg-blue-50 border border-blue-150 rounded px-2 py-0.5 font-mono text-[12.5px]">
                              x{rec.quantity}
                            </span>
                          </div>
                        )}

                        {/* Item Price & Total (Larger) */}
                        {(() => {
                          const itemPrice = matchItem ? matchItem.price : 0;
                          const totalPrice = itemPrice * (rec.quantity || 0);
                          return (
                            <div className="mt-3.5 space-y-1.5 border-t border-slate-100 pt-2.5 text-right font-sans">
                              <div className="flex justify-between items-center text-[12px] text-slate-500">
                                <span>{isRtl ? "מחיר פריט:" : "Item Price:"}</span>
                                <span className="font-mono font-bold">₪{itemPrice.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[13px] font-black text-slate-755">
                                <span>{isRtl ? "סה\"כ מחיר:" : "Total Price:"}</span>
                                <span className="font-mono text-blue-700 bg-blue-50 border border-blue-100 px-2 rounded">₪{totalPrice.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {rec.remark && (
                          <div className="text-[11.5px] text-amber-800 bg-amber-50/50 border border-amber-100 rounded-lg p-2 mt-2 font-sans leading-normal italic">
                            {rec.remark}
                          </div>
                        )}
                        {cleanNotes && !cleanNotes.startsWith("WR-") && (
                          <div className="text-[11.5px] text-slate-500 bg-slate-50 border border-slate-150 rounded-lg p-2 mt-2 font-sans leading-normal">
                            {cleanNotes}
                          </div>
                        )}
                      </td>

                      {/* Column 4: הזמנה מקושרת (Request identifier values - Larger Font) */}
                      <td className="py-4 px-3 leading-snug w-[13%] font-sans text-right">
                        {rec.orderNumber ? (
                          <div className="space-y-1.5 block">
                            <span className="font-mono font-black text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-[12px] inline-block font-mono shadow-xs">
                              {rec.orderNumber}
                            </span>
                            {linkedRequest && details && (
                              <div className="p-2 bg-slate-50 border border-slate-150 rounded-lg text-[11.5px] text-slate-600 text-right leading-relaxed font-sans mt-1 shadow-xs">
                                <span className="font-bold block truncate max-w-[120px]" title={details.name}>{details.name}</span>
                                <span className="font-mono text-[10px] text-slate-400 block">{details.phone || "--"}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-bold italic text-[11.5px]">{isRtl ? "קלט חופשי" : "Standalone"}</span>
                        )}
                      </td>

                      {/* Column 5: תאריך ושעה */}
                      <td className="py-4 px-3 leading-snug w-[13%] font-sans text-right">
                        <div className="font-sans">
                          <span className="text-[11px] text-slate-400 font-bold block mb-0.5">{isRtl ? "תאריך ניפוק בפועל:" : "Dispatch Date:"}</span>
                          <span className="font-extrabold text-[#111827] text-[13.5px] block">{formatYyyyMmDd(rec.dispatchDate)}</span>
                          <span className="font-mono text-[11px] text-slate-650 font-bold">{rec.dispatchTime}</span>
                        </div>
                        {orderDateValue && (
                          <div className="mt-2 pt-1.5 border-t border-slate-100 font-sans">
                            <span className="text-[11px] text-slate-405 font-black block mb-0.5">{isRtl ? "תאריך ושעת הזמנה:" : "Order Date & Time:"}</span>
                            <span className="font-bold text-[12.5px] text-amber-850 block">{formatYyyyMmDd(orderDateValue.split("T")[0])}</span>
                            <span className="font-mono text-[10.5px] text-amber-700">{orderDateValue.includes("T") ? orderDateValue.split("T")[1].slice(0, 5) : ""}</span>
                          </div>
                        )}
                      </td>

                      {/* Column 6: שם מקבל / לקוח */}
                      <td className="py-4 px-3 leading-snug w-[18%] font-sans text-right">
                        <div className="font-black text-[#2563EB] text-[13.5px] leading-snug">{rec.customerName}</div>
                        {rec.customerId && (
                          <div className="text-[11.5px] text-slate-500 font-mono mt-1">
                            {isRtl ? `ת"ז: ${rec.customerId}` : `ID: ${rec.customerId}`}
                          </div>
                        )}
                        {rec.customerPhone && (
                          <div className="text-[11px] text-slate-400 font-mono mt-1">
                            {rec.customerPhone}
                          </div>
                        )}
                      </td>

                      {/* Column 7: רושם הניפוק */}
                      <td className="py-4 px-3 leading-snug w-[13%] font-sans text-right">
                        <div className="font-bold text-slate-800 text-[13px]">{rec.workerName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">ID: {rec.workerId}</div>
                        <div className="mt-1.5">
                          <span className="text-[9.5px] font-mono text-indigo-750 font-black tracking-wide bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded shadow-xs">
                            {rec.workerRole}
                          </span>
                        </div>
                      </td>

                    </tr>
                  );
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400 italic text-[13px]">
                      {isRtl ? "לא נמצאו רשומות ניפוק תואמות." : "No documented NIPUK records found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based Log View */}
          <div className="block md:hidden divide-y divide-gray-200 grow overflow-y-auto max-h-[600px]" id="nipuk_mobile_cards_log">
            {paginatedRecords.map((rec) => {
              const orderDateValue = rec.requestDate || (rec.orderNumber ? activeRequests.find(r => r.requestId === rec.orderNumber)?.requestDate : undefined);
              const linkedRequest = rec.orderNumber ? activeRequests.find(r => r.requestId === rec.orderNumber) : null;
              const details = rec.orderNumber ? getRequesterDetails(linkedRequest?.requestedBy || "") : null;
              const matchItem = warehouseItems.find((wi) => wi.sku === rec.sku);
              const specItemName = isRtl
                ? (matchItem?.nameHe || rec.itemNameHe || "")
                : (matchItem?.nameEn || rec.itemNameEn || "");
              const imageUrl = GetItemPrimaryImageBySku(rec.sku, itemPictureUrls, isRtl);
              const imageFilter = matchItem?.imageFilter || "";
              const cleanNotes = rec.notes ? rec.notes.replace("ניפוק עבור בקשה ", "").replace("Dispatch for Order ", "").trim() : "";

              return (
                <div key={rec.nipukId} dir="rtl" className="p-4 bg-white flex flex-col gap-3.5 text-right font-sans relative">
                  
                  {/* Card Title Header - NIPUK ID - Display Order: 1 */}
                  <div className="flex flex-col gap-3 bg-amber-50/40 -mx-4 -mt-4 p-4 border-b border-amber-100 rounded-t-lg order-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-amber-900 bg-amber-100/90 border border-amber-300 px-3 py-1 rounded text-[14px] shadow-sm">
                          {rec.nipukId}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          TS: {new Date(rec.createdTimestamp).toLocaleTimeString(isRtl ? "he-IL" : "en-US", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Moved Item Picture directly below "מזהה ניפוק" on Mobile */}
                    <div className="flex justify-center w-full mt-2">
                      {imageUrl ? (
                        <div 
                          onClick={() => {
                            setPreviewImageUrl(imageUrl);
                            setPreviewImageTitle(specItemName);
                            setPreviewImageFilter(imageFilter);
                          }}
                          className="w-full max-w-[150px] aspect-square rounded-xl overflow-hidden border border-gray-250 bg-slate-50 cursor-zoom-in relative shadow-sm"
                        >
                          <img 
                            src={imageUrl} 
                            alt={specItemName} 
                            loading="lazy"
                            className="w-full h-full object-cover"
                            style={{ filter: imageFilter }}
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                            <Search className="h-4 w-4 text-white opacity-85" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full max-w-[150px] aspect-square rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
                          <Image className="h-5 w-5 opacity-35 text-slate-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 2. תאריך ושעה (both dates) - Display Order: 4 */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2 text-sm order-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-extrabold">{isRtl ? "תאריך ושעת ניפוק:" : "Dispatch Date:"}</span>
                      <span className="font-black text-slate-900">{formatYyyyMmDd(rec.dispatchDate)} ({rec.dispatchTime})</span>
                    </div>
                    {orderDateValue && (
                      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                        <span className="text-slate-500 font-extrabold">{isRtl ? "תאריך ושעת הזמנה:" : "Order Date & Time:"}</span>
                        <span className="font-black text-amber-800">
                          {formatYyyyMmDd(orderDateValue.split("T")[0])} {orderDateValue.includes("T") ? `(${orderDateValue.split("T")[1].slice(0, 5)})` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 3. מקבל (Customer / Recipient) - Display Order: 5 */}
                  <div className="border border-blue-100 rounded-xl p-4 bg-blue-50/20 space-y-1.5 text-sm order-5">
                    <span className="text-[11px] text-slate-400 font-bold block">{isRtl ? "פרטי המקבל / הלקוח:" : "Recipient Info:"}</span>
                    <div className="font-black text-[#2563EB] text-[15px]">{rec.customerName}</div>
                    {rec.customerId && (
                      <div className="text-[12.5px] text-slate-500 font-mono mt-0.5">{isRtl ? `תעודת זהות: ${rec.customerId}` : `ID: ${rec.customerId}`}</div>
                    )}
                    {rec.customerPhone && (
                      <div className="text-[12px] text-slate-500 font-mono flex items-center gap-1 justify-end mt-0.5">
                        <Phone className="h-3.5 w-3.5 inline text-blue-500" />
                        <span>{rec.customerPhone}</span>
                      </div>
                    )}
                  </div>

                  {/* 4. רושם הניפוק - Display Order: 6 */}
                  <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/20 space-y-2 text-sm order-6">
                    <span className="text-[11px] text-slate-400 font-bold block">{isRtl ? "עובד המחסן המנפק:" : "Dispatcher worker:"}</span>
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-900">{rec.workerName}</span>
                      <span className="text-[11px] font-mono text-indigo-750 font-black tracking-wide bg-indigo-100/70 border border-indigo-200 px-2.5 py-0.5 rounded">
                        {rec.workerRole}
                      </span>
                    </div>
                    <div className="text-[12.5px] text-slate-500 font-mono">ID: {rec.workerId}</div>
                  </div>

                  {/* 5. הזמנה מקושרת - Display Order: 3 */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-2 text-sm order-3">
                    <span className="text-[11px] text-slate-400 font-bold block">{isRtl ? "בקשה / דרישה מקושרת:" : "Linked Request:"}</span>
                    {rec.orderNumber ? (
                      <div className="space-y-2.5">
                        <div className="flex justify-between items-center">
                          <span className="font-mono font-black text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded text-[12.5px] shadow-xs">
                            {rec.orderNumber}
                          </span>
                        </div>
                        {linkedRequest && details && (
                          <div className="p-2.5 border border-slate-150 rounded-lg bg-white text-[13px] text-slate-600 leading-normal space-y-1.5 px-3 shadow-xs">
                            <div className="flex justify-between"><span className="text-slate-400">{isRtl ? "המזמין:" : "Ordered By:"}</span> <strong className="text-slate-950">{details.name}</strong></div>
                            <div className="flex justify-between"><span className="text-slate-400">{isRtl ? "טלפון:" : "Phone:"}</span> <strong className="text-slate-955 font-mono">{details.phone || "--"}</strong></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-400 italic font-black text-[13px]">{isRtl ? "קלט חופשי (ללא בקשה מוקדמת)" : "Standalone Pickup (Free Input)"}</div>
                    )}
                  </div>

                  {/* 6. פרטי הניפוק - Display Order: 2 */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3.5 text-sm shadow-sm order-2">
                    <span className="text-[11px] text-slate-400 font-bold block">{isRtl ? "פרטי הניפוק בפועל מהמחסן:" : "Physical Dispatch details:"}</span>
                    
                    <div className="flex gap-4 items-start border-b border-slate-100 pb-3">
                      <div className="flex-1 space-y-2 min-w-0 text-right">
                        {rec.sku && (
                          <div className="flex justify-between items-center text-[13px]">
                            <span className="text-slate-500 font-bold">{isRtl ? "מק\"ט:" : "SKU:"}</span>
                            <span className="bg-[#f1f5f9] border border-slate-200 text-slate-950 font-mono text-[11.5px] px-2.5 py-0.5 rounded font-bold break-all">
                              {rec.sku}
                            </span>
                          </div>
                        )}

                        {(rec.itemNameHe || rec.itemNameEn) && (
                          <div className="flex justify-between items-start text-[14px] pt-1.5 border-t border-slate-50 mt-1.5 font-black">
                            <span className="text-slate-500 font-bold shrink-0 ml-2">{isRtl ? "שם פריט:" : "Item:"}</span>
                            <strong className="text-slate-955 leading-tight text-right break-words">{specItemName}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* הוסף 'מאפיין', אחרי תאור פריט */}
                    {(() => {
                      const attrType = rec.attributeTypeNameHe || linkedRequest?.attributeTypeNameHe;
                      const attrVal = rec.attributeValueNameHe || linkedRequest?.attributeValueNameHe;
                      const attrTypeEn = rec.attributeTypeNameEn || linkedRequest?.attributeTypeNameEn;
                      const attrValEn = rec.attributeValueNameEn || linkedRequest?.attributeValueNameEn;
                      if (!attrType) return null;
                      return (
                        <div className="flex justify-between items-center text-[13.5px] pt-1.5 border-t border-slate-100 mt-1.5">
                          <span className="text-slate-500 font-bold">{isRtl ? "מאפיין:" : "Attribute:"}</span>
                          <span className="font-extrabold text-[#2563EB] bg-blue-50 border border-blue-100 rounded px-2.5 py-1 text-[11.5px]">
                            {isRtl ? `${attrType}: ${attrVal || "—"}` : `${attrTypeEn}: ${attrValEn || "—"}`}
                          </span>
                        </div>
                      );
                    })()}

                    {rec.quantity && (
                      <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 font-bold">
                        <span className="text-slate-500 font-bold">{isRtl ? "כמות מנופקת:" : "Dispatched Qty:"}</span>
                        <span className="font-mono font-black text-[13px] text-[#2563EB] bg-blue-50 border border-blue-150 px-2.5 py-0.5 rounded">
                          x{rec.quantity}
                        </span>
                      </div>
                    )}

                    {/* Mobile Log Pricing Display */}
                    {(() => {
                      const itemPrice = matchItem ? matchItem.price : 0;
                      const totalPrice = itemPrice * (rec.quantity || 0);
                      return (
                        <div className="flex flex-col gap-1.5 text-[13.5px] pt-1.5 border-t border-slate-100 mt-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-bold">{isRtl ? "מחיר פריט:" : "Item Price:"}</span>
                            <span className="font-mono font-bold text-slate-800">₪{itemPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-550 font-bold">{isRtl ? "סה\"כ מחיר כולל:" : "Total Order Price:"}</span>
                            <span className="font-mono font-black text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded text-[12.5px]">
                              ₪{totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {rec.remark && (
                      <div className="mt-2.5 p-2.5 bg-amber-50/50 border border-amber-100 rounded-lg text-amber-850 italic leading-normal text-[13px]">
                        <span className="font-bold font-sans not-italic block text-[11px] text-amber-800 mb-0.5">{isRtl ? "הערת פריט (Remark):" : "Item Remark:"}</span>
                        {rec.remark}
                      </div>
                    )}

                    {cleanNotes && !cleanNotes.startsWith("WR-") && (
                      <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-150 rounded-lg text-slate-655 leading-normal text-[13px]">
                        <span className="font-bold font-sans block text-[11px] text-slate-400 mb-0.5">{isRtl ? "הערה ודגשים למשלוח:" : "Dispatch Notes:"}</span>
                        {cleanNotes}
                      </div>
                    )}
                  </div>

                </div>
              );
            })}

            {filteredRecords.length === 0 && (
              <div className="py-12 text-center text-gray-400 italic text-xs">
                {isRtl ? "לא נמצאו רשומות ניפוק תואמות." : "No documented NIPUK records found."}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div 
            className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-700 select-none font-sans"
            style={{ direction: isRtl ? "rtl" : "ltr" }}
          >
            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">
                {isRtl ? "שורות לעמוד:" : "Rows per page:"}
              </span>
              <select
                value={rowsPerPage}
                onChange={(e) => handleRowsPerPageChange(Number(e.target.value))}
                className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-gray-800 shadow-sm"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Statistics details */}
            <div className="font-semibold text-slate-600">
              {isRtl ? (
                <span>
                  מציג <span className="font-mono text-blue-700 font-bold">{fromRecord}-{toRecord}</span> מתוך{" "}
                  <span className="font-mono text-gray-950 font-bold">{totalRecordsCount}</span> רשומות
                </span>
              ) : (
                <span>
                  Showing <span className="font-mono text-blue-700 font-bold">{fromRecord}-{toRecord}</span> of{" "}
                  <span className="font-mono text-gray-955 font-bold">{totalRecordsCount}</span> records
                </span>
              )}
            </div>

            {/* First, Prev, Page numbers, Next, Last navigation buttons */}
            <div className="flex items-center gap-1.5 font-sans">
              {/* First Page */}
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
                title={isRtl ? "לעמוד הראשון" : "First Page"}
              >
                {isRtl ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
              </button>
              
              {/* Previous Page */}
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={safeCurrentPage === 1}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
                title={isRtl ? "לעמוד הקודם" : "Previous Page"}
              >
                {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </button>

              {/* Page Number Badges */}
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    return page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1;
                  })
                  .map((page, idx, arr) => {
                    const elements = [];
                    if (idx > 0 && page - arr[idx - 1] > 1) {
                      elements.push(
                        <span key={`ellipse-${page}`} className="px-1 text-gray-400 font-bold select-none cursor-default">
                          ...
                        </span>
                      );
                    }
                    elements.push(
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 flex items-center justify-center rounded border text-xs font-bold transition select-none cursor-pointer ${
                          safeCurrentPage === page
                            ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                            : "bg-white border-gray-300 hover:bg-gray-50 text-slate-700 hover:text-slate-900"
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
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
                title={isRtl ? "לעמוד הבא" : "Next Page"}
              >
                {isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>

              {/* Last Page */}
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safeCurrentPage === totalPages}
                className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
                title={isRtl ? "לעמוד האחרון" : "Last Page"}
              >
                {isRtl ? <ChevronsLeft className="h-3.5 w-3.5" /> : <ChevronsRight className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Recent Requests Panel (when mode is form or both) */}
        {(mode === "form" || mode === "both") && (
          <div className="lg:col-span-7 space-y-4 font-sans text-right min-w-0">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm p-4">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
                <span className="text-slate-400 font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded font-bold">
                  ITEMS: {pendingRequests.length}
                </span>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    {isRtl ? "דרישות אחרונות שנקלטו במערכת" : "Recent requests received in system"}
                  </h3>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#2563EB] inline-block animate-pulse"></span>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-hidden w-full">
                <table className="w-full text-xs text-right border-collapse table-auto">
                  <thead>
                    <tr className="bg-slate-50/70 text-slate-500 font-bold border-b border-gray-200">
                      <th className="py-2.5 px-3 font-bold text-right w-20">
                        {isRtl ? "מס' דרישה" : "Request No."}
                      </th>
                      <th className="py-2.5 px-2 font-bold text-right">
                        {isRtl ? "שם פריט ומק\"ט" : "Item SKU & Description"}
                      </th>
                      <th className="py-2.5 px-2 font-bold text-center w-12">
                        {isRtl ? "כמות" : "Qty"}
                      </th>
                      <th className="py-2.5 px-2 font-bold text-left w-18">
                        {isRtl ? "מחיר פריט" : "Price"}
                      </th>
                      <th className="py-2.5 px-2 font-bold text-left w-20">
                        {isRtl ? "מחיר כולל" : "Total Price"}
                      </th>
                      <th className="py-2.5 px-2 font-bold text-center w-24">
                        {isRtl ? "מאפיין שנבחר" : "Selected Attribute"}
                      </th>
                      <th className="py-2.5 px-2 font-bold text-center w-20">
                        {isRtl ? "תאריך" : "Date"}
                      </th>
                      <th className="py-2.5 px-3 font-bold text-right">
                        {isRtl ? "מגיש הבקשה" : "Requested By"}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedPendingRequests
                      .map((req) => {
                        const isSelected = selectedRequestId === req.requestId;
                        const isIssued = req.statusHe.includes("נופק") || 
                                         req.statusHe.includes("בוצע") || 
                                         (req.statusEn && (
                                           req.statusEn.toLowerCase().includes("dispatched") || 
                                           req.statusEn.toLowerCase().includes("delivered")
                                         ));

                        const matchItem = warehouseItems ? warehouseItems.find((wi) => wi.sku === req.sku) : null;
                        const itemPrice = matchItem ? matchItem.price : 0;
                        const totalPrice = itemPrice * req.quantityRequested;
                        
                        return (
                          <tr 
                            key={req.requestId} 
                            onClick={() => handleRequestSelect(req.requestId)}
                            className={`transition align-top group cursor-pointer ${
                              isSelected 
                                ? "bg-blue-50/70 border-r-4 border-r-[#2563EB]" 
                                : isIssued
                                ? "bg-slate-100/90 text-black font-semibold hover:bg-slate-150/60"
                                : "hover:bg-slate-50/80"
                            }`}
                          >
                            {/* Request ID */}
                            <td className={`py-3.5 px-3 font-mono font-bold ${isIssued ? "text-black font-extrabold" : "text-slate-500"}`}>
                              {req.requestId}
                            </td>

                            {/* Item details */}
                            <td className="py-3.5 px-2 leading-tight">
                              <div className={`font-extrabold text-xs tracking-wide ${isIssued ? "text-black font-black" : "text-slate-900"}`}>
                                {isRtl ? req.itemNameHe : req.itemNameEn}
                              </div>
                              <div className={`font-mono text-[10px] mt-1 flex items-center gap-1 ${isIssued ? "text-black font-semibold" : "text-slate-400"}`}>
                                <span className={`text-[9px] font-bold ${isIssued ? "text-black" : "text-slate-350"}`}>{isRtl ? "מק\"ט:" : "SKU:"}</span>
                                <span>{req.sku}</span>
                              </div>
                            </td>

                            {/* Quantity */}
                            <td className={`py-3.5 px-2 text-center font-black font-mono text-sm ${isIssued ? "text-black font-black" : "text-slate-800"}`}>
                              {req.quantityRequested}
                            </td>

                            {/* Price */}
                            <td className={`py-3.5 px-2 text-left font-mono font-semibold ${isIssued ? "text-slate-600" : "text-slate-705"}`}>
                              ₪{itemPrice.toFixed(2)}
                            </td>

                            {/* Total Price */}
                            <td className={`py-3.5 px-2 text-left font-mono font-bold ${isIssued ? "text-slate-750" : "text-blue-700"}`}>
                              ₪{totalPrice.toFixed(2)}
                            </td>

                            {/* Attribute */}
                            <td className="py-3.5 px-2 font-sans">
                              {req.attributeValueId ? (
                                <div className="flex flex-col text-center font-sans">
                                  <span className={`font-extrabold text-xs leading-normal ${isIssued ? "text-black" : "text-[#2563EB]"}`}>
                                    {isRtl ? req.attributeValueNameHe : req.attributeValueNameEn}
                                  </span>
                                  <span className={`text-[10px] font-medium ${isIssued ? "text-black font-semibold" : "text-slate-450"}`}>
                                    ({isRtl ? req.attributeTypeNameHe : req.attributeTypeNameEn})
                                  </span>
                                </div>
                              ) : (
                                <div className={`text-center leading-normal text-[10px] ${isIssued ? "text-black font-bold" : "text-slate-400"}`}>
                                  <div>-- {isRtl ? "ללא" : "No"}</div>
                                  <div>{isRtl ? "מאפיינים" : "Attributes"}</div>
                                  <div>--</div>
                                </div>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-3.5 px-2">
                              {(() => {
                                const { date, time } = formatDateCell(req.requestDate);
                                return (
                                  <div className={`font-mono text-[10px] text-center leading-normal ${isIssued ? "text-black font-extrabold" : "text-slate-600"}`}>
                                    <div className="font-bold">{date}</div>
                                    <div className={`${isIssued ? "text-black font-semibold" : "text-slate-400"}`}>{time}</div>
                                  </div>
                                );
                              })()}
                            </td>

                            {/* Requester */}
                            <td className="py-3.5 px-3 leading-tight font-sans">
                              {(() => {
                                const displayName = 
                                  req.requestedBy === "svetlana@volcani.agri.gov.il"
                                    ? (isRtl ? "סבטלנה צ'רניצקי" : "Svetlana Chernitsky")
                                    : req.requestedBy === "dr.cohen@volcani.agri.gov.il"
                                    ? (isRtl ? 'ד"ר כהן (חוקר)' : "Dr. Cohen (Staff)")
                                    : req.requestedBy === "sarah.levy@volcani.agri.gov.il"
                                    ? (isRtl ? "שרה לוי (חוקרת)" : "Sarah Levy (Staff)")
                                    : req.requestedBy === "ela.v@volcani.agri.gov.il"
                                    ? ".ela.v"
                                    : req.requestedBy ? req.requestedBy.split("@")[0] : "";
                                return (
                                  <div className="text-right font-sans">
                                    <div className={`font-black text-[11px] ${isIssued ? "text-black font-black" : "text-slate-800"}`}>{displayName}</div>
                                    <div className={`text-[9px] font-mono mt-0.5 truncate max-w-[140px] ${isIssued ? "text-black font-semibold" : "text-slate-400"}`} title={req.requestedBy}>{req.requestedBy}</div>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                    {pendingRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                          {isRtl ? "לא נמצאו דרישות ניפוק ממתינות במערכת." : "No pending warehouse requests."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-Based View */}
              <div className="md:hidden space-y-3 mt-3">
                {paginatedPendingRequests
                  .map((req) => {
                    const isSelected = selectedRequestId === req.requestId;
                    const statusHe = req.statusHe || "";
                    const statusEn = req.statusEn || "";
                    const isCompleted = 
                      statusHe.includes("נופק") || 
                      statusHe.includes("בוצע") ||
                      (statusEn && (
                        statusEn.toLowerCase().includes("dispatched") || 
                        statusEn.toLowerCase().includes("delivered")
                      ));

                    return (
                      <div 
                        key={req.requestId} 
                        onClick={() => handleRequestSelect(req.requestId)}
                        className={`border rounded-xl p-4 shadow-sm space-y-3 transition cursor-pointer text-right leading-tight ${
                          isSelected 
                            ? "border-2 border-[#2563EB] bg-blue-50/20" 
                            : isCompleted
                            ? "bg-slate-50 border-slate-300 opacity-100 text-black hover:bg-slate-100"
                            : "bg-white border-slate-200 hover:border-slate-350"
                        }`}
                      >
                        <div className="flex justify-between items-center bg-gray-50 -mx-4 -mt-4 px-4 py-2 rounded-t-xl border-b border-gray-150">
                          <span className={`font-mono text-xs font-black ${isCompleted ? "text-black" : "text-[#2563EB]"}`}>{req.requestId}</span>
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-black ${
                            isCompleted 
                              ? "bg-slate-200 text-black border border-slate-400" 
                              : "bg-amber-100 text-amber-850 border border-amber-300"
                          }`}>
                            {isRtl ? req.statusHe : req.statusEn}
                          </span>
                        </div>

                        <div>
                          <h4 className={`font-black text-sm ${isCompleted ? "text-black" : "text-slate-900"}`}>
                            {isRtl ? req.itemNameHe : req.itemNameEn}
                          </h4>
                          <p className={`font-mono text-[10px] mt-1 ${isCompleted ? "text-black font-semibold" : "text-slate-400"}`}>{isRtl ? "מק\"ט" : "SKU"}: {req.sku}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs border-y border-dashed border-slate-100 py-2.5">
                          <div className="text-right">
                            <span className={`block text-[10px] ${isCompleted ? "text-black font-semibold" : "text-slate-405"}`}>{isRtl ? "כמות" : "Qty"}</span>
                            <strong className={`font-mono font-extrabold ${isCompleted ? "text-black" : "text-slate-900"}`}>{req.quantityRequested} {isRtl ? "יחידות" : "units"}</strong>
                          </div>
                          <div className="text-right">
                            <span className={`block text-[10px] ${isCompleted ? "text-black font-semibold" : "text-slate-405"}`}>{isRtl ? "מאפיין שנבחר" : "Selected Attribute"}</span>
                            {req.attributeValueId ? (
                              <div className="flex flex-col">
                                <strong className={`leading-tight text-[11px] ${isCompleted ? "text-black" : "text-[#2563EB]"}`}>{isRtl ? req.attributeValueNameHe : req.attributeValueNameEn}</strong>
                                <span className={`text-[9px] ${isCompleted ? "text-black font-semibold" : "text-slate-450"}`}>({isRtl ? req.attributeTypeNameHe : req.attributeTypeNameEn})</span>
                              </div>
                            ) : (
                              <span className={`italic text-[10px] ${isCompleted ? "text-black font-semibold" : "text-slate-400"}`}>{isRtl ? "-- ללא מאפיינים --" : "-- No Attributes --"}</span>
                            )}
                          </div>
                          
                          {/* Live Mobile Card Pricing display */}
                          {(() => {
                            const matchItem = warehouseItems ? warehouseItems.find((wi) => wi.sku === req.sku) : null;
                            const itemPrice = matchItem ? matchItem.price : 0;
                            const totalPrice = itemPrice * req.quantityRequested;
                            return (
                              <>
                                <div className="text-right border-t border-slate-50 pt-1.5 mt-0.5">
                                  <span className={`block text-[10px] ${isCompleted ? "text-black font-semibold" : "text-slate-405"}`}>{isRtl ? "מחיר פריט" : "Unit Price"}</span>
                                  <strong className={`font-mono font-bold ${isCompleted ? "text-black" : "text-slate-700"}`}>₪{itemPrice.toFixed(2)}</strong>
                                </div>
                                <div className="text-right border-t border-slate-50 pt-1.5 mt-0.5">
                                  <span className={`block text-[10px] ${isCompleted ? "text-black font-semibold" : "text-slate-405"}`}>{isRtl ? "מחיר כולל" : "Total Price"}</span>
                                  <strong className={`font-mono font-bold ${isCompleted ? "text-black" : "text-blue-700"}`}>₪{totalPrice.toFixed(2)}</strong>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                          <div className="font-mono font-medium">
                            {(() => {
                              const { date, time } = formatDateCell(req.requestDate);
                              return `${date} ${time}`;
                            })()}
                          </div>
                          <div className="font-bold text-slate-800">
                            {req.requestedBy.split("@")[0]}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Pagination Controls for Pending Requests */}
              <div 
                className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-700 select-none font-sans rounded-b-xl mt-4"
                style={{ direction: isRtl ? "rtl" : "ltr" }}
              >
                {/* Rows Per Page Selector */}
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-500">
                    {isRtl ? "שורות לעמוד:" : "Rows per page:"}
                  </span>
                  <select
                    value={pendingRowsPerPage}
                    onChange={(e) => handlePendingRowsPerPageChange(Number(e.target.value))}
                    className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-gray-800 shadow-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={30}>30</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                {/* Statistics details */}
                <div className="font-semibold text-slate-600">
                  {isRtl ? (
                    <span>
                      מציג <span className="font-mono text-blue-700 font-bold">{pendingFrom}-{pendingTo}</span> מתוך{" "}
                      <span className="font-mono text-gray-950 font-bold">{totalPending}</span> רשומות
                    </span>
                  ) : (
                    <span>
                      Showing <span className="font-mono text-blue-700 font-bold">{pendingFrom}-{pendingTo}</span> of{" "}
                      <span className="font-mono text-gray-955 font-bold">{totalPending}</span> records
                    </span>
                  )}
                </div>

                {/* First, Prev, Page numbers, Next, Last navigation buttons */}
                <div className="flex items-center gap-1.5 font-sans">
                  {/* First Page */}
                  <button
                    onClick={() => setPendingPage(1)}
                    disabled={safePendingPage === 1}
                    className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
                    title={isRtl ? "לעמוד הראשון" : "First Page"}
                  >
                    {isRtl ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
                  </button>
                  
                  {/* Previous Page */}
                  <button
                    onClick={() => setPendingPage(prev => Math.max(prev - 1, 1))}
                    disabled={safePendingPage === 1}
                    className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
                    title={isRtl ? "לעמוד הקודם" : "Previous Page"}
                  >
                    {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                  </button>

                  {/* Page Number Badges */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPendingPages }, (_, i) => i + 1)
                      .filter((page) => {
                        return page === 1 || page === totalPendingPages || Math.abs(page - safePendingPage) <= 1;
                      })
                      .map((page, idx, arr) => {
                        const elements = [];
                        if (idx > 0 && page - arr[idx - 1] > 1) {
                          elements.push(
                            <span key={`ellipse-pending-${page}`} className="px-1 text-gray-400 font-bold select-none cursor-default">
                              ...
                            </span>
                          );
                        }
                        elements.push(
                          <button
                            key={page}
                            onClick={() => setPendingPage(page)}
                            className={`w-7 h-7 flex items-center justify-center rounded border text-xs font-bold transition select-none cursor-pointer ${
                              safePendingPage === page
                                ? "bg-[#2563EB] text-white border-[#2563EB] shadow-sm"
                                : "bg-white border-gray-300 hover:bg-gray-50 text-slate-700 hover:text-slate-900"
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
                    onClick={() => setPendingPage(prev => Math.min(prev + 1, totalPendingPages))}
                    disabled={safePendingPage === totalPendingPages}
                    className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
                    title={isRtl ? "לעמוד הבא" : "Next Page"}
                  >
                    {isRtl ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>

                  {/* Last Page */}
                  <button
                    onClick={() => setPendingPage(totalPendingPages)}
                    disabled={safePendingPage === totalPendingPages}
                    className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
                    title={isRtl ? "לעמוד האחרון" : "Last Page"}
                  >
                    {isRtl ? <ChevronsLeft className="h-3.5 w-3.5" /> : <ChevronsRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Photo Preview Modal */}
      {previewImageUrl && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden relative border border-gray-150 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 mb-3" style={{ direction: isRtl ? "rtl" : "ltr" }}>
              <h3 className="text-sm font-extrabold text-slate-800 truncate pr-4 pl-4">
                {previewImageTitle}
              </h3>
              <button 
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="text-gray-400 hover:text-gray-600 transition p-1.5 hover:bg-slate-100 rounded-full cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body (Image) */}
            <div className="w-full aspect-square md:aspect-[4/3] rounded-xl overflow-hidden bg-slate-50 border border-gray-200 p-1 flex items-center justify-center">
              <img 
                src={previewImageUrl} 
                alt={previewImageTitle} 
                className="max-h-full max-w-full object-contain rounded-lg"
                style={{ filter: previewImageFilter }}
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Modal Footer / Hint */}
            <div className="mt-3 text-center text-[10.5px] text-slate-400 font-sans font-bold">
              {isRtl ? "לחיצה מחוץ לחלון או על ה-X לסגירה" : "Click outside or X to close"}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
