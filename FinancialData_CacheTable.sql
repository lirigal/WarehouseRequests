-- ====================================================================================
-- FinancialData_CacheTable.sql - SQL Schema and Stored Procedures for Caching Rates
-- Target Platform: Microsoft SQL Server (Enterprise/Standard Editions)
-- Purpose: Caches Bank of Israel exchange rates locally to optimize network latency,
--          bypass service downtime, support offline environments, and query history efficiently.
-- ====================================================================================

USE [WarehouseRequestsDB];
GO

-- 1. Create the Caching Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FinancialRateCache]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[FinancialRateCache] (
        [CacheId] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [RateDate] DATE NOT NULL,                         -- Date of the currency exchange rate
        [CurrencyCode] VARCHAR(10) NOT NULL,              -- e.g. USD, EUR, GBP
        [CurrencyNameHe] NVARCHAR(100) NOT NULL,          -- Currency name in Hebrew
        [CurrencyNameEn] VARCHAR(100) NOT NULL,            -- Currency name in English
        [Unit] INT NOT NULL DEFAULT 1,                     -- Currency unit multiplier (usually 1, sometimes 10 or 100)
        [ExchangeRate] DECIMAL(18, 6) NOT NULL,            -- Actual exchange rate against NIS (ILS)
        [LastTrend] DECIMAL(12, 6) NOT NULL DEFAULT 0.0,   -- Daily difference or comparison value
        [TrendPercent] DECIMAL(12, 4) NOT NULL DEFAULT 0.0,-- Daily percentage movement
        [FetchedAt] DATETIME NOT NULL DEFAULT GETDATE(),   -- Local system timestamp when cache was created
        
        -- Constraint to avoid duplicate mappings per single day per currency
        CONSTRAINT [UQ_RateDate_Currency] UNIQUE ([RateDate], [CurrencyCode])
    );

    -- Create indexing to support faster date lookups
    CREATE INDEX [IX_FinancialRateCache_Date] ON [dbo].[FinancialRateCache]([RateDate]);
END
GO


-- 2. Stored Procedure to Fetch Cached Rates
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_GetFinancialRatesByDate]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_GetFinancialRatesByDate]
GO

CREATE PROCEDURE [dbo].[sp_GetFinancialRatesByDate]
    @TargetDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Query cached currencies for target date
    SELECT 
        [RateDate],
        [CurrencyCode],
        [CurrencyNameHe],
        [CurrencyNameEn],
        [Unit],
        [ExchangeRate],
        [LastTrend],
        [TrendPercent],
        [FetchedAt]
    FROM 
        [dbo].[FinancialRateCache]
    WHERE 
        [RateDate] = @TargetDate
    ORDER BY 
        -- Display standard popular currencies first, followed by others alphabetically
        CASE [CurrencyCode] 
            WHEN 'USD' THEN 1 
            WHEN 'EUR' THEN 2 
            WHEN 'GBP' THEN 3 
            ELSE 4 
        END, 
        [CurrencyCode] ASC;
END
GO


-- 3. Stored Procedure to Upsert (Save/Update) Rates into Local Cache
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[sp_UpsertFinancialRate]') AND type in (N'P', N'PC'))
    DROP PROCEDURE [dbo].[sp_UpsertFinancialRate]
GO

CREATE PROCEDURE [dbo].[sp_UpsertFinancialRate]
    @RateDate DATE,
    @CurrencyCode VARCHAR(10),
    @CurrencyNameHe NVARCHAR(100),
    @CurrencyNameEn VARCHAR(100),
    @Unit INT,
    @ExchangeRate DECIMAL(18, 6),
    @LastTrend DECIMAL(12, 6),
    @TrendPercent DECIMAL(12, 4)
AS
BEGIN
    SET NOCOUNT ON;

    -- Merge / Upsert Statement matching enterprise safety standards
    MERGE [dbo].[FinancialRateCache] AS Target
    USING (SELECT @RateDate AS RateDate, @CurrencyCode AS CurrencyCode) AS Source
    ON (Target.RateDate = Source.RateDate AND Target.CurrencyCode = Source.CurrencyCode)
    
    WHEN MATCHED THEN
        UPDATE SET 
            [CurrencyNameHe] = @CurrencyNameHe,
            [CurrencyNameEn] = @CurrencyNameEn,
            [Unit] = @Unit,
            [ExchangeRate] = @ExchangeRate,
            [LastTrend] = @LastTrend,
            [TrendPercent] = @TrendPercent,
            [FetchedAt] = GETDATE()
            
    WHEN NOT MATCHED THEN
        INSERT (
            [RateDate],
            [CurrencyCode],
            [CurrencyNameHe],
            [CurrencyNameEn],
            [Unit],
            [ExchangeRate],
            [LastTrend],
            [TrendPercent],
            [FetchedAt]
        )
        VALUES (
            @RateDate,
            @CurrencyCode,
            @CurrencyNameHe,
            @CurrencyNameEn,
            @Unit,
            @ExchangeRate,
            @LastTrend,
            @TrendPercent,
            GETDATE()
        );
END
GO

-- Clear cached/dummy rates from the table
TRUNCATE TABLE [dbo].[FinancialRateCache];
GO
