import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Save, AlertCircle, CheckCircle, Settings, TestTube, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function WorkTimeSettingsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [currentUser] = useState({
    name: '',
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

  // 비밀번호 변경 상태
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordMessageType, setPasswordMessageType] = useState<'success' | 'error' | ''>('')

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

  // 비밀번호 변경 함수들
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordLoading(true)
    setPasswordMessage('')

    try {
      // 입력 검증
      if (!currentPassword || !newPassword || !confirmPassword) {
        setPasswordMessage('모든 필드를 입력해주세요.')
        setPasswordMessageType('error')
        return
      }

      if (newPassword !== confirmPassword) {
        setPasswordMessage('새 비밀번호가 일치하지 않습니다.')
        setPasswordMessageType('error')
        return
      }

      if (newPassword.length < 6) {
        setPasswordMessage('새 비밀번호는 최소 6자 이상이어야 합니다.')
        setPasswordMessageType('error')
        return
      }

      if (currentPassword === newPassword) {
        setPasswordMessage('새 비밀번호는 현재 비밀번호와 달라야 합니다.')
        setPasswordMessageType('error')
        return
      }

      // 현재 로그인 사용자 확인
      if (!user) {
        setPasswordMessage('사용자 정보를 가져올 수 없습니다.')
        setPasswordMessageType('error')
        return
      }

      // 안전한 RPC를 통한 비밀번호 변경 (RLS 우회, 본인 확인 포함)
      const { data: changed, error: rpcError } = await supabase.rpc('change_user_password', {
        p_user_id: user.user_id,
        p_old_password: currentPassword,
        p_new_password: newPassword
      })

      if (rpcError) {
        setPasswordMessage('비밀번호 변경에 실패했습니다. 다시 시도해주세요.')
        setPasswordMessageType('error')
        return
      }

      if (!changed) {
        setPasswordMessage('현재 비밀번호가 올바르지 않습니다.')
        setPasswordMessageType('error')
        return
      }

      // 성공 메시지
      setPasswordMessage('비밀번호가 성공적으로 변경되었습니다.')
      setPasswordMessageType('success')
      
      // 폼 초기화
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

    } catch (error) {
      setPasswordMessage('오류가 발생했습니다. 다시 시도해주세요.')
      setPasswordMessageType('error')
    } finally {
      setPasswordLoading(false)
    }
  }

  const validatePassword = (password: string) => {
    const minLength = password.length >= 6
    const hasLetter = /[a-zA-Z]/.test(password)
    const hasNumber = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    return { minLength, hasLetter, hasNumber, hasSpecial }
  }

  const passwordValidation = validatePassword(newPassword)

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

        {/* 비밀번호 변경 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
            <Lock className="w-6 h-6 mr-3 text-green-600" />
            비밀번호 변경
          </h2>

          {/* 비밀번호 변경 메시지 */}
          {passwordMessage && (
            <div className={`mb-6 p-4 rounded-xl flex items-center space-x-2 ${
              passwordMessageType === 'success' 
                ? 'bg-green-50 text-green-800 border border-green-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {passwordMessageType === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{passwordMessage}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-6">
            {/* 현재 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                현재 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="현재 비밀번호를 입력하세요"
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={passwordLoading}
                >
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* 새 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="새 비밀번호를 입력하세요"
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={passwordLoading}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              {/* 비밀번호 강도 표시 */}
              {newPassword && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-2">비밀번호 강도</p>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        passwordValidation.minLength ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <span className={`text-xs ${
                        passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'
                      }`}>최소 6자 이상</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        passwordValidation.hasLetter ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <span className={`text-xs ${
                        passwordValidation.hasLetter ? 'text-green-600' : 'text-gray-500'
                      }`}>영문 포함</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        passwordValidation.hasNumber ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <span className={`text-xs ${
                        passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'
                      }`}>숫자 포함</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        passwordValidation.hasSpecial ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <span className={`text-xs ${
                        passwordValidation.hasSpecial ? 'text-green-600' : 'text-gray-500'
                      }`}>특수문자 포함</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                새 비밀번호 확인
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="새 비밀번호를 다시 입력하세요"
                  disabled={passwordLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={passwordLoading}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              {/* 비밀번호 일치 확인 */}
              {confirmPassword && (
                <div className="mt-2 flex items-center space-x-2">
                  {newPassword === confirmPassword ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600">비밀번호가 일치합니다</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600">비밀번호가 일치하지 않습니다</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-medium text-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {passwordLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  변경 중...
                </>
              ) : (
                <>
                  <Lock size={20} />
                  비밀번호 변경
                </>
              )}
            </button>
          </form>

          {/* 보안 팁 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <h3 className="text-sm font-medium text-blue-900 mb-2">보안 팁</h3>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 다른 사이트에서 사용하지 않는 고유한 비밀번호를 사용하세요</li>
              <li>• 개인정보나 생년월일을 포함하지 마세요</li>
              <li>• 정기적으로 비밀번호를 변경하세요</li>
            </ul>
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