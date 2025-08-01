import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Camera, Clock, Calendar, User as UserIcon, LogOut, 
  CheckCircle, AlertCircle, X, QrCode, MapPin, 
  Home, BarChart3, Settings, Bell
} from 'lucide-react'

export default function AttendancePage() {
  const navigate = useNavigate()
  const [currentUser] = useState({
    name: '김학생',
    role: 'student',
    department: '컴퓨터공학과',
    user_id: '2024001'
  })
  
  const [activeTab, setActiveTab] = useState<'home' | 'scan' | 'records' | 'stats'>('home')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<any>(null)
  const [showScanTypeModal, setShowScanTypeModal] = useState(false)
  const [todayStatus, setTodayStatus] = useState({
    checkin: '09:15',
    checkout: null as string | null,
    status: '출근' as '출근' | '퇴근' | '미출근'
  })

  const videoRef = useRef<HTMLVideoElement>(null)

  // 오늘의 출퇴근 현황 데이터 (더미)
  const weekData = [
    { date: '2024-01-15', checkin: '09:10', checkout: '18:30', status: 'complete' },
    { date: '2024-01-16', checkin: '09:15', checkout: '18:25', status: 'complete' },
    { date: '2024-01-17', checkin: '09:20', checkout: null, status: 'working' },
    { date: '2024-01-18', checkin: null, checkout: null, status: 'absent' },
    { date: '2024-01-19', checkin: '09:05', checkout: '18:35', status: 'complete' },
  ]

  const startCamera = async () => {
    try {
      setIsScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('카메라 접근 오류:', error)
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const handleScanSuccess = (type: 'checkin' | 'checkout') => {
    setShowScanTypeModal(false)
    stopCamera()
    setScanResult({ success: true, type })
    
    // 상태 업데이트
    if (type === 'checkin') {
      setTodayStatus(prev => ({ ...prev, checkin: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), status: '출근' }))
    } else {
      setTodayStatus(prev => ({ ...prev, checkout: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), status: '퇴근' }))
    }
  }

  const handleLogout = () => {
    navigate('/')
  }

  const getTodayDate = () => {
    return new Date().toLocaleDateString('ko-KR', { 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'bg-green-100 text-green-800'
      case 'working': return 'bg-blue-100 text-blue-800'
      case 'absent': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'complete': return '완료'
      case 'working': return '근무중'
      case 'absent': return '결근'
      default: return '-'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{currentUser.name}</h2>
              <p className="text-sm text-gray-500">{currentUser.department}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {currentUser.role === 'student' && (
              <button className="p-2 text-gray-600">
                <Bell size={20} />
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:text-red-600"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="p-4">
        {/* 홈 탭 */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* 오늘 날짜 */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-800">{getTodayDate()}</h3>
            </div>

            {/* 오늘 출퇴근 현황 카드 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800">오늘 출퇴근</h4>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  todayStatus.status === '출근' ? 'bg-green-100 text-green-800' :
                  todayStatus.status === '퇴근' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {todayStatus.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">출근시간</div>
                  <div className="text-xl font-bold text-green-700">
                    {todayStatus.checkin || '--:--'}
                  </div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">퇴근시간</div>
                  <div className="text-xl font-bold text-blue-700">
                    {todayStatus.checkout || '--:--'}
                  </div>
                </div>
              </div>

              {/* QR 스캔 버튼 */}
              <button
                onClick={() => setActiveTab('scan')}
                className="w-full mt-6 bg-blue-600 text-white py-4 rounded-xl font-medium text-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <QrCode size={24} />
                <span>QR 코드 스캔</span>
              </button>
            </div>

            {/* 이번 주 출퇴근 요약 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">이번 주 출퇴근</h4>
              <div className="space-y-3">
                {weekData.map((day, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-gray-600 w-16">
                        {new Date(day.date).getDate()}일
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(day.status)}`}>
                        {getStatusText(day.status)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {day.checkin && day.checkout ? `${day.checkin} - ${day.checkout}` :
                       day.checkin ? `${day.checkin} -` : '-'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* QR 스캔 탭 */}
        {activeTab === 'scan' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">QR 코드 스캔</h3>
              <p className="text-gray-600">출퇴근 QR 코드를 스캔해주세요</p>
            </div>

            {/* 카메라 영역 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="relative">
                <div className="w-full aspect-square max-w-sm mx-auto bg-gray-100 rounded-xl overflow-hidden">
                  {isScanning ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                      <Camera size={48} className="mb-4" />
                      <p>카메라를 시작하려면 버튼을 눌러주세요</p>
                    </div>
                  )}
                </div>

                {/* 스캔 가이드 */}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="border-2 border-white border-dashed w-48 h-48 rounded-lg"></div>
                  </div>
                )}
              </div>

              {/* 컨트롤 버튼 */}
              <div className="mt-6 flex justify-center space-x-4">
                {!isScanning ? (
                  <button
                    onClick={startCamera}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Camera size={20} />
                    <span>스캔 시작</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowScanTypeModal(true)}
                      className="bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
                    >
                      출근 체크
                    </button>
                    <button
                      onClick={() => setShowScanTypeModal(true)}
                      className="bg-orange-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-orange-700 transition-colors"
                    >
                      퇴근 체크
                    </button>
                    <button
                      onClick={stopCamera}
                      className="bg-gray-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors"
                    >
                      중지
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 스캔 결과 */}
            {scanResult && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                {scanResult.success ? (
                  <div className="text-center text-green-600">
                    <CheckCircle size={48} className="mx-auto mb-4" />
                    <h4 className="text-lg font-semibold mb-2">
                      {scanResult.type === 'checkin' ? '출근' : '퇴근'} 완료!
                    </h4>
                    <p className="text-gray-600">
                      시간: {new Date().toLocaleTimeString('ko-KR')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center text-red-600">
                    <AlertCircle size={48} className="mx-auto mb-4" />
                    <h4 className="text-lg font-semibold mb-2">스캔 실패</h4>
                    <p className="text-gray-600">다시 시도해주세요</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 출퇴근 기록 탭 */}
        {activeTab === 'records' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">출퇴근 기록</h3>
              <p className="text-gray-600">최근 30일 기록을 확인할 수 있습니다</p>
            </div>

            {/* 필터 */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center space-x-4">
                <Calendar size={20} className="text-gray-500" />
                <input
                  type="date"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {/* 기록 목록 */}
            <div className="space-y-3">
              {weekData.map((day, index) => (
                <div key={index} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-800">
                        {new Date(day.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {day.checkin && day.checkout ? `${day.checkin} - ${day.checkout}` :
                         day.checkin ? `${day.checkin} -` : '미출근'}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(day.status)}`}>
                      {getStatusText(day.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 통계 탭 (교직원만) */}
        {activeTab === 'stats' && currentUser.role === 'faculty' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-800 mb-2">출석 통계</h3>
              <p className="text-gray-600">학생들의 출석 현황을 확인하세요</p>
            </div>

            {/* 오늘 요약 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-green-600 mb-1">24</div>
                <div className="text-sm text-gray-600">출근</div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-red-600 mb-1">3</div>
                <div className="text-sm text-gray-600">결근</div>
              </div>
            </div>

            {/* 학과별 현황 */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">학과별 출석률</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">컴퓨터공학과</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                    <span className="text-sm font-medium">85%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">전자공학과</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                    <span className="text-sm font-medium">92%</span>
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
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'home' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <Home size={20} />
            <span className="text-xs mt-1">홈</span>
          </button>
          
          {currentUser.role !== 'faculty' && (
            <button
              onClick={() => setActiveTab('scan')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                activeTab === 'scan' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
              }`}
            >
              <QrCode size={20} />
              <span className="text-xs mt-1">스캔</span>
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('records')}
            className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
              activeTab === 'records' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
            }`}
          >
            <Clock size={20} />
            <span className="text-xs mt-1">기록</span>
          </button>
          
          {currentUser.role === 'faculty' && (
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex flex-col items-center py-2 px-4 rounded-lg transition-colors ${
                activeTab === 'stats' ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
              }`}
            >
              <BarChart3 size={20} />
              <span className="text-xs mt-1">통계</span>
            </button>
          )}
        </div>
      </div>

      {/* 출퇴근 선택 모달 */}
      {showScanTypeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-center mb-6">출퇴근 선택</h3>
            <div className="space-y-3">
              <button
                onClick={() => handleScanSuccess('checkin')}
                className="w-full bg-green-600 text-white py-4 rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                출근 체크
              </button>
              <button
                onClick={() => handleScanSuccess('checkout')}
                className="w-full bg-orange-600 text-white py-4 rounded-xl font-medium hover:bg-orange-700 transition-colors"
              >
                퇴근 체크
              </button>
              <button
                onClick={() => setShowScanTypeModal(false)}
                className="w-full bg-gray-200 text-gray-800 py-4 rounded-xl font-medium hover:bg-gray-300 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 여백 */}
      <div className="h-20"></div>
    </div>
  )
} 