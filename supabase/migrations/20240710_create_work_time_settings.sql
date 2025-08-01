-- 출퇴근 시간 설정 테이블 생성
CREATE TABLE IF NOT EXISTS public.work_time_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkin_deadline_hour integer NOT NULL DEFAULT 10,
  checkout_start_hour integer NOT NULL DEFAULT 18,
  operating_start_hour integer NOT NULL DEFAULT 8,
  operating_end_hour integer NOT NULL DEFAULT 22,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS 정책 설정
ALTER TABLE public.work_time_settings ENABLE ROW LEVEL SECURITY;

-- 교직원만 조회/수정 가능
CREATE POLICY "Faculty can view work time settings" ON public.work_time_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'faculty'
    )
  );

CREATE POLICY "Faculty can insert work time settings" ON public.work_time_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'faculty'
    )
  );

CREATE POLICY "Faculty can update work time settings" ON public.work_time_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'faculty'
    )
  );

-- 기본 설정 삽입 (시스템 기본값)
INSERT INTO public.work_time_settings (
  checkin_deadline_hour,
  checkout_start_hour,
  operating_start_hour,
  operating_end_hour,
  created_by
) VALUES (
  10, -- 10시 전까지 출근
  18, -- 18시 이후 퇴근
  8,  -- 8시부터 운영
  22, -- 22시까지 운영
  NULL -- 시스템 기본값
) ON CONFLICT DO NOTHING; 