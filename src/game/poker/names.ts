/** Display names are independent of the bots' playing styles. */
export const NPC_NAMES = [
  '薇拉', '幸运儿', '老莫', '阿川', '小满', '北辰', '晚风', '木子',
  '青禾', '阿洛', '星野', '南山', '小鹿', '云舟', '墨白', '七喜',
  '橘子', '阿哲', '海盐', '冬青', '小麦', '林深', '听雨', '长安',
  '可乐', '阿岚', '石头', '月白', '小鱼', '远帆', '晨曦', '竹影',
  '白桃', '阿宁', '松果', '流星', '山茶', '小夏', '知秋', '蓝鲸',
] as const

export function randomNpcName(excluded: Iterable<string> = []): string {
  const used = new Set(excluded)
  const available = NPC_NAMES.filter((name) => !used.has(name))
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)]!
  }
  let suffix = 1
  while (used.has(`牌友${suffix}`)) suffix++
  return `牌友${suffix}`
}
