-- =============================================
-- ระบบทะเบียนกฎหมายความปลอดภัย - Database Schema
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. แผนก (Departments)
-- =============================================
CREATE TABLE departments (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  code        VARCHAR(50)  UNIQUE NOT NULL,
  email       VARCHAR(255),
  line_token  VARCHAR(500),
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- =============================================
-- 2. โปรไฟล์ผู้ใช้งาน (Profiles)
-- เชื่อมกับ Supabase Auth
-- =============================================
CREATE TABLE profiles (
  id            UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  DEFAULT 'viewer',
  -- role: admin | safety_officer | viewer
  department_id UUID REFERENCES departments(id),
  phone         VARCHAR(20),
  avatar_url    TEXT,
  updated_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Auto create profile เมื่อสมัครสมาชิก
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'viewer'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- 3. หมวดหมู่กฎหมาย (Legal Categories)
-- =============================================
CREATE TABLE legal_categories (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  color       VARCHAR(20)  DEFAULT '#3B82F6',
  icon        VARCHAR(50)  DEFAULT 'shield',
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- =============================================
-- 4. ทะเบียนกฎหมาย (Legal Registry)
-- =============================================
CREATE TABLE legal_registry (
  id                UUID    DEFAULT uuid_generate_v4() PRIMARY KEY,
  law_code          VARCHAR(100) UNIQUE NOT NULL,
  title             VARCHAR(500) NOT NULL,
  full_title        TEXT,
  category_id       UUID    REFERENCES legal_categories(id),
  law_type          VARCHAR(100),
  -- law_type: พระราชบัญญัติ | กฎกระทรวง | ประกาศกระทรวง | ระเบียบ | ประกาศ
  issuing_authority VARCHAR(255),
  effective_date    DATE,
  gazette_volume    VARCHAR(50),
  gazette_issue     VARCHAR(50),
  gazette_date      DATE,
  gazette_url       TEXT,
  labour_url        TEXT,
  status            VARCHAR(50)  DEFAULT 'active',
  -- status: active | repealed | amended
  summary           TEXT,
  full_content      TEXT,
  ai_analyzed       BOOLEAN DEFAULT FALSE,
  source            VARCHAR(50)  DEFAULT 'manual',
  -- source: manual | gazette | labour_dept
  created_by        UUID    REFERENCES profiles(id),
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- Auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_registry_updated_at
  BEFORE UPDATE ON legal_registry
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================
-- 5. ข้อกำหนดย่อย (Law Requirements)
-- วิเคราะห์แล้วว่าใครต้องทำอะไร
-- =============================================
CREATE TABLE law_requirements (
  id                       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  law_id                   UUID REFERENCES legal_registry(id) ON DELETE CASCADE,
  item_number              VARCHAR(20),
  section_name             VARCHAR(500),
  who_must_do              TEXT NOT NULL,
  what_to_do               TEXT NOT NULL,
  where_to_do              TEXT,
  how_to_do                TEXT,
  related_documents        TEXT[],
  related_department_ids   UUID[],
  frequency                VARCHAR(100),
  deadline_days            INTEGER,
  penalty                  TEXT,
  priority                 VARCHAR(20) DEFAULT 'medium',
  -- priority: high | medium | low
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 6. การประเมินความสอดคล้อง (Compliance)
-- =============================================
CREATE TABLE compliance_assessments (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  law_id            UUID REFERENCES legal_registry(id) ON DELETE CASCADE,
  requirement_id    UUID REFERENCES law_requirements(id) ON DELETE CASCADE,
  department_id     UUID REFERENCES departments(id),
  status            VARCHAR(50) DEFAULT 'not_started',
  -- not_started | in_progress | compliant | non_compliant | not_applicable
  compliance_level  INTEGER DEFAULT 0,
  -- 0-100 เปอร์เซ็นต์
  evidence          TEXT,
  evidence_url      TEXT,
  assessor_id       UUID REFERENCES profiles(id),
  assessed_date     DATE,
  next_review_date  DATE,
  remarks           TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER compliance_updated_at
  BEFORE UPDATE ON compliance_assessments
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================
-- 7. ประวัติการแจ้งเตือน (Notification Logs)
-- =============================================
CREATE TABLE notification_logs (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  law_id        UUID REFERENCES legal_registry(id),
  department_id UUID REFERENCES departments(id),
  type          VARCHAR(20),
  -- email | line | both
  recipient     VARCHAR(255),
  subject       VARCHAR(500),
  message       TEXT,
  status        VARCHAR(20) DEFAULT 'sent',
  -- sent | failed
  error_message TEXT,
  sent_at       TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. Log การดึงข้อมูล (Fetch Logs)
-- =============================================
CREATE TABLE fetch_logs (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  source          VARCHAR(100),
  keyword         VARCHAR(255),
  records_found   INTEGER DEFAULT 0,
  records_added   INTEGER DEFAULT 0,
  status          VARCHAR(20),
  error_message   TEXT,
  fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX idx_legal_status       ON legal_registry(status);
CREATE INDEX idx_legal_effective    ON legal_registry(effective_date DESC);
CREATE INDEX idx_legal_category     ON legal_registry(category_id);
CREATE INDEX idx_legal_created      ON legal_registry(created_at DESC);
CREATE INDEX idx_compliance_dept    ON compliance_assessments(department_id);
CREATE INDEX idx_compliance_law     ON compliance_assessments(law_id);
CREATE INDEX idx_compliance_status  ON compliance_assessments(status);
CREATE INDEX idx_req_law            ON law_requirements(law_id);

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_registry         ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_requirements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs      ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "users_read_all_profiles"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "users_update_own_profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Legal Registry - ทุกคนอ่านได้ แต่แก้ไขเฉพาะ officer/admin
CREATE POLICY "all_read_legal"
  ON legal_registry FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "officer_write_legal"
  ON legal_registry FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('safety_officer','admin'))
  );

-- Law Requirements
CREATE POLICY "all_read_requirements"
  ON law_requirements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "officer_write_requirements"
  ON law_requirements FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('safety_officer','admin'))
  );

-- Compliance - ทุกคนอ่านและแก้ไขของตัวเองได้
CREATE POLICY "all_read_compliance"
  ON compliance_assessments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "all_write_compliance"
  ON compliance_assessments FOR ALL USING (auth.role() = 'authenticated');

-- Notification Logs
CREATE POLICY "all_read_notifications"
  ON notification_logs FOR SELECT USING (auth.role() = 'authenticated');

-- =============================================
-- Seed Data
-- =============================================
INSERT INTO departments (name, code, email) VALUES
  ('ฝ่ายผลิต',       'PROD',   'production@company.com'),
  ('ฝ่ายบุคคล',      'HR',     'hr@company.com'),
  ('ฝ่ายวิศวกรรม',  'ENG',    'engineering@company.com'),
  ('ฝ่ายคลังสินค้า', 'WH',     'warehouse@company.com'),
  ('ฝ่ายความปลอดภัย','SAFETY', 'safety@company.com'),
  ('ฝ่ายสิ่งแวดล้อม','ENV',    'env@company.com');

INSERT INTO legal_categories (name, color, icon) VALUES
  ('ความปลอดภัยในการทำงาน', '#3B82F6', 'shield'),
  ('อัคคีภัย',              '#EF4444', 'flame'),
  ('เครื่องจักร',           '#F59E0B', 'settings'),
  ('สารเคมีอันตราย',        '#8B5CF6', 'flask'),
  ('แรงงานสัมพันธ์',        '#10B981', 'users'),
  ('สิ่งแวดล้อม',           '#06B6D4', 'leaf');
