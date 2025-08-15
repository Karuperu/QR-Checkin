-- 안전한 비밀번호 변경 RPC 함수 추가
-- RLS를 우회하기 위해 SECURITY DEFINER 사용하되, 본인 확인(현재 비밀번호 일치) 조건을 엄격히 검증

create or replace function public.change_user_password(
  p_user_id text,
  p_old_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user record;
begin
  -- 활성 사용자 조회
  select id, password into v_user
  from users
  where user_id = p_user_id
    and is_active = true
  limit 1;

  if not found then
    return false; -- 사용자 없음
  end if;

  -- 현재 비밀번호 검증 (평문 비교 - 현 스키마 기준)
  if v_user.password is distinct from p_old_password then
    return false; -- 현재 비밀번호 불일치
  end if;

  -- 비밀번호 업데이트 및 수정 시간 갱신
  update users
  set password = p_new_password,
      updated_at = now()
  where id = v_user.id;

  return true;
end;
$$;

-- 권한 설정: 익명/인증된 클라이언트에서 실행 가능하게 허용
revoke all on function public.change_user_password(text, text, text) from public;
grant execute on function public.change_user_password(text, text, text) to anon, authenticated;

comment on function public.change_user_password(text, text, text) is '사용자 본인 확인(현재 비밀번호) 후 비밀번호를 변경하는 RPC. SECURITY DEFINER로 RLS 우회.';



