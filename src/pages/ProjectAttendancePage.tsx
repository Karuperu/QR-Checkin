import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft, Users, Clock, Calendar, Settings, Bell, UserPlus, TrendingUp, User,
  Eye, Activity, AlertCircle, CheckCircle, Save, X, Search
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getGroup,
  getWeeklyAttendanceStats,
  getGroupMembers,
  getGroupWorkSettings,
  upsertGroupWorkSettings,
  getAvailableUsers,
  addMultipleUsersToGroup,
  removeUserFromGroup,
  getKSTNow,
  supabase
} from '../lib/supabase'
import type { Group, User as UserType } from '../types'

// 원형 진행률 컴포넌트
const CircularProgress = ({ percentage, size = 80, strokeWidth = 8, color = "#059669" }: {
  percentage: number
  size?: number
  strokeWidth?: number
  color?: string
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900">{Math.round(percentage)}%</span>
      </div>
    </div>
  )
}

const GroupAttendancePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { groupId } = useParams()
  
  const [loading, setLoading] = useState(true)
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null)
  const [groupMembers, setGroupMembers] = useState<UserType[]>([])
  const [selectedTab, setSelectedTab] = useState('dashboard')
  const [selectedStatsTab, setSelectedStatsTab] = useState<'overview' | 'trends' | 'details'>('overview')
  // const [selectedPeriod, setSelectedPeriod] = useState('week') // 차트 관련 - 미사용
  const [selectedWeek, setSelectedWeek] = useState('')
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showDayDetail, setShowDayDetail] = useState(false)
  const [weekOptions, setWeekOptions] = useState<any[]>([])

  // 출퇴근 설정 관련 state
  const [settings, setSettings] = useState({
    checkin_deadline_hour: 10,
    checkout_start_hour: 18
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 구성원 추가 관련 state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<UserType[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)

  // 출석 데이터
  const [todayStats, setTodayStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    vacation: 0,
    attendanceRate: 0
  })

  const realtimeActivities: any[] = [] // 실시간 활동 - 임시 빈 배열
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [weeklyChartData, setWeeklyChartData] = useState<any[]>([])

  // 인증 확인
  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
  }, [user, navigate])

  // 데이터 로드
  useEffect(() => {
    if (!user || !groupId) return
    
    loadData()
    
    // 실시간 업데이트는 필요시에만 활성화 (현재는 비활성화)
    // const interval = setInterval(() => {
    //   refreshData()
    // }, 30000)
    
    // return () => clearInterval(interval)
  }, [user, groupId])

  // 주간 차트 데이터 로드 (selectedWeek 변경 시에만)
  useEffect(() => {
    if (currentGroup && groupMembers.length > 0) {
  
      const loadChartData = async () => {
        const targetWeek = selectedWeek || 'week-1'
        const chartData = await generateSimpleChartData(targetWeek)
        setWeeklyChartData(chartData)
      }
      loadChartData()
    }
  }, [currentGroup, groupMembers, selectedWeek])

  // 전체 현황 탭 활성화 시 오늘 데이터 새로고침
  useEffect(() => {
    if (selectedStatsTab === 'overview' && currentGroup && groupId) {
  
      loadTodayStats(groupId)
    }
  }, [selectedStatsTab, currentGroup, groupId])

  // 학생별 상세 탭 활성화 시 데이터 로드
  useEffect(() => {
    if (selectedStatsTab === 'details' && currentGroup && groupMembers.length > 0) {
  
      const loadStudentData = async () => {
        await generateStudentDetailData(selectedWeek)
      }
      loadStudentData()
    }
  }, [selectedStatsTab, currentGroup, groupMembers, selectedWeek])



  const loadData = async () => {
    if (!user || !groupId) return

    try {
      setLoading(true)

      // 그룹 정보 조회
      const group = await getGroup(groupId)
      if (!group) {
        navigate('/group-management')
        return
      }
      setCurrentGroup(group)

      // 권한 확인 (교수만 접근 가능)
      if (user.role !== 'faculty' || group.faculty_id !== user.id) {
        navigate('/')
        return
      }

      // 그룹 멤버 조회
      const members = await getGroupMembers(groupId)
      setGroupMembers(members)

      // 오늘 출석 현황 조회
      await loadTodayStats(groupId)

      // 주간 출석 데이터 조회
      await loadWeeklyStats(groupId)

      // 그룹 근무 시간 설정 조회
      await loadWorkSettings(groupId)

    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  // 데이터 새로고침 함수
  const refreshData = async () => {
    if (!groupId) return
    
    try {
      // 오늘 출석 현황 새로고침
      await loadTodayStats(groupId)
      
      // 주간 출석 데이터 새로고침
      await loadWeeklyStats(groupId)
      
      // 주간 차트 데이터 새로고침
      const chartData = await generateSimpleChartData(selectedWeek)
      setWeeklyChartData(chartData)
      
    } catch (error) {
      console.error('데이터 새로고침 실패:', error)
    }
  }

  const loadTodayStats = async (groupId: string) => {
    try {
  
      
      // 오늘 날짜 기준으로 실제 DB 데이터 조회
      const today = getKSTNow()
      const todayString = today.toISOString().split('T')[0]
      
      
      
      // 그룹 멤버가 아직 로드되지 않았다면 다시 조회
      let totalMembers = groupMembers.length
      if (totalMembers === 0) {

        const members = await getGroupMembers(groupId)
        setGroupMembers(members)
        totalMembers = members.length

      }
      
      // 오늘 출석 기록 조회 (KST 기준)
      const todayStart = new Date(today)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(today)
      todayEnd.setHours(23, 59, 59, 999)
      
      
      
      const { data: todayAttendance, error } = await supabase
        .from('attendance_logs')
        .select('user_id, status, scan_type, scan_time')
        .eq('group_id', groupId)
        .eq('scan_type', 'checkin')
        .gte('scan_time', todayStart.toISOString())
        .lte('scan_time', todayEnd.toISOString())

      if (error) {
        console.error('오늘 출석 데이터 조회 실패:', error)
        return
      }

      

      // 오늘 휴가 조회
      const { count: vacationCount } = await supabase
        .from('vacation_requests')
        .select('*', { count: 'exact' })
        .eq('group_id', groupId)
        .eq('status', 'approved')
        .lte('start_date', todayString)
        .gte('end_date', todayString)

      

      // 통계 계산
      const presentCount = (todayAttendance || []).filter(r => r.status === 'present').length
      const lateCount = (todayAttendance || []).filter(r => r.status === 'late').length
      const absentCount = Math.max(0, totalMembers - presentCount - lateCount - (vacationCount || 0))
      const attendanceRate = totalMembers > 0 ? ((presentCount + lateCount) / totalMembers) * 100 : 0

      const stats = {
        total: totalMembers,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        vacation: vacationCount || 0,
        attendanceRate: Math.round(attendanceRate * 10) / 10
      }

      
      setTodayStats(stats)
      
    } catch (error) {
      console.error('오늘 출석 현황 로드 실패:', error)
    }
  }

  const loadWeeklyStats = async (groupId: string) => {
    try {
      const stats = await getWeeklyAttendanceStats(groupId, 0)
      
      // 임시 데이터 구조로 변환 (실제로는 더 정교한 변환 필요)
      const weeklyDataArray = [
        { day: '월', present: 0, late: 0, absent: 0 },
        { day: '화', present: 0, late: 0, absent: 0 },
        { day: '수', present: 0, late: 0, absent: 0 },
        { day: '목', present: 0, late: 0, absent: 0 },
        { day: '금', present: 0, late: 0, absent: 0 }
      ]
      setWeeklyData(weeklyDataArray)
      
      // 주간 차트 데이터 로드 - selectedWeek이 없으면 기본값 사용
      const targetWeek = selectedWeek || 'week-1'
  
      const chartData = await generateSimpleChartData(targetWeek)
      setWeeklyChartData(chartData)
      
    } catch (error) {
      console.error('주간 통계 로드 실패:', error)
    }
  }

  const loadWorkSettings = async (groupId: string) => {
    try {
      const workSettings = await getGroupWorkSettings(groupId)
      if (workSettings) {
        setSettings({
          checkin_deadline_hour: workSettings.checkin_deadline_hour,
          checkout_start_hour: workSettings.checkout_start_hour
        })
      }
    } catch (error) {
      console.error('근무 시간 설정 로드 실패:', error)
    }
  }

  // DB 기반 일별 상세 데이터 생성 (주차별로 다른 데이터)
  const generateDayDetails = (weekValue?: string) => {
    const targetWeek = weekValue || selectedWeek
    if (!groupMembers || groupMembers.length === 0) {
      return {
        '월': [{ name: '샘플 학생', dept: '컴퓨터공학과', checkin: '09:00', checkout: '18:00', note: '정상출근' }],
        '화': [{ name: '샘플 학생', dept: '컴퓨터공학과', checkin: '09:15', checkout: '18:00', note: '지각' }],
        '수': [{ name: '샘플 학생', dept: '컴퓨터공학과', checkin: '09:00', checkout: '18:00', note: '정상출근' }],
        '목': [{ name: '샘플 학생', dept: '컴퓨터공학과', checkin: '', checkout: '', note: '결근' }],
        '금': [{ name: '샘플 학생', dept: '컴퓨터공학과', checkin: '09:00', checkout: '18:00', note: '정상출근' }]
      }
    }

    // 주차별로 다른 패턴 생성
    const getDetailPatterns = (weekValue: string) => {
      const weekNumber = parseInt(weekValue.split('-')[1]) || 1
      const seed = weekNumber % 3 // 3가지 패턴 순환
      
      const patternSets = [
        // 패턴 0: 일반적인 주
        {
          statusPatterns: ['정상출근', '지각', '정상출근', '결근', '정상출근'],
          checkinTimes: ['09:00', '09:15', '08:55', '', '09:05'],
          checkoutTimes: ['18:30', '18:00', '18:25', '', '18:15']
        },
        // 패턴 1: 지각이 많은 주
        {
          statusPatterns: ['지각', '지각', '정상출근', '지각', '정상출근'],
          checkinTimes: ['09:20', '09:30', '08:50', '09:45', '09:00'],
          checkoutTimes: ['18:10', '18:20', '18:30', '18:00', '18:25']
        },
        // 패턴 2: 결근이 있는 주
        {
          statusPatterns: ['정상출근', '결근', '정상출근', '결근', '지각'],
          checkinTimes: ['09:00', '', '08:55', '', '09:10'],
          checkoutTimes: ['18:15', '', '18:20', '', '18:05']
        }
      ]
      
      return patternSets[seed]
    }
    
    const patterns = getDetailPatterns(targetWeek)
    const days = ['월', '화', '수', '목', '금']
    const { statusPatterns, checkinTimes, checkoutTimes } = patterns

    const dayDetails: { [key: string]: any[] } = {}

    days.forEach((day, dayIndex) => {
      dayDetails[day] = groupMembers.map((member, memberIndex) => {
        const patternIndex = (dayIndex + memberIndex) % statusPatterns.length
        const status = statusPatterns[patternIndex]
        
        return {
          name: member.name,
          dept: member.department || '미지정',
          checkin: status === '결근' ? '' : checkinTimes[patternIndex],
          checkout: status === '결근' ? '' : checkoutTimes[patternIndex],
          note: status
        }
      })
    })

    return dayDetails
  }

  // 주차 정보 생성 함수 (프로젝트 시작일 기준)
  const getWeekInfo = (weeksAgo: number = 0) => {
    if (!currentGroup?.start_date) {
      // 그룹 정보가 없는 경우 기본값 반환
      return {
        weekNumber: 1,
        label: '1주차',
        dateRange: '',
        fullLabel: '1주차'
      }
    }

    const projectStart = new Date(currentGroup.start_date)
    const today = getKSTNow()
    
    // 날짜 포맷팅
    const formatDate = (date: Date) => {
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}월 ${day}일`
    }

    // 현재 주차 계산 (그룹 시작일부터 몇 주차인지)
    const timeDiff = today.getTime() - projectStart.getTime()
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
    const currentWeekNumber = Math.max(1, Math.floor(daysDiff / 7) + 1)
    
    // weeksAgo만큼 뒤로 가서 해당 주차 계산
    const targetWeekNumber = Math.max(1, currentWeekNumber - weeksAgo)
    
    let weekStartDate: Date
    let weekEndDate: Date
    
    if (targetWeekNumber === 1) {
      // 첫 주차: 그룹 시작일부터
      weekStartDate = new Date(projectStart)
      const startDay = weekStartDate.getDay() // 0=일요일, 1=월요일, 2=화요일, ...
      const daysToFriday = startDay <= 5 ? 5 - startDay : 5 + (7 - startDay)
      weekEndDate = new Date(weekStartDate.getTime() + daysToFriday * 24 * 60 * 60 * 1000)
    } else {
      // 이후 주차: 1주차가 포함된 주의 월요일 기준으로 계산
      const firstWeekStartDay = projectStart.getDay()
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
      
      const firstWeekMonday = new Date(projectStart.getTime() + (firstWeekMondayOffset * 24 * 60 * 60 * 1000))
      
      // targetWeekNumber주차의 월요일 계산
      weekStartDate = new Date(firstWeekMonday.getTime() + ((targetWeekNumber - 1) * 7 * 24 * 60 * 60 * 1000))
      weekEndDate = new Date(weekStartDate.getTime() + (4 * 24 * 60 * 60 * 1000)) // 금요일
    }
    
    return {
      weekNumber: targetWeekNumber,
      label: weeksAgo === 0 ? '이번주' : weeksAgo === 1 ? '지난주' : `${targetWeekNumber}주차`,
      dateRange: `${formatDate(weekStartDate)} ~ ${formatDate(weekEndDate)}`,
      fullLabel: `${targetWeekNumber}주차 (${formatDate(weekStartDate)} ~ ${formatDate(weekEndDate)})`
    }
  }

  // 현재 주차 구하기
  const getCurrentWeekNumber = () => {
    return getWeekInfo(0).weekNumber
  }

  // 모든 주차 옵션 생성 (프로젝트 1주차부터 현재 주차까지)
  const generateWeekOptions = () => {
    const currentWeekNumber = getCurrentWeekNumber()
    const options = []
    
    // 프로젝트 시작 이후의 모든 주차 생성
    for (let i = 0; i < currentWeekNumber; i++) {
      const weekInfo = getWeekInfo(i)
      // 실제 주차 번호가 1보다 큰 경우만 포함
      if (weekInfo.weekNumber >= 1) {
        options.push({
          value: `week-${weekInfo.weekNumber}`,
          ...weekInfo
        })
      }
    }
    
    // 최신 주차부터 1주차 순으로 정렬
    return options.sort((a, b) => b.weekNumber - a.weekNumber)
  }

  // currentGroup이 로드된 후 주차 옵션 업데이트
  React.useEffect(() => {
    if (currentGroup?.start_date) {
      
      
      const options = generateWeekOptions()
      
      
      setWeekOptions(options)
      
      // 기본 선택된 주차 설정 (가장 최신 주차)
      if (options.length > 0 && !selectedWeek) {
        const defaultWeek = options[0].value

        setSelectedWeek(defaultWeek)
      }
    }
  }, [currentGroup])

  // selectedWeek가 변경될 때마다 차트 데이터 업데이트
  React.useEffect(() => {
    if (selectedWeek && groupId && groupMembers.length > 0) {
      
      
      const updateChartData = async () => {
        try {
          const chartData = await generateSimpleChartData(selectedWeek)

          setWeeklyChartData(chartData)
        } catch (error) {
          console.error('차트 데이터 업데이트 실패:', error)
        }
      }
      
      updateChartData()
    }
  }, [selectedWeek, groupId, groupMembers])
  
  // 동적 주간 데이터 구조 생성
  const generateStatsWeeklyData = () => {
    const data: any = {}
    
    weekOptions.forEach(option => {
      data[option.value] = {
        label: option.label,
        dateRange: option.dateRange,
        stackData: [],
        dayDetails: generateDayDetails(),
        studentData: []
      }
    })
    
    return data
  }
  
  // weekOptions가 업데이트된 후 statsWeeklyData도 업데이트
  const statsWeeklyData = React.useMemo(() => {
    return generateStatsWeeklyData()
  }, [weekOptions])

  // 선택된 주차의 데이터를 동적으로 생성
  const getCurrentWeekData = () => {
    if (!selectedWeek || !weekOptions.find(w => w.value === selectedWeek)) {
      return {
        label: '데이터 없음',
        dateRange: '',
        stackData: [],
        dayDetails: {},
        studentData: []
      }
    }
    
    const weekOption = weekOptions.find(w => w.value === selectedWeek)
    return {
      label: weekOption?.label || '',
      dateRange: weekOption?.dateRange || '',
      stackData: [],
      dayDetails: generateDayDetails(selectedWeek),
      studentData: []
    }
  }
  
  const currentData = getCurrentWeekData()

  // 새로운 간단한 차트 데이터 생성 함수
  const generateSimpleChartData = async (weekValue?: string) => {
    const targetWeek = weekValue || selectedWeek

    
    if (!groupId || !currentGroup?.start_date || !groupMembers || groupMembers.length === 0) {
      
      return [
        { day: '월', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
        { day: '화', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
        { day: '수', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
        { day: '목', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
        { day: '금', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true }
      ]
    }

    // 먼저 DB에 실제로 어떤 데이터가 있는지 확인
    
    try {
      const { data: allData, error: allError } = await supabase
        .from('attendance_logs')
        .select('user_id, group_id, status, scan_time, scan_type')
        .eq('group_id', groupId)
        .order('scan_time', { ascending: false })
        .limit(20)

      if (allError) {
        console.error('전체 데이터 조회 실패:', allError)
      } else {

        
        // 각 상태별 개수 확인
        if (allData && allData.length > 0) {
          const statusCount = allData.reduce((acc, record) => {
            acc[record.status] = (acc[record.status] || 0) + 1
            return acc
          }, {} as Record<string, number>)

          
          const typeCount = allData.reduce((acc, record) => {
            acc[record.scan_type] = (acc[record.scan_type] || 0) + 1
            return acc
          }, {} as Record<string, number>)

        }
      }
    } catch (e) {
      console.error('DB 조회 중 에러:', e)
    }

    try {
      // 주차 번호 추출
      const weekNumber = parseInt(targetWeek.split('-')[1]) || 1

      
      // 그룹 시작일 기준으로 주차별 날짜 범위 계산
      const groupStartDate = new Date(currentGroup.start_date)
      groupStartDate.setHours(0, 0, 0, 0)
      
      
      
      // 선택된 주차의 시작일 계산 (1주차 = 그룹 시작일부터)
      const msPerWeek = 7 * 24 * 60 * 60 * 1000
      
      let targetWeekStart: Date
      let targetWeekEnd: Date
      
      if (weekNumber === 1) {
        // 1주차: 그룹 시작일부터 첫 번째 금요일까지
        targetWeekStart = new Date(groupStartDate)
        
        // 그룹 시작일의 요일 확인
        const startDayOfWeek = groupStartDate.getDay() // 0=일, 1=월, ..., 6=토
        
        if (startDayOfWeek <= 5) {
          // 월~금 시작: 그 주 금요일까지
          const daysToFriday = 5 - startDayOfWeek
          targetWeekEnd = new Date(groupStartDate.getTime() + daysToFriday * 24 * 60 * 60 * 1000)
        } else {
          // 토~일 시작: 다음 주 금요일까지
          const daysToNextFriday = 12 - startDayOfWeek // 토요일=6이면 6일 후, 일요일=0이면 5일 후
          targetWeekEnd = new Date(groupStartDate.getTime() + daysToNextFriday * 24 * 60 * 60 * 1000)
        }
      } else {
        // 2주차 이상: 1주차 이후 월요일부터 금요일까지
        const startDayOfWeek = groupStartDate.getDay()
        
        // 1주차 종료 후 첫 번째 월요일 찾기
        let firstMondayAfterStart: Date
        if (startDayOfWeek <= 5) {
          // 월~금 시작: 다음 주 월요일
          const daysToNextMonday = 8 - startDayOfWeek
          firstMondayAfterStart = new Date(groupStartDate.getTime() + daysToNextMonday * 24 * 60 * 60 * 1000)
        } else {
          // 토~일 시작: 다음 월요일
          const daysToNextMonday = 8 - startDayOfWeek
          firstMondayAfterStart = new Date(groupStartDate.getTime() + daysToNextMonday * 24 * 60 * 60 * 1000)
        }
        
        // 선택된 주차의 월요일 계산
        const additionalWeeks = weekNumber - 2 // 2주차면 0주 추가, 3주차면 1주 추가
        targetWeekStart = new Date(firstMondayAfterStart.getTime() + additionalWeeks * msPerWeek)
        targetWeekEnd = new Date(targetWeekStart.getTime() + 4 * 24 * 60 * 60 * 1000) // 금요일
      }
      
      targetWeekEnd.setHours(23, 59, 59, 999)
      
      
      // 선택된 주차의 데이터 조회
      const { data: records, error } = await supabase
        .from('attendance_logs')
        .select('user_id, status, scan_time, scan_type')
        .eq('group_id', groupId)
        .gte('scan_time', targetWeekStart.toISOString())
        .lte('scan_time', targetWeekEnd.toISOString())
        .order('scan_time', { ascending: true })

      if (error) {
        console.error('DB 조회 실패:', error)
        throw error
      }

      
      // 체크인 기록만 필터링
      const checkinRecords = records?.filter(r => r.scan_type === 'checkin') || []
      
      // 선택된 주차의 각 요일별 데이터 초기화
      const chartData = []
      const days = ['월', '화', '수', '목', '금']
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      // 1주차의 경우 그룹 시작일부터, 2주차 이상은 해당 주 월요일부터
      const endDate = new Date(targetWeekEnd)
      
      // 1주차 처리: 월~금 5개 칸을 모두 채우되, 그룹 시작 이전은 빈칸으로
      if (weekNumber === 1) {
        const startDayOfWeek = groupStartDate.getDay() // 0=일, 1=월, 2=화, ..., 6=토
        const startDayIndex = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1 // 일요일=6, 월요일=0
        

        
        // 월요일부터 금요일까지 5개 칸 모두 처리
        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
          const dayName = days[dayIndex]
          
          if (dayIndex < startDayIndex) {
            // 그룹 시작 이전 날짜들은 빈칸으로 표시
            chartData.push({
              day: dayName,
              출근: 0,
              지각: 0,
              결근: 0,
              기타: 0,
              noData: true,
              isEmpty: true // 빈칸임을 표시
            })

          } else {
            // 그룹 시작일 이후의 날짜들 처리
            const daysFromStart = dayIndex - startDayIndex
            const dayDate = new Date(groupStartDate.getTime() + daysFromStart * 24 * 60 * 60 * 1000)
            const isFuture = dayDate > today
            const isAfterWeekEnd = dayDate > endDate
            
            const dayData = {
              day: dayName,
              출근: 0,
              지각: 0,
              결근: 0,
              기타: 0,
              noData: isFuture || isAfterWeekEnd
            }
            
            if (!isFuture && !isAfterWeekEnd) {
              // 해당 날짜의 체크인 기록들
              const dayRecords = checkinRecords.filter(record => {
                const recordDate = new Date(record.scan_time)
                recordDate.setHours(0, 0, 0, 0)
                return recordDate.getTime() === dayDate.getTime()
              })
              

              
              // 상태별 집계
              dayRecords.forEach(record => {
                switch (record.status) {
                  case 'present':
                    dayData.출근++
                    break
                  case 'late':
                    dayData.지각++
                    break
                  case 'absent':
                    dayData.결근++
                    break
                  default:
                    dayData.기타++
                    break
                }
              })
              
              // 결근자 수 = 전체 멤버 수 - 출석한 사람 수
              const attendedCount = dayData.출근 + dayData.지각 + dayData.기타
              if (attendedCount < groupMembers.length) {
                dayData.결근 = groupMembers.length - attendedCount
              }
            }
            
            chartData.push(dayData)
          }
        }
      } else {
        // 2주차 이상: 월요일부터 금요일까지
        for (let i = 0; i < 5; i++) {
          const dayDate = new Date(targetWeekStart.getTime() + i * 24 * 60 * 60 * 1000)
          const dayName = days[i]
          const isFuture = dayDate > today
        
          const dayData = {
            day: dayName,
            출근: 0,
            지각: 0,
            결근: 0,
            기타: 0,
            noData: isFuture
          }
          
          if (!isFuture) {
            // 해당 날짜의 체크인 기록들
            const dayRecords = checkinRecords.filter(record => {
              const recordDate = new Date(record.scan_time)
              recordDate.setHours(0, 0, 0, 0)
              return recordDate.getTime() === dayDate.getTime()
            })
            

            
            // 상태별 집계
            dayRecords.forEach(record => {
              switch (record.status) {
                case 'present':
                  dayData.출근++
                  break
                case 'late':
                  dayData.지각++
                  break
                case 'absent':
                  dayData.결근++
                  break
                default:
                  dayData.기타++
                  break
              }
            })
            
            // 결근자 수 = 전체 멤버 수 - 출석한 사람 수
            const attendedCount = dayData.출근 + dayData.지각 + dayData.기타
            if (attendedCount < groupMembers.length) {
              dayData.결근 = groupMembers.length - attendedCount
            }
          }
          
          chartData.push(dayData)
        }
      }
      
      return chartData
      
    } catch (error) {
      // 차트 데이터 생성 실패
      return [
        { day: '월', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
        { day: '화', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
        { day: '수', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
        { day: '목', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
        { day: '금', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true }
      ]
    }
  }

  // DB 기반 학생별 상세 데이터 생성 (StudentAttendanceGrid 형식에 맞춤)
  const [studentDetailData, setStudentDetailData] = useState<any[]>([])

  const generateStudentDetailData = async (weekValue?: string) => {
    if (!groupMembers || groupMembers.length === 0 || !groupId) {
      return []
    }

    const targetWeek = weekValue || selectedWeek || 'week-1'


    try {
      // 주차 번호 추출
      const weekNumber = parseInt(targetWeek.split('-')[1]) || 1
      
      // 그룹 시작일 기준으로 주차별 날짜 범위 계산
      const groupStartDate = new Date(currentGroup?.start_date || new Date())
      groupStartDate.setHours(0, 0, 0, 0)
      
      // 선택된 주차의 시작일 계산
      const msPerWeek = 7 * 24 * 60 * 60 * 1000
      
      let targetWeekStart: Date
      let targetWeekEnd: Date
      
      if (weekNumber === 1) {
        // 1주차: 그룹 시작일부터 첫 번째 금요일까지
        targetWeekStart = new Date(groupStartDate)
        
        const startDayOfWeek = groupStartDate.getDay()
        
        if (startDayOfWeek <= 5) {
          const daysToFriday = 5 - startDayOfWeek
          targetWeekEnd = new Date(groupStartDate.getTime() + daysToFriday * 24 * 60 * 60 * 1000)
        } else {
          const daysToNextFriday = 12 - startDayOfWeek
          targetWeekEnd = new Date(groupStartDate.getTime() + daysToNextFriday * 24 * 60 * 60 * 1000)
        }
      } else {
        // 2주차 이상: 해당 주 월요일부터 금요일까지
        const startDayOfWeek = groupStartDate.getDay()
        
        let firstMondayAfterStart: Date
        if (startDayOfWeek <= 5) {
          const daysToNextMonday = 8 - startDayOfWeek
          firstMondayAfterStart = new Date(groupStartDate.getTime() + daysToNextMonday * 24 * 60 * 60 * 1000)
        } else {
          const daysToNextMonday = 8 - startDayOfWeek
          firstMondayAfterStart = new Date(groupStartDate.getTime() + daysToNextMonday * 24 * 60 * 60 * 1000)
        }
        
        const additionalWeeks = weekNumber - 2
        targetWeekStart = new Date(firstMondayAfterStart.getTime() + additionalWeeks * msPerWeek)
        targetWeekEnd = new Date(targetWeekStart.getTime() + 4 * 24 * 60 * 60 * 1000)
      }
      
      targetWeekEnd.setHours(23, 59, 59, 999)
      
      
      
      // 선택된 주차의 출석 데이터 조회
      const { data: weeklyRecords, error } = await supabase
        .from('attendance_logs')
        .select('user_id, status, scan_time, scan_type')
        .eq('group_id', groupId)
        .eq('scan_type', 'checkin')
        .gte('scan_time', targetWeekStart.toISOString())
        .lte('scan_time', targetWeekEnd.toISOString())
        .order('scan_time', { ascending: true })

      if (error) {
        console.error('주간 출석 데이터 조회 실패:', error)
        throw error
      }

      

      // 각 학생별로 주간 출석 데이터 생성
      const studentData = groupMembers.map((member) => {
        const days = ['월', '화', '수', '목', '금']
        const attendance = []
        let presentCount = 0
        let totalDays = 0

        // 1주차의 경우 그룹 시작일부터, 2주차 이상은 해당 주 월요일부터
        const endDate = new Date(targetWeekEnd)
        
        if (weekNumber === 1) {
          const startDayOfWeek = groupStartDate.getDay()
          const startDayIndex = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1
          
          for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            if (dayIndex < startDayIndex) {
              // 그룹 시작 이전 요일은 빈칸
              attendance.push('')
            } else {
              const daysFromStart = dayIndex - startDayIndex
              const dayDate = new Date(groupStartDate.getTime() + daysFromStart * 24 * 60 * 60 * 1000)
              const isFuture = dayDate > new Date()
              const isAfterWeekEnd = dayDate > endDate
              
              if (isFuture || isAfterWeekEnd) {
                attendance.push('')
              } else {
                totalDays++
                const dayRecord = (weeklyRecords || []).find(record => {
                  const recordDate = new Date(record.scan_time)
                  recordDate.setHours(0, 0, 0, 0)
                  return recordDate.getTime() === dayDate.getTime() && record.user_id === member.id
                })

                if (dayRecord) {
                  const status = dayRecord.status === 'late' ? '지각' : '출근'
                  attendance.push(status)
                  if (status === '출근') presentCount++
                } else {
                  attendance.push('결근')
                }
              }
            }
          }
        } else {
          // 2주차 이상: 월요일부터 금요일까지
          for (let i = 0; i < 5; i++) {
            const dayDate = new Date(targetWeekStart.getTime() + i * 24 * 60 * 60 * 1000)
            const isFuture = dayDate > new Date()
            
            if (isFuture) {
              attendance.push('')
            } else {
              totalDays++
              const dayRecord = (weeklyRecords || []).find(record => {
                const recordDate = new Date(record.scan_time)
                recordDate.setHours(0, 0, 0, 0)
                return recordDate.getTime() === dayDate.getTime() && record.user_id === member.id
              })

              if (dayRecord) {
                const status = dayRecord.status === 'late' ? '지각' : '출근'
                attendance.push(status)
                if (status === '출근') presentCount++
              } else {
                attendance.push('결근')
              }
            }
          }
        }

        const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0
      
      return {
        name: member.name,
        id: member.user_id || `user_${member.id}`,
          dept: member.department || '미지정',
          attendance: attendance,
          rate: `${attendanceRate}%`
        }
      })

      
      setStudentDetailData(studentData)
      return studentData
      
    } catch (error) {
      console.error('학생별 출석 현황 데이터 생성 실패:', error)
      return []
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'checkin': return '🟢'
      case 'checkout': return '🔵'
      case 'late': return '🟡'
      case 'vacation': return '🟣'
      default: return '⚪'
    }
  }

  // StatsPage.tsx에서 가져온 차트 컴포넌트들
  const DualCircularProgress = ({ data, size = 120, strokeWidth = 12 }: {
    data: { name: string; value: number; count: number; color: string }[]
    size?: number
    strokeWidth?: number
  }) => {
    const radius = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * radius
    
    let currentOffset = 0

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* 배경 원 */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* 데이터별 원호 */}
          {data.map((item, index) => {
            const strokeDasharray = circumference
            const percentage = data.length === 1 ? 100 : (item.count / data.reduce((sum, d) => sum + d.count, 0)) * 100
            const strokeDashoffset = circumference - (percentage / 100) * circumference
            
            const segment = (
              <circle
                key={index}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color}
                strokeWidth={strokeWidth}
                fill="transparent"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
                style={{
                  transform: `rotate(${currentOffset}deg)`,
                  transformOrigin: `${size / 2}px ${size / 2}px`
                }}
              />
            )
            
            currentOffset += percentage * 3.6 // 360도를 100%로 변환
            return segment
          })}
        </svg>
        
        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">
            {data.reduce((sum, item) => sum + item.count, 0)}명
          </span>
          <span className="text-xs text-gray-500">총합</span>
        </div>
      </div>
    )
  }

  // 주간 출석 현황 테이블 컴포넌트
  const WeeklyAttendanceChart = ({ data }: { data: any[] }) => {
    // 전체 그룹 인원수를 기준으로 차트 높이 설정
    const maxValue = Math.max(groupMembers.length, 1)
    const chartHeight = 160 // h-40과 동일하게 설정

    return (
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-end justify-between h-50 space-x-2">
            {data.map((day, index) => {
              const total = day.출근 + day.지각 + day.결근 + day.기타
            const isEmpty = day.isEmpty || day.noData
              
            if (isEmpty) {
              return (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div className="w-full max-w-12 h-40 bg-gray-50 rounded-lg flex items-end">
                    <div className="w-full h-1 bg-gray-200 rounded"></div>
                  </div>
                  <span className="text-xs text-gray-400 mt-2">{day.day}</span>
                  <span className="text-xs font-medium text-gray-400 mt-1">{groupMembers.length}명</span>
                </div>
              )
            }

            const 출근Height = (day.출근 / maxValue) * chartHeight
            const 지각Height = (day.지각 / maxValue) * chartHeight
            const 결근Height = (day.결근 / maxValue) * chartHeight
            const 기타Height = (day.기타 / maxValue) * chartHeight

            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full max-w-12 h-40 flex flex-col-reverse rounded-lg overflow-hidden shadow-sm">
                  {/* 출근 (하단) */}
                  {day.출근 > 0 && (
                    <div 
                      className="w-full bg-green-300"
                      style={{ height: `${출근Height}px` }}
                    ></div>
                  )}
                  
                  {/* 지각 */}
                  {day.지각 > 0 && (
                    <div 
                      className="w-full bg-yellow-300"
                      style={{ height: `${지각Height}px` }}
                    ></div>
                  )}
                  
                  {/* 결근 */}
                  {day.결근 > 0 && (
                    <div 
                      className="w-full bg-red-300"
                      style={{ height: `${결근Height}px` }}
                    ></div>
                  )}
                  
                  {/* 기타 */}
                  {day.기타 > 0 && (
                    <div 
                      className="w-full bg-purple-300"
                      style={{ height: `${기타Height}px` }}
                    ></div>
                  )}
                  
                  {/* 빈 막대 (데이터가 없을 때) */}
                  {total === 0 && (
                    <div className="w-full h-1 bg-gray-200 rounded"></div>
                  )}
                </div>
                
                {/* 요일 라벨 */}
                <span className="text-xs text-gray-600 mt-2">{day.day}</span>
                
                {/* 총계 표시 */}
                <span className={`text-xs font-medium mt-1 ${
                  total > 0 ? 'text-gray-800' : 'text-gray-600'
                }`}>
                  {total > 0 ? total : groupMembers.length}명
                      </span>
              </div>
            )
          })}
        </div>
        
        {/* 범례 */}
        <div className="flex justify-center space-x-6 mt-2 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-300 rounded"></div>
            <span className="text-gray-600">출근</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-300 rounded"></div>
            <span className="text-gray-600">지각</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-300 rounded"></div>
            <span className="text-gray-600">결근</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-300 rounded"></div>
            <span className="text-gray-600">기타</span>
          </div>
        </div>
      </div>
    )
  }

  // 개별 학생 출석 현황
  const StudentAttendanceGrid = ({ students }: { students: any[] }) => {
    const getStatusColor = (status: string) => {
      switch (status) {
        case '출근': return 'bg-green-500'
        case '지각': return 'bg-yellow-400'
        case '결근': return 'bg-red-500'
        case '기타': return 'bg-purple-500'
        default: return 'bg-gray-300'
      }
    }

    const getStatusEmoji = (status: string) => {
      switch (status) {
        case '출근': return '✓'
        case '지각': return '!'
        case '결근': return '✗'
        case '기타': return 'V'
        default: return '?'
      }
    }

    const days = ['월', '화', '수', '목', '금']

    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* 헤더 (학생 정보, 요일, 출석률) */}
        <div className="bg-gray-50 px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-1 sm:gap-2 items-center">
            <div className="col-span-4 sm:col-span-3">
              <span className="text-xs sm:text-sm font-medium text-gray-700">학생 정보</span>
            </div>
            <div className="col-span-6 sm:col-span-7 grid grid-cols-5 gap-1 sm:gap-2">
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">월</span>
              </div>
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">화</span>
              </div>
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">수</span>
              </div>
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">목</span>
              </div>
              <div className="text-center">
                <span className="text-xs sm:text-sm font-medium text-gray-700">금</span>
              </div>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-xs sm:text-sm font-medium text-gray-700">출석률</span>
            </div>
          </div>
        </div>

        {/* 학생 목록 */}
        <div className="divide-y divide-gray-100">
          {students.length === 0 ? (
            <div className="px-3 sm:px-4 py-8 text-center">
              <p className="text-gray-500">학생별 출석 데이터를 불러오는 중...</p>
            </div>
          ) : (
            students.map((student, index) => (
            <div key={index} className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-gray-50 transition-colors">
              <div className="grid grid-cols-12 gap-1 sm:gap-2 items-center">
                {/* 학생 정보 */}
                <div className="col-span-4 sm:col-span-3">
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-900 truncate">{student.name}</h4>
                      <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-500">
                        <span className="truncate">{student.id}</span>
                        <span>•</span>
                        <span className="truncate">{student.dept}</span>
                      </div>
                    </div>
                    <div className="sm:hidden">
                      <p className="text-xs text-gray-500 truncate">{student.id} • {student.dept}</p>
                    </div>
                  </div>
                </div>

                {/* 출석 상태 (5일) - 아이콘만 */}
                <div className="col-span-6 sm:col-span-7 grid grid-cols-5 gap-1 sm:gap-2">
                  {student.attendance.map((status: string, dayIndex: number) => (
                    <div key={dayIndex} className="flex justify-center">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg ${getStatusColor(status)} flex items-center justify-center text-white text-xs font-medium shadow-sm`}>
                        <span className="hidden sm:inline">{getStatusEmoji(status)}</span>
                        <span className="sm:hidden text-xs">
                          {status === '출근' ? '✓' : status === '지각' ? '!' : status === '결근' ? '✗' : status === '기타' ? 'V' : '?'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 출석률 */}
                <div className="col-span-2 text-center">
                  <span className={`text-xs sm:text-sm font-bold ${
                    parseFloat(student.rate.replace('%', '')) >= 90 
                      ? 'text-green-600' 
                      : parseFloat(student.rate.replace('%', '')) >= 80 
                        ? 'text-yellow-600' 
                        : 'text-red-600'
                  }`}>
                    {student.rate}
                  </span>
                </div>
              </div>
            </div>
          ))
          )}
        </div>

        {/* 범례 */}
        <div className="bg-gray-50 px-3 sm:px-4 py-3 border-t border-gray-200">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600">출근</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-yellow-400 rounded"></div>
              <span className="text-gray-600">지각</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600">조기퇴근</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-gray-600">휴가</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-600">결근</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* 오늘 현황 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">오늘 현황</h2>
        
        {/* 상단 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">출석</p>
                <p className="text-2xl font-bold text-green-600">{todayStats.present}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">지각</p>
                <p className="text-2xl font-bold text-yellow-600">{todayStats.late}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">결근</p>
                <p className="text-2xl font-bold text-red-600">{todayStats.absent}</p>
              </div>
              <Users className="w-8 h-8 text-red-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">휴가</p>
                <p className="text-2xl font-bold text-purple-600">{todayStats.vacation}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* 출석률 및 진행 바 */}
        <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center space-x-4">
            <CircularProgress percentage={todayStats.attendanceRate} />
            <div>
              <p className="text-sm text-gray-600">전체 출석률</p>
              <p className="text-xl font-bold text-gray-900">{todayStats.attendanceRate}%</p>
              <p className="text-sm text-gray-500">
                {todayStats.present + todayStats.late}/{todayStats.total}명 출석
              </p>
            </div>
          </div>
          
          <div className="flex-1 ml-8">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-1000"
                style={{ width: `${(todayStats.present + todayStats.late) / todayStats.total * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              실시간 출석률: {Math.round((todayStats.present + todayStats.late) / todayStats.total * 100)}%
            </p>
          </div>
        </div>
      </div>

      {/* 실시간 활동 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">실시간 활동</h2>
        <div className="space-y-3">
          {realtimeActivities.map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg">{getActivityIcon(activity.type)}</span>
                <div>
                  <p className="font-medium text-gray-900">{activity.name}</p>
                  <p className="text-sm text-gray-600">{activity.dept}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{activity.action}</p>
                <p className="text-sm text-gray-500">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
  )

  // 간단한 테스트 데이터 (통합된 통계용)
  const mockStudents = [
    {
      id: 'student-1',
      name: '김철수',
      department: '컴퓨터공학과',
      presentCount: 18,
      lateCount: 2,
      absentCount: 0,
      attendanceRate: 95
    },
    {
      id: 'student-2',
      name: '박영희', 
      department: '컴퓨터공학과',
      presentCount: 17,
      lateCount: 1,
      absentCount: 2,
      attendanceRate: 90
    },
    {
      id: 'student-3',
      name: '이민수',
      department: '소프트웨어학과',
      presentCount: 19,
      lateCount: 0,
      absentCount: 1,
      attendanceRate: 95
    }
  ]

  const renderStats = () => (
    <div className="space-y-6">
      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-2xl shadow-sm">
        <div className="flex min-w-0">
          <button
            onClick={() => setSelectedStatsTab('overview')}
            className={`flex-1 px-4 py-4 text-center flex items-center justify-center space-x-2 transition-colors min-w-0 ${
              selectedStatsTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm whitespace-nowrap">전체 현황</span>
          </button>
          <button
            onClick={() => setSelectedStatsTab('trends')}
            className={`flex-1 px-4 py-4 text-center flex items-center justify-center space-x-2 transition-colors min-w-0 ${
              selectedStatsTab === 'trends'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <TrendingUp className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm whitespace-nowrap">주간 추이</span>
          </button>
          <button
            onClick={() => setSelectedStatsTab('details')}
            className={`flex-1 px-4 py-4 text-center flex items-center justify-center space-x-2 transition-colors min-w-0 ${
              selectedStatsTab === 'details'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Eye className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm whitespace-nowrap">학생별 상세</span>
          </button>
        </div>
      </div>

      {/* 현황 탭 */}
      {selectedStatsTab === 'overview' && (
        <div className="space-y-6">
          {/* 전체 출석률 - 통합 차트 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
              전체 출석률
            </h3>
            
            <div className="flex flex-col lg:flex-row items-center justify-center space-y-6 lg:space-y-0 lg:space-x-8 px-4">
              {/* 통합 원형 게이지 */}
              <div className="relative flex-shrink-0">
                <svg width="180" height="180" className="transform -rotate-90">
                  {/* 배경 원 */}
                  <circle
                    cx="90"
                    cy="90"
                    r="75"
                    stroke="#e5e7eb"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  
                  {/* 출근 (정상 출근) */}
                  {todayStats.present > 0 && (todayStats.total > 0 || groupMembers.length > 0) && (
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#86efac"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${((todayStats.present) / (todayStats.total > 0 ? todayStats.total : groupMembers.length)) * 471.2} 471.2`}
                      strokeDashoffset="0"
                      className="transition-all duration-1000 ease-out"
                    />
                  )}
                  
                  {/* 지각 */}
                  {todayStats.late > 0 && (todayStats.total > 0 || groupMembers.length > 0) && (
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#fde047"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${((todayStats.late) / (todayStats.total > 0 ? todayStats.total : groupMembers.length)) * 471.2} 471.2`}
                      strokeDashoffset={`-${((todayStats.present) / (todayStats.total > 0 ? todayStats.total : groupMembers.length)) * 471.2}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  )}
                  
                  {/* 결근 */}
                  {todayStats.absent > 0 && (todayStats.total > 0 || groupMembers.length > 0) && (
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#fca5a5"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${((todayStats.absent) / (todayStats.total > 0 ? todayStats.total : groupMembers.length)) * 471.2} 471.2`}
                      strokeDashoffset={`-${(((todayStats.present) + (todayStats.late)) / (todayStats.total > 0 ? todayStats.total : groupMembers.length)) * 471.2}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  )}
                  
                  {/* 휴가 */}
                  {todayStats.vacation > 0 && (todayStats.total > 0 || groupMembers.length > 0) && (
                    <circle
                      cx="90"
                      cy="90"
                      r="75"
                      stroke="#c4b5fd"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${((todayStats.vacation) / (todayStats.total > 0 ? todayStats.total : groupMembers.length)) * 471.2} 471.2`}
                      strokeDashoffset={`-${(((todayStats.present) + (todayStats.late) + (todayStats.absent)) / (todayStats.total > 0 ? todayStats.total : groupMembers.length)) * 471.2}`}
                      className="transition-all duration-1000 ease-out"
                    />
                  )}
                </svg>
                
                {/* 중앙 텍스트 */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-gray-800">
                    {todayStats.total > 0 ? todayStats.total : groupMembers.length}명
                  </span>
                  <span className="text-sm text-gray-600">전체 학생</span>
                </div>
              </div>
              
              {/* 범례 */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-green-300 rounded"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">출석</div>
                    <div className="text-lg font-bold text-green-600">{todayStats.present}명</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-300 rounded"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">지각</div>
                    <div className="text-lg font-bold text-yellow-600">{todayStats.late}명</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-300 rounded"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">결석</div>
                    <div className="text-lg font-bold text-red-600">{todayStats.absent}명</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-purple-300 rounded"></div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-700">휴가</div>
                    <div className="text-lg font-bold text-purple-600">{todayStats.vacation}명</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 추이 탭 */}
      {selectedStatsTab === 'trends' && (
        <div className="space-y-6">
          {/* 기간 선택 */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">
                기간 선택
              </h3>
                                  <select
                      value={selectedWeek}
                      onChange={async (e) => {
                        const newWeek = e.target.value
                    
                        setSelectedWeek(newWeek)
                        
                        // 즉시 새로운 주차의 데이터 로드
                        try {
                          const chartData = await generateSimpleChartData(newWeek)
                      
                          setWeeklyChartData(chartData)
                        } catch (error) {
                          console.error('trends 탭 주차 변경 시 차트 데이터 업데이트 실패:', error)
                        }
                      }}
                      className="border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                {weekOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.fullLabel}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 주간 상태별 출석 현황 */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              주간 출석 현황 (명 단위)
            </h3>
            

            
                          <WeeklyAttendanceChart data={weeklyChartData.length > 0 ? weeklyChartData : [
              { day: '월', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
              { day: '화', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
              { day: '수', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
              { day: '목', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true },
              { day: '금', 출근: 0, 지각: 0, 결근: 0, 기타: 0, noData: true }
            ]} />
          </div>
        </div>
      )}

      {/* 상세 탭 */}
      {selectedStatsTab === 'details' && (
        <div className="space-y-4 sm:space-y-6">
          {/* 기간 선택 */}
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm p-4">
            <div className="flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-800">
                  학생별 출석 현황
                </h3>
              </div>
              <div className="w-full sm:w-auto">
                <select
                  value={selectedWeek}
                  onChange={async (e) => {
                    const newWeek = e.target.value
                
                    setSelectedWeek(newWeek)
                    
                    // 즉시 새로운 주차의 데이터 로드
                    try {
                      const chartData = await generateSimpleChartData(newWeek)
                  
                      setWeeklyChartData(chartData)
                      
                      // 학생별 출석 데이터도 함께 로드
                      await generateStudentDetailData(newWeek)
                    } catch (error) {
                      console.error('주차 변경 시 데이터 업데이트 실패:', error)
                    }
                  }}
                  className="w-full sm:w-auto border border-gray-200 rounded-lg px-3 py-2 sm:px-4 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  {weekOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.fullLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 학생별 상세 현황 */}
          <StudentAttendanceGrid students={studentDetailData} />
        </div>
      )}
    </div>
  )

  const renderMembers = () => (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">구성원 관리</h2>
        <button 
          onClick={handleAddMembers}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>구성원 추가</span>
        </button>
      </div>
      
      {/* 현재 구성원 목록 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-md font-medium text-gray-700">현재 구성원 ({groupMembers.length}명)</h3>
        </div>
        
        {groupMembers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">아직 구성원이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupMembers.map((member) => (
              <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        member.role === 'student' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {member.role === 'student' ? '학생' : '교직원'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate">
                      {member.user_id} · {member.department}
                    </p>
                  </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="구성원 삭제"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // 구성원 추가 관련 함수들
  const handleAddMembers = () => {
    if (!groupId) return
    setShowAddMemberModal(true)
    loadAvailableUsers(groupId)
  }

  const loadAvailableUsers = async (groupId: string) => {
    setIsLoadingUsers(true)
    try {
      const users = await getAvailableUsers(groupId)
      setAvailableUsers(users)
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error)
      setErrors(['사용자 목록을 불러오는데 실패했습니다.'])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  const handleAddSelectedUsers = async () => {
    if (selectedUsers.length === 0 || !groupId) return
    
    try {
      setIsLoading(true)
      await addMultipleUsersToGroup(groupId, selectedUsers)
      
      // 모달 닫기 및 상태 초기화
      setShowAddMemberModal(false)
      setSelectedUsers([])
      setSearchQuery('')
      
      // 그룹 멤버 목록 새로고침
      const members = await getGroupMembers(groupId)
      setGroupMembers(members)
      
      setSuccessMessage('구성원이 추가되었습니다!')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('구성원 추가 실패:', error)
      setErrors(['구성원 추가에 실패했습니다.'])
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!groupId) return
    
    // 확인 대화상자
    if (!confirm(`${memberName}님을 그룹에서 제거하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return
    }
    
    try {
      setIsLoading(true)
      await removeUserFromGroup(groupId, userId)
      
      // 그룹 멤버 목록 새로고침
      const members = await getGroupMembers(groupId)
      setGroupMembers(members)
      
      setSuccessMessage(`${memberName}님이 그룹에서 제거되었습니다.`)
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (error) {
      console.error('구성원 제거 실패:', error)
      setErrors(['구성원 제거에 실패했습니다.'])
    } finally {
      setIsLoading(false)
    }
  }

  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleTimeChange = (field: 'checkin_deadline_hour' | 'checkout_start_hour', value: string) => {
    const numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0 || numValue > 23) return

    setSettings(prev => ({
      ...prev,
      [field]: numValue
    }))
    
    setErrors([])
    setSuccessMessage('')
  }

  const validateSettings = () => {
    const newErrors: string[] = []
    
    if (settings.checkin_deadline_hour >= settings.checkout_start_hour) {
      newErrors.push('출근 마감 시간은 퇴근 시작 시간보다 빨라야 합니다.')
    }
    
    if (settings.checkin_deadline_hour < 6 || settings.checkin_deadline_hour > 12) {
      newErrors.push('출근 마감 시간은 06:00~12:00 사이여야 합니다.')
    }
    
    if (settings.checkout_start_hour < 14 || settings.checkout_start_hour > 22) {
      newErrors.push('퇴근 시작 시간은 14:00~22:00 사이여야 합니다.')
    }
    
    return newErrors
  }

  const handleSave = async () => {
    if (!groupId) return

    setIsLoading(true)
    setErrors([])
    setSuccessMessage('')

    const validationErrors = validateSettings()
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setIsLoading(false)
      return
    }

    try {
      await upsertGroupWorkSettings(groupId, {
        checkin_deadline_hour: settings.checkin_deadline_hour,
        checkout_start_hour: settings.checkout_start_hour
      })

      setSuccessMessage('출퇴근 시간 설정이 저장되었습니다.')
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      setErrors(['설정 저장에 실패했습니다.'])
      console.error('설정 저장 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const renderSettings = () => (
    <div className="space-y-6">
      {/* 안내 카드 */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-blue-800 flex-1">
            <h3 className="font-semibold mb-3">출퇴근 시간 설정 안내</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span className="leading-relaxed">출근 마감 시간 전까지는 <strong>'출근'</strong>으로 처리됩니다</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span className="leading-relaxed">출근 마감 시간 이후는 <strong>'지각'</strong>으로 처리됩니다</span>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                <span className="leading-relaxed">퇴근 시작 시간 이후로는 <strong>'퇴근'</strong>으로 처리됩니다</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메시지 */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl">
          <div className="flex items-center gap-3">
            <CheckCircle size={20} />
            <span className="font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
            <span className="font-semibold">설정 오류</span>
          </div>
          <ul className="text-sm space-y-2 ml-8">
            {errors.map((error, index) => (
              <li key={index} className="flex items-start space-x-2">
                <div className="w-1 h-1 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                <span className="leading-relaxed break-words">{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 설정 카드 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
          <Clock className="w-6 h-6 mr-3 text-blue-600" />
          근무 시간 설정
        </h2>

        <div className="space-y-8">
          {/* 출근 마감 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              출근 마감 시간
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <select
                value={settings.checkin_deadline_hour}
                onChange={(e) => handleTimeChange('checkin_deadline_hour', e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium w-full sm:w-auto"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
              <div className="flex-1 bg-green-50 px-4 py-3 rounded-xl min-w-0">
                <span className="text-green-700 font-medium text-sm sm:text-base leading-relaxed break-words">
                  {formatHour(settings.checkin_deadline_hour)} 전까지는 정상 출근으로 처리됩니다
                </span>
              </div>
            </div>
          </div>

          {/* 퇴근 시작 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              퇴근 시작 시간
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <select
                value={settings.checkout_start_hour}
                onChange={(e) => handleTimeChange('checkout_start_hour', e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-medium w-full sm:w-auto"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {formatHour(i)}
                  </option>
                ))}
              </select>
              <div className="flex-1 bg-blue-50 px-4 py-3 rounded-xl min-w-0">
                <span className="text-blue-700 font-medium text-sm sm:text-base leading-relaxed break-words">
                  {formatHour(settings.checkout_start_hour)} 이후로는 퇴근으로 처리됩니다
                </span>
              </div>
            </div>
          </div>

          {/* 저장 버튼 */}
          <button
            onClick={handleSave}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-medium text-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                저장 중...
              </>
            ) : (
              <>
                <Save size={20} />
                설정 저장
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  // 일별 상세 모달 컴포넌트
  const DayDetailModal = () => {
    if (!showDayDetail || !selectedDay) return null
    
    const currentData = statsWeeklyData[selectedWeek as keyof typeof statsWeeklyData]
    const dayDetails = currentData.dayDetails?.[selectedDay] || []
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {selectedDay} 상세 정보
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {currentData.dateRange}
              </p>
            </div>
            <button
              onClick={() => setShowDayDetail(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          
          {/* 테이블 */}
          <div className="overflow-auto max-h-[calc(90vh-120px)]">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    소속
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    출근시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    퇴근시간
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    비고
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dayDetails.map((person: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {person.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.dept}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.checkin || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {person.checkout || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {person.note ? (
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          person.note.includes('지각') ? 'bg-yellow-100 text-yellow-800' :
                          person.note.includes('결근') ? 'bg-red-100 text-red-800' :
                          person.note.includes('휴가') ? 'bg-purple-100 text-purple-800' :
                          person.note.includes('조기퇴근') ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {person.note}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 푸터 */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>총 {dayDetails.length}명</span>
              <button
                onClick={() => setShowDayDetail(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (!currentGroup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">그룹을 찾을 수 없습니다.</p>
          <button 
            onClick={() => navigate('/group-management')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            그룹 관리로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/group-management')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">{currentGroup?.name || '그룹'}</h1>
                <p className="text-xs sm:text-sm text-gray-600">{groupMembers.length}명의 구성원</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-4 sm:space-x-8 overflow-x-auto">
            <button
              onClick={() => setSelectedTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              대시보드
            </button>
            <button
              onClick={() => setSelectedTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              통계
            </button>
            <button
              onClick={() => setSelectedTab('members')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              구성원
            </button>
            <button
              onClick={() => setSelectedTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                selectedTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              설정
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 에러 메시지 */}
        {errors.length > 0 && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <div>
                {errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-800">{error}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          </div>
        )}

        {selectedTab === 'dashboard' && renderDashboard()}
        {selectedTab === 'stats' && renderStats()}
        {selectedTab === 'members' && renderMembers()}
        {selectedTab === 'settings' && renderSettings()}
      </div>

      {/* 구성원 추가 모달 */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">구성원 추가</h2>
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedUsers([])
                    setSearchQuery('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 검색 입력 */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="이름, 학번, 학과로 검색..."
                  />
                </div>
              </div>

              {/* 선택된 사용자 수 */}
              {selectedUsers.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    {selectedUsers.length}명 선택됨
                  </p>
                </div>
              )}

              {/* 사용자 목록 */}
              <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                {isLoadingUsers ? (
                  <div className="p-6 text-center text-gray-500">
                    사용자 목록을 불러오는 중...
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    검색 결과가 없습니다.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <div key={user.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleUserSelection(user.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">{user.name}</p>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                user.role === 'student' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {user.role === 'student' ? '학생' : '교직원'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {user.user_id} · {user.department}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 버튼 */}
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddMemberModal(false)
                    setSelectedUsers([])
                    setSearchQuery('')
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base"
                >
                  취소
                </button>
                <button
                  onClick={handleAddSelectedUsers}
                  disabled={selectedUsers.length === 0 || isLoading}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                >
                  {isLoading ? '추가 중...' : selectedUsers.length > 0 ? `${selectedUsers.length}명 추가` : '추가'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 일별 상세 모달 */}
      <DayDetailModal />
    </div>
  )
}

export default GroupAttendancePage 