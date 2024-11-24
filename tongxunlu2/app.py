from flask import Flask, request, jsonify, send_file, render_template
from models import db, Contact, ContactDetail
import pandas as pd
import tempfile
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///contacts.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/contacts', methods=['POST'])
def create_contact():
    data = request.json
    contact = Contact(name=data['name'])
    db.session.add(contact)
    
    for detail in data.get('details', []):
        contact_detail = ContactDetail(
            contact=contact,
            type=detail['type'],
            value=detail['value'],
            label=detail.get('label')
        )
        db.session.add(contact_detail)
    
    db.session.commit()
    return jsonify({'message': 'Contact created successfully'}), 201

@app.route('/contacts/<int:contact_id>/bookmark', methods=['PUT'])
def toggle_bookmark(contact_id):
    contact = Contact.query.get_or_404(contact_id)
    contact.is_bookmarked = not contact.is_bookmarked
    db.session.commit()
    return jsonify({'is_bookmarked': contact.is_bookmarked})

@app.route('/export', methods=['GET'])
def export_contacts():
    contacts = Contact.query.all()
    data = []
    
    for contact in contacts:
        contact_data = {
            'name': contact.name,
            'is_bookmarked': contact.is_bookmarked
        }
        for detail in contact.contact_details:
            key = f"{detail.type}_{detail.label if detail.label else 'primary'}"
            contact_data[key] = detail.value
        data.append(contact_data)
    
    df = pd.DataFrame(data)
    
    # 创建临时文件
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx')
    df.to_excel(temp_file.name, index=False)
    
    return send_file(
        temp_file.name,
        as_attachment=True,
        download_name='contacts.xlsx'
    )

@app.route('/import', methods=['POST'])
def import_contacts():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    if not file.filename.endswith('.xlsx'):
        return jsonify({'error': 'Invalid file format'}), 400
    
    df = pd.read_excel(file)
    
    for _, row in df.iterrows():
        contact = Contact(name=row['name'], is_bookmarked=row['is_bookmarked'])
        db.session.add(contact)
        
        for column in df.columns:
            if column not in ['name', 'is_bookmarked'] and pd.notna(row[column]):
                type_, label = column.split('_', 1)
                contact_detail = ContactDetail(
                    contact=contact,
                    type=type_,
                    value=row[column],
                    label=label if label != 'primary' else None
                )
                db.session.add(contact_detail)
    
    db.session.commit()
    return jsonify({'message': 'Contacts imported successfully'})

@app.route('/contacts', methods=['GET'])
def get_contacts():
    # 支持按书签过滤
    bookmarked = request.args.get('bookmarked', type=bool)
    query = Contact.query
    if bookmarked is not None:
        query = query.filter_by(is_bookmarked=bookmarked)
    
    contacts = query.all()
    return jsonify([{
        'id': contact.id,
        'name': contact.name,
        'is_bookmarked': contact.is_bookmarked,
        'created_at': contact.created_at.isoformat()
    } for contact in contacts])

@app.route('/contacts/<int:contact_id>', methods=['GET'])
def get_contact(contact_id):
    contact = Contact.query.get_or_404(contact_id)
    return jsonify({
        'id': contact.id,
        'name': contact.name,
        'is_bookmarked': contact.is_bookmarked,
        'created_at': contact.created_at.isoformat(),
        'details': [{
            'type': detail.type,
            'value': detail.value,
            'label': detail.label
        } for detail in contact.contact_details]
    })

@app.route('/contacts/<int:contact_id>', methods=['DELETE'])
def delete_contact(contact_id):
    contact = Contact.query.get_or_404(contact_id)
    db.session.delete(contact)
    db.session.commit()
    return jsonify({'message': 'Contact deleted successfully'})

@app.route('/contacts/<int:contact_id>', methods=['PUT'])
def update_contact(contact_id):
    contact = Contact.query.get_or_404(contact_id)
    data = request.json
    
    if 'name' in data:
        contact.name = data['name']
    
    if 'details' in data:
        # 删除现有的联系方式
        ContactDetail.query.filter_by(contact_id=contact.id).delete()
        
        # 添加新的联系方式
        for detail in data['details']:
            contact_detail = ContactDetail(
                contact=contact,
                type=detail['type'],
                value=detail['value'],
                label=detail.get('label')
            )
            db.session.add(contact_detail)
    
    db.session.commit()
    return jsonify({'message': 'Contact updated successfully'})

if __name__ == '__main__':
    app.run(debug=True)
