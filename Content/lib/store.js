import { create } from "zustand";

/**
 * Global application state using Zustand.
 * Persists brand profiles and project metadata to IndexedDB via Dexie.
 */
export const useAppStore = create((set, get) => ({
  // ─── User ──────────────────────────────────────────────
  user: null,
  setUser: (user) => set({ user }),

  // ─── Brand Profiles ────────────────────────────────────
  brands: [],
  activeBrandId: null,
  setBrands: (brands) => set({ brands }),
  setActiveBrandId: (id) => set({ activeBrandId: id }),
  getActiveBrand: () => {
    const state = get();
    return state.brands.find((b) => b.id === state.activeBrandId) || null;
  },
  addBrand: (brand) =>
    set((state) => ({ brands: [...state.brands, brand] })),
  updateBrand: (brand) =>
    set((state) => ({
      brands: state.brands.map((b) => (b.id === brand.id ? brand : b)),
    })),

  // ─── Projects ──────────────────────────────────────────
  projects: [],
  activeProjectId: null,
  setProjects: (projects) => set({ projects }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  addProject: (project) =>
    set((state) => ({ projects: [project, ...state.projects] })),
  updateProject: (project) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id ? project : p
      ),
    })),

  // ─── Current Generation ────────────────────────────────
  activeChannels: ["linkedin", "twitter"],
  setActiveChannels: (channels) => set({ activeChannels: channels }),
  toggleChannel: (channelId) =>
    set((state) => ({
      activeChannels: state.activeChannels.includes(channelId)
        ? state.activeChannels.filter((c) => c !== channelId)
        : [...state.activeChannels, channelId],
    })),

  // ─── Messages (current project) ────────────────────────
  messages: [],
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  // ─── Preview ───────────────────────────────────────────
  previewData: null,
  setPreviewData: (data) => set({ previewData: data }),

  // ─── UI State ──────────────────────────────────────────
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  leftTab: "templates",
  toggleLeftPanel: () =>
    set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed })),
  toggleRightPanel: () =>
    set((state) => ({ rightPanelCollapsed: !state.rightPanelCollapsed })),
  setLeftTab: (tab) => set({ leftTab: tab }),

  // ─── Modals ────────────────────────────────────────────
  showApiKeys: false,
  showExport: false,
  showBrandEditor: false,
  editingBrand: null,
  setShowApiKeys: (show) => set({ showApiKeys: show }),
  setShowExport: (show) => set({ showExport: show }),
  openBrandEditor: (brand) =>
    set({ showBrandEditor: true, editingBrand: brand }),
  closeBrandEditor: () =>
    set({ showBrandEditor: false, editingBrand: null }),
}));
