import React from "react";
import { AccessRole, Language, AppUser } from "../types";
import { Shield, Languages, RefreshCcw, CheckCircle2, User, LogOut } from "lucide-react";

interface EnterpriseLayoutProps {
  currentLanguage: Language;
  currentRole: AccessRole;
  setLanguage: (lang: Language) => void;
  onImportExcel: () => void;
  excelImportCount: number;
  lastImportTime: string | null;
  currentUser: AppUser | null;
  onLogout: () => void;
  children: React.ReactNode;
}

export const EnterpriseLayout: React.FC<EnterpriseLayoutProps> = ({
  currentLanguage,
  currentRole,
  setLanguage,
  onImportExcel,
  excelImportCount,
  lastImportTime,
  currentUser,
  onLogout,
  children
}) => {
  const isRtl = currentLanguage === "HE";

  // Localized texts
  const t = {
    title: "",
    subtitle: isRtl ? "מערכת דרישות מחסן תפעולית" : "Warehouse Request Portal",
    badgeManager: isRtl ? "מנהל מחסן מורשה" : "Authorized Manager",
    badgeStaff: isRtl ? "חוקר / עובד מנהלה" : "Researcher / Staff User",
    importLabel: isRtl ? "טעינת מלאי אקסל יומית" : "Import Daily ERP Excel",
    importDesc: isRtl 
      ? "משיכת כמויות ומחירים ממע' 'מרכבה' - שיוך המאפיינים נשאר שריר ויציב!"
      : "Refresh stock/price from ERP. Mapped categories stay protected!",
    importedSuccess: isRtl 
      ? `עודכן בהצלחה! סנכרונים: ${excelImportCount}` 
      : `Refreshed! Sync count: ${excelImportCount}`,
    lastImportHe: "סנכרון אחרון: ",
    lastImportEn: "Last ERP Import: ",
    devWarningHe: "סביבת פיתוח ואינטגרציה פעילה",
    devWarningEn: "Active .NET Web Forms Integration Workspace"
  };

  return (
    <div 
      className="min-h-screen bg-[#F3F4F6] text-[#1F2937] transition-all font-sans border-t-4 border-[#2563EB]"
      style={{ direction: isRtl ? "rtl" : "ltr" }}
    >
      {/* Top Warning Banner mimicking developer IIS environment bar */}
      <div className="bg-[#1f2937] text-slate-200 font-mono text-xs py-1 px-4 flex justify-between items-center select-none border-b border-slate-750">
        <span className="flex items-center gap-1.5 font-medium">
          <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
          OFFLINE PORTAL SIMULATOR // PORT: 3000 // IIS WEB_FORMS EMULATION
        </span>
        <span className="hidden sm:inline text-blue-400">
          {isRtl ? t.devWarningHe : t.devWarningEn}
        </span>
      </div>

      {/* Corporate Agricultural Header */}
      <header className="bg-white border-b border-gray-250 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">
          
          {/* Logo and system title */}
          <div className="flex items-center gap-3">
            {/* Visual Logo Emblem */}
            <div className="h-10 w-10 bg-[#2563EB] text-white rounded flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              🌾
            </div>
            <div className="text-right sm:text-left">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                {t.subtitle}
              </h1>
              <div className="text-xs sm:text-sm text-gray-400 font-medium mt-1">
                {isRtl ? "ממשק מעורב אקטיבי" : "Active Core"}
              </div>
            </div>
          </div>

          {/* Quick global controls (Language, User Session, ERP Sync) */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1 sm:mt-0 font-sans">
            
            {/* Removed the 'טעינת מלאי אקסל יומית' button as requested */}

            {/* Language switch */}
            <button
              onClick={() => setLanguage(currentLanguage === "HE" ? "EN" : "HE")}
              className="flex items-center gap-1.5 text-xs text-gray-650 hover:text-gray-900 border border-gray-200 hover:border-gray-350 rounded px-3 py-1.5 bg-gray-50 cursor-pointer transition font-medium"
            >
              <Languages className="h-4 w-4 text-gray-400" />
              <span>{currentLanguage === "HE" ? "English" : "עברית"}</span>
            </button>

            {/* Real Authentication Session Details */}
            {currentUser && (
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-1 px-3">
                <div className="text-right">
                  <div className="text-xs font-extrabold text-slate-800 leading-none">
                    {currentUser.firstName} {currentUser.lastName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {currentUser.jobTitle}
                  </div>
                </div>
                
                {/* Logout Trigger */}
                <button
                  onClick={onLogout}
                  className="p-1 px-2 text-rose-600 hover:bg-rose-50 rounded text-[10px] font-bold flex items-center gap-1 transition duration-150 cursor-pointer border border-rose-200 bg-white select-none"
                  title={isRtl ? "התנתק מהמערכת" : "Sign Out"}
                >
                  <LogOut className="h-3 w-3 shrink-0 text-rose-500" />
                  <span>{isRtl ? "התנתק" : "Sign Out"}</span>
                </button>
              </div>
            )}

            {/* Active Privilege Badge */}
            <div className={`hidden md:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded font-mono border ${
              currentRole === "ADMIN" || currentRole === "MANAGER"
                ? "bg-[#1E293B] text-blue-400 border-gray-700"
                : currentRole === "STOREKEEPER"
                ? "bg-[#1E293B] text-amber-400 border-gray-700"
                : "bg-[#1E293B] text-emerald-400 border-gray-700"
            }`}>
              <Shield className="h-3.5 w-3.5 text-blue-300" />
              <span>
                {currentRole === "ADMIN"
                  ? (isRtl ? "מנהל מחסן מורשה (ADMIN)" : "Authorized Admin")
                  : currentRole === "MANAGER"
                  ? (isRtl ? "מנהל מחסן מורשה" : "Authorized Manager")
                  : currentRole === "STOREKEEPER"
                  ? (isRtl ? "מחסנאי מורשה" : "Authorized Storekeeper")
                  : (isRtl ? t.badgeStaff : t.badgeStaff)}
              </span>
            </div>

          </div>
          
        </div>
      </header>

      {/* Main Container Wrapper */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        
        {/* Real-time sync feedback message banner */}
        {excelImportCount > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-250 text-blue-800 rounded px-4 py-2.5 flex items-center justify-between shadow-sm animate-fade-in text-sm border-l-4 border-l-blue-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 text-blue-600 shrink-0" />
              <span>
                <strong>ERP Daily Stock Synced:</strong> {t.importDesc}
              </span>
            </div>
            <span className="font-mono text-blue-900 font-bold bg-blue-100 px-2 py-0.5 rounded text-xs">
              {t.importedSuccess}
            </span>
          </div>
        )}

        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#F9FAFB] text-gray-500 py-6 px-8 border-t border-gray-200 mt-12 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-right">
            <p className="text-gray-400 text-[11px]">מערכת דרישות מחסן ואבטחת נותני מאפיינים © 2026. כל הזכויות שמורות.</p>
          </div>
          <div className="font-mono text-gray-400 text-[10px] text-center md:text-left shrink-0">
            SQL Server Connected: MERKAVA_PROD_1 | Database: dbo.Users | Security Protocol TLS 1.3 Enabled
          </div>
        </div>
      </footer>
    </div>
  );
};
