from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.models import User, Complaint

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def require_admin(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@require_admin
def list_users():
    role = request.args.get('role')
    query = User.query
    if role:
        query = query.filter_by(role=role)
    users = query.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@jwt_required()
@require_admin
def update_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    if 'role' in data and data['role'] in ['citizen', 'officer', 'admin']:
        user.role = data['role']
    if 'department' in data:
        user.department = data['department']
    if 'is_active' in data:
        user.is_active = data['is_active']
    db.session.commit()
    return jsonify(user.to_dict()), 200


@admin_bp.route('/create-officer', methods=['POST'])
@jwt_required()
@require_admin
def create_officer():
    data = request.get_json()
    required = ['name', 'email', 'password', 'department']
    if not all(k in data for k in required):
        return jsonify({'error': 'name, email, password, department required'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 409

    officer = User(
        name=data['name'],
        email=data['email'].lower(),
        role='officer',
        department=data['department']
    )
    officer.set_password(data['password'])
    db.session.add(officer)
    db.session.commit()
    return jsonify(officer.to_dict()), 201


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
@require_admin
def stats():
    total_users = User.query.filter_by(role='citizen').count()
    total_officers = User.query.filter_by(role='officer').count()
    total_complaints = Complaint.query.count()
    resolved = Complaint.query.filter_by(status='RESOLVED').count()
    resolution_rate = round((resolved / total_complaints * 100), 1) if total_complaints else 0

    return jsonify({
        'total_citizens': total_users,
        'total_officers': total_officers,
        'total_complaints': total_complaints,
        'resolved_complaints': resolved,
        'resolution_rate': resolution_rate
    }), 200
