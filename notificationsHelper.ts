// notificationsHelper.ts
import { ref, push } from 'firebase/database';
import { db } from './firebaseConfig';

export const sendNotification = async ({ type, dare }) => {
    if (!dare.userId || !dare.id || !dare.challenge) return;

    await push(ref(db, '/notifications'), {
        type,
        dareId: dare.id,
        userId: dare.userId,
        message: `Someone ${type}ed your dare: "${dare.challenge}"`,
        timestamp: Date.now(),
    });
};
