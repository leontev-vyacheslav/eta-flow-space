import { ValveStatus } from "../valve-status";

/**
 * Описания статусов вентиля
 */
export const ValveStatusDescriptions = {
    [ValveStatus.INTERMEDIATE]: "Промежуточное",
    [ValveStatus.CLOSED]: "Закрыта",
    [ValveStatus.OPEN]: "Открыта"
} as const;
