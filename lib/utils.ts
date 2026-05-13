import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { ComplianceStatus, Priority } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatThaiDate(date?: string | Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export function formatThaiDateShort(date?: string | Date | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('th-TH', {
    year: '2-digit', month: 'short', day: 'numeric',
  })
}

export function detectLawType(title: string): string {
  if (title.includes('พระราชบัญญัติ')) return 'พระราชบัญญัติ'
  if (title.includes('พระราชกฤษฎีกา')) return 'พระราชกฤษฎีกา'
  if (title.includes('กฎกระทรวง'))     return 'กฎกระทรวง'
  if (title.includes('ประกาศกระทรวง')) return 'ประกาศกระทรวง'
  if (title.includes('ระเบียบ'))        return 'ระเบียบ'
  return 'ประกาศ'
}

export const COMPLIANCE_CONFIG: Record<
  ComplianceStatus,
  { label: string; badgeClass: string; dotColor: string; percent: number }
> = {
  compliant:      { label: 'ปฏิบัติแล้ว',       badgeClass: 'badge-green',  dotColor: 'bg-emerald-500', percent: 100 },
  in_progress:    { label: 'กำลังดำเนินการ',     badgeClass: 'badge-yellow', dotColor: 'bg-amber-500',   percent: 50  },
  non_compliant:  { label: 'ยังไม่ปฏิบัติ',      badgeClass: 'badge-red',    dotColor: 'bg-red-500',     percent: 0   },
  not_started:    { label: 'ยังไม่เริ่ม',         badgeClass: 'badge-gray',   dotColor: 'bg-slate-400',   percent: 0   },
  not_applicable: { label: 'ไม่เกี่ยวข้อง',      badgeClass: 'badge-blue',   dotColor: 'bg-blue-400',    percent: 100 },
}

export const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; badgeClass: string }
> = {
  high:   { label: 'เร่งด่วนสูง', badgeClass: 'badge-red'    },
  medium: { label: 'ปานกลาง',    badgeClass: 'badge-yellow' },
  low:    { label: 'ต่ำ',         badgeClass: 'badge-green'  },
}

export const LAW_TYPE_CONFIG: Record<string, string> = {
  'พระราชบัญญัติ':  'badge-purple',
  'กฎกระทรวง':     'badge-blue',
  'ประกาศกระทรวง': 'badge-green',
  'ระเบียบ':        'badge-yellow',
  'ประกาศ':         'badge-gray',
}

export async function generateLawCode(
  count: number
): Promise<string> {
  const y = new Date().getFullYear()
  return `LAW-${y}-${String(count + 1).padStart(4, '0')}`
}

export function parseThaiDate(dateStr: string): string | null {
  const months: Record<string, string> = {
    มกราคม:'01', กุมภาพันธ์:'02', มีนาคม:'03',    เมษายน:'04',
    พฤษภาคม:'05', มิถุนายน:'06', กรกฎาคม:'07',   สิงหาคม:'08',
    กันยายน:'09', ตุลาคม:'10',   พฤศจิกายน:'11', ธันวาคม:'12',
  }
  const tNums: Record<string,string> = {
    '๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9'
  }
  let s = dateStr
  Object.entries(tNums).forEach(([t,a]) => { s = s.replace(new RegExp(t,'g'),a) })
  const parts = s.trim().split(/\s+/)
  if (parts.length >= 3) {
    const d = parts[0].padStart(2,'0')
    const m = months[parts[1]] ?? '01'
    const y = parseInt(parts[2]) - 543
    if (!isNaN(y)) return `${y}-${m}-${d}`
  }
  return null
}
