-- 출석 기록에 GPS 정보(위도, 경도) 컬럼 추가
ALTER TABLE public.attendance_logs
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision; 