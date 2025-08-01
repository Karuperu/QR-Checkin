import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Save, AlertCircle, CheckCircle, Settings, TestTube } from 'lucide-react'

export default function WorkTimeSettingsPage() {
  const navigate = useNavigate()
  const [currentUser] = useState({
    name: '손봉기 교수님',
    role: 'faculty'
  })
  
  const [settings, setSettings] = useState({
    checkin_deadline_hour: 10,
    checkout_start_hour: 18
  })
  
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // 테스트 모달 상태
  const [showTestModal, setShowTestModal] = useState(false)
  const [testType, setTestType] = useState<'late' | 'early'>('late')
  const [testReason, setTestReason] = useState('')

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
    setIsLoading(true)
    setErrors([])
    setSuccessMessage('')

    const validationErrors = validateSettings()
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      setIsLoading(false)
      return
    }

    // 저장 시뮬레이션
    setTimeout(() => {
      setSuccessMessage('출퇴근 시간 설정이 저장되었습니다.')
      setIsLoading(false)
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    }, 1000)
  }

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  const getWorkHours = () => {
    return settings.checkout_start_hour - settings.checkin_deadline_hour
  }

  // 테스트 모달 함수들
  const handleTestClick = (type: 'late' | 'early') => {
    setTestType(type)
    setTestReason('')
    setShowTestModal(true)
  }

  const handleTestSubmit = () => {
    alert(`${testType === 'late' ? '지각' : '조기퇴근'} 사유가 저장되었습니다: ${testReason}`)
    setShowTestModal(false)
    setTestReason('')
  }

  const handleTestCancel = () => {
    setShowTestModal(false)
    setTestReason('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <button onClick={() => navigate('/faculty-attendance')} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold text-gray-800 truncate">출퇴근 시간 설정</h1>
              <p className="text-sm text-gray-600 break-words leading-relaxed">학생들의 출퇴근 시간 기준을 설정하세요</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Settings className="w-6 h-6 text-blue-600" />
            <div className="text-sm hidden sm:block">
              <div className="font-medium text-gray-800 whitespace-nowrap">{currentUser.name}</div>
              <div className="text-gray-500">교직원</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        {/* 안내 카드 */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
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
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} />
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl">
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

        {/* 테스트 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <TestTube className="w-6 h-6 mr-3 text-purple-600" />
            사유 입력 UI 테스트
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => handleTestClick('late')}
              className="bg-orange-500 text-white py-4 px-6 rounded-xl font-medium hover:bg-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-3"
            >
              <AlertCircle size={20} />
              지각 사유 입력 테스트
            </button>
            
            <button
              onClick={() => handleTestClick('early')}
              className="bg-blue-500 text-white py-4 px-6 rounded-xl font-medium hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all flex items-center justify-center gap-3"
            >
              <Clock size={20} />
              조기퇴근 사유 입력 테스트
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-xl">
            <p className="text-sm text-gray-600">
              위 버튼을 클릭하면 QR 스캔 시 나타나는 사유 입력 팝업과 동일한 UI를 테스트해볼 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 테스트 모달 */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">
                {testType === 'late' ? '지각 사유 입력' : '조기퇴근 사유 입력'}
              </h3>
              <p className="text-sm text-gray-600">
                {testType === 'late' 
                  ? '지각 사유를 입력해주세요' 
                  : '조기퇴근 사유를 입력해주세요'
                }
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  사유
                </label>
                <textarea
                  value={testReason}
                  onChange={(e) => setTestReason(e.target.value)}
                  placeholder={testType === 'late' 
                    ? '예: 교통체증, 알람을 못들어서...' 
                    : '예: 개인사정, 병원진료...'
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleTestCancel}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleTestSubmit}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 