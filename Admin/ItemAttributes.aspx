<%@ Page Title="ניהול מאפייני פריטים - מכון וולקני" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="ItemAttributes.aspx.cs" Inherits="WarehouseRequests.Admin.ItemAttributes" %>

<asp:Content ID="BodyContent" ContentPlaceHolderID="MainContent" runat="server">
    <!-- RTL CSS Grid Container -->
    <div class="enterprise-container" style="direction: rtl; text-align: right; padding: 20px;">
        <div class="row mb-4" style="border-bottom: 2px solid #005691; padding-bottom: 15px;">
            <div class="col-md-8">
                <h1 style="color: #005691; font-size: 26px; font-weight: 500;">
                    <i class="fa fa-tags"></i> ניהול קטגוריות ומאפייני פריטים
                </h1>
                <p style="color: #666; font-size: 14px; margin-top: 5px;">
                    כלי מנהל מחסן לקביעת תיוגים, צבעים ומידות הנדרשים לרישום בקשות ניפוק חקלאיות מול ERP מרכבה.
                </p>
            </div>
            <div class="col-md-4 text-left font-weight-bold">
                <span class="badge badge-primary p-2" style="font-size: 13px;">
                    <i class="fa fa-user-shield"></i> מורשה: מנהל מחסן (Warehouse Manager)
                </span>
            </div>
        </div>

        <!-- Success/Error Alert Panel -->
        <asp:Panel ID="pnlNotification" runat="server" Visible="false" CssClass="alert alert-dismissible" role="alert">
            <asp:Label ID="lblNotificationMessage" runat="server"></asp:Label>
        </asp:Panel>

        <div class="row">
            <!-- Left Side: Attribute Types Form & Grid -->
            <div class="col-md-6">
                <div class="card card-enterprise">
                    <div class="card-header font-weight-bold bg-light">סוגי מאפיינים ראשיים</div>
                    <div class="card-body">
                        
                        <!-- Create Row -->
                        <div class="well p-3 mb-3 bg-light border">
                            <h5 class="text-primary font-size-14" style="margin-top:0;">סוג מאפיין חדש:</h5>
                            <div class="form-row align-items-center">
                                <div class="col-sm-5">
                                    <asp:TextBox ID="txtTypeNameHe" runat="server" CssClass="form-control mb-2" placeholder="עברית (למשל: מידה)" Required="true"></asp:TextBox>
                                </div>
                                <div class="col-sm-5">
                                    <asp:TextBox ID="txtTypeNameEn" runat="server" CssClass="form-control mb-2" placeholder="English (e.g. Size)" Required="true"></asp:TextBox>
                                </div>
                                <div class="col-sm-2 text-left">
                                    <asp:Button ID="btnSaveType" runat="server" Text="שמור" CssClass="btn btn-primary mb-2 btn-block" OnClick="btnSaveType_Click" />
                                </div>
                            </div>
                        </div>

                        <!-- Grid -->
                        <asp:GridView ID="gvTypes" runat="server" AutoGenerateColumns="False" DataKeyNames="AttributeTypeId"
                            CssClass="table table-bordered table-striped" OnSelectedIndexChanged="gvTypes_SelectedIndexChanged"
                            OnRowDeleting="gvTypes_RowDeleting">
                            <Columns>
                                <asp:BoundField DataField="AttributeTypeId" HeaderText="מזהה" ReadOnly="True" ItemStyle-Width="10%" />
                                <asp:BoundField DataField="TypeNameHe" HeaderText="שם בעברית" />
                                <asp:BoundField DataField="TypeNameEn" HeaderText="שם באנגלית" />
                                <asp:TemplateField HeaderText="סטטוס">
                                    <ItemTemplate>
                                        <asp:LinkButton ID="lnkToggleActive" runat="server" OnCommand="lnkToggleActive_Command" CommandArgument='<%# Eval("AttributeTypeId") %>'
                                            CssClass='<%# (bool)Eval("IsActive") ? "badge badge-success" : "badge badge-secondary" %>'>
                                            <%# (bool)Eval("IsActive") ? "פעיל" : "לא פעיל" %>
                                        </asp:LinkButton>
                                    </ItemTemplate>
                                </asp:TemplateField>
                                <asp:CommandField ShowSelectButton="True" SelectText="ערכים &raquo;" ControlStyle-CssClass="btn btn-sm btn-info text-white" />
                                <asp:TemplateField>
                                    <ItemTemplate>
                                        <asp:LinkButton ID="lnkDeleteType" runat="server" CommandName="Delete" Text="מחק"
                                            OnClientClick="return confirm('האם למחוק סוג מאפיין זה וכל הערכים שלו?');"
                                            CssClass="btn btn-sm btn-danger text-white"></asp:LinkButton>
                                    </ItemTemplate>
                                </asp:TemplateField>
                            </Columns>
                            <SelectedRowStyle BackColor="#EAF4FC" Font-Bold="True" />
                        </asp:GridView>
                    </div>
                </div>
            </div>

            <!-- Right Side: Values Form & Grid per Type select -->
            <div class="col-md-6">
                <asp:Panel ID="pnlValues" runat="server" Enabled="false" style="opacity: 0.6;">
                    <div class="card card-enterprise">
                        <div class="card-header font-weight-bold bg-light">
                            ערכים עבור: <asp:Label ID="lblSelectedTypeName" runat="server" Text="[בחר סוג מאפיין]"></asp:Label>
                        </div>
                        <div class="card-body">
                            
                            <!-- Save value form -->
                            <div class="well p-3 mb-3 bg-light border">
                                <h5 class="text-warning font-size-14" style="margin-top:0;">ערך מאפיין חדש:</h5>
                                <div class="form-row align-items-center">
                                    <div class="col-sm-5">
                                        <asp:TextBox ID="txtValueHe" runat="server" CssClass="form-control mb-2" placeholder="למשל: גדול" Required="true"></asp:TextBox>
                                    </div>
                                    <div class="col-sm-5">
                                        <asp:TextBox ID="txtValueEn" runat="server" CssClass="form-control mb-2" placeholder="e.g. Large" Required="true"></asp:TextBox>
                                    </div>
                                    <div class="col-sm-2">
                                        <asp:Button ID="btnSaveValue" runat="server" Text="הוסף" CssClass="btn btn-warning mb-2 btn-block text-dark font-weight-bold" OnClick="btnSaveValue_Click" />
                                    </div>
                                </div>
                            </div>

                            <asp:GridView ID="gvValues" runat="server" AutoGenerateColumns="False" DataKeyNames="AttributeValueId"
                                CssClass="table table-bordered table-striped" OnRowDeleting="gvValues_RowDeleting">
                                <Columns>
                                    <asp:BoundField DataField="AttributeValueId" HeaderText="ID" ItemStyle-Width="15%" />
                                    <asp:BoundField DataField="ValueNameHe" HeaderText="ערך בעברית" />
                                    <asp:BoundField DataField="ValueNameEn" HeaderText="ערך באנגלית" />
                                    <asp:TemplateField HeaderText="סטטוס">
                                        <ItemTemplate>
                                            <asp:LinkButton ID="lnkToggleValueActive" runat="server" OnCommand="lnkToggleValueActive_Command" CommandArgument='<%# Eval("AttributeValueId") %>'
                                                CssClass='<%# (bool)Eval("IsActive") ? "badge badge-success" : "badge badge-secondary" %>'>
                                                <%# (bool)Eval("IsActive") ? "פעיל" : "לא פעיל" %>
                                            </asp:LinkButton>
                                        </ItemTemplate>
                                    </asp:TemplateField>
                                    <asp:TemplateField>
                                        <ItemTemplate>
                                            <asp:LinkButton ID="lnkDeleteValue" runat="server" CommandName="Delete" Text="הסר"
                                                OnClientClick="return confirm('האם להסיר ערך זה?');"
                                                CssClass="btn btn-sm btn-outline-danger"></asp:LinkButton>
                                        </ItemTemplate>
                                    </asp:TemplateField>
                                </Columns>
                            </asp:GridView>
                        </div>
                    </div>
                </asp:Panel>
            </div>
        </div>
    </div>
</asp:Content>
