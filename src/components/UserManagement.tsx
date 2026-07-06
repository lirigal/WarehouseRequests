import React, { useState, useEffect } from "react";
import { AppUser, AccessRole, Language } from "../types";
import { 
  Shield, 
  User, 
  UserPlus, 
  Edit2, 
  Check, 
  Search, 
  Mail, 
  Phone, 
  Clock, 
  Lock, 
  Unlock, 
  Filter,
  UserCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from "lucide-react";

interface UserManagementProps {
  currentLanguage: Language;
  users: AppUser[];
  onUpdateUser: (updatedUser: AppUser) => void;
  onAddUser: (newUser: AppUser) => string | null; // returns error message if failed, null on success
  currentUser: AppUser;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentLanguage,
  users,
  onUpdateUser,
  onAddUser,
  currentUser,
}) => {
  const isRtl = currentLanguage === "HE";

  // Search & Filtering State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Pagination State
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    try {
      const userKey = `agri_users_rows_per_page_${currentUser?.id || "guest"}`;
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
      const userKey = `agri_users_rows_per_page_${currentUser?.id || "guest"}`;
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
      const userKey = `agri_users_rows_per_page_${currentUser?.id || "guest"}`;
      localStorage.setItem(userKey, String(rowsPerPage));
    } catch (e) {}
  }, [rowsPerPage, currentUser]);

  // Reset page when filters or searching change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  // Selected User for Editing
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRole, setEditRole] = useState<AccessRole>("STAFF");

  // Add User State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addTeudatZehut, setAddTeudatZehut] = useState("");
  const [addFirstName, setAddFirstName] = useState("");
  const [addLastName, setAddLastName] = useState("");
  const [addJobTitle, setAddJobTitle] = useState("מהנדס");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<AccessRole>("STAFF");
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // Localization Dictionary
  const t = {
    title: isRtl ? "ניהול משתמשים והרשאות אבטחה" : "Active Directory & Permission Control",
    sub: isRtl 
      ? "ממשק פנימי מורשה לניהול עובדים, מינוי מחסנאים, חוקרים וסמכויות מנהל."
      : "Secure administrative console to assign storekeeper/manager roles and manage personnel accounts.",
    searchPlaceholder: isRtl ? "חיפוש לפי שם, אימייל או תעודת זהות..." : "Search by name, email, or ID...",
    roleLabel: isRtl ? "תפקיד גישה / הרשאה" : "Access Permission Role",
    statusLabel: isRtl ? "סטטוס חשבון" : "Account Status",
    allRoles: isRtl ? "כל התפקידים" : "All Roles",
    allStatus: isRtl ? "כל הסטטוסים" : "All Status",
    activeOnly: isRtl ? "פעיל בלבד" : "Active Only",
    blockedOnly: isRtl ? "חסום / מושבת" : "Blocked Only",
    thName: isRtl ? "שם העובד ותעודת זהות" : "Employee Name & ID",
    thContact: isRtl ? "כתובת דוא\"ל וטלפון" : "Email & Phone",
    thRole: isRtl ? "דרג הרשאה" : "Authorization level",
    thStatus: isRtl ? "מצב במערכת" : "System Status",
    thActions: isRtl ? "פעולות מנהל" : "Admin Actions",
    btnSave: isRtl ? "שמור שינויים" : "Save Changes",
    btnCancel: isRtl ? "ביטול" : "Cancel",
    btnBlock: isRtl ? "חסום גישה" : "Block Access",
    btnActivate: isRtl ? "פתח גישה" : "Activate Access",
    btnNewUser: isRtl ? "רשום משתמש חדש מנהלתית" : "Register New Account",
    placeholderChoose: isRtl ? "בחר תפקיד..." : "Select role...",
    validationError: isRtl ? "נא למלא את כל שדות החובה בערכים תקינים" : "Please fill in all mandatory fields with valid inputs.",
    successAdded: isRtl ? "המשתמש נוסף בהצלחה למאגר!" : "User successfully registered!",
    cannotBlockSelf: isRtl ? "אינך יכול לחסום את חשבון האדמין של עצמך!" : "You cannot block your own admin account!",
    cannotDemoteSelf: isRtl ? "אינך יכול להסיר לעצמך את הרשאת האדמין!" : "You cannot demote your own admin status!",
    titleNewUserForm: isRtl ? "רישום עובד חדש לחשבון מאובטח" : "Direct Personnel Enrollment Form",
    tzLabel: isRtl ? "מספר תעודת זהות (9 ספרות)" : "Teudat Zehut Number (9 digits)"
  };

  const getRoleLabel = (role: AccessRole) => {
    switch (role) {
      case "ADMIN":
        return isRtl ? "מנהל מחסן מורשה (ADMIN)" : "Executive Administrator";
      case "MANAGER":
        return isRtl ? "מנהל קטלוג (MANAGER)" : "Inventory Catalog Manager";
      case "STOREKEEPER":
        return isRtl ? "מחסנאי (STOREKEEPER)" : "Warehouse Storekeeper";
      case "STAFF":
        return isRtl ? "חוקר / עובד משרה" : "Regular Research Employee";
      default:
        return role;
    }
  };

  const getRoleColor = (role: AccessRole) => {
    switch (role) {
      case "ADMIN":
        return "bg-slate-900 border-slate-700 text-slate-100";
      case "MANAGER":
        return "bg-blue-100 border-blue-200 text-blue-900";
      case "STOREKEEPER":
        return "bg-amber-100 border-amber-200 text-amber-900 font-bold";
      case "STAFF":
        return "bg-emerald-50 border-emerald-100 text-emerald-900";
    }
  };

  // Start Editing
  const startEdit = (user: AppUser) => {
    setEditingUserId(user.userId);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditJobTitle(user.jobTitle);
    setEditEmail(user.email);
    setEditPhone(user.phone);
    setEditRole(user.role);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
  };

  const saveEdit = (user: AppUser) => {
    if (!editFirstName.trim() || !editLastName.trim() || !editEmail.trim() || !editPhone.trim()) {
      alert(t.validationError);
      return;
    }

    if (user.userId === currentUser.userId && editRole !== "ADMIN") {
      alert(t.cannotDemoteSelf);
      return;
    }

    const updated: AppUser = {
      ...user,
      firstName: editFirstName,
      lastName: editLastName,
      jobTitle: editJobTitle,
      email: editEmail,
      phone: editPhone,
      role: editRole
    };

    onUpdateUser(updated);
    setEditingUserId(null);
  };

  const toggleUserActive = (user: AppUser) => {
    if (user.userId === currentUser.userId) {
      alert(t.cannotBlockSelf);
      return;
    }

    const updated: AppUser = {
      ...user,
      isActive: !user.isActive
    };

    onUpdateUser(updated);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);

    // Validate Teudat Zehut size
    if (!/^\d{9}$/.test(addTeudatZehut)) {
      setAddError(isRtl ? "תעודת זהות חייבת להכיל בדיוק 9 ספרות" : "Teudat Zehut must contain exactly 9 digits.");
      return;
    }

    if (!addFirstName.trim() || !addLastName.trim() || !addEmail.trim() || !addPhone.trim() || !addPassword.trim()) {
      setAddError(t.validationError);
      return;
    }

    // SHA-256 Hash of admin assigned password
    const msgBuffer = new TextEncoder().encode(addPassword);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    const newUserObj: AppUser = {
      userId: `usr-${Date.now()}`,
      teudatZehut: addTeudatZehut,
      firstName: addFirstName,
      lastName: addLastName,
      jobTitle: addJobTitle,
      email: addEmail,
      phone: addPhone,
      passwordHash: passHash,
      role: addRole,
      isActive: true,
      createdDate: new Date().toISOString(),
      lastLoginDate: ""
    };

    const resError = onAddUser(newUserObj);
    if (resError) {
      setAddError(resError);
    } else {
      setAddSuccess(t.successAdded);
      // Reset State
      setAddTeudatZehut("");
      setAddFirstName("");
      setAddLastName("");
      setAddPhone("");
      setAddEmail("");
      setAddPassword("");
      setAddJobTitle("מהנדס");
      setAddRole("STAFF");
      setTimeout(() => {
        setAddSuccess(null);
        setShowAddForm(false);
      }, 2000);
    }
  };

  // Filtered and sorted users computed
  const filteredUsers = users.filter((u) => {
    const searchString = `${u.firstName} ${u.lastName} ${u.email} ${u.teudatZehut} ${u.jobTitle}`.toLowerCase();
    const matchesSearch = searchString.includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus = 
      statusFilter === "ALL" || 
      (statusFilter === "ACTIVE" && u.isActive) || 
      (statusFilter === "BLOCKED" && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    const rolePriority: Record<string, number> = {
      ADMIN: 1,
      MANAGER: 2,
      STOREKEEPER: 3,
      STAFF: 4
    };
    const pA = rolePriority[a.role] || 5;
    const pB = rolePriority[b.role] || 5;
    return pA - pB;
  });

  // Paginate users listings
  const totalUsersCount = filteredUsers.length;
  const totalPages = Math.ceil(totalUsersCount / rowsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const indexOfLastUser = safeCurrentPage * rowsPerPage;
  const indexOfFirstUser = indexOfLastUser - rowsPerPage;
  const paginatedUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  const fromUser = totalUsersCount === 0 ? 0 : indexOfFirstUser + 1;
  const toUser = Math.min(indexOfLastUser, totalUsersCount);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="user-management-panel">
      {/* Upper header segment */}
      <div className="bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-base">
              👤
            </div>
            <h2 className="text-lg font-bold tracking-tight text-white">{t.title}</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">{t.sub}</p>
        </div>

        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setAddError(null);
            setAddSuccess(null);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 cursor-pointer transition shadow-sm select-none"
        >
          <UserPlus className="h-4 w-4" />
          <span>{showAddForm ? (isRtl ? "סגור חלונית רישום" : "Close Recruiter") : t.btnNewUser}</span>
        </button>
      </div>

      {/* Form to insert new employee */}
      {showAddForm && (
        <form onSubmit={handleCreateUserSubmit} className="p-6 bg-slate-50 border-b border-slate-200 animate-slide-down space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <UserCheck className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              {t.titleNewUserForm}
            </h3>
          </div>

          {addError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{addError}</span>
            </div>
          )}

          {addSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-650" />
              <span>{addSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t.tzLabel} *</label>
              <input
                type="text"
                required
                maxLength={9}
                value={addTeudatZehut}
                onChange={(e) => setAddTeudatZehut(e.target.value.replace(/\D/g, ""))}
                placeholder={isRtl ? "לדוגמה: 204325439" : "e.g., 204325439"}
                className="w-full border border-slate-300 rounded p-2 bg-white outline-none focus:border-blue-600 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isRtl ? "שם פרטי" : "First Name"} *</label>
              <input
                type="text"
                required
                value={addFirstName}
                onChange={(e) => setAddFirstName(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isRtl ? "שם משפחה" : "Last Name"} *</label>
              <input
                type="text"
                required
                value={addLastName}
                onChange={(e) => setAddLastName(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isRtl ? "הגדרת תפקיד ארגוני" : "Title / Department"} *</label>
              <select
                value={addJobTitle}
                onChange={(e) => setAddJobTitle(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white outline-none focus:border-blue-600 cursor-pointer text-slate-800 font-semibold"
              >
                <option value="טל&quot;ת">טל"ת (מנהלה)</option>
                <option value="תוכניות עבודה">תוכניות עבודה</option>
                <option value="מהנדס">מהנדס</option>
                <option value="טכנאי">טכנאי</option>
                <option value="חוקר">חוקר</option>
                <option value="עובד מחקר">עובד מחקר</option>
                <option value="מחסנאי">מחסנאי</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{isRtl ? "אימייל עובד" : "Staff Email"} *</label>
              <input
                type="email"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="eg. user@agri.gov.il"
                className="w-full border border-slate-300 rounded p-2 bg-white outline-none focus:border-blue-600 text-left font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isRtl ? "טלפון נייד" : "Phone Call Code"} *</label>
              <input
                type="text"
                required
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                placeholder="0500000000"
                className="w-full border border-slate-300 rounded p-2 bg-white outline-none focus:border-blue-600 text-left font-semibold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isRtl ? "סיסמת כניסה ראשונית" : "Temporary Passcode"} *</label>
              <input
                type="password"
                required
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="w-full border border-slate-300 rounded p-2 bg-white outline-none focus:border-blue-600 text-left"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{isRtl ? "דרג הרשאה במערכת המחסן" : "Assigned Warehouse Role"} *</label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value as AccessRole)}
                className="w-full border border-slate-300 rounded p-2 bg-white text-blue-900 font-extrabold outline-none focus:border-blue-600 cursor-pointer"
              >
                <option value="STAFF">{isRtl ? "STAFF - חוקר / עובד מנהלה" : "STAFF - Employee"}</option>
                <option value="STOREKEEPER">{isRtl ? "STOREKEEPER - מחסנאי פעיל" : "STOREKEEPER - Storekeeper"}</option>
                <option value="MANAGER">{isRtl ? "MANAGER - אחראי פריטים" : "MANAGER - Catalog Manager"}</option>
                <option value="ADMIN">{isRtl ? "ADMIN - מנהל על" : "ADMIN - Executive Admin"}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2 text-xs">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow cursor-pointer select-none"
            >
              {isRtl ? "בצע הקצאת הרשאות ושמירה" : "Commit Security Credentials"}
            </button>
          </div>
        </form>
      )}

      {/* Filter Options bar */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="w-full md:w-1/3 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full border border-slate-300 rounded-lg py-2 bg-white outline-none focus:border-blue-600 ${isRtl ? "pr-3 pl-9" : "pl-9 pr-3"}`}
            placeholder={t.searchPlaceholder}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-sans">
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-slate-500 font-medium">{t.roleLabel}:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded p-1.5 cursor-pointer"
            >
              <option value="ALL">{t.allRoles}</option>
              <option value="ADMIN">ADMIN</option>
              <option value="MANAGER">MANAGER</option>
              <option value="STOREKEEPER">STOREKEEPER</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-medium">{t.statusLabel}:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded p-1.5 cursor-pointer"
            >
              <option value="ALL">{t.allStatus}</option>
              <option value="ACTIVE">{t.activeOnly}</option>
              <option value="BLOCKED">{t.blockedOnly}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop View Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead className="bg-slate-100/70 text-slate-600 font-bold uppercase border-b border-slate-200">
            <tr>
              <th className={`p-4 ${isRtl ? "text-right" : "text-left"}`}>{t.thName}</th>
              <th className={`p-4 ${isRtl ? "text-right" : "text-left"}`}>{t.thContact}</th>
              <th className="p-4 text-center">{t.thRole}</th>
              <th className="p-4 text-center">{t.thStatus}</th>
              <th className="p-4 text-center">{t.thActions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 font-mono">
                  {isRtl ? "אין נתונים התואמים לחיפוש הנוכחי" : "No employee profiles found matching search criteria."}
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => {
                const isEditing = editingUserId === user.userId;
                const isSelf = user.userId === currentUser.userId;

                return (
                  <tr 
                    key={user.userId} 
                    className={`transition duration-150 ${
                      !user.isActive 
                        ? "bg-red-50/20 text-slate-400 italic hover:bg-red-105" 
                        : user.role === "ADMIN"
                        ? "bg-emerald-50/90 text-emerald-950 hover:bg-emerald-100/80 font-medium"
                        : "hover:bg-slate-50/55"
                    }`}
                  >
                    
                    {/* Name column */}
                    <td className={`p-4 ${isRtl ? "text-right" : "text-left"}`}>
                      {isEditing ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editFirstName}
                            onChange={(e) => setEditFirstName(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 max-w-[100px] bg-white font-bold"
                            placeholder="פרטי"
                          />
                          <input
                            type="text"
                            value={editLastName}
                            onChange={(e) => setEditLastName(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 max-w-[100px] bg-white font-bold"
                            placeholder="משפחה"
                          />
                          <input
                            type="text"
                            value={editJobTitle}
                            onChange={(e) => setEditJobTitle(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-1 max-w-[120px] bg-white text-slate-650"
                            placeholder="תפקיד"
                          />
                        </div>
                      ) : (
                        <div>
                          <div className="font-extrabold text-[#1F2937] text-[13px] flex items-center gap-1.5">
                            <span>{user.firstName} {user.lastName}</span>
                            {isSelf && (
                              <span className="bg-slate-200 text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full select-none">
                                {isRtl ? "אתה מחובר" : "You"}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {user.jobTitle} • {isRtl ? "ת\"ז:" : "ID:"} <span className="font-mono font-semibold">{user.teudatZehut}</span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Contact details */}
                    <td className={`p-4 ${isRtl ? "text-right" : "text-left"}`}>
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5">
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-0.5 bg-white font-semibold text-left"
                          />
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="border border-slate-300 rounded px-2 py-0.5 bg-white font-semibold text-left"
                          />
                        </div>
                      ) : (
                        <div className="space-y-0.5 select-all">
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                            <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* Assigned role */}
                    <td className="p-4 text-center">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as AccessRole)}
                          className="border border-slate-300 rounded p-1 text-slate-800 bg-white font-bold"
                        >
                          <option value="STAFF">STAFF</option>
                          <option value="STOREKEEPER">STOREKEEPER</option>
                          <option value="MANAGER">MANAGER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <span className={`inline-block px-2.5 py-1 rounded text-[10px] font-bold border ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                      )}
                    </td>

                    {/* Status Toggle */}
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        user.isActive 
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                          : "bg-rose-100 text-rose-800 border border-rose-200"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? "bg-emerald-600" : "bg-rose-600"}`} />
                        {user.isActive ? (isRtl ? "מאושר גישה" : "ACTIVE") : (isRtl ? "מושבת / חסום" : "BLOCKED")}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(user)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-1 rounded transition cursor-pointer"
                              title={t.btnSave}
                            >
                              <Check className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded transition text-[11px] cursor-pointer"
                              title={t.btnCancel}
                            >
                              {t.btnCancel}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(user)}
                              className="text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 p-1 rounded transition cursor-pointer"
                              title={isRtl ? "ערוך פרופיל" : "Edit user profile"}
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>

                            {!isSelf && (
                              <button
                                onClick={() => toggleUserActive(user)}
                                className={`p-1 rounded text-xs transition border cursor-pointer ${
                                  user.isActive 
                                    ? "text-rose-650 hover:bg-rose-50 border-transparent hover:border-rose-250" 
                                    : "text-emerald-750 hover:bg-emerald-50 border-transparent hover:border-emerald-250"
                                }`}
                                title={user.isActive ? t.btnBlock : t.btnActivate}
                              >
                                {user.isActive ? (
                                  <Lock className="h-4 w-4 text-rose-600" />
                                ) : (
                                  <Unlock className="h-4 w-4 text-emerald-650" />
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile view cards (No horizontal scroll) */}
      <div className="block md:hidden divide-y divide-slate-150">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-mono text-xs">
            {isRtl ? "אין נתונים התואמים לחיפוש הנוכחי" : "No employee profiles found matching search criteria."}
          </div>
        ) : (
          paginatedUsers.map((user) => {
            const isEditing = editingUserId === user.userId;
            const isSelf = user.userId === currentUser.userId;

            return (
              <div 
                key={user.userId} 
                className={`p-4 transition duration-155 space-y-3 ${
                  !user.isActive 
                    ? "bg-red-50/20 text-slate-400 italic" 
                    : user.role === "ADMIN"
                    ? "bg-emerald-50/90 text-emerald-950 font-medium"
                    : "hover:bg-slate-50/55 bg-white text-slate-900"
                }`}
              >
                {/* Mobile view row content */}
                {isEditing ? (
                  <div className="space-y-3 text-xs text-slate-900">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{isRtl ? "שם פרטי" : "First Name"}</label>
                        <input
                          type="text"
                          value={editFirstName}
                          onChange={(e) => setEditFirstName(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{isRtl ? "שם משפחה" : "Last Name"}</label>
                        <input
                          type="text"
                          value={editLastName}
                          onChange={(e) => setEditLastName(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 bg-white font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{isRtl ? "תפקיד ארגוני" : "Job Title"}</label>
                      <input
                        type="text"
                        value={editJobTitle}
                        onChange={(e) => setEditJobTitle(e.target.value)}
                        className="w-full border border-slate-300 rounded px-2 py-1 bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{isRtl ? "אימייל" : "Email"}</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-left font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{isRtl ? "טלפון" : "Phone"}</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full border border-slate-300 rounded px-2 py-1 bg-white text-left font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{isRtl ? "הרשאה במערכת" : "System Authorization"}</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as AccessRole)}
                        className="w-full border border-slate-300 rounded p-1 text-slate-800 bg-white font-bold bg-white"
                      >
                        <option value="STAFF">STAFF</option>
                        <option value="STOREKEEPER">STOREKEEPER</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>

                    {/* Editing Save/Cancel button bar */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => saveEdit(user)}
                        className="grow bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded transition flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                      >
                        <Check className="h-4 w-4" />
                        <span>{t.btnSave}</span>
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="grow bg-slate-150 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded transition text-xs cursor-pointer"
                      >
                        {t.btnCancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-slate-900">
                    {/* Top Row: Avatar icon equivalent + Title + You badge */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-extrabold text-[#1F2937] text-sm flex flex-wrap items-center gap-1.5">
                          <span>{user.firstName} {user.lastName}</span>
                          {isSelf && (
                            <span className="bg-slate-200 text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full select-none">
                              {isRtl ? "אתה מחובר" : "You"}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {user.jobTitle} • {isRtl ? "ת\"ז:" : "ID:"} <span className="font-mono font-semibold">{user.teudatZehut}</span>
                        </div>
                      </div>
                      
                      {/* Badges container */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border ${getRoleColor(user.role)}`}>
                          {getRoleLabel(user.role)}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          user.isActive 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}>
                          <span className={`h-1 w-1 rounded-full ${user.isActive ? "bg-emerald-600" : "bg-rose-600"}`} />
                          {user.isActive ? (isRtl ? "מאושר גישה" : "ACTIVE") : (isRtl ? "חסום" : "BLOCKED")}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Contact detail cards */}
                    <div className="bg-slate-50/80 rounded-lg p-2 space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 select-all">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{user.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono select-all">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    </div>

                    {/* Bottom Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        onClick={() => startEdit(user)}
                        className="flex items-center gap-1 text-blue-600 hover:bg-blue-55 border border-blue-200/50 hover:border-blue-200 px-3 py-1.5 rounded transition text-xs cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>{isRtl ? "ערוך" : "Edit"}</span>
                      </button>

                      {!isSelf && (
                        <button
                          onClick={() => toggleUserActive(user)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs transition border cursor-pointer ${
                            user.isActive 
                              ? "text-rose-650 hover:bg-rose-50 border-rose-200/50 hover:border-rose-250" 
                              : "text-emerald-750 hover:bg-emerald-50 border-emerald-200/50 hover:border-emerald-250"
                          }`}
                        >
                          {user.isActive ? (
                            <>
                              <Lock className="h-3.5 w-3.5 text-rose-600" />
                              <span>{t.btnBlock}</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="h-3.5 w-3.5 text-emerald-650" />
                              <span>{t.btnActivate}</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Pagination Controls */}
      <div 
        className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-700 select-none font-sans"
        style={{ direction: isRtl ? "rtl" : "ltr" }}
      >
        {/* Rows Per Page Selector */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-500">
            {isRtl ? "שורות לעמוד:" : "Rows per page:"}
          </span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-white border border-gray-300 rounded px-2.5 py-1 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer text-gray-800 shadow-sm font-sans"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Statistics Range Details */}
        <div className="font-semibold text-slate-600">
          {isRtl ? (
            <span>
              מציג <span className="font-mono text-blue-700 font-bold">{fromUser}-{toUser}</span> מתוך{" "}
              <span className="font-mono text-gray-950 font-bold">{totalUsersCount}</span> רשומות
            </span>
          ) : (
            <span>
              Showing <span className="font-mono text-blue-700 font-bold">{fromUser}-{toUser}</span> of{" "}
              <span className="font-mono text-gray-955 font-bold">{totalUsersCount}</span> records
            </span>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1.5">
          {/* First Page */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
            title={isRtl ? "לעמוד הראשון" : "First Page"}
          >
            {isRtl ? <ChevronsRight className="h-3.5 w-3.5" /> : <ChevronsLeft className="h-3.5 w-3.5" />}
          </button>
          
          {/* Prev Page */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={safeCurrentPage === 1}
            className="p-1.5 rounded border border-gray-300 bg-white hover:bg-gray-50 text-slate-600 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-sm"
            title={isRtl ? "לעמוד הקודם" : "Previous Page"}
          >
            {isRtl ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>

          {/* Number badges */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((page) => {
                return page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1;
              })
              .map((page, idx, arr) => {
                const elements = [];
                if (idx > 0 && page - arr[idx - 1] > 1) {
                  elements.push(
                    <span key={`ellipse-users-${page}`} className="px-1 text-gray-400 font-bold select-none cursor-default">
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
                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                        : "bg-white border-gray-300 hover:bg-gray-50 text-slate-750 hover:text-slate-955"
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

      {/* Footer statistics metadata block */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 text-[10px] font-mono text-slate-500 flex justify-between select-none">
        <span>TOTAL_ACCOUNTS: {users.length}</span>
        <span>ACTIVE_STAFF: {users.filter(u => u.isActive).length} | ADMINS: {users.filter(u => u.role === "ADMIN").length}</span>
      </div>
    </div>
  );
};
