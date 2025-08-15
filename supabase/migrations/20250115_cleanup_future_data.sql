-- 2025년 8월 4일 이후의 예시/테스트 데이터 정리
-- 실행 날짜: 2025-01-15

-- 1. 2025년 8월 4일 이후의 출석 기록 삭제
DELETE FROM attendance_logs 
WHERE scan_time > '2025-08-04 23:59:59'::timestamptz;

-- 2. 2025년 8월 4일 이후의 휴가 신청 삭제
DELETE FROM vacation_requests 
WHERE created_at > '2025-08-04 23:59:59'::timestamptz 
   OR start_date > '2025-08-04'::date;

-- 3. 2025년 8월 4일 이후의 알림 삭제
DELETE FROM notifications 
WHERE created_at > '2025-08-04 23:59:59'::timestamptz;

-- 4. 2025년 8월 4일 이후에 생성된 위치 정보 삭제
DELETE FROM locations 
WHERE created_at > '2025-08-04 23:59:59'::timestamptz;

-- 5. 2025년 8월 4일 이후에 생성된 그룹 멤버십 삭제
DELETE FROM group_memberships 
WHERE joined_at > '2025-08-04 23:59:59'::timestamptz;

-- 6. 2025년 8월 4일 이후에 생성된 그룹 근무 설정 삭제
DELETE FROM group_work_settings 
WHERE created_at > '2025-08-04 23:59:59'::timestamptz;

-- 7. 2025년 8월 4일 이후에 생성된 그룹 삭제 (CASCADE로 관련 데이터도 함께 삭제됨)
DELETE FROM groups 
WHERE created_at > '2025-08-04 23:59:59'::timestamptz;

-- 8. 2025년 8월 4일 이후에 생성된 사용자 삭제 (CASCADE로 관련 데이터도 함께 삭제됨)
DELETE FROM users 
WHERE created_at > '2025-08-04 23:59:59'::timestamptz;

-- 정리 완료 로그
DO $$
BEGIN
    RAISE NOTICE '2025년 8월 4일 이후의 데이터 정리가 완료되었습니다.';
    RAISE NOTICE '현재 시간: %', NOW();
END $$;