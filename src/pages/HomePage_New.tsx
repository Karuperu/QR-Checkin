import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, User, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Building2, GraduationCap } from 'lucide-react'

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRoleSelect = (role: 'student' | 'faculty') => {
    setFormData(prev => ({ ...prev, role }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    // 실제 로그인/회원가입 로직은 여기에 구현
    setTimeout(() => {
      setMessage({ type: 'success', text: '로그인 성공!' })
      setIsLoading(false)
      setTimeout(() => {
        navigate('/attendance')
      }, 1000)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <div className="bg-white rounded-full p-4 w-20 h-20 mx-auto mb-6 shadow-lg">
          <Clock className="w-12 h-12 text-blue-600 mx-auto" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">QR 출퇴근</h1>
        <p className="text-gray-600">간편하고 정확한 출퇴근 관리</p>
      </div>

      {/* 메인 카드 */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* 탭 헤더 */}
        <div className="flex bg-gray-50">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-4 px-6 font-medium transition-all ${
              isLogin 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-4 px-6 font-medium transition-all ${
              !isLogin 
                ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            회원가입
          </button>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 회원가입시 역할 선택 */}
            {!isLogin && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">구분</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('student')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                      formData.role === 'student'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <GraduationCap className="w-8 h-8 mb-2" />
                    <span className="font-medium">학생</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRoleSelect('faculty')}
                    className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center ${
                      formData.role === 'faculty'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Building2 className="w-8 h-8 mb-2" />
                    <span className="font-medium">교직원</span>
                  </button>
                </div>
              </div>
            )}

            {/* 아이디 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                {isLogin ? '아이디' : formData.role === 'student' ? '학번' : '교원번호'}
              </label>
              <input
                type="text"
                name="user_id"
                value={formData.user_id}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={isLogin ? '아이디를 입력하세요' : formData.role === 'student' ? '학번을 입력하세요' : '교원번호를 입력하세요'}
              />
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Lock className="inline w-4 h-4 mr-1" />
                비밀번호
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* 회원가입 추가 정보 */}
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="이름을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">소속</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="소속을 입력하세요 (예: 컴퓨터공학과)"
                  />
                </div>
              </>
            )}

            {/* 메시지 표시 */}
            {message && (
              <div className={`flex items-center gap-3 p-4 rounded-xl ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                )}
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-medium text-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          {/* 하단 링크 */}
          {isLogin && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                계정이 없으신가요? 
                <button
                  onClick={() => setIsLogin(false)}
                  className="text-blue-600 hover:text-blue-700 font-medium ml-1"
                >
                  회원가입
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>QR 코드로 간편하게 출퇴근을 기록하세요</p>
        <p className="mt-1">위치 기반 정확한 출석 체크</p>
      </div>
    </div>
  )
} 