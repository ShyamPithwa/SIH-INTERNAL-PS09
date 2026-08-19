import nodemailer from 'nodemailer';

/**
 * Alert Service — Layer 3 Feature
 * Sends email notifications when critical conditions are detected:
 *  - Critical temperature (thermal runaway risk)
 *  - Critically low SOC (deep discharge risk)
 *  - Overcharge detected
 *  - Data integrity violation (fake/tampered data)
 *  - SOH below 80% (approaching end-of-life)
 */

export type AlertType =
  | 'TEMP_CRITICAL'
  | 'SOC_LOW'
  | 'SOC_HIGH'
  | 'DATA_INTEGRITY_VIOLATION'
  | 'SOH_EOL_WARNING'
  | 'ANOMALY_DETECTED';

export interface AlertPayload {
  bessId: string;
  bessCode: string;
  alertType: AlertType;
  severity: 'WARNING' | 'CRITICAL';
  message: string;
  value?: number;
  unit?: string;
  timestamp: string;
}

class AlertService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly alertTo: string;
  private readonly configured: boolean;

  constructor() {
    this.alertTo = process.env.ALERT_EMAIL_TO || '';
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass && this.alertTo) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
      this.configured = true;
      console.log('[AlertService] Email alerts configured and ready.');
    } else {
      this.configured = false;
      console.warn('[AlertService] SMTP not configured — alerts will be logged to console only.');
      console.warn('[AlertService] Set SMTP_HOST, SMTP_USER, SMTP_PASS, ALERT_EMAIL_TO in .env to enable emails.');
    }
  }

  async sendAlert(payload: AlertPayload): Promise<void> {
    const { alertType, severity, message, bessCode, value, unit, timestamp } = payload;
    const emoji = severity === 'CRITICAL' ? '🚨' : '⚠️';
    const subject = `${emoji} BESS Alert [${severity}] — ${bessCode}: ${alertType}`;

    const valueStr = value != null ? `\n  Current Value: ${value}${unit ? ' ' + unit : ''}` : '';

    const textBody = `
BESS Intelligence & Dispatch Platform — Automated Alert
========================================================

Asset     : ${bessCode} (ID: ${payload.bessId})
Alert Type: ${alertType}
Severity  : ${severity}
Timestamp : ${new Date(timestamp).toLocaleString()}
${valueStr}

Message:
${message}

----------------------------------------
This is an automated alert from the BESS Platform.
Do not reply to this email.
    `.trim();

    const htmlBody = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 24px; border-radius: 12px;">
  <div style="background: ${severity === 'CRITICAL' ? '#7f1d1d' : '#713f12'}; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="margin: 0; font-size: 20px;">${emoji} ${severity} Alert — BESS Platform</h1>
  </div>

  <table style="width: 100%; border-collapse: collapse;">
    <tr><td style="padding: 8px; color: #94a3b8; font-size: 13px;">Asset</td><td style="padding: 8px; font-weight: bold;">${bessCode}</td></tr>
    <tr style="background: rgba(255,255,255,0.03);"><td style="padding: 8px; color: #94a3b8; font-size: 13px;">Alert Type</td><td style="padding: 8px; font-weight: bold; color: ${severity === 'CRITICAL' ? '#f87171' : '#fbbf24'};">${alertType}</td></tr>
    <tr><td style="padding: 8px; color: #94a3b8; font-size: 13px;">Timestamp</td><td style="padding: 8px;">${new Date(timestamp).toLocaleString()}</td></tr>
    ${value != null ? `<tr style="background: rgba(255,255,255,0.03);"><td style="padding: 8px; color: #94a3b8; font-size: 13px;">Current Value</td><td style="padding: 8px; font-size: 20px; font-weight: bold; color: #f87171;">${value}${unit ? ' ' + unit : ''}</td></tr>` : ''}
  </table>

  <div style="margin-top: 20px; background: rgba(255,255,255,0.05); padding: 16px; border-radius: 8px; border-left: 4px solid ${severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'};">
    <p style="margin: 0; font-size: 14px; line-height: 1.6;">${message}</p>
  </div>

  <p style="margin-top: 20px; font-size: 11px; color: #475569;">Automated alert from BESS Intelligence & Dispatch Platform — SIH 2024</p>
</div>
    `.trim();

    // Always log to console
    console.log(`\n${emoji} [ALERT] ${severity} — ${bessCode}`);
    console.log(`   Type   : ${alertType}`);
    console.log(`   Message: ${message}`);
    if (value != null) console.log(`   Value  : ${value}${unit ? ' ' + unit : ''}`);
    console.log(`   Time   : ${timestamp}\n`);

    // Send email if configured
    if (this.configured && this.transporter) {
      try {
        await this.transporter.sendMail({
          from: `"BESS Platform Alerts" <${process.env.SMTP_USER}>`,
          to: this.alertTo,
          subject,
          text: textBody,
          html: htmlBody,
        });
        console.log(`[AlertService] Email alert sent to ${this.alertTo}`);
      } catch (err: any) {
        console.error(`[AlertService] Failed to send email:`, err.message);
      }
    }
  }

  // ─── Convenience methods ─────────────────────────────────────────────────

  async alertTemperatureCritical(bessId: string, bessCode: string, tempC: number): Promise<void> {
    await this.sendAlert({
      bessId, bessCode,
      alertType: 'TEMP_CRITICAL',
      severity: 'CRITICAL',
      value: tempC,
      unit: '°C',
      message: `Battery temperature has exceeded the safe operating limit of 55°C. Thermal runaway risk detected. Immediate inspection required. The dispatch engine has been suspended.`,
      timestamp: new Date().toISOString(),
    });
  }

  async alertSocLow(bessId: string, bessCode: string, socPct: number): Promise<void> {
    await this.sendAlert({
      bessId, bessCode,
      alertType: 'SOC_LOW',
      severity: socPct < 5 ? 'CRITICAL' : 'WARNING',
      value: socPct,
      unit: '%',
      message: `State of Charge has dropped to ${socPct.toFixed(1)}%. Deep discharge risk. Battery may be permanently damaged if discharged below the minimum SOC threshold.`,
      timestamp: new Date().toISOString(),
    });
  }

  async alertSocHigh(bessId: string, bessCode: string, socPct: number): Promise<void> {
    await this.sendAlert({
      bessId, bessCode,
      alertType: 'SOC_HIGH',
      severity: 'WARNING',
      value: socPct,
      unit: '%',
      message: `State of Charge is at ${socPct.toFixed(1)}% — near or above the configured maximum. Overcharge condition may reduce battery lifespan.`,
      timestamp: new Date().toISOString(),
    });
  }

  async alertDataIntegrityViolation(bessId: string, bessCode: string, reason: string): Promise<void> {
    await this.sendAlert({
      bessId, bessCode,
      alertType: 'DATA_INTEGRITY_VIOLATION',
      severity: 'CRITICAL',
      message: `Suspicious or tampered telemetry data was rejected. Possible sensor malfunction, replay attack, or data injection attempt.\n\nReason: ${reason}`,
      timestamp: new Date().toISOString(),
    });
  }

  async alertSohEol(bessId: string, bessCode: string, sohPct: number, eolDate?: string): Promise<void> {
    await this.sendAlert({
      bessId, bessCode,
      alertType: 'SOH_EOL_WARNING',
      severity: sohPct < 75 ? 'CRITICAL' : 'WARNING',
      value: sohPct,
      unit: '%',
      message: `State of Health has degraded to ${sohPct.toFixed(1)}%. Battery is approaching end-of-life threshold (80%).${eolDate ? ` Predicted end-of-life date: ${eolDate}.` : ''} Plan for replacement.`,
      timestamp: new Date().toISOString(),
    });
  }
}

export const alertService = new AlertService();
