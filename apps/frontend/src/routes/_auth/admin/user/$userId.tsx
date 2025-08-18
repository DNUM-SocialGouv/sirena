import Breadcrumb from '@codegouvfr/react-dsfr/Breadcrumb';
import Button from '@codegouvfr/react-dsfr/Button';
import Input from '@codegouvfr/react-dsfr/Input';
import Select from '@codegouvfr/react-dsfr/Select';
import { ROLES, type Role, STATUT_TYPES, type StatutType, statutTypes } from '@sirena/common/constants';
import { getAssignableRoles } from '@sirena/common/utils';
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import { usePatchUser } from '@/hooks/mutations/updateUser.hook';
import { useUserById } from '@/hooks/queries/users.hook';
import { requireAuthAndRoles } from '@/lib/auth-guards';
import { useUserStore } from '@/stores/userStore';
import './$userId.css';
import { Toast } from '@sirena/ui';
import { useQuery } from '@tanstack/react-query';
import { QueryStateHandler } from '@/components/queryStateHandler/queryStateHandler';
import { EntityHierarchySelector } from '@/components/userId/entityHierarchySelector';
import { profileQueryOptions } from '@/hooks/queries/profile.hook';

export const Route = createFileRoute('/_auth/admin/user/$userId')({
  params: {
    parse: (params) => ({
      userId: z.string().parse(params.userId),
    }),
  },
  beforeLoad: requireAuthAndRoles([ROLES.SUPER_ADMIN, ROLES.ENTITY_ADMIN]),
  head: () => ({
    meta: [
      {
        title: 'Gérer un utilisateur - SIRENA',
      },
    ],
  }),
  component: RouteComponent,
});

const userFormSchema = z
  .object({
    roleId: z.string().min(1, 'Le rôle est obligatoire'),
    statutId: z.enum([STATUT_TYPES.ACTIF, STATUT_TYPES.INACTIF, STATUT_TYPES.NON_RENSEIGNE]),
    entiteId: z.string().nullable(),
  })
  .refine(
    (data) => {
      // If a role is selected (other than PENDING), the status must be ACTIF or INACTIF only
      if (data.roleId !== ROLES.PENDING) {
        return [STATUT_TYPES.ACTIF, STATUT_TYPES.INACTIF].includes(
          data.statutId as Exclude<StatutType, 'NON_RENSEIGNE'>,
        );
      }

      return true;
    },
    {
      message: 'Le champ "Statut" est obligatoire. Veuillez sélectionner une valeur dans la liste déroulante.',
      path: ['statutId'],
    },
  );

type UserFormData = z.infer<typeof userFormSchema>;

function SubmitButton({ isPending }: { isPending: boolean }) {
  return (
    <Button type="submit" disabled={isPending}>
      {isPending ? 'Mise à jour...' : 'Valider les modifications'}
    </Button>
  );
}

function RouteComponent() {
  const { userId } = Route.useParams();
  const toastManager = Toast.useToastManager();
  const navigate = useNavigate();
  const router = useRouter();
  const userStore = useUserStore();
  const userQuery = useUserById(userId);
  const patchUser = usePatchUser();
  const { data: profile } = useQuery({ ...profileQueryOptions(), enabled: false });

  const [formData, setFormData] = useState<UserFormData>({
    roleId: ROLES.PENDING,
    statutId: STATUT_TYPES.NON_RENSEIGNE,
    entiteId: null,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // userStore.role should always be defined, but we provide a fallback to avoid TypeScript errors
  const userRole: Role = userStore.role || ROLES.PENDING;
  const shouldShowStatut = useMemo(() => formData.roleId !== ROLES.PENDING, [formData.roleId]);

  useEffect(() => {
    if (userQuery.error && 'status' in userQuery.error && userQuery.error.status === 404) {
      navigate({ to: '/admin/users' });
    }
  }, [userQuery.error, navigate]);

  useEffect(() => {
    if (userQuery.data) {
      setFormData({
        roleId: userQuery.data.roleId,
        statutId: userQuery.data.statutId as StatutType,
        entiteId: userQuery.data.entiteId,
      });
    }
  }, [userQuery.data]);

  useEffect(() => {
    setValidationErrors({});
  }, []);

  const handleSetEntite = useCallback((id: string) => {
    setFormData((prev) => ({ ...prev, entiteId: id }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = userFormSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        errors[field] = error.message;
      });
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});

    await patchUser.mutateAsync({
      id: userId,
      json: {
        roleId: validationResult.data.roleId,
        statutId: validationResult.data.statutId,
        entiteId: validationResult.data.entiteId || null,
      },
    });
    toastManager.add({
      title: 'Utilisateur modifié',
      description: 'Les modifications ont été enregistrées avec succès.',
      timeout: 5000,
      data: { icon: 'fr-alert--success' },
    });
    handleBack();
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: '/admin/users' });
    }
  };

  const filteredRoles = useMemo(() => getAssignableRoles(userRole), [userRole]);

  return (
    <div className="fr-container">
      <div className="fr-mb-2w">
        <QueryStateHandler query={userQuery}>
          {({ data: user }) => (
            <div className="fr-container">
              <Breadcrumb
                currentPageLabel={`Utilisateur ${user.lastName}`}
                segments={[
                  {
                    label: 'Liste des utilisateurs',
                    linkProps: {
                      to: '/admin/users',
                    },
                  },
                ]}
              />
              <div className="user">
                <h1>Modifier un utilisateur</h1>
                <div>
                  <form onSubmit={handleSubmit}>
                    <fieldset className="fr-fieldset">
                      <legend className="fr-fieldset__legend">Identifiant de l'utilisateur</legend>
                      <Input
                        className="fr-fieldset__content"
                        label="Nom"
                        disabled={true}
                        nativeInputProps={{ defaultValue: user.lastName }}
                      />
                      <Input
                        className="fr-fieldset__content"
                        label="Prénom"
                        disabled={true}
                        nativeInputProps={{ defaultValue: user.firstName }}
                      />
                    </fieldset>
                    <fieldset className="fr-fieldset">
                      <legend className="fr-fieldset__legend">Coordonnées de l'utilisateur</legend>
                      <Input
                        className="fr-fieldset__content"
                        label="Email"
                        disabled={true}
                        nativeInputProps={{ defaultValue: user.email }}
                      />
                    </fieldset>
                    <EntityHierarchySelector id={user.entiteId} setLevel={handleSetEntite} />
                    <fieldset className="fr-fieldset">
                      <Select
                        className="fr-fieldset__content"
                        label="Rôle*"
                        disabled={profile?.id === userId}
                        nativeSelectProps={{
                          name: 'roleId',
                          value: formData.roleId,
                          onChange: (e) => {
                            setFormData((prev) => ({
                              ...prev,
                              roleId: e.target.value,
                              statutId: e.target.value === ROLES.PENDING ? STATUT_TYPES.NON_RENSEIGNE : prev.statutId,
                            }));
                          },
                          required: true,
                        }}
                      >
                        <option value="" disabled>
                          Sélectionnez une option
                        </option>
                        {filteredRoles.map(({ key, value }) => {
                          return (
                            <option key={key} value={key}>
                              {value}
                            </option>
                          );
                        })}
                      </Select>
                    </fieldset>
                    {shouldShowStatut && (
                      <fieldset className="fr-fieldset">
                        <Select
                          className="fr-fieldset__content"
                          label="Statut*"
                          state={validationErrors.statutId ? 'error' : 'default'}
                          stateRelatedMessage={validationErrors.statutId}
                          nativeSelectProps={{
                            name: 'statutId',
                            value: formData.statutId,
                            onChange: (e) => {
                              setFormData((prev) => ({ ...prev, statutId: e.target.value as StatutType }));
                              if (validationErrors.statutId) {
                                setValidationErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors.statutId;
                                  return newErrors;
                                });
                              }
                            },
                            required: true,
                          }}
                        >
                          <option value={STATUT_TYPES.NON_RENSEIGNE} disabled>
                            Sélectionnez une option
                          </option>
                          {Object.entries(statutTypes)
                            .filter(([key]) => key !== STATUT_TYPES.NON_RENSEIGNE)
                            .map(([key, value]) => {
                              return (
                                <option key={key} value={key}>
                                  {value}
                                </option>
                              );
                            })}
                        </Select>
                      </fieldset>
                    )}
                    <div className="form-actions">
                      <Button priority="secondary" onClick={handleBack} type="button">
                        Annuler les modifications
                      </Button>
                      <SubmitButton isPending={patchUser.isPending} />
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </QueryStateHandler>
      </div>
    </div>
  );
}
