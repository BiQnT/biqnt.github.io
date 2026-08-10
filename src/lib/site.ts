/**
 * 아직 준비되지 않은 자산을 한 곳에서 관리한다.
 *
 * null 이면 해당 UI 자체가 렌더되지 않는다. 빈 상자나 깨진 이미지,
 * 죽은 링크가 남지 않으므로 값을 채우는 것만으로 안전하게 켤 수 있다.
 * 레이아웃도 값이 있을 때와 없을 때 모두 성립하도록 짜여 있다.
 */

/** 프로필 이미지 경로. 아바타가 준비되면 '/images/avatar.png' 처럼 채운다. */
export const AVATAR: string | null = null;

/** CV 페이지 경로. 채워지면 상단바와 레일의 CV 버튼이 함께 켜진다. */
export const CV_PATH: string | null = 'cv';

export const SOCIAL = {
  githubUser: 'biqnt',
  github: 'https://github.com/biqnt',
  linkedin: 'https://www.linkedin.com/in/donghyun-ahn-biqnt',
  email: 'adh2498@postech.ac.kr',
} as const;

/** 한 페이지 안의 섹션 목차. 상단 네비와 좌측 레일이 같은 배열을 쓴다. */
export const SECTIONS = [
  { id: 'experience', n: '01', key: 'section.experience', en: 'EXPERIENCE' },
  { id: 'research', n: '02', key: 'section.research', en: 'RESEARCH' },
  { id: 'projects', n: '03', key: 'section.projects', en: 'PROJECTS' },
  { id: 'honors', n: '04', key: 'section.honors', en: 'HONORS' },
  { id: 'activity', n: '05', key: 'section.activity', en: 'ACTIVITY' },
  { id: 'education', n: '06', key: 'section.education', en: 'EDUCATION' },
] as const;
