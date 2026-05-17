import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.config import settings
import logging

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, html_body: str):
    """Send an HTML email. Silently fails if SMTP not configured."""
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.info(f"[EMAIL SKIPPED] To: {to} | Subject: {subject}")
        return

    try:
        message = MIMEMultipart("alternative")
        message["From"] = settings.SMTP_USER
        message["To"] = to
        message["Subject"] = subject
        message.attach(MIMEText(html_body, "html"))

        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info(f"✅ Email sent to {to}: {subject}")
    except Exception as e:
        logger.error(f"❌ Email failed to {to}: {e}")


# ── Email Templates ──────────────────────────────────────────────────────────

def _base_template(title: str, body: str, cta_text: str = None, cta_url: str = None) -> str:
    cta_html = ""
    if cta_text and cta_url:
        cta_html = f"""
        <div style="text-align:center;margin:32px 0;">
          <a href="{cta_url}" style="background:#2563eb;color:#fff;padding:12px 28px;
             border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            {cta_text}
          </a>
        </div>"""
    return f"""
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;">
      <div style="background:#1e293b;padding:24px 32px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">⚡ PerformX</h1>
        <p style="color:#94a3b8;margin:4px 0 0;font-size:13px;">Goal Setting & Tracking Portal</p>
      </div>
      <div style="background:#fff;padding:32px;border-radius:0 0 8px 8px;">
        <h2 style="color:#1e293b;margin-top:0;">{title}</h2>
        {body}
        {cta_html}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">
          This is an automated message from PerformX. Please do not reply.
        </p>
      </div>
    </div>"""


async def notify_goal_submitted(manager_email: str, manager_name: str,
                                 employee_name: str, frontend_url: str):
    body = f"""
    <p style="color:#475569;">Hi <strong>{manager_name}</strong>,</p>
    <p style="color:#475569;">
      <strong>{employee_name}</strong> has submitted their goal sheet for your review and approval.
    </p>
    <p style="color:#475569;">Please review the goals and approve, edit, or return them for rework.</p>"""
    html = _base_template(
        "New Goal Sheet Submitted",
        body,
        "Review Goals",
        f"{frontend_url}/manager/goals"
    )
    await send_email(manager_email, f"[PerformX] {employee_name} submitted goals for review", html)


async def notify_goal_approved(employee_email: str, employee_name: str, frontend_url: str):
    body = f"""
    <p style="color:#475569;">Hi <strong>{employee_name}</strong>,</p>
    <p style="color:#475569;">
      Great news! Your goal sheet has been <strong style="color:#16a34a;">approved</strong> by your manager.
    </p>
    <p style="color:#475569;">Your goals are now locked and active for this performance cycle.</p>"""
    html = _base_template(
        "Your Goals Have Been Approved ✅",
        body,
        "View My Goals",
        f"{frontend_url}/employee/goals"
    )
    await send_email(employee_email, "[PerformX] Your goals have been approved", html)


async def notify_goal_returned(employee_email: str, employee_name: str,
                                comment: str, frontend_url: str):
    body = f"""
    <p style="color:#475569;">Hi <strong>{employee_name}</strong>,</p>
    <p style="color:#475569;">
      Your goal sheet has been <strong style="color:#dc2626;">returned for rework</strong> by your manager.
    </p>
    <div style="background:#fef2f2;border-left:4px solid #dc2626;padding:12px 16px;border-radius:4px;margin:16px 0;">
      <p style="color:#7f1d1d;margin:0;font-size:14px;"><strong>Manager's Comment:</strong><br>{comment}</p>
    </div>
    <p style="color:#475569;">Please revise your goals and resubmit.</p>"""
    html = _base_template(
        "Goals Returned for Rework",
        body,
        "Revise Goals",
        f"{frontend_url}/employee/goals"
    )
    await send_email(employee_email, "[PerformX] Your goals need revision", html)


async def notify_checkin_reminder(email: str, name: str, quarter: str, frontend_url: str):
    body = f"""
    <p style="color:#475569;">Hi <strong>{name}</strong>,</p>
    <p style="color:#475569;">
      The <strong>{quarter} check-in window</strong> is now open. Please update your goal achievements.
    </p>
    <p style="color:#475569;">Timely check-ins help your manager track progress and provide support.</p>"""
    html = _base_template(
        f"{quarter} Check-in Reminder 🔔",
        body,
        "Update Achievements",
        f"{frontend_url}/employee/checkin"
    )
    await send_email(email, f"[PerformX] {quarter} check-in window is open", html)
