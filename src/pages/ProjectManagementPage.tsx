import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Users, Settings, Calendar, BarChart3 } from 'lucide-react'

interface Group {
  id: string
  name: string
  description: string
  memberCount: number
  createdAt: string
  status: 'active' | 'inactive'
}

const GroupManagementPage = () => {
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[]>([
    {
      id: '1',
      name: '웹 개발 그룹',
      description: '회사 홈페이지 및 웹 애플리케이션 개발',
      memberCount: 28,
      createdAt: '2024-03-01',
      status: 'active'
    },
    {
      id: '2',
      name: '모바일 앱 개발',
      description: '출퇴근 관리 모바일 애플리케이션',
      memberCount: 15,
      createdAt: '2024-03-15',
      status: 'active'
    },
    {
      id: '3',
      name: 'UI/UX 디자인',
      description: '사용자 인터페이스 및 경험 설계',
      memberCount: 8,
      createdAt: '2024-02-20',
      status: 'inactive'
    }
  ])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null)
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: ''
  })

  const handleCreateGroup = () => {
    if (newGroup.name.trim() === '') return

    const group: Group = {
      id: Date.now().toString(),
      name: newGroup.name,
      description: newGroup.description,
      memberCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active'
    }

    setGroups([...groups, group])
    setNewGroup({ name: '', description: '' })
    setShowCreateModal(false)
  }

  const handleDeleteGroup = (groupId: string) => {
    setGroupToDelete(groupId)
    setShowDeleteModal(true)
  }

  const confirmDeleteGroup = () => {
    if (groupToDelete) {
      setGroups(groups.filter(g => g.id !== groupToDelete))
      setShowDeleteModal(false)
      setGroupToDelete(null)
    }
  }

  const cancelDeleteGroup = () => {
    setShowDeleteModal(false)
    setGroupToDelete(null)
  }

  const handleGroupSelect = (groupId: string) => {
    // 그룹별 출퇴근 관리 페이지로 이동
    navigate(`/group-attendance/${groupId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <button
                onClick={() => navigate('/faculty-attendance')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900 truncate">그룹 관리</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">새 그룹</span>
              <span className="sm:hidden">추가</span>
            </button>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">전체 그룹</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{groups.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg self-end sm:self-auto">
                <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">활성 그룹</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">
                  {groups.filter(g => g.status === 'active').length}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg self-end sm:self-auto">
                <Calendar className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-2 sm:mb-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600">전체 참여자</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-600">
                  {groups.reduce((sum, g) => sum + g.memberCount, 0)}
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg self-end sm:self-auto">
                <Users className="w-4 h-4 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 그룹 목록 */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">그룹 목록</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {groups.map((group) => (
              <div key={group.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{group.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${
                        group.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {group.status === 'active' ? '활성' : '비활성'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 break-words">{group.description}</p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-xs sm:text-sm text-gray-500">
                      <span className="flex items-center space-x-1">
                        <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{group.memberCount}명</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>생성일: {group.createdAt}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleGroupSelect(group.id)}
                      className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">출퇴근 관리</span>
                      <span className="sm:hidden">관리</span>
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 그룹 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">새 그룹 생성</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    그룹 이름
                  </label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    placeholder="그룹 이름을 입력하세요"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명
                  </label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                    rows={3}
                    placeholder="그룹 설명을 입력하세요"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewGroup({ name: '', description: '' })
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm sm:text-base order-2 sm:order-1"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={newGroup.name.trim() === ''}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm sm:text-base order-1 sm:order-2"
                >
                  생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 그룹 삭제 모달 */}
      {showDeleteModal && groupToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="p-6 text-center">
              {/* 경고 아이콘 */}
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              {/* 제목 */}
              <h2 className="text-lg font-semibold text-gray-900 mb-2">그룹 삭제</h2>
              
              {/* 설명 */}
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                정말로 <span className="font-medium text-gray-900">"{groups.find(g => g.id === groupToDelete)?.name}"</span> 그룹을 삭제하시겠습니까?
                <br />
                <span className="text-red-600">이 작업은 되돌릴 수 없습니다.</span>
              </p>
              
              {/* 버튼 */}
              <div className="flex flex-col space-y-3">
                <button
                  onClick={confirmDeleteGroup}
                  className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  예, 삭제합니다
                </button>
                <button
                  onClick={cancelDeleteGroup}
                  className="w-full py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  아니오, 취소합니다
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GroupManagementPage 