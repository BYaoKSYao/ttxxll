from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Contact(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    is_bookmarked = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关联的联系方式
    contact_details = db.relationship('ContactDetail', backref='contact', lazy=True)

class ContactDetail(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    contact_id = db.Column(db.Integer, db.ForeignKey('contact.id'), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'phone', 'email', 'social_media', 'address'
    value = db.Column(db.String(255), nullable=False)
    label = db.Column(db.String(50))  # 如 'home', 'work', 'personal' 