/**
 * POC demo state: audit trail, approvals, versioning (in-memory for pre-PO demo).
 */

export interface AuditEntry {
  id: string
  recordId: string
  recordType: string
  action: 'Created' | 'Approved' | 'Revised'
  createdBy: string
  approvedBy?: string
  timestamp: string
  meaning?: string
  version?: number
}

export interface SignedRecord {
  recordId: string
  recordType: string
  signedBy: string
  signedAt: string
  meaning: string
  version?: number
}

const auditKey = 'poc-audit-entries'
const signedKey = 'poc-signed-records'

function loadAudit(): AuditEntry[] {
  if (import.meta.client) {
    try {
      const s = localStorage.getItem(auditKey)
      if (s) return JSON.parse(s)
    } catch {}
  }
  return []
}

function saveAudit(entries: AuditEntry[]) {
  if (import.meta.client) localStorage.setItem(auditKey, JSON.stringify(entries))
}

export function usePocDemo() {
  const auditEntries = useState<AuditEntry[]>('poc-audit', () => [])

  function initAuditFromStorage() {
    if (import.meta.client) {
      const loaded = loadAudit()
      if (loaded.length) auditEntries.value = loaded
    }
  }

  function addAudit(entry: Omit<AuditEntry, 'id'>) {
    const newEntry: AuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }
    auditEntries.value = [newEntry, ...auditEntries.value]
    saveAudit(auditEntries.value)
    return newEntry
  }

  function getAuditForRecord(recordId: string) {
    return auditEntries.value.filter((e) => e.recordId === recordId)
  }

  return { auditEntries, addAudit, getAuditForRecord, initAuditFromStorage }
}

export function useSignedRecords() {
  const signed = useState<SignedRecord[]>('poc-signed', () => [])

  function initSignedFromStorage() {
    if (import.meta.client) {
      try {
        const s = localStorage.getItem(signedKey)
        if (s) {
          const parsed = JSON.parse(s)
          if (Array.isArray(parsed) && parsed.length) signed.value = parsed
        }
      } catch {}
    }
  }

  function addSignature(record: SignedRecord) {
    signed.value = [record, ...signed.value]
    if (import.meta.client) localStorage.setItem(signedKey, JSON.stringify(signed.value))
  }

  function getSignaturesForRecord(recordId: string) {
    return signed.value.filter((s) => s.recordId === recordId)
  }

  return { signedRecords: signed, addSignature, getSignaturesForRecord, initSignedFromStorage }
}
