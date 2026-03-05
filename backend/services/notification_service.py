"""
Notification Service
- In-app notifications stored in DB
- Email notifications via SMTP (configurable)
- Designed to be extended with SMS (Twilio) or push
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


# ─── Email Notification ────────────────────────────────────────────────────────
def send_email(to_email: str, subject: str, body_html: str) -> dict:
    """Send an email using SMTP. Configure via .env"""
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASS", "")
    from_email = os.getenv("FROM_EMAIL", smtp_user)

    if not smtp_host or not smtp_user:
        # Email not configured — log and skip silently
        print(f"[Notification] Email skipped (not configured): {subject} → {to_email}")
        return {"success": False, "reason": "SMTP not configured"}

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Gov-Complaint-Box <{from_email}>"
        msg["To"] = to_email
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, to_email, msg.as_string())

        print(f"[Notification] Email sent: {subject} → {to_email}")
        return {"success": True}
    except Exception as e:
        print(f"[Notification] Email failed: {e}")
        return {"success": False, "error": str(e)}


# ─── Email Templates ───────────────────────────────────────────────────────────
def email_complaint_received(user_name: str, complaint_id: str, title: str, department: str, is_urgent: bool) -> str:
    urgent_banner = """
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#dc2626;font-weight:bold;">
        ⚠️ Your complaint has been marked as URGENT and will be prioritized.
    </div>""" if is_urgent else ""

    return f"""
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#1e293b);padding:28px 32px;border-bottom:1px solid #1e293b;">
            <div style="font-size:28px;margin-bottom:8px;">🏛️</div>
            <h1 style="margin:0;font-size:20px;color:#fff;">Complaint Registered</h1>
            <p style="margin:6px 0 0;color:#94a3b8;font-size:13px;">Gov-Complaint-Box Grievance System</p>
        </div>
        <div style="padding:28px 32px;">
            <p style="color:#94a3b8;">Hello <strong style="color:#e2e8f0;">{user_name}</strong>,</p>
            {urgent_banner}
            <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin:20px 0;">
                <div style="font-size:11px;color:#64748b;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Complaint ID</div>
                <div style="font-size:22px;font-weight:800;color:#3b82f6;font-family:monospace;">{complaint_id}</div>
                <hr style="border:none;border-top:1px solid #334155;margin:14px 0;"/>
                <div style="font-size:13px;color:#94a3b8;margin-bottom:4px;">Title</div>
                <div style="font-weight:600;color:#f1f5f9;margin-bottom:12px;">{title}</div>
                <div style="font-size:13px;color:#94a3b8;margin-bottom:4px;">Routed To</div>
                <div style="display:inline-block;background:rgba(59,130,246,0.15);color:#60a5fa;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:600;">{department}</div>
            </div>
            <p style="color:#64748b;font-size:13px;line-height:1.7;">You will receive updates when your complaint status changes. Save your Complaint ID for future reference.</p>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
            <p style="color:#475569;font-size:12px;margin:0;">Gov-Complaint-Box · AI-Powered Grievance Management</p>
        </div>
    </div>
    """


def email_status_updated(user_name: str, complaint_id: str, title: str, old_status: str, new_status: str, note: str) -> str:
    status_colors = {
        "IN_PROGRESS": "#3b82f6",
        "RESOLVED": "#10b981",
        "REJECTED": "#ef4444",
        "PENDING": "#f59e0b"
    }
    color = status_colors.get(new_status, "#64748b")

    return f"""
    <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;background:#0f172a;color:#e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1e3a5f,#1e293b);padding:28px 32px;border-bottom:1px solid #1e293b;">
            <div style="font-size:28px;margin-bottom:8px;">🔔</div>
            <h1 style="margin:0;font-size:20px;color:#fff;">Complaint Status Updated</h1>
        </div>
        <div style="padding:28px 32px;">
            <p style="color:#94a3b8;">Hello <strong style="color:#e2e8f0;">{user_name}</strong>,</p>
            <p style="color:#94a3b8;">Your complaint <strong style="color:#3b82f6;font-family:monospace;">{complaint_id}</strong> has been updated.</p>
            <div style="background:#1e293b;border:1px solid #334155;border-radius:10px;padding:20px;margin:20px 0;">
                <div style="font-weight:600;color:#f1f5f9;margin-bottom:14px;">{title}</div>
                <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                    <span style="background:#1e293b;border:1px solid #334155;color:#64748b;padding:5px 12px;border-radius:6px;font-size:13px;">{old_status}</span>
                    <span style="color:#64748b;">→</span>
                    <span style="background:{color}20;border:1px solid {color}40;color:{color};padding:5px 12px;border-radius:6px;font-size:13px;font-weight:700;">{new_status}</span>
                </div>
                {f'<div style="margin-top:14px;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;color:#94a3b8;font-size:13px;line-height:1.6;">{note}</div>' if note else ''}
            </div>
        </div>
        <div style="padding:16px 32px;border-top:1px solid #1e293b;text-align:center;">
            <p style="color:#475569;font-size:12px;margin:0;">Gov-Complaint-Box · AI-Powered Grievance Management</p>
        </div>
    </div>
    """


# ─── In-App Notification Store (DB-backed) ────────────────────────────────────
def create_notification(db, Notification, user_id: int, title: str, message: str, type: str = "info", complaint_id: str = None):
    """Create an in-app notification record."""
    try:
        notif = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            complaint_ref=complaint_id
        )
        db.session.add(notif)
        db.session.commit()
        return notif
    except Exception as e:
        print(f"[Notification] DB write failed: {e}")
        return None


# ─── Composite: Notify on complaint submission ─────────────────────────────────
def notify_complaint_submitted(db, Notification, user, complaint):
    """Send all notifications when a complaint is submitted."""
    # In-app
    create_notification(
        db, Notification, user.id,
        title="Complaint Submitted",
        message=f"Your complaint '{complaint.title}' has been registered as {complaint.complaint_id}",
        type="success",
        complaint_id=complaint.complaint_id
    )
    # Email
    if user.email:
        html = email_complaint_received(
            user.name, complaint.complaint_id,
            complaint.title, complaint.department or "Under Review",
            complaint.is_urgent
        )
        send_email(user.email, f"[{complaint.complaint_id}] Complaint Registered — Gov-Complaint-Box", html)


def notify_status_changed(db, Notification, user, complaint, old_status, new_status, note):
    """Send all notifications when complaint status changes."""
    # In-app
    create_notification(
        db, Notification, user.id,
        title="Complaint Status Updated",
        message=f"Your complaint {complaint.complaint_id} is now {new_status}",
        type="info" if new_status == "IN_PROGRESS" else ("success" if new_status == "RESOLVED" else "warning"),
        complaint_id=complaint.complaint_id
    )
    # Email
    if user.email:
        html = email_status_updated(
            user.name, complaint.complaint_id,
            complaint.title, old_status, new_status, note
        )
        send_email(user.email, f"[{complaint.complaint_id}] Status Update: {new_status} — Gov-Complaint-Box", html)
