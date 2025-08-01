import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Camera, Clock, Calendar, User as UserIcon, LogOut,
  CheckCircle, AlertCircle, X, QrCode, MapPin,
  Home, Settings, Bell, Plane, Plus, Award, Zap,
  ArrowLeft, User, PieChart, TrendingUp
} from 'lucide-react'

export default function StudentAttendancePage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activeTab, setActiveTab] = useState('home')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [selectedWeek, setSelectedWeek] = useState('current')
  const [statsTab, setStatsTab] = useState<'overview' | 'trends'>('overview')
  const [currentUser] = useState({
    name: '김학생',
    role: 'student',
    department: '컴공과',
    user_id: '2024001',
    semester: '4학기'
  })

  // 학생용 알림 데이터
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'vacation_approved',
      title: '휴가 승인',
      message: '1/25~26 휴가가 승인되었습니다',
      time: '10분 전',
      isRead: false
    },
    {
      id: '2', 
      type: 'late_warning',
      title: '지각 알림',
      message: '이번 주 2회 지각입니다',
      time: '1시간 전',
      isRead: false
    },
    {
      id: '3',
      type: 'checkin_success',
      title: '✨ 출근 완료',
      message: '09:15 정상 출근 처리',
      time: '2시간 전',
      isRead: true
    }
  ])

  const [showNotificationModal, setShowNotificationModal] = useState(false)
  
  // 주간 개인 데이터
  const weeklyPersonalData = {
    current: {
      label: '3주차',
      stackData: [
        { day: '월요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '화요일', 출근: 0, 지각: 1, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '수요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '목요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '금요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 }
      ]
    },
    last: {
      label: '2주차',
      stackData: [
        { day: '월요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '화요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '수요일', 출근: 0, 지각: 0, 조기퇴근: 0, 퇴근: 0, 휴가: 1, 결근: 0 },
        { day: '목요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '금요일', 출근: 0, 지각: 1, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 }
      ]
    },
    before: {
      label: '1주차',
      stackData: [
        { day: '월요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '화요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '수요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '목요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 },
        { day: '금요일', 출근: 1, 지각: 0, 조기퇴근: 0, 퇴근: 1, 휴가: 0, 결근: 0 }
      ]
    }
  }

  const currentWeekPersonalData = weeklyPersonalData[selectedWeek as keyof typeof weeklyPersonalData]

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
    checkin: '09:15',
    checkout: null as string | null,
    status: '출근' as '출근' | '퇴근' | '미출근',
    workingHours: '9h 15m'
  })

  // 최근 기록 데이터
  const recentRecords = [
    {
      date: '1/17',
      checkin: '09:15',
      checkout: '18:30',
      status: '정상',
      hours: '9h 15m'
    },
    {
      date: '1/16',
      checkin: '09:20',
      checkout: '18:25',
      status: '정상',
      hours: '9h 5m'
    },
    {
      date: '1/15',
      checkin: '09:10',
      checkout: '18:30',
      status: '정상',
      hours: '9h 20m'
    },
    {
      date: '1/12',
      checkin: '-',
      checkout: '-',
      status: '휴가',
      hours: '-'
    },
    {
      date: '1/11',
      checkin: '09:25',
      checkout: '18:20',
      status: '지각',
      hours: '8h 55m'
    }
  ]

  const unreadNotifications = notifications.filter(n => !n.isRead).length

  const startCamera = async () => {
    try {
      setIsCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('카메라 접근 오류:', error)
      setIsCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
    setIsCameraActive(false)
  }

  const handleScan = () => {
    // QR 스캔 로직
    setScanResult('QR 코드 스캔 완료')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case '정상': return 'bg-green-100 text-green-800'
      case '지각': return 'bg-yellow-100 text-yellow-800'
      case '휴가': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
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

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">QR 출퇴근</h1>
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

            {/* 휴가신청 버튼 */}
            <button 
              onClick={() => navigate('/vacation')}
              className="p-2 text-blue-600 hover:text-blue-800 rounded-lg hover:bg-blue-50"
              title="휴가 신청"
            >
              <Plane size={20} />
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
                  <div className="text-sm text-gray-600">🕘 출근</div>
                </div>
                <div className="text-center bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="text-3xl font-bold mb-1 text-gray-800">
                    {todayStatus.checkout || '--:--'}
                  </div>
                  <div className="text-sm text-gray-600">🕕 퇴근</div>
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

            {/* 주간 통계 */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">이번 주 출석률</h3>
              <div className="flex items-center justify-between">
                <CircularProgress percentage={80} />
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">80%</div>
                  <div className="text-sm text-gray-600">5일 중 4일 출석</div>
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
              <p className="text-gray-600">QR 코드를 카메라에 비춰주세요</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="mt-4 space-y-3">
                <button
                  onClick={isCameraActive ? stopCamera : startCamera}
                  className={`w-full py-3 rounded-xl font-medium transition-colors ${
                    isCameraActive 
                      ? 'bg-red-600 text-white hover:bg-red-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isCameraActive ? '카메라 중지' : '카메라 시작'}
                </button>
                
                {scanResult && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <span className="text-green-800">{scanResult}</span>
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
                {/* 전체 출석률 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-800 mb-8">전체 출석률</h3>
                    <div className="relative inline-flex items-center justify-center">
                      <svg width={140} height={140} className="transform -rotate-90">
                        <circle
                          cx={70}
                          cy={70}
                          r={58}
                          stroke="#e5e7eb"
                          strokeWidth={12}
                          fill="transparent"
                        />
                        <circle
                          cx={70}
                          cy={70}
                          r={58}
                          stroke="#16a34a"
                          strokeWidth={12}
                          fill="transparent"
                          strokeDasharray="195.072 376.991"
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-800">80%</span>
                      </div>
                    </div>
                    <div className="mt-6 space-y-1">
                      <p className="text-2xl font-bold text-gray-800">80%</p>
                      <p className="text-sm text-gray-500">총 15일 중 12일 출석</p>
                    </div>
                  </div>
                </div>

                {/* 출석 상세 현황 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-6">출석 상세</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">정상출석</p>
                      <p className="text-2xl font-bold text-green-600">12</p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">지각</p>
                      <p className="text-2xl font-bold text-yellow-500">1</p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">조기퇴근</p>
                      <p className="text-2xl font-bold text-orange-500">1</p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center border border-red-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">결근</p>
                      <p className="text-2xl font-bold text-red-600">0</p>
                      <p className="text-xs text-gray-500">일</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
                      <p className="text-sm font-medium text-gray-600 mb-2">휴가</p>
                      <p className="text-2xl font-bold text-purple-600">1</p>
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
                    <h3 className="text-lg font-semibold text-gray-800">기간 선택</h3>
                    <select
                      value={selectedWeek}
                      onChange={(e) => setSelectedWeek(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-colors"
                    >
                      <option value="current">3주차</option>
                      <option value="last">2주차</option>
                      <option value="before">1주차</option>
                    </select>
                  </div>
                </div>

                {/* 주간 개인 출석 현황 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-8">{currentWeekPersonalData.label} 출석 기록</h3>
                  
                  {/* 달력 형태 출석 표시 */}
                  <div className="grid grid-cols-5 gap-3 mb-8">
                    {currentWeekPersonalData.stackData.map((dayData, index) => {
                      const days = ['월', '화', '수', '목', '금']
                      const day = days[index]
                      
                      // 해당 날짜의 주요 상태 찾기
                      let mainStatus = '출근'
                      if (dayData.지각 > 0) mainStatus = '지각'
                      else if (dayData.결근 > 0) mainStatus = '결근'
                      else if (dayData.휴가 > 0) mainStatus = '휴가'
                      else if (dayData.조기퇴근 > 0) mainStatus = '조기퇴근'
                      
                      const statusInfo = {
                        출근: { text: '출근', color: 'bg-green-50 text-green-700 border-green-200' },
                        지각: { text: '지각', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
                        조기퇴근: { text: '조기', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                        결근: { text: '결근', color: 'bg-red-50 text-red-700 border-red-200' },
                        휴가: { text: '휴가', color: 'bg-purple-50 text-purple-700 border-purple-200' }
                      }
                      
                      const status = statusInfo[mainStatus as keyof typeof statusInfo]
                      
                      return (
                        <div key={day} className="text-center">
                          <div className="text-sm font-medium text-gray-500 mb-3">{day}</div>
                          <div className={`w-14 h-14 rounded-lg flex items-center justify-center mx-auto border ${status.color} transition-all hover:scale-105`}>
                            <span className="text-xs font-bold">{status.text}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-2">{mainStatus}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 주간 요약 */}
                  <div className="border-t border-gray-100 pt-6">
                    <h4 className="text-md font-semibold text-gray-700 mb-4">{currentWeekPersonalData.label} 요약</h4>
                    <div className="grid grid-cols-5 gap-3">
                      <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                        <div className="text-lg font-bold text-green-600">{currentWeekPersonalData.stackData.filter(d => d.출근 > 0).length}</div>
                        <div className="text-xs text-gray-500">정상출석</div>
                      </div>
                      <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                        <div className="text-lg font-bold text-yellow-500">{currentWeekPersonalData.stackData.filter(d => d.지각 > 0).length}</div>
                        <div className="text-xs text-gray-500">지각</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 text-center border border-orange-200">
                        <div className="text-lg font-bold text-orange-500">{currentWeekPersonalData.stackData.filter(d => d.조기퇴근 > 0).length}</div>
                        <div className="text-xs text-gray-500">조기퇴근</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                        <div className="text-lg font-bold text-red-600">{currentWeekPersonalData.stackData.filter(d => d.결근 > 0).length}</div>
                        <div className="text-xs text-gray-500">결근</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                        <div className="text-lg font-bold text-purple-600">{currentWeekPersonalData.stackData.filter(d => d.휴가 > 0).length}</div>
                        <div className="text-xs text-gray-500">휴가</div>
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
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center py-2 px-3 rounded-lg ${
              activeTab === 'settings' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
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

            {/* 휴가신청 바로가기 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
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
    </div>
  )
} 