from datetime import datetime
from extensions import db, bcrypt


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(15), nullable=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='citizen')  # citizen | officer | admin
    department = db.Column(db.String(100), nullable=True)  # for officers
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    complaints = db.relationship('Complaint', backref='submitter', lazy=True, foreign_keys='Complaint.user_id')
    assigned_complaints = db.relationship('Complaint', backref='assigned_officer', lazy=True, foreign_keys='Complaint.officer_id')

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'department': self.department,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }


class Complaint(db.Model):
    __tablename__ = 'complaints'

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.String(20), unique=True, nullable=False)  # e.g. GCB-2024-00001
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    image_path = db.Column(db.String(300), nullable=True)
    image_caption = db.Column(db.Text, nullable=True)
    audio_path = db.Column(db.String(300), nullable=True)
    audio_transcript = db.Column(db.Text, nullable=True)

    # AI Classification Results
    category = db.Column(db.String(100), nullable=True)
    subcategory = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    is_urgent = db.Column(db.Boolean, default=False)
    ai_response = db.Column(db.Text, nullable=True)
    duplicate_of = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=True)

    # Location
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    address = db.Column(db.String(300), nullable=True)

    # Status & Lifecycle
    status = db.Column(db.String(30), default='PENDING')  # PENDING | IN_PROGRESS | RESOLVED | REJECTED
    priority = db.Column(db.String(20), default='NORMAL')  # LOW | NORMAL | HIGH | CRITICAL
    resolution_note = db.Column(db.Text, nullable=True)

    # Relations
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    officer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = db.Column(db.DateTime, nullable=True)

    updates = db.relationship('ComplaintUpdate', backref='complaint', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'complaint_id': self.complaint_id,
            'title': self.title,
            'description': self.description,
            'image_path': self.image_path,
            'image_caption': self.image_caption,
            'category': self.category,
            'subcategory': self.subcategory,
            'department': self.department,
            'is_urgent': self.is_urgent,
            'ai_response': self.ai_response,
            'latitude': self.latitude,
            'longitude': self.longitude,
            'address': self.address,
            'status': self.status,
            'priority': self.priority,
            'resolution_note': self.resolution_note,
            'user_id': self.user_id,
            'officer_id': self.officer_id,
            'duplicate_of': self.duplicate_of,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'resolved_at': self.resolved_at.isoformat() if self.resolved_at else None,
            'submitter': self.submitter.to_dict() if self.submitter else None,
            'updates': [u.to_dict() for u in self.updates]
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='info')   # info | success | warning | error
    complaint_ref = db.Column(db.String(20), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'message': self.message,
            'type': self.type,
            'complaint_ref': self.complaint_ref,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat()
        }


class ComplaintUpdate(db.Model):
    __tablename__ = 'complaint_updates'

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=False)
    updated_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    old_status = db.Column(db.String(30), nullable=True)
    new_status = db.Column(db.String(30), nullable=True)
    note = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    officer = db.relationship('User', foreign_keys=[updated_by])

    def to_dict(self):
        return {
            'id': self.id,
            'old_status': self.old_status,
            'new_status': self.new_status,
            'note': self.note,
            'officer': self.officer.name if self.officer else 'System',
            'created_at': self.created_at.isoformat()
        }
