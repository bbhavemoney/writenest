export const STORAGE_SCHEMA_VERSION = 5;

export const roleTypeOptions = ["主角", "男主", "朋友", "隱藏反派", "配角", "反派", "其他"];

function createChapter(id, title, body) {
  const content = `${title}\n\n${body}`;
  return { id, title, kind: "小說", updatedAt: "今天", content, contentHtml: plainTextToHtml(content) };
}

const moonFerryCharacters = [
  { id: "moon-lin", fullName: "林知夏", nicknames: ["知夏", "小夏"], roleType: "主角", description: "回鄉追查渡口舊案的年輕書吏。", notes: "隨身帶著一只舊木匣。" },
  { id: "moon-shen", fullName: "沈暮寒", nicknames: ["暮寒"], roleType: "男主", description: "守在月下渡口的沈家少主。", notes: "知道三年前失火案的內情。" },
  { id: "moon-bai", fullName: "白若寧", nicknames: ["若寧"], roleType: "朋友", description: "客棧掌櫃之女，擅長打聽消息。", notes: "林知夏最信任的朋友。" },
  { id: "moon-xu", fullName: "許言", nicknames: ["阿言"], roleType: "隱藏反派", description: "鎮上的文書，溫和外表下藏著秘密。", notes: "與失火案有直接關聯。" },
];

const tideLibraryCharacters = [
  { id: "tide-ning", fullName: "寧書禾", nicknames: ["書禾"], roleType: "主角", description: "新任潮汐圖書館夜班管理員。", notes: "能聽見舊書留下的聲音。" },
  { id: "tide-luo", fullName: "洛川", nicknames: ["阿川"], roleType: "男主", description: "負責維修海岸燈塔的青年。", notes: "一直在尋找失蹤的兄長。" },
  { id: "tide-su", fullName: "蘇婆婆", nicknames: ["蘇館長"], roleType: "配角", description: "圖書館前任館長，熟悉禁書庫。", notes: "保管著退潮時才出現的鑰匙。" },
  { id: "tide-gu", fullName: "顧沉舟", nicknames: ["沉舟"], roleType: "反派", description: "收藏失落航海圖的神秘商人。", notes: "企圖改寫被圖書館保存的過去。" },
];

export const defaultWorkspaceData = {
  schemaVersion: STORAGE_SCHEMA_VERSION,
  activeProjectId: "project-moon-ferry",
  projects: [
    {
      id: "project-moon-ferry",
      title: "月下渡輪",
      genre: "古風懸疑",
      description: "一封沒有寄出的信，把林知夏帶回月下渡口與三年前的失火真相。",
      chapters: [
        createChapter("moon-chapter-1", "第一章：月下渡口", "月色落在青石渡口，像一層薄霜。林知夏提著舊木匣，登上最後一班渡輪。"),
        createChapter("moon-chapter-2", "第二章：舊信與寒燈", "客棧的寒燈下，一封缺少署名的信揭開了巡夜名冊中消失的一頁。"),
        createChapter("moon-chapter-3", "第三章：黑色玉扣", "黑色玉扣出現在窗沿，沈暮寒終於承認自己曾在火場見過許言。"),
      ],
      characters: moonFerryCharacters,
      relationships: {
        customTypes: [{ label: "青梅竹馬", color: "#7b8cc9" }],
        nodes: moonFerryCharacters.map((character, index) => ({ characterId: character.id, x: 120 + (index % 2) * 280, y: 100 + Math.floor(index / 2) * 190 })),
        edges: [
          { id: "moon-rel-1", from: "moon-lin", to: "moon-shen", label: "青梅竹馬", color: "#7b8cc9" },
          { id: "moon-rel-2", from: "moon-lin", to: "moon-bai", label: "朋友", color: "#6497a8" },
          { id: "moon-rel-3", from: "moon-shen", to: "moon-xu", label: "敵人", color: "#b45b52" },
        ],
      },
      favoriteWords: [], writingStats: { todayWords: 0, totalWords: 0 }, updatedAt: "今天 21:10",
    },
    {
      id: "project-tide-library",
      title: "潮汐圖書館",
      genre: "奇幻懸疑",
      description: "退潮之夜，海岸圖書館會借出能通往遺失記憶的書。",
      chapters: [
        createChapter("tide-chapter-1", "第一章：退潮來信", "寧書禾值夜時，在還書箱裡發現一封寫給明天的信。"),
        createChapter("tide-chapter-2", "第二章：無人的閱覽室", "午夜鐘響後，封閉多年的地下閱覽室亮起了燈。"),
        createChapter("tide-chapter-3", "第三章：被借走的年份", "洛川在航海誌裡看見兄長的名字，歸還期限卻是十年以後。"),
      ],
      characters: tideLibraryCharacters,
      relationships: {
        customTypes: [{ label: "守書人", color: "#6f6ba8" }],
        nodes: tideLibraryCharacters.map((character, index) => ({ characterId: character.id, x: 110 + (index % 2) * 290, y: 95 + Math.floor(index / 2) * 195 })),
        edges: [
          { id: "tide-rel-1", from: "tide-ning", to: "tide-luo", label: "合作", color: "#b88765" },
          { id: "tide-rel-2", from: "tide-ning", to: "tide-su", label: "守書人", color: "#6f6ba8" },
          { id: "tide-rel-3", from: "tide-luo", to: "tide-gu", label: "敵人", color: "#b45b52" },
        ],
      },
      favoriteWords: [], writingStats: { todayWords: 0, totalWords: 0 }, updatedAt: "今天 20:45",
    },
  ],
};

export function createWorkspaceData(overrides = {}) {
  if (isLegacyWorkspace(overrides)) return migrateLegacyWorkspace(overrides);
  const sourceProjects = Array.isArray(overrides.projects) && overrides.projects.length ? overrides.projects : structuredClone(defaultWorkspaceData.projects);
  const projects = sourceProjects.map(normalizeProject);
  const activeProjectId = projects.some((project) => project.id === overrides.activeProjectId) ? overrides.activeProjectId : projects[0]?.id ?? null;
  return { schemaVersion: STORAGE_SCHEMA_VERSION, projects, activeProjectId };
}

export function createProject({ title, genre, description }) {
  return normalizeProject({
    id: `project-${Date.now()}`, title: title.trim(), genre: genre.trim() || "小說", description: description.trim(),
    chapters: [], characters: [], relationships: { customTypes: [], nodes: [], edges: [] }, favoriteWords: [],
    writingStats: { todayWords: 0, totalWords: 0 }, updatedAt: "剛剛",
  });
}

function normalizeProject(project) {
  const chapters = (project.chapters ?? project.documents ?? []).map((chapter) => ({
    ...chapter, content: chapter.content ?? "", contentHtml: chapter.contentHtml ?? plainTextToHtml(chapter.content ?? ""),
  }));
  const characters = (project.characters ?? []).map(normalizeCharacter);
  const characterIds = new Set(characters.map((character) => character.id));
  const rawRelationships = project.relationships ?? {};
  const seenNodeIds = new Set();
  const nodes = (rawRelationships.nodes ?? []).filter((node) => characterIds.has(node.characterId) && !seenNodeIds.has(node.characterId) && seenNodeIds.add(node.characterId));
  const nodeIds = new Set(nodes.map((node) => node.characterId));
  const favoriteWords = normalizeFavoriteWords(project.favoriteWords ?? project.savedWords ?? []);
  const totalWords = chapters.reduce((total, chapter) => total + (chapter.content ?? "").replace(/\s/g, "").length, 0);
  return {
    id: project.id ?? `project-${Date.now()}`,
    title: project.title?.trim() || "未命名作品",
    genre: project.genre ?? project.type ?? "小說",
    description: project.description ?? "",
    chapters,
    characters,
    relationships: {
      customTypes: normalizeRelationshipTypes(rawRelationships.customTypes ?? []),
      nodes,
      edges: (rawRelationships.edges ?? []).filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to)),
    },
    favoriteWords,
    writingStats: { todayWords: project.writingStats?.todayWords ?? totalWords, totalWords },
    updatedAt: project.updatedAt ?? "剛剛",
  };
}

function isLegacyWorkspace(data) {
  return Array.isArray(data.documents) || Array.isArray(data.characters) || Boolean(data.relationships) || Array.isArray(data.savedWords);
}

function migrateLegacyWorkspace(legacy) {
  const legacyProjects = Array.isArray(legacy.projects) && legacy.projects.length ? legacy.projects : [{ id: "project-migrated", title: "匯入作品", type: "小說", documentIds: [] }];
  const firstProjectId = legacyProjects[0].id;
  const projects = legacyProjects.map((project) => {
    const chapterIds = new Set(project.documentIds ?? []);
    const migratedProject = normalizeProject({
      ...project,
      chapters: (legacy.documents ?? []).filter((chapter) => chapter.projectId === project.id || chapterIds.has(chapter.id)),
      characters: project.id === firstProjectId ? legacy.characters ?? [] : [],
      relationships: project.id === firstProjectId ? legacy.relationships : undefined,
      favoriteWords: project.id === firstProjectId ? legacy.savedWords ?? [] : [],
    });
    if (project.id !== "project-moon-road") return migratedProject;
    const moonSeed = normalizeProject(structuredClone(defaultWorkspaceData.projects[0]));
    return {
      ...migratedProject,
      title: "月下渡輪",
      genre: moonSeed.genre,
      description: migratedProject.description || moonSeed.description,
      chapters: migratedProject.chapters.length >= 3 ? migratedProject.chapters : [...migratedProject.chapters, moonSeed.chapters[2]],
    };
  });
  const hasMigratedMoonSeed = legacyProjects.some((project) => project.id === "project-moon-road");
  const requiredSeeds = defaultWorkspaceData.projects.filter((seed) => {
    if (seed.id === "project-moon-ferry" && hasMigratedMoonSeed) return false;
    return !projects.some((project) => project.id === seed.id);
  });
  projects.push(...requiredSeeds.map((seed) => normalizeProject(structuredClone(seed))));
  return { schemaVersion: STORAGE_SCHEMA_VERSION, projects, activeProjectId: projects.some((project) => project.id === legacy.activeProjectId) ? legacy.activeProjectId : projects[0]?.id ?? null };
}

function normalizeFavoriteWords(words = []) {
  const legacyDefaultIds = new Set(["word-moonlight", "word-cold-lamp", "word-old-dream", "word-foreshadow", "word-prophecy"]);
  return words.filter((word) => !legacyDefaultIds.has(word?.id));
}

function normalizeRelationshipTypes(types) {
  const seen = new Set();
  return types.map((type) => ({ label: String(type?.label ?? "").trim(), color: /^#[0-9a-f]{6}$/i.test(type?.color ?? "") ? type.color : "#6497a8" }))
    .filter((type) => type.label && !seen.has(type.label) && seen.add(type.label));
}

export function createEmptyCharacter() {
  return { id: `char-${Date.now()}`, fullName: "", nicknames: [], roleType: "其他", description: "", notes: "" };
}

export function normalizeCharacter(character) {
  return {
    id: character.id ?? `char-${Date.now()}`, fullName: character.fullName ?? character.name ?? "",
    nicknames: Array.isArray(character.nicknames) ? character.nicknames : [],
    roleType: roleTypeOptions.includes(character.roleType) ? character.roleType : "其他",
    description: character.description ?? character.role ?? character.traits ?? "", notes: character.notes ?? character.note ?? "",
  };
}

export function plainTextToHtml(text) {
  return String(text ?? "").split(/\n{2,}/).map((block, index) => {
    const escaped = escapeHtml(block).replace(/\n/g, "<br>");
    return index === 0 ? `<h1>${escaped}</h1>` : `<p>${escaped}</p>`;
  }).join("");
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
