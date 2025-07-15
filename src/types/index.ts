export type UserRole = 'student' | 'faculty' | 'admin'

export interface User {
  id: string
  user_id: string
  name: string
  department: string
  role: UserRole
  qr_code?: string  // 개인 QR 코드는 옵셔널로 변경
  is_active: boolean
}

export interface AttendanceLog {
  id: string
  user_id: string
  scan_time: string
  scan_type: 'checkin' | 'checkout'
  location?: string
  created_at: string
}

export interface QRData {
  user_id: string
  name: string
  department: string
  role: UserRole
  qr_code: string
  timestamp: string
  type: 'user_info'
}

export interface ScanResult {
  success: boolean
  user?: User
  scanType?: 'checkin' | 'checkout'
  error?: string
} 