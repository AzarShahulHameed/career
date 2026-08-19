import { Injectable, Logger } from '@nestjs/common';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  title: string;
  body: string;
  url?: string; // deep-links the notification click to a specific page
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private configured = false;

  constructor(private prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    if (publicKey && privateKey) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.configured = true;
    } else {
      // Not fatal — the app runs fine without push notifications configured,
      // this just means subscribe/notify become silent no-ops.
      this.logger.warn('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — push notifications are disabled.');
    }
  }

  getPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY ?? null;
  }

  async subscribe(userId: string, endpoint: string, p256dh: string, auth: string) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { userId, p256dh, auth },
      create: { userId, endpoint, p256dh, auth },
    });
  }

  async unsubscribe(endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { success: true };
  }

  // Notifies every active user's subscribed devices. Kept simple (no
  // per-user preference toggle yet) — everyone with the browser
  // notification enabled hears about every new applicant.
  async notifyAllActiveUsers(payload: PushPayload) {
    if (!this.configured) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { user: { isActive: true } },
    });

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
        } catch (err: any) {
          // 404/410 means the browser has invalidated this subscription
          // (uninstalled, permissions revoked, etc.) — clean it up rather
          // than retrying it forever.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await this.prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          } else {
            this.logger.warn(`Push send failed for subscription ${sub.id}: ${err?.message}`);
          }
        }
      }),
    );
  }
}
