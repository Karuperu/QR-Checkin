import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock, Calendar, User as UserIcon, LogOut,
  CheckCircle, AlertCircle, X, QrCode, MapPin,
  Home, Settings, Bell, Plane, Plus, Zap,
  ArrowLeft, User, PieChart, TrendingUp, Lock
} from 'lucide-react'
import QRScanner from '../components/QRScanner'
import { useAuth } from '../contexts/AuthContext'
import { 
  getTodayAttendanceStatus, 
  getUserNotifications,
  markNotificationAsRead as markNotificationRead,
  saveAttendanceRecord,
  getUserGroups,
  getWeeklyAttendanceStats,
  getStudentAttendanceRate,
  getStudentWeeklyAttendance,
  getGroupTodayAttendance,
  getKSTNow,
  getKSTTodayStart,
  getKSTTodayEnd,
  getKSTTodayDateString,
  utcToKSTDate,
  supabase,
  getUnreadNotificationCount,
  deleteNotification
} from '../lib/supabase'
import type { Group, AttendanceLog, Notification } from '../types'

export default function StudentAttendancePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('home')
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState('1')
  const [statsTab, setStatsTab] = useState<'overview' | 'trends'>('overview')
  const [loading, setLoading] = useState(true)
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmData, setConfirmData] = useState<{
    type: 'checkin' | 'checkout'
    locationData: any
  } | null>(null)

  // 학생용 알림 데이터
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotificationModal, setShowNotificationModal] = useState(false)
  


  const statusColors = {
    출근: '#16a34a',
    지각: '#facc15', 
    조기퇴근: '#f97316',
    퇴근: '#2563eb',
    휴가: '#9333ea',
    결근: '#dc2626'
  }
  
  // 오늘 출퇴근 상태
  const [todayStatus, setTodayStatus] = useState({
    checkin: null as string | null,
    checkout: null as string | null,
    status: '미출근' as '출근' | '퇴근' | '미출근',
    workingHours: ''
  })

  // 최근 기록 데이터
  const [recentRecords, setRecentRecords] = useState<AttendanceLog[]>([])
  const [weeklyStats, setWeeklyStats] = useState({ 
    attendanceRate: 0,
    totalDays: 0,
    presentDays: 0,
    lateDays: 0,
    vacationDays: 0,
    possibleDays: 0,
    weeklyData: [] as Array<{
      day: string;
      status: string;
      present: number;
      late: number;
      absent: number;
    }>
  })

  // 그룹 전체 출석률
  const [groupAttendanceStats, setGroupAttendanceStats] = useState({
    totalMembers: 0,
    presentToday: 0,
    lateToday: 0,
    absentToday: 0,
    vacationToday: 0,
    overallRate: 0
  })

  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const unreadNotifications = notifications.filter(n => !n.is_read).length

  // 인증되지 않은 사용자는 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
  }, [user, navigate])

  // 데이터 로드
  useEffect(() => {
    if (!user) return
    
    loadData()
    
    // 실시간 업데이트를 위한 인터벌 설정
    const interval = setInterval(() => {
      if (selectedGroup) {
        loadTodayAttendance(selectedGroup.id)
        loadGroupAttendanceStats(selectedGroup.id)
        // 알림 개수도 새로고침
        getUnreadNotificationCount(user.id).then(count => {
          setUnreadNotificationCount(count)
        })
      }
    }, 15000) // 15초마다 새로고침
    
    return () => clearInterval(interval)
  }, [user])

  // 페이지 포커스 시 데이터 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (user && selectedGroup) {
        loadTodayAttendance(selectedGroup.id)
        loadGroupAttendanceStats(selectedGroup.id)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user, selectedGroup])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // 사용자 그룹 조회
      const groups = await getUserGroups(user.id)
      setUserGroups(groups)
      
      if (groups.length > 0) {
        const firstGroup = groups[0]
        setSelectedGroup(firstGroup)
        
        // 오늘 출석 상태 조회
        await loadTodayAttendance(firstGroup.id)
        
        // 주차 옵션 로드
    
        await loadWeekOptions()
        
        // 주간 통계 조회 (1주차부터 시작)
        await loadWeeklyStats(firstGroup.id, 0)
        
        // 그룹 전체 출석률 조회
        await loadGroupAttendanceStats(firstGroup.id)
      }

      // 알림 조회
              const userNotifications = await getUserNotifications(user.id)
      setNotifications(userNotifications)
      
      // 읽지 않은 알림 개수 로드
      const unreadCount = await getUnreadNotificationCount(user.id)
      setUnreadNotificationCount(unreadCount)

    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTodayAttendance = async (groupId: string) => {
    if (!user) return

    try {
      // 오늘 날짜 정보 출력
      const now = getKSTNow()
      const todayDateStr = getKSTTodayDateString()
      
      
      
      
        const attendanceRecords = await getTodayAttendanceStatus(user.id, groupId)

        
        // 각 기록의 날짜를 확인

      
      if (attendanceRecords.length > 0) {
        const checkinRecord = attendanceRecords.find(r => r.scan_type === 'checkin')
        const checkoutRecord = attendanceRecords.find(r => r.scan_type === 'checkout')
        
        setTodayStatus({
          checkin: checkinRecord ? (() => {
            // UTC 시간을 로컬 시간으로 변환하여 표시
            const localTime = utcToKSTDate(checkinRecord.scan_time)
            const hour = localTime.getHours()
            const minute = localTime.getMinutes()
            

            
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          })() : null,
          checkout: checkoutRecord ? (() => {
            // UTC 시간을 로컬 시간으로 변환하여 표시
            const localTime = utcToKSTDate(checkoutRecord.scan_time)
            const hour = localTime.getHours()
            const minute = localTime.getMinutes()
            

            
            return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          })() : null,
          status: checkoutRecord ? '퇴근' : checkinRecord ? '출근' : '미출근',
          workingHours: checkinRecord && checkoutRecord ? calculateWorkingHours(checkinRecord.scan_time, checkoutRecord.scan_time) : ''
        })
      } else {
        // 오늘 데이터가 없으면 초기화
        setTodayStatus({
          checkin: null,
          checkout: null,
          status: '미출근',
          workingHours: ''
        })
      }
      
      setRecentRecords(attendanceRecords)
    } catch (error) {
      // 출석 데이터 로드 실패
    }
  }

  const loadWeeklyStats = async (groupId: string, weekOffset: number = 0) => {
    if (!user) return
    
    try {
      // 학생별 개인 출석률 계산 (그룹 시작일 기준)
      const attendanceData = await getStudentAttendanceRate(user.id, groupId, 30)
      
      // 주간 출석 상세 데이터
      const weeklyData = await getStudentWeeklyAttendance(user.id, groupId, weekOffset)
      
      setWeeklyStats({ 
        attendanceRate: attendanceData.attendanceRate,
        totalDays: attendanceData.totalDays,
        presentDays: attendanceData.presentDays,
        lateDays: attendanceData.lateDays,
        vacationDays: attendanceData.vacationDays,
        possibleDays: attendanceData.possibleDays,
        weeklyData: weeklyData
      })
    } catch (error) {
      // 주간 통계 로드 실패
    }
  }



  const loadGroupAttendanceStats = async (groupId: string) => {
    try {
      // 그룹 전체 출석률 조회
      const groupStats = await getGroupTodayAttendance(groupId)
      
      setGroupAttendanceStats({
        totalMembers: groupStats.total,
        presentToday: groupStats.present,
        lateToday: groupStats.late,
        absentToday: groupStats.absent,
        vacationToday: groupStats.vacation,
        overallRate: groupStats.attendanceRate
      })
    } catch (error) {
      console.error('그룹 출석률 로드 실패:', error)
    }
  }

  // 실제 출석 기록 기준으로 주차 계산 (날짜 포함)
  const [weekOptions, setWeekOptions] = useState<Array<{value: string, label: string}>>([])

  // weekOptions 상태 변경 감지
  useEffect(() => {

  }, [weekOptions])

  // selectedGroup이 변경될 때 주차 옵션 다시 로드
  useEffect(() => {
    if (selectedGroup && user) {
  
      loadWeekOptions()
    }
  }, [selectedGroup, user])

  // 홈 탭으로 돌아올 때 오늘 데이터 새로고침
  useEffect(() => {
    if (activeTab === 'home' && selectedGroup && user) {
  
      loadTodayAttendance(selectedGroup.id)
      loadGroupAttendanceStats(selectedGroup.id)
    }
  }, [activeTab, selectedGroup, user])

  // 기록 탭의 추이 서브탭으로 전환될 때 최신 주차 데이터 로드
  useEffect(() => {
    if (activeTab === 'records' && statsTab === 'trends' && selectedGroup && user && weekOptions.length > 0) {
  
      // 이미 최신 주차가 선택되어 있으면 데이터 로드
      if (weekOptions.length > 0) {
        const latestWeek = weekOptions[0]
        if (selectedWeek === latestWeek.value) {
          const weekOffset = parseInt(latestWeek.value) - 1
          loadWeeklyStats(selectedGroup.id, weekOffset)
      
        }
      }
    }
  }, [activeTab, statsTab, selectedGroup, user, weekOptions])

  const loadWeekOptions = async () => {
    if (!user || !selectedGroup) {
  
      return
    }
    
    try {
  
      
      // 그룹 시작일 기준으로 주차 계산
      if (!selectedGroup.start_date) {
        console.error('그룹 시작일이 없습니다')
        return
      }

      const groupStartDate = new Date(selectedGroup.start_date)
      const today = getKSTNow()
      
      // 그룹 시작일부터 현재까지의 주차 수 계산
      const weeksSinceStart = Math.ceil((today.getTime() - groupStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
      const totalWeeks = Math.max(1, weeksSinceStart)
      
      const options = []
      for (let i = 1; i <= totalWeeks; i++) {
        const weekStartDate = new Date(groupStartDate.getTime() + ((i - 1) * 7 * 24 * 60 * 60 * 1000))
        
        // 첫 주차는 그룹 시작일부터, 이후 주차는 월요일부터
        let weekEndDate
        if (i === 1) {
          // 첫 주차: 그룹 시작일부터 금요일까지
          const startDay = weekStartDate.getDay() // 0=일요일, 1=월요일, 2=화요일, ...
          const daysToFriday = startDay <= 5 ? 5 - startDay : 5 + (7 - startDay) // 금요일까지의 일수
          weekEndDate = new Date(weekStartDate.getTime() + daysToFriday * 24 * 60 * 60 * 1000)
        } else {
          // 이후 주차: 해당 주의 월요일부터 금요일까지
          const mondayOffset = weekStartDate.getDay() === 0 ? 6 : weekStartDate.getDay() - 1 // 일요일이면 6, 아니면 getDay()-1
          const mondayStart = new Date(weekStartDate.getTime() - (mondayOffset * 24 * 60 * 60 * 1000))
          weekEndDate = new Date(mondayStart.getTime() + 4 * 24 * 60 * 60 * 1000) // 월요일부터 4일 후 = 금요일
        }
        
        const startDateStr = weekStartDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
        const endDateStr = weekEndDate.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
        
        options.push({
          value: i.toString(),
          label: `${i}주차 (${startDateStr} ~ ${endDateStr})`,
          startDate: weekStartDate,
          endDate: weekEndDate
        })
      }

      // 최신 주차가 위로 오도록 역순으로 정렬
      const sortedOptions = options.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  
      setWeekOptions(sortedOptions)
      
      // 기본값을 최신 주차로 설정하고 데이터 로드
      if (sortedOptions.length > 0) {
        const latestWeek = sortedOptions[0]
        const latestWeekNumber = parseInt(latestWeek.value)
        
        // 최신 주차로 설정
        setSelectedWeek(latestWeek.value)
    
        
        // 최신 주차 데이터 바로 로드
        const weekOffset = latestWeekNumber - 1
        await loadWeeklyStats(selectedGroup.id, weekOffset)
    
      }
      
  
    } catch (error) {
      // 주차 옵션 로드 실패
    }
  }

  const calculateWorkingHours = (checkinTime: string, checkoutTime: string): string => {
    // UTC 시간을 로컬 시간으로 변환하여 계산
    const checkin = utcToKSTDate(checkinTime)
    const checkout = utcToKSTDate(checkoutTime)
    const diffMs = checkout.getTime() - checkin.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    return `${diffHours}시간 ${diffMinutes}분`
  }

  const handleQRScan = (qrData: string) => {


    if (!user || !selectedGroup) {
      setScanResult('그룹이 선택되지 않았습니다')
      return
    }

    try {
      // QR 데이터 파싱
      const locationData = JSON.parse(qrData)
      
      // 유효성 검사
      if (!locationData.type || locationData.type !== 'location' || !locationData.id || !locationData.name) {
        setScanResult('잘못된 QR 코드입니다')
        return
      }

  

      // 팝업 표시
      const scanType = todayStatus.checkin ? 'checkout' : 'checkin'
  
      
      setConfirmData({
        type: scanType,
        locationData: locationData
      })
      setShowConfirmModal(true)
      
  
      
    } catch (error) {
      console.error('QR 스캔 처리 실패:', error)
      setScanResult('QR 코드 처리에 실패했습니다')
    }
  }

  const handleQRScanError = (message: string) => {
    setScanResult(message)
  }

  const handleQRScannerClose = () => {
    setShowQRScanner(false)
  }



  const handleConfirmAttendance = async () => {
    if (!user || !selectedGroup || !confirmData) return

    try {
      // QR 코드에서 가져온 위치 정보 사용
      const locationData = confirmData.locationData
      const latitude = locationData.latitude ? parseFloat(locationData.latitude) : undefined
      const longitude = locationData.longitude ? parseFloat(locationData.longitude) : undefined
      
      // 출근/퇴근 처리
      const result = await saveAttendanceRecord(
        user.id,
        selectedGroup.id,
        confirmData.type,
        latitude,
        longitude
      )
      
      setScanResult(`${result.scan_type === 'checkin' ? '출근' : '퇴근'} 처리 완료`)
      
      // 오늘 출석 상태 새로고침
      await loadTodayAttendance(selectedGroup.id)
      
      // 팝업 닫기
      setShowConfirmModal(false)
      setConfirmData(null)
      
    } catch (error) {
      setScanResult('처리 중 오류가 발생했습니다')
      console.error('출근/퇴근 처리 실패:', error)
      setShowConfirmModal(false)
      setConfirmData(null)
    }
  }

  const handleCancelAttendance = () => {
    setShowConfirmModal(false)
    setConfirmData(null)
    setScanResult('취소되었습니다')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '정상': return 'bg-green-100 text-green-800'
      case '지각': return 'bg-yellow-100 text-yellow-800'
      case '휴가': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const markNotificationAsRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      )
      // 읽지 않은 알림 개수 업데이트
      setUnreadNotificationCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('알림 읽음 처리 실패:', error)
    }
  }

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
        console.error('알림 삭제 실패')
      }
    } catch (error) {
      console.error('알림 삭제 중 오류:', error)
    }
  }



  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'vacation_approved': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'late_warning': return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'checkin_success': return <CheckCircle className="w-5 h-5 text-blue-600" />
      default: return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const CircularProgress = ({ percentage, size = 80 }: { percentage: number, size?: number }) => {
    const radius = (size - 8) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = `${percentage / 100 * circumference} ${circumference}`

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={8}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#3b82f6"
            strokeWidth={8}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-800">{percentage}%</span>
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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">QR 출퇴근</h1>
            <p className="text-sm text-gray-600">{user?.name || '사용자'} • {user?.department || '소속없음'}</p>
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

            {/* 휴가신청 버튼 */}
            <button 
              onClick={() => navigate('/vacation')}
              className="p-2 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50"
              title="휴가 신청"
            >
              <Plane size={20} />
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
        {/* 홈 탭 */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* 오늘 상태 카드 */}
            <div className="bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl shadow-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-800">
                <Home className="w-5 h-5 mr-2 text-blue-600" />
                오늘
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-3xl font-bold mb-1 text-gray-800">
                    {todayStatus.checkin || '--:--'}
                  </div>
                  <div className="text-sm text-gray-600">출근</div>
                </div>
                <div className="text-center bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-3xl font-bold mb-1 text-gray-800">
                    {todayStatus.checkout || '--:--'}
                  </div>
                  <div className="text-sm text-gray-600">퇴근</div>
                </div>
              </div>

              <div className="text-center">
                <span className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${
                  todayStatus.status === '출근' 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                }`}>
                  ✨ {todayStatus.status}
                </span>
                {todayStatus.status === '출근' && (
                  <p className="text-sm text-gray-600 mt-2">{todayStatus.workingHours}</p>
                )}
              </div>
            </div>

            {/* 빠른 액션 */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setActiveTab('scan')}
                className="bg-blue-50 text-blue-700 border-2 border-blue-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:bg-blue-100 hover:border-blue-300"
              >
                <QrCode className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <div className="font-medium">QR 스캔</div>
                <div className="text-xs opacity-80">출퇴근 체크</div>
              </button>

              <button 
                onClick={() => navigate('/vacation')}
                className="bg-purple-50 text-purple-700 border-2 border-purple-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:bg-purple-100 hover:border-purple-300"
              >
                <Plane className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                <div className="font-medium">휴가 신청</div>
                <div className="text-xs opacity-80">신청하기</div>
              </button>
            </div>

            {/* 전체 출석 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">전체 출석</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">정상출석</p>
                  <p className="text-2xl font-bold text-green-600">{weeklyStats.presentDays - weeklyStats.lateDays}</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">지각</p>
                  <p className="text-2xl font-bold text-yellow-500">{weeklyStats.lateDays}</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">조기퇴근</p>
                  <p className="text-2xl font-bold text-orange-500">0</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">결근</p>
                  <p className="text-2xl font-bold text-red-600">{weeklyStats.totalDays - weeklyStats.presentDays - weeklyStats.vacationDays}</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                  <p className="text-sm font-medium text-gray-600 mb-2">휴가</p>
                  <p className="text-2xl font-bold text-purple-600">{weeklyStats.vacationDays}</p>
                  <p className="text-xs text-gray-500">일</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 스캔 탭 */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-800 mb-2">QR 코드 스캔</h2>
              <p className="text-gray-600">QR 코드를 스캔하여 출퇴근을 기록하세요</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <QrCode className="w-12 h-12 text-blue-600" />
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">QR 스캔 시작</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    카메라를 사용하여 QR 코드를 스캔합니다
                  </p>
                </div>

                <button
                  onClick={() => setShowQRScanner(true)}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  QR 스캔 시작
                </button>
                
                {scanResult && (
                  <div className={`border rounded-xl p-4 ${
                    scanResult.includes('완료') 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {scanResult.includes('완료') ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={scanResult.includes('완료') ? 'text-green-800' : 'text-red-800'}>
                        {scanResult}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 기록 탭 - StudentStatsPage로 대체 */}
        {activeTab === 'records' && (
          <div className="space-y-4">
            {/* 탭 네비게이션 */}
            <div className="bg-white rounded-2xl shadow-sm mb-6">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setStatsTab('overview')}
                  className={`flex-1 px-6 py-4 text-center flex items-center justify-center space-x-2 transition-colors ${
                    statsTab === 'overview'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <PieChart className="w-5 h-5" />
                  <span className="font-medium">현황</span>
                </button>
                <button
                  onClick={() => setStatsTab('trends')}
                  className={`flex-1 px-6 py-4 text-center flex items-center justify-center space-x-2 transition-colors ${
                    statsTab === 'trends'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="font-medium">추이</span>
                </button>
              </div>
            </div>

            {/* 현황 탭 */}
            {statsTab === 'overview' && (
              <div className="space-y-6">

                {/* 출석 상세 현황 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6">전체 출석 상세</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">정상출석</p>
                      <p className="text-2xl font-bold text-green-600">{weeklyStats.presentDays - weeklyStats.lateDays}</p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">지각</p>
                      <p className="text-2xl font-bold text-yellow-500">{weeklyStats.lateDays}</p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">조기퇴근</p>
                      <p className="text-2xl font-bold text-orange-500">0</p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">결근</p>
                      <p className="text-2xl font-bold text-red-600">{weeklyStats.totalDays - weeklyStats.presentDays - weeklyStats.vacationDays}</p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">휴가</p>
                      <p className="text-2xl font-bold text-purple-600">{weeklyStats.vacationDays}</p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 추이 탭 */}
            {statsTab === 'trends' && (
              <div className="space-y-6">
                {/* 주차 선택 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800">주차 및 기간 선택</h3>
                    <select
                      value={selectedWeek}
                      onChange={(e) => {
                        setSelectedWeek(e.target.value)
                        // 선택된 주차에 해당하는 데이터 로드 (그룹 시작일 기준)
                        if (selectedGroup) {
                          const selectedWeekNumber = parseInt(e.target.value)
                          const weekOffset = selectedWeekNumber - 1
                          loadWeeklyStats(selectedGroup.id, weekOffset)
                        }
                      }}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
                    >
                      {weekOptions.length > 0 ? (
                        weekOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))
                      ) : (
                        <option value="1">1주차 (로딩 중...)</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* 주간 개인 출석 현황 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-8">{selectedWeek}주차 출석 기록</h3>
                  
                  {/* 달력 형태 출석 표시 */}
                  <div className="grid grid-cols-5 gap-3 mb-8">
                    {weeklyStats.weeklyData.map((dayData, index) => {
                      const statusInfo = {
                        출근: { text: '출근', color: 'bg-green-50 text-green-700 border-green-200' },
                        지각: { text: '지각', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
                        결근: { text: '결근', color: 'bg-red-50 text-red-700 border-red-200' }
                      }
                      
                      const status = statusInfo[dayData.status as keyof typeof statusInfo] || 
                                   { text: dayData.status, color: 'bg-gray-50 text-gray-700 border-gray-200' }
                      
                      // 빈 칸인지 확인
                      const isEmpty = (dayData as any).isEmpty
                      // 프로젝트 시작일 이전인지 확인
                      const isBeforeStart = (dayData as any).isBeforeStart
                      
                      return (
                        <div key={`${dayData.day}-${index}`} className="text-center">
                          <div className={`text-sm font-medium mb-3 ${isEmpty ? 'text-gray-300' : isBeforeStart ? 'text-gray-400' : 'text-gray-500'}`}>
                            {dayData.day}
                          </div>
                          <div className={`w-14 h-14 rounded-lg flex items-center justify-center mx-auto border transition-all ${
                            isEmpty 
                              ? 'bg-gray-50 border-gray-100' // 빈 칸 스타일
                              : isBeforeStart 
                                ? 'bg-gray-100 text-gray-400 border-gray-200 hover:scale-105' 
                                : `${status.color} hover:scale-105`
                          }`}>
                            <span className="text-xs font-bold">
                              {isEmpty ? '' : isBeforeStart ? '시작전' : status.text}
                            </span>
                          </div>
                          <div className={`text-xs mt-2 ${isEmpty ? 'text-gray-300' : isBeforeStart ? 'text-gray-400' : 'text-gray-400'}`}>
                            {isEmpty ? '' : isBeforeStart ? '시작전' : dayData.status}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 주간 요약 */}
                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-md font-semibold text-gray-700 mb-4">{selectedWeek}주차 요약</h4>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                        <div className="text-lg font-bold text-green-600">{weeklyStats.presentDays - weeklyStats.lateDays}</div>
                        <div className="text-xs text-gray-500">정상출석</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                        <div className="text-lg font-bold text-yellow-500">{weeklyStats.lateDays}</div>
                        <div className="text-xs text-gray-500">지각</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                        <div className="text-lg font-bold text-red-600">{weeklyStats.totalDays - weeklyStats.presentDays - weeklyStats.vacationDays}</div>
                        <div className="text-xs text-gray-500">결근</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                        <div className="text-lg font-bold text-purple-600">{weeklyStats.vacationDays}</div>
                        <div className="text-xs text-gray-500">휴가</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                        <div className="text-lg font-bold text-blue-600">{weeklyStats.totalDays}</div>
                        <div className="text-xs text-gray-500">전체</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


      </div>

      {/* 하단 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg ${
              activeTab === 'home' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <Home size={20} />
            <span className="text-xs mt-1">홈</span>
          </button>

          <button
            onClick={() => setActiveTab('scan')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg ${
              activeTab === 'scan' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <QrCode size={20} />
            <span className="text-xs mt-1">스캔</span>
          </button>

          <button
            onClick={() => setActiveTab('records')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg ${
              activeTab === 'records' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <Calendar size={20} />
            <span className="text-xs mt-1">기록</span>
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
                            <span className="text-xs text-gray-500">{new Date(new Date(notification.created_at).getTime() + (9 * 60 * 60 * 1000)).toLocaleDateString('ko-KR')}</span>
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
                <Plus size={20} />
                <span>새 휴가 신청</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR 스캐너 모달 */}
      {showQRScanner && (
        <QRScanner
          onScan={handleQRScan}
          onError={handleQRScanError}
          onClose={handleQRScannerClose}
        />
      )}

      {/* 출근/퇴근 확인 팝업 */}
      {showConfirmModal && confirmData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                {confirmData.type === 'checkin' ? (
                  <Clock className="w-8 h-8 text-blue-600" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {confirmData.type === 'checkin' ? '출근' : '퇴근'} 확인
              </h3>
              <p className="text-gray-600">
                {confirmData.type === 'checkin' 
                  ? '출근을 기록하시겠습니까?' 
                  : '퇴근을 기록하시겠습니까?'
                }
              </p>
            </div>
            
            {/* 위치 정보 표시 */}
            {confirmData.locationData && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 mb-1">위치 정보</p>
                    {confirmData.locationData.name && (
                      <p className="text-xs text-gray-600 mb-1">
                        장소: {confirmData.locationData.name}
                      </p>
                    )}
                    {confirmData.locationData.address && (
                      <p className="text-xs text-gray-600 mb-1">
                        주소: {confirmData.locationData.address}
                      </p>
                    )}
                    {confirmData.locationData.latitude && confirmData.locationData.longitude && (
                      <p className="text-xs text-gray-500 mb-1">
                        좌표: {confirmData.locationData.latitude.toFixed(6)}, {confirmData.locationData.longitude.toFixed(6)}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      시간: {(() => {
                        const now = new Date()
                        const year = now.getFullYear()
                        const month = (now.getMonth() + 1).toString().padStart(2, '0')
                        const day = now.getDate().toString().padStart(2, '0')
                        const hour = now.getHours()
                        const minute = now.getMinutes().toString().padStart(2, '0')
                        const second = now.getSeconds().toString().padStart(2, '0')
                        return `${year}. ${month}. ${day}. ${hour.toString().padStart(2, '0')}:${minute}:${second}`
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* 버튼 */}
            <div className="flex space-x-3">
              <button
                onClick={handleCancelAttendance}
                className="flex-1 py-3 px-4 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmAttendance}
                className={`flex-1 py-3 px-4 text-white rounded-xl font-medium transition-colors ${
                  confirmData.type === 'checkin' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {confirmData.type === 'checkin' ? '출근' : '퇴근'} 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 