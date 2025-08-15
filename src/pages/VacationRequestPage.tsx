import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, FileText, CheckCircle, XCircle, 
  Plus, Bell, LogOut, User as UserIcon, Plane, Clock
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { 
  createVacationRequest,
  getUserVacationRequests,
  getPendingVacationRequests,
  updateVacationRequestStatus,
  getUserGroups,
  getPendingVacationRequestsCount,
  getKSTNow,
  supabase
} from '../lib/supabase'
import type { VacationRequest as VacationRequestType, Group } from '../types'

// VacationRequest 타입은 types/index.ts에서 import

export default function VacationRequestPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'pending'>('list')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // 데이터 상태
  const [vacationRequests, setVacationRequests] = useState<VacationRequestType[]>([])
  const [pendingRequests, setPendingRequests] = useState<VacationRequestType[]>([])
  const [userGroups, setUserGroups] = useState<Group[]>([])
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    requestType: 'annual' as 'annual' | 'sick' | 'personal' | 'official'
  })
  
  const [reviewingRequest, setReviewingRequest] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  


  // 인증 확인
  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
  }, [user, navigate])

  // 역할별 초기 탭 설정
  useEffect(() => {
    if (user?.role === 'faculty') {
      setActiveTab('pending')
    }
  }, [user])

  // 데이터 로드
  useEffect(() => {
    if (!user) return
    
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return

    try {
      setLoading(true)

      if (user.role === 'student') {
        // 학생: 자신의 휴가 신청 목록 조회
        const requests = await getUserVacationRequests(user.id)
        setVacationRequests(requests)

        // 소속 그룹 조회 (휴가 신청시 필요)
        const groups = await getUserGroups(user.id)
        setUserGroups(groups)
        if (groups.length > 0) {
          setSelectedGroup(groups[0])
        }

      } else if (user.role === 'faculty') {
        // 교수: 관리하는 그룹들의 대기 중인 휴가 신청 조회
        const groups = await getUserGroups(user.id)
        setUserGroups(groups)
        
        if (groups.length > 0) {
          // 모든 그룹의 휴가 신청을 조회
          const allPendingRequests = []
          for (const group of groups) {
            // 그룹의 멤버 수 확인
            const { data: members } = await supabase
              .from('group_memberships')
              .select('user_id')
              .eq('group_id', group.id)
            
            const pending = await getPendingVacationRequests(group.id)
            allPendingRequests.push(...pending)
          }
          
          setPendingRequests(allPendingRequests)
          setPendingCount(allPendingRequests.length)
          
          // 첫 번째 그룹을 선택된 그룹으로 설정
          setSelectedGroup(groups[0])
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



  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '대기중'
      case 'approved': return '승인'
      case 'rejected': return '거절'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-blue-100 text-blue-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

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

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    if (!user || !selectedGroup) {
      setMessage({ type: 'error', text: '사용자 정보 또는 그룹 정보가 없습니다.' })
      setSubmitting(false)
      return
    }

    // 유효성 검증
    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      setMessage({ type: 'error', text: '모든 필드를 입력해주세요.' })
      setSubmitting(false)
      return
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setMessage({ type: 'error', text: '종료일은 시작일보다 늦어야 합니다.' })
      setSubmitting(false)
      return
    }

    try {
      await createVacationRequest({
        user_id: user.id,
        group_id: selectedGroup.id,
        vacation_type: formData.requestType,
        start_date: formData.startDate,
        end_date: formData.endDate,
        reason: formData.reason
      })

      setMessage({ type: 'success', text: '휴가 신청이 성공적으로 제출되었습니다.' })
      setFormData({
        startDate: '',
        endDate: '',
        reason: '',
        requestType: 'annual'
      })
      setActiveTab('list')
      
      // 목록 새로고침
      await loadData()

    } catch (error) {
      setMessage({ type: 'error', text: '휴가 신청에 실패했습니다.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!user) return

    setSubmitting(true)
    
    try {
      await updateVacationRequestStatus(requestId, status, user.id, reviewComment)
      
      setMessage({ 
        type: 'success', 
        text: `휴가 신청이 ${status === 'approved' ? '승인' : '거절'}되었습니다.` 
      })
      setReviewingRequest(null)
      setReviewComment('')
      
      // 목록 새로고침
      await loadData()

    } catch (error) {
      setMessage({ type: 'error', text: '처리 중 오류가 발생했습니다.' })
    } finally {
      setSubmitting(false)
    }
  }

  const getPendingRequests = () => {
    return pendingRequests
  }

  const getMyRequests = () => {
    return vacationRequests
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
            <button onClick={() => navigate(user.role === 'faculty' ? '/faculty-attendance' : '/student-attendance')} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-800">휴가 관리</h1>
              <p className="text-sm text-gray-600">휴가 신청 및 관리</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-800">{user?.name || '사용자'}</div>
                <div className="text-gray-500">{user?.role === 'faculty' ? '교직원' : '학생'}</div>
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

      <div className="p-4">
        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-2xl shadow-sm mb-6">
          <div className="flex border-b border-gray-200">
            {user?.role === 'student' && (
              <>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 py-4 px-6 text-center transition-colors ${
                    activeTab === 'list'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <FileText size={20} />
                    <span className="text-sm font-medium">내 신청</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('create')}
                  className={`flex-1 py-4 px-6 text-center transition-colors ${
                    activeTab === 'create'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <Plus size={20} />
                    <span className="text-sm font-medium">신청하기</span>
                  </div>
                </button>
              </>
            )}
            
            {user?.role === 'faculty' && (
              <>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`flex-1 py-4 px-6 text-center transition-colors relative ${
                    activeTab === 'pending'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <div className="relative">
                      <Bell size={20} />
                      {pendingCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {pendingCount}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium">대기중</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('list')}
                  className={`flex-1 py-4 px-6 text-center transition-colors ${
                    activeTab === 'list'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <div className="flex flex-col items-center space-y-1">
                    <FileText size={20} />
                    <span className="text-sm font-medium">전체 신청</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 메시지 */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center space-x-3 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle size={20} />
            ) : (
              <XCircle size={20} />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="space-y-6">
          {/* 휴가 신청 폼 */}
          {activeTab === 'create' && user?.role === 'student' && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Plane className="w-6 h-6 mr-3 text-blue-600" />
                새 휴가 신청
              </h2>
              
              <form onSubmit={handleSubmitRequest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      신청 종류
                    </label>
                    <select
                      value={formData.requestType}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        requestType: e.target.value as 'annual' | 'sick' | 'personal'
                      }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="annual">휴가</option>
                      <option value="sick">병가</option>
                      <option value="personal">개인사정</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        시작일
                      </label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          startDate: e.target.value
                        }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        종료일
                      </label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          endDate: e.target.value
                        }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    신청 사유
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      reason: e.target.value
                    }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    placeholder="휴가 신청 사유를 상세히 입력해주세요..."
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    <span>{submitting ? '신청 중...' : '신청하기'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 대기 중인 신청 (교직원용) */}
          {activeTab === 'pending' && user?.role === 'faculty' && (
            <div>
                             <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-bold text-gray-800 flex items-center">
                   <Bell className="w-6 h-6 mr-3 text-orange-600" />
                   대기 중인 휴가 신청 ({pendingCount}건)
                 </h2>

               </div>
              
              {getPendingRequests().length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">대기 중인 휴가 신청이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getPendingRequests().map((request) => (
                    <div key={request.id} className="bg-white rounded-2xl shadow-sm p-6">
                      <div className="flex justify-between items-start mb-4">
                                                 <div>
                           <h3 className="text-lg font-semibold text-gray-900">
                             {request.user?.name} ({request.user?.user_id})
                           </h3>
                           <p className="text-sm text-gray-500">{request.user?.department} • {request.group?.name}</p>
                         </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">신청 종류</span>
                                                     <p className="text-gray-900">{getTypeLabel(request.vacation_type)}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">기간</span>
                          <p className="text-gray-900">
                            {formatDate(request.start_date)} ~ {formatDate(request.end_date)}
                            <span className="text-sm text-gray-500 ml-2">
                              ({getDaysDifference(request.start_date, request.end_date)}일)
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">신청일</span>
                          <p className="text-gray-900">{formatDate(request.created_at)}</p>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className="text-sm font-medium text-gray-500">신청 사유</span>
                        <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">{request.reason}</p>
                      </div>
                      
                      {reviewingRequest === request.id ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              검토 의견 (선택사항)
                            </label>
                            <textarea
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              rows={3}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                              placeholder="검토 의견을 입력해주세요..."
                            />
                          </div>
                          <div className="flex justify-end gap-3">
                            <button
                              onClick={() => {
                                setReviewingRequest(null)
                                setReviewComment('')
                              }}
                              className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              취소
                            </button>
                            <button
                              onClick={() => handleReviewRequest(request.id, 'rejected')}
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              거절
                            </button>
                            <button
                              onClick={() => handleReviewRequest(request.id, 'approved')}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                            >
                              <CheckCircle className="w-4 h-4" />
                              승인
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <button
                            onClick={() => setReviewingRequest(request.id)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            검토하기
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 신청 목록 */}
          {activeTab === 'list' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-3 text-green-600" />
                {user?.role === 'faculty' ? '전체 휴가 신청 내역' : '내 휴가 신청 현황'}
              </h2>
              
              {getMyRequests().length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    {user?.role === 'faculty' 
                      ? '휴가 신청 내역이 없습니다.' 
                      : '휴가 신청 내역이 없습니다.'
                    }
                  </p>
                  {user?.role === 'student' && (
                    <button
                      onClick={() => setActiveTab('create')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      새 휴가 신청하기
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {getMyRequests().map((request) => (
                    <div key={request.id} className="bg-white rounded-2xl shadow-sm p-6">
                      <div className="flex justify-between items-start mb-4">
                                                                          <div>
                           {user?.role === 'faculty' && (
                             <>
                               <h3 className="text-lg font-semibold text-gray-900">
                                 {request.user?.name} ({request.user?.user_id})
                               </h3>
                               <p className="text-sm text-gray-500">{request.user?.department} • {request.group?.name}</p>
                             </>
                           )}
                           {user?.role === 'student' && (
                             <h3 className="text-lg font-semibold text-gray-900">
                               {getTypeLabel(request.vacation_type)}
                             </h3>
                           )}
                         </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium flex-shrink-0 ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">기간</span>
                          <p className="text-gray-900">
                            {formatDate(request.start_date)} ~ {formatDate(request.end_date)}
                            <span className="text-sm text-gray-500 ml-2">
                              ({getDaysDifference(request.start_date, request.end_date)}일)
                            </span>
                          </p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">신청일</span>
                          <p className="text-gray-900">{formatDate(request.created_at)}</p>
                        </div>
                        {request.reviewed_at && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">처리일</span>
                            <p className="text-gray-900">{formatDate(request.reviewed_at)}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="mb-4">
                        <span className="text-sm font-medium text-gray-500">신청 사유</span>
                        <p className="text-gray-900 mt-1 bg-gray-50 p-3 rounded-lg">{request.reason}</p>
                      </div>
                      
                      {request.review_comment && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <span className="text-sm font-medium text-blue-800">검토 의견</span>
                          <p className="text-blue-900 mt-1">{request.review_comment}</p>
                          {request.reviewer && (
                            <p className="text-sm text-blue-600 mt-2">
                              검토자: {request.reviewer.name}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 