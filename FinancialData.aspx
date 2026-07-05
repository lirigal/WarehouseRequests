<%@ Page Title="נתונים פיננסיים - שערי חליפין בנק ישראל" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="FinancialData.aspx.cs" Inherits="WarehouseRequests.FinancialData" %>

<asp:Content ID="BodyContent" ContentPlaceHolderID="MainContent" runat="server">
    <!-- Include Custom Stylesheet for the financial dashboard -->
    <link href="FinancialData.css" rel="stylesheet" type="text/css" />

    <div class="financial-container" style="direction: rtl; text-align: right;">
        
        <!-- Header Banner Section -->
        <div class="financial-header-section">
            <div class="financial-title-wrapper">
                <div>
                    <h1 class="financial-title">
                        <i class="fa fa-university"></i> נתונים פיננסיים ושערי חליפין
                    </h1>
                    <p class="financial-subtitle">
                        שערי חליפין רשמיים משרתי בנק ישראל עבור מכון וולקני ומערכות המלאי
                    </p>
                </div>
                
                <div class="user-identity-badge">
                    <i class="fa fa-user-circle"></i>
                    <span>מחובר: <asp:Label ID="lblUserIdentify" runat="server">אורח</asp:Label></span>
                </div>
            </div>
        </div>

        <!-- Notification / Message Alert Section (Interactive) -->
        <div id="alertMessageSection" style="display: none;"></div>

        <!-- Corporate Top Summary Cards Grid (Main Key Currencies) -->
        <div class="financial-summary-cards">
            <!-- USD Card -->
            <div class="summary-card" style="border-right: 4px solid #2563eb;">
                <div class="summary-card-title">דולר ארה"ב (USD)</div>
                <div class="summary-card-value" id="usdRateVal">- -</div>
            </div>
            
            <!-- EUR Card -->
            <div class="summary-card" style="border-right: 4px solid #10b981;">
                <div class="summary-card-title">אירו (EUR)</div>
                <div class="summary-card-value" id="eurRateVal">- -</div>
            </div>

            <!-- GBP Card -->
            <div class="summary-card" style="border-right: 4px solid #8b5cf6;">
                <div class="summary-card-title">ליש"ט בריטי (GBP)</div>
                <div class="summary-card-value" id="gbpRateVal">- -</div>
            </div>
        </div>

        <!-- Enterprise Control Panel & Toolbar -->
        <div class="enterprise-toolbar">
            <div class="toolbar-grid">
                
                <!-- Date calendar Selector tool -->
                <div class="form-group">
                    <label class="form-label" for="txtExchangeDate">בחר תאריך קלנדרי:</label>
                    <input type="date" id="txtExchangeDate" class="form-input-date" />
                </div>

                <!-- Custom Actions Area -->
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <!-- Refresh Button (Orb-styled in corporate blue/gradient) -->
                    <button type="button" id="btnRefreshData" class="btn-refresh-orb">
                        <i class="fa fa-refresh spin-icon"></i>
                        <span>שחזור נתונים</span>
                    </button>
                </div>

            </div>
        </div>

        <!-- Grid Results Table with Glassmorphism Loading Cover -->
        <div class="rates-grid-container">
            
            <!-- AJAX Floating Screen Loader -->
            <div class="loading-cover" id="loadingCover">
                <div class="loading-spinner-wrapper">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">טוען שערי חליפין עדכניים...</div>
                </div>
            </div>

            <!-- Rates Grid rendering -->
            <table class="rates-table">
                <thead>
                    <tr>
                        <th style="width: 15% !important;">קוד מטבע</th>
                        <th style="width: 35% !important;">שם המטבע</th>
                        <th style="width: 15% !important;">יחידה</th>
                        <th style="width: 20% !important;">שער יציג (בשקלים)</th>
                        <th style="width: 15% !important;">מגמת שינוי</th>
                    </tr>
                </thead>
                <tbody id="ratesTableBody">
                    <tr>
                        <td colspan="5" style="text-align: center; color: #94a3b8; padding: 25px; font-style: italic;">
                            מאתחל טעינת נתונים...
                        </td>
                    </tr>
                </tbody>
            </table>

        </div>

        <!-- Dashboard Footer Info -->
        <div class="financial-footer">
            <div id="divDatabaseCachedNotice">
                <i class="fa fa-clock-o"></i> תאריך דיווח: <span id="lblCurrentReportDate" style="font-weight: bold; color: #475569;">-</span> | עדכון אחרון במטמון: <span id="lblLatestFetchDate" style="font-weight: bold; color: #475569;">-</span>
            </div>
            <div class="source-branding">
                <i class="fa fa-info-circle"></i>
                משוך ישירות דרך API בנק ישראל (B.O.I)
            </div>
        </div>

    </div>

    <!-- Include jQuery and Custom JavaScript Logic -->
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js" type="text/javascript"></script>
    <script src="FinancialData.js" type="text/javascript"></script>
</asp:Content>
