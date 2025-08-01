import { createClient } from '@supabase/supabase-js'
import CryptoJS from 'crypto-js'

// MD5 해시 함수
function md5(text: string): string {
  return CryptoJS.MD5(text).toString()
}

// 환경변수를 더 안전하게 로드
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://uefmrjuvkwrvfrfifbqv.supabase.co'
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZm1yanV2a3dydmZyZmlmYnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1OTM2MjQsImV4cCI6MjA2NzE2OTYyNH0.CNZbIw1s_aM4U9Z_Z52dsC4OVPPZJ91lvbcLtVhIhAQ'

console.log('Supabase URL:', supabaseUrl)
console.log('Supabase Key loaded:', supabaseAnonKey ? 'Yes' : 'No')

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 로컬 시간 관련 유틸리티 함수들
export function getLocalTime(): Date {
  return new Date()
}

export function toLocalISOString(date?: Date): string {
  const localTime = date || new Date()
  const offset = 9 * 60 // 한국 시간 UTC+9
  const utc = localTime.getTime() + (localTime.getTimezoneOffset() * 60000)
  const kst = new Date(utc + (offset * 60000))
  return kst.toISOString()
}

// 로컬 시간 기준 날짜 포맷팅 함수들
export function formatLocalTime(date: Date | string): string {
  const localDate = typeof date === 'string' ? new Date(date) : date
  return localDate.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

export function formatLocalDate(date: Date | string): string {
  const localDate = typeof date === 'string' ? new Date(date) : date
  return localDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

export function formatLocalDateTime(date: Date | string): string {
  const localDate = typeof date === 'string' ? new Date(date) : date
  return localDate.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function formatLocalDateRange(startDate: Date | string, endDate: Date | string): string {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const startFormatted = start.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  const endFormatted = end.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  return `${startFormatted} ~ ${endFormatted}`
}

// 현재 로컬 시간 기준 날짜 문자열 (YYYY-MM-DD)
export function getTodayLocal(): string {
  const localDate = new Date()
  return localDate.toISOString().split('T')[0]
}

// 사용자 타입 정의
export type UserRole = 'student' | 'faculty'

export interface User {
  id: string
  user_id: string
  name: string
  department: string
  role: UserRole
  is_active: boolean
}

// 비밀번호 복잡성 검증 함수
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('비밀번호는 8자리 이상이어야 합니다.')
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    errors.push('비밀번호에 영문자가 포함되어야 합니다.')
  }
  
  if (!/\d/.test(password)) {
    errors.push('비밀번호에 숫자가 포함되어야 합니다.')
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('비밀번호에 특수문자가 포함되어야 합니다.')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// 사용자 ID 검증 함수
export function validateUserId(userId: string, role: UserRole): { isValid: boolean; error?: string } {
  switch (role) {
    case 'student':
      if (!/^\d{9}$/.test(userId)) {
        return { isValid: false, error: '학번은 9자리 숫자여야 합니다.' }
      }
      break
    case 'faculty':
      if (!userId || userId.length < 3) {
        return { isValid: false, error: '교원번호를 올바르게 입력해주세요.' }
      }
      break

  }
  
  return { isValid: true }
}

// 로그인 함수
export async function loginUser(userId: string, password: string): Promise<User | null> {
  try {
    // 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      return null
    }

    // 비밀번호 검증 (평문 비교)
    if (password !== user.password_hash) {
      return null
    }

    // 세션 저장
    const userSession: User = {
      id: user.id,
      user_id: user.user_id,
      name: user.name,
      department: user.department,
      role: user.role as UserRole,
      is_active: user.is_active
    }

    localStorage.setItem('user_session', JSON.stringify(userSession))
    return userSession
  } catch (error) {
    console.error('Login error:', error)
    return null
  }
}

// 회원가입 함수
export async function registerUser(
  userId: string,
  name: string,
  department: string,
  role: UserRole,
  password: string
): Promise<User | null> {
  try {
    // 비밀번호 평문 저장
    const passwordHash = password
    
    // 사용자 정보 저장 (qr_code 제거)
    const { data: user, error } = await supabase
      .from('users')
      .insert({
        user_id: userId,
        name,
        department,
        role,
        password_hash: passwordHash,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Register error:', error)
      return null
    }

    // 세션 저장
    const userSession: User = {
      id: user.id,
      user_id: user.user_id,
      name: user.name,
      department: user.department,
      role: user.role as UserRole,
      is_active: user.is_active
    }

    localStorage.setItem('user_session', JSON.stringify(userSession))
    return userSession
  } catch (error) {
    console.error('Register error:', error)
    return null
  }
}

// 현재 로그인한 사용자 정보 가져오기
export function getCurrentUser(): User | null {
  try {
    const sessionData = localStorage.getItem('user_session')
    if (!sessionData) return null
    
    return JSON.parse(sessionData)
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

// 로그아웃 함수
export function logoutUser(): void {
  localStorage.removeItem('user_session')
}

// 사용자 세션 새로 고침 함수
export async function refreshUserSession(): Promise<User | null> {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) return null

    // 데이터베이스에서 최신 사용자 정보 가져오기
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', currentUser.user_id)
      .eq('is_active', true)
      .single()

    if (error || !user) {
      // 사용자 정보를 찾을 수 없으면 로그아웃
      logoutUser()
      return null
    }

    // 새로운 세션 정보로 업데이트
    const userSession: User = {
      id: user.id,
      user_id: user.user_id,
      name: user.name,
      department: user.department,
      role: user.role as UserRole,
      is_active: user.is_active
    }

    localStorage.setItem('user_session', JSON.stringify(userSession))
    return userSession
  } catch (error) {
    console.error('Error refreshing user session:', error)
    return null
  }
}

// 사용자 ID 중복 확인 함수
export async function checkUserIdExists(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // 데이터가 없음 (중복 없음)
      return false
    }

    return !!data
  } catch (error) {
    console.error('Error checking user ID:', error)
    return false
  }
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      
      qr_sessions: {
        Row: {
          id: string
          session_token: string
          location: string
          created_by: string
          is_active: boolean | null
          expires_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          session_token: string
          location: string
          created_by: string
          is_active?: boolean | null
          expires_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          session_token?: string
          location?: string
          created_by?: string
          is_active?: boolean | null
          expires_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_requests: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          reason: string
          request_type: string | null
          status: string | null
          reviewer_id: string | null
          reviewed_at: string | null
          review_comment: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          end_date: string
          reason: string
          request_type?: string | null
          status?: string | null
          reviewer_id?: string | null
          reviewed_at?: string | null
          review_comment?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          reason?: string
          request_type?: string | null
          status?: string | null
          reviewer_id?: string | null
          reviewed_at?: string | null
          review_comment?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vacation_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_requests_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_logs: {
        Row: {
          created_at: string | null
          id: string
          location: string | null
          scan_time: string
          scan_type: string
          user_id: string
          server_time: string | null
          is_edited: boolean | null
          edited_by: string | null
          edited_at: string | null
          absence_reason: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          location?: string | null
          scan_time: string
          scan_type: string
          user_id: string
          server_time?: string | null
          is_edited?: boolean | null
          edited_by?: string | null
          edited_at?: string | null
          absence_reason?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          location?: string | null
          scan_time?: string
          scan_type?: string
          user_id?: string
          server_time?: string | null
          is_edited?: boolean | null
          edited_by?: string | null
          edited_at?: string | null
          absence_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_logs_edited_by_fkey"
            columns: ["edited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          id: string
          user_id: string
          name: string
          department: string
          role: string
          password_hash: string
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          department: string
          role: string
          password_hash: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          department?: string
          role?: string
          password_hash?: string
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          name: string
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 

// 역할별 권한 체크
export const hasFacultyAccess = (user: User | null): boolean => {
  return user?.role === 'faculty' && user?.is_active === true
}

export const canEditAttendance = (user: User | null): boolean => {
  return user?.role === 'faculty' && user?.is_active === true
}

export const canViewAllAttendance = (user: User | null): boolean => {
  return user?.role === 'faculty' && user?.is_active === true
}

// 출퇴근 기록 조회 (역할별 필터링)
export const getAttendanceRecords = async (
  user: User,
  date: string,
  roleFilter?: string,
  userFilter?: string
) => {
  const startDate = new Date(date + 'T00:00:00')
  const endDate = new Date(date + 'T23:59:59')
  
  let query = supabase
    .from('attendance_logs')
    .select(`
      *,
      users!attendance_logs_user_id_fkey (user_id, name, department, role)
    `)
    .gte('scan_time', startDate.toISOString())
    .lte('scan_time', endDate.toISOString())
    .order('scan_time', { ascending: false })

  // 학생은 자신의 기록만 볼 수 있음
  if (user.role === 'student') {
    query = query.eq('user_id', user.id)
  } else {
    // 관리자/교직원은 필터 적용 가능
    if (roleFilter && roleFilter !== 'all') {
      // 서브쿼리를 사용하여 역할별 필터링
      const { data: filteredUsers } = await supabase
        .from('users')
        .select('id')
        .eq('role', roleFilter)
        .eq('is_active', true)
      
      if (filteredUsers && filteredUsers.length > 0) {
        const userIds = filteredUsers.map(u => u.id)
        query = query.in('user_id', userIds)
      }
    }
    
    if (userFilter && userFilter !== 'all') {
      query = query.eq('user_id', userFilter)
    }
  }

  return query
}

// 출퇴근 기록 수정 (관리자/교직원만)
export const updateAttendanceRecord = async (
  recordId: string,
  updates: {
    scan_time?: string
    scan_type?: AttendanceStatus
    location?: string
    absence_reason?: string
  },
  editorUser: User
) => {
  if (!canEditAttendance(editorUser)) {
    throw new Error('출퇴근 기록을 수정할 권한이 없습니다.')
  }

  // 업데이트 데이터 준비
  const updateData: any = {
    ...updates,
    is_edited: true,
    edited_by: editorUser.id,
            edited_at: toLocalISOString() // 로컬 시간 기준 수정 시간
  }

  // scan_time이 제공되면 ISO 형식으로 변환하여 저장
  if (updates.scan_time) {
    // 입력받은 시간 (YYYY-MM-DDTHH:mm 형식)을 ISO 문자열로 변환
    updateData.scan_time = new Date(updates.scan_time).toISOString()
    console.log('시간 수정:', {
      입력된_시간: updates.scan_time,
      저장될_시간: updateData.scan_time,
      수정시간_KST: updateData.edited_at
    })
  }

  const { error } = await supabase
    .from('attendance_logs')
    .update(updateData)
    .eq('id', recordId)

  if (error) throw error
}

// 출퇴근 기록 삭제 함수
export const deleteAttendanceRecord = async (
  recordId: string,
  editorUser: User
) => {
  if (!canEditAttendance(editorUser)) {
    throw new Error('출퇴근 기록을 삭제할 권한이 없습니다.')
  }

  const { error } = await supabase
    .from('attendance_logs')
    .delete()
    .eq('id', recordId)

  if (error) throw error
}

// 출퇴근 상태 타입 확장
export type AttendanceStatus = 'checkin' | 'checkout' | 'late' | 'early_leave' | 'absent' | 'vacation'

// 출퇴근 기록 저장 함수
export async function saveAttendanceRecord(
  userId: string,
  scanType: AttendanceStatus,
  location?: string,
  latitude?: number,
  longitude?: number,
  absence_reason?: string
): Promise<boolean> {
  try {
    const timestamp = toLocalISOString() // 로컬 시간 기준 현재 시간
    console.log('출퇴근 기록 저장 시도:', {
      userId,
      scanType,
      location,
      latitude,
      longitude,
      absence_reason,
      timestamp_KST: timestamp,
      timestamp_local: new Date().toLocaleString('ko-KR')
    })

    const insertData: any = {
      user_id: userId,
      scan_time: timestamp,
      scan_type: scanType,
      location: location || null
    }
    if (latitude !== undefined) insertData.latitude = latitude
    if (longitude !== undefined) insertData.longitude = longitude
    if (absence_reason !== undefined) insertData.absence_reason = absence_reason

    console.log('삽입할 데이터:', insertData)

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert(insertData)
      .select()

    if (error) {
      console.error('출퇴근 기록 저장 오류:', error)
      console.error('오류 상세:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
      return false
    }

    console.log('출퇴근 기록 저장 성공:', data)
    return true
  } catch (error) {
    console.error('출퇴근 기록 저장 예외:', error)
    return false
  }
}

// 사용자별 출퇴근 기록 조회 함수
export async function getUserAttendanceRecords(
  userId: string,
  date?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('attendance_logs')
      .select(`
        *,
        users!attendance_logs_user_id_fkey (
          user_id,
          name,
          department,
          role
        )
      `)
      .eq('user_id', userId)
      .order('scan_time', { ascending: false })

    if (date) {
      const startDate = new Date(date)
      const endDate = new Date(date)
      endDate.setDate(endDate.getDate() + 1)
      
      query = query
        .gte('scan_time', startDate.toISOString())
        .lt('scan_time', endDate.toISOString())
    }

    const { data, error } = await query

    if (error) {
      console.error('출퇴근 기록 조회 오류:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('출퇴근 기록 조회 오류:', error)
    return []
  }
}

// QR 코드 검증 함수 (DB에서 직접 조회)
export async function validateQRLocation(location: string): Promise<{
  isValid: boolean
  location: string
  error?: string
}> {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name')
      .eq('name', location)
      .maybeSingle()
    if (error) {
      console.error('장소 검증 DB 오류:', error)
      return { isValid: false, location, error: 'DB 오류' }
    }
    if (!data) {
      return { isValid: false, location, error: '등록되지 않은 장소입니다.' }
    }
    return { isValid: true, location }
  } catch (error) {
    console.error('QR 코드 검증 오류:', error)
    return { isValid: false, location, error: 'QR 코드 검증 중 오류가 발생했습니다.' }
  }
}

// 사용자 목록 조회 (관리자/교직원만)
export const getUsers = async (user: User, roleFilter?: string) => {
  if (!canViewAllAttendance(user)) {
    throw new Error('사용자 목록을 조회할 권한이 없습니다.')
  }

  let query = supabase
    .from('users')
    .select('*')
    .eq('is_active', true)
    .order('name')

  if (roleFilter && roleFilter !== 'all') {
    query = query.eq('role', roleFilter)
  }

  return query
}

// 출퇴근 통계 조회
export const getAttendanceStats = async (user: User, date: string) => {
  const startDate = new Date(date + 'T00:00:00')
  const endDate = new Date(date + 'T23:59:59')
  
  let query = supabase
    .from('attendance_logs')
    .select('scan_type, users(role)')
    .gte('scan_time', startDate.toISOString())
    .lte('scan_time', endDate.toISOString())

  // 학생은 자신의 기록만
  if (user.role === 'student') {
    query = query.eq('user_id', user.id)
  }

  const { data, error } = await query

  if (error) throw error

  const stats = {
    total: data?.length || 0,
    checkin: data?.filter(record => record.scan_type === 'checkin').length || 0,
    checkout: data?.filter(record => record.scan_type === 'checkout').length || 0,
    byRole: {
      student: data?.filter(record => record.users && (record.users as any).role === 'student').length || 0,
      faculty: data?.filter(record => record.users && (record.users as any).role === 'faculty').length || 0,
      admin: data?.filter(record => record.users && (record.users as any).role === 'admin').length || 0
    }
  }

  return stats
} 

// 교수용 출퇴근 통계 함수들
export interface AttendanceStatistics {
  todayAttendance: {
    checkin: User[]
    checkout: User[]
    absent: User[]
    vacation: User[]
    totalStudents: number
    checkinCount: number
    checkoutCount: number
    absentCount: number
    vacationCount: number
  }
  weeklyStats: {
    date: string
    status: AttendanceStatus | null
    checkinTime: string | null
    checkoutTime: string | null
    student: {
      name: string
      user_id: string
      department: string
    }
  }[]
  dailyStats: {
    [date: string]: {
      checkin: number
      checkout: number
      absent: number
      vacation: number
      total: number
    }
  }
}

// 오늘의 출근 현황 조회 (교수용)
export async function getTodayAttendanceStatus(): Promise<{
  checkin: (User & { checkinTime?: string })[]
  checkout: (User & { checkinTime?: string, checkoutTime?: string })[]
  late: (User & { checkinTime?: string })[]
  early_leave: (User & { checkinTime?: string, checkoutTime?: string })[]
  absent: User[]
  vacation: (User & { vacationStartDate?: string, vacationEndDate?: string })[]
  totalStudents: number
  checkinCount: number
  checkoutCount: number
  lateCount: number
  earlyLeaveCount: number
  absentCount: number
  vacationCount: number
}> {
  try {
    // 모든 활성 학생 조회
    const { data: allStudents, error: studentsError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .eq('is_active', true)
      .order('name')

    if (studentsError) throw studentsError

    // 오늘의 모든 출퇴근 기록 조회
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const { data: todayAttendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select(`
        user_id,
        scan_type,
        scan_time,
        is_edited,
        edited_at,
        users!attendance_logs_user_id_fkey (
          id,
          user_id,
          name,
          department,
          role
        )
      `)
      .gte('scan_time', startOfDay.toISOString())
      .lt('scan_time', endOfDay.toISOString())
      .order('scan_time', { ascending: false })

    if (attendanceError) throw attendanceError

    // 오늘 승인된 휴가 신청 조회
    const todayStr = today.toISOString().split('T')[0]
    const { data: todayVacations, error: vacationError } = await supabase
      .from('vacation_requests')
      .select(`
        user_id,
        start_date,
        end_date,
        users!vacation_requests_user_id_fkey (
          id,
          user_id,
          name,
          department,
          role
        )
      `)
      .eq('status', 'approved')
      .lte('start_date', todayStr)
      .gte('end_date', todayStr)

    if (vacationError) throw vacationError

    // 학생별 최신 상태 및 시간 정보 파악
    const studentStatusMap = new Map<string, {
      status: AttendanceStatus,
      checkinTime?: string,
      checkoutTime?: string
    }>()
    
    // 수정된 기록은 edited_at을 기준으로, 원본 기록은 scan_time을 기준으로 최신 상태 결정
    const sortedRecords = todayAttendance?.filter(record => 
      record.users && (record.users as any).role === 'student'
    ).sort((a, b) => {
      const timeA = a.is_edited && a.edited_at ? new Date(a.edited_at) : new Date(a.scan_time)
      const timeB = b.is_edited && b.edited_at ? new Date(b.edited_at) : new Date(b.scan_time)
      return timeB.getTime() - timeA.getTime()
    })
    
    // 각 학생의 출퇴근 시간 정보 수집
    const studentTimeMap = new Map<string, {
      checkinTime?: string,
      checkoutTime?: string
    }>()
    
    // 모든 기록을 순회하여 각 학생의 첫 번째 출근시간과 마지막 퇴근시간을 찾기
    const checkinTimes = new Map<string, string>()
    const checkoutTimes = new Map<string, string>()
    
    // 시간순으로 정렬 (오래된 순서부터)
    const timeOrderedRecords = todayAttendance?.filter(record => 
      record.users && (record.users as any).role === 'student'
    ).sort((a, b) => {
      return new Date(a.scan_time).getTime() - new Date(b.scan_time).getTime()
    })
    
    // 첫 번째 출근 시간과 마지막 퇴근 시간 수집
    timeOrderedRecords?.forEach(record => {
      const studentId = record.user_id
      const scanType = record.scan_type as AttendanceStatus
      const scanTime = record.scan_time
      
      if (scanType === 'checkin' && !checkinTimes.has(studentId)) {
        checkinTimes.set(studentId, scanTime)
      } else if (scanType === 'checkout') {
        checkoutTimes.set(studentId, scanTime) // 마지막 퇴근 시간으로 계속 업데이트
      }
    })
    
         // 시간 정보 맵 구성
     const allStudentIds = new Set([...checkinTimes.keys(), ...checkoutTimes.keys()])
     allStudentIds.forEach((studentId: string) => {
       studentTimeMap.set(studentId, {
         checkinTime: checkinTimes.get(studentId),
         checkoutTime: checkoutTimes.get(studentId)
       })
     })
    
    // 최신 상태 결정 (최신 기록 기준)
    sortedRecords?.forEach(record => {
      const studentId = record.user_id
      const scanType = record.scan_type as AttendanceStatus
      
      if (!studentStatusMap.has(studentId)) {
        const timeInfo = studentTimeMap.get(studentId) || {}
        studentStatusMap.set(studentId, {
          status: scanType,
          checkinTime: timeInfo.checkinTime,
          checkoutTime: timeInfo.checkoutTime
        })
      }
    })

    // 휴가 중인 학생 정보 수집
    const vacationStudentMap = new Map<string, {
      startDate: string,
      endDate: string
    }>()
    
    todayVacations?.forEach(vacation => {
      if (vacation.users && (vacation.users as any).role === 'student') {
        vacationStudentMap.set(vacation.user_id, {
          startDate: vacation.start_date,
          endDate: vacation.end_date
        })
      }
    })

    // 상태별 학생 분류
    const checkinStudents: (User & { checkinTime?: string })[] = []
    const checkoutStudents: (User & { checkinTime?: string, checkoutTime?: string })[] = []
    const lateStudents: (User & { checkinTime?: string })[] = []
    const earlyLeaveStudents: (User & { checkinTime?: string, checkoutTime?: string })[] = []
    const absentStudents: User[] = []
    const vacationStudents: (User & { vacationStartDate?: string, vacationEndDate?: string })[] = []

    allStudents?.forEach(student => {
      const vacationInfo = vacationStudentMap.get(student.id)
      
      // 휴가 중인 학생은 우선적으로 휴가로 분류
      if (vacationInfo) {
        vacationStudents.push({
          ...student,
          vacationStartDate: vacationInfo.startDate,
          vacationEndDate: vacationInfo.endDate
        })
        return
      }
      
      const statusInfo = studentStatusMap.get(student.id)
      const status = statusInfo?.status
      
      switch (status) {
        case 'checkin':
          checkinStudents.push({
            ...student,
            checkinTime: statusInfo?.checkinTime
          })
          break
        case 'checkout':
          checkoutStudents.push({
            ...student,
            checkinTime: statusInfo?.checkinTime,
            checkoutTime: statusInfo?.checkoutTime
          })
          break
        case 'late':
          lateStudents.push({
            ...student,
            checkinTime: statusInfo?.checkinTime
          })
          break
        case 'early_leave':
          earlyLeaveStudents.push({
            ...student,
            checkinTime: statusInfo?.checkinTime,
            checkoutTime: statusInfo?.checkoutTime
          })
          break
        case 'absent':
          absentStudents.push(student)
          break
        case 'vacation':
          // 출퇴근 기록에서 휴가로 표시된 경우 (승인된 휴가 신청 없이)
          vacationStudents.push(student)
          break
        default:
          // 기록이 없는 경우 결근으로 분류
          absentStudents.push(student)
          break
      }
    })

    return {
      checkin: checkinStudents,
      checkout: checkoutStudents,
      late: lateStudents,
      early_leave: earlyLeaveStudents,
      absent: absentStudents,
      vacation: vacationStudents,
      totalStudents: allStudents?.length || 0,
      checkinCount: checkinStudents.length,
      checkoutCount: checkoutStudents.length,
      lateCount: lateStudents.length,
      earlyLeaveCount: earlyLeaveStudents.length,
      absentCount: absentStudents.length,
      vacationCount: vacationStudents.length
    }
  } catch (error) {
    console.error('오늘 출근 현황 조회 오류:', error)
    return {
      checkin: [],
      checkout: [],
      late: [],
      early_leave: [],
      absent: [],
      vacation: [],
      totalStudents: 0,
      checkinCount: 0,
      checkoutCount: 0,
      lateCount: 0,
      earlyLeaveCount: 0,
      absentCount: 0,
      vacationCount: 0
    }
  }
}

// 특정 날짜의 출결 현황 조회 (교수용)
export async function getAttendanceStatusByDate(date: string): Promise<{
  checkin: (User & { checkinTime?: string })[]
  checkout: (User & { checkinTime?: string, checkoutTime?: string })[]
  late: (User & { checkinTime?: string })[]
  early_leave: (User & { checkinTime?: string, checkoutTime?: string })[]
  absent: User[]
  vacation: (User & { vacationStartDate?: string, vacationEndDate?: string })[]
  totalStudents: number
  checkinCount: number
  checkoutCount: number
  lateCount: number
  earlyLeaveCount: number
  absentCount: number
  vacationCount: number
}> {
  try {
    // 모든 활성 학생 조회
    const { data: allStudents, error: studentsError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .eq('is_active', true)
      .order('name')

    if (studentsError) throw studentsError

    // 해당 날짜의 모든 출퇴근 기록 조회
    const startOfDay = new Date(date + 'T00:00:00+09:00')
    const endOfDay = new Date(date + 'T23:59:59+09:00')

    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select(`
        user_id,
        scan_type,
        scan_time,
        is_edited,
        edited_at,
        users!attendance_logs_user_id_fkey (
          id,
          user_id,
          name,
          department,
          role
        )
      `)
      .gte('scan_time', startOfDay.toISOString())
      .lt('scan_time', endOfDay.toISOString())
      .order('scan_time', { ascending: false })

    if (attendanceError) throw attendanceError

    // 해당 날짜의 승인된 휴가 신청 조회
    const { data: vacations, error: vacationError } = await supabase
      .from('vacation_requests')
      .select(`
        user_id,
        start_date,
        end_date,
        users!vacation_requests_user_id_fkey (
          id,
          user_id,
          name,
          department,
          role
        )
      `)
      .eq('status', 'approved')
      .lte('start_date', date)
      .gte('end_date', date)

    if (vacationError) throw vacationError

    // 학생별 최신 상태 및 시간 정보 파악
    const studentStatusMap = new Map<string, {
      status: AttendanceStatus,
      checkinTime?: string,
      checkoutTime?: string
    }>()
    const sortedRecords = attendance?.filter(record => 
      record.users && (record.users as any).role === 'student'
    ).sort((a, b) => {
      const timeA = a.is_edited && a.edited_at ? new Date(a.edited_at) : new Date(a.scan_time)
      const timeB = b.is_edited && b.edited_at ? new Date(b.edited_at) : new Date(b.scan_time)
      return timeB.getTime() - timeA.getTime()
    })
    const studentTimeMap = new Map<string, {
      checkinTime?: string,
      checkoutTime?: string
    }>()
    const checkinTimes = new Map<string, string>()
    const checkoutTimes = new Map<string, string>()
    const timeOrderedRecords = attendance?.filter(record => 
      record.users && (record.users as any).role === 'student'
    ).sort((a, b) => {
      return new Date(a.scan_time).getTime() - new Date(b.scan_time).getTime()
    })
    timeOrderedRecords?.forEach(record => {
      const studentId = record.user_id
      const scanType = record.scan_type as AttendanceStatus
      const scanTime = record.scan_time
      if (scanType === 'checkin' && !checkinTimes.has(studentId)) {
        checkinTimes.set(studentId, scanTime)
      } else if (scanType === 'checkout') {
        checkoutTimes.set(studentId, scanTime)
      }
    })
    const allStudentIds = new Set([...checkinTimes.keys(), ...checkoutTimes.keys()])
    allStudentIds.forEach((studentId: string) => {
      studentTimeMap.set(studentId, {
        checkinTime: checkinTimes.get(studentId),
        checkoutTime: checkoutTimes.get(studentId)
      })
    })
    sortedRecords?.forEach(record => {
      const studentId = record.user_id
      const scanType = record.scan_type as AttendanceStatus
      if (!studentStatusMap.has(studentId)) {
        const timeInfo = studentTimeMap.get(studentId) || {}
        studentStatusMap.set(studentId, {
          status: scanType,
          checkinTime: timeInfo.checkinTime,
          checkoutTime: timeInfo.checkoutTime
        })
      }
    })
    const vacationStudentMap = new Map<string, {
      startDate: string,
      endDate: string
    }>()
    vacations?.forEach(vacation => {
      if (vacation.users && (vacation.users as any).role === 'student') {
        vacationStudentMap.set(vacation.user_id, {
          startDate: vacation.start_date,
          endDate: vacation.end_date
        })
      }
    })
    const checkinStudents: (User & { checkinTime?: string })[] = []
    const checkoutStudents: (User & { checkinTime?: string, checkoutTime?: string })[] = []
    const lateStudents: (User & { checkinTime?: string })[] = []
    const earlyLeaveStudents: (User & { checkinTime?: string, checkoutTime?: string })[] = []
    const absentStudents: User[] = []
    const vacationStudents: (User & { vacationStartDate?: string, vacationEndDate?: string })[] = []
    allStudents?.forEach(student => {
      const vacationInfo = vacationStudentMap.get(student.id)
      if (vacationInfo) {
        vacationStudents.push({
          ...student,
          vacationStartDate: vacationInfo.startDate,
          vacationEndDate: vacationInfo.endDate
        })
        return
      }
      const statusInfo = studentStatusMap.get(student.id)
      const status = statusInfo?.status
      switch (status) {
        case 'checkin':
          checkinStudents.push({
            ...student,
            checkinTime: statusInfo?.checkinTime
          })
          break
        case 'checkout':
          checkoutStudents.push({
            ...student,
            checkinTime: statusInfo?.checkinTime,
            checkoutTime: statusInfo?.checkoutTime
          })
          break
        case 'late':
          lateStudents.push({
            ...student,
            checkinTime: statusInfo?.checkinTime
          })
          break
        case 'early_leave':
          earlyLeaveStudents.push({
            ...student,
            checkinTime: statusInfo?.checkinTime,
            checkoutTime: statusInfo?.checkoutTime
          })
          break
        case 'absent':
          absentStudents.push(student)
          break
        case 'vacation':
          vacationStudents.push(student)
          break
        default:
          absentStudents.push(student)
          break
      }
    })
    return {
      checkin: checkinStudents,
      checkout: checkoutStudents,
      late: lateStudents,
      early_leave: earlyLeaveStudents,
      absent: absentStudents,
      vacation: vacationStudents,
      totalStudents: allStudents?.length || 0,
      checkinCount: checkinStudents.length,
      checkoutCount: checkoutStudents.length,
      lateCount: lateStudents.length,
      earlyLeaveCount: earlyLeaveStudents.length,
      absentCount: absentStudents.length,
      vacationCount: vacationStudents.length
    }
  } catch (error) {
    console.error('특정 날짜 출근 현황 조회 오류:', error)
    return {
      checkin: [],
      checkout: [],
      late: [],
      early_leave: [],
      absent: [],
      vacation: [],
      totalStudents: 0,
      checkinCount: 0,
      checkoutCount: 0,
      lateCount: 0,
      earlyLeaveCount: 0,
      absentCount: 0,
      vacationCount: 0
    }
  }
}

// 학생 개인의 30일간 출퇴근 기록 조회
export async function getStudent30DaysAttendanceRecords(userId: string): Promise<{
  date: string
  checkinTime: string | null
  checkoutTime: string | null
  status: AttendanceStatus | null
  absence_reason: string | null
  is_edited: boolean
}[]> {
  try {
    // 한국 시간 기준으로 지난 30일간의 날짜 배열 생성
    const now = new Date()
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC + 9시간
    const dates: string[] = []
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(koreaTime)
      date.setDate(date.getDate() - i)
      dates.push(date.toISOString().split('T')[0])
    }

    // 30일간의 모든 출퇴근 기록 조회 (한국 시간 기준)
    const startDate = new Date(koreaTime)
    startDate.setDate(startDate.getDate() - 29)
    startDate.setHours(0, 0, 0, 0)
    
    const endDate = new Date(koreaTime)
    endDate.setHours(23, 59, 59, 999)

    const { data: records, error } = await supabase
      .from('attendance_logs')
      .select('scan_time, scan_type, absence_reason, is_edited')
      .eq('user_id', userId)
      .gte('scan_time', startDate.toISOString())
      .lte('scan_time', endDate.toISOString())
      .order('scan_time')

    if (error) throw error

    // 날짜별로 기록 정리 (한국 시간 기준)
    const result = dates.map(date => {
      const dayRecords = records?.filter(record => {
        // 기록 시간을 한국 시간으로 변환
        const recordTime = new Date(record.scan_time)
        const recordKoreaTime = new Date(recordTime.getTime() + (9 * 60 * 60 * 1000))
        const recordDate = recordKoreaTime.toISOString().split('T')[0]
        return recordDate === date
      }) || []

      // 각 날짜의 첫 번째와 마지막 기록을 찾아서 출근/퇴근 시간 결정
      let checkinTime: string | null = null
      let checkoutTime: string | null = null
      let status: AttendanceStatus | null = null
      let absence_reason: string | null = null
      let is_edited = false

      if (dayRecords.length > 0) {
        // 출근 기록 찾기 (checkin, late)
        const checkinRecord = dayRecords.find(r => r.scan_type === 'checkin' || r.scan_type === 'late')
        if (checkinRecord) {
          checkinTime = checkinRecord.scan_time
          status = checkinRecord.scan_type
          is_edited = checkinRecord.is_edited
        }

        // 퇴근 기록 찾기 (checkout, early_leave)
        const checkoutRecord = dayRecords.find(r => r.scan_type === 'checkout' || r.scan_type === 'early_leave')
        if (checkoutRecord) {
          checkoutTime = checkoutRecord.scan_time
          if (status === 'checkin') {
            status = 'checkout' // 정상 출퇴근 완료
          } else if (status === 'late') {
            status = checkoutRecord.scan_type === 'early_leave' ? 'early_leave' : 'late'
          }
        }

        // 결석 또는 휴가 기록
        const absentRecord = dayRecords.find(r => r.scan_type === 'absent' || r.scan_type === 'vacation')
        if (absentRecord) {
          status = absentRecord.scan_type
          absence_reason = absentRecord.absence_reason
          is_edited = absentRecord.is_edited
        }
      }

      return {
        date,
        checkinTime,
        checkoutTime,
        status,
        absence_reason,
        is_edited
      }
    })

    return result // 최신 날짜부터 표시 (이미 최신순으로 생성됨)
  } catch (error) {
    console.error('30일 출퇴근 기록 조회 오류:', error)
    return []
  }
}

// 1주일간 학생 출퇴근 통계 조회 (교수용)
export async function getWeeklyAttendanceStats(): Promise<{
  date: string
  status: AttendanceStatus | null
  checkinTime: string | null
  checkoutTime: string | null
  student: {
    name: string
    user_id: string
    department: string
  }
}[]> {
  try {
    // 오늘을 포함한 지난 7일간의 데이터 조회 (한국시간 기준)
    const now = new Date()
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC + 9시간
    const endDate = new Date(koreaTime)
    endDate.setDate(endDate.getDate() + 1) // 오늘 포함하기 위해 내일까지
    
    const startDate = new Date(koreaTime)
    startDate.setDate(startDate.getDate() - 6) // 오늘 포함 7일

    console.log('주간 통계 날짜 범위:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateKST: startDate.toLocaleString('ko-KR'),
      endDateKST: endDate.toLocaleString('ko-KR')
    })

    // 먼저 학생 사용자들의 ID를 가져옴
    const { data: students, error: studentsError } = await supabase
      .from('users')
      .select('id, user_id, name, department')
      .eq('role', 'student')

    if (studentsError) throw studentsError

    const studentIds = students?.map(s => s.id) || []

    // 수정된 기록은 수정된 시간을 우선적으로 사용
    const { data: weeklyData, error } = await supabase
      .from('attendance_logs')
      .select('scan_time, scan_type, user_id, is_edited, edited_at')
      .in('user_id', studentIds)
      .gte('scan_time', startDate.toISOString())
      .lt('scan_time', endDate.toISOString())
      .order('scan_time', { ascending: true })

    if (error) throw error

    // 학생 정보를 ID로 매핑
    const studentMap = new Map(students?.map(s => [s.id, s]) || [])

    // 날짜별, 학생별로 그룹화
    const groupedData: { [key: string]: any } = {}

    weeklyData?.forEach(record => {
      const student = studentMap.get(record.user_id)
      if (!student) return

      // 수정된 기록이면 수정된 시간을 사용, 아니면 원래 시간 사용
      const effectiveTime = record.is_edited && record.edited_at ? record.edited_at : record.scan_time
      // KST(한국시간) 기준 날짜 추출
      const kstDateObj = new Date(new Date(effectiveTime).getTime() + 9 * 60 * 60 * 1000)
      const date = kstDateObj.toISOString().split('T')[0]
      const studentKey = `${date}_${student.user_id}`

      if (!groupedData[studentKey]) {
        groupedData[studentKey] = {
          date,
          student: {
            name: student.name,
            user_id: student.user_id,
            department: student.department
          },
          status: null,
          checkinTime: null,
          checkoutTime: null
        }
      }

      if (record.scan_type === 'checkin') {
        groupedData[studentKey].checkinTime = effectiveTime
        groupedData[studentKey].status = 'checkin'
      } else if (record.scan_type === 'checkout') {
        groupedData[studentKey].checkoutTime = effectiveTime
        groupedData[studentKey].status = 'checkout'
      } else if (record.scan_type === 'absent') {
        groupedData[studentKey].status = 'absent'
      } else if (record.scan_type === 'vacation') {
        groupedData[studentKey].status = 'vacation'
      }
    })

    const result = Object.values(groupedData).sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    console.log('주간 통계 결과:', result)
    return result
  } catch (error) {
    console.error('주간 출퇴근 통계 조회 오류:', error)
    return []
  }
}

// 일별 출석 통계 조회 (교수용)
export async function getDailyAttendanceStats(days: number = 30): Promise<{
  [date: string]: {
    checkin: number
    checkout: number
    absent: number
    vacation: number
    total: number
  }
}> {
  try {
    // 전체 학생 수 조회
    const { data: allStudents, error: studentsError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'student')

    if (studentsError) throw studentsError

    const totalStudents = allStudents?.length || 0

    // 오늘을 포함한 지난 N일간의 출근 데이터 조회 (한국시간 기준)
    const now = new Date()
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC + 9시간
    const endDate = new Date(koreaTime)
    endDate.setDate(endDate.getDate() + 1) // 오늘 포함하기 위해 내일까지
    
    const startDate = new Date(koreaTime)
    startDate.setDate(startDate.getDate() - (days - 1)) // 오늘 포함 N일

    console.log('일별 통계 날짜 범위:', {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      startDateKST: startDate.toLocaleString('ko-KR'),
      endDateKST: endDate.toLocaleString('ko-KR'),
      totalStudents
    })

    // 수정된 기록은 수정된 시간을 우선적으로 사용
    const { data: attendanceData, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select(`
        scan_time,
        scan_type,
        user_id,
        is_edited,
        edited_at,
        users!attendance_logs_user_id_fkey (role)
      `)
      .eq('users.role', 'student')
      .gte('scan_time', startDate.toISOString())
      .lt('scan_time', endDate.toISOString())

    if (attendanceError) throw attendanceError

    // 날짜별로 그룹화
    const dailyStats: { [date: string]: { checkin: number; checkout: number; absent: number; vacation: number; total: number } } = {}

    // 날짜 범위 초기화 (한국시간 기준)
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      dailyStats[dateStr] = {
        checkin: 0,
        checkout: 0,
        absent: totalStudents,
        vacation: 0,
        total: totalStudents
      }
    }

    console.log('초기화된 일별 통계:', dailyStats)

    // 날짜별, 학생별로 최신 상태 파악
    const studentStatusByDate: { [key: string]: AttendanceStatus } = {}
    
    // 먼저 모든 기록을 시간순으로 정렬하여 최신 상태 파악
    attendanceData?.forEach(record => {
      // 수정된 기록이면 수정된 시간을 사용, 아니면 원래 시간 사용
      const effectiveTime = record.is_edited && record.edited_at ? record.edited_at : record.scan_time
      const date = new Date(effectiveTime).toISOString().split('T')[0]
      const studentDateKey = `${record.user_id}_${date}`
      
      if (dailyStats[date]) {
        // 같은 날짜에 여러 기록이 있으면 가장 최신 상태로 덮어씀
        studentStatusByDate[studentDateKey] = record.scan_type as AttendanceStatus
      }
    })
    
    // 학생별 최신 상태를 기준으로 통계 계산
    Object.entries(studentStatusByDate).forEach(([studentDateKey, status]) => {
      const [, date] = studentDateKey.split('_')
      
      if (dailyStats[date]) {
        if (status === 'checkin') {
          dailyStats[date].checkin += 1
          dailyStats[date].absent -= 1
        } else if (status === 'checkout') {
          dailyStats[date].checkout += 1
          dailyStats[date].absent -= 1 // checkout도 출석으로 간주
        } else if (status === 'absent') {
          // absent는 이미 초기화되어 있음
        } else if (status === 'vacation') {
          dailyStats[date].vacation += 1
          dailyStats[date].absent -= 1
        }
      }
    })

    console.log('최종 일별 통계:', dailyStats)
    return dailyStats
  } catch (error) {
    console.error('일별 출석 통계 조회 오류:', error)
    return {}
  }
} 

const ALLOWED_SCAN_TYPES = ['checkin', 'checkout', 'late', 'early_leave', 'absent', 'vacation'] as const

function isValidScanType(type: any): type is AttendanceStatus {
  return ALLOWED_SCAN_TYPES.includes(type)
}

// 교수가 학생의 출퇴근 상태를 수동으로 설정하는 함수
export async function setStudentAttendanceStatus(
  studentId: string,
  status: AttendanceStatus,
  date: string,
  editorUser: User,
  location?: string
): Promise<boolean> {
  try {
    if (!isValidScanType(status)) {
      throw new Error('scan_type 값이 올바르지 않습니다: ' + status)
    }
    console.log('상태 변경 시작:', { studentId, status, date, editorUser: editorUser.user_id })
    
    // 교수 권한 확인
    if (!hasFacultyAccess(editorUser)) {
      throw new Error('출퇴근 상태를 변경할 권한이 없습니다.')
    }

    // 해당 날짜의 기존 기록 확인
    const startDate = new Date(date)
    const endDate = new Date(date)
    endDate.setDate(endDate.getDate() + 1)

    console.log('기존 기록 조회 중...', { startDate: startDate.toISOString(), endDate: endDate.toISOString() })

    const { data: existingRecords, error: fetchError } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('user_id', studentId)
      .gte('scan_time', startDate.toISOString())
      .lt('scan_time', endDate.toISOString())

    if (fetchError) {
      console.error('기존 기록 조회 오류:', fetchError)
      throw fetchError
    }

    console.log('기존 기록 조회 결과:', existingRecords)

    const timestamp = new Date().toISOString()

    // 결근/휴가로 변경 시 기존 기록 삭제 후 새로 생성
    if (status === 'absent' || status === 'vacation') {
      if (existingRecords && existingRecords.length > 0) {
        const ids = existingRecords.map(r => r.id)
        const { error: deleteError } = await supabase
          .from('attendance_logs')
          .delete()
          .in('id', ids)
        if (deleteError) {
          console.error('기존 기록 삭제 오류:', deleteError)
          throw deleteError
        }
      }
      // 결근/휴가 기록 새로 생성
      console.log('[INSERT] scan_type:', status)
      const { error: insertError } = await supabase
        .from('attendance_logs')
        .insert({
          user_id: studentId,
          scan_time: timestamp,
          scan_type: status,
          location: location || null,
          is_edited: true,
          edited_by: editorUser.id,
          edited_at: timestamp
        })
      if (insertError) {
        console.error('결근/휴가 기록 생성 오류:', insertError)
        throw insertError
      }
      console.log('결근/휴가 기록 생성 완료')
    } else if (status === 'late') {
      const checkinOrLate = existingRecords && existingRecords.find(r => r.scan_type === 'checkin' || r.scan_type === 'late')
      if (checkinOrLate) {
        console.log('[UPDATE] scan_type: late')
        const { error: updateError } = await supabase
          .from('attendance_logs')
          .update({
            scan_type: 'late',
            location: location || null,
            is_edited: true,
            edited_by: editorUser.id,
            edited_at: timestamp
          })
          .eq('id', checkinOrLate.id)
        if (updateError) {
          console.error('지각 기록 업데이트 오류:', updateError)
          throw updateError
        }
        console.log('출근/지각 기록을 지각으로 변경 완료')
      } else {
        if (existingRecords && existingRecords.length > 0) {
          const ids = existingRecords.map(r => r.id)
          const { error: deleteError } = await supabase
            .from('attendance_logs')
            .delete()
            .in('id', ids)
          if (deleteError) {
            console.error('기존 기록 삭제 오류:', deleteError)
            throw deleteError
          }
        }
        console.log('[INSERT] scan_type: late')
        const { error: insertError } = await supabase
          .from('attendance_logs')
          .insert({
            user_id: studentId,
            scan_time: timestamp,
            scan_type: 'late',
            location: location || null,
            is_edited: true,
            edited_by: editorUser.id,
            edited_at: timestamp
          })
        if (insertError) {
          console.error('지각 기록 생성 오류:', insertError)
          throw insertError
        }
        console.log('지각 기록 새로 생성 완료')
      }
    } else {
      if (existingRecords && existingRecords.length > 0) {
        const latestRecord = existingRecords[existingRecords.length - 1]
        console.log('[UPDATE] scan_type:', status)
        const { error: updateError } = await supabase
          .from('attendance_logs')
          .update({
            scan_type: status,
            location: location || null,
            is_edited: true,
            edited_by: editorUser.id,
            edited_at: timestamp
          })
          .eq('id', latestRecord.id)
        if (updateError) {
          console.error('기록 업데이트 오류:', updateError)
          throw updateError
        }
        console.log('기록 업데이트 완료')
      } else {
        console.log('[INSERT] scan_type:', status)
        const { error: insertError } = await supabase
          .from('attendance_logs')
          .insert({
            user_id: studentId,
            scan_time: timestamp,
            scan_type: status,
            location: location || null,
            is_edited: true,
            edited_by: editorUser.id,
            edited_at: timestamp
          })
        if (insertError) {
          console.error('새 기록 생성 오류:', insertError)
          throw insertError
        }
        console.log('새 기록 생성 완료')
      }
    }

    console.log('상태 변경 성공')
    return true
  } catch (error) {
    console.error('학생 출퇴근 상태 설정 오류:', error)
    return false
  }
}

// 상태별 라벨 반환 함수
export function getAttendanceStatusLabel(status: AttendanceStatus): string {
  switch (status) {
    case 'checkin':
      return '출근'
    case 'checkout':
      return '퇴근'
    case 'late':
      return '지각'
    case 'early_leave':
      return '조기퇴근'
    case 'absent':
      return '결근'
    case 'vacation':
      return '휴가'
    default:
      return '알 수 없음'
  }
}

// 상태별 색상 반환 함수
export function getAttendanceStatusColor(status: AttendanceStatus): string {
  switch (status) {
    case 'checkin':
      return 'bg-green-100 text-green-800'
    case 'checkout':
      return 'bg-blue-100 text-blue-800'
    case 'late':
      return 'bg-orange-100 text-orange-800'
    case 'early_leave':
      return 'bg-purple-100 text-purple-800'
    case 'absent':
      return 'bg-red-100 text-red-800'
    case 'vacation':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
} 

// 휴가 신청 관련 타입
export type VacationRequestType = 'vacation' | 'sick_leave' | 'personal'
export type VacationRequestStatus = 'pending' | 'approved' | 'rejected'

export interface VacationRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  reason: string
  request_type: VacationRequestType
  status: VacationRequestStatus
  reviewer_id?: string
  reviewed_at?: string
  review_comment?: string
  created_at: string
  updated_at: string
  users?: {
    user_id: string
    name: string
    department: string
    role: string
  }
  reviewer?: {
    user_id: string
    name: string
    department: string
    role: string
  }
}

// 휴가 신청 생성 함수
export async function createVacationRequest(
  userId: string,
  startDate: string,
  endDate: string,
  reason: string,
  requestType: VacationRequestType = 'vacation'
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vacation_requests')
      .insert({
        user_id: userId,
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        request_type: requestType,
        status: 'pending'
      })

    if (error) throw error
    return true
  } catch (error) {
    console.error('휴가 신청 생성 오류:', error)
    return false
  }
}

// 휴가 신청 목록 조회 (교수용 - 모든 신청, 학생용 - 본인 신청만)
export async function getVacationRequests(
  user: User,
  status?: VacationRequestStatus
): Promise<VacationRequest[]> {
  try {
    let query = supabase
      .from('vacation_requests')
      .select(`
        *,
        users!vacation_requests_user_id_fkey (
          user_id,
          name,
          department,
          role
        ),
        reviewer:users!vacation_requests_reviewer_id_fkey (
          user_id,
          name,
          department,
          role
        )
      `)
      .order('created_at', { ascending: false })

    // 학생은 본인 신청만 조회
    if (user.role === 'student') {
      query = query.eq('user_id', user.id)
    }

    // 상태 필터
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('휴가 신청 목록 조회 오류:', error)
    return []
  }
}

// 휴가 신청 승인/거절 함수
export async function reviewVacationRequest(
  requestId: string,
  reviewerId: string,
  status: 'approved' | 'rejected',
  reviewComment?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vacation_requests')
      .update({
        status: status,
        reviewer_id: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_comment: reviewComment || null
      })
      .eq('id', requestId)

    if (error) throw error

    // 승인된 경우 해당 기간에 휴가 출퇴근 기록 자동 생성
    if (status === 'approved') {
      const { data: request } = await supabase
        .from('vacation_requests')
        .select('user_id, start_date, end_date')
        .eq('id', requestId)
        .single()

      if (request) {
        await createVacationAttendanceRecords(
          request.user_id,
          request.start_date,
          request.end_date
        )
      }
    }

    return true
  } catch (error) {
    console.error('휴가 신청 검토 오류:', error)
    return false
  }
}

// 승인된 휴가 기간에 자동으로 휴가 출퇴근 기록 생성
async function createVacationAttendanceRecords(
  userId: string,
  startDate: string,
  endDate: string
): Promise<void> {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const records = []

    // 시작일부터 종료일까지 반복
    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]
      
      // 해당 날짜에 이미 기록이 있는지 확인
      const { data: existingRecord } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('user_id', userId)
        .gte('scan_time', `${dateStr}T00:00:00Z`)
        .lt('scan_time', `${dateStr}T23:59:59Z`)
        .limit(1)

      // 기존 기록이 없으면 휴가 기록 생성
      if (!existingRecord || existingRecord.length === 0) {
        records.push({
          user_id: userId,
          scan_time: `${dateStr}T09:00:00Z`, // 오전 9시로 설정
          scan_type: 'vacation',
          location: '휴가'
        })
      }
    }

    if (records.length > 0) {
      const { error } = await supabase
        .from('attendance_logs')
        .insert(records)

      if (error) throw error
    }
  } catch (error) {
    console.error('휴가 출퇴근 기록 생성 오류:', error)
  }
}

// 대기 중인 휴가 신청 개수 조회 (교수용)
export async function getPendingVacationRequestsCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('vacation_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (error) throw error
    return count || 0
  } catch (error) {
    console.error('대기 중인 휴가 신청 개수 조회 오류:', error)
    return 0
  }
}

// 결석 사유 업데이트 함수
export async function updateAbsenceReason(
  recordId: string,
  absenceReason: string,
  editorUser: User
): Promise<boolean> {
  try {
    // 학생은 자신의 결석 기록만, 교직원은 모든 기록을 수정할 수 있음
    if (editorUser.role === 'student') {
      // 학생의 경우 자신의 기록인지 확인
      const { data: record } = await supabase
        .from('attendance_logs')
        .select('user_id')
        .eq('id', recordId)
        .single()
      
      if (!record || record.user_id !== editorUser.id) {
        throw new Error('자신의 결석 기록만 수정할 수 있습니다.')
      }
    } else if (!canEditAttendance(editorUser)) {
      throw new Error('결석 사유를 수정할 권한이 없습니다.')
    }

    const { error } = await supabase
      .from('attendance_logs')
      .update({
        absence_reason: absenceReason,
        is_edited: true,
        edited_by: editorUser.id,
        edited_at: toLocalISOString()
      })
      .eq('id', recordId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('결석 사유 업데이트 오류:', error)
    return false
  }
}

// 휴가 신청 타입 라벨 반환
export function getVacationRequestTypeLabel(type: VacationRequestType): string {
  switch (type) {
    case 'vacation':
      return '휴가'
    case 'sick_leave':
      return '병가'
    case 'personal':
      return '개인사정'
    default:
      return '알 수 없음'
  }
}

// 휴가 신청 상태 라벨 반환
export function getVacationRequestStatusLabel(status: VacationRequestStatus): string {
  switch (status) {
    case 'pending':
      return '대기 중'
    case 'approved':
      return '승인됨'
    case 'rejected':
      return '거절됨'
    default:
      return '알 수 없음'
  }
}

// 휴가 신청 상태 색상 반환
export function getVacationRequestStatusColor(status: VacationRequestStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800'
    case 'approved':
      return 'bg-green-100 text-green-800'
    case 'rejected':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
} 

// 출퇴근 시간 설정 관련 인터페이스 및 함수들
export interface WorkTimeSettings {
  checkin_deadline_hour: number // ~시 전까지는 출근으로 처리
  checkout_start_hour: number   // ~시 이후로는 퇴근으로 처리
  operating_start_hour: number  // 운영 시작 시간
  operating_end_hour: number    // 운영 종료 시간
}

// 기본 출퇴근 시간 설정
const DEFAULT_WORK_TIME_SETTINGS: WorkTimeSettings = {
  checkin_deadline_hour: 10,    // 10시 전까지는 출근
  checkout_start_hour: 18,      // 18시 이후로는 퇴근
  operating_start_hour: 8,      // 오전 8시부터 운영
  operating_end_hour: 22        // 오후 10시까지 운영
}

// 출퇴근 시간 설정 저장 (localStorage 방식)
export function saveWorkTimeSettings(settings: WorkTimeSettings): boolean {
  try {
    localStorage.setItem('workTimeSettings', JSON.stringify(settings))
    return true
  } catch (error) {
    console.error('출퇴근 시간 설정 저장 오류:', error)
    return false
  }
}

// 출퇴근 시간 설정 로드 (localStorage 방식)
export function loadWorkTimeSettings(): WorkTimeSettings {
  try {
    const saved = localStorage.getItem('workTimeSettings')
    if (saved) {
      return JSON.parse(saved)
    }
  } catch (error) {
    console.error('출퇴근 시간 설정 로드 오류:', error)
  }
  
  return DEFAULT_WORK_TIME_SETTINGS
}

// 현재 시간과 사용자의 출석 상태를 기준으로 출근/퇴근 여부 판단
export async function determineAttendanceType(
  currentHour: number, 
  userId: string, 
  settings?: WorkTimeSettings
): Promise<AttendanceStatus> {
  const workSettings = settings || loadWorkTimeSettings()
  
  if (currentHour < workSettings.checkin_deadline_hour) {
    // 출근 시간대
    return 'checkin'
  } else if (currentHour >= workSettings.checkout_start_hour) {
    // 퇴근 시간대
    return 'checkout'
  } else {
    // 출근 마감시간과 퇴근 시작시간 사이
    // 사용자의 오늘 출석 상태를 확인하여 판단
    const todayRecords = await getUserAttendanceRecords(userId, new Date().toISOString().split('T')[0])
    
    // 오늘 이미 출근 기록이 있으면 조기퇴근, 없으면 지각
    const hasCheckinToday = todayRecords.some(record => 
      record.scan_type === 'checkin' || record.scan_type === 'late'
    )
    
    return hasCheckinToday ? 'early_leave' : 'late'
  }
}

// 운영 시간 체크
export function isOperatingHours(currentHour: number, settings?: WorkTimeSettings): boolean {
  const workSettings = settings || loadWorkTimeSettings()
  return currentHour >= workSettings.operating_start_hour && currentHour < workSettings.operating_end_hour
}

// 시간 설정 유효성 검사
export function validateWorkTimeSettings(settings: WorkTimeSettings): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // 시간 범위 검사 (0-23)
  if (settings.checkin_deadline_hour < 0 || settings.checkin_deadline_hour > 23) {
    errors.push('출근 마감 시간은 0-23 사이여야 합니다.')
  }
  
  if (settings.checkout_start_hour < 0 || settings.checkout_start_hour > 23) {
    errors.push('퇴근 시작 시간은 0-23 사이여야 합니다.')
  }
  
  if (settings.operating_start_hour < 0 || settings.operating_start_hour > 23) {
    errors.push('운영 시작 시간은 0-23 사이여야 합니다.')
  }
  
  if (settings.operating_end_hour < 0 || settings.operating_end_hour > 23) {
    errors.push('운영 종료 시간은 0-23 사이여야 합니다.')
  }
  
  // 논리적 순서 검사
  if (settings.checkin_deadline_hour >= settings.checkout_start_hour) {
    errors.push('출근 마감 시간은 퇴근 시작 시간보다 빨라야 합니다.')
  }
  
  if (settings.operating_start_hour >= settings.operating_end_hour) {
    errors.push('운영 시작 시간은 운영 종료 시간보다 빨라야 합니다.')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
} 

// 장소 목록 조회
export async function getLocations(): Promise<{id: string, name: string, latitude?: number, longitude?: number}[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, latitude, longitude')
    .order('created_at', { ascending: true })
  if (error) {
    console.error('장소 목록 조회 오류:', error)
    return []
  }
  return data || []
}

// 장소 목록(좌표 포함) 조회
export async function getLocationsWithCoords(): Promise<{id: string, name: string, latitude: number, longitude: number, radius: number}[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('id, name, latitude, longitude, radius')
    .order('created_at', { ascending: true })
  if (error) {
    console.error('장소 목록(좌표 포함) 조회 오류:', error)
    return []
  }
  return data || []
}

// 두 좌표 간 거리(m) 계산 (하버사인 공식)
function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // 지구 반지름(m)
  const toRad = (deg: number) => deg * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 주어진 좌표가 반경 내에 있는 시설명 반환 (없으면 undefined)
export async function getLocationNameByCoords(latitude: number, longitude: number): Promise<string | undefined> {
  const locations = await getLocationsWithCoords()
  for (const loc of locations) {
    if (loc.latitude && loc.longitude && loc.radius) {
      const dist = getDistanceMeters(latitude, longitude, loc.latitude, loc.longitude)
      if (dist <= loc.radius) {
        return loc.name
      }
    }
  }
  return undefined
}

// 장소 추가
export async function addLocation(name: string, latitude?: number, longitude?: number): Promise<boolean> {
  const insertData: any = { name }
  if (latitude !== undefined && longitude !== undefined) {
    insertData.latitude = latitude
    insertData.longitude = longitude
  }
  
  const { error } = await supabase
    .from('locations')
    .insert(insertData)
  if (error) {
    console.error('장소 추가 오류:', error)
    return false
  }
  return true
}

// 장소 삭제
export async function deleteLocation(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('locations')
    .delete()
    .eq('id', id)
  if (error) {
    console.error('장소 삭제 오류:', error)
    return false
  }
  return true
}

// ===============================
// 그룹/프로젝트 관리 함수들
// ===============================

export interface Group {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  created_by: string
  created_at: string
  updated_at: string
  memberCount?: number
}

export interface GroupMembership {
  id: string
  group_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export interface GroupWorkSettings {
  id: string
  group_id: string
  checkin_deadline_hour: number
  checkin_deadline_minute: number
  checkout_start_hour: number
  checkout_start_minute: number
}

export interface NotificationData {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export interface VacationRequest {
  id: string
  user_id: string
  group_id: string
  type: string
  start_date: string
  end_date: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

// 그룹 생성
export async function createGroup(groupData: {
  name: string
  description: string
  status?: 'active' | 'inactive'
}, creatorId: string): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: groupData.name,
        description: groupData.description,
        status: groupData.status || 'active',
        created_by: creatorId
      })
      .select()
      .single()

    if (error) {
      console.error('그룹 생성 오류:', error)
      return null
    }

    // 생성자를 관리자로 그룹에 추가
    await addUserToGroup(data.id, creatorId, 'admin')

    return data
  } catch (error) {
    console.error('그룹 생성 예외:', error)
    return null
  }
}

// 사용자의 그룹 목록 조회
export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    const { data, error } = await supabase
      .from('group_memberships')
      .select(`
        groups (
          id,
          name,
          description,
          status,
          created_by,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)

    if (error) {
      console.error('사용자 그룹 조회 오류:', error)
      return []
    }

    return data?.map(item => item.groups).filter(Boolean) || []
  } catch (error) {
    console.error('사용자 그룹 조회 예외:', error)
    return []
  }
}

// 교직원이 관리하는 모든 그룹 조회 (멤버 수 포함)
export async function getFacultyGroups(facultyId: string): Promise<Group[]> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        *,
        group_memberships!inner(count)
      `)
      .eq('created_by', facultyId)

    if (error) {
      console.error('교직원 그룹 조회 오류:', error)
      return []
    }

    // 각 그룹의 멤버 수 조회
    const groupsWithMemberCount = await Promise.all(
      (data || []).map(async (group) => {
        const { count } = await supabase
          .from('group_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', group.id)

        return {
          ...group,
          memberCount: count || 0
        }
      })
    )

    return groupsWithMemberCount
  } catch (error) {
    console.error('교직원 그룹 조회 예외:', error)
    return []
  }
}

// 그룹 정보 조회
export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (error) {
      console.error('그룹 조회 오류:', error)
      return null
    }

    // 멤버 수 조회
    const { count } = await supabase
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)

    return {
      ...data,
      memberCount: count || 0
    }
  } catch (error) {
    console.error('그룹 조회 예외:', error)
    return null
  }
}

// 그룹 수정
export async function updateGroup(groupId: string, updates: Partial<Group>): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('groups')
      .update(updates)
      .eq('id', groupId)

    if (error) {
      console.error('그룹 수정 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('그룹 수정 예외:', error)
    return false
  }
}

// 그룹 삭제
export async function deleteGroup(groupId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      console.error('그룹 삭제 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('그룹 삭제 예외:', error)
    return false
  }
}

// 사용자를 그룹에 추가
export async function addUserToGroup(groupId: string, userId: string, role: 'admin' | 'member' = 'member'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('group_memberships')
      .insert({
        group_id: groupId,
        user_id: userId,
        role: role
      })

    if (error) {
      console.error('그룹 멤버 추가 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('그룹 멤버 추가 예외:', error)
    return false
  }
}

// 그룹에서 사용자 제거
export async function removeUserFromGroup(groupId: string, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) {
      console.error('그룹 멤버 제거 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('그룹 멤버 제거 예외:', error)
    return false
  }
}

// 그룹 멤버 목록 조회
export async function getGroupMembers(groupId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('group_memberships')
      .select(`
        *,
        users (
          id,
          user_id,
          name,
          department,
          role,
          position,
          semester
        )
      `)
      .eq('group_id', groupId)

    if (error) {
      console.error('그룹 멤버 조회 오류:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('그룹 멤버 조회 예외:', error)
    return []
  }
}

// ===============================
// 알림 관리 함수들
// ===============================

// 알림 생성
export async function createNotification(notificationData: {
  user_id: string
  type: string
  title: string
  message: string
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert(notificationData)

    if (error) {
      console.error('알림 생성 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('알림 생성 예외:', error)
    return false
  }
}

// 사용자 알림 목록 조회
export async function getUserNotifications(userId: string): Promise<NotificationData[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('알림 조회 오류:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('알림 조회 예외:', error)
    return []
  }
}

// 알림 읽음 처리
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)

    if (error) {
      console.error('알림 읽음 처리 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('알림 읽음 처리 예외:', error)
    return false
  }
}

// ===============================
// 휴가 신청 관리 함수들
// ===============================

// 휴가 신청 생성
export async function createVacationRequest(requestData: {
  user_id: string
  group_id: string
  type: string
  start_date: string
  end_date: string
  reason: string
}): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vacation_requests')
      .insert(requestData)

    if (error) {
      console.error('휴가 신청 생성 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('휴가 신청 생성 예외:', error)
    return false
  }
}

// 사용자의 휴가 신청 목록 조회
export async function getUserVacationRequests(userId: string): Promise<VacationRequest[]> {
  try {
    const { data, error } = await supabase
      .from('vacation_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('휴가 신청 조회 오류:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('휴가 신청 조회 예외:', error)
    return []
  }
}

// 그룹의 대기 중인 휴가 신청 조회
export async function getPendingVacationRequests(groupId: string): Promise<VacationRequest[]> {
  try {
    const { data, error } = await supabase
      .from('vacation_requests')
      .select(`
        *,
        users (
          name,
          user_id,
          department
        )
      `)
      .eq('group_id', groupId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('대기 중인 휴가 신청 조회 오류:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('대기 중인 휴가 신청 조회 예외:', error)
    return []
  }
}

// 휴가 신청 승인/거부
export async function updateVacationRequestStatus(
  requestId: string, 
  status: 'approved' | 'rejected', 
  approvedBy: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('vacation_requests')
      .update({
        status,
        approved_by: approvedBy,
        approved_at: toLocalISOString()
      })
      .eq('id', requestId)

    if (error) {
      console.error('휴가 신청 상태 업데이트 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('휴가 신청 상태 업데이트 예외:', error)
    return false
  }
}

// ===============================
// 그룹별 출퇴근 설정 함수들
// ===============================

// 그룹 출퇴근 설정 조회
export async function getGroupWorkSettings(groupId: string): Promise<GroupWorkSettings | null> {
  try {
    const { data, error } = await supabase
      .from('group_work_settings')
      .select('*')
      .eq('group_id', groupId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116은 "no rows returned" 에러
      console.error('그룹 출퇴근 설정 조회 오류:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('그룹 출퇴근 설정 조회 예외:', error)
    return null
  }
}

// 그룹 출퇴근 설정 생성/업데이트
export async function upsertGroupWorkSettings(
  groupId: string, 
  settings: {
    checkin_deadline_hour: number
    checkin_deadline_minute: number
    checkout_start_hour: number
    checkout_start_minute: number
  }
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('group_work_settings')
      .upsert({
        group_id: groupId,
        ...settings
      })

    if (error) {
      console.error('그룹 출퇴근 설정 저장 오류:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('그룹 출퇴근 설정 저장 예외:', error)
    return false
  }
}

// ===============================
// 그룹별 출석 통계 함수들
// ===============================

// 그룹의 오늘 출석 현황
export async function getGroupTodayAttendance(groupId: string): Promise<any> {
  try {
    const today = toLocalISOString().split('T')[0]
    
    // 그룹 멤버들의 오늘 출석 기록 조회
    const { data, error } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        users!inner (
          id,
          user_id,
          name,
          department,
          group_memberships!inner (
            group_id
          )
        )
      `)
      .gte('scan_time', `${today}T00:00:00`)
      .lt('scan_time', `${today}T23:59:59`)
      .eq('users.group_memberships.group_id', groupId)

    if (error) {
      console.error('그룹 오늘 출석 현황 조회 오류:', error)
      return {
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        vacation: 0,
        attendanceRate: 0
      }
    }

    // 데이터 처리 및 통계 계산
    const attendanceData = data || []
    // TODO: 실제 통계 계산 로직 구현
    
    return {
      total: 28, // 임시 데이터
      present: 23,
      late: 3,
      absent: 2,
      vacation: 1,
      attendanceRate: 92.9
    }
  } catch (error) {
    console.error('그룹 오늘 출석 현황 조회 예외:', error)
    return {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      vacation: 0,
      attendanceRate: 0
    }
  }
} 