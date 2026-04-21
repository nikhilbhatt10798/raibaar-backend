import crypto from "crypto";

type NotificationPayload = {
  type: "otp" | "booking_confirmation";
  to: string;
  subject: string;
  html: string;
  text: string;
  meta?: Record<string, unknown>;
};

const postToWebhook = async (payload: NotificationPayload) => {
  if (!process.env.MAILER_WEBHOOK_URL) {
    return false;
  }

  const response = await fetch(process.env.MAILER_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.MAILER_WEBHOOK_TOKEN
        ? { Authorization: `Bearer ${process.env.MAILER_WEBHOOK_TOKEN}` }
        : {}),
    },
    body: JSON.stringify(payload),
  });

  return response.ok;
};

export const generateOtpCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const hashOtpCode = (code: string) =>
  crypto.createHash("sha256").update(`${code}:${process.env.JWT_SECRET || "otp_secret"}`).digest("hex");

export const sendOtpNotification = async (email: string, name: string, otpCode: string) => {
  const subject = "Your Renbasera login OTP";
  const text = `Hello ${name}, your OTP is ${otpCode}. It expires in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
      <h2 style="margin-bottom: 8px;">Renbasera secure login</h2>
      <p>Hello ${name},</p>
      <p>Use this OTP to continue your login:</p>
      <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 18px 0;">${otpCode}</div>
      <p>This code expires in 10 minutes.</p>
    </div>
  `;

  const sent = await postToWebhook({
    type: "otp",
    to: email,
    subject,
    text,
    html,
  });

  if (!sent) {
    console.log(`[OTP] ${email}: ${otpCode}`);
  }

  return sent;
};

export const sendBookingConfirmationNotification = async ({
  email,
  guestName,
  bookingCode,
  propertyTitle,
  totalAmount,
  checkIn,
  checkOut,
}: {
  email: string;
  guestName: string;
  bookingCode: string;
  propertyTitle: string;
  totalAmount: number;
  checkIn: string;
  checkOut: string;
}) => {
  const subject = `Booking confirmed: ${bookingCode}`;
  const text = `Hello ${guestName}, your booking ${bookingCode} for ${propertyTitle} is confirmed. Stay dates: ${checkIn} to ${checkOut}. Total paid: INR ${totalAmount}.`;
  const html = `
    <div style="font-family: Arial, sans-serif; color: #1f2937;">
      <h2 style="margin-bottom: 8px;">Your booking is confirmed</h2>
      <p>Hello ${guestName},</p>
      <p>Your stay at <strong>${propertyTitle}</strong> has been confirmed.</p>
      <ul>
        <li>Booking code: <strong>${bookingCode}</strong></li>
        <li>Check-in: ${checkIn}</li>
        <li>Check-out: ${checkOut}</li>
        <li>Total paid: INR ${totalAmount}</li>
      </ul>
    </div>
  `;

  const sent = await postToWebhook({
    type: "booking_confirmation",
    to: email,
    subject,
    text,
    html,
    meta: { bookingCode, propertyTitle },
  });

  if (!sent) {
    console.log(`[BOOKING EMAIL] ${email}: ${bookingCode} ${propertyTitle}`);
  }

  return sent;
};
