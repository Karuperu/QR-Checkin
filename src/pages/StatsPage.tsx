import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Users, 
  Calendar, 
  Clock, 
  UserCheck, 
  UserX,
  BarChart3,
  Download,
  Filter,
  Plane
} from 'lucide-react'
import { 
  getCurrentUser, 
  hasFacultyAccess,
  getTodayAttendanceStatus,
  getWeeklyAttendanceStats,
  getDailyAttendanceStats,
  getAttendanceStatusLabel,
  getAttendanceStatusColor,
  formatLocalTime,
  formatLocalDate,
  formatLocalDateRange,
  type User,
  type AttendanceStatus,
  getAttendanceStatusByDate
} from '../lib/supabase'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

interface TodayAttendance {
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
}

interface WeeklyStats {
  date: string
  status: AttendanceStatus | null
  checkinTime: string | null
  checkoutTime: string | null
  student: {
    name: string
    user_id: string
    department: string
  }
}

interface DailyStats {
  [date: string]: {
    checkin: number
    checkout: number
    absent: number
    vacation: number
    total: number
  }
}

export default function StatsPage() {
  const navigate = useNavigate()
  const [, setCurrentUser] = useState<User | null>(null)
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null)
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStats>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [selectedTab, setSelectedTab] = useState<'today' | 'weekly' | 'daily' >('today')
  const [selectedDepartment, setSelectedDepartment] = useState('all')
  // const [editingStudent, setEditingStudent] = useState<{studentId: string, currentStatus: AttendanceStatus} | null>(null)
  const [showDailyDetail, setShowDailyDetail] = useState(false)
  const [selectedDailyDate, setSelectedDailyDate] = useState<string | null>(null)
  const [selectedDailyDetail, setSelectedDailyDetail] = useState<TodayAttendance | null>(null)

  // 테스트용 더미 데이터 (weeklyStats가 비어있을 때만 사용)
  const dummyWeeklyStats: WeeklyStats[] = [
    { date: '2025-07-09', status: 'checkin', checkinTime: '2025-07-09T09:00:00', checkoutTime: '2025-07-09T18:00:00', student: { name: '홍길동', user_id: '20230001', department: '컴퓨터공학과' } },
    { date: '2025-07-10', status: 'checkin', checkinTime: '2025-07-10T09:10:00', checkoutTime: '2025-07-10T18:05:00', student: { name: '김철수', user_id: '20230002', department: '전자공학과' } },
    { date: '2025-07-11', status: 'checkin', checkinTime: '2025-07-11T09:05:00', checkoutTime: '2025-07-11T18:10:00', student: { name: '이영희', user_id: '20230003', department: '기계공학과' } },
    { date: '2025-07-12', status: 'checkin', checkinTime: '2025-07-12T09:00:00', checkoutTime: '2025-07-12T18:00:00', student: { name: '박민수', user_id: '20230004', department: '컴퓨터공학과' } },
    { date: '2025-07-13', status: 'checkin', checkinTime: '2025-07-13T09:20:00', checkoutTime: '2025-07-13T18:15:00', student: { name: '최지훈', user_id: '20230005', department: '전자공학과' } },
    { date: '2025-07-14', status: 'checkin', checkinTime: '2025-07-14T09:00:00', checkoutTime: '2025-07-14T18:00:00', student: { name: '홍길동', user_id: '20230001', department: '컴퓨터공학과' } },
    { date: '2025-07-15', status: 'checkin', checkinTime: '2025-07-15T09:00:00', checkoutTime: '2025-07-15T18:00:00', student: { name: '김철수', user_id: '20230002', department: '전자공학과' } },
  ]

  useEffect(() => {
    const user = getCurrentUser()
    if (!user || !hasFacultyAccess(user)) {
      navigate('/')
      return
    }
    setCurrentUser(user)
    loadAllStats()
  }, [navigate])

  useEffect(() => {
    if (todayAttendance) {
      console.log('총 인원 todayAttendance.totalStudents:', todayAttendance.totalStudents);
    }
  }, [todayAttendance]);

  const loadAllStats = async () => {
    setIsLoading(true)
    setError('')

    try {
      const [todayData, weeklyData, dailyData] = await Promise.all([
        getTodayAttendanceStatus(),
        getWeeklyAttendanceStats(),
        getDailyAttendanceStats(30)
      ])

      setTodayAttendance(todayData)
      setWeeklyStats(weeklyData)
      setDailyStats(dailyData)
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const getDepartments = () => {
    if (!todayAttendance) return []
    const allStudents = [
      ...todayAttendance.checkin, 
      ...todayAttendance.checkout,
      ...todayAttendance.late,
      ...todayAttendance.early_leave,
      ...todayAttendance.absent, 
      ...todayAttendance.vacation
    ]
    const departments = new Set(allStudents.map((student: User) => student.department))
    return Array.from(departments)
  }

  const filterStudentsByDepartment = (students: User[]) => {
    if (selectedDepartment === 'all') return students
    return students.filter(student => student.department === selectedDepartment)
  }

  // const handleStatusChange = async (studentId: string, newStatus: AttendanceStatus) => {
  //   if (!currentUser) return

  //   try {
  //     const today = new Date().toISOString().split('T')[0]
  //     const success = await setStudentAttendanceStatus(studentId, newStatus, today, currentUser)
      
  //     if (success) {
  //       // 데이터 새로고침
  //       await loadAllStats()
  //       setEditingStudent(null)
  //     } else {
  //       alert('상태 변경에 실패했습니다.')
  //     }
  //   } catch (error) {
  //     console.error('상태 변경 오류:', error)
  //     alert('상태 변경 중 오류가 발생했습니다.')
  //   }
  // }

  // const getStatusIcon = (status: AttendanceStatus) => {
  //   switch (status) {
  //     case 'checkin':
  //       return <UserCheck className="w-5 h-5 text-green-600" />
  //     case 'checkout':
  //       return <Clock className="w-5 h-5 text-blue-600" />
  //     case 'absent':
  //       return <UserX className="w-5 h-5 text-red-600" />
  //     case 'vacation':
  //       return <Plane className="w-5 h-5 text-yellow-600" />
  //     default:
  //       return <UserX className="w-5 h-5 text-gray-600" />
  //   }
  // }

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-'
    return formatLocalTime(timeString)
  }

  const formatDate = (dateString: string) => {
    return formatLocalDate(dateString)
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    return formatLocalDateRange(startDate, endDate)
  }

  const exportToCSV = () => {
    if (selectedTab === 'today' && todayAttendance) {
      const csvData = [
        ['이름', '학번', '학과', '상태', '출근시간', '퇴근시간', '휴가기간'],
        ...todayAttendance.checkin.map(student => [
          student.name,
          student.user_id,
          student.department,
          '출근',
          student.checkinTime ? formatTime(student.checkinTime) : '',
          '',
          ''
        ]),
        ...todayAttendance.checkout.map(student => [
          student.name,
          student.user_id,
          student.department,
          '퇴근',
          student.checkinTime ? formatTime(student.checkinTime) : '',
          student.checkoutTime ? formatTime(student.checkoutTime) : '',
          ''
        ]),
        ...todayAttendance.late.map(student => [
          student.name,
          student.user_id,
          student.department,
          '지각',
          student.checkinTime ? formatTime(student.checkinTime) : '',
          '',
          ''
        ]),
        ...todayAttendance.early_leave.map(student => [
          student.name,
          student.user_id,
          student.department,
          '조기퇴근',
          student.checkinTime ? formatTime(student.checkinTime) : '',
          student.checkoutTime ? formatTime(student.checkoutTime) : '',
          ''
        ]),
        ...todayAttendance.absent.map(student => [
          student.name,
          student.user_id,
          student.department,
          '결근',
          '',
          '',
          ''
        ]),
        ...todayAttendance.vacation.map(student => [
          student.name,
          student.user_id,
          student.department,
          '휴가',
          '',
          '',
          student.vacationStartDate && student.vacationEndDate ? 
            formatDateRange(student.vacationStartDate, student.vacationEndDate) : ''
        ])
      ]
      
      const csvContent = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `출석현황_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    } else if (selectedTab === 'weekly') {
      const csvData = [
        ['날짜', '이름', '학번', '학과', '상태', '출근시간', '퇴근시간'],
        ...weeklyStats.map(stat => [
          stat.date,
          stat.student.name,
          stat.student.user_id,
          stat.student.department,
          stat.status ? getAttendanceStatusLabel(stat.status) : '-',
          formatTime(stat.checkinTime),
          formatTime(stat.checkoutTime)
        ])
      ]
      
      const csvContent = csvData.map(row => row.join(',')).join('\n')
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `주간출퇴근통계_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
    }
  }

  const renderStudentCard = (student: User & { checkinTime?: string, checkoutTime?: string, vacationStartDate?: string, vacationEndDate?: string }, status: AttendanceStatus) => (
    <div key={student.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
      <div className="flex-1">
        <p className="font-medium text-gray-900">{student.name}</p>
        <p className="text-sm text-gray-600">{student.user_id} • {student.department}</p>
        
        {/* 출퇴근 시간 및 휴가 기간 표시 */}
        {status === 'checkin' && student.checkinTime && (
          <p className="text-xs text-green-600 mt-1">
            출근시간: {formatTime(student.checkinTime)}
          </p>
        )}
        
        {status === 'late' && student.checkinTime && (
          <p className="text-xs text-orange-600 mt-1">
            지각시간: {formatTime(student.checkinTime)}
          </p>
        )}
        
        {status === 'checkout' && (
          <div className="text-xs mt-1 flex gap-4">
            {student.checkinTime && (
              <span className="text-green-600">출근시간: {formatTime(student.checkinTime)}</span>
            )}
            {student.checkoutTime && (
              <span className="text-blue-600">퇴근시간: {formatTime(student.checkoutTime)}</span>
            )}
          </div>
        )}
        
        {status === 'early_leave' && (
          <div className="text-xs mt-1 flex gap-4">
            {student.checkinTime && (
              <span className="text-green-600">출근시간: {formatTime(student.checkinTime)}</span>
            )}
          </div>
        )}
        
        {status === 'vacation' && student.vacationStartDate && student.vacationEndDate && (
          <p className="text-xs text-yellow-600 mt-1">
            휴가기간: {formatDateRange(student.vacationStartDate, student.vacationEndDate)}
          </p>
        )}
      </div>
      
      <div className="flex items-center space-x-2">
        <span className={`px-2 py-1 text-xs rounded-full ${getAttendanceStatusColor(status)}`}>
          {getAttendanceStatusLabel(status)}
        </span>
      </div>
    </div>
  )

  // 일별 출석률 카드 클릭 핸들러
  const handleDailyCardClick = async (date: string) => {
    setSelectedDailyDate(date)
    setShowDailyDetail(true)
    setSelectedDailyDetail(null)
    const detail = await getAttendanceStatusByDate(date)
    setSelectedDailyDetail(detail)
  }

  // 주간 통계 차트 데이터 생성 함수
  const getWeeklyChartData = () => {
    const today = new Date()
    const days = []
    const labels = []

    // 오늘 기준 1주일 전부터 오늘까지
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      days.push(dateStr)
      labels.push(formatLocalDate(dateStr))
    }

    // 각 날짜별 출근+퇴근 인원 합계 계산
    const data = days.map(date => {
      const dayStats = (weeklyStats.length > 0 ? weeklyStats : dummyWeeklyStats)
        .filter(stat => stat.date === date)
      const uniqueStudents = new Set(dayStats.map(stat => stat.student.user_id))
      return uniqueStudents.size
    })

    // **총 인원 동적 계산**
    const maxStudents =
      todayAttendance?.totalStudents && todayAttendance.totalStudents > 0
        ? todayAttendance.totalStudents
        : Math.max(...data, 1)

    return {
      labels,
      data,
      maxStudents
    }
  }

  // 차트 옵션에서 y축 max를 maxStudents로 설정
  const getChartOptions = (maxStudents: number) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            return `출근+퇴근 인원: ${context.parsed.y}명`
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: { display: true, text: '날짜' }
      },
      y: {
        display: true,
        title: { display: true, text: '인원수' },
        beginAtZero: true,
        max: maxStudents,
        suggestedMax: maxStudents,
        grace: 0,
        ticks: {
          stepSize: 1,
          precision: 0,
          maxTicksLimit: maxStudents + 1,
          callback: function(tickValue: string | number) {
            if (typeof tickValue === 'number' && tickValue >= 0 && tickValue <= maxStudents) return tickValue;
            return '';
          }
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x',
      intersect: false
    }
  })

  ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">통계 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">오류 발생</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={loadAllStats}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/attendance" className="text-gray-600 hover:text-gray-800">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">출퇴근 통계</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="all">전체 학과</option>
                  {getDepartments().map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <Download className="w-4 h-4" />
                <span>내보내기</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setSelectedTab('today')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'today'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4" />
                  <span>오늘 현황</span>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedTab('weekly')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'weekly'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4" />
                  <span>주간 통계</span>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedTab('daily')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'daily'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>일별 통계</span>
                </div>
              </button>
            </nav>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-6">
            {selectedTab === 'today' && todayAttendance && (
              <div>
                {/* 전체 출석률 */}
                <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">전체 출석률</h3>
                  
                  <div className="flex flex-col lg:flex-row items-center justify-center space-y-6 lg:space-y-0 lg:space-x-12">
                    {/* 원형 게이지 */}
                    <div className="relative">
                      <svg width="200" height="200" className="transform -rotate-90">
                        {/* 배경 원 */}
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          stroke="#e5e7eb"
                          strokeWidth="12"
                          fill="transparent"
                        />
                        
                        {/* 출근 (정상 출근) */}
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          stroke="#059669"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={`${(todayAttendance.checkinCount / todayAttendance.totalStudents) * 565.5} 565.5`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                        
                        {/* 지각 */}
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          stroke="#d97706"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={`${(todayAttendance.lateCount / todayAttendance.totalStudents) * 565.5} 565.5`}
                          strokeDashoffset={`-${(todayAttendance.checkinCount / todayAttendance.totalStudents) * 565.5}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                        
                        {/* 퇴근 */}
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          stroke="#2563eb"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={`${(todayAttendance.checkoutCount / todayAttendance.totalStudents) * 565.5} 565.5`}
                          strokeDashoffset={`-${((todayAttendance.checkinCount + todayAttendance.lateCount) / todayAttendance.totalStudents) * 565.5}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                        
                        {/* 조기퇴근 */}
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          stroke="#7c3aed"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={`${(todayAttendance.earlyLeaveCount / todayAttendance.totalStudents) * 565.5} 565.5`}
                          strokeDashoffset={`-${((todayAttendance.checkinCount + todayAttendance.lateCount + todayAttendance.checkoutCount) / todayAttendance.totalStudents) * 565.5}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                        
                        {/* 휴가 */}
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          stroke="#eab308"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={`${(todayAttendance.vacationCount / todayAttendance.totalStudents) * 565.5} 565.5`}
                          strokeDashoffset={`-${((todayAttendance.checkinCount + todayAttendance.lateCount + todayAttendance.checkoutCount + todayAttendance.earlyLeaveCount) / todayAttendance.totalStudents) * 565.5}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                        
                        {/* 결근 */}
                        <circle
                          cx="100"
                          cy="100"
                          r="90"
                          stroke="#dc2626"
                          strokeWidth="12"
                          fill="transparent"
                          strokeDasharray={`${(todayAttendance.absentCount / todayAttendance.totalStudents) * 565.5} 565.5`}
                          strokeDashoffset={`-${((todayAttendance.checkinCount + todayAttendance.lateCount + todayAttendance.checkoutCount + todayAttendance.earlyLeaveCount + todayAttendance.vacationCount) / todayAttendance.totalStudents) * 565.5}`}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      
                      {/* 중앙 텍스트 */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-gray-800">{todayAttendance.totalStudents}명</span>
                        <span className="text-sm text-gray-600">전체 학생</span>
                      </div>
                    </div>
                    
                    {/* 범례 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">출근</p>
                          <p className="text-lg font-bold text-green-600">{todayAttendance.checkinCount}명</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-yellow-600 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">지각</p>
                          <p className="text-lg font-bold text-yellow-600">{todayAttendance.lateCount}명</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">퇴근</p>
                          <p className="text-lg font-bold text-blue-600">{todayAttendance.checkoutCount}명</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">조기퇴근</p>
                          <p className="text-lg font-bold text-purple-600">{todayAttendance.earlyLeaveCount}명</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">휴가</p>
                          <p className="text-lg font-bold text-yellow-500">{todayAttendance.vacationCount}명</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">결근</p>
                          <p className="text-lg font-bold text-red-600">{todayAttendance.absentCount}명</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 상태별 학생 목록 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <UserCheck className="w-5 h-5 text-green-600 mr-2" />
                      출근 학생 ({filterStudentsByDepartment(todayAttendance.checkin).length}명)
                    </h3>
                    <div className="bg-green-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {filterStudentsByDepartment(todayAttendance.checkin).length > 0 ? (
                        <div className="space-y-2">
                          {filterStudentsByDepartment(todayAttendance.checkin).map(student => 
                            renderStudentCard(student, 'checkin')
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">해당 조건의 출근 학생이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Clock className="w-5 h-5 text-orange-600 mr-2" />
                      지각 학생 ({filterStudentsByDepartment(todayAttendance.late).length}명)
                    </h3>
                    <div className="bg-orange-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {filterStudentsByDepartment(todayAttendance.late).length > 0 ? (
                        <div className="space-y-2">
                          {filterStudentsByDepartment(todayAttendance.late).map(student => 
                            renderStudentCard(student, 'late')
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">해당 조건의 지각 학생이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Clock className="w-5 h-5 text-blue-600 mr-2" />
                      퇴근 학생 ({filterStudentsByDepartment(todayAttendance.checkout).length}명)
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {filterStudentsByDepartment(todayAttendance.checkout).length > 0 ? (
                        <div className="space-y-2">
                          {filterStudentsByDepartment(todayAttendance.checkout).map(student => 
                            renderStudentCard(student, 'checkout')
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">해당 조건의 퇴근 학생이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Clock className="w-5 h-5 text-purple-600 mr-2" />
                      조기퇴근 학생 ({filterStudentsByDepartment(todayAttendance.early_leave).length}명)
                    </h3>
                    <div className="bg-purple-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {filterStudentsByDepartment(todayAttendance.early_leave).length > 0 ? (
                        <div className="space-y-2">
                          {filterStudentsByDepartment(todayAttendance.early_leave).map(student => 
                            renderStudentCard(student, 'early_leave')
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">해당 조건의 조기퇴근 학생이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <UserX className="w-5 h-5 text-red-600 mr-2" />
                      결근 학생 ({filterStudentsByDepartment(todayAttendance.absent).length}명)
                    </h3>
                    <div className="bg-red-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {filterStudentsByDepartment(todayAttendance.absent).length > 0 ? (
                        <div className="space-y-2">
                          {filterStudentsByDepartment(todayAttendance.absent).map(student => 
                            renderStudentCard(student, 'absent')
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">해당 조건의 결근 학생이 없습니다.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <Plane className="w-5 h-5 text-yellow-600 mr-2" />
                      휴가 학생 ({filterStudentsByDepartment(todayAttendance.vacation).length}명)
                    </h3>
                    <div className="bg-yellow-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      {filterStudentsByDepartment(todayAttendance.vacation).length > 0 ? (
                        <div className="space-y-2">
                          {filterStudentsByDepartment(todayAttendance.vacation).map(student => 
                            renderStudentCard(student, 'vacation')
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">해당 조건의 휴가 학생이 없습니다.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'weekly' && (
              <div>
                {/* 주간 출근+퇴근 인원 차트 추가 */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">주간 출근+퇴근 인원 통계</h3>
                    <div className="text-sm text-gray-500">
                      {formatDateRange(
                        new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        new Date().toISOString().split('T')[0]
                      )}
                    </div>
                  </div>
                  <div className="h-80">
                    {(() => {
                      const chartData = getWeeklyChartData()
                      return (
                        <Line
                          data={{
                            labels: chartData.labels,
                            datasets: [
                              {
                                label: '출근+퇴근 인원',
                                data: chartData.data,
                                borderColor: 'rgb(234, 179, 8)',
                                backgroundColor: 'rgba(234, 179, 8, 0.1)',
                                borderWidth: 3,
                                fill: true,
                                tension: 0.4,
                                pointBackgroundColor: 'rgb(234, 179, 8)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 6,
                                pointHoverRadius: 8
                              }
                            ]
                          }}
                          options={{
                            ...getChartOptions(chartData.maxStudents),
                            interaction: {
                              mode: 'nearest' as const,
                              axis: 'x',
                              intersect: false
                            }
                          }}
                        />
                      )
                    })()}
                  </div>
                  <div className="mt-4 text-center text-sm text-gray-600">
                    총 인원: {getWeeklyChartData().maxStudents}명 기준
                  </div>
                </div>
                {/* 표 */}
                <div className="bg-white rounded shadow p-4">
                  <h2 className="text-lg font-bold mb-2">근무자별 근무 내역</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border px-2 py-1">이름</th>
                          <th className="border px-2 py-1">부서</th>
                          <th className="border px-2 py-1">직급</th>
                          <th className="border px-2 py-1">근무일수</th>
                          <th className="border px-2 py-1">총 근무시간</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* 예시 데이터: weeklyStats를 그룹화하여 이름별로 근무일수/근무시간 계산 */}
                        {Object.entries(
                          (weeklyStats.length > 0 ? weeklyStats : dummyWeeklyStats).reduce((acc: Record<string, { name: string, department: string, position: string, days: number, totalTime: number }>, stat: WeeklyStats) => {
                            const key = stat.student.name + stat.student.user_id
                            if (!acc[key]) {
                              acc[key] = {
                                name: stat.student.name,
                                department: stat.student.department,
                                position: '직원', // 실제 데이터에 맞게 수정 필요
                                days: 0,
                                totalTime: 0,
                              }
                            }
                            acc[key].days += 1
                            // 근무시간 계산 예시(실제 데이터에 맞게 수정 필요)
                            if (stat.checkinTime && stat.checkoutTime) {
                              const inTime = new Date(stat.checkinTime)
                              const outTime = new Date(stat.checkoutTime)
                              const diff = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60)
                              acc[key].totalTime += diff > 0 ? diff : 0
                            }
                            return acc
                          }, {} as Record<string, { name: string, department: string, position: string, days: number, totalTime: number }>))
                          .map(([key, row]) => {
                            const r = row as { name: string, department: string, position: string, days: number, totalTime: number }
                            return (
                              <tr key={key}>
                                <td className="border px-2 py-1">{r.name}</td>
                                <td className="border px-2 py-1">{r.department}</td>
                                <td className="border px-2 py-1">{r.position}</td>
                                <td className="border px-2 py-1">{r.days}</td>
                                <td className="border px-2 py-1">{r.totalTime.toFixed(2)}시간</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {selectedTab === 'daily' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 출석률 통계 (최근 30일)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(dailyStats)
                    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                    .slice(0, 30)
                    .map(([date, stats]) => {
                      const totalPresent = stats.checkin + stats.checkout
                      const attendanceRate = stats.total > 0 ? (totalPresent / stats.total * 100) : 0
                      return (
                        <div
                          key={date}
                          className="bg-white border-4 border-red-500 rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow select-none"
                          onClick={() => { alert('카드 클릭됨: ' + date); console.log('카드 클릭됨', date); handleDailyCardClick(date); }}
                          style={{ width: '100%', height: '100%', background: 'yellow' }}
                          tabIndex={0}
                          role="button"
                          aria-label={`${formatDate(date)} 출석 상세 보기`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">{formatDate(date)}</h4>
                            <span className={`text-sm font-semibold ${
                              attendanceRate >= 80 ? 'text-green-600' :
                              attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {attendanceRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">출근</span>
                              <span className="text-green-600 font-medium">{stats.checkin}명</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">퇴근</span>
                              <span className="text-blue-600 font-medium">{stats.checkout}명</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">결근</span>
                              <span className="text-red-600 font-medium">{stats.absent}명</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">휴가</span>
                              <span className="text-yellow-600 font-medium">{stats.vacation}명</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">전체</span>
                              <span className="text-gray-900 font-medium">{stats.total}명</span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  attendanceRate >= 80 ? 'bg-green-500' :
                                  attendanceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${attendanceRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
                
                {Object.keys(dailyStats).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">일별 통계 데이터가 없습니다.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 팝업 */}
      {showDailyDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowDailyDetail(false)}>&times;</button>
            <h2 className="text-2xl font-bold mb-4">{selectedDailyDate ? formatDate(selectedDailyDate) : ''} 학생 출결 현황</h2>
            {!selectedDailyDetail && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-blue-600 font-medium">불러오는 중...</span>
              </div>
            )}
            {selectedDailyDetail && (
              <div className="space-y-8">
                {/* 출근 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center"><UserCheck className="w-5 h-5 text-green-600 mr-2" />출근 학생 ({selectedDailyDetail.checkin.length}명)</h3>
                  <div className="bg-green-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selectedDailyDetail.checkin.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDailyDetail.checkin.map(student => renderStudentCard(student, 'checkin'))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-2">출근 학생이 없습니다.</p>
                    )}
                  </div>
                </div>
                {/* 지각 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center"><Clock className="w-5 h-5 text-orange-600 mr-2" />지각 학생 ({selectedDailyDetail.late.length}명)</h3>
                  <div className="bg-orange-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selectedDailyDetail.late.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDailyDetail.late.map(student => renderStudentCard(student, 'late'))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-2">지각 학생이 없습니다.</p>
                    )}
                  </div>
                </div>
                {/* 퇴근 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center"><Clock className="w-5 h-5 text-blue-600 mr-2" />퇴근 학생 ({selectedDailyDetail.checkout.length}명)</h3>
                  <div className="bg-blue-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selectedDailyDetail.checkout.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDailyDetail.checkout.map(student => renderStudentCard(student, 'checkout'))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-2">퇴근 학생이 없습니다.</p>
                    )}
                  </div>
                </div>
                {/* 조기퇴근 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center"><Clock className="w-5 h-5 text-purple-600 mr-2" />조기퇴근 학생 ({selectedDailyDetail.early_leave.length}명)</h3>
                  <div className="bg-purple-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selectedDailyDetail.early_leave.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDailyDetail.early_leave.map(student => renderStudentCard(student, 'early_leave'))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-2">조기퇴근 학생이 없습니다.</p>
                    )}
                  </div>
                </div>
                {/* 결근 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center"><UserX className="w-5 h-5 text-red-600 mr-2" />결근 학생 ({selectedDailyDetail.absent.length}명)</h3>
                  <div className="bg-red-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selectedDailyDetail.absent.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDailyDetail.absent.map(student => renderStudentCard(student, 'absent'))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-2">결근 학생이 없습니다.</p>
                    )}
                  </div>
                </div>
                {/* 휴가 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center"><Plane className="w-5 h-5 text-yellow-600 mr-2" />휴가 학생 ({selectedDailyDetail.vacation.length}명)</h3>
                  <div className="bg-yellow-50 rounded-lg p-4 max-h-48 overflow-y-auto">
                    {selectedDailyDetail.vacation.length > 0 ? (
                      <div className="space-y-2">
                        {selectedDailyDetail.vacation.map(student => renderStudentCard(student, 'vacation'))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-2">휴가 학생이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 