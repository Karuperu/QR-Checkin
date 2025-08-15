import React, { useEffect, useRef, useState } from 'react'
import { Search, MapPin, Navigation, X } from 'lucide-react'

interface KakaoMapProps {
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  onCancel: () => void
  initialLat?: number
  initialLng?: number
}

declare global {
  interface Window {
    kakao: any
  }
}

const KakaoMap: React.FC<KakaoMapProps> = ({ 
  onLocationSelect, 
  onCancel, 
  initialLat = 37.5665, 
  initialLng = 126.9780 
}) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; address?: string } | null>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  useEffect(() => {
    // 이미 지도가 초기화되었으면 다시 초기화하지 않음
    if (map) return

    // 카카오맵 SDK가 로드되었는지 확인
    if (typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
      initializeMap()
    } else {
      // SDK가 로드되지 않은 경우 대기
      const checkKakaoMap = setInterval(() => {
        if (typeof window !== 'undefined' && window.kakao && window.kakao.maps) {
          clearInterval(checkKakaoMap)
          initializeMap()
        }
      }, 100)
    }

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (marker) {
        marker.setMap(null)
      }
      if (map) {
        // 지도 이벤트 리스너 제거
        window.kakao.maps.event.clearListeners(map, 'click')
      }
    }
  }, [])

  const initializeMap = () => {
    if (!mapRef.current || map) return

    const mapOption = {
      center: new window.kakao.maps.LatLng(initialLat, initialLng),
      level: 3
    }

    const kakaoMap = new window.kakao.maps.Map(mapRef.current, mapOption)
    setMap(kakaoMap)

    // 지도 중심좌표에 마커를 생성합니다
    const singleMarker = new window.kakao.maps.Marker({
      position: kakaoMap.getCenter()
    })
    // 지도에 마커를 표시합니다
    singleMarker.setMap(kakaoMap)
    setMarker(singleMarker)

    // 지도에 클릭 이벤트를 등록합니다
    window.kakao.maps.event.addListener(kakaoMap, 'click', (mouseEvent: any) => {
      // 클릭한 위도, 경도 정보를 가져옵니다
      const latlng = mouseEvent.latLng
      const lat = latlng.getLat()
      const lng = latlng.getLng()
      
      // 마커 위치를 클릭한 위치로 옮깁니다
      singleMarker.setPosition(latlng)
      
      // 주소 정보 가져오기
      getAddressFromCoords(lat, lng).then(address => {
        setSelectedLocation({ lat, lng, address })
      })
    })
  }

  // 좌표로 주소 가져오기
  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    return new Promise((resolve) => {
      const geocoder = new window.kakao.maps.services.Geocoder()
      const coord = new window.kakao.maps.LatLng(lat, lng)
      
      geocoder.coord2Address(coord.getLng(), coord.getLat(), (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const address = result[0].address.address_name
          resolve(address)
        } else {
          resolve('주소 정보 없음')
        }
      })
    })
  }

  // 위치 검색
  const searchLocation = async () => {
    if (!searchKeyword.trim() || !map) return

    setIsSearching(true)
    setShowSearchResults(false)

    try {
      const places = new window.kakao.maps.services.Places()
      
      places.keywordSearch(searchKeyword, (results: any, status: any) => {
        setIsSearching(false)
        
        if (status === window.kakao.maps.services.Status.OK) {
          setSearchResults(results)
          setShowSearchResults(true)
          
                     // 첫 번째 결과로 지도 이동
           if (results.length > 0) {
             const firstResult = results[0]
             const latlng = new window.kakao.maps.LatLng(firstResult.y, firstResult.x)
             map.setCenter(latlng)
             map.setLevel(3)
           }
        } else {
          setSearchResults([])
          setShowSearchResults(true)
        }
      })
    } catch (error) {
      setIsSearching(false)
      // 위치 검색 실패
    }
  }

  // 검색 결과 선택
  const selectSearchResult = (result: any) => {
    const lat = parseFloat(result.y)
    const lng = parseFloat(result.x)
    
    // 지도 중심 이동
    const latlng = new window.kakao.maps.LatLng(lat, lng)
    map.setCenter(latlng)
    map.setLevel(3)
    
    // 마커 위치를 클릭한 위치로 옮깁니다
    if (marker) {
      marker.setPosition(latlng)
    }
    
    // 선택된 위치 설정
    setSelectedLocation({ lat, lng, address: result.address_name })
    setShowSearchResults(false)
    setSearchKeyword('')
  }

  // 현재 위치 가져오기
  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      // 로딩 상태 표시
      setIsGettingLocation(true)
      setSelectedLocation(null)
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          
          // 지도 중심 이동
          const latlng = new window.kakao.maps.LatLng(lat, lng)
          map.setCenter(latlng)
          map.setLevel(3)
          
          // 마커 위치를 클릭한 위치로 옮깁니다
          if (marker) {
            marker.setPosition(latlng)
          }
          
          // 즉시 좌표 정보 설정 (주소는 비동기로 가져오기)
          setSelectedLocation({ lat, lng, address: '주소 정보 로딩 중...' })
          
          // 주소 정보를 비동기로 가져오기
          getAddressFromCoords(lat, lng).then(address => {
            setSelectedLocation(prev => prev ? { ...prev, address } : null)
            setIsGettingLocation(false)
          }).catch(() => {
            setSelectedLocation(prev => prev ? { ...prev, address: '주소 정보 없음' } : null)
            setIsGettingLocation(false)
          })
        },
        (error) => {
          console.error('Kakao Map load error:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      )
    } else {
      alert('이 브라우저에서는 위치 정보를 지원하지 않습니다.')
    }
  }

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation.lat, selectedLocation.lng, selectedLocation.address)
    }
  }

  const handleCancel = () => {
    onCancel()
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchLocation()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">지도에서 위치 선택</h2>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>
          
          {/* 검색 바 */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={handleSearchKeyPress}
                placeholder="장소를 검색하세요 (예: 서울역, 강남역)"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={searchLocation}
                disabled={isSearching}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSearching ? '검색중...' : '검색'}
              </button>
            </div>
            
            {/* 검색 결과 */}
            {showSearchResults && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
                {searchResults.length > 0 ? (
                  searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => selectSearchResult(result)}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{result.place_name}</div>
                      <div className="text-sm text-gray-600">{result.address_name}</div>
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-gray-500 text-center">검색 결과가 없습니다.</div>
                )}
              </div>
            )}
          </div>
          
                               {/* 지도 컨테이너 */}
          <div 
            ref={mapRef}
            className="w-full h-96 rounded-lg overflow-hidden border border-gray-200"
            style={{ minHeight: '400px' }}
          />
          
          {/* 선택된 좌표 표시 */}
          {selectedLocation ? (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-800 mb-1">선택된 위치</p>
                  <p className="text-xs text-blue-600 font-mono mb-1">
                    위도: {selectedLocation.lat.toFixed(6)}<br/>
                    경도: {selectedLocation.lng.toFixed(6)}
                  </p>
                  {selectedLocation.address && (
                    <p className="text-xs text-blue-600">{selectedLocation.address}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">위치 선택 안내</p>
                  <p className="text-xs text-gray-500">
                    지도를 클릭하거나 검색하여 위치를 선택해주세요.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* 버튼 */}
          <div className="flex justify-between items-center mt-6">
            <button
              onClick={getCurrentLocation}
              disabled={isGettingLocation}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Navigation size={16} />
              <span>{isGettingLocation ? '위치 확인 중...' : '현재 위치'}</span>
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedLocation}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {selectedLocation ? '위치 확인' : '위치를 선택해주세요'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KakaoMap 