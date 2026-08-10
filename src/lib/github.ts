/**
 * 빌드 시점에 GitHub 저장소 메타데이터를 한 번만 받아 온다.
 *
 * 런타임에 브라우저가 직접 호출하지 않는 이유:
 * 비인증 GitHub API 는 IP 당 시간당 60회로 제한되어 방문자가 몰리면 목록이 비고,
 * 자바스크립트로 그리면 첫 화면에 목록이 없어 크롤러도 보지 못한다.
 * 빌드 때 구워 두면 두 문제가 모두 사라진다.
 *
 * 네트워크가 없거나 API 가 실패해도 빌드를 깨뜨리지 않는다.
 * 그 경우 저장소는 이름과 링크만으로 렌더된다.
 */

export interface RepoMeta {
  name: string;
  url: string;
  description: string | null;
  language: string | null;
  stars: number;
}

let cache: Map<string, RepoMeta> | null = null;

export async function fetchRepoMeta(user: string): Promise<Map<string, RepoMeta>> {
  if (cache) return cache;

  try {
    const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=100`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = (await res.json()) as Array<{
      name: string;
      html_url: string;
      description: string | null;
      language: string | null;
      stargazers_count: number;
    }>;

    cache = new Map(
      data.map((r) => [
        r.name,
        {
          name: r.name,
          url: r.html_url,
          description: r.description,
          language: r.language,
          stars: r.stargazers_count,
        },
      ])
    );
  } catch (err) {
    console.warn(
      `[github] 저장소 메타데이터를 가져오지 못했습니다 (${err instanceof Error ? err.message : err}). ` +
        `저장소는 이름과 링크만 표시됩니다.`
    );
    cache = new Map();
  }

  return cache;
}

/** GitHub 언어별 대표 색. 목록에 없으면 중립색으로 떨어진다. */
export const LANGUAGE_COLORS: Record<string, string> = {
  Astro: '#ff5a03',
  C: '#555555',
  'C++': '#f34b7d',
  CSS: '#563d7c',
  Go: '#00ADD8',
  HTML: '#e34c26',
  Java: '#b07219',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Shell: '#89e051',
  Svelte: '#ff3e00',
  TypeScript: '#3178c6',
  Verilog: '#b2b7f8',
  Vue: '#41b883',
};

export const NEUTRAL_LANGUAGE_COLOR = '#8b93a1';
