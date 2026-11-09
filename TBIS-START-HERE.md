# TBIS — Start Here

This is the Transsion Branch Intelligence System prototype for Carlcare Islamabad.

## Where the dashboard lives

- Branch: `build/tbis-excel-mvp`
- Dashboard: `tbis-mvp.html`
- Main application: `main/index.html` (not changed by TBIS work)

## Open the dashboard

1. Open `tbis-mvp.html` from this branch, or use the GitHub Pages link after deployment is enabled.
2. Click **Import CRM reports** and select one or more CRM job-sheet files.
3. TBIS reads the file content to identify Excel workbooks or delimited text. It does not trust the file extension alone.
4. Set the Shop, period start/end, daily report date and as-of time.
5. Review the KPI cards, job exceptions, data-quality checks and missing-source warnings.
6. Click **Export management pack** to create an Excel workbook with daily, weekly, monthly, KPI, PO, model, part, safe job-register and data-quality sheets.

You can add an inventory report separately. TBIS looks for material-code and available-quantity columns. A positive stock quantity is only a current stock review signal; it does not prove historical stock existed when a PO was raised.

## Combining multiple CRM reports

Select multiple reports in one import. TBIS sorts selected files by their local file-modified time. If the same JS No appears in more than one report, the version in the newest selected file is used for consolidated totals. Repeated IDs are still shown in the import diagnostics. Duplicate rows inside a single file are preserved and block the official management workbook export until reviewed.

For best results, use a consistent set of reports and confirm that their file-modified dates reflect the snapshot order. The system does not upload report contents to a server and does not keep the CRM rows after the browser page is closed.

## KPI interpretation

- Job identity is **JS No**.
- Repair TAT is elapsed time from **Created On** to **Repair Complete Date**.
- A negative duration is invalid; a missing timestamp means TAT is unknown.
- The 1-hour KPI applies to Smartphone jobs received through Carry In or Online. The current report's `Is Shortage = No` is used only as a parts-availability proxy. A stock file or validated stock-availability field is needed for official stock-conditioned compliance.
- The 2-hour PO KPI applies to Smartphone shortage cases across Carry In, Express and Online. The first available PO/AP date is compared with Created On. Missing PO dates are unverified, not assumed to be on time.
- NOPO is a separate 24-hour rule. A job is a NOPO miss when neither a PO nor a repair completion is recorded within 24 hours. Missing event timestamps are shown as unverified.
- The 3-day cohort includes Smartphone shortage jobs with a PO raised within 2 hours and a repair completion after the first hour. Missing completion dates remain unknown.
- PO Rate counts a job once when any PO/AP Code or Date field is populated.
- Out-warranty revenue uses the CRM `TotalReceiveAmount` field. Confirm with Finance that this is the approved revenue measure for the branch target.
- `Returned`, `Closed` and `Repair Completed` statuses are treated as completed. They do not provide a precise duration when Repair Complete Date is missing.

## Data not proven by the CRM job sheet

Customer satisfaction, customer delivery / Ready for Delivery ageing, Bounce, online-reservation conversion denominator, and historical stock-at-PO-time require separate source reports. TBIS intentionally shows these as unavailable instead of inventing values. Technician identity and customer/device identifiers are excluded from visible job tables and management exports.

## Privacy and dependencies

- CRM files are processed in the local browser; report rows are not uploaded.
- XLS/XLSX reading and Excel workbook export use SheetJS from jsDelivr CDN and need internet access. Text imports do not need the Excel library.
- Visible tables and exported job registers omit customer names, phone numbers, IMEI/SN values and technician personal details.

## Static hosting

The workflow `.github/workflows/deploy-tbis-pages.yml` publishes this dashboard as the Pages site's `index.html` when GitHub Pages is configured to use **GitHub Actions**. This is static hosting: each manager processes their own files in their own browser. It is not yet a shared server database or multi-user application.
