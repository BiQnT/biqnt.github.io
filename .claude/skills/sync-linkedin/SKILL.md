---
name: sync-linkedin
description: LinkedIn 프로필(PDF 내보내기 또는 붙여넣은 텍스트)을 읽어 src/content/ 의 JSON 과 대조하고, 새 항목·바뀐 항목을 ko/en 두 언어로 써 넣는다. "링크드인 싱크", "linkedin 반영", "/sync-linkedin <pdf 경로>" 로 호출.
---

# LinkedIn → 사이트 콘텐츠 동기화

LinkedIn 에는 프로필을 읽는 API 가 없다. 그래서 입력은 두 가지뿐이다.

1. **PDF**: LinkedIn 프로필 페이지 → `더보기(More)` → `PDF로 저장(Save to PDF)`. 즉시 내려받아진다.
   `/sync-linkedin ~/Downloads/Profile.pdf` 처럼 경로를 넘긴다.
2. **텍스트**: 프로필 섹션을 복사해 채팅에 붙여넣는다.

출력은 `src/content/**/*.json` 의 변경이다. 커밋은 하지 않는다. 사용자가 diff 를 보고 결정한다.

## 절차

1. 입력을 읽는다. PDF 는 Read 도구로 페이지를 넘기며 읽는다. 한 언어로만 쓰여 있어도 된다.
2. `src/content.config.ts` 를 읽어 **현재 스키마**를 확인한다. 이 파일이 진실의 원천이다. 아래 매핑표가 스키마와 다르면 스키마를 따른다.
3. `src/content/` 아래 기존 JSON 을 전부 읽는다.
4. LinkedIn 의 각 항목을 기존 항목과 **조직명 + 시작 시점**으로 매칭한다. 표기가 달라도(코인원 / Coinone / 주식회사 코인원) 같은 조직이면 같은 항목이다.
5. 세 묶음으로 나눠 사용자에게 먼저 보여 준다.
   - 새 항목: 사이트에 없음 → 파일을 새로 만든다
   - 바뀐 항목: 기간·직함·설명이 다름 → 해당 필드만 고친다
   - 사이트에만 있는 항목: **건드리지 않는다**. 삭제는 사용자가 admin 이나 직접 한다
6. 파일을 쓴다. 규칙은 아래.
7. `npm run build` 로 스키마 검증을 통과하는지 확인한다. 실패하면 로그의 필드명을 보고 고친다.
8. `git diff --stat` 과 함께 무엇을 바꿨는지 한 줄씩 보고한다.

## 매핑표

| LinkedIn 섹션 | 컬렉션 | 비고 |
| --- | --- | --- |
| Experience (경력) | `experience/` | 회사·연구실·인턴은 `kind: main`. 동아리·밴드·단기 활동은 `kind: sub` |
| Education (학력) | `education/` | |
| Publications (출판물) | `research/` | `status: accepted`, `link` 에 DOI 나 IEEE 링크 |
| Projects (프로젝트) | `projects/` | `link` 가 필수다. 없으면 GitHub 저장소 URL 을 쓴다 |
| Honors & awards (수상) | `awards/` | 연도만 있다. 활동 표에 합류한다 |
| Organizations (단체) | `memberships/` | 장학재단·학회·공학한림원 등 |
| Licenses, Skills, Courses | 없음 | 사이트에 싣지 않는다 |

## 쓰기 규칙

- **파일 이름**: `NN-slug.json`. NN 은 그 컬렉션에서 비어 있는 다음 번호, slug 는 영문 소문자와 하이픈. 예: `09-samsung-sds.json`
- **order**: 최신이 위로 오도록 한다. 새 항목이 가장 최근이면 기존 order 를 1씩 밀어 1번을 준다.
- **날짜**: `YYYY-MM`. 월을 모르면 `YYYY`. 진행 중은 `end: "present"`. 단일 시점(수상·발표)은 `end` 를 생략한다.
- **두 언어 모두 채운다.** LinkedIn 이 한 언어뿐이면 나머지 언어는 번역한다. 번역은 아래 어투를 따른다.
  - ko: 기존 파일과 같은 "~했습니다" 체. 조직명은 `코인원 (Coinone)` 처럼 한글 + 괄호 영문.
  - en: 기존 파일과 같은 1인칭 서술. 조직명은 영문 공식 명칭.
  - 고유명사(논문 제목, 제품명, 프로토콜명)는 번역하지 않는다.
- **description**: LinkedIn 본문을 그대로 옮기되 불릿은 `- ` 로 시작하는 줄로 둔다. 빈 줄로 문단을 나누면 첫 문단이 CV 요약이 된다.
- **cvText 는 비운다.** CV 문장은 사용자가 따로 다듬는다.
- **tags**: ko/en 개수가 같아야 한다. LinkedIn 의 Skills 에서 그 항목에 해당하는 것을 3~5개 고른다.
- 기존 항목의 필드를 고칠 때 **사용자가 사이트에서 더 길게 써 둔 설명을 LinkedIn 의 짧은 설명으로 덮어쓰지 않는다.** 길이가 줄어드는 변경은 "바뀐 항목" 목록에 표시만 하고 사용자가 고르게 한다.
- `public/admin/config.yml` 은 건드리지 않는다. 필드를 추가하는 작업이 아니다.

## 역방향이 필요할 때

사이트가 더 최신이고 LinkedIn 을 맞춰야 한다면, 각 항목의 `title.en`, `organization.en`, 기간, `description.en` 을 LinkedIn 입력란 순서대로 붙여넣기 좋게 묶어서 출력한다. LinkedIn 은 자동으로 쓸 수 없으므로 거기까지가 할 수 있는 전부다.
