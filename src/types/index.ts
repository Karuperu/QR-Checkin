export type UserRole = 'student' | 'faculty'

export interface User {
  id: string
  user_id: string
  name: string
  password?: string  // 회원가입 시에만 사용, 일반적으로는 제외
  department: string
  position?: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Group {
  id: string
  name: string
  description?: string
  faculty_id: string
  status: 'active' | 'inactive'
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
  memberCount?: number
  faculty_name?: string
}

export interface GroupMembership {
  id: string
  group_id: string
  user_id: string
  joined_at: string
  group?: Group
  user?: User
}

export interface GroupWorkSettings {
  id: string
  group_id: string
  checkin_deadline_hour: number
  checkout_start_hour: number
  created_at: string
  updated_at: string
}

export interface Location {
  id: string
  group_id: string
  name: string
  latitude?: number
  longitude?: number
  address?: string
  is_active: boolean
  created_at: string
}

export interface AttendanceLog {
  id: string
  user_id: string
  group_id: string
  scan_time: string
  scan_type: 'checkin' | 'checkout'
  status: 'present' | 'late' | 'early_leave' | 'absent'
  location_id?: string
  latitude?: number
  longitude?: number
  absence_reason?: string
  edited_by?: string
  is_manual: boolean
  created_at: string
  updated_at: string
  user?: User
  group?: Group
  location?: Location
}

export interface VacationRequest {
  id: string
  user_id: string
  group_id: string
  vacation_type: 'annual' | 'sick' | 'personal' | 'official'
  start_date: string
  end_date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  reviewed_by?: string
  reviewed_at?: string
  review_comment?: string
  created_at: string
  updated_at: string
  user?: User
  group?: Group
  reviewer?: User
}

export interface Notification {
  id: string
  user_id: string
  type: 'vacation_approved' | 'vacation_rejected' | 'late_warning' | 'checkin_success' | 'checkout_success' | 'attendance_manual' | 'group_invitation' | 'vacation_request_received' | 'student_attendance_alert' | 'group_member_joined' | 'group_member_left'
  title: string
  message: string
  is_read: boolean
  metadata?: any
  created_at: string
}

export interface QRData {
  user_id: string
  name: string
  department: string
  role: UserRole
  timestamp: string
  type: 'user_info'
}

export interface ScanResult {
  success: boolean
  user?: User
  scanType?: 'checkin' | 'checkout'
  status?: 'present' | 'late' | 'early_leave' | 'absent'
  error?: string
}

// ===== 교직원 그룹별 통계 타입들 =====

export interface GroupOverallStats {
  groupId: string
  groupName: string
  totalStudents: number
  presentCount: number
  lateCount: number
  absentCount: number
  vacationCount: number
  attendanceRate: number
}

export interface GroupWeeklyStats {
  groupId: string
  groupName: string
  totalStudents: number
  presentCount: number
  lateCount: number
  absentCount: number
  attendanceRate: number
  totalDays: number
  dateRange: string
}

export interface GroupWeeklyTrends {
  currentWeek: {
    label: string
    dateRange: string
    groupStats: GroupWeeklyStats[]
  }
  lastWeek: {
    label: string
    dateRange: string
    groupStats: GroupWeeklyStats[]
  }
  beforeWeek: {
    label: string
    dateRange: string
    groupStats: GroupWeeklyStats[]
  }
}

export interface StudentDetailStats {
  studentId: string
  studentUserId: string
  studentName: string
  department: string
  presentCount: number
  lateCount: number
  absentCount: number
  earlyLeaveCount: number
  vacationDays: number
  attendanceRate: number
  totalWorkDays: number
  recentAttendance: {
    date: string
    status: string
    time: string
  }[]
} 