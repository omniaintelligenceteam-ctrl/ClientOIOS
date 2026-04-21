'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Upload,
  X,
  ChevronRight,
  Check,
  AlertTriangle,
  FileText,
  Loader2,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OIOSField = 'customer_name' | 'email' | 'phone' | 'address' | 'notes'

const OIOS_FIELDS: { value: OIOSField | ''; label: string; required?: boolean }[] = [
  { value: 'customer_name', label: 'Customer Name', required: true },
  { value: 'email',         label: 'Email' },
  { value: 'phone',         label: 'Phone' },
  { value: 'address',       label: 'Address' },
  { value: 'notes',         label: 'Notes' },
  { value: '',              label: '— Skip column —' },
]

// Attempt to auto-detect common header names
const AUTO_DETECT: Record<string, OIOSField> = {
  name:          'customer_name',
  'full name':   'customer_name',
  fullname:      'customer_name',
  customer:      'customer_name',
  'customer name':'customer_name',
  contact:       'customer_name',
  email:         'email',
  'email address':'email',
  phone:         'phone',
  'phone number':'phone',
  mobile:        'phone',
  cell:          'phone',
  telephone:     'phone',
  address:       'address',
  'street address':'address',
  location:      'address',
  notes:         'notes',
  note:          'notes',
  comments:      'notes',
  comment:       'notes',
}

function autoDetectField(header: string): OIOSField | '' {
  return AUTO_DETECT[header.toLowerCase().trim()] ?? ''
}

// ---------------------------------------------------------------------------
// Step indicators
// ---------------------------------------------------------------------------

const STEPS = ['Upload', 'Map Columns', 'Preview', 'Import']

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done    = i < current
        const active  = i === current
        const isLast  = i === STEPS.length - 1
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${done   ? 'bg-[#2DD4BF] text-[#0B1120]' : ''}
                  ${active ? 'bg-[#2DD4BF]/20 border-2 border-[#2DD4BF] text-[#2DD4BF]' : ''}
                  ${!done && !active ? 'bg-[rgba(148,163,184,0.08)] text-slate-500 border border-[rgba(148,163,184,0.15)]' : ''}
                `}
              >
                {done ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-medium whitespace-nowrap
                  ${active ? 'text-[#2DD4BF]' : done ? 'text-slate-400' : 'text-slate-600'}
                `}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <div
                className={`flex-1 h-px mx-2 mb-3.5 transition-colors
                  ${done ? 'bg-[#2DD4BF]/40' : 'bg-[rgba(148,163,184,0.12)]'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 1 — Upload
// ---------------------------------------------------------------------------

interface UploadStepProps {
  onParsed: (headers: string[], rows: string[][]) => void
}

function UploadStep({ onParsed }: UploadStepProps) {
  const [dragging, setDragging] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function parseCSV(text: string): { headers: string[]; rows: string[][] } | null {
    const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
    if (lines.length < 2) return null
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    const rows    = lines.slice(1).map((line) =>
      line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    )
    return { headers, rows }
  }

  function handleFile(file: File) {
    setError(null)
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const result = parseCSV(text)
      if (!result || result.headers.length === 0) {
        setError('Could not parse CSV. Make sure the file has headers and at least one data row.')
        return
      }
      onParsed(result.headers, result.rows)
    }
    reader.onerror = () => setError('Failed to read file.')
    reader.readAsText(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
     
  }, [])

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-4 cursor-pointer transition-colors
          ${dragging
            ? 'border-[#2DD4BF] bg-[rgba(45,212,191,0.06)]'
            : 'border-[rgba(148,163,184,0.2)] hover:border-[rgba(45,212,191,0.4)] hover:bg-[rgba(45,212,191,0.03)]'
          }
        `}
      >
        <div className="w-14 h-14 rounded-2xl bg-[rgba(148,163,184,0.06)] flex items-center justify-center">
          <Upload className="w-7 h-7 text-slate-500" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300">
            Drag & drop a CSV file here, or{' '}
            <span className="text-[#2DD4BF] underline underline-offset-2">browse</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">Accepts .csv files only</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Column Mapping
// ---------------------------------------------------------------------------

interface MappingStepProps {
  headers: string[]
  mapping: Record<string, OIOSField | ''>
  onChange: (mapping: Record<string, OIOSField | ''>) => void
  error: string | null
}

function MappingStep({ headers, mapping, onChange, error }: MappingStepProps) {
  function setField(header: string, value: OIOSField | '') {
    onChange({ ...mapping, [header]: value })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Map each CSV column to an OIOS field. <span className="text-slate-300 font-medium">Customer Name is required.</span>
      </p>

      <div className="divide-y divide-[rgba(148,163,184,0.08)] rounded-xl border border-[rgba(148,163,184,0.1)] overflow-hidden">
        {headers.map((header) => (
          <div
            key={header}
            className="flex items-center justify-between gap-4 px-4 py-3 bg-[rgba(148,163,184,0.02)]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="text-sm text-slate-300 truncate font-mono">{header}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
            <select
              value={mapping[header] ?? ''}
              onChange={(e) => setField(header, e.target.value as OIOSField | '')}
              className="text-sm bg-[#0B1120] border border-[rgba(148,163,184,0.15)] text-slate-200 rounded-lg px-3 py-1.5 w-44 focus:outline-none focus:border-[#2DD4BF] transition-colors"
            >
              {OIOS_FIELDS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Preview
// ---------------------------------------------------------------------------

interface PreviewStepProps {
  headers: string[]
  rows: string[][]
  mapping: Record<string, OIOSField | ''>
}

function PreviewStep({ headers, rows, mapping }: PreviewStepProps) {
  const mappedFields = Object.entries(mapping)
    .filter(([, v]) => v !== '')
    .map(([header, field]) => ({ header, field, colIndex: headers.indexOf(header) }))

  const preview = rows.slice(0, 5)

  function isMissingRequired(row: string[]): boolean {
    const nameEntry = Object.entries(mapping).find(([, v]) => v === 'customer_name')
    if (!nameEntry) return true
    const colIdx = headers.indexOf(nameEntry[0])
    return !row[colIdx]?.trim()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          Showing first <span className="text-slate-300 font-medium">{preview.length}</span> of{' '}
          <span className="text-slate-300 font-medium">{rows.length}</span> rows.
        </p>
        {rows.filter(isMissingRequired).length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            {rows.filter(isMissingRequired).length} row(s) missing name
          </div>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[rgba(148,163,184,0.1)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[rgba(148,163,184,0.1)]">
              {mappedFields.map(({ field }) => (
                <th
                  key={field}
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 bg-[rgba(148,163,184,0.04)]"
                >
                  {field === 'customer_name' ? 'Name *' : field}
                </th>
              ))}
              <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 bg-[rgba(148,163,184,0.04)]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row, i) => {
              const missing = isMissingRequired(row)
              return (
                <tr
                  key={i}
                  className={`border-b border-[rgba(148,163,184,0.06)] last:border-0
                    ${missing ? 'bg-red-500/5' : 'bg-transparent'}`}
                >
                  {mappedFields.map(({ field, colIndex }) => (
                    <td key={field} className="px-4 py-2.5 text-slate-300 max-w-[160px] truncate">
                      {row[colIndex] ?? '—'}
                    </td>
                  ))}
                  <td className="px-4 py-2.5">
                    {missing ? (
                      <span className="text-xs text-red-400 font-medium">Missing name</span>
                    ) : (
                      <span className="text-xs text-[#2DD4BF] font-medium">Ready</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step 4 — Import
// ---------------------------------------------------------------------------

interface ImportStepProps {
  organizationId: string
  headers: string[]
  rows: string[][]
  mapping: Record<string, OIOSField | ''>
  onComplete: () => void
}

function ImportStep({ organizationId, headers, rows, mapping, onComplete }: ImportStepProps) {
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult]   = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)

  // Build column-index mapping: OIOSField -> column index
  const fieldToIndex: Record<string, number> = {}
  for (const [header, field] of Object.entries(mapping)) {
    if (field !== '') {
      fieldToIndex[field] = headers.indexOf(header)
    }
  }

  async function runImport() {
    setStatus('loading')
    setProgress(10)
    setApiError(null)

    // Simulate slight progress ramp
    const rampTimer = setInterval(() => {
      setProgress((p) => (p < 85 ? p + 5 : p))
    }, 200)

    try {
      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows,
          headers,
          mapping: fieldToIndex,
          organizationId,
        }),
      })

      clearInterval(rampTimer)
      setProgress(100)

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json()
      setResult(data)
      setStatus('done')
    } catch (err) {
      clearInterval(rampTimer)
      setProgress(0)
      setApiError(err instanceof Error ? err.message : 'Unknown error')
      setStatus('error')
    }
  }

  // Auto-start import on mount
  useEffect(() => {
    runImport()
     
  }, [])

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      {status === 'loading' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#2DD4BF]" />
            Importing {rows.length} customers…
          </div>
          <div className="w-full bg-[rgba(148,163,184,0.1)] rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-[#2DD4BF] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success */}
      {status === 'done' && result && (
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <div className="w-14 h-14 rounded-full bg-[rgba(45,212,191,0.12)] flex items-center justify-center">
            <Check className="w-7 h-7 text-[#2DD4BF]" />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-200">Import complete</p>
            <p className="text-sm text-slate-400 mt-1">
              <span className="text-[#2DD4BF] font-medium">{result.imported}</span> customers imported
              {result.skipped > 0 && (
                <>, <span className="text-slate-300 font-medium">{result.skipped}</span> skipped (duplicates)</>
              )}
            </p>
          </div>

          {result.errors.length > 0 && (
            <div className="w-full text-left rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                {result.errors.length} row error(s)
              </p>
              <ul className="space-y-1">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i} className="text-xs text-amber-300">{e}</li>
                ))}
                {result.errors.length > 5 && (
                  <li className="text-xs text-slate-500">…and {result.errors.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          <button
            type="button"
            onClick={onComplete}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0B1120] text-sm font-semibold px-6 py-2.5 transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-300">{apiError}</span>
          </div>
          <button
            type="button"
            onClick={runImport}
            className="text-sm text-[#2DD4BF] hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Wizard
// ---------------------------------------------------------------------------

interface CustomerImportWizardProps {
  organizationId: string
  open: boolean
  onClose: () => void
  onComplete: () => void
}

export function CustomerImportWizard({
  organizationId,
  open,
  onClose,
  onComplete,
}: CustomerImportWizardProps) {
  const [step, setStep]       = useState(0)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows]       = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, OIOSField | ''>>({})
  const [mapError, setMapError] = useState<string | null>(null)

  function handleParsed(parsedHeaders: string[], parsedRows: string[][]) {
    setHeaders(parsedHeaders)
    setRows(parsedRows)
    // Auto-detect mapping
    const autoMap: Record<string, OIOSField | ''> = {}
    for (const h of parsedHeaders) {
      autoMap[h] = autoDetectField(h)
    }
    setMapping(autoMap)
    setStep(1)
  }

  function handleMappingNext() {
    const hasName = Object.values(mapping).includes('customer_name')
    if (!hasName) {
      setMapError('You must map at least one column to "Customer Name".')
      return
    }
    setMapError(null)
    setStep(2)
  }

  function handleComplete() {
    onComplete()
    onClose()
    // Reset for next use
    setTimeout(() => {
      setStep(0)
      setHeaders([])
      setRows([])
      setMapping({})
    }, 300)
  }

  function handleClose() {
    onClose()
    setTimeout(() => {
      setStep(0)
      setHeaders([])
      setRows([])
      setMapping({})
    }, 300)
  }

  if (!open) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Card */}
      <div className="w-full max-w-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.06] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[rgba(148,163,184,0.08)]">
          <div>
            <h2 className="text-base font-semibold text-slate-200">Import Customers</h2>
            <p className="text-xs text-slate-500 mt-0.5">Upload a CSV to bulk-add customers to your account</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 hover:bg-[rgba(148,163,184,0.08)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <StepIndicator current={step} />

          {step === 0 && <UploadStep onParsed={handleParsed} />}

          {step === 1 && (
            <MappingStep
              headers={headers}
              mapping={mapping}
              onChange={(m) => { setMapping(m); setMapError(null) }}
              error={mapError}
            />
          )}

          {step === 2 && (
            <PreviewStep
              headers={headers}
              rows={rows}
              mapping={mapping}
            />
          )}

          {step === 3 && (
            <ImportStep
              organizationId={organizationId}
              headers={headers}
              rows={rows}
              mapping={mapping}
              onComplete={handleComplete}
            />
          )}
        </div>

        {/* Footer — only show nav buttons for steps 1 & 2 */}
        {(step === 1 || step === 2) && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[rgba(148,163,184,0.08)]">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={step === 1 ? handleMappingNext : () => setStep(3)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0B1120] text-sm font-semibold px-5 py-2 transition-colors"
            >
              {step === 2 ? 'Start Import' : 'Next'}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
