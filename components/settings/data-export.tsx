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

      const html = `
        <html>
          <head>
            <title>Flux Report</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 24px; color: #111; }
              h1 { margin: 0 0 8px; font-size: 22px; }
              p { margin: 4px 0; color: #444; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
              th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
              th { background: #f5f5f5; }
            </style>
          </head>
          <body>
            <h1>Flux Financial Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <p>User: ${data.user?.email || "Unknown"}</p>
            <p>Transactions included: ${tx.length}</p>
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
