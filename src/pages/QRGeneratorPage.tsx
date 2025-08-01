import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, MapPin, Navigation } from 'lucide-react'
import QRCode from 'qrcode'
import { getLocations, addLocation, deleteLocation, getCurrentUser, type User } from '../lib/supabase'
import { QRCodeCanvas } from 'qrcode.react'

declare global {
  interface Window {
    kakao: any
    currentKakaoMap: any
  }
}

export default function QRGeneratorPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [locations, setLocations] = useState<{id: string, name: string, latitude?: number, longitude?: number}[]>([])
  const [newLocation, setNewLocation] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  
  // 지도 관련 상태
  const [showMapModal, setShowMapModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [map, setMap] = useState<any>(null)
  const [currentMarker, setCurrentMarker] = useState<any>(null)
  const [allMarkers, setAllMarkers] = useState<any[]>([])
  
  // 전역 마커 배열 (확실한 마커 관리)
  let markers: any[] = []
  
  // 기존에 있던 마커들을 모두 지우는 함수 (제안받은 로직)
  const clearMarkers = () => {
    console.log('=== 기존 마커 제거 시작 ===')
    console.log(`제거할 마커 개수: ${markers.length}`)
    
    for (let i = 0; i < markers.length; i++) {
      if (markers[i]) {
        console.log(`마커 ${i} 제거`)
        markers[i].setMap(null) // 이전 마커를 지도에서 제거
      }
    }
    markers.length = 0 // markers 배열 초기화
    
    // React 상태도 초기화
    setCurrentMarker(null)
    setAllMarkers([])
    
    console.log('=== 마커 제거 완료 ===')
  }

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

  // 장소 추가 (지도 모달 열기)
  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      setError('장소 이름을 입력해주세요.')
      return
    }
    setError('')
    openMapModal()
  }

  // 실제 장소 저장
  const saveLocationWithCoords = async () => {
    if (!newLocation.trim() || !selectedLocation) return
    
    setIsLoading(true)
    const ok = await addLocation(
      newLocation.trim(), 
      selectedLocation.lat, 
      selectedLocation.lng
    )
    if (ok) {
      setNewLocation('')
      setSelectedLocation(null)
      setShowMapModal(false)
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

  // 카카오 지도 스크립트 로드
  const loadKakaoMap = () => {
    return new Promise<void>((resolve, reject) => {
      const kakaoKey = import.meta.env.VITE_KAKAO_MAP_KEY || 'f81af0e933045defa1569ad7f5917046'
      
      if (window.kakao && window.kakao.maps) {
        resolve()
        return
      }
      
      // 기존 스크립트가 있는지 확인
      const existingScript = document.querySelector('script[src*="dapi.kakao.com"]')
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          window.kakao.maps.load(() => {
            setMapLoaded(true)
            resolve()
          })
        })
        return
      }
      
      const script = document.createElement('script')
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        if (window.kakao && window.kakao.maps) {
          window.kakao.maps.load(() => {
            setMapLoaded(true)
            console.log('카카오 지도 로드 완료')
            resolve()
          })
        } else {
          console.error('카카오 지도 객체를 찾을 수 없습니다.')
          reject(new Error('카카오 지도 로드 실패'))
        }
      }
      
      script.onerror = (error) => {
        console.error('카카오 지도 스크립트 로드 오류:', error)
        reject(new Error('카카오 지도 스크립트 로드 실패'))
      }
      
      document.head.appendChild(script)
    })
  }

  // 지도 초기화
  const initializeMap = async () => {
    await loadKakaoMap()
    
    const container = document.getElementById('kakao-map')
    if (!container || !window.kakao) {
      console.error('지도 컨테이너 또는 카카오 맵 객체를 찾을 수 없습니다.')
      return
    }

    try {
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 시청 기본 좌표
        level: 3,
        // 모바일 환경을 위한 추가 옵션들
        draggable: true,
        scrollwheel: true,
        doubleClickZoom: true,
        keyboardShortcuts: true
      }

      const newMap = new window.kakao.maps.Map(container, options)
      setMap(newMap)
      
      // 지도 크기 재조정 (모바일에서 중요)
      setTimeout(() => {
        newMap.relayout()
      }, 100)

      // 마커 추가/제거 함수
      const addMarker = (latlng: any) => {
        console.log('=== 새 마커 추가 시도 ===')
        console.log('클릭 좌표:', latlng.getLat(), latlng.getLng())
        console.log('현재 지도 객체:', newMap ? 'O' : 'X')
        console.log('window.kakao 상태:', window.kakao ? 'O' : 'X')
        
        // 모든 기존 마커 제거
        clearMarkers()
        
        // 새 위치 설정
        const newLocation = {
          lat: latlng.getLat(),
          lng: latlng.getLng()
        }
        setSelectedLocation(newLocation)
        console.log('선택된 위치 설정:', newLocation)
        
        // 지도 객체 확인 및 새 마커 생성
        if (!newMap) {
          console.error('지도 객체가 없습니다!')
          return
        }
        
        if (!window.kakao || !window.kakao.maps) {
          console.error('카카오맵 API가 로드되지 않았습니다!')
          return
        }
        
        try {
          // 새 마커 생성 (제안받은 로직)
          console.log('마커 생성 중...')
          const marker = new window.kakao.maps.Marker({
            position: latlng,
            map: newMap
          })
          
          // 마커를 지도에 명시적으로 설정
          marker.setMap(newMap)
          console.log('마커를 지도에 추가함')
          
          // 생성된 마커를 배열에 추가 (핵심!)
          markers.push(marker)
          console.log(`마커 배열에 추가됨. 총 마커 개수: ${markers.length}`)
          
          // React 상태 업데이트
          setCurrentMarker(marker)
          setAllMarkers([...markers])
          
          console.log('=== 새 마커 추가 완료 ===')
          
        } catch (error) {
          console.error('마커 생성 중 오류:', error)
        }
      }

      // 클릭 이벤트 등록 (모바일 터치 이벤트 포함)
      window.kakao.maps.event.addListener(newMap, 'click', (mouseEvent: any) => {
        addMarker(mouseEvent.latLng)
      })
      
      // 터치 이벤트도 추가로 등록 (모바일 환경)
      window.kakao.maps.event.addListener(newMap, 'touchend', (mouseEvent: any) => {
        if (mouseEvent.latLng) {
          addMarker(mouseEvent.latLng)
        }
      })
      
      console.log('지도 초기화 완료')
    } catch (error) {
      console.error('지도 초기화 오류:', error)
    }
  }

  // 현재 위치로 이동
  const moveToCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('이 브라우저에서는 위치 정보가 지원되지 않습니다.')
      return
    }

    // 로딩 상태 표시 (옵션)
    console.log('현재 위치 가져오는 중...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        
        console.log('현재 위치:', { lat, lng })
        
        if (map && window.kakao) {
          const moveLatLng = new window.kakao.maps.LatLng(lat, lng)
          map.setCenter(moveLatLng)
          map.setLevel(2) // 줌 레벨 조정
          
          // 현재 위치로 지도만 이동 (마커 생성 없음)
          console.log('현재 위치로 지도 중심 이동 완료')
          
          // 지도 크기 재조정
          setTimeout(() => {
            map.relayout()
          }, 100)
          
          console.log('현재 위치로 이동 완료')
        } else {
          console.error('지도 객체가 없습니다.')
          alert('지도가 아직 로드되지 않았습니다. 잠시 후 다시 시도해주세요.')
        }
      },
      (error) => {
        console.error('위치 정보를 가져올 수 없습니다:', error)
        let message = '위치 정보를 가져올 수 없습니다.'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.'
            break
          case error.POSITION_UNAVAILABLE:
            message = '위치 정보를 사용할 수 없습니다.'
            break
          case error.TIMEOUT:
            message = '위치 정보 요청 시간이 초과되었습니다. 다시 시도해주세요.'
            break
        }
        
        alert(message)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // 모바일에서는 더 긴 타임아웃
        maximumAge: 30000 // 30초 내 캐시된 위치 사용
      }
    )
  }

  // 지도 모달 열기
  const openMapModal = async () => {
    // 기존 상태 완전히 리셋
    setSelectedLocation(null)
    setCurrentMarker(null)
    setAllMarkers([])
    setMap(null)
    
    // 지도 컨테이너 완전히 클리어
    const container = document.getElementById('kakao-map')
    if (container) {
      container.innerHTML = ''
    }
    
    setShowMapModal(true)
    
    // 모달이 열린 후 지도 초기화 (더 긴 지연시간으로 완전한 초기화 보장)
    setTimeout(() => {
      initializeMap()
    }, 500)
  }

  // 지도 모달 닫기
  const closeMapModal = () => {
    // 모든 마커 정리
    if (currentMarker) {
      currentMarker.setMap(null)
      setCurrentMarker(null)
    }
    allMarkers.forEach(marker => {
      if (marker) {
        marker.setMap(null)
      }
    })
    setAllMarkers([])
    setShowMapModal(false)
    setSelectedLocation(null)
    setMap(null)
  }

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
                className="bg-blue-600 text-white px-4 py-1 rounded disabled:opacity-50 flex items-center gap-2"
                onClick={handleAddLocation}
                disabled={isLoading || !newLocation.trim()}
              >
                <MapPin size={16} />
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
                  <h2 className="text-lg font-semibold text-gray-800 mb-2">{loc.name}</h2>
                  
                  {/* 위치 정보 표시 */}
                  {loc.latitude && loc.longitude && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        위도: {loc.latitude.toFixed(6)}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin size={12} />
                        경도: {loc.longitude.toFixed(6)}
                      </div>
                    </div>
                  )}
                  
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

      {/* 지도 모달 */}
      {showMapModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-3xl mx-2 sm:mx-4 max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base sm:text-lg font-semibold truncate pr-2">"{newLocation}" 장소의 위치 선택</h3>
              <button
                onClick={closeMapModal}
                className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs sm:text-sm text-gray-600 mb-4">
              지도에서 "{newLocation}" 장소의 정확한 위치를 터치하여 선택하세요.
            </p>
            
            {/* 현재 위치 버튼 */}
            <div className="mb-4">
              <button
                onClick={moveToCurrentLocation}
                className="bg-green-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded hover:bg-green-700 flex items-center gap-2 text-sm"
              >
                <Navigation size={14} />
                현재 위치로 이동
              </button>
            </div>
            
            <div
              id="kakao-map"
              className="w-full h-64 sm:h-80 md:h-96 border rounded-lg mb-4 touch-manipulation"
              style={{ 
                minHeight: '250px',
                touchAction: 'manipulation',
                position: 'relative'
              }}
              key={showMapModal ? 'map-open' : 'map-closed'} // 키 변경으로 강제 재렌더링
            ></div>
            
            {selectedLocation && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-xs sm:text-sm text-blue-700">
                  <strong>선택된 위치:</strong><br />
                  위도: {selectedLocation.lat.toFixed(6)}<br />
                  경도: {selectedLocation.lng.toFixed(6)}
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                onClick={closeMapModal}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                취소
              </button>
              <button
                onClick={saveLocationWithCoords}
                disabled={!selectedLocation || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    저장 중...
                  </>
                ) : (
                  <>
                    <MapPin size={14} />
                    장소 저장
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 