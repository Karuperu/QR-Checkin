import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, QrCode, Plane, TrendingUp, Clock, Users, Calendar, User as UserIcon, User, BarChart3, Settings, Bell, LogOut, CheckCircle, AlertCircle, X, UserCheck, UserX
} from 'lucide-react'

export default function FacultyAttendancePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentUser] = useState({
    name: '손봉기 교수님',
    role: 'faculty',
    department: '컴공과',
    position: '교수'
  })

  // 교수용 알림 데이터
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'vacation_request',
      title: '🆕 휴가 신청',
      message: '김학생님이 휴가를 신청했습니다',
      time: '5분 전',
      isRead: false
    },
    {
      id: '2',
      type: 'absent_alert',
      title: '연속 결근',
      message: '이학생님이 3일 연속 결근 중입니다',
      time: '30분 전',
      isRead: false
    },
    {
      id: '3',
      type: 'system',
      title: '월간 리포트',
      message: '1월 출석 통계가 준비되었습니다',
      time: '1시간 전',
      isRead: true
    }
  ])

  const [showNotificationModal, setShowNotificationModal] = useState(false)

  // 오늘의 출석 현황
  const [todayStats] = useState({
    total: 28,
    present: 23,
    late: 3,
    absent: 2,
    vacation: 1,
    attendanceRate: 92.9
  })



  // 대기 중인 휴가 신청
  const [pendingVacations] = useState([
    {
      id: '1',
      studentName: '김학생',
      studentId: '2024001',
      type: '병가',
      startDate: '2024-01-25',
      endDate: '2024-01-26',
      reason: '몸살로 인한 병가',
      requestDate: '2024-01-20',
      emoji: '🤒'
    },
    {
      id: '2',
      studentName: '정학생',
      studentId: '2024005',
      type: '휴가',
      startDate: '2024-01-30',
      endDate: '2024-01-30',
      reason: '가족 행사 참석',
      requestDate: '2024-01-18',
      emoji: '🎉'
    }
  ])

  const unreadNotifications = notifications.filter(n => !n.isRead).length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800'
      case 'late': return 'bg-yellow-100 text-yellow-600'
      case 'absent': return 'bg-red-100 text-red-800'
      case 'vacation': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'present': return '출근'
      case 'late': return '지각'
      case 'absent': return '결근'
      case 'vacation': return '휴가'
      default: return '-'
    }
  }

  const CircularProgress = ({ percentage, size = 100 }: { percentage: number, size?: number }) => {
    const radius = (size - 8) / 2
    const circumference = 2 * Math.PI * radius
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (percentage / 100) * circumference
    
    // 92.9%에 맞는 정확한 계산
    const actualPercentage = percentage
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
          <span className="text-lg font-bold text-green-600">{Math.round(percentage)}%</span>
        </div>
      </div>
    )
  }

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
  }

  const handleVacationAction = (id: string, action: 'approve' | 'reject') => {
    alert(`휴가 신청을 ${action === 'approve' ? '승인' : '거절'}했습니다.`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
                          <h1 className="text-lg font-semibold text-gray-800">출석 관리</h1>
            <p className="text-sm text-gray-600">{currentUser.name} • {currentUser.department}</p>
          </div>
          <div className="flex items-center space-x-3">
            {/* 알림 버튼 */}
            <button 
              onClick={() => setShowNotificationModal(true)}
              className="relative p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <Bell size={20} />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>

            {/* 설정 버튼 */}
            <button 
              onClick={() => navigate('/work_time_settings')}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
              title="출퇴근 시간 설정"
            >
              <Settings size={20} />
            </button>

            <button 
              onClick={() => navigate('/')}
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
                    <div className="text-2xl font-bold text-green-600">{todayStats.present}</div>
                    <div className="text-xs opacity-80">출석</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{todayStats.late}</div>
                    <div className="text-xs opacity-80">지각</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{todayStats.absent}</div>
                    <div className="text-xs opacity-80">결근</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{todayStats.vacation}</div>
                    <div className="text-xs opacity-80">휴가</div>
                  </div>
                </div>
                <CircularProgress percentage={todayStats.attendanceRate} />
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all" 
                  style={{ width: `${todayStats.attendanceRate}%` }}
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
                  onClick={() => navigate('/work_time_settings')}
                  className="flex flex-col items-center p-4 bg-orange-50 rounded-2xl hover:bg-orange-100 transition-colors border-2 border-orange-200"
                >
                  <Settings className="w-8 h-8 text-orange-600 mb-2" />
                  <span className="text-sm font-medium text-orange-900">근무시간</span>
                </button>
              </div>
            </div>



            {/* 실시간 활동 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                실시간 활동
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">김학생이 출근했습니다</p>
                    <p className="text-xs text-gray-500">방금 전</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">이학생이 퇴근했습니다</p>
                    <p className="text-xs text-gray-500">5분 전</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">박학생이 지각했습니다</p>
                    <p className="text-xs text-gray-500">10분 전</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Plane className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">최학생이 휴가를 신청했습니다</p>
                    <p className="text-xs text-gray-500">15분 전</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">정학생이 출근했습니다</p>
                    <p className="text-xs text-gray-500">20분 전</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <UserX className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">한학생이 결근 처리되었습니다</p>
                    <p className="text-xs text-gray-500">30분 전</p>
                  </div>
                </div>
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
            onClick={() => navigate('/work_time_settings')}
            className="flex flex-col items-center py-2 px-3 rounded-lg text-gray-600 hover:text-blue-600"
          >
            <Settings size={20} />
            <span className="text-xs mt-1">설정</span>
          </button>
        </div>
      </div>

      {/* 알림 모달 */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">알림</h2>
              <button
                onClick={() => setShowNotificationModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markNotificationAsRead(notification.id)}
                  className={`p-4 rounded-2xl cursor-pointer transition-colors ${
                    notification.isRead ? 'bg-gray-50' : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900">{notification.title}</h3>
                        <span className="text-xs text-gray-500">{notification.time}</span>
                      </div>
                      <p className="text-sm text-gray-600">{notification.message}</p>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 빠른 액션 */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-3">
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