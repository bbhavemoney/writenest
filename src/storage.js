import localforage from "localforage";
import { createWorkspaceData, STORAGE_SCHEMA_VERSION } from "./dataModel.js";

const LEGACY_WORKSPACE_KEY = "writenest.workspace.v1";
const PROJECTS_KEY = "writenest.projects.v2";
const ACTIVE_PROJECT_KEY = "writenest.activeProjectId.v2";

localforage.config({
  name: "WriteNest",
  storeName: "workspace",
  description: "WriteNest local writing workspace",
});

export async function loadWorkspaceData() {
  const storedProjects = readLocalJson(PROJECTS_KEY);
  if (Array.isArray(storedProjects) && storedProjects.length) {
    return createWorkspaceData({ projects: storedProjects, activeProjectId: localStorage.getItem(ACTIVE_PROJECT_KEY) });
  }

  const legacy = await localforage.getItem(LEGACY_WORKSPACE_KEY);
  if (legacy) {
    const migrated = createWorkspaceData(legacy);
    await saveWorkspaceData(migrated);
    return migrated;
  }

  const initialData = createWorkspaceData();
  await saveWorkspaceData(initialData);
  return initialData;
}

export async function saveWorkspaceData(data) {
  const nextData = createWorkspaceData({ ...data, schemaVersion: STORAGE_SCHEMA_VERSION });
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(nextData.projects));
  if (nextData.activeProjectId) localStorage.setItem(ACTIVE_PROJECT_KEY, nextData.activeProjectId);
  else localStorage.removeItem(ACTIVE_PROJECT_KEY);
  return nextData;
}

function readLocalJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null");
  } catch {
    return null;
  }
}
