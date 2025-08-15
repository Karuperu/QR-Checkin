import { createClient } from '@supabase/supabase-js'
import type { 
  User, 
  Group, 
  GroupMembership, 
  GroupWorkSettings, 
  Location, 
  AttendanceLog, 
  VacationRequest, 
  Notification 
} from '../types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uefmrjuvkwrvfrfifbqv.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlZm1yanV2a3dydmZyZmlmYnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1OTM2MjQsImV4cCI6MjA2NzE2OTYyNH0.CNZbIw1s_aM4U9Z_Z52dsC4OVPPZJ91lvbcLtVhIhAQ'

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL과 API 키가 .env 파일에 설정되어야 합니다.')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// ===== 시간대 유틸리티 함수들 =====

/**
 * 현재 로컬 시간을 반환 (한국에서는 자동으로 KST)
 */
export function getKSTNow(): Date {
  return new Date()
}

/**
 * 오늘 날짜 문자열 반환 (YYYY-MM-DD)
 */
export function getKSTTodayDateString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 오늘 시작 시간 (00:00:00) - 로컬 시간
 */
export function getKSTTodayStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
}

/**
 * 오늘 끝 시간 (23:59:59.999) - 로컬 시간
 */
export function getKSTTodayEnd(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
}

/**
 * UTC ISO 문자열을 로컬 Date로 변환
 */
export function utcToKSTDate(utcISOString: string): Date {
  return new Date(utcISOString)
}

/**
 * 로컬 Date를 UTC ISO 문자열로 변환 (데이터베이스 저장용)
 */
export function kstToUTCISOString(localDate: Date): string {
  return localDate.toISOString()
}

// Supabase 연결 테스트는 제거 (로그 없이)

// ===== 간단한 인증 함수들 =====

export async function login(userId: string, password: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .eq('password', password)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      throw new Error('잘못된 사용자 ID 또는 비밀번호입니다.')
    }

    return data as User
  } catch (error) {
    throw error
  }
}

export async function signup(userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string }) {
  try {
    // 1. 중복 확인
    const { data: existing } = await supabase
      .from('users')
      .select('user_id')
      .eq('user_id', userData.user_id)
      .maybeSingle()

    if (existing) {
      throw new Error('이미 존재하는 사용자 ID입니다.')
    }

    // 2. 사용자 생성
    const { password, ...profileData } = userData
    
    const insertData = {
      ...profileData,
      password: userData.password
    }

    const { data: result, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      throw new Error(`회원가입 실패: ${error.message}`)
    }

    if (!result) {
      throw new Error('회원가입 후 데이터를 가져올 수 없습니다.')
    }

    return result as User

  } catch (error) {
    throw error
  }
}

// 더 간단한 회원가입 (DB만 사용)
export async function simpleSignup(userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string }) {
  try {
    const userId = crypto.randomUUID()
    const { password, ...profileData } = userData
    
    const insertData = {
      id: userId,
      ...profileData
    }
    
    const { data: result, error } = await supabase
      .from('users')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      throw new Error(`DB 저장 실패: ${error.message}`)
    }
    
    if (!result) {
      throw new Error('저장된 데이터를 가져올 수 없습니다.')
    }
    
    return result as User
    
  } catch (error) {
    throw error
  }
}

// 매우 간단한 로그인 (Auth 없이)
export async function simpleLogin(userId: string, password: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .eq('password', password)
      .eq('is_active', true)
      .single()
    
    if (error || !data) {
      throw new Error('사용자를 찾을 수 없습니다.')
    }
    
    return data as User
    
  } catch (error) {
    throw error
  }
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) {
    throw new Error('로그아웃에 실패했습니다.')
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: userProfile, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    return null
  }

  return userProfile as User
}

// ===== 그룹 관리 함수들 =====

export async function createGroup(groupData: Omit<Group, 'id' | 'created_at' | 'updated_at' | 'status'>) {
  const { data, error } = await supabase
    .from('groups')
    .insert(groupData)
    .select()
    .single()

  if (error) throw error
  return data as Group
}

export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    // 학생: 속한 그룹들, 교직원: 관리하는 그룹들
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (!user) return []

    if (user.role === 'faculty') {
      return await getFacultyGroups(userId)
    } else {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          groups(*)
        `)
        .eq('user_id', userId)

      if (error) throw error
      return (data || []).map((item: any) => item.groups).filter(Boolean) as Group[]
    }
  } catch (error) {
    throw error
  }
}

export async function getFacultyGroups(facultyId: string): Promise<Group[]> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('faculty_id', facultyId)
      .eq('status', 'active')

    if (error) throw error
    
    // 각 그룹의 멤버 수를 별도로 조회
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
    
    return groupsWithMemberCount as Group[]
  } catch (error) {
    throw error
  }
}

export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (error) return null
    
    // 멤버 수를 별도로 조회
    const { count } = await supabase
      .from('group_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
    
    // 교수 이름을 별도로 조회
    const { data: facultyData } = await supabase
      .from('users')
      .select('name')
      .eq('id', data.faculty_id)
      .single()

    return {
      ...data,
      faculty_name: facultyData?.name,
      memberCount: count || 0
    } as Group
  } catch (error) {
    return null
  }
}

export async function updateGroup(groupId: string, updates: Partial<Group>) {
  const { data, error } = await supabase
    .from('groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single()

  if (error) throw error
  return data as Group
}

export async function deleteGroup(groupId: string) {
  const { error } = await supabase
    .from('groups')
    .delete()
    .eq('id', groupId)

  if (error) throw error
}

export async function addUserToGroup(groupId: string, userId: string) {
  const { data, error } = await supabase
    .from('group_memberships')
    .insert({ group_id: groupId, user_id: userId })
    .select(`
      *,
      groups!group_memberships_group_id_fkey(name, faculty_id),
      users!group_memberships_user_id_fkey(name)
    `)
    .single()

  if (error) throw error
  
  // 교직원에게 멤버 가입 알림 생성
  if (data && data.groups?.faculty_id) {
    try {
      await createGroupMemberNotification(
        data.groups.faculty_id,
        data.users?.name || '알 수 없음',
        data.groups?.name || '알 수 없음',
        'joined'
      )
    } catch (notificationError) {
      // 교직원 멤버 가입 알림 생성 실패
    }
  }
  
  return data as GroupMembership
}

export async function removeUserFromGroup(groupId: string, userId: string) {
  // 삭제 전에 그룹과 사용자 정보를 가져옴
  const { data: groupInfo, error: _groupError } = await supabase
    .from('groups')
    .select('name, faculty_id')
    .eq('id', groupId)
    .single()
  
  const { data: userInfo, error: _userError } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single()

  const { error } = await supabase
    .from('group_memberships')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) throw error
  
  // 교직원에게 멤버 탈퇴 알림 생성
  if (groupInfo?.faculty_id) {
    try {
      await createGroupMemberNotification(
        groupInfo.faculty_id,
        userInfo?.name || '알 수 없음',
        groupInfo?.name || '알 수 없음',
        'left'
      )
    } catch (notificationError) {
      // 교직원 멤버 탈퇴 알림 생성 실패
    }
  }
}

export async function getGroupMembers(groupId: string): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('group_memberships')
      .select(`
        users(*)
      `)
      .eq('group_id', groupId)

    if (error) throw error
    return (data || []).map((item: any) => item.users).filter(Boolean) as User[]
  } catch (error) {
    throw error
  }
}

export async function getGroupMembersWithDetails(groupId: string): Promise<GroupMembership[]> {
  try {
    const { data, error } = await supabase
      .from('group_memberships')
      .select(`
        *,
        users(*)
      `)
      .eq('group_id', groupId)

    if (error) throw error
    return data || []
  } catch (error) {
    throw error
  }
}

export async function getAvailableUsers(groupId: string): Promise<User[]> {
  try {
    // 먼저 그룹에 이미 참여한 사용자들의 ID를 가져옴
    const { data: existingMembers, error: memberError } = await supabase
      .from('group_memberships')
      .select('user_id')
      .eq('group_id', groupId)

    if (memberError) throw memberError

    const existingUserIds = existingMembers?.map(m => m.user_id) || []

    // 활성 학생만 가져옴
    const { data: allUsers, error } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .eq('role', 'student')

    if (error) throw error

    // 클라이언트 사이드에서 필터링
    const availableUsers = (allUsers || []).filter(user => 
      !existingUserIds.includes(user.id)
    )

    return availableUsers
  } catch (error) {
    throw error
  }
}

export async function addMultipleUsersToGroup(groupId: string, userIds: string[]) {
  try {
    if (!groupId || userIds.length === 0) {
      throw new Error('그룹 ID와 사용자 ID가 필요합니다.')
    }

    const insertData = userIds.map(userId => ({
      group_id: groupId,
      user_id: userId
    }))

    const { data, error } = await supabase
      .from('group_memberships')
      .insert(insertData)
      .select()

    if (error) {
      throw error
    }
    
    return data as GroupMembership[]
  } catch (error) {
    throw error
  }
}

// ===== 데이터베이스 연결 테스트 =====

export async function testDatabaseConnection() {
  try {
    // 먼저 users 테이블이 존재하는지 확인
    const { error: usersError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (usersError) {
      return false
    }
    
    // groups 테이블 확인
    const { error: groupsError } = await supabase
      .from('groups')
      .select('count')
      .limit(1)
    
    if (groupsError) {
      return false
    }
    
    // group_memberships 테이블 확인
    const { error: membershipsError } = await supabase
      .from('group_memberships')
      .select('count')
      .limit(1)
    
    if (membershipsError) {
      return false
    }
    
    return true
  } catch (error) {
    return false
  }
}

// ===== 테스트 데이터 생성 (개발용) =====

export async function createTestUsers() {
  const testUsers = [
    { user_id: '2021001', password: 'password123', name: '김학생', department: '컴퓨터공학과', role: 'student' },
    { user_id: '2021002', password: 'password123', name: '이학생', department: '컴퓨터공학과', role: 'student' },
    { user_id: '2021003', password: 'password123', name: '박학생', department: '소프트웨어학과', role: 'student' },
    { user_id: '2021004', password: 'password123', name: '최학생', department: '컴퓨터공학과', role: 'student' },
    { user_id: '2021005', password: 'password123', name: '정학생', department: '전자공학과', role: 'student' },
    { user_id: 'F001', password: 'password123', name: '김교수', department: '컴퓨터공학과', role: 'faculty' },
    { user_id: 'F002', password: 'password123', name: '이교수', department: '소프트웨어학과', role: 'faculty' }
  ]

  try {
    for (const user of testUsers) {
      // 이미 존재하는지 확인
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('user_id', user.user_id)
        .single()

      if (!existing) {
        await supabase
          .from('users')
          .insert(user)
      }
    }
    // 테스트 사용자 생성 완료
  } catch (error) {
    // 테스트 사용자 생성 실패
  }
}

// ===== 그룹 근무 시간 설정 =====

export async function getGroupWorkSettings(groupId: string): Promise<GroupWorkSettings | null> {
  try {
    const { data, error } = await supabase
      .from('group_work_settings')
      .select('*')
      .eq('group_id', groupId)
      .maybeSingle()

    if (error) {
      return null
    }
    return data as GroupWorkSettings
  } catch (error) {
    return null
  }
}

export async function upsertGroupWorkSettings(groupId: string, settings: Omit<GroupWorkSettings, 'id' | 'group_id' | 'created_at' | 'updated_at'>) {
  try {
    // 먼저 기존 설정이 있는지 확인
    const { data: existingSettings, error: checkError } = await supabase
      .from('group_work_settings')
      .select('id')
      .eq('group_id', groupId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116는 "결과가 없음" 오류이므로 무시
      throw checkError
    }

    let result
    if (existingSettings) {
      // 기존 설정이 있으면 업데이트
      const { data, error } = await supabase
        .from('group_work_settings')
        .update({
          checkin_deadline_hour: settings.checkin_deadline_hour,
          checkout_start_hour: settings.checkout_start_hour,
          updated_at: new Date().toISOString()
        })
        .eq('group_id', groupId)
        .select()
        .single()

      if (error) {
        throw error
      }
      result = data
    } else {
      // 기존 설정이 없으면 새로 삽입
      const { data, error } = await supabase
        .from('group_work_settings')
        .insert({ 
          group_id: groupId,
          checkin_deadline_hour: settings.checkin_deadline_hour,
          checkout_start_hour: settings.checkout_start_hour
        })
        .select()
        .single()

      if (error) {
        throw error
      }
      result = data
    }

    return result as GroupWorkSettings
  } catch (error) {
    throw error
  }
}

// ===== 출석 관리 함수들 =====

export async function saveAttendanceRecord(
  userId: string,
  groupId: string,
  scanType: 'checkin' | 'checkout',
  latitude?: number,
  longitude?: number,
  absenceReason?: string
) {
  // KST 기준 시간으로 상태 결정 로직
  const kstNow = getKSTNow()
  const hour = kstNow.getHours()
  const minute = kstNow.getMinutes()
  const currentTime = hour + minute / 60

  // 그룹 설정 가져오기
  let checkinDeadline = 10
  let checkoutStart = 18
  
  try {
    const settings = await getGroupWorkSettings(groupId)
    if (settings) {
      checkinDeadline = settings.checkin_deadline_hour || 10
      checkoutStart = settings.checkout_start_hour || 18
    }
  } catch (error) {
    // 그룹 설정 조회 실패, 기본값 사용
  }

  let status: 'present' | 'late' | 'early_leave' | 'absent' = 'present'

  if (scanType === 'checkin') {
    status = currentTime > checkinDeadline ? 'late' : 'present'
  } else if (scanType === 'checkout') {
    status = currentTime < checkoutStart ? 'early_leave' : 'present'
  }

  const { data, error } = await supabase
    .from('attendance_logs')
    .insert({
      user_id: userId,
      group_id: groupId,
      scan_time: kstToUTCISOString(kstNow), // KST 시간을 UTC로 변환하여 저장
      scan_type: scanType,
      status,
      latitude,
      longitude,
      absence_reason: absenceReason,
      is_manual: false
    })
    .select(`
      *,
      groups!attendance_logs_group_id_fkey(name, faculty_id),
      users!attendance_logs_user_id_fkey(name)
    `)
    .single()

  if (error) throw error
  
  // 지각, 조기퇴근 시 교직원에게 알림 생성
  if (data && (status === 'late' || status === 'early_leave')) {
    try {
      const alertType = status === 'late' ? 'late' : 'early_leave'
      await createStudentAttendanceAlert(
        data.groups?.faculty_id,
        data.users?.name || '알 수 없음',
        data.groups?.name || '알 수 없음',
        alertType
      )
    } catch (notificationError) {
      // 교직원 출석 알림 생성 실패
      // 알림 생성 실패는 출석 기록 자체를 실패시키지 않음
    }
  }
  
  return { ...data, status } as AttendanceLog & { status: typeof status }
}

export async function getTodayAttendanceStatus(userId: string, groupId: string) {
  // 로컬 시간 기준 오늘 00:00:00 ~ 23:59:59
  const todayStart = getKSTTodayStart()
  const todayEnd = getKSTTodayEnd()
  

  
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .gte('scan_time', todayStart.toISOString())
    .lte('scan_time', todayEnd.toISOString())
    .order('scan_time', { ascending: false })

  if (error) throw error
  return data as AttendanceLog[]
}

export async function getGroupTodayAttendance(groupId: string) {
  // 로컬 시간 기준 오늘 00:00:00 ~ 23:59:59
  const todayStart = getKSTTodayStart()
  const todayEnd = getKSTTodayEnd()

  // 오늘의 출석 기록
  const { data: attendanceData, error: attendanceError } = await supabase
    .from('attendance_logs')
    .select(`
      *,
      users!attendance_logs_user_id_fkey(name, department)
    `)
    .eq('group_id', groupId)
    .gte('scan_time', todayStart.toISOString())
    .lte('scan_time', todayEnd.toISOString())

  if (attendanceError) throw attendanceError

  // 그룹 총 멤버 수
  const { count: totalMembers } = await supabase
    .from('group_memberships')
    .select('*', { count: 'exact' })
    .eq('group_id', groupId)

  // 통계 계산
  const checkinRecords = (attendanceData || []).filter(record => record.scan_type === 'checkin')
  const present = checkinRecords.filter(record => record.status === 'present').length
  const late = checkinRecords.filter(record => record.status === 'late').length
  const absent = (totalMembers || 0) - checkinRecords.length

  // 휴가 중인 사람 수 계산 (KST 기준 오늘 날짜)
  const todayDateString = getKSTTodayDateString()
  
  const { count: vacationCount } = await supabase
    .from('vacation_requests')
    .select('*', { count: 'exact' })
    .eq('group_id', groupId)
    .eq('status', 'approved')
    .lte('start_date', todayDateString)
    .gte('end_date', todayDateString)

  const vacation = vacationCount || 0
  const actualAbsent = Math.max(0, absent - vacation)
  const totalMembersCount = totalMembers || 0
  const attendanceRate = totalMembersCount > 0 ? ((present + late) / totalMembersCount) * 100 : 0



  return {
    total: totalMembersCount,
    present,
    late,
    absent: actualAbsent,
    vacation,
    attendanceRate: isNaN(attendanceRate) || !isFinite(attendanceRate) ? 0 : Math.round(attendanceRate * 10) / 10
  }
}

// ===== 휴가 관리 함수들 =====

export async function createVacationRequest(requestData: Omit<VacationRequest, 'id' | 'status' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('vacation_requests')
    .insert({ ...requestData, status: 'pending' })
    .select(`
      *,
      groups!vacation_requests_group_id_fkey(name, faculty_id),
      users!vacation_requests_user_id_fkey(name)
    `)
    .single()

  if (error) throw error
  
  // 교직원에게 알림 생성
  if (data && data.groups?.faculty_id) {
    try {
      await createVacationRequestNotification(
        data.groups.faculty_id,
        data,
        data.users?.name || '알 수 없음',
        data.groups?.name || '알 수 없음'
      )
    } catch (notificationError) {
      console.error('교직원 알림 생성 실패:', notificationError)
      // 알림 생성 실패는 휴가 신청 자체를 실패시키지 않음
    }
  }
  
  return data as VacationRequest
}

export async function getUserVacationRequests(userId: string): Promise<VacationRequest[]> {
  const { data, error } = await supabase
    .from('vacation_requests')
    .select(`
      *,
      groups(name),
      users!vacation_requests_reviewed_by_fkey(name)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(item => ({
    ...item,
    group: item.groups,
    reviewer: item.users
  })) as VacationRequest[]
}

export async function getPendingVacationRequests(groupId: string): Promise<VacationRequest[]> {
  const { data, error } = await supabase
    .from('vacation_requests')
    .select(`
      *,
      users!vacation_requests_user_id_fkey(name, department, user_id),
      groups(name)
    `)
    .eq('group_id', groupId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map(item => ({
    ...item,
    user: item.users,
    group: item.groups
  })) as VacationRequest[]
}

export async function updateVacationRequestStatus(
  requestId: string, 
  status: 'approved' | 'rejected', 
  reviewedBy: string, 
  reviewComment?: string
) {
  const { data, error } = await supabase
    .from('vacation_requests')
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: kstToUTCISOString(getKSTNow()),
      review_comment: reviewComment
    })
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  
  // 휴가 신청자에게 알림 생성
  if (data) {
    const notificationType = status === 'approved' ? 'vacation_approved' : 'vacation_rejected'
    await createVacationNotification(data.user_id, notificationType, data, reviewComment)
  }
  
  return data as VacationRequest
}

export async function getPendingVacationRequestsCount(groupIds: string[]): Promise<number> {
  if (groupIds.length === 0) return 0

  const { count, error } = await supabase
    .from('vacation_requests')
    .select('*', { count: 'exact' })
    .in('group_id', groupIds)
    .eq('status', 'pending')

  if (error) return 0
  return count || 0
}

// ===== 알림 관리 함수들 =====

export async function createNotification(notificationData: Omit<Notification, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('notifications')
    .insert(notificationData)
    .select()
    .single()

  if (error) throw error
  return data as Notification
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {

  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('알림 조회 오류:', error)
    throw error
  }
  

  return data as Notification[]
}

export async function markNotificationAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)

  if (error) throw error
}

// 휴가 승인/거절 시 알림 생성
export async function createVacationNotification(
  userId: string, 
  type: 'vacation_approved' | 'vacation_rejected',
  vacationRequest: VacationRequest,
  reviewComment?: string
) {
  const title = type === 'vacation_approved' ? '휴가 신청이 승인되었습니다' : '휴가 신청이 거절되었습니다'
  const message = type === 'vacation_approved' 
    ? `${vacationRequest.start_date} ~ ${vacationRequest.end_date} 휴가가 승인되었습니다.`
    : `${vacationRequest.start_date} ~ ${vacationRequest.end_date} 휴가가 거절되었습니다.`

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      is_read: false,
      metadata: {
        vacation_request_id: vacationRequest.id,
        review_comment: reviewComment
      }
    })
    .select()
    .single()

  if (error) throw error
  return data as Notification
}

// 읽지 않은 알림 개수 조회
export async function getUnreadNotificationCount(userId: string): Promise<number> {

  
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('알림 개수 조회 오류:', error)
    return 0
  }
  

  return count || 0
}

// 알림 삭제 함수
export async function deleteNotification(notificationId: string): Promise<boolean> {

  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) {
    console.error('알림 삭제 오류:', error)
    return false
  }
  
  return true
}

// 교직원용 알림 생성 함수들
export async function createVacationRequestNotification(
  facultyId: string,
  vacationRequest: VacationRequest,
  studentName: string,
  groupName: string
) {
  const title = '새로운 휴가 신청이 접수되었습니다'
  const message = `${studentName}님이 ${groupName} 그룹에서 ${vacationRequest.start_date} ~ ${vacationRequest.end_date} 휴가를 신청했습니다.`

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: facultyId,
      type: 'vacation_request_received',
      title,
      message,
      is_read: false,
      metadata: {
        vacation_request_id: vacationRequest.id,
        student_name: studentName,
        group_name: groupName
      }
    })
    .select()
    .single()

  if (error) {
    console.error('알림 생성 DB 오류:', error)
    throw error
  }
  
  return data as Notification
}

export async function createStudentAttendanceAlert(
  facultyId: string,
  studentName: string,
  groupName: string,
  alertType: 'late' | 'absent' | 'early_leave'
) {
  const alertMessages = {
    late: '지각',
    absent: '결근',
    early_leave: '조기퇴근'
  }
  
  const title = '학생 출석 알림'
  const message = `${studentName}님이 ${groupName} 그룹에서 ${alertMessages[alertType]}했습니다.`

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: facultyId,
      type: 'student_attendance_alert',
      title,
      message,
      is_read: false,
      metadata: {
        student_name: studentName,
        group_name: groupName,
        alert_type: alertType
      }
    })
    .select()
    .single()

  if (error) throw error
  return data as Notification
}

export async function createGroupMemberNotification(
  facultyId: string,
  studentName: string,
  groupName: string,
  action: 'joined' | 'left'
) {
  const actionMessages = {
    joined: '그룹에 가입했습니다',
    left: '그룹을 탈퇴했습니다'
  }
  
  const title = action === 'joined' ? '새로운 그룹 멤버' : '그룹 멤버 탈퇴'
  const message = `${studentName}님이 ${groupName} 그룹을 ${actionMessages[action]}.`

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: facultyId,
      type: action === 'joined' ? 'group_member_joined' : 'group_member_left',
      title,
      message,
      is_read: false,
      metadata: {
        student_name: studentName,
        group_name: groupName,
        action
      }
    })
    .select()
    .single()

  if (error) throw error
  return data as Notification
}

// ===== 위치 관리 함수들 =====

export async function validateQRLocation(_latitude: number, _longitude: number) {
  // 간단한 위치 검증 로직 (실제 구현에서는 더 정교한 로직 필요)
  return { valid: true, locationName: '본관' }
}

export async function getGroupLocations(groupId: string): Promise<Location[]> {
  const { data, error } = await supabase
    .from('locations')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)

  if (error) throw error
  return data as Location[]
}

export async function createLocation(locationData: Omit<Location, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('locations')
    .insert(locationData)
    .select()
    .single()

  if (error) throw error
  return data as Location
}

// ===== 통계 함수들 =====

export async function getWeeklyAttendanceStats(groupId: string, weekOffset: number = 0) {
  // KST 기준 주간 계산
  const kstToday = getKSTNow()
  const startOfWeek = new Date(kstToday.getTime() - (kstToday.getDay() * 24 * 60 * 60 * 1000) - (weekOffset * 7 * 24 * 60 * 60 * 1000))
  const endOfWeek = new Date(startOfWeek.getTime() + (6 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000) + (59 * 60 * 1000) + (59 * 1000))

  const { data, error } = await supabase
    .from('attendance_logs')
    .select(`
      *,
      users!attendance_logs_user_id_fkey(name, department)
    `)
    .eq('group_id', groupId)
    .gte('scan_time', kstToUTCISOString(startOfWeek))
    .lte('scan_time', kstToUTCISOString(endOfWeek))
    .eq('scan_type', 'checkin')

  if (error) throw error
  return data as (AttendanceLog & { users: { name: string; department: string } })[]
}

export async function getDailyAttendanceStats(groupId: string, date: string) {
  const startOfDay = new Date(`${date}T00:00:00`)
  const endOfDay = new Date(`${date}T23:59:59`)

  const { data, error } = await supabase
    .from('attendance_logs')
    .select(`
      *,
      users!attendance_logs_user_id_fkey(name, department)
    `)
    .eq('group_id', groupId)
    .gte('scan_time', startOfDay.toISOString())
    .lte('scan_time', endOfDay.toISOString())
    .order('scan_time', { ascending: true })

  if (error) throw error
  return data as (AttendanceLog & { users: { name: string; department: string } })[]
}

// ===== 학생용 출석 상태 설정 (교직원용) =====

export async function setStudentAttendanceStatus(
  studentId: string,
  groupId: string,
  date: string,
  status: 'present' | 'late' | 'absent' | 'vacation',
  reason?: string,
  editedBy?: string
) {
  const kstScanTime = new Date(`${date}T09:00:00`)
  const scanTime = kstToUTCISOString(kstScanTime)

  const { data, error } = await supabase
    .from('attendance_logs')
    .upsert({
      user_id: studentId,
      group_id: groupId,
      scan_time: scanTime,
      scan_type: 'checkin',
      status: status === 'vacation' ? 'absent' : status,
      absence_reason: reason,
      edited_by: editedBy,
      is_manual: true
    })
    .select()
    .single()

  if (error) throw error
  return data as AttendanceLog
}

// ===== 교직원 통계 전용 함수들 =====

// 교직원의 모든 그룹 통합 오늘 출석 현황
export async function getFacultyTodayOverallStats(facultyId: string) {
  try {
  
    
    // 1. 교직원이 관리하는 모든 그룹 가져오기
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('faculty_id', facultyId)
      .eq('status', 'active')

    if (groupsError) {
      console.error('그룹 조회 실패:', groupsError)
      throw groupsError
    }

    if (!groups || groups.length === 0) {
      return {
        totalStudents: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        vacationCount: 0,
        attendanceRate: 0
      }
    }

    // 2. 모든 그룹의 출석 통계를 병렬로 가져와서 합산 (KST 기준)
    const groupIds = groups.map(g => g.id)
    const todayStart = getKSTTodayStart()
    const todayEnd = getKSTTodayEnd()

    // 모든 그룹의 총 멤버 수
    const { count: totalMembers } = await supabase
      .from('group_memberships')
      .select('*', { count: 'exact' })
      .in('group_id', groupIds)



    // 오늘의 체크인 기록들 (KST 기준)
    const { data: todayAttendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select('user_id, status, group_id')
      .in('group_id', groupIds)
      .eq('scan_type', 'checkin')
      .gte('scan_time', kstToUTCISOString(todayStart))
      .lte('scan_time', kstToUTCISOString(todayEnd))

    if (attendanceError) {
      console.error('출석 기록 조회 실패:', attendanceError)
      throw attendanceError
    }



    // 오늘 승인된 휴가 수 (KST 기준)
    const kstToday = getKSTNow()
    const todayDateString = kstToday.toISOString().split('T')[0]
    
    const { count: vacationCount } = await supabase
      .from('vacation_requests')
      .select('*', { count: 'exact' })
      .in('group_id', groupIds)
      .eq('status', 'approved')
      .lte('start_date', todayDateString)
      .gte('end_date', todayDateString)



    // 통계 계산
    const presentCount = (todayAttendance || []).filter(r => r.status === 'present').length
    const lateCount = (todayAttendance || []).filter(r => r.status === 'late').length
    const attendedCount = presentCount + lateCount
    const absentCount = Math.max(0, (totalMembers || 0) - attendedCount - (vacationCount || 0))
    const attendanceRate = totalMembers && totalMembers > 0 ? (attendedCount / totalMembers) * 100 : 0

    const result = {
      totalStudents: totalMembers || 0,
      presentCount,
      lateCount,
      absentCount,
      vacationCount: vacationCount || 0,
      attendanceRate: isNaN(attendanceRate) ? 0 : Math.round(attendanceRate * 10) / 10
    }

    return result

  } catch (error) {
    console.error('교직원 전체 통계 로드 실패:', error)
    return {
      totalStudents: 0,
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      vacationCount: 0,
      attendanceRate: 0
    }
  }
}

// 교직원의 모든 그룹 통합 주간 통계
export async function getFacultyWeeklyStats(facultyId: string, weekOffset: number = 0) {
  try {
  
    
    // 1. 교직원이 관리하는 모든 그룹 가져오기
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('faculty_id', facultyId)
      .eq('status', 'active')

    if (groupsError) throw groupsError

    if (!groups || groups.length === 0) {
      return []
    }

    // 2. 주간 범위 계산 (KST 기준)
    const kstToday = getKSTNow()
    const startOfWeek = new Date(kstToday.getTime() - (kstToday.getDay() * 24 * 60 * 60 * 1000) - (weekOffset * 7 * 24 * 60 * 60 * 1000))
    const endOfWeek = new Date(startOfWeek.getTime() + (6 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000) + (59 * 60 * 1000) + (59 * 1000))

    // 3. 모든 그룹의 주간 출석 데이터 가져오기
    const groupIds = groups.map(g => g.id)
    const { data: weeklyAttendance, error: attendanceError } = await supabase
      .from('attendance_logs')
      .select(`
        *,
        users!attendance_logs_user_id_fkey(name, department, user_id)
      `)
      .in('group_id', groupIds)
      .eq('scan_type', 'checkin')
      .gte('scan_time', kstToUTCISOString(startOfWeek))
      .lte('scan_time', kstToUTCISOString(endOfWeek))
      .order('scan_time', { ascending: true })

    if (attendanceError) {
      throw attendanceError
    }

    return weeklyAttendance || []

  } catch (error) {
    throw error
  }
}

// ===== 간단한 교직원 통계 함수들 (재작성) =====

/**
 * 교직원이 관리하는 모든 그룹의 오늘 출석 통계 조회 (실제 DB 연동)
 */
export async function getFacultyGroupsOverallStats(facultyId: string) {
  try {
    

    // 1. 교직원이 관리하는 모든 그룹 조회
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('faculty_id', facultyId)
      .eq('status', 'active')

    if (groupsError) {
      throw groupsError
    }

    if (!groups || groups.length === 0) {
      return []
    }

  

    // 2. 각 그룹별 통계 계산
    const groupStats = await Promise.all(
      groups.map(async (group) => {
        try {
          const stats = await getGroupTodayAttendance(group.id)
          return {
            groupId: group.id,
            groupName: group.name,
            totalStudents: stats.total,
            presentCount: stats.present,
            lateCount: stats.late,
            absentCount: stats.absent,
            vacationCount: stats.vacation,
            attendanceRate: stats.attendanceRate
          }
        } catch (error) {
          return {
            groupId: group.id,
            groupName: group.name,
            totalStudents: 0,
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            vacationCount: 0,
            attendanceRate: 0
          }
        }
      })
    )

  
    return groupStats

  } catch (error) {
    return []
  }
}

/**
 * 그룹별 주간 출석 상세 데이터 (학생용 getStudentWeeklyAttendance를 그룹용으로 변환)
 */
export async function getGroupWeeklyAttendance(groupId: string, weekOffset: number = 0) {
  try {
  
    
    // 1. 그룹 정보 조회 (시작일 확인)
    const { data: groupInfo, error: groupError } = await supabase
      .from('groups')
      .select('start_date, end_date, name')
      .eq('id', groupId)
      .single()

    if (groupError || !groupInfo?.start_date) {
      console.error('그룹 정보 조회 실패 또는 시작일 없음:', groupError)
      return ['월', '화', '수', '목', '금'].map(day => ({
        day,
        date: '',
        status: '시작일없음',
        present: 0,
        late: 0,
        absent: 0,
        isBeforeStart: false,
        isEmpty: true
      }))
    }


    
    // 2. 그룹 멤버 수 조회
    const { count: totalMembers } = await supabase
      .from('group_memberships')
      .select('*', { count: 'exact' })
      .eq('group_id', groupId)
    


    // 3. 주차별 범위 계산 (학생용 로직과 동일)
    const groupStartDate = new Date(groupInfo.start_date)
    // const _kstToday = getKSTNow() // 사용하지 않음
    


    let startOfWeek: Date
    let endOfWeek: Date
    let isFirstWeek = false

    if (weekOffset < 0) {
      // 그룹 시작일 이전 주차는 빈 데이터

      return ['월', '화', '수', '목', '금'].map(day => ({
        day,
        date: '',
        status: '시작전',
        present: 0,
        late: 0,
        absent: 0,
        isBeforeStart: true,
        isEmpty: true
      }))
    }

    if (weekOffset === 0) {
      // 첫 주차: 그룹 시작일부터 (학생용과 동일)
      isFirstWeek = true
      startOfWeek = new Date(groupStartDate)
      
      const startDay = startOfWeek.getDay() // 0=일요일, 1=월요일, ...
      const daysToFriday = startDay <= 5 ? 5 - startDay : 5 + (7 - startDay)
      endOfWeek = new Date(startOfWeek.getTime() + (daysToFriday * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000) + (59 * 60 * 1000) + (59 * 1000))
      

    } else {
      // 이후 주차: 1주차의 월요일 기준으로 계산
      // 1주차의 월요일을 찾기
      const firstWeekStartDay = groupStartDate.getDay()
      let firstWeekMondayOffset
      
      if (firstWeekStartDay === 1) {
        // 그룹이 월요일에 시작한 경우
        firstWeekMondayOffset = 0
      } else if (firstWeekStartDay === 0) {
        // 그룹이 일요일에 시작한 경우 (다음 월요일)
        firstWeekMondayOffset = 1
      } else {
        // 그룹이 화~토요일에 시작한 경우 (해당 주 월요일)
        firstWeekMondayOffset = -(firstWeekStartDay - 1)
      }
      
      const firstWeekMonday = new Date(groupStartDate.getTime() + (firstWeekMondayOffset * 24 * 60 * 60 * 1000))
      
      // weekOffset주차의 월요일 계산
      startOfWeek = new Date(firstWeekMonday.getTime() + (weekOffset * 7 * 24 * 60 * 60 * 1000))
      startOfWeek.setHours(0, 0, 0, 0)
      
      // 월요일부터 금요일까지
      endOfWeek = new Date(startOfWeek.getTime() + (4 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000) + (59 * 60 * 1000) + (59 * 1000))
      

    }

    // 4. 해당 주간의 모든 출석 기록 조회
    const { data: weeklyRecords, error } = await supabase
      .from('attendance_logs')
      .select('user_id, status, scan_time')
      .eq('group_id', groupId)
      .eq('scan_type', 'checkin')
      .gte('scan_time', startOfWeek.toISOString())
      .lte('scan_time', endOfWeek.toISOString())
      .order('scan_time', { ascending: true })

    if (error) {
      console.error('주간 출석 데이터 조회 실패:', error)
      throw error
    }



    // 5. 요일별 데이터 구성 (학생용 로직 완전 복사)
    if (isFirstWeek) {
      // 첫 주차: 그룹 시작일부터의 요일들
      const startDay = groupStartDate.getDay()
      const daysInFirstWeek = startDay <= 5 ? 6 - startDay : 7 - startDay + 5 // 금요일까지의 일수
      
      const weekDays = []
      for (let i = 0; i < daysInFirstWeek; i++) {
        const dayDate = new Date(groupStartDate.getTime() + (i * 24 * 60 * 60 * 1000))
        const dayOfWeek = dayDate.getDay()
        if (dayOfWeek >= 1 && dayOfWeek <= 5) { // 월~금만
          weekDays.push(['일', '월', '화', '수', '목', '금', '토'][dayOfWeek])
        }
      }

      let weeklyData = weekDays.map((day, index) => {
        const dayStart = new Date(groupStartDate.getTime() + (index * 24 * 60 * 60 * 1000))
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
        
        // 해당 날짜의 출석 기록들
        const dayRecords = (weeklyRecords || []).filter(record => {
          const recordDate = new Date(record.scan_time)
          return recordDate >= dayStart && recordDate <= dayEnd
        })

        const presentCount = dayRecords.filter(r => r.status === 'present').length
        const lateCount = dayRecords.filter(r => r.status === 'late').length
        const absentCount = Math.max(0, (totalMembers || 0) - dayRecords.length)

        return {
          day,
          date: dayStart.toLocaleDateString('ko-KR'),
          status: dayRecords.length > 0 ? 
                  (lateCount > 0 ? '일부지각' : '정상출석') : 
                  (absentCount > 0 ? '결근자있음' : '정상'),
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          isBeforeStart: false,
          isEmpty: false
        }
      })
      
      // 첫 주차에서 월요일 이전 날들을 빈 칸으로 채우기 (학생용과 동일)
      const startDayOfWeek = groupStartDate.getDay()
      if (startDayOfWeek > 1) { // 월요일(1) 이후에 시작하는 경우
        const emptyDays = []
        for (let i = 1; i < startDayOfWeek; i++) {
          emptyDays.push({
            day: ['일', '월', '화', '수', '목', '금', '토'][i],
            date: '',
            status: '',
            present: 0,
            late: 0,
            absent: 0,
            isBeforeStart: true,
            isEmpty: true
          })
        }
        weeklyData = [...emptyDays, ...weeklyData]
      }
      
      return weeklyData
    } else {
      // 이후 주차: 월화수목금 (표준 주차) - 학생용과 동일
      return ['월', '화', '수', '목', '금'].map((day, index) => {
        const dayStart = new Date(startOfWeek.getTime() + (index * 24 * 60 * 60 * 1000))
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
        
        // 해당 날짜의 출석 기록들
        const dayRecords = (weeklyRecords || []).filter(record => {
          const recordDate = new Date(record.scan_time)
          return recordDate >= dayStart && recordDate <= dayEnd
        })

        const presentCount = dayRecords.filter(r => r.status === 'present').length
        const lateCount = dayRecords.filter(r => r.status === 'late').length
        const absentCount = Math.max(0, (totalMembers || 0) - dayRecords.length)

        // 그룹 시작일과 비교하여 시작일 이전인지 확인
        const isBeforeStart = dayStart < groupStartDate

        return {
          day,
          date: dayStart.toLocaleDateString('ko-KR'),
          status: isBeforeStart ? '시작전' :
                  dayRecords.length > 0 ? 
                    (lateCount > 0 ? '일부지각' : '정상출석') : 
                    (absentCount > 0 ? '결근자있음' : '정상'),
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          isBeforeStart,
          isEmpty: false
        }
      })
    }

  } catch (error) {
    console.error('그룹 주간 출석 데이터 조회 실패:', error)
    return ['월', '화', '수', '목', '금'].map(day => ({
      day,
      date: '',
      status: '오류',
      present: 0,
      late: 0,
      absent: 0,
      isBeforeStart: false,
      isEmpty: false
    }))
  }
}

/**
 * 교직원용 날짜별 주간 상세 통계 조회 (새로운 방식 - 각 그룹에 getGroupWeeklyAttendance 적용)
 */
export async function getFacultyWeeklyDetailedStats(facultyId: string, weekNumber: number = 1) {
  try {
    

    // 1. 교직원이 관리하는 모든 그룹 조회
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, start_date, end_date')
      .eq('faculty_id', facultyId)
      .eq('status', 'active')

    if (groupsError) {
      console.error('그룹 조회 오류:', groupsError)
      throw groupsError
    }

    if (!groups || groups.length === 0) {
      return {
        weekNumber: weekNumber,
        dateRange: '',
        groupsData: [],
        totalStats: { present: 0, late: 0, absent: 0, vacation: 0 }
      }
    }

  

    // 2. weekNumber를 weekOffset으로 변환
    const weekOffset = weekNumber - 1

    // 3. 각 그룹별로 getGroupWeeklyAttendance 호출
    const groupsData = await Promise.all(
      groups.map(async (group) => {
        try {
        
          
          // 그룹 멤버 수 조회
          const { count: totalMembers } = await supabase
            .from('group_memberships')
            .select('*', { count: 'exact' })
            .eq('group_id', group.id)

          // 그룹별 주간 출석 데이터 조회 (학생용 로직 사용)
          const weeklyData = await getGroupWeeklyAttendance(group.id, weekOffset)

          return {
            groupId: group.id,
            groupName: group.name,
            totalStudents: totalMembers || 0,
            weeklyData
          }
        } catch (error) {
          console.error(`그룹 ${group.name} 데이터 조회 실패:`, error)
          return {
            groupId: group.id,
            groupName: group.name,
            totalStudents: 0,
            weeklyData: ['월', '화', '수', '목', '금'].map(day => ({
              day,
              date: '',
              status: '오류',
              present: 0,
              late: 0,
              absent: 0,
              isBeforeStart: false,
              isEmpty: false
            }))
          }
        }
      })
    )

    // 4. 전체 통계 합산
    const totalStats = groupsData.reduce((acc, group) => {
      group.weeklyData.forEach(day => {
        if (!day.isBeforeStart && !day.isEmpty) {
          acc.present += day.present
          acc.late += day.late
          acc.absent += day.absent
        }
      })
      return acc
    }, { present: 0, late: 0, absent: 0, vacation: 0 })

    // 5. 날짜 범위 계산 (DB에서 조회한 실제 그룹 데이터 기반)
    let dateRange = ''
    if (groupsData.length > 0) {
      // 가장 빠른 그룹의 시작일과 주차 정보를 기반으로 실제 날짜 범위 계산
      const firstGroup = groups[0] // 첫 번째 그룹 기준
      if (firstGroup && firstGroup.start_date) {
        const groupStartDate = new Date(firstGroup.start_date)
        const weekOffset = weekNumber - 1
        
        let weekStartDate: Date
        let weekEndDate: Date
        
        if (weekOffset === 0) {
          // 첫 주차: 그룹 시작일부터
          weekStartDate = new Date(groupStartDate)
          const startDay = weekStartDate.getDay() // 0=일요일, 1=월요일, ...
          const daysToFriday = startDay <= 5 ? 5 - startDay : 5 + (7 - startDay)
          weekEndDate = new Date(weekStartDate.getTime() + (daysToFriday * 24 * 60 * 60 * 1000))
        } else {
          // 이후 주차: 1주차의 월요일 기준으로 계산
          // 1주차의 월요일을 찾기
          const firstWeekStartDay = groupStartDate.getDay()
          let firstWeekMondayOffset
          
          if (firstWeekStartDay === 1) {
            // 그룹이 월요일에 시작한 경우
            firstWeekMondayOffset = 0
          } else if (firstWeekStartDay === 0) {
            // 그룹이 일요일에 시작한 경우 (다음 월요일)
            firstWeekMondayOffset = 1
          } else {
            // 그룹이 화~토요일에 시작한 경우 (해당 주 월요일)
            firstWeekMondayOffset = -(firstWeekStartDay - 1)
          }
          
          const firstWeekMonday = new Date(groupStartDate.getTime() + (firstWeekMondayOffset * 24 * 60 * 60 * 1000))
          
          // weekOffset주차의 월요일 계산
          weekStartDate = new Date(firstWeekMonday.getTime() + (weekOffset * 7 * 24 * 60 * 60 * 1000))
          weekEndDate = new Date(weekStartDate.getTime() + (4 * 24 * 60 * 60 * 1000))
        }
        
        const startDateStr = weekStartDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }).replace('월', '월').replace('일', '일')
        const endDateStr = weekEndDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }).replace('월', '월').replace('일', '일')
        dateRange = `${startDateStr} - ${endDateStr}`
        

      
      }
    }

    const result = {
      weekNumber: weekNumber,
      dateRange,
      groupsData,
      totalStats
    }

  
    return result

  } catch (error) {
    console.error('교직원 주간 상세 통계 조회 실패:', error)
    return {
      weekNumber: weekNumber,
      dateRange: '오류',
      groupsData: [],
      totalStats: { present: 0, late: 0, absent: 0, vacation: 0 }
    }
  }
}

/**
 * 실제 주간 추이 조회 (최근 3주간)
 */
export async function getFacultyGroupsWeeklyTrends(facultyId: string) {
  try {
    

    // 1. 교직원이 관리하는 모든 그룹 조회
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('faculty_id', facultyId)
      .eq('status', 'active')

    if (groupsError || !groups || groups.length === 0) {
      return {
        currentWeek: { label: '이번주', dateRange: '', groupStats: [] },
        lastWeek: { label: '지난주', dateRange: '', groupStats: [] },
        beforeWeek: { label: '지지난주', dateRange: '', groupStats: [] }
      }
    }

    // 2. 주간 날짜 범위 계산 (한국 시간 기준)
    const now = getKSTNow()
    const currentWeekStart = new Date(now)
    const dayOfWeek = currentWeekStart.getDay() // 0: 일요일, 1: 월요일, ..., 6: 토요일
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 월요일까지의 일수
    currentWeekStart.setDate(currentWeekStart.getDate() - daysToMonday)
    currentWeekStart.setHours(0, 0, 0, 0)

    const getWeekRange = (weekOffset: number) => {
      const start = new Date(currentWeekStart)
      start.setDate(start.getDate() - (weekOffset * 7))
      const end = new Date(start)
      end.setDate(end.getDate() + 4) // 월~금 (5일)
      end.setHours(23, 59, 59, 999)
      return { start, end }
    }

    const currentWeek = getWeekRange(0)
    const lastWeek = getWeekRange(1)
    const beforeWeek = getWeekRange(2)

    // 3. 각 주차별, 그룹별 통계 계산
    const calculateWeekStats = async (weekRange: { start: Date, end: Date }) => {
      const groupStats = await Promise.all(
        groups.map(async (group) => {
          try {
            // 그룹 총 멤버 수
            const { count: totalMembers } = await supabase
              .from('group_memberships')
              .select('*', { count: 'exact' })
              .eq('group_id', group.id)

            // 해당 주간의 출석 기록
            const { data: attendanceData } = await supabase
              .from('attendance_logs')
              .select('user_id, status')
              .eq('group_id', group.id)
              .eq('scan_type', 'checkin')
              .gte('scan_time', weekRange.start.toISOString())
              .lte('scan_time', weekRange.end.toISOString())

            // 출석 통계 계산
            const presentCount = (attendanceData || []).filter(record => record.status === 'present').length
            const lateCount = (attendanceData || []).filter(record => record.status === 'late').length
            const totalAttended = presentCount + lateCount
            const absentCount = Math.max(0, (totalMembers || 0) * 5 - totalAttended) // 5일 기준
            const attendanceRate = totalMembers && totalMembers > 0 ? (totalAttended / (totalMembers * 5)) * 100 : 0

            return {
              groupId: group.id,
              groupName: group.name,
              totalStudents: totalMembers || 0,
              presentCount,
              lateCount,
              absentCount,
              attendanceRate: Math.round(attendanceRate * 10) / 10,
              totalDays: 5
            }
          } catch (error) {
            return {
              groupId: group.id,
              groupName: group.name,
              totalStudents: 0,
              presentCount: 0,
              lateCount: 0,
              absentCount: 0,
              attendanceRate: 0,
              totalDays: 5
            }
          }
        })
      )
      return groupStats
    }

    const [currentWeekStats, lastWeekStats, beforeWeekStats] = await Promise.all([
      calculateWeekStats(currentWeek),
      calculateWeekStats(lastWeek),
      calculateWeekStats(beforeWeek)
    ])

    const formatDateRange = (start: Date, end: Date) => {
      return `${start.toLocaleDateString('ko-KR')} - ${end.toLocaleDateString('ko-KR')}`
    }

    const result = {
      currentWeek: { 
        label: '이번주', 
        dateRange: formatDateRange(currentWeek.start, currentWeek.end), 
        groupStats: currentWeekStats 
      },
      lastWeek: { 
        label: '지난주', 
        dateRange: formatDateRange(lastWeek.start, lastWeek.end), 
        groupStats: lastWeekStats 
      },
      beforeWeek: { 
        label: '지지난주', 
        dateRange: formatDateRange(beforeWeek.start, beforeWeek.end), 
        groupStats: beforeWeekStats 
      }
    }

  
    return result

  } catch (error) {
    return {
      currentWeek: { label: '이번주', dateRange: '에러', groupStats: [] },
      lastWeek: { label: '지난주', dateRange: '에러', groupStats: [] },
      beforeWeek: { label: '지지난주', dateRange: '에러', groupStats: [] }
    }
  }
}

/**
 * 간단한 학생별 상세 통계 조회
 */
export async function getGroupStudentDetails(_facultyId: string, groupId: string, _dateRange?: { start: Date, end: Date }) {
  try {

    // 1. 그룹의 모든 학생 조회
    const { data: groupMembers, error: membersError } = await supabase
      .from('group_memberships')
      .select(`
        user_id,
        users!inner(
          id,
          student_id,
          name,
          department
        )
      `)
      .eq('group_id', groupId)

    if (membersError) {
      console.error('그룹 멤버 조회 실패:', membersError)
      throw membersError
    }

    if (!groupMembers || groupMembers.length === 0) {
      return []
    }

    // 2. 각 학생별 상세 통계 계산
    const studentDetails = await Promise.all(
      groupMembers.map(async (member: any) => {
        try {
          const userId = member.user_id
          const userData = member.users

          // 학생의 출석률 계산
          const attendanceRate = await getStudentAttendanceRate(userId, groupId, 30)
          
          // 최근 출석 기록 조회
          const { data: recentAttendance } = await supabase
            .from('attendance_logs')
            .select('scan_time, status')
            .eq('user_id', userId)
            .eq('group_id', groupId)
            .eq('scan_type', 'checkin')
            .order('scan_time', { ascending: false })
            .limit(5)

          const recentAttendanceFormatted = (recentAttendance || []).map(record => ({
            date: new Date(record.scan_time).toLocaleDateString('ko-KR'),
            status: record.status,
            time: new Date(record.scan_time).toLocaleTimeString('ko-KR', { 
              hour12: false, 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            })
          }))

          return {
            studentId: userData.id,
            studentUserId: userData.student_id || userData.id,
            studentName: userData.name,
            department: userData.department || '미지정',
            presentCount: attendanceRate.presentDays,
            lateCount: attendanceRate.lateDays,
            absentCount: Math.max(0, attendanceRate.totalDays - attendanceRate.presentDays - attendanceRate.lateDays),
            earlyLeaveCount: 0, // TODO: 조기퇴근 계산 로직 추가
            vacationDays: attendanceRate.vacationDays,
            attendanceRate: attendanceRate.attendanceRate,
            totalWorkDays: attendanceRate.totalDays,
            recentAttendance: recentAttendanceFormatted
          }
        } catch (error) {
          return {
            studentId: member.user_id,
            studentUserId: member.users.student_id || member.user_id,
            studentName: member.users.name,
            department: member.users.department || '미지정',
            presentCount: 0,
            lateCount: 0,
            absentCount: 0,
            earlyLeaveCount: 0,
            vacationDays: 0,
            attendanceRate: 0,
            totalWorkDays: 0,
            recentAttendance: []
          }
        }
      })
    )

    return studentDetails

  } catch (error) {
    return []
  }
}

/**
 * 학생별 개인 출석률 계산 (KST 기준)
 */
export async function getStudentAttendanceRate(userId: string, groupId: string, days: number = 30) {
  try {
    
    // 1. 그룹 정보 조회 (시작일 확인)
    const { data: groupInfo, error: groupError } = await supabase
      .from('groups')
      .select('start_date, end_date')
      .eq('id', groupId)
      .single()

    if (groupError) {
      console.error('그룹 정보 조회 실패:', groupError)
      throw groupError
    }

    // 2. 계산 기간 결정
    const kstNow = getKSTNow()
    let startDate: Date
    let totalDays: number
    let weekdays: number // 주말 제외한 평일 수

    if (groupInfo?.start_date) {
      // 그룹 시작일이 있는 경우, 시작일부터 오늘까지
      startDate = new Date(groupInfo.start_date)
      const daysDiff = Math.ceil((kstNow.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))
      totalDays = Math.max(1, daysDiff) // 최소 1일
      
      // 주말 제외한 평일 수 계산
      weekdays = 0
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000))
        const dayOfWeek = currentDate.getDay() // 0=일요일, 6=토요일
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 평일만 카운트
          weekdays++
        }
      }
      
      // 그룹 시작일 기준 계산 완료
    } else {
      // 그룹 시작일이 없는 경우, 기존 로직 사용 (days일 전부터)
      startDate = new Date(kstNow.getTime() - (days * 24 * 60 * 60 * 1000))
      totalDays = days
      
      // 주말 제외한 평일 수 계산
      weekdays = 0
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000))
        const dayOfWeek = currentDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          weekdays++
        }
      }
      
      // 기본 기간 기준 계산 완료
    }
    
    // 3. 실제 출퇴근 기록 조회 (checkin만)
    const { data: attendanceRecords, error } = await supabase
      .from('attendance_logs')
      .select('scan_time, scan_type, status')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('scan_type', 'checkin')
      .gte('scan_time', kstToUTCISOString(startDate))
      .lte('scan_time', kstToUTCISOString(kstNow))
      .order('scan_time', { ascending: true })

    if (error) {
      console.error('출석 기록 조회 실패:', error)
      throw error
    }



    // 4. 출석일 계산 (present + late)
    const presentDays = (attendanceRecords || []).filter(record => 
      record.status === 'present' || record.status === 'late'
    ).length

    const lateDays = (attendanceRecords || []).filter(record => 
      record.status === 'late'
    ).length

    // 5. 휴가일 계산 (그룹 시작일 이후부터)
    const { data: vacationDays } = await supabase
      .from('vacation_requests')
      .select('start_date, end_date')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('status', 'approved')
      .gte('start_date', startDate.toISOString().split('T')[0])
      .lte('end_date', kstNow.toISOString().split('T')[0])

    const vacationCount = (vacationDays || []).reduce((total, vacation) => {
      const start = new Date(vacation.start_date)
      const end = new Date(vacation.end_date)
      const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
      return total + days
    }, 0)



    // 6. 총 출석 가능일 계산 (평일에서 휴가 제외)
    const totalPossibleDays = weekdays - vacationCount
    const attendanceRate = totalPossibleDays > 0 ? (presentDays / totalPossibleDays) * 100 : 0

    const result = {
      totalDays: weekdays, // 평일 수로 변경
      presentDays,
      lateDays,
      vacationDays: vacationCount,
      possibleDays: totalPossibleDays,
      attendanceRate: Math.round(attendanceRate * 10) / 10
    }

    return result

  } catch (error) {
    // 30일 중 평일만 계산 (약 22일)
    const weekdaysIn30Days = Math.floor(days * 5 / 7) // 대략적인 평일 수
    return {
      totalDays: weekdaysIn30Days,
      presentDays: 0,
      lateDays: 0,
      vacationDays: 0,
      possibleDays: weekdaysIn30Days,
      attendanceRate: 0
    }
  }
}

/**
 * 학생별 주간 출석 상세 데이터 (그룹 시작일 기준)
 */
export async function getStudentWeeklyAttendance(userId: string, groupId: string, weekOffset: number = 0) {
  try {
    
    // 1. 그룹 정보 조회 (시작일 확인)
    const { data: groupInfo, error: groupError } = await supabase
      .from('groups')
      .select('start_date, end_date')
      .eq('id', groupId)
      .single()

    if (groupError) {
      console.error('그룹 정보 조회 실패:', groupError)
      throw groupError
    }

    // 2. 주간 범위 계산 (그룹 시작일 기준)
    const kstToday = getKSTNow()
    let startOfWeek: Date
    let endOfWeek: Date = new Date()

    if (groupInfo?.start_date) {
      // 그룹 시작일이 있는 경우, 시작일부터 계산
      const groupStartDate = new Date(groupInfo.start_date)
      // const _weeksSinceStart = Math.floor((kstToday.getTime() - groupStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) // 사용하지 않음
      const targetWeek = weekOffset
      
      if (targetWeek < 0) {
        // 그룹 시작일 이전 주차는 빈 데이터 반환
        return []
      }
      
      if (targetWeek === 0) {
        // 첫 주차: 그룹 시작일부터
        startOfWeek = new Date(groupStartDate.getTime())
        
        // 첫 주차: 그룹 시작일부터 금요일까지
        const startDay = startOfWeek.getDay() // 0=일요일, 1=월요일, 2=화요일, ...
        const daysToFriday = startDay <= 5 ? 5 - startDay : 5 + (7 - startDay) // 금요일까지의 일수
        endOfWeek = new Date(startOfWeek.getTime() + (daysToFriday * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000) + (59 * 60 * 60 * 1000) + (59 * 1000))
      } else {
        // 이후 주차: 월요일부터 금요일까지 (표준 주차)
        const daysToAdd = targetWeek * 7 // 주차 수만큼 7일씩 추가
        const weekStartDate = new Date(groupStartDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000))
        
        // 해당 주의 월요일 찾기
        const mondayOffset = weekStartDate.getDay() === 0 ? 6 : weekStartDate.getDay() - 1 // 일요일이면 6, 아니면 getDay()-1
        startOfWeek = new Date(weekStartDate.getTime() - (mondayOffset * 24 * 60 * 60 * 1000))
        
        // 월요일부터 금요일까지 (5일)
        endOfWeek = new Date(startOfWeek.getTime() + (4 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000) + (59 * 60 * 60 * 1000) + (59 * 1000))
      }
      
      // 그룹 시작일 기준 주간 범위 계산 완료
    } else {
      // 그룹 시작일이 없는 경우, 기존 로직 사용 (월요일부터 금요일까지)
      const mondayOffset = kstToday.getDay() === 0 ? 6 : kstToday.getDay() - 1 // 일요일이면 6, 아니면 getDay()-1
      startOfWeek = new Date(kstToday.getTime() - (mondayOffset * 24 * 60 * 60 * 1000) - (weekOffset * 7 * 24 * 60 * 60 * 1000))
      endOfWeek = new Date(startOfWeek.getTime() + (4 * 24 * 60 * 60 * 1000) + (23 * 60 * 60 * 1000) + (59 * 60 * 1000) + (59 * 1000))
      
      // 기본 주간 범위 계산 완료
    }

    // 3. 주간 출석 데이터 조회
    const { data: weeklyRecords, error } = await supabase
      .from('attendance_logs')
      .select('scan_time, scan_type, status')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('scan_type', 'checkin')
      .gte('scan_time', kstToUTCISOString(startOfWeek))
      .lte('scan_time', kstToUTCISOString(endOfWeek))
      .order('scan_time', { ascending: true })

    if (error) {
      console.error('주간 출석 데이터 조회 실패:', error)
      throw error
    }



    // 4. 요일별 출석 상태 매핑 (첫 주차는 그룹 시작일부터, 이후는 월화수목금)
    let weekDays: string[]
    let weeklyData: any[]
    
    // 첫 주차인지 확인 (weekOffset가 0이면 첫 주차)
    const isFirstWeek = weekOffset === 0
    
    if (isFirstWeek) {
      // 첫 주차: 월-금 5일 구조 유지하면서 시작일 이전은 빈 칸으로 표시
      weekDays = ['월', '화', '수', '목', '금']
      const startDay = startOfWeek.getDay() // 그룹 시작일의 요일 (0=일요일, 1=월요일, ...)
      
      weeklyData = weekDays.map((day, index) => {
        const weekdayIndex = index + 1 // 월요일=1, 화요일=2, ..., 금요일=5
        
        // 그룹 시작일보다 이전 요일인지 확인
        const isBeforeStart = weekdayIndex < startDay
        
        if (isBeforeStart) {
          // 그룹 시작일 이전 요일은 빈 칸으로 표시
          return {
            day,
            status: '',
            present: 0,
            late: 0,
            absent: 0,
            isBeforeStart: true,
            isEmpty: true // 빈 칸 표시용
          }
        }
        
        // 그룹 시작일 이후 요일들의 실제 날짜 계산
        const daysFromStart = weekdayIndex - startDay
        const dayStart = new Date(startOfWeek.getTime() + (daysFromStart * 24 * 60 * 60 * 1000))
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
        
        // 현재 날짜와 비교하여 미래 날짜인지 확인
        const kstToday = getKSTNow()
        const isFutureDate = dayStart > kstToday
        
        const dayRecord = (weeklyRecords || []).find(record => {
          const recordDate = utcToKSTDate(record.scan_time)
          return recordDate >= dayStart && recordDate <= dayEnd
        })

        return {
          day,
          status: isFutureDate ? '' : (dayRecord ? (dayRecord.status === 'late' ? '지각' : '출근') : '결근'),
          present: dayRecord && (dayRecord.status === 'present' || dayRecord.status === 'late') ? 1 : 0,
          late: dayRecord && dayRecord.status === 'late' ? 1 : 0,
          absent: isFutureDate ? 0 : (dayRecord ? 0 : 1),
          isBeforeStart: false,
          isEmpty: isFutureDate
        }
      })
    } else {
      // 이후 주차: 월화수목금 (표준 주차)
      weekDays = ['월', '화', '수', '목', '금']
      weeklyData = weekDays.map((day, index) => {
        const dayStart = new Date(startOfWeek.getTime() + (index * 24 * 60 * 60 * 1000))
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
        
        // 현재 날짜와 비교하여 미래 날짜인지 확인
        const kstToday = getKSTNow()
        const isFutureDate = dayStart > kstToday
        
        const dayRecord = (weeklyRecords || []).find(record => {
          const recordDate = utcToKSTDate(record.scan_time)
          return recordDate >= dayStart && recordDate <= dayEnd
        })

        // 그룹 시작일과 비교하여 시작일 이전인지 확인
        const groupStartDate = new Date(groupInfo.start_date)
        const isBeforeStart = dayStart < groupStartDate

        return {
          day,
          status: isFutureDate ? '' : (dayRecord ? (dayRecord.status === 'late' ? '지각' : '출근') : '결근'),
          present: dayRecord && (dayRecord.status === 'present' || dayRecord.status === 'late') ? 1 : 0,
          late: dayRecord && dayRecord.status === 'late' ? 1 : 0,
          absent: isFutureDate ? 0 : (dayRecord ? 0 : 1),
          isBeforeStart,
          isEmpty: isFutureDate
        }
      })
    }

    return weeklyData
  } catch (error) {
    return []
  }
}

export async function getRecentAttendanceByUser(userId: string, limit: number = 10) {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('user_id', userId)
    .order('scan_time', { ascending: false })
    .limit(limit)

  if (error) throw error
  
  return data || []
}

/**
 * 테스트용 8월 1일 출석 데이터 생성
 */
export async function insertTestAttendanceData() {
  try {
    
    // 1. 활성 그룹 조회
    const { data: groups, error: groupsError } = await supabase
      .from('groups')
      .select('id, name, start_date')
      .eq('status', 'active')
      .limit(1)

    if (groupsError) {
      console.error('그룹 조회 실패:', groupsError)
      throw groupsError
    }

    if (!groups || groups.length === 0) {
      return
    }

    const group = groups[0]


    // 2. 그룹 멤버 조회
    const { data: members, error: membersError } = await supabase
      .from('group_memberships')
      .select('user_id, users!inner(name)')
      .eq('group_id', group.id)
      .limit(5) // 최대 5명만

    if (membersError) {
      console.error('멤버 조회 실패:', membersError)
      throw membersError
    }

    if (!members || members.length === 0) {
      return
    }

    // 3. 8월 1일(목요일) 테스트 데이터 생성
    const testDate = new Date('2024-08-01T00:00:00.000Z') // 8월 1일 00:00 UTC
    const testRecords = []

    for (let i = 0; i < members.length; i++) {
      const member = members[i]
      const userId = member.user_id
      
      // 각 멤버마다 다른 시간과 상태로 출근 기록 생성
      const checkinHour = 8 + (i % 3) // 8시, 9시, 10시
      const checkinMinute = (i * 15) % 60 // 0분, 15분, 30분, 45분
      
      const checkinTime = new Date(testDate)
      checkinTime.setHours(checkinHour, checkinMinute, 0, 0)
      
      // 상태 결정: 9시 이후면 지각, 그 전이면 정상출석
      const status = checkinHour >= 9 ? 'late' : 'present'
      
      testRecords.push({
        user_id: userId,
        group_id: group.id,
        scan_time: checkinTime.toISOString(),
        scan_type: 'checkin',
        status: status,
        latitude: 37.5665 + (Math.random() - 0.5) * 0.01, // 서울 근처 랜덤 좌표
        longitude: 126.9780 + (Math.random() - 0.5) * 0.01,
        is_manual: true // 테스트 데이터임을 표시
      })


    }

    // 4. 기존 8월 1일 데이터 삭제 (중복 방지)
    const august1Start = new Date('2024-08-01T00:00:00.000Z')
    const august1End = new Date('2024-08-01T23:59:59.999Z')
    
    await supabase
      .from('attendance_logs')
      .delete()
      .eq('group_id', group.id)
      .gte('scan_time', august1Start.toISOString())
      .lte('scan_time', august1End.toISOString())
      .eq('is_manual', true)



    // 5. 새 데이터 삽입
    const { data: insertedRecords, error: insertError } = await supabase
      .from('attendance_logs')
      .insert(testRecords)
      .select()

    if (insertError) {
      console.error('테스트 데이터 삽입 실패:', insertError)
      throw insertError
    }

    return insertedRecords

  } catch (error) {
    throw error
  }
}

/**
 * 그룹 시작날짜 기준 첫 주 통계
 */
export async function getStudentFirstWeekStats(userId: string, groupId: string) {
  try {
    
    // 1. 그룹 정보 조회 (시작일 확인)
    const { data: groupInfo, error: groupError } = await supabase
      .from('groups')
      .select('start_date, end_date, name')
      .eq('id', groupId)
      .single()

    if (groupError || !groupInfo?.start_date) {
      console.error('그룹 정보 조회 실패 또는 시작일 없음:', groupError)
      return {
        hasData: false,
        message: '그룹 시작일이 설정되지 않았습니다.'
      }
    }

    // 2. 첫 주 범위 계산 (시작일부터 7일)
    const groupStartDate = new Date(groupInfo.start_date)
    const firstWeekEnd = new Date(groupStartDate.getTime() + (6 * 24 * 60 * 60 * 1000))
    // const _kstNow = getKSTNow() // 사용하지 않음
    


    // 3. 첫 주 출석 데이터 조회
    const { data: firstWeekRecords, error } = await supabase
      .from('attendance_logs')
      .select('scan_time, scan_type, status')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('scan_type', 'checkin')
      .gte('scan_time', kstToUTCISOString(groupStartDate))
      .lte('scan_time', kstToUTCISOString(firstWeekEnd))
      .order('scan_time', { ascending: true })

    if (error) {
      console.error('첫 주 출석 데이터 조회 실패:', error)
      throw error
    }



    // 4. 첫 주 휴가 데이터 조회
    const { data: firstWeekVacations } = await supabase
      .from('vacation_requests')
      .select('start_date, end_date')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('status', 'approved')
      .gte('start_date', groupStartDate.toISOString().split('T')[0])
      .lte('end_date', firstWeekEnd.toISOString().split('T')[0])

    // 5. 요일별 출석 상태 매핑
    const weekDays = ['일', '월', '화', '수', '목', '금', '토']
    const weeklyData = weekDays.map((day, index) => {
      const dayStart = new Date(groupStartDate.getTime() + (index * 24 * 60 * 60 * 1000))
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
      
      // 출석 기록 확인
      const dayRecord = (firstWeekRecords || []).find(record => {
        const recordDate = utcToKSTDate(record.scan_time)
        return recordDate >= dayStart && recordDate <= dayEnd
      })

      // 휴가 확인
      const isVacation = (firstWeekVacations || []).some(vacation => {
        const vacationStart = new Date(vacation.start_date)
        const vacationEnd = new Date(vacation.end_date)
        return dayStart <= vacationEnd && dayEnd >= vacationStart
      })

      let status = '결근'
      if (isVacation) {
        status = '휴가'
      } else if (dayRecord) {
        status = dayRecord.status === 'late' ? '지각' : '출근'
      }

      return {
        day,
        date: dayStart.toISOString().split('T')[0],
        status,
        present: dayRecord && (dayRecord.status === 'present' || dayRecord.status === 'late') ? 1 : 0,
        late: dayRecord && dayRecord.status === 'late' ? 1 : 0,
        absent: !dayRecord && !isVacation ? 1 : 0,
        vacation: isVacation ? 1 : 0
      }
    })

    // 6. 통계 계산
    const totalDays = 7
    const presentDays = weeklyData.filter(d => d.status === '출근').length
    const lateDays = weeklyData.filter(d => d.status === '지각').length
    const absentDays = weeklyData.filter(d => d.status === '결근').length
    const vacationDays = weeklyData.filter(d => d.status === '휴가').length
    const possibleDays = totalDays - vacationDays
    const attendanceRate = possibleDays > 0 ? ((presentDays + lateDays) / possibleDays) * 100 : 0

    const result = {
      hasData: true,
      groupName: groupInfo.name,
      startDate: groupStartDate.toISOString().split('T')[0],
      endDate: firstWeekEnd.toISOString().split('T')[0],
      totalDays,
      presentDays,
      lateDays,
      absentDays,
      vacationDays,
      possibleDays,
      attendanceRate: Math.round(attendanceRate * 10) / 10,
      weeklyData
    }

    return result

  } catch (error) {
    return {
      hasData: false,
      message: '통계 계산 중 오류가 발생했습니다.'
    }
  }
}

