import { getServerConfig } from '../config/env';

export function sendSmsVerificationOtp(phone: string): {
  statusCode: number;
  sent: boolean;
  configured: boolean;
  message: string;
} {
  const cfg = getServerConfig();
  if (!cfg.smsProviderKey) {
    return {
      statusCode: 503,
      sent: false,
      configured: false,
      message: `SMS OTP delivery is not configured on this server (missing TERMII_API_KEY or TWILIO_ACCOUNT_SID). No SMS was sent to ${phone}.`,
    };
  }

  return {
    statusCode: 200,
    sent: false,
    configured: true,
    message:
      'SMS provider key detected. Connect your Termii/Twilio sender ID webhook to dispatch live OTP codes.',
  };
}

export function verifySmsVerificationOtp(_phone: string, _code: string): {
  statusCode: number;
  verified: boolean;
  configured: boolean;
  message: string;
} {
  const cfg = getServerConfig();
  if (!cfg.smsProviderKey) {
    return {
      statusCode: 503,
      verified: false,
      configured: false,
      message: 'SMS OTP verification unavailable because no SMS provider credentials are configured.',
    };
  }

  return {
    statusCode: 501,
    verified: false,
    configured: true,
    message: 'Connect Termii/Twilio verify callback to complete live SMS code verification.',
  };
}
