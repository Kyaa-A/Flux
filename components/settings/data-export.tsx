"use client";

import { useState } from "react";
import { exportUserData, exportTransactionsCSV } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Loader2, FileJson, FileSpreadsheet } from "lucide-react";

export function DataExport() {
  const [isLoadingJson, setIsLoadingJson] = useState(false);
  const [isLoadingCsv, setIsLoadingCsv] = useState(false);

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
      const csv = await exportTransactionsCSV();

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
      <Button onClick={handleExportCsv} disabled={isLoadingCsv} variant="outline">
        {isLoadingCsv ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Export CSV
      </Button>
    </div>
  );
}
