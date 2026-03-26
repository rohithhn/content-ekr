import Dexie from "dexie";

/**
 * ContentEngine local database using Dexie (IndexedDB wrapper).
 * All data persists locally in the browser — no server-side DB needed for MVP.
 */
const db = new Dexie("ContentEngineDB");

db.version(1).stores({
  // Brand profiles with full configuration
  brands: "id, name, company_name, createdAt",
  
  // Projects (content creation sessions)
  projects: "id, title, brandId, createdAt, updatedAt",
  
  // Messages within projects
  messages: "id, projectId, role, createdAt",
  
  // Generated content bundles (linked to messages)
  bundles: "id, messageId, projectId",
  
  // Version history per output
  versions: "++id, bundleId, channel, createdAt",
  
  // User preferences
  preferences: "key",
});

export default db;

/**
 * Save a brand profile to IndexedDB.
 */
export async function saveBrand(brand) {
  return db.brands.put({
    ...brand,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Load all brand profiles.
 */
export async function loadBrands() {
  return db.brands.toArray();
}

/**
 * Save a project with its messages.
 */
export async function saveProject(project, messages) {
  await db.projects.put({
    ...project,
    updatedAt: new Date().toISOString(),
  });
  
  // Upsert messages
  if (messages?.length) {
    await db.messages.bulkPut(
      messages.map((m) => ({ ...m, projectId: project.id }))
    );
  }
}

/**
 * Load a project's messages.
 */
export async function loadProjectMessages(projectId) {
  return db.messages.where("projectId").equals(projectId).sortBy("createdAt");
}

/**
 * Load all projects (metadata only, no messages).
 */
export async function loadProjects() {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}
