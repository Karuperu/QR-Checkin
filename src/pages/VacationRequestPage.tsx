import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Calendar, FileText, CheckCircle, XCircle, AlertCircle, Plus, Bell, LogOut, User as UserIcon, Users, Plane, Settings, QrCode } from 'lucide-react'
import { 
  getCurrentUser, 
  createVacationRequest, 
  getVacationRequests, 
  reviewVacationRequest, 
  getPendingVacationRequestsCount,
  getVacationRequestTypeLabel,
  getVacationRequestStatusLabel,
  getVacationRequestStatusColor,
  logoutUser,
  formatLocalDate,
  type User, 
  type VacationRequest, 
  type VacationRequestType,
  // type VacationRequestStatus
} from '../lib/supabase'

export default function VacationRequestPage() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // 휴가 신청 관련 상태
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [selectedTab, setSelectedTab] = useState<'create' | 'list' | 'pending'>('list')
  
  // 신청 폼 상태
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    requestType: 'vacation' as VacationRequestType
  })
  
  // 검토 상태
  const [reviewingRequest, setReviewingRequest] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  // 알림 관련 상태
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [unreadAlerts, setUnreadAlerts] = useState<VacationRequest[]>([])

  useEffect(() => {
    initializeUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      loadVacationRequests()
      if (currentUser.role === 'faculty') {
        loadPendingCount()
        setSelectedTab('pending')
      }
    }
  }, [currentUser])

  // --- 승인/거절 알림 계산 ---
  useEffect(() => {
    if (currentUser && currentUser.role === 'student') {
      const seenIds = JSON.parse(localStorage.getItem('vacation_alert_seen') || '[]')
      const alerts = vacationRequests.filter(r =>
        (r.status === 'approved' || r.status === 'rejected') &&
        !seenIds.includes(r.id)
      )
      setUnreadAlerts(alerts)
    }
  }, [vacationRequests, currentUser])

  const handleAlertClick = () => {
    setShowAlertModal(true)
    // 알림 확인 처리
    if (unreadAlerts.length > 0) {
      const seenIds = JSON.parse(localStorage.getItem('vacation_alert_seen') || '[]')
      const newIds = [...seenIds, ...unreadAlerts.map(a => a.id)]
      localStorage.setItem('vacation_alert_seen', JSON.stringify(newIds))
      setUnreadAlerts([])
    }
  }

  const initializeUser = () => {
    const user = getCurrentUser()
    if (!user) {
      navigate('/')
      return
    }
    setCurrentUser(user)
    setLoading(false)
  }

  const loadVacationRequests = async () => {
    if (!currentUser) return
    
    try {
      const requests = await getVacationRequests(currentUser)
      setVacationRequests(requests)
    } catch (err) {
      console.error('휴가 신청 목록 로드 오류:', err)
      setError('휴가 신청 목록을 불러오는데 실패했습니다.')
    }
  }

  const loadPendingCount = async () => {
    try {
      const count = await getPendingVacationRequestsCount()
      setPendingCount(count)
    } catch (err) {
      console.error('대기 중인 신청 개수 로드 오류:', err)
    }
  }

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser) return

    try {
      setError('')
      setSuccess('')

      // 유효성 검증
      if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
        setError('모든 필드를 입력해주세요.')
        return
      }

      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setError('종료일은 시작일보다 늦어야 합니다.')
        return
      }

      const success = await createVacationRequest(
        currentUser.id,
        formData.startDate,
        formData.endDate,
        formData.reason.trim(),
        formData.requestType
      )

      if (success) {
        setSuccess('휴가 신청이 성공적으로 제출되었습니다.')
        setFormData({
          startDate: '',
          endDate: '',
          reason: '',
          requestType: 'vacation'
        })
        await loadVacationRequests()
        setSelectedTab('list')
      } else {
        setError('휴가 신청 제출에 실패했습니다.')
      }
    } catch (err) {
      console.error('휴가 신청 제출 오류:', err)
      setError('휴가 신청 제출 중 오류가 발생했습니다.')
    }
  }

  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    if (!currentUser) return

    try {
      const success = await reviewVacationRequest(
        requestId,
        currentUser.id,
        status,
        reviewComment.trim() || undefined
      )

      if (success) {
        setSuccess(`휴가 신청이 ${status === 'approved' ? '승인' : '거절'}되었습니다.`)
        setReviewingRequest(null)
        setReviewComment('')
        await loadVacationRequests()
        await loadPendingCount()
      } else {
        setError('휴가 신청 처리에 실패했습니다.')
      }
    } catch (err) {
      console.error('휴가 신청 처리 오류:', err)
      setError('휴가 신청 처리 중 오류가 발생했습니다.')
    }
  }

  const handleLogout = () => {
    logoutUser()
    navigate('/')
  }

  const formatDate = (dateStr: string) => {
    return formatLocalDate(dateStr)
  }

  const getDaysDifference = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const getPendingRequests = () => {
    return vacationRequests.filter(req => req.status === 'pending')
  }

  // 역할별 아이콘 함수 (AttendancePage와 동일)
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'student':
        return <UserIcon className="w-4 h-4 text-blue-600" />
      case 'faculty':
        return <Users className="w-4 h-4 text-green-600" />
      default:
        return <UserIcon className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-8">
          <Link to="/attendance?tab=records" className="btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={20} />
            메인으로 돌아가기
          </Link>
          <div className="flex items-center gap-4">
            
            <div className="flex items-center gap-2 text-black">
              {getRoleIcon(currentUser.role)}
              <span className="font-medium align-middle">{currentUser.name}</span>
              <span className="text-sm opacity-80 align-middle">
                ({currentUser.role === 'faculty' ? '교직원' : '학생'})
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-red-600 transition-colors"
              title="로그아웃"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-1 mb-6">
          <div className="flex">
            {currentUser.role === 'student' && (
              <>
                <button
                  onClick={() => setSelectedTab('list')}
                  className={`flex-1 py-3 px-4 rounded-md text-center transition-colors ${
                    selectedTab === 'list'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1" />
                  내 신청 현황
                </button>
                <button
                  onClick={() => setSelectedTab('create')}
                  className={`flex-1 py-3 px-4 rounded-md text-center transition-colors ${
                    selectedTab === 'create'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Plus className="w-5 h-5 mx-auto mb-1" />
                  휴가 신청
                </button>
              </>
            )}
            
            {currentUser.role === 'faculty' && (
              <>
                <button
                  onClick={() => setSelectedTab('pending')}
                  className={`flex-1 py-3 px-4 rounded-md text-center transition-colors relative ${
                    selectedTab === 'pending'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-gray-100'
                  }`}
                >
                  <Bell className="w-5 h-5 mx-auto mb-1" />
                  대기 중인 신청
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSelectedTab('list')}
                  className={`flex-1 py-3 px-4 rounded-md text-center transition-colors ${
                    selectedTab === 'list'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-700 hover:text-purple-600 hover:bg-gray-100'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-1" />
                  모든 신청 내역
                </button>
              </>
            )}
          </div>
        </div>

        {/* 메시지 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* 휴가 신청 폼 (학생용) */}
          {selectedTab === 'create' && currentUser.role === 'student' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">휴가 신청</h2>
              
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
                        requestType: e.target.value as VacationRequestType
                      }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="vacation">휴가</option>
                      <option value="sick_leave">병가</option>
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    placeholder="휴가 신청 사유를 상세히 입력해주세요..."
                    required
                  />
                </div>
                
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setSelectedTab('list')}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    신청하기
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 대기 중인 신청 목록 (교수용) */}
          {selectedTab === 'pending' && currentUser.role === 'faculty' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                대기 중인 휴가 신청 ({pendingCount}건)
              </h2>
              
              {getPendingRequests().length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">대기 중인 휴가 신청이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getPendingRequests().map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {request.users?.name} ({request.users?.user_id})
                          </h3>
                          <p className="text-sm text-gray-500">{request.users?.department}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVacationRequestStatusColor(request.status)}`}>
                          {getVacationRequestStatusLabel(request.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">신청 종류</span>
                          <p className="text-gray-900">{getVacationRequestTypeLabel(request.request_type)}</p>
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
                        <p className="text-gray-900 mt-1">{request.reason}</p>
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
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                              placeholder="검토 의견을 입력해주세요..."
                            />
                          </div>
                          <div className="flex justify-end gap-4">
                            <button
                              onClick={() => {
                                setReviewingRequest(null)
                                setReviewComment('')
                              }}
                              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
          {selectedTab === 'list' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {currentUser.role === 'faculty' ? '모든 휴가 신청 내역' : '내 휴가 신청 현황'}
              </h2>
              
              {vacationRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {currentUser.role === 'faculty' 
                      ? '휴가 신청 내역이 없습니다.' 
                      : '휴가 신청 내역이 없습니다. 새로운 휴가를 신청해보세요.'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vacationRequests.map((request) => (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          {currentUser.role === 'faculty' && (
                            <>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {request.users?.name} ({request.users?.user_id})
                              </h3>
                              <p className="text-sm text-gray-500">{request.users?.department}</p>
                            </>
                          )}
                          {currentUser.role === 'student' && (
                            <h3 className="text-lg font-semibold text-gray-900">
                              {getVacationRequestTypeLabel(request.request_type)}
                            </h3>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getVacationRequestStatusColor(request.status)}`}>
                          {getVacationRequestStatusLabel(request.status)}
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
                        <p className="text-gray-900 mt-1">{request.reason}</p>
                      </div>
                      
                      {request.review_comment && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <span className="text-sm font-medium text-gray-500">검토 의견</span>
                          <p className="text-gray-900 mt-1">{request.review_comment}</p>
                          {request.reviewer && (
                            <p className="text-sm text-gray-500 mt-2">
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

      {/* 알림 모달 */}
      {showAlertModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs relative">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setShowAlertModal(false)}>X</button>
            <h2 className="text-lg font-bold mb-4">휴가신청 처리 알림</h2>
            {vacationRequests.filter(r => r.status === 'approved' || r.status === 'rejected').length === 0 ? (
              <p className="text-gray-500">최근 처리된 휴가신청이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {vacationRequests.filter(r => r.status === 'approved' || r.status === 'rejected').map(r => (
                  <li key={r.id} className="border rounded p-2 flex items-center gap-2">
                    {r.status === 'approved' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="flex-1 text-sm">
                      {r.status === 'approved' ? '휴가신청이 승인되었습니다.' : '휴가신청이 거절되었습니다.'}
                      <br />
                      <span className="text-xs text-gray-500">{r.created_at && (r.created_at.split('T')[0])}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 