import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, Calendar, FileText, CheckCircle, XCircle, 
  Plus, Bell, LogOut, User as UserIcon, Plane, Clock
} from 'lucide-react'

interface VacationRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  reason: string
  request_type: 'vacation' | 'sick_leave' | 'personal'
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at?: string
  review_comment?: string
  users?: {
    name: string
    user_id: string
    department: string
  }
  reviewer?: {
    name: string
  }
}

export default function VacationRequestPage() {
  const navigate = useNavigate()
  const [currentUser] = useState({
    name: '김학생',
    role: 'student' as 'student' | 'faculty',
    department: '컴퓨터공학과',
    user_id: '2024001',
    id: '1'
  })
  
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'pending'>('list')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // 더미 휴가 신청 데이터
  const [vacationRequests] = useState<VacationRequest[]>([
    {
      id: '1',
      user_id: '2024001',
      start_date: '2024-01-25',
      end_date: '2024-01-26',
      reason: '개인 사정으로 인한 휴가 신청',
      request_type: 'vacation',
      status: 'approved',
      created_at: '2024-01-20',
      reviewed_at: '2024-01-21',
      review_comment: '승인되었습니다.',
      users: { name: '김학생', user_id: '2024001', department: '컴퓨터공학과' },
      reviewer: { name: '손봉기 교수님' }
    },
    {
      id: '2',
      user_id: '2024002',
      start_date: '2024-01-30',
      end_date: '2024-01-30',
      reason: '병원 진료',
      request_type: 'sick_leave',
      status: 'pending',
      created_at: '2024-01-18',
      users: { name: '이학생', user_id: '2024002', department: '전자공학과' }
    }
  ])
  
  const [pendingCount] = useState(1)
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    requestType: 'vacation' as 'vacation' | 'sick_leave' | 'personal'
  })
  
  const [reviewingRequest, setReviewingRequest] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')

  useEffect(() => {
    if (currentUser.role === 'faculty') {
      setActiveTab('pending')
    }
  }, [currentUser])

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'vacation': return '휴가'
      case 'sick_leave': return '병가'
      case 'personal': return '개인사정'
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
      case 'pending': return 'bg-yellow-100 text-yellow-800'
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
    setLoading(true)
    setMessage(null)

    // 유효성 검증
    if (!formData.startDate || !formData.endDate || !formData.reason.trim()) {
      setMessage({ type: 'error', text: '모든 필드를 입력해주세요.' })
      setLoading(false)
      return
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setMessage({ type: 'error', text: '종료일은 시작일보다 늦어야 합니다.' })
      setLoading(false)
      return
    }

    // 시뮬레이션
    setTimeout(() => {
      setMessage({ type: 'success', text: '휴가 신청이 성공적으로 제출되었습니다.' })
      setFormData({
        startDate: '',
        endDate: '',
        reason: '',
        requestType: 'vacation'
      })
      setLoading(false)
      setActiveTab('list')
    }, 1000)
  }

  const handleReviewRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    setLoading(true)
    
    // 시뮬레이션
    setTimeout(() => {
      setMessage({ 
        type: 'success', 
        text: `휴가 신청이 ${status === 'approved' ? '승인' : '거절'}되었습니다.` 
      })
      setReviewingRequest(null)
      setReviewComment('')
      setLoading(false)
    }, 1000)
  }

  const getPendingRequests = () => {
    return vacationRequests.filter(req => req.status === 'pending')
  }

  const getMyRequests = () => {
    if (currentUser.role === 'faculty') {
      return vacationRequests
    }
    return vacationRequests.filter(req => req.user_id === currentUser.user_id)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigate(currentUser.role === 'faculty' ? '/faculty-attendance' : '/student-attendance')} className="p-2 hover:bg-gray-100 rounded-lg">
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
                <div className="font-medium text-gray-800">{currentUser.name}</div>
                <div className="text-gray-500">{currentUser.role === 'faculty' ? '교직원' : '학생'}</div>
              </div>
            </div>
            <button 
              onClick={() => navigate('/')}
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
            {currentUser.role === 'student' && (
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
            
            {currentUser.role === 'faculty' && (
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
          {activeTab === 'create' && currentUser.role === 'student' && (
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
                        requestType: e.target.value as 'vacation' | 'sick_leave' | 'personal'
                      }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                    <span>{loading ? '신청 중...' : '신청하기'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 대기 중인 신청 (교직원용) */}
          {activeTab === 'pending' && currentUser.role === 'faculty' && (
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Bell className="w-6 h-6 mr-3 text-orange-600" />
                대기 중인 휴가 신청 ({pendingCount}건)
              </h2>
              
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
                            {request.users?.name} ({request.users?.user_id})
                          </h3>
                          <p className="text-sm text-gray-500">{request.users?.department}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                          {getStatusLabel(request.status)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                          <span className="text-sm font-medium text-gray-500">신청 종류</span>
                          <p className="text-gray-900">{getTypeLabel(request.request_type)}</p>
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
                {currentUser.role === 'faculty' ? '전체 휴가 신청 내역' : '내 휴가 신청 현황'}
              </h2>
              
              {getMyRequests().length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                  <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    {currentUser.role === 'faculty' 
                      ? '휴가 신청 내역이 없습니다.' 
                      : '휴가 신청 내역이 없습니다.'
                    }
                  </p>
                  {currentUser.role === 'student' && (
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
                              {getTypeLabel(request.request_type)}
                            </h3>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
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