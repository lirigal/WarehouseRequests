# Enterprise SQL Server Database Schema & Relationship Blueprint

Welcome to the central database documentation of the **Warehouse Requests Management System** (מערכת מאפייני פריטים ומלאי). This server-side architecture is designed for Microsoft SQL Server 2012+ and runs on clustered environment nodes.

---

## 1. Entity-Relationship (ER) Diagram (Mermaid)

Below is the structured relational map of the warehouse requests, item catalog metadata, and exchange caching layers.

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

---

## 2. Relational Schema & Table Dictionary

### A. Core Item Attributes Configuration

#### 1. `AttributeTypes`
Stores the master classifications of attributes (e.g., *Size [מידה]*, *Color [צבע]*).
*   **Primary Key**: `AttributeTypeId` (clustered)
*   **Unique Constraints**: `UQ_AttributeTypeNameEn` (TypeNameEn), `UQ_AttributeTypeNameHe` (TypeNameHe)
*   **Index**: `IX_AttributeTypes_Active_Deleted` (IsActive, IsDeleted) INCLUDE (TypeNameHe, TypeNameEn)

#### 2. `AttributeValues`
Stores the allowed options for each attribute type (e.g., *S, M, L, XL* for Size).
*   **Primary Key**: `AttributeValueId` (clustered)
*   **Foreign Key**: `AttributeTypeId` ➔ `AttributeTypes(AttributeTypeId)` (ON DELETE CASCADE)
*   **Unique Constraint**: `UQ_AttributeValue_Type_Name` (AttributeTypeId, ValueNameHe)
*   **Index**: `IX_AttributeValues_TypeId_Active` (AttributeTypeId, IsActive, IsDeleted) INCLUDE (ValueNameHe, ValueNameEn)

---

### B. Logical Mapping to Warehouse Catalog Items

#### 3. `ItemAttributeMapping`
Links attribute rules to standard imported items by SKU.
*   **Primary Key**: `[SKU, AttributeTypeId]` (clustered)
*   **Foreign Key**: `AttributeTypeId` ➔ `AttributeTypes(AttributeTypeId)`

#### 4. `ItemAttributeAllowedValues`
White-lists specific available options of an attribute for a given SKU.
*   **Primary Key**: `[SKU, AttributeTypeId, AttributeValueId]` (clustered)
*   **Foreign Keys**:
    *   `[SKU, AttributeTypeId]` ➔ `ItemAttributeMapping(SKU, AttributeTypeId)` (ON DELETE CASCADE)
    *   `AttributeValueId` ➔ `AttributeValues(AttributeValueId)`

---

### C. System Actions and Extensions

#### 5. `RequestAttributes`
Appends selected attribute choices dynamically for each line in a check-out request.
*   **Primary Key**: `RequestLineId` (clustered)
*   **Foreign Keys**:
    *   `AttributeTypeId` ➔ `AttributeTypes(AttributeTypeId)`
    *   `AttributeValueId` ➔ `AttributeValues(AttributeValueId)`

#### 6. `FinancialRateCache`
Tracks Bank of Israel currency rates indexed daily to serve offline environments, bypassing remote web request latency.
*   **Primary Key**: `CacheId` (clustered)
*   **Unique Constraint**: `[RateDate, CurrencyCode]`
*   **Index**: `IX_FinancialRateCache_Date` (RateDate)

#### 7. `AuditLog`
Tracks high-importance operations (CREATE, UPDATE, DELETE, ASSIGN) for compliance.
*   **Primary Key**: `AuditLogId` (clustered DESC)
*   **Index**: `IX_AuditLog_ActionDate` (ActionDate DESC)

---

## 3. High Performance Stored Procedures

The database relies on transactional and pre-compiled database procedures to guarantee data integrity and bypass complex execution trees:

1.  **`sp_GetItemAttributesForSelection`**:
    Retrieves dual datasets in a single packet (the item's mandatory attributes, and the subset of white-listed values allowed for that SKU).
2.  **`sp_SaveItemAttributeConfig`**:
    Saves logical binding for schemas, updating or inserting attributes while logging changes to the audit table in an atomic transaction scope.
3.  **`sp_GetFinancialRatesByDate`**:
    Queries cached exchange rates for a specific ISO date with automatic fallback ranking (USD ➔ EUR ➔ GBP).
4.  **`sp_UpsertFinancialRate`**:
    Merges rates into the local table. Safe against high-frequency database deadlock conditions.
