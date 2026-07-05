using System;
using System.Collections.Generic;
using System.Data;
using Npgsql;
using NpgsqlTypes;
using System.Configuration;
using System.Globalization;
using System.IO;
using System.Net;
using System.Xml;
using System.Web.Services;
using System.Web.UI;

namespace WarehouseRequests
{
    /// <summary>
    /// FinancialData Code-Behind Block - Volcani Institute Premium Enterprise Web Forms Screen
    /// Manages exchange rates tracking with local SQL caching, XML dynamic stream parsing, and AJAX handlers.
    /// </summary>
    public partial class FinancialData : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            // Set User Identity if logged in, or generic default
            if (User != null && User.Identity != null && User.Identity.IsAuthenticated)
            {
                lblUserIdentify.Text = Server.HtmlEncode(User.Identity.Name);
            }
            else
            {
                lblUserIdentify.Text = "משתמש חקלאי וולקני";
            }
        }

        #region AJAX Server Method Endpoints

        /// <summary>
        /// WebMethod to retrieve the rates dynamically matching FinancialData.js requirements.
        /// Integrates multi-layer local caching, XML parsing, and network fallback scenarios.
        /// </summary>
        [WebMethod]
        public static AjaxRatesResponse GetRatesForDate(string queryDateString, bool forceBypassCache)
        {
            AjaxRatesResponse response = new AjaxRatesResponse();

            try
            {
                // 1. Parsing and local validation
                DateTime targetDate;
                if (!DateTime.TryParseExact(queryDateString, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out targetDate))
                {
                    targetDate = DateTime.Today;
                }

                response.ReportDateDisplay = targetDate.ToString("dd/MM/yyyy");

                // 2. Multi-tier checking logic (Check local DB Cache -> Load BOI Service -> Backward-probing fallback)
                List<CurrencyRateDto> finalRates = null;
                DateTime checkDate = targetDate;
                int attempts = 0;
                string fetchError = string.Empty;
                bool isFallbackUsed = false;

                while (attempts < 10)
                {
                    if (!forceBypassCache)
                    {
                        finalRates = GetRatesFromLocalDBCache(checkDate);
                    }

                    if (finalRates != null && finalRates.Count > 0)
                    {
                        response.Success = true;
                        response.Rates = finalRates;
                        response.FetchTimestamp = DateTime.Now.ToString("HH:mm:ss") + " (מקומי - מטמון)";
                        if (isFallbackUsed)
                        {
                            response.ErrorMessage = "שים לב: אין מסחר בתאריך המבוקש " + targetDate.ToString("dd/MM/yyyy") + ". מוצגים שערים יציגים מיום המסחר הזמין האחרון (" + checkDate.ToString("dd/MM/yyyy") + ").";
                        }
                        response.ReportDateDisplay = checkDate.ToString("dd/MM/yyyy");
                        return response;
                    }

                    finalRates = FetchAndParseBankOfIsraelExchangeRates(checkDate, out fetchError);

                    if (finalRates != null && finalRates.Count > 0)
                    {
                        // Success! Write/Save rates to the SQL Cache DB
                        SaveRatesToLocalDBCache(checkDate, finalRates);

                        response.Success = true;
                        response.Rates = finalRates;
                        response.FetchTimestamp = DateTime.Now.ToString("HH:mm:ss") + " (בנק ישראל חי)";
                        if (isFallbackUsed)
                        {
                            response.ErrorMessage = "שים לב: אין מסחר בתאריך המבוקש " + targetDate.ToString("dd/MM/yyyy") + ". מוצגים שערים יציגים מיום המסחר הזמין האחרון (" + checkDate.ToString("dd/MM/yyyy") + ").";
                        }
                        response.ReportDateDisplay = checkDate.ToString("dd/MM/yyyy");
                        return response;
                    }

                    checkDate = checkDate.AddDays(-1);
                    attempts++;
                    isFallbackUsed = true;
                }

                // If we reach here, we failed to find active rates even after 10 attempts
                response.Success = false;
                response.ErrorMessage = "לא נמצאו שערים יציגים במאגר בנק ישראל לתאריך המבוקש או לעשרת הימים שקדמו לו. כל נתוני הסימולציה והבדיקה הוסרו.";
                if (!string.IsNullOrEmpty(fetchError))
                {
                    response.ErrorMessage += " (" + fetchError + ")";
                }
            }
            catch (Exception ex)
            {
                response.Success = false;
                response.ErrorMessage = "שגיאת מערכת חמורה לאפשר עיבוד שרת: " + ex.Message;
            }

            return response;
        }

        #endregion

        #region Active XML Parser & External Service Requests

        /// <summary>
        /// Consumes official Bank of Israel exchange rates API/XML feed and processes parameters.
        /// Supports graceful failure with descriptive errors when the service is unreachable.
        /// </summary>
        private static List<CurrencyRateDto> FetchAndParseBankOfIsraelExchangeRates(DateTime date, out string errorDetails)
        {
            errorDetails = string.Empty;
            List<CurrencyRateDto> list = new List<CurrencyRateDto>();

            try
            {
                string dateStr = date.ToString("yyyy-MM-dd");
                string activeBoUrl = $"https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/EXR/1.0/?c%5BDATA_TYPE%5D=OF00&c%5BBASE_CURRENCY%5D=USD,EUR,GBP,CAD,JPY,RUB&startperiod={dateStr}&endperiod={dateStr}&format=csv";

                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls11;
                
                HttpWebRequest request = (HttpWebRequest)WebRequest.Create(activeBoUrl);
                request.Timeout = 4000;
                request.Method = "GET";
                request.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Microsoft Enterprise DotNet Client)";

                using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                {
                    if (response.StatusCode == HttpStatusCode.OK)
                    {
                        using (Stream stream = response.GetResponseStream())
                        using (StreamReader reader = new StreamReader(stream))
                        {
                            string csvContent = reader.ReadToEnd();
                            string[] lines = csvContent.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries);
                            if (lines.Length > 1)
                            {
                                string[] header = lines[0].Split(',');
                                int baseCurrencyIdx = Array.IndexOf(header, "BASE_CURRENCY");
                                int unitMultIdx = Array.IndexOf(header, "UNIT_MULT");
                                int obsValueIdx = Array.IndexOf(header, "OBS_VALUE");

                                if (baseCurrencyIdx != -1 && obsValueIdx != -1)
                                {
                                    for (int i = 1; i < lines.Length; i++)
                                    {
                                        string[] columns = lines[i].Split(',');
                                        if (columns.Length > Math.Max(baseCurrencyIdx, obsValueIdx))
                                        {
                                            string code = columns[baseCurrencyIdx].Trim().ToUpper();
                                            string rateStr = columns[obsValueIdx].Trim();
                                            string unitMultStr = unitMultIdx != -1 ? columns[unitMultIdx].Trim() : "0";

                                            double.TryParse(rateStr, NumberStyles.Any, CultureInfo.InvariantCulture, out double rateVal);
                                            int.TryParse(unitMultStr, out int unitMult);
                                            int unit = (int)Math.Pow(10, unitMult);

                                            string nameHe = MapHebrewCurrencyName(code);
                                            string nameEn = MapEnglishCurrencyName(code);

                                            list.Add(new CurrencyRateDto
                                            {
                                                CurrencyCode = code,
                                                HeName = nameHe,
                                                EnName = nameEn,
                                                Unit = unit,
                                                ExchangeRate = rateVal,
                                                Trend = 0,
                                                TrendPercent = 0
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                errorDetails = "שגיאת רשת/CSV: " + ex.Message;
                return null;
            }

            return list;
        }

        private static string MapHebrewCurrencyName(string code)
        {
            switch (code.ToUpper())
            {
                case "USD": return "דולר ארה\"ב";
                case "EUR": return "אירו";
                case "GBP": return "ליש\"ט";
                case "JPY": return "יין יפני (מאה יחידות)";
                case "CHF": return "פרנק שוויצרי";
                case "CAD": return "דולר קנדי";
                case "AUD": return "דולר אוסטרלי";
                case "SEK": return "כתר שוודי";
                case "NOK": return "כתר נורווגי";
                case "DKK": return "כתר דני";
                case "ZAR": return "ראנד דרום אפריקאי";
                default: return code;
            }
        }

        #endregion

        #region Database Adapter Layer (SQL Server Caching)

        /// <summary>
        /// Reads cached rates directly from local Warehouse Database Cache
        /// </summary>
        private static List<CurrencyRateDto> GetRatesFromLocalDBCache(DateTime date)
        {
            List<CurrencyRateDto> list = new List<CurrencyRateDto>();
            string connectionString = ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"]?.ConnectionString;

            if (string.IsNullOrEmpty(connectionString)) return null;

            try
            {
                using (NpgsqlConnection conn = new NpgsqlConnection(connectionString))
                {
                    using (NpgsqlCommand cmd = new NpgsqlCommand("SELECT * FROM get_financial_rates_by_date(@TargetDate)", conn))
                    {
                        cmd.CommandType = CommandType.Text;
                        cmd.Parameters.AddWithValue("@TargetDate", date.Date);

                        conn.Open();
                        using (NpgsqlDataReader reader = cmd.ExecuteReader())
                        {
                            while (reader.Read())
                            {
                                list.Add(new CurrencyRateDto
                                {
                                    CurrencyCode = reader["currency_code"].ToString(),
                                    HeName = reader["currency_name_he"].ToString(),
                                    EnName = reader["currency_name_en"].ToString(),
                                    Unit = Convert.ToInt32(reader["unit"]),
                                    ExchangeRate = Convert.ToDouble(reader["exchange_rate"]),
                                    Trend = Convert.ToDouble(reader["last_trend"]),
                                    TrendPercent = Convert.ToDouble(reader["trend_percent"])
                                });
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                // Fail silently in development, or log to local diagnostics trace file
                System.Diagnostics.Trace.WriteLine("Cache Fetch Failure: " + ex.Message);
                return null;
            }

            return list;
        }

        /// <summary>
        /// Saves (Merges) recently requested rates array deep into secure SQL cache table
        /// </summary>
        private static void SaveRatesToLocalDBCache(DateTime date, List<CurrencyRateDto> rates)
        {
            string connectionString = ConfigurationManager.ConnectionStrings["WarehouseRequestsDBConnectionString"]?.ConnectionString;

            if (string.IsNullOrEmpty(connectionString) || rates == null || rates.Count == 0) return;

            try
            {
                using (NpgsqlConnection conn = new NpgsqlConnection(connectionString))
                {
                    conn.Open();

                    foreach (var rate in rates)
                    {
                        using (NpgsqlCommand cmd = new NpgsqlCommand("SELECT upsert_financial_rate(@RateDate, @CurrencyCode, @CurrencyNameHe, @CurrencyNameEn, @Unit, @ExchangeRate, @LastTrend, @TrendPercent)", conn))
                        {
                            cmd.CommandType = CommandType.Text;
                            cmd.Parameters.AddWithValue("@RateDate", date.Date);
                            cmd.Parameters.AddWithValue("@CurrencyCode", rate.CurrencyCode);
                            cmd.Parameters.AddWithValue("@CurrencyNameHe", rate.HeName);
                            cmd.Parameters.AddWithValue("@CurrencyNameEn", rate.EnName);
                            cmd.Parameters.AddWithValue("@Unit", rate.Unit);
                            cmd.Parameters.AddWithValue("@ExchangeRate", rate.ExchangeRate);
                            cmd.Parameters.AddWithValue("@LastTrend", rate.Trend);
                            cmd.Parameters.AddWithValue("@TrendPercent", rate.TrendPercent);

                            cmd.ExecuteNonQuery();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Trace.WriteLine("SQL Caching update failure: " + ex.Message);
            }
        }

        #endregion

        #region Helper Methods (All Simulation Generators Removed)

        private static string MapEnglishCurrencyName(string code)
        {
            switch (code.ToUpper())
            {
                case "USD": return "US Dollar";
                case "EUR": return "Euro";
                case "GBP": return "British Pound";
                case "JPY": return "Japanese Yen";
                case "CAD": return "Canadian Dollar";
                case "AUD": return "Australian Dollar";
                case "CHF": return "Swiss Franc";
                case "RUB": return "Russian Ruble";
                default: return "International Currency";
            }
        }

        #endregion
    }

    #region Diagnostic DTO Contracts

    public class CurrencyRateDto
    {
        public string CurrencyCode { get; set; }
        public string HeName { get; set; }
        public string EnName { get; set; }
        public int Unit { get; set; }
        public double ExchangeRate { get; set; }
        public double Trend { get; set; }
        public double TrendPercent { get; set; }
    }

    public class AjaxRatesResponse
    {
        public bool Success { get; set; }
        public string ErrorMessage { get; set; }
        public List<CurrencyRateDto> Rates { get; set; }
        public string ReportDateDisplay { get; set; }
        public string FetchTimestamp { get; set; }
    }

    #endregion
}
