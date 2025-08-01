import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, Save, AlertCircle, CheckCircle } from 'lucide-react'
import {
  getCurrentUser,
  loadWorkTimeSettings,
  saveWorkTimeSettings,
  validateWorkTimeSettings,
  type User,
  type WorkTimeSettings
} from '../lib/supabase'

export default function WorkTimeSettingsPage() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  // 초기값을 저장된 설정에서 가져오기
  const initialSettings = loadWorkTimeSettings()
  const [settings, setSettings] = useState<Omit<WorkTimeSettings, 'operating_start_hour' | 'operating_end_hour'>>({
    checkin_deadline_hour: initialSettings.checkin_deadline_hour,
    checkout_start_hour: initialSettings.checkout_start_hour
  })
  const [errors, setErrors] = useState<string[]>([])
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const initializeUser = async () => {
      const user = getCurrentUser()
      if (!user || user.role !== 'faculty') {
        navigate('/') // 교직원이 아니면 메인 페이지로 리다이렉트
        return
      }
      setCurrentUser(user)
      
      // 설정은 이미 초기값으로 로드됨
    }
    
    initializeUser()
  }, [navigate])

  const handleTimeChange = (field: 'checkin_deadline_hour' | 'checkout_start_hour', value: string) => {
    const numValue = parseInt(value, 10)
    if (isNaN(numValue) || numValue < 0 || numValue > 23) return

    setSettings(prev => ({
      ...prev,
      [field]: numValue
    }))
    
    // 에러 메시지 클리어
    setErrors([])
    setSuccessMessage('')
  }

  const handleSave = () => {
    setIsLoading(true)
    setErrors([])
    setSuccessMessage('')

    // 운영시간 필드 없이 검증
    const validation = validateWorkTimeSettings({
      ...settings,
      operating_start_hour: 0,
      operating_end_hour: 23
    })
    
    if (!validation.isValid) {
      setErrors(validation.errors)
      setIsLoading(false)
      return
    }

    try {
      const success = saveWorkTimeSettings({
        ...settings,
        operating_start_hour: 0,
        operating_end_hour: 23
      })
      
      if (success) {
        setSuccessMessage('출퇴근 시간 설정이 저장되었습니다.')
      } else {
        setErrors(['설정 저장 중 오류가 발생했습니다.'])
      }
      
      // 3초 후 성공 메시지 제거
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      setErrors(['설정 저장 중 오류가 발생했습니다.'])
    } finally {
      setIsLoading(false)
    }
  }

  const formatHour = (hour: number): string => {
    return `${hour.toString().padStart(2, '0')}:00`
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={20} />
            메인으로 돌아가기
          </Link>
          
          <div className="flex items-center gap-2 text-black">
            <Clock className="w-6 h-6" />
            <h1 className="text-xl font-bold">출퇴근 시간 설정</h1>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          {/* 안내 메시지 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-blue-800">
                <p className="font-medium mb-2">출퇴근 시간 설정 안내</p>
                <ul className="text-sm space-y-1">
                  <li>• 출근 마감 시간 전까지는 '출근'으로 처리됩니다.</li>
                  <li>• 퇴근 시작 시간 이후로는 '퇴근'으로 처리됩니다.</li>
                  <li>• 출근 마감~퇴근 시작 시간 사이에는 출근 시 '지각'으로 처리됩니다.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 성공 메시지 */}
          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle size={20} />
                <span>{successMessage}</span>
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {errors.length > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={20} />
                <span className="font-medium">설정 오류</span>
              </div>
              <ul className="text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 설정 폼 */}
          <div className="space-y-6">
            {/* 출근 마감 시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                출근 마감 시간
              </label>
              <div className="flex items-center gap-4">
                <select
                  value={settings.checkin_deadline_hour}
                  onChange={(e) => handleTimeChange('checkin_deadline_hour', e.target.value)}
                  className="input-field max-w-32"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {formatHour(i)}
                    </option>
                  ))}
                </select>
                <span className="text-gray-600">
                  전까지는 <span className="font-medium text-green-600">출근</span>으로 처리
                </span>
              </div>
            </div>

            {/* 퇴근 시작 시간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                퇴근 시작 시간
              </label>
              <div className="flex items-center gap-4">
                <select
                  value={settings.checkout_start_hour}
                  onChange={(e) => handleTimeChange('checkout_start_hour', e.target.value)}
                  className="input-field max-w-32"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {formatHour(i)}
                    </option>
                  ))}
                </select>
                <span className="text-gray-600">
                  이후로는 <span className="font-medium text-blue-600">퇴근</span>으로 처리
                </span>
              </div>
            </div>

            {/* 저장 버튼 */}
            <div className="pt-6">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <Save size={20} />
                )}
                {isLoading ? '저장 중...' : '설정 저장'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 