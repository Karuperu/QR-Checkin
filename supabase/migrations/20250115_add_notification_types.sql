-- 알림 타입에 새로운 값들 추가
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN (
    'vacation_approved', 
    'vacation_rejected', 
    'late_warning', 
    'checkin_success', 
    'checkout_success', 
    'attendance_manual', 
    'group_invitation',
    'vacation_request_received',
    'student_attendance_alert',
    'group_member_joined',
    'group_member_left'
  ));
