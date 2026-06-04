// src/common/templates/message-templates.ts

export const MessageTemplates = {
    verificationCode: (code: string) => `
    Hello,

    Your verification code is: ${code}

    If you did not request this, please ignore this message.

    Thanks,
    ICE Innovations
  `,

    welcomeMessage: (name: string) => `
    Hi ${name},

    Welcome to Our App! We're excited to have you on board.

    Best regards,
    Your Company Team
  `,

    passwordReset: (token: string) => `
    Hello,

    Click the link below to reset your password:
    https://yourdomain.com/reset-password?token=${token}

    If you didn't request this, please ignore this email.

    Thanks,
    Your Company Name
  `,

    accountBlocked: (reason: string) => `
    Hello,

    Your account has been temporarily blocked due to: ${reason}.

    Please contact support if you think this is a mistake.

    Thanks,
    Your Company Name
  `
};
