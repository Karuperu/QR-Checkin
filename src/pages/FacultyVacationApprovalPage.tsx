import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User, FileText, LogOut
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getPendingVacationRequests,
  updateVacationRequestStatus,
  getUserGroups,
  supabase
} from '../lib/supabase'
import type { VacationRequest, Group } from '../types'

export default function FacultyVacationApprovalPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  // const [_showModal, setShowModal] = useState(false) // 사용하지 않음
  const [reviewComment, setReviewComment] = useState('')
  const [reviewing, setReviewing] = useState(false)

  // 데이터 상태
  const [_userGroups, setUserGroups] = useState<Group[]>([])
  // const [selectedGroup, setSelectedGroup] = useState<Group | null>(null) // 사용하지 않음
  const [pendingCount, setPendingCount] = useState(0)
  
  // 인증 확인
  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
  }, [user, navigate])

  // 데이터 로드
  useEffect(() => {
    if (!user) return
    
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)

      if (user.role === 'faculty') {
        // 교수: 관리하는 그룹들의 대기 중인 휴가 신청 조회
        const groups = await getUserGroups(user.id)
    
        setUserGroups(groups)
        
        if (groups.length > 0) {
  
          
          // 모든 그룹의 휴가 신청을 조회
          const allPendingRequests = []
          for (const group of groups) {
    
            
            // 그룹의 멤버 수 확인
            const { data: _members } = await supabase
              .from('group_memberships')
              .select('user_id')
              .eq('group_id', group.id)
            
    
            
            const pending = await getPendingVacationRequests(group.id)
    
            allPendingRequests.push(...pending)
          }
          
  
          setVacationRequests(allPendingRequests)
          setPendingCount(allPendingRequests.length)
          
          // 첫 번째 그룹을 선택된 그룹으로 설정
          // setSelectedGroup(groups[0]) // 사용하지 않음
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: '데이터를 불러오는데 실패했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'annual': return '휴가'
      case 'sick': return '병가'
      case 'personal': return '개인사정'
      case 'official': return '공무'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'annual': return 'bg-blue-100 text-blue-800'
      case 'sick': return 'bg-red-100 text-red-800'
      case 'personal': return 'bg-purple-100 text-purple-800'
      case 'official': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // const getStatusLabel = (status: string) => {
  //   switch (status) {
  //     case 'pending': return '대기중'
  //     case 'approved': return '승인'
  //     case 'rejected': return '거절'
  //     default: return status
  //   }
  // }

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case 'pending': return 'bg-blue-100 text-blue-800'
  //     case 'approved': return 'bg-green-100 text-green-800'
  //     case 'rejected': return 'bg-red-100 text-red-800'
  //     default: return 'bg-gray-100 text-gray-800'
  //   }
  // }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR')
  }

  const getDaysDifference = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user) return

    setReviewing(true)
    
    try {
      await updateVacationRequestStatus(requestId, status, user.id, reviewComment)
      
      setMessage({ 
        type: 'success', 
        text: `휴가 신청이 ${status === 'approved' ? '승인' : '거절'}되었습니다.` 
      })
      setSelectedRequest(null)
      setReviewComment('')
      
      // 목록 새로고침
      await loadData()

    } catch (error) {
      setMessage({ type: 'error', text: '처리 중 오류가 발생했습니다.' })
    } finally {
      setReviewing(false)
    }
  }



  if (!user) {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">데이터를 불러오는 중...</p>
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
              onClick={() => navigate('/faculty-attendance')}
              className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 flex-shrink-0"
            >
              {/* ArrowLeft icon removed */}
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-800">휴가 승인 관리</h1>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-800">{user?.name || '교수님'}</div>
                <div className="text-gray-500">교직원</div>
              </div>
            </div>
            <button 
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="p-2 text-gray-600 hover:text-red-600 rounded-lg"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-4 space-y-4">
        {/* 메시지 */}
        {message && (
          <div className={`p-4 rounded-xl flex items-center space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {/* CheckCircle icon removed */}
            {/* XCircle icon removed */}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* 통계 카드 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              {/* Plane icon removed */}
              휴가 승인 현황
            </h2>
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">{pendingCount}</div>
              <div className="text-xs text-gray-600">대기중</div>
            </div>
          </div>
          
                     <div className="grid grid-cols-3 gap-3">
             <div className="bg-blue-50 rounded-lg p-3 text-center">
               <div className="text-lg font-bold text-blue-600">휴가</div>
               <div className="text-xs text-blue-600">일반 휴가</div>
             </div>
             <div className="bg-red-50 rounded-lg p-3 text-center">
               <div className="text-lg font-bold text-red-600">병가</div>
               <div className="text-xs text-red-600">질병 휴가</div>
             </div>
             <div className="bg-purple-50 rounded-lg p-3 text-center">
               <div className="text-lg font-bold text-purple-600">개인사정</div>
               <div className="text-xs text-purple-600">기타 사유</div>
             </div>
           </div>
        </div>

        {/* 대기 중인 휴가 신청 목록 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              {/* AlertCircle icon removed */}
              대기 중인 휴가 신청 ({pendingCount}건)
            </h3>
          </div>
          
          {vacationRequests.length === 0 ? (
            <div className="text-center py-8">
              {/* Plane icon removed */}
              <p className="text-gray-500 text-sm">대기 중인 휴가 신청이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vacationRequests.map((request) => (
                <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  {/* 상단 정보 */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg font-semibold text-gray-900 truncate">
                          {request.user?.name} ({request.user?.user_id})
                        </h4>
                        <p className="text-sm text-gray-600">{request.user?.department} • {request.group?.name}</p>
                      </div>
                    </div>
                                         <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${getTypeColor(request.vacation_type)}`}>
                       {getTypeLabel(request.vacation_type)}
                     </span>
                  </div>
                  
                  {/* 세부 정보 */}
                  <div className="space-y-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-700">휴가 기간</span>
                        <p className="text-base text-gray-900 mt-1">
                          {formatDate(request.start_date)} ~ {formatDate(request.end_date)}
                          <span className="text-sm text-gray-500 ml-2">
                            ({getDaysDifference(request.start_date, request.end_date)}일)
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">신청일</span>
                        <p className="text-base text-gray-900 mt-1">{formatDate(request.created_at)}</p>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">신청 사유</span>
                      <p className="text-base text-gray-900 mt-2 bg-gray-50 p-4 rounded-lg break-words leading-relaxed">{request.reason}</p>
                    </div>
                  </div>
                  
                  {/* 액션 버튼 */}
                  {selectedRequest === request.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          검토 의견 (선택사항)
                        </label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                          placeholder="검토 의견을 입력해주세요..."
                        />
                      </div>
                      <div className="flex flex-col space-y-2">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleReviewRequest(request.id, 'approved')}
                            disabled={reviewing}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                          >
                            {/* CheckCircle icon removed */}
                            승인
                          </button>
                          <button
                            onClick={() => handleReviewRequest(request.id, 'rejected')}
                            disabled={reviewing}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                          >
                            {/* XCircle icon removed */}
                            거절
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedRequest(null)
                            setReviewComment('')
                          }}
                          className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedRequest(request.id)}
                      className="w-full py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-base font-medium"
                    >
                      <FileText className="w-5 h-5" />
                      검토하기
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
