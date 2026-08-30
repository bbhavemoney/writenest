import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Mark } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
} from "@xyflow/react";
import {
  Bold,
  BookOpen,
  Copy,
  FileText,
  Heading1,
  Heading2,
  Heart,
  Italic,
  LayoutDashboard,
  List,
  ListOrdered,
  Minus,
  Network,
  PenLine,
  Plus,
  Quote,
  Search,
  Sparkles,
  Trash2,
  Undo2,
  Users,
  ChevronDown,
} from "lucide-react";
import { createEmptyCharacter, createWorkspaceData, roleTypeOptions } from "./dataModel.js";
import { createDocumentExport, importNovelFile } from "./fileFormats.js";
import { loadWorkspaceData, saveWorkspaceData } from "./storage.js";
import { fuzzySearch, wordBank } from "./data/wordBank.js";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "editor", label: "Editor", icon: PenLine },
  { id: "words", label: "模糊找詞", icon: Search },
  { id: "characters", label: "角色資料庫", icon: Users },
  { id: "map", label: "關係圖", icon: Network },
  { id: "format", label: "自動排版", icon: Sparkles },
];

const relationshipTypes = [
  { label: "朋友", color: "#6497a8" },
  { label: "戀人", color: "#be6f7c" },
  { label: "家人", color: "#7a9b6f" },
  { label: "敵人", color: "#b45b52" },
  { label: "暗戀", color: "#8b7fd6" },
  { label: "合作", color: "#b88765" },
  { label: "背叛", color: "#5f6677" },
];

const relationNodeTypes = {
  character: CharacterFlowNode,
};

const InsertFlash = Mark.create({
  name: "insertFlash",
  parseHTML() {
    return [{ tag: "span[data-insert-flash]" }];
  },
  renderHTML() {
    return ["span", { "data-insert-flash": "true", class: "insert-flash" }, 0];
  },
});

function CharacterFlowNode({ data }) {
  return (
    <div className={`flow-character-node${data.selectedForConnect ? " selected" : ""}${data.focusState ? ` ${data.focusState}` : ""}`}>
      <Handle type="target" position={Position.Left} />
      <strong>{data.fullName}</strong>
      <span>{data.roleType}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [workspaceData, setWorkspaceData] = useState(() => createWorkspaceData());
  const [activeDocumentId, setActiveDocumentId] = useState("doc-station");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [wordTypeFilter, setWordTypeFilter] = useState("全部");
  const [formatMode, setFormatMode] = useState("novel");
  const [toast, setToast] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("loading");

  const activeDocument =
    workspaceData.documents.find((document) => document.id === activeDocumentId) ?? workspaceData.documents[0];

  const editor = useEditor(
    {
      extensions: [StarterKit, InsertFlash],
      content: activeDocument?.contentHtml ?? "",
      immediatelyRender: false,
      editorProps: {
        attributes: {
          class: `rich-editor ${formatMode === "paper" ? "paper-mode" : "novel-mode"}`,
        },
      },
      onUpdate: ({ editor: currentEditor }) => {
        updateActiveDocument({
          content: currentEditor.getText(),
          contentHtml: currentEditor.getHTML(),
        });
      },
    },
    [activeDocumentId, isLoaded]
  );

  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        attributes: {
          class: `rich-editor ${formatMode === "paper" ? "paper-mode" : "novel-mode"}`,
        },
      },
    });
  }, [editor, formatMode]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateWorkspace() {
      try {
        const storedData = await loadWorkspaceData();
        if (!cancelled) {
          setWorkspaceData(storedData);
          setActiveDocumentId(storedData.documents[0]?.id ?? "doc-station");
          setIsLoaded(true);
          setSaveStatus("saved");
        }
      } catch {
        if (!cancelled) {
          setIsLoaded(true);
          setSaveStatus("saved");
          notify("本機資料載入失敗，已改用預設資料。");
        }
      }
    }

    hydrateWorkspace();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    setSaveStatus("saving");
    const saveTimer = window.setTimeout(() => {
      saveWorkspaceData(workspaceData)
        .then(() => setSaveStatus("saved"))
        .catch(() => {
          setSaveStatus("error");
          notify("本機資料保存失敗。");
        });
    }, 350);

    return () => window.clearTimeout(saveTimer);
  }, [workspaceData, isLoaded]);

  const filteredWords = useMemo(() => {
    const results = fuzzySearch(deferredQuery, wordBank);
    return wordTypeFilter === "全部" ? results : results.filter((word) => word.type === wordTypeFilter);
  }, [deferredQuery, wordTypeFilter]);

  const charactersById = useMemo(
    () => Object.fromEntries(workspaceData.characters.map((character) => [character.id, character])),
    [workspaceData.characters]
  );

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1400);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      notify(`已複製：${value}`);
    } catch {
      notify("無法使用剪貼簿，請手動複製。");
    }
  }

  function updateWorkspace(updater, options = {}) {
    let nextData;
    setWorkspaceData((current) => {
      nextData = updater(current);
      return nextData;
    });

    if (options.persistNow) {
      window.setTimeout(() => {
        if (nextData) {
          saveWorkspaceData(nextData).catch(() => notify("本機資料保存失敗。"));
        }
      }, 0);
    }
  }

  function updateActiveDocument(nextContent) {
    const contentPatch =
      typeof nextContent === "string"
        ? {
            content: nextContent,
            contentHtml: `<p>${escapeHtml(nextContent).replace(/\n/g, "<br>")}</p>`,
          }
        : nextContent;

    updateWorkspace((current) => ({
      ...current,
      documents: current.documents.map((document) =>
        document.id === activeDocumentId ? { ...document, ...contentPatch, updatedAt: "剛剛" } : document
      ),
      projects: current.projects.map((project) =>
        project.documentIds.includes(activeDocumentId) ? { ...project, updatedAt: "剛剛" } : project
      ),
    }));
  }

  function addDocument() {
    const newIndex = workspaceData.documents.length + 1;
    const projectId = activeDocument?.projectId ?? workspaceData.projects[0]?.id ?? "project-rain-city";
    const newDocument = {
      id: `doc-${Date.now()}`,
      projectId,
      title: `新章節 ${newIndex}`,
      kind: formatMode === "paper" ? "論文" : "小說",
      updatedAt: "剛剛",
      content: `新章節 ${newIndex}\n\n在這裡開始整理你的想法。`,
      contentHtml: `<h1>新章節 ${newIndex}</h1><p>在這裡開始整理你的想法。</p>`,
    };

    updateWorkspace((current) => ({
      ...current,
      documents: [newDocument, ...current.documents],
      projects: current.projects.map((project) =>
        project.id === projectId
          ? { ...project, documentIds: [newDocument.id, ...project.documentIds], updatedAt: "剛剛" }
          : project
      ),
    }), { persistNow: true });
    setActiveDocumentId(newDocument.id);
    notify("已新增章節");
  }

  function addProject() {
    const newIndex = workspaceData.projects.length + 1;
    const timestamp = Date.now();
    const projectId = `project-${timestamp}`;
    const documentId = `doc-${timestamp}`;
    const projectTitle = `新作品 ${newIndex}`;
    const newDocument = {
      id: documentId,
      projectId,
      title: `${projectTitle} 起始章`,
      kind: "小說",
      updatedAt: "剛剛",
      content: "",
      contentHtml: "<p></p>",
    };
    const newProject = {
      id: projectId,
      title: projectTitle,
      type: "小說",
      updatedAt: "剛剛",
      documentIds: [documentId],
    };

    updateWorkspace((current) => ({
      ...current,
      projects: [newProject, ...current.projects],
      documents: [newDocument, ...current.documents],
    }), { persistNow: true });

    setActiveDocumentId(documentId);
    setActiveTab("editor");
    notify(`已建立：${projectTitle}`);
  }

  function deleteDocument(documentId) {
    if (workspaceData.documents.length <= 1) {
      notify("至少需要保留一篇文章");
      return;
    }

    const nextDocument = workspaceData.documents.find((document) => document.id !== documentId);
    updateWorkspace((current) => ({
      ...current,
      documents: current.documents.filter((document) => document.id !== documentId),
      projects: current.projects.map((project) => ({
        ...project,
        documentIds: project.documentIds.filter((id) => id !== documentId),
        updatedAt: project.documentIds.includes(documentId) ? "剛剛" : project.updatedAt,
      })),
    }), { persistNow: true });

    if (activeDocumentId === documentId && nextDocument) {
      setActiveDocumentId(nextDocument.id);
    }
    notify("文章已刪除");
  }

  function insertText(value, options = {}) {
    if (!value) return;

    if (editor) {
      editor.chain().focus().insertContent(value).run();
      if (!options.stayOnPage) {
        setActiveTab("editor");
      }
    } else {
      const currentText = activeDocument?.content ?? "";
      updateActiveDocument(`${currentText}${currentText.endsWith("\n") ? "" : "\n"}${value}`);
    }

    if (!options.silent) {
      notify(`已插入：${value}`);
    }
  }

  function applyFormattedDocument(formattedDocument) {
    updateActiveDocument({
      content: formattedDocument.text,
      contentHtml: formattedDocument.html,
    });

    if (editor) {
      editor.commands.setContent(formattedDocument.html);
    }

    notify("已完成排版並更新文章");
  }

  async function exportDocument(format) {
    if (!activeDocument) return;

    const filename = `${sanitizeFilename(activeDocument.title)}.${format}`;
    try {
      if (format === "txt" || format === "md") {
        const content = format === "md" ? documentToMarkdown(activeDocument) : activeDocument.content;
        downloadFile(filename, format === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8", content);
      } else {
        const exported = await createDocumentExport(activeDocument, format);
        downloadBlob(filename, exported.blob);
      }
      notify(`已匯出 ${filename}`);
    } catch {
      notify(`匯出 ${format.toUpperCase()} 失敗`);
    }
  }

  function exportProjectBackup() {
    const backup = {
      exportedAt: new Date().toISOString(),
      app: "WriteNest",
      schemaVersion: workspaceData.schemaVersion,
      projects: workspaceData.projects,
      documents: workspaceData.documents,
      characters: workspaceData.characters,
      relationships: workspaceData.relationships,
      savedWords: workspaceData.savedWords,
    };

    downloadFile(`writenest-backup-${formatDateStamp(new Date())}.json`, "application/json;charset=utf-8", JSON.stringify(backup, null, 2));
    notify("已匯出 JSON 備份");
  }

  async function importWorkspaceFile(file) {
    if (!file) return;

    if (/\.(txt|docx|epub)$/i.test(file.name)) {
      try {
        const importedNovel = await importNovelFile(file);
        const nextData = createWorkspaceData({
          ...workspaceData,
          projects: [importedNovel.project, ...workspaceData.projects],
          documents: [...importedNovel.documents, ...workspaceData.documents],
        });

        setWorkspaceData(nextData);
        setActiveDocumentId(importedNovel.documents[0].id);
        setActiveTab("editor");
        await saveWorkspaceData(nextData);
        notify(`已匯入《${importedNovel.project.title}》，共 ${importedNovel.documents.length} 章`);
      } catch {
        notify("匯入失敗，請確認小說檔案是有效的 TXT、DOCX 或 EPUB。");
      }
      return;
    }

    try {
      const rawText = await file.text();
      const backup = JSON.parse(rawText);
      const importedData = createWorkspaceData({
        projects: backup.projects,
        documents: backup.documents,
        characters: backup.characters,
        relationships: backup.relationships,
        savedWords: backup.savedWords,
      });
      const shouldOverwrite = window.confirm("匯入備份會覆蓋目前 WriteNest 本機資料。按確定覆蓋，按取消可選擇合併。");
      const nextData = shouldOverwrite
        ? importedData
        : window.confirm("要合併備份資料嗎？相同 ID 的資料會以備份內容為準。")
          ? mergeWorkspaceData(workspaceData, importedData)
          : null;

      if (!nextData) {
        notify("已取消匯入");
        return;
      }

      setWorkspaceData(nextData);
      setActiveDocumentId(nextData.documents[0]?.id ?? "doc-station");
      await saveWorkspaceData(nextData);
      notify(shouldOverwrite ? "已覆蓋本機資料" : "已合併備份資料");
    } catch {
      notify("匯入失敗，請確認是有效的 JSON 備份檔。");
    }
  }

  function saveWord(word) {
    const term = getWordText(word);
    const exists = workspaceData.savedWords.some((item) => getWordText(item) === term);

    if (exists) {
      updateWorkspace((current) => ({
        ...current,
        savedWords: current.savedWords.filter((item) => getWordText(item) !== term),
      }), { persistNow: true });

      const localWords = JSON.parse(localStorage.getItem("writenest.savedWords.v1") ?? "[]");
      localStorage.setItem("writenest.savedWords.v1", JSON.stringify(localWords.filter((item) => getWordText(item) !== term)));
      notify(`已取消收藏：${term}`);
      return;
    }

    const savedWord = {
      id: `saved-${word.id}-${Date.now()}`,
      word: term,
      term,
      type: word.type,
      meaning: word.meaning,
      keywords: word.keywords ?? word.tags ?? [],
      tags: word.keywords ?? word.tags ?? [],
      tag: word.type,
      example: word.example,
      tone: Array.isArray(word.tone) ? word.tone : [word.tone].filter(Boolean),
    };

    updateWorkspace((current) => {
      return {
        ...current,
        savedWords: [
          savedWord,
          ...current.savedWords,
        ],
      };
    }, { persistNow: true });

    const localWords = JSON.parse(localStorage.getItem("writenest.savedWords.v1") ?? "[]");
    localStorage.setItem("writenest.savedWords.v1", JSON.stringify([savedWord, ...localWords.filter((item) => getWordText(item) !== term)]));
    notify(`已收藏：${term}`);
  }

  function saveCharacter(character) {
    const cleanCharacter = {
      ...character,
      fullName: character.fullName.trim(),
      nicknames: character.nicknames.map((nickname) => nickname.trim()).filter(Boolean),
      roleType: roleTypeOptions.includes(character.roleType) ? character.roleType : "其他",
      description: character.description.trim(),
      notes: character.notes.trim(),
    };

    if (!cleanCharacter.fullName) {
      notify("角色全名不能空白");
      return false;
    }

    updateWorkspace((current) => {
      const exists = current.characters.some((item) => item.id === cleanCharacter.id);
      return {
        ...current,
        characters: exists
          ? current.characters.map((item) => (item.id === cleanCharacter.id ? cleanCharacter : item))
          : [...current.characters, cleanCharacter],
        relationships: exists
          ? current.relationships
          : {
              ...current.relationships,
              nodes: [...current.relationships.nodes, { characterId: cleanCharacter.id, x: 160, y: 160 }],
            },
      };
    }, { persistNow: true });

    notify("角色資料已保存");
    return true;
  }

  function deleteCharacter(characterId) {
    updateWorkspace((current) => ({
      ...current,
      characters: current.characters.filter((character) => character.id !== characterId),
      relationships: {
        ...current.relationships,
        nodes: current.relationships.nodes.filter((node) => node.characterId !== characterId),
        edges: current.relationships.edges.filter((edge) => edge.from !== characterId && edge.to !== characterId),
      },
    }), { persistNow: true });
    notify("角色已刪除");
  }

  function addRelationshipNode(characterId) {
    if (!characterId) return;

    let alreadyExists = false;
    updateWorkspace((current) => {
      if (current.relationships.nodes.some((node) => node.characterId === characterId)) {
        alreadyExists = true;
        return current;
      }
      return {
        ...current,
        relationships: {
          ...current.relationships,
          nodes: [...current.relationships.nodes, { characterId, x: 180, y: 180 }],
        },
      };
    }, { persistNow: true });
    notify(alreadyExists ? "角色已在關係圖上" : "角色節點已加入關係圖");
  }

  function addNewRelationshipCharacter() {
    const character = createEmptyCharacter();
    const index = workspaceData.characters.length + 1;
    const nextCharacter = {
      ...character,
      fullName: `新角色 ${index}`,
      roleType: "其他",
      description: "可以在角色資料庫補充這個角色的設定。",
    };

    updateWorkspace((current) => ({
      ...current,
      characters: [...current.characters, nextCharacter],
      relationships: {
        ...current.relationships,
        nodes: [...current.relationships.nodes, { characterId: nextCharacter.id, x: 220, y: 220 }],
      },
    }), { persistNow: true });
    notify("已新增角色節點");
  }

  function updateRelationshipNodes(nextFlowNodes) {
    updateWorkspace((current) => ({
      ...current,
      relationships: {
        ...current.relationships,
        nodes: nextFlowNodes.map((node) => ({
          characterId: node.id,
          x: node.position.x,
          y: node.position.y,
        })),
      },
    }), { persistNow: true });
  }

  function updateRelationshipEdges(nextFlowEdges) {
    updateWorkspace((current) => ({
      ...current,
      relationships: {
        ...current.relationships,
        edges: nextFlowEdges.map((edge) => ({
          id: edge.id,
          from: edge.source,
          to: edge.target,
          label: edge.label || "朋友",
          color: edge.style?.stroke || "#6497a8",
          direction: edge.data?.direction || edge.direction || "one-way",
        })),
      },
    }), { persistNow: true });
  }

  function replaceRelationshipEdges(nextEdges) {
    updateWorkspace((current) => ({
      ...current,
      relationships: {
        ...current.relationships,
        edges: nextEdges,
      },
    }), { persistNow: true });
  }

  function updateRelationshipEdge(edgeId, patch) {
    updateWorkspace((current) => ({
      ...current,
      relationships: {
        ...current.relationships,
        edges: current.relationships.edges.map((edge) => (edge.id === edgeId ? { ...edge, ...patch } : edge)),
      },
    }), { persistNow: true });
  }

  function saveRelationshipType(nextType) {
    updateWorkspace((current) => {
      const customTypes = current.relationships.customTypes ?? [];
      const exists = customTypes.some((type) => type.label === nextType.label);

      return {
        ...current,
        relationships: {
          ...current.relationships,
          customTypes: exists
            ? customTypes.map((type) => (type.label === nextType.label ? { ...type, color: nextType.color } : type))
            : [...customTypes, nextType],
        },
      };
    }, { persistNow: true });
  }

  function deleteRelationshipType(label) {
    updateWorkspace((current) => ({
      ...current,
      relationships: {
        ...current.relationships,
        customTypes: (current.relationships.customTypes ?? []).filter((type) => type.label !== label),
      },
    }), { persistNow: true });
  }

  function renderPage() {
    if (activeTab === "dashboard") {
      return (
        <Dashboard
          data={workspaceData}
          setActiveTab={setActiveTab}
          insertText={insertText}
          addProject={addProject}
          exportProjectBackup={exportProjectBackup}
          importWorkspaceFile={importWorkspaceFile}
        />
      );
    }
    if (activeTab === "editor") {
      return (
        <EditorPage
          data={workspaceData}
          activeDocument={activeDocument}
          editor={editor}
          formatMode={formatMode}
          setFormatMode={setFormatMode}
          setActiveDocumentId={setActiveDocumentId}
          addDocument={addDocument}
          deleteDocument={deleteDocument}
          exportDocument={exportDocument}
          exportProjectBackup={exportProjectBackup}
          importWorkspaceFile={importWorkspaceFile}
          copyText={copyText}
          insertText={insertText}
          setActiveTab={setActiveTab}
        />
      );
    }
    if (activeTab === "words") {
      return (
        <WordFinder
          query={query}
          setQuery={setQuery}
          wordTypeFilter={wordTypeFilter}
          setWordTypeFilter={setWordTypeFilter}
          results={filteredWords}
          savedWords={workspaceData.savedWords}
          copyText={copyText}
          insertText={insertText}
          saveWord={saveWord}
        />
      );
    }
    if (activeTab === "characters") {
      return (
        <CharacterLibrary
          characters={workspaceData.characters}
          copyText={copyText}
          insertText={insertText}
          saveCharacter={saveCharacter}
          deleteCharacter={deleteCharacter}
        />
      );
    }
    if (activeTab === "map") {
      return (
        <RelationMap
          nodes={workspaceData.relationships.nodes}
          relations={workspaceData.relationships.edges}
          customRelationshipTypes={workspaceData.relationships.customTypes ?? []}
          characters={workspaceData.characters}
          charactersById={charactersById}
          setActiveTab={setActiveTab}
          addRelationshipNode={addRelationshipNode}
          addNewRelationshipCharacter={addNewRelationshipCharacter}
          updateRelationshipNodes={updateRelationshipNodes}
          updateRelationshipEdges={updateRelationshipEdges}
          updateRelationshipEdge={updateRelationshipEdge}
          replaceRelationshipEdges={replaceRelationshipEdges}
          saveRelationshipType={saveRelationshipType}
          deleteRelationshipType={deleteRelationshipType}
        />
      );
    }
    return (
      <Formatter
        mode={formatMode}
        setMode={setFormatMode}
        document={activeDocument}
        characters={workspaceData.characters}
        applyFormattedDocument={applyFormattedDocument}
        copyText={copyText}
      />
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">W</span>
          <div>
            <strong>WriteNest</strong>
            <small>創作者工作台</small>
          </div>
        </div>
        <nav className="nav-list" aria-label="主導覽">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button className={activeTab === tab.id ? "nav-item active" : "nav-item"} key={tab.id} onClick={() => setActiveTab(tab.id)}>
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <BookOpen size={18} />
          <span>今日已寫 {countWords(workspaceData.documents)} 字</span>
        </div>
      </aside>

      <main className="workspace">
        <header className={activeTab === "dashboard" ? "topbar dashboard-topbar" : "topbar"}>
          <div className="topbar-title">
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label}</h1>
            {activeTab === "dashboard" && <p>整理你的文稿、角色與靈感詞庫。</p>}
          </div>
          <div className="topbar-actions">
            <span className={`save-pill ${saveStatus}`}>{getSaveStatusText(saveStatus)}</span>
            <button className="primary-button" onClick={() => setActiveTab("editor")}>
              <PenLine size={18} />
              開始寫作
            </button>
          </div>
        </header>
        {renderPage()}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function Dashboard({ data, setActiveTab, insertText, addProject, exportProjectBackup, importWorkspaceFile }) {
  const recentDocuments = data.documents.slice(0, 3);
  const importInputRef = useRef(null);
  const savedWordPreview = data.savedWords.slice(0, 8);

  return (
    <section className="page-grid">
      <div className="metric-card soft-lilac dashboard-metric" style={{ "--item-index": 0 }}>
        <div className="metric-head">
          <span>今日寫作</span>
          <BookOpen size={18} />
        </div>
        <strong>{countWords(data.documents).toLocaleString()}</strong>
        <small>富文本內容會自動保存到 IndexedDB</small>
      </div>
      <div className="metric-card soft-blue dashboard-metric" style={{ "--item-index": 1 }}>
        <div className="metric-head">
          <span>收藏詞語</span>
          <Heart size={18} />
        </div>
        <strong>{data.savedWords.length}</strong>
        <small>{data.savedWords.length ? `最近新增：${data.savedWords.slice(0, 2).map((word) => getWordText(word)).join("、")}` : "尚未收藏詞語"}</small>
      </div>
      <div className="metric-card soft-mint dashboard-metric" style={{ "--item-index": 2 }}>
        <div className="metric-head">
          <span>最近角色</span>
          <Users size={18} />
        </div>
        <strong>{data.characters.length}</strong>
        <small>{data.characters.length ? data.characters.slice(0, 3).map((character) => character.fullName).join("、") : "尚未建立角色"}</small>
      </div>

      <div className="panel wide">
        <div className="panel-heading">
          <h2>最近編輯</h2>
          <button className="ghost-button" onClick={() => setActiveTab("editor")}>
            <FileText size={16} />
            前往編輯器
          </button>
        </div>
        <div className="doc-list">
          {recentDocuments.length ? (
            recentDocuments.map((document, index) => (
              <button className="doc-row dashboard-doc-row" key={document.id} style={{ "--item-index": index }} onClick={() => setActiveTab("editor")}>
                <span className="doc-row-main">
                  <strong>{document.title}</strong>
                  <small>{document.kind}</small>
                </span>
                <span className="doc-row-meta">
                  <small>{document.updatedAt}</small>
                  <em>{document.content.length.toLocaleString()} 字</em>
                </span>
                <span className="doc-row-action">繼續 →</span>
              </button>
            ))
          ) : (
            <EmptyState title="還沒有文章" description="前往編輯器建立第一篇作品。" />
          )}
        </div>
      </div>

      <div className="panel dashboard-side-panel">
        <div className="panel-heading">
          <h2>收藏詞語</h2>
          <Heart size={18} />
        </div>
        <div className="chip-cloud">
          {data.savedWords.length ? (
            savedWordPreview.map((word, index) => (
              <button className="chip dashboard-saved-chip" key={word.id} style={{ "--item-index": index }} onClick={() => insertText(getWordText(word))}>
                {getWordText(word)}
              </button>
            ))
          ) : (
            <EmptyState title="尚無收藏詞語" description="在模糊找詞裡收藏常用詞，之後會出現在這裡。" />
          )}
        </div>

        <div className="quick-actions">
          <h3>快速操作</h3>
          <div className="quick-action-grid">
            <button className="ghost-button compact" onClick={addProject}>
              建立新作品
            </button>
            <button className="ghost-button compact" onClick={exportProjectBackup}>
              匯出 JSON
            </button>
            <button className="ghost-button compact" onClick={() => importInputRef.current?.click()}>
              匯入小說 / 備份
            </button>
            <button className="ghost-button compact" onClick={() => setActiveTab("format")}>
              清理草稿
            </button>
          </div>
        </div>

        <div className="inspiration-card">
          <span>今日靈感</span>
          <p>讓角色在一句未說出口的話裡，露出真正的願望。</p>
        </div>
        <input
          ref={importInputRef}
          className="hidden-file-input"
          type="file"
          accept="text/plain,application/json,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,.json,.epub,.docx"
          onChange={(event) => {
            importWorkspaceFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </div>
    </section>
  );
}
function EditorPage({
  data,
  activeDocument,
  editor,
  formatMode,
  setFormatMode,
  setActiveDocumentId,
  addDocument,
  deleteDocument,
  exportDocument,
  exportProjectBackup,
  importWorkspaceFile,
  copyText,
  insertText,
  setActiveTab,
}) {
  const [expandedCharacterIds, setExpandedCharacterIds] = useState(() => new Set());
  const [isChapterPanelOpen, setIsChapterPanelOpen] = useState(true);
  const [isSavedWordsOpen, setIsSavedWordsOpen] = useState(false);
  const [isToolDrawerOpen, setIsToolDrawerOpen] = useState(true);
  const [insertHint, setInsertHint] = useState("");
  const [exportFormat, setExportFormat] = useState("txt");
  const importInputRef = useRef(null);
  const insertHintTimerRef = useRef(null);

  function toggleCharacter(characterId) {
    setExpandedCharacterIds((current) => {
      const next = new Set(current);
      if (next.has(characterId)) {
        next.delete(characterId);
      } else {
        next.add(characterId);
      }
      return next;
    });
  }

  function showInsertHint(value) {
    setInsertHint(`已插入：${value}`);
    window.clearTimeout(insertHintTimerRef.current);
    insertHintTimerRef.current = window.setTimeout(() => setInsertHint(""), 1300);
  }

  function insertCharacterName(value) {
    if (!value) return;

    if (editor) {
      const from = editor.state.selection.from;
      const to = from + value.length;
      editor.chain().focus().insertContent({ type: "text", text: value, marks: [{ type: "insertFlash" }] }).run();
      window.setTimeout(() => {
        editor.chain().setTextSelection({ from, to }).unsetMark("insertFlash").setTextSelection(to).run();
      }, 950);
      showInsertHint(value);
    } else {
      insertText(value);
    }
  }

  function exportSelectedFormat() {
    if (exportFormat === "json") {
      exportProjectBackup();
      return;
    }
    exportDocument(exportFormat);
  }

  useEffect(() => {
    return () => window.clearTimeout(insertHintTimerRef.current);
  }, []);

  return (
    <section className={`${isChapterPanelOpen ? "editor-layout" : "editor-layout chapter-collapsed"} ${isToolDrawerOpen ? "tool-drawer-open" : "tool-drawer-closed"}`}>
      <aside className={isChapterPanelOpen ? "chapter-pane" : "chapter-pane collapsed"}>
        {isChapterPanelOpen ? (
          <>
            <div className="panel-heading chapter-heading">
              <h2>文章 / 章節</h2>
              <div className="chapter-actions">
                <button className="icon-button" title="收合章節面板" onClick={() => setIsChapterPanelOpen(false)}>
                  ←
                </button>
                <button className="icon-button" title="新增章節" onClick={addDocument}>
                  <Plus size={16} />
                </button>
              </div>
            </div>
            {data.documents.length ? (
              data.documents.map((document) => (
                <div className={document.id === activeDocument?.id ? "chapter active" : "chapter"} key={document.id}>
                  <button className="chapter-select" onClick={() => setActiveDocumentId(document.id)}>
                    <span>{document.title}</span>
                    <small>{document.kind}</small>
                  </button>
                  <button className="chapter-delete" title={`刪除 ${document.title}`} onClick={() => deleteDocument(document.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <EmptyState title="沒有文章" description="點上方加號建立第一篇文章。" />
            )}
          </>
        ) : (
          <button className="chapter-restore-button" title="展開章節面板" onClick={() => setIsChapterPanelOpen(true)}>
            →
          </button>
        )}
      </aside>

      <section className="writing-surface">
        <div className="editor-toolbar">
          <div className="editor-title-block">
            <small>{formatMode === "paper" ? "論文模式" : "小說模式"}</small>
            <span>{activeDocument?.title ?? "尚未建立文章"}</span>
          </div>
          <details className="more-actions">
            <summary>更多操作</summary>
            <div className="export-button-row">
              <select aria-label="匯出格式" value={exportFormat} onChange={(event) => setExportFormat(event.target.value)}>
                <option value="txt">TXT 文章</option>
                <option value="md">Markdown 文章</option>
                <option value="docx">DOCX 文章</option>
                <option value="epub">EPUB 電子書</option>
                <option value="json">JSON 完整備份</option>
              </select>
              <button className="ghost-button compact" onClick={exportSelectedFormat} disabled={!activeDocument && exportFormat !== "json"}>
                匯出
              </button>
              <button className="ghost-button compact" onClick={() => importInputRef.current?.click()}>
                匯入小說 / 備份
              </button>
            </div>
          </details>
          <input
            ref={importInputRef}
            className="hidden-file-input"
            type="file"
            accept="text/plain,application/json,application/epub+zip,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,.json,.epub,.docx"
            onChange={(event) => {
              importWorkspaceFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </div>
        {activeDocument ? (
          <>
            <RichTextToolbar editor={editor} formatMode={formatMode} setFormatMode={setFormatMode} />
            <div className="rich-editor-frame">
              <button className="copy-full-button" aria-label="複製全文" data-tooltip="複製全文" onClick={() => copyText(activeDocument.content)}>
                <Copy size={16} />
              </button>
              <EditorContent editor={editor} />
            </div>
          </>
        ) : (
          <div className="rich-editor-frame">
            <EmptyState title="尚未建立文章" description="點左側加號建立第一篇文章。" />
          </div>
        )}
      </section>

      <aside className="tool-pane" aria-label="寫作工具抽屜">
        <button className="tool-drawer-toggle" onClick={() => setIsToolDrawerOpen((current) => !current)} aria-expanded={isToolDrawerOpen}>
          {isToolDrawerOpen ? "收起工具" : "工具"}
        </button>
        <div className="tool-drawer-content">
          {insertHint && <div className="insert-hint">{insertHint}</div>}
          <div className="tool-section">
            <span>寫作工具</span>
            <ToolShortcut icon={Search} title="模糊找詞" action={() => setActiveTab("words")} />
            <ToolShortcut icon={Sparkles} title={formatMode === "paper" ? "論文模式" : "小說模式"} action={() => setFormatMode(formatMode === "paper" ? "novel" : "paper")} />
            <ToolShortcut
              icon={Heart}
              title={`收藏詞語${data.savedWords.length ? ` (${data.savedWords.length})` : ""}`}
              action={() => setIsSavedWordsOpen((current) => !current)}
              active={isSavedWordsOpen}
              ariaExpanded={isSavedWordsOpen}
            />
            {isSavedWordsOpen && (
              <div className="saved-word-list">
                {data.savedWords.length ? (
                  data.savedWords.map((word) => (
                    <button className="saved-word-item" key={word.id} onClick={() => insertText(getWordText(word))}>
                      <span>{getWordText(word)}</span>
                      <Plus size={13} />
                    </button>
                  ))
                ) : (
                  <small className="saved-word-empty">尚未收藏詞語</small>
                )}
              </div>
            )}
          </div>
          <div className="tool-section">
            <span>角色工具</span>
            <ToolShortcut icon={Users} title="角色資料庫" action={() => setActiveTab("characters")} />
          </div>
          <div className="mini-card character-quick-list">
            <strong>角色名字</strong>
            {data.characters.length ? (
              data.characters.map((character) => (
                <div className={expandedCharacterIds.has(character.id) ? "quick-character expanded" : "quick-character"} key={character.id}>
                  <div className="quick-name-row primary">
                    <button className="quick-toggle" title={expandedCharacterIds.has(character.id) ? "收合暱稱" : "展開暱稱"} onClick={() => toggleCharacter(character.id)}>
                      <ChevronDown size={14} />
                    </button>
                    <span>{character.fullName}</span>
                    <button title={`複製 ${character.fullName}`} onClick={() => copyText(character.fullName)}>
                      <Copy size={13} />
                    </button>
                    <button title={`插入 ${character.fullName}`} onClick={() => insertCharacterName(character.fullName)}>
                      <Plus size={13} />
                    </button>
                  </div>
                  {expandedCharacterIds.has(character.id) && (
                    <div className="quick-nickname-list">
                      {character.nicknames.length ? (
                        character.nicknames.map((nickname) => (
                          <div className="quick-name-row sub" key={nickname}>
                            <span>{nickname}</span>
                            <button title={`複製 ${nickname}`} onClick={() => copyText(nickname)}>
                              <Copy size={13} />
                            </button>
                            <button title={`插入 ${nickname}`} onClick={() => insertCharacterName(nickname)}>
                              <Plus size={13} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <small className="empty-nickname">尚無暱稱</small>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <EmptyState title="尚無角色" description="到角色資料庫建立角色後，可快速插入名字。" />
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
function RichTextToolbar({ editor, formatMode, setFormatMode }) {
  if (!editor) return null;

  return (
    <div className="rich-toolbar" aria-label="富文本工具列">
      <IconTool title="標題一" active={editor.isActive("heading", { level: 1 })} action={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} icon={Heading1} />
      <IconTool title="標題二" active={editor.isActive("heading", { level: 2 })} action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} icon={Heading2} />
      <IconTool title="粗體" active={editor.isActive("bold")} action={() => editor.chain().focus().toggleBold().run()} icon={Bold} />
      <IconTool title="斜體" active={editor.isActive("italic")} action={() => editor.chain().focus().toggleItalic().run()} icon={Italic} />
      <IconTool title="項目列表" active={editor.isActive("bulletList")} action={() => editor.chain().focus().toggleBulletList().run()} icon={List} />
      <IconTool title="編號列表" active={editor.isActive("orderedList")} action={() => editor.chain().focus().toggleOrderedList().run()} icon={ListOrdered} />
      <IconTool title="引用" active={editor.isActive("blockquote")} action={() => editor.chain().focus().toggleBlockquote().run()} icon={Quote} />
      <IconTool title="分隔線" action={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} />
      <div className="toolbar-segment">
        <button className={formatMode === "paper" ? "active" : ""} onClick={() => setFormatMode("paper")}>
          論文
        </button>
        <button className={formatMode === "novel" ? "active" : ""} onClick={() => setFormatMode("novel")}>
          小說
        </button>
      </div>
    </div>
  );
}
function IconTool({ title, active = false, action, icon: Icon }) {
  return (
    <button className={active ? "icon-button active" : "icon-button"} title={title} onMouseDown={(event) => event.preventDefault()} onClick={action}>
      <Icon size={16} />
    </button>
  );
}

function ToolShortcut({ icon: Icon, title, action, active = false, ariaExpanded }) {
  return (
    <button className={active ? "tool-shortcut active" : "tool-shortcut"} onClick={action} aria-expanded={ariaExpanded}>
      <Icon size={18} />
      <span>{title}</span>
    </button>
  );
}

function WordFinder({ query, setQuery, wordTypeFilter, setWordTypeFilter, results, savedWords, copyText, insertText, saveWord }) {
  const [paletteNotice, setPaletteNotice] = useState("");
  const [bookmarkPulseTerm, setBookmarkPulseTerm] = useState("");
  const inputRef = useRef(null);
  const noticeTimerRef = useRef(null);
  const bookmarkTimerRef = useRef(null);
  const savedWordTexts = new Set(savedWords.map((word) => getWordText(word)));
  const filterTypes = ["全部", "成語", "詞語", "小說描寫", "論文用語"];

  useEffect(() => {
    inputRef.current?.focus();
    return () => {
      window.clearTimeout(noticeTimerRef.current);
      window.clearTimeout(bookmarkTimerRef.current);
    };
  }, []);

  function showPaletteNotice(message) {
    setPaletteNotice(message);
    window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setPaletteNotice(""), 1400);
  }

  function handleSaveWord(word) {
    const term = word.term;
    const isSaved = savedWordTexts.has(term);
    saveWord(word);

    if (!isSaved) {
      setBookmarkPulseTerm(term);
      window.clearTimeout(bookmarkTimerRef.current);
      bookmarkTimerRef.current = window.setTimeout(() => setBookmarkPulseTerm(""), 650);
    }
  }

  function handleInsertWord(word) {
    insertText(word.term, { stayOnPage: true, silent: true });
    showPaletteNotice(`已插入：${word.term}`);
  }

  return (
    <section className="word-palette-page">
      <div className="word-command-palette">
        <div className="search-box command-search-box">
          <Search size={20} />
          <input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋詞語、意思、情緒或語氣" />
          <kbd>Spotlight</kbd>
        </div>
        <div className="word-hint-row">
          {["古風", "學術", "悲傷", "溫柔", "正式"].map((tone) => (
            <button className="chip" key={tone} onClick={() => setQuery(tone)}>
              {tone}
            </button>
          ))}
        </div>
        <div className="word-filter-row" aria-label="詞語類型篩選">
          {filterTypes.map((type) => (
            <button className={wordTypeFilter === type ? "chip active" : "chip"} key={type} onClick={() => setWordTypeFilter(type)}>
              {type}
            </button>
          ))}
        </div>
        {paletteNotice && <div className="palette-success-tip">{paletteNotice}</div>}
      </div>
      <div className="word-grid">
        {results.map((word, index) => (
          <article className="word-card palette-result-card" key={word.id} style={{ "--item-index": index }}>
            <span>{word.type}</span>
            <h3>{word.term}</h3>
            <p>{word.meaning}</p>
            <div className="word-tags">
              {word.tone.map((tone) => (
                <em key={tone}>{tone}</em>
              ))}
            </div>
            <blockquote>{word.example}</blockquote>
            <div className="button-row">
              <button className="ghost-button compact" onClick={() => copyText(word.term)}>
                <Copy size={15} />
                複製
              </button>
              <button className={`${savedWordTexts.has(word.term) ? "ghost-button compact active" : "ghost-button compact"} ${bookmarkPulseTerm === word.term ? "bookmark-pop" : ""}`} onClick={() => handleSaveWord(word)}>
                <Heart size={15} className="bookmark-icon" />
                {savedWordTexts.has(word.term) ? "取消收藏" : "收藏"}
              </button>
              <button className="primary-button compact" onClick={() => handleInsertWord(word)}>
                插入文章
              </button>
            </div>
          </article>
        ))}
        {!results.length && <EmptyState title="暫時找不到相關詞語，可以換一種說法試試。" description="" />}
      </div>
    </section>
  );
}
function CharacterLibrary({ characters, copyText, insertText, saveCharacter, deleteCharacter }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(() => createEmptyCharacter());

  function startCreate() {
    setEditingId("new");
    setDraft(createEmptyCharacter());
  }

  function startEdit(character) {
    setEditingId(character.id);
    setDraft({ ...character, nicknames: [...character.nicknames] });
  }

  function submitCharacter(event) {
    event.preventDefault();
    if (saveCharacter(draft)) {
      setEditingId(null);
      setDraft(createEmptyCharacter());
    }
  }

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="character-workspace">
      <div className={editingId ? "panel character-editor-panel" : "character-editor-panel character-create-only"}>
        <div className="panel-heading character-create-heading">
          <button className="primary-button compact" onClick={startCreate}>
            <Plus size={16} />
            新增角色
          </button>
        </div>
        {editingId && (
          <form className="character-form" onSubmit={submitCharacter}>
            <label>
              全名
              <input value={draft.fullName} onChange={(event) => updateDraft("fullName", event.target.value)} placeholder="例如：林知夏" />
            </label>
            <label>
              暱稱列表
              <input
                value={draft.nicknames.join("、")}
                onChange={(event) => updateDraft("nicknames", event.target.value.split(/[、,，]/))}
                placeholder="用頓號或逗號分隔"
              />
            </label>
            <label>
              身份
              <select value={draft.roleType} onChange={(event) => updateDraft("roleType", event.target.value)}>
                {roleTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              角色簡介
              <textarea value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} rows="3" />
            </label>
            <label>
              備註
              <textarea value={draft.notes} onChange={(event) => updateDraft("notes", event.target.value)} rows="3" />
            </label>
            <div className="button-row">
              <button className="primary-button compact" type="submit">
                保存
              </button>
              <button className="ghost-button" type="button" onClick={() => setEditingId(null)}>
                取消
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="character-grid">
        {characters.length ? (
          characters.map((character) => (
            <article className="character-card" key={character.id}>
              <div className="avatar">{character.fullName.slice(0, 1)}</div>
              <div className="character-title">
                <h3>{character.fullName}</h3>
                <span className="role-badge">{character.roleType}</span>
              </div>
              <NameActionRow label="全名" value={character.fullName} copyText={copyText} insertText={insertText} />
              {character.nicknames.map((nickname) => (
                <NameActionRow label="暱稱" value={nickname} key={nickname} copyText={copyText} insertText={insertText} />
              ))}
              <p>{character.description}</p>
              <em>{character.notes}</em>
              <div className="button-row">
                <button className="ghost-button" onClick={() => startEdit(character)}>
                  編輯
                </button>
                <button className="ghost-button danger" onClick={() => deleteCharacter(character.id)}>
                  <Trash2 size={15} />
                  刪除
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="panel full-width">
            <EmptyState title="尚無角色" description="新增角色後，可以在編輯器快速插入名字，也能加入關係圖。" />
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state-box">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}

function NameActionRow({ label, value, copyText, insertText }) {
  return (
    <div className="name-action-row">
      <span>
        <small>{label}</small>
        {value}
      </span>
      <button className="icon-button" title={`複製 ${value}`} onClick={() => copyText(value)}>
        <Copy size={14} />
      </button>
      <button className="icon-button" title={`插入 ${value}`} onClick={() => insertText(value)}>
        <Plus size={14} />
      </button>
    </div>
  );
}
function RelationMap({
  nodes,
  relations,
  customRelationshipTypes,
  characters,
  charactersById,
  setActiveTab,
  addRelationshipNode,
  addNewRelationshipCharacter,
  updateRelationshipNodes,
  updateRelationshipEdges,
  updateRelationshipEdge,
  replaceRelationshipEdges,
  saveRelationshipType,
  deleteRelationshipType,
}) {
  return (
    <ReactFlowProvider>
      <RelationMapCanvas
        nodes={nodes}
        relations={relations}
        customRelationshipTypes={customRelationshipTypes}
        characters={characters}
        charactersById={charactersById}
        setActiveTab={setActiveTab}
        addRelationshipNode={addRelationshipNode}
        addNewRelationshipCharacter={addNewRelationshipCharacter}
        updateRelationshipNodes={updateRelationshipNodes}
        updateRelationshipEdges={updateRelationshipEdges}
        updateRelationshipEdge={updateRelationshipEdge}
        replaceRelationshipEdges={replaceRelationshipEdges}
        saveRelationshipType={saveRelationshipType}
        deleteRelationshipType={deleteRelationshipType}
      />
    </ReactFlowProvider>
  );
}

function RelationMapCanvas({
  nodes,
  relations,
  customRelationshipTypes,
  characters,
  charactersById,
  setActiveTab,
  addRelationshipNode,
  addNewRelationshipCharacter,
  updateRelationshipNodes,
  updateRelationshipEdges,
  updateRelationshipEdge,
  replaceRelationshipEdges,
  saveRelationshipType,
  deleteRelationshipType,
}) {
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedRelation, setSelectedRelation] = useState(relationshipTypes[0]);
  const [selectedDirection, setSelectedDirection] = useState("one-way");
  const [customRelationLabel, setCustomRelationLabel] = useState("");
  const [flowViewport, setFlowViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [connectMode, setConnectMode] = useState(false);
  const [connectSourceId, setConnectSourceId] = useState("");
  const [connectTargetId, setConnectTargetId] = useState("");
  const [connectHelpPosition, setConnectHelpPosition] = useState(null);
  const [focusedCharacterId, setFocusedCharacterId] = useState("");
  const [hoveredRelationId, setHoveredRelationId] = useState("");
  const [relationshipHistory, setRelationshipHistory] = useState([]);
  const longPressTimerRef = useRef(null);
  const { fitView, setCenter } = useReactFlow();

  const graphCharacterIds = new Set(nodes.map((node) => node.characterId));
  const focusedRelationIds = useMemo(() => {
    if (!focusedCharacterId) return new Set();
    return new Set(relations.filter((relation) => relation.from === focusedCharacterId || relation.to === focusedCharacterId).map((relation) => relation.id));
  }, [focusedCharacterId, relations]);
  const focusedRelatedCharacterIds = useMemo(() => {
    if (!focusedCharacterId) return new Set();
    const relatedIds = new Set([focusedCharacterId]);
    relations.forEach((relation) => {
      if (relation.from === focusedCharacterId) relatedIds.add(relation.to);
      if (relation.to === focusedCharacterId) relatedIds.add(relation.from);
    });
    return relatedIds;
  }, [focusedCharacterId, relations]);
  const relationTypeOptions = useMemo(() => {
    const typesByLabel = new Map();

    relationshipTypes.forEach((type) => typesByLabel.set(type.label, type));
    (customRelationshipTypes ?? []).forEach((type) => typesByLabel.set(type.label, type));
    (relations ?? []).forEach((relation) => {
      if (!typesByLabel.has(relation.label)) {
        typesByLabel.set(relation.label, { label: relation.label, color: relation.color });
      }
    });
    return [...typesByLabel.values()];
  }, [customRelationshipTypes, relations]);
  const normalizedNodes = nodes.map((node, index) => ({
    ...node,
    x: Number.isFinite(node.x) && Math.abs(node.x) < 5000 ? node.x : 120 + (index % 3) * 220,
    y: Number.isFinite(node.y) && Math.abs(node.y) < 5000 ? node.y : 120 + Math.floor(index / 3) * 140,
  }));
  const baseFlowNodes = normalizedNodes.map((node) => {
    const character = charactersById[node.characterId];
    const isFocused = focusedCharacterId === node.characterId;
    const isRelated = focusedRelatedCharacterIds.has(node.characterId);
    const focusState = focusedCharacterId ? (isFocused ? "focus-primary" : isRelated ? "focus-related" : "focus-dimmed") : "";
    return {
      id: node.characterId,
      type: "character",
      position: { x: node.x, y: node.y },
      width: 150,
      height: 64,
      className: focusState ? `relation-node-${focusState}` : "",
      data: {
        fullName: character?.fullName ?? "未知角色",
        roleType: character?.roleType ?? "其他",
        selectedForConnect: connectSourceId === node.characterId || connectTargetId === node.characterId,
        focusState,
      },
    };
  });
  const [flowNodes, setFlowNodes] = useNodesState(baseFlowNodes);
  const flowEdges = relations.map((relation) => ({
    id: relation.id,
    source: relation.from,
    target: relation.to,
    type: "default",
    label: relation.label,
    style: { stroke: relation.color, strokeWidth: 3 },
    data: { direction: relation.direction ?? "one-way" },
    labelStyle: { fill: relation.color, fontWeight: 700 },
    labelBgStyle: { fill: "#fffdf8", fillOpacity: 0.92 },
  }));

  useEffect(() => {
    setFlowNodes(baseFlowNodes);
  }, [nodes, charactersById, connectSourceId, connectTargetId, focusedCharacterId, focusedRelatedCharacterIds, setFlowNodes]);

  function handleNodeChanges(changes) {
    setFlowNodes((currentNodes) => {
      const nextNodes = applyNodeChanges(changes, currentNodes);
      window.setTimeout(() => updateRelationshipNodes(nextNodes), 0);
      return nextNodes;
    });
  }

  function handleEdgeChanges(changes) {
    if (changes.some((change) => change.type === "remove")) {
      rememberRelations();
    }
    const nextEdges = applyEdgeChanges(changes, flowEdges);
    updateRelationshipEdges(nextEdges);
  }

  function handleConnect(connection) {
    createRelation(connection.source, connection.target);
  }

  function handleAddNode() {
    addRelationshipNode(selectedCharacterId);
  }

  function focusSelectedCharacter() {
    const targetNode = normalizedNodes.find((node) => node.characterId === selectedCharacterId);

    if (!targetNode) {
      fitView({ padding: 0.25, duration: 250 });
      return;
    }

    setCenter(targetNode.x + 75, targetNode.y + 32, { zoom: 1.25, duration: 350 });
  }

  function createRelation(sourceId, targetId) {
    if (!sourceId || !targetId) return;
    if (sourceId === targetId) return;

    rememberRelations();
    const nextEdge = {
      id: `rel-${sourceId}-${targetId}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      type: "default",
      label: selectedRelation.label,
      style: { stroke: selectedRelation.color, strokeWidth: 3 },
      data: { direction: selectedDirection },
    };
    const nextEdges = addEdge(nextEdge, flowEdges);
    updateRelationshipEdges(nextEdges);
  }

  function rememberRelations() {
    setRelationshipHistory((current) => [...current.slice(-9), relations.map((relation) => ({ ...relation }))]);
  }

  function undoRelationshipChange() {
    const previousRelations = relationshipHistory.at(-1);
    if (!previousRelations) return;

    replaceRelationshipEdges(previousRelations);
    setRelationshipHistory((current) => current.slice(0, -1));
  }

  function handleUpdateRelation(edgeId, patch) {
    rememberRelations();
    updateRelationshipEdge(edgeId, patch);
  }

  function deleteRelationship(edgeId) {
    rememberRelations();
    replaceRelationshipEdges(relations.filter((relation) => relation.id !== edgeId));
  }

  function addCustomRelationshipType() {
    const label = customRelationLabel.trim();
    if (!label) return;

    const nextType = { label, color: selectedRelation.color };
    saveRelationshipType(nextType);
    setSelectedRelation(nextType);
    setCustomRelationLabel("");
  }

  function clearTypeDeleteTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function deleteCustomRelationshipType(label) {
    clearTypeDeleteTimer();
    deleteRelationshipType(label);
    if (selectedRelation.label === label) {
      setSelectedRelation(relationshipTypes[0]);
    }
  }

  function startTypeDeletePress(label) {
    clearTypeDeleteTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      deleteCustomRelationshipType(label);
    }, 650);
  }

  function handleNodeClick(_, node) {
    if (!connectMode) {
      setFocusedCharacterId((current) => (current === node.id ? "" : node.id));
      return;
    }

    if (!connectSourceId || connectTargetId) {
      setConnectSourceId(node.id);
      setConnectTargetId("");
      return;
    }

    if (node.id !== connectSourceId) {
      setConnectTargetId(node.id);
      createRelation(connectSourceId, node.id);
      setConnectSourceId("");
      setConnectTargetId("");
      setConnectMode(false);
    }
  }

  function handleManualCreateRelation() {
    createRelation(connectSourceId, connectTargetId);
    setConnectSourceId("");
    setConnectTargetId("");
  }

  function showConnectHelp(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setConnectHelpPosition({
      x: rect.left + rect.width / 2,
      y: rect.bottom + 10,
    });
  }

  function getRelationScreenGeometry(relation) {
    const nodeById = Object.fromEntries(flowNodes.map((node) => [node.id, node]));
    const from = nodeById[relation.from];
    const to = nodeById[relation.to];
    if (!from || !to) return null;

    const nodeWidth = 150;
    const nodeHeight = 64;
    const edgePadding = 10;
    const fromCenter = { x: from.position.x + nodeWidth / 2, y: from.position.y + nodeHeight / 2 };
    const toCenter = { x: to.position.x + nodeWidth / 2, y: to.position.y + nodeHeight / 2 };

    function toScreen(point) {
      return {
        x: point.x * flowViewport.zoom + flowViewport.x,
        y: point.y * flowViewport.zoom + flowViewport.y,
      };
    }

    function getRectEdgePoint(center, targetCenter) {
      const dx = targetCenter.x - center.x;
      const dy = targetCenter.y - center.y;
      if (!dx && !dy) return center;

      const halfWidth = nodeWidth / 2 + edgePadding;
      const halfHeight = nodeHeight / 2 + edgePadding;
      const scale = Math.min(Math.abs(halfWidth / dx), Math.abs(halfHeight / dy));
      return { x: center.x + dx * scale, y: center.y + dy * scale };
    }

    const key = [relation.from, relation.to].sort().join("|");
    const siblings = relations.filter((item) => [item.from, item.to].sort().join("|") === key).map((item) => item.id);
    const centeredIndex = siblings.indexOf(relation.id) - (siblings.length - 1) / 2;
    const directionSign = relation.from <= relation.to ? 1 : -1;
    const start = toScreen(getRectEdgePoint(fromCenter, toCenter));
    const end = toScreen(getRectEdgePoint(toCenter, fromCenter));
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / length, y: dx / length };
    const offset = centeredIndex * 46 * directionSign * flowViewport.zoom;
    const baseCurve = Math.min(92, Math.max(34, length * 0.16));

    return {
      start,
      control: {
        x: (start.x + end.x) / 2 + normal.x * (baseCurve + offset),
        y: (start.y + end.y) / 2 + normal.y * (baseCurve + offset),
      },
      end,
    };
  }

  function getQuadraticPoint(start, control, end, t) {
    const inverse = 1 - t;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    };
  }

  function getPointSegmentDistance(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    const ratio = lengthSquared ? Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared)) : 0;
    const projection = { x: start.x + ratio * dx, y: start.y + ratio * dy };
    return Math.hypot(point.x - projection.x, point.y - projection.y);
  }

  function getDistanceToRelation(point, relation) {
    const geometry = getRelationScreenGeometry(relation);
    if (!geometry) return Infinity;

    let previous = geometry.start;
    let nearest = Infinity;
    for (let step = 1; step <= 24; step += 1) {
      const next = getQuadraticPoint(geometry.start, geometry.control, geometry.end, step / 24);
      nearest = Math.min(nearest, getPointSegmentDistance(point, previous, next));
      previous = next;
    }
    return nearest;
  }

  function handleCanvasMouseMove(event) {
    if (event.target.closest(".react-flow__node")) {
      setHoveredRelationId("");
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const nearest = relations.reduce(
      (current, relation) => {
        const distance = getDistanceToRelation(point, relation);
        return distance < current.distance ? { relationId: relation.id, distance } : current;
      },
      { relationId: "", distance: Infinity }
    );

    setHoveredRelationId(nearest.distance <= 14 ? nearest.relationId : "");
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fitView({ padding: 0.25, duration: 250 });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [fitView, flowNodes.length, flowEdges.length]);

  useEffect(() => () => clearTypeDeleteTimer(), []);

  return (
    <section className="panel full relation-flow-panel">
      <div className="relation-controls relation-toolbar">
        <div className="relation-toolbar-section relation-toolbar-primary">
          <span className="relation-control-title">主要操作</span>
          <select className="relation-character-select" value={selectedCharacterId} onChange={(event) => setSelectedCharacterId(event.target.value)} aria-label="選擇角色">
            <option value="">選擇角色</option>
            {characters.map((character) => (
              <option value={character.id} key={character.id}>
                {character.fullName}{graphCharacterIds.has(character.id) ? "（已在圖上）" : ""}
              </option>
            ))}
          </select>
          <button className="primary-button compact" onClick={selectedCharacterId ? handleAddNode : addNewRelationshipCharacter}>
            <Plus size={16} />
            新增角色節點
          </button>
          <span className="relation-help-wrap">
            <button
              className={connectMode ? "primary-button compact" : "ghost-button compact"}
              onClick={() => setConnectMode((current) => !current)}
              onMouseEnter={showConnectHelp}
              onMouseLeave={() => setConnectHelpPosition(null)}
              onFocus={showConnectHelp}
              onBlur={() => setConnectHelpPosition(null)}
              aria-describedby="relation-connect-tip"
            >
              <Plus size={16} />
              {connectMode ? "連線模式中" : "建立關係"}
            </button>
          </span>
        </div>

        <div className="relation-toolbar-section relation-toolbar-settings">
          <span className="relation-control-title">關係設定</span>
          <select
            value={selectedRelation.label}
            onChange={(event) => setSelectedRelation(relationTypeOptions.find((item) => item.label === event.target.value) ?? relationshipTypes[0])}
            aria-label="關係類型"
          >
            {relationTypeOptions.map((relation) => (
              <option key={relation.label} value={relation.label}>
                {relation.label}
              </option>
            ))}
          </select>
          <input
            aria-label="關係顏色"
            className="relation-color-input"
            type="color"
            value={selectedRelation.color}
            onChange={(event) => setSelectedRelation((current) => ({ ...current, color: event.target.value }))}
          />
          <select className="relation-direction-select" value={selectedDirection} onChange={(event) => setSelectedDirection(event.target.value)} aria-label="關係方向">
            <option value="one-way">單向 →</option>
            <option value="two-way">雙向 ↔</option>
            <option value="none">無箭頭 —</option>
          </select>
          <div className="relation-custom-pair">
            <input
              className="relation-custom-input"
              value={customRelationLabel}
              onChange={(event) => setCustomRelationLabel(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addCustomRelationshipType();
                }
              }}
              placeholder="自定義關係，例如：師徒"
            />
            <button className="ghost-button compact" onClick={addCustomRelationshipType} disabled={!customRelationLabel.trim()}>
              加入
            </button>
          </div>
          {customRelationshipTypes.length > 0 && (
            <div className="custom-relation-tags compact-tags" aria-label="自定義關係標籤">
              {customRelationshipTypes.map((type) => (
                <button
                  className="custom-relation-tag"
                  key={type.label}
                  style={{ "--tag-color": type.color }}
                  title="右鍵或長按可刪除"
                  onClick={() => setSelectedRelation(type)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    deleteCustomRelationshipType(type.label);
                  }}
                  onPointerDown={() => startTypeDeletePress(type.label)}
                  onPointerUp={clearTypeDeleteTimer}
                  onPointerLeave={clearTypeDeleteTimer}
                  onPointerCancel={clearTypeDeleteTimer}
                >
                  {type.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relation-toolbar-section relation-toolbar-assist">
          <span className="relation-control-title">輔助操作</span>
          <button className="ghost-button compact" onClick={focusSelectedCharacter}>
            定位到角色
          </button>
          <button className="ghost-button compact" onClick={undoRelationshipChange} disabled={!relationshipHistory.length}>
            <Undo2 size={16} />
            撤回
          </button>
        </div>
      </div>
      {connectHelpPosition && (
        <div className="floating-relation-tooltip" id="relation-connect-tip" role="tooltip" style={{ left: connectHelpPosition.x, top: connectHelpPosition.y }}>
          點一下進入連線模式，再依序點選兩個角色建立關係。
        </div>
      )}
      <div className="react-flow-canvas" onMouseMove={handleCanvasMouseMove} onMouseLeave={() => setHoveredRelationId("")}>
        <ReactFlow
          nodes={flowNodes}
          edges={[]}
          nodeTypes={relationNodeTypes}
          onNodesChange={handleNodeChanges}
          onEdgesChange={handleEdgeChanges}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setFocusedCharacterId("")}
          onMove={(_, viewport) => setFlowViewport(viewport)}
          onInit={(instance) =>
            window.setTimeout(() => {
              instance.fitView({ padding: 0.25 });
              setFlowViewport(instance.getViewport());
            }, 80)
          }
          fitView
          fitViewOptions={{ padding: 0.25 }}
        >
          <Background color="#d8d2c7" gap={28} />
          <Controls />
          <MiniMap nodeColor="#cfc8ea" maskColor="rgba(246, 241, 232, 0.72)" />
        </ReactFlow>
        <RelationshipOverlay
          nodes={flowNodes}
          relations={relations}
          viewport={flowViewport}
          focusedCharacterId={focusedCharacterId}
          focusedRelationIds={focusedRelationIds}
          hoveredRelationId={hoveredRelationId}
          setHoveredRelationId={setHoveredRelationId}
        />
      </div>

      <div className="relationship-editor-list">
        {relations.map((relation) => (
          <div className="relationship-row" key={relation.id}>
            <span>
              {charactersById[relation.from]?.fullName ?? "未知角色"} → {charactersById[relation.to]?.fullName ?? "未知角色"}
            </span>
            <select value={relation.label} onChange={(event) => handleUpdateRelation(relation.id, { label: event.target.value })}>
              {relationTypeOptions.map((type) => (
                <option key={type.label} value={type.label}>
                  {type.label}
                </option>
              ))}
            </select>
            <select value={relation.direction ?? "one-way"} onChange={(event) => handleUpdateRelation(relation.id, { direction: event.target.value })} aria-label="關係方向">
              <option value="one-way">單向 →</option>
              <option value="two-way">雙向 ↔</option>
              <option value="none">無箭頭 —</option>
            </select>
            <input
              aria-label={`${relation.label} 顏色`}
              type="color"
              value={relation.color}
              onChange={(event) => handleUpdateRelation(relation.id, { color: event.target.value })}
            />
            <button className="ghost-button danger compact" onClick={() => deleteRelationship(relation.id)}>
              <Trash2 size={15} />
              刪除
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function RelationshipOverlay({ nodes, relations, viewport, focusedCharacterId, focusedRelationIds, hoveredRelationId, setHoveredRelationId }) {
  const nodeById = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const nodeWidth = 150;
  const nodeHeight = 64;
  const edgePadding = 10;

  const edgeGroups = relations.reduce((groups, relation) => {
    const key = [relation.from, relation.to].sort().join("|");
    return {
      ...groups,
      [key]: [...(groups[key] ?? []), relation.id],
    };
  }, {});

  function toScreen(point) {
    return {
      x: point.x * viewport.zoom + viewport.x,
      y: point.y * viewport.zoom + viewport.y,
    };
  }

  function getCenter(node) {
    return {
      x: node.position.x + nodeWidth / 2,
      y: node.position.y + nodeHeight / 2,
    };
  }

  function getRectEdgePoint(center, targetCenter) {
    const dx = targetCenter.x - center.x;
    const dy = targetCenter.y - center.y;

    if (!dx && !dy) return center;

    const halfWidth = nodeWidth / 2 + edgePadding;
    const halfHeight = nodeHeight / 2 + edgePadding;
    const scale = Math.min(Math.abs(halfWidth / dx), Math.abs(halfHeight / dy));

    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale,
    };
  }

  function getRelationOffset(relation) {
    const key = [relation.from, relation.to].sort().join("|");
    const siblings = edgeGroups[key] ?? [];
    const index = siblings.indexOf(relation.id);
    const centeredIndex = index - (siblings.length - 1) / 2;
    const directionSign = relation.from <= relation.to ? 1 : -1;

    return centeredIndex * 46 * directionSign;
  }

  return (
    <svg className="relationship-overlay" aria-hidden="true">
      <defs>
        {relations.flatMap((relation) => [
          <marker id={`arrow-end-${relation.id}`} key={`end-${relation.id}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={relation.color} />
          </marker>,
          <marker id={`arrow-start-${relation.id}`} key={`start-${relation.id}`} markerWidth="10" markerHeight="10" refX="1" refY="3" orient="auto-start-reverse" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill={relation.color} />
          </marker>,
        ])}
      </defs>
      {relations.map((relation) => {
        const from = nodeById[relation.from];
        const to = nodeById[relation.to];
        if (!from || !to) return null;

        const fromCenter = getCenter(from);
        const toCenter = getCenter(to);
        const start = toScreen(getRectEdgePoint(fromCenter, toCenter));
        const end = toScreen(getRectEdgePoint(toCenter, fromCenter));
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const length = Math.hypot(dx, dy) || 1;
        const normal = { x: -dy / length, y: dx / length };
        const offset = getRelationOffset(relation) * viewport.zoom;
        const baseCurve = Math.min(92, Math.max(34, length * 0.16));
        const control = {
          x: (start.x + end.x) / 2 + normal.x * (baseCurve + offset),
          y: (start.y + end.y) / 2 + normal.y * (baseCurve + offset),
        };
        const label = relation.label ?? "關係";
        const labelWidth = Math.max(46, label.length * 16 + 18);
        const direction = relation.direction ?? "one-way";
        const path = `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
        const isFocusedRelation = focusedRelationIds?.has(relation.id);
        const isDimmed = Boolean(focusedCharacterId) && !isFocusedRelation;
        const isHovered = hoveredRelationId === relation.id;
        const relationClassName = [
          "relationship-overlay-relation",
          isFocusedRelation ? "focused" : "",
          isDimmed ? "dimmed" : "",
          isHovered ? "hovered" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <g
            className={relationClassName}
            key={relation.id}
            onMouseEnter={() => setHoveredRelationId(relation.id)}
            onMouseLeave={() => setHoveredRelationId("")}
          >
            <path className="relationship-overlay-hit" d={path} />
            <path
              className="relationship-overlay-path"
              d={path}
              stroke={relation.color}
              markerStart={direction === "two-way" ? `url(#arrow-start-${relation.id})` : undefined}
              markerEnd={direction === "one-way" || direction === "two-way" ? `url(#arrow-end-${relation.id})` : undefined}
            />
            <rect className="relationship-overlay-label-bg" x={control.x - labelWidth / 2} y={control.y - 18} width={labelWidth} height="24" rx="12" />
            <text className="relationship-overlay-label" x={control.x} y={control.y - 1} fill={relation.color}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Formatter({ mode, setMode, document, characters, applyFormattedDocument, copyText }) {
  const formatOptionLabels = {
    chapterTitles: "整理章節標題",
    dialogueBreaks: "整理對話換行",
    cleanBlankLines: "清理多餘空行",
    highlightNames: "高亮角色名字",
  };
  const [formatOptions, setFormatOptions] = useState({
    chapterTitles: true,
    dialogueBreaks: true,
    cleanBlankLines: true,
    highlightNames: true,
  });
  const [formatStatus, setFormatStatus] = useState("");
  const [pendingPreview, setPendingPreview] = useState(null);
  const hasSelectedOptions = Object.values(formatOptions).some(Boolean);
  const formattedDocument = useMemo(
    () => formatDocument(document?.content ?? "", mode, characters, formatOptions),
    [document?.content, mode, characters, formatOptions]
  );
  const previewDocument = pendingPreview ?? formattedDocument;

  function toggleFormatOption(optionKey) {
    setFormatOptions((current) => ({ ...current, [optionKey]: !current[optionKey] }));
    setFormatStatus("");
    setPendingPreview(null);
  }

  function handleAutoFormat() {
    if (!hasSelectedOptions) {
      setFormatStatus("請至少選擇一個排版項目");
      return;
    }

    setPendingPreview(formattedDocument);
    setFormatStatus("已產生修改預覽，確認後才會套用到文章。");
  }

  function confirmAutoFormat() {
    const nextDocument = pendingPreview ?? formattedDocument;
    applyFormattedDocument(nextDocument);
    setPendingPreview(null);
    setFormatStatus("自動排版已套用完成");
  }

  function cancelAutoFormat() {
    setPendingPreview(null);
    setFormatStatus("已取消套用，文章未變更。");
  }

  return (
    <section className="formatter-layout">
      <div className="panel">
        <h2>自動排版</h2>
        <div className="segment">
          <button className={mode === "paper" ? "active" : ""} onClick={() => setMode("paper")}>
            論文模式
          </button>
          <button className={mode === "novel" ? "active" : ""} onClick={() => setMode("novel")}>
            小說模式
          </button>
        </div>
        <div className="format-options">
          {Object.entries(formatOptionLabels).map(([optionKey, label]) => (
            <label key={optionKey}>
              <input
                type="checkbox"
                checked={formatOptions[optionKey]}
                onChange={() => toggleFormatOption(optionKey)}
              />
              {label}
            </label>
          ))}
        </div>
        <button className="primary-button compact format-apply-button" onClick={handleAutoFormat} disabled={!hasSelectedOptions}>
          產生修改預覽
        </button>
        {pendingPreview && (
          <div className="format-confirm-actions">
            <button className="primary-button compact" onClick={confirmAutoFormat}>
              確認套用
            </button>
            <button className="ghost-button compact" onClick={cancelAutoFormat}>
              取消
            </button>
          </div>
        )}
        <p className={hasSelectedOptions ? "format-status" : "format-status warning"}>
          {formatStatus || (hasSelectedOptions ? "預覽會依目前勾選項目即時更新。" : "請至少選擇一個排版項目")}
        </p>
        <div className="format-warning-list">
          <strong>檢查結果</strong>
          {previewDocument.warnings.length ? (
            previewDocument.warnings.map((warning) => (
              <span key={warning}>{warning}</span>
            ))
          ) : (
            <span>未發現角色資料庫不一致</span>
          )}
        </div>
      </div>
      <div className="format-preview-shell">
        <button className="copy-full-button" aria-label="複製全文" data-tooltip="複製全文" onClick={() => copyText(previewDocument.text)}>
          <Copy size={16} />
        </button>
        <article className={mode === "paper" ? "format-preview paper" : "format-preview novel"} data-preview-state={pendingPreview ? "pending" : "live"} dangerouslySetInnerHTML={{ __html: previewDocument.html }} />
      </div>
    </section>
  );
}

function countWords(documents) {
  return documents.reduce((total, document) => total + (document.content ?? "").replace(/\s/g, "").length, 0);
}

function getSaveStatusText(status) {
  if (status === "loading") return "Loading...";
  if (status === "saving") return "Saving...";
  if (status === "error") return "Save failed";
  return "Saved";
}

function getWordText(word) {
  return word.word ?? word.term ?? "";
}

function downloadFile(filename, type, content) {
  const blob = new Blob([content], { type });
  downloadBlob(filename, blob);
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(value) {
  return (value || "writenest-document").replace(/[\\/:*?"<>|]/g, "-").trim() || "writenest-document";
}

function formatDateStamp(date) {
  return date.toISOString().slice(0, 19).replace(/[:T]/g, "-");
}

function documentToMarkdown(document) {
  const lines = (document.content ?? "").split("\n");
  return lines
    .map((line, index) => {
      if (index === 0 && line.trim()) return `# ${line.replace(/^#+\s*/, "").trim()}`;
      return line;
    })
    .join("\n");
}

function mergeWorkspaceData(currentData, importedData) {
  return createWorkspaceData({
    ...currentData,
    projects: mergeById(currentData.projects, importedData.projects),
    documents: mergeById(currentData.documents, importedData.documents),
    characters: mergeById(currentData.characters, importedData.characters),
    relationships: {
      customTypes: mergeByLabel(currentData.relationships.customTypes ?? [], importedData.relationships.customTypes ?? []),
      nodes: mergeByKey(currentData.relationships.nodes, importedData.relationships.nodes, "characterId"),
      edges: mergeById(currentData.relationships.edges, importedData.relationships.edges),
    },
    savedWords: mergeByKey(currentData.savedWords, importedData.savedWords, (word) => getWordText(word) || word.id),
  });
}

function mergeById(currentItems = [], importedItems = []) {
  return mergeByKey(currentItems, importedItems, "id");
}

function mergeByLabel(currentItems = [], importedItems = []) {
  return mergeByKey(currentItems, importedItems, "label");
}

function mergeByKey(currentItems = [], importedItems = [], key) {
  const getKey = typeof key === "function" ? key : (item) => item?.[key];
  const itemMap = new Map();
  currentItems.forEach((item) => itemMap.set(getKey(item), item));
  importedItems.forEach((item) => itemMap.set(getKey(item), item));
  return [...itemMap.values()].filter(Boolean);
}

function formatDocument(text, mode, characters, options = {}) {
  return mode === "paper" ? formatPaperDocument(text, characters, options) : formatNovelDocument(text, characters, options);
}

function normalizePlainText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizePunctuationSpacing(text) {
  return text
    .replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, "$1 $2")
    .replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, "$1 $2")
    .replace(/[ \t]+([，。！？；：、])/g, "$1")
    .replace(/[ \t]{2,}/g, " ");
}

function formatPaperDocument(text, characters, options = {}) {
  const sourceText = options.cleanBlankLines ? normalizePlainText(text) : text.trim();
  const cleaned = normalizePunctuationSpacing(sourceText);
  const blocks = cleaned.split(/\n+/).map((block) => block.trim()).filter(Boolean);
  const htmlParts = [];
  const plainParts = [];
  const knownNames = getKnownCharacterNames(characters);

  blocks.forEach((block, index) => {
    const normalizedTitle = block.replace(/^#+\s*/, "");
    const isMainTitle = options.chapterTitles && index === 0;
    const isSectionTitle = options.chapterTitles && /^(\d+(\.\d+)*|[一二三四五六七八九十]+[、.．])\s*/.test(block) && block.length <= 40;

    if (isMainTitle) {
      htmlParts.push(`<h1>${escapeHtml(normalizedTitle)}</h1>`);
      plainParts.push(normalizedTitle);
    } else if (isSectionTitle) {
      htmlParts.push(`<h2>${escapeHtml(block)}</h2>`);
      plainParts.push(block);
    } else {
      const paragraph = block.replace(/^\s+/, "");
      htmlParts.push(`<p>${options.highlightNames ? highlightCharacterNames(paragraph, knownNames) : escapeHtml(paragraph)}</p>`);
      plainParts.push(`　　${paragraph}`);
    }
  });

  return {
    text: plainParts.join("\n\n"),
    html: htmlParts.join(""),
    checks: getEnabledCheckLabels(options),
    warnings: options.checkCharacterNames ? findCharacterNameWarnings(cleaned, characters) : [],
  };
}

function formatNovelDocument(text, characters, options = {}) {
  const cleaned = options.cleanBlankLines ? normalizePlainText(text) : text.trim();
  const knownNames = getKnownCharacterNames(characters);
  const lines = cleaned
    .split("\n")
    .flatMap((line) => (options.dialogueBreaks ? splitNovelDialogue(line.trim()) : [line.trim()]))
    .filter(Boolean);
  const htmlParts = [];
  const plainParts = [];

  lines.forEach((line) => {
    const chapterMatch = options.chapterTitles ? line.match(/^(第[一二三四五六七八九十\d]+[章節].*)$/) : null;
    if (chapterMatch) {
      const title = chapterMatch[1].replace(/[：:]\s*/g, "：");
      htmlParts.push(`<h1>${escapeHtml(title)}</h1>`);
      plainParts.push(title);
      return;
    }

    const highlighted = options.highlightNames ? highlightCharacterNames(line, knownNames) : escapeHtml(line);
    htmlParts.push(`<p>${highlighted}</p>`);
    plainParts.push(line);
  });

  return {
    text: plainParts.join("\n\n"),
    html: htmlParts.join(""),
    checks: getEnabledCheckLabels(options),
    warnings: options.checkCharacterNames ? findCharacterNameWarnings(cleaned, characters) : [],
  };
}

function getEnabledCheckLabels(options) {
  const labels = {
    chapterTitles: "整理章節標題",
    dialogueBreaks: "整理對話換行",
    cleanBlankLines: "清理多餘空行",
    highlightNames: "高亮角色名字",
    checkCharacterNames: "檢查角色資料庫一致性",
  };
  return Object.entries(labels)
    .filter(([key]) => options[key])
    .map(([, label]) => label);
}

function getKnownCharacterNames(characters) {
  return characters.flatMap((character) => [character.fullName, ...(character.nicknames ?? [])]).filter(Boolean);
}

function findCharacterNameWarnings(text, characters) {
  const knownNames = new Set(getKnownCharacterNames(characters));
  const ignoredTerms = new Set([
    "第一章",
    "第二章",
    "第三章",
    "第四章",
    "第五章",
    "本研究",
    "論文摘要",
    "研究動機",
    "數位筆記",
    "角色資料庫",
  ]);
  const possibleNames = [...new Set([...text.matchAll(/[\u4e00-\u9fff]{2,4}/g)].map((match) => match[0]))]
    .filter((name) => !knownNames.has(name))
    .filter((name) => !ignoredTerms.has(name))
    .filter((name) => !/[章節研究摘要工具資料庫]/.test(name))
    .slice(0, 5);

  return possibleNames.map((name) => `「${name}」不在角色資料庫中，可視需要新增。`);
}

function splitNovelDialogue(line) {
  if (!line) return [];
  return line
    .replace(/([。！？])\s*(「)/g, "$1\n$2")
    .replace(/(」)\s*([^，。！？；：\s])/g, "$1\n$2")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function highlightCharacterNames(html, names) {
  const sortedNames = [...new Set(names)].sort((a, b) => b.length - a.length);
  if (!sortedNames.length) return escapeHtml(html);

  const namePattern = new RegExp(`(${sortedNames.map(escapeRegExp).join("|")})`, "g");
  return html
    .split(namePattern)
    .map((part) => (sortedNames.includes(part) ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part)))
    .join("");
}
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default App;







