import { prisma } from '@/lib/prisma';
import type { UpdateSettingsInput } from '@/lib/schemas';
import type { Currency } from '@prisma/client';

export async function getSettings(userId: string) {
  return prisma.settings.findUnique({ 
    where: { userId },
    include: {
      user: {
        select: { name: true, email: true, initials: true }
      }
    }
  });
}

export async function upsertSettings(userId: string, input: UpdateSettingsInput) {
  return prisma.settings.upsert({
    where: { userId },
    create: {
      userId,
      darkMode:     input.darkMode     ?? false,
      currency:     (input.currency    ?? 'USD') as Currency,
      pushNotifs:   input.pushNotifs   ?? true,
      budgetAlerts: input.budgetAlerts ?? true,
    },
    update: {
      ...(input.darkMode     !== undefined && { darkMode:     input.darkMode }),
      ...(input.currency     !== undefined && { currency:     input.currency as Currency }),
      ...(input.pushNotifs   !== undefined && { pushNotifs:   input.pushNotifs }),
      ...(input.budgetAlerts !== undefined && { budgetAlerts: input.budgetAlerts }),
    },
  });
}
