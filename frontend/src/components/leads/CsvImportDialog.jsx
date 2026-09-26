import { useState, useMemo } from "react";
import Papa from "papaparse";
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  FileText,
} from "lucide-react";
import { Dialog, Button, Select, Field, Badge, Spinner } from "../ui";
import { leadsApi } from "../../lib/services";
import { currency } from "../../lib/format";
import { toast } from "sonner";

const CRM_FIELDS = [
  { key: "name", label: "Lead Name", required: true },
  { key: "email", label: "Email Address", required: true },
  { key: "company", label: "Company", required: false },
  { key: "phone", label: "Phone Number", required: false },
  { key: "value", label: "Deal Value", required: false },
  { key: "source", label: "Source", required: false },
  { key: "status", label: "Stage", required: false },
];

export function CsvImportDialog({ open, onClose, onImportComplete }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Mapping, 3: Preview, 4: Result
  const [file, setFile] = useState(null);
  const [parsedHeaders, setParsedHeaders] = useState([]);
  const [parsedRows, setParsedRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [resultSummary, setResultSummary] = useState(null);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setMapping({});
    setResultSummary(null);
    setImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Step 1: Handle File Selection & Parse Headers
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      return toast.error("Please select a valid .csv file");
    }

    setFile(selectedFile);
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          return toast.error("The selected CSV file is empty.");
        }
        const headers = results.meta.fields || Object.keys(results.data[0] || {});
        setParsedHeaders(headers);
        setParsedRows(results.data);

        // Auto-match headers by name similarity
        const autoMap = {};
        CRM_FIELDS.forEach((crm) => {
          const matchedHeader = headers.find(
            (h) => h.toLowerCase().trim() === crm.label.toLowerCase() || h.toLowerCase().trim() === crm.key.toLowerCase()
          );
          if (matchedHeader) {
            autoMap[crm.key] = matchedHeader;
          }
        });
        setMapping(autoMap);
        setStep(2);
      },
      error: () => {
        toast.error("Failed to parse CSV file");
      },
    });
  };

  // Step 2 -> Step 3: Mapped Leads preview calculation
  const mappedLeads = useMemo(() => {
    if (step < 3) return [];

    return parsedRows.map((row, idx) => {
      const name = row[mapping.name]?.trim() || "";
      const email = row[mapping.email]?.trim() || "";
      const company = row[mapping.company]?.trim() || "";
      const phone = row[mapping.phone]?.trim() || "";
      const rawValue = row[mapping.value];
      const value = Number(rawValue?.toString().replace(/[^0-9.]/g, "")) || 0;
      const source = row[mapping.source]?.trim() || "Website";
      const status = row[mapping.status]?.trim() || "New";

      const isValidEmail = /^\S+@\S+\.\S+$/.test(email);
      const isValidName = name.length > 0;
      const isValid = isValidName && (email === "" || isValidEmail);

      return {
        _rowIndex: idx + 1,
        name: name || "Unknown Lead",
        email,
        company,
        phone,
        value,
        source,
        status,
        isValid,
        validationError: !isValidName
          ? "Missing Name"
          : !isValidEmail && email !== ""
          ? "Invalid Email"
          : null,
      };
    });
  }, [step, parsedRows, mapping]);

  const validCount = useMemo(() => mappedLeads.filter((l) => l.isValid).length, [mappedLeads]);
  const invalidCount = useMemo(() => mappedLeads.filter((l) => !l.isValid).length, [mappedLeads]);

  // Step 3 -> Step 4: Execute Import API
  const handleExecuteImport = async () => {
    const leadsToSubmit = mappedLeads
      .filter((l) => l.isValid)
      .map(({ _rowIndex, isValid, validationError, ...lead }) => lead);

    if (leadsToSubmit.length === 0) {
      return toast.error("No valid leads to import.");
    }

    setImporting(true);
    try {
      const res = await leadsApi.bulkCreate({ leads: leadsToSubmit });
      setResultSummary({
        importedCount: res.importedCount ?? leadsToSubmit.length,
        skippedCount: res.skippedCount ?? 0,
        message: res.message || "Import completed successfully!",
      });
      setStep(4);
      if (onImportComplete) onImportComplete();
    } catch (err) {
      toast.error(err?.message || "Failed to import leads");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Import Leads via CSV" description="Error-tolerant bulk data ingestion with field mapping">
      <div className="mt-4">
        {/* Step Indicator Bar */}
        <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
          <StepPill number={1} label="Upload" active={step === 1} done={step > 1} />
          <StepPill number={2} label="Map Fields" active={step === 2} done={step > 2} />
          <StepPill number={3} label="Preview" active={step === 3} done={step > 3} />
          <StepPill number={4} label="Summary" active={step === 4} done={step > 4} />
        </div>

        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <div className="py-6 text-center">
            <label className="mx-auto flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface-muted/50 p-8 transition hover:border-brand-400 hover:bg-brand-50/40 cursor-pointer">
              <FileSpreadsheet className="h-10 w-10 text-brand-600 mb-3 animate-bounce" />
              <p className="text-sm font-semibold text-ink">Click or drag & drop a .CSV file</p>
              <p className="mt-1 text-xs text-ink-soft">Supports exported lists from Excel, HubSpot, or Google Sheets</p>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            </label>
          </div>
        )}

        {/* STEP 2: FIELD MAPPING */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl bg-surface-muted p-3 text-xs text-ink-soft">
              Match the column headers from <span className="font-semibold text-ink">{file?.name}</span> to the corresponding RevFlux CRM fields.
            </div>

            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {CRM_FIELDS.map((crm) => (
                <div key={crm.key} className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-ink">
                      {crm.label} {crm.required && <span className="text-rose-500">*</span>}
                    </p>
                    <p className="text-[11px] text-ink-soft">RevFlux Field</p>
                  </div>
                  <div className="w-56">
                    <Select
                      value={mapping[crm.key] || ""}
                      onChange={(e) => setMapping({ ...mapping, [crm.key]: e.target.value })}
                    >
                      <option value="">-- Ignore Field --</option>
                      {parsedHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4 border-t border-line">
              <Button variant="ghost" onClick={resetState}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (!mapping.name || !mapping.email) {
                    return toast.error("Please map both Name and Email fields.");
                  }
                  setStep(3);
                }}
              >
                Continue to Preview <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: PREVIEW & VALIDATION */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-surface-muted p-3 text-xs">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-50 text-emerald-700">✅ {validCount} Valid</Badge>
                {invalidCount > 0 && <Badge className="bg-rose-50 text-rose-700">⚠️ {invalidCount} Invalid/Skipped</Badge>}
              </div>
              <span className="text-ink-soft">Total parsed: {mappedLeads.length} rows</span>
            </div>

            <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-line">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-line bg-surface-muted/60 font-semibold text-ink-soft">
                  <tr>
                    <th className="p-2.5">Row</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Email</th>
                    <th className="p-2.5">Company</th>
                    <th className="p-2.5">Value</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {mappedLeads.slice(0, 15).map((l) => (
                    <tr key={l._rowIndex} className={cn(!l.isValid && "bg-rose-50/50")}>
                      <td className="p-2.5 font-mono text-ink-soft">#{l._rowIndex}</td>
                      <td className="p-2.5 font-medium text-ink">{l.name}</td>
                      <td className="p-2.5 text-ink-soft">{l.email || "—"}</td>
                      <td className="p-2.5 text-ink-soft">{l.company || "—"}</td>
                      <td className="p-2.5 font-semibold text-ink">{currency(l.value)}</td>
                      <td className="p-2.5">
                        {l.isValid ? (
                          <Badge className="bg-emerald-50 text-emerald-700">Valid</Badge>
                        ) : (
                          <Badge className="bg-rose-50 text-rose-700">{l.validationError}</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between pt-4 border-t border-line">
              <Button variant="ghost" onClick={() => setStep(2)}>
                Back to Mapping
              </Button>
              <Button onClick={handleExecuteImport} disabled={importing || validCount === 0}>
                {importing && <Spinner size="sm" />}
                Import {validCount} Leads
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: RESULT SUMMARY */}
        {step === 4 && resultSummary && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-display text-xl font-bold text-ink">Import Completed!</h3>
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
              <div className="rounded-xl bg-surface-muted p-3">
                <p className="text-xs text-ink-soft">Imported</p>
                <p className="text-lg font-bold text-emerald-600">{resultSummary.importedCount}</p>
              </div>
              <div className="rounded-xl bg-surface-muted p-3">
                <p className="text-xs text-ink-soft">Skipped</p>
                <p className="text-lg font-bold text-amber-600">{resultSummary.skippedCount}</p>
              </div>
            </div>
            <p className="text-xs text-ink-soft">{resultSummary.message}</p>
            <div className="pt-4">
              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

function StepPill({ number, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition",
          done
            ? "bg-brand-600 text-white"
            : active
            ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500/30"
            : "bg-surface-muted text-ink-soft"
        )}
      >
        {done ? "✓" : number}
      </div>
      <span className={cn("text-xs font-medium", active ? "text-ink font-bold" : "text-ink-soft")}>
        {label}
      </span>
    </div>
  );
}
