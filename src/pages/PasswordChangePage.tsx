import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function PasswordChangePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // 입력 검증
      if (!currentPassword || !newPassword || !confirmPassword) {
        setMessage('모든 필드를 입력해주세요.')
        setMessageType('error')
        return
      }

      if (newPassword !== confirmPassword) {
        setMessage('새 비밀번호가 일치하지 않습니다.')
        setMessageType('error')
        return
      }

      if (newPassword.length < 6) {
        setMessage('새 비밀번호는 최소 6자 이상이어야 합니다.')
        setMessageType('error')
        return
      }

      if (currentPassword === newPassword) {
        setMessage('새 비밀번호는 현재 비밀번호와 달라야 합니다.')
        setMessageType('error')
        return
      }

      // 현재 사용자 정보 확인
      if (!user) {
        setMessage('사용자 정보를 가져올 수 없습니다.')
        setMessageType('error')
        return
      }

      // 안전한 RPC를 통해 비밀번호 변경 시도 (RLS 우회, 본인 확인 포함)
      const { data: changed, error: rpcError } = await supabase.rpc('change_user_password', {
        p_user_id: user.user_id,
        p_old_password: currentPassword,
        p_new_password: newPassword
      })

      if (rpcError) {
        console.error('비밀번호 변경 RPC 오류:', rpcError)
        setMessage('비밀번호 변경에 실패했습니다. 다시 시도해주세요.')
        setMessageType('error')
        return
      }

      if (!changed) {
        setMessage('현재 비밀번호가 올바르지 않습니다.')
        setMessageType('error')
        return
      }

      // 성공 처리
      setMessage('비밀번호가 성공적으로 변경되었습니다.')
      setMessageType('success')

      // 폼 초기화
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // 3초 후 이전 페이지로 이동
      setTimeout(() => {
        navigate(-1)
      }, 3000)

    } catch (error) {
      setMessage('오류가 발생했습니다. 다시 시도해주세요.')
      setMessageType('error')
    } finally {
      setLoading(false)
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로그인 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">비밀번호 변경</h1>
              <p className="text-sm text-gray-600">{user.name} • {user.department}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">비밀번호 변경</h2>
              <p className="text-sm text-gray-600">안전한 비밀번호로 변경하세요</p>
            </div>

            {/* 메시지 표시 */}
            {message && (
              <div className={`mb-4 p-3 rounded-lg flex items-center space-x-2 ${
                messageType === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {messageType === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span className="text-sm">{message}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {/* 비밀번호 강도 표시 */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
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
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    disabled={loading}
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
                disabled={loading || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>변경 중...</span>
                  </div>
                ) : (
                  '비밀번호 변경'
                )}
              </button>
            </form>

            {/* 보안 팁 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">보안 팁</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• 다른 사이트에서 사용하지 않는 고유한 비밀번호를 사용하세요</li>
                <li>• 개인정보나 생년월일을 포함하지 마세요</li>
                <li>• 정기적으로 비밀번호를 변경하세요</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
