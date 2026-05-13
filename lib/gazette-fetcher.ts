import axios from 'axios'
import * as cheerio from 'cheerio'
import { detectLawType, parseThaiDate } from './utils'

export interface FetchedLaw {
  title: string
  law_type: string
  gazette_date: string | null
  gazette_url:  string | null
  gazette_volume: string | null
  gazette_issue:  string | null
  full_content:   string | null
  source: string
}

const GAZETTE_BASE = 'https://ratchakitchanubeksa.go.th'
const LABOUR_BASE  = 'https://www.labour.go.th'

const SAFETY_KEYWORDS = [
  'ความปลอดภัย', 'อาชีวอนามัย',
  'สภาพแวดล้อมในการทำงาน', 'เครื่องจักร',
  'สารเคมี', 'อัคคีภัย',
]

const wait = (ms: number) => new Promise(r => setTimeout(r, ms))

// ────────────────────────────────────────────────
// ดึงข้อมูลจากราชกิจจานุเบกษา
// ⚠️ URL / selector อาจเปลี่ยนตามโครงสร้างจริงของเว็บ
// ────────────────────────────────────────────────
export async function fetchFromGazette(keyword: string): Promise<FetchedLaw[]> {
  try {
    const { data } = await axios.get(`${GAZETTE_BASE}/th/content/category/detail/id/21/iid/1`, {
      params: { keyword },
      timeout: 20_000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (SafetyLegalBot/1.0)',
        'Accept-Language': 'th-TH,th;q=0.9',
      },
    })

    const $ = cheerio.load(data)
    const results: FetchedLaw[] = []

    // ปรับ selector ตามโครงสร้างจริงของเว็บราชกิจจาฯ
    $('table.search_result tr, .law-item, .content-item').each((_, el) => {
      const titleEl = $(el).find('a').first()
      const title   = titleEl.text().trim()
      const href    = titleEl.attr('href') ?? ''
      const dateRaw = $(el).find('td:nth-child(3), .date').text().trim()
      const volume  = $(el).find('td:nth-child(1), .volume').text().trim()
      const issue   = $(el).find('td:nth-child(2), .issue').text().trim()

      if (title.length > 10) {
        results.push({
          title,
          law_type:       detectLawType(title),
          gazette_date:   dateRaw ? parseThaiDate(dateRaw) : null,
          gazette_url:    href
            ? (href.startsWith('http') ? href : `${GAZETTE_BASE}${href}`)
            : null,
          gazette_volume: volume || null,
          gazette_issue:  issue  || null,
          full_content:   null,
          source:         'gazette',
        })
      }
    })

    return results
  } catch (err) {
    console.error('[Gazette] fetch error:', err)
    return []
  }
}

// ────────────────────────────────────────────────
// ดึงข้อมูลจากกรมสวัสดิการและคุ้มครองแรงงาน
// ⚠️ ต้องตรวจสอบ URL จริงก่อนใช้งาน
// ────────────────────────────────────────────────
export async function fetchFromLabourDept(keyword: string): Promise<FetchedLaw[]> {
  try {
    const { data } = await axios.get(`${LABOUR_BASE}/th/content/category/detail/id/57`, {
      params: { keyword },
      timeout: 20_000,
      headers: { 'User-Agent': 'Mozilla/5.0 (SafetyLegalBot/1.0)' },
    })

    const $ = cheerio.load(data)
    const results: FetchedLaw[] = []

    $('.result-item, .law-list li, article').each((_, el) => {
      const titleEl = $(el).find('a, h3, h4').first()
      const title   = titleEl.text().trim()
      const href    = titleEl.attr('href') ?? ''
      const dateRaw = $(el).find('.date, time').text().trim()

      if (title.length > 5) {
        results.push({
          title,
          law_type:       detectLawType(title),
          gazette_date:   dateRaw ? parseThaiDate(dateRaw) : null,
          gazette_url:    href
            ? (href.startsWith('http') ? href : `${LABOUR_BASE}${href}`)
            : null,
          gazette_volume: null,
          gazette_issue:  null,
          full_content:   null,
          source:         'labour_dept',
        })
      }
    })

    return results
  } catch (err) {
    console.error('[Labour] fetch error:', err)
    return []
  }
}

// ────────────────────────────────────────────────
// ดึงเนื้อหาเต็มจาก URL ของกฎหมาย
// ────────────────────────────────────────────────
export async function fetchLawContent(url: string): Promise<string | null> {
  if (!url) return null
  try {
    const { data } = await axios.get(url, {
      timeout: 20_000,
      headers: { 'User-Agent': 'Mozilla/5.0 (SafetyLegalBot/1.0)' },
    })
    const $ = cheerio.load(data)
    // ลบส่วนไม่ต้องการ
    $('script, style, nav, header, footer, .sidebar').remove()
    return $('article, .law-content, .content-body, main')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 8000) // จำกัดขนาดสำหรับ AI
  } catch {
    return null
  }
}

// ────────────────────────────────────────────────
// ดึงทุก keyword และรวมผลลัพธ์
// ────────────────────────────────────────────────
export async function fetchAllSafetyLaws(): Promise<FetchedLaw[]> {
  const seen = new Set<string>()
  const all:  FetchedLaw[] = []

  for (const kw of SAFETY_KEYWORDS) {
    const [g, l] = await Promise.allSettled([
      fetchFromGazette(kw),
      fetchFromLabourDept(kw),
    ])

    const items = [
      ...(g.status === 'fulfilled' ? g.value : []),
      ...(l.status === 'fulfilled' ? l.value : []),
    ]

    for (const item of items) {
      const key = item.gazette_url ?? item.title
      if (!seen.has(key)) {
        seen.add(key)
        all.push(item)
      }
    }

    await wait(2500) // rate limiting
  }

  return all
}
