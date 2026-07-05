<%@ Page Title="הגשת בקשת ניפוק פריט מהמחסן - מכון וולקני" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="AddRequest.aspx.cs" Inherits="WarehouseRequests.AddRequest" %>

<asp:Content ID="BodyContent" ContentPlaceHolderID="MainContent" runat="server">
    <!-- Main Form container -->
    <div class="enterprise-container" style="direction: rtl; text-align: right; padding: 20px;">
        <div class="row mb-4" style="border-bottom: 2px solid #005691; padding-bottom: 15px;">
            <div class="col-8">
                <h1 style="color: #005691; font-size: 26px; font-weight: 500;">
                    <i class="fa fa-shopping-cart"></i> הגשת דרישת ניפוק פריט מהמחסן
                </h1>
                <p style="color: #666; font-size: 14px; margin-top: 5px;">
                    בחר פריט חקלאי והזן כמות. המערכת תאחזר אסינכרונית את המאפיינים בהתאם לקביעת מנהל המחסן.
                </p>
            </div>
            <div class="col-4 text-left font-weight-bold">
                <span class="badge badge-secondary p-2" style="font-size: 13px;">
                    <i class="fa fa-user"></i> מחובר: <asp:Label ID="lblUserIdentify" runat="server"></asp:Label>
                </span>
            </div>
        </div>

        <asp:Panel ID="pnlResponse" runat="server" Visible="false" CssClass="alert" role="alert">
            <asp:Label ID="lblResponseText" runat="server"></asp:Label>
        </asp:Panel>

        <div class="row">
            <!-- Submit Form Column -->
            <div class="col-md-7">
                <div class="card">
                    <div class="card-header bg-dark text-white font-weight-bold">פרטי דרישת הנפקת מלאי</div>
                    <div class="card-body">
                        <!-- SKU Dropdown -->
                        <div class="form-group row my-3">
                            <label class="col-sm-3 col-form-label font-weight-bold">איתור וחיפוש פריט:</label>
                            <div class="col-sm-9">
                                <!-- Triggers Dynamic_Selector.js client-side AJAX querying -->
                                <asp:DropDownList ID="ddlWarehouseItems" runat="server" ClientIDMode="Static" CssClass="form-control" Required="true">
                                </asp:DropDownList>
                            </div>
                        </div>

                        <!-- Quantity input -->
                        <div class="form-group row my-3">
                            <label class="col-sm-3 col-form-label font-weight-bold">כמות מבוקשת:</label>
                            <div class="col-sm-9">
                                <asp:TextBox ID="txtQuantity" runat="server" TextMode="Number" Text="1" min="1" CssClass="form-control" Required="true"></asp:TextBox>
                            </div>
                        </div>

                        <!-- Dynamic Attributes Panel Wrapper -->
                        <!-- Managed by Dynamic_Selector.js jQuery AJAX scripts -->
                        <div id="pnlAttributeSelectorWrapper"></div>

                        <hr />

                        <div class="text-left">
                            <asp:Button ID="btnSubmitRequest" runat="server" Text="שלח דרישה לאישור" OnClick="btnSubmitRequest_Click" CssClass="btn btn-primary btn-lg px-5 font-weight-bold" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Side helper note column -->
            <div class="col-md-5">
                <div class="card bg-light border-0">
                    <div class="card-body">
                        <h4 style="color:#005691; font-size: 16px;" class="font-weight-bold mb-3">מדריך ולידציה אסינכרונית:</h4>
                        <ul class="p-0 text-right small leading-loose" style="list-style-type: square; padding-right: 20px !important;">
                            <li>המערכת מבצעת אימות מלאי חי מול בסיס הנתונים בעת קליטה.</li>
                            <li>במידה ולפריט יש מאפיין שהוגדר כחובה (למשל: מידת שסתום או סוג צנרת), כפתור השליחה יחסם עד לבחירת ערך תואם מהתצוגה הדינמית.</li>
                            <li>כל הפעולות מבוקרות ומאוחסנות ביומן ה-Audit הלפקח על שלמות הנתונים.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    </div>
</asp:Content>
