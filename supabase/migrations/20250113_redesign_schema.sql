-- 기존 테이블들 삭제 (데이터와 함께)
DROP TABLE IF EXISTS attendance_logs CASCADE;
DROP TABLE IF EXISTS vacation_requests CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS group_work_settings CASCADE;
DROP TABLE IF EXISTS group_memberships CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS work_time_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 사용자 테이블
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL, -- 학번 또는 교직원번호
  password TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  position VARCHAR(50), -- 학생: null, 교직원: 직책
  role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'faculty')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 그룹/프로젝트 테이블
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 그룹 멤버십 테이블
CREATE TABLE group_memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- 그룹별 근무 시간 설정 테이블
CREATE TABLE group_work_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE UNIQUE,
  checkin_deadline_hour INTEGER DEFAULT 10 CHECK (checkin_deadline_hour >= 0 AND checkin_deadline_hour <= 23),
  checkout_start_hour INTEGER DEFAULT 18 CHECK (checkout_start_hour >= 0 AND checkout_start_hour <= 23),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- QR 위치 테이블
CREATE TABLE locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 출석 기록 테이블
CREATE TABLE attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  scan_time TIMESTAMPTZ NOT NULL,
  scan_type VARCHAR(20) NOT NULL CHECK (scan_type IN ('checkin', 'checkout')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'late', 'early_leave', 'absent')),
  location_id UUID REFERENCES locations(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  absence_reason TEXT, -- 지각, 조기퇴근, 결근 사유
  edited_by UUID REFERENCES users(id), -- 수정한 교직원
  is_manual BOOLEAN DEFAULT false, -- 수동 처리 여부
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 휴가 신청 테이블
CREATE TABLE vacation_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  vacation_type VARCHAR(50) NOT NULL CHECK (vacation_type IN ('annual', 'sick', 'personal', 'official')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id), -- 승인/거부한 교직원
  reviewed_at TIMESTAMPTZ,
  review_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 알림 테이블
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('vacation_approved', 'vacation_rejected', 'late_warning', 'checkin_success', 'checkout_success', 'attendance_manual', 'group_invitation')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB, -- 추가 데이터 (그룹 ID, 휴가 ID 등)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_groups_faculty_id ON groups(faculty_id);
CREATE INDEX idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX idx_attendance_logs_user_id ON attendance_logs(user_id);
CREATE INDEX idx_attendance_logs_group_id ON attendance_logs(group_id);
CREATE INDEX idx_attendance_logs_scan_time ON attendance_logs(scan_time);
CREATE INDEX idx_vacation_requests_user_id ON vacation_requests(user_id);
CREATE INDEX idx_vacation_requests_group_id ON vacation_requests(group_id);
CREATE INDEX idx_vacation_requests_status ON vacation_requests(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- RLS (Row Level Security) 정책
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_work_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 정보만 조회 가능
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

-- 교직원은 자신이 관리하는 그룹의 학생들 조회 가능
CREATE POLICY "Faculty can view group members" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups g 
      JOIN group_memberships gm ON g.id = gm.group_id 
      WHERE g.faculty_id::text = auth.uid()::text 
      AND gm.user_id = users.id
    )
  );

-- 그룹 정책
CREATE POLICY "Users can view their groups" ON groups
  FOR SELECT USING (
    faculty_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM group_memberships gm 
      WHERE gm.group_id = groups.id 
      AND gm.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Faculty can manage their groups" ON groups
  FOR ALL USING (faculty_id::text = auth.uid()::text);

-- 그룹 멤버십 정책
CREATE POLICY "Users can view group memberships" ON group_memberships
  FOR SELECT USING (
    user_id::text = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = group_memberships.group_id 
      AND g.faculty_id::text = auth.uid()::text
    )
  );

-- 출석 로그 정책
CREATE POLICY "Users can view own attendance" ON attendance_logs
  FOR SELECT USING (user_id::text = auth.uid()::text);

CREATE POLICY "Faculty can view group attendance" ON attendance_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = attendance_logs.group_id 
      AND g.faculty_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert own attendance" ON attendance_logs
  FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);

-- 휴가 신청 정책
CREATE POLICY "Users can manage own vacation requests" ON vacation_requests
  FOR ALL USING (user_id::text = auth.uid()::text);

CREATE POLICY "Faculty can review group vacation requests" ON vacation_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM groups g 
      WHERE g.id = vacation_requests.group_id 
      AND g.faculty_id::text = auth.uid()::text
    )
  );

-- 알림 정책
CREATE POLICY "Users can view own notifications" ON notifications
  FOR ALL USING (user_id::text = auth.uid()::text);

-- 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 업데이트 트리거 생성
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at 
  BEFORE UPDATE ON groups 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_work_settings_updated_at 
  BEFORE UPDATE ON group_work_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_logs_updated_at 
  BEFORE UPDATE ON attendance_logs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vacation_requests_updated_at 
  BEFORE UPDATE ON vacation_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();