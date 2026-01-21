import { ROLES, STATUT_TYPES } from '@sirena/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { sendTipimailEmail } from '../../libs/tipimail.js';
import { getEntiteChain } from '../entites/entites.service.js';
import { sendUserActivationEmail } from './users.notification.service.js';

vi.mock('../../libs/prisma.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../../libs/tipimail.js', () => ({
  sendTipimailEmail: vi.fn(),
}));

vi.mock('../entites/entites.service.js', () => ({
  getEntiteChain: vi.fn(),
}));

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => ({
    warn: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock('../../config/env.js', () => ({
  envVars: {
    FRONTEND_URI: 'https://sirena-sante.social.gouv.fr',
  },
}));

const mockedPrisma = vi.mocked(prisma.user);
const mockedSendTipimailEmail = vi.mocked(sendTipimailEmail);
const mockedGetEntiteChain = vi.mocked(getEntiteChain);

const mockUser = {
  id: 'user1',
  email: 'john.doe@example.com',
  prenom: 'John',
  nom: 'Doe',
  uid: 'uid1',
  sub: 'sub1',
  createdAt: new Date(),
  updatedAt: new Date(),
  pcData: {},
  roleId: ROLES.ENTITY_ADMIN,
  statutId: STATUT_TYPES.ACTIF,
  entiteId: 'entite1',
  role: { id: ROLES.ENTITY_ADMIN, label: 'Admin local' },
  entite: { id: 'entite1', nomComplet: 'ARS Normandie' },
};

describe('users.notification.service.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendUserActivationEmail()', () => {
    it('should send activation email successfully for ENTITY_ADMIN', async () => {
      mockedPrisma.findUnique.mockResolvedValueOnce(mockUser);
      mockedGetEntiteChain.mockResolvedValueOnce([
        { id: 'entite1', nomComplet: 'ARS Normandie', label: 'Normandie', entiteMereId: null },
      ]);
      mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' });

      await sendUserActivationEmail('user1');

      expect(mockedPrisma.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        include: {
          role: true,
          entite: true,
        },
      });

      expect(mockedSendTipimailEmail).toHaveBeenCalledWith({
        to: 'john.doe@example.com',
        subject: '',
        text: '',
        template: 'habilitation-admin-local',
        substitutions: [
          {
            email: 'john.doe@example.com',
            values: {
              prenom: 'John',
              nom: 'Doe',
              role: 'Admin local',
              entite: 'ARS Normandie',
              urlsirena: 'https://sirena-sante.social.gouv.fr',
              signature: '',
            },
          },
        ],
      });
    });

    it('should send activation email successfully for SUPER_ADMIN', async () => {
      const superAdminUser = {
        ...mockUser,
        roleId: ROLES.SUPER_ADMIN,
        role: { id: ROLES.SUPER_ADMIN, label: 'Super administrateur' },
      };
      mockedPrisma.findUnique.mockResolvedValueOnce(superAdminUser);
      mockedGetEntiteChain.mockResolvedValueOnce([
        { id: 'entite1', nomComplet: 'ARS Normandie', entiteMereId: null, label: 'Normandie' },
      ]);
      mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' });

      await sendUserActivationEmail('user1');

      expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'habilitation-admin-local',
          substitutions: [
            expect.objectContaining({
              values: expect.objectContaining({
                role: 'Super administrateur',
              }),
            }),
          ],
        }),
      );
    });

    it('should send activation email successfully for WRITER', async () => {
      const writerUser = {
        ...mockUser,
        roleId: ROLES.WRITER,
        role: { id: ROLES.WRITER, label: 'Agent en écriture' },
      };
      mockedPrisma.findUnique.mockResolvedValueOnce(writerUser);
      mockedGetEntiteChain.mockResolvedValueOnce([
        { id: 'entite1', nomComplet: 'ARS Normandie', label: 'Normandie', entiteMereId: null },
      ]);
      mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' });

      await sendUserActivationEmail('user1');

      expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'habilitation-agent-en-ecriture',
          substitutions: [
            expect.objectContaining({
              values: expect.objectContaining({
                role: 'Agent en écriture',
              }),
            }),
          ],
        }),
      );
    });

    it('should send activation email successfully for READER', async () => {
      const readerUser = {
        ...mockUser,
        roleId: ROLES.READER,
        role: { id: ROLES.READER, label: 'Agent en lecture' },
      };
      mockedPrisma.findUnique.mockResolvedValueOnce(readerUser);
      mockedGetEntiteChain.mockResolvedValueOnce([
        { id: 'entite1', nomComplet: 'ARS Normandie', label: 'Normandie', entiteMereId: null },
      ]);
      mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' });

      await sendUserActivationEmail('user1');

      expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'habilitation-agent-en-lecture',
          substitutions: [
            expect.objectContaining({
              values: expect.objectContaining({
                role: 'Agent en lecture',
              }),
            }),
          ],
        }),
      );
    });

    it('should send activation email successfully for NATIONAL_STEERING', async () => {
      const nationalSteeringUser = {
        ...mockUser,
        roleId: ROLES.NATIONAL_STEERING,
        role: { id: ROLES.NATIONAL_STEERING, label: 'Pilotage national' },
      };
      mockedPrisma.findUnique.mockResolvedValueOnce(nationalSteeringUser);
      mockedGetEntiteChain.mockResolvedValueOnce([
        { id: 'entite1', nomComplet: 'ARS Normandie', label: 'Normandie', entiteMereId: null },
      ]);
      mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' });

      await sendUserActivationEmail('user1');

      expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          template: 'habilitation-pilotage-national',
          substitutions: [
            expect.objectContaining({
              values: expect.objectContaining({
                role: 'Pilotage national',
              }),
            }),
          ],
        }),
      );
    });

    it('should build entite chain correctly', async () => {
      mockedPrisma.findUnique.mockResolvedValueOnce(mockUser);
      mockedGetEntiteChain.mockResolvedValueOnce([
        { id: 'entite1', nomComplet: 'ARS Normandie', label: 'Normandie', entiteMereId: null },
        {
          id: 'entite2',
          nomComplet: "Direction de l'Autonomie",
          label: "Direction de l'Autonomie",
          entiteMereId: 'entite1',
        },
        { id: 'entite3', nomComplet: 'UA 14', label: 'UA 14', entiteMereId: 'entite2' },
      ]);
      mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' });

      await sendUserActivationEmail('user1');

      expect(mockedGetEntiteChain).toHaveBeenCalledWith('entite1');
      expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          substitutions: [
            expect.objectContaining({
              values: expect.objectContaining({
                entite: "ARS Normandie - Direction de l'Autonomie - UA 14",
              }),
            }),
          ],
        }),
      );
    });

    it('should handle empty entite chain', async () => {
      const userWithoutEntite = {
        ...mockUser,
        entiteId: null,
      };
      mockedPrisma.findUnique.mockResolvedValueOnce(userWithoutEntite);
      mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' });

      await sendUserActivationEmail('user1');

      expect(mockedGetEntiteChain).not.toHaveBeenCalled();
      expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          substitutions: [
            expect.objectContaining({
              values: expect.objectContaining({
                entite: '',
              }),
            }),
          ],
        }),
      );
    });

    it('should return early if user not found', async () => {
      mockedPrisma.findUnique.mockResolvedValueOnce(null);

      await sendUserActivationEmail('user1');

      expect(mockedPrisma.findUnique).toHaveBeenCalledWith({
        where: { id: 'user1' },
        include: {
          role: true,
          entite: true,
        },
      });
      expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
    });

    it('should return early if user status is not ACTIF', async () => {
      const inactiveUser = {
        ...mockUser,
        statutId: STATUT_TYPES.INACTIF,
      };
      mockedPrisma.findUnique.mockResolvedValueOnce(inactiveUser);

      await sendUserActivationEmail('user1');

      expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
    });

    it('should return early if user has no email', async () => {
      const userWithoutEmail = {
        ...mockUser,
        email: null,
      } as typeof mockUser & { email: null };
      mockedPrisma.findUnique.mockResolvedValueOnce(userWithoutEmail);

      await sendUserActivationEmail('user1');

      expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
    });

    it('should return early if user has no template for role', async () => {
      const userWithUnknownRole = {
        ...mockUser,
        roleId: 'UNKNOWN_ROLE' as typeof ROLES.ENTITY_ADMIN,
        role: { id: 'UNKNOWN_ROLE', label: 'Unknown' },
      };
      mockedPrisma.findUnique.mockResolvedValueOnce(userWithUnknownRole);

      await sendUserActivationEmail('user1');

      expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure gracefully', async () => {
      mockedPrisma.findUnique.mockResolvedValueOnce(mockUser);
      mockedGetEntiteChain.mockResolvedValueOnce([
        { id: 'entite1', nomComplet: 'ARS Normandie', label: 'Normandie', entiteMereId: null },
      ]);
      const emailError = new Error('Email service unavailable');
      mockedSendTipimailEmail.mockRejectedValueOnce(emailError);

      await expect(sendUserActivationEmail('user1')).resolves.toBeUndefined();

      expect(mockedSendTipimailEmail).toHaveBeenCalled();
    });

    it('should handle database error gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockedPrisma.findUnique.mockRejectedValueOnce(dbError);

      await expect(sendUserActivationEmail('user1')).resolves.toBeUndefined();

      expect(mockedSendTipimailEmail).not.toHaveBeenCalled();
    });

    it('should use roleId as fallback if role label not found', async () => {
      const userWithUnmappedRole = {
        ...mockUser,
        roleId: ROLES.ENTITY_ADMIN,
        role: { id: ROLES.ENTITY_ADMIN, label: 'Custom Label' },
      };
      mockedPrisma.findUnique.mockResolvedValueOnce(userWithUnmappedRole);
      mockedGetEntiteChain.mockResolvedValueOnce([
        { id: 'entite1', nomComplet: 'ARS Normandie', label: 'Normandie', entiteMereId: null },
      ]);
      mockedSendTipimailEmail.mockResolvedValueOnce({ status: 'success' });

      await sendUserActivationEmail('user1');

      expect(mockedSendTipimailEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          substitutions: [
            expect.objectContaining({
              values: expect.objectContaining({
                role: 'Admin local',
              }),
            }),
          ],
        }),
      );
    });
  });
});
