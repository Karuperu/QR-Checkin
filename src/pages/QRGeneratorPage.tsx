import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import QRCode from 'qrcode'
import { getLocations, addLocation, deleteLocation, getCurrentUser, type User } from '../lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'

export default function QRGeneratorPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [locations, setLocations] = useState<{id: string, name: string}[]>([])
  const [newLocation, setNewLocation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')

  // 장소 목록 불러오기
  const loadLocations = async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await getLocations()
      setLocations(data)
    } catch (e) {
      setError('장소 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const user = getCurrentUser()
    setCurrentUser(user)
    console.log('[QRGeneratorPage] currentUser:', user)
    loadLocations()
  }, [])

  // 장소 추가
  const handleAddLocation = async () => {
    if (!newLocation.trim()) return
    setIsLoading(true)
    const ok = await addLocation(newLocation.trim())
    if (ok) {
      setNewLocation('')
      loadLocations()
    } else {
      setError('장소 추가에 실패했습니다.')
    }
    setIsLoading(false)
  }

  // 장소 삭제
  const handleDeleteLocation = async (id: string) => {
    setIsLoading(true)
    const ok = await deleteLocation(id)
    if (ok) {
      loadLocations()
    } else {
      setError('장소 삭제에 실패했습니다.')
    }
    setIsLoading(false)
  }

  // 교수(관리자) 권한 확인 (currentUser가 null이어도 true로 처리)
  const isProfessor = !currentUser || currentUser.role === 'faculty'

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6 relative">
        <Link to={currentUser && currentUser.role === 'faculty' ? "/attendance?tab=records" : "/attendance"} className="absolute top-4 left-4 text-gray-500 hover:text-gray-800">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-800">장소별 출석 QR 코드</h1>

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-600">QR 코드 생성 중...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg p-4">
            <p className="text-red-700 font-semibold">오류 발생</p>
            <p className="mt-2 text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="w-full">
            <h1 className="text-2xl font-bold mb-6">장소별 출석 QR 코드</h1>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                className="border rounded px-2 py-1 flex-1"
                placeholder="새 장소 이름 입력"
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                disabled={isLoading}
              />
              <button
                className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50"
                onClick={handleAddLocation}
                disabled={isLoading || !newLocation.trim()}
              >
                추가
              </button>
            </div>
            {error && <div className="text-red-500 mb-2">{error}</div>}
            <div
              className="w-full flex flex-wrap justify-center gap-6"
              style={{ rowGap: '2rem' }}
            >
              {locations.length === 0 && (
                <div className="text-gray-400 text-center w-full py-8">등록된 장소가 없습니다. 장소를 추가해 주세요.</div>
              )}
              {locations.map((loc, index) => (
                <div
                  key={loc.id}
                  className="flex flex-col items-center bg-white p-4 rounded-lg shadow"
                  style={{ minWidth: 260, maxWidth: 320, flex: '1 1 260px' }}
                >
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">{loc.name}</h2>
                  <div className="bg-white p-4 rounded-lg shadow-inner mb-2">
                    <QRCodeCanvas value={loc.name} size={250} />
                  </div>
                  {isProfessor && (
                    <button
                      className="text-xs text-red-500 hover:underline mt-2"
                      onClick={() => handleDeleteLocation(loc.id)}
                      disabled={isLoading}
                    >
                      삭제
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {!currentUser && (
        <div className="mt-4 text-center">
          <Link to="/" className="text-sm text-blue-600 hover:underline">
            로그인하여 QR 코드 관리하기
          </Link>
        </div>
      )}
    </div>
  )
} 