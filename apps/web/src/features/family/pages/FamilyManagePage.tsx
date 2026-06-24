/**
 * FamilyManagePage — CONTAINER de la pantalla "Gestionar familia".
 *
 * Saca la gestión de la familia (antes embebida en la home, solo OWNER) a su
 * propia pantalla. Cablea la lógica con `useFamilyManage` (mutaciones,
 * confirmaciones, estado) y los miembros con `useFamilyMembers`, y delega el
 * render en `ThemeView`.
 *
 * Si no hay familia activa, o el usuario no es OWNER (`manage` undefined),
 * muestra un aviso amable en vez de la sección de administración.
 */

import { useNavigate } from '@tanstack/react-router';
import { ThemeView } from '@/shared/theme/ThemeView';
import { useFamilyMembers } from '../hooks/useFamily';
import { useFamilyManage } from '../hooks/useFamilyManage';
import { useFamilyStore } from '../store/family.store';
import type { FamilyManageViewProps } from '../views/types';

export function FamilyManagePage() {
  const navigate = useNavigate();
  const activeFamily = useFamilyStore((s) => s.activeFamily);
  const { data: members } = useFamilyMembers(activeFamily?.id);
  const { manage } = useFamilyManage();

  if (!activeFamily) {
    return (
      <div className="min-h-[60dvh] grid place-items-center px-4">
        <p className="text-muted-foreground">No hay ninguna familia activa.</p>
      </div>
    );
  }

  if (!manage) {
    return (
      <div className="min-h-[60dvh] grid place-items-center px-4 text-center">
        <p className="text-muted-foreground">
          Solo el propietario de la familia puede gestionarla.
        </p>
      </div>
    );
  }

  const viewProps: FamilyManageViewProps = {
    manage,
    members: members ?? [],
    onBack: () =>
      void navigate({
        to: '/family/$familyId',
        params: { familyId: activeFamily.id },
      }),
  };

  return <ThemeView screen="family_manage" props={viewProps} />;
}
