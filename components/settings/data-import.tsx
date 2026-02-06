"use client";

import { useState, useRef } from "react";
import { importTransactionsCSV } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Loader2, FileSpreadsheet, X, Check, AlertCircle } from "lucide-react";

interface ParsedRow {
  date: string;
  type: string;
  amount: number;
  category: string;
  wallet: string;
  description: string;
}

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);

  return { headers, rows };
}

const EXPECTED_HEADERS = ["Date", "Type", "Amount", "Category", "Wallet", "Description"];

export function DataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const { headers, rows } = parseCSV(text);

      setCsvHeaders(headers);

      // Auto-map columns by matching header names
      const mapping: Record<string, number> = {};
      for (const expected of EXPECTED_HEADERS) {
        const idx = headers.findIndex(
          (h) => h.toLowerCase() === expected.toLowerCase()
        );
        if (idx !== -1) mapping[expected] = idx;
      }
      setColumnMapping(mapping);

      // Parse rows using detected mapping
      const parsed = rows.map((row) => ({
        date: row[mapping["Date"] ?? -1] || "",
        type: row[mapping["Type"] ?? -1] || "",
        amount: parseFloat(row[mapping["Amount"] ?? -1] || "0"),
        category: row[mapping["Category"] ?? -1] || "",
        wallet: row[mapping["Wallet"] ?? -1] || "",
        description: row[mapping["Description"] ?? -1] || "",
      }));

      setTotalRows(parsed.length);
      setPreview(parsed.slice(0, 5));
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    try {
      const text = await file.text();
      const { rows } = parseCSV(text);

      const parsed = rows.map((row) => ({
        date: row[columnMapping["Date"] ?? -1] || "",
        type: row[columnMapping["Type"] ?? -1] || "",
        amount: parseFloat(row[columnMapping["Amount"] ?? -1] || "0"),
        category: row[columnMapping["Category"] ?? -1] || "",
        wallet: row[columnMapping["Wallet"] ?? -1] || "",
        description: row[columnMapping["Description"] ?? -1] || "",
      }));

      const result = await importTransactionsCSV(parsed);
      toast.success(
        `Imported ${result.imported} transactions${result.skipped > 0 ? `, ${result.skipped} skipped` : ""}`
      );
      handleClear();
    } catch {
      toast.error("Failed to import transactions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview([]);
    setTotalRows(0);
    setColumnMapping({});
    setCsvHeaders([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const mappedCount = Object.keys(columnMapping).length;
  const requiredMapped = ["Date", "Type", "Amount", "Category", "Wallet"].every(
    (key) => key in columnMapping
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
        <FileSpreadsheet className="h-8 w-8 text-muted-foreground shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">Import Transactions (CSV)</p>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with columns: Date, Type (INCOME/EXPENSE), Amount,
            Category, Wallet, Description. Missing categories and wallets will be
            created automatically.
          </p>
        </div>
      </div>

      {!file ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Select CSV File
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* File info */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{file.name}</span>
              <Badge variant="secondary">{totalRows} rows</Badge>
              <Badge variant={requiredMapped ? "default" : "destructive"}>
                {mappedCount}/{EXPECTED_HEADERS.length} columns mapped
              </Badge>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Column mapping status */}
          {csvHeaders.length > 0 && !requiredMapped && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Column mapping incomplete
                </p>
                <p className="text-amber-700 dark:text-amber-300">
                  CSV headers: {csvHeaders.join(", ")}. Expected: Date, Type, Amount, Category, Wallet.
                  Make sure your CSV has matching column headers.
                </p>
              </div>
            </div>
          )}

          {/* Preview table */}
          {preview.length > 0 && requiredMapped && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Wallet</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="px-3 py-2">{row.date}</td>
                          <td className="px-3 py-2">
                            <Badge variant={row.type.toUpperCase() === "INCOME" ? "default" : "secondary"}>
                              {row.type}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{row.amount.toFixed(2)}</td>
                          <td className="px-3 py-2">{row.category}</td>
                          <td className="px-3 py-2">{row.wallet}</td>
                          <td className="px-3 py-2 text-muted-foreground">{row.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalRows > 5 && (
                  <p className="text-xs text-muted-foreground text-center py-2 border-t">
                    Showing 5 of {totalRows} rows
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Import button */}
          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={isLoading || !requiredMapped || totalRows === 0}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Import {totalRows} Transactions
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isLoading}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
