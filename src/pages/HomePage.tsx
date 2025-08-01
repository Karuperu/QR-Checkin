import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, User, Lock, Eye, EyeOff, AlertCircle, CheckCircle, Building2, GraduationCap } from 'lucide-react'

export default function HomePage() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [selectedRole, setSelectedRole] = useState<'student' | 'faculty'>('student')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    password: '',
    confirmPassword: '',
    department: ''
  })
  const [errors, setErrors] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState('')

  // 더미 계정 데이터
  const accounts = {
    student: {
      userId: 'student',
      password: '1234',
      name: '김학생',
      department: '컴퓨터공학과'
    },
    faculty: {
      userId: 'faculty',
      password: '1234',
      name: '손봉기 교수님',
      department: '컴퓨터공학과'
    }
  }

  const validateForm = () => {
    const newErrors: string[] = []
    
    if (!formData.userId.trim()) {
      newErrors.push('사용자 ID를 입력해주세요.')
    }
    
    if (!formData.password) {
      newErrors.push('비밀번호를 입력해주세요.')
    }
    
    if (!isLogin) {
      if (!formData.name.trim()) {
        newErrors.push('이름을 입력해주세요.')
      }
      
      if (!formData.department.trim()) {
        newErrors.push('학과를 입력해주세요.')
      }
      
      if (formData.password !== formData.confirmPassword) {
        newErrors.push('비밀번호가 일치하지 않습니다.')
      }
      
      if (formData.password.length < 4) {
        newErrors.push('비밀번호는 4자 이상이어야 합니다.')
      }
    }
    
    return newErrors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors([])
    setSuccess('')
    
    const validationErrors = validateForm()
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    
    setIsLoading(true)
    
    // 시뮬레이션 딜레이
    setTimeout(() => {
      if (isLogin) {
        // 로그인 처리 - ID/비밀번호로 자동 구분
        const studentAccount = accounts.student
        const facultyAccount = accounts.faculty
        
        let userRole: 'student' | 'faculty' | null = null
        
        if (formData.userId === studentAccount.userId && formData.password === studentAccount.password) {
          userRole = 'student'
        } else if (formData.userId === facultyAccount.userId && formData.password === facultyAccount.password) {
          userRole = 'faculty'
        }
        
        if (userRole) {
          setSuccess('로그인 성공!')
          setTimeout(() => {
            // 역할에 따라 다른 페이지로 이동
            if (userRole === 'student') {
              navigate('/attendance')
            } else {
              navigate('/faculty-attendance')
            }
          }, 1000)
        } else {
          setErrors(['아이디 또는 비밀번호가 올바르지 않습니다.'])
        }
      } else {
        // 회원가입 처리
        setSuccess('회원가입이 완료되었습니다!')
        setTimeout(() => {
          setIsLogin(true)
          setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }))
          setSuccess('')
        }, 2000)
      }
      setIsLoading(false)
    }, 1500)
  }

  const fillDemoCredentials = () => {
    // 기본적으로 학생 계정으로 설정
    const account = accounts.student
    setFormData(prev => ({
      ...prev,
      userId: account.userId,
      password: account.password,
      ...(isLogin ? {} : { 
        name: account.name, 
        department: account.department,
        confirmPassword: account.password
      })
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 및 제목 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">QR 출퇴근</h1>
          <p className="text-gray-600">간편하고 정확한 출석 관리</p>
        </div>

        {/* 메인 카드 */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* 탭 전환 */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 px-4 rounded-xl text-center transition-all font-medium ${
                isLogin
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 px-4 rounded-xl text-center transition-all font-medium ${
                !isLogin
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              회원가입
            </button>
          </div>

          {/* 역할 선택 (회원가입시만) */}
          {!isLogin && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-3">역할 선택</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('student')}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    selectedRole === 'student'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <GraduationCap className={`w-8 h-8 mx-auto mb-2 ${
                    selectedRole === 'student' ? 'text-blue-600' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    selectedRole === 'student' ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    학생
                  </span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setSelectedRole('faculty')}
                  className={`p-4 rounded-2xl border-2 transition-all ${
                    selectedRole === 'faculty'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building2 className={`w-8 h-8 mx-auto mb-2 ${
                    selectedRole === 'faculty' ? 'text-purple-600' : 'text-gray-400'
                  }`} />
                  <span className={`text-sm font-medium ${
                    selectedRole === 'faculty' ? 'text-purple-600' : 'text-gray-600'
                  }`}>
                    교직원
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 데모 계정 안내 */}
          <div className="mb-6 p-4 bg-blue-50 rounded-2xl">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 mb-1">데모 계정</p>
                <div className="text-xs text-blue-600 mb-2 space-y-1">
                  <p>학생: ID = student, PW = 1234</p>
                  <p>교직원: ID = faculty, PW = 1234</p>
                </div>
                <button
                  onClick={fillDemoCredentials}
                  className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                >
                  학생 계정 자동 입력
                </button>
              </div>
            </div>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 사용자 ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {!isLogin && selectedRole === 'student' ? '학번' : !isLogin && selectedRole === 'faculty' ? '교직원 ID' : '사용자 ID'}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.userId}
                  onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full px-3 py-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={!isLogin && selectedRole === 'student' ? '학번을 입력하세요' : !isLogin && selectedRole === 'faculty' ? '교직원 ID를 입력하세요' : '사용자 ID를 입력하세요'}
                />
              </div>
            </div>

            {/* 이름 (회원가입시만) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="이름을 입력하세요"
                />
              </div>
            )}

            {/* 학과 (회원가입시만) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {selectedRole === 'student' ? '학과' : '소속'}
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder={selectedRole === 'student' ? '학과를 입력하세요' : '소속을 입력하세요'}
                />
              </div>
            )}

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-3 pl-10 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="비밀번호를 입력하세요"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 비밀번호 확인 (회원가입시만) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호 확인</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-3 py-3 pl-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                </div>
              </div>
            )}

            {/* 에러 메시지 */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium text-red-800">오류가 발생했습니다</span>
                </div>
                <ul className="text-sm text-red-700 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 성공 메시지 */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-800">{success}</span>
                </div>
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>}
              <span>{isLoading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}</span>
            </button>
          </form>
        </div>

        {/* 푸터 */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            QR 출퇴근 시스템 • 안전하고 편리한 출석 관리
          </p>
        </div>
      </div>
    </div>
  )
}