import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from extensions import db, limiter
from models.models import User, Complaint, ComplaintUpdate
from services.ai_service import classify_complaint, caption_image, transcribe_audio, find_duplicate
from services.notification_service import notify_complaint_submitted, notify_status_changed
from models.models import Notification

complaints_bp = Blueprint('complaints', __name__, url_prefix='/api/complaints')

ALLOWED_IMAGE = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
ALLOWED_AUDIO = {'mp3', 'wav', 'm4a', 'ogg'}


def allowed_file(filename, allowed_set):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_set


def generate_complaint_id():
    year = datetime.utcnow().year
    count = Complaint.query.count() + 1
    return f"GCB-{year}-{count:05d}"


# ─── Submit Complaint ──────────────────────────────────────────────────────────
@complaints_bp.route('/', methods=['POST'])
@jwt_required()
@limiter.limit("30 per hour")
def submit_complaint():
    user_id = int(get_jwt_identity())
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)

    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    address = request.form.get('address', '')

    if not title or not description:
        return jsonify({'error': 'Title and description are required'}), 400

    image_path = None
    image_caption = None
    audio_path = None
    audio_transcript = None

    # Handle image upload
    if 'image' in request.files:
        img = request.files['image']
        if img and allowed_file(img.filename, ALLOWED_IMAGE):
            fname = f"{uuid.uuid4().hex}_{secure_filename(img.filename)}"
            image_path = os.path.join(upload_folder, fname)
            img.save(image_path)
            cap_result = caption_image(image_path)
            if cap_result['success']:
                image_caption = cap_result['caption']
                description = f"{description}. Image shows: {image_caption}"

    # Handle audio upload
    if 'audio' in request.files:
        audio = request.files['audio']
        if audio and allowed_file(audio.filename, ALLOWED_AUDIO):
            fname = f"{uuid.uuid4().hex}_{secure_filename(audio.filename)}"
            audio_path = os.path.join(upload_folder, fname)
            audio.save(audio_path)
            trans_result = transcribe_audio(audio_path)
            if trans_result['success']:
                audio_transcript = trans_result['transcript']
                description = f"{description}. Voice: {audio_transcript}"

    # Duplicate detection
    pending_complaints = Complaint.query.filter(
        Complaint.status.in_(['PENDING', 'IN_PROGRESS'])
    ).with_entities(Complaint.id, Complaint.description).all()
    existing = [{'id': c.id, 'description': c.description} for c in pending_complaints]
    duplicate_id = find_duplicate(description, existing)

    # AI Classification
    ai_result = classify_complaint(description)
    category = subcategory = department = priority = ai_response = None
    is_urgent = False

    if ai_result['success']:
        d = ai_result['data']
        category = d.get('category')
        subcategory = d.get('subcategory')
        department = d.get('department')
        is_urgent = d.get('is_urgent', False)
        priority = 'CRITICAL' if is_urgent else d.get('priority', 'NORMAL')
        ai_response = d.get('ai_response')

    complaint = Complaint(
        complaint_id=generate_complaint_id(),
        title=title,
        description=request.form.get('description', '').strip(),
        image_path=image_path,
        image_caption=image_caption,
        audio_path=audio_path,
        audio_transcript=audio_transcript,
        category=category,
        subcategory=subcategory,
        department=department,
        is_urgent=is_urgent,
        priority=priority,
        ai_response=ai_response,
        latitude=float(latitude) if latitude else None,
        longitude=float(longitude) if longitude else None,
        address=address,
        status='PENDING',
        user_id=user_id,
        duplicate_of=duplicate_id
    )
    db.session.add(complaint)
    db.session.commit()

    # Fire notifications (in-app + email)
    submitter = User.query.get(user_id)
    notify_complaint_submitted(db, Notification, submitter, complaint)

    return jsonify(complaint.to_dict()), 201


# ─── Get My Complaints (Citizen) ───────────────────────────────────────────────
@complaints_bp.route('/my', methods=['GET'])
@jwt_required()
def my_complaints():
    user_id = int(get_jwt_identity())
    status = request.args.get('status')
    query = Complaint.query.filter_by(user_id=user_id)
    if status:
        query = query.filter_by(status=status.upper())
    complaints = query.order_by(Complaint.created_at.desc()).all()
    return jsonify([c.to_dict() for c in complaints]), 200


# ─── Get Single Complaint ──────────────────────────────────────────────────────
@complaints_bp.route('/<int:complaint_id>', methods=['GET'])
@jwt_required()
def get_complaint(complaint_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    complaint = Complaint.query.get_or_404(complaint_id)

    # Citizens can only see their own
    if user.role == 'citizen' and complaint.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    return jsonify(complaint.to_dict()), 200


# ─── All Complaints (Admin/Officer) ───────────────────────────────────────────
@complaints_bp.route('/', methods=['GET'])
@jwt_required()
def all_complaints():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role == 'citizen':
        return jsonify({'error': 'Unauthorized'}), 403

    status = request.args.get('status')
    department = request.args.get('department')
    priority = request.args.get('priority')
    urgent = request.args.get('urgent')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))

    query = Complaint.query
    if user.role == 'officer':
        query = query.filter(
            (Complaint.officer_id == user_id) |
            (Complaint.department == user.department)
        )
    if status:
        query = query.filter_by(status=status.upper())
    if department:
        query = query.filter_by(department=department)
    if priority:
        query = query.filter_by(priority=priority.upper())
    if urgent == 'true':
        query = query.filter_by(is_urgent=True)

    paginated = query.order_by(Complaint.created_at.desc()).paginate(page=page, per_page=per_page)
    return jsonify({
        'complaints': [c.to_dict() for c in paginated.items],
        'total': paginated.total,
        'pages': paginated.pages,
        'current_page': page
    }), 200


# ─── Update Status (Officer/Admin) ────────────────────────────────────────────
@complaints_bp.route('/<int:complaint_id>/status', methods=['PUT'])
@jwt_required()
def update_status(complaint_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role == 'citizen':
        return jsonify({'error': 'Unauthorized'}), 403

    complaint = Complaint.query.get_or_404(complaint_id)
    data = request.get_json()
    new_status = data.get('status', '').upper()
    note = data.get('note', '')

    valid_statuses = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']
    if new_status not in valid_statuses:
        return jsonify({'error': f'Invalid status. Choose from {valid_statuses}'}), 400

    update = ComplaintUpdate(
        complaint_id=complaint.id,
        updated_by=user_id,
        old_status=complaint.status,
        new_status=new_status,
        note=note
    )
    complaint.status = new_status
    complaint.updated_at = datetime.utcnow()
    if new_status == 'RESOLVED':
        complaint.resolved_at = datetime.utcnow()
        complaint.resolution_note = note

    db.session.add(update)
    db.session.commit()

    # Notify the complaint submitter
    submitter = User.query.get(complaint.user_id)
    if submitter:
        notify_status_changed(db, Notification, submitter, complaint, update.old_status, new_status, note)

    return jsonify(complaint.to_dict()), 200


# ─── Assign Officer ────────────────────────────────────────────────────────────
@complaints_bp.route('/<int:complaint_id>/assign', methods=['PUT'])
@jwt_required()
def assign_officer(complaint_id):
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role != 'admin':
        return jsonify({'error': 'Admin only'}), 403

    complaint = Complaint.query.get_or_404(complaint_id)
    data = request.get_json()
    officer_id = data.get('officer_id')
    officer = User.query.get_or_404(officer_id)

    complaint.officer_id = officer.id
    db.session.commit()
    return jsonify(complaint.to_dict()), 200


# ─── Analytics (Admin) ────────────────────────────────────────────────────────
@complaints_bp.route('/analytics/summary', methods=['GET'])
@jwt_required()
def analytics_summary():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if user.role == 'citizen':
        return jsonify({'error': 'Unauthorized'}), 403

    total = Complaint.query.count()
    pending = Complaint.query.filter_by(status='PENDING').count()
    in_progress = Complaint.query.filter_by(status='IN_PROGRESS').count()
    resolved = Complaint.query.filter_by(status='RESOLVED').count()
    rejected = Complaint.query.filter_by(status='REJECTED').count()
    urgent = Complaint.query.filter_by(is_urgent=True).count()

    by_department = db.session.query(
        Complaint.department, db.func.count(Complaint.id)
    ).group_by(Complaint.department).all()

    by_category = db.session.query(
        Complaint.category, db.func.count(Complaint.id)
    ).group_by(Complaint.category).all()

    return jsonify({
        'total': total,
        'pending': pending,
        'in_progress': in_progress,
        'resolved': resolved,
        'rejected': rejected,
        'urgent': urgent,
        'by_department': [{'name': d, 'count': c} for d, c in by_department if d],
        'by_category': [{'name': c, 'count': n} for c, n in by_category if c]
    }), 200


# ─── Map Data ─────────────────────────────────────────────────────────────────
@complaints_bp.route('/map/points', methods=['GET'])
@jwt_required()
def map_points():
    complaints = Complaint.query.filter(
        Complaint.latitude.isnot(None),
        Complaint.longitude.isnot(None)
    ).all()
    points = [{
        'id': c.id,
        'complaint_id': c.complaint_id,
        'lat': c.latitude,
        'lng': c.longitude,
        'category': c.category,
        'status': c.status,
        'is_urgent': c.is_urgent,
        'title': c.title
    } for c in complaints]
    return jsonify(points), 200
