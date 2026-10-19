# biqnt.github.io

안동현(Donghyun Ahn) 개인 사이트. Astro 정적 사이트이고 GitHub Pages 로 배포된다.

- 사이트: https://biqnt.github.io
- CV: https://biqnt.github.io/ko/cv (PDF 내려받기 포함)
- 콘텐츠 관리: https://biqnt.github.io/admin/

---

## 내용을 고치는 방법

**코드를 열 필요도, 터미널을 열 필요도 없다.** 폰에서도 된다.

1. https://biqnt.github.io/admin/ 접속
2. GitHub Personal Access Token 으로 로그인 (아래 "토큰 발급" 참고)
3. 왼쪽에서 컬렉션을 고르고 항목을 추가·수정·삭제
4. 저장 → `main` 에 자동 커밋 → GitHub Actions 가 재배포
5. **1~2분 뒤 사이트에 반영된다.** 사이트를 열어 실제로 반영됐는지 확인할 것

### 반영이 안 될 때

저장은 성공했는데 사이트가 그대로라면 빌드가 실패한 것이다.
[Actions 탭](https://github.com/biqnt/biqnt.github.io/actions)에서 빨간 표시를 확인한다.
대개 스키마 위반이며(필수 필드 누락, 날짜 형식 오류, 한쪽 언어만 입력),
실패 로그에 어떤 항목의 어떤 필드가 문제인지 한국어로 나온다.

**잘못된 데이터가 공개되는 일은 없다.** 스키마를 통과하지 못하면 배포 자체가 막힌다.

### 토큰 발급

1. GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens**
2. Repository access: **`biqnt/biqnt.github.io` 하나만**
3. Permissions → Repository permissions → **Contents: Read and write**
4. 만료일을 설정하고 발급, `/admin` 에서 "Sign In with Token" 에 붙여넣기

토큰은 브라우저 localStorage 에만 저장된다. 공용 기기에서는 쓰지 않는다.
유출이 의심되면 GitHub 에서 즉시 폐기하면 된다.

---

## LinkedIn 에서 가져오기

LinkedIn 은 프로필을 읽는 API 를 주지 않는다. 대신 Claude Code 스킬로 반자동화한다.

1. LinkedIn 프로필 → `더보기(More)` → `PDF로 저장(Save to PDF)`
2. 이 저장소에서 Claude Code 를 열고 `/sync-linkedin ~/Downloads/Profile.pdf`
3. 새 항목·바뀐 항목 목록을 확인하고 승인하면 `src/content/` 에 ko/en 두 언어로 써진다
4. `git diff` 를 보고 커밋한다

사이트에만 있는 항목은 지우지 않는다. 자세한 규칙은 `.claude/skills/sync-linkedin/SKILL.md` 에 있다.

---

## 데이터 구조

내용은 전부 `src/content/` 아래에 **항목당 파일 하나**로 들어 있다.

| 폴더 | 내용 | 사이트에서의 모습 |
| --- | --- | --- |
| `experience/` | 경력·활동 (`kind: main` / `sub`) | main 은 카드, sub 는 표 한 줄 |
| `research/` | 연구·논문 | 카드. `status: accepted` 는 CV 논문 섹션으로 |
| `projects/` | 직접 쓴 프로젝트 소개 | 카드 |
| `repos/` | GitHub 저장소 노출 통제 | 작은 카드 |
| `awards/` | 수상 | 활동 표에 ★ 표시로 합류 |
| `memberships/` | 명예·멤버십 | 앰버 카드 |
| `education/` | 학력 | 카드 |

### 설계 원칙 세 가지

**1. 언어는 필드 안에 있다.** ko/en 을 별도 배열로 두지 않는다.

```json
{ "title": { "ko": "AX Engineer 인턴", "en": "AX Engineer Intern" } }
```

한쪽 언어만 채우면 빌드가 실패한다. 두 언어가 어긋날 수 없는 구조다.

**2. 기간은 구조화해서 넣는다.** 표시 문자열은 렌더 시점에 만든다.

```json
{ "start": "2026-06", "end": "present" }
→ ko "2026.06 - 현재"  /  en "Jun 2026 - Present"
```

`end` 는 세 가지다. 날짜(`2026-06`), 진행 중(`present`), 단일 시점(필드 자체를 생략).
월을 모르면 연도만(`2024`) 써도 된다.

**3. 카드냐 표냐는 설명 유무로 갈린다.** 설명이 있으면 카드, 없으면 표 한 줄이다.
수상 없이 참가만 한 대회도 활동 표에 그냥 한 줄 추가하면 된다. 결과 칸을 비워 두면 된다.

---

## 필드를 추가·변경할 때

**두 파일을 반드시 함께 고친다.**

| 파일 | 역할 |
| --- | --- |
| `src/content.config.ts` | Zod 스키마. **진실의 원천**이며 빌드를 통과시킬지 결정한다 |
| `public/admin/config.yml` | CMS 입력 폼. 위 스키마와 1:1 로 대응해야 한다 |

한쪽만 고치면 CMS 에서 저장은 되는데 배포만 조용히 실패한다.

두 정의가 일치하는지 확인하려면:

```bash
python3 - <<'EOF'
import yaml, json, os, glob
cfg = yaml.safe_load(open('public/admin/config.yml'))
for c in cfg['collections']:
    cms = {f['name'] for f in c['fields']}
    data = set().union(*[set(json.load(open(f)).keys())
                         for f in glob.glob(os.path.join(c['folder'], '*.json'))] or [set()])
    missing = data - cms
    print(f"{c['name']:<14}{'OK' if not missing else 'CMS 누락: ' + str(sorted(missing))}")
EOF
```

---

## CV

`/[lang]/cv` 는 사이트와 **같은 콘텐츠 컬렉션**에서 생성된다.
CV 원고를 따로 두지 않으므로 사이트와 CV 가 어긋날 수 없다.
데이터를 한 번 고치면 사이트·CV 페이지·PDF 세 곳이 동시에 갱신된다.

PDF 는 배포할 때마다 GitHub Actions 가 Playwright 로 다시 굽는다.

```
/cv/donghyun-ahn-cv-ko.pdf
/cv/donghyun-ahn-cv-en.pdf
```

PDF 생성이 실패해도 사이트 배포는 계속된다. `/[lang]/cv` 에서 브라우저 인쇄가 상시 대체 수단이다.

CV 는 긴 서술의 **첫 문단만** 싣는다. 연구 설명을 빈 줄로 나눠 쓰면
첫 문단이 CV 용 요약, 나머지가 사이트용 상세가 된다.

---

## GitHub 저장소 목록

`src/content/repos/` 에서 저장소별로 노출 여부와 순서를 정한다.
설명·언어·스타 수는 **빌드 시점에** GitHub API 에서 한 번 받아 정적으로 굽는다.

```json
{ "order": 1, "name": "alt2obsidian", "visible": true }
```

`description` 을 채우면 GitHub 설명 대신 그것을 쓴다. ko/en 을 따로 쓸 수 있어서
영문 설명뿐인 저장소에 한글 설명을 붙일 수 있다.

새 저장소를 만들었다면 CMS 에서 항목을 추가해야 목록에 나온다.
GitHub API 가 실패해도 빌드는 깨지지 않으며, 그 경우 이름과 링크만 표시된다.

---

## 로컬 개발

```bash
npm install
npm run dev          # http://localhost:4321/ko/
npm run build        # 정적 빌드
npm run build:full   # 빌드 + CV PDF 생성 (Playwright 필요)
npm run cv:pdf       # PDF 만 다시 생성 (build 이후에 실행)
```

`npm run build` 는 `dist/` 를 비우므로, PDF 링크까지 확인하려면 `build:full` 을 쓴다.

**dev 서버 주의점**: `astro.config.mjs` 의 `prefixDefaultLocale: true` 때문에
로케일 접두사가 없는 경로는 dev 에서 404 가 난다. `/admin/` 이 dev 에서 안 열리는 이유이며,
정적 배포에서는 정상 동작한다.

---

## 디자인

라이트를 기본으로 하고 다크는 `html.dark` 로 덮어쓴다.
색은 전부 `src/styles/global.css` 상단의 CSS 변수로 관리하며,
모든 텍스트 색은 WCAG AA(4.5:1) 이상으로 실측 확인했다.

폰트는 두 가지만 쓴다.

- **DungGeunMo** (픽셀): 제목·네비·라벨·기간·태그·버튼 등 표시용. 12px 이상에만 쓴다
- **Pretendard**: 본문과 읽어야 하는 실제 데이터(이메일, 소속, 지명)

`src/lib/site.ts` 의 `AVATAR` 와 `CV_PATH` 는 `null` 이면 해당 UI 가 아예 렌더되지 않는다.
빈 상자나 죽은 링크가 남지 않으므로 값을 채우는 것만으로 안전하게 켤 수 있다.
아바타가 준비되면 `AVATAR` 에 경로만 넣으면 된다.
