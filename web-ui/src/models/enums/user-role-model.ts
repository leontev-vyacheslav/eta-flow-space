export const UserRoles = {
    admin: 1,
    operator: 2,
    guest: 3
}

export const UserRoleDesriptions = [
    { id: UserRoles.admin, description: 'Администратор' },
    { id: UserRoles.operator, description: 'Оператор' },
    { id: UserRoles.guest, description: 'Гость' },
]


export type UserRoleModel = typeof UserRoles[keyof typeof UserRoles];