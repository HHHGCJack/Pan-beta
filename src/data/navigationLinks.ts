export type ProductKey = 'pansou' | 'reading-pro' | 'ai-agent' | 'chat';

export interface NavigationLink {
  id: string;
  name: string;
  group: string;
  href: string;
  aliases?: string[];
  productKey?: ProductKey;
  parentId?: string;
  fixed?: boolean;
}

export const NAVIGATION_LINKS: NavigationLink[] = [
  { id: 'home', name: '首页', group: '站内页面', href: '/', fixed: true },
  { id: 'admin', name: 'Admin 管理后台', group: '站内页面', href: '/admin', fixed: true },
  { id: 'intro-pansou', name: '网盘资源简介', group: '产品简介', href: '/showcase/pansou', productKey: 'pansou' },
  { id: 'intro-reading', name: '外刊精读简介', group: '产品简介', href: '/showcase/reading-pro', productKey: 'reading-pro' },
  { id: 'intro-ai', name: 'AI 投资智能体简介', group: '产品简介', href: '/showcase/ai-agent', productKey: 'ai-agent' },
  { id: 'intro-chat', name: '即时聊天简介', group: '产品简介', href: '/showcase/chat', productKey: 'chat' },
  { id: 'pansou-primary', name: '网盘搜索主线路', group: '产品功能', href: 'https://so.252035.xyz', productKey: 'pansou' },
  { id: 'pansou-backup', name: '网盘搜索备用线路', group: '产品功能', href: 'https://pansou.app/', productKey: 'pansou' },
  { id: 'reader', name: '外刊阅读空间', group: '产品功能', href: '/reading-pro', productKey: 'reading-pro' },
  { id: 'research', name: 'AI 投资研究控制台', group: '产品功能', href: 'https://cash.gongpan.org', productKey: 'ai-agent' },
  { id: 'chat-client', name: '即时聊天客户端', group: '产品功能', href: 'http://gongcheng.yyboxdns.com:21312/', productKey: 'chat' },
  { id: 'laboratory', name: '实验室', group: '实验室', href: '/laboratory' },
  { id: 'lab-tools', name: '工具分类', group: '实验室', href: '/laboratory?category=tools', aliases: ['/laboratory?category=tool', '/laboratory?tab=tools', '/laboratory?tab=tool'], parentId: 'laboratory' },
  { id: 'lab-games', name: '小游戏分类', group: '实验室', href: '/laboratory?category=games', aliases: ['/laboratory#games', '/laboratory?category=game', '/laboratory?tab=games', '/laboratory?tab=game'], parentId: 'laboratory' },
  { id: 'tool-glass', name: '液态玻璃调试器', group: '工具', href: '/laboratory?category=tools&tab=glass', aliases: ['/laboratory?tab=glass'], parentId: 'lab-tools' },
  { id: 'tool-json', name: 'JSON 格式化工具', group: '工具', href: '/laboratory?category=tools&tab=json', aliases: ['/laboratory?tab=json'], parentId: 'lab-tools' },
  { id: 'tool-codec', name: '文本编解码工具', group: '工具', href: '/laboratory?category=tools&tab=codec', aliases: ['/laboratory?tab=codec'], parentId: 'lab-tools' },
  { id: 'tool-token', name: '随机密码生成器', group: '工具', href: '/laboratory?category=tools&tab=token', aliases: ['/laboratory?tab=token'], parentId: 'lab-tools' },
  { id: 'game-roadster', name: 'Roadster · 气动逃逸', group: '小游戏', href: 'https://roadster-game-d4gk0fp9k5bde5fd2-1508914020.tcloudbaseapp.com/roadster-game/', aliases: ['/laboratory?category=games&game=roadster'], parentId: 'lab-games' },
  { id: 'game-zhuzhiliao', name: '竹知了', group: '小游戏', href: 'https://huawei.dog/', aliases: ['/laboratory?category=games&game=zhuzhiliao'], parentId: 'lab-games' },
  { id: 'contact-github', name: 'GitHub 主页', group: '联系与支持', href: 'https://github.com/gongpan' },
  { id: 'support-qr', name: '赞赏收款码下载', group: '联系与支持', href: 'https://pic1.imgdb.cn/i/034BLlXycinjzppzDQlRoC.jpg' },
];

const INTERNAL_ORIGIN = 'https://gongpan.invalid';
const SITE_HOSTS = new Set(['gongpan.org', 'www.gongpan.org', 'gongpan.netlify.app', '127.0.0.1', 'localhost']);

export function normalizeShowcaseId(raw: string): ProductKey {
  const id = raw.toLowerCase().trim();
  if (['reading-pro', 'readingpro', 'reading', 'journal', 'waikan'].includes(id)) return 'reading-pro';
  if (['ai-agent', 'ai', 'agent', 'invest', 'quant'].includes(id)) return 'ai-agent';
  if (['chat', 'gongpan-chat', 'im', 'telegram', 'messenger'].includes(id)) return 'chat';
  return 'pansou';
}

function parseLink(href: string, origin: string) {
  const url = new URL(href, origin);
  if (url.origin === origin || SITE_HOSTS.has(url.hostname)) {
    if (url.pathname.startsWith('/showcase/')) {
      url.pathname = `/showcase/${normalizeShowcaseId(url.pathname.slice('/showcase/'.length).replace(/\/$/, ''))}`;
    }
    return new URL(url.pathname + url.search + url.hash, INTERNAL_ORIGIN);
  }
  return url;
}

export function findNavigationLink(href: string, origin = INTERNAL_ORIGIN): NavigationLink | undefined {
  let target: URL;
  try { target = parseLink(href, origin); }
  catch { return undefined; }
  // Specific query destinations precede their parent pages. Parameter order and
  // unrelated tracking parameters do not change the destination's switch.
  return NAVIGATION_LINKS.flatMap(link => [link.href, ...(link.aliases || [])].map(address => ({ link, address })))
    .sort((a, b) => b.address.length - a.address.length)
    .find(({ address }) => {
      const candidate = parseLink(address, INTERNAL_ORIGIN);
      return candidate.origin === target.origin && candidate.pathname.replace(/\/$/, '') === target.pathname.replace(/\/$/, '')
        && [...candidate.searchParams].every(([key, value]) => target.searchParams.get(key) === value)
        && (!candidate.hash || candidate.hash === target.hash);
    })?.link;
}

export function getBlockedNavigationLink(
  href: string,
  linksEnabled: Record<string, boolean>,
  productsEnabled: Record<string, boolean>,
  origin = INTERNAL_ORIGIN,
): NavigationLink | undefined {
  let link = findNavigationLink(href, origin);
  while (link) {
    if (!link.fixed && (linksEnabled[link.id] === false || (link.productKey && productsEnabled[link.productKey] === false))) return link;
    link = NAVIGATION_LINKS.find(parent => parent.id === link?.parentId);
  }
  return undefined;
}
