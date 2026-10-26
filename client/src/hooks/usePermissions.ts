import { useAuthStore } from '../store/authStore';

/** Permisos de administración derivados del rol del usuario autenticado. */
export interface Permissions {
  /** AdminClub o SuperAdmin. */
  isAdmin: boolean;
  isAdminClub: boolean;
  isSuperAdmin: boolean;
  isPlayer: boolean;
}

/**
 * Única fuente de verdad de los permisos de UI según el rol.
 *
 * Sustituye las definiciones locales de `isAdmin`/`isAdminClub`/`isSuperAdmin`
 * que cada pantalla repetía con criterios ligeramente distintos. Es solo para
 * decidir qué se muestra: la autorización real la hace el servidor.
 */
export const usePermissions = (): Permissions => {
  const { user } = useAuthStore();

  const isAdminClub = user?.role === 'AdminClub';
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const isPlayer = user?.role === 'Player';

  return { isAdmin: isAdminClub || isSuperAdmin, isAdminClub, isSuperAdmin, isPlayer };
};
