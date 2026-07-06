/**
 * FinancialData.js - Client-Side AJAX Exchange Rates Controller
 * Consumes WebMethods inside FinancialData.aspx.cs for seamless async retrieval.
 * Project: Bank of Israel Exchange Rates View (Agricultural Research Organization)
 */

$(document).ready(function () {
    // Determine context variables
    const isRtl = $("html").attr("dir") === "rtl" || $(".financial-container").css("direction") === "rtl";

    // Select UI DOM Elements
    const $datePicker = $("#txtExchangeDate");
    const $btnRefresh = $("#btnRefreshData");
    const $loadingCover = $("#loadingCover");
    const $ratesTableBody = $("#ratesTableBody");
    const $alertMessageSection = $("#alertMessageSection");
    const $lblLatestFetchDate = $("#lblLatestFetchDate");
    const $lblCurrentReportDate = $("#lblCurrentReportDate");

    const $usdRateVal = $("#usdRateVal");
    const $eurRateVal = $("#eurRateVal");
    const $gbpRateVal = $("#gbpRateVal");

    // Initialize Page with current date if empty
    if (!$datePicker.val()) {
        const today = new Date().toISOString().split('T')[0];
        $datePicker.val(today);
    }

    // Load initial rates on startup
    fetchCurrencyRates($datePicker.val());

    // Event Handler: Automatic Reload on calendar date value modification
    $datePicker.on("change", function () {
        const selectedDate = $(this).val();
        if (selectedDate) {
            fetchCurrencyRates(selectedDate);
        }
    });

    // Event Handler: Refresh button clicked
    $btnRefresh.on("click", function (e) {
        e.preventDefault();
        const selectedDate = $datePicker.val();
        if (selectedDate) {
            fetchCurrencyRates(selectedDate, true); // true indicates forced bypass cache/fresh fetch
        }
    });

    /**
     * Executes asynchronous AJAX call to the ASP.NET WebMethod server endpoint
     * @param {string} targetDate - Date formatted as YYYY-MM-DD
     * @param {boolean} forceBypassCache - True if bypassing DB cache
     */
    function fetchCurrencyRates(targetDate, forceBypassCache = false) {
        // Show enterprise loader container with visual fade-in
        $loadingCover.css("display", "flex").hide().fadeIn(150);

        // Clear transient alert markers
        $alertMessageSection.slideUp(100).empty();

        // Safe parameter wrapping
        const payloadParams = {
            queryDateString: targetDate,
            forceBypassCache: forceBypassCache
        };

        // Standard corporate jQuery AJAX executing PageMethods/WebMethod mapping
        $.ajax({
            type: "POST",
            url: "FinancialData.aspx/GetRatesForDate",
            data: JSON.stringify(payloadParams),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (response) {
                const result = response.d;
                if (result.Success) {
                    renderGridData(result.Rates, result.ReportDateDisplay, result.FetchTimestamp);
                    
                    // Display success banner for forced updates
                    if (forceBypassCache) {
                        showBanner(
                            isRtl ? "הנתונים עודכנו בהצלחה ישירות משרתי בנק ישראל!" : "Data successfully re-fetched directly from Bank of Israel!",
                            "success"
                        );
                    }
                } else {
                    handleFetchError(result.ErrorMessage);
                }
            },
            error: function (xhr, textStatus, errorThrown) {
                console.error("AJAX Error:", textStatus, errorThrown);
                const customErrorMsg = isRtl 
                    ? "קרסה שגיאת תקשורת בחיבור לשרת המקומי. אנא נסה שנית."
                    : "A transmission error occurred while contacting the web server.";
                handleFetchError(customErrorMsg);
            },
            complete: function () {
                // Dim loader view safely
                $loadingCover.fadeOut(150);
            }
        });
    }

    /**
     * Renders parsed rates object array into HTML table structures
     */
    function renderGridData(ratesList, reportDate, lastUpdatedTime) {
        $ratesTableBody.empty();
        $lblCurrentReportDate.text(reportDate);
        $lblLatestFetchDate.text(lastUpdatedTime);

        if (!ratesList || ratesList.length === 0) {
            const noDataMsg = isRtl
                ? "לא נמצאו נתונים פיננסיים לתאריך המבוקש. בחר יום חול אחר."
                : "No financial currency entries returned for the designated date. Try another date.";
            $ratesTableBody.append(`
                <tr>
                    <td colspan="5" style="text-align: center; color: #94a3b8; font-style: italic; padding: 25px;">
                        ${noDataMsg}
                    </td>
                </tr>
            `);
            
            // Set dynamic header metrics to placeholders
            $usdRateVal.text("- -");
            $eurRateVal.text("- -");
            $gbpRateVal.text("- -");
            return;
        }

        // Loop array and insert rows dynamically
        ratesList.forEach(function (rate) {
            // Determine trend text & styling classes
            let trendHtml = "";
            if (rate.Trend > 0) {
                trendHtml = `<span class="rate-trend-indicator trend-up">▲ +${rate.TrendPercent.toFixed(2)}%</span>`;
            } else if (rate.Trend < 0) {
                trendHtml = `<span class="rate-trend-indicator trend-down">▼ ${rate.TrendPercent.toFixed(2)}%</span>`;
            } else {
                trendHtml = `<span class="rate-trend-indicator trend-flat">▬ 0.00%</span>`;
            }

            const isCurrentRtl = isRtl;
            const displayName = isCurrentRtl ? rate.HeName : rate.EnName;

            const trRow = `
                <tr id="row_currency_${rate.CurrencyCode}">
                    <td>
                        <span class="currency-code-badge">${rate.CurrencyCode}</span>
                    </td>
                    <td class="font-weight-bold" style="color: #0f172a;">
                        ${displayName}
                    </td>
                    <td class="rate-value-text">
                        ${rate.Unit}
                    </td>
                    <td class="rate-value-text" style="color:#1e3a8a;">
                        ${rate.ExchangeRate.toFixed(4)} ₪
                    </td>
                    <td>
                        ${trendHtml}
                    </td>
                </tr>
            `;
            $ratesTableBody.append(trRow);

            // Bind values to the key summary metrics cards at top of container
            if (rate.CurrencyCode === "USD") {
                $usdRateVal.text(rate.ExchangeRate.toFixed(3) + " ₪");
            } else if (rate.CurrencyCode === "EUR") {
                $eurRateVal.text(rate.ExchangeRate.toFixed(3) + " ₪");
            } else if (rate.CurrencyCode === "GBP") {
                $gbpRateVal.text(rate.ExchangeRate.toFixed(3) + " ₪");
            }
        });
    }

    /**
     * Handles gracefully showing fallback alert panels
     */
    function handleFetchError(message) {
        showBanner(message, "error");
        
        // Zero summary cards in case of explicit failure
        $usdRateVal.text("- -");
        $eurRateVal.text("- -");
        $gbpRateVal.text("- -");

        $ratesTableBody.empty().append(`
            <tr>
                <td colspan="5" style="text-align: center; color: #b91c1c; font-weight: bold; padding: 25px; background: #fff5f5;">
                    ${isRtl ? "שגיאה בטעינת נתונים: " : "Error occurred while processing: "} ${message}
                </td>
            </tr>
        `);
    }

    /**
     * Renders a highly polished visual notice banner
     */
    function showBanner(text, type) {
        $alertMessageSection.empty().hide();
        const badgeClass = (type === "error") ? "alert-error" : (type === "success" ? "alert-success" : "alert-info");
        const iconCode = (type === "error") ? "fa-exclamation-triangle" : (type === "success" ? "fa-check-circle" : "fa-info-circle");

        const bannerHtml = `
            <div class="alert-feedback ${badgeClass}">
                <i class="fa ${iconCode}"></i>
                <span>${text}</span>
            </div>
        `;
        $alertMessageSection.html(bannerHtml).slideDown(200);
    }
});
