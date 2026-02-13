"use client";

import { useState } from "react";
import { exportUserData, exportTransactionsCSV } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Loader2, FileJson, FileSpreadsheet } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type CsvRangePreset = "all" | "last30" | "last365" | "custom";

export function DataExport() {
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [csvRange, setCsvRange] = useState<CsvRangePreset>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handleExportJson = async () => {
    setIsLoadingJson(true);
    try {
      const data = await exportUserData();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flux-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Data exported as JSON");
    } catch {
      toast.error("Failed to export data");
    } finally {
      setIsLoadingJson(false);
    }
  };

  const handleExportCsv = async () => {
    setIsLoadingCsv(true);
    try {
      let dateRange: { from?: Date; to?: Date } | undefined;
      const now = new Date();

      if (csvRange === "last30") {
        dateRange = { from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      } else if (csvRange === "last365") {
        dateRange = { from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
      } else if (csvRange === "custom") {
        const from = fromDate ? new Date(fromDate) : undefined;
        const to = toDate ? new Date(toDate) : undefined;
        if (!from && !to) {
          toast.error("Please choose at least one custom date");
          return;
        }
        if (from && to && from > to) {
          toast.error("From date must be before to date");
          return;
        }
        dateRange = { from, to };
      }

      const csv = await exportTransactionsCSV(dateRange);

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flux-transactions-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Transactions exported as CSV");
    } catch {
      toast.error("Failed to export CSV");
    } finally {
      setIsLoadingCsv(false);
    }
  };

  const handleExportPdf = async () => {
    setIsLoadingPdf(true);
    try {
      const data = await exportUserData();
      const tx = data.transactions.slice(0, 500);
      const rows = tx
        .map(
          (t) => `
            <tr>
              <td>${new Date(t.date).toLocaleDateString()}</td>
              <td>${t.type}</td>
              <td>${Number(t.amount).toFixed(2)}</td>
              <td>${t.category}</td>
              <td>${t.wallet}</td>
              <td>${t.description || ""}</td>
            </tr>
          `
        )
        .join("");
      const logoUrl = `${window.location.origin}/flux.png`;

      const html = `
        <html>
          <head>
            <title>Flux Report</title>
            <style>
              @page { size: A4; margin: 18mm; }
              body { font-family: "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; }
              .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px; }
              .brand { display: flex; align-items: center; gap: 10px; }
              .brand img { width: 30px; height: 30px; object-fit: contain; }
              .brand h1 { font-size: 20px; margin: 0; letter-spacing: 0.2px; }
              .meta { text-align: right; font-size: 12px; color: #475569; line-height: 1.5; }
              .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
              .summary .item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; }
              .summary .label { font-size: 11px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
              .summary .value { font-size: 14px; font-weight: 600; color: #0f172a; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: fixed; }
              th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 11px; text-align: left; vertical-align: top; }
              th { background: #f1f5f9; color: #0f172a; font-weight: 700; }
              tbody tr:nth-child(even) { background: #fcfdff; }
              td:nth-child(3), th:nth-child(3) { text-align: right; width: 90px; }
              .footer { margin-top: 12px; font-size: 10px; color: #64748b; text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">
                <img src="${logoUrl}" alt="Flux" />
                <h1>Flux Financial Report</h1>
              </div>
              <div class="meta">
                <div>Generated: ${new Date().toLocaleString()}</div>
                <div>User: ${data.user?.email || "Unknown"}</div>
              </div>
            </div>
            <div class="summary">
              <div class="item">
                <div class="label">Transactions</div>
                <div class="value">${tx.length}</div>
              </div>
              <div class="item">
                <div class="label">Wallets</div>
                <div class="value">${data.wallets.length}</div>
              </div>
              <div class="item">
                <div class="label">Categories</div>
                <div class="value">${data.categories.length}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Wallet</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            <div class="footer">Flux • Personal Finance Tracker</div>
          </body>
        </html>
      `;

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Popup blocked. Please allow popups to export PDF.");
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      toast.success("Print dialog opened. Choose Save as PDF.");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setIsLoadingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
        <FileJson className="h-8 w-8 text-muted-foreground shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Export All Data (JSON)</p>
          <p className="text-sm text-muted-foreground">
            Download all your financial data including wallets, categories, and transactions
            as a JSON file for backup or migration.
          </p>
        </div>
      </div>
      <Button onClick={handleExportJson} disabled={isLoadingJson}>
        {isLoadingJson ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Export JSON
      </Button>

      <div className="border-t pt-6" />

      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
        <FileSpreadsheet className="h-8 w-8 text-muted-foreground shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Export Transactions (CSV)</p>
          <p className="text-sm text-muted-foreground">
            Download your transactions as a CSV file that you can open in Excel,
            Google Sheets, or other spreadsheet applications.
          </p>
        </div>
      </div>
      <div className="space-y-3 rounded-lg border p-4">
        <p className="text-sm font-medium">Date range</p>
        <Select value={csvRange} onValueChange={(v) => setCsvRange(v as CsvRangePreset)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="last30">Last 30 days</SelectItem>
            <SelectItem value="last365">Last 12 months</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
        {csvRange === "custom" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
        )}
      </div>
      <Button onClick={handleExportCsv} disabled={isLoadingCsv} variant="outline">
        {isLoadingCsv ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Export CSV
      </Button>

      <Button onClick={handleExportPdf} disabled={isLoadingPdf} variant="outline">
        {isLoadingPdf ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Export PDF
      </Button>
    </div>
  );
}
