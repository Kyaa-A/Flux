"use client";

import { useState } from "react";
import { exportUserData, exportTransactionsCSV } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Loader2, FileJson, FileSpreadsheet, FileText } from "lucide-react";
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
      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);
      const data = await exportUserData();
      const tx = data.transactions.slice(0, 500);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 86, "F");

      try {
        const logoBlob = await fetch(`${window.location.origin}/flux.png`).then((r) => r.blob());
        const logoDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(logoBlob);
        });
        doc.addImage(logoDataUrl, "PNG", 36, 24, 28, 28);
      } catch {
        // Logo is optional during export; continue if unavailable.
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Flux Financial Report", 74, 44);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 36, 36, { align: "right" });
      doc.text(`User: ${data.user?.email || "Unknown"}`, pageWidth - 36, 52, { align: "right" });

      const cardY = 102;
      const cardW = (pageWidth - 36 * 2 - 16 * 2) / 3;
      const cards = [
        { label: "Transactions", value: String(tx.length) },
        { label: "Wallets", value: String(data.wallets.length) },
        { label: "Categories", value: String(data.categories.length) },
      ];

      cards.forEach((card, i) => {
        const x = 36 + i * (cardW + 16);
        doc.setDrawColor(203, 213, 225);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, cardY, cardW, 52, 8, 8, "FD");
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(9);
        doc.text(card.label.toUpperCase(), x + 10, cardY + 18);
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(card.value, x + 10, cardY + 38);
      });

      autoTable(doc, {
        startY: 172,
        head: [["Date", "Type", "Amount", "Category", "Wallet", "Description"]],
        body: tx.map((t) => [
          new Date(t.date).toLocaleDateString(),
          t.type,
          Number(t.amount).toFixed(2),
          t.category,
          t.wallet,
          t.description || "",
        ]),
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 5, lineColor: [226, 232, 240] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          2: { halign: "right", cellWidth: 64 },
          0: { cellWidth: 66 },
          1: { cellWidth: 58 },
        },
        margin: { left: 36, right: 36 },
      });

      doc.save(`flux-report-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF exported");
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
      <Button onClick={handleExportCsv} disabled={isLoadingCsv} variant="outline" className="w-full sm:w-auto">
        {isLoadingCsv ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Export CSV
      </Button>

      <div className="border-t pt-6" />

      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Export Professional Report (PDF)</p>
          <p className="text-sm text-muted-foreground">
            Download a branded PDF report with a styled header, logo, summary cards,
            and detailed transaction table.
          </p>
        </div>
      </div>
      <Button onClick={handleExportPdf} disabled={isLoadingPdf} variant="outline" className="w-full sm:w-auto">
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
