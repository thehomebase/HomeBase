import { storage } from './storage';
import { broadcastToUser } from './websocket';

export async function notify(
  userId: number,
  type: string,
  title: string,
  message: string,
  relatedId?: number | null,
  relatedType?: string | null
) {
  try {
    const notification = await storage.createNotification({
      userId,
      type,
      title,
      message,
      relatedId: relatedId || null,
      relatedType: relatedType || null,
    });

    broadcastToUser(userId, {
      type: 'notification',
      payload: notification,
    });

    return notification;
  } catch (err) {
    console.error('Failed to create notification:', err);
  }
}

export async function notifyMultiple(
  userIds: number[],
  type: string,
  title: string,
  message: string,
  relatedId?: number | null,
  relatedType?: string | null
) {
  const promises = userIds.map(userId =>
    notify(userId, type, title, message, relatedId, relatedType)
  );
  await Promise.allSettled(promises);
}
