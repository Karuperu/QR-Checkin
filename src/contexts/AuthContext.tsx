import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { login as loginUser, signup as signupUser } from '../lib/supabase'
import type { User } from '../types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (userId: string, password: string) => Promise<User>
  logout: () => Promise<void>
  signup: (userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string }) => Promise<User>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 사용자 정보 갱신 함수
  const refreshUser = async () => {
    if (!user) {
      console.log('🔄 사용자 갱신: 로그인되지 않은 상태')
      return
    }

    try {
      console.log(`🔄 사용자 갱신 시작: ${user.user_id} (${user.role})`)
      
      // 기존 supabase 클라이언트 사용 (새로 생성하지 않음)
      const { supabase } = await import('../lib/supabase')

      // 모든 사용자 정보는 users 테이블에서 가져옴
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', user.user_id)
        .single()
      
      if (error) {
        console.error('❌ 사용자 정보 갱신 실패:', error)
        return
      }
      
      const userData = { ...user, ...data }
      // console.log(`✅ 사용자 정보 갱신 완료: ${userData.user_id} (${userData.role})`) // 로그 제거

      if (userData) {
        setUser(userData)
        // 로컬 스토리지 업데이트
        localStorage.setItem('auth_user', JSON.stringify(userData))
        // console.log(`📝 로컬 스토리지 업데이트: ${userData.user_id}`) // 로그 제거
      }
    } catch (error) {
      console.error('❌ 사용자 갱신 중 오류 발생:', error)
    }
  }

  useEffect(() => {
    // 로컬 스토리지에서 사용자 정보 복원
    const restoreUserSession = () => {
      try {
        const savedUser = localStorage.getItem('auth_user')
        const loginTime = localStorage.getItem('auth_login_time')
        
        if (savedUser && loginTime) {
          const userData = JSON.parse(savedUser)
          const loginTimestamp = parseInt(loginTime)
          const currentTime = Date.now()
          const sessionDuration = 24 * 60 * 60 * 1000 // 24시간
          
          // 세션이 만료되었는지 확인
          if (currentTime - loginTimestamp > sessionDuration) {
            // 세션 만료
            console.log('⏰ 세션 만료됨')
            localStorage.removeItem('auth_user')
            localStorage.removeItem('auth_login_time')
          } else {
            setUser(userData)
            console.log(`🔐 세션 복원: ${userData.user_id} (${userData.role})`)
          }
        }
      } catch (error) {
        // 사용자 세션 복원 실패
        console.error('❌ 세션 복원 실패:', error)
        localStorage.removeItem('auth_user')
        localStorage.removeItem('auth_login_time')
      } finally {
        setLoading(false)
      }
    }

    restoreUserSession()
  }, [])

  // 60초마다 사용자 정보 갱신 (1분)
  useEffect(() => {
    if (!user) return

    // 60초마다 갱신
    const interval = setInterval(() => {
      refreshUser()
    }, 60000) // 60초

    return () => {
      clearInterval(interval)
    }
  }, [user])

  const login = async (userId: string, password: string) => {
    try {
      console.log(`🔑 로그인 시도: ${userId}`)
      const userData = await loginUser(userId, password)
      setUser(userData)
      // 로컬 스토리지에 사용자 정보와 로그인 시간 저장
      localStorage.setItem('auth_user', JSON.stringify(userData))
      localStorage.setItem('auth_login_time', Date.now().toString())
      console.log(`✅ 로그인 성공: ${userData.user_id} (${userData.role})`)
      return userData
    } catch (error) {
      console.error('❌ 로그인 실패:', error)
      throw error
    }
  }

  const signup = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'> & { password: string }) => {
    try {
      console.log(`📝 회원가입 시도: ${userData.user_id}`)
      const newUser = await signupUser(userData)
      setUser(newUser)
      // 로컬 스토리지에 사용자 정보와 로그인 시간 저장
      localStorage.setItem('auth_user', JSON.stringify(newUser))
      localStorage.setItem('auth_login_time', Date.now().toString())
      console.log(`✅ 회원가입 성공: ${newUser.user_id} (${newUser.role})`)
      return newUser
    } catch (error) {
      console.error('❌ 회원가입 실패:', error)
      throw error
    }
  }

  const logout = async () => {
    console.log(`🚪 로그아웃: ${user?.user_id}`)
    setUser(null)
    // 로컬 스토리지에서 사용자 정보 및 로그인 시간 제거
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_login_time')
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    signup,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}