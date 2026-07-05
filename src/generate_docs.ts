import fs from "fs";
import path from "path";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from "docx";
import PDFDocument from "pdfkit";

// Ensure documentation folder exists
const docsDir = path.join(process.cwd(), "documentation");
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

// ====================================================================================
// DOCUMENTATION CONTENT DATA
// ====================================================================================

const docTitle = "Volcani Center Warehouse Request & Inventory System";
const docSub = "Enterprise Dual-Stack Technical Overview, End-User Manual & Administration Guide";

const sections = [
  {
    chapter: "1",
    title: "Project Overview",
    content: `### 1.1 Purpose of the Application
The Volcani Center Warehouse Request & Inventory System (מערכת מאפייני פריטים ומלאי) is a robust, production-ready full-stack enterprise application designed to streamline agricultural research logistics, warehouse inventory control, item classification, and physical checkout request fulfillment (Nipuk - ניפוק).

Originally architected as an ASP.NET Web Forms application using MS SQL Server 2012+, the system has been migrated to a modern, highly responsive React 19 single-page application (SPA) frontend, backed by an Express 4 REST and proxy server, and connected to Supabase PostgreSQL for cloud storage. It retains backward compatibility with legacy relational designs, featuring dual-schema representations for both Microsoft SQL Server and PostgreSQL.

### 1.2 Main Business Processes
1. **Catalog Auditing & Maintenance**: Real-time item tracking (Makat - מק'ט), stock control, price valuations, and shelf locations.
2. **Dynamic Attribute Parameterization**: Association of complex, variable item attributes (such as Size, Color, Version, Model) to specific warehouse goods without requiring schema alterations.
3. **Checkout Request Submission**: Dynamic request forms (טופס הגשת בקשה) enabling researchers and field operators to select catalog items, identify custom attributes, check real-time stock levels, and submit requisitions.
4. **Approval & Dispatch Flow (Nipuk - ניפוק)**: High-security workflow for storekeepers and warehouse operators to transition items from active requests to physically dispatched delivery notes.
5. **Bank of Israel Exchange Integration**: Automated synchronization of daily foreign exchange rates, allowing researchers and finance clerks to review valuations in multiple currencies (USD, EUR, GBP, CAD, JPY, ILS) with daily trends.

### 1.3 Target Users & Personas
- **ADMIN**: High-level system administrators with full write access, responsible for user management, role mapping, data exporters, database auditing, and catalog synchronization.
- **MANAGER**: Logistical managers who maintain item categories, edit master attribute rules, white-list attribute values per SKU, and approve pending warehouse requests.
- **STOREKEEPER**: Physical warehouse floor workers who operate the "Dispatch / Nipuk" screen, verify active stock lines, pack shipments, log physical signatures, and generate dispatch notes.
- **STAFF**: Researchers and laboratory technicians who browse the inventory catalog and submit requests for research supplies.

### 1.4 Technology Stack
- **Legacy Stack**: ASP.NET Web Forms, .NET Framework 4.8, C# BLL & DAL layers, Npgsql .NET driver, MS SQL Server 2012+, IIS Express, and Web.config.
- **Modernized Stack**: React 19 SPA, TypeScript 5.8, Vite 6 build engine, Tailwind CSS 4 utility classes, Lucide icons, Motion (Framer Motion) animations.
- **Backend Stack**: Express 4 proxy server running on Node.js / Cloud Run, '@google/genai' TypeScript API client, and Supabase JS Client for database integration.
- **Database Layer**: Supabase PostgreSQL 14+, Row-Level Security (RLS) policies, transactional stored procedures, and daily financial trend caching tables.`
  },
  {
    chapter: "2",
    title: "Application Architecture",
    content: `### 2.1 Multi-Layered Architecture
The modernized system implements a full-stack, decoupled architecture that provides resilience, near-instant query responses, and direct real-time database transactions.

1. **Presentation Layer (React 19)**:
   - Built on a Component-Driven design using TypeScript.
   - Modular layout managed by 'EnterpriseLayout.tsx'.
   - Rich UX elements with custom tabs, search indexing, image galleries, and RTL Hebrew translation layers.
   - Responsive design powered by Tailwind CSS 4, adjusting seamlessly between touch screens (tablets) and high-density desk monitors.

2. **Backend Proxy Layer (Express 4)**:
   - Handles API routes to shield the database and third-party secrets (such as the Gemini API Key or Supabase Admin keys) from browser inspection.
   - Serves as the static asset provider in production, executing compiled React bundles directly inside containers on port 3000.
   - Hosts the Bank of Israel (BOI) Proxy router, fetching daily XML exchange data, converting it to JSON, and storing it locally to reduce external network calls.

3. **Data Access & Service Layer (dbService.ts & supabase.ts)**:
   - A unified database access abstraction layer.
   - Implements automated Snake_Case to CamelCase property mappings.
   - Coordinates live queries directly with Supabase. Because all operational data transactions must run online, the system enforces online-only checks, utilizing client-side state memory solely as a defensive wrapper to prevent UI crashes if connection is momentarily interrupted.

4. **Persistence Layer (Supabase / PostgreSQL & SQL Server 2012+)**:
   - Primary cloud storage utilizing Supabase PostgreSQL, ensuring transactional guarantees.
   - Fully optimized indices for fast lookups on SKU, active statuses, and audit logging.
   - Stored procedures and triggers mimicking legacy MS SQL Server procedures ('sp_GetItemAttributesForSelection', 'sp_SaveItemAttributeConfig', etc.) to enforce business logic on the database engine level.

### 2.2 Dual-Language Architecture (HE/EN)
A central globalization system ('globalization' in Web.config and React contexts) dynamically flips text directions (LTR / RTL), language keys, labels, and placeholders. Database tables are optimized with separate language columns (e.g., 'NameHe' and 'NameEn', 'ValueNameHe' and 'ValueNameEn') ensuring clean, searchable local and international product registries.`
  },
  {
    chapter: "3",
    title: "Database Documentation",
    content: `The system's structural integrity is maintained via a highly relational schema. Below is the full description of all 8 database tables.

### 3.1 Relational Schema Matrix

#### 1. AttributeTypes (סוגי מאפיינים)
- **Purpose**: Defines master categories of physical modifiers (e.g., Size [מידה], Color [צבע]).
- **Primary Key**: 'AttributeTypeId' (Identity, INT)
- **Unique Constraints**: 'TypeNameEn', 'TypeNameHe' (No duplicate master categories allowed)
- **Indices**: 'IX_AttributeTypes_Active_Deleted' (covering IsActive, IsDeleted)
- **Important Columns**:
  - 'IsActive' (BOOLEAN, default: TRUE): Controls whether this category can be matched to new items.
  - 'IsDeleted' (BOOLEAN, default: FALSE): Supports soft-deletes to protect transactional history.

#### 2. AttributeValues (ערכי מאפיינים)
- **Purpose**: Defines whitelisted choices under each master category (e.g., S, M, L, XL for Size).
- **Primary Key**: 'AttributeValueId' (Identity, INT)
- **Foreign Key**: 'AttributeTypeId' -> 'AttributeTypes(AttributeTypeId)' (Cascades ON DELETE)
- **Unique Constraints**: 'UQ_AttributeValue_Type_Name' ('AttributeTypeId' + 'ValueNameHe')
- **Indices**: 'IX_AttributeValues_TypeId_Active'

#### 3. WarehouseItems (קטלוג פריטים)
- **Purpose**: The core agricultural inventory ledger.
- **Primary Key**: 'SKU' (VARCHAR(50), matches physical product codes / Makat).
- **Important Columns**:
  - 'NameHe' / 'NameEn' (VARCHAR(200)): Dual-language names.
  - 'Stock' (INT, default: 0): Real physical quantity available.
  - 'Price' (DECIMAL(18,2)): Valuations in NIS.
  - 'Shelf' (VARCHAR(50)): Warehouse storage location.
  - 'CategoryHe' / 'CategoryEn': Product categories.

#### 4. ItemPictureUrls (תמונות וגלריה לפריטים)
- **Purpose**: Tracks visual attachments for catalog products.
- **Primary Key**: 'PictureId' (VARCHAR(100))
- **Foreign Key**: 'SKU' -> 'WarehouseItems(SKU)' (Cascades ON DELETE)
- **Important Columns**:
  - 'ImageUrl' (TEXT): Public asset address.
  - 'IsPrimary' (BOOLEAN): Denotes main catalog display picture.

#### 5. ItemAttributeMapping (שיוך מאפיינים למק\"ט)
- **Purpose**: Links physical modifiers requirements to a specific SKU.
- **Primary Key**: Composite: '[SKU, AttributeTypeId]'
- **Foreign Keys**:
  - 'SKU' -> 'WarehouseItems(SKU)' (Cascades ON DELETE)
  - 'AttributeTypeId' -> 'AttributeTypes(AttributeTypeId)'
- **Important Columns**:
  - 'IsMandatory' (BOOLEAN, default: FALSE): Enforces selections on request forms.

#### 6. ItemAttributeAllowedValues (ערכים מורשים לפריט)
- **Purpose**: Restricts the global attribute value list to a subset allowed for a particular SKU.
- **Primary Key**: Composite: '[SKU, AttributeTypeId, AttributeValueId]'
- **Foreign Keys**:
  - '[SKU, AttributeTypeId]' -> 'ItemAttributeMapping(SKU, AttributeTypeId)' (Cascades ON DELETE)
  - 'AttributeValueId' -> 'AttributeValues(AttributeValueId)'

#### 7. WarehouseRequests (הזמנות ובקשות)
- **Purpose**: Requisitions submitted by researchers and staff.
- **Primary Key**: Composite: '[RequestId, SKU]' (supports multiple items in a single request transaction)
- **Foreign Keys**:
  - 'SKU' -> 'WarehouseItems(SKU)'
  - 'AttributeTypeId' -> 'AttributeTypes(AttributeTypeId)'
  - 'AttributeValueId' -> 'AttributeValues(AttributeValueId)'
- **Important Columns**:
  - 'QuantityRequested' (INT): Selected checkout amount.
  - 'StatusHe' / 'StatusEn': Status codes (e.g., "PENDING" / "APPROVED" / "DISPATCHED").

#### 8. NipukRecords (יומן ניפוקים פיזי)
- **Purpose**: Physical dispatch audits matching packed shipments.
- **Primary Key**: 'NipukId' (VARCHAR(50))
- **Important Columns**:
  - 'WorkerId' / 'WorkerName': Identity of the storekeeper.
  - 'CustomerName' / 'CustomerId': Identity of the receiving researcher.
  - 'Quantity' (INT): Actual physical volume handed over.
  - 'DispatchDate' / 'DispatchTime': Actual checkout timestamps.

#### 9. FinancialRateCache (מטמון שערי מטבע)
- **Purpose**: Stores daily currency listings to optimize computation times.
- **Primary Key**: 'CacheId' (Identity, INT)
- **Unique Constraint**: 'RateDate' + 'CurrencyCode'
- **Important Columns**:
  - 'ExchangeRate' (DECIMAL(18,6)): Rate compared to ILS.
  - 'TrendPercent' (DECIMAL(12,4)): Daily shift direction.

#### 10. AuditLog (יומן אבטחה וביקורת)
- **Purpose**: Immutable security registry tracking critical data modifications.
- **Primary Key**: 'AuditLogId' (Identity, BIGINT)
- **Important Columns**:
  - 'UserId' (VARCHAR(100)): Workstation or user identity.
  - 'ActionType' (VARCHAR(50)): CREATE, UPDATE, DELETE, ASSIGN.
  - 'OldValue' / 'NewValue' (TEXT/JSON): Serialized field representations for compliance.

### 3.2 Data Connection
The application uses **Supabase** as its primary cloud database and backend service. All application data is stored, authenticated, and managed securely through the Supabase cloud layer.

#### Online Database Access
Every database operation is performed strictly **online**. The application does **not** support a local database, offline cache as the primary data source, or embedded storage for business records. 

All core operations, including but not limited to:
- Reading inventory and catalog listings
- Creating new checkout requests
- Updating request statuses and physical stocks
- Deleting or soft-deleting database records
- Real-time authentication and user profile registrations

are executed through live, direct requests to the Supabase backend.

This design ensures that:
1. **Centralized Source of Truth**: There is **no local database** used as the authoritative source of truth. Every user workstation operates directly with the cloud database.
2. **Real-time Synchronization**: All active users across multiple workstations always access and work with the same synchronized, real-time cloud data, preventing inventory discrepancies.
3. **Integrated Security**: User identities, credentials, and access control rights are directly managed and enforced on Supabase.
4. **Resiliency**: The system requires a live connection to execute any operations.

#### Architecture Summary Table
- **Database Provider**: Supabase
- **Connection Type**: Online (Cloud)
- **Data Source**: Live Supabase Database
- **Database Operations**: 100% Online (CRUD & Auth)
- **Local Database**: Not Used (None)
- **Offline Mode**: Not Supported (Real-time connection is mandatory for production use)`
  },
  {
    chapter: "4",
    title: "Solution & Code Structure",
    content: `### 4.1 Solution Layout Overview
The repository maintains a clean, modular structure. Below are the core folder and file responsibilities:

- **Root Directory ('/')**:
  - 'Web.config': Core configurations for IIS, connection strings, FormAuthentication, and .NET runtime controls.
  - 'server.ts': Express 4 startup service, mounting API routers, XML currency proxy, and Vite production static routes.
  - 'vite.config.ts': Bundler configurations compiling SPA React outputs.
  - 'package.json': Operational scripts, dependencies (React 19, Express 4, Supabase-JS, Docx, PDFKit, Tailwind CSS), and compiler configurations.
  - 'Schema_and_Procedures.sql': Legacy SQL Server definitions.
  - 'Supabase_Schema_and_Procedures.sql': Supabase PostgreSQL definitions.

- **Source Code Directory ('/src')**:
  - 'App.tsx': Unified application shell containing global state controllers, authentication check-outs, responsive tab engines, and event synchronizers.
  - 'types.ts': Strict TypeScript typings for all core entities (WarehouseItem, AppUser, AttributeType, NipukRecord, etc.).
  - 'main.tsx': High-level entry point mounting React 19 to the index.html viewport.
  - 'index.css': Central CSS layout importing Tailwind CSS 4 utilities and loading external custom fonts (Inter, Space Grotesk, and JetBrains Mono).

- **Components Directory ('/src/components')**:
  - 'EnterpriseLayout.tsx': Primary structural frame. Computes active menus, handles header notifications, displays current language toggles, and tracks connection statuses.
  - 'RequestForm.tsx': Responsive checkout sheet with intelligent attribute bindings and live validations.
  - 'AttributesManagement.tsx': Administrative master controls to create/delete attribute types and values.
  - 'ItemMappingForm.tsx': Grid interface linking physical attribute categories and white-listed values to specific item SKUs.
  - 'CatalogManagementForm.tsx': Grid and card explorer for catalog items. Includes image galleries, filters, and inventory modifications.
  - 'DispatchManagement.tsx': Workspace for storekeepers to inspect requests, change status, and dispatch items (Nipuk).
  - 'DispatchManagement.tsx' (cont.): Generates instant delivery handovers.
  - 'UserManagement.tsx': Control dashboard to authorize users, edit contact info, and toggle active states.
  - 'AdminDataExporter.tsx': Grid view allowing full auditing of security logs, exports to CSV, and database inspections.
  - 'CSVImportManager.tsx': CSV file parsing engine allowing rapid spreadsheet uploads into the warehouse.
  - 'FinancialDataViewer.tsx': Foreign exchange trends dashboard, fetching Bank of Israel data and rendering responsive analytical reports.
  - 'AuthScreen.tsx': Secure authorization card supporting login with Teudat Zehut credentials and new registration controls.
  - 'ArchitectHub.tsx': Technical database specifications, visual ERD trees, and legacy .NET code archives.

- **Services Directory ('/src/services')**:
  - 'dbService.ts': Direct mapper and sync manager for Supabase database tables.`
  },
  {
    chapter: "5",
    title: "Business Logic & Request Lifecycle",
    content: `The system guarantees logistical consistency by enforcing strict business flows across multiple logical operations.

### 5.1 Requisition Submission Lifecycle
1. **Selection**: A Staff member navigates to the Request Sheet and selects an item. The system queries 'ItemAttributeMapping' and 'ItemAttributeAllowedValues' to identify if there are any mandatory modifiers.
2. **Dynamic Validation**: If an attribute is marked as mandatory (IsMandatory = 1), the "Add Request" action remains locked until the user chooses a valid option from the dynamically-loaded whitelisted values.
3. **Submission**: Upon submission, a request is recorded in 'WarehouseRequests' with a unique ID format (e.g. 'WR-2026-XXXX') and its state is initialized to "Pending Approval" (ממתין לאישור).
4. **Audit Registration**: An atomic action logs the creation event in the 'AuditLog' table, recording the author's ID, the affected item, and the timestamp.

### 5.2 Approval & Physical Dispatch (Nipuk - ניפוק)
1. **Verification**: Storekeepers and Managers monitor the Dispatch Workspace. They review pending requests, check current inventory levels, and match item SKU shelves.
2. **State Transition**: The Storekeeper can change the request status to "Approved" (אושר) or "Rejected" (נדחה).
3. **Dispatch Operation (Nipuk)**: To complete a dispatch, the Storekeeper inputs the actual dispatched quantity, logs notes/remarks, and specifies the receiver's name, ID (Teudat Zehut), and contact number.
4. **Stock Mutation**: Executing the dispatch triggers a subtraction from the item's physical inventory stock in the 'WarehouseItems' table.
5. **Nipuk Log Archive**: A physical shipping log is generated in the 'NipukRecords' table, capturing the dispatcher's credentials and the receiver's details.

### 5.3 Currency Exchange Integration
1. **Fetch Flow**: The application queries the daily XML feed from the Bank of Israel (https://www.boi.org.il/en/financial-markets/foreign-exchange-rates/).
2. **Cache Verification**: To bypass network latency, the system first checks the local 'FinancialRateCache'. If a rate exists for the current date, it serves it directly.
3. **Conversion Engine**: Inventory prices (stored in ILS) can be converted into USD, EUR, GBP, CAD, JPY, or RUB based on the cached rates, providing real-time financial reporting for researchers and administrators.`
  },
  {
    chapter: "6",
    title: "Authentication & Security",
    content: `### 6.1 Authentication Mechanism
The system utilizes a secure, dual-layer authorization model.
- **Legacy Stack**: FormAuthentication is configured in 'Web.config' under the '<authentication mode="Forms">' tag, pointing to a secure 'Login.aspx' page. Relational roles are managed via 'SqlRoleProvider'.
- **Modernized Stack**: Client-side authentication is enforced in the React shell. Users authenticate using their Teudat Zehut (Israeli ID number, exactly 9 digits) as their username and a hashed password.

### 6.2 Roles and Authorization Matrix
The system supports four distinct roles:
1. **ADMIN**: Full access to all components, including User Management, Database Audit Logs, Data Exporters, and CSV Imports.
2. **MANAGER**: Can manage master attribute mappings, catalog entries, CSV imports, and dispatch request sheets.
3. **STOREKEEPER**: Specifically authorized to browse catalog items, update shelf locations, process pending requests, and log physical dispatches (Nipuk).
4. **STAFF**: Restricted role for agricultural researchers. They can browse items and submit requests, but are blocked from administrative tabs (such as mapping, user management, and audit logs).

### 6.3 Security Defenses
- **SQL Injection Prevention**: All direct SQL queries utilize parameterized parameters. No dynamic string concatenation is allowed for queries.
- **Row-Level Security (RLS)**: PostgreSQL tables in Supabase have RLS policies configured, ensuring that staff users can only view or write their own requests.
- **XSS Protection**: All user-input content rendered in the React interface is automatically sanitized by React's native string rendering, which escapes HTML tags.
- **Audit Auditing**: Every write action (Create, Update, Delete, Assign) generates an immutable log in the 'AuditLog' table, documenting the old value, new value, and operator details.`
  },
  {
    chapter: "7",
    title: "User Manual - End User Guide",
    content: `### 7.1 How to Log In
1. Open the application. You will be greeted by the secure **Auth Screen (כניסת משתמשים)**.
2. Enter your **Teudat Zehut (תעודת זהות)** (must be exactly 9 digits).
3. Enter your secure password.
4. Click **Sign In (התחבר)**.
5. If you do not have an account, click **Register (הרשמה)** to create one, which will be pending administrator activation.

### 7.2 Creating a Warehouse Request
1. Click on the **Request Sheet (טופס הגשת בקשה)** tab in the main navigation menu.
2. Search or select your required item from the catalog dropdown.
3. Observe the item's current stock and unit price.
4. If the item has mandatory attributes (e.g. Size or Color), the system will display a dropdown of whitelisted choices. Choose your preferred value.
5. Enter the desired **Quantity (כמות מבוקשת)**. The system will prevent you from requesting a quantity that exceeds the active stock.
6. Click **Add Item to Sheet (הוסף לפריטים)**.
7. Click **Submit Requisition (שלח בקשה למלאי)** to submit the request.

### 7.3 Searching the Catalog
1. Click on the **Catalog (קטלוג פריטים)** tab.
2. Use the search bar to filter items by SKU or Name.
3. Click on any item to view its detailed specifications, including its shelf location, price, and category.
4. If multiple images are available, you can cycle through them using the product carousel.`
  },
  {
    chapter: "8",
    title: "User Manual - Administrator Guide",
    content: `### 8.1 User Administration
1. Log in as an **ADMIN**.
2. Navigate to the **User Management (ניהול משתמשים)** tab.
3. You will see a complete grid of all system users.
4. To activate or deactivate a user, click the **Toggle Active (פעיל/לא פעיל)** button.
5. To change a user's role (ADMIN, MANAGER, STOREKEEPER, STAFF), select the role from the dropdown menu and click save.
6. To add a new user manually, click **Create User** and fill in the required fields.

### 8.2 Audit Logs & Data Export
1. Log in as an **ADMIN**.
2. Navigate to the **Export Data (ייצוא נתונים)** tab.
3. Under the **Audit Logs (יומן מעקב)** section, you can view a detailed audit trail of all database mutations.
4. Filter logs by Date, Action Type (CREATE, UPDATE, DELETE), or User.
5. Click **Export to CSV** or **Export to JSON** to download a local copy of the logs or database tables.

### 8.3 CSV and Catalog Synchronization
1. Navigate to the **CSV Import (ייבוא נתונים)** tab.
2. Select your catalog CSV spreadsheet. The file must match the required template column structure (SKU, NameHe, NameEn, Stock, Price, Shelf).
3. Click **Upload and Validate**.
4. Review any potential validation warnings (e.g., duplicate SKUs or missing prices).
5. Click **Commit to Cloud** to synchronize the items with the Supabase database.`
  },
  {
    chapter: "9",
    title: "Troubleshooting & Support",
    content: `### 9.1 Common Error Messages
- **"Database Connection Failed"**: This occurs when the application cannot reach the Supabase cloud cluster. Because all database operations are performed 100% online, verify your internet connection. No local database or offline cache is used as a source of truth for business data, so a live connection is required for all read, write, and authentication flows.
- **"Quantity requested exceeds stock limit"**: You have entered a checkout amount larger than the item's current stock level. Lower your quantity.
- **"Israeli ID must be exactly 9 digits"**: The Teudat Zehut format is invalid. Double-check your entered credentials.

### 9.2 Support and Escalation
For logistical system support, contact Svetlana Chernytsky at svetlanac@volcani.gov.il or submit a support ticket via the local agricultural ARO IT portal.`
  }
];

// ====================================================================================
// FORMAT 1: GENERATE MARKDOWN DOCUMENTATION (.md)
// ====================================================================================
function generateMarkdown() {
  let md = `# ${docTitle}\n## ${docSub}\n\n`;
  md += `*Generated: ${new Date().toLocaleDateString()}*\n\n`;
  md += `## Table of Contents\n`;
  sections.forEach((sec) => {
    md += `${sec.chapter}. [Chapter ${sec.chapter}: ${sec.title}](#chapter-${sec.chapter})\n`;
  });
  md += `\n---\n\n`;

  sections.forEach((sec) => {
    md += `<a name="chapter-${sec.chapter}"></a>\n`;
    md += `# Chapter ${sec.chapter}: ${sec.title}\n\n`;
    md += `${sec.content}\n\n---\n\n`;
  });

  const filePath = path.join(docsDir, "Project_Documentation.md");
  fs.writeFileSync(filePath, md, "utf8");
  console.log(`✅ Generated Markdown: ${filePath}`);
}

// ====================================================================================
// FORMAT 2: GENERATE HTML DOCUMENTATION (.html)
// ====================================================================================
function generateHTML() {
  let html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>${docTitle}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f7f9fa;
    }
    .container {
      max-width: 900px;
      margin: 40px auto;
      padding: 40px;
      background-color: #ffffff;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      border-radius: 8px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
      font-size: 2.2em;
      margin-top: 0;
    }
    h2 {
      color: #7f8c8d;
      font-size: 1.3em;
      margin-bottom: 30px;
    }
    h3 {
      color: #2980b9;
      margin-top: 30px;
      border-bottom: 1px solid #eee;
      padding-bottom: 5px;
    }
    h4 {
      color: #16a085;
      margin-top: 20px;
    }
    p, li {
      font-size: 1em;
      color: #555;
    }
    code {
      background-color: #f8f9fa;
      padding: 2px 5px;
      border-radius: 4px;
      font-family: monospace;
      color: #c7254e;
    }
    .toc {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 6px;
      margin-bottom: 40px;
      border: 1px solid #eef2f5;
    }
    .toc ul {
      list-style-type: none;
      padding-left: 0;
    }
    .toc li {
      margin-bottom: 8px;
    }
    .toc a {
      text-decoration: none;
      color: #2980b9;
      font-weight: bold;
    }
    .toc a:hover {
      text-decoration: underline;
    }
    hr {
      border: 0;
      height: 1px;
      background: #eee;
      margin: 40px 0;
    }
    .footer {
      text-align: center;
      font-size: 0.85em;
      color: #aaa;
      margin-top: 60px;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${docTitle}</h1>
    <h2>${docSub}</h2>
    <p><strong>תאריך הפקה:</strong> ${new Date().toLocaleDateString()}</p>
    
    <div class="toc">
      <h3>תוכן עניינים (Table of Contents)</h3>
      <ul>`;

  sections.forEach((sec) => {
    html += `        <li><a href="#sec-${sec.chapter}">פרק ${sec.chapter}: ${sec.title}</a></li>\n`;
  });

  html += `      </ul>
    </div>
    <hr>`;

  sections.forEach((sec) => {
    // Basic Markdown to HTML converter logic for simple paragraphs and headers
    let renderedContent = sec.content
      .replace(/### (.*)/g, "<h4>$1</h4>")
      .replace(/#### (.*)/g, "<h5>$1</h5>")
      .replace(/1\. \*\*(.*?)\*\*:(.*)/g, "<li><strong>$1</strong>: $2</li>")
      .replace(/2\. \*\*(.*?)\*\*:(.*)/g, "<li><strong>$1</strong>: $2</li>")
      .replace(/3\. \*\*(.*?)\*\*:(.*)/g, "<li><strong>$1</strong>: $2</li>")
      .replace(/4\. \*\*(.*?)\*\*:(.*)/g, "<li><strong>$1</strong>: $2</li>")
      .replace(/5\. \*\*(.*?)\*\*:(.*)/g, "<li><strong>$1</strong>: $2</li>")
      .replace(/\- \*\*(.*?)\*\*:(.*)/g, "<li><strong>$1</strong>: $2</li>");

    // wrap list elements
    renderedContent = renderedContent.replace(/<li>(.*?)<\/li>/g, "<ul><li>$1</li></ul>");

    html += `
    <div id="sec-${sec.chapter}">
      <h3>פרק ${sec.chapter}: ${sec.title}</h3>
      <div>${renderedContent.split("\n").map(p => p.trim() ? `<p>${p}</p>` : "").join("")}</div>
    </div>
    <hr>`;
  });

  html += `
    <div class="footer">
      <p>© ${new Date().getFullYear()} Volcani Center Agricultural Research Organization (ARO). כל הזכויות שמורות.</p>
    </div>
  </div>
</body>
</html>`;

  const filePath = path.join(docsDir, "Project_Documentation.html");
  fs.writeFileSync(filePath, html, "utf8");
  console.log(`✅ Generated HTML: ${filePath}`);
}

// ====================================================================================
// FORMAT 3: GENERATE MICROSOFT WORD DOCUMENT (.docx)
// ====================================================================================
async function generateDocx() {
  const docChildren: any[] = [];

  // Title Slide
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: docTitle,
          bold: true,
          size: 36,
          color: "2c3e50"
        })
      ],
      spacing: { after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: docSub,
          italics: true,
          size: 24,
          color: "7f8c8d"
        })
      ],
      spacing: { after: 600 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Enterprise Architecture Report & User Manual\nGenerated on: ${new Date().toLocaleDateString()}`,
          size: 18,
          color: "34495e"
        })
      ],
      spacing: { after: 1200 }
    })
  );

  // Table of Contents Header
  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Table of Contents",
          bold: true,
          size: 28,
          color: "2980b9"
        })
      ],
      spacing: { before: 400, after: 200 }
    })
  );

  sections.forEach((sec) => {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Chapter ${sec.chapter}: ${sec.title}`,
            bold: true,
            size: 20,
            color: "34495e"
          })
        ],
        spacing: { after: 100 }
      })
    );
  });

  docChildren.push(new Paragraph({ text: "", spacing: { after: 600 } }));

  // Content Chapters
  sections.forEach((sec) => {
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Chapter ${sec.chapter}: ${sec.title}`,
            bold: true,
            size: 28,
            color: "2c3e50"
          })
        ],
        spacing: { before: 600, after: 300 }
      })
    );

    const paragraphs = sec.content.split("\n\n");
    paragraphs.forEach((pText) => {
      if (pText.startsWith("### ")) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: pText.replace("### ", ""),
                bold: true,
                size: 22,
                color: "2980b9"
              })
            ],
            spacing: { before: 300, after: 150 }
          })
        );
      } else if (pText.startsWith("#### ")) {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: pText.replace("#### ", ""),
                bold: true,
                size: 18,
                color: "16a085"
              })
            ],
            spacing: { before: 200, after: 100 }
          })
        );
      } else {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: pText,
                size: 11
              })
            ],
            spacing: { after: 200 }
          })
        );
      }
    });
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren
    }]
  });

  const filePath = path.join(docsDir, "Project_Documentation.docx");
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
  console.log(`✅ Generated DOCX: ${filePath}`);
}

// ====================================================================================
// FORMAT 4: GENERATE PDF DOCUMENTATION (.pdf)
// ====================================================================================
function generatePDF() {
  const filePath = path.join(docsDir, "Project_Documentation.pdf");
  const doc = new PDFDocument({ margin: 50 });
  const writeStream = fs.createWriteStream(filePath);
  doc.pipe(writeStream);

  // Cover Page
  doc.fontSize(24).font("Helvetica-Bold").fillColor("#2c3e50").text(docTitle, { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(14).font("Helvetica-Oblique").fillColor("#7f8c8d").text(docSub, { align: "center" });
  doc.moveDown(2);
  
  doc.fontSize(10).font("Helvetica").fillColor("#34495e").text(`Date Generated: ${new Date().toLocaleDateString()}`, { align: "center" });
  doc.moveDown(4);

  // Table of Contents
  doc.fontSize(18).font("Helvetica-Bold").fillColor("#2980b9").text("Table of Contents", { underline: true });
  doc.moveDown(1);
  sections.forEach((sec) => {
    doc.fontSize(11).font("Helvetica-Bold").fillColor("#34495e").text(`Chapter ${sec.chapter}: ${sec.title}`);
    doc.moveDown(0.3);
  });

  doc.addPage();

  // Chapters
  sections.forEach((sec) => {
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#2c3e50").text(`Chapter ${sec.chapter}: ${sec.title}`);
    doc.moveDown(0.8);

    const blocks = sec.content.split("\n\n");
    blocks.forEach((block) => {
      if (block.startsWith("### ")) {
        doc.fontSize(13).font("Helvetica-Bold").fillColor("#2980b9").text(block.replace("### ", ""));
        doc.moveDown(0.5);
      } else if (block.startsWith("#### ")) {
        doc.fontSize(11).font("Helvetica-Bold").fillColor("#16a085").text(block.replace("#### ", ""));
        doc.moveDown(0.4);
      } else {
        doc.fontSize(10).font("Helvetica").fillColor("#333333").text(block, { lineGap: 3, align: "justify" });
        doc.moveDown(0.8);
      }
    });

    doc.addPage();
  });

  doc.end();
  console.log(`✅ Generated PDF: ${filePath}`);
}

// Execute all formats
generateMarkdown();
generateHTML();
generateDocx();
generatePDF();
