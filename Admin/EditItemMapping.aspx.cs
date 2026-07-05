using System;
using System.Data;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Collections.Generic;
using WarehouseRequests.BLL;
using WarehouseRequests.Models;

namespace WarehouseRequests.Admin
{
    public partial class EditItemMapping : System.Web.UI.Page
    {
        private readonly WarehouseAttributeBLL _attribBll = new WarehouseAttributeBLL();
        private readonly AuditService _auditService = new AuditService();

        protected void Page_Load(object sender, EventArgs e)
        {
            if (!User.Identity.IsAuthenticated || !User.IsInRole("WarehouseManagers"))
            {
                Response.Redirect("~/Unauthorized.aspx");
                return;
            }

            if (!IsPostBack)
            {
                PopulateDropdowns();
            }
        }

        private void PopulateDropdowns()
        {
            try
            {
                // In core system we read SKUs that are imported from ERP
                DataTable dtItems = _attribBll.GetActiveWarehouseSKUs();
                ddlItemsSku.DataSource = dtItems;
                ddlItemsSku.DataTextField = "SkuDisplayName"; // e.g. "SKU6070 (צינור טפטוף 16 מ\"מ)"
                ddlItemsSku.DataValueField = "SKU";
                ddlItemsSku.DataBind();
                ddlItemsSku.Items.Insert(0, new ListItem("--- בחר פריט מקטלוג המלאי ---", ""));

                DataTable dtTypes = _attribBll.GetAllAttributeTypes(includeDeleted: false);
                ddlAttributeTypes.DataSource = dtTypes;
                ddlAttributeTypes.DataTextField = "TypeNameHe";
                ddlAttributeTypes.DataValueField = "AttributeTypeId";
                ddlAttributeTypes.DataBind();
                ddlAttributeTypes.Items.Insert(0, new ListItem("--- בחר סוג מאפיין ---", ""));
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בטעינת קטלוג מערכת: " + ex.Message, false);
            }
        }

        protected void ddlItemsSku_SelectedIndexChanged(object sender, EventArgs e)
        {
            LoadMappingState();
        }

        protected void ddlAttributeTypes_SelectedIndexChanged(object sender, EventArgs e)
        {
            LoadMappingState();
        }

        private void LoadMappingState()
        {
            string sku = ddlItemsSku.SelectedValue;
            string typeIdStr = ddlAttributeTypes.SelectedValue;

            if (string.IsNullOrEmpty(sku) || string.IsNullOrEmpty(typeIdStr))
            {
                pnlValueSelection.Enabled = false;
                pnlValueSelection.Style["opacity"] = "0.6";
                cblAllowedValues.Items.Clear();
                chkIsMandatory.Checked = false;
                return;
            }

            int typeId = Convert.ToInt32(typeIdStr);

            try
            {
                // 1. Enable selection wrapper
                pnlValueSelection.Enabled = true;
                pnlValueSelection.Style["opacity"] = "1.0";

                // 2. Fetch all values belonging to this type ID
                DataTable dtValues = _attribBll.GetValuesByTypeId(typeId, includeDeleted: false);
                cblAllowedValues.DataSource = dtValues;
                cblAllowedValues.DataTextField = "ValueNameHe";
                cblAllowedValues.DataValueField = "AttributeValueId";
                cblAllowedValues.DataBind();

                // 3. Fetch pre-existing mapping state
                DataTable dtMapping = _attribBll.GetItemAttributeMapping(sku, typeId);

                if (dtMapping.Rows.Count > 0)
                {
                    chkIsMandatory.Checked = Convert.ToBoolean(dtMapping.Rows[0]["IsMandatory"]);
                    
                    // Fetch pre-selected active values
                    List<int> allowedIds = _attribBll.GetAllowedValueIds(sku, typeId);
                    foreach (ListItem item in cblAllowedValues.Items)
                    {
                        int valId = Convert.ToInt32(item.Value);
                        if (allowedIds.Contains(valId))
                        {
                            item.Selected = true;
                        }
                    }
                }
                else
                {
                    chkIsMandatory.Checked = false;
                }
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בטעינת פרטי שיוך מק\"ט: " + ex.Message, false);
            }
        }

        protected void btnSelectAll_Click(object sender, EventArgs e)
        {
            foreach (ListItem item in cblAllowedValues.Items)
            {
                item.Selected = true;
            }
        }

        protected void btnClearAll_Click(object sender, EventArgs e)
        {
            foreach (ListItem item in cblAllowedValues.Items)
            {
                item.Selected = false;
            }
        }

        protected void btnSaveMapping_Click(object sender, EventArgs e)
        {
            string sku = ddlItemsSku.SelectedValue;
            string typeIdStr = ddlAttributeTypes.SelectedValue;

            if (string.IsNullOrEmpty(sku) || string.IsNullOrEmpty(typeIdStr))
            {
                ShowNotification("אנא ודא כי בחרת מק\"ט וסוג מאפיין מוגדר.", false);
                return;
            }

            int typeId = Convert.ToInt32(typeIdStr);
            bool isMandatory = chkIsMandatory.Checked;

            List<string> selectedValues = new List<string>();
            foreach (ListItem item in cblAllowedValues.Items)
            {
                if (item.Selected)
                {
                    selectedValues.Add(item.Value);
                }
            }

            if (selectedValues.Count == 0)
            {
                ShowNotification("שגיאת ולידציה: חובה לסמן לפחות ערך מאפיין אחד מורשה עבור הפריט.", false);
                return;
            }

            try
            {
                string userId = User.Identity.Name;
                string valuesJson = "[" + string.Join(",", selectedValues) + "]";

                // Call transactional SP P2
                _attribBll.SaveItemAttributeConfig(sku, typeId, isMandatory, valuesJson, userId);

                _auditService.LogAction(userId, "ASSIGN", "ItemAttributeMapping", null, 
                    $"Mapped SKU: {sku} with TypeID: {typeId}. Mandatory: {isMandatory}. Values JSON: {valuesJson}");

                ShowNotification("קונפיגורציית השיוך עבור פריט זה נשמרה והתעדכנה בהצלחה!", true);
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בשמירת התצורה בבסיס הנתונים: " + ex.Message, false);
            }
        }

        private void ShowNotification(string message, bool isSuccess)
        {
            pnlNotify.Visible = true;
            pnlNotify.CssClass = isSuccess ? "alert alert-success" : "alert alert-danger";
            lblNotifyMessage.Text = Server.HtmlEncode(message);
        }
    }
}
