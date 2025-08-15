-- Add address column to locations table
ALTER TABLE locations ADD COLUMN address TEXT;

-- Add comment for the new column
COMMENT ON COLUMN locations.address IS '주소 정보 (카카오맵 API에서 가져온 주소)'; 