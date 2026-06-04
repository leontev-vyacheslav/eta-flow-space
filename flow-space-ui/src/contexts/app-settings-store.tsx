// stores/app-settings-store.ts
import { create } from 'zustand';
import type { AppSettingsDataContextModel } from '../models/app-settings-context';
import type { FlowModel } from '../models/flows/flow-model';

interface AppSettingsStore {
    flows: FlowModel[] | undefined;
    appSettingsData: AppSettingsDataContextModel;
    setAppSettingsData: (data: Partial<AppSettingsDataContextModel>) => void;
    setFlows: (flows: FlowModel[]) => void;
}

export const useAppSettingsStore = create<AppSettingsStore>((set) => ({
    flows: [],
    appSettingsData: {
        isShowFooter: true,
    },
    setAppSettingsData: (data) =>
        set((state) => ({ appSettingsData: { ...state.appSettingsData, ...data } })),
    setFlows: (flows) => set({ flows }),
}));