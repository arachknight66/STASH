import { NextRequest } from 'next/server';
import { getUserId, ok, fail, serverError } from '@/lib/api';
import { clearAuthCookie } from '@/lib/auth';
import { db, authAdmin } from '@/lib/firebase-admin';

export async function DELETE(req: NextRequest) {
  try {
    const userId = await getUserId(req);
    if (!userId) return fail('Unauthorized', 401);

    // 1. Delete all resources in other collections associated with the user
    const collections = [
      'transactions',
      'buckets',
      'accounts',
      'budgets',
      'bills',
      'subscriptions',
      'notifications',
    ];

    for (const col of collections) {
      const snap = await db.collection(col).where('userId', '==', userId).get();
      if (snap && snap.docs) {
        const docDeletions = snap.docs.map((doc: any) => doc.ref.delete());
        await Promise.all(docDeletions);
      }
    }

    // 2. Delete user document and setting preferences
    await db.collection('settings').doc(userId).delete();
    await db.collection('users').doc(userId).delete();

    // 3. Delete Firebase Auth record if adminAuth has deleteUser capability
    try {
      if (authAdmin && typeof authAdmin.deleteUser === 'function') {
        await authAdmin.deleteUser(userId);
      }
    } catch (authError) {
      console.warn('Firebase adminAuth.deleteUser skipped or failed:', authError);
    }

    // 4. Clear browser session cookie
    await clearAuthCookie();

    return ok({ success: true, message: 'Account deleted permanently' });
  } catch (e) {
    return serverError(e);
  }
}
