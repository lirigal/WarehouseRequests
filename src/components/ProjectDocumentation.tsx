import React, { useState, useEffect, useRef } from "react";
import { FileText, Download, Printer, ExternalLink, AlertCircle, RefreshCw, ShieldAlert, FileCode } from "lucide-react";

interface ProjectDocumentationProps {
  currentLanguage: "HE" | "EN";
  currentRole: string;
}

export const ProjectDocumentation: React.FC<ProjectDocumentationProps> = ({
  currentLanguage,
  currentRole,
}) => {
  const isRtl = currentLanguage === "HE";
  const [loading, setLoading] = useState<boolean>(true);
  const [fileMissing, setFileMissing] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check if the documentation file is available via HTTP request
  const checkFileExistence = async () => {
    setChecking(true);
    try {
      const response = await fetch("/Project_Documentation.html", { method: "HEAD" });
      if (response.ok) {
        setFileMissing(false);
      } else {
        console.error("Project_Documentation.html check failed with status:", response.status);
        setFileMissing(true);
      }
    } catch (err) {
      console.error("Failed to verify existence of Project_Documentation.html:", err);
      setFileMissing(true);
    } finally {
      setChecking(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    checkFileExistence();
  }, []);

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.print();
      } catch (err) {
        console.error("Printing iframe content failed: ", err);
        // Fallback: Open in new tab and print
        const win = window.open("/Project_Documentation.html", "_blank");
        if (win) {
          win.print();
        }
      }
    }
  };

  // Role-Based Authorization enforcement
  const isAuthorized = currentRole === "ADMIN" || currentRole === "MANAGER" || currentRole === "STOREKEEPER";

  if (!isAuthorized) {
    return (
      <div 
        className="bg-slate-900 border border-red-900/40 rounded-xl p-8 max-w-2xl mx-auto my-12 text-center shadow-xl"
        id="docs-unauthorized-card"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-red-950/40 rounded-full border border-red-500/20">
            <ShieldAlert className="h-12 w-12 text-red-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-red-400 mb-3 tracking-tight">
          {isRtl ? "גישה חסומה — הרשאות חסרות" : "Access Denied — Insufficient Permissions"}
        </h2>
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
          {isRtl 
            ? "דף זה מיועד למנהלי מערכת, אנשי פיתוח ומפעילי לוגיסטיקה מורשים בלבד. תפקיד המשתמש הנוכחי שלך אינו מורשה לצפות בתיעוד הטכני של המערכת."
            : "This documentation contains sensitive enterprise system architecture mappings and user schemas. It is restricted to Administrators, Managers, and Storekeepers only."}
        </p>
        <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800 text-xs text-gray-400 font-mono text-left inline-block w-full max-w-md">
          <p className="font-semibold mb-1">🔐 System Context:</p>
          <p>• Authenticated Role: {currentRole || "NULL"}</p>
          <p>• Access Control: REQUIRED Role in [ADMIN, MANAGER, STOREKEEPER]</p>
          <p>• Status: REJECTED (403 Forbidden)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full" dir={isRtl ? "rtl" : "ltr"}>
      {/* Document Control Panel bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#1E293B] border border-slate-700/80 p-4 rounded-lg shadow-md gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded border border-blue-500/30">
            <FileText className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              {isRtl ? "תיעוד המערכת הרשמי" : "System & Enterprise Documentation"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isRtl 
                ? "מדריך למשתמש, קטלוג בסיס נתונים וסקירה טכנית מורחבת" 
                : "End-User Manual, relational schemas, database logs and technical overview"}
            </p>
          </div>
        </div>

        {/* Operational buttons */}
        {!fileMissing && !loading && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Print button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-semibold rounded border border-slate-700 transition cursor-pointer select-none"
              title={isRtl ? "הדפס מסמך" : "Print Document"}
            >
              <Printer className="h-3.5 w-3.5" />
              <span>{isRtl ? "הדפסה" : "Print"}</span>
            </button>

            {/* Open in new tab */}
            <a
              href="/Project_Documentation.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-gray-200 text-xs font-semibold rounded border border-slate-700 transition cursor-pointer select-none"
              title={isRtl ? "פתח בכרטיסייה חדשה" : "Open in a new tab"}
            >
              <ExternalLink className="h-3.5 w-3.5 text-blue-400" />
              <span>{isRtl ? "חלון חדש" : "New Tab"}</span>
            </a>

            {/* PDF format download */}
            <a
              href="/documentation/Project_Documentation.pdf"
              download="Volcani_System_Documentation.pdf"
              className="flex items-center gap-1.5 py-1.5 px-3 bg-red-950/30 hover:bg-red-900/40 text-red-300 text-xs font-semibold rounded border border-red-900/30 transition cursor-pointer select-none"
              title={isRtl ? "הורד כקובץ PDF" : "Download as PDF"}
            >
              <Download className="h-3.5 w-3.5" />
              <span>PDF</span>
            </a>

            {/* Word format download */}
            <a
              href="/documentation/Project_Documentation.docx"
              download="Volcani_System_Documentation.docx"
              className="flex items-center gap-1.5 py-1.5 px-3 bg-blue-950/30 hover:bg-blue-900/40 text-blue-300 text-xs font-semibold rounded border border-blue-900/30 transition cursor-pointer select-none"
              title={isRtl ? "הורד כקובץ Word" : "Download as Word"}
            >
              <Download className="h-3.5 w-3.5" />
              <span>DOCX</span>
            </a>

            {/* Markdown format download */}
            <a
              href="/documentation/Project_Documentation.md"
              download="Volcani_System_Documentation.md"
              className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-950/20 hover:bg-amber-900/30 text-amber-300 text-xs font-semibold rounded border border-amber-950/30 transition cursor-pointer select-none"
              title={isRtl ? "הורד כקובץ Markdown" : "Download as Markdown"}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Markdown</span>
            </a>
          </div>
        )}
      </div>

      {/* Main documentation container body */}
      <div className="w-full bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-xl min-h-[600px] flex flex-col">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-gray-400 gap-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-sm">{isRtl ? "בודק זמינות מסמכים..." : "Verifying documentation files..."}</p>
          </div>
        ) : fileMissing ? (
          /* User-friendly Error fallback if document files are missing */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-2xl mx-auto my-8 gap-5" id="docs-missing-error">
            <div className="p-4 bg-amber-950/30 rounded-full border border-amber-500/30 animate-bounce">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-amber-400 mb-2">
                {isRtl ? "קובץ התיעוד לא נמצא בשרת" : "Documentation File Missing"}
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-4">
                {isRtl 
                  ? "הקובץ 'Project_Documentation.html' חסר או שטרם הופק בתיקיית התיעוד של השרת. אנא הרץ את מחולל התיעוד על מנת לבנות את כל הפורמטים הנדרשים."
                  : "The generated HTML documentation file ('Project_Documentation.html') is not available on the server. Please run the automatic document compiler script to rebuild all formats."}
              </p>
              
              <div className="bg-slate-950 p-4 rounded border border-slate-800 text-left font-mono text-xs text-emerald-400 mb-4 w-full">
                <p className="text-gray-500 mb-1">// Run this diagnostic command to build documentation:</p>
                <p className="font-semibold select-all">npx tsx src/generate_docs.ts</p>
              </div>

              <div className="text-xs text-gray-500 bg-slate-950/40 p-3 rounded border border-slate-800/60 text-left font-mono leading-relaxed">
                <p className="font-semibold text-gray-400">🔍 Server Diagnostics:</p>
                <p>• Expected Path: /documentation/Project_Documentation.html</p>
                <p>• Endpoint Attempted: GET /Project_Documentation.html</p>
                <p>• Action Trigger: Missing server-side file asset</p>
              </div>
            </div>

            <button
              onClick={checkFileExistence}
              disabled={checking}
              className="flex items-center gap-2 py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white text-xs font-bold rounded transition cursor-pointer select-none shadow"
            >
              <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
              <span>{isRtl ? "נסה שנית" : "Retry Check"}</span>
            </button>
          </div>
        ) : (
          /* Secure, responsive documentation frame container */
          <div className="w-full h-[750px] relative bg-white rounded-b-lg">
            <iframe
              ref={iframeRef}
              src="/Project_Documentation.html"
              className="w-full h-full border-0 rounded-b-lg"
              title="Project Documentation Layout"
              id="documentation-iframe"
            />
          </div>
        )}
      </div>
    </div>
  );
};
