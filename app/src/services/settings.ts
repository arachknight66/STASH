import { db } from '@/lib/firebase-admin';
import type { UpdateSettingsInput } from '@/lib/schemas';
import { Currency } from '@/lib/types';

export async function getSettings(userId: string) {
  const settingsSnap = await db.collection('settings').doc(userId).get();
  if (!settingsSnap.exists) {
    return null;
  }

  const userSnap = await db.collection('users').doc(userId).get();
  const userData = userSnap.exists ? userSnap.data() : null;

  return {
    id: settingsSnap.id,
    userId,
    ...settingsSnap.data(),
    user: userData
      ? {
          name: userData.name,
          email: userData.email,
          initials: userData.initials,
        }
      : null,
  };
}

export async function upsertSettings(userId: string, input: UpdateSettingsInput) {
  const settingsRef = db.collection('settings').doc(userId);
  const snap = await settingsRef.get();

  const data = {
    userId,
    darkMode:     input.darkMode     !== undefined ? input.darkMode     : (snap.data()?.darkMode ?? false),
    currency:     input.currency     !== undefined ? input.currency     : (snap.data()?.currency ?? Currency.USD),
    pushNotifs:   input.pushNotifs   !== undefined ? input.pushNotifs   : (snap.data()?.pushNotifs ?? true),
    budgetAlerts: input.budgetAlerts !== undefined ? input.budgetAlerts : (snap.data()?.budgetAlerts ?? true),
    hasOnboarded: input.hasOnboarded !== undefined ? input.hasOnboarded : (snap.data()?.hasOnboarded ?? false),
    monthlyIncome:input.monthlyIncome !== undefined ? input.monthlyIncome : (snap.data()?.monthlyIncome ?? 0),
    updatedAt:    new Date().toISOString(),
  };

  await settingsRef.set(data);
  return data;
}
