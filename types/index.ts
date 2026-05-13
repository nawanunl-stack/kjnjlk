export type UserRole    = 'admin' | 'safety_officer' | 'viewer'
export type LawStatus   = 'active' | 'repealed' | 'amended'
export type Priority    = 'high' | 'medium' | 'low'
export type ComplianceStatus =
  | 'not_started' | 'in_progress'
  | 'compliant'   | 'non_compliant' | 'not_applicable'

export interface Department {
  id: string; name: string; code: string
  email?: string; line_token?: string; created_at: string
}

export interface Profile {
  id: string; full_name: string; role: UserRole
  department_id?: string; phone?: string
  avatar_url?: string; department?: Department
}

export interface LegalCategory {
  id: string; name: string; description?: string
  color: string; icon?: string
}

export interface LegalRegistry {
  id: string; law_code: string; title: string; full_title?: string
  category_id?: string; law_type?: string; issuing_authority?: string
  effective_date?: string; gazette_volume?: string; gazette_issue?: string
  gazette_date?: string; gazette_url?: string; labour_url?: string
  status: LawStatus; summary?: string; full_content?: string
  ai_analyzed?: boolean; source: string
  created_by?: string; created_at: string; updated_at: string
  category?: LegalCategory; requirements?: LawRequirement[]
  _count?: { requirements: number; compliance: number }
}

export interface LawRequirement {
  id: string; law_id: string; item_number?: string
  section_name?: string; who_must_do: string; what_to_do: string
  where_to_do?: string; how_to_do?: string
  related_documents?: string[]; related_department_ids?: string[]
  frequency?: string; deadline_days?: number
  penalty?: string; priority: Priority; created_at: string
  departments?: Department[]
}

export interface ComplianceAssessment {
  id: string; law_id: string; requirement_id?: string
  department_id: string; status: ComplianceStatus
  compliance_level: number; evidence?: string; evidence_url?: string
  assessor_id?: string; assessed_date?: string
  next_review_date?: string; remarks?: string
  created_at: string; updated_at: string
  law?: LegalRegistry; requirement?: LawRequirement
  department?: Department; assessor?: Profile
}

export interface DashboardStats {
  total_active_laws: number; new_this_month: number
  total_requirements: number; compliant: number
  non_compliant: number; in_progress: number
  not_started: number; overall_rate: number
}

export interface ComplianceByDept {
  dept_id: string; dept_name: string; dept_code: string
  total: number; compliant: number; non_compliant: number
  in_progress: number; not_started: number; rate: number
}
