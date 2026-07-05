using System;
using System.Data;
using System.Web.UI;
using System.Web.UI.WebControls;
using WarehouseRequests.BLL;
using WarehouseRequests.Models;

namespace WarehouseRequests.Admin
{
    public partial class ItemAttributes : System.Web.UI.Page
    {
        private readonly WarehouseAttributeBLL _attribBll = new WarehouseAttributeBLL();
        private readonly AuditService _auditService = new AuditService();

        protected void Page_Load(object sender, EventArgs e)
        {
            // Double-Layer Security Validation: Check if user is a Warehouse Manager
            if (!User.Identity.IsAuthenticated || !User.IsInRole("WarehouseManagers"))
            {
                _auditService.LogAction("UNKNOWN", "ACCESS_DENIED", "AttributeTypes", "", "Unauthorized user loaded ItemAttributes.aspx");
                Response.Redirect("~/Unauthorized.aspx");
                return;
            }

            if (!IsPostBack)
            {
                BindTypesGrid();
            }
        }

        private void BindTypesGrid()
        {
            try
            {
                DataTable dt = _attribBll.GetAllAttributeTypes(includeDeleted: false);
                gvTypes.DataSource = dt;
                gvTypes.DataBind();
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בטעינת סוגי המאפיינים: " + ex.Message, isSuccess: false);
            }
        }

        private void BindValuesGrid(int attributeTypeId)
        {
            try
            {
                DataTable dt = _attribBll.GetValuesByTypeId(attributeTypeId, includeDeleted: false);
                gvValues.DataSource = dt;
                gvValues.DataBind();
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בטעינת ערכי המאפיין: " + ex.Message, isSuccess: false);
            }
        }

        protected void btnSaveType_Click(object sender, EventArgs e)
        {
            string nameHe = txtTypeNameHe.Text.Trim();
            string nameEn = txtTypeNameEn.Text.Trim();
            string userId = User.Identity.Name;

            if (string.IsNullOrEmpty(nameHe) || string.IsNullOrEmpty(nameEn))
            {
                ShowNotification("אנא הזן שם תקני בעברית ובאנגלית.", isSuccess: false);
                return;
            }

            try
            {
                if (_attribBll.IsTypeNameExists(nameHe, nameEn))
                {
                    ShowNotification("שגיאה: שם המאפיין כבר קיים במערכת.", isSuccess: false);
                    return;
                }

                bool result = _attribBll.InsertAttributeType(nameHe, nameEn, userId);
                if (result)
                {
                    _auditService.LogAction(userId, "CREATE", "AttributeTypes", null, $"Created Type '{nameHe}'");
                    ShowNotification("סוג המאפיין נשמר בהצלחה.", isSuccess: true);
                    txtTypeNameHe.Text = "";
                    txtTypeNameEn.Text = "";
                    BindTypesGrid();
                }
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בשמירת סוג המאפיין: " + ex.Message, isSuccess: false);
            }
        }

        protected void gvTypes_SelectedIndexChanged(object sender, EventArgs e)
        {
            int selectedTypeId = Convert.ToInt32(gvTypes.SelectedValue);
            string chosenHeName = gvTypes.SelectedRow.Cells[1].Text;

            ViewState["SelectedAttributeTypeId"] = selectedTypeId;
            lblSelectedTypeName.Text = Server.HtmlEncode(chosenHeName);
            
            pnlValues.Enabled = true;
            pnlValues.Style["opacity"] = "1.0";

            BindValuesGrid(selectedTypeId);
        }

        protected void btnSaveValue_Click(object sender, EventArgs e)
        {
            if (ViewState["SelectedAttributeTypeId"] == null) return;
            int typeId = (int)ViewState["SelectedAttributeTypeId"];
            string valHe = txtValueHe.Text.Trim();
            string valEn = txtValueEn.Text.Trim();
            string userId = User.Identity.Name;

            try
            {
                if (_attribBll.IsValueExists(typeId, valHe, valEn))
                {
                    ShowNotification("שגיאה: ערך מאפיין זה כבר מוגדר בקטגוריה זו.", isSuccess: false);
                    return;
                }

                bool result = _attribBll.InsertAttributeValue(typeId, valHe, valEn, userId);
                if (result)
                {
                    _auditService.LogAction(userId, "CREATE", "AttributeValues", null, $"Added value '{valHe}' to Type ID: {typeId}");
                    ShowNotification("הערך נוסף בהצלחה לקטגוריה.", isSuccess: true);
                    txtValueHe.Text = "";
                    txtValueEn.Text = "";
                    BindValuesGrid(typeId);
                }
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בהוספת הערך: " + ex.Message, isSuccess: false);
            }
        }

        protected void lnkToggleActive_Command(object sender, CommandEventArgs e)
        {
            int typeId = Convert.ToInt32(e.CommandArgument);
            string userId = User.Identity.Name;
            try
            {
                _attribBll.ToggleTypeActiveStatus(typeId, userId);
                _auditService.LogAction(userId, "UPDATE", "AttributeTypes", $"TypeID: {typeId}", "Toggled Active status");
                BindTypesGrid();
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בשינוי סטטוס המאפיין: " + ex.Message, isSuccess: false);
            }
        }

        protected void lnkToggleValueActive_Command(object sender, CommandEventArgs e)
        {
            int valId = Convert.ToInt32(e.CommandArgument);
            string userId = User.Identity.Name;
            try
            {
                _attribBll.ToggleValueActiveStatus(valId, userId);
                _auditService.LogAction(userId, "UPDATE", "AttributeValues", $"ValueID: {valId}", "Toggled value Active status");
                if (ViewState["SelectedAttributeTypeId"] != null)
                {
                    BindValuesGrid((int)ViewState["SelectedAttributeTypeId"]);
                }
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בשינוי סטטוס הערך: " + ex.Message, isSuccess: false);
            }
        }

        protected void gvTypes_RowDeleting(object sender, GridViewDeleteEventArgs e)
        {
            int typeId = Convert.ToInt32(gvTypes.DataKeys[e.RowIndex].Value);
            string userId = User.Identity.Name;
            try
            {
                _attribBll.SoftDeleteAttributeType(typeId, userId);
                _auditService.LogAction(userId, "DELETE", "AttributeTypes", $"TypeID: {typeId}", "Soft deleted attribute type and its dependencies");
                ShowNotification("סוג המאפיין נמחק בהצלחה (מחיקה רכה).", isSuccess: true);
                
                if (ViewState["SelectedAttributeTypeId"] != null && (int)ViewState["SelectedAttributeTypeId"] == typeId)
                {
                    ViewState["SelectedAttributeTypeId"] = null;
                    lblSelectedTypeName.Text = "[בחר סוג מאפיין]";
                    pnlValues.Enabled = false;
                    pnlValues.Style["opacity"] = "0.6";
                    gvValues.DataSource = null;
                    gvValues.DataBind();
                }

                BindTypesGrid();
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה במחיקת המאפיין: " + ex.Message, isSuccess: false);
            }
        }

        protected void gvValues_RowDeleting(object sender, GridViewDeleteEventArgs e)
        {
            int valId = Convert.ToInt32(gvValues.DataKeys[e.RowIndex].Value);
            string userId = User.Identity.Name;
            try
            {
                _attribBll.SoftDeleteAttributeValue(valId, userId);
                _auditService.LogAction(userId, "DELETE", "AttributeValues", $"ValueID: {valId}", "Soft deleted attribute value");
                ShowNotification("הערך נמחק בהצלחה (מחיקה רכה).", isSuccess: true);
                if (ViewState["SelectedAttributeTypeId"] != null)
                {
                    BindValuesGrid((int)ViewState["SelectedAttributeTypeId"]);
                }
            }
            catch (Exception ex)
            {
                ShowNotification("שגיאה בהסרת הערך: " + ex.Message, isSuccess: false);
            }
        }

        private void ShowNotification(string message, bool isSuccess)
        {
            pnlNotification.Visible = true;
            pnlNotification.CssClass = isSuccess ? "alert alert-success" : "alert alert-danger";
            lblNotificationMessage.Text = Server.HtmlEncode(message);
        }
    }
}
