import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface RequirementItem {
  item_number:                string
  section_name:               string
  who_must_do:                string
  what_to_do:                 string
  where_to_do:                string
  how_to_do:                  string
  related_documents:          string[]
  frequency:                  string
  deadline_days:              number | null
  penalty:                    string | null
  priority:                   'high' | 'medium' | 'low'
  related_department_keywords: string[]
}

export async function analyzeLaw(
  title: string,
  content: string
): Promise<RequirementItem[]> {
  const prompt = `
คุณคือผู้เชี่ยวชาญกฎหมายความปลอดภัยในการทำงานของประเทศไทย

กฎหมาย: "${title}"
เนื้อหา:
${content.substring(0, 5000)}

วิเคราะห์และแยกข้อกำหนดที่ต้องปฏิบัติออกเป็นรายข้อ
ตอบเป็น JSON object ที่มี key "items" เป็น array:
[{
  "item_number": "มาตรา X / ข้อ X",
  "section_name": "ชื่อหัวข้อ",
  "who_must_do": "ใครต้องทำ (นายจ้าง/ลูกจ้าง/จป./แผนกใด)",
  "what_to_do": "ต้องทำอะไร อธิบายชัดเจนเป็นภาษาง่าย",
  "where_to_do": "ทำที่ไหน",
  "how_to_do": "ทำอย่างไร วิธีการ ขั้นตอน",
  "related_documents": ["เอกสาร 1", "เอกสาร 2"],
  "frequency": "รายวัน/รายเดือน/รายปี/ครั้งเดียว หรือตามกำหนด",
  "deadline_days": 30,
  "penalty": "บทลงโทษถ้ามี หรือ null",
  "priority": "high/medium/low",
  "related_department_keywords": ["ฝ่ายผลิต","ฝ่ายวิศวกรรม"]
}]

ใช้ภาษาไทยที่เข้าใจง่าย ไม่ใช่ภาษากฎหมาย
ตอบเฉพาะ JSON เท่านั้น
`

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4
