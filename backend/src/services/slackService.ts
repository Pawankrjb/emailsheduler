import axios from 'axios';
import { db } from '../db/index.js';
import { config } from '../config/env.js';

export interface RateLimitAlertParams {
  sender: string;
  currentCount: number;
  hourlyLimit: number;
  rescheduledTo: Date;
  recipientEmail?: string;
  emailSubject?: string;
}

class SlackService {
  /**
   * Sends a live, verifiable Slack alert when an email sender reaches their hourly rate limit.
   * If Slack is not connected, fails silently without crashing.
   */
  async sendRateLimitAlert(params: RateLimitAlertParams): Promise<{ notified: boolean; reason?: string }> {
    try {
      const integration = await db.getSlackIntegration();

      // Check if integration exists and is active, or if fallback env webhook is provided
      const webhookUrl = integration?.webhook_url || config.slack.webhookUrl;
      const accessToken = integration?.access_token;
      const channel = integration?.channel || '#general';
      const isConnected = integration ? integration.connected : Boolean(webhookUrl);

      if (!isConnected || (!webhookUrl && !accessToken)) {
        console.log('ℹ️ Slack is not connected. Rate limit alert skipped safely.');
        return { notified: false, reason: 'Slack not connected' };
      }

      const formattedRescheduledTime = params.rescheduledTo.toLocaleString();

      const messagePayload = {
        text: `⚠️ Rate limit exceeded for sender ${params.sender}`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🚨 ReachInbox Alert: Hourly Rate Limit Hit',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `Sender *<mailto:${params.sender}|${params.sender}>* has reached their configured rate limit of *${params.hourlyLimit} emails/hour* (Current count: *${params.currentCount}*).`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Status:*\n⏱️ Auto-rescheduled`,
              },
              {
                type: 'mrkdwn',
                text: `*Next Available Window:*\n${formattedRescheduledTime}`,
              },
              {
                type: 'mrkdwn',
                text: `*Recipient Affected:*\n${params.recipientEmail || 'N/A'}`,
              },
              {
                type: 'mrkdwn',
                text: `*Queue Policy:*\nNo jobs dropped • Order preserved`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `⚡ ReachInbox Email Scheduler • Timestamp: ${new Date().toISOString()}`,
              },
            ],
          },
        ],
      };

      if (webhookUrl) {
        console.log(`📡 Sending live Slack alert via Webhook for sender ${params.sender}...`);
        await axios.post(webhookUrl, messagePayload, { timeout: 5000 });
        console.log('✅ Slack rate limit notification delivered successfully via Webhook.');
        return { notified: true };
      } else if (accessToken) {
        console.log(`📡 Sending live Slack alert via Web API to ${channel}...`);
        await axios.post(
          'https://slack.com/api/chat.postMessage',
          {
            channel,
            ...messagePayload,
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 5000,
          }
        );
        console.log('✅ Slack rate limit notification delivered successfully via Web API.');
        return { notified: true };
      }

      return { notified: false, reason: 'No valid delivery target' };
    } catch (err: any) {
      console.error('❌ Failed to dispatch Slack rate limit alert:', err.response?.data || err.message);
      return { notified: false, reason: err.message };
    }
  }

  /**
   * Verifiable test notification for dashboard demo
   */
  async sendTestNotification(): Promise<{ success: boolean; message: string }> {
    const integration = await db.getSlackIntegration();
    const webhookUrl = integration?.webhook_url || config.slack.webhookUrl;

    if (!webhookUrl && !integration?.access_token) {
      throw new Error('Please configure a Slack Webhook URL or connect via OAuth first.');
    }

    const testPayload = {
      text: '🔔 ReachInbox Scheduler: Test notification',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🔔 ReachInbox Slack Integration Connected',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'Your Slack notification channel is active! You will receive live alerts whenever an email sender hits their hourly quota limit.',
          },
        },
      ],
    };

    if (webhookUrl) {
      await axios.post(webhookUrl, testPayload, { timeout: 5000 });
      return { success: true, message: 'Test message sent successfully to your Slack channel!' };
    } else {
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: integration?.channel || '#general',
          ...testPayload,
        },
        {
          headers: { Authorization: `Bearer ${integration?.access_token}` },
          timeout: 5000,
        }
      );
      return { success: true, message: 'Test message sent successfully to Slack API!' };
    }
  }
}

export const slackService = new SlackService();
