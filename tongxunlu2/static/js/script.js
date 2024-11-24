// 加载联系人列表
async function loadContacts() {
    const bookmarkedOnly = document.getElementById('bookmarkedOnly').checked;
    const url = `/contacts${bookmarkedOnly ? '?bookmarked=true' : ''}`;
    
    try {
        const response = await fetch(url);
        const contacts = await response.json();
        const contactsList = document.getElementById('contactsList');
        contactsList.innerHTML = '';
        
        contacts.forEach(contact => {
            const card = createContactCard(contact);
            contactsList.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading contacts:', error);
        alert('加载联系人失败');
    }
}

// 创建联系人卡片
function createContactCard(contact) {
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.innerHTML = `
        <div class="contact-header">
            <h3>${contact.name}</h3>
            <button class="bookmark-btn" onclick="toggleBookmark(${contact.id})">
                ${contact.is_bookmarked ? '★' : '☆'}
            </button>
        </div>
        <div class="contact-details" id="details-${contact.id}"></div>
        <div class="card-actions">
            <button onclick="editContact(${contact.id})">编辑</button>
            <button onclick="deleteContact(${contact.id})">删除</button>
        </div>
    `;
    
    loadContactDetails(contact.id);
    return card;
}

// 加载联系人详情
async function loadContactDetails(contactId) {
    try {
        const response = await fetch(`/contacts/${contactId}`);
        const contact = await response.json();
        const detailsContainer = document.getElementById(`details-${contactId}`);
        
        detailsContainer.innerHTML = contact.details.map(detail => `
            <div class="detail-item">
                <strong>${detail.type}${detail.label ? ` (${detail.label})` : ''}:</strong> 
                ${detail.value}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading contact details:', error);
    }
}

// 切换书签状态
async function toggleBookmark(contactId) {
    try {
        const response = await fetch(`/contacts/${contactId}/bookmark`, {
            method: 'PUT'
        });
        await response.json();
        loadContacts();
    } catch (error) {
        console.error('Error toggling bookmark:', error);
        alert('更新书签状态失败');
    }
}

// 显示添加联系人模态框
function showAddContactModal() {
    document.getElementById('modalTitle').textContent = '添加联系人';
    document.getElementById('contactId').value = '';
    document.getElementById('contactName').value = '';
    document.getElementById('contactDetails').innerHTML = '';
    addContactDetail();
    document.getElementById('contactModal').style.display = 'block';
}

// 添加联系方式输入框
function addContactDetail() {
    const detailsContainer = document.getElementById('contactDetails');
    const detailDiv = document.createElement('div');
    detailDiv.className = 'form-group';
    detailDiv.innerHTML = `
        <select class="detail-type">
            <option value="phone">电话</option>
            <option value="email">邮箱</option>
            <option value="address">地址</option>
            <option value="social_media">社交媒体</option>
        </select>
        <input type="text" class="detail-value" placeholder="值">
        <input type="text" class="detail-label" placeholder="标签（可选）">
        <button type="button" onclick="this.parentElement.remove()">删除</button>
    `;
    detailsContainer.appendChild(detailDiv);
}

// 保存联系人
async function saveContact(event) {
    event.preventDefault();
    
    const contactId = document.getElementById('contactId').value;
    const name = document.getElementById('contactName').value;
    const details = Array.from(document.getElementById('contactDetails').children).map(div => ({
        type: div.querySelector('.detail-type').value,
        value: div.querySelector('.detail-value').value,
        label: div.querySelector('.detail-label').value || null
    }));
    
    const data = { name, details };
    
    try {
        const method = contactId ? 'PUT' : 'POST';
        const url = contactId ? `/contacts/${contactId}` : '/contacts';
        
        await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        closeModal();
        loadContacts();
    } catch (error) {
        console.error('Error saving contact:', error);
        alert('保存联系人失败');
    }
}

// 导出联系人
function exportContacts() {
    window.location.href = '/export';
}

// 导入联系人
async function importContacts(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch('/import', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            alert('导入成功');
            loadContacts();
        } else {
            alert('导入失败');
        }
    } catch (error) {
        console.error('Error importing contacts:', error);
        alert('导入失败');
    }
    
    event.target.value = '';
}

// 删除联系人
async function deleteContact(contactId) {
    if (!confirm('确定要删除这个联系人吗？')) return;
    
    try {
        await fetch(`/contacts/${contactId}`, {
            method: 'DELETE'
        });
        loadContacts();
    } catch (error) {
        console.error('Error deleting contact:', error);
        alert('删除联系人失败');
    }
}

// 编辑联系人
async function editContact(contactId) {
    try {
        const response = await fetch(`/contacts/${contactId}`);
        const contact = await response.json();
        
        document.getElementById('modalTitle').textContent = '编辑联系人';
        document.getElementById('contactId').value = contact.id;
        document.getElementById('contactName').value = contact.name;
        
        const detailsContainer = document.getElementById('contactDetails');
        detailsContainer.innerHTML = '';
        
        contact.details.forEach(detail => {
            const detailDiv = document.createElement('div');
            detailDiv.className = 'form-group';
            detailDiv.innerHTML = `
                <select class="detail-type">
                    <option value="phone" ${detail.type === 'phone' ? 'selected' : ''}>电话</option>
                    <option value="email" ${detail.type === 'email' ? 'selected' : ''}>邮箱</option>
                    <option value="address" ${detail.type === 'address' ? 'selected' : ''}>地址</option>
                    <option value="social_media" ${detail.type === 'social_media' ? 'selected' : ''}>社交媒体</option>
                </select>
                <input type="text" class="detail-value" value="${detail.value}">
                <input type="text" class="detail-label" value="${detail.label || ''}">
                <button type="button" onclick="this.parentElement.remove()">删除</button>
            `;
            detailsContainer.appendChild(detailDiv);
        });
        
        document.getElementById('contactModal').style.display = 'block';
    } catch (error) {
        console.error('Error loading contact for edit:', error);
        alert('加载联系人信息失败');
    }
}

// 关闭模态框
function closeModal() {
    document.getElementById('contactModal').style.display = 'none';
}

// 页面加载完成后加载联系人列表
document.addEventListener('DOMContentLoaded', loadContacts); 