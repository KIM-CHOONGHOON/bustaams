/**
 * TB_USER 테이블 명세를 기반으로 한 Mock 인증 서비스
 */

const MOCK_USERS = [
  {
    CUST_ID: 'C0001',
    USER_ID: 'traveler1',
    PASSWORD: 'password123',
    USER_NM: '홍길동',
    USER_TYPE: 'TRAVELER',
    USER_STAT: 'ACTIVE'
  },
  {
    CUST_ID: 'D0001',
    USER_ID: 'driver1',
    PASSWORD: 'password123',
    USER_NM: '김기사',
    USER_TYPE: 'DRIVER',
    USER_STAT: 'ACTIVE'
  },
  {
    CUST_ID: 'P0001',
    USER_ID: 'partner1',
    PASSWORD: 'password123',
    USER_NM: '박파트너',
    USER_TYPE: 'PARTNER',
    USER_STAT: 'ACTIVE'
  }
];

export const login = async (userId, password, userType) => {
  // 실제 API 통신을 모뮬레이션하기 위한 지연 시간
  await new Promise(resolve => setTimeout(resolve, 800));

  const user = MOCK_USERS.find(u => u.USER_ID === userId && u.USER_TYPE === userType);

  if (!user) {
    throw new Error('아이디 또는 사용자 유형이 일치하지 않습니다.');
  }

  if (user.PASSWORD !== password) {
    throw new Error('비밀번호가 올바르지 않습니다.');
  }

  if (user.USER_STAT !== 'ACTIVE') {
    throw new Error('계정이 활성화 상태가 아닙니다.');
  }

  // 성공 시 사용자 정보 반환 (비밀번호 제외)
  const { PASSWORD, ...userWithoutPw } = user;
  return userWithoutPw;
};
