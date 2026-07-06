import React, { useState } from "react";
import { memoryStore } from "../lib/memoryStore";
import { AppUser, Language, AccessRole } from "../types";
import { validateEmail, validateTeudatZehut, hashPassword } from "../lib/authUtils";
import { Shield, Key, FileText, UserPlus, LogIn, Check, AlertCircle, RefreshCw, Languages, Phone, Mail, Award, User, Eye, EyeOff } from "lucide-react";

interface AuthScreenProps {
  currentLanguage: Language;
  setLanguage: (lang: Language) => void;
  users: AppUser[];
  onRegister: (newUser: AppUser) => Promise<string | null>; // Returns error message if failed, null on success
  onLogin: (teudatZehut: string, passwordHash: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  currentLanguage,
  setLanguage,
  users,
  onRegister,
  onLogin,
}) => {
  const isRtl = currentLanguage === "HE";

  // Mode: "LOGIN" or "REGISTER"
  const [mode, setMode] = useState<"LOGIN" | "REGISTER">("LOGIN");

  // Form States
  const [teudatZehut, setTeudatZehut] = useState(() => {
    try {
      return memoryStore.getItem("nipuk_remembered_tz") || "";
    } catch {
      return "";
    }
  });
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("מהנדס");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI States
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return memoryStore.getItem("nipuk_remember_me") !== "false";
    } catch {
      return true;
    }
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  // Translation Dictionaries
  const t = {
    loginTitle: isRtl ? "כניסת משתמשים ומורשי גישה" : "Staff Secure Authenticator",
    registerTitle: isRtl ? "רישום פריט אנוש חדש במערכת" : "Authorized User Registration",
    welcomeTitle: isRtl ? "מערכת דרישות מחסן תפעולית" : "Agricultural Research Warehouse Request Portal",
    welcomeSubtitle: isRtl 
      ? 'מינהל המחקר החקלאי. גישה מאובטחת לניהול פריטי מלאי ומאפייני סופר-מק"טים.'
      : "Agricultural Research Organization. Secure console for ERP inventory control & taxonomy authorization.",
    tzLabel: isRtl ? "תעודת זהות (9 ספרות)" : "Teudat Zehut (exactly 9 digits)",
    tzPlaceholder: isRtl ? "הזן 9 ספרות..." : "Enter 9-digit TZ username...",
    tzHint: isRtl ? "המספר ישמש כשם המשתמש הייחודי שלך בכניסה" : "ID will serve as your unique system Username",
    btnSubmitLogin: isRtl ? "התחבר למערכת" : "Sign in securely",
    btnSubmitRegister: isRtl ? "בצע רישום והקצאה" : "Create employee profile",
    toggleToRegister: isRtl ? "אין לך עדיין חשבון? הירשם כאן" : "No staff profile yet? Register here",
    toggleToLogin: isRtl ? "כבר רשום במערכת? היכנס עכשיו" : "Already have a profile? Sign in",
    firstNameLabel: isRtl ? "שם פרטי" : "First Name",
    lastNameLabel: isRtl ? "שם משפחה" : "Last Name",
    emailLabel: isRtl ? "דואר אלקטרוני" : "Email Address",
    phoneLabel: isRtl ? "מספר טלפון נייד" : "Mobile Phone Number",
    phonePlaceholder: isRtl ? "לדוגמה: 0501234567" : "e.g., 0521234567",
    jobTitleLabel: isRtl ? "תפקיד ארגוני / הגדרת משרה" : "Organizational Job Title",
    passwordLabel: isRtl ? "סיסמת גישה מאובטחת" : "Secure System Password",
    confirmPasswordLabel: isRtl ? "אימות סיסמה מחדש" : "Verify Password Again",
    passwordPlaceholder: isRtl ? "הזן סיסמה..." : "Enter secure code...",
    errorTitle: isRtl ? "שגיאת אבטחה ואינטגרציה" : "Security Check Failed",
    successTitle: isRtl ? "הפעולה בוצעה בהצלחה" : "Registration success",
    successRedirect: isRtl ? "הרישום בוצע בהצלחה! מעביר כעת למסך כניסה..." : "Profile created! Loading login prompt...",
    mandatoryFieldsError: isRtl ? "אנא מלא את כל השדות הדרושים" : "All fields are required.",
    invalidTzError: isRtl ? "שגיאה: תעודת זהות חייבת להכיל בדיוק 9 ספרות" : "Teudat Zehut must contain exactly 9 numeric digits.",
    invalidEmailError: isRtl ? "שגיאה: כתובת דוא\"ל לא תקינה" : "Please enter a valid email address.",
    mismatchPasswordError: isRtl ? "שגיאה: הסיסמאות אינן תואמות" : "Passwords do not match.",
    shortPasswordError: isRtl ? "הסיסמה חייבת להכיל 4 תווים לפחות" : "Password must be at least 4 characters.",
    demoHelperTitle: isRtl ? "נתוני גישה קיימים לסימולציה ופיתוח:" : "Pre-configured Developer Credentials:"
  };

  const handleToggleMode = () => {
    const nextMode = mode === "LOGIN" ? "REGISTER" : "LOGIN";
    setMode(nextMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    if (nextMode === "LOGIN") {
      try {
        setTeudatZehut(memoryStore.getItem("nipuk_remembered_tz") || "");
      } catch {
        setTeudatZehut("");
      }
    } else {
      setTeudatZehut("");
    }
    
    setPassword("");
    setConfirmPassword("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
  };

  const executeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!teudatZehut.trim() || !password.trim()) {
      setErrorMsg(t.mandatoryFieldsError);
      return;
    }

    if (!validateTeudatZehut(teudatZehut)) {
      setErrorMsg(t.invalidTzError);
      return;
    }

    setLoading(true);
    try {
      const hashed = await hashPassword(password);
      const res = await onLogin(teudatZehut, hashed);
      if (!res.success) {
        setErrorMsg(res.error || (isRtl ? "פרטי כניסה שגויים או שמשתמש זה לא מורשה מנהלתית." : "Invalid credentials or deactivated account."));
      } else {
        // Successful login, save or remove from memoryStore based on rememberMe checkbox
        try {
          if (rememberMe) {
            memoryStore.setItem("nipuk_remembered_tz", teudatZehut);
            memoryStore.setItem("nipuk_remember_me", "true");
          } else {
            memoryStore.removeItem("nipuk_remembered_tz");
            memoryStore.setItem("nipuk_remember_me", "false");
          }
        } catch (e) {
          console.warn("memoryStore is not available:", e);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const executeRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Basic required field validations
    if (
      !teudatZehut.trim() ||
      !firstName.trim() ||
      !lastName.trim() ||
      !phone.trim() ||
      !email.trim() ||
      !password.trim() ||
      !confirmPassword.trim()
    ) {
      setErrorMsg(t.mandatoryFieldsError);
      return;
    }

    // Teudat Zehut Validation
    if (!validateTeudatZehut(teudatZehut)) {
      setErrorMsg(t.invalidTzError);
      return;
    }

    // Email validation
    if (!validateEmail(email)) {
      setErrorMsg(t.invalidEmailError);
      return;
    }

    // Passwords Match Validation
    if (password !== confirmPassword) {
      setErrorMsg(t.mismatchPasswordError);
      return;
    }

    if (password.length < 4) {
      setErrorMsg(t.shortPasswordError);
      return;
    }

    setLoading(true);
    try {
      const hashed = await hashPassword(password);
      const newUser: AppUser = {
        userId: `usr-${Date.now()}`,
        teudatZehut,
        firstName,
        lastName,
        jobTitle,
        phone,
        email,
        passwordHash: hashed,
        role: "STAFF" as AccessRole,
        isActive: true,
        createdDate: new Date().toISOString(),
        lastLoginDate: ""
      };

      const error = await onRegister(newUser);
      if (error) {
        setErrorMsg(error);
      } else {
        setSuccessMsg(t.successRedirect);
        // Switch to login screen after a brief delay
        setTimeout(() => {
          setMode("LOGIN");
          setSuccessMsg(null);
          setErrorMsg(null);
          setConfirmPassword("");
          setPassword("");
        }, 1800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[#F3F4F6] flex flex-col justify-between py-10 px-4 md:px-0 text-[#1F2937]"
      style={{ direction: isRtl ? "rtl" : "ltr" }}
    >
      
      {/* Upper IIS Emulation Header */}
      <div className="absolute top-0 inset-x-0 bg-[#1F2937] text-slate-200 font-mono text-[11px] py-1 px-4 flex justify-between items-center select-none border-b border-gray-700">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
          MEMBERSHIP_ACCESS_CONTROLLER // HTTPS SECURE TOKEN // STATUS: IN_SERVICE
        </span>
        <button
          onClick={() => setLanguage(currentLanguage === "HE" ? "EN" : "HE")}
          className="flex items-center gap-1.5 text-[11px] text-blue-300 hover:text-white cursor-pointer transition font-mono border-l border-gray-750 pl-3 uppercase"
        >
          <Languages className="h-3 w-3" />
          <span>{currentLanguage === "HE" ? "English" : "עברית"}</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center pt-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden" id="auth-panel-wrapper">
          
          {/* Top Branding Section */}
          <div className="bg-[#1e293b] text-white p-6 relative">
            <div className="absolute top-4 right-4 bg-blue-600/20 text-blue-400 border border-blue-500/30 font-mono text-[10px] px-2 py-0.5 rounded uppercase">
              v1.0.2 Active Directory Sync
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-[#2563EB] text-white rounded-xl flex items-center justify-center font-bold text-2xl shadow-md shrink-0">
                🌾
              </div>
              <div>
                <h1 className="text-md md:text-lg font-bold tracking-tight text-white leading-tight">
                  {t.welcomeTitle}
                </h1>
                <p className="text-xs text-slate-400 mt-1 font-sans">
                  מינהל המחקר החקלאי
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-4 leading-relaxed font-sans border-t border-slate-700 pt-3">
              {t.welcomeSubtitle}
            </p>
          </div>

          {/* Tab Selection Info bar */}
          <div className="bg-slate-50 border-b border-slate-200 flex text-center">
            <button
              onClick={() => { setMode("LOGIN"); setErrorMsg(null); }}
              className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
                mode === "LOGIN" 
                  ? "border-[#2563EB] text-[#2563EB] bg-white" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <LogIn className="h-4 w-4" />
              {isRtl ? "כניסת משתמש רשום" : "Sign In Area"}
            </button>
            <button
              onClick={() => { setMode("REGISTER"); setErrorMsg(null); }}
              className={`flex-1 py-3 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 cursor-pointer ${
                mode === "REGISTER" 
                  ? "border-[#2563EB] text-[#2563EB] bg-white" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserPlus className="h-4 w-4" />
              {isRtl ? "רישום עובד חדש" : "New Registration"}
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 md:p-8">
            
            {/* Feedback Notifications */}
            {errorMsg && (
              <div className="mb-5 bg-rose-50 border border-rose-250 text-rose-800 rounded-lg p-3 text-xs flex items-start gap-2.5 border-l-4 border-l-rose-600 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5">{t.errorTitle}</strong>
                  <span>{errorMsg}</span>
                </div>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-lg p-3 text-xs flex items-start gap-2.5 border-l-4 border-l-emerald-600 animate-fade-in">
                <Check className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold block mb-0.5">{t.successTitle}</strong>
                  <span>{successMsg}</span>
                </div>
              </div>
            )}

            {/* Login Frame */}
            {mode === "LOGIN" && (
              <form onSubmit={executeLogin} className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <Key className="h-4 w-4 text-[#2563EB]" />
                  {t.loginTitle}
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right font-sans">
                    {t.tzLabel}
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={9}
                    value={teudatZehut}
                    onChange={(e) => setTeudatZehut(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2.5 outline-none focus:border-blue-600 text-left tracking-widest bg-white"
                    placeholder={t.tzPlaceholder}
                    disabled={loading}
                  />
                  <span className="block text-[10px] text-slate-400 mt-1">
                    {t.tzHint}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 text-right font-sans">
                    {t.passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.getModifierState("CapsLock")) {
                          setCapsLockOn(true);
                        } else {
                          setCapsLockOn(false);
                        }
                      }}
                      onKeyUp={(e) => {
                        if (e.getModifierState("CapsLock")) {
                          setCapsLockOn(true);
                        } else {
                          setCapsLockOn(false);
                        }
                      }}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2.5 pr-10 pl-10 outline-none focus:border-blue-600 bg-white text-right"
                      placeholder={t.passwordPlaceholder}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute inset-y-0 ${isRtl ? "left-3" : "right-3"} flex items-center text-slate-400 hover:text-slate-650 cursor-pointer p-1`}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {capsLockOn && (
                    <div className="flex items-center gap-1.5 text-amber-600 text-[11px] mt-1.5 font-bold font-sans animate-pulse justify-end">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>{isRtl ? "שים לב: מקש Caps Lock פעיל!" : "Caps Lock is active!"}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                    />
                    <span className="text-[11.5px] text-slate-600 font-bold font-sans">
                      {isRtl ? "זכור אותי במחשב זה" : "Remember me on this computer"}
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-4 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white hover:from-blue-700 hover:to-blue-800 transition py-2.5 rounded-lg text-xs font-bold cursor-pointer shadow flex items-center justify-center gap-1.5 select-none"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      {isRtl ? "מאמת נתונים בשקף שרת..." : "Decrypting & verifying session..."}
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      {t.btnSubmitLogin}
                    </>
                  )}
                </button>

                <div className="pt-4 text-center border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={handleToggleMode}
                    className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    {t.toggleToRegister}
                  </button>
                </div>
              </form>
            )}

            {/* Registration Frame */}
            {mode === "REGISTER" && (
              <form onSubmit={executeRegistration} className="space-y-4">
                <h3 className="text-sm font-bold text-slate-500 border-b border-slate-100 pb-1 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-[#2563EB]" />
                  {t.registerTitle}
                </h3>

                {/* ID Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                    {t.tzLabel} *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={9}
                    value={teudatZehut}
                    onChange={(e) => setTeudatZehut(e.target.value.replace(/\D/g, ""))}
                    className="w-full text-xs font-bold border border-slate-300 rounded-lg p-2 bg-white outline-none focus:border-blue-600 tracking-widest text-left"
                    placeholder={t.tzPlaceholder}
                    disabled={loading}
                  />
                </div>

                {/* Names */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                      {t.firstNameLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white outline-none focus:border-blue-600 text-right"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                      {t.lastNameLabel} *
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white outline-none focus:border-blue-600 text-right"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                    {t.jobTitleLabel} *
                  </label>
                  <select
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white outline-none focus:border-blue-600 cursor-pointer font-semibold text-slate-800"
                    disabled={loading}
                  >
                    <option value="עובד מחקר">עובד מחקר</option>
                    <option value="מהנדס">מהנדס</option>
                    <option value="טכנאי">טכנאי</option>
                    <option value="חוקר">חוקר</option>
                    <option value="תוכניות עבודה">תוכניות עבודה</option>
                    <option value="טל&quot;ת">טל"ת</option>
                  </select>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-right flex items-center gap-1 justify-end">
                      <Phone className="h-3 w-3 text-slate-400" />
                      {t.phoneLabel} *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white outline-none focus:border-blue-600 text-left font-semibold"
                      placeholder={t.phonePlaceholder}
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-right flex items-center gap-1 justify-end">
                      <Mail className="h-3 w-3 text-slate-400" />
                      {t.emailLabel} *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white outline-none focus:border-blue-600 text-left font-semibold"
                      placeholder="email@agri.gov.il"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password and Confirm Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                      {t.passwordLabel} *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.getModifierState("CapsLock")) {
                            setCapsLockOn(true);
                          } else {
                            setCapsLockOn(false);
                          }
                        }}
                        onKeyUp={(e) => {
                          if (e.getModifierState("CapsLock")) {
                            setCapsLockOn(true);
                          } else {
                            setCapsLockOn(false);
                          }
                        }}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 pr-9 pl-9 bg-white outline-none focus:border-blue-600 text-right"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className={`absolute inset-y-0 ${isRtl ? "left-2.5" : "right-2.5"} flex items-center text-slate-400 hover:text-slate-650 cursor-pointer p-0.5`}
                        tabIndex={-1}
                      >
                        {showRegisterPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 text-right">
                      {t.confirmPasswordLabel} *
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.getModifierState("CapsLock")) {
                            setCapsLockOn(true);
                          } else {
                            setCapsLockOn(false);
                          }
                        }}
                        onKeyUp={(e) => {
                          if (e.getModifierState("CapsLock")) {
                            setCapsLockOn(true);
                          } else {
                            setCapsLockOn(false);
                          }
                        }}
                        className="w-full text-xs border border-slate-300 rounded-lg p-2 pr-9 pl-9 bg-white outline-none focus:border-blue-600 text-right"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className={`absolute inset-y-0 ${isRtl ? "left-2.5" : "right-2.5"} flex items-center text-slate-400 hover:text-slate-650 cursor-pointer p-0.5`}
                        tabIndex={-1}
                      >
                        {showRegisterPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {capsLockOn && (
                  <div className="flex items-center gap-1.5 text-amber-600 text-[11px] font-bold font-sans animate-pulse justify-end">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{isRtl ? "שים לב: מקש Caps Lock פעיל!" : "Caps Lock is active!"}</span>
                  </div>
                )}

                {password && (
                  <div className="text-[11px] font-sans flex flex-col gap-1 text-right mt-1 bg-slate-50 p-2 rounded border border-slate-150">
                    <div className="flex justify-between items-center flex-row-reverse">
                      <span>{isRtl ? "חוזק סיסמה (לפחות 4 תווים):" : "Password strength (at least 4 chars):"}</span>
                      <span className={`font-bold ${password.length >= 4 ? "text-emerald-600" : "text-rose-600"}`}>
                        {password.length >= 4 ? (isRtl ? "תקין ✓" : "Valid ✓") : (isRtl ? "קצר מדי ✗" : "Too short ✗")}
                      </span>
                    </div>
                    {confirmPassword && (
                      <div className="flex justify-between items-center flex-row-reverse border-t border-slate-200/50 pt-1">
                        <span>{isRtl ? "התאמת סיסמאות:" : "Password matching:"}</span>
                        <span className={`font-bold ${password === confirmPassword ? "text-emerald-600" : "text-rose-600"}`}>
                          {password === confirmPassword ? (isRtl ? "תואם ✓" : "Match ✓") : (isRtl ? "לא תואם ✗" : "Mismatch ✗")}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-[#2563EB] hover:bg-blue-700 text-white transition py-2.5 rounded-lg text-xs font-bold cursor-pointer shadow flex items-center justify-center gap-1.5 select-none"
                >
                  {loading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      {t.btnSubmitRegister}
                    </>
                  )}
                </button>

                <div className="pt-4 text-center border-t border-slate-100 mt-4">
                  <button
                    type="button"
                    onClick={handleToggleMode}
                    className="text-xs font-bold text-[#2563EB] hover:underline cursor-pointer"
                  >
                    {t.toggleToLogin}
                  </button>
                </div>
              </form>
            )}

            {/* Simulated credentials block for direct development access */}
            <div className="mt-6 pt-5 border-t border-dashed border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase block mb-2 tracking-wider">
                {t.demoHelperTitle}
              </span>
              <div className="space-y-1.5 text-[10px] font-mono text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-150">
                <div className="flex justify-between items-center">
                  <span><strong>123456789</strong> (סבטלנה, מנהלת מחסן)</span>
                  <span className="bg-amber-100 text-amber-800 px-1 rounded text-[9px] font-bold">MANAGER</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span><strong>987654321</strong> (ד"ר כהן, מדען חוקר)</span>
                  <span className="bg-teal-100 text-teal-800 px-1 rounded text-[9px] font-bold">STAFF</span>
                </div>
                <div className="pt-1.5 text-right font-sans text-xs text-slate-450 border-t border-slate-200/50 mt-1">
                  💡 סיסמת ברירת מחדל לכולם: <code className="font-mono bg-white border border-slate-200 px-1 rounded text-red-650 font-bold select-all">password123</code>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Footer copyright block */}
      <div className="text-center text-slate-400 text-[10px] font-mono select-none mt-6">
        SQL_SERVER: dbo.Users | TRANSACTION_ISOLATION_LEVEL: READ_COMMITTED | AGRICULTURAL_RESEARCH_ORGANIZATION © 2026
      </div>

    </div>
  );
};
