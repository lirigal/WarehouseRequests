# Warehouse Request & Inventory System
### מערכת מאפייני פריטים ומלאי 

[![React](https://img.shields.io/badge/React-19.0-blue.svg?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database_&_Auth-green.svg?logo=supabase)](https://supabase.com/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg?logo=express)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-Enterprise-red.svg)](#)

A robust, production-ready, full-stack enterprise logistics application designed to streamline agricultural research resource requisition, warehouse inventory control, item dynamic trait parameterization, and physical checkout request fulfillment (*Nipuk* - ניפוק) within the Agricultural Research Organization.

---

## 📋 Table of Contents

- [Project Title & Badges](#warehouse-request--inventory-system)
- [Project Description](#-project-description)
- [System Purpose](#-system-purpose)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Project Structure](#-project-structure)
- [Features](#-features)
- [Screens Overview](#-screens-overview)
- [Screenshots & Visual Tour](#-screenshots--visual-tour)
- [Database Overview](#-database-overview)
- [Authentication & Security](#-authentication--security)
- [Future Improvements](#-future-improvements)
- [License](#-license)

---

## 📖 Project Description

The **Agricultural Research Organization Warehouse Request & Inventory System** (מערכת מאפייני פריטים ומלאי) is a complete, enterprise-grade modernization of agricultural research warehouse logistics. 

Originally architected as a legacy ASP.NET Web Forms application utilizing Microsoft SQL Server 2012+, the system has been migrated to a modern, highly responsive **React 19 Single Page Application (SPA)** frontend, backed by an **Express 4 backend and proxy server**, and connected to **Supabase PostgreSQL** for robust, real-time cloud persistence.

The system addresses the unique logistical challenges of scientific research facilities. In these environments, items are not merely static inventory records; they require dynamic, complex attributes (e.g., *purity levels, chemicals concentration, voltage tolerances, sensor sizes, and calibration dates*) that change depending on specific research projects. 

The application facilitates advanced inventory management, allowing researchers to submit requests while storekeepers and managers orchestrate inventory allocation, item categorization, and physical dispatching with maximum security and compliance.

---

## 🎯 System Purpose

The system provides immense operational value to the organization by establishing a digital, automated paperless checkout pipeline:
1. **Catalog Auditing & Maintenance**: Precise real-time tracking of item SKUs (*Makat* - מק"ט), stock counts, unit definitions, and exact warehouse shelf coordinates.
2. **Dynamic Attribute Parameterization**: Association of complex, variable product attributes to specific inventory SKUs without requiring continuous SQL database schema modifications or migrations.
3. **Checkout Requisition Submission**: Dynamic requisition forms enabling scientific staff to verify live stock availability, input custom mandatory characteristics, and request material releases.
4. **Fulfillment & Dispatch Flow (Nipuk - ניפוק)**: High-integrity storekeeper workspace to authorize, pack, sign off, and physically dispatch inventory items, producing instant digital delivery vouchers.
5. **BOI Currency Exchange Integration**: Automatic parsing of daily Bank of Israel foreign exchange feeds, allowing international research purchases to be valued in multiple currencies (USD, EUR, GBP, CAD, JPY, ILS) with daily trends and historical cache.

---

## 🛠️ Technologies

### Frontend
*   **React 19 (SPA)**: Powered by modern functional components, hooks, and dynamic route layout controllers.
*   **TypeScript 5.8**: Guarantees compile-time type-safety across components, state models, and service interfaces.
*   **Vite 6**: Offers lightning-fast development serving and highly optimized build compilation.
*   **Tailwind CSS 4.0**: Provides immediate, high-contrast, responsive utilities supporting right-to-left (RTL) localization.
*   **Motion**: Delivers smooth, non-intrusive micro-interactions and staggered entry animations for dashboards and tables.
*   **Lucide Icons**: Unified, clean, and modern SVG iconography throughout the screens.

### Backend
*   **Node.js & Express 4**: Hosts custom API endpoints, logs transactional flows, and coordinates background proxies.
*   **TSX & Esbuild**: Enables native TypeScript execution in development and bundles production assets into unified, highly optimized server files.
*   **Bank of Israel XML Proxy**: Fetches currency exchange rates daily from official BOI feeds, parsing XML to secure, low-latency JSON streams.

### Database & Authentication
*   **Supabase (PostgreSQL 14+)**: Serves as the high-availability cloud database with real-time replication.
*   **Durable Relational Model**: Standardized primary keys, foreign constraints, cascades, and composite indexes.
*   **Supabase Auth**: Manages secure user session workflows, login credentials, and registration fields.

### Additional Libraries
*   **docx.js (v9)**: Generates highly detailed Microsoft Word documents on-the-fly for physical archiving.
*   **PDFKit (v0.19)**: Compiles live HTML data and records into printable, formatted PDF documents.

---

## 🚀 Installation

### Prerequisites
*   **Node.js**: Version 18.0.0 or higher (LTS recommended)
*   **npm**: Version 9.0.0 or higher

### Cloning and Setup
1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd agri-warehouse-system
    ```
2.  Install package dependencies (both frontend and server dependencies are handled automatically):
    ```bash
    npm install
    ```

### Environment Variables Configuration
The application expects environment variables for database communication and API access. Create a `.env` file in the root directory and populate it based on the `.env.example`:

```env
# Database Credentials
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anonymous-public-key

# API Integrations & Runtime
GEMINI_API_KEY=your-gemini-ai-key-if-applicable
NODE_ENV=development
```

### Running the Application

#### Development Mode
To run both the React Vite compiler and the Express API proxy server simultaneously under `tsx`:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

#### Production Build & Start
To compile the production assets into optimized client bundles and compile `server.ts` into a standalone CommonJS bundle via `esbuild`:
```bash
npm run build
npm start
```

---

## 📂 Project Structure

A clean, modular overview of the repository's files and folders:

```text
├── .env.example                       # Reference file detailing environment variables
├── .gitignore                         # Build and dependency files to ignore in Git
├── AddRequest.aspx / .aspx.cs         # Legacy ASP.NET Web Forms Web Interface & code-behind
├── FinancialData.aspx / .aspx.cs / .js # Legacy ASP.NET Financial Cache viewer and controller
├── FinancialData_CacheTable.sql       # SQL Server schema for daily bank exchange tables
├── DATABASE_DIAGRAM.md                # Entity-Relationship diagram in Mermaid & database schemas
├── Migrate_Warehouse_Schema.sql       # Database migration scripts for transitioning to SQL Server
├── Schema_and_Procedures.sql          # SQL Server stored procedures, triggers, and indices
├── Supabase_Schema_and_Procedures.sql # PostgreSQL definitions matching legacy stored procedures
├── package.json                       # Scripts, dependencies, and bundle setups
├── server.ts                          # Express 4 proxy server and production static asset routing
├── tsconfig.json                      # Strict compiler guidelines for TypeScript
├── vite.config.ts                     # Bundler settings for React & Tailwind plugins
│
├── docs/                              # Project documentation assets
│   └── images/                        # High-fidelity system screenshots and ER diagrams
│
├── src/                               # Primary source code directory
│   ├── App.tsx                        # Root React entry point, global tab navigation & Auth state
│   ├── index.css                      # Global stylesheet importing Tailwind utilities & fonts
│   ├── main.tsx                       # Mounts the React application to index.html
│   ├── types.ts                       # Complete TypeScript interface and type declarations
│   │
│   ├── assets/                        # Static client images, logos, and vector mockups
│   │
│   ├── components/                    # UI Components & Modules
│   │   ├── EnterpriseLayout.tsx       # Core layout with sidebar navigation, notifications, and language switches
│   │   ├── AuthScreen.tsx             # Login & user registration screens (with Teudat Zehut support)
│   │   ├── RequestForm.tsx            # Dynamic request entry sheet & attribute validation checks
│   │   ├── CatalogManagementForm.tsx  # Product catalog grid and product editor ("זמינות מוצרים" screen)
│   │   ├── AttributesManagement.tsx   # Administrative attribute classification editor
│   │   ├── ItemMappingForm.tsx        # Grid mapping dynamic attributes and whitelisted values to SKUs
│   │   ├── DispatchManagement.tsx     # Physical checkout fulfillment workspace for storekeepers (*Nipuk*)
│   │   ├── UserManagement.tsx         # User directory and privilege modifiers panel
│   │   ├── AdminDataExporter.tsx      # Comprehensive security audit trail and data export panel
│   │   ├── CSVImportManager.tsx       # CSV parser for direct spreadsheet catalog uploads
│   │   ├── FinancialDataViewer.tsx    # Bank of Israel exchange tracker and trend analysis charts
│   │   ├── ArchitectHub.tsx           # Technical ERD documentation and legacy .NET code-behinds
│   │   └── ProjectDocumentation.tsx   # In-app Technical Overview and User Manual
│   │
│   ├── data/                          # Seed data and localization constants
│   ├── lib/                           # Utility functions and helper wrappers
│   └── services/                      # Database Service Layer
│       └── dbService.ts               # Direct CRUD mapping wrapper for Supabase database tables
```

---

## ✨ Features

*   **Secure Authentication & Sign Up**: Safe identity gateway with Teudat Zehut 9-digit validation checks and customized user registration.
*   **Double-Byte Localization (RTL/LTR)**: Fully bilingual Hebrew and English localization across all system panels, buttons, tooltips, and table structures.
*   **Dynamic Attribute Mapping Engine**: Allows logical pairing of custom physical modifiers (e.g., color, size, specification) to specific SKUs. It enforces whether these values are mandatory during requisition.
*   **Whitelisted Allowed Values**: Ensures specific products are constrained to correct parameters, preventing field operators from submitting out-of-bounds requests.
*   **Comprehensive Storekeeper Dispatch Workspace (*Nipuk*)**: Streamlined dispatch console with visual status tracking. Storekeepers can inspect pending requests, verify stock levels, input actual packaging amounts, and record dispatchers' signatures.
*   **Automated Exchange Rate Synchronizer**: Tracks daily Bank of Israel valuations against NIS. Computes percentage trends, identifies currency strength, and caches values to ensure uninterrupted offline operations.
*   **Robust Security Auditing**: Automatically registers every change (CREATE, UPDATE, DELETE, ASSIGN) into an immutable audit trail, tracking workstation IDs, target tables, and pre- vs. post-operation JSON payloads.
*   **CSV Import / Export Dashboard**: Enables rapid catalog importing from spreadsheets with automatic column alignment and format validation checks.
*   **Responsive Multi-role Interface**: Desktop-first structural control built to scale perfectly to mobile tablet sizes, featuring role-based component rendering.
*   **Graceful Local Fallback Storage**: Guarantees immediate responsiveness by synchronizing state modifications with secure local stores in the event of brief network drops.

---

## 🖥️ Screens Overview

### 1. Identity Gateway / Auth (`AuthScreen.tsx`)
*   **Purpose**: Protects access to warehouse inventory and request sheets.
*   **Main Functionality**: Logs in users via email, passwords, and Israeli ID Codes (Teudat Zehut).
*   **Available Actions**: Access accounts, register new roles, and retrieve credentials.
*   **Navigation**: Primary entry screen prior to entering main layouts.
*   **User Permissions**: Open to all registered researchers and warehouse staff.

### 2. Analytical Dashboard & Request Sheet (`RequestForm.tsx`)
*   **Purpose**: Central hub for researchers to request items.
*   **Main Functionality**: Searches catalog items with dynamic sliders to filter amounts, select dynamic attributes, and submit requisitions.
*   **Available Actions**: Toggle attributes, check stock limits, submit requests, and output docx/pdf drafts.
*   **Navigation**: Accessible from the sidebar navigation panel.
*   **User Permissions**: Standard scientific `STAFF`, `STOREKEEPER`, `MANAGER`, and `ADMIN`.

### 3. Product Catalog & Availability (`CatalogManagementForm.tsx`)
*   **Purpose**: Allows managers and storekeepers to maintain catalog items.
*   **Main Functionality**: Edit product names, descriptions, shelf locations, and adjust physical stock levels. Includes image attachments uploading.
*   **Available Actions**: Create SKU, upload images, adjust quantities, delete retired catalog items.
*   **Navigation**: "Product Catalog" sidebar link.
*   **User Permissions**: Restricted to `STOREKEEPER`, `MANAGER`, and `ADMIN`.

### 4. Master Attributes Classification (`AttributesManagement.tsx`)
*   **Purpose**: Administrative panel for creating the properties inventory.
*   **Main Functionality**: Define custom master attributes and configure available values (e.g. Size, Color, Chemistry).
*   **Available Actions**: Add attributes, remove option values, toggle active configurations.
*   **Navigation**: "Attribute Management" sidebar link.
*   **User Permissions**: Restricted to `MANAGER` and `ADMIN`.

### 5. SKU-to-Attribute Mapping Console (`ItemMappingForm.tsx`)
*   **Purpose**: Maps dynamic properties and whitelisted allowed values directly to individual inventory items.
*   **Main Functionality**: Select dynamic attribute types for any catalog SKU, set mandatory requirements, and whitelist allowed values.
*   **Available Actions**: Toggle mandatory states, bind allowed values, save item configuration mapping.
*   **Navigation**: "Attribute Mapping" sidebar link.
*   **User Permissions**: Restricted to `MANAGER` and `ADMIN`.

### 6. Allowed Option Values Configurator
*   **Purpose**: Creates standard lists of options for mapped attributes.
*   **Main Functionality**: Add and remove choices within an attribute's sub-scope, with Hebrew and English translations.
*   **Available Actions**: Add value option, delete value option.
*   **Navigation**: Integrated into the "Attribute Management" screen layout.
*   **User Permissions**: Restricted to `MANAGER` and `ADMIN`.

### 7. Request Details Panel
*   **Purpose**: Shows high-density logs of single checkout workflows.
*   **Main Functionality**: Displays item information, selected attributes, status history, and signature logs.
*   **Available Actions**: Export reports, print physical receipts.
*   **Navigation**: Drill down by clicking any item row on the request list.
*   **User Permissions**: Visible to all authorized users.

### 8. Storekeeper Dispatch Hub (`DispatchManagement.tsx`)
*   **Purpose**: Main console for fulfilling research requests.
*   **Main Functionality**: Check-out physical stock, log actual packed amounts, and register supervisor approvals.
*   **Available Actions**: Approve requests, record signature sign-offs, print delivery notes.
*   **Navigation**: "Warehouse Dispatch" sidebar link.
*   **User Permissions**: Restricted to `STOREKEEPER`, `MANAGER`, and `ADMIN`.

### 9. Security Logs & Forensic Audits (`AdminDataExporter.tsx`)
*   **Purpose**: Security auditing and compliance.
*   **Main Functionality**: Full-screen table tracking all database modifications (diff values, timestamps, operator emails).
*   **Available Actions**: Search audit logs, filter by action types, export logs to CSV.
*   **Navigation**: "Security Logs" sidebar link.
*   **User Permissions**: Restricted to `ADMIN` only.

### 10. Financial Exchange Rates & Cache (`FinancialDataViewer.tsx`)
*   **Purpose**: Valuates international procurement in multiple foreign currencies.
*   **Main Functionality**: Connects to the Bank of Israel proxy, renders trend metrics, and displays history.
*   **Available Actions**: Pull live XML rates, update rate cache, convert values on-the-fly.
*   **Navigation**: "Exchange Rates" sidebar link.
*   **User Permissions**: Open to all authenticated users.

---

## 🖼️ Screenshots & Visual Tour

### Login Gateway
![Login Screen](docs/images/login.png)
*Protects warehouse integrity with modern email auth and Teudat Zehut ID verification.*

### Dynamic Dashboard
![Dashboard](docs/images/dashboard.png)
*High-density overview of active orders, live stock levels, and real-time exchange rates.*

### Warehouse Requests Registry
![Warehouse Requests](docs/images/warehouse-requests.png)
*Master ledger tracking submitted, pending, and fulfilled research requisitions.*

### Product Catalog Management
![Item Catalog](docs/images/item-catalog.png)
*Maintains inventory stock levels, shelf locations, SKUs, and rounded visual thumbnail attachments.*

### Attribute Classifications
![Item Attributes](docs/images/item-attributes.png)
*Administrates master custom attribute types with localized Hebrew and English naming structures.*

### Dynamic Attribute SKU Mapping
![Attribute Mapping](docs/images/attribute-mapping.png)
*Enables managers to dynamically map properties and toggle mandatory states for each SKU.*

### Allowed Attribute Values
![Allowed Values](docs/images/allowed-values.png)
*Constrains inventory items to approved lists, preventing inaccurate request submissions.*

### Request Details
![Request Details](docs/images/request-details.png)
*Detailed visual card showing selected physical options, authorization steps, and printable logs.*

### Immutable Forensic Log
![Audit Log](docs/images/audit-log.png)
*Tracks every database modification, maintaining compliance with full JSON pre- vs. post-state diffs.*

### Workspace Settings
![Settings Screen](docs/images/settings.png)
*Provides user privilege mapping, cache sync configurations, and data exporting utilities.*

---

## 📊 Database Overview

### Entity-Relationship Diagram (Mermaid)

The relational schema is structured to permit dynamic product attributes while enforcing strict foreign-key constraints on whitelisted allowed value arrays. This completely avoids "attribute pollution" and data duplication.

```mermaid
erDiagram
    AttributeTypes ||--o{ AttributeValues : "has (one-to-many)"
    AttributeTypes ||--o{ ItemAttributeMapping : "defines (one-to-many)"
    ItemAttributeMapping ||--o{ ItemAttributeAllowedValues : "constrains (one-to-many)"
    AttributeValues ||--o{ ItemAttributeAllowedValues : "allows (one-to-many)"
    
    ItemAttributeMapping ||--o{ RequestAttributes : "references"
    AttributeValues ||--o{ RequestAttributes : "selected_in"
    
    AttributeTypes {
        int AttributeTypeId PK "IDENTITY(1,1)"
        nvarchar TypeNameEn UK "NOT NULL"
        nvarchar TypeNameHe UK "NOT NULL"
        bit IsActive "DEFAULT 1"
        bit IsDeleted "DEFAULT 0"
        datetime CreatedDate "DEFAULT GETDATE()"
        nvarchar CreatedBy "NOT NULL"
    }

    AttributeValues {
        int AttributeValueId PK "IDENTITY(1,1)"
        int AttributeTypeId FK "NOT NULL"
        nvarchar ValueNameEn "NOT NULL"
        nvarchar ValueNameHe "NOT NULL"
        bit IsActive "DEFAULT 1"
        bit IsDeleted "DEFAULT 0"
        datetime CreatedDate "DEFAULT GETDATE()"
        nvarchar CreatedBy "NOT NULL"
    }

    ItemAttributeMapping {
        nvarchar SKU PK "NOT NULL"
        int AttributeTypeId PK_FK "NOT NULL"
        bit IsMandatory "DEFAULT 0"
        datetime CreatedDate "DEFAULT GETDATE()"
        nvarchar CreatedBy "NOT NULL"
    }

    ItemAttributeAllowedValues {
        nvarchar SKU PK_FK "NOT NULL"
        int AttributeTypeId PK_FK "NOT NULL"
        int AttributeValueId PK_FK "NOT NULL"
    }

    RequestAttributes {
        int RequestLineId PK "NOT NULL"
        nvarchar SKU "NOT NULL"
        int AttributeTypeId FK "NOT NULL"
        int AttributeValueId FK "NOT NULL"
        nvarchar SelectedValueTextHe "NOT NULL"
        nvarchar SelectedValueTextEn "NOT NULL"
    }

    FinancialRateCache {
        int CacheId PK "IDENTITY(1,1)"
        date RateDate UK "NOT NULL"
        varchar CurrencyCode UK "NOT NULL"
        nvarchar CurrencyNameHe "NOT NULL"
        varchar CurrencyNameEn "NOT NULL"
        int Unit "DEFAULT 1"
        decimal ExchangeRate "NOT NULL"
        decimal LastTrend "DEFAULT 0.0"
        decimal TrendPercent "DEFAULT 0.0"
        datetime FetchedAt "DEFAULT GETDATE()"
    }

    AuditLog {
        bigint AuditLogId PK "IDENTITY(1,1)"
        nvarchar UserId "NOT NULL"
        nvarchar ActionType "NOT NULL"
        nvarchar TableName "NOT NULL"
        nvarchar OldValue "NULL"
        nvarchar NewValue "NULL"
        datetime ActionDate "DEFAULT GETDATE()"
        nvarchar IPAddress "NULL"
    }
```

### Table Reference Dictionary

*   **`AttributeTypes`**: Master classification catalog of traits (e.g. Size, Color, Chemistry).
*   **`AttributeValues`**: Master options associated with dynamic attributes.
*   **`WarehouseItems`**: Stores actual agricultural research equipment, parts, materials, and quantities.
*   **`ItemPictureUrls`**: Media gallery holding rounded image paths for items.
*   **`ItemAttributeMapping`**: Defines which attribute types are applied to a SKU and marks mandatory fields.
*   **`ItemAttributeAllowedValues`**: White-lists specific options of an attribute for a given SKU.
*   **`WarehouseRequests`**: Central requests table holding requisition quantities and approval logs.
*   **`NipukRecords`**: Implements physical dispatch logging and output delivery slips.
*   **`FinancialRateCache`**: Caches currencies daily to serve exchange trackers in offline modes.
*   **`AuditLog`**: Stores immutable transaction histories including workstation parameters.

---

## 🔒 Authentication & Security

### Secure Authentication Flow
1.  **Identity Verification**: Users authenticate using secure credentials paired with a validated Israeli ID card (Teudat Zehut).
2.  **JWT Tokens**: Secure JWT session handling restricts API access on both client routes and backend proxy points.

### Role-Based Access Control (RBAC)
User actions are authorized based on four distinct operational roles:
*   👑 **`ADMIN`**: Direct access to system settings, role modifiers, Raw SQL, and complete compliance Audit Logs.
*   📋 **`MANAGER`**: Authorizes warehouse requests, creates products, and configures SKU attribute mapping schemas.
*   📦 **`STOREKEEPER`**: Accesses the dispatch workspace, packs checked-out cargo, and adjusts live inventory stocks.
*   🔬 **`STAFF`**: Submits dynamic requests, reviews self-ordered history cards, and searches the catalog.

### Immutable Security Auditing
The system features automatic security logging. Every WRITE, EDIT, DELETE, or ASSIGN action automatically populates the `AuditLog` table:
*   **Audit Payload**: Structured pre- vs. post-state JSON diff blocks are stored, tracing actions back to the specific operator.

---

## 🔮 Future Improvements

1.  **Integrated Barcode Scanner**: Connect tablet camera feeds to automatically identify and parse warehouse items via physical QR/barcodes.
2.  **Predictive Stock Refilling**: Machine learning algorithms analyze historical checkout requests to forecast and suggest warehouse restocks.
3.  **Local Sync Offline Mode**: Implements Service Workers and IndexedDB layers to let storekeepers register dispatches without active internet connections, merging changes once they reconnect.
4.  **Aesthetic Signature Pad**: Renders HTML5 signature canvas boxes directly in the dispatch modal to record physical signatures inside PDF vouchers.

---

## 📄 License

This software is a proprietary enterprise application. All rights reserved by the Agricultural Research Organization. Unauthorized distribution, copying, or reverse-engineering is strictly prohibited.

---

*Agricultural Research Organization Logistics System — Designed for absolute operational excellence, structural resilience, and design modernism.*
