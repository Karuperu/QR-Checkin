import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  QrCode, Plane, Clock, Users, Calendar, BarChart3,
  Settings, Bell, LogOut, X, UserCheck, UserX, Lock
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  getFacultyGroups,
  getGroupTodayAttendance,
  getUserNotifications,
  getPendingVacationRequests,
  // updateVacationRequestStatus, // 사용하지 않음
  getFacultyGroupsOverallStats,
  getFacultyGroupsWeeklyTrends,
  getFacultyWeeklyDetailedStats,
  getUnreadNotificationCount,
  deleteNotification,
  supabase,
  utcToKSTDate
} from '../lib/supabase'

// 타입 정의
interface Group {
  id: string
  name: string
  start_date?: string
  end_date?: string
  status: string
}

interface Notification {
  id: string
  is_read: boolean
  title: string
  message: string
  created_at: string
}

interface VacationRequest {
  id: string
  start_date: string
  end_date: string
  reason: string
  status: string
  user_id: string
  group_id: string
  created_at: string
}

export default function FacultyAttendancePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [initialLoading, setInitialLoading] = useState(true)
  const [dataLoading, setDataLoading] = useState(false)
  const [_facultyGroups, setFacultyGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  // 교수용 알림 데이터
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotificationModal, setShowNotificationModal] = useState(false)

  // 오늘의 출석 현황
  const [_todayStats, setTodayStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    vacation: 0,
    attendanceRate: 0
  })

  // 대기 중인 휴가 신청
  const [_pendingVacations, setPendingVacations] = useState<VacationRequest[]>([])

  // 실시간 활동 (최근 출석 기록)
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  // 그룹별 통계 데이터
  const [groupStats, setGroupStats] = useState<any[]>([])
  
  // 주간 추이 데이터
  const [_weeklyTrends, setWeeklyTrends] = useState<any>({
    currentWeek: { label: '이번주', dateRange: '', groupStats: [] },
    lastWeek: { label: '지난주', dateRange: '', groupStats: [] },
    beforeWeek: { label: '지지난주', dateRange: '', groupStats: [] }
  })

  // 새로운 상세 주간 통계 (학생 페이지와 동일한 타입으로 수정)
  const [selectedWeek, setSelectedWeek] = useState('1')
  const [_weekOptions, setWeekOptions] = useState<Array<{value: string, label: string}>>([])
  const [_detailedWeekStats, setDetailedWeekStats] = useState<any>({
    weekNumber: 1,
    dateRange: '',
    groupsData: [],
    totalStats: { present: 0, late: 0, absent: 0, vacation: 0 }
  })

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  // const _unreadNotifications = notifications.filter(n => !n.is_read).length // 사용하지 않음

  // 인증 확인 및 데이터 로드
  useEffect(() => {
    if (!user) {
      setInitialLoading(false)
      navigate('/')
      return
    }
    
    if (user.role !== 'faculty') {
      setInitialLoading(false)
      navigate('/')
      return
    }
    
    // 교직원인 경우에만 데이터 로드
    loadData()
  }, [user, navigate])

  // 실시간 갱신 시스템
  useEffect(() => {
    if (!user || user.role !== 'faculty') return

    // 빠른 갱신 (15초마다) - 실시간 활동과 알림
    const fastInterval = setInterval(async () => {
      try {
        if (selectedGroup) {
          // 실시간 활동 갱신
          setDataLoading(true)
          await loadRecentActivity(selectedGroup.id)
          setDataLoading(false)
        }
        
        // 새로운 알림 확인
        await checkNewNotifications()
      } catch (error) {
        // 빠른 갱신 실패
        setDataLoading(false)
      }
    }, 15000) // 15초마다

    // 중간 갱신 (30초마다) - 오늘 통계와 휴가 신청
    const mediumInterval = setInterval(async () => {
      try {
        if (selectedGroup) {
          await loadTodayStats(selectedGroup.id)
          await loadPendingVacations(selectedGroup.id)
        }
      } catch (error) {
        // 중간 갱신 실패
      }
    }, 30000) // 30초마다

    // 느린 갱신 (60초마다) - 전체 통계
    const slowInterval = setInterval(async () => {
      try {
        await loadGroupStats()
        await loadWeeklyTrends()
        await loadDetailedWeekStats(parseInt(selectedWeek))
      } catch (error) {
        // 느린 갱신 실패
      }
    }, 60000) // 60초마다

    return () => {
      clearInterval(fastInterval)
      clearInterval(mediumInterval)
      clearInterval(slowInterval)
    }
  }, [user, selectedGroup, selectedWeek])

  const loadData = async () => {
    if (!user) {
      setInitialLoading(false)
      return
    }

    try {
      setInitialLoading(true)
      setDataLoading(true)

      // 교수가 관리하는 그룹 조회
      const groups = await getFacultyGroups(user.id)
      setFacultyGroups(groups)
      
      if (groups.length > 0) {
        const firstGroup = groups[0]
        setSelectedGroup(firstGroup)
        
        // 첫 번째 그룹의 오늘 출석 현황 조회
        await loadTodayStats(firstGroup.id)
        
        // 대기 중인 휴가 신청 조회
        await loadPendingVacations(firstGroup.id)
        
        // 최근 활동 조회
        await loadRecentActivity(firstGroup.id)
      }

      // 그룹별 통계 조회
      await loadGroupStats()
      
      // 주간 추이 조회
      await loadWeeklyTrends()
      
      // 상세 주간 통계 초기화
      await loadWeekOptions()

      // 알림 조회
      const userNotifications = await getUserNotifications(user.id)
      setNotifications(userNotifications)
      
      // 읽지 않은 알림 개수 로드
      const unreadCount = await getUnreadNotificationCount(user.id)
      setUnreadNotificationCount(unreadCount)

    } catch (error) {
      console.error('데이터 로드 실패:', error)
      // 데이터 로드 실패 시에도 로딩 상태 해제
    } finally {
      setInitialLoading(false)
      setDataLoading(false)
    }
  }

  const loadTodayStats = async (groupId: string) => {
    try {
      const stats = await getGroupTodayAttendance(groupId)
      // 부드러운 업데이트를 위해 이전 데이터와 비교
      setTodayStats(prevStats => {
        // 데이터가 실제로 변경되었을 때만 업데이트
        if (JSON.stringify(prevStats) !== JSON.stringify(stats)) {
          return stats
        }
        return prevStats
      })
    } catch (error) {
      // 출석 통계 로드 실패
    }
  }

  const loadPendingVacations = async (groupId: string) => {
    try {
      const vacations = await getPendingVacationRequests(groupId)
      setPendingVacations(vacations)
    } catch (error) {
      // 휴가 신청 로드 실패
    }
  }

  const loadRecentActivity = async (groupId: string) => {
    try {
      // 최근 1시간 내의 활동만 조회 (실시간 갱신용)
      const oneHourAgo = new Date()
      oneHourAgo.setHours(oneHourAgo.getHours() - 1)

      const { data: recentLogs, error } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          users!attendance_logs_user_id_fkey(name, department)
        `)
        .eq('group_id', groupId)
        .gte('scan_time', oneHourAgo.toISOString())
        .order('scan_time', { ascending: false })
        .limit(5)

      if (error) {
        return
      }

      // 최근 1시간 내의 휴가 신청도 조회
      const { data: recentVacations, error: vacationError } = await supabase
        .from('vacation_requests')
        .select(`
          *,
          users!vacation_requests_user_id_fkey(name, department)
        `)
        .eq('group_id', groupId)
        .gte('created_at', oneHourAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(3)

      if (vacationError) {
        // 휴가 신청 조회 실패
      }

      // 출석 기록과 휴가 신청을 합쳐서 시간순으로 정렬
      const allActivities = [
        ...(recentLogs || []).map(log => ({
          ...log,
          type: 'attendance',
          displayTime: utcToKSTDate(log.scan_time)
        })),
        ...(recentVacations || []).map(vacation => ({
          ...vacation,
          type: 'vacation',
          displayTime: utcToKSTDate(vacation.created_at)
        }))
      ].sort((a, b) => b.displayTime.getTime() - a.displayTime.getTime())
      .slice(0, 8) // 실시간 갱신용으로 더 적은 수

      // 부드러운 업데이트를 위해 이전 데이터와 비교
      setRecentActivity(prevActivities => {
        // 데이터가 실제로 변경되었을 때만 업데이트
        if (JSON.stringify(prevActivities) !== JSON.stringify(allActivities)) {
          return allActivities
        }
        return prevActivities
      })
    } catch (error) {
      // 최근 활동 로드 실패
    }
  }

  const loadGroupStats = async () => {
    if (!user) return
    try {
      const stats = await getFacultyGroupsOverallStats(user.id)
      setGroupStats(stats)
    } catch (error) {
      // 그룹 통계 로드 실패
    }
  }

  const loadWeeklyTrends = async () => {
    if (!user) return
    try {
      const trends = await getFacultyGroupsWeeklyTrends(user.id)
      setWeeklyTrends(trends)
    } catch (error) {
      // 주간 추이 로드 실패
    }
  }

  const loadWeekOptions = async () => {
    if (!user) {
      return
    }
    
    try {
      // 교직원이 관리하는 그룹들을 조회
      const { data: groups, error } = await supabase
        .from('groups')
        .select('id, name, start_date')
        .eq('faculty_id', user.id)
        .order('start_date', { ascending: false })

      if (error) {
        return
      }

      if (!groups || groups.length === 0) {
        return
      }

      // 가장 최근 그룹의 시작일을 기준으로 주차 계산
      const firstGroup = groups[0]
      if (!firstGroup.start_date) {
        return
      }

      const groupStartDate = new Date(firstGroup.start_date)
      const today = new Date()
      
      // 그룹 시작일부터 현재까지의 주차 수 계산 (최대 8주)
      const weeksSinceStart = Math.ceil((today.getTime() - groupStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      const totalWeeks = Math.min(Math.max(1, weeksSinceStart), 8)
      
      const options = []
      for (let i = 1; i <= totalWeeks; i++) {
        let weekStartDate: Date
        let weekEndDate: Date
        
        if (i === 1) {
          // 첫 주차: 그룹 시작일부터
          weekStartDate = new Date(groupStartDate)
          const startDay = weekStartDate.getDay() // 0=일요일, 1=월요일, 2=화요일, ...
          const daysToFriday = startDay <= 5 ? 5 - startDay : 5 + (7 - startDay)
          weekEndDate = new Date(weekStartDate.getTime() + daysToFriday * 24 * 60 * 60 * 1000)
        } else {
          // 이후 주차: 1주차가 포함된 주의 월요일 기준으로 계산
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
          
          // i주차의 월요일 계산
          weekStartDate = new Date(firstWeekMonday.getTime() + ((i - 1) * 7 * 24 * 60 * 60 * 1000))
          weekEndDate = new Date(weekStartDate.getTime() + (4 * 24 * 60 * 60 * 1000)) // 금요일
        }
        
        const startDateStr = weekStartDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
        const endDateStr = weekEndDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
        
        options.push({
          value: i.toString(),
          label: `${i}주차 (${startDateStr} ~ ${endDateStr})`
        })
      }

      setWeekOptions(options)
      setSelectedWeek('1') // 기본값: 1주차 (문자열)
      
      await loadDetailedWeekStats(1) // 1주차 데이터 로드
      
    } catch (error) {
      // 주차 옵션 로드 실패
    }
  }

  const loadDetailedWeekStats = async (weekNumber: number) => {
    if (!user) {
      return
    }
    
    try {
      const stats = await getFacultyWeeklyDetailedStats(user.id, weekNumber)
      setDetailedWeekStats(stats)
    } catch (error) {
      // 상세 주간 통계 로드 실패
    }
  }

  // const _getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'present': return 'bg-green-100 text-green-800'
  //     case 'late': return 'bg-yellow-100 text-yellow-600'
  //     case 'absent': return 'bg-red-100 text-red-800'
  //     case 'vacation': return 'bg-purple-100 text-purple-800'
  //     default: return 'bg-gray-100 text-gray-800'
  //   }
  // }

  // const _getStatusLabel = (status: string) => {
  //   switch (status) {
  //     case 'present': return '출근'
  //     case 'late': return '지각'
  //     case 'absent': return '결근'
  //     case 'vacation': return '휴가'
  //     default: return '-'
  //   }
  // }

  const CircularProgress = ({ percentage, size = 100 }: { percentage: number, size?: number }) => {
    const safePercentage = isNaN(percentage) ? 0 : percentage
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference
    // const _strokeDashoffset = circumference - (safePercentage / 100) * circumference // 사용하지 않음
    
    // 정확한 계산
    const actualPercentage = safePercentage
    const actualStrokeDashoffset = circumference - (actualPercentage / 100) * circumference

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#059669"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={actualStrokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-green-600">{Math.round(safePercentage)}%</span>
        </div>
      </div>
    )
  }

  const markNotificationAsRead = async (id: string) => {
    try {
      await deleteNotification(id)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      // 읽지 않은 알림 개수 업데이트
      setUnreadNotificationCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      // 알림 읽음 처리 실패
    }
  }

  // 새로운 알림 확인 함수
  const checkNewNotifications = async () => {
    if (!user) return
    
    try {
      const currentUnreadCount = await getUnreadNotificationCount(user.id)
      
      // 새로운 알림이 있는지 확인
      if (currentUnreadCount > unreadNotificationCount) {
        // 새로운 알림이 있으면 알림 목록도 새로고침
        const userNotifications = await getUserNotifications(user.id)
        setNotifications(userNotifications)
        
        // 알림 개수 업데이트
        setUnreadNotificationCount(currentUnreadCount)
      } else {
        // 알림 개수만 업데이트
        setUnreadNotificationCount(currentUnreadCount)
      }
    } catch (error) {
      // 알림 확인 실패
    }
  }

  // 스켈레톤 로딩 컴포넌트
  const SkeletonCard = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded mb-4"></div>
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 rounded"></div>
        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  )

  // 데이터 로딩 중일 때 스켈레톤 표시
  const renderWithSkeleton = (content: React.ReactNode) => (
    <div className="relative transition-opacity duration-300">
      {dataLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
      <div className={dataLoading ? 'opacity-50' : 'opacity-100'}>
        {content}
      </div>
    </div>
  )

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const success = await deleteNotification(notificationId)
      if (success) {
        // 알림 목록에서 삭제된 알림 제거
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        
        // 읽지 않은 알림 개수 업데이트
        if (user) {
          const unreadCount = await getUnreadNotificationCount(user.id)
          setUnreadNotificationCount(unreadCount)
        }
      } else {
        // 알림 삭제 실패
      }
    } catch (error) {
      // 알림 삭제 중 오류
    }
  }

  // const _handleVacationApproval = async (requestId: string, status: 'approved' | 'rejected', comment?: string) => {
  //   if (!user) return

  //   try {
  //     await updateVacationRequestStatus(requestId, status, user.id, comment)
      
  //     // 대기 중인 휴가 신청 목록 새로고침
  //     if (selectedGroup) {
  //       await loadPendingVacations(selectedGroup.id)
  //     }
  //   } catch (error) {
  //     // 휴가 신청 처리 실패
  //   }
  // }

  // const _handleVacationAction = (_id: string, _action: 'approve' | 'reject') => {
  //   alert(`휴가 신청을 ${_action === 'approve' ? '승인' : '거절'}했습니다.`)
  // }

  // const _handleWeekChange = async (weekValue: string) => {
  //   const weekNumber = parseInt(weekValue)
  //   setSelectedWeek(weekValue) // 문자열로 저장
  //   await loadDetailedWeekStats(weekNumber) // 숫자로 함수 호출
  // }



  // 초기 로딩 중이거나 사용자가 없는 경우
  if (initialLoading || !user || user.role !== 'faculty') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!user ? '로그인 중...' : user.role !== 'faculty' ? '권한 확인 중...' : '데이터를 불러오는 중...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">출석 관리</h1>
            <p className="text-sm text-gray-600">{user?.name || '교수님'} • {user?.department || '소속없음'}</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* 알림 버튼 */}
            <button 
              onClick={() => setShowNotificationModal(true)}
              className="relative p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <Bell size={20} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {/* 설정 버튼 */}
            <button 
              onClick={() => navigate('/work-time-settings')}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              title="출퇴근 시간 설정"
            >
              <Settings size={20} />
            </button>

            <button 
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="p-2 text-gray-600 hover:text-red-600 rounded-lg"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-4">
        {/* 대시보드 탭 */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 오늘 출석 요약 카드 */}
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 text-gray-900">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                오늘 현황
              </h2>
              
              <div className="flex items-center justify-between mb-4">
                <div className="grid grid-cols-4 gap-4 flex-1">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {groupStats.reduce((sum, group) => sum + group.presentCount, 0)}
                    </div>
                    <div className="text-xs opacity-80">출석</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {groupStats.reduce((sum, group) => sum + group.lateCount, 0)}
                    </div>
                    <div className="text-xs opacity-80">지각</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {groupStats.reduce((sum, group) => sum + group.absentCount, 0)}
                    </div>
                    <div className="text-xs opacity-80">결근</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {groupStats.reduce((sum, group) => sum + group.vacationCount, 0)}
                    </div>
                    <div className="text-xs opacity-80">휴가</div>
                  </div>
                </div>
                <CircularProgress percentage={
                  groupStats.length > 0 
                    ? Math.round((groupStats.reduce((sum, group) => sum + (group.attendanceRate * group.totalStudents), 0) / 
                        groupStats.reduce((sum, group) => sum + group.totalStudents, 0)) * 10) / 10
                    : 0
                } />
              </div>

              <div className="mb-2 text-sm text-gray-600 flex justify-between">
                <span>전체: {groupStats.reduce((sum, group) => sum + group.totalStudents, 0)}명 (관리 그룹: {groupStats.length}개)</span>
                <span className="text-green-600 font-medium">
                  실시간 출석률: {groupStats.length > 0 
                    ? Math.round((groupStats.reduce((sum, group) => sum + (group.attendanceRate * group.totalStudents), 0) / 
                        groupStats.reduce((sum, group) => sum + group.totalStudents, 0)) * 10) / 10
                    : 0}%
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all" 
                  style={{ 
                    width: `${groupStats.length > 0 
                      ? Math.round((groupStats.reduce((sum, group) => sum + (group.attendanceRate * group.totalStudents), 0) / 
                          groupStats.reduce((sum, group) => sum + group.totalStudents, 0)) * 10) / 10
                      : 0}%` 
                  }}
                ></div>
              </div>
            </div>

            {/* 빠른 액션 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">빠른 액션</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => navigate('/group-management')}
                  className="flex flex-col items-center p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors border-2 border-blue-200"
                >
                  <BarChart3 className="w-8 h-8 text-blue-600 mb-2" />
                  <span className="text-sm font-medium text-blue-900">그룹 관리</span>
                </button>
                <button
                  onClick={() => navigate('/qr_generator')}
                  className="flex flex-col items-center p-4 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors border-2 border-green-200"
                >
                  <QrCode className="w-8 h-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-900">QR 생성</span>
                </button>
                <button
                  onClick={() => navigate('/faculty-vacation-approval')}
                  className="flex flex-col items-center p-4 bg-purple-50 rounded-2xl hover:bg-purple-100 transition-colors border-2 border-purple-200"
                >
                  <Calendar className="w-8 h-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-900">휴가 관리</span>
                </button>
                <button
                  onClick={() => navigate('/work-time-settings')}
                  className="flex flex-col items-center p-4 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-colors border-2 border-orange-200"
                >
                  <Settings className="w-8 h-8 text-orange-600 mb-2" />
                  <span className="text-sm font-medium text-orange-900">근무시간</span>
                </button>
              </div>
              
              {/* 테스트 버튼들 */}

            </div>



            {/* 실시간 활동 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                실시간 활동
              </h3>
              
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>오늘 활동이 없습니다</p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => {
                    const activityTime = activity.displayTime || utcToKSTDate(activity.scan_time || activity.created_at)
                    const timeString = activityTime.toLocaleTimeString('ko-KR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })
                    
                    return (
                      <div key={`${activity.type}-${activity.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            activity.type === 'vacation' 
                              ? 'bg-purple-100'
                              : activity.scan_type === 'checkin' 
                                ? 'bg-green-100' 
                                : 'bg-blue-100'
                          }`}>
                            {activity.type === 'vacation' ? (
                              <Plane className="w-4 h-4 text-purple-600" />
                            ) : activity.scan_type === 'checkin' ? (
                              <UserCheck className={`w-4 h-4 ${
                                activity.status === 'late' ? 'text-yellow-600' : 'text-green-600'
                              }`} />
                            ) : (
                              <UserX className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.users?.name || '알 수 없음'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {activity.type === 'vacation' 
                                ? `휴가 신청 (${activity.vacation_type === 'annual' ? '연차' : activity.vacation_type === 'sick' ? '병가' : '개인사정'})`
                                : `${activity.scan_type === 'checkin' ? '출근' : '퇴근'}`
                              }
                              {activity.type === 'attendance' && activity.status === 'late' && ' (지각)'}
                            </p>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {timeString}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>




          </div>
        )}


      </div>

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg ${
              activeTab === 'dashboard' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <BarChart3 size={20} />
            <span className="text-xs mt-1">대시보드</span>
          </button>

          <button
            onClick={() => navigate('/group-management')}
            className="flex flex-col items-center py-2 px-3 rounded-lg text-gray-600 hover:text-blue-600"
          >
            <Users size={20} />
            <span className="text-xs mt-1">그룹</span>
          </button>

          <button
            onClick={() => navigate('/qr_generator')}
            className="flex flex-col items-center py-2 px-3 rounded-lg text-gray-600 hover:text-blue-600"
          >
            <QrCode size={20} />
            <span className="text-xs mt-1">QR관리</span>
          </button>

          <button
            onClick={() => navigate('/password-change')}
            className="flex flex-col items-center py-2 px-3 rounded-lg text-gray-600 hover:text-blue-600"
          >
            <Settings size={20} />
            <span className="text-xs mt-1">비밀번호</span>
          </button>
        </div>
      </div>

      {/* 알림 모달 */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md flex flex-col max-h-[80vh]">
            {/* 헤더 - 항상 고정 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-800">알림</h2>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* 알림 내용 - 스크롤 가능 */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>알림이 없습니다</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-2xl transition-colors ${
                        notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-medium text-gray-900">{notification.title}</h3>
                            <span className="text-xs text-gray-500">{utcToKSTDate(notification.created_at).toLocaleDateString('ko-KR')}</span>
                          </div>
                          <p className="text-sm text-gray-600">{notification.message}</p>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          )}
                        </div>
                        {/* 알림 삭제 버튼 */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNotification(notification.id)
                          }}
                          className="p-1 hover:bg-red-100 rounded text-red-500 hover:text-red-700 transition-colors"
                          title="알림 삭제"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      {/* 알림 읽음 처리 버튼 */}
                      {!notification.is_read && (
                        <button
                          onClick={() => markNotificationAsRead(notification.id)}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          읽음 처리
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 하단 버튼들 - 항상 고정 */}
            <div className="p-6 border-t border-gray-200 space-y-3 flex-shrink-0">
              <button
                onClick={() => {
                  setShowNotificationModal(false)
                  navigate('/vacation')
                }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <Plane size={20} />
                <span>휴가 관리</span>
              </button>
              
              <button
                onClick={() => {
                  setShowNotificationModal(false)
                  navigate('/stats')
                }}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 flex items-center justify-center space-x-2"
              >
                <BarChart3 size={20} />
                <span>상세 통계</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 