-- 장소 테이블에 GPS 정보(위도, 경도) 컬럼 추가
ALTER TABLE public.locations
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;

-- 인덱스 추가 (위치 기반 검색 최적화)
CREATE INDEX IF NOT EXISTS locations_coordinates_idx ON public.locations USING gist (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL; 