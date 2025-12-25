import { WorkMode } from "../work-modes";

/**
 * Описания режимов работы насоса подпитки
 */
export const WorkModeDescriptions = {
    [WorkMode.NOT_USED]: "Не используется",
    [WorkMode.REPAIR]: "Ремонт",
    [WorkMode.LOCAL]: "Местный",
    [WorkMode.PANEL]: "Панель"
} as const;
