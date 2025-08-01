import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plane, CheckCircle, XCircle, AlertCircle,
  Calendar, Clock, User, FileText, LogOut, Settings
} from 'lucide-react'

export default function FacultyVacationApprovalPage() {
  const navigate = useNavigate()
  const [currentUser] = useState({
    name: '손봉기 교수님',
    role: 'faculty',
    department: '컴공과',
    position: '교수'
  })

  // 대기 중인 휴가 신청 데이터
  const [pendingVacations, setPendingVacations] = useState([
    {
      id: '1',
      studentName: '김학생',
      studentId: '2024001',
      type: 'sick_leave',
      startDate: '2024-01-25',
      endDate: '2024-01-26',
      reason: '몸살로 인한 병가 신청입니다. 의사의 진단서를 첨부하였습니다.',
      requestDate: '2024-01-20',
      emoji: '🤒',
      status: 'pending'
    },
    {
      id: '2',
      studentName: '정학생',
      studentId: '2024005',
      type: 'vacation',
      startDate: '2024-01-30',
      endDate: '2024-01-30',
      reason: '가족 행사 참석을 위한 휴가 신청입니다.',
      requestDate: '2024-01-18',
      emoji: '🎉',
      status: 'pending'
    },
    {
      id: '3',
      studentName: '이학생',
      studentId: '2024003',
      type: 'personal',
      startDate: '2024-02-01',
      endDate: '2024-02-03',
      reason: '개인적인 사정으로 인한 휴가 신청입니다.',
      requestDate: '2024-01-22',
      emoji: '😔',
      status: 'pending'
    }
  ])

  const [reviewingRequest, setReviewingRequest] = useState<string | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const getVacationTypeLabel = (type: string) => {
    switch (type) {
      case 'vacation': return '휴가'
      case 'sick_leave': return '병가'
      case 'personal': return '개인사정'
      default: return type
    }
  }

  const getVacationTypeColor = (type: string) => {
    switch (type) {
      case 'vacation': return 'bg-blue-100 text-blue-800'
      case 'sick_leave': return 'bg-red-100 text-red-800'
      case 'personal': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysDifference = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleVacationAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      // 실제 구현에서는 API 호출
      setPendingVacations(prev => 
        prev.map(v => 
          v.id === id 
            ? { ...v, status: action === 'approve' ? 'approved' : 'rejected' }
            : v
        )
      )
      
      setSuccess(`휴가 신청이 ${action === 'approve' ? '승인' : '거절'}되었습니다.`)
      setReviewingRequest(null)
      setReviewComment('')
      
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('처리 중 오류가 발생했습니다.')
      setTimeout(() => setError(''), 3000)
    }
  }

  const pendingCount = pendingVacations.filter(v => v.status === 'pending').length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm px-4 py-3">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => navigate('/faculty-attendance')}
            className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100 flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-800">휴가 승인 관리</h1>
            <p className="text-sm text-gray-600">{currentUser.name} • {currentUser.department}</p>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="p-4 space-y-4">
        {/* 통계 카드 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Plane className="w-5 h-5 mr-2 text-purple-600" />
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
              <div className="text-xs text-gray-600">일반 휴가</div>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-600">병가</div>
              <div className="text-xs text-gray-600">질병 휴가</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-purple-600">개인사정</div>
              <div className="text-xs text-gray-600">기타 사유</div>
            </div>
          </div>
        </div>

        {/* 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {success}
          </div>
        )}

        {/* 대기 중인 휴가 신청 목록 */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
            대기 중인 휴가 신청 ({pendingCount}건)
          </h3>
          
          {pendingVacations.filter(v => v.status === 'pending').length === 0 ? (
            <div className="text-center py-8">
              <Plane className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">대기 중인 휴가 신청이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingVacations.filter(v => v.status === 'pending').map((vacation) => (
                <div key={vacation.id} className="border border-gray-200 rounded-lg p-4">
                  {/* 상단 정보 */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <span className="text-xl flex-shrink-0">{vacation.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-base font-semibold text-gray-900 truncate">
                          {vacation.studentName} ({vacation.studentId})
                        </h4>
                        <p className="text-xs text-gray-600">{currentUser.department}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getVacationTypeColor(vacation.type)}`}>
                      {getVacationTypeLabel(vacation.type)}
                    </span>
                  </div>
                  
                  {/* 세부 정보 */}
                  <div className="space-y-2 mb-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500">휴가 기간</span>
                      <p className="text-sm text-gray-900">
                        {formatDate(vacation.startDate)} ~ {formatDate(vacation.endDate)}
                        <span className="text-xs text-gray-500 ml-1">
                          ({getDaysDifference(vacation.startDate, vacation.endDate)}일)
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">신청일</span>
                      <p className="text-sm text-gray-900">{formatDate(vacation.requestDate)}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500">신청 사유</span>
                      <p className="text-sm text-gray-900 break-words leading-relaxed">{vacation.reason}</p>
                    </div>
                  </div>
                  
                  {/* 액션 버튼 */}
                  {reviewingRequest === vacation.id ? (
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
                            onClick={() => handleVacationAction(vacation.id, 'approve')}
                            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            승인
                          </button>
                          <button
                            onClick={() => handleVacationAction(vacation.id, 'reject')}
                            className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <XCircle className="w-4 h-4" />
                            거절
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setReviewingRequest(null)
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
                      onClick={() => setReviewingRequest(vacation.id)}
                      className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <FileText className="w-4 h-4" />
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