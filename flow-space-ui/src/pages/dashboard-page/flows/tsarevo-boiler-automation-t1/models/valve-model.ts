import type { ValveStatus } from "./enums/valve-status";

/**
 * Модель вентиля (задвижки)
 */
export type ValveModel = {
    status: ValveStatus; // 0 - Промежуточное, 1 - Закрыта,  2 - Открыта
}
