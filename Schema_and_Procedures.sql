-- =====================================================================
-- SYSTEM: Volcani Center Warehouse Request Management System
-- MODULE: Item Attributes Management (מערכת מאפייני פריטים)
-- DESIGNED BY: Senior Enterprise Architect
-- COMPATIBILITY: SQL Server 2012+
-- =====================================================================

USE [WarehouseRequestsDB];
GO

-- 1. ATTRIBUTE TYPES TABLE (Size, Color, Model...)
CREATE TABLE [dbo].[AttributeTypes] (
    [AttributeTypeId] INT IDENTITY(1,1) NOT NULL,
    [TypeNameEn] NVARCHAR(100) NOT NULL,
    [TypeNameHe] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [IsDeleted] BIT NOT NULL DEFAULT 0,
    [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE(),
    [CreatedBy] NVARCHAR(100) NOT NULL,
    CONSTRAINT [PK_AttributeTypes] PRIMARY KEY CLUSTERED ([AttributeTypeId] ASC),
    CONSTRAINT [UQ_AttributeTypeNameEn] UNIQUE ([TypeNameEn]),
    CONSTRAINT [UQ_AttributeTypeNameHe] UNIQUE ([TypeNameHe])
);
CREATE NONCLUSTERED INDEX [IX_AttributeTypes_Active_Deleted] 
ON [dbo].[AttributeTypes] ([IsActive], [IsDeleted]) 
INCLUDE ([TypeNameHe], [TypeNameEn]);
GO

-- 2. ATTRIBUTE VALUES TABLE (S, M, L, Red, Blue...)
CREATE TABLE [dbo].[AttributeValues] (
    [AttributeValueId] INT IDENTITY(1,1) NOT NULL,
    [AttributeTypeId] INT NOT NULL,
    [ValueNameEn] NVARCHAR(100) NOT NULL,
    [ValueNameHe] NVARCHAR(100) NOT NULL,
    [IsActive] BIT NOT NULL DEFAULT 1,
    [IsDeleted] BIT NOT NULL DEFAULT 0,
    [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE(),
    [CreatedBy] NVARCHAR(100) NOT NULL,
    CONSTRAINT [PK_AttributeValues] PRIMARY KEY CLUSTERED ([AttributeValueId] ASC),
    CONSTRAINT [FK_AttributeValues_AttributeTypes] FOREIGN KEY ([AttributeTypeId]) 
        REFERENCES [dbo].[AttributeTypes] ([AttributeTypeId]) ON DELETE CASCADE,
    CONSTRAINT [UQ_AttributeValue_Type_Name] UNIQUE ([AttributeTypeId], [ValueNameHe])
);
CREATE NONCLUSTERED INDEX [IX_AttributeValues_TypeId_Active] 
ON [dbo].[AttributeValues] ([AttributeTypeId], [IsActive], [IsDeleted])
INCLUDE ([ValueNameHe], [ValueNameEn]);
GO

-- 3. ITEM METADATA ATTRIBS MAPPING TABLE (Maps Attribute Type to SKU)
CREATE TABLE [dbo].[ItemAttributeMapping] (
    [SKU] NVARCHAR(50) NOT NULL, -- Logical link to existing static items imported from Excel
    [AttributeTypeId] INT NOT NULL,
    [IsMandatory] BIT NOT NULL DEFAULT 0,
    [CreatedDate] DATETIME NOT NULL DEFAULT GETDATE(),
    [CreatedBy] NVARCHAR(100) NOT NULL,
    CONSTRAINT [PK_ItemAttributeMapping] PRIMARY KEY CLUSTERED ([SKU] ASC, [AttributeTypeId] ASC),
    CONSTRAINT [FK_ItemAttributeMapping_AttributeTypes] FOREIGN KEY ([AttributeTypeId])
        REFERENCES [dbo].[AttributeTypes] ([AttributeTypeId])
);
GO

-- 4. ALLOWED ATTRIBUTE VALUES PER ITEM Table (Selective values)
CREATE TABLE [dbo].[ItemAttributeAllowedValues] (
    [SKU] NVARCHAR(50) NOT NULL,
    [AttributeTypeId] INT NOT NULL,
    [AttributeValueId] INT NOT NULL,
    CONSTRAINT [PK_ItemAttributeAllowedValues] PRIMARY KEY CLUSTERED ([SKU], [AttributeTypeId], [AttributeValueId]),
    CONSTRAINT [FK_ItemAttributeAllowedValues_Mapping] FOREIGN KEY ([SKU], [AttributeTypeId])
        REFERENCES [dbo].[ItemAttributeMapping] ([SKU], [AttributeTypeId]) ON DELETE CASCADE,
    CONSTRAINT [FK_ItemAttributeAllowedValues_Value] FOREIGN KEY ([AttributeValueId])
        REFERENCES [dbo].[AttributeValues] ([AttributeValueId])
);
GO

-- 5. REQUEST DETAILS EXTENSION TABLE (Selected attribute per line request)
CREATE TABLE [dbo].[RequestAttributes] (
    [RequestLineId] INT NOT NULL, -- Link to existing primary Requests table
    [SKU] NVARCHAR(50) NOT NULL,
    [AttributeTypeId] INT NOT NULL,
    [AttributeValueId] INT NOT NULL,
    [SelectedValueTextHe] NVARCHAR(100) NOT NULL,
    [SelectedValueTextEn] NVARCHAR(100) NOT NULL,
    CONSTRAINT [PK_RequestAttributes] PRIMARY KEY CLUSTERED ([RequestLineId] ASC),
    CONSTRAINT [FK_RequestAttributes_Type] FOREIGN KEY ([AttributeTypeId]) 
        REFERENCES [dbo].[AttributeTypes] ([AttributeTypeId]),
    CONSTRAINT [FK_RequestAttributes_Value] FOREIGN KEY ([AttributeValueId]) 
        REFERENCES [dbo].[AttributeValues] ([AttributeValueId])
);
GO

-- 6. COMPREHENSIVE AUDIT LOG TABLE (Compliance & History tracking)
CREATE TABLE [dbo].[AuditLog] (
    [AuditLogId] BIGINT IDENTITY(1,1) NOT NULL,
    [UserId] NVARCHAR(100) NOT NULL,
    [ActionType] NVARCHAR(50) NOT NULL, -- CREATE / UPDATE / DELETE / ASSIGN
    [TableName] NVARCHAR(100) NOT NULL,
    [OldValue] NVARCHAR(MAX) NULL,
    [NewValue] NVARCHAR(MAX) NULL,
    [ActionDate] DATETIME NOT NULL DEFAULT GETDATE(),
    [IPAddress] NVARCHAR(50) NULL,
    CONSTRAINT [PK_AuditLog] PRIMARY KEY CLUSTERED ([AuditLogId] DESC)
);
CREATE NONCLUSTERED INDEX [IX_AuditLog_ActionDate] ON [dbo].[AuditLog] ([ActionDate] DESC);
GO


-- =====================================================================
-- STORED PROCEDURES FOR HIGH-PERFORMANCE DATA RETRIEVAL
-- =====================================================================

-- P1. Dynamic retrieval of items attribute configs during requests
CREATE PROCEDURE [dbo].[sp_GetItemAttributesForSelection]
    @SKU NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- Retrieve mapped attribute type list and mandatory settings for item
    SELECT 
        m.[SKU],
        m.[AttributeTypeId],
        t.[TypeNameHe] AS [AttributeTypeNameHe],
        t.[TypeNameEn] AS [AttributeTypeNameEn],
        m.[IsMandatory]
    FROM [dbo].[ItemAttributeMapping] m
    INNER JOIN [dbo].[AttributeTypes] t ON m.[AttributeTypeId] = t.[AttributeTypeId]
    WHERE m.[SKU] = @SKU 
      AND t.[IsActive] = 1 
      AND t.[IsDeleted] = 0;

    -- Retrieve specifically allowed values for matching SKU
    SELECT 
        av.[SKU],
        v.[AttributeTypeId],
        v.[AttributeValueId],
        v.[ValueNameHe] AS [AttributeValueNameHe],
        v.[ValueNameEn] AS [AttributeValueNameEn]
    FROM [dbo].[ItemAttributeAllowedValues] av
    INNER JOIN [dbo].[AttributeValues] v ON av.[AttributeValueId] = v.[AttributeValueId]
    WHERE av.[SKU] = @SKU 
      AND v.[IsActive] = 1 
      AND v.[IsDeleted] = 0;
END
GO

-- P2. Save/Update attribute configuration for a specific SKU (Transactional)
CREATE PROCEDURE [dbo].[sp_SaveItemAttributeConfig]
    @SKU NVARCHAR(50),
    @AttributeTypeId INT,
    @IsMandatory BIT,
    @AllowedValuesJson NVARCHAR(MAX), -- JSON array of selected Value IDs
    @UserId NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Check if Mapping exists
        IF EXISTS (SELECT 1 FROM [dbo].[ItemAttributeMapping] WHERE [SKU] = @SKU AND [AttributeTypeId] = @AttributeTypeId)
        BEGIN
            UPDATE [dbo].[ItemAttributeMapping]
            SET [IsMandatory] = @IsMandatory
            WHERE [SKU] = @SKU AND [AttributeTypeId] = @AttributeTypeId;
        END
        ELSE
        BEGIN
            INSERT INTO [dbo].[ItemAttributeMapping] ([SKU], [AttributeTypeId], [IsMandatory], [CreatedBy])
            VALUES (@SKU, @AttributeTypeId, @IsMandatory, @UserId);
        END

        -- Clean up previous allowed list values for this SKU type
        DELETE FROM [dbo].[ItemAttributeAllowedValues]
        WHERE [SKU] = @SKU AND [AttributeTypeId] = @AttributeTypeId;

        -- Extract and insert allowed lists
        INSERT INTO [dbo].[ItemAttributeAllowedValues] ([SKU], [AttributeTypeId], [AttributeValueId])
        SELECT @SKU, @AttributeTypeId, CAST([value] AS INT)
        FROM OPENJSON(@AllowedValuesJson);

        -- Insert audit trail record
        INSERT INTO [dbo].[AuditLog] ([UserId], [ActionType], [TableName], [OldValue], [NewValue])
        VALUES (@UserId, 'ASSIGN', 'ItemAttributeConfig', 
                'SKU: ' + @SKU + ', TypeId: ' + CAST(@AttributeTypeId AS VARCHAR),
                'Mandatory: ' + CAST(@IsMandatory AS VARCHAR) + ', ValuesJSON: ' + @AllowedValuesJson);

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
