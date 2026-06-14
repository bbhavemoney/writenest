import localforage from "localforage";
import { createWorkspaceData, STORAGE_SCHEMA_VERSION } from "./dataModel.js";

const WORKSPACE_KEY = "writenest.workspace.v1";

localforage.config({
  name: "WriteNest",
  storeName: "workspace",
  description: "WriteNest local writing workspace",
});

export async function loadWorkspaceData() {
  const stored = await localforage.getItem(WORKSPACE_KEY);

  if (!stored || stored.schemaVersion !== STORAGE_SCHEMA_VERSION) {
    const initialData = createWorkspaceData();
    await saveWorkspaceData(initialData);
    return initialData;
  }

  return createWorkspaceData(stored);
}

export async function saveWorkspaceData(data) {
  const nextData = {
    ...data,
    schemaVersion: STORAGE_SCHEMA_VERSION,
  };

  await localforage.setItem(WORKSPACE_KEY, nextData);
  return nextData;
}
