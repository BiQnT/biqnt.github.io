import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 모든 다국어 필드는 ko/en 을 함께 요구한다.
 * 한쪽만 채워진 항목은 빌드 단계에서 실패하므로 배포까지 도달하지 못한다.
 */
const i18nText = z.object({
  ko: z.string().min(1, 'ko 값이 비어 있습니다'),
  en: z.string().min(1, 'en 값이 비어 있습니다'),
});

/**
 * 선택 항목용. CMS 는 비워 둔 필드도 빈 문자열 객체로 저장하는 경우가 있어 빈 값을 허용하되,
 * 한쪽 언어만 채우는 desync 는 그대로 막는다.
 */
const i18nOptional = z
  .object({ ko: z.string(), en: z.string() })
  .refine((v) => (v.ko.trim() === '') === (v.en.trim() === ''), {
    message: 'ko/en 중 한쪽만 채울 수 없습니다. 둘 다 채우거나 둘 다 비우세요.',
  })
  .optional();

const i18nTags = z
  .object({ ko: z.array(z.string().min(1)), en: z.array(z.string().min(1)) })
  .refine((v) => v.ko.length === v.en.length, {
    message: 'ko/en 태그 개수가 일치해야 합니다',
  });

/** "YYYY" 또는 "YYYY-MM". 월을 모르는 항목을 억지로 지어내지 않기 위해 연도만도 허용한다. */
const datePoint = z
  .string()
  .regex(/^\d{4}(-(0[1-9]|1[0-2]))?$/, 'YYYY 또는 YYYY-MM 형식이어야 합니다');

/** 종료 시점. "present"는 진행 중, 필드 자체를 생략하면 단일 시점을 뜻한다. */
const dateEnd = z.union([datePoint, z.literal('present')]).optional();

const dated = {
  start: datePoint,
  end: dateEnd,
  /** 기간 뒤에 괄호로 붙는 부연 ("예정", "발표 예정" 등) */
  periodNote: i18nText.optional(),
};

/** end 가 실제 날짜인 경우에만 start 와의 선후를 검사한다. */
const chronological = <T extends { start: string; end?: string }>(v: T) =>
  v.end === undefined || v.end === 'present' || v.end >= v.start;
const chronologicalMessage = { message: 'end 는 start 보다 빠를 수 없습니다', path: ['end'] };

/** accepted 는 게재 확정, published 는 발표를 마치고 출판된 상태. 둘 다 CV 논문 섹션에 실린다 */
const status = z.enum(['completed', 'in-progress', 'accepted', 'published']);

/** 표시 순서. 날짜만으로는 정할 수 없는 항목(같은 해의 수상 등)이 있어 명시적으로 관리한다. */
const order = z.number().int().positive();

/**
 * CV 에 실을지 여부. 사이트에는 전부 나오지만 CV 는 A4 한 장이 목표라 항목을 골라야 한다.
 * 기본값이 true 라 기존 파일에 필드가 없어도 그대로 동작한다.
 */
const inCv = z.boolean().default(true);

/**
 * CV 전용 문장. 비워 두면 description 을 쓴다.
 * 사이트는 서술형이 자연스럽지만 CV 는 성과 중심으로 끊어 쓰는 게 맞아서 따로 둘 수 있게 한다.
 * 줄바꿈 하나가 불릿 하나가 된다.
 */
const cvText = i18nOptional;

const experience = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/experience' }),
  schema: z
    .object({
      kind: z.enum(['main', 'sub']),
      order,
      cv: inCv,
      title: i18nText,
      organization: i18nOptional,
      location: i18nOptional,
      description: i18nOptional,
      cvText,
      ...dated,
    })
    .refine(chronological, chronologicalMessage),
});

const education = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/education' }),
  schema: z
    .object({
      order,
      cv: inCv,
      title: i18nText,
      organization: i18nText,
      description: i18nOptional,
      cvText,
      ...dated,
    })
    .refine(chronological, chronologicalMessage),
});

const memberships = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/memberships' }),
  schema: z
    .object({
      order,
      cv: inCv,
      title: i18nText,
      organization: i18nText,
      description: i18nOptional,
      /** ko/en 표기를 함께 담은 단일 문자열이라 번역 대상이 아니다 */
      issuer: z.string().optional(),
      ...dated,
    })
    .refine(chronological, chronologicalMessage),
});

const awards = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/awards' }),
  schema: z.object({
    order,
    cv: inCv,
    name: i18nText,
    year: z.string().regex(/^\d{4}$/, 'YYYY 형식이어야 합니다'),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/projects' }),
  schema: z.object({
    order,
    cv: inCv,
    title: i18nText,
    description: i18nText,
    cvText,
    tags: i18nTags,
    link: z.string().url(),
    status,
  }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/research' }),
  schema: z
    .object({
      order,
      cv: inCv,
      title: i18nText,
      organization: i18nText,
      description: i18nText,
      cvText,
      tags: i18nTags,
      link: z.string().url().optional(),
      status,
      ...dated,
    })
    .refine(chronological, chronologicalMessage),
});

/**
 * GitHub 저장소 노출 통제.
 * 어떤 저장소를 어떤 순서로 보여줄지는 여기서 정하고,
 * 설명·언어·스타 수는 빌드 시점에 GitHub API 에서 채운다.
 */
const repos = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/repos' }),
  schema: z.object({
    order,
    /** GitHub 저장소 이름. 대소문자까지 정확히 일치해야 메타데이터가 붙는다. */
    name: z.string().min(1),
    visible: z.boolean(),
    /** GitHub 설명 대신 직접 쓰고 싶을 때만 채운다. */
    description: i18nOptional,
  }),
});

/**
 * 프로필. 이름과 소개 문구를 코드가 아니라 콘텐츠로 둬서 admin 에서 고칠 수 있게 한다.
 */
const profile = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/profile' }),
  schema: z.object({
    name: i18nText,
    /** 히어로에서 두 줄로 쪼개 크게 세우는 로마자 이름 */
    latinFirst: z.string().min(1),
    latinLast: z.string().min(1),
    title: i18nText,
    /** 이름 위에 얹는 관심 분야 키워드 */
    keywords: i18nTags,
    /** 히어로 한 문장 */
    intro: i18nText,
    /** ABOUT 섹션 본문. 빈 줄로 문단을 나눈다 */
    about: i18nText,
  }),
});

/**
 * CV 문서 구성. 어떤 섹션을 어떤 순서로 실을지 여기서 정한다.
 * 배열 순서가 곧 CV 의 섹션 순서다. admin 에서 끌어서 바꿀 수 있다.
 */
const cvConfig = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/cv-config' }),
  schema: z.object({
    showKoreanName: z.boolean().default(true),
    location: i18nText,
    sections: z
      .array(
        z.object({
          id: z.enum(['education', 'publications', 'research', 'experience', 'honors', 'projects', 'activities']),
          enabled: z.boolean().default(true),
          label: i18nText,
        })
      )
      .min(1)
      .refine((v) => new Set(v.map((s) => s.id)).size === v.length, {
        message: '같은 섹션을 두 번 넣을 수 없습니다',
      }),
  }),
});

export const collections = { experience, education, memberships, awards, projects, research, repos, cvConfig, profile };
