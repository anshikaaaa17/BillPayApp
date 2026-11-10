"""
Email Service — CCDS26-0127

Sends transactional email (currently OTP codes) over SMTP.

Configuration comes from environment variables in billpay_backend/.env:

    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=your.address@gmail.com
    SMTP_PASSWORD=your-16-char-app-password
    SMTP_FROM_NAME=BillPay

For Gmail you must use an *App Password*, not your normal account password:
  1. Enable 2-Step Verification on the Google account
  2. Go to https://myaccount.google.com/apppasswords
  3. Generate a password for "Mail" and paste it into SMTP_PASSWORD

If SMTP is not configured, send_otp_email() returns False and the caller falls
back to logging the code to the server console (development only). This keeps
the app usable offline without ever putting the OTP in the API response.
"""

import os
import smtplib
import ssl
from email.message import EmailMessage

SMTP_HOST      = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT      = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER      = os.getenv("SMTP_USER", "")
SMTP_PASSWORD  = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "BillPay")

OTP_VALIDITY_MINUTES = 10


def is_configured() -> bool:
    """True if SMTP credentials are present."""
    return bool(SMTP_USER and SMTP_PASSWORD)


def _build_otp_message(to_email: str, otp: str) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = f"{otp} is your BillPay verification code"
    msg["From"]    = f"{SMTP_FROM_NAME} <{SMTP_USER}>"
    msg["To"]      = to_email

    msg.set_content(
        f"Your BillPay verification code is {otp}.\n\n"
        f"It expires in {OTP_VALIDITY_MINUTES} minutes.\n\n"
        "If you did not request this, you can ignore this email."
    )

    msg.add_alternative(f"""\
<html>
  <body style="font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;
               background:#F4F5F8;padding:32px;margin:0;">
    <div style="max-width:440px;margin:0 auto;background:#FFFFFF;
                border-radius:14px;padding:32px;">
      <h2 style="margin:0 0 8px;color:#16233F;font-size:20px;">BillPay</h2>
      <p style="margin:0 0 24px;color:#44506B;font-size:14px;">
        Use this code to verify your email address.
      </p>
      <div style="background:#F4F5F8;border-radius:10px;padding:18px;
                  text-align:center;margin-bottom:24px;">
        <span style="font-size:32px;font-weight:600;letter-spacing:6px;
                     color:#4F46E5;">{otp}</span>
      </div>
      <p style="margin:0;color:#6B7280;font-size:12px;line-height:18px;">
        This code expires in {OTP_VALIDITY_MINUTES} minutes.
        If you did not request it, you can safely ignore this email.
      </p>
    </div>
  </body>
</html>
""", subtype="html")

    return msg


def send_otp_email(to_email: str, otp: str) -> bool:
    """
    Send the OTP by email. Returns True on success, False if SMTP is not
    configured or the send failed (caller decides how to degrade).
    """
    if not is_configured():
        return False

    try:
        msg = _build_otp_message(to_email, otp)
        context = ssl.create_default_context()

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls(context=context)
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        return True

    except Exception as exc:
        print(f"[email] Failed to send OTP to {to_email}: {exc}")
        return False
