import { Button } from '@codegouvfr/react-dsfr/Button';
import { ROLES, type Role } from '@sirena/common/constants';
import { useMatches } from '@tanstack/react-router';
import clsx from 'clsx';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useProfile } from '@/hooks/queries/profile.hook';
import './userMenu.css';

export const UserMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const { data } = useProfile();
  const matches = useMatches();

  const displayName = useMemo(
    () => [data?.nom, data?.prenom].filter(Boolean).join(' ').trim() || '',
    [data?.nom, data?.prenom],
  );
  const email = useMemo(() => data?.email ?? '', [data]);
  const role = useMemo(() => (data?.role?.id ?? '') as Role | '', [data]);
  const affectationChain = useMemo(
    () => (data as { affectationChain?: Array<{ nomComplet: string }> })?.affectationChain ?? [],
    [data],
  );

  const menuId = useId();

  const isAdminRoute = matches.some((m) => m.routeId.startsWith('/_auth/admin/'));

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      const target = e.target as Node;

      if (!popupRef.current || !triggerRef.current) {
        return;
      }

      if (!popupRef.current.contains(target) && !triggerRef.current.contains(target)) {
        closeMenu();
      }
    },
    [closeMenu],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeMenu();
      }
    },
    [closeMenu],
  );

  const handleTabKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (!popupRef.current) return;

      const focusables = popupRef.current.querySelectorAll<HTMLElement>(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && active === first) {
        closeMenu();
        return;
      }
      if (!e.shiftKey && active === last) {
        closeMenu();
      }
    },
    [closeMenu],
  );

  useEffect(() => {
    if (!isOpen) return;

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleTabKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, handleClickOutside, handleKeyDown, handleTabKey]);

  return (
    <div className="user-menu__wrapper">
      <button
        ref={triggerRef}
        type="button"
        className={clsx(
          'fr-btn fr-btn--tertiary fr-icon-account-circle-fill fr-btn--icon-left',
          isOpen && 'user-menu-btn--open',
        )}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((o) => !o);
        }}
      >
        Mon espace
        <span
          aria-hidden="true"
          className={clsx('fr-icon-arrow-down-s-line menu__trigger__icon', isOpen && 'menu__trigger__icon--is-open')}
        />
      </button>

      {isOpen && (
        <div id={menuId} ref={popupRef} className="user-menu fr-card">
          <div className="user-menu__header fr-p-2w">
            <p className="fr-text--bold">{displayName || 'Mon espace'}</p>
            {email && <p className="fr-hint-text">{email}</p>}
            {affectationChain.length > 0 && (
              <div className={clsx('fr-hint-text', 'fr-mt-1v')} data-testid="user-menu-affectation">
                <p className={clsx('fr-hint-text', 'fr-mb-0')}>
                  <strong>{affectationChain[0].nomComplet}</strong>
                </p>
                {affectationChain.length > 1 && (
                  <p className={clsx('fr-hint-text', 'fr-mb-0', 'fr-mt-1v')}>
                    {affectationChain[1].nomComplet}
                    {affectationChain[2] ? ` (${affectationChain[2].nomComplet})` : ''}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="user-menu__separator" />

          {role === ROLES.ENTITY_ADMIN && (
            <>
              <a className="fr-btn--icon-left fr-icon-user-line fr-p-2w" href={isAdminRoute ? '/home' : '/admin/users'}>
                {isAdminRoute ? 'Traiter les requêtes' : 'Administrer'}
              </a>
              <div className="user-menu__separator" />
            </>
          )}

          <div className="user-menu__footer fr-p-2w">
            <form action="/api/auth/logout" method="POST">
              <Button
                type="submit"
                className="user-menu__btn"
                iconId="fr-icon-logout-box-r-line"
                priority="tertiary"
                size="small"
              >
                Se déconnecter
              </Button>
            </form>

            <form action="/api/auth/logout-proconnect" method="POST">
              <Button
                type="submit"
                className="user-menu__btn"
                iconId="fr-icon-logout-box-r-line"
                priority="tertiary"
                size="small"
              >
                Se déconnecter de ProConnect
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
