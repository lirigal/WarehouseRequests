/**
 * Agricultural Research Organization Warehouse Request Dynamic Attribute Selector Helper Script
 * Supports RTL formatting, dynamic AJAX binding, and mandatory client-side validations.
 */

$(document).ready(function () {
    // Watch for dynamic SKU item selection dropdown or searching changes
    $("#ddlWarehouseItems, #txtItemSkuSearch").on("change input", function () {
        var selectedSku = $(this).val();
        if (selectedSku) {
            fetchAndRenderDynamicAttributes(selectedSku);
        } else {
            clearAttributePlaceholders();
        }
    });
});

/**
 * Executes a lightweight WebMethod query to obtain item attribute metadata from database.
 */
function fetchAndRenderDynamicAttributes(sku) {
    var placeholder = $("#pnlAttributeSelectorWrapper");
    
    // Show spinner loading indicator
    placeholder.html('<div class="loading-indicator text-right py-2"><i class="fa fa-spinner fa-spin"></i> טוען מאפיינים נדרשים...</div>');

    $.ajax({
        type: "POST",
        url: "AddRequest.aspx/GetItemAttributes",
        data: JSON.stringify({ sku: sku }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (response) {
            // Check if there is data returned
            if (response && response.d) {
                renderAttributesDropdown(response.d, placeholder);
            } else {
                placeholder.html(""); // Clean placeholder if item has no attributes linked
            }
        },
        error: function (xhr, status, error) {
            console.error("AJAX Error fetching item attributes: ", error);
            placeholder.html('<div class="text-danger small text-right"><i class="fa fa-exclamation-triangle"></i> שגיאה בטעינת מאפיינים.</div>');
        }
    });
}

/**
 * Generates appropriate localized labels and a responsive dropdown selector in the container.
 */
function renderAttributesDropdown(data, container) {
    // Clear spinner
    container.html("");

    if (!data.AttributeTypeId) {
        return; // Empty state
    }

    // Determine current interface language
    var isRtl = $("html").attr("lang") === "he" || $("body").css("direction") === "rtl";
    var attrLabel = isRtl ? data.TypeNameHe : data.TypeNameEn;
    var validationText = isRtl ? "זהו שדה חובה" : "This attribute is mandatory";

    // Setup visual row elements
    var wrapperDiv = $('<div class="form-group row my-2 align-items-center"></div>');
    var labelCol = $('<label class="col-sm-3 col-form-label font-weight-bold text-right"></label>')
        .text(attrLabel + (data.IsMandatory ? " *" : "") + ":");
    
    var selectCol = $('<div class="col-sm-9 text-right"></div>');
    var selectBox = $('<select id="dynamicAttributeSelect" class="form-control" style="width:100%;"></select>');
    
    // Add default empty value if optional or to enforce clear selection
    var promptText = isRtl ? "-- בחר " + attrLabel + " --" : "-- Select " + attrLabel + " --";
    selectBox.append($('<option value=""></option>').text(promptText));

    // Populate dropdown with specifically mapped item values
    $.each(data.AllowedValues, function (idx, item) {
        var optionLabel = isRtl ? item.ValueNameHe : item.ValueNameEn;
        var opt = $('<option></option>').val(item.AttributeValueId).text(optionLabel);
        selectBox.append(opt);
    });

    // Handle mandatory field validation markers
    if (data.IsMandatory) {
        selectBox.attr("required", "required");
        var validationSpan = $('<span class="text-danger small d-none" id="dynamicValidationSpan"></span>')
            .text("! " + validationText);
        selectCol.append(selectBox).append(validationSpan);
    } else {
        selectCol.append(selectBox);
    }

    wrapperDiv.append(labelCol).append(selectCol);
    container.append(wrapperDiv);

    // Register active change trackers for custom alerts
    selectBox.on("change", function () {
        var val = $(this).val();
        if (data.IsMandatory && val === "") {
            $("#dynamicValidationSpan").removeClass("d-none");
        } else {
            $("#dynamicValidationSpan").addClass("d-none");
        }
    });
}

function clearAttributePlaceholders() {
    $("#pnlAttributeSelectorWrapper").html("");
}
