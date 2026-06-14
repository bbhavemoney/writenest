export const STORAGE_SCHEMA_VERSION = 4;

const moonRoadChapterOne =
  "第一章：月下渡口\n\n月色落在青石渡口，像一層薄霜。林知夏拎著舊木匣，站在回鄉的船前，看見沈暮寒從霧裡走來。\n\n「你終於回來了。」他說。\n\n她原本想問的話忽然停在唇邊。三年前那場失火、那封沒有寄出的信，和許言最後一次出現在月下的背影，一起在夜風裡醒了過來。\n\n白若寧從船艙裡探出頭，壓低聲音提醒她：「知夏，別太相信渡口上的人。」";

const moonRoadChapterTwo =
  "第二章：舊信與寒燈\n\n客棧的燈在雨後顯得格外清冷。沈暮寒替林知夏推開門，袖口沾著一點未乾的水痕。\n\n「若那封信是真的，許言就不是旁觀者。」沈暮寒說。\n\n白若寧把茶盞放下，神色少見地嚴肅：「我查過當年的巡夜名冊，少了一頁。」\n\n窗外有人輕輕敲了三下。林知夏抬頭，只看見一枚黑色玉扣落在窗沿，像某種遲來的警告。";

export const roleTypeOptions = ["主角", "男主", "朋友", "隱藏反派", "配角", "反派", "其他"];

export const defaultWorkspaceData = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  projects: [
    {
      id: "project-moon-road",
      title: "月下歸途",
      type: "小說",
      updatedAt: "今天 21:10",
      documentIds: ["doc-moon-ferry", "doc-old-letter"],
    },
  ],
  documents: [
    {
      id: "doc-moon-ferry",
      projectId: "project-moon-road",
      title: "第一章：月下渡口",
      kind: "小說",
      updatedAt: "今天 21:10",
      content: moonRoadChapterOne,
      contentHtml:
        "<h1>第一章：月下渡口</h1><p>月色落在青石渡口，像一層薄霜。林知夏拎著舊木匣，站在回鄉的船前，看見沈暮寒從霧裡走來。</p><blockquote><p>「你終於回來了。」他說。</p></blockquote><p>她原本想問的話忽然停在唇邊。三年前那場失火、那封沒有寄出的信，和許言最後一次出現在月下的背影，一起在夜風裡醒了過來。</p><p>白若寧從船艙裡探出頭，壓低聲音提醒她：「知夏，別太相信渡口上的人。」</p>",
    },
    {
      id: "doc-old-letter",
      projectId: "project-moon-road",
      title: "第二章：舊信與寒燈",
      kind: "小說",
      updatedAt: "今天 21:03",
      content: moonRoadChapterTwo,
      contentHtml:
        "<h1>第二章：舊信與寒燈</h1><p>客棧的燈在雨後顯得格外清冷。沈暮寒替林知夏推開門，袖口沾著一點未乾的水痕。</p><blockquote><p>「若那封信是真的，許言就不是旁觀者。」沈暮寒說。</p></blockquote><p>白若寧把茶盞放下，神色少見地嚴肅：「我查過當年的巡夜名冊，少了一頁。」</p><p>窗外有人輕輕敲了三下。林知夏抬頭，只看見一枚黑色玉扣落在窗沿，像某種遲來的警告。</p>",
    },
  ],
  characters: [
    {
      id: "char-lin",
      fullName: "林知夏",
      nicknames: ["知夏", "小夏"],
      roleType: "主角",
      description: "月下歸途的女主角，回鄉調查三年前的失火真相。敏銳、克制，擅長從細節裡找到破綻。",
      notes: "身份：歸鄉書吏之女。隨身帶著舊木匣與半封殘信。",
    },
    {
      id: "char-shen-muhan",
      fullName: "沈暮寒",
      nicknames: ["暮寒", "沈公子"],
      roleType: "男主",
      description: "守在渡口的青年，也是林知夏的青梅竹馬。外冷內熱，知道許多不願明說的往事。",
      notes: "身份：沈家少主。暗中保護知夏，與許言有舊怨。",
    },
    {
      id: "char-bai",
      fullName: "白若寧",
      nicknames: ["若寧", "阿寧"],
      roleType: "朋友",
      description: "林知夏的好友，消息靈通、行事爽快，是隊伍裡最擅長打聽線索的人。",
      notes: "身份：客棧掌櫃之女。表面愛玩笑，實際藏著許多可靠人脈。",
    },
    {
      id: "char-xu",
      fullName: "許言",
      nicknames: ["阿言", "許先生"],
      roleType: "隱藏反派",
      description: "溫和有禮的舊識，表面協助眾人追查真相，實際與失火案有深層關聯。",
      notes: "身份：鎮上文書。擅長偽裝善意，留下黑色玉扣作為警告。",
    },
  ],
  relationships: {
    customTypes: [
      { label: "青梅竹馬", color: "#7b8cc9" },
      { label: "敵對", color: "#b45b52" },
    ],
    nodes: [
      { characterId: "char-lin", x: 120, y: 110 },
      { characterId: "char-shen-muhan", x: 380, y: 95 },
      { characterId: "char-bai", x: 150, y: 285 },
      { characterId: "char-xu", x: 520, y: 275 },
    ],
    edges: [
      { id: "rel-lin-shen-muhan", from: "char-lin", to: "char-shen-muhan", label: "青梅竹馬", color: "#7b8cc9" },
      { id: "rel-lin-bai", from: "char-lin", to: "char-bai", label: "朋友", color: "#6497a8" },
      { id: "rel-shen-xu", from: "char-shen-muhan", to: "char-xu", label: "敵對", color: "#b45b52" },
      { id: "rel-xu-lin", from: "char-xu", to: "char-lin", label: "暗戀", color: "#8b7fd6" },
    ],
  },
  savedWords: [
    {
      id: "word-moonlight",
      term: "清輝",
      word: "清輝",
      tag: "氛圍",
      tags: ["月色", "古風", "景物"],
      tone: "古風",
      meaning: "清冷明亮的光，多用於月光或燈影。",
      example: "月色的清輝落滿渡口，照得舊木匣邊角發白。",
    },
    {
      id: "word-cold-lamp",
      term: "寒燈",
      word: "寒燈",
      tag: "景物",
      tags: ["夜晚", "孤寂", "古風"],
      tone: "悲傷",
      meaning: "清冷的燈火，常用來描寫夜晚孤寂氣氛。",
      example: "客棧寒燈未滅，像仍有人在等一個不歸的人。",
    },
    {
      id: "word-old-dream",
      term: "舊夢",
      word: "舊夢",
      tag: "情緒",
      tags: ["回憶", "遺憾", "往事"],
      tone: "溫柔",
      meaning: "過去的夢想或記憶，帶有懷念與失落。",
      example: "她在他的眼底看見舊夢，也看見不肯說出口的告別。",
    },
    {
      id: "word-foreshadow",
      term: "伏筆",
      word: "伏筆",
      tag: "敘事",
      tags: ["線索", "懸疑", "結構"],
      tone: "正式",
      meaning: "提前埋下之後會回收的線索或暗示。",
      example: "窗沿上的黑色玉扣，是整章最安靜的伏筆。",
    },
    {
      id: "word-prophecy",
      term: "一語成讖",
      word: "一語成讖",
      tag: "成語",
      tags: ["成語", "命運", "轉折"],
      tone: "悲傷",
      meaning: "不經意說出的話後來竟然應驗。",
      example: "白若寧那句玩笑話，到了天亮時竟一語成讖。",
    },
  ],
};

export function createWorkspaceData(overrides = {}) {
  const defaults = structuredClone(defaultWorkspaceData);
  const documents = (overrides.documents ?? defaults.documents).map((document) => ({
    ...document,
    contentHtml: document.contentHtml ?? plainTextToHtml(document.content ?? ""),
  }));
  const characters = (overrides.characters ?? defaults.characters).map(normalizeCharacter);
  const characterIds = new Set(characters.map((character) => character.id));
  const rawRelationships = {
    ...defaults.relationships,
    ...(overrides.relationships ?? {}),
  };
  const relationshipNodeIds = new Set();
  const relationshipNodes = [
    ...rawRelationships.nodes,
    ...defaults.relationships.nodes.filter((node) => characterIds.has(node.characterId)),
  ]
    .filter((node) => characterIds.has(node.characterId))
    .filter((node) => {
      if (relationshipNodeIds.has(node.characterId)) return false;
      relationshipNodeIds.add(node.characterId);
      return true;
    })
    .map((node, index) => ({
      characterId: node.characterId,
      x: Number.isFinite(node.x) && Math.abs(node.x) < 5000 ? node.x : 120 + (index % 3) * 220,
      y: Number.isFinite(node.y) && Math.abs(node.y) < 5000 ? node.y : 120 + Math.floor(index / 3) * 140,
    }));
  const graphIds = new Set(relationshipNodes.map((node) => node.characterId));
  const relationshipEdges = rawRelationships.edges.filter((edge) => graphIds.has(edge.from) && graphIds.has(edge.to));
  const customTypes = normalizeRelationshipTypes(rawRelationships.customTypes ?? []);

  return {
    ...defaults,
    ...overrides,
    documents,
    characters,
    relationships: {
      customTypes,
      nodes: relationshipNodes,
      edges: relationshipEdges,
    },
    schemaVersion: STORAGE_SCHEMA_VERSION,
  };
}

function normalizeRelationshipTypes(types) {
  const seen = new Set();
  return types
    .filter((type) => type?.label)
    .map((type) => ({
      label: String(type.label).trim(),
      color: /^#[0-9a-f]{6}$/i.test(type.color ?? "") ? type.color : "#6497a8",
    }))
    .filter((type) => {
      if (!type.label || seen.has(type.label)) return false;
      seen.add(type.label);
      return true;
    });
}

export function createEmptyCharacter() {
  return {
    id: `char-${Date.now()}`,
    fullName: "",
    nicknames: [],
    roleType: "其他",
    description: "",
    notes: "",
  };
}

export function normalizeCharacter(character) {
  return {
    id: character.id ?? `char-${Date.now()}`,
    fullName: character.fullName ?? character.name ?? "",
    nicknames: Array.isArray(character.nicknames) ? character.nicknames : [],
    roleType: roleTypeOptions.includes(character.roleType) ? character.roleType : "其他",
    description: character.description ?? character.role ?? character.traits ?? "",
    notes: character.notes ?? character.note ?? "",
  };
}

export function plainTextToHtml(text) {
  return text
    .split(/\n{2,}/)
    .map((block, index) => {
      const escaped = escapeHtml(block).replace(/\n/g, "<br>");
      return index === 0 ? `<h1>${escaped}</h1>` : `<p>${escaped}</p>`;
    })
    .join("");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
