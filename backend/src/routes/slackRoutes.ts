import { Router, Request, Response } from 'express';
import axios from 'axios';
import { db } from '../db/index.js';
import { slackService } from '../services/slackService.js';
import { config } from '../config/env.js';

const router = Router();

// 1. Get Slack Connection Status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const integration = await db.getSlackIntegration();
    const hasEnvWebhook = Boolean(config.slack.webhookUrl);

    return res.json({
      connected: integration ? integration.connected : hasEnvWebhook,
      hasWebhook: Boolean(integration?.webhook_url || hasEnvWebhook),
      hasOAuth: Boolean(integration?.access_token),
      channel: integration?.channel || (hasEnvWebhook ? '#alerts' : null),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Connect via direct Incoming Webhook URL
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { webhookUrl, channel } = req.body;

    if (!webhookUrl || typeof webhookUrl !== 'string' || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return res.status(400).json({ error: 'Please provide a valid Slack Incoming Webhook URL (https://hooks.slack.com/...)' });
    }

    await db.saveSlackIntegration({
      webhook_url: webhookUrl.trim(),
      channel: channel || '#general',
      connected: true,
    });

    console.log('✅ Slack Webhook saved successfully.');
    return res.json({ message: 'Slack connected successfully via Webhook!', connected: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. Test Slack Notification (Live verifiable dispatch)
router.post('/test', async (_req: Request, res: Response) => {
  try {
    const result = await slackService.sendTestNotification();
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// 4. Disconnect Slack
router.post('/disconnect', async (_req: Request, res: Response) => {
  try {
    await db.disconnectSlack();
    console.log('ℹ️ Slack disconnected.');
    return res.json({ message: 'Slack disconnected successfully.', connected: false });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. OAuth Authorize Redirect (if Slack Client ID is configured)
router.get('/oauth/start', (_req: Request, res: Response) => {
  if (!config.slack.clientId) {
    return res.status(400).json({
      error: 'SLACK_CLIENT_ID not configured. Please use Incoming Webhook URL or set SLACK_CLIENT_ID in .env.',
    });
  }

  const scopes = ['incoming-webhook', 'chat:write'].join(',');
  const authUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.slack.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(
    config.slack.redirectUri
  )}`;

  return res.redirect(authUrl);
});

// 6. OAuth Callback
router.get('/oauth/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    if (!code) {
      return res.redirect(`${config.frontendUrl}?slack_error=missing_code`);
    }

    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      null,
      {
        params: {
          client_id: config.slack.clientId,
          client_secret: config.slack.clientSecret,
          code,
          redirect_uri: config.slack.redirectUri,
        },
      }
    );

    const data = response.data;
    if (!data.ok) {
      console.error('Slack OAuth failed:', data.error);
      return res.redirect(`${config.frontendUrl}?slack_error=${encodeURIComponent(data.error)}`);
    }

    await db.saveSlackIntegration({
      access_token: data.access_token,
      webhook_url: data.incoming_webhook?.url,
      channel: data.incoming_webhook?.channel,
      connected: true,
    });

    console.log('✅ Slack OAuth completed for team:', data.team?.name);
    return res.redirect(`${config.frontendUrl}?slack_connected=true`);
  } catch (err: any) {
    console.error('Slack OAuth callback error:', err);
    return res.redirect(`${config.frontendUrl}?slack_error=server_error`);
  }
});

export default router;
