import os
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from extensions import db, bcrypt, jwt, limiter
from models.models import User, Complaint, ComplaintUpdate, Notification
from routes.auth_routes import auth_bp
from routes.complaint_routes import complaints_bp
from routes.admin_routes import admin_bp
from routes.notification_routes import notif_bp


def create_app():
    app = Flask(__name__)

    # ─── Config ───────────────────────────────────────────────────────────────
    app.config['SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-change-me')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-change-me')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///gov_complaints.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

    # ─── Extensions ───────────────────────────────────────────────────────────
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    limiter.init_app(app)

    # ─── Blueprints ───────────────────────────────────────────────────────────
    app.register_blueprint(auth_bp)
    app.register_blueprint(complaints_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(notif_bp)

    # ─── Health Check ─────────────────────────────────────────────────────────
    @app.route('/')
    def index():
        return jsonify({
            'message': '🏛️ Gov-Complaint-Box API is running',
            'version': '2.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'complaints': '/api/complaints',
                'admin': '/api/admin'
            }
        })

    # ─── Error Handlers ───────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Resource not found'}), 404

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({'error': 'File too large. Max 16MB allowed.'}), 413

    @app.errorhandler(429)
    def rate_limited(e):
        return jsonify({'error': 'Too many requests. Please slow down.'}), 429

    # ─── DB Init + Seed Admin ─────────────────────────────────────────────────
    with app.app_context():
        db.create_all()
        _seed_admin()

    return app


def _seed_admin():
    """Create a default admin account if none exists."""
    if not User.query.filter_by(role='admin').first():
        admin = User(name='Admin', email='admin@gcb.gov.in', role='admin')
        admin.set_password('Admin@123')
        db.session.add(admin)
        db.session.commit()
        print("✅ Default admin created: admin@gcb.gov.in / Admin@123")


if __name__ == '__main__':
    app = create_app()
    # Use the PORT environment variable provided by Render, default to 5000 for local dev
    port = int(os.environ.get("PORT", 5000))
    # Set debug to False for production
    debug_mode = os.getenv('FLASK_DEBUG', 'False') == 'True'

    app.run(host='0.0.0.0', port=port, debug=debug_mode)
