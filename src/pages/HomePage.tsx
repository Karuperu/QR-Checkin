import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, User, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { loginUser, registerUser, getCurrentUser, validatePassword, validateUserId } from '../lib/supabase'

export default function HomePage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    user_id: '',
    password: '',
    name: '',
    department: '',
    role: 'student' as 'student' | 'faculty'
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    const currentUser = getCurrentUser()
    if (currentUser) {
      if (currentUser.role === 'faculty') {
        navigate('/attendance?tab=records')
      } else {
        navigate('/attendance')
      }
    }
  }, [navigate])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      if (isLogin) {
        // 로그인
        const user = await loginUser(formData.user_id, formData.password)
        if (user) {
          setMessage({ type: 'success', text: '로그인 성공!' })
          setTimeout(() => {
            if (user.role === 'faculty') {
              navigate('/attendance?tab=records')
            } else {
              navigate('/attendance')
            }
          }, 1000)
        } else {
          setMessage({ type: 'error', text: '사용자 ID 또는 비밀번호가 올바르지 않습니다.' })
        }
      } else {
        // 회원가입 유효성 검사
        const userIdValidation = validateUserId(formData.user_id, formData.role)
        if (!userIdValidation.isValid) {
          setMessage({ type: 'error', text: userIdValidation.error || '사용자 ID가 올바르지 않습니다.' })
          return
        }

        const passwordValidation = validatePassword(formData.password)
        if (!passwordValidation.isValid) {
          setMessage({ type: 'error', text: passwordValidation.errors.join(' ') })
          return
        }

        // 회원가입
        const user = await registerUser(
          formData.user_id,
          formData.name,
          formData.department,
          formData.role,
          formData.password
        )

        if (user) {
          setMessage({ type: 'success', text: '회원가입이 완료되었습니다. 로그인해주세요.' })
          setIsLogin(true)
          setFormData({
            user_id: '',
            password: '',
            name: '',
            department: '',
            role: 'student'
          })
        } else {
          setMessage({ type: 'error', text: '회원가입에 실패했습니다. 이미 등록된 사용자 ID일 수 있습니다.' })
        }
      }
    } catch (error) {
      console.error('Authentication error:', error)
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : '오류가 발생했습니다.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // const getRoleLabel = (role: string) => {
  //   switch (role) {
  //     case 'student':
  //       return '학생'
  //     case 'faculty':
  //       return '교직원'
  //     default:
  //       return role
  //   }
  // }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {isLogin && (
          <div className="text-center mb-8">
            <Clock className="w-16 h-16 text-black mx-auto mb-4" />
            <h1 className="text-4xl font-light text-black mb-2">QR 출퇴근 시스템</h1>
            <p className="text-gray-900">간편한 QR 코드 기반 출퇴근 관리</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* 탭 메뉴 */}
          <div className="border-b border-gray-200">
            <nav className="flex">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  isLogin
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                로그인
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  !isLogin
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                회원가입
              </button>
            </nav>
          </div>

          <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 사용자 ID */}
              <div>
                <label htmlFor="user_id" className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="inline w-4 h-4 mr-1" />
                  {isLogin ? '사용자 ID' : '사용자 ID (학번/교원번호)'}
                </label>
                <input
                  type="text"
                  id="user_id"
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleInputChange}
                  required
                  className="input-field"
                  placeholder={isLogin ? '사용자 ID를 입력하세요' : '학번 또는 교원번호를 입력하세요'}
                />
              </div>

              {/* 비밀번호 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="inline w-4 h-4 mr-1" />
                  비밀번호
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="input-field pr-10"
                    placeholder="비밀번호를 입력하세요"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* 회원가입 추가 필드 */}
              {!isLogin && (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      이름
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder="이름을 입력하세요"
                    />
                  </div>

                  <div>
                    <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                      소속
                    </label>
                    <input
                      type="text"
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                      placeholder="소속을 입력하세요 (예: 컴퓨터공학과)"
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      구분
                    </label>
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                      className="input-field"
                    >
                      <option value="student">학생</option>
                      <option value="faculty">교직원</option>

                    </select>
                  </div>
                </>
              )}

              {/* 메시지 표시 */}
              {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                  message.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              {/* 제출 버튼 */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    처리 중...
                  </>
                ) : (
                  <>
                    {isLogin ? '로그인' : '회원가입'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
} 