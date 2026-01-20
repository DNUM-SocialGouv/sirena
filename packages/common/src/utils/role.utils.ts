import { type RoleOption, roleRanks, roles } from '../constants/role.constant.js';
import type { Role } from '../types/role.type.js';

export const getAssignableRoles = (currentRole: Role): RoleOption[] => {
  return (Object.entries(roleRanks) as [Role, number][])
    .filter(([role]) => roleRanks[role] <= roleRanks[currentRole])
    .map(([role]) => ({ key: role, value: roles[role] }));
};
