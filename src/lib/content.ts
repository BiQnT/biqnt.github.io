import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';

/**
 * 컬렉션을 order 오름차순으로 반환한다.
 * 날짜만으로는 순서를 정할 수 없는 항목(같은 해의 수상, 날짜가 없는 프로젝트)이 있어
 * 표시 순서는 명시적인 order 필드로 관리한다.
 */
export async function getOrdered<K extends CollectionKey>(key: K): Promise<CollectionEntry<K>[]> {
  const entries = await getCollection(key);
  return [...entries].sort(
    (a, b) => (a.data as { order: number }).order - (b.data as { order: number }).order
  );
}
