import { type RoleOption, roleRanks, roles } from '../constants/roles.constants';
import type { Role } from '../types/roles.types';

export const getAssignableRoles = (currentRole: Role): RoleOption[] => {
  return (Object.entries(roleRanks) as [Role, number][])
    .filter(([role]) => roleRanks[role] <= roleRanks[currentRole])
    .map(([role]) => ({ key: role, value: roles[role] }));
};
