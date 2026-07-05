using System;
using System.Data;
using System.Web.Services;
using System.Web.UI;
using System.Web.UI.WebControls;
using WarehouseRequests.BLL;
using WarehouseRequests.Models;

namespace WarehouseRequests
{
    public partial class AddRequest : System.Web.UI.Page
    {
        private readonly WarehouseAttributeBLL _attribBll = new WarehouseAttributeBLL();
        private readonly AuditService _auditService = new AuditService();

        protected void Page_Load(object sender, EventArgs e)
        {
            if (!User.Identity.IsAuthenticated)
            {
                Response.Redirect("~/Login.aspx");
                return;
            }

            lblUserIdentify.Text = Server.HtmlEncode(User.Identity.Name);

            if (!IsPostBack)
            {
                PopulateItems();
            }
        }

        private void PopulateItems()
        {
            try
            {
                DataTable dt = _attribBll.GetActiveWarehouseSKUs();
                ddlWarehouseItems.DataSource = dt;
                ddlWarehouseItems.DataTextField = "SkuDisplayName";
                ddlWarehouseItems.DataValueField = "SKU";
                ddlWarehouseItems.DataBind();
                ddlWarehouseItems.Items.Insert(0, new ListItem("--- בחר פריט מהמלאי ---", ""));
            }
            catch (Exception ex)
            {
                ShowFeedback("שגיאה בטעינת פריטים ממאגר הנתונים: " + ex.Message, false);
            }
        }

        /// <summary>
        /// A lightweight WebMethod accessed asynchronously via JSON AJAX matching Dynamic_Selector.js client-side script.
        /// </summary>
        [WebMethod]
        public static object GetItemAttributes(string sku)
        {
            if (string.IsNullOrEmpty(sku)) return null;

            WarehouseAttributeBLL bll = new WarehouseAttributeBLL();
            return bll.GetAjaxItemAttributesMetadata(sku);
        }

        protected void btnSubmitRequest_Click(object sender, EventArgs e)
        {
            string sku = ddlWarehouseItems.SelectedValue;
            string qtyStr = txtQuantity.Text.Trim();

            if (string.IsNullOrEmpty(sku) || string.IsNullOrEmpty(qtyStr))
            {
                ShowFeedback("אנא בחר פריט תקין והזן כמות מבוקשת.", false);
                return;
            }

            int qty = Convert.ToInt32(qtyStr);
            string userId = User.Identity.Name;

            try
            {
                // 1. Inventory stock validation
                int stockAvailable = _attribBll.GetItemStockLevel(sku);
                if (stockAvailable < qty)
                {
                    ShowFeedback($"חריגת כמות: המלאי הנתון במחסן הוא {stockAvailable} יחידות בלבד.", false);
                    return;
                }

                // 2. Resolve client-side dynamically selected attribute
                string selectedValIdStr = Request.Form["dynamicAttributeSelect"];
                
                // Fetch mapping parameters to verify mandatoriness on server-side
                DataTable dtMapping = _attribBll.GetItemMappingSimplified(sku);
                if (dtMapping.Rows.Count > 0)
                {
                    bool isMandatory = Convert.ToBoolean(dtMapping.Rows[0]["IsMandatory"]);
                    if (isMandatory && string.IsNullOrEmpty(selectedValIdStr))
                    {
                        ShowFeedback("שגיאת ולידציה בשרת: חובה לבחור ערך מאפיין מורשה עבור פריט זה!", false);
                        return;
                    }
                }

                int? selectedValueId = !string.IsNullOrEmpty(selectedValIdStr) ? (int?)Convert.ToInt32(selectedValIdStr) : null;

                // 3. Insert transaction
                string requestId = "WR-2026-" + new Random().Next(1000, 9999).ToString();
                bool success = _attribBll.InsertWarehouseRequest(requestId, sku, qty, selectedValueId, userId);

                if (success)
                {
                    _auditService.LogAction(userId, "CREATE", "WarehouseRequests", null, 
                        $"Submitted Outbound Request {requestId} for SKU {sku} (Qty: {qty}) with attribute value: {selectedValIdStr}");

                    ShowFeedback($"דרישת הניפוק נוצרה ונקלטה בהצלחה! מזהה: {requestId}", true);
                    
                    // Reset
                    ddlWarehouseItems.SelectedIndex = 0;
                    txtQuantity.Text = "1";
                }
            }
            catch (Exception ex)
            {
                ShowFeedback("שגיאה מקומית בתהליך העיבוד: " + ex.Message, false);
            }
        }

        private void ShowFeedback(string text, bool isSuccess)
        {
            pnlResponse.Visible = true;
            pnlResponse.CssClass = isSuccess ? "alert alert-success" : "alert alert-danger";
            lblResponseText.Text = Server.HtmlEncode(text);
        }
    }
}
