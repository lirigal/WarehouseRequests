<%@ Page Title="שיוך מאפיינים למק\"ט - מכון וולקני" Language="C#" MasterPageFile="~/Site.Master" AutoEventWireup="true" CodeBehind="EditItemMapping.aspx.cs" Inherits="WarehouseRequests.Admin.EditItemMapping" %>

<asp:Content ID="BodyContent" ContentPlaceHolderID="MainContent" runat="server">
    <div class="enterprise-container" style="direction: rtl; text-align: right; padding: 20px;">
        <div class="row mb-4" style="border-bottom: 2px solid #005691; padding-bottom: 15px;">
            <div class="col-md-8">
                <h1 style="color: #005691; font-size: 26px; font-weight: 500;">
                    <i class="fa fa-sliders-h"></i> שיוך מאפיינים וערכים מורשים לפריט (מול ERP מרכבה)
                </h1>
                <p style="color: #666; font-size: 14px; margin-top: 5px;">
                    שייך סוג מאפיין מוגדר (כמו מידה או צבע) למק"ט של פריט פיזי שיובא מקובץ האקסל היומי, וסמן אילו ערכים מורשים לקריין בעת הניפוק.
                </p>
            </div>
        </div>

        <asp:Panel ID="pnlNotify" runat="server" Visible="false" CssClass="alert alert-dismissible" role="alert">
            <asp:Label ID="lblNotifyMessage" runat="server"></asp:Label>
        </asp:Panel>

        <div class="row">
            <!-- Selector side -->
            <div class="col-md-5">
                <div class="card mb-4">
                    <div class="card-header bg-primary text-white font-weight-bold">
                        1. בחירת פריט וסוג מאפיין לשיוך
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label class="font-weight-bold">בחר פריט חקלאי (מק"ט):</label>
                            <asp:DropDownList ID="ddlItemsSku" runat="server" AutoPostBack="true" OnSelectedIndexChanged="ddlItemsSku_SelectedIndexChanged" CssClass="form-control mb-3">
                            </asp:DropDownList>
                        </div>

                        <div class="form-group">
                            <label class="font-weight-bold">בחר סוג מאפיין לקביעה:</label>
                            <asp:DropDownList ID="ddlAttributeTypes" runat="server" AutoPostBack="true" OnSelectedIndexChanged="ddlAttributeTypes_SelectedIndexChanged" CssClass="form-control mb-3">
                            </asp:DropDownList>
                        </div>

                        <div class="form-check my-3 p-0" style="padding-right: 20px !important;">
                            <asp:CheckBox ID="chkIsMandatory" runat="server" CssClass="form-check-input" />
                            <label class="form-check-label font-weight-bold" for="chkIsMandatory">
                                הגדר מאפיין זה כחובה בעת הגשת הזמנה עבור פריט זה
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Mapped Values checklist side -->
            <div class="col-md-7">
                <div class="card">
                    <div class="card-header bg-success text-white font-weight-bold">
                        2. סימון ערכים מורשים לבחירה בניפוק
                    </div>
                    <div class="card-body">
                        <p class="text-muted small">
                            סמן רק את המאפיינים הספציפיים שזמינים במלאי פיזי עבור פריט זה במחסן במכון וולקני:
                        </p>

                        <asp:Panel ID="pnlValueSelection" runat="server" Enabled="false" style="opacity:0.6;">
                            <div class="well p-3 border mb-3 text-left">
                                <asp:Button ID="btnSelectAll" runat="server" Text="בחר הכל" CssClass="btn btn-sm btn-outline-secondary" OnClick="btnSelectAll_Click" />
                                <asp:Button ID="btnClearAll" runat="server" Text="נקה הכל" CssClass="btn btn-sm btn-outline-secondary ml-2" OnClick="btnClearAll_Click" />
                            </div>

                            <asp:CheckBoxList ID="cblAllowedValues" runat="server" RepeatColumns="2" RepeatDirection="Horizontal" CssClass="table table-borderless table-sm">
                            </asp:CheckBoxList>

                            <hr />

                            <div class="text-right">
                                <asp:Button ID="btnSaveMapping" runat="server" Text="שמור שיוך תצורת פריט" OnClick="btnSaveMapping_Click" CssClass="btn btn-success btn-lg px-5 font-weight-bold" />
                            </div>
                        </asp:Panel>
                    </div>
                </div>
            </div>
        </div>
    </div>
</asp:Content>
